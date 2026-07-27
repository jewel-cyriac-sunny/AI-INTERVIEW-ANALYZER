"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # Load .env before anything else

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
import os
from database import db
from routers import auth, candidate_auth, candidates, interviews, sessions, feedback, questions, candidate_questions, dashboard, interview_analysis

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not db.is_connected():
        await db.connect()
    yield
    if db.is_connected():
        await db.disconnect()


app = FastAPI(
    title="Interview Analyser API",
    version="1.0.0",
    lifespan=lifespan,
)

# Ensure uploads directory exists before mounting
os.makedirs(os.path.join("app", "uploads"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────

app.include_router(auth.router,            prefix="/api/v1", tags=["Auth"])
app.include_router(candidate_auth.router,  prefix="/api/v1", tags=["Candidate Auth"])
app.include_router(candidates.router, prefix="/api/v1", tags=["Candidates"])
app.include_router(interviews.router, prefix="/api/v1", tags=["Interviews"])
app.include_router(sessions.router,   prefix="/api/v1", tags=["Sessions"])
app.include_router(feedback.router,   prefix="/api/v1", tags=["Feedback"])
app.include_router(questions.router,              prefix="/api/v1", tags=["Questions"])
app.include_router(candidate_questions.router,    prefix="/api/v1", tags=["Candidate Questions"])
app.include_router(dashboard.router,              prefix="/api/v1", tags=["Dashboard"])
app.include_router(interview_analysis.router,     prefix="/api/v1", tags=["Interview Analysis"])


@app.get("/health")
async def health():
    return {"status": "ok"}
