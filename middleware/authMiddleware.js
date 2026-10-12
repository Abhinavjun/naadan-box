const User = require("../models/userModel");

const isAuthenticated = async (req, res, next) => {
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (!req.session || !req.session.userId) {
        return res.redirect("/login");
    }

    try {
        const user = await User.findById(req.session.userId)
            .select("_id isBlocked");

        // User not found
        if (!user) {
            return req.session.destroy(() => {
                res.clearCookie("naadan_user_sid");
                return res.redirect("/login");
            });
        }

        // User blocked
        if (user.isBlocked) {
            return req.session.destroy(() => {
                res.clearCookie("naadan_user_sid");

                const isFetchRequest =
                    req.xhr ||
                    req.headers.accept?.includes("application/json") ||
                    req.headers["content-type"]?.includes("application/json");

                if (isFetchRequest) {
                    return res.status(403).json({
                        success: false,
                        code: "USER_BLOCKED",
                        message:
                            "Your account has been blocked by the administrator."
                    });
                }

                return res.redirect("/login?blocked=true");
            });
        }

        return next();

    } catch (error) {
        console.error("Authentication check error:", error);

        return res.status(500).send(
            "Something went wrong. Please try again."
        );
    }
};

module.exports = {
    isAuthenticated
};