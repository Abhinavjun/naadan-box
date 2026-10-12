
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgotPasswordForm");
    const emailInput = document.getElementById("email");
    const emailError = document.getElementById("emailClientError");

    if (!form || !emailInput || !emailError) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();

        emailInput.classList.remove("is-invalid");
        emailError.textContent = "";

        if (!email) {
            emailInput.classList.add("is-invalid");
            emailError.textContent = "Email is required.";
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!emailPattern.test(email)) {
            emailInput.classList.add("is-invalid");
            emailError.textContent = "Please enter a valid email address.";
            return;
        }

        const submitButton = form.querySelector("button[type='submit']");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML =
                '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
        }

        try {
            const response = await fetch("/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "text/html"
                },
                body: new URLSearchParams({ email }),
                credentials: "same-origin"
            });

            // Navigate only when the server redirects to the OTP page.
            if (
                response.redirected &&
                new URL(response.url).pathname === "/forgot-password/verify-otp"
            ) {
                window.location.replace(response.url);
                return;
            }

            // Display the server-rendered validation/error page.
            const html = await response.text();

            document.open();
            document.write(html);
            document.close();
        } catch (error) {
            console.error("Forgot password error:", error);

            emailError.textContent =
                "Something went wrong. Please try again.";
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = "Send OTP →";
            }
        }
    });
});
