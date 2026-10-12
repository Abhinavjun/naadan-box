const User = require("../models/userModel");

// # code generation
const generateReferralCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    return "NAADAN" + randomCode;
};

// finds the refering user

const findReferringUser = async referralCode => {
    if (
        typeof referralCode !== "string" ||
        !referralCode.trim()
    ) {
        throw new Error("INVALID_REFERRAL_CODE");
    }

    const code = referralCode.trim().toUpperCase();

    const referringUser = await User.findOne({
        referralCode: code
    });

    if (!referringUser || referringUser.isBlocked) {
        throw new Error("INVALID_REFERRAL_CODE");
    }

    return referringUser;
};


module.exports = {
    generateReferralCode,
    findReferringUser
};