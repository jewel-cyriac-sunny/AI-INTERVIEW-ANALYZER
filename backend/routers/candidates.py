"""Candidates CRUD + CSV upload with validation."""

import csv
import io
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from prisma import Prisma

from auth_utils import hash_password, get_current_admin
from schemas import CandidateCreate, CandidateUpdate, CandidateOut

router = APIRouter()

REQUIRED_CSV_COLUMNS = {"name", "email"}
ALLOWED_CSV_COLUMNS = {"name", "email", "phone", "password"}


@router.get("/candidates", response_model=List[CandidateOut])
async def list_candidates(admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        candidates = await db.candidate.find_many(where={"admin_id": admin.admin_id})
    finally:
        await db.disconnect()
    return candidates


@router.get("/candidates/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        candidate = await db.candidate.find_unique(where={"candidate_id": candidate_id})
    finally:
        await db.disconnect()

    if not candidate or candidate.admin_id != admin.admin_id:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.post("/candidates", response_model=CandidateOut, status_code=201)
async def create_candidate(body: CandidateCreate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        candidate = await db.candidate.create(
            data={
                "name": body.name,
                "email": body.email,
                "phone": body.phone,
                "password_hash": hash_password(body.password),
                "admin_id": admin.admin_id,
            }
        )
    finally:
        await db.disconnect()
    return candidate


@router.put("/candidates/{candidate_id}", response_model=CandidateOut)
async def update_candidate(candidate_id: str, body: CandidateUpdate, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.candidate.find_unique(where={"candidate_id": candidate_id})
        if not existing or existing.admin_id != admin.admin_id:
            raise HTTPException(status_code=404, detail="Candidate not found")

        update_data = body.model_dump(exclude_unset=True)
        candidate = await db.candidate.update(
            where={"candidate_id": candidate_id},
            data=update_data,
        )
    finally:
        await db.disconnect()
    return candidate


@router.delete("/candidates/{candidate_id}", status_code=204)
async def delete_candidate(candidate_id: str, admin=Depends(get_current_admin)):
    db = Prisma()
    await db.connect()
    try:
        existing = await db.candidate.find_unique(where={"candidate_id": candidate_id})
        if not existing or existing.admin_id != admin.admin_id:
            raise HTTPException(status_code=404, detail="Candidate not found")
        await db.candidate.delete(where={"candidate_id": candidate_id})
    finally:
        await db.disconnect()
    return None


@router.post("/candidates/upload-csv", status_code=201)
async def upload_csv(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    # ── Validate file type ──────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a .csv file.",
        )

    # ── Read and decode ─────────────────────────────────────
    try:
        raw = await file.read()
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Unable to read CSV. Make sure the file is UTF-8 encoded.",
        )

    # ── Parse header & validate columns ─────────────────────
    try:
        reader = csv.DictReader(io.StringIO(content))
        fieldnames = set(reader.fieldnames or [])
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not parse CSV header. Make sure the first row contains column names.",
        )

    if not fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no header row.")

    # Strip whitespace from column names
    fieldnames = {f.strip().lower() for f in fieldnames}

    missing = REQUIRED_CSV_COLUMNS - fieldnames
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(sorted(missing))}. "
                   f"Required columns are: {', '.join(sorted(REQUIRED_CSV_COLUMNS))}. "
                   f"Optional columns: {', '.join(sorted(ALLOWED_CSV_COLUMNS - REQUIRED_CSV_COLUMNS))}.",
        )

    # ── Parse rows with validation ──────────────────────────
    rows = []
    errors = []
    # Re-create reader to iterate from start
    reader = csv.DictReader(io.StringIO(content))
    for i, row in enumerate(reader, start=2):  # row 2 = first data row
        # Normalise keys
        normalised = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}

        name = normalised.get("name", "")
        email = normalised.get("email", "")

        if not name:
            errors.append(f"Row {i}: 'name' is empty.")
        if not email:
            errors.append(f"Row {i}: 'email' is empty.")
        elif "@" not in email:
            errors.append(f"Row {i}: '{email}' is not a valid email.")

        if not errors or len(errors) <= 10:  # collect up to 10 errors
            rows.append(normalised)

    if errors:
        raise HTTPException(
            status_code=400,
            detail="CSV validation failed:\n" + "\n".join(errors[:10])
                   + (f"\n... and {len(errors) - 10} more errors." if len(errors) > 10 else ""),
        )

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file contains no data rows.")

    # ── Insert into DB ──────────────────────────────────────
    db = Prisma()
    await db.connect()
    created = []
    try:
        for row in rows:
            candidate = await db.candidate.create(
                data={
                    "name": row.get("name", ""),
                    "email": row.get("email", ""),
                    "phone": row.get("phone") or None,
                    "password_hash": hash_password(row.get("password") or "changeme"),
                    "admin_id": admin.admin_id,
                }
            )
            created.append(candidate)
    finally:
        await db.disconnect()

    return {
        "message": f"Successfully imported {len(created)} candidate(s).",
        "count": len(created),
        "candidates": [CandidateOut.model_validate(c, from_attributes=True).model_dump() for c in created],
    }
