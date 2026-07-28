from fastapi import APIRouter

from app.api.v1 import auth, compatibility, dashboard, lookups, products, sales

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(products.router)
api_router.include_router(sales.router)
api_router.include_router(lookups.router)
api_router.include_router(compatibility.router)
api_router.include_router(dashboard.router)
