// fetch("sidebar.html")
//     .then(response => response.text())
//     .then(data => {

//         // Load sidebar
//         document.getElementById("sidebar").innerHTML = data;

//         // Get current page
//         const currentPage = window.location.pathname.split("/").pop();

//         // Find the matching navigation link
//         document.querySelectorAll(".sidebar a").forEach(link => {

//             const linkPage = link.getAttribute("href");

//             if (linkPage === currentPage) {
//                 link.parentElement.classList.add("active");
//             }

//         });

//     });



fetch("sidebar.html")
    .then(response => response.text())
    .then(data => {

        document.getElementById("sidebar").innerHTML = data;

        // Get current page
        const currentPage = window.location.pathname.split("/").pop();

        // Highlight current page
        document.querySelectorAll(".sidebar li").forEach(item => {

            const page = item.getAttribute("data-page");

            if (page === currentPage) {
                item.classList.add("active");
            }

        });

        // Get user information
        fetch("/api/user/me")
            .then(response => response.json())
            .then(user => {

                const username = document.getElementById("username");
                const avatar = document.getElementById("avatar");

                if (username) {
                    username.textContent = user.username;
                }

                if (avatar) {
                    avatar.textContent = user.username
                        .split(" ")
                        .map(name => name[0])
                        .join("")
                        .toUpperCase();
                }

            });

        // Sign out
        const signOut = document.getElementById("signOut");

        if (signOut) {
            signOut.addEventListener("click", () => {

                fetch("/api/auth/logout", {
                    method: "POST"
                })
                .then(() => {
                    window.location.href = "signin.html";
                });

            });
        }

    });