// ==========================
// DASHBOARD.JS
// ==========================

document.addEventListener("DOMContentLoaded", () => {

    animateProgress(88);
    animateCorrections(5);
    updateTimestamp();
    pulseConnection();
    animateCards();

});

// ==========================
// CIRCULAR PROGRESS
// ==========================

function animateProgress(target) {

    const circle = document.querySelector(".progress-ring-circle");
    const score = document.querySelector(".score");

    const radius = 90;
    const circumference = 2 * Math.PI * radius;

    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;

    let current = 0;

    const interval = setInterval(() => {

        current++;

        score.textContent = current + "%";

        const offset = circumference - (current / 100) * circumference;

        circle.style.strokeDashoffset = offset;

        if(current >= target){
            clearInterval(interval);
        }

    },20);

}

// ==========================
// TODAY'S CORRECTIONS
// ==========================

function animateCorrections(target){

    const correction = document.getElementById("corrections");

    let count = 0;

    const timer = setInterval(()=>{

        count++;

        correction.textContent = count;

        if(count >= target){
            clearInterval(timer);
        }

    },150);

}

// ==========================
// UPDATE TIMER
// ==========================

function updateTimestamp(){

    const text = document.querySelector(".progress-card small");

    let seconds = 30;

    setInterval(()=>{

        seconds++;

        text.textContent = `Updated ${seconds} seconds ago`;

        if(seconds >= 59){
            seconds = 0;
        }

    },1000);

}

// ==========================
// CONNECTION PULSE
// ==========================

function pulseConnection(){

    const dot = document.querySelector(".dot");

    setInterval(()=>{

        dot.animate([
            {
                transform:"scale(1)",
                opacity:1
            },
            {
                transform:"scale(1.6)",
                opacity:.4
            },
            {
                transform:"scale(1)",
                opacity:1
            }

        ],{

            duration:1000

        });

    },1200);

}

// ==========================
// CARD ANIMATION
// ==========================

function animateCards(){

    const cards = document.querySelectorAll(".card, .small-card, .large-card, .insight-card");

    cards.forEach((card,index)=>{

        card.style.opacity="0";
        card.style.transform="translateY(40px)";

        setTimeout(()=>{

            card.style.transition=".6s ease";

            card.style.opacity="1";
            card.style.transform="translateY(0)";

        },index*120);

    });

}

// ==========================
// RANDOM WEEKLY TREND
// ==========================

const trends = [
    "+10%",
    "+12%",
    "+14%",
    "+16%",
    "+18%"
];

setInterval(()=>{

    const trend = document.querySelectorAll(".small-card h2")[3];

    trend.textContent = trends[Math.floor(Math.random()*trends.length)];

},10000);

// ==========================
// AI INSIGHT FADE
// ==========================

const insights = [

    "You usually begin slouching around 2 PM. Consider taking a short stretch break at 1:45 PM.",

    "Excellent improvement! Your posture has increased by 12% this week.",

    "You maintain your best posture during the morning. Keep that routine!",

    "Remember to keep both feet flat on the floor while sitting.",

    "Standing for 2 minutes every hour can greatly improve posture."

];

setInterval(()=>{

    const text = document.querySelector(".insight-card p");

    text.style.opacity="0";

    setTimeout(()=>{

        text.textContent = insights[Math.floor(Math.random()*insights.length)];

        text.style.opacity="1";

    },400);

},15000);