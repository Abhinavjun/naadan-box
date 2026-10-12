console.log("PROFILE JS LOADED");

document.addEventListener("DOMContentLoaded", () => {

    const sidebarItems = document.querySelectorAll(".sidebar-item[data-tab]");

    const editButton = document.getElementById("btnEditProfile");
    const cancelButton = document.getElementById("btnCancelEdit");
    const viewDetailsButton = document.getElementById("btnViewDetails");

    const editForm = document.getElementById("profileEditForm");
    const readView = document.getElementById("profileReadView");

    const nameInput = document.getElementById("inputFullName");
    const phoneInput = document.getElementById("inputPhone");
    const genderInput = document.getElementById("selectGender");
    const dobInput = document.getElementById("inputDob");

    const nameError = document.getElementById("nameError");
    const phoneError = document.getElementById("phoneError");
    const genderError = document.getElementById("genderError");
    const dobError = document.getElementById("dobError");


    // =========================
    // SIDEBAR
    // =========================

    function setActiveTab(tabName) {

        sidebarItems.forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.tab === tabName
            );

        });

    }


    function showSection(tabName) {

        document.querySelectorAll(".profile-section").forEach(section => {

            section.classList.toggle(
                "d-none",
                section.dataset.section !== tabName
            );

        });

        setActiveTab(tabName);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    sidebarItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            const tab = item.dataset.tab;

            if (document.querySelector(`[data-section="${tab}"]`)) {
                showSection(tab);
            }

        });

    });


    // =========================
    // CLEAR VALIDATION ERRORS
    // =========================

    function clearErrors() {

        if (nameError) {
            nameError.textContent = "";
        }

        if (phoneError) {
            phoneError.textContent = "";
        }

        if (genderError) {
            genderError.textContent = "";
        }

        if (dobError) {
            dobError.textContent = "";
        }

    }


    // =========================
    // GET TODAY AS YYYY-MM-DD
    // =========================

    function getTodayDate() {

        const today = new Date();

        const year = today.getFullYear();

        const month = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            today.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    // =========================
    // DATE OF BIRTH VALIDATION
    // =========================

    function validateDateOfBirth() {

        if (!dobInput || !dobError) {
            return true;
        }

        const dateOfBirth = dobInput.value;


        // DOB is optional
        if (!dateOfBirth) {

            dobError.textContent = "";

            return true;
        }


        const todayDate = getTodayDate();


        // Future date
        if (dateOfBirth > todayDate) {

            dobError.textContent =
                "Date of birth cannot be in the future.";

            return false;
        }


        // Valid date
        dobError.textContent = "";

        return true;
    }


    // =========================
    // EDIT PROFILE
    // =========================

    editButton?.addEventListener("click", () => {

        readView?.classList.add("d-none");
        editForm?.classList.remove("d-none");

        clearErrors();

    });


    // =========================
    // CANCEL EDIT
    // =========================

    cancelButton?.addEventListener("click", () => {

        editForm?.classList.add("d-none");
        readView?.classList.remove("d-none");

        clearErrors();

    });


    // =========================
    // VIEW DETAILS
    // =========================

    viewDetailsButton?.addEventListener("click", () => {

        editForm?.classList.add("d-none");
        readView?.classList.remove("d-none");

        clearErrors();

    });


    // =========================
    // PROFILE UPDATE
    // =========================

    editForm?.addEventListener("submit", async event => {

        event.preventDefault();

        clearErrors();


        const name = nameInput?.value.trim() || "";
        const phone = phoneInput?.value.trim() || "";
        const gender = genderInput?.value || "";
        const dateOfBirth = dobInput?.value || "";


        // =========================
        // NAME VALIDATION
        // =========================

        if (!name) {

            if (nameError) {
                nameError.textContent = "Name is required.";
            }

            nameInput?.focus();

            return;
        }


        if (name.length < 3 || name.length > 50) {

            if (nameError) {
                nameError.textContent =
                    "Name must be between 3 and 50 characters.";
            }

            nameInput?.focus();

            return;
        }


        // =========================
        // PHONE VALIDATION
        // =========================

        if (phone && !/^\d{10}$/.test(phone)) {

            if (phoneError) {
                phoneError.textContent =
                    "Phone number must contain exactly 10 digits.";
            }

            phoneInput?.focus();

            return;
        }


        // =========================
        // GENDER VALIDATION
        // =========================

        // Gender is optional.
        // If provided, it must be valid.

        if (
            gender &&
            !["Male", "Female", "Other"].includes(gender)
        ) {

            if (genderError) {
                genderError.textContent = "Invalid gender.";
            }

            genderInput?.focus();

            return;
        }


        // =========================
        // DATE OF BIRTH VALIDATION
        // =========================

        if (!validateDateOfBirth()) {

            dobInput?.focus();

            return;
        }


        // =========================
        // UPDATE PROFILE
        // =========================

        try {

            const response = await fetch("/profile/update", {

                method: "POST",

               headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
},

                body: JSON.stringify({
                    name,
                    phone,
                    gender,
                    dateOfBirth
                })

            });


            const data = await response.json();

         if (response.status === 403 && data.code === "USER_BLOCKED") {

    const modalElement = document.getElementById("customBlockedUserPopup");
    const logoutButton = document.getElementById("customBlockedLogoutButton");

    if (modalElement) {

        document.body.appendChild(modalElement);

        modalElement.classList.add("show");

    }

    if (logoutButton) {

        logoutButton.onclick = () => {
            window.location.href = "/login";
        };

    }

    return;
}



            // =========================
            // SERVER VALIDATION ERROR
            // =========================

            if (!response.ok || !data.success) {

                if (data.field === "name") {

                    if (nameError) {
                        nameError.textContent = data.message;
                    }

                    nameInput?.focus();

                }

                else if (data.field === "phone") {

                    if (phoneError) {
                        phoneError.textContent = data.message;
                    }

                    phoneInput?.focus();

                }

                else if (data.field === "gender") {

                    if (genderError) {
                        genderError.textContent = data.message;
                    }

                    genderInput?.focus();

                }

                else if (data.field === "dateOfBirth") {

                    if (dobError) {
                        dobError.textContent = data.message;
                    }

                    dobInput?.focus();

                }

                return;
            }


            // =========================
            // UPDATE PROFILE DISPLAY
            // =========================

            const user = data.user;


            const fullNameDisplay =
                document.getElementById("valFullName");

            if (fullNameDisplay) {

                fullNameDisplay.textContent =
                    user.name || "Not provided";

            }


            const phoneDisplay =
                document.getElementById("valPhone");

            if (phoneDisplay) {

                phoneDisplay.textContent =
                    user.phone || "Not provided";

            }


            const genderDisplay =
                document.getElementById("valGender");

            if (genderDisplay) {

                genderDisplay.textContent =
                    user.gender || "Not provided";

            }


            const dobDisplay =
                document.getElementById("valDob");

            if (dobDisplay) {

                dobDisplay.textContent =
                    user.dateOfBirth
                        ? new Date(user.dateOfBirth).toLocaleDateString(
                            "en-IN",
                            {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            }
                        )
                        : "Not provided";

            }


            // =========================
            // UPDATE HEADER USER NAME
            // =========================

            const displayName =
                document.getElementById("userDisplayName");

            if (displayName) {
                displayName.textContent = user.name;
            }


            // =========================
            // SHOW PROFILE VIEW
            // =========================

            clearErrors();

            editForm?.classList.add("d-none");
            readView?.classList.remove("d-none");

        }

        catch (error) {

            console.error("Profile update error:", error);

        }

    });


    // =========================
    // CLEAR NAME ERROR
    // =========================

    nameInput?.addEventListener("input", () => {
    const name = nameInput.value.trim();

    if (!name) {
        nameError.textContent = "Name is required.";
        return;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
        nameError.textContent = "Name must contain only letters and spaces.";
        return;
    }

    if (name.length < 3 || name.length > 50) {
        nameError.textContent = "Name must be between 3 and 50 characters.";
        return;
    }

    nameError.textContent = "";
});


    // =========================
    // CLEAR PHONE ERROR
    // =========================

   phoneInput?.addEventListener("input", () => {
    const phone = phoneInput.value.trim();

    if (!phone) {
        phoneError.textContent = "";
        return;
    }

    if (!/^\d+$/.test(phone)) {
        phoneError.textContent = "Phone number must contain only digits.";
        return;
    }

    if (phone.length !== 10) {
        phoneError.textContent = "Phone number must contain exactly 10 digits.";
        return;
    }

    phoneError.textContent = "";
});

    // =========================
    // CLEAR GENDER ERROR
    // =========================

    genderInput?.addEventListener("change", () => {

        if (genderError) {
            genderError.textContent = "";
        }

    });


    // =========================
    // DOB VALIDATION ON CHANGE
    // =========================

    dobInput?.addEventListener("change", () => {

        validateDateOfBirth();

    });


    // =========================
    // DOB VALIDATION ON INPUT
    // =========================

    dobInput?.addEventListener("input", () => {

        validateDateOfBirth();

    });


    // =========================
    // DEFAULT TAB
    // =========================

    showSection("account");

});