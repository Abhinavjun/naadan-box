const crypto = require("crypto");
const { sendOtpEmail } = require("../services/emailService");

const {
    getUserProfileService,
    changeUserPasswordService,
    resetUserPasswordService
} = require("../services/authService");

const {
    sendEmailChangeOtp,
    verifyEmailChangeOtp: verifyEmailChangeOtpService,
    checkResendCooldown,
    OTP_EXPIRY_MS,
    MAX_OTP_ATTEMPTS
} = require("../services/emailChangeService");

// load security page
const loadSecurity = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        return res.render("user/profile/security", { user });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.redirect("/login");
        }

        console.error("Load security page error:", error);
        return res.status(500).send("Something went wrong. Please try again.");
    }
};

// load change email page
const loadChangeEmail = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        if (user.googleId) {
            return res.redirect("/profile");
        }

        return res.render("user/profile/changeEmail", { user });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.redirect("/login");
        }

        console.error("Load change email page error:", error);
        return res.status(500).send("Something went wrong. Please try again.");
    }
};

// load email verification page
const loadEmailVerification = async (req, res) => {
    if (!req.session.emailChangeOtp) {
        return res.redirect("/profile/security/change-email");
    }

    if (
        !Number.isFinite(req.session.emailChangeOtpExpires) ||
        Date.now() >= req.session.emailChangeOtpExpires
    ) {
        delete req.session.emailChangeOtp;
        delete req.session.emailChangeNewEmail;
        delete req.session.emailChangeOtpExpires;
        delete req.session.emailChangeOtpAttempts;
        delete req.session.emailChangeOtpSentAt;

        return res.redirect("/profile/security/change-email");
    }

    const resendAvailableAt =
        (req.session.emailChangeOtpSentAt || 0) + 60000;

    return res.render("user/profile/emailVerification", {
        resendAvailableAt
    });
};



// send email change otp
const sendEmailChangeOtpController = async (req, res) => {
    try {
        // Prevent repeated OTP requests during the cooldown.
        const existingOtp = req.session.emailChangeOtp;
        const sentAt = req.session.emailChangeOtpSentAt;
        const expiresAt = req.session.emailChangeOtpExpires;

        if (existingOtp) {
            if (
                typeof existingOtp !== "string" ||
                !/^\d{6}$/.test(existingOtp) ||
                !Number.isFinite(sentAt) ||
                !Number.isFinite(expiresAt) ||
                !Number.isInteger(req.session.emailChangeOtpAttempts) ||
                req.session.emailChangeOtpAttempts < 0
            ) {
                delete req.session.emailChangeOtp;
                delete req.session.emailChangeNewEmail;
                delete req.session.emailChangeOtpExpires;
                delete req.session.emailChangeOtpAttempts;
                delete req.session.emailChangeOtpSentAt;
            } else if (Date.now() < expiresAt) {
                const remaining = checkResendCooldown(sentAt);

                if (remaining > 0) {
                    return res.status(429).json({
                        success: false,
                        message: `Please wait ${remaining} seconds before requesting another OTP.`,
                        remaining
                    });
                }

                return res.status(429).json({
                    success: false,
                    message: "An OTP has already been issued. Use the resend option.",
                    remaining: 0
                });
            } else {
                delete req.session.emailChangeOtp;
                delete req.session.emailChangeNewEmail;
                delete req.session.emailChangeOtpExpires;
                delete req.session.emailChangeOtpAttempts;
                delete req.session.emailChangeOtpSentAt;
            }
        }

        const result = await sendEmailChangeOtp(
            req.session.userId,
            req.body.newEmail
        );

        req.session.emailChangeOtp = result.otp;
        req.session.emailChangeNewEmail = result.email;
        req.session.emailChangeOtpExpires = result.expiresAt;
        req.session.emailChangeOtpAttempts = 0;
        req.session.emailChangeOtpSentAt = result.sentAt;

        return res.status(200).json({
            success: true,
            message: "OTP sent to your new email address."
        });
    } catch (error) {
        switch (error.message) {
            case "EMAIL_REQUIRED":
                return res.status(400).json({
                    success: false,
                    message: "Email address is required."
                });

            case "INVALID_EMAIL":
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid email address."
                });

            case "EMAIL_ALREADY_EXISTS":
                return res.status(409).json({
                    success: false,
                    message: "This email is already registered."
                });

            case "SAME_EMAIL":
                return res.status(400).json({
                    success: false,
                    message: "New email must differ from your current email."
                });

            case "GOOGLE_ACCOUNT_NOT_SUPPORTED":
                return res.status(403).json({
                    success: false,
                    message: "Email change is not available for Google accounts."
                });

            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "INVALID_OTP_SESSION":
                return res.status(400).json({
                    success: false,
                    message: "OTP session is invalid. Please start again."
                });

            default:
                if (error.code === 11000) {
                    return res.status(409).json({
                        success: false,
                        message: "This email is already registered."
                    });
                }

                console.error("Email change OTP error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to send OTP. Please try again."
                });
        }
    }
};




// resend email change otp
const resendEmailChangeOtp = async (req, res) => {
    try {
        const {
            emailChangeOtp,
            emailChangeNewEmail,
            emailChangeOtpExpires,
            emailChangeOtpAttempts,
            emailChangeOtpSentAt
        } = req.session;

        // Validate the existing OTP session.
        if (
            typeof emailChangeOtp !== "string" ||
            !/^\d{6}$/.test(emailChangeOtp) ||
            typeof emailChangeNewEmail !== "string" ||
            !emailChangeNewEmail.trim() ||
            !Number.isFinite(emailChangeOtpExpires) ||
            !Number.isInteger(emailChangeOtpAttempts) ||
            emailChangeOtpAttempts < 0 ||
            !Number.isFinite(emailChangeOtpSentAt)
        ) {
            return res.status(400).json({
                success: false,
                message: "OTP session expired. Please start again."
            });
        }

        // Check OTP expiry.
        if (Date.now() >= emailChangeOtpExpires) {
            delete req.session.emailChangeOtp;
            delete req.session.emailChangeNewEmail;
            delete req.session.emailChangeOtpExpires;
            delete req.session.emailChangeOtpAttempts;
            delete req.session.emailChangeOtpSentAt;

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Enforce resend cooldown.
        const remaining = checkResendCooldown(emailChangeOtpSentAt);

        if (remaining > 0) {
            return res.status(429).json({
                success: false,
                message: `Please wait ${remaining} seconds before requesting another OTP.`,
                remaining
            });
        }

        // Generate and send a new OTP.
        const result = await sendEmailChangeOtp(
            req.session.userId,
            emailChangeNewEmail
        );

        req.session.emailChangeOtp = result.otp;
        req.session.emailChangeNewEmail = result.email;
        req.session.emailChangeOtpExpires = result.expiresAt;
        req.session.emailChangeOtpAttempts = 0;
        req.session.emailChangeOtpSentAt = result.sentAt;

        return res.status(200).json({
            success: true,
            message: "A new OTP has been sent to your email address."
        });
    } catch (error) {
        switch (error.message) {
            case "EMAIL_REQUIRED":
            case "INVALID_EMAIL":
                return res.status(400).json({
                    success: false,
                    message: "Invalid email address. Please start again."
                });

            case "EMAIL_ALREADY_EXISTS":
                return res.status(409).json({
                    success: false,
                    message: "This email is already registered."
                });

            case "SAME_EMAIL":
                return res.status(400).json({
                    success: false,
                    message: "New email must differ from your current email."
                });

            case "GOOGLE_ACCOUNT_NOT_SUPPORTED":
                return res.status(403).json({
                    success: false,
                    message: "Email change is not available for Google accounts."
                });

            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "INVALID_OTP_SESSION":
                return res.status(400).json({
                    success: false,
                    message: "OTP session is invalid. Please start again."
                });

            default:
                if (error.code === 11000) {
                    return res.status(409).json({
                        success: false,
                        message: "This email is already registered."
                    });
                }

                console.error("Resend email change OTP error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to resend OTP. Please try again."
                });
        }
    }
};

// verify email change otp
const verifyEmailChangeOtp = async (req, res) => {
    const clearEmailChangeSession = () => {
        delete req.session.emailChangeOtp;
        delete req.session.emailChangeNewEmail;
        delete req.session.emailChangeOtpExpires;
        delete req.session.emailChangeOtpAttempts;
        delete req.session.emailChangeOtpSentAt;
    };

    try {
        const user = await verifyEmailChangeOtpService({
            userId: req.session.userId,
            newEmail: req.session.emailChangeNewEmail,
            submittedOtp: req.body.otp,
            storedOtp: req.session.emailChangeOtp,
            expiresAt: req.session.emailChangeOtpExpires,
            attempts: req.session.emailChangeOtpAttempts
        });

        clearEmailChangeSession();

        return res.status(200).json({
            success: true,
            message: "Email address updated successfully.",
            email: user.email
        });
    } catch (error) {
        switch (error.message) {
            case "INVALID_OTP_FORMAT":
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid 6-digit OTP."
                });

            case "OTP_SESSION_EXPIRED":
            case "OTP_EXPIRED":
                clearEmailChangeSession();

                return res.status(400).json({
                    success: false,
                    message: "OTP expired. Please request a new OTP."
                });

            case "OTP_ATTEMPTS_EXCEEDED":
                clearEmailChangeSession();

                return res.status(429).json({
                    success: false,
                    message: "Too many incorrect attempts. Please request a new OTP."
                });

            case "OTP_INVALID": {
                const attempts = req.session.emailChangeOtpAttempts;

                req.session.emailChangeOtpAttempts =
                    Number.isInteger(attempts) && attempts >= 0
                        ? attempts + 1
                        : 1;

                if (
                    req.session.emailChangeOtpAttempts >=
                    MAX_OTP_ATTEMPTS
                ) {
                    clearEmailChangeSession();

                    return res.status(429).json({
                        success: false,
                        message: "Too many incorrect attempts. Please request a new OTP."
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: "Incorrect OTP."
                });
            }

            case "EMAIL_ALREADY_EXISTS":
                return res.status(409).json({
                    success: false,
                    message: "This email is already registered."
                });

            case "SAME_EMAIL":
                return res.status(400).json({
                    success: false,
                    message: "New email must differ from your current email."
                });

            case "GOOGLE_ACCOUNT_NOT_SUPPORTED":
                return res.status(403).json({
                    success: false,
                    message: "Email change is not available for Google accounts."
                });

            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            default:
                if (error.code === 11000) {
                    return res.status(409).json({
                        success: false,
                        message: "This email is already registered."
                    });
                }

                console.error("Email update error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to update email. Please try again."
                });
        }
    }
};

// load change password page
const loadChangePassword = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        if (user.googleId) {
            return res.redirect("/profile");
        }

        return res.render("user/profile/changePassword", { user });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.redirect("/login");
        }

        console.error("Load change password page error:", error);
        return res.status(500).send("Something went wrong. Please try again.");
    }
};

// load forgot password page
const loadForgotPassword = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        return res.render("user/profile/forgotPassword", {
            email: user.email
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.redirect("/login");
        }

        console.error("Load forgot password page error:", error);
        return res.status(500).send("Something went wrong. Please try again.");
    }
};

// load forgot password verification page
const loadForgotPasswordVerification = async (req, res) => {
    const clearForgotPasswordOtpSession = () => {
        delete req.session.forgotPasswordOtp;
        delete req.session.forgotPasswordOtpExpires;
        delete req.session.forgotPasswordOtpAttempts;
        delete req.session.forgotPasswordOtpSentAt;
    };

    if (
        typeof req.session.forgotPasswordOtp !== "string" ||
        !Number.isFinite(req.session.forgotPasswordOtpExpires) ||
        !Number.isInteger(req.session.forgotPasswordOtpAttempts) ||
        !Number.isFinite(req.session.forgotPasswordOtpSentAt)
    ) {
        clearForgotPasswordOtpSession();

        return res.redirect("/profile/security/forgot-password");
    }

    if (Date.now() >= req.session.forgotPasswordOtpExpires) {
        clearForgotPasswordOtpSession();

        return res.redirect("/profile/security/forgot-password");
    }

    const resendAvailableAt =
        req.session.forgotPasswordOtpSentAt + 60000;

    return res.render("user/profile/forgotPasswordVerification", {
        resendAvailableAt
    });
};

// get registered email
const getRegisteredEmail = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        return res.json({
            success: true,
            email: user.email
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        console.error("Get registered email error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load your email address."
        });
    }
};

// send forgot password otp
const sendForgotPasswordOtp = async (req, res) => {
    try {
        const existingOtp = req.session.forgotPasswordOtp;
        const sentAt = req.session.forgotPasswordOtpSentAt;
        const expiresAt = req.session.forgotPasswordOtpExpires;

        if (
            existingOtp &&
            Number.isFinite(sentAt) &&
            Number.isFinite(expiresAt) &&
            Date.now() < expiresAt
        ) {
            const remaining = checkResendCooldown(sentAt);

            if (remaining > 0) {
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remaining} seconds before requesting another OTP.`,
                    remaining
                });
            }

            return res.status(429).json({
                success: false,
                message: "An OTP has already been issued. Use the resend option to request another.",
                remaining: 0
            });
        }

        // Clear old OTP state before issuing a new OTP.
        delete req.session.forgotPasswordOtp;
        delete req.session.forgotPasswordOtpExpires;
        delete req.session.forgotPasswordOtpAttempts;
        delete req.session.forgotPasswordOtpSentAt;
        delete req.session.passwordResetVerifiedAt;

        const user = await getUserProfileService(req.session.userId);
        const otp = crypto.randomInt(100000, 1000000).toString();
        const sentAtNow = Date.now();

        await sendOtpEmail(user.email, otp);

        req.session.forgotPasswordOtp = otp;
        req.session.forgotPasswordOtpExpires = sentAtNow + OTP_EXPIRY_MS;
        req.session.forgotPasswordOtpAttempts = 0;
        req.session.forgotPasswordOtpSentAt = sentAtNow;

        return res.status(200).json({
            success: true,
            message: "Verification code sent to your registered email."
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        console.error("Forgot password OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to send verification code. Please try again."
        });
    }
};

// verify forgot password otp
const verifyForgotPasswordOtp = async (req, res) => {
    const clearForgotPasswordOtpSession = () => {
        delete req.session.forgotPasswordOtp;
        delete req.session.forgotPasswordOtpExpires;
        delete req.session.forgotPasswordOtpAttempts;
        delete req.session.forgotPasswordOtpSentAt;
    };

    const { otp } = req.body;

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid 6-digit OTP."
        });
    }

    const storedOtp = req.session.forgotPasswordOtp;
    const expiresAt = req.session.forgotPasswordOtpExpires;
    const attempts = req.session.forgotPasswordOtpAttempts;

    if (
        typeof storedOtp !== "string" ||
        !/^\d{6}$/.test(storedOtp) ||
        !Number.isFinite(expiresAt) ||
        !Number.isInteger(attempts) ||
        attempts < 0 ||
        !Number.isFinite(req.session.forgotPasswordOtpSentAt)
    ) {
        clearForgotPasswordOtpSession();

        return res.status(400).json({
            success: false,
            message: "OTP session expired. Please request a new OTP."
        });
    }

    if (Date.now() >= expiresAt) {
        clearForgotPasswordOtpSession();

        return res.status(400).json({
            success: false,
            message: "OTP has expired. Please request a new OTP."
        });
    }

    if (attempts >= MAX_OTP_ATTEMPTS) {
        clearForgotPasswordOtpSession();

        return res.status(429).json({
            success: false,
            message: "Too many incorrect attempts. Please request a new OTP."
        });
    }

    if (otp !== storedOtp) {
        req.session.forgotPasswordOtpAttempts = attempts + 1;

        if (req.session.forgotPasswordOtpAttempts >= MAX_OTP_ATTEMPTS) {
            clearForgotPasswordOtpSession();

            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts. Please request a new OTP."
            });
        }

        return res.status(400).json({
            success: false,
            message: "Incorrect OTP."
        });
    }

    clearForgotPasswordOtpSession();

    // Verification is valid for five minutes only.
  
clearForgotPasswordOtpSession();

// Verification is valid for five minutes only.
req.session.passwordResetVerifiedAt = Date.now();

return req.session.save(error => {
    if (error) {
        console.error("Password reset verification session save error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save verification. Please try again."
        });
    }

    return res.status(200).json({
        success: true,
        message: "OTP verified successfully."
    });
});

};

// resend forgot password otp
const resendForgotPasswordOtp = async (req, res) => {
    try {
        const sentAt = req.session.forgotPasswordOtpSentAt;
        const expiresAt = req.session.forgotPasswordOtpExpires;
        const attempts = req.session.forgotPasswordOtpAttempts;
        const storedOtp = req.session.forgotPasswordOtp;

        if (
            typeof storedOtp !== "string" ||
            !/^\d{6}$/.test(storedOtp) ||
            !Number.isFinite(sentAt) ||
            !Number.isFinite(expiresAt) ||
            !Number.isInteger(attempts) ||
            attempts < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "OTP session expired. Please start again."
            });
        }

        if (Date.now() >= expiresAt) {
            delete req.session.forgotPasswordOtp;
            delete req.session.forgotPasswordOtpExpires;
            delete req.session.forgotPasswordOtpAttempts;
            delete req.session.forgotPasswordOtpSentAt;

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        const remaining = checkResendCooldown(sentAt);

        if (remaining > 0) {
            return res.status(429).json({
                success: false,
                message: `Please wait ${remaining} seconds before requesting another OTP.`,
                remaining
            });
        }

        const user = await getUserProfileService(req.session.userId);
        const otp = crypto.randomInt(100000, 1000000).toString();
        const newSentAt = Date.now();

        await sendOtpEmail(user.email, otp);

        req.session.forgotPasswordOtp = otp;
        req.session.forgotPasswordOtpExpires = newSentAt + OTP_EXPIRY_MS;
        req.session.forgotPasswordOtpAttempts = 0;
        req.session.forgotPasswordOtpSentAt = newSentAt;

        // A newly issued OTP invalidates any previous reset authorization.
        delete req.session.passwordResetVerifiedAt;

        return res.status(200).json({
            success: true,
            message: "A new verification code has been sent to your email address."
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        console.error("Resend forgot password OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to resend verification code. Please try again."
        });
    }
};

// change password using current password
const changePassword = async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        const user = await getUserProfileService(req.session.userId);

        if (user.googleId) {
            return res.status(403).json({
                success: false,
                message: "Password change is not available for Google accounts."
            });
        }

        await changeUserPasswordService(
            req.session.userId,
            currentPassword,
            newPassword,
            confirmPassword
        );

        return res.status(200).json({
            success: true,
            message: "Password changed successfully."
        });
    } catch (error) {
        switch (error.message) {
            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "CURRENT_PASSWORD_REQUIRED":
                return res.status(400).json({
                    success: false,
                    message: "Current password is required."
                });

            case "PASSWORD_REQUIRED":
                return res.status(400).json({
                    success: false,
                    message: "New password is required."
                });

            case "CONFIRM_PASSWORD_REQUIRED":
                return res.status(400).json({
                    success: false,
                    message: "Please confirm your new password."
                });

            case "PASSWORD_MISMATCH":
                return res.status(400).json({
                    success: false,
                    message: "New passwords do not match."
                });

            case "INVALID_PASSWORD":
                return res.status(400).json({
                    success: false,
                    message: "Password must be 8–72 characters and contain uppercase, lowercase, number and special character."
                });

            case "INCORRECT_CURRENT_PASSWORD":
                return res.status(400).json({
                    success: false,
                    message: "Current password is incorrect."
                });

            case "SAME_PASSWORD":
                return res.status(400).json({
                    success: false,
                    message: "New password cannot be the same as your current password."
                });

            default:
                console.error("Change password error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to change password. Please try again."
                });
        }
    }
};

// reset password after OTP verification
const resetPassword = async (req, res) => {
    const verifiedAt = req.session.passwordResetVerifiedAt;
    const verificationWindowMs = 5 * 60 * 1000;

    if (
        !Number.isFinite(verifiedAt) ||
        Date.now() - verifiedAt < 0 ||
        Date.now() - verifiedAt >= verificationWindowMs
    ) {
        delete req.session.passwordResetVerifiedAt;

        return res.status(403).json({
            success: false,
            message: "Password reset verification required. Please verify a new OTP."
        });
    }

    try {
        const { password, confirmPassword } = req.body;

        if (typeof confirmPassword !== "string" || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Please confirm your password."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

    
await resetUserPasswordService(
    req.session.userId,
    password
);

delete req.session.passwordResetVerifiedAt;

return req.session.save(error => {
    if (error) {
        console.error("Reset password session save error:", error);

        return res.status(500).json({
            success: false,
            message: "Password was changed, but the session could not be updated. Please log in again."
        });
    }

    return res.status(200).json({
        success: true,
        message: "Password reset successfully."
    });
});

    } catch (error) {
        switch (error.message) {
            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "PASSWORD_REQUIRED":
                return res.status(400).json({
                    success: false,
                    message: "Password is required."
                });

            case "INVALID_PASSWORD":
                return res.status(400).json({
                    success: false,
                    message: "Password must be 8–72 characters and contain uppercase, lowercase, number and special character."
                });

            default:
                console.error("Reset password error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to reset password. Please try again."
                });
        }
    }
};

// load reset password page
const loadResetPassword = async (req, res) => {
    const verifiedAt = req.session.passwordResetVerifiedAt;
    const verificationWindowMs = 5 * 60 * 1000;

    if (
        !Number.isFinite(verifiedAt) ||
        Date.now() - verifiedAt < 0 ||
        Date.now() - verifiedAt >= verificationWindowMs
    ) {
        delete req.session.passwordResetVerifiedAt;

        return res.redirect("/profile/security/forgot-password");
    }

   return res.render("user/resetPassword", {
    passwordError: null,
    confirmPasswordError: null,
    resetUrl: "/profile/security/reset-password"
});
};

module.exports = {
    loadSecurity,
    loadChangeEmail,
    loadEmailVerification,
    loadChangePassword,
    loadForgotPassword,
    loadForgotPasswordVerification,
    loadResetPassword,
    getRegisteredEmail,
    sendEmailChangeOtpController,
    resendEmailChangeOtp,
    verifyEmailChangeOtp,
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resendForgotPasswordOtp,
    changePassword,
    resetPassword
};