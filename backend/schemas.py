"""
Pydantic request/response schemas for all API entities.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "AdminOut"


class AdminOut(BaseModel):
    admin_id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class CandidateLoginResponse(BaseModel):
    token: str
    user: "CandidateOut"


# ── Candidate ───────────────────────────────────────────────

class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    admin_id: Optional[str] = None  # auto-filled from token if omitted


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class CandidateOut(BaseModel):
    candidate_id: str
    name: str
    email: str
    phone: Optional[str]
    admin_id: str

    class Config:
        from_attributes = True


class InterviewCreate(BaseModel):
    interview_date: datetime
    interview_type: str
    candidate_id: str


class InterviewUpdate(BaseModel):
    interview_date: Optional[datetime] = None
    interview_type: Optional[str] = None
    score: Optional[float] = None
    filler_words: Optional[int] = None
    blinks: Optional[int] = None
    poor_posture: Optional[bool] = None
    report_url: Optional[str] = None


class InterviewOut(BaseModel):
    interview_id: str
    interview_date: datetime
    interview_type: str
    candidate_id: str
    score: Optional[float] = None
    filler_words: Optional[int] = None
    blinks: Optional[int] = None
    poor_posture: Optional[bool] = None
    report_url: Optional[str] = None

    class Config:
        from_attributes = True


class InterviewResultOut(InterviewOut):
    candidate: "CandidateOut"

    class Config:
        from_attributes = True



# ── FeedbackReport ──────────────────────────────────────────

class FeedbackReportCreate(BaseModel):
    strength: str
    weakness: str
    improvement_suggestion: str
    candidate_id: str


class FeedbackReportUpdate(BaseModel):
    strength: Optional[str] = None
    weakness: Optional[str] = None
    improvement_suggestion: Optional[str] = None


class FeedbackReportOut(BaseModel):
    report_id: str
    strength: str
    weakness: str
    improvement_suggestion: str
    candidate_id: str

    class Config:
        from_attributes = True




# ── InterviewSession ────────────────────────────────────────

class InterviewSessionCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    status: str
    candidate_id: str


class InterviewSessionUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None


class InterviewSessionOut(BaseModel):
    session_id: str
    start_time: datetime
    end_time: datetime
    status: str
    candidate_id: str

    class Config:
        from_attributes = True




# ── Question ────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    text: str
    keywords: List[str] = []
    time_limit: int = 120
    admin_id: Optional[str] = None


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    keywords: Optional[List[str]] = None
    time_limit: Optional[int] = None


class QuestionOut(BaseModel):
    question_id: str
    text: str
    keywords: List[str] = []
    time_limit: int
    admin_id: str

    class Config:
        from_attributes = True


# ── Dashboard ───────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_candidates: int
    total_interviews: int
    total_questions: int
    total_sessions: int
