/* ==============================================
   Analytics.js  —  all data from backend APIs
============================================== */

document.addEventListener("DOMContentLoaded", async () => {

    /* Load both data sets in parallel */
    const [summaryData, trendsWeekly, trendsMonthly] = await Promise.all([
        api.get("/analytics/summary"),
        api.get("/analytics/trends?days=7"),
        api.get("/analytics/trends?days=28")
    ]);

    applyStatCards(summaryData, trendsWeekly);
    renderWeeklyChart(trendsWeekly);
    renderMonthlyChart(trendsMonthly);
    renderIssueBreakdown(summaryData);
    buildInsight(summaryData, trendsWeekly);

});


/* ==============================================
   STAT CARDS
============================================== */

function applyStatCards(summaryData, trendsWeekly) {

    if (!summaryData?.summary) return;

    const s       = summaryData.summary;
    const trends  = trendsWeekly?.trends ?? [];

    /* Weekly average score */
    const weeklyAvg = trends.length
        ? (trends.reduce((a, d) => a + parseFloat(d.avg_score), 0) / trends.length).toFixed(1)
        : (parseFloat(s.avg_posture_score) || 0).toFixed(1);
    setCard("weekly-avg",  weeklyAvg + "%", null);

    /* Best day */
    if (trends.length) {
        const best = trends.reduce((prev, curr) =>
            parseFloat(curr.avg_score) > parseFloat(prev.avg_score) ? curr : prev
        );
        const dayName = new Date(best.day).toLocaleDateString("en", { weekday: "long" });
        setCard("best-day", parseFloat(best.avg_score).toFixed(1) + "%", dayName);
    }

    /* Corrections this week */
    const correctionsThisWeek = trends.reduce((a, d) => a + (d.bad || 0), 0);
    setCard("corrections-week", correctionsThisWeek, "This week");

    /* Goal progress */
    const goal     = 90;
    const progress = Math.min(100, ((parseFloat(weeklyAvg) / goal) * 100)).toFixed(1);
    setCard("goal-progress", parseFloat(weeklyAvg).toFixed(1) + "%", `Target: ${goal}%`);

    /* Trend pill on weekly chart header */
    if (trends.length >= 2) {
        const first = parseFloat(trends[0].avg_score);
        const last  = parseFloat(trends[trends.length - 1].avg_score);
        const diff  = (last - first).toFixed(1);
        const pill  = document.querySelector(".trend-pill");
        if (pill) {
            pill.textContent = (diff >= 0 ? "+" : "") + diff + "%";
            pill.style.background = diff >= 0 ? "#dcfce7" : "#fee2e2";
            pill.style.color      = diff >= 0 ? "#16a34a" : "#dc2626";
        }
    }
}

function setCard(id, value, sub) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
    const subEl = document.getElementById(id + "-sub");
    if (subEl && sub !== null) subEl.textContent = sub;
}


/* ==============================================
   WEEKLY LINE CHART
============================================== */

let weeklyChart = null;

function renderWeeklyChart(trendsWeekly) {

    const canvas = document.getElementById("weeklyChart");
    if (!canvas) return;

    const trends = trendsWeekly?.trends ?? [];

    const labels = trends.map(d =>
        new Date(d.day).toLocaleDateString("en", { weekday: "short" })
    );
    const scores = trends.map(d => parseFloat(d.avg_score) || 0);

    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Posture Score",
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
        options: chartOptions(ctx => ` Score: ${ctx.parsed.y.toFixed(1)}%`, 60, 100, 10)
    });
}


/* ==============================================
   MONTHLY BAR CHART  (weekly averages)
============================================== */

let monthlyChart = null;

function renderMonthlyChart(trendsMonthly) {

    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;

    const trends = trendsMonthly?.trends ?? [];

    /* Group into 4 weekly buckets */
    const weeks   = [[], [], [], []];
    trends.forEach((d, i) => weeks[Math.min(Math.floor(i / 7), 3)].push(d));

    const labels = ["W1", "W2", "W3", "W4"];
    const scores = weeks.map(w =>
        w.length ? (w.reduce((a, d) => a + parseFloat(d.avg_score), 0) / w.length).toFixed(1) : 0
    );

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Weekly Average",
                data: scores,
                backgroundColor: "#111827",
                borderRadius: 10,
                borderSkipped: false,
                barPercentage: 0.55,
                categoryPercentage: 0.7
            }]
        },
        options: chartOptions(ctx => ` Average: ${ctx.parsed.y}%`, 50, 100, 15)
    });
}

function chartOptions(tooltipLabel, yMin, yMax, stepSize) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#111827",
                padding: 12,
                displayColors: false,
                callbacks: { label: tooltipLabel }
            }
        },
        scales: {
            y: {
                min: yMin, max: yMax,
                ticks: { stepSize, padding: 10 },
                grid: { color: "#eef1f4", borderDash: [4, 4] },
                border: { display: false }
            },
            x: {
                grid: { color: "#f1f3f5", borderDash: [4, 4] },
                border: { display: false },
                ticks: { padding: 10 }
            }
        }
    };
}


/* ==============================================
   COMMON ISSUES  (from summary counts)
============================================== */

function renderIssueBreakdown(summaryData) {

    if (!summaryData?.summary) return;

    const s         = summaryData.summary;
    const total     = (s.good_count || 0) + (s.slouching_count || 0) + (s.prolonged_count || 0);
    if (total === 0) return;

    const items = [
        { label: "Slouching",          count: s.slouching_count || 0,  elId: "issue-slouching"  },
        { label: "Prolonged Slouching", count: s.prolonged_count || 0, elId: "issue-prolonged"  }
    ];

    items.forEach(item => {
        const pct = Math.round((item.count / total) * 100);

        const nameEl = document.getElementById(item.elId + "-name");
        if (nameEl) nameEl.textContent = item.label;

        const pctEl = document.getElementById(item.elId + "-pct");
        if (pctEl) pctEl.textContent = pct + "% of detections";

        const fillEl = document.getElementById(item.elId + "-fill");
        if (fillEl) fillEl.style.width = pct + "%";

        const valEl = document.getElementById(item.elId + "-val");
        if (valEl) valEl.textContent = pct + "%";
    });

    /* Good posture row */
    const goodPct = Math.round(((s.good_count || 0) / total) * 100);
    const gNameEl = document.getElementById("issue-good-name");
    if (gNameEl) gNameEl.textContent = "Good Posture";
    const gPctEl = document.getElementById("issue-good-pct");
    if (gPctEl) gPctEl.textContent = goodPct + "% of detections";
    const gFillEl = document.getElementById("issue-good-fill");
    if (gFillEl) gFillEl.style.width = goodPct + "%";
    const gValEl = document.getElementById("issue-good-val");
    if (gValEl) gValEl.textContent = goodPct + "%";
}


/* ==============================================
   AI INSIGHT
============================================== */

function buildInsight(summaryData, trendsWeekly) {

    const el = document.getElementById("analytics-insight");
    if (!el) return;

    if (!summaryData?.summary) {
        el.textContent = "No data yet — start a session to receive insights.";
        return;
    }

    const s       = summaryData.summary;
    const trends  = trendsWeekly?.trends ?? [];
    const avgScore = parseFloat(s.avg_posture_score) || 0;
    const total   = s.total_detections || 0;
    const topIssue = s.top_issue?.issue?.replace(/_/g, " ") ?? null;

    let msg = `Based on ${total.toLocaleString()} total detections, your average posture score is ${avgScore.toFixed(1)}%.`;

    if (topIssue) {
        msg += ` Your most common issue is "${topIssue}".`;
    }

    if (trends.length >= 2) {
        const first = parseFloat(trends[0].avg_score);
        const last  = parseFloat(trends[trends.length - 1].avg_score);
        const delta = (last - first).toFixed(1);
        msg += delta >= 0
            ? ` You are maintaining better posture and your score has improved by ${delta}% this week.`
            : ` Your score has declined by ${Math.abs(delta)}% this week — try taking more breaks.`;
    }

    el.textContent = msg;
}
