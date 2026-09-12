/* ==============================================
   HIstory.js  —  all data from /api/history
============================================== */

/* State */
let allDetections = [];
let filteredDetections = [];
let currentPage   = 0;
const PAGE_SIZE   = 20;

/* Active filters */
let activeStatus    = "all";
let activeStartDate = null;
let activeEndDate   = null;
let activeSearch    = "";


/* ==============================================
   BOOT
============================================== */

document.addEventListener("DOMContentLoaded", async () => {

    await loadHistory();

    /* Search */
    document.getElementById("searchInput").addEventListener("input", function () {
        activeSearch = this.value.toLowerCase().trim();
        currentPage  = 0;
        applyFilters();
    });

    /* Date range toggle */
    document.getElementById("dateRangeBtn").addEventListener("click", () => {
        toggle("datePanel");
        hide("filterPanel");
    });

    document.getElementById("applyDateBtn").addEventListener("click", () => {
        activeStartDate = document.getElementById("startDate").value || null;
        activeEndDate   = document.getElementById("endDate").value   || null;
        currentPage     = 0;
        applyFilters();
    });

    document.getElementById("clearDateBtn").addEventListener("click", () => {
        activeStartDate = null;
        activeEndDate   = null;
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value   = "";
        applyFilters();
    });

    /* Status filter toggle */
    document.getElementById("filterBtn").addEventListener("click", () => {
        toggle("filterPanel");
        hide("datePanel");
    });

    document.getElementById("applyFilterBtn").addEventListener("click", () => {
        activeStatus = document.getElementById("statusFilter").value;
        currentPage  = 0;
        applyFilters();
    });

    /* Export */
    document.getElementById("exportBtn").addEventListener("click", exportCSV);

    /* Pagination */
    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 0) { currentPage--; renderPage(); }
    });
    document.getElementById("nextPage").addEventListener("click", () => {
        const maxPage = Math.ceil(filteredDetections.length / PAGE_SIZE) - 1;
        if (currentPage < maxPage) { currentPage++; renderPage(); }
    });

    /* Modal close */
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("reportModal").addEventListener("click", e => {
        if (e.target.id === "reportModal") closeModal();
    });

});


/* ==============================================
   LOAD  (fetch from backend)
============================================== */

async function loadHistory() {

    /* Fetch up to 200 detections — enough for client-side search */
    const data = await api.get("/history?limit=200&offset=0");

    if (!data || !data.detections) {
        showEmpty();
        return;
    }

    allDetections      = data.detections;
    filteredDetections = [...allDetections];
    renderPage();
    updatePagination();
}


/* ==============================================
   FILTER  (client-side)
============================================== */

function applyFilters() {

    filteredDetections = allDetections.filter(d => {

        const dateStr = d.detected_at?.slice(0, 10) ?? "";

        if (activeStatus !== "all" && d.posture_status !== activeStatus) return false;

        if (activeStartDate && dateStr < activeStartDate) return false;
        if (activeEndDate   && dateStr > activeEndDate)   return false;

        if (activeSearch) {
            const hay = [
                d.posture_status ?? "",
                d.issue ?? "",
                dateStr
            ].join(" ").toLowerCase();
            if (!hay.includes(activeSearch)) return false;
        }

        return true;
    });

    renderPage();
    updatePagination();
}


/* ==============================================
   RENDER TABLE PAGE
============================================== */

function renderPage() {

    const tbody = document.getElementById("historyTable");
    tbody.innerHTML = "";

    const start   = currentPage * PAGE_SIZE;
    const pageData = filteredDetections.slice(start, start + PAGE_SIZE);

    if (pageData.length === 0) {
        showEmpty();
        return;
    }

    hideEmpty();

    pageData.forEach(d => {

        const score = Math.round(d.posture_score ?? 0);

        let scoreClass = "score-good";
        if (score < 60) scoreClass = "score-bad";
        else if (score < 80) scoreClass = "score-warning";

        const statusMap = {
            good:               { label: "Good Posture",        cls: "good"    },
            slouching:          { label: "Slouching",           cls: "warning" },
            prolonged_slouching:{ label: "Prolonged Slouching", cls: "bad"     },
            no_person:          { label: "No Person",           cls: "warning" }
        };
        const s = statusMap[d.posture_status] ?? { label: d.posture_status, cls: "warning" };

        const dateTime = d.detected_at
            ? new Date(d.detected_at).toLocaleString("en", {
                month: "short", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })
            : "—";

        const issue = d.issue ? d.issue.replace(/_/g, " ") : "None";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${dateTime}</strong></td>
            <td><span class="${scoreClass}">${score}%</span></td>
            <td>${issue}</td>
            <td><span class="status ${s.cls}">${s.label}</span></td>
            <td>${d.neck_angle != null ? d.neck_angle.toFixed(1) + "°" : "—"}</td>
            <td>
                <button class="view-btn" onclick="viewDetail('${d.detection_id}')">
                    <i class="fa-regular fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}


/* ==============================================
   DETAIL MODAL
============================================== */

function viewDetail(detectionId) {

    const d = allDetections.find(x => x.detection_id === detectionId);
    if (!d) return;

    const dateTime = d.detected_at
        ? new Date(d.detected_at).toLocaleString("en", {
            dateStyle: "medium", timeStyle: "short"
          })
        : "—";

    document.getElementById("modalDate").textContent  = dateTime;
    document.getElementById("modalScore").textContent = Math.round(d.posture_score ?? 0) + "%";
    document.getElementById("modalStatus").textContent = d.posture_status?.replace(/_/g, " ") ?? "—";
    document.getElementById("modalIssue").textContent  = d.issue?.replace(/_/g, " ") || "None";
    document.getElementById("modalNeck").textContent   = d.neck_angle != null ? d.neck_angle.toFixed(1) + "°" : "—";
    document.getElementById("modalTrunk").textContent  = d.trunk_lean != null ? d.trunk_lean.toFixed(1) + "°" : "—";
    document.getElementById("modalHead").textContent   = d.head_offset_px != null ? d.head_offset_px.toFixed(1) + "px" : "—";

    const score = Math.round(d.posture_score ?? 0);
    let msg = "";
    if (score >= 90)      msg = "Excellent posture! You maintained a healthy spine alignment during this detection.";
    else if (score >= 75) msg = "Good posture with minor deviations. Keep being mindful of your head and shoulder position.";
    else if (score >= 60) msg = "Some posture issues detected. Try adjusting your seat height and monitor distance.";
    else                  msg = "Poor posture detected. Focus on sitting upright with your feet flat on the floor.";

    document.getElementById("modalMessage").textContent = msg;

    document.getElementById("reportModal").classList.add("show");
}

function closeModal() {
    document.getElementById("reportModal").classList.remove("show");
}


/* ==============================================
   EXPORT CSV
============================================== */

function exportCSV() {

    let csv = "Date/Time,Score,Issue,Status,Neck Angle,Trunk Lean\n";

    filteredDetections.forEach(d => {
        const dt = d.detected_at ? new Date(d.detected_at).toLocaleString() : "";
        csv += `"${dt}","${Math.round(d.posture_score ?? 0)}%","${d.issue ?? ""}","${d.posture_status ?? ""}","${d.neck_angle ?? ""}","${d.trunk_lean ?? ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = "habit-coach-history.csv";
    link.click();
    URL.revokeObjectURL(url);
}


/* ==============================================
   PAGINATION
============================================== */

function updatePagination() {

    const total    = filteredDetections.length;
    const maxPage  = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
    const bar      = document.getElementById("paginationBar");
    const info     = document.getElementById("paginationInfo");
    const prevBtn  = document.getElementById("prevPage");
    const nextBtn  = document.getElementById("nextPage");

    bar.style.display = total > PAGE_SIZE ? "flex" : "none";

    const start = currentPage * PAGE_SIZE + 1;
    const end   = Math.min((currentPage + 1) * PAGE_SIZE, total);
    info.textContent = `Showing ${start}–${end} of ${total}`;

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= maxPage;
}


/* ==============================================
   HELPERS
============================================== */

function toggle(id) {
    document.getElementById(id).classList.toggle("show");
}

function hide(id) {
    document.getElementById(id).classList.remove("show");
}

function showEmpty() {
    document.getElementById("emptyState").classList.add("show");
}

function hideEmpty() {
    document.getElementById("emptyState").classList.remove("show");
}
