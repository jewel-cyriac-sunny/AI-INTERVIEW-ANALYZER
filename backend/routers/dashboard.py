"""Dashboard stats endpoint."""

from fastapi import APIRouter, Depends
from prisma import Prisma

from auth_utils import get_current_admin
from schemas import DashboardStats

router = APIRouter()


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(admin=Depends(get_current_admin)):
    from database import db
    
    total_candidates = await db.candidate.count(where={"admin_id": admin.admin_id})
    total_interviews = await db.interview.count()
    total_questions = await db.question.count()
    total_sessions = await db.interviewsession.count()

    return DashboardStats(
        total_candidates=total_candidates,
        total_interviews=total_interviews,
        total_questions=total_questions,
        total_sessions=total_sessions,
    )
