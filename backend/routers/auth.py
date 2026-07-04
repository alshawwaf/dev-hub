from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from db import models
from db.database import get_db
import hashlib
import schemas
import os

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "dev_hub_secret_key_12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days — lab-friendly; avoids frequent re-login

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _notify(db, text, kind):
    # Best-effort activity notification. Lazy import avoids the auth<->notifications
    # circular import; emit() itself never raises.
    try:
        from .notifications import emit
        emit(db, text, kind)
    except Exception:
        pass

@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        _notify(db, f"Failed sign-in attempt for {form_data.username}", "error")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    _notify(db, f"{user.email} signed in", "info")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "is_admin": user.is_admin
        }
    }

API_KEY_PREFIX = "devhub_"
LAST_USED_THROTTLE = 60  # seconds — don't rewrite last_used_at on every request


def _utcnow():
    return datetime.now(timezone.utc)


def _as_aware(dt):
    # SQLite hands back naive datetimes even for timezone=True columns; Postgres
    # hands back aware ones. Normalize so comparisons never raise.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _resolve_api_key(token: str, request: Request, db: Session):
    """Authenticate a devhub_ API key: hash lookup, liveness checks, method-level
    scope enforcement, and a throttled last_used_at touch. Returns the owner User."""
    key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = db.query(models.ApiKey).filter(
        models.ApiKey.key_hash == key_hash,
        models.ApiKey.revoked == False,  # noqa: E712
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    now = _utcnow()
    if row.expires_at is not None and _as_aware(row.expires_at) <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This API key has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(models.User).filter(models.User.id == row.owner_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key owner no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    scopes = list(row.scopes or [])
    # Central method-level scope gate: a read-only key can never mutate anything,
    # whatever endpoint it hits.
    if request.method not in ("GET", "HEAD", "OPTIONS") and not ({"write", "admin"} & set(scopes)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This API key is read-only")
    # Touch last_used_at at most once a minute — avoids a DB write per request.
    if row.last_used_at is None or (now - _as_aware(row.last_used_at)).total_seconds() > LAST_USED_THROTTLE:
        try:
            row.last_used_at = now
            db.commit()
        except Exception:
            db.rollback()  # usage bookkeeping must never fail a request
    request.state.auth_kind = "key"
    request.state.key_scopes = scopes
    return user


@router.get("/me", response_model=schemas.User)
def read_users_me(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Dual-mode auth dependency (and the GET /auth/me endpoint): the Bearer token
    is either a JWT session or a devhub_ API key. Either way the resolved User is
    returned; request.state.auth_kind tells downstream code which one it was."""
    if token.startswith(API_KEY_PREFIX):
        return _resolve_api_key(token, request, db)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    request.state.auth_kind = "jwt"
    return user

def effective_admin(request: Request, user) -> bool:
    """Is this request acting with admin authority? Requires an admin user AND,
    when authenticated by API key, the key must carry the admin scope — a
    lesser-scoped key must not inherit its owner's full privileges."""
    if not user.is_admin:
        return False
    if getattr(request.state, "auth_kind", None) == "key":
        return "admin" in (getattr(request.state, "key_scopes", None) or [])
    return True

def get_current_admin_user(request: Request, current_user: schemas.User = Depends(read_users_me)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    if getattr(request.state, "auth_kind", None) == "key" and \
            "admin" not in (getattr(request.state, "key_scopes", None) or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This API key lacks the admin scope",
        )
    return current_user

@router.post("/change-password")
def change_password(body: schemas.ChangePassword, request: Request,
                    db: Session = Depends(get_db),
                    current_user: schemas.User = Depends(read_users_me)):
    """Change the signed-in user's password. Requires a real JWT session — an API
    key must never be able to rotate its owner's password (that would let a leaked
    key take over the account)."""
    if getattr(request.state, "auth_kind", None) != "jwt":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Password changes require a signed-in session, not an API key")
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="New password must be at least 8 characters")
    current_user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    _notify(db, f"{current_user.email} changed their password", "info")
    return {"message": "Password updated"}
