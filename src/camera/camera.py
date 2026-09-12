"""
Camera sender: captures webcam frames, base64-encodes them and POSTs
them to the backend ingestion endpoint.

Run:  pip install opencv-python requests
      python camera.py

Environment variables:
  CAMERA_USER_ID   UUID of a registered user in the database (required)
  BACKEND_URL      defaults to http://localhost:3000/api/frame
  CAMERA_INTERVAL  seconds between frames, defaults to 2
  CAMERA_SOURCE    camera index (0, 1, 2) or an IP stream URL
                   defaults to 0 (laptop/USB webcam)
"""

import base64
import os
import time
import uuid
import cv2
import requests

BACKEND_URL      = os.getenv("BACKEND_URL",    "http://localhost:3000/api/frame")
USER_ID          = os.getenv("CAMERA_USER_ID")
INTERVAL_SECONDS = float(os.getenv("CAMERA_INTERVAL", "2"))
CAMERA_SOURCE    = os.getenv("CAMERA_SOURCE",  "0")

SESSION_FILE = ".camera_session"


def get_session_id():
    if os.path.exists(SESSION_FILE):
        return open(SESSION_FILE).read().strip()
    sid = str(uuid.uuid4())
    open(SESSION_FILE, "w").write(sid)
    return sid


def open_camera(source):
    """Convert source to int if it's a digit, else treat as URL."""
    src = int(source) if source.isdigit() else source
    cap = cv2.VideoCapture(src)
    return cap


def main():
    if not USER_ID:
        raise SystemExit("Set CAMERA_USER_ID to a UUID from the users table")

    session_id = get_session_id()

    cap = open_camera(CAMERA_SOURCE)
    if not cap.isOpened():
        raise SystemExit(
            f"Could not open camera source '{CAMERA_SOURCE}'. "
            "Set CAMERA_SOURCE=0 for webcam or CAMERA_SOURCE=http://... for IP stream."
        )

    frame_id = 0
    print(f"Camera source : {CAMERA_SOURCE}")
    print(f"Streaming to  : {BACKEND_URL}")
    print(f"Session       : {session_id}")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Warning: frame read failed, retrying...")
            time.sleep(0.5)
            continue

        frame_id += 1
        _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        payload = {
            "frame_id":   frame_id,
            "user_id":    USER_ID,
            "session_id": session_id,
            "image":      base64.b64encode(jpeg).decode("utf-8"),
        }

        try:
            r    = requests.post(BACKEND_URL, json=payload, timeout=15)
            body = r.json()
            print(
                f"[{frame_id}] {r.status_code} -> {body.get('posture_status')}"
                + (f" (purged {body.get('purged_frames')})" if body.get("purged_frames") else "")
            )
        except requests.RequestException as e:
            print(f"[{frame_id}] send failed: {e}")

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()