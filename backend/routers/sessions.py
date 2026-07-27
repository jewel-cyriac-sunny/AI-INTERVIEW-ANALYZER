"""InterviewSession CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from auth_utils import get_current_admin
from schemas import InterviewSessionCreate, InterviewSessionUpdate, InterviewSessionOut

router = APIRouter()


@router.get("/sessions", response_model=List[InterviewSessionOut])
async def list_sessions(candidate_id: str | None = None, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        where = {}
        if candidate_id:
            where["candidate_id"] = candidate_id
        sessions = await db.interviewsession.find_many(where=where)
    finally:
        await db.disconnect()
    return sessions


@router.get("/sessions/{session_id}", response_model=InterviewSessionOut)
async def get_session(session_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        session = await db.interviewsession.find_unique(where={"session_id": session_id})
    finally:
        await db.disconnect()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions", response_model=InterviewSessionOut, status_code=201)
async def create_session(body: InterviewSessionCreate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        session = await db.interviewsession.create(
            data={
                "start_time": body.start_time,
                "end_time": body.end_time,
                "status": body.status,
                "candidate_id": body.candidate_id,
            }
        )
    finally:
        await db.disconnect()
    return session


@router.put("/sessions/{session_id}", response_model=InterviewSessionOut)
async def update_session(session_id: str, body: InterviewSessionUpdate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.interviewsession.find_unique(where={"session_id": session_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Session not found")
        session = await db.interviewsession.update(
            where={"session_id": session_id},
            data=body.model_dump(exclude_unset=True),
        )
    finally:
        await db.disconnect()
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.interviewsession.find_unique(where={"session_id": session_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Session not found")
        await db.interviewsession.delete(where={"session_id": session_id})
    finally:
        await db.disconnect()
    return None
