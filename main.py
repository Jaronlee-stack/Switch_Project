import requests
import time

# Robot's IP address
ROBOT_IP = "http://192.168.4.1/js"

# Last posture
last_posture = None

# Sending JSON command to WaveGo
def send(command):
    try:
        response = requests.post(
            ROBOT_IP,
            json=command,
            timeout=3
        )

        print("Sent:", command)
        print("Status:", response.status_code)

    except Exception as e:
        print("Error:", e)

# -------------------------------
# Robot Movement
def stand():
    send({"T":100})

def stop():
    send({"T":111,"FB":0,"LR":0})

def walk_forward():
    send({"T":111,"FB":1,"LR":0})

def walk_backward():
    send({"T":111,"FB":-1,"LR":0})

def turn_left():
    send({"T":111,"FB":0,"LR":-1})

def turn_right():
    send({"T":111,"FB":0,"LR":1})

def head_forward():
    send({"T":111,"FB":0.2,"LR":0})

# slouch() and prolonged_slouch() to be replaced by custom servo poses 
def slouch():
    # Hind legs lowered 
    send({"T":111,"FB":-0.2,"LR":0})

def prolonged_slouch():
    send({"T":111,"FB":-0.5,"LR":0})

# -------------------------------
# LED > Reminders/Indicators ? 

def led_red():
    send({"T":132,"R":255,"G":0,"B":0})

def led_green():
    send({"T":132,"R":0,"G":255,"B":0})

def led_yellow():
    send({"T":132,"R":255,"G":255,"B":0})

# -------------------------------
# Posture functions

def good_posture():
    print("Good posture detected.")
    stand()
    led_green()

def slouching_posture():
    print("Slouching detected.")
    led_yellow()
    slouch()

def prolonged_slouching_posture():
    print("Prolonged slouching detected.")
    led_red()
    prolonged_slouch() # to be replaced

# -------------------------------
# Proccess the JSON > Posture

POSTURE_ACTIONS = {
    "not_slouching": good_posture,
    "slouching": slouching_posture,
    "prolonged_slouching": prolonged_slouching_posture
}

# AFTER INTEGRATION
# response = requests.get("http://server-ip/posture")
# data = response.json()
# process_posture(data)
# AFTER INTEGRATION

def process_posture(data):

    global last_posture

    posture_values = data.get("_posture_values", [])

    if not posture_values:
        print("No posture data received.")
        return 
    
    posture = posture_values[0]

    if posture == last_posture: # ignores duplicate posture
        return 
    
    last_posture = posture

    print("Posture:", posture)
    
    action = POSTURE_ACTIONS.get(posture)

    if action:
        action()
    else:
        print("Unknown posture detected:", posture)

# -------------------------------
# Robot startup

def initialise():
    print("======================")
    print("Habit Coach Started")
    print("Waiting for posture...")
    
    print("======================")
    led_green()
    stand()

# BEFORE INTEGRATION > TEMP TEST
if __name__ ==  "__main__":

    initialise()

    while True:
        posture = input("Enter posture (not_slouching / slouching / prolonged_slouching / q): ")

        if posture.lower() == "q":
            break
        
        process_posture({
            "_posture_values":[posture]
        })

        if posture.lower() == "slouching":
            slouching_posture()

        elif posture.lower() == "not_slouching":
            good_posture()

        elif posture.lower() == "prolonged_slouching":
            prolonged_slouching_posture()

# BEFORE INTEGRATION > TEMP TEST