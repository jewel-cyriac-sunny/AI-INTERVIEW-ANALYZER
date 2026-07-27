"""Interviews CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from database import db

from auth_utils import get_current_admin
from schemas import InterviewCreate, InterviewUpdate, InterviewOut, InterviewResultOut

router = APIRouter()


@router.get("/interviews", response_model=List[InterviewOut])
async def list_interviews(candidate_id: str | None = None, admin=Depends(get_current_admin)):
    where = {}
    if candidate_id:
        where["candidate_id"] = candidate_id
    interviews = await db.interview.find_many(where=where)
    return interviews

@router.get("/interviews/results", response_model=List[InterviewResultOut])
async def list_interviews_with_results(admin=Depends(get_current_admin)):
    # Returns all interviews with candidate details joined, only for candidates managed by this admin
    # First, get all candidates for this admin
    candidates = await db.candidate.find_many(where={"admin_id": admin.admin_id})
    candidate_ids = [c.candidate_id for c in candidates]
    
    if not candidate_ids:
        return []
        
    interviews = await db.interview.find_many(
        where={"candidate_id": {"in": candidate_ids}},
        include={"candidate": True}
    )
    return interviews


@router.get("/interviews/{interview_id}", response_model=InterviewOut)
async def get_interview(interview_id: str, admin=Depends(get_current_admin)):
    interview = await db.interview.find_unique(where={"interview_id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.post("/interviews", response_model=InterviewOut, status_code=201)
async def create_interview(body: InterviewCreate, admin=Depends(get_current_admin)):
    interview = await db.interview.create(
        data={
            "interview_date": body.interview_date,
            "interview_type": body.interview_type,
            "candidate_id": body.candidate_id,
        }
    )
    return interview


@router.put("/interviews/{interview_id}", response_model=InterviewOut)
async def update_interview(interview_id: str, body: InterviewUpdate, admin=Depends(get_current_admin)):
    existing = await db.interview.find_unique(where={"interview_id": interview_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview not found")
    interview = await db.interview.update(
        where={"interview_id": interview_id},
        data=body.model_dump(exclude_unset=True),
    )
    return interview


@router.delete("/interviews/{interview_id}", status_code=204)
async def delete_interview(interview_id: str, admin=Depends(get_current_admin)):
    existing = await db.interview.find_unique(where={"interview_id": interview_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview not found")
    await db.interview.delete(where={"interview_id": interview_id})
    return None
