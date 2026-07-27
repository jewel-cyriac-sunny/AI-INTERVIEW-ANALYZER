"""Question CRUD, scoped to admin. Routes: /admin/questions"""

import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from auth_utils import get_current_admin
from schemas import QuestionCreate, QuestionUpdate, QuestionOut

router = APIRouter()


def _serialize_keywords(keywords: list) -> str:
    """Ensure keywords are stored as a JSON-encoded string for Prisma Json field."""
    return json.dumps(keywords)


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


@router.get("/admin/questions", response_model=List[QuestionOut])
async def list_questions(admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        questions = await db.question.find_many(where={"admin_id": admin.admin_id})
    finally:
        await db.disconnect()
    return [_question_to_out(q) for q in questions]


@router.get("/admin/questions/{question_id}", response_model=QuestionOut)
async def get_question(question_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        question = await db.question.find_unique(where={"question_id": question_id})
    finally:
        await db.disconnect()

    if not question or question.admin_id != admin.admin_id:
        raise HTTPException(status_code=404, detail="Question not found")
    return _question_to_out(question)


@router.post("/admin/questions", response_model=QuestionOut, status_code=201)
async def create_question(body: QuestionCreate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        question = await db.question.create(
            data={
                "text": body.text,
                "keywords": _serialize_keywords(body.keywords),
                "time_limit": body.time_limit,
                "admin_id": admin.admin_id,
            }
        )
    finally:
        await db.disconnect()
    return _question_to_out(question)


@router.put("/admin/questions/{question_id}", response_model=QuestionOut)
async def update_question(question_id: str, body: QuestionUpdate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.question.find_unique(where={"question_id": question_id})
        if not existing or existing.admin_id != admin.admin_id:
            raise HTTPException(status_code=404, detail="Question not found")

        update_data = body.model_dump(exclude_unset=True)
        # Serialize keywords to JSON string if present
        if "keywords" in update_data and update_data["keywords"] is not None:
            update_data["keywords"] = _serialize_keywords(update_data["keywords"])

        question = await db.question.update(
            where={"question_id": question_id},
            data=update_data,
        )
    finally:
        await db.disconnect()
    return _question_to_out(question)


@router.delete("/admin/questions/{question_id}", status_code=204)
async def delete_question(question_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.question.find_unique(where={"question_id": question_id})
        if not existing or existing.admin_id != admin.admin_id:
            raise HTTPException(status_code=404, detail="Question not found")
        await db.question.delete(where={"question_id": question_id})
    finally:
        await db.disconnect()
    return None
