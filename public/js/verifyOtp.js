


document.addEventListener("DOMContentLoaded", () => {

    console.log("Verify OTP JS loaded");


    // =========================================
    // ELEMENTS
    // =========================================

    const inputs = [
        document.getElementById("otp1"),
        document.getElementById("otp2"),
        document.getElementById("otp3"),
        document.getElementById("otp4"),
        document.getElementById("otp5"),
        document.getElementById("otp6")
    ];

    const fullOtpInput =
        document.getElementById("fullOtpInput");

    const otpForm =
        document.getElementById("otpForm");

    const resendBtn =
        document.getElementById("resendBtn");

    const timerDisplay =
        document.getElementById("timerDisplay");


    // =========================================
    // CHECK ELEMENTS
    // =========================================

    if (
        inputs.some(input => !input) ||
        !fullOtpInput ||
        !otpForm ||
        !resendBtn ||
        !timerDisplay
    ) {

        console.error(
            "Verify OTP: Required elements are missing."
        );

        return;
    }


    // =========================================
    // COMBINE OTP
    // =========================================

    function updateFullOtp() {

        fullOtpInput.value =
            inputs
                .map(input => input.value)
                .join("");

    }


    // =========================================
    // OTP INPUT HANDLING
    // =========================================

    inputs.forEach((input, index) => {


        // -----------------------------------------
        // TYPING
        // -----------------------------------------

        input.addEventListener(
            "input",
            (event) => {

                let value =
                    event.target.value;

                // Only numbers

                value =
                    value.replace(/\D/g, "");

                // Only one digit per box

                value =
                    value.substring(0, 1);

                event.target.value =
                    value;


                // Move to next box

                if (
                    value &&
                    index < inputs.length - 1
                ) {

                    inputs[index + 1].focus();

                }


                updateFullOtp();

            }
        );


        // -----------------------------------------
        // KEYBOARD
        // -----------------------------------------

        input.addEventListener(
            "keydown",
            (event) => {


                // BACKSPACE

                if (
                    event.key === "Backspace"
                ) {

                    if (
                        input.value === "" &&
                        index > 0
                    ) {

                        inputs[index - 1].focus();

                        inputs[index - 1].value = "";

                    } else {

                        input.value = "";

                    }


                    updateFullOtp();

                }


                // LEFT ARROW

                else if (
                    event.key === "ArrowLeft" &&
                    index > 0
                ) {

                    event.preventDefault();

                    inputs[index - 1].focus();

                }


                // RIGHT ARROW

                else if (
                    event.key === "ArrowRight" &&
                    index < inputs.length - 1
                ) {

                    event.preventDefault();

                    inputs[index + 1].focus();

                }

            }
        );


        // -----------------------------------------
        // PASTE OTP
        // -----------------------------------------

        input.addEventListener(
            "paste",
            (event) => {

                event.preventDefault();


                const pasted =
                    (
                        event.clipboardData ||
                        window.clipboardData
                    )
                    .getData("text")
                    .replace(/\D/g, "")
                    .substring(0, 6);


                if (!pasted) {

                    return;

                }


                // Clear all boxes

                inputs.forEach(
                    box => {
                        box.value = "";
                    }
                );


                // Fill OTP

                pasted
                    .split("")
                    .forEach(
                        (digit, index) => {

                            if (inputs[index]) {

                                inputs[index].value =
                                    digit;

                            }

                        }
                    );


                updateFullOtp();


                // Focus last entered digit

                const lastIndex =
                    Math.min(
                        pasted.length,
                        inputs.length
                    ) - 1;


                if (lastIndex >= 0) {

                    inputs[lastIndex].focus();

                }

            }
        );

    });


    // =========================================
    // TIMER
    // =========================================

    let timerInterval = null;


    function updateTimer(seconds) {

        const minutes =
            Math.floor(seconds / 60);

        const remainingSeconds =
            seconds % 60;


        timerDisplay.textContent =
            `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

    }


    function startTimer(seconds) {

        // Clear previous timer

        if (timerInterval) {

            clearInterval(timerInterval);

            timerInterval = null;

        }


        let timeLeft =
            Number(seconds);


        // No timer required

        if (
            !Number.isFinite(timeLeft) ||
            timeLeft <= 0
        ) {

            timerDisplay.textContent = "";

            resendBtn.disabled = false;

            return;

        }


        timeLeft =
            Math.floor(timeLeft);


        resendBtn.disabled = true;


        // Show immediately

        updateTimer(timeLeft);


        timerInterval =
            setInterval(
                () => {

                    timeLeft--;


                    if (timeLeft <= 0) {

                        clearInterval(
                            timerInterval
                        );

                        timerInterval = null;


                        timerDisplay.textContent =
                            "00:00";


                        resendBtn.disabled =
                            false;


                        console.log(
                            "OTP timer finished"
                        );


                        return;

                    }


                    updateTimer(timeLeft);

                },
                1000
            );

    }


    // =========================================
    // START INITIAL TIMER
    // =========================================

    const initialRemaining =
        parseInt(
            timerDisplay.dataset.remaining,
            10
        );


    console.log(
        "Initial OTP timer:",
        initialRemaining
    );


    if (
        Number.isFinite(initialRemaining) &&
        initialRemaining > 0
    ) {

        startTimer(
            initialRemaining
        );

    } else {

        timerDisplay.textContent = "";

        resendBtn.disabled = false;

    }


    // =========================================
    // RESEND OTP
    // =========================================

    resendBtn.addEventListener(
        "click",
        async () => {

            if (
                resendBtn.disabled
            ) {

                return;

            }


            console.log(
                "Resend OTP clicked"
            );


            resendBtn.disabled = true;


            try {

                const response =
                    await fetch(
                        "/resend-otp",
                        {
                            method: "POST",

                            headers: {
                                "Accept":
                                    "application/json"
                            }
                        }
                    );


                // =================================
                // READ RESPONSE
                // =================================

                const contentType =
                    response.headers.get(
                        "content-type"
                    );


                let data = null;


                if (
                    contentType &&
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    data =
                        await response.json();

                }


                console.log(
                    "Resend OTP response:",
                    data
                );


                // =================================
                // ERROR
                // =================================

                if (!response.ok) {

                    alert(
                        data?.message ||
                        "Unable to resend OTP."
                    );


                    resendBtn.disabled =
                        false;


                    return;

                }


                // =================================
                // SUCCESS
                // =================================

                // Clear OTP boxes

                inputs.forEach(
                    input => {
                        input.value = "";
                    }
                );


                updateFullOtp();


                // Focus first box

                inputs[0].focus();


                // Start fresh timer

                startTimer(60);


                console.log(
                    "OTP resent successfully"
                );

            } catch (error) {

                console.error(
                    "Resend OTP error:",
                    error
                );


                alert(
                    "Unable to resend OTP. Please try again."
                );


                resendBtn.disabled =
                    false;

            }

        }
    );


    // =========================================
    // FORM SUBMIT
    // =========================================

    otpForm.addEventListener(
        "submit",
        (event) => {

            updateFullOtp();


            const otp =
                fullOtpInput.value;


            if (
                !/^\d{6}$/.test(otp)
            ) {

                event.preventDefault();


                alert(
                    "Please enter all 6 digits of your verification code."
                );


                return;

            }

        }
    );


    // =========================================
    // INITIAL FOCUS
    // =========================================

    inputs[0].focus();

});