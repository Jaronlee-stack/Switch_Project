// ===============================
// Live Coach Demo
// ===============================

// Fake FPS Counter
const fpsValue = document.querySelector(".fps-tag span");

setInterval(() => {

    const fps = Math.floor(Math.random() * 8) + 25;
    fpsValue.innerText = fps + " FPS";

}, 1000);


// ===============================
// Fake Status Updates
// ===============================

const neck = document.querySelectorAll(".status-item strong")[0];
const shoulder = document.querySelectorAll(".status-item strong")[1];
const back = document.querySelectorAll(".status-item strong")[2];
const hip = document.querySelectorAll(".status-item strong")[3];

const badge = document.querySelector(".status-badge");

const alerts = document.querySelector(".alert-card");

const postureStates = [

    {
        badge: "● Good",
        badgeClass: "good",
        neck: "10°",
        shoulder: "Excellent",
        back: "Normal",
        hip: "Balanced",
        alert: "Excellent posture maintained.",
        type: "success"
    },

    {
        badge: "● Warning",
        badgeClass: "warning",
        neck: "18°",
        shoulder: "Good",
        back: "Slight",
        hip: "Balanced",
        alert: "Slight forward head tilt detected.",
        type: "warning"
    },

    {
        badge: "● Warning",
        badgeClass: "warning",
        neck: "22°",
        shoulder: "Uneven",
        back: "Moderate",
        hip: "Leaning",
        alert: "Adjust your sitting posture.",
        type: "warning"
    }

];

let current = 0;

setInterval(() => {

    current++;

    if(current >= postureStates.length){
        current = 0;
    }

    const state = postureStates[current];

    badge.innerHTML = state.badge;

    badge.classList.remove("warning","good");
    badge.classList.add(state.badgeClass);

    neck.innerHTML = state.neck;
    shoulder.innerHTML = state.shoulder;
    back.innerHTML = state.back;
    hip.innerHTML = state.hip;

    // Change colours

    shoulder.className = "";
    neck.className = "";
    back.className = "";
    hip.className = "";

    neck.classList.add(state.type === "warning" ? "orange" : "green");

    shoulder.classList.add(
        state.shoulder === "Uneven" ? "orange" : "green"
    );

    back.classList.add(
        state.back === "Normal" ? "green" : "orange"
    );

    hip.classList.add(
        state.hip === "Balanced" ? "green" : "orange"
    );

    // Update latest alert

    const firstAlert = alerts.querySelector(".alert");

    if(state.type === "warning"){

        firstAlert.className = "alert warning-alert";

        firstAlert.innerHTML = `
            <div class="alert-icon">
                <i class="ri-error-warning-line"></i>
            </div>

            <div class="alert-text">
                <p>${state.alert}</p>
                <small>Just now</small>
            </div>
        `;

    }

    else{

        firstAlert.className = "alert success-alert";

        firstAlert.innerHTML = `
            <div class="alert-icon">
                <i class="ri-checkbox-circle-line"></i>
            </div>

            <div class="alert-text">
                <p>${state.alert}</p>
                <small>Just now</small>
            </div>
        `;

    }

},5000);


// ===============================
// Fullscreen Camera
// ===============================

const fullscreenBtn = document.querySelector(".ri-fullscreen-line");

fullscreenBtn.addEventListener("click",()=>{

    const camera = document.querySelector(".camera-placeholder");

    if(document.fullscreenElement){

        document.exitFullscreen();

    }

    else{

        camera.requestFullscreen();

    }

});


// ===============================
// Speaker Button
// ===============================

const speaker = document.querySelector(".ri-volume-up-line");

let muted = false;

speaker.addEventListener("click",()=>{

    muted = !muted;

    if(muted){

        speaker.classList.remove("ri-volume-up-line");
        speaker.classList.add("ri-volume-mute-line");

    }

    else{

        speaker.classList.remove("ri-volume-mute-line");
        speaker.classList.add("ri-volume-up-line");

    }

});


// ===============================
// Camera Placeholder Animation
// ===============================

const placeholder = document.querySelector("#video-container p");

let dots = "";

setInterval(()=>{

    dots += ".";

    if(dots.length > 3){

        dots = "";

    }

    placeholder.innerHTML = "Waiting for Camera" + dots;

},500);