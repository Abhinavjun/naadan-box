
const User = require("../models/userModel");


const fs = require("fs");
const path = require("path");


// GET USER PROFILE
const getUserProfileService = async userId => {
    const user = await User.findById(userId).select("-password");

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return user;
};

// UPDATE USER PROFILE
const updateUserProfileService = async (userId, profileData) => {

    // 1. NAME VALIDATION
    const name = profileData.name;

    if (
        typeof name !== "string" ||
        name.trim().length < 3 ||
        name.trim().length > 50 ||
        !/^[\p{L}\p{M} '-]+$/u.test(name.trim())
    ) {
        throw new Error("INVALID_PROFILE_NAME");
    }

    // 2. PHONE VALIDATION
    const phone = profileData.phone;

    if (phone !== null && phone !== undefined && phone !== "") {
        if (
            typeof phone !== "string" ||
            !/^\d{10}$/.test(phone.trim())
        ) {
            throw new Error("INVALID_PHONE");
        }
    }

    // 3. GENDER VALIDATION
    const gender = profileData.gender;

    if (gender !== null && gender !== undefined && gender !== "") {
        if (
            typeof gender !== "string" ||
            !["Male", "Female", "Other"].includes(gender)
        ) {
            throw new Error("INVALID_GENDER");
        }
    }

    // 4. DATE OF BIRTH VALIDATION
    const dateOfBirth = profileData.dateOfBirth;

    if (dateOfBirth !== null && dateOfBirth !== undefined && dateOfBirth !== "") {

        if (
            typeof dateOfBirth !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
        ) {
            throw new Error("INVALID_DATE_OF_BIRTH");
        }

        const dob = new Date(dateOfBirth);
        const [year, month, day] = dateOfBirth.split("-").map(Number);

        // Reject invalid dates and impossible calendar dates.
        if (
            isNaN(dob.getTime()) ||
            dob.getFullYear() !== year ||
            dob.getMonth() + 1 !== month ||
            dob.getDate() !== day
        ) {
            throw new Error("INVALID_DATE_OF_BIRTH");
        }

        const today = new Date();

        // Reject future dates.
        if (dob > today) {
            throw new Error("INVALID_DATE_OF_BIRTH");
        }

        // Calculate the user's age.
        let age = today.getFullYear() - year;

        if (
            today.getMonth() + 1 < month ||
            (
                today.getMonth() + 1 === month &&
                today.getDate() < day
            )
        ) {
            age--;
        }

        // Reject users aged 120 or older.
        if (age >= 120) {
            throw new Error("INVALID_DATE_OF_BIRTH");
        }
    }

    // 5. FIND USER
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    // 6. UPDATE PROFILE FIELDS
    user.name = name.trim().replace(/\s+/g, " ");
    user.phone = phone ? phone.trim() : null;
    user.gender = gender || null;
    user.dateOfBirth = dateOfBirth || null;

    // 7. SAVE UPDATED PROFILE
 
    try {
        await user.save();
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.phone) {
            throw new Error("PHONE_ALREADY_EXISTS");
        }

        throw error;
    }

    return user;

};




const updateUserProfileImageService = async (userId, file) => {
    if (!file || !file.filename || !file.path) {
        throw new Error("INVALID_PROFILE_IMAGE");
    }

    const user = await User.findById(userId);

    if (!user) {
        // Remove the newly uploaded file if the user no longer exists.
        try {
            await fs.promises.unlink(file.path);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Uploaded image cleanup failed:", error.message);
            }
        }

        throw new Error("USER_NOT_FOUND");
    }

    const oldImage = user.profileImage;

    try {
        // Save the new image reference first.
        user.profileImage = file.filename;
        await user.save();
    } catch (error) {
        // If saving fails, remove the new upload.
        try {
            await fs.promises.unlink(file.path);
        } catch (cleanupError) {
            if (cleanupError.code !== "ENOENT") {
                console.error("Uploaded image cleanup failed:", cleanupError.message);
            }
        }

        throw error;
    }

    // Delete the old local image only after the database update succeeds.
 const isLocalImage =
    typeof oldImage === "string" &&
    /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(oldImage);

    if (isLocalImage) {
        const oldImagePath = path.join(process.cwd(), "uploads", oldImage);

        try {
            await fs.promises.unlink(oldImagePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                // Keep the successful upload even if old-file cleanup fails.
                console.error("Old profile image cleanup failed:", error.message);
            }
        }
    }

    return {
        profileImage: user.profileImage
    };
};


const deleteUserProfileImageService = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (
        !user.profileImage ||
        user.profileImage === "default-profile.png"
    ) {
        throw new Error("NO_CUSTOM_PROFILE_IMAGE");
    }

    const oldImage = user.profileImage;

    // Restore the Google image or default image.
    const newImage =
        user.googleId && user.googleProfileImage
            ? user.googleProfileImage
            : "default-profile.png";

    // Update the database first.
    user.profileImage = newImage;
    await user.save();

    // Delete the old file only if it is a local image.
const isLocalImage =
    typeof oldImage === "string" &&
    /^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(oldImage);

    if (isLocalImage) {
        const imagePath = path.join(
            process.cwd(),
            "uploads",
            oldImage
        );

        try {
            await fs.promises.unlink(imagePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error(
                    "Old profile image cleanup failed:",
                    error.message
                );
            }
        }
    }

    return {
        profileImage: user.profileImage
    };
};



// EXPORT SERVICES
module.exports = {
    getUserProfileService,
    updateUserProfileService,
    updateUserProfileImageService,
    deleteUserProfileImageService
};
