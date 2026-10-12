const express = require("express");



const {
    loadAdminLogin,
    adminLogin,
    adminLogout,
    loadAdminDashboard,
    loadUsers,
    updateUserBlockStatus,
    loadCustomerDetails,
    exportCustomers,
    loadCategories,
    loadAddCategory,
    loadCategoryDetails,
    loadEditCategory
} = require("../controllers/adminController");





const {
    isAdminAuthenticated
} = require("../middleware/adminMiddleware");

// # ROUTER
const router = express.Router();



 
// # CHECK ADMIN SESSION STATUS
router.get("/session-status", (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    if (req.session?.adminId) {
        return res.status(200).json({
            authenticated: true
        });
    }

    return res.status(401).json({
        authenticated: false,
        code: "ADMIN_SESSION_EXPIRED"
    });
});


// # ADMIN DASHBOARD
router.get("/dashboard", isAdminAuthenticated, loadAdminDashboard);



// # EXPORT CUSTOMERS
router.get("/customers/export", isAdminAuthenticated, exportCustomers);


// # UPDATE CUSTOMER BLOCK STATUS
router.patch("/customers/:userId/block-status", isAdminAuthenticated,updateUserBlockStatus);

// # ADMIN USERS / CUSTOMERS
router.get("/customers", isAdminAuthenticated, loadUsers);

// # ADMIN LOGIN PAGE
router.get("/login", loadAdminLogin);

// # VIEW CUSTOMER
router.get("/customers/:userId", isAdminAuthenticated, loadCustomerDetails);

router.get(  "/categories",isAdminAuthenticated,loadCategories);

router.get(  "/categories/add", isAdminAuthenticated, loadAddCategory
);

router.get(  "/categories/:categoryId/edit",isAdminAuthenticated,   loadEditCategory);

router.get( "/categories/:categoryId",isAdminAuthenticated,loadCategoryDetails
);

// # ADMIN LOGIN
router.post("/login", adminLogin);

// # ADMIN LOGOUT
router.get("/logout", adminLogout);

// # EXPORT ROUTER
module.exports = router;