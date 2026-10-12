const isAdminAuthenticated = (req, res, next) => {
    // Prevent browser caching of protected admin pages
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Check whether the admin session exists
    if (req.session?.adminId) {
        return next();
    }

    console.log("ADMIN SESSION EXPIRED OR MISSING:", {
        path: req.originalUrl,
        method: req.method
    });

    // AJAX / fetch requests receive a response the UI can handle
    const isAjaxRequest =
        req.xhr ||
        req.get("X-Requested-With") === "XMLHttpRequest" ||
        req.get("Accept")?.includes("application/json");

    if (isAjaxRequest) {
        return res.status(401).json({
            success: false,
            code: "ADMIN_SESSION_EXPIRED",
            message: "Your admin session has expired. Please log in again."
        });
    }

    // Normal browser navigation
    return res.redirect("/admin/login");
};

module.exports = { isAdminAuthenticated };