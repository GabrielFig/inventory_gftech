from pydantic import BaseModel

from app.schemas.product import ProductRead


class ModelSearchResult(BaseModel):
    brand: str
    model: str
    matches: list[ProductRead]
