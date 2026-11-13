import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_access_token, verify_password
from app.models.user import User
from app.schemas.auth import CurrentUser, LoginRequest, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id), role=user.role.value),
        refresh_token=create_refresh_token(subject=str(user.id), role=user.role.value),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Canjea un refresh token (guardado en el celular tras activar la huella) por una
    sesión nueva, sin pedir correo y contraseña otra vez. Rota el refresh token."""
    error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión expirada, inicia sesión de nuevo")
    claims = decode_access_token(payload.refresh_token)
    if claims is None or claims.get("typ") != "refresh" or "sub" not in claims:
        raise error
    try:
        user = await db.get(User, uuid.UUID(claims["sub"]))
    except ValueError:
        raise error
    if user is None or not user.is_active:
        raise error
    return TokenResponse(
        access_token=create_access_token(subject=str(user.id), role=user.role.value),
        refresh_token=create_refresh_token(subject=str(user.id), role=user.role.value),
    )


@router.get("/me", response_model=CurrentUser)
async def me(current_user: User = Depends(get_current_user)) -> CurrentUser:
    return CurrentUser.model_validate(current_user)
