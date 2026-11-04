
const crypto = require("crypto");
const User = require("../models/userModel");
const { sendOtpEmail } = require("./emailService");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;


// NORMALIZE EMAIL
const normalizeEmail = email => {
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("EMAIL_REQUIRED");
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
        normalizedEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)
    ) {
        throw new Error("INVALID_EMAIL");
    }

    return normalizedEmail;
};


// GENERATE OTP
const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};


// CLEAR EMAIL CHANGE SESSION
const clearEmailChangeSession = session => {
    delete session.emailChangeOtp;
    delete session.emailChangeNewEmail;
    delete session.emailChangeOtpExpires;
    delete session.emailChangeOtpAttempts;
    delete session.emailChangeOtpSentAt;
};


// CHECK RESEND COOLDOWN
const checkResendCooldown = sentAt => {
    if (sentAt == null) return 0;

    if (
        !Number.isFinite(sentAt) ||
        sentAt < 0 ||
        sentAt > Date.now()
    ) {
        throw new Error("INVALID_OTP_SESSION");
    }

    const remaining =
        RESEND_COOLDOWN_MS - (Date.now() - sentAt);

    return Math.max(0, Math.ceil(remaining / 1000));
};


// VALIDATE EMAIL CHANGE OTP SESSION
const validateEmailChangeOtpSession = session => {
    const {
        emailChangeOtp,
        emailChangeNewEmail,
        emailChangeOtpExpires,
        emailChangeOtpAttempts,
        emailChangeOtpSentAt
    } = session || {};

    if (
        typeof emailChangeOtp !== "string" ||
        !/^\d{6}$/.test(emailChangeOtp) ||
        typeof emailChangeNewEmail !== "string" ||
        !emailChangeNewEmail.trim() ||
        !Number.isFinite(emailChangeOtpExpires) ||
        !Number.isFinite(emailChangeOtpSentAt) ||
        !Number.isInteger(emailChangeOtpAttempts) ||
        emailChangeOtpAttempts < 0
    ) {
        clearEmailChangeSession(session);
        throw new Error("OTP_SESSION_EXPIRED");
    }

    if (Date.now() >= emailChangeOtpExpires) {
        clearEmailChangeSession(session);
        throw new Error("OTP_EXPIRED");
    }

    if (emailChangeOtpAttempts >= MAX_OTP_ATTEMPTS) {
        clearEmailChangeSession(session);
        throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    return {
        otp: emailChangeOtp,
        email: normalizeEmail(emailChangeNewEmail),
        expiresAt: emailChangeOtpExpires,
        sentAt: emailChangeOtpSentAt,
        attempts: emailChangeOtpAttempts
    };
};


// GET USER FOR EMAIL CHANGE
const getUserForEmailChange = async (userId, newEmail) => {
    if (!userId) {
        throw new Error("USER_NOT_FOUND");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    if (user.googleId) {
        throw new Error("GOOGLE_ACCOUNT_NOT_SUPPORTED");
    }

    const currentEmail =
        typeof user.email === "string"
            ? user.email.trim().toLowerCase()
            : "";

    if (currentEmail === newEmail) {
        throw new Error("SAME_EMAIL");
    }

    const existingUser = await User.findOne({
        email: newEmail,
        _id: { $ne: user._id }
    }).select("_id");

    if (existingUser) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    return user;
};


// CREATE AND STORE EMAIL CHANGE OTP
const createEmailChangeOtp = async (userId, newEmail, session) => {
    if (!session || typeof session !== "object") {
        throw new Error("OTP_SESSION_REQUIRED");
    }

    const email = normalizeEmail(newEmail);

    await getUserForEmailChange(userId, email);

    const otp = generateOtp();

    // Send email before replacing the existing OTP.
    await sendOtpEmail(email, otp);

    const sentAt = Date.now();

    session.emailChangeOtp = otp;
    session.emailChangeNewEmail = email;
    session.emailChangeOtpExpires = sentAt + OTP_EXPIRY_MS;
    session.emailChangeOtpAttempts = 0;
    session.emailChangeOtpSentAt = sentAt;

    return true;
};


// SEND EMAIL CHANGE OTP
const sendEmailChangeOtp = async (userId, newEmail, session) => {
    if (session?.emailChangeOtp) {
        try {
            const record = validateEmailChangeOtpSession(session);

            const remaining = checkResendCooldown(record.sentAt);

            if (remaining > 0) {
                const error = new Error("RESEND_COOLDOWN");
                error.remaining = remaining;
                throw error;
            }

            throw new Error("OTP_ALREADY_ISSUED");

        } catch (error) {
            if (
                error.message === "RESEND_COOLDOWN" ||
                error.message === "OTP_ALREADY_ISSUED"
            ) {
                throw error;
            }

            // Invalid or expired OTP session:
            // clear it and allow a fresh OTP.
        }
    }

    return createEmailChangeOtp(userId, newEmail, session);
};


// RESEND EMAIL CHANGE OTP
const resendEmailChangeOtp = async (userId, session) => {
    const record = validateEmailChangeOtpSession(session);

    const remaining = checkResendCooldown(record.sentAt);

    if (remaining > 0) {
        const error = new Error("RESEND_COOLDOWN");
        error.remaining = remaining;
        throw error;
    }

    return createEmailChangeOtp(userId, record.email, session);
};


// VERIFY EMAIL CHANGE OTP
const verifyEmailChangeOtp = async ({
    userId,
    submittedOtp,
    session
}) => {
    const record = validateEmailChangeOtpSession(session);

    if (
        typeof submittedOtp !== "string" ||
        !/^\d{6}$/.test(submittedOtp)
    ) {
        throw new Error("INVALID_OTP_FORMAT");
    }

    if (submittedOtp !== record.otp) {
        const nextAttempts = record.attempts + 1;

        session.emailChangeOtpAttempts = nextAttempts;

        if (nextAttempts >= MAX_OTP_ATTEMPTS) {
            clearEmailChangeSession(session);
            throw new Error("OTP_ATTEMPTS_EXCEEDED");
        }

        throw new Error("OTP_INVALID");
    }

    const user = await getUserForEmailChange(
        userId,
        record.email
    );

    user.email = record.email;

    await user.save();

    clearEmailChangeSession(session);

    return user;
};


// GET EMAIL CHANGE OTP STATUS
const getEmailChangeOtpStatus = session => {
    const record = validateEmailChangeOtpSession(session);

    return {
        resendAvailableAt: record.sentAt + RESEND_COOLDOWN_MS
    };
};


module.exports = {
    sendEmailChangeOtp,
    resendEmailChangeOtp,
    verifyEmailChangeOtp,
    getEmailChangeOtpStatus,
    validateEmailChangeOtpSession,
    clearEmailChangeSession,
    checkResendCooldown,
    normalizeEmail,
    OTP_EXPIRY_MS,
    MAX_OTP_ATTEMPTS
};
