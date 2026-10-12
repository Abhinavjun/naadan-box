// # DASHBOARD ELEMENTS
const headerSearch = document.querySelector(".header-search input");
const periodSelect = document.querySelector(".period-select");
const notificationButton = document.querySelector("[aria-label='Notifications']");

// # SEARCH VALIDATION
if (headerSearch) {
    headerSearch.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        const searchValue = headerSearch.value.trim();

        if (!searchValue) {
            event.preventDefault();
            headerSearch.value = "";
            return;
        }

        if (searchValue.length > 100) {
            event.preventDefault();
            headerSearch.value = searchValue.slice(0, 100);
            return;
        }
    });

    headerSearch.addEventListener("input", () => {
        if (headerSearch.value.length > 100) {
            headerSearch.value = headerSearch.value.slice(0, 100);
        }
    });
}

// # PERIOD SELECTION
if (periodSelect) {
    periodSelect.addEventListener("change", () => {
        const selectedPeriod = periodSelect.value;
        console.log("Selected sales period:", selectedPeriod);
    });
}

// # NOTIFICATIONS
if (notificationButton) {
    notificationButton.addEventListener("click", event => {
        event.preventDefault();
    });
}

// # QUICK ACTION VALIDATION
document.querySelectorAll(".quick-action").forEach(action => {
    action.addEventListener("click", event => {
        const href = action.getAttribute("href");

        if (!href || href === "#") {
            event.preventDefault();
        }
    });
});