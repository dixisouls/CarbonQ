"""
Password hashing utilities using bcrypt.

Provides secure password hashing and verification with bcrypt.
"""

from __future__ import annotations

import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with automatic salt generation.

    Args:
        password: Plain text password to hash

    Returns:
        Hashed password as a string (bcrypt returns bytes, we decode to UTF-8)
    """
    # Generate salt and hash password (bcrypt handles salt automatically)
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)  # 12 rounds is a good balance of security and performance
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against its bcrypt hash.

    Args:
        password: Plain text password to verify
        hashed: Bcrypt hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    try:
        password_bytes = password.encode("utf-8")
        hashed_bytes = hashed.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # If any error occurs during verification, return False
        return False
