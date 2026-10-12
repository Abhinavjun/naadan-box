// # GUEST AUTHENTICATION
const isGuest = (req, res, next) => {
    // # PREVENT BROWSER CACHE
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // # CHECK USER SESSION
    if (req.session && req.session.userId) {
        return res.redirect("/");
    }

    return next();
};

// # EXPORT MIDDLEWARE
module.exports = {
    isGuest
};