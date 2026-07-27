---
trigger: always_on
---

# Development Rules

1. ALWAYS use FastAPI for all backend routing.
2. ALWAYS configure PyTorch and Whisper to utilize CUDA (device='cuda') to leverage the local RTX 4050 GPU. Do not default to CPU.
3. Save uploaded media files to `./app/uploads/` temporarily; ensure temporary files are deleted after processing.
4. When writing python scripts for the ML pipeline, modularize the functions (e.g., `process_audio.py`, `process_video.py`) rather than putting everything in `main.py`.