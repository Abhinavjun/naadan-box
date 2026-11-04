const accountBlockedModal = document.querySelector("#accountBlockedModal");
const accountBlockedLogout = document.querySelector("#accountBlockedLogout");

let accountBlocked = false;
let statusCheckInProgress = false;

//BLOCKED MODAL
const showAccountBlockedModal = () => {
    if (!accountBlockedModal || accountBlocked) return;

    accountBlocked = true;

    accountBlockedModal.classList.add("show");
    accountBlockedModal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
};

//  CHECK ACCOUNT STATUS
const checkAccountStatus = async () => {
    if (accountBlocked || statusCheckInProgress) return;

    statusCheckInProgress = true;

    try {
        const response = await fetch("/account-status", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (response.status === 403) {
            const data = await response.json();

            if (data.code === "USER_BLOCKED") {
                showAccountBlockedModal();
            }

            return;
        }

        if (response.status === 401) {
            window.location.href = "/login";
        }
    } catch (error) {
        console.error("Account status check error:", error);
    } finally {
        statusCheckInProgress = false;
    }
};


// # CHECK ON USER INTERACTION
let lastInteractionCheck = 0;

document.addEventListener("click", () => {
    const now = Date.now();

    if (now - lastInteractionCheck < 1000) return;

    lastInteractionCheck = now;
    checkAccountStatus();
});


// # LOGOUT
if (accountBlockedLogout) {
    accountBlockedLogout.addEventListener("click", async () => {
        accountBlockedLogout.disabled = true;
        accountBlockedLogout.textContent = "Logging out...";

        try {
            await fetch("/logout", {
                method: "POST",
                headers: {
                    "Accept": "application/json"
                }
            });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            window.location.href = "/login";
        }
    });
}

// INITIAL CHECK
checkAccountStatus();

setInterval(checkAccountStatus, 10000);