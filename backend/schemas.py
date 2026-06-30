from pydantic import BaseModel, EmailStr
from typing import Optional, List
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
