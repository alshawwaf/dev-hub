from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from datetime import datetime

class AppBase(BaseModel):
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    github_url: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    is_live: bool = True
    embeddable: bool = False
    placement: str = "desktop"
    proxy_embed: bool = False
    # Optional Dokploy service mapping — lets the hub show live state and run
    # start/stop/restart/redeploy. The ids are opaque Dokploy identifiers.
    deploy_kind: Optional[Literal["application", "compose"]] = None
    deploy_id: Optional[str] = None

class AppCreate(AppBase):
    # Optional override URL for the in-window frame; may carry a token, so it is
    # encrypted at rest and never returned in the public App response.
    embed_url: Optional[str] = None

class AppUpdate(AppBase):
    name: Optional[str] = None
    embed_url: Optional[str] = None

class App(AppBase):
    id: int
    # Flag only — the actual (possibly token-bearing) URL is served from the
    # authenticated GET /apps/{id}/embed endpoint, never in this public payload.
    has_embed_url: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class ApiKeyCreate(BaseModel):
    name: str
    scopes: List[str] = ["read"]
    # Days until expiry; None/omitted = the key never expires.
    expires_days: Optional[int] = None

class ApiKey(BaseModel):
    id: int
    name: str
    prefix: str
    scopes: List[str]
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    revoked: bool

    class Config:
        from_attributes = True

class ApiKeyCreated(ApiKey):
    # The raw key — returned exactly ONCE at creation; only its hash is stored.
    key: str

class DokployConfigIn(BaseModel):
    url: str
    # Empty token + an already-stored token = keep the stored one (URL-only edit).
    token: str = ""

class PowerAction(BaseModel):
    action: Literal["start", "stop", "restart", "redeploy"]
