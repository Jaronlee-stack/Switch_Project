fetch("sidebar.html")
    .then(response => response.text())
    .then(data => {

        // Load sidebar
        document.getElementById("sidebar").innerHTML = data;

        // Get current page
        const currentPage = window.location.pathname.split("/").pop();

        // Find the matching navigation link
        document.querySelectorAll(".sidebar a").forEach(link => {

            const linkPage = link.getAttribute("href");

            if (linkPage === currentPage) {
                link.parentElement.classList.add("active");
            }

        });

    });