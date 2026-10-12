document.addEventListener('DOMContentLoaded', () => {
    // Password visibility toggle logic
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('password');

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            const newType = isPassword ? 'text' : 'password';
            
            passwordInput.setAttribute('type', newType);
            
            const icon = togglePasswordBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        });
    }

    // Client-side validation using danger/validation color styles dynamically
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            const emailInput = document.getElementById('email');
            const emailValue = emailInput?.value.trim();
            const passwordValue = passwordInput?.value.trim();

            if (!emailValue || !passwordValue) {
                e.preventDefault();
                
                // Highlight input fields with Danger Red (#DC3545) on validation error
                if (!emailValue && emailInput) {
                    emailInput.style.borderColor = 'var(--danger-validation-red)';
                }
                if (!passwordValue && passwordInput) {
                    passwordInput.style.borderColor = 'var(--danger-validation-red)';
                }
            }
        });
    }
});