// # DOM ELEMENTS
const customerSearch = document.querySelector(".customer-search input");
const customerSearchForm = document.querySelector(".customer-toolbar");
const customerTableBody = document.querySelector(".customer-table tbody");
const customerCount = document.querySelector(".customer-count");
const pageInfo = document.querySelector(".page-info");
const customerFilters = document.querySelector(".customer-filters");
const customerPagination = document.querySelector(".customer-pagination");

// # CLEAR SEARCH BUTTON
let customerClear = document.querySelector(".clear-search");

const updateClearSearchButton = () => {
    if (!customerSearch) return;

    if (customerSearch.value.trim()) {
        if (!customerClear) {
            customerClear = document.createElement("a");
            customerClear.className = "clear-search";
            customerClear.href = "#";
            customerClear.title = "Clear Search";
            customerClear.setAttribute("aria-label", "Clear Search");
            customerClear.innerHTML = '<i class="bi bi-x-lg"></i>';

            customerSearch.parentElement.appendChild(customerClear);
        }
    } else if (customerClear) {
        customerClear.remove();
        customerClear = null;
    }
};

let searchDebounceTimer;

// # RENDER CUSTOMERS
const renderCustomers = users => {
    if (!customerTableBody) return;

    if (!users.length) {
        customerTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="bi bi-people"></i>
                        No customers found.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    customerTableBody.innerHTML = users.map(user => {
        const profileImage = user.profileImage && user.profileImage !== "default-profile.png"
            ? `<img class="customer-image" src="${user.profileImage}" alt="Customer" onerror="this.style.display='none'">`
            : `<div class="customer-image customer-image-placeholder"><i class="bi bi-person"></i></div>`;

        const status = user.isBlocked
            ? `<span class="status-badge blocked">BLOCKED</span>`
            : `<span class="status-badge active">ACTIVE</span>`;

        const action = user.isBlocked
            ? `
                <button
                    type="button"
                    class="action-button unblock-button"
                    title="Unblock Customer"
                    data-user-id="${user._id}"
                    data-action="unblock"
                >
                    <i class="bi bi-check-circle"></i>
                </button>
            `
            : `
                <button
                    type="button"
                    class="action-button block-button"
                    title="Block Customer"
                    data-user-id="${user._id}"
                    data-action="block"
                >
                    <i class="bi bi-ban"></i>
                </button>
            `;

        const joinedDate = new Date(user.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        return `
            <tr>
                <td>
                    <div class="customer-profile">
                        ${profileImage}
                        <div>
                            <div class="customer-name">${user.name}</div>
                            <div class="customer-id">ID: NB-${user._id.slice(-4).toUpperCase()}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="customer-email">${user.email}</div>
                    <div class="customer-phone">${user.phone || "No phone number"}</div>
                </td>
                <td>
                    <span class="order-count zero">0 Orders</span>
                </td>
                <td>
                    <div class="joined-date">${joinedDate}</div>
                </td>
                <td>${status}</td>
                <td>
                    <div class="customer-actions">
                        <button
                            type="button"
                            class="action-button view-button"
                            title="View Customer"
                            data-user-id="${user._id}"
                        >
                            <i class="bi bi-eye"></i>
                        </button>
                        ${action}
                    </div>
                </td>
            </tr>
        `;
    }).join("");
};

// # RENDER PAGINATION
const renderPagination = data => {
    if (!customerPagination) return;

    if (!data.totalPages || data.totalPages <= 1) {
        customerPagination.innerHTML = "";
        return;
    }

    let paginationHTML = "";

    // # PREVIOUS
    paginationHTML += `
        <li class="page-item ${data.currentPage <= 1 ? "disabled" : ""}">
            ${data.currentPage > 1
                ? `<a class="page-link" href="/admin/customers?page=${data.currentPage - 1}&search=${encodeURIComponent(data.search || "")}&status=${encodeURIComponent(data.status || "all")}"><i class="bi bi-chevron-left"></i></a>`
                : `<span class="page-link"><i class="bi bi-chevron-left"></i></span>`
            }
        </li>
    `;

    // # PAGE NUMBERS
    if (data.totalPages <= 5) {
        for (let page = 1; page <= data.totalPages; page++) {
            paginationHTML += `
                <li class="page-item ${page === data.currentPage ? "active" : ""}">
                    <a class="page-link" href="/admin/customers?page=${page}&search=${encodeURIComponent(data.search || "")}&status=${encodeURIComponent(data.status || "all")}">${page}</a>
                </li>
            `;
        }
    } else {
        for (let page = 1; page <= 3; page++) {
            paginationHTML += `
                <li class="page-item ${page === data.currentPage ? "active" : ""}">
                    <a class="page-link" href="/admin/customers?page=${page}&search=${encodeURIComponent(data.search || "")}&status=${encodeURIComponent(data.status || "all")}">${page}</a>
                </li>
            `;
        }

        paginationHTML += `<li class="page-dots">...</li>`;

        paginationHTML += `
            <li class="page-item ${data.currentPage === data.totalPages ? "active" : ""}">
                <a class="page-link" href="/admin/customers?page=${data.totalPages}&search=${encodeURIComponent(data.search || "")}&status=${encodeURIComponent(data.status || "all")}">${data.totalPages}</a>
            </li>
        `;
    }

    // # NEXT
    paginationHTML += `
        <li class="page-item ${data.currentPage >= data.totalPages ? "disabled" : ""}">
            ${data.currentPage < data.totalPages
                ? `<a class="page-link" href="/admin/customers?page=${data.currentPage + 1}&search=${encodeURIComponent(data.search || "")}&status=${encodeURIComponent(data.status || "all")}"><i class="bi bi-chevron-right"></i></a>`
                : `<span class="page-link"><i class="bi bi-chevron-right"></i></span>`
            }
        </li>
    `;

    customerPagination.innerHTML = paginationHTML;
};

// # UPDATE CUSTOMER LIST
const updateCustomerList = data => {
    renderCustomers(data.users);

    if (customerCount) {
        const start = data.users.length
            ? ((data.currentPage - 1) * 10) + 1
            : 0;

        const end = data.users.length
            ? start + data.users.length - 1
            : 0;

        customerCount.textContent = `Showing ${start} - ${end} of ${data.totalUsers}`;
    }

    if (pageInfo) {
        pageInfo.textContent = `Total ${data.totalPages} pages`;
    }

    renderPagination(data);

    if (customerSearch) {
        customerSearch.value = data.search || "";
    }

    const statusInput = customerSearchForm?.querySelector('input[name="status"]');

    if (statusInput) {
        statusInput.value = data.status || "all";
    }
};

// # AJAX CLEAR SEARCH
const handleClearSearch = async event => {
    event.preventDefault();

    clearTimeout(searchDebounceTimer);

    if (customerSearch) {
        customerSearch.value = "";
    }

    const status = customerSearchForm?.querySelector('input[name="status"]')?.value || "all";

    const params = new URLSearchParams({
        page: "1",
        search: "",
        status
    });

    try {
        const response = await fetch(`/admin/customers?${params.toString()}`, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to clear search.");
        }

        updateCustomerList(data);
        updateClearSearchButton();

        window.history.pushState({}, "", `/admin/customers?${params.toString()}`);
    } catch (error) {
        console.error("AJAX clear search error:", error);
    }
};

// # CLEAR SEARCH CLICK
if (customerSearchForm) {
    customerSearchForm.addEventListener("click", event => {
        const clearButton = event.target.closest(".clear-search");

        if (!clearButton) return;

        handleClearSearch(event);
    });
}

// # AJAX SEARCH
if (customerSearch && customerSearchForm) {
    customerSearch.addEventListener("input", () => {
        if (customerSearch.value.length > 100) {
            customerSearch.value = customerSearch.value.slice(0, 100);
        }

        updateClearSearchButton();

        clearTimeout(searchDebounceTimer);

        searchDebounceTimer = setTimeout(async () => {
            const search = customerSearch.value.trim();
            const status = customerSearchForm.querySelector('input[name="status"]')?.value || "all";

            const params = new URLSearchParams({
                page: "1",
                search,
                status
            });

            try {
                const response = await fetch(`/admin/customers?${params.toString()}`, {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Unable to search customers.");
                }

                updateCustomerList(data);
                updateClearSearchButton();

                window.history.pushState({}, "", `/admin/customers?${params.toString()}`);
            } catch (error) {
                console.error("AJAX customer search error:", error);
            }
        }, 500);
    });
}

// # AJAX PAGINATION
if (customerPagination) {
    customerPagination.addEventListener("click", async event => {
        const link = event.target.closest(".page-link");

        if (!link || !link.getAttribute("href")) return;

        event.preventDefault();

        const url = new URL(link.href, window.location.origin);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to load customers.");
            }

            updateCustomerList(data);
            updateClearSearchButton();

            window.history.pushState({}, "", url);
        } catch (error) {
            console.error("AJAX pagination error:", error);
        }
    });
}

// # AJAX FILTERS
if (customerFilters) {
    customerFilters.addEventListener("click", async event => {
        const link = event.target.closest(".customer-filter");

        if (!link) return;

        event.preventDefault();

        const url = new URL(link.href, window.location.origin);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to filter customers.");
            }

            updateCustomerList(data);
            updateClearSearchButton();

            customerFilters.querySelectorAll(".customer-filter").forEach(filter => {
                filter.classList.remove("active");
            });

            link.classList.add("active");

            window.history.pushState({}, "", url);
        } catch (error) {
            console.error("AJAX customer filter error:", error);
        }
    });
}

// # BLOCK / UNBLOCK
const confirmationModal = document.querySelector("#confirmationModal");
const confirmationBox = document.querySelector(".confirmation-box");
const confirmationTitle = document.querySelector("#confirmationTitle");
const confirmationMessage = document.querySelector("#confirmationMessage");
const confirmationIcon = document.querySelector("#confirmationIcon");
const confirmationCancel = document.querySelector("#confirmationCancel");
const confirmationConfirm = document.querySelector("#confirmationConfirm");

let selectedButton = null;

const closeConfirmationModal = () => {
    confirmationModal.classList.remove("show");
    confirmationModal.setAttribute("aria-hidden", "true");
    selectedButton = null;
};

// # CUSTOMER ACTIONS
if (customerTableBody) {
    customerTableBody.addEventListener("click", event => {
        const button = event.target.closest("[data-action], .view-button");

        if (!button) return;

        // # VIEW CUSTOMER
        if (button.classList.contains("view-button")) {
            const userId = button.dataset.userId;

            if (!userId) return;

            window.location.href = `/admin/customers/${encodeURIComponent(userId)}`;
            return;
        }

        // # BLOCK / UNBLOCK
        const userId = button.dataset.userId;
        const action = button.dataset.action;

        if (!userId || !["block", "unblock"].includes(action)) return;

        selectedButton = button;

        const isBlocked = action === "block";

        confirmationBox.classList.toggle("block-mode", isBlocked);

        confirmationIcon.innerHTML = isBlocked
            ? '<i class="bi bi-ban"></i>'
            : '<i class="bi bi-check-circle"></i>';

        confirmationTitle.textContent = isBlocked
            ? "Block Customer?"
            : "Unblock Customer?";

        confirmationMessage.textContent = isBlocked
            ? "Are you sure you want to block this customer? They will no longer be able to access their account."
            : "Are you sure you want to unblock this customer? They will be able to access their account again.";

        confirmationConfirm.textContent = isBlocked
            ? "Block Customer"
            : "Unblock Customer";

        confirmationModal.classList.add("show");
        confirmationModal.setAttribute("aria-hidden", "false");
    });
}

// # CANCEL CONFIRMATION
confirmationCancel.addEventListener("click", closeConfirmationModal);

// # CONFIRM ACTION
confirmationConfirm.addEventListener("click", async () => {
    if (!selectedButton) return;

    const button = selectedButton;
    const userId = button.dataset.userId;
    const isBlocked = button.dataset.action === "block";

    button.disabled = true;
    confirmationConfirm.disabled = true;

    try {
        const response = await fetch(
            `/admin/customers/${encodeURIComponent(userId)}/block-status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ isBlocked })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Unable to update customer status."
            );
        }

        closeConfirmationModal();
        window.location.reload();
    } catch (error) {
        console.error("Customer status update error:", error);

        closeConfirmationModal();
        alert(error.message || "Something went wrong. Please try again.");

        button.disabled = false;
        confirmationConfirm.disabled = false;
    }
});

// # CLOSE ON BACKDROP
confirmationModal.addEventListener("click", event => {
    if (event.target === confirmationModal) {
        closeConfirmationModal();
    }
});

// # EXPORT CUSTOMERS
const exportButton = document.querySelector(".export-button");

if (exportButton) {
    exportButton.addEventListener("click", event => {
        event.preventDefault();
        console.log("Export customers");
    });
}