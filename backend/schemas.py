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

class AppCreate(AppBase):
    pass

class AppUpdate(AppBase):
    name: Optional[str] = None

class App(AppBase):
    id: int
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
