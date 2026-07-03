from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, Index
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    url = Column(String)
    github_url = Column(String)
    category = Column(String) # e.g. "AI", "Tools", "Infrastructure"
    icon = Column(String)     # Emoji or URL
    is_live = Column(Boolean, default=True)
    embeddable = Column(Boolean, default=False)  # app allows being shown inside an in-window iframe
    placement = Column(String, default="desktop")  # baseline surface: desktop | dock | both | hidden
    proxy_embed = Column(Boolean, default=False)  # route the in-window iframe through the same-origin /embed proxy
    # Encrypted (AES-256-GCM) override URL for the in-window iframe — used when the
    # framed URL must carry a token (e.g. OpenClaw's tokenized dashboard URL).
    # NEVER exposed in the public API; only the has_embed_url flag is, and the
    # decrypted value is served from an authenticated endpoint.
    embed_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def has_embed_url(self) -> bool:
        return bool(self.embed_url)

class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    at = Column(DateTime(timezone=True), server_default=func.now())
    kind = Column(String)            # api | auth | admin | ui | embed | system
    method = Column(String)
    path = Column(String)
    source_ip = Column(String)
    actor = Column(String)           # resolved from the JWT subject, or "anon"
    status = Column(Integer)
    duration_ms = Column(Integer)
    summary = Column(String)
    detail = Column(JSON)            # small redacted context (query, user-agent)

    __table_args__ = (Index("ix_activity_kind_at", "kind", "at"),)

class UserDesktopPref(Base):
    __tablename__ = "user_desktop_prefs"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, unique=True, index=True)   # users.id
    overrides = Column(JSON, default=dict)                # { appId: "desktop|dock|both|hidden" }
    geometry = Column(JSON, default=dict)                 # { appId: {x,y,w,h} } remembered window size/pos
    widgets = Column(JSON, default=list)                  # enabled desktop widget ids, e.g. ["clock","activity"]
    theme = Column(String, default="dark")                # "dark" | "light"
    icon_positions = Column(JSON, default=dict)           # { appId: {x,y} } free-positioned desktop icons
    folders = Column(JSON, default=list)                  # macOS-style desktop folders: [{id, name, app_ids, color}]
    icon_colors = Column(JSON, default=dict)              # per-app icon tint: { appId: "blue" | "#3b82f6" }
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String, default="info")   # info | success | warning | error
    text = Column(String)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
