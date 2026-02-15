"""
MongoDB connection management — singleton client via @lru_cache.

Provides:
- get_mongodb_client() → MongoDB client instance
- get_database() → MongoDB database instance
- Collections: users, queries
"""

from __future__ import annotations

from functools import lru_cache

from loguru import logger
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from app.config import get_settings


@lru_cache(maxsize=1)
def get_mongodb_client() -> MongoClient:
    """Return the single MongoDB client instance."""
    settings = get_settings()
    try:
        client = MongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000,
        )
        # Verify connection
        client.admin.command("ping")
        logger.info("MongoDB client connected successfully")
        return client
    except ConnectionFailure as exc:
        logger.error("Failed to connect to MongoDB: {}", exc)
        raise


@lru_cache(maxsize=1)
def get_database():
    """Return the MongoDB database instance."""
    client = get_mongodb_client()
    settings = get_settings()
    db_name = settings.mongodb_database_name
    logger.info("Using MongoDB database: {}", db_name)
    return client[db_name]


def get_users_collection():
    """Return the users collection."""
    db = get_database()
    return db.users


def get_queries_collection():
    """Return the queries collection."""
    db = get_database()
    return db.queries
