const crypto = require("crypto");
const User = require("../models/userModel");
const { sendOtpEmail } = require("./emailService");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

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

const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

const getUserForEmailChange = async (userId, newEmail) => {
    if (!userId) {
        throw new Error("USER_NOT_FOUND");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
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

const sendEmailChangeOtp = async (userId, newEmail) => {
    const email = normalizeEmail(newEmail);

    await getUserForEmailChange(userId, email);

    const otp = generateOtp();
    const sentAt = Date.now();

    // Send first. Store the OTP in the session only after delivery succeeds.
    await sendOtpEmail(email, otp);

    return {
        email,
        otp,
        sentAt,
        expiresAt: sentAt + OTP_EXPIRY_MS
    };
};

const verifyEmailChangeOtp = async ({
    userId,
    newEmail,
    submittedOtp,
    storedOtp,
    expiresAt,
    attempts
}) => {
    if (
        typeof submittedOtp !== "string" ||
        !/^\d{6}$/.test(submittedOtp)
    ) {
        throw new Error("INVALID_OTP_FORMAT");
    }

    if (
        typeof storedOtp !== "string" ||
        !/^\d{6}$/.test(storedOtp) ||
        typeof newEmail !== "string" ||
        !newEmail.trim() ||
        !Number.isFinite(expiresAt) ||
        !Number.isInteger(attempts) ||
        attempts < 0
    ) {
        throw new Error("OTP_SESSION_EXPIRED");
    }

    if (Date.now() >= expiresAt) {
        throw new Error("OTP_EXPIRED");
    }

    if (attempts >= MAX_OTP_ATTEMPTS) {
        throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    if (submittedOtp !== storedOtp) {
        throw new Error("OTP_INVALID");
    }

    const email = normalizeEmail(newEmail);
    const user = await getUserForEmailChange(userId, email);

    // The database unique index must also protect against concurrent requests.
    user.email = email;
    await user.save();

    return user;
};

const checkResendCooldown = sentAt => {
    if (sentAt == null) {
        return 0;
    }

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

module.exports = {
    sendEmailChangeOtp,
    verifyEmailChangeOtp,
    checkResendCooldown,
    normalizeEmail,
    OTP_EXPIRY_MS,
    MAX_OTP_ATTEMPTS
};
