/* ==============================================
   Dashboard.js  —  all data from backend APIs
============================================== */

document.addEventListener("DOMContentLoaded", async () => {

    animateCards();
    pulseConnection();
    setGreeting();

    /* Fetch everything in parallel */
    const [userData, latestData, summaryData, trendsData] = await Promise.all([
        api.get("/user/me"),
        api.get("/posture/latest"),
        api.get("/analytics/summary"),
        api.get("/analytics/trends?days=14")
    ]);

    applyUser(userData);
    applyLatestPosture(latestData);
    applySummary(summaryData, trendsData);
    renderActivityChart(trendsData);
    buildInsight(summaryData, trendsData);
    computeStreak(trendsData);

    /* Live refresh every 5 s */
    setInterval(async () => {
        const d = await api.get("/posture/latest");
        applyLatestPosture(d);
    }, 5000);

});


/* ==============================================
   GREETING
============================================== */

function setGreeting() {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
    document.getElementById("greeting").textContent = `Good ${part}!`;
}

function applyUser(data) {
    if (!data?.user) return;
    const name = data.user.username.split("@")[0];
    const hour = new Date().getHours();
    const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
    document.getElementById("greeting").textContent = `Good ${part}, ${name}!`;
}


/* ==============================================
   POSTURE SCORE CIRCLE + STATUS
============================================== */

function applyLatestPosture(data) {

    const detection = data?.detection;
    const circle    = document.querySelector(".progress-ring-circle");
    const scoreEl   = document.querySelector(".score");
    const pill      = document.getElementById("status-pill");
    const statusEl  = document.getElementById("current-status");
    const issueEl   = document.getElementById("current-issue");
    const connLabel = document.getElementById("connection-label");
    const connSub   = document.getElementById("connection-sub");
    const connDot   = document.getElementById("connection-dot");
    const updatedEl = document.getElementById("last-updated");

    if (!detection) {
        scoreEl.textContent = "—";
        pill.textContent      = "● No Session Active";
        pill.className        = "status-pill pill-neutral";
        statusEl.textContent  = "Offline";
        issueEl.textContent   = "Start a camera session to begin";
        connLabel.textContent = "Waiting for camera";
        connSub.textContent   = "Run camera.py to start";
        connDot.style.background = "#9ca3af";
        updatedEl.textContent    = "No frames received yet";
        return;
    }

    const score = Math.round(detection.posture_score ?? 0);
    const status = detection.posture_status ?? "unknown";

    /* Animate circle */
    const radius       = 90;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray  = circumference;

    /* color by score */
    let color = "#22c55e";
    if (score < 80) color = "#f59e0b";
    if (score < 60) color = "#ef4444";
    circle.style.stroke = color;

    let current = parseInt(scoreEl.textContent) || 0;
    const step  = (score - current) / 30;

    const anim = setInterval(() => {
        current += step;
        if ((step > 0 && current >= score) || (step < 0 && current <= score)) {
            current = score;
            clearInterval(anim);
        }
        scoreEl.textContent = Math.round(current) + "%";
        const offset = circumference - (Math.round(current) / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }, 20);

    /* Status pill */
    const labelMap = {
        good:               "● Good Posture",
        slouching:          "● Slouching",
        prolonged_slouching:"● Prolonged Slouching",
        no_person:          "● No Person Detected"
    };
    pill.textContent = labelMap[status] || `● ${status}`;
    pill.className   = "status-pill";
    if (status === "good")              pill.classList.add("pill-good");
    else if (status === "no_person")    pill.classList.add("pill-neutral");
    else                                pill.classList.add("pill-warning");

    /* Current status card */
    const niceStatus = {
        good:               "Good",
        slouching:          "Slouching",
        prolonged_slouching:"Poor",
        no_person:          "Away"
    };
    statusEl.textContent = niceStatus[status] || status;
    issueEl.textContent  = detection.issue
        ? detection.issue.replace(/_/g, " ")
        : "Posture aligned";

    /* Connection badge */
    connLabel.textContent = "Connected";
    connSub.textContent   = "Robot Online";
    connDot.style.background = "#4ade80";

    /* Timestamp */
    const ago = Math.round((Date.now() - new Date(detection.detected_at)) / 1000);
    updatedEl.textContent = `Updated ${ago}s ago`;
}


/* ==============================================
   SUMMARY CARDS (corrections, trend)
============================================== */

function applySummary(summaryData, trendsData) {

    if (!summaryData?.summary) return;

    const s = summaryData.summary;

    /* Today's corrections = non-good detections today */
    const detectionsToday = s.detections_today ?? 0;
    const correctionsEl   = document.getElementById("corrections");
    const corrSubEl       = document.getElementById("corrections-sub");
    animateCount(correctionsEl, detectionsToday);
    corrSubEl.textContent = `Total frames today`;

    /* Weekly trend from trends data */
    if (trendsData?.trends?.length >= 2) {
        const trends  = trendsData.trends;
        const recent  = trends.slice(-7);
        const older   = trends.slice(0, Math.max(trends.length - 7, 1));

        const avgRecent = avg(recent.map(d => d.avg_score));
        const avgOlder  = avg(older.map(d => d.avg_score));

        const diff   = avgRecent - avgOlder;
        const trendEl = document.getElementById("weekly-trend");
        const subEl   = document.getElementById("weekly-trend-sub");

        trendEl.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
        trendEl.style.color = diff >= 0 ? "#22c55e" : "#ef4444";
        subEl.textContent   = `vs prior period`;
    }
}


/* ==============================================
   ACTIVITY CHART  (today's hourly trend)
============================================== */

let activityChart = null;

function renderActivityChart(trendsData) {

    const canvas = document.getElementById("activityChart");
    if (!canvas) return;

    const trends = trendsData?.trends ?? [];

    const labels = trends.map(d => {
        const date = new Date(d.day);
        return date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
    });

    const scores = trends.map(d => parseFloat(d.avg_score) || 0);

    if (activityChart) activityChart.destroy();

    activityChart = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Avg Posture Score",
                data: scores,
                borderColor: "#18abc0",
                backgroundColor: "rgba(24, 171, 192, 0.10)",
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#18abc0",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#111827",
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: ctx => ` Score: ${ctx.parsed.y.toFixed(1)}%`
                    }
                }
            },
            scales: {
                y: {
                    min: 0, max: 100,
                    ticks: { stepSize: 20 },
                    grid: { color: "#eef1f4" },
                    border: { display: false }
                },
                x: {
                    grid: { color: "#f1f3f5" },
                    border: { display: false },
                    ticks: { padding: 6 }
                }
            }
        }
    });
}


/* ==============================================
   AI INSIGHT  (derived from analytics data)
============================================== */

function buildInsight(summaryData, trendsData) {

    const el = document.getElementById("ai-insight");
    const dpEl = document.getElementById("insight-data-points");

    if (!summaryData?.summary) {
        el.textContent = "No data yet — start a session to receive insights.";
        return;
    }

    const s      = summaryData.summary;
    const total  = s.total_detections ?? 0;
    const good   = s.good_count ?? 0;
    const avgScore = parseFloat(s.avg_posture_score) ?? 0;
    const topIssue = s.top_issue?.issue?.replace(/_/g, " ") ?? null;

    dpEl.textContent = `Analysed ${total.toLocaleString()} data points`;

    const pct = total > 0 ? Math.round((good / total) * 100) : 0;

    let msg = `Your overall posture score is ${avgScore}% and you maintained good posture ${pct}% of the time.`;

    if (topIssue) {
        msg += ` Your most frequent issue is "${topIssue}" — focus on correcting this pattern.`;
    }

    if (trendsData?.trends?.length >= 3) {
        const recent = trendsData.trends.slice(-3);
        const trend  = parseFloat(recent[2].avg_score) - parseFloat(recent[0].avg_score);
        if (trend > 2)  msg += ` Great progress — your score has improved by ${trend.toFixed(1)}% over the last few days!`;
        if (trend < -2) msg += ` Your score has dipped by ${Math.abs(trend).toFixed(1)}% recently — try to take regular stretch breaks.`;
    }

    el.textContent = msg;
}


/* ==============================================
   STREAK  (consecutive days with avg score >= 75)
============================================== */

function computeStreak(trendsData) {

    const el    = document.getElementById("streak-days");
    const subEl = document.getElementById("streak-sub");

    if (!trendsData?.trends?.length) {
        el.textContent  = "0";
        subEl.textContent = "No data yet";
        return;
    }

    const sorted  = [...trendsData.trends].reverse(); // newest first
    let streak    = 0;

    for (const day of sorted) {
        if (parseFloat(day.avg_score) >= 75) streak++;
        else break;
    }

    animateCount(el, streak);
    subEl.textContent = streak > 0
        ? `Day${streak === 1 ? "" : "s"} of ≥75% posture`
        : "Keep going — start your streak!";
}


/* ==============================================
   ANIMATIONS / UTILITIES
============================================== */

function animateCount(el, target) {
    let current = 0;
    const step  = Math.ceil(target / 40) || 1;
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
    }, 30);
}

function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + parseFloat(b), 0) / arr.length;
}

function pulseConnection() {
    const dot = document.getElementById("connection-dot");
    if (!dot) return;
    setInterval(() => {
        dot.animate([
            { transform: "scale(1)",   opacity: 1   },
            { transform: "scale(1.6)", opacity: 0.4 },
            { transform: "scale(1)",   opacity: 1   }
        ], { duration: 1000 });
    }, 1200);
}

function animateCards() {
    const cards = document.querySelectorAll(".card, .small-card, .large-card, .insight-card");
    cards.forEach((card, i) => {
        card.style.opacity   = "0";
        card.style.transform = "translateY(40px)";
        setTimeout(() => {
            card.style.transition = ".6s ease";
            card.style.opacity    = "1";
            card.style.transform  = "translateY(0)";
        }, i * 120);
    });
}
