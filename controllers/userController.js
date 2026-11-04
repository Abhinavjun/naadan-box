const {
    loginUserService,
    signupUserService,
    resetUserPasswordByEmailService,
    findUserForPasswordReset,
    logoutUserService,
    isPasswordResetVerificationValid,
    checkAccountStatusService
} = require("../services/authService");

const {
    createOtp,
    verifyOtpService,
    resendOtpService,
    createPasswordResetOtp,
    verifyPasswordResetOtp,
    getResendRemaining,
    getOtpAttemptsRemaining
} = require("../services/otpservice");

// Load home
const loadHome = (req, res) => {
    return res.render("user/home");
};

// Load signup
const loadSignup = (req, res) => {
    return res.render("user/signup", {
        nameError: null,
        emailError: null,
        passwordError: null,
        referralCodeError: null
    });
};

// Load login page
const loadLogin = (req, res) => {
    let error = null;

    if (req.query.blocked === "true") {
        error = "Your account has been blocked by the administrator. Please contact support.";
    }

    return res.render("user/login", { error });
};

// Login
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await loginUserService(email, password);

        req.session.regenerate(error => {
            if (error) {
                console.error("Session regeneration error:", error);

                return res.status(500).render("user/login", {
                    error: "Something went wrong. Please try again."
                });
            }

            req.session.userId = user._id.toString();

            req.session.user = {
                id: user._id.toString(),
                name: user.name,
                email: user.email
            };

            return req.session.save(saveError => {
                if (saveError) {
                    console.error("Login session save error:", saveError);

                    return res.status(500).render("user/login", {
                        error: "Unable to complete login. Please try again."
                    });
                }

                console.log("User logged in:", user.email);
                return res.redirect("/");
            });
        });

    } catch (error) {
        if (error.message === "EMAIL_REQUIRED") {
            return res.status(400).render("user/login", {
                error: "Email is required."
            });
        }

        if (error.message === "INVALID_EMAIL") {
            return res.status(400).render("user/login", {
                error: "Please enter a valid email address."
            });
        }

        if (error.message === "PASSWORD_REQUIRED") {
            return res.status(400).render("user/login", {
                error: "Password is required."
            });
        }

        if (error.message === "INVALID_CREDENTIALS") {
            return res.status(401).render("user/login", {
                error: "Invalid email or password."
            });
        }

        if (error.message === "USER_BLOCKED") {
            return res.status(403).render("user/login", {
                error: "Your account has been blocked. Please contact support."
            });
        }

        if (error.message === "EMAIL_NOT_VERIFIED") {
            return res.status(403).render("user/login", {
                error: "Please verify your email before logging in."
            });
        }

        console.error("Login error:", error);

        return res.status(500).render("user/login", {
            error: "Something went wrong. Please try again."
        });
    }
};

// Logout
const logout = async (req, res) => {
    if (!req.session) {
        return res.status(401).json({
            success: false,
            message: "SESSION_ALREADY_EXPIRED"
        });
    }

    try {
        await logoutUserService(req.session);

        res.clearCookie("naadan_user_sid");

        return res.status(200).json({
            success: true,
            message: "You have been logged out successfully."
        });

    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to log out. Please try again."
        });
    }
};

// Load signup OTP page
const loadVerifyOtp = async (req, res) => {
    if (req.session.userId) {
        return res.redirect("/");
    }

    const email = req.session.email;

    if (!email) {
        return res.redirect("/signup");
    }

    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    try {
        const resendRemaining = await getResendRemaining(
            email,
            "signup",
            req.session
        );

        // Read the error saved by the previous POST request.
        const otpError = req.session.otpError || null;

        // Remove it so the message appears only once.
        delete req.session.otpError;

        return res.render("user/verifyOtp", {
            email,
            resendRemaining,
            otpError
        });

    } catch (error) {
        console.error("Load OTP page error:", error);
        return res.status(500).send("Something went wrong.");
    }
};

// Verify signup OTP
const verifyOtp = async (req, res) => {
    const { otp } = req.body;
    const email = req.session.email;

    if (!email) {
        return res.redirect("/signup");
    }

    try {
        const user = await verifyOtpService(
            email,
            otp,
            req.session
        );

        // Regenerate session after successful verification
        req.session.regenerate(error => {
            if (error) {
                console.error("Signup session regeneration error:", error);

                return res.status(500).render("user/verifyOtp", {
                    email,
                    resendRemaining: 0,
                    otpError: "Something went wrong. Please try again."
                });
            }

            // Store user details in session
            req.session.userId = user._id.toString();

            req.session.user = {
                id: user._id.toString(),
                name: user.name,
                email: user.email
            };

            // Save session
            return req.session.save(saveError => {
                if (saveError) {
                    console.error("Signup session save error:", saveError);

                    return res.status(500).render("user/verifyOtp", {
                        email,
                        resendRemaining: 0,
                        otpError: "Account verified, but login could not be completed. Please log in."
                    });
                }

                console.log("User signed up and logged in:", user.email);

                return res.redirect("/");
            });
        });

    } catch (error) {

        if (error.message === "OTP_FORMAT_INVALID") {
            const resendRemaining = await getResendRemaining(
                email,
                "signup",
                req.session
            );

            return res.status(400).render("user/verifyOtp", {
                email,
                resendRemaining,
                otpError: "Please enter a valid 6-digit OTP."
            });
        }

        let otpError;

        if (error.message === "OTP_INVALID") {
            const attemptsRemaining = getOtpAttemptsRemaining(
                "signup",
                req.session
            );

            otpError = `Invalid OTP. You have ${attemptsRemaining} attempts remaining.`;
        } else if (error.message === "OTP_ATTEMPTS_EXCEEDED") {
            otpError = "Too many incorrect attempts. Please request a new OTP.";
        } else if (error.message === "OTP_NOT_FOUND") {
            otpError = "OTP not found. Please request a new OTP.";
        } else if (error.message === "OTP_EXPIRED") {
            otpError = "OTP has expired. Please request a new OTP.";
        } else if (error.message === "USER_NOT_FOUND") {
            otpError = "User account not found.";
        } else if (error.message === "ALREADY_VERIFIED") {
            otpError = "This email is already verified. Please log in.";
        } else {
            console.error("OTP verification error:", error);
            otpError = "Something went wrong. Please try again.";
        }

        // Save error message in session
        req.session.otpError = otpError;

        return req.session.save(saveError => {
            if (saveError) {
                console.error("OTP error session save failed:", saveError);

                return res.status(500).send(
                    "Something went wrong. Please try again."
                );
            }

            return res.redirect("/verify-otp");
        });
    }
};

// Resend signup OTP
const resendOtp = async (req, res) => {
    const email = req.session.email;

    if (!email) {
        return res.redirect("/signup");
    }

    try {
        await resendOtpService(
            email,
            "signup",
            req.session
        );

        console.log("New OTP created and email sent");

        return res.redirect("/verify-otp");

    } catch (error) {
        if (error.message === "RESEND_COOLDOWN") {
            return res.status(429).json({
                message: "Please wait before requesting another OTP."
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "User account not found."
            });
        }

        if (error.message === "USER_BLOCKED") {
            return res.status(403).json({
                message: "Your account has been blocked. Please contact support."
            });
        }

        if (error.message === "ALREADY_VERIFIED") {
            return res.status(400).json({
                message: "This email is already verified."
            });
        }

        console.error("Resend OTP error:", error);

        return res.status(500).json({
            message: "Unable to resend OTP. Please try again."
        });
    }
};

// Signup
const signup = async (req, res) => {
    const {
        name,
        email,
        password,
        confirmPassword,
        referralCode
    } = req.body;

    try {
        const result = await signupUserService({
            name,
            email,
            password,
            confirmPassword,
            referralCode
        });

        if (result.status === "EXISTING_VERIFIED_USER") {
            return res.status(409).render("user/signup", {
                nameError: null,
                emailError: "Email is already registered.",
                passwordError: null,
                referralCodeError: null
            });
        }

        const user = result.user;

        // Store email in session
        req.session.email = user.email;

        try {
            // Create and send OTP
            await createOtp(
                user.email,
                "signup",
                req.session
            );

            return res.redirect("/verify-otp");

        } catch (error) {
            if (error.message === "RESEND_COOLDOWN") {
                return res.redirect("/verify-otp");
            }

            console.error("OTP creation error:", error);

            return res.status(500).send(
                "Unable to send OTP. Please try again."
            );
        }

    } catch (error) {

        if (error.message === "NAME_REQUIRED") {
            return res.status(400).render("user/signup", {
                nameError: "Name is required.",
                emailError: null,
                passwordError: null,
                referralCodeError: null
            });
        }

        if (error.message === "NAME_TOO_SHORT") {
            return res.status(400).render("user/signup", {
                nameError: "Name must be at least 3 characters.",
                emailError: null,
                passwordError: null,
                referralCodeError: null
            });
        }

        if (
            error.message === "NAME_TOO_LONG" ||
            error.message === "INVALID_NAME"
        ) {
            return res.status(400).render("user/signup", {
                nameError: "Please enter a valid name.",
                emailError: null,
                passwordError: null,
                referralCodeError: null
            });
        }

        if (error.message === "EMAIL_REQUIRED") {
            return res.status(400).render("user/signup", {
                nameError: null,
                emailError: "Email is required.",
                passwordError: null,
                referralCodeError: null
            });
        }

        if (error.message === "INVALID_EMAIL") {
            return res.status(400).render("user/signup", {
                nameError: null,
                emailError: "Please enter a valid email address.",
                passwordError: null,
                referralCodeError: null
            });
        }

        if (error.message === "PASSWORD_REQUIRED") {
            return res.status(400).render("user/signup", {
                nameError: null,
                emailError: null,
                passwordError: "Password is required.",
                referralCodeError: null
            });
        }

        if (error.message === "INVALID_PASSWORD") {
            return res.status(400).render("user/signup", {
                nameError: null,
                emailError: null,
                passwordError:
                    "Password must be 8–72 characters and include uppercase, lowercase, number, and special character.",
                referralCodeError: null
            });
        }

        if (error.message === "PASSWORD_MISMATCH") {
            return res.status(400).render("user/signup", {
                nameError: null,
                emailError: null,
                passwordError: "Passwords do not match.",
                referralCodeError: null
            });
        }

        if (error.message === "INVALID_REFERRAL_CODE") {
            return res.status(400).render("user/signup", {
                nameError: null,
                emailError: null,
                passwordError: null,
                referralCodeError: "Invalid referral code."
            });
        }

        console.error("Signup error:", error);

        return res.status(500).render("user/signup", {
            nameError: null,
            emailError: "Something went wrong. Please try again.",
            passwordError: null,
            referralCodeError: null
        });
    }
};

// Load forgot password page
const loadForgotPassword = (req, res) => {
    return res.render("user/forgotPassword", {
        error: null,
        email: ""
    });
};

// Forgot password
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const { email: normalizedEmail } =
            await findUserForPasswordReset(email);

        // Clear previous password-reset verification.
        delete req.session.passwordResetVerifiedAt;

        req.session.forgotPasswordEmail = normalizedEmail;

        await createPasswordResetOtp(
            normalizedEmail,
            req.session
        );

        // Save session before redirecting.
        return req.session.save(error => {
            if (error) {
                console.error("Forgot password session save error:", error);

                return res.status(500).render("user/forgotPassword", {
                    error: "Unable to start password recovery. Please try again.",
                    email: req.body.email || ""
                });
            }

            return res.redirect("/forgot-password/verify-otp");
        });

    } catch (error) {
        if (error.message === "EMAIL_REQUIRED") {
            return res.status(400).render("user/forgotPassword", {
                error: "Email is required.",
                email: ""
            });
        }

        if (error.message === "INVALID_EMAIL") {
            return res.status(400).render("user/forgotPassword", {
                error: "Please enter a valid email address.",
                email: req.body.email || ""
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).render("user/forgotPassword", {
                error: "No account found with this email address.",
                email: req.body.email || ""
            });
        }

        if (error.message === "USER_BLOCKED") {
            return res.status(403).render("user/forgotPassword", {
                error: "Your account has been blocked. Please contact support.",
                email: req.body.email || ""
            });
        }

        if (error.message === "RESEND_COOLDOWN") {
            if (!req.session.forgotPasswordEmail) {
                return res.status(429).render("user/forgotPassword", {
                    error: "Please wait before requesting another OTP.",
                    email: req.body.email || ""
                });
            }

            return req.session.save(saveError => {
                if (saveError) {
                    console.error(
                        "Forgot password cooldown session save error:",
                        saveError
                    );

                    return res.status(500).render("user/forgotPassword", {
                        error: "Unable to continue password recovery. Please try again.",
                        email: req.body.email || ""
                    });
                }

                return res.redirect("/forgot-password/verify-otp");
            });
        }

        console.error("Forgot password error:", error);

        return res.status(500).render("user/forgotPassword", {
            error: "Something went wrong. Please try again.",
            email: req.body.email || ""
        });
    }
};

// Load forgot-password OTP page
const loadForgotPasswordOtp = async (req, res) => {
    const email = req.session.forgotPasswordEmail;

    if (!email) {
        return res.redirect("/forgot-password");
    }

    const verificationIsValid =
        isPasswordResetVerificationValid(
            req.session.passwordResetVerifiedAt
        );

    if (verificationIsValid) {
        return res.redirect("/forgot-password/reset-password");
    }

    try {
        const resendRemaining = await getResendRemaining(
            email,
            "forgot-password",
            req.session
        );

        res.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        return res.render("user/forgotPasswordOtp", {
            email,
            resendRemaining,
            otpError: null
        });

    } catch (error) {
        console.error("Load forgot password OTP error:", error);
        return res.status(500).send("Something went wrong.");
    }
};

// Verify forgot-password OTP
const verifyForgotPasswordOtp = async (req, res) => {
    const { otp } = req.body;
    const email = req.session.forgotPasswordEmail;

    if (!email) {
        return res.status(401).json({
            success: false,
            message: "Session expired. Please request a new OTP."
        });
    }

    try {
        await verifyPasswordResetOtp(
            email,
            otp,
            req.session
        );

        // OTP verified successfully.
        req.session.passwordResetVerifiedAt = Date.now();

        return req.session.save(error => {
            if (error) {
                console.error(
                    "Password reset verification session save error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to verify your session. Please try again."
                });
            }

            return res.status(200).json({
                success: true,
                redirect: "/forgot-password/reset-password"
            });
        });

    } catch (error) {
        if (error.message === "OTP_FORMAT_INVALID") {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit OTP."
            });
        }

        if (error.message === "OTP_INVALID") {
            const attemptsRemaining = getOtpAttemptsRemaining(
                "forgot-password",
                req.session
            );

            return res.status(400).json({
                success: false,
                message: `Invalid OTP. You have ${attemptsRemaining} attempts remaining.`
            });
        }

        if (error.message === "OTP_ATTEMPTS_EXCEEDED") {
            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts. Please request a new OTP."
            });
        }

        if (
            error.message === "OTP_NOT_FOUND" ||
            error.message === "OTP_EXPIRED"
        ) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired. Please request a new OTP."
            });
        }

        console.error("Forgot password OTP verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
};

// Resend forgot-password OTP
const resendForgotPasswordOtp = async (req, res) => {
    const email = req.session.forgotPasswordEmail;

    if (!email) {
        return res.status(401).json({
            success: false,
            message: "Session expired. Please try again."
        });
    }

    try {
        await resendOtpService(
            email,
            "forgot-password",
            req.session
        );

        // Invalidate previous password-reset verification.
        delete req.session.passwordResetVerifiedAt;

        return req.session.save(error => {
            if (error) {
                console.error(
                    "Forgot password resend session save error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to save session. Please try again."
                });
            }

            return res.status(200).json({
                success: true,
                message: "OTP sent successfully.",
                resendRemaining: 60
            });
        });

    } catch (error) {
        if (error.message === "USER_BLOCKED") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Please contact support."
            });
        }

        if (error.message === "RESEND_COOLDOWN") {
            return res.status(429).json({
                success: false,
                message: "Please wait before requesting another OTP."
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User account not found."
            });
        }

        console.error("Forgot password resend OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to resend OTP. Please try again."
        });
    }
};

// Load reset-password page
const loadResetPassword = (req, res) => {
    const verifiedAt = req.session.passwordResetVerifiedAt;

    const verificationIsValid =
        isPasswordResetVerificationValid(verifiedAt);

    if (!req.session.forgotPasswordEmail || !verificationIsValid) {
        delete req.session.passwordResetVerifiedAt;

        return res.redirect("/forgot-password");
    }

    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );

    return res.render("user/resetPassword", {
        passwordError: null,
        confirmPasswordError: null,
        resetUrl: "/forgot-password/reset-password"
    });
};

// Reset password
const resetPassword = async (req, res) => {
    const { password, confirmPassword } = req.body;
    const email = req.session.forgotPasswordEmail;
    const verifiedAt = req.session.passwordResetVerifiedAt;

    // Check whether OTP verification is still valid.
    const verificationIsValid =
        isPasswordResetVerificationValid(verifiedAt);

    if (!email || !verificationIsValid) {
        delete req.session.passwordResetVerifiedAt;

        return res.status(403).json({
            success: false,
            message: "Password reset verification required."
        });
    }

    try {
        // Validate and update password through the service.
        await resetUserPasswordByEmailService(
            email,
            password,
            confirmPassword
        );

        // Clear password recovery session data.
        delete req.session.forgotPasswordEmail;
        delete req.session.passwordResetVerifiedAt;

        return req.session.save(error => {
            if (error) {
                console.error("Reset password session save error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Password was changed, but the session could not be cleared. Please log in again."
                });
            }

            return res.status(200).json({
                success: true,
                redirect: "/login"
            });
        });

    } catch (error) {
        if (error.message === "PASSWORD_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Password is required."
            });
        }

        if (error.message === "INVALID_PASSWORD") {
            return res.status(400).json({
                success: false,
                message: "Password must be 8-72 characters and include uppercase, lowercase, number, and special character."
            });
        }

        if (error.message === "CONFIRM_PASSWORD_REQUIRED") {
            return res.status(400).json({
                success: false,
                message: "Please confirm your password."
            });
        }

        if (error.message === "PASSWORD_MISMATCH") {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (error.message === "USER_BLOCKED") {
            return res.status(403).json({
                success: false,
                message: "This account is blocked."
            });
        }

        console.error("Reset password error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to reset password. Please try again."
        });
    }
};

// Check account status
const checkAccountStatus = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            blocked: false,
            code: "NOT_AUTHENTICATED"
        });
    }

    try {
        await checkAccountStatusService(req.session.userId);

        return res.status(200).json({
            success: true,
            blocked: false
        });

    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(401).json({
                success: false,
                blocked: false,
                code: "USER_NOT_FOUND"
            });
        }

        if (error.message === "USER_BLOCKED") {
            return res.status(403).json({
                success: false,
                blocked: true,
                code: "USER_BLOCKED",
                message: "Your account has been blocked by the administrator."
            });
        }

        console.error("Account status check error:", error);

        return res.status(500).json({
            success: false,
            blocked: false,
            message: "Unable to check account status."
        });
    }
};


module.exports = {
    loadHome,
    loadSignup,
    loadLogin,
    login,
    logout,
    signup,
    loadVerifyOtp,
    verifyOtp,
    resendOtp,
    loadForgotPassword,
    forgotPassword,
    loadForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resendForgotPasswordOtp,
    loadResetPassword,
    resetPassword,
    checkAccountStatus
    
};








// const attempting  = async(req,res) => {
    
//     const {email, password} = req.body;
//     const user = User.findOne({email},{password});
//     if(!password) {
//         loginAttempt +=1;
//     }
//     if(loginAttempt > 2) {
//         user.blocked = true;
//     }
// }