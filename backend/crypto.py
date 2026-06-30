"""Symmetric encryption for app-config secrets stored at rest (currently the
per-app embed URL, which can carry an access token). AES-256-GCM (authenticated)
with a 32-byte key derived from SECRET_KEY; the ciphertext is urlsafe-base64 of
nonce||ct so it fits in a plain VARCHAR column.

decrypt() never raises — a tampered or undecryptable value (e.g. SECRET_KEY
rotated) yields None, so the worst case is "re-enter the URL", never a crash.
"""
import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_SECRET = os.getenv("SECRET_KEY", "dev_hub_secret_key_12345")
_KEY = hashlib.sha256(_SECRET.encode("utf-8")).digest()  # 32 bytes -> AES-256
_AES = AESGCM(_KEY)


def encrypt(plaintext):
    """Encrypt a string; returns base64 ciphertext, or None for empty/None input."""
    if not plaintext:
        return None
    nonce = os.urandom(12)
    ct = _AES.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ct).decode("ascii")


def decrypt(blob):
    """Decrypt base64 ciphertext back to a string; returns None on any failure."""
    if not blob:
        return None
    try:
        raw = base64.urlsafe_b64decode(blob.encode("ascii"))
        return _AES.decrypt(raw[:12], raw[12:], None).decode("utf-8")
    except Exception:
        return None
