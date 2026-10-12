
const multer = require("multer");

const errorHandler = (err, req, res, next) => {

    // If a response has already started, let Express handle the error.
    if (res.headersSent) {
        return next(err);
    }

    // Default response for unexpected errors.
    let statusCode = 500;
    let message = "Something went wrong. Please try again.";

    // Multer: uploaded file is too large.
    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {
            statusCode = 400;
            message = "Image size must not exceed 2 MB.";
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
            statusCode = 400;
            message = "Unexpected upload field.";
        } else {
            statusCode = 400;
            message = "Unable to process the uploaded file.";
        }

    // Unsupported image format.
    } else if (err.message === "INVALID_IMAGE_TYPE") {
        statusCode = 400;
        message = "Only JPG, JPEG, PNG and WebP images are allowed.";

    // Invalid or excessively large image dimensions.
    } else if (err.message === "INVALID_IMAGE_DIMENSIONS") {
        statusCode = 400;
        message = "Image dimensions are invalid or too large.";

    // Invalid or corrupted image data.
    }


else if (err.message === "INVALID_IMAGE_CONTENT") {
    statusCode = 400;
    message = "The uploaded image is invalid or corrupted.";
}



    else if (
        err.message === "Input file contains unsupported image format" ||
        err.message === "Input buffer contains unsupported image format"
    ) {
        statusCode = 400;
        message = "The uploaded image is invalid or corrupted.";
    }

    // Log unexpected errors for debugging.
    if (statusCode === 500) {
        console.error("Unexpected application error:", err);
    } else {
        console.warn("Request error:", err.message);
    }

    // Return JSON for API and profile AJAX requests.
    if (
        req.originalUrl.startsWith("/api/") ||
        req.originalUrl.startsWith("/profile/")
    ) {
        return res.status(statusCode).json({
            success: false,
            message
        });
    }

    // Return a simple message for normal browser requests.
    return res.status(statusCode).send(message);
};

module.exports = errorHandler;
