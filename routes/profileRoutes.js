const express = require("express");
const router = express.Router();

const profileUpload = require("../middleware/profileUpload");

const profileController = require("../controllers/profileController");
const securityController = require("../controllers/securityController");
const addressController = require("../controllers/addressController");

const { isAuthenticated } = require("../middleware/authMiddleware");
const { noCache } = require("../middleware/cacheMiddleware");

// profile
router.get("/", isAuthenticated, noCache, profileController.loadProfile);

router.post("/update", isAuthenticated, profileController.updateProfile);

// profile photo

router.post(
    "/image",
    isAuthenticated, profileUpload.single("profileImage"),
    profileUpload.validateProfileImage,  profileController.uploadProfileImage
);

router.delete(  "/image",isAuthenticated,profileController.deleteProfileImage);

// change email
router.get("/security/change-email",isAuthenticated,noCache,securityController.loadChangeEmail);

router.post( "/email/send-otp",isAuthenticated,securityController.sendEmailChangeOtpController);

router.post("/email/resend-otp",  isAuthenticated,securityController.resendEmailChangeOtp);

router.post("/email/verify-otp", isAuthenticated,securityController.verifyEmailChangeOtp);

// change pass
router.get("/security/change-password",isAuthenticated, noCache,securityController.loadChangePassword);

router.post("/security/change-password", isAuthenticated,securityController.changePassword);

// email verification
router.get("/security/verify-email", isAuthenticated,noCache,securityController.loadEmailVerification);

// forgot current pass
router.get("/security/forgot-password",isAuthenticated, noCache,securityController.loadForgotPassword);

router.get("/security/forgot-password/email", isAuthenticated,securityController.getRegisteredEmail);

router.post("/security/forgot-password/send-otp",isAuthenticated,    securityController.sendForgotPasswordOtp);

router.get("/security/forgot-password/verify",isAuthenticated,noCache,securityController.loadForgotPasswordVerification);

router.post("/security/forgot-password/verify-otp",isAuthenticated,securityController.verifyForgotPasswordOtp);

router.post(
    "/security/forgot-password/resend-otp", isAuthenticated,
    securityController.resendForgotPasswordOtp
);

// reset pass
router.get(
    "/security/reset-password",
    isAuthenticated,noCache,
    securityController.loadResetPassword
);

router.post(
    "/security/reset-password",
    isAuthenticated, securityController.resetPassword
);

// address managment
router.get(
    "/addresses",
    isAuthenticated,
    noCache,addressController.loadAddresses
);

router.get(
    "/address/pincode/:pincode",
    isAuthenticated, addressController.checkPincode
);

router.post( "/address",
    isAuthenticated, addressController.createAddress
);

router.put( "/address/:id", isAuthenticated,  addressController.editAddress
);

router.delete(  "/address/:id",isAuthenticated,  addressController.removeAddress
);

module.exports = router;