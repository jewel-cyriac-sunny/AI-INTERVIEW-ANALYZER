"""FeedbackReport CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from auth_utils import get_current_admin
from schemas import FeedbackReportCreate, FeedbackReportUpdate, FeedbackReportOut

router = APIRouter()


@router.get("/feedback", response_model=List[FeedbackReportOut])
async def list_feedback(candidate_id: str | None = None, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        where = {}
        if candidate_id:
            where["candidate_id"] = candidate_id
        reports = await db.feedbackreport.find_many(where=where)
    finally:
        await db.disconnect()
    return reports


@router.get("/feedback/{report_id}", response_model=FeedbackReportOut)
async def get_feedback(report_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        report = await db.feedbackreport.find_unique(where={"report_id": report_id})
    finally:
        await db.disconnect()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/feedback", response_model=FeedbackReportOut, status_code=201)
async def create_feedback(body: FeedbackReportCreate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        report = await db.feedbackreport.create(
            data={
                "strength": body.strength,
                "weakness": body.weakness,
                "improvement_suggestion": body.improvement_suggestion,
                "candidate_id": body.candidate_id,
            }
        )
    finally:
        await db.disconnect()
    return report


@router.put("/feedback/{report_id}", response_model=FeedbackReportOut)
async def update_feedback(report_id: str, body: FeedbackReportUpdate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.feedbackreport.find_unique(where={"report_id": report_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Report not found")
        report = await db.feedbackreport.update(
            where={"report_id": report_id},
            data=body.model_dump(exclude_unset=True),
        )
    finally:
        await db.disconnect()
    return report


@router.delete("/feedback/{report_id}", status_code=204)
async def delete_feedback(report_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.feedbackreport.find_unique(where={"report_id": report_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Report not found")
        await db.feedbackreport.delete(where={"report_id": report_id})
    finally:
        await db.disconnect()
    return None
