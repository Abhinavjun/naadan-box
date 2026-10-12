
const express = require("express");

const router = express.Router();

const productController = require("../controllers/productController");
const productUpload = require("../middleware/productUpload");

const {
    isAdminAuthenticated
} = require("../middleware/adminMiddleware");

// CREATE PRODUCT
router.post(
    "/",
    isAdminAuthenticated,
    productUpload.array("images", 6),
    productController.createProduct
);

// GET PRODUCTS
router.get(
    "/",
    isAdminAuthenticated,
    productController.getProducts
);

// GET PRODUCT BY ID
router.get(
    "/:productId",
    isAdminAuthenticated,
    productController.getProductById
);

module.exports = router;
