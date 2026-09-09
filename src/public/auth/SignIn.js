const API_BASE_URL = 'http://localhost:3000/api';

/* ---------- Password Toggle ---------- */
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('toggle-password');

togglePasswordButton.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  const icon = togglePasswordButton.querySelector('i');
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
});

/* ---------- Sign Up / Sign In Toggle ---------- */
const switchAuthLink = document.getElementById('switch-auth-link');
const formTitle = document.getElementById('form-title');
const formDesc = document.getElementById('form-desc');
const submitBtn = document.getElementById('submit-btn');
const switchPrompt = document.getElementById('switch-prompt');

let isSignUpState = true;

function applyAuthMode() {
  if (isSignUpState) {
    formTitle.textContent = 'Create an account';
    formDesc.textContent = 'Access your tasks, notes, and projects anytime, anywhere - and keep everything flowing in one place.';
    submitBtn.textContent = 'Get Started';
    switchPrompt.textContent = "Already have an account?";
    switchAuthLink.textContent = 'Sign in';
  } else {
    formTitle.textContent = 'Welcome back';
    formDesc.textContent = 'Enter your credentials to access your personal workspace dashboard smoothly.';
    submitBtn.textContent = 'Sign In';
    switchPrompt.textContent = "Don't have an account?";
    switchAuthLink.textContent = 'Sign up';
  }
}

// Let /login and /register (which redirect here with ?mode=) open in the right state
const requestedMode = new URLSearchParams(window.location.search).get('mode');
if (requestedMode === 'signin') isSignUpState = false;
if (requestedMode === 'signup') isSignUpState = true;
applyAuthMode();

switchAuthLink.addEventListener('click', (e) => {
  e.preventDefault();
  isSignUpState = !isSignUpState;
  applyAuthMode();
});

/* ---------- Form Submission ---------- */
const authForm = document.getElementById('auth-form');

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const endpoint = isSignUpState ? '/auth/register' : '/auth/login';

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpState ? 'Creating account...' : 'Signing in...';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // REQUIRED for cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Authentication failed');
    }

    // Redirect by role
    const role = data.user.role.toLowerCase();
    window.location.href = role === 'superuser' ? 'AdminDashboard.html' : 'Dashboard.html';

  } catch (err) {
    alert(err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = isSignUpState ? 'Get Started' : 'Sign In';
  }
});