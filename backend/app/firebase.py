"""
Firebase Admin SDK — singleton instances via @lru_cache.

Provides:
- ``get_firebase_app()``   → initialised Firebase Admin App
- ``get_firestore_client()`` → Firestore client
- Auth REST helpers for register / login / token-refresh
"""

from __future__ import annotations

import os
from functools import lru_cache

import firebase_admin
from firebase_admin import auth as fb_auth, credentials, firestore
from loguru import logger

from app.config import get_settings


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Singleton — Firebase Admin App
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@lru_cache(maxsize=1)
def get_firebase_app() -> firebase_admin.App:
    """Initialise and return the **single** Firebase Admin App."""
    settings = get_settings()
    sa_path = settings.firebase_service_account_path

    if sa_path and os.path.isfile(sa_path):
        cred = credentials.Certificate(sa_path)
        logger.info("Firebase Admin: using service-account key at {}", sa_path)
    else:
        # Fallback to Application Default Credentials (ADC).
        # Works when GOOGLE_APPLICATION_CREDENTIALS is set, or on GCP.
        cred = credentials.ApplicationDefault()
        logger.info("Firebase Admin: using Application Default Credentials")

    app = firebase_admin.initialize_app(
        cred,
        options={"projectId": settings.firebase_project_id},
    )
    logger.info("Firebase Admin App initialised (project={})", settings.firebase_project_id)
    return app


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Singleton — Firestore client
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@lru_cache(maxsize=1)
def get_firestore_client() -> firestore.firestore.Client:
    """Return the **single** Firestore client instance."""
    get_firebase_app()  # ensure app is initialised
    client = firestore.client()
    logger.info("Firestore client ready")
    return client


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Singleton — Firebase Auth module reference
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@lru_cache(maxsize=1)
def get_firebase_auth():
    """Return firebase_admin.auth module (ensures app is initialised first)."""
    get_firebase_app()
    return fb_auth
