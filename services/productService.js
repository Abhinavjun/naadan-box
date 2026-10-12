
const mongoose = require("mongoose");

const Product = require("../models/productModel");
const Category = require("../models/categoryModel");

// CREATE PRODUCT
const createProductService = async ({
    categoryId,
    name,
    description,
    ingredients,
    preparationMethod,
    storageInstructions,
    shelfLife,
    images
}) => {
    if (!categoryId) {
        throw new Error("Category is required.");
    }

    if (
        typeof categoryId !== "string" ||
        !mongoose.Types.ObjectId.isValid(categoryId)
    ) {
        throw new Error("Invalid category ID.");
    }

    // PRODUCT NAME VALIDATION
    if (typeof name !== "string" || !name.trim()) {
        throw new Error("Product name is required.");
    }

    const normalizedName = name.trim().replace(/\s+/g, " ");

    if (normalizedName.length < 2) {
        throw new Error("Product name must be at least 2 characters.");
    }

    if (normalizedName.length > 100) {
        throw new Error("Product name cannot exceed 100 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(normalizedName)) {
        throw new Error("Product name contains invalid characters.");
    }

    
if (!/^[A-Za-z0-9][A-Za-z0-9\s&'().-]*$/.test(normalizedName)) {
    throw new Error("Product name contains invalid characters.");
}


    if (!/[A-Za-z]/.test(normalizedName)) {
        throw new Error("Product name must contain at least one letter.");
    }

    const nameNormalized = normalizedName.toLowerCase();

    // DESCRIPTION VALIDATION
    if (typeof description !== "string" || !description.trim()) {
        throw new Error("Product description is required.");
    }

    const cleanedDescription = description.trim();

    if (cleanedDescription.length < 10) {
        throw new Error("Product description must be at least 10 characters.");
    }

    if (cleanedDescription.length > 2000) {
        throw new Error("Product description cannot exceed 2000 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(cleanedDescription)) {
        throw new Error("Product description contains invalid characters.");
    }

    // INGREDIENTS VALIDATION
    if (typeof ingredients !== "string" || !ingredients.trim()) {
        throw new Error("Ingredients are required.");
    }

    const cleanedIngredients = ingredients.trim();

    if (cleanedIngredients.length < 2) {
        throw new Error("Ingredients must be at least 2 characters.");
    }

    if (cleanedIngredients.length > 2000) {
        throw new Error("Ingredients cannot exceed 2000 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(cleanedIngredients)) {
        throw new Error("Ingredients contain invalid characters.");
    }

    // PREPARATION METHOD VALIDATION
    if (
        typeof preparationMethod !== "string" ||
        !preparationMethod.trim()
    ) {
        throw new Error("Preparation method is required.");
    }

    const cleanedPreparationMethod = preparationMethod.trim();

    if (cleanedPreparationMethod.length < 10) {
        throw new Error("Preparation method must be at least 10 characters.");
    }

    if (cleanedPreparationMethod.length > 3000) {
        throw new Error("Preparation method cannot exceed 3000 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(cleanedPreparationMethod)) {
        throw new Error("Preparation method contains invalid characters.");
    }

    // STORAGE INSTRUCTIONS VALIDATION
    if (
        typeof storageInstructions !== "string" ||
        !storageInstructions.trim()
    ) {
        throw new Error("Storage instructions are required.");
    }

    const cleanedStorageInstructions = storageInstructions.trim();

    if (cleanedStorageInstructions.length < 2) {
        throw new Error("Storage instructions must be at least 2 characters.");
    }

    if (cleanedStorageInstructions.length > 1000) {
        throw new Error("Storage instructions cannot exceed 1000 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(cleanedStorageInstructions)) {
        throw new Error("Storage instructions contain invalid characters.");
    }

    // SHELF LIFE VALIDATION
    if (typeof shelfLife !== "string" || !shelfLife.trim()) {
        throw new Error("Shelf life is required.");
    }

    const cleanedShelfLife = shelfLife.trim();

    if (cleanedShelfLife.length > 100) {
        throw new Error("Shelf life cannot exceed 100 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(cleanedShelfLife)) {
        throw new Error("Shelf life contains invalid characters.");
    }

    // IMAGE VALIDATION
    if (!Array.isArray(images)) {
        throw new Error("Product images are required.");
    }

    if (images.length < 3 || images.length > 6) {
        throw new Error("Product must have between 3 and 6 images.");
    }

    const cleanedImages = [];

    for (const image of images) {
        if (typeof image !== "string" || !image.trim()) {
            throw new Error("Invalid product image.");
        }

        const cleanedImage = image.trim();

        if (/[\u0000-\u001F\u007F]/.test(cleanedImage)) {
            throw new Error("Product image path contains invalid characters.");
        }

        cleanedImages.push(cleanedImage);
    }

    if (new Set(cleanedImages).size !== cleanedImages.length) {
        throw new Error("Duplicate product images are not allowed.");
    }

    // CHECK CATEGORY
    const category = await Category.findById(categoryId);

    if (!category) {
        throw new Error("Category not found.");
    }

    if (!category.isActive) {
        throw new Error("Cannot create a product under an inactive category.");
    }

    // CHECK DUPLICATE PRODUCT
    const existingProduct = await Product.findOne({ nameNormalized });

    if (existingProduct) {
        if (!existingProduct.isActive) {
            throw new Error(
                "Product already exists but is inactive. Restore it instead."
            );
        }

        throw new Error("Product with this name already exists.");
    }

    // CREATE SLUG
    const slug = normalizedName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!slug) {
        throw new Error("Unable to generate a valid product slug.");
    }

    // CREATE PRODUCT
    try {
        return await Product.create({
            categoryId,
            name: normalizedName,
            nameNormalized,
            slug,
            description: cleanedDescription,
            ingredients: cleanedIngredients,
            preparationMethod: cleanedPreparationMethod,
            storageInstructions: cleanedStorageInstructions,
            shelfLife: cleanedShelfLife,
            images: cleanedImages
        });
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.nameNormalized) {
                throw new Error("Product with this name already exists.");
            }

            if (error.keyPattern?.slug) {
                throw new Error("A product with this slug already exists.");
            }

            throw new Error("Product already exists.");
        }

        throw error;
    }
};

// GET PRODUCTS WITH FILTERING AND PAGINATION
const getProductService = async ({
    page = 1,
    limit = 10,
    search = "",
    categoryId = "",
    status = "all"
}) => {
    // PAGE VALIDATION
    if (typeof page !== "number" && typeof page !== "string") {
        throw new Error("Invalid page number");
    }

    if (typeof page === "string") {
        page = page.trim();

        if (!page) {
            throw new Error("Page number cannot be empty");
        }

        if (!/^\d+$/.test(page)) {
            throw new Error("Page number must be a positive whole number.");
        }
    }

    page = Number(page);

    if (!Number.isSafeInteger(page) || page < 1) {
        throw new Error("Page number must be a positive whole number");
    }

    // LIMIT VALIDATION
    if (typeof limit !== "number" && typeof limit !== "string") {
        throw new Error("Invalid products per page");
    }

    if (typeof limit === "string") {
        limit = limit.trim();

        if (!limit) {
            throw new Error("Products per page cannot be empty");
        }

        if (!/^\d+$/.test(limit)) {
            throw new Error("Products per page must be a whole number");
        }
    }

    limit = Number(limit);

    if (!Number.isSafeInteger(limit)) {
        throw new Error("Products per page must be a valid whole number");
    }

    if (limit < 1) {
        throw new Error("Products per page must be at least 1.");
    }

    if (limit > 100) {
        throw new Error("Products per page cannot exceed 100.");
    }

    // SEARCH VALIDATION
    if (typeof search !== "string") {
        throw new Error("Invalid search value.");
    }

    search = search.trim();

    if (search.length > 100) {
        throw new Error("Search cannot exceed 100 characters.");
    }

    if (/[\u0000-\u001F\u007F]/.test(search)) {
        throw new Error("Search contains invalid characters.");
    }

    // CATEGORY VALIDATION
    if (typeof categoryId !== "string") {
        throw new Error("Invalid category ID.");
    }

    categoryId = categoryId.trim();

    if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            throw new Error("Invalid category ID.");
        }

        const category = await Category.findById(categoryId)
            .select("_id")
            .lean();

        if (!category) {
            throw new Error("Category not found.");
        }
    }

    // STATUS VALIDATION
    if (typeof status !== "string") {
        throw new Error("Invalid product status.");
    }

    status = status.trim().toLowerCase();

    const allowedStatuses = ["all", "active", "inactive"];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid product status.");
    }

    // BUILD QUERY
    const query = {};

    if (search) {
        const escapedSearch = search
            .toLowerCase()
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        query.nameNormalized = {
            $regex: escapedSearch,
            $options: "i"
        };
    }

    if (categoryId) {
        query.categoryId = categoryId;
    }

    if (status === "active") {
        query.isActive = true;
    } else if (status === "inactive") {
        query.isActive = false;
    }

    // COUNT PRODUCTS
    const totalProducts = await Product.countDocuments(query);

    if (totalProducts === 0) {
        return {
            products: [],
            pagination: {
                currentPage: page,
                productsPerPage: limit,
                totalProducts: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false
            }
        };
    }

    const totalPages = Math.ceil(totalProducts / limit);

    if (page > totalPages) {
        throw new Error("Requested page does not exist.");
    }

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
        throw new Error("Invalid pagination value");
    }

    // FETCH PRODUCTS
    const products = await Product.find(query)
        .select(
            "categoryId name slug description images isActive averageRating reviewCount minPrice maxPrice createdAt updatedAt"
        )
        .populate("categoryId", "name image isActive")
        .sort({
            createdAt: -1,
            _id: -1
        })
        .skip(skip)
        .limit(limit)
        .lean();

    // RETURN PRODUCTS AND PAGINATION
    return {
        products,
        pagination: {
            currentPage: page,
            productsPerPage: limit,
            totalProducts,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
};

// GET PRODUCT BY ID
const getProductByIdService = async (productId) => {
    if (!productId) {
        throw new Error("Product ID is required");
    }

    if (typeof productId !== "string") {
        throw new Error("Invalid product ID.");
    }

    productId = productId.trim();

    if (!productId) {
        throw new Error("Product ID cannot be empty");
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product ID");
    }

    const product = await Product.findById(productId)
        .select(
            "categoryId name slug description ingredients preparationMethod storageInstructions shelfLife images isActive averageRating reviewCount minPrice maxPrice createdAt updatedAt"
        )
        .populate("categoryId", "name image isActive")
        .lean();

    if (!product) {
        throw new Error("Product not found");
    }

    return product;
};

// EXPORT SERVICES
module.exports = {
    createProductService,
    getProductService,
    getProductByIdService
};
