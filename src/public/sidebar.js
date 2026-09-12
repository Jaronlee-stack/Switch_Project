/* ==============================================
   sidebar.js  —  loads sidebar, populates user,
   sets active nav link, handles logout
============================================== */

(async function initSidebar() {

    /* 1. Inject sidebar HTML */
    const res = await fetch("/sidebar.html");
    const html = await res.text();
    document.getElementById("sidebar").innerHTML = html;

    /* 2. Highlight active nav item */
    const currentPage = window.location.pathname.split("/").pop() || "Dashboard.html";
    document.querySelectorAll(".sidebar nav li[data-page]").forEach(li => {
        if (li.dataset.page === currentPage) {
            li.classList.add("active");
        }
    });

    /* 3. Fetch logged-in user and update profile */
    try {
        const data = await api.get("/user/me");

        if (data && data.user) {
            const user = data.user;

            /* derive display name from email username */
            const displayName = user.username.split("@")[0];
            const initials    = displayName.slice(0, 2).toUpperCase();

            document.getElementById("sidebar-username").textContent = displayName;
            document.getElementById("sidebar-avatar").textContent   = initials;
            document.getElementById("sidebar-status").textContent   = user.role === "superuser" ? "Admin" : "Connected";
        }
    } catch (err) {
        console.warn("Sidebar: could not load user", err);
    }

    /* 4. Logout button */
    const logoutBtn = document.getElementById("sidebar-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await api.post("/auth/logout");
            } finally {
                window.location.href = "/auth/SignIn.html?mode=signin";
            }
        });
    }

})();
