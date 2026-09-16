// ==========================
// DASHBOARD.JS
// ==========================

document.addEventListener("DOMContentLoaded", () => {

    loadUser();
    loadLatestPosture();
    loadAnalyticsSummary();
    loadActivityTrends();

    pulseConnection();
    animateCards();
});

// ==========================
// USER
// ==========================

async function loadUser() {

    try {

        const response = await fetch("/api/user/me");

        if (!response.ok) {
            throw new Error("Failed to load user");
        }

        const user = await response.json();

        const welcomeMessage = document.getElementById("welcomeMessage");

        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome Back, ${user.username}!`;
        }

    } catch (error) {

        console.error("User API error:", error);

    }

}

// ==========================
// LATEST POSTURE
// ==========================

async function loadLatestPosture() {

    try {

        const response = await fetch("/api/posture/latest");

        if (!response.ok) {
            throw new Error("Failed to load posture");
        }

        const data = await response.json();

        animateProgress(data.score);

        document.getElementById("currentStatus").textContent =
            data.status;

        document.getElementById("currentStatusDescription").textContent =
            data.description;

        document.getElementById("postureStatus").textContent =
            `● ${data.status}`;

        updateTimestamp(data.timestamp);

    } catch (error) {

        console.error("Posture API error:", error);

    }

}

// ==========================
// CIRCULAR PROGRESS
// ==========================

function animateProgress(target) {

    const circle = document.querySelector(".progress-ring-circle");
    const score = document.querySelector(".score");

    if (!circle || !score) return;

    const radius = 90;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;

    let current = 0;

    const interval = setInterval(() => {

        current++;

        score.textContent = current + "%";

        const offset =
            circumference - (current / 100) * circumference;

        circle.style.strokeDashoffset = offset;

        if (current >= target) {
            clearInterval(interval);
        }

    }, 20);
}


// ==========================
// TODAY'S CORRECTIONS
// ==========================

function animateCorrections(target) {

    const correction = document.getElementById("corrections");

    if (!correction) return;

    let count = 0;

    const timer = setInterval(() => {

        count++;

        correction.textContent = count;

        if (count >= target) {
            clearInterval(timer);
        }

    }, 150);
}


// ==========================
// UPDATE TIMESTAMP
// ==========================

function updateTimestamp(timestamp) {

    const text = document.getElementById("lastUpdated");

    if (!text) return;

    function update() {

        const seconds = Math.floor(
            (new Date() - new Date(timestamp)) / 1000
        );

        text.textContent =
            `Updated ${seconds} seconds ago`;

    }

    update();

    setInterval(update, 1000);

}


// ==========================
// ACTIVITY TRENDS
// ==========================

async function loadActivityTrends() {

    try {

        const response = await fetch("/api/analytics/trends?days=14");

        if (!response.ok) {
            throw new Error("Failed to load trends");
        }

        const data = await response.json();

        createActivityChart(data);

    } catch (error) {

        console.error("Trends API error:", error);

    }

}



// ==========================
// AI INSIGHT
// ==========================

function updateAIInsight(insight) {

    const text = document.querySelector(".insight-card p");

    if (!text) return;

    text.style.opacity = "0";

    setTimeout(() => {

        text.textContent = insight;
        text.style.opacity = "1";

    }, 400);
}


// ==========================
// CONNECTION PULSE
// ==========================

function pulseConnection() {

    const dot = document.querySelector(".dot");

    if (!dot) return;

    setInterval(() => {

        dot.animate(
            [
                {
                    transform: "scale(1)",
                    opacity: 1
                },
                {
                    transform: "scale(1.6)",
                    opacity: 0.4
                },
                {
                    transform: "scale(1)",
                    opacity: 1
                }
            ],
            {
                duration: 1000
            }
        );

    }, 1200);
}


// ==========================
// CARD ANIMATION
// ==========================

function animateCards() {

    const cards = document.querySelectorAll(
        ".card, .small-card, .large-card, .insight-card"
    );

    cards.forEach((card, index) => {

        card.style.opacity = "0";
        card.style.transform = "translateY(40px)";

        setTimeout(() => {

            card.style.transition = ".6s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";

        }, index * 120);

    });
}