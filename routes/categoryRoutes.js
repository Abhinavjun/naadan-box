const express = require("express");
const categoryController = require("../controllers/categoryController");

const {
    isAdminAuthenticated
} = require("../middleware/adminMiddleware");
const categoryUpload = require("../middleware/categoryUploadMiddleware");


const router = express.Router();


// CREATE CATEGORY

router.post(  "/", isAdminAuthenticated,categoryUpload.single("image"), categoryController.createCategory
);

// GET CATEGORIES

router.get(  "/", isAdminAuthenticated,categoryController.getCategories
);


// GET CATEGORY BY ID

router.get( "/:categoryId", isAdminAuthenticated, categoryController.getCategoryById
);


// UPDATE CATEGORY

router.put( "/:categoryId",isAdminAuthenticated,categoryUpload.single("image"), categoryController.updateCategory
);


// DEACTIVATE CATEGORY

router.patch("/:categoryId/deactivate",isAdminAuthenticated,categoryController.deactivateCategory);


// RESTORE CATEGORY

router.patch(  "/:categoryId/restore",isAdminAuthenticated,categoryController.restoreCategory);

module.exports = router;