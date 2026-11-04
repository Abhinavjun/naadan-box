
const {
    getUserProfileService,
    changeUserPasswordService,
    resetPasswordAfterOtpService,
    isPasswordResetVerificationValid
} = require("../services/authService");


const {
    sendEmailChangeOtp,
    resendEmailChangeOtp: resendEmailChangeOtpService,
    verifyEmailChangeOtp: verifyEmailChangeOtpService,
    getEmailChangeOtpStatus,
    clearEmailChangeSession
} = require("../services/emailChangeService");


const {
    getPasswordResetOtpStatus,
    sendPasswordResetOtpService,
    verifyPasswordResetOtp,
    resendPasswordResetOtpService,
    getOtpAttemptsRemaining,
    clearOtpSession
} = require("../services/otpservice");




const loadSecurity = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        return res.render("user/profile/security", { user });

    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.redirect("/login");
        }

        console.error("Load security page error:", error);

        return res.status(500).send(
            "Something went wrong. Please try again."
        );
    }
};




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

        return res.status(500).send(
            "Something went wrong. Please try again."
        );
    }
};




const loadEmailVerification = async (req, res) => {
    try {
        const { resendAvailableAt } =
            getEmailChangeOtpStatus(req.session);

        return res.render("user/profile/emailVerification", {
            resendAvailableAt
        });

    } catch (error) {
        clearEmailChangeSession(req.session);

        return res.redirect("/profile/security/change-email");
    }
};




const sendEmailChangeOtpController = async (req, res) => {
    try {
        await sendEmailChangeOtp(
            req.session.userId,
            req.body.newEmail,
            req.session
        );

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

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
                });

            case "INVALID_OTP_SESSION":
                return res.status(400).json({
                    success: false,
                    message: "OTP session is invalid. Please start again."
                });

            case "RESEND_COOLDOWN":
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${error.remaining} seconds before requesting another OTP.`,
                    remaining: error.remaining
                });

            case "OTP_ALREADY_ISSUED":
                return res.status(429).json({
                    success: false,
                    message: "An OTP has already been issued. Use the resend option.",
                    remaining: 0
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




const resendEmailChangeOtp = async (req, res) => {
    try {
      await resendEmailChangeOtpService(
    req.session.userId,
    req.session
);
        return res.status(200).json({
            success: true,
            message: "A new OTP has been sent to your email address."
        });

    } catch (error) {
        switch (error.message) {
            case "OTP_NOT_FOUND":
            case "OTP_SESSION_EXPIRED":
            case "OTP_EXPIRED":
                clearEmailChangeSession(req.session);

                return res.status(400).json({
                    success: false,
                    message: "OTP has expired. Please request a new OTP."
                });

            case "INVALID_OTP_SESSION":
                clearEmailChangeSession(req.session);

                return res.status(400).json({
                    success: false,
                    message: "OTP session is invalid. Please start again."
                });

            case "RESEND_COOLDOWN":
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${error.remaining} seconds before requesting another OTP.`,
                    remaining: error.remaining
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

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
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



const verifyEmailChangeOtp = async (req, res) => {
    try {
        const user = await verifyEmailChangeOtpService({
            userId: req.session.userId,
            submittedOtp: req.body.otp,
            session: req.session
        });

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
                clearEmailChangeSession(req.session);

                return res.status(400).json({
                    success: false,
                    message: "OTP expired. Please request a new OTP."
                });

            case "OTP_ATTEMPTS_EXCEEDED":
                clearEmailChangeSession(req.session);

                return res.status(429).json({
                    success: false,
                    message: "Too many incorrect attempts. Please request a new OTP."
                });

            case "OTP_INVALID":
                return res.status(400).json({
                    success: false,
                    message: "Incorrect OTP."
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

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
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

        return res.status(500).send(
            "Something went wrong. Please try again."
        );
    }
};




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

        return res.status(500).send(
            "Something went wrong. Please try again."
        );
    }
};




const loadForgotPasswordVerification = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        const { resendAvailableAt } =
            getPasswordResetOtpStatus(user.email, req.session);

        return res.render(
            "user/profile/forgotPasswordVerification",
            { resendAvailableAt }
        );

    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.redirect("/login");
        }

        clearOtpSession("forgot-password", req.session);

        return res.redirect("/profile/security/forgot-password");
    }
};



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



const sendForgotPasswordOtp = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        await sendPasswordResetOtpService(
            user.email,
            req.session
        );

        return res.status(200).json({
            success: true,
            message: "Verification code sent to your registered email."
        });

    } catch (error) {
        switch (error.message) {
            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
                });

            case "RESEND_COOLDOWN":
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${error.remaining} seconds before requesting another OTP.`,
                    remaining: error.remaining
                });

            case "OTP_ALREADY_ISSUED":
                return res.status(429).json({
                    success: false,
                    message: "An OTP has already been issued. Use the resend option.",
                    remaining: 0
                });

            default:
                console.error("Forgot password OTP error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to send verification code. Please try again."
                });
        }
    }
};



const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        const user = await getUserProfileService(req.session.userId);

        await verifyPasswordResetOtp(
            user.email,
            otp,
            req.session
        );

        // Allow password reset for five minutes
        req.session.passwordResetVerifiedAt = Date.now();

        return req.session.save(error => {
            if (error) {
                console.error(
                    "Password reset verification session save error:",
                    error
                );

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

    } catch (error) {
        switch (error.message) {
            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
                });

            case "EMAIL_REQUIRED":
                return res.status(400).json({
                    success: false,
                    message: "Registered email is missing."
                });

            case "OTP_FORMAT_INVALID":
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid 6-digit OTP."
                });

            case "OTP_NOT_FOUND":
            case "OTP_EXPIRED":
                return res.status(400).json({
                    success: false,
                    message: "OTP expired or not found. Please request a new OTP."
                });

            case "OTP_ATTEMPTS_EXCEEDED":
                return res.status(429).json({
                    success: false,
                    message: "Too many incorrect attempts. Please request a new OTP."
                });

            case "OTP_INVALID": {
                const attemptsRemaining = getOtpAttemptsRemaining(
                    "forgot-password",
                    req.session
                );

                return res.status(400).json({
                    success: false,
                    message: `Incorrect OTP. You have ${attemptsRemaining} attempts remaining.`
                });
            }

            default:
                console.error("Verify forgot password OTP error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to verify OTP. Please try again."
                });
        }
    }
};


const resendForgotPasswordOtp = async (req, res) => {
    try {
        const user = await getUserProfileService(req.session.userId);

        await resendPasswordResetOtpService(
            user.email,
            req.session
        );

        return res.status(200).json({
            success: true,
            message: "A new verification code has been sent to your email address."
        });

    } catch (error) {
        switch (error.message) {
            case "USER_NOT_FOUND":
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
                });

            case "OTP_NOT_FOUND":
            case "OTP_SESSION_INVALID":
                return res.status(400).json({
                    success: false,
                    message: "OTP session expired. Please request a new OTP."
                });

            case "OTP_EXPIRED":
                return res.status(400).json({
                    success: false,
                    message: "OTP has expired. Please request a new OTP."
                });

            case "RESEND_COOLDOWN":
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${error.remaining} seconds before requesting another OTP.`,
                    remaining: error.remaining
                });

            default:
                console.error("Resend forgot password OTP error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to resend verification code. Please try again."
                });
        }
    }
};


const changePassword = async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        const user = await getUserProfileService(req.session.userId);

        // Google accounts cannot change password this way
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


const resetPassword = async (req, res) => {
    const verifiedAt = req.session.passwordResetVerifiedAt;

    // Validate password-reset authorization
    if (!isPasswordResetVerificationValid(verifiedAt)) {
        delete req.session.passwordResetVerifiedAt;

        return res.status(403).json({
            success: false,
            message: "Password reset verification required. Please verify a new OTP."
        });
    }

    try {
        const { password, confirmPassword } = req.body;

        if (!confirmPassword) {
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

        await resetPasswordAfterOtpService(
            req.session.userId,
            password,
            verifiedAt
        );

        // Remove password-reset authorization after success
        delete req.session.passwordResetVerifiedAt;

        return req.session.save(error => {
            if (error) {
                console.error("Password reset session save error:", error);

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

            case "USER_BLOCKED":
                return res.status(403).json({
                    success: false,
                    message: "Your account has been blocked."
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



const loadResetPassword = async (req, res) => {
    const verifiedAt = req.session.passwordResetVerifiedAt;

    // Validate password-reset authorization
    if (!isPasswordResetVerificationValid(verifiedAt)) {
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
