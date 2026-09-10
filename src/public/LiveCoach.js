/* ==============================================
   LiveCoach.js  —  real SSE stream from backend
============================================== */

/* Alert log (newest first, max 5) */
const alertLog = [];

document.addEventListener("DOMContentLoaded", () => {

    connectStream();
    initControls();

});


/* ==============================================
   SSE STREAM
============================================== */

async function connectStream() {

    const streamStatus = document.getElementById("stream-status");
    const liveDot      = document.getElementById("live-dot");

    streamStatus.textContent = "Connecting...";

    /*
     * EventSource does NOT support custom headers.
     * On same-origin (Express serves the HTML) the httpOnly cookie
     * is sent automatically — auth works.
     *
     * On a different port (e.g. Live Server :5500 → API :3000) cookies
     * are not forwarded, so we first fetch /api/user/me (which DOES
     * send credentials) to learn the userId, then pass it as a query
     * param so the stream endpoint can identify the caller.
     */
    let streamUrl = "/api/posture/stream";

    const userData = await api.get("/user/me").catch(() => null);
    if (userData?.user?.user_id) {
        streamUrl += `?user_id=${encodeURIComponent(userData.user.user_id)}`;
    }

    const es = new EventSource(streamUrl, { withCredentials: true });

    es.addEventListener("open", () => {
        streamStatus.textContent = "Live";
        liveDot.style.background = "#4ade80";
    });

    es.addEventListener("message", (event) => {
        try {
            const payload = JSON.parse(event.data);
            if (payload.connected) return; // handshake
            if (payload.detection)  applyDetection(payload.detection);
        } catch (err) {
            console.warn("SSE parse error:", err);
        }
    });

    es.addEventListener("error", () => {
        streamStatus.textContent = "Reconnecting...";
        liveDot.style.background = "#f59e0b";
    });
}


/* ==============================================
   APPLY DETECTION DATA TO UI
============================================== */

function applyDetection(d) {

    if (!d) return;

    const status  = d.posture_status ?? "unknown";
    const score   = Math.round(d.posture_score ?? 0);
    const issue   = d.issue?.replace(/_/g, " ") ?? "None";

    /* Badge */
    const badge    = document.getElementById("status-badge");
    const badgeMap = {
        good:                { label: "● Good",               cls: "good"    },
        slouching:           { label: "● Slouching",          cls: "warning" },
        prolonged_slouching: { label: "● Prolonged Slouching",cls: "bad"     },
        no_person:           { label: "● No Person",          cls: "neutral" }
    };
    const b = badgeMap[status] ?? { label: `● ${status}`, cls: "warning" };
    badge.textContent  = b.label;
    badge.className    = `status-badge ${b.cls}`;

    /* Stat values */
    setText("stat-neck",  d.neck_angle   != null ? d.neck_angle.toFixed(1)   + "°"  : "—");
    setText("stat-trunk", d.trunk_lean   != null ? d.trunk_lean.toFixed(1)   + "°"  : "—");
    setText("stat-head",  d.head_offset_px != null ? d.head_offset_px.toFixed(1) + "px" : "—");
    setText("stat-score", score + "%");

    colorValue("stat-neck",  d.neck_angle   >= 150 ? "green" : "orange");
    colorValue("stat-trunk", d.trunk_lean   <= 10  ? "green" : "orange");
    colorValue("stat-head",  d.head_offset_px <= 10 ? "green" : "orange");
    colorValue("stat-score", score >= 80 ? "green" : score >= 60 ? "orange" : "red");

    /* Camera placeholder text */
    setText("camera-msg", "Camera Connected — Processing Frames");

    /* Alert log */
    pushAlert(status, issue, score);
}


/* ==============================================
   ALERT LOG
============================================== */

function pushAlert(status, issue, score) {

    const now = new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    let text, type;

    if (status === "good") {
        text = "Posture looks great — keep it up!";
        type = "success";
    } else if (status === "prolonged_slouching") {
        text = `Prolonged poor posture! ${issue} detected — please correct now.`;
        type = "warning";
    } else if (status === "slouching") {
        text = `${issue || "Slouching"} detected — please adjust your position.`;
        type = "warning";
    } else if (status === "no_person") {
        text = "No person detected in frame.";
        type = "neutral";
    } else {
        return;
    }

    /* Only add if the status changed */
    if (alertLog.length && alertLog[0].text === text) {
        alertLog[0].time = now; // update timestamp
    } else {
        alertLog.unshift({ text, type, time: now });
        if (alertLog.length > 5) alertLog.pop();
    }

    renderAlerts();
}

function renderAlerts() {

    const container = document.getElementById("alerts-container");
    container.innerHTML = "";

    alertLog.forEach(alert => {

        const div = document.createElement("div");
        div.className = `alert ${alert.type === "success" ? "success-alert" : "warning-alert"}`;

        const iconClass = alert.type === "success"
            ? "ri-checkbox-circle-line"
            : "ri-error-warning-line";

        div.innerHTML = `
            <div class="alert-icon"><i class="${iconClass}"></i></div>
            <div class="alert-text">
                <p>${alert.text}</p>
                <small>${alert.time}</small>
            </div>
        `;

        container.appendChild(div);
    });
}


/* ==============================================
   CONTROLS  (fullscreen, mute)
============================================== */

function initControls() {

    /* Fullscreen */
    document.getElementById("fullscreen-btn")?.addEventListener("click", () => {
        const camera = document.getElementById("camera-placeholder");
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            camera.requestFullscreen();
        }
    });

    /* Mute toggle */
    const speaker = document.getElementById("speaker-btn");
    let muted = false;

    speaker?.addEventListener("click", () => {
        muted = !muted;
        speaker.classList.toggle("ri-volume-up-line",  !muted);
        speaker.classList.toggle("ri-volume-mute-line", muted);
    });

    /* Camera connecting animation */
    let dots = "";
    const msgEl = document.getElementById("camera-msg");
    setInterval(() => {
        if (msgEl.textContent.startsWith("Camera Connected")) return;
        dots = dots.length >= 3 ? "" : dots + ".";
        msgEl.textContent = "Waiting for Camera" + dots;
    }, 500);
}


/* ==============================================
   HELPERS
============================================== */

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function colorValue(id, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "";
    el.classList.add(color === "red" ? "orange" : color);
}
