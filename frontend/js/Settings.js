const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(targetTab).classList.add("active");
  });
});

const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");

sensitivitySlider.addEventListener("input", () => {
  sensitivityValue.textContent = `${sensitivitySlider.value}%`;
});

const saveProfileBtn = document.getElementById("saveProfileBtn");

saveProfileBtn.addEventListener("click", () => {
  const name = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;

  alert(`Profile saved!\nName: ${name}\nEmail: ${email}`);
});

const themeCards = document.querySelectorAll(".theme-card");

themeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const selectedTheme = card.dataset.theme;

    themeCards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");

    if (selectedTheme === "dark") {
      document.body.classList.add("dark-mode");
    } else if (selectedTheme === "light") {
      document.body.classList.remove("dark-mode");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.classList.toggle("dark-mode", prefersDark);
    }
  });
});

const accentButtons = document.querySelectorAll(".accent-colors button");

accentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedColor = button.dataset.color;
    document.documentElement.style.setProperty("--accent", selectedColor);

    accentButtons.forEach((btn) => {
      btn.style.outline = "none";
    });

    button.style.outline = `3px solid ${selectedColor}`;
    button.style.outlineOffset = "3px";
  });
});
