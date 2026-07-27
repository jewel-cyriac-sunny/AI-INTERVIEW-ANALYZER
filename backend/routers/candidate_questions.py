"""Candidate-facing question endpoints."""

import json
import random
from typing import List
from fastapi import APIRouter, Depends
from prisma import Prisma

from routers.candidate_auth import get_current_candidate
from schemas import QuestionOut

router = APIRouter()


def _deserialize_keywords(raw) -> list:
    """Parse keywords from the Prisma Json field back to a Python list."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    return []


def _question_to_out(q) -> QuestionOut:
    """Convert a Prisma Question record to the QuestionOut schema."""
    return QuestionOut(
        question_id=q.question_id,
        text=q.text,
        keywords=_deserialize_keywords(q.keywords),
        time_limit=q.time_limit,
        admin_id=q.admin_id,
    )


@router.get("/candidate/questions/generate-session", response_model=List[QuestionOut])
async def generate_session(candidate=Depends(get_current_candidate)):
    """
    Retrieve all questions from the database, randomly select exactly 5,
    and return them as a JSON array for the candidate's interview session.
    If fewer than 5 questions exist, all available questions are returned.
    """
    db = Prisma()
    await db.connect()
    try:
        all_questions = await db.question.find_many()
    finally:
        await db.disconnect()

    # Randomly pick 5 (or fewer if the bank is small)
    count = min(5, len(all_questions))
    selected = random.sample(all_questions, count)

    return [_question_to_out(q) for q in selected]
