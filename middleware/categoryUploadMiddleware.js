const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/categories");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            `${Date.now()}-${crypto.randomUUID()}-${file.originalname
                .replace(/[^a-zA-Z0-9.-]/g, "-")}`;

        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/jpg",
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
    },

    fileFilter,
});

module.exports = categoryUpload;