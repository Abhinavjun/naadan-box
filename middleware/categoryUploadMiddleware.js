
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/categories");
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const uniqueName =
            `${Date.now()}-${crypto.randomUUID()}${extension}`;

        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    return cb(
        new Error("Only JPG, JPEG, PNG and WEBP images are allowed.")
    );
};

const categoryUpload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
        files: 1,
    },

    fileFilter,
});

module.exports = categoryUpload;
