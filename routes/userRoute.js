const express = require("express");
const passport = require("../config/passport");
const router = express.Router();

const userController = require("../controllers/userController");

const { isGuest } = require("../middleware/guestMiddleware");
const { isAuthenticated } = require("../middleware/authMiddleware");
const { noCache } = require("../middleware/cacheMiddleware");

//  home
router.get("/", isAuthenticated, noCache, userController.loadHome);

// sign
router.get("/signup", isGuest, noCache, userController.loadSignup);
router.post("/signup", isGuest, userController.signup);

//  signup otp
router.get("/verify-otp", isGuest, noCache, userController.loadVerifyOtp);
router.post("/verify-otp", isGuest, userController.verifyOtp);
router.post("/resend-otp", isGuest, userController.resendOtp);

//  log
router.get("/login", isGuest, noCache, userController.loadLogin);
router.post("/login", isGuest, userController.login);

//  forgot pass
router.get("/forgot-password", isGuest, noCache, userController.loadForgotPassword);
router.post("/forgot-password", isGuest, userController.forgotPassword);

//  forgot pass ot
router.get("/forgot-password/verify-otp", isGuest, noCache, userController.loadForgotPasswordOtp);
router.post("/forgot-password/verify-otp", isGuest, userController.verifyForgotPasswordOtp);
router.post("/forgot-password/resend-otp", isGuest, userController.resendForgotPasswordOtp);

// reset pass
router.get("/forgot-password/reset-password", isGuest, noCache, userController.loadResetPassword);
router.post("/forgot-password/reset-password", isGuest, userController.resetPassword);

//  acc status
router.get(
    "/account-status",
    isAuthenticated,
    userController.checkAccountStatus
);
// LOGOUT
router.post("/logout", userController.logout);

//  google log
router.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));

//  Googlecallback
router.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        session: false
    }),
    (req, res) => {
        req.session.regenerate(error => {
            if (error) {
                console.error("Google session regeneration error:", error);
                return res.redirect("/login");
            }

            req.session.userId = req.user._id.toString();
            req.session.user = {
                id: req.user._id.toString(),
                name: req.user.name,
                email: req.user.email
            };

            console.log("Google user logged in:", req.user.email);
            return res.redirect("/");
        });
    }
);

// # EXPORT ROUTER
module.exports = router;