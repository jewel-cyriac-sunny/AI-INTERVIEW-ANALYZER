"""
Interview Analysis - Wizard of Oz prototype endpoint.

Accepts a video upload, saves it temporarily to ./app/uploads/,
waits 5 seconds to simulate ML processing, deletes the file,
and returns hardcoded metrics.
"""

import asyncio
import os
import uuid
import traceback

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Depends
from datetime import datetime, timezone
from prisma import Prisma
import json
from routers.candidate_auth import get_current_candidate
from app.ml.process_audio import extract_audio_and_transcribe
from app.ml.process_video import analyze_video_metrics
from app.ml.score_generator import calculate_heuristic_score, generate_pdf_report
from app.ml.keyword_matcher import calculate_keyword_match


UPLOAD_DIR = os.path.join("app", "uploads")

router = APIRouter()


@router.post("/analyze-interview")
async def analyze_interview(
    request: Request, 
    video: UploadFile = File(...), 
    expected_keywords: str = Form("[]"),
    candidate=Depends(get_current_candidate)
):
    """
    Prototype endpoint: accepts a video file, simulates ML analysis (5s delay),
    and returns hardcoded metrics. No real processing is performed.
    """
    # Validate that the uploaded file is a video
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file type '{video.content_type}'. Please upload a video file.",
        )

    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Build a unique filename to avoid collisions
    ext = os.path.splitext(video.filename or "upload")[1] or ".mp4"
    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    # Save the file to disk
    try:
        contents = await video.read()
        with open(temp_path, "wb") as f:
            f.write(contents)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {exc}")

    # Process audio and video concurrently
    try:
        # Run ML processing in a separate thread so it doesn't block the async loop
        audio_task = asyncio.to_thread(extract_audio_and_transcribe, temp_path)
        video_task = asyncio.to_thread(analyze_video_metrics, temp_path)
        
        ml_results, video_results = await asyncio.gather(audio_task, video_task)
        
        filler_words_count = ml_results["filler_words_count"]
        transcript = ml_results.get("transcript", "")
        blink_count = video_results["blink_count"]
        poor_posture = video_results["poor_posture"]
        
        # Parse expected keywords
        try:
            parsed_keywords = json.loads(expected_keywords)
            if not isinstance(parsed_keywords, list):
                parsed_keywords = []
        except json.JSONDecodeError:
            parsed_keywords = []
            
        keyword_metrics = calculate_keyword_match(transcript, parsed_keywords)
        keyword_match_percentage = keyword_metrics["match_percentage"]
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ML processing failed: {exc}")
    finally:
        # Clean up the temporary video file
        try:
            os.remove(temp_path)
        except OSError:
            pass  # Best-effort cleanup

    # Calculate score based on extracted metrics
    scores = calculate_heuristic_score(blink_count, poor_posture, filler_words_count, keyword_match_percentage)
    
    # Generate the PDF report
    metrics_data = {
        "blink_count": blink_count,
        "poor_posture": poor_posture,
        "filler_words_count": filler_words_count,
        "matched_keywords": keyword_metrics["matched_keywords"],
        "matched_count": keyword_metrics["matched_count"],
        "total_expected": keyword_metrics["total_expected"]
    }
    pdf_filename = generate_pdf_report(metrics_data, scores)
    
    # Include request base URL to give absolute URL for mobile apps
    base_url = str(request.base_url).rstrip("/")
    report_url = f"{base_url}/uploads/{pdf_filename}"
    
    # Determine interview title
    db = Prisma()
    await db.connect()
    try:
        count = await db.interview.count(where={"candidate_id": candidate.candidate_id})
        interview_title = f"Interview {count + 1}"

        # Save to database
        interview = await db.interview.create(
            data={
                "interview_date": datetime.now(timezone.utc),
                "interview_type": interview_title,
                "candidate_id": candidate.candidate_id,
                "score": float(scores["overall"]),
                "filler_words": filler_words_count,
                "blinks": blink_count,
                "poor_posture": poor_posture,
                "report_url": report_url,
            }
        )
    finally:
        await db.disconnect()

    # Return mix of real and Wizard-of-Oz metrics
    return {
        "interview_id": interview.interview_id,
        "score": scores["overall"], 
        "filler_words": filler_words_count, 
        "blinks": blink_count,
        "poor_posture": poor_posture,
        "keyword_score": scores["keyword_score"],
        "report_url": report_url
    }
