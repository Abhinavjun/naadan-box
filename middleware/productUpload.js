
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Store uploads in a fixed directory inside the project.
const uploadDirectory = path.join(__dirname, "..", "uploads", "products");

// Allow the directory to be created automatically.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(uploadDirectory, { recursive: true }, (err) => {
            if (err) return cb(err);
            cb(null, uploadDirectory);
        });
    },

    // Never use the original filename supplied by the user.
    filename: (req, file, cb) => {
        cb(null, crypto.randomUUID());
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB per image
        files: 6,
    },
});

// Validate the actual contents of uploaded files.
const validateImages = async (req, res, next) => {
    const files = req.files || [];

    try {
        const allowedFormats = {
            jpeg: "jpg",
            png: "png",
            webp: "webp",
        };

        for (const file of files) {
            // Check the real image format, not the browser's MIME type.

            
            const metadata = await sharp(file.path, {
                limitInputPixels: 20_000_000,
            }).metadata();

            if (!metadata.format || !allowedFormats[metadata.format]) {
                throw new Error(
                    "Only JPEG, PNG and WebP images are allowed."
                );
            }

            // Reject images with missing or excessive dimensions.
            if (
                !Number.isInteger(metadata.width) ||
                !Number.isInteger(metadata.height) ||
                metadata.width < 1 ||
                metadata.height < 1 ||
                metadata.width * metadata.height > 20_000_000
            ) {
                throw new Error("Image dimensions are invalid or too large.");
            }

            // Force Sharp to decode the image to detect corrupted image data.
            await sharp(file.path, {
                limitInputPixels: 20_000_000,
            }).stats();

            // Give the file a trusted extension based on its real format.
            const extension = allowedFormats[metadata.format];
            const newFilename = `${file.filename}.${extension}`;
            const newPath = path.join(file.destination, newFilename);

            await fs.promises.rename(file.path, newPath);

            // Keep these values updated for the controller.
            file.filename = newFilename;
            file.path = newPath;
        }

        return next();
    } catch (error) {
        // Remove files uploaded in this request if validation fails.
        await Promise.all(
            files.map(async (file) => {
                try {
                    await fs.promises.unlink(file.path);
                } catch (cleanupError) {
                    if (cleanupError.code !== "ENOENT") {
                        console.error(
                            "Failed to clean up uploaded file:",
                            cleanupError.message
                        );
                    }
                }
            })
        );

        return next(error);
    }
};

// Keep the existing Multer API and expose the validation middleware.
upload.validateImages = validateImages;

module.exports = upload;
