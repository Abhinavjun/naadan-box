document.addEventListener("DOMContentLoaded", () => {

    console.log("Logout JS loaded");

    const logoutButtons = document.querySelectorAll("#btnLogout");

    const logoutConfirmModal =
        document.getElementById("logoutConfirmModal");

    const logoutSuccessModal =
        document.getElementById("logoutSuccessModal");

    const cancelLogout =
        document.getElementById("cancelLogout");

    const confirmLogout =
        document.getElementById("confirmLogout");

    const continueLogout =
        document.getElementById("continueLogout");

    console.log("Logout buttons:", logoutButtons.length);
    console.log("Confirm modal:", logoutConfirmModal);
    console.log("Success modal:", logoutSuccessModal);

    if (
        !logoutButtons.length ||
        !logoutConfirmModal ||
        !logoutSuccessModal ||
        !cancelLogout ||
        !confirmLogout ||
        !continueLogout
    ) {
        console.error("Logout elements are missing.");
        return;
    }

    const showPopup = popup => {
        popup.classList.add("show");
    };

    const hidePopup = popup => {
        popup.classList.remove("show");
    };

    // Open confirmation popup
    logoutButtons.forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();

            showPopup(logoutConfirmModal);
        });

    });

    // Cancel logout
    cancelLogout.addEventListener("click", () => {

        hidePopup(logoutConfirmModal);

    });

    // Confirm logout
    confirmLogout.addEventListener("click", async () => {

        if (confirmLogout.disabled) {
            return;
        }

        confirmLogout.disabled = true;
        cancelLogout.disabled = true;

        confirmLogout.innerHTML =
            '<span class="spinner-border spinner-border-sm me-2"></span>Logging out...';

        try {

            const response = await fetch("/logout", {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                },
                credentials: "same-origin"
            });

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    "Invalid server response."
                );
            }

            const data = await response.json();

            console.log("Logout response:", data);

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to logout. Please try again."
                );
            }

            hidePopup(logoutConfirmModal);

            showPopup(logoutSuccessModal);

        } catch (error) {

            console.error("Logout error:", error);

            hidePopup(logoutConfirmModal);

            confirmLogout.disabled = false;
            cancelLogout.disabled = false;

            confirmLogout.innerHTML = "Logout";

            showLogoutError(
                error.message ||
                "Unable to logout. Please try again."
            );
        }

    });

    // Continue to login
    continueLogout.addEventListener("click", () => {

        window.location.replace("/login");

    });

    // Close confirmation popup by clicking outside
    logoutConfirmModal.addEventListener("click", event => {

        if (event.target === logoutConfirmModal) {
            hidePopup(logoutConfirmModal);
        }

    });

    // Continue to login if success popup background is clicked
    logoutSuccessModal.addEventListener("click", event => {

        if (event.target === logoutSuccessModal) {
            window.location.replace("/login");
        }

    });

    function showLogoutError(message) {

        const oldError =
            document.getElementById("logoutErrorMessage");

        if (oldError) {
            oldError.remove();
        }

        const errorElement =
            document.createElement("div");

        errorElement.id = "logoutErrorMessage";

        errorElement.textContent = message;

        errorElement.style.cssText = `
            position:fixed;
            top:20px;
            left:50%;
            transform:translateX(-50%);
            z-index:10000;
            background:#fff;
            border:1px solid #E0DACF;
            border-radius:8px;
            padding:12px 18px;
            color:#DC3545;
            font-size:.9rem;
            box-shadow:0 6px 20px rgba(0,0,0,.12);
        `;

        document.body.appendChild(errorElement);

        setTimeout(() => {

            if (errorElement) {
                errorElement.remove();
            }

        }, 3000);
    }

});