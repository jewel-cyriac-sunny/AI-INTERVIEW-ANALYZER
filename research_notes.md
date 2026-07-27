# AI Interview Analyzer - Prototyping Sprint

## Project Overview
An AI-powered interview evaluation system that analyzes candidate video and audio. 
It integrates facial, speech, and body language assessments to deliver objective scores.

## Hardware Environment
- CPU: Intel Core i7-13650HX
- GPU: NVIDIA RTX 4050 (Must use CUDA for ML inference)
- RAM: 24GB DDR5

## Tech Stack
- Backend: FastAPI (Python)
- Database: PostgreSQL
- Media Processing: FFmpeg, OpenCV
- ML Models: OpenAI Whisper (Audio), MediaPipe (Pose/Blinks), Pre-trained CNN (Emotion)
- Reporting: Matplotlib (Graphs), WeasyPrint (PDFs)

## Current Objective
Implement a "Wizard of Oz" prototype first (fake ML metrics), then swap in real local ML models sequentially.