const mongoose = require("mongoose");

const Category = require("../models/categoryModel");

const normalizeCategoryName = (name) => {
  return name.trim().replace(/\s+/g, " ");
};


// CREATE CATEGORY

const createCategoryService = async ({ name,image }) => {
  if (!name || typeof name !== "string") {
    throw new Error("Category name is required");
  }
  if( !image || typeof image !== "string") {
    throw new Error("Category image is required");
  }

  const normalizedName = normalizeCategoryName(name);

  if (normalizedName.length < 2) {
    throw new Error("Category name must be at least 2 characters");
  }

  const nameNormalized = normalizedName.toLowerCase();

  // Check for existing category

  const existingCategory = await Category.findOne({
    nameNormalized,
  });

  if (existingCategory) {
    if (!existingCategory.isActive) {
      throw new Error(
        "Category already exists but is inactive. Restore it instead."
      );
    }

    throw new Error("Category already exists.");
  }

  // Generate slug

  const slug = nameNormalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  try {
    const category = await Category.create({
      name: normalizedName,
      nameNormalized,
      slug,
      image,
    });

    return category;
  } catch (error) {
    // Handles duplicate-key race condition
    if (error.code === 11000) {
      throw new Error("Category already exists.");
    }

    throw error;
  }
};


// GET CATEGORIES

// GET CATEGORIES

const getCategoriesService = async ({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
}) => {
  page = Number(page);
  limit = Number(limit);

  // Validate page

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer.");
  }

  // Validate limit

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100.");
  }

  // Validate status

  const allowedStatuses = ["all", "active", "inactive"];

  if (
    typeof status !== "string" ||
    !allowedStatuses.includes(status)
  ) {
    throw new Error(
      "Status must be all, active, or inactive."
    );
  }

  // Build query

  const query = {};

  if (status === "active") {
    query.isActive = true;
  }

  if (status === "inactive") {
    query.isActive = false;
  }

  // Search

  if (search && typeof search === "string") {
    const normalizedSearch = search
      .trim()
      .replace(/\s+/g, " ");

    if (normalizedSearch) {
      query.name = {
        $regex: normalizedSearch,
        $options: "i",
      };
    }
  }

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Category.countDocuments(query),
  ]);

  return {
    categories,
    pagination: {
      currentPage: page,
      limit,
      totalCategories: total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// GET CATEGORY BY ID

const getCategoryByIdService = async (categoryId) => {
  if (!categoryId) {
    throw new Error("Category ID is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid category ID.");
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  return category;
};



// UPDATE CATEGORY

const updateCategoryService = async (categoryId, { name, image }) => {
  if (!categoryId) {
    throw new Error("Category ID is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid category ID.");
  }

  if (
    (name === undefined || name === null) &&
    (image === undefined || image === null)
  ) {
    throw new Error("Nothing to update.");
  }

  if (name !== undefined && typeof name !== "string") {
    throw new Error("Category name must be a string.");
  }

  if (image !== undefined && typeof image !== "string") {
    throw new Error("Category image must be a string.");
  }

  // Find existing category

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  // Store old image before changing it

  const oldImage = category.image;

  // Update name if provided

  if (name !== undefined) {
    const normalizedName = normalizeCategoryName(name);

    if (normalizedName.length < 2) {
      throw new Error(
        "Category name must be at least 2 characters."
      );
    }

    const nameNormalized = normalizedName.toLowerCase();

    // Check for duplicate category name

    const existingCategory = await Category.findOne({
      nameNormalized,
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      throw new Error(
        "Another category with this name already exists."
      );
    }

    // Generate new slug

    const slug = nameNormalized
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    category.name = normalizedName;
    category.nameNormalized = nameNormalized;
    category.slug = slug;
  }

  // Update image if provided

  if (image !== undefined) {
    category.image = image;
  }

  try {
    await category.save();

    return {
      category,
      oldImage,
    };

  } catch (error) {
    if (error.code === 11000) {
      throw new Error("Category already exists.");
    }

    throw error;
  }
};

// DEACTIVATE CATEGORY

const deactivateCategoryService = async (categoryId) => {
  if (!categoryId) {
    throw new Error("Category ID is required.");
  }

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid category ID.");
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found.");
  }

  if (!category.isActive) {
    throw new Error("Category already inactive.");
  }

  category.isActive = false;

  await category.save();

  return category;
};



const restoreCategoryService = async(categoryId) => {
  if(!categoryId) {
     throw new Erro("Category ID is required")
  }
  if(!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Invalid category ID.");
  }

  const category = await Category.findById(categoryId);
  if(!category) {
    throw new Error("Category not found");
  }
  if(category.isActive) {
    throw new Error("Category is already active");
  }
  category.isActive = true;

  await category.save();

  return category;
} ;

// EXPORT SERVICES

module.exports = {
  createCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  updateCategoryService,
  deactivateCategoryService,
  restoreCategoryService,
};