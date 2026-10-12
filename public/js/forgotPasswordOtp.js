



document.addEventListener("DOMContentLoaded", () => {

    console.log("Forgot Password OTP JS loaded");


    // =========================================
    // ELEMENTS
    // =========================================

    const form =
        document.getElementById("otpForm");

    const otpInputs =
        [...document.querySelectorAll(".otp-input")];

    const fullOtpInput =
        document.getElementById("fullOtpInput");

    const resendBtn =
        document.getElementById("resendBtn");

    const timerDisplay =
        document.getElementById("timerDisplay");

    const otpContainer =
        document.getElementById("otpContainer");


    // =========================================
    // CHECK
    // =========================================

    console.log(
        "OTP inputs:",
        otpInputs.length
    );

    console.log(
        "Initial timer:",
        otpContainer?.dataset.resendRemaining
    );


    if (
        !form ||
        otpInputs.length !== 6 ||
        !fullOtpInput ||
        !resendBtn ||
        !timerDisplay ||
        !otpContainer
    ) {

        console.error(
            "Forgot Password OTP: elements missing"
        );

        return;
    }


    // =========================================
    // TIMER
    // =========================================

    let timerInterval = null;


    function startTimer(seconds) {

        clearInterval(timerInterval);


        let remaining =
            parseInt(seconds, 10);


        if (
            isNaN(remaining) ||
            remaining <= 0
        ) {

            timerDisplay.textContent = "";

            resendBtn.disabled = false;

            return;
        }


        resendBtn.disabled = true;


        showTime(remaining);


        timerInterval =
            setInterval(() => {

                remaining--;


                if (remaining <= 0) {

                    clearInterval(
                        timerInterval
                    );

                    timerInterval = null;


                    timerDisplay.textContent =
                        "";


                    resendBtn.disabled =
                        false;


                    console.log(
                        "Timer finished"
                    );

                    return;
                }


                showTime(remaining);

            }, 1000);

    }


    function showTime(seconds) {

        timerDisplay.textContent =
            `00:${String(seconds).padStart(2, "0")}`;

    }


    // =========================================
    // INITIAL TIMER
    // =========================================

    const initialTime =
        parseInt(
            otpContainer.dataset.resendRemaining,
            10
        );


    if (!isNaN(initialTime)) {

        startTimer(initialTime);

    } else {

        resendBtn.disabled = false;

    }


    // =========================================
    // OTP INPUT
    // =========================================

    otpInputs.forEach((input, index) => {


        // TYPING

        input.addEventListener(
            "input",
            () => {

                input.value =
                    input.value.replace(
                        /\D/g,
                        ""
                    );


                if (
                    input.value.length > 1
                ) {

                    input.value =
                        input.value[0];

                }


                if (
                    input.value &&
                    index < 5
                ) {

                    otpInputs[index + 1]
                        .focus();

                }

            }
        );


        // BACKSPACE + ARROWS

        input.addEventListener(
            "keydown",
            (event) => {


                if (
                    event.key === "Backspace"
                ) {

                    if (
                        input.value === "" &&
                        index > 0
                    ) {

                        otpInputs[index - 1]
                            .focus();

                    }

                    return;
                }


                if (
                    event.key === "ArrowLeft" &&
                    index > 0
                ) {

                    event.preventDefault();

                    otpInputs[index - 1]
                        .focus();

                }


                if (
                    event.key === "ArrowRight" &&
                    index < 5
                ) {

                    event.preventDefault();

                    otpInputs[index + 1]
                        .focus();

                }

            }
        );


        // =====================================
        // COPY / PASTE
        // =====================================

        input.addEventListener(
            "paste",
            (event) => {

                event.preventDefault();


                const text =
                    event.clipboardData
                        .getData("text");


                const otp =
                    text
                        .replace(/\D/g, "")
                        .slice(0, 6);


                console.log(
                    "Pasted OTP:",
                    otp
                );


                if (!otp) {
                    return;
                }


                otpInputs.forEach(
                    box => {
                        box.value = "";
                    }
                );


                otp.split("")
                    .forEach(
                        (digit, i) => {

                            if (
                                otpInputs[i]
                            ) {

                                otpInputs[i]
                                    .value =
                                    digit;

                            }

                        }
                    );


                fullOtpInput.value = otp;


                const last =
                    Math.min(
                        otp.length - 1,
                        5
                    );


                otpInputs[last].focus();

            }
        );

    });


form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const otp =
            otpInputs
                .map(
                    input => input.value
                )
                .join("");

        console.log(
            "OTP submitted:",
            otp
        );

        if (
            !/^\d{6}$/.test(otp)
        ) {

            alert(
                "Please enter a valid 6-digit OTP."
            );

            return;
        }

        fullOtpInput.value = otp;

        try {

            const response =
                await fetch(
                    form.action,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded",
                            "Accept":
                                "application/json"
                        },

                        body:
                            new URLSearchParams(
                                new FormData(form)
                            ),

                        credentials:
                            "same-origin"
                    }
                );

            const data =
                await response.json();

            console.log(
                "OTP verification response:",
                data
            );

            if (
                data.success &&
                data.redirect
            ) {

                window.location.replace(
                    data.redirect
                );

                return;
            }

            alert(
                data.message ||
                "Unable to verify OTP. Please try again."
            );

        } catch (error) {

            console.error(
                "OTP verification error:",
                error
            );

            alert(
                "Something went wrong. Please try again."
            );

        }

    }
);

    // =========================================
    // RESEND OTP
    // =========================================

    resendBtn.addEventListener(
        "click",
        async () => {


            if (resendBtn.disabled) {
                return;
            }


            console.log(
                "Resend OTP clicked"
            );


            resendBtn.disabled = true;


            try {

                const response =
                    await fetch(
                        "/forgot-password/resend-otp",
                        {
                            method: "POST",

                            headers: {
                                "Accept":
                                    "application/json"
                            },

                            credentials:
                                "same-origin"
                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "Resend response:",
                    data
                );


                if (!response.ok) {

                    alert(
                        data.message ||
                        "Unable to resend OTP."
                    );


                    resendBtn.disabled =
                        false;

                    return;
                }


                // Clear OTP

                otpInputs.forEach(
                    input => {
                        input.value = "";
                    }
                );


                fullOtpInput.value = "";


                // Focus first box

                otpInputs[0].focus();


                // Restart timer

                startTimer(
                    data.resendRemaining || 60
                );


            } catch (error) {

                console.error(
                    "Resend error:",
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


 

    otpInputs[0].focus();

});