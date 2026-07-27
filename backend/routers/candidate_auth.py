"""Candidate auth router – login and profile for mobile app."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from prisma import Prisma

from auth_utils import verify_password, create_access_token
from schemas import LoginRequest, CandidateLoginResponse, CandidateOut, InterviewOut
from typing import List

router = APIRouter()

candidate_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/candidate/login")


# ── Dependency ──────────────────────────────────────────────

async def get_current_candidate(token: str = Depends(candidate_oauth2_scheme)):
    """Extract and validate the current candidate from a JWT token."""
    from jose import JWTError, jwt
    from auth_utils import SECRET_KEY, ALGORITHM

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        candidate_id: str = payload.get("sub")
        role: str = payload.get("role")
        if candidate_id is None or role != "candidate":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = Prisma()
    await db.connect()
    try:
        candidate = await db.candidate.find_unique(where={"candidate_id": candidate_id})
    finally:
        await db.disconnect()

    if candidate is None:
        raise credentials_exception
    return candidate


# ── Endpoints ───────────────────────────────────────────────

@router.post("/auth/candidate/login", response_model=CandidateLoginResponse)
async def candidate_login(body: LoginRequest):
    db = Prisma()
    await db.connect()
    try:
        candidate = await db.candidate.find_first(where={"email": body.email})
    finally:
        await db.disconnect()

    if not candidate or not verify_password(body.password, candidate.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(data={"sub": candidate.candidate_id, "role": "candidate"})
    return CandidateLoginResponse(
        token=token,
        user=CandidateOut(
            candidate_id=candidate.candidate_id,
            name=candidate.name,
            email=candidate.email,
            phone=candidate.phone,
            admin_id=candidate.admin_id,
        ),
    )


@router.get("/auth/candidate/me", response_model=CandidateOut)
async def candidate_me(candidate=Depends(get_current_candidate)):
    return CandidateOut(
        candidate_id=candidate.candidate_id,
        name=candidate.name,
        email=candidate.email,
        phone=candidate.phone,
        admin_id=candidate.admin_id,
    )


@router.get("/auth/candidate/interviews", response_model=List[InterviewOut])
async def get_candidate_interviews(candidate=Depends(get_current_candidate)):
    db = Prisma()
    await db.connect()
    try:
        interviews = await db.interview.find_many(
            where={"candidate_id": candidate.candidate_id},
            order={"interview_date": "desc"}
        )
    finally:
        await db.disconnect()
    return interviews

