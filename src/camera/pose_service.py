"""
MediaPipe pose-detection microservice.

Run:   pip install fastapi uvicorn mediapipe opencv-python python-multipart
       uvicorn pose_service:app --port 5001

POST /detect   { "image": "<base64 jpeg>" }
  -> { "person_detected": true, "neck_angle": 165.2, "trunk_lean": 4.1, "head_offset_px": 7.0 }
  -> { "person_detected": false }            if nobody in frame
"""

import base64
import math

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
pose = mp.solutions.pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.5,
)


class FrameRequest(BaseModel):
    image: str


def _angle(a, b, c):
    """Angle at vertex b formed by points a-b-c (degrees)."""
    ba = np.array([a.x - b.x, a.y - b.y])
    bc = np.array([c.x - b.x, c.y - b.y])
    cosang = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cosang, -1.0, 1.0)))


def _landmark_y_down(lm):
    """MediaPipe y grows downward; convert to 'up is positive' coordinates."""
    return type("P", (), {"x": lm.x, "y": -lm.y, "visibility": lm.visibility})


@app.post("/detect")
def detect(req: FrameRequest):
    try:
        img_bytes = base64.b64decode(req.image)
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return {"person_detected": False, "error": "undecodable image"}
    except Exception:
        return {"person_detected": False, "error": "bad base64"}

    h, w = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)

    if not results.pose_landmarks:
        return {"person_detected": False}

    lm = results.pose_landmarks.landmark
    L = mp.solutions.pose.PoseLandmark

    ear, sh, hip = lm[L.LEFT_EAR], lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP]
    if min(ear.visibility, sh.visibility, hip.visibility) < 0.4:
        ear, sh, hip = lm[L.RIGHT_EAR], lm[L.RIGHT_SHOULDER], lm[L.RIGHT_HIP]

    # neck_angle: angle at the shoulder between ear and hip
    neck_angle = _angle(_landmark_y_down(ear), _landmark_y_down(sh), _landmark_y_down(hip))

    # trunk_lean: deviation of the shoulder->hip line from vertical
    dx = (sh.x - hip.x) * w
    dy = (sh.y - hip.y) * h
    trunk_lean = abs(math.degrees(math.atan2(dx, dy)))

    # head_offset_px: horizontal ear-to-shoulder offset in pixels
    head_offset_px = abs(ear.x - sh.x) * w

    return {
        "person_detected": True,
        "neck_angle": round(float(neck_angle), 1),
        "trunk_lean": round(float(trunk_lean), 1),
        "head_offset_px": round(float(head_offset_px), 1),
    }