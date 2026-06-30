import time
import base64
import requests
import os
from picamera2 import Picamera2
def load_env():
  env_vars={}
  with open (".env") as f:
    for line in f:
      if "=" in line:
        key,value=line.strip().split("=",1)
        env_vars[key]=value
  return env_vars

env=load_env()
SERVER_IP=env["SERVER_IP"]


#set up cam
camera=Picamera2()
camera.start()
time.sleep(2)

frame_id=1
print("Starting camera loop ~ press ctrl c to stop")
while True:
  try:
    camera.capture_file("frame.jpg")
    with open ("frame.jpg", "rb") as f:
      image_bytes=f.read()
    image_b64=base64.b64encode(image_bytes).decode("utf-8")
    payload= {"frame_id": frame_id,
              "timestamp":time.strftime("%Y-%m%dT%H:%M:%S"),
              "image_b64": image_b64}
    response= requests.post(
        f"http://{SERVER_IP}/frame",
        json=payload)
    print(f"Frame {frame_id} sent . Response: {response.json()}")
    frame_id+=1
    time.sleep(2)
  except Exception as e:
    print(f"Something went wrong {e}")
    time.sleep(2)
