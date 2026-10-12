// # ELEMENTS
const signupForm = document.getElementById("signupForm");
const signupButton = document.getElementById("signupButton");

const nameInput = document.getElementById("name");
const nameError = document.getElementById("nameError");

const emailInput = document.getElementById("email");
const emailError = document.getElementById("emailError");

const passwordInput = document.getElementById("password");
const passwordError = document.getElementById("passwordError");
const passwordToggle = document.getElementById("passwordToggle");
const passwordIcon = passwordToggle.querySelector("i");

const confirmPasswordInput = document.getElementById("confirmPassword");
const confirmPasswordError = document.getElementById("confirmPasswordError");
const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");
const confirmPasswordIcon = confirmPasswordToggle.querySelector("i");

const passwordMatchMessage = document.getElementById("passwordMatchMessage");
const passwordMatchSuccess = document.getElementById("passwordMatchSuccess");

const referralCodeInput = document.getElementById("referralCode");
const referralCodeError = document.getElementById("referralCodeError");

const passwordRequirements = document.getElementById("passwordRequirements");
const strengthText = document.getElementById("strengthText");
const passwordStrengthBar = document.getElementById("passwordStrengthBar");

const lengthRule = document.getElementById("rule-length");
const uppercaseRule = document.getElementById("rule-uppercase");
const lowercaseRule = document.getElementById("rule-lowercase");
const numberRule = document.getElementById("rule-number");
const specialRule = document.getElementById("rule-special");

const lengthIcon = lengthRule.querySelector("i");
const uppercaseIcon = uppercaseRule.querySelector("i");
const lowercaseIcon = lowercaseRule.querySelector("i");
const numberIcon = numberRule.querySelector("i");
const specialIcon = specialRule.querySelector("i");

let strengthHideTimer;
let isSubmitting = false;

// # VALIDATION PATTERNS
const namePattern = /^[A-Za-z]{2,}(?: [A-Za-z]{2,})*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// # ERROR HELPERS
function showError(input, errorElement, message) {
    input.classList.add("is-invalid");
    errorElement.textContent = message;
    errorElement.classList.add("d-block");
}

function clearError(input, errorElement) {
    input.classList.remove("is-invalid");
    errorElement.textContent = "";
    errorElement.classList.remove("d-block");
}

// # NAME VALIDATION
function validateName() {
    const name = nameInput.value.trim();

    if (!name) {
        showError(nameInput, nameError, "Full Name is required.");
        return false;
    }

    if (name.length < 3) {
        showError(nameInput, nameError, "Name must be at least 3 characters.");
        return false;
    }

    if (name.length > 50) {
        showError(nameInput, nameError, "Name cannot exceed 50 characters.");
        return false;
    }

    if (!namePattern.test(name)) {
        showError(nameInput, nameError, "Please enter a valid name.");
        return false;
    }

    clearError(nameInput, nameError);
    return true;
}

// # EMAIL VALIDATION
function validateEmail() {
    const email = emailInput.value.trim();

    if (!email) {
        showError(emailInput, emailError, "Email is required.");
        return false;
    }

    if (email.length > 254) {
        showError(emailInput, emailError, "Email address is too long.");
        return false;
    }

    if (!emailPattern.test(email)) {
        showError(emailInput, emailError, "Please enter a valid email address.");
        return false;
    }

    clearError(emailInput, emailError);
    return true;
}

// # PASSWORD VALIDATION
function validatePassword() {
    const password = passwordInput.value;

    if (!password) {
        showError(passwordInput, passwordError, "Password is required.");
        return false;
    }

    if (!passwordPattern.test(password)) {
        showError(
            passwordInput,
            passwordError,
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        );
        return false;
    }

    clearError(passwordInput, passwordError);
    return true;
}

// # CONFIRM PASSWORD VALIDATION
function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    confirmPasswordInput.classList.remove("is-invalid");
    confirmPasswordError.textContent = "";
    confirmPasswordError.classList.remove("d-block");

    if (!confirmPassword) {
        passwordMatchMessage.textContent = "Please confirm your password.";
        passwordMatchMessage.classList.remove("d-none");
        passwordMatchSuccess.classList.add("d-none");
        return false;
    }

    if (password !== confirmPassword) {
        passwordMatchMessage.textContent = "Passwords do not match.";
        passwordMatchMessage.classList.remove("d-none");
        passwordMatchSuccess.classList.add("d-none");
        confirmPasswordInput.classList.add("is-invalid");
        return false;
    }

    passwordMatchMessage.classList.add("d-none");
    passwordMatchSuccess.classList.remove("d-none");
    return true;
}

// # REFERRAL VALIDATION
function validateReferralCode() {
    const referralCode = referralCodeInput.value.trim();

    if (!referralCode) {
        clearError(referralCodeInput, referralCodeError);
        return true;
    }

    clearError(referralCodeInput, referralCodeError);
    return true;
}

// # PASSWORD MATCH DISPLAY
function checkPasswordMatch() {
    if (!confirmPasswordInput.value) {
        passwordMatchMessage.classList.add("d-none");
        passwordMatchSuccess.classList.add("d-none");
        confirmPasswordInput.classList.remove("is-invalid");
        return;
    }

    validateConfirmPassword();
}

// # PASSWORD STRENGTH
function updatePasswordStrength() {
    const password = passwordInput.value;

    const hasMinimumLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialCharacter = /[@$!%*?&]/.test(password);

    const strengthScore =
        Number(hasMinimumLength) +
        Number(hasUppercase) +
        Number(hasLowercase) +
        Number(hasNumber) +
        Number(hasSpecialCharacter);

    if (!password) {
        passwordRequirements.classList.add("d-none");
        passwordStrengthBar.style.width = "0%";
        strengthText.textContent = "";
        return;
    }

    passwordRequirements.classList.remove("d-none");

    if (hasMinimumLength) {
        lengthRule.classList.add("text-success");
        lengthIcon.classList.replace("bi-x-circle", "bi-check-circle");
    } else {
        lengthRule.classList.remove("text-success");
        lengthIcon.classList.replace("bi-check-circle", "bi-x-circle");
    }

    if (hasUppercase) {
        uppercaseRule.classList.add("text-success");
        uppercaseIcon.classList.replace("bi-x-circle", "bi-check-circle");
    } else {
        uppercaseRule.classList.remove("text-success");
        uppercaseIcon.classList.replace("bi-check-circle", "bi-x-circle");
    }

    if (hasLowercase) {
        lowercaseRule.classList.add("text-success");
        lowercaseIcon.classList.replace("bi-x-circle", "bi-check-circle");
    } else {
        lowercaseRule.classList.remove("text-success");
        lowercaseIcon.classList.replace("bi-check-circle", "bi-x-circle");
    }

    if (hasNumber) {
        numberRule.classList.add("text-success");
        numberIcon.classList.replace("bi-x-circle", "bi-check-circle");
    } else {
        numberRule.classList.remove("text-success");
        numberIcon.classList.replace("bi-check-circle", "bi-x-circle");
    }

    if (hasSpecialCharacter) {
        specialRule.classList.add("text-success");
        specialIcon.classList.replace("bi-x-circle", "bi-check-circle");
    } else {
        specialRule.classList.remove("text-success");
        specialIcon.classList.replace("bi-check-circle", "bi-x-circle");
    }

    const strengthPercentage = (strengthScore / 5) * 100;
    passwordStrengthBar.style.width = `${strengthPercentage}%`;
    passwordStrengthBar.setAttribute("aria-valuenow", strengthPercentage);

    strengthText.classList.remove("text-danger", "text-warning", "text-success");

    if (strengthScore <= 2) {
        strengthText.textContent = "Weak";
        strengthText.classList.add("text-danger");

        passwordStrengthBar.classList.remove("bg-warning", "bg-success");
        passwordStrengthBar.classList.add("bg-danger");
    } else if (strengthScore <= 4) {
        strengthText.textContent = "Medium";
        strengthText.classList.add("text-warning");

        passwordStrengthBar.classList.remove("bg-danger", "bg-success");
        passwordStrengthBar.classList.add("bg-warning");
    } else {
        strengthText.textContent = "Strong";
        strengthText.classList.add("text-success");

        passwordStrengthBar.classList.remove("bg-danger", "bg-warning");
        passwordStrengthBar.classList.add("bg-success");

        clearTimeout(strengthHideTimer);

        strengthHideTimer = setTimeout(() => {
            passwordRequirements.classList.add("d-none");
        }, 3000);
    }
}

// # PASSWORD TOGGLE
passwordToggle.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        passwordIcon.classList.replace("bi-eye", "bi-eye-slash");
    } else {
        passwordInput.type = "password";
        passwordIcon.classList.replace("bi-eye-slash", "bi-eye");
    }
});

// # CONFIRM PASSWORD TOGGLE
confirmPasswordToggle.addEventListener("click", () => {
    if (confirmPasswordInput.type === "password") {
        confirmPasswordInput.type = "text";
        confirmPasswordIcon.classList.replace("bi-eye", "bi-eye-slash");
    } else {
        confirmPasswordInput.type = "password";
        confirmPasswordIcon.classList.replace("bi-eye-slash", "bi-eye");
    }
});

// # LIVE VALIDATION
nameInput.addEventListener("input", validateName);

emailInput.addEventListener("input", validateEmail);

passwordInput.addEventListener("input", () => {
    updatePasswordStrength();
    validatePassword();
    checkPasswordMatch();
});

confirmPasswordInput.addEventListener("input", validateConfirmPassword);

referralCodeInput.addEventListener("input", validateReferralCode);

// # SUBMIT
signupForm.addEventListener("submit", event => {
    event.preventDefault();

    if (isSubmitting) return;

    const nameValid = validateName();
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    const confirmPasswordValid = validateConfirmPassword();
    const referralValid = validateReferralCode();

    if (!nameValid || !emailValid || !passwordValid || !confirmPasswordValid || !referralValid) {
        return;
    }

    isSubmitting = true;
    signupButton.disabled = true;
    signupButton.textContent = "Creating Account...";

    signupForm.submit();
});