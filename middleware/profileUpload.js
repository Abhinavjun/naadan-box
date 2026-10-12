const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const sharp = require("sharp");

// Allowed image extensions
const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
};


// Storage
const storage = multer.diskStorage({

   destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
},


filename: (req, file, cb) => {
    cb(null, crypto.randomUUID());
}
});


// Image filter
const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("INVALID_IMAGE_TYPE"));
    }

    cb(null, true);
};


// Multer configuration
const profileUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});









const validateProfileImage = async (req, res, next) => {
    const file = req.file;

    // No file was uploaded.
    if (!file) {
        return next();
    }

    try {
        const allowedFormats = {
            jpeg: "jpg",
            png: "png",
            webp: "webp"
        };

        // Read the actual image metadata.
        const metadata = await sharp(file.path, {
            limitInputPixels: 20_000_000
        }).metadata();

        // Reject unsupported image formats.
        if (!metadata.format || !allowedFormats[metadata.format]) {
            throw new Error("INVALID_IMAGE_TYPE");
        }

        // Reject invalid or excessively large dimensions.
        if (
            !Number.isInteger(metadata.width) ||
            !Number.isInteger(metadata.height) ||
            metadata.width < 1 ||
            metadata.height < 1 ||
            metadata.width * metadata.height > 20_000_000
        ) {
            throw new Error("INVALID_IMAGE_DIMENSIONS");
        }

        // Decode the image to detect corrupted image data.
        await sharp(file.path, {
            limitInputPixels: 20_000_000
        }).stats();

        // Add the correct extension based on the real format.
        const extension = allowedFormats[metadata.format];
        const newFilename = `${file.filename}.${extension}`;
        const newPath = path.join(file.destination, newFilename);

        await fs.promises.rename(file.path, newPath);

        // Update the file details used by the controller.
        file.filename = newFilename;
        file.path = newPath;

        return next();

    
    } catch (error) {
        // Remove the uploaded file if validation fails.
        try {
            await fs.promises.unlink(file.path);
        } catch (cleanupError) {
            if (cleanupError.code !== "ENOENT") {
                console.error(
                    "Failed to clean up profile image:",
                    cleanupError.message
                );
            }
        }

        // Preserve our own validation errors.
        if (
            error.message === "INVALID_IMAGE_TYPE" ||
            error.message === "INVALID_IMAGE_DIMENSIONS"
        ) {
            return next(error);
        }

        // Convert other Sharp processing errors to a known error.
        const imageError = new Error("INVALID_IMAGE_CONTENT");
        return next(imageError);
    }

};









profileUpload.validateProfileImage = validateProfileImage;

module.exports = profileUpload;