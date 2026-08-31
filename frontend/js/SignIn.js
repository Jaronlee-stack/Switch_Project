// 1. Password visibility toggle
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('toggle-password');

togglePasswordButton.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const icon = togglePasswordButton.querySelector('i');
    if (type === 'text') {
        icon.classList.replace('fa-regular', 'fa-solid');
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        icon.classList.replace('fa-solid', 'fa-regular');
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
});

// 2. Dynamic state switching (Sign Up <-> Sign In)
const switchAuthLink = document.getElementById('switch-auth-link');
const formTitle = document.getElementById('form-title');
const formDesc = document.getElementById('form-desc');
const submitBtn = document.getElementById('submit-btn');
const switchPrompt = document.getElementById('switch-prompt');

let isSignUpState = true;

switchAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (isSignUpState) {
        formTitle.textContent = "Welcome back";
        formDesc.textContent = "Enter your credentials to access your personal workspace dashboard smoothly.";
        submitBtn.textContent = "Sign In";
        switchPrompt.textContent = "Already have an account?";
        switchAuthLink.textContent = "Sign in";
        isSignUpState = false;
    } else {
        formTitle.textContent = "Create an account";
        formDesc.textContent = "Access your tasks, notes, and projects anytime, anywhere - and keep everything flowing in one place.";
        submitBtn.textContent = "Get Started";
        switchPrompt.textContent = "Don't have an account?";
        switchAuthLink.textContent = "Sign up";
        isSignUpState = true;
    }
});

// 3. Form Validation & Dashboard Redirect
const authForm = document.getElementById('auth-form');

authForm.addEventListener('submit', (event) => {
    // Prevent the default browser page reload form submission behavior
    event.preventDefault();

    // The browser's native HTML5 validation ('required', 'type="email"') 
    // guarantees fields are filled correctly before reaching this point.
    
    // Redirect to Dashboard.html
    window.location.href = 'Dashboard.html';
});