
document.addEventListener("DOMContentLoaded", () => {

    console.log("Reset Password JS loaded");

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const passwordRequirements =
        document.getElementById("passwordRequirements");

    const passwordInput =
        document.getElementById("password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const passwordIcon =
        passwordToggle?.querySelector("i");

    const lengthRule =
        document.getElementById("rule-length");

    const uppercaseRule =
        document.getElementById("rule-uppercase");

    const lowercaseRule =
        document.getElementById("rule-lowercase");

    const numberRule =
        document.getElementById("rule-number");

    const specialRule =
        document.getElementById("rule-special");

    const lengthIcon =
        lengthRule?.querySelector("i");

    const uppercaseIcon =
        uppercaseRule?.querySelector("i");

    const lowercaseIcon =
        lowercaseRule?.querySelector("i");

    const numberIcon =
        numberRule?.querySelector("i");

    const specialIcon =
        specialRule?.querySelector("i");

    const confirmPasswordInput =
        document.getElementById("confirmPassword");

    const passwordMatchMessage =
        document.getElementById("passwordMatchMessage");

    const confirmPasswordToggle =
        document.getElementById("confirmPasswordToggle");

    const confirmPasswordIcon =
        confirmPasswordToggle?.querySelector("i");

    const resetPasswordForm =
        document.getElementById("resetPasswordForm");

    const updatePasswordButton =
        document.getElementById("updatePasswordButton");

    const confirmModal =
        document.getElementById("confirmModal");

    const successModal =
        document.getElementById("successModal");

    const errorModal =
        document.getElementById("errorModal");

    const cancelUpdatePassword =
        document.getElementById("cancelUpdatePassword");

    const confirmUpdatePassword =
        document.getElementById("confirmUpdatePassword");

    const continueToLogin =
        document.getElementById("continueToLogin");

    const closeError =
        document.getElementById("closeError");

    const errorMessage =
        document.getElementById("errorMessage");

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const resetUrl =
        resetPasswordForm?.dataset.resetUrl ||
        resetPasswordForm?.getAttribute("action");

    // The public flow redirects to login after success.
    // The profile flow should normally return to the profile.
    const successRedirect =
        resetPasswordForm?.dataset.successRedirect ||
        "/login";

    let strengthHideTimer;
    let isSubmitting = false;

    // ==========================================
    // REQUIRED ELEMENT CHECK
    // ==========================================

    const requiredElements = [
        passwordRequirements,
        passwordInput,
        passwordToggle,
        passwordIcon,
        lengthRule,
        uppercaseRule,
        lowercaseRule,
        numberRule,
        specialRule,
        lengthIcon,
        uppercaseIcon,
        lowercaseIcon,
        numberIcon,
        specialIcon,
        confirmPasswordInput,
        passwordMatchMessage,
        confirmPasswordToggle,
        confirmPasswordIcon,
        resetPasswordForm,
        updatePasswordButton,
        confirmModal,
        successModal,
        errorModal,
        cancelUpdatePassword,
        confirmUpdatePassword,
        continueToLogin,
        closeError,
        errorMessage
    ];

    if (requiredElements.some(element => !element)) {
        console.error(
            "Reset password initialization failed: required HTML elements are missing."
        );

        return;
    }

    if (!resetUrl) {
        console.error(
            "Reset password initialization failed: reset URL is missing."
        );

        return;
    }

    // ==========================================
    // PASSWORD REQUIREMENTS
    // ==========================================

    function updateRule(rule, icon, valid) {
        rule.classList.toggle("text-success", valid);
        rule.classList.toggle("text-danger", !valid);

        icon.className = valid
            ? "bi bi-check-circle"
            : "bi bi-x-circle";
    }

    function isValidPassword(password) {
        return (
            password.length >= 8 &&
            password.length <= 72 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[!@#$%^&*(),.?":{}|<>_\-\\[\]\/`~+=;']/.test(password)
        );
    }

    // ==========================================
    // POPUPS
    // ==========================================

    function showPopup(popup) {
        popup.classList.add("show");
    }

    function hidePopup(popup) {
        popup.classList.remove("show");
    }

    function hideAllPopups() {
        hidePopup(confirmModal);
        hidePopup(successModal);
        hidePopup(errorModal);
    }

    function showError(message) {
        errorMessage.textContent = message;
        showPopup(errorModal);
    }

    // ==========================================
    // PASSWORD MATCH VALIDATION
    // ==========================================

    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!confirmPassword) {
            passwordMatchMessage.textContent = "";
            passwordMatchMessage.className =
                "password-message d-none";

            return false;
        }

        if (password !== confirmPassword) {
            passwordMatchMessage.textContent =
                "Passwords do not match.";

            passwordMatchMessage.className =
                "password-message text-danger";

            return false;
        }

        passwordMatchMessage.textContent =
            "Passwords match.";

        passwordMatchMessage.className =
            "password-message text-success";

        return true;
    }

    // ==========================================
    // SHOW / HIDE NEW PASSWORD
    // ==========================================

    passwordToggle.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden
            ? "text"
            : "password";

        passwordIcon.classList.toggle("bi-eye", !isHidden);
        passwordIcon.classList.toggle("bi-eye-slash", isHidden);

        passwordToggle.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });

    // ==========================================
    // SHOW / HIDE CONFIRM PASSWORD
    // ==========================================

    confirmPasswordToggle.addEventListener("click", () => {
        const isHidden =
            confirmPasswordInput.type === "password";

        confirmPasswordInput.type = isHidden
            ? "text"
            : "password";

        confirmPasswordIcon.classList.toggle(
            "bi-eye",
            !isHidden
        );

        confirmPasswordIcon.classList.toggle(
            "bi-eye-slash",
            isHidden
        );

        confirmPasswordToggle.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });

    // ==========================================
    // LIVE PASSWORD REQUIREMENTS
    // ==========================================

    passwordInput.addEventListener("input", () => {
        const password = passwordInput.value;

        const hasMinimumLength =
            password.length >= 8;

        const hasMaximumLength =
            password.length <= 72;

        const hasUppercase =
            /[A-Z]/.test(password);

        const hasLowercase =
            /[a-z]/.test(password);

        const hasNumber =
            /[0-9]/.test(password);

        const hasSpecialCharacter =
            /[!@#$%^&*(),.?":{}|<>_\-\\[\]\/`~+=;']/.test(password);

        const strengthScore =
            Number(hasMinimumLength && hasMaximumLength) +
            Number(hasUppercase) +
            Number(hasLowercase) +
            Number(hasNumber) +
            Number(hasSpecialCharacter);

        clearTimeout(strengthHideTimer);

        if (!password) {
            passwordRequirements.classList.add("d-none");
        } else if (strengthScore < 5) {
            passwordRequirements.classList.remove("d-none");
        } else {
            strengthHideTimer = setTimeout(() => {
                passwordRequirements.classList.add("d-none");
            }, 3000);
        }

        updateRule(
            lengthRule,
            lengthIcon,
            hasMinimumLength && hasMaximumLength
        );

        updateRule(
            uppercaseRule,
            uppercaseIcon,
            hasUppercase
        );

        updateRule(
            lowercaseRule,
            lowercaseIcon,
            hasLowercase
        );

        updateRule(
            numberRule,
            numberIcon,
            hasNumber
        );

        updateRule(
            specialRule,
            specialIcon,
            hasSpecialCharacter
        );

        checkPasswordMatch();
    });

    // ==========================================
    // CONFIRM PASSWORD INPUT
    // ==========================================

    confirmPasswordInput.addEventListener("input", () => {
        checkPasswordMatch();
    });

    // ==========================================
    // FORM SUBMISSION
    // ==========================================

    resetPasswordForm.addEventListener("submit", event => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!isValidPassword(password)) {
            passwordRequirements.classList.remove("d-none");

            showError(
                "Password must be 8-72 characters and include uppercase, lowercase, number, and special character."
            );

            return;
        }

        if (!confirmPassword) {
            passwordMatchMessage.textContent =
                "Please confirm your password.";

            passwordMatchMessage.className =
                "password-message text-danger";

            return;
        }

        if (password !== confirmPassword) {
            checkPasswordMatch();
            return;
        }

        showPopup(confirmModal);
    });

    // ==========================================
    // CANCEL CONFIRMATION
    // ==========================================

    cancelUpdatePassword.addEventListener("click", () => {
        hidePopup(confirmModal);
    });

    // ==========================================
    // CONFIRM PASSWORD UPDATE
    // ==========================================

    confirmUpdatePassword.addEventListener(
        "click",
        async () => {

            if (isSubmitting) {
                return;
            }

            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Revalidate because input values can change.
            if (!isValidPassword(password)) {
                hidePopup(confirmModal);

                passwordRequirements.classList.remove("d-none");

                showError(
                    "Please meet all password requirements."
                );

                return;
            }

            if (
                !confirmPassword ||
                password !== confirmPassword
            ) {
                hidePopup(confirmModal);

                checkPasswordMatch();

                return;
            }

            isSubmitting = true;

            confirmUpdatePassword.disabled = true;
            updatePasswordButton.disabled = true;
            cancelUpdatePassword.disabled = true;

            confirmUpdatePassword.innerHTML =
                '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

            try {
                const response = await fetch(resetUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        password,
                        confirmPassword
                    }),
                    credentials: "same-origin"
                });

                const contentType =
                    response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    throw new Error(
                        "The server returned an unexpected response. Your session may have expired. Please reload the page and try again."
                    );
                }

                const data = await response.json();

                if (!response.ok || !data.success) {
                    hidePopup(confirmModal);

                    showError(
                        data.message ||
                        "Unable to reset your password. Please try again."
                    );

                    return;
                }

                hidePopup(confirmModal);

                showPopup(successModal);

            } catch (error) {
                console.error(
                    "Reset password error:",
                    error
                );

                hidePopup(confirmModal);

                showError(
                    error.message ||
                    "Something went wrong. Please try again."
                );

            } finally {
                isSubmitting = false;

                confirmUpdatePassword.disabled = false;
                updatePasswordButton.disabled = false;
                cancelUpdatePassword.disabled = false;

                confirmUpdatePassword.innerHTML =
                    "Update Password";
            }
        }
    );

    // ==========================================
    // SUCCESS → REDIRECT
    // ==========================================

    continueToLogin.addEventListener("click", () => {
        window.location.replace(successRedirect);
    });

    // ==========================================
    // CLOSE ERROR POPUP
    // ==========================================

    closeError.addEventListener("click", () => {
        hidePopup(errorModal);
    });

    // ==========================================
    // CLICK OUTSIDE POPUPS
    // ==========================================

    confirmModal.addEventListener("click", event => {
        if (event.target === confirmModal) {
            hidePopup(confirmModal);
        }
    });

    successModal.addEventListener("click", event => {
        if (event.target === successModal) {
            hidePopup(successModal);
        }
    });

    errorModal.addEventListener("click", event => {
        if (event.target === errorModal) {
            hidePopup(errorModal);
        }
    });

    // ==========================================
    // INITIAL STATE
    // ==========================================

    passwordRequirements.classList.add("d-none");
    passwordMatchMessage.classList.add("d-none");

});
