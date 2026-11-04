
const crypto = require("crypto");
const User = require("../models/userModel");
const { sendOtpEmail } = require("./emailService");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;


const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};



const normalizeEmail = email => {
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("EMAIL_REQUIRED");
    }

    return email.trim().toLowerCase();
};



const getOtpExpiry = () => {
    return Date.now() + OTP_EXPIRY_MS;
};


// CLEAR OTP SESSION
const clearOtpSession = (purpose, session) => {
    if (session?.otpData?.[purpose]) {
        delete session.otpData[purpose];
    }
};


// VALIDATE OTP SESSION
const validateOtpSession = (email, purpose, session) => {
    const normalizedEmail = normalizeEmail(email);

    const record = session?.otpData?.[purpose];

    if (!record) {
        throw new Error("OTP_NOT_FOUND");
    }

    if (
        record.email !== normalizedEmail ||
        typeof record.otp !== "string" ||
        !/^\d{6}$/.test(record.otp) ||
        !Number.isFinite(record.expiresAt) ||
        !Number.isFinite(record.sentAt) ||
        !Number.isInteger(record.attempts) ||
        record.attempts < 0
    ) {
        clearOtpSession(purpose, session);
        throw new Error("OTP_SESSION_INVALID");
    }

    if (Date.now() >= record.expiresAt) {
        clearOtpSession(purpose, session);
        throw new Error("OTP_EXPIRED");
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
        clearOtpSession(purpose, session);
        throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    return record;
};


// GET REMAINING RESEND TIME
const getResendRemaining = async (email, purpose = "signup", session) => {
    normalizeEmail(email);

    const record = session?.otpData?.[purpose];

    if (!record || !Number.isFinite(record.sentAt)) {
        return 0;
    }

    const remaining =
        RESEND_COOLDOWN_MS - (Date.now() - record.sentAt);

    return Math.max(0, Math.ceil(remaining / 1000));
};


// GET REMAINING OTP ATTEMPTS
const getOtpAttemptsRemaining = (purpose, session) => {
    const attempts = session?.otpData?.[purpose]?.attempts ?? 0;

    return Math.max(0, MAX_OTP_ATTEMPTS - attempts);
};


// GET PASSWORD RESET OTP STATUS
const getPasswordResetOtpStatus = (email, session) => {
    const record = validateOtpSession(
        email,
        "forgot-password",
        session
    );

    const remaining = Math.max(
        0,
        Math.ceil(
            (RESEND_COOLDOWN_MS - (Date.now() - record.sentAt)) / 1000
        )
    );

    return {
        exists: true,
        remaining,
        resendAvailableAt: record.sentAt + RESEND_COOLDOWN_MS,
        attemptsRemaining: MAX_OTP_ATTEMPTS - record.attempts
    };
};


// CREATE OTP
const createOtp = async (email, purpose = "signup", session) => {
    const normalizedEmail = normalizeEmail(email);

    if (!session || typeof session !== "object") {
        throw new Error("OTP_SESSION_REQUIRED");
    }

    const allowedPurposes = ["signup", "forgot-password"];

    if (!allowedPurposes.includes(purpose)) {
        throw new Error("INVALID_OTP_PURPOSE");
    }

    const existing = session.otpData?.[purpose];

    if (existing && Number.isFinite(existing.sentAt)) {
        const remaining = Math.max(
            0,
            Math.ceil(
                (RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000
            )
        );

        if (remaining > 0) {
            const error = new Error("RESEND_COOLDOWN");
            error.remaining = remaining;
            throw error;
        }
    }

    const otp = generateOtp();

    // Send first so a mail failure does not replace a working OTP.
    await sendOtpEmail(normalizedEmail, otp);

    const sentAt = Date.now();

    if (!session.otpData) {
        session.otpData = {};
    }

    session.otpData[purpose] = {
        email: normalizedEmail,
        otp,
        expiresAt: sentAt + OTP_EXPIRY_MS,
        sentAt,
        attempts: 0
    };

    return true;
};


// CREATE PASSWORD RESET OTP
const createPasswordResetOtp = async (email, session) => {
    const normalizedEmail = normalizeEmail(email);

    const existing = session?.otpData?.["forgot-password"];

    if (existing) {
        try {
            const record = validateOtpSession(
                normalizedEmail,
                "forgot-password",
                session
            );

            const remaining = Math.max(
                0,
                Math.ceil(
                    (RESEND_COOLDOWN_MS - (Date.now() - record.sentAt)) / 1000
                )
            );

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

            // Invalid or expired OTP:
            // validation has already cleared the session.
        }
    }

    return createOtp(normalizedEmail, "forgot-password", session);
};


// VERIFY OTP
const verifyOtp = async (email, otp, purpose, session) => {
    const normalizedEmail = normalizeEmail(email);

    if (!session || typeof session !== "object") {
        throw new Error("OTP_SESSION_REQUIRED");
    }

    const record = validateOtpSession(
        normalizedEmail,
        purpose,
        session
    );

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
        throw new Error("OTP_FORMAT_INVALID");
    }

    if (otp !== record.otp) {
        record.attempts += 1;

        if (record.attempts >= MAX_OTP_ATTEMPTS) {
            clearOtpSession(purpose, session);
            throw new Error("OTP_ATTEMPTS_EXCEEDED");
        }

        throw new Error("OTP_INVALID");
    }

    return record;
};


// VERIFY SIGNUP OTP
const verifyOtpService = async (email, otp, session) => {
    await verifyOtp(email, otp, "signup", session);

    const user = await User.findOne({
        email: normalizeEmail(email)
    });

    if (!user) {
        clearOtpSession("signup", session);
        throw new Error("USER_NOT_FOUND");
    }

    if (user.isVerified) {
        clearOtpSession("signup", session);
        throw new Error("ALREADY_VERIFIED");
    }

    user.isVerified = true;

    await user.save();

    clearOtpSession("signup", session);

    return user;
};


// VERIFY PASSWORD RESET OTP
const verifyPasswordResetOtp = async (email, otp, session) => {
    await verifyOtp(
        email,
        otp,
        "forgot-password",
        session
    );

    clearOtpSession("forgot-password", session);

    return true;
};


// INVALIDATE OTP
const invalidateOtp = async (email, purpose, session) => {
    const normalizedEmail = normalizeEmail(email);

    const record = session?.otpData?.[purpose];

    if (record?.email === normalizedEmail) {
        clearOtpSession(purpose, session);
    }
};


// RESEND OTP
const resendOtpService = async (email, purpose = "signup", session) => {
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
        email: normalizedEmail
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    if (purpose === "signup" && user.isVerified) {
        throw new Error("ALREADY_VERIFIED");
    }

    if (purpose === "forgot-password") {
        const record = validateOtpSession(
            normalizedEmail,
            purpose,
            session
        );

        const remaining = Math.max(
            0,
            Math.ceil(
                (RESEND_COOLDOWN_MS - (Date.now() - record.sentAt)) / 1000
            )
        );

        if (remaining > 0) {
            const error = new Error("RESEND_COOLDOWN");
            error.remaining = remaining;
            throw error;
        }
    }

    await createOtp(normalizedEmail, purpose, session);

    return true;
};


// SEND PASSWORD RESET OTP
const sendPasswordResetOtpService = async (email, session) => {
    const normalizedEmail = normalizeEmail(email);

    const existing = session?.otpData?.["forgot-password"];

    if (existing) {
        try {
            const record = validateOtpSession(
                normalizedEmail,
                "forgot-password",
                session
            );

            const remaining = Math.max(
                0,
                Math.ceil(
                    (RESEND_COOLDOWN_MS - (Date.now() - record.sentAt)) / 1000
                )
            );

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

            // Invalid or expired OTP:
            // validateOtpSession has already cleared it.
        }
    }

    delete session.passwordResetVerifiedAt;

    await createPasswordResetOtp(normalizedEmail, session);

    return true;
};


// RESEND PASSWORD RESET OTP
const resendPasswordResetOtpService = async (email, session) => {
    const normalizedEmail = normalizeEmail(email);

    const record = validateOtpSession(
        normalizedEmail,
        "forgot-password",
        session
    );

    const remaining = Math.max(
        0,
        Math.ceil(
            (RESEND_COOLDOWN_MS - (Date.now() - record.sentAt)) / 1000
        )
    );

    if (remaining > 0) {
        const error = new Error("RESEND_COOLDOWN");
        error.remaining = remaining;
        throw error;
    }

    await resendOtpService(
        normalizedEmail,
        "forgot-password",
        session
    );

    delete session.passwordResetVerifiedAt;

    return true;
};



module.exports = {
    generateOtp,
    getOtpExpiry,
    getResendRemaining,
    getOtpAttemptsRemaining,
    getPasswordResetOtpStatus,
    validateOtpSession,
    clearOtpSession,
    createOtp,
    createPasswordResetOtp,
    sendPasswordResetOtpService,
    resendPasswordResetOtpService,
    verifyOtpService,
    verifyPasswordResetOtp,
    resendOtpService,
    invalidateOtp,
    MAX_OTP_ATTEMPTS,
    OTP_EXPIRY_MS,
    RESEND_COOLDOWN_MS
};
