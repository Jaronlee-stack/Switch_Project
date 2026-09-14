// ==========================
// DASHBOARD.JS
// ==========================

document.addEventListener("DOMContentLoaded", () => {

    // Temporary data for development
    // These will eventually come from the Node.js API
    const dashboardData = {
        postureScore: 88,
        corrections: 5,
        weeklyTrend: "+12%",
        aiInsight: "You maintain your best posture during the morning. Keep that routine!",
        lastUpdated: new Date()
    };

    animateProgress(dashboardData.postureScore);
    animateCorrections(dashboardData.corrections);
    updateTimestamp(dashboardData.lastUpdated);
    updateWeeklyTrend(dashboardData.weeklyTrend);
    updateAIInsight(dashboardData.aiInsight);

    pulseConnection();
    animateCards();
});


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

function updateTimestamp(lastUpdated) {

    const text = document.querySelector(".progress-card small");

    if (!text) return;

    function update() {

        const seconds = Math.floor(
            (new Date() - new Date(lastUpdated)) / 1000
        );

        text.textContent =
            `Updated ${seconds} seconds ago`;
    }

    update();

    setInterval(update, 1000);
}


// ==========================
// WEEKLY TREND
// ==========================

function updateWeeklyTrend(trend) {

    const cards = document.querySelectorAll(".small-card h2");

    // Your existing design appears to use
    // the 4th small-card for the weekly trend
    if (cards[3]) {
        cards[3].textContent = trend;
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