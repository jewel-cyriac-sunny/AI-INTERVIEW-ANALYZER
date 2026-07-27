import cv2
import math
import logging
import os
import urllib.request

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Blink detection constants
EAR_THRESHOLD = 0.21
# Posture detection constants
SHOULDER_ANGLE_THRESHOLD = 5.0  # degrees

# Model file paths (stored alongside this script)
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
FACE_MODEL_PATH = os.path.join(MODELS_DIR, "face_landmarker.task")
POSE_MODEL_PATH = os.path.join(MODELS_DIR, "pose_landmarker_lite.task")

# Google Cloud Storage URLs for MediaPipe model bundles
FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

# Left and right eye landmark indices in MediaPipe Face Mesh (468-point topology)
# These indices are identical between legacy and Tasks API
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
LEFT_EYE = [362, 385, 387, 263, 373, 380]


def _ensure_models_downloaded():
    """Downloads MediaPipe .task model files if they don't already exist."""
    os.makedirs(MODELS_DIR, exist_ok=True)

    for path, url, name in [
        (FACE_MODEL_PATH, FACE_MODEL_URL, "face_landmarker.task"),
        (POSE_MODEL_PATH, POSE_MODEL_URL, "pose_landmarker_lite.task"),
    ]:
        if not os.path.exists(path):
            logging.info(f"Downloading MediaPipe model: {name} ...")
            urllib.request.urlretrieve(url, path)
            logging.info(f"Downloaded {name} to {path}")


def euclidean_distance(p1, p2):
    return math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)


def calculate_ear(eye_landmarks, all_landmarks):
    """Calculate Eye Aspect Ratio from 6 landmark indices."""
    p1 = all_landmarks[eye_landmarks[0]]
    p2 = all_landmarks[eye_landmarks[1]]
    p3 = all_landmarks[eye_landmarks[2]]
    p4 = all_landmarks[eye_landmarks[3]]
    p5 = all_landmarks[eye_landmarks[4]]
    p6 = all_landmarks[eye_landmarks[5]]

    # Vertical distances
    v1 = euclidean_distance(p2, p6)
    v2 = euclidean_distance(p3, p5)

    # Horizontal distance
    h = euclidean_distance(p1, p4)

    ear = (v1 + v2) / (2.0 * h) if h > 0 else 0
    return ear


def calculate_shoulder_angle(left_shoulder, right_shoulder):
    """Calculate horizontal angle between shoulders in degrees."""
    dy = right_shoulder.y - left_shoulder.y
    dx = right_shoulder.x - left_shoulder.x

    angle_rad = math.atan2(dy, dx)
    angle_deg = math.degrees(angle_rad)

    if angle_deg < 0:
        angle_deg += 180
    if angle_deg > 90:
        angle_deg = 180 - angle_deg

    return abs(angle_deg)


def analyze_video_metrics(video_path: str) -> dict:
    """
    Analyzes an interview video for blinks and posture using MediaPipe Tasks API.
    Processes every 10th frame on the CPU.

    Returns:
        dict: {"blink_count": int, "poor_posture": bool}
    """
    # Ensure model files are present (downloads on first run)
    _ensure_models_downloaded()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"blink_count": 0, "poor_posture": False}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    blink_count = 0
    is_eyes_closed = False
    shoulder_angles = []
    shoulder_y_coords = []
    frame_count = 0

    # Configure FaceLandmarker for VIDEO mode
    face_options = vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=FACE_MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
    )

    # Configure PoseLandmarker for VIDEO mode
    pose_options = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=POSE_MODEL_PATH),
        running_mode=vision.RunningMode.VIDEO,
    )

    face_landmarker = vision.FaceLandmarker.create_from_options(face_options)
    pose_landmarker = vision.PoseLandmarker.create_from_options(pose_options)

    try:
        while True:
            success, frame = cap.read()
            if not success:
                break

            # Process every 10th frame
            if frame_count % 10 != 0:
                frame_count += 1
                continue

            # Calculate timestamp in milliseconds for this frame
            timestamp_ms = int(frame_count * 1000 / fps)
            frame_count += 1

            # Convert BGR to RGB and wrap in MediaPipe Image
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

            # --- Blink Detection (FaceLandmarker) ---
            face_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)
            if face_result.face_landmarks:
                landmarks = face_result.face_landmarks[0]  # first face

                left_ear = calculate_ear(LEFT_EYE, landmarks)
                right_ear = calculate_ear(RIGHT_EYE, landmarks)
                avg_ear = (left_ear + right_ear) / 2.0

                if avg_ear < EAR_THRESHOLD:
                    is_eyes_closed = True
                else:
                    if is_eyes_closed:
                        blink_count += 1
                        is_eyes_closed = False

            # --- Posture Evaluation (PoseLandmarker) ---
            pose_result = pose_landmarker.detect_for_video(mp_image, timestamp_ms)
            if pose_result.pose_landmarks:
                pose_lms = pose_result.pose_landmarks[0]  # first person
                left_shoulder = pose_lms[11]   # LEFT_SHOULDER index
                right_shoulder = pose_lms[12]  # RIGHT_SHOULDER index

                # Only consider if visibility is good
                if left_shoulder.visibility > 0.5 and right_shoulder.visibility > 0.5:
                    angle = calculate_shoulder_angle(left_shoulder, right_shoulder)
                    shoulder_angles.append(angle)

                    avg_y = (left_shoulder.y + right_shoulder.y) / 2.0
                    shoulder_y_coords.append(avg_y)

    finally:
        cap.release()
        face_landmarker.close()
        pose_landmarker.close()

    # Determine poor posture
    poor_posture = False
    if shoulder_angles:
        avg_angle = sum(shoulder_angles) / len(shoulder_angles)
        if avg_angle > SHOULDER_ANGLE_THRESHOLD:
            poor_posture = True

    # Check for high variance in vertical shoulder position (slouching)
    if shoulder_y_coords and not poor_posture and len(shoulder_y_coords) > 1:
        mean_y = sum(shoulder_y_coords) / len(shoulder_y_coords)
        variance_y = sum((y - mean_y) ** 2 for y in shoulder_y_coords) / (len(shoulder_y_coords) - 1)
        std_dev_y = math.sqrt(variance_y)
        if std_dev_y > 0.05:
            poor_posture = True

    return {
        "blink_count": blink_count,
        "poor_posture": poor_posture
    }
