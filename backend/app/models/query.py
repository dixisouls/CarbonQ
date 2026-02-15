"""
Query model — MongoDB document schemas for queries collection.
"""

from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, Field


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


class QueryCreate(BaseModel):
    """Query creation schema."""

    platform: str
    carbon_grams: float


class QueryInDB(BaseModel):
    """Query document as stored in MongoDB."""

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    platform: str
    carbon_grams: float
    timestamp: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Query(BaseModel):
    """Query response model."""

    id: str
    user_id: str
    platform: str
    carbon_grams: float
    timestamp: datetime

    @classmethod
    def from_db(cls, db_query: dict) -> Query:
        """Convert MongoDB document to Query model."""
        return cls(
            id=str(db_query["_id"]),
            user_id=str(db_query["user_id"]),
            platform=db_query["platform"],
            carbon_grams=db_query["carbon_grams"],
            timestamp=db_query["timestamp"],
        )
