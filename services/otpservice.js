
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

const getResendRemaining = async (email, purpose = "signup", session) => {
    normalizeEmail(email);

    if (!session || typeof session !== "object") {
        return 0;
    }

    const otpSession = session.otpData?.[purpose];

    if (!otpSession || !Number.isFinite(otpSession.sentAt)) {
        return 0;
    }

    const remaining =
        RESEND_COOLDOWN_MS - (Date.now() - otpSession.sentAt);

    return Math.max(0, Math.ceil(remaining / 1000));
};

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
        const elapsed = Date.now() - existing.sentAt;

        if (elapsed < RESEND_COOLDOWN_MS) {
            throw new Error("RESEND_COOLDOWN");
        }
    }

    const otp = generateOtp();
    const now = Date.now();

    // Send first so a mail failure does not replace a working OTP.
    await sendOtpEmail(normalizedEmail, otp);

    if (!session.otpData) {
        session.otpData = {};
    }

    session.otpData[purpose] = {
        email: normalizedEmail,
        otp,
        expiresAt: now + OTP_EXPIRY_MS,
        sentAt: Date.now(),
        attempts: 0
    };

    // Keep this log for development.
    console.log(`OTP generated for ${purpose}:`, otp);

    return true;
};

const createPasswordResetOtp = async (email, session) => {
    return createOtp(email, "forgot-password", session);
};

const verifyOtp = async (email, otp, purpose, session) => {
    const normalizedEmail = normalizeEmail(email);

    if (!session || typeof session !== "object") {
        throw new Error("OTP_SESSION_REQUIRED");
    }

    const record = session.otpData?.[purpose];

    if (!record || record.email !== normalizedEmail) {
        throw new Error("OTP_NOT_FOUND");
    }

    if (
        !Number.isFinite(record.expiresAt) ||
        Date.now() >= record.expiresAt
    ) {
        delete session.otpData[purpose];
        throw new Error("OTP_EXPIRED");
    }

    if (
        !Number.isInteger(record.attempts) ||
        record.attempts < 0 ||
        record.attempts >= MAX_OTP_ATTEMPTS
    ) {
        delete session.otpData[purpose];
        throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
        throw new Error("OTP_INVALID");
    }

    if (otp !== record.otp) {
        record.attempts += 1;

        if (record.attempts >= MAX_OTP_ATTEMPTS) {
            delete session.otpData[purpose];
            throw new Error("OTP_ATTEMPTS_EXCEEDED");
        }

        throw new Error("OTP_INVALID");
    }

    return record;
};

const verifyOtpService = async (email, otp, session) => {
    const record = await verifyOtp(email, otp, "signup", session);

    const user = await User.findOne({
        email: normalizeEmail(email)
    });

    if (!user) {
        delete session.otpData.signup;
        throw new Error("USER_NOT_FOUND");
    }

    if (user.isVerified) {
        delete session.otpData.signup;
        throw new Error("ALREADY_VERIFIED");
    }

    user.isVerified = true;
    await user.save();

    delete session.otpData.signup;

    return user;
};

const verifyPasswordResetOtp = async (email, otp, session) => {
    await verifyOtp(email, otp, "forgot-password", session);

    delete session.otpData["forgot-password"];

    return true;
};

const invalidateOtp = async (email, purpose, session) => {
    const normalizedEmail = normalizeEmail(email);

    if (!session?.otpData?.[purpose]) {
        return;
    }

    if (session.otpData[purpose].email === normalizedEmail) {
        delete session.otpData[purpose];
    }
};

const resendOtpService = async (email, purpose = "signup", session) => {
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
        email: normalizedEmail
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (purpose === "signup" && user.isVerified) {
        throw new Error("ALREADY_VERIFIED");
    }

    await createOtp(normalizedEmail, purpose, session);

    return true;
};

module.exports = {
    generateOtp,
    getOtpExpiry,
    getResendRemaining,
    createOtp,
    createPasswordResetOtp,
    verifyOtpService,
    verifyPasswordResetOtp,
    resendOtpService,
    invalidateOtp,
    MAX_OTP_ATTEMPTS,
    OTP_EXPIRY_MS,
    RESEND_COOLDOWN_MS
};
