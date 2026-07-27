"""
Keyword matching module for interview analysis.

Compares expected keywords against the Whisper transcript to calculate
a keyword match percentage that factors into the final heuristic score.
"""

import re
from typing import List


def calculate_keyword_match(transcript: str, expected_keywords: List[str]) -> dict:
    """
    Check how many expected keywords appear in the transcript text.

    Args:
        transcript: The full transcription text from Whisper.
        expected_keywords: List of keywords the candidate was expected to mention.

    Returns:
        dict with:
            - matched_keywords: list of keywords found in the transcript
            - total_expected: number of expected keywords
            - matched_count: number of keywords that were found
            - match_percentage: 0-100 float representing the match rate
    """
    if not expected_keywords:
        return {
            "matched_keywords": [],
            "total_expected": 0,
            "matched_count": 0,
            "match_percentage": 100.0,  # No keywords expected = full marks
        }

    transcript_lower = transcript.lower()
    matched = []

    for keyword in expected_keywords:
        keyword_lower = keyword.strip().lower()
        if not keyword_lower:
            continue

        # Use word-boundary matching for single words,
        # substring matching for multi-word phrases
        if " " in keyword_lower:
            # Multi-word phrase: simple substring check
            if keyword_lower in transcript_lower:
                matched.append(keyword)
        else:
            # Single word: whole-word boundary match
            pattern = r'\b' + re.escape(keyword_lower) + r'\b'
            if re.search(pattern, transcript_lower):
                matched.append(keyword)

    total = len([k for k in expected_keywords if k.strip()])
    match_count = len(matched)
    percentage = (match_count / total * 100.0) if total > 0 else 100.0

    return {
        "matched_keywords": matched,
        "total_expected": total,
        "matched_count": match_count,
        "match_percentage": round(percentage, 2),
    }
