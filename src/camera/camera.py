"""
Camera sender: captures webcam frames, base64-encodes them and POSTs
them to the backend ingestion endpoint.

Run:  pip install opencv-python requests
      python camera.py
"""

import base64
import os
import time
import uuid

import cv2
import requests

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000/api/frame")
USER_ID = os.getenv("CAMERA_USER_ID")  # must exist in users table
INTERVAL_SECONDS = float(os.getenv("CAMERA_INTERVAL", "2"))

# session persists across restarts so 'prolonged_slouching' streaks survive
SESSION_FILE = ".camera_session"


def get_session_id():
    if os.path.exists(SESSION_FILE):
        return open(SESSION_FILE).read().strip()
    sid = str(uuid.uuid4())
    open(SESSION_FILE, "w").write(sid)
    return sid


def main():
    if not USER_ID:
        raise SystemExit("Set CAMERA_USER_ID to a UUID from the users table")

    session_id = get_session_id()
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise SystemExit("Could not open webcam")

    frame_id = 0
    print(f"Streaming to {BACKEND_URL} (session {session_id})")

    while True:
        ok, frame = cap.read()
        if not ok:
            continue

        frame_id += 1
        _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        payload = {
            "frame_id": frame_id,
            "user_id": USER_ID,
            "session_id": session_id,
            "image": base64.b64encode(jpeg).decode("utf-8"),
        }

        try:
            r = requests.post(BACKEND_URL, json=payload, timeout=15)
            body = r.json()
            print(f"[{frame_id}] {r.status_code} -> {body.get('posture_status')}"
                  + (f" (purged {body.get('purged_frames')})" if body.get("purged_frames") else ""))
        except requests.RequestException as e:
            print(f"[{frame_id}] send failed: {e}")

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()