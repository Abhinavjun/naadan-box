
const bcrypt = require("bcrypt");
const User = require("../models/userModel");

const {
    generateReferralCode,
    findReferringUser
} = require("./referralService");


// LOGIN USER
const loginUserService = async (email, password) => {

    // EMAIL VALIDATION
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("EMAIL_REQUIRED");
    }

    email = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(email)) {
        throw new Error("INVALID_EMAIL");
    }

    // PASSWORD VALIDATION
    if (typeof password !== "string" || !password) {
        throw new Error("PASSWORD_REQUIRED");
    }
    




    // FIND USER
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("INVALID_CREDENTIALS");
    }

    // BLOCKED USER
    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    // EMAIL VERIFICATION
    if (!user.isVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
    }

    // PASSWORD CHECK
    const passwordMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatch) {
        throw new Error("INVALID_CREDENTIALS");
    }

    return user;
};


// SIGNUP USER
const signupUserService = async ({
    name,
    email,
    password,
    confirmPassword,
    referralCode
}) => {

    // NAME VALIDATION
    if (typeof name !== "string" || !name.trim()) {
        throw new Error("NAME_REQUIRED");
    }

    name = name.trim().replace(/\s+/g, " ");

    if (name.length < 3) {
        throw new Error("NAME_TOO_SHORT");
    }

    if (name.length > 50) {
        throw new Error("NAME_TOO_LONG");
    }

    const namePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!namePattern.test(name)) {
        throw new Error("INVALID_NAME");
    }

    // EMAIL VALIDATION
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("EMAIL_REQUIRED");
    }

    email = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(email)) {
        throw new Error("INVALID_EMAIL");
    }

    // PASSWORD VALIDATION
    if (typeof password !== "string" || !password) {
        throw new Error("PASSWORD_REQUIRED");
    }

    const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

    if (!passwordPattern.test(password)) {
        throw new Error("INVALID_PASSWORD");
    }

    // CONFIRM PASSWORD
    if (password !== confirmPassword) {
        throw new Error("PASSWORD_MISMATCH");
    }

    // CHECK EXISTING USER
    const existingUser = await User.findOne({ email });

    if (existingUser) {

        if (existingUser.isVerified) {
            return {
                status: "EXISTING_VERIFIED_USER"
            };
        }

        return {
            status: "EXISTING_UNVERIFIED_USER",
            user: existingUser
        };
    }

    // REFERRAL CODE
    let referredBy = null;

    if (referralCode) {

        if (typeof referralCode !== "string") {
            throw new Error("INVALID_REFERRAL_CODE");
        }

        referralCode = referralCode.trim();

        const referringUser =
            await findReferringUser(referralCode);

        if (!referringUser) {
            throw new Error("INVALID_REFERRAL_CODE");
        }

        referredBy = referringUser._id;
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // GENERATE REFERRAL CODE
    const newReferralCode = generateReferralCode();

    // CREATE USER
    const newUser = new User({
        name,
        email,
        password: hashedPassword,
        referralCode: newReferralCode,
        referredBy,
        isVerified: false
    });

    try {
        await newUser.save();

    } catch (error) {

        // HANDLE DUPLICATE EMAIL RACE CONDITION
        if (error.code === 11000) {

            const existingUser = await User.findOne({ email });

            if (existingUser) {

                if (existingUser.isVerified) {
                    return {
                        status: "EXISTING_VERIFIED_USER"
                    };
                }

                return {
                    status: "EXISTING_UNVERIFIED_USER",
                    user: existingUser
                };
            }
        }

        throw error;
    }

    return {
        status: "NEW_USER",
        user: newUser
    };
};


// RESET USER PASSWORD
const resetUserPasswordService = async (userId, password) => {

    if (typeof password !== "string" || !password) {
        throw new Error("PASSWORD_REQUIRED");
    }

    const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

    if (!passwordPattern.test(password)) {
        throw new Error("INVALID_PASSWORD");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    // BLOCKED USER
    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    user.password = await bcrypt.hash(password, 10);

    await user.save();

    return user;
};


// RESET USER PASSWORD BY EMAIL
const resetUserPasswordByEmailService = async (
    email,
    password,
    confirmPassword
) => {

    // PASSWORD REQUIRED
    if (typeof password !== "string" || !password) {
        throw new Error("PASSWORD_REQUIRED");
    }

    // PASSWORD VALIDATION
    const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

    if (!passwordPattern.test(password)) {
        throw new Error("INVALID_PASSWORD");
    }

    // CONFIRM PASSWORD VALIDATION
    if (
        typeof confirmPassword !== "string" ||
        !confirmPassword
    ) {
        throw new Error("CONFIRM_PASSWORD_REQUIRED");
    }

    if (password !== confirmPassword) {
        throw new Error("PASSWORD_MISMATCH");
    }

    // EMAIL VALIDATION
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("EMAIL_REQUIRED");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // FIND USER
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    // BLOCKED USER
    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    await user.save();

    return user;
};


// FIND USER FOR PASSWORD RESET
const findUserForPasswordReset = async email => {

    // EMAIL VALIDATION
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("EMAIL_REQUIRED");
    }

    email = email.trim().toLowerCase();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(email)) {
        throw new Error("INVALID_EMAIL");
    }

    // FIND USER
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    // BLOCKED USER
    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    return {
        user,
        email
    };
};


// GET USER PROFILE
const getUserProfileService = async userId => {

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return user;
};


// UPDATE USER PROFILE
const updateUserProfileService = async (userId, profileData) => {

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    user.name = profileData.name;
    user.phone = profileData.phone;
    user.gender = profileData.gender;
    user.dateOfBirth = profileData.dateOfBirth || null;

    await user.save();

    return user;
};


// CHANGE USER PASSWORD
const changeUserPasswordService = async (
    userId,
    currentPassword,
    newPassword,
    confirmPassword
) => {

    if (
        typeof currentPassword !== "string" ||
        !currentPassword
    ) {
        throw new Error("CURRENT_PASSWORD_REQUIRED");
    }

    if (
        typeof newPassword !== "string" ||
        !newPassword
    ) {
        throw new Error("PASSWORD_REQUIRED");
    }

    const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

    if (!passwordPattern.test(newPassword)) {
        throw new Error("INVALID_PASSWORD");
    }

    if (
        typeof confirmPassword !== "string" ||
        !confirmPassword
    ) {
        throw new Error("CONFIRM_PASSWORD_REQUIRED");
    }

    if (newPassword !== confirmPassword) {
        throw new Error("PASSWORD_MISMATCH");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const currentPasswordMatch = await bcrypt.compare(
        currentPassword,
        user.password
    );

    if (!currentPasswordMatch) {
        throw new Error("INCORRECT_CURRENT_PASSWORD");
    }

    const sameAsCurrentPassword = await bcrypt.compare(
        newPassword,
        user.password
    );

    if (sameAsCurrentPassword) {
        throw new Error("SAME_PASSWORD");
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return user;
};


// LOGOUT USER
const logoutUserService = async session => {

    await new Promise((resolve, reject) => {

        session.destroy(error => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });

    });

};


// CHECK ACCOUNT STATUS
const checkAccountStatusService = async userId => {

    const user = await User.findById(userId)
        .select("_id isBlocked");

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (user.isBlocked) {
        throw new Error("USER_BLOCKED");
    }

    return user;
};


// CHECK PASSWORD RESET VERIFICATION
const isPasswordResetVerificationValid = verifiedAt => {

    const PASSWORD_RESET_VERIFICATION_DURATION =
        5 * 60 * 1000;

    return (
        Number.isFinite(verifiedAt) &&
        verifiedAt <= Date.now() &&
        Date.now() - verifiedAt < PASSWORD_RESET_VERIFICATION_DURATION
    );
};


// RESET PASSWORD AFTER OTP VERIFICATION
const resetPasswordAfterOtpService = async (
    userId,
    password,
    verifiedAt
) => {

    // CHECK OTP VERIFICATION
    if (!isPasswordResetVerificationValid(verifiedAt)) {
        throw new Error("PASSWORD_RESET_VERIFICATION_INVALID");
    }

    // RESET PASSWORD
    const user = await resetUserPasswordService(
        userId,
        password
    );

    return user;
};


module.exports = {
    loginUserService,
    signupUserService,
    resetUserPasswordService,
    resetUserPasswordByEmailService,
    resetPasswordAfterOtpService,
    findUserForPasswordReset,
    getUserProfileService,
    updateUserProfileService,
    changeUserPasswordService,
    logoutUserService,
    isPasswordResetVerificationValid,
    checkAccountStatusService
};
