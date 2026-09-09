# workflow
backend = controller & model
# 1. login (RBAC): Browser -> backend -> databse to check credential
# 1a. if correct credentials -> dashboard.html
# 1b. if wrong credentials -> back to SignIn.html

# 2. camera.py sends 2 frames/sec; encoded in base64 before sending to backend
# 3. backend encodes it back into proper frames and sends it to mediapipe while also sending it to the database to be stored (posture_detections)
# 4. mediapipe gets the angles and sends data via json format back to backend and also sends the angles back to database, using a foreign key for reference to find the correct corressponding frame
# 5. ollama will be able to reference the rules_table to come out with the verdict and advice
# 6. robot will know what to do to move in main.py
# 7. Based on past frames, history, analystics and dashboard will be updated
FYI LiveCoach is where the camera will be shown 