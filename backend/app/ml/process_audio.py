import os
import tempfile
import uuid
import subprocess
import whisper
import imageio_ffmpeg
import torch
import re
import shutil

# Whisper internally calls 'ffmpeg' via subprocess and expects the filename to be exactly 'ffmpeg.exe'.
# The imageio_ffmpeg binary is named something like 'ffmpeg-win-x86_64-v7.1.exe'.
# We must create a copy named 'ffmpeg.exe' in the same directory so Whisper can find it.
imageio_exe = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_dir = os.path.dirname(imageio_exe)
ffmpeg_alias = os.path.join(ffmpeg_dir, "ffmpeg.exe" if os.name == "nt" else "ffmpeg")

if not os.path.exists(ffmpeg_alias):
    try:
        shutil.copyfile(imageio_exe, ffmpeg_alias)
        os.chmod(ffmpeg_alias, 0o755)
    except Exception as e:
        print(f"Warning: Failed to create ffmpeg.exe alias: {e}")

if ffmpeg_dir not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{ffmpeg_dir}{os.pathsep}{os.environ.get('PATH', '')}"

# Load the Whisper model lazily (will be cached after first use)
MODEL = None

def get_whisper_model():
    global MODEL
    if MODEL is None:
        # Fallback to cpu just in case, but standard behavior forces logic to CUDA
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper 'base' model on device: {device}")
        
        # Using base model by default for speed over accuracy
        MODEL = whisper.load_model("base", device=device)
    return MODEL

def extract_audio(video_path: str, output_wav_path: str):
    """
    Extracts audio from a video file into a WAV file using imageio-ffmpeg's bundled ffmpeg binary.
    """
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    # Run ffmpeg to convert video to wav
    command = [
        ffmpeg_exe,
        "-y", # Overwrite output files without asking
        "-i", video_path,
        "-vn", # Disable video stream
        "-acodec", "pcm_s16le", # PCM 16-bit
        "-ar", "16000", # 16kHz for Whisper optimal use
        "-ac", "1", # Mono audio
        output_wav_path
    ]
    
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed:\n{result.stderr.decode('utf-8', errors='ignore')}")
        
    return output_wav_path

def count_filler_words(text: str, fillers=None):
    """
    Counts occurrences of common filler words ('um', 'uh', 'like') in the given text.
    Uses regex for precise whole-word matching.
    """
    if fillers is None:
        # Whisper may spell them with double letters, so we catch common variants
        fillers = ["um", "uh", "like", "umm", "uhh", "ah", "hmm"]
        
    total_count = 0
    text_lower = text.lower()
    
    for filler in fillers:
        pattern = r'\b' + re.escape(filler) + r'\b'
        count = len(re.findall(pattern, text_lower))
        total_count += count
        
    return total_count

def extract_audio_and_transcribe(video_path: str) -> dict:
    """
    Orchestrates the audio extraction and transcription ML pipeline.
    """
    temp_wav_path = os.path.join(tempfile.gettempdir(), f"audio_extract_{uuid.uuid4().hex}.wav")
    
    try:
        # Extract audio track
        extract_audio(video_path, temp_wav_path)
        
        # Transcribe audio using Whisper
        model = get_whisper_model()
        
        # We pass an initial_prompt filled with filler words. 
        # This hints to Whisper's auto-regressive model that it should NOT filter these out.
        result = model.transcribe(
            temp_wav_path, 
            initial_prompt="Um, let me think, like, uh, umm, well..."
        )
        
        transcript_text = result.get("text", "")
        
        # Calculate heuristics
        fillers_count = count_filler_words(transcript_text)
        
        return {
            "transcript": transcript_text,
            "filler_words_count": fillers_count
        }
    finally:
        # Clean up temporary WAV
        if os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
            except OSError:
                pass
