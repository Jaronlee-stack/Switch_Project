/* =========================
   LOAD SIDEBAR
========================= */

fetch("sidebar.html")
    .then(response => response.text())
    .then(data => {

        document.getElementById("sidebar").innerHTML = data;

        // Highlight History in sidebar
        const historyLink = document.querySelector(
            '[data-page="history"]'
        );

        if (historyLink) {
            historyLink.classList.add("active");
        }

    })
    .catch(error => {
        console.error("Unable to load sidebar:", error);
    });


/* =========================
   HISTORY DATA
========================= */

const historyData = [

    {
        id: 1,
        date: "Jul 26, 2025",
        rawDate: "2025-07-26",
        score: 91,
        issue: "None",
        duration: "5h 12m",
        status: "Good Posture"
    },

    {
        id: 2,
        date: "Jul 25, 2025",
        rawDate: "2025-07-25",
        score: 87,
        issue: "Neck Tilt",
        duration: "4h 38m",
        status: "Warning"
    },

    {
        id: 3,
        date: "Jul 24, 2025",
        rawDate: "2025-07-24",
        score: 84,
        issue: "Slouching",
        duration: "3h 45m",
        status: "Warning"
    },

    {
        id: 4,
        date: "Jul 23, 2025",
        rawDate: "2025-07-23",
        score: 78,
        issue: "Slouching",
        duration: "6h 10m",
        status: "Warning"
    },

    {
        id: 5,
        date: "Jul 22, 2025",
        rawDate: "2025-07-22",
        score: 92,
        issue: "None",
        duration: "4h 55m",
        status: "Good Posture"
    },

    {
        id: 6,
        date: "Jul 21, 2025",
        rawDate: "2025-07-21",
        score: 70,
        issue: "Forward Head",
        duration: "7h 20m",
        status: "Bad Posture"
    },

    {
        id: 7,
        date: "Jul 20, 2025",
        rawDate: "2025-07-20",
        score: 82,
        issue: "Neck Tilt",
        duration: "5h 30m",
        status: "Warning"
    },

    {
        id: 8,
        date: "Jul 19, 2025",
        rawDate: "2025-07-19",
        score: 89,
        issue: "None",
        duration: "4h 40m",
        status: "Good Posture"
    }

];


/* =========================
   DOM ELEMENTS
========================= */

const tableBody = document.getElementById("historyTable");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");

const dateRangeBtn = document.getElementById("dateRangeBtn");
const filterBtn = document.getElementById("filterBtn");

const datePanel = document.getElementById("datePanel");
const filterPanel = document.getElementById("filterPanel");

const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");

const issueFilter = document.getElementById("issueFilter");
const statusFilter = document.getElementById("statusFilter");

const applyDateBtn = document.getElementById("applyDateBtn");
const applyFilterBtn = document.getElementById("applyFilterBtn");

const exportBtn = document.getElementById("exportBtn");

const reportModal = document.getElementById("reportModal");
const closeModal = document.getElementById("closeModal");


/* =========================
   RENDER TABLE
========================= */

function renderHistory(data) {

    tableBody.innerHTML = "";

    if (data.length === 0) {

        emptyState.classList.add("show");

        return;

    }

    emptyState.classList.remove("show");


    data.forEach(session => {

        let scoreClass = "score-good";

        if (session.score < 80) {
            scoreClass = "score-bad";
        }
        else if (session.score < 90) {
            scoreClass = "score-warning";
        }


        let statusClass = "good";

        if (session.status === "Warning") {
            statusClass = "warning";
        }
        else if (session.status === "Bad Posture") {
            statusClass = "bad";
        }


        const row = document.createElement("tr");

        row.innerHTML = `

            <td>
                <strong>${session.date}</strong>
            </td>

            <td>
                <span class="${scoreClass}">
                    ${session.score}%
                </span>
            </td>

            <td>
                ${session.issue}
            </td>

            <td>
                ${session.duration}
            </td>

            <td>
                <span class="status ${statusClass}">
                    ${session.status}
                </span>
            </td>

            <td>

                <button
                    class="view-btn"
                    onclick="viewReport(${session.id})"
                >

                    <i class="fa-regular fa-eye"></i>

                    View

                </button>

            </td>

        `;

        tableBody.appendChild(row);

    });

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener("input", function () {

    const searchTerm = this.value.toLowerCase().trim();

    const filtered = historyData.filter(session => {

        return (
            session.date.toLowerCase().includes(searchTerm) ||
            session.issue.toLowerCase().includes(searchTerm) ||
            session.status.toLowerCase().includes(searchTerm)
        );

    });

    renderHistory(filtered);

});


/* =========================
   DATE RANGE
========================= */

dateRangeBtn.addEventListener("click", function () {

    datePanel.classList.toggle("show");

    filterPanel.classList.remove("show");

});


applyDateBtn.addEventListener("click", function () {

    const from = startDate.value;
    const to = endDate.value;

    let filtered = [...historyData];


    if (from) {

        filtered = filtered.filter(session =>
            session.rawDate >= from
        );

    }


    if (to) {

        filtered = filtered.filter(session =>
            session.rawDate <= to
        );

    }


    renderHistory(filtered);

});


/* =========================
   FILTER
========================= */

filterBtn.addEventListener("click", function () {

    filterPanel.classList.toggle("show");

    datePanel.classList.remove("show");

});


applyFilterBtn.addEventListener("click", function () {

    const selectedIssue = issueFilter.value;
    const selectedStatus = statusFilter.value;

    let filtered = [...historyData];


    if (selectedIssue !== "all") {

        filtered = filtered.filter(session =>
            session.issue === selectedIssue
        );

    }


    if (selectedStatus !== "all") {

        filtered = filtered.filter(session =>
            session.status === selectedStatus
        );

    }


    renderHistory(filtered);

});


/* =========================
   VIEW REPORT
========================= */

function viewReport(id) {

    const session = historyData.find(item =>
        item.id === id
    );

    if (!session) {
        return;
    }


    document.getElementById("modalTitle").textContent =
        "Session Report";

    document.getElementById("modalDate").textContent =
        session.date;

    document.getElementById("modalScore").textContent =
        `${session.score}%`;

    document.getElementById("modalIssue").textContent =
        session.issue;

    document.getElementById("modalDuration").textContent =
        session.duration;

    document.getElementById("modalStatus").textContent =
        session.status;


    let message = "";

    if (session.score >= 90) {

        message =
            "Excellent posture session! Your posture remained stable throughout this session. Keep maintaining these habits.";

    }
    else if (session.score >= 80) {

        message =
            "Your posture was generally good, but there were some areas that could be improved. Try taking regular posture breaks.";

    }
    else {

        message =
            "Your posture score indicates that you may need more frequent corrections. Focus on maintaining a neutral head and spine position.";

    }


    document.getElementById("modalMessage").textContent =
        message;


    reportModal.classList.add("show");

}


/* =========================
   CLOSE MODAL
========================= */

closeModal.addEventListener("click", function () {

    reportModal.classList.remove("show");

});


reportModal.addEventListener("click", function (event) {

    if (event.target === reportModal) {

        reportModal.classList.remove("show");

    }

});


/* =========================
   EXPORT CSV
========================= */

exportBtn.addEventListener("click", function () {

    let csv =
        "Date,Score,Main Issue,Duration,Status\n";


    historyData.forEach(session => {

        csv +=
            `"${session.date}",` +
            `"${session.score}%","${session.issue}",` +
            `"${session.duration}","${session.status}"\n`;

    });


    const blob = new Blob(
        [csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "habit-coach-history.csv";

    link.click();


    URL.revokeObjectURL(url);

});


/* =========================
   INITIAL LOAD
========================= */

renderHistory(historyData);
