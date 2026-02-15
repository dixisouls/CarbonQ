"""
User model — MongoDB document schemas for users collection.
"""

from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field


class PyObjectId(ObjectId):
    """Custom type for MongoDB ObjectId validation in Pydantic."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class UserBase(BaseModel):
    """Base user fields."""

    email: EmailStr


class UserCreate(UserBase):
    """User creation schema with password."""

    password: str


class UserInDB(UserBase):
    """User document as stored in MongoDB."""

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    password_hash: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class User(UserBase):
    """User response model (without password)."""

    id: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_db(cls, db_user: dict) -> User:
        """Convert MongoDB document to User model."""
        return cls(
            id=str(db_user["_id"]),
            email=db_user["email"],
            created_at=db_user["created_at"],
            updated_at=db_user["updated_at"],
        )
