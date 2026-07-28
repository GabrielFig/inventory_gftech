import uuid

from pydantic import BaseModel


class SupplierRead(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


class SupplierCreate(BaseModel):
    name: str


class CategoryRead(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str


class PhoneModelRead(BaseModel):
    id: uuid.UUID
    brand: str
    model: str

    model_config = {"from_attributes": True}
