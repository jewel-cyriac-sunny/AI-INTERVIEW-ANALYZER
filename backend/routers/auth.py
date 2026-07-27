"""Auth router – login and profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from auth_utils import hash_password, verify_password, create_access_token, get_current_admin
from schemas import LoginRequest, LoginResponse, AdminOut

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    from database import db
    admin = await db.admin.find_unique(where={"email": body.email})

    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(data={"sub": admin.admin_id})
    return LoginResponse(
        token=token,
        user=AdminOut(admin_id=admin.admin_id, name=admin.name, email=admin.email),
    )


@router.get("/auth/me", response_model=AdminOut)
async def me(admin=Depends(get_current_admin)):
    return AdminOut(admin_id=admin.admin_id, name=admin.name, email=admin.email)
