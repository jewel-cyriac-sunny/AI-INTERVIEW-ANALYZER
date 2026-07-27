import os
import uuid
from fpdf import FPDF

# The directory where reports are saved
REPORTS_DIR = os.path.join("app", "uploads")

def calculate_heuristic_score(blink_count: int, poor_posture: bool, filler_words_count: int, keyword_match_percentage: float = 100.0) -> dict:
    """
    Calculates a heuristic score based on interview metrics.
    Returns the overall score and the breakdown of components.
    
    Args:
        blink_count: Total blinks detected in the video.
        poor_posture: Whether poor posture was detected.
        filler_words_count: Number of filler words in the transcript.
        keyword_match_percentage: 0-100 float of how many expected keywords appeared.
    """
    # 1. Filler Words: Assume < 5 is good. Max penalty per word.
    # Base 100, lose 5 points per filler word.
    filler_score = max(0, 100 - (filler_words_count * 5))
    
    # 2. Posture: Binary for prototype.
    posture_score = 50 if poor_posture else 100
    
    # 3. Blinks: Assume a normal short clip has 5-15 blinks.
    # If it's 0 or excessively high (e.g. > 30), penalty.
    # This is a highly arbitrary prototype heuristic.
    if blink_count == 0:
        blink_score = 60 # Probably just didn't track well or staring
    elif 5 <= blink_count <= 25:
         blink_score = 100
    elif blink_count > 25:
         blink_score = max(0, 100 - (blink_count - 25) * 4)
    else:
        blink_score = 80 # 1 to 4 blinks

    # 4. Keyword Match: Direct use of the percentage as a score
    keyword_score = min(100, max(0, keyword_match_percentage))
        
    # Overall Score (weighted average)
    # Filler 40%, Keywords 20%, Posture 20%, Blinks 20%
    overall_score = int(
        0.40 * filler_score +
        0.20 * keyword_score +
        0.20 * posture_score +
        0.20 * blink_score
    )
    
    return {
        "overall": overall_score,
        "filler_words_score": filler_score,
        "posture_score": posture_score,
        "blink_score": blink_score,
        "keyword_score": int(keyword_score),
    }


class PDFReport(FPDF):
    def header(self):
        # Logo or Title can go here
        self.set_font('helvetica', 'B', 20)
        self.cell(0, 15, 'Interview Analysis Report', border=False, align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(10, 25, 200, 25)
        self.ln(10)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def generate_pdf_report(metrics: dict, scores: dict) -> str:
    """
    Generates a PDF report using fpdf2 and saves it to app/uploads directory.
    Returns the generated filename.
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    
    pdf = PDFReport()
    pdf.add_page()
    
    # --- Final Score Section ---
    pdf.set_font('helvetica', 'B', 16)
    pdf.cell(0, 10, 'Candidate Summary', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 14)
    if scores['overall'] >= 80:
        pdf.set_text_color(34, 139, 34) # Green
    elif scores['overall'] >= 50:
        pdf.set_text_color(218, 165, 32) # Goldenrod
    else:
        pdf.set_text_color(220, 20, 60) # Crimson
        
    pdf.cell(0, 10, f'Overall Score: {scores["overall"]} / 100', new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0) # Reset to black
    pdf.ln(5)
    
    # --- Metrics Breakdown Section ---
    pdf.set_font('helvetica', 'B', 14)
    pdf.cell(0, 10, 'Metric Breakdown', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 12)
    # 1. Speech Clarity (Filler Words)
    pdf.cell(80, 10, f'- Speech Clarity (Filler Words):', False)
    pdf.cell(40, 10, f'{scores["filler_words_score"]}/100', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('helvetica', 'I', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f'  Detected {metrics["filler_words_count"]} filler words.', new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(2)
    
    # 2. Eye Contact (Blinks)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(80, 10, f'- Eye Contact (Blinks):', False)
    pdf.cell(40, 10, f'{scores["blink_score"]}/100', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('helvetica', 'I', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f'  Detected {metrics["blink_count"]} total blinks.', new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(2)
    
    # 3. Body Language (Posture)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(80, 10, f'- Body Language (Posture):', False)
    pdf.cell(40, 10, f'{scores["posture_score"]}/100', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('helvetica', 'I', 10)
    pdf.set_text_color(100, 100, 100)
    posture_text = "Suboptimal posture detected." if metrics["poor_posture"] else "Good posture maintained."
    pdf.cell(0, 6, f'  {posture_text}', new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    # 4. Content Relevance (Keyword Match)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(80, 10, f'- Content Relevance (Keyword Match):', False)
    pdf.cell(40, 10, f'{scores["keyword_score"]}/100', new_x="LMARGIN", new_y="NEXT")
    pdf.set_font('helvetica', 'I', 10)
    pdf.set_text_color(100, 100, 100)
    if "matched_keywords" in metrics:
        keyword_str = ", ".join(metrics["matched_keywords"]) if metrics["matched_keywords"] else "None"
        pdf.multi_cell(0, 6, f'  Matched keywords: {keyword_str}. ({metrics.get("matched_count", 0)}/{metrics.get("total_expected", 0)} expected)', new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(10)
    
    # --- Advice Section ---
    pdf.set_font('helvetica', 'B', 14)
    pdf.cell(0, 10, 'Personalized Advice', new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font('helvetica', '', 12)
    
    advice = []
    if scores.get('keyword_score', 0) < 60:
        advice.append("Your response missed key expected topics. Ensure you specifically address the keywords associated with the question.")
    if scores['filler_words_score'] < 70:
        advice.append("Try to take a brief pause instead of using filler words like 'um' or 'uh'. This projects more confidence.")
    if scores['posture_score'] < 100:
        advice.append("Ensure your shoulders are relaxed and you are sitting up straight to convey confidence.")
    if scores['blink_score'] < 70:
        advice.append("Maintain steady eye contact. Excessive blinking might signal nervousness, while staring might seem unnatural.")
        
    if not advice:
        advice.append("Great job! Your metrics look excellent. Keep up the good work and maintain this level of professionalism.")
        
    for item in advice:
        pdf.multi_cell(0, 8, f"- {item}", new_x="LMARGIN", new_y="NEXT")
        
    # Generate unique filename
    filename = f"report_{uuid.uuid4().hex}.pdf"
    file_path = os.path.join(REPORTS_DIR, filename)
    
    pdf.output(file_path)
    return filename
