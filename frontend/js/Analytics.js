/* =========================
   LOAD SIDEBAR
========================= */

fetch("sidebar.html")
    .then(response => response.text())
    .then(data => {

        document.getElementById("sidebar").innerHTML = data;

        // Highlight Analytics in sidebar
        const analyticsLink = document.querySelector(
            '[data-page="analytics"]'
        );

        if (analyticsLink) {
            analyticsLink.classList.add("active");
        }

    })
    .catch(error => {

        console.error(
            "Unable to load sidebar:",
            error
        );

    });


/* =========================
   CHART DEFAULTS
========================= */

Chart.defaults.font.family =
    "Arial, Helvetica, sans-serif";

Chart.defaults.color =
    "#9ca3af";


/* =========================
   WEEKLY POSTURE CHART
========================= */

const weeklyCanvas =
    document.getElementById("weeklyChart");


const weeklyChart =
    new Chart(
        weeklyCanvas,
        {

            type: "line",

            data: {

                labels: [
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                    "Sun"
                ],

                datasets: [

                    {
                        label: "Posture Score",

                        data: [
                            75,
                            80,
                            84,
                            87,
                            89,
                            86,
                            88
                        ],

                        borderColor: "#18abc0",

                        backgroundColor:
                            "rgba(24, 171, 192, 0.10)",

                        borderWidth: 3,

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        pointBackgroundColor:
                            "#18abc0",

                        pointBorderColor:
                            "#ffffff",

                        pointBorderWidth: 2,

                        tension: 0.4,

                        fill: true
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {

                    intersect: false,

                    mode: "index"

                },

                plugins: {

                    legend: {

                        display: false

                    },

                    tooltip: {

                        backgroundColor:
                            "#111827",

                        padding: 12,

                        displayColors: false,

                        callbacks: {

                            label: function(context) {

                                return (
                                    " Score: " +
                                    context.parsed.y +
                                    "%"
                                );

                            }

                        }

                    }

                },

                scales: {

                    y: {

                        min: 60,

                        max: 100,

                        ticks: {

                            stepSize: 10,

                            padding: 10

                        },

                        grid: {

                            color:
                                "#eef1f4",

                            borderDash: [
                                4,
                                4
                            ]

                        },

                        border: {

                            display: false

                        }

                    },

                    x: {

                        grid: {

                            color:
                                "#f1f3f5",

                            borderDash: [
                                4,
                                4
                            ]

                        },

                        border: {

                            display: false

                        },

                        ticks: {

                            padding: 10

                        }

                    }

                }

            }

        }
    );


/* =========================
   MONTHLY TREND CHART
========================= */

const monthlyCanvas =
    document.getElementById("monthlyChart");


const monthlyChart =
    new Chart(
        monthlyCanvas,
        {

            type: "bar",

            data: {

                labels: [
                    "W1",
                    "W2",
                    "W3",
                    "W4"
                ],

                datasets: [

                    {
                        label: "Weekly Average",

                        data: [
                            68,
                            74,
                            80,
                            84
                        ],

                        backgroundColor:
                            "#111827",

                        borderRadius: 10,

                        borderSkipped: false,

                        barPercentage: 0.55,

                        categoryPercentage: 0.7

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    },

                    tooltip: {

                        backgroundColor:
                            "#111827",

                        padding: 12,

                        displayColors: false,

                        callbacks: {

                            label: function(context) {

                                return (
                                    " Average: " +
                                    context.parsed.y +
                                    "%"
                                );

                            }

                        }

                    }

                },

                scales: {

                    y: {

                        min: 50,

                        max: 100,

                        ticks: {

                            stepSize: 15,

                            padding: 10

                        },

                        grid: {

                            color:
                                "#eef1f4",

                            borderDash: [
                                4,
                                4
                            ]

                        },

                        border: {

                            display: false

                        }

                    },

                    x: {

                        grid: {

                            display: false

                        },

                        border: {

                            display: false

                        }

                    }

                }

            }

        }
    );