const mongoose = require("mongoose");

const normalizeName = (value) => {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/\s+/g, " ");
};

const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [100, "Product name cannot exceed 100 characters"],
      set: normalizeName,
    },

    nameNormalized: {
      type: String,
      required: [true, "Normalized product name is required"],
      trim: true,
      lowercase: true,
      maxlength: [100, "Normalized product name cannot exceed 100 characters"],
    },

    slug: {
      type: String,
      required: [true, "Product slug is required"],
      lowercase: true,
      trim: true,
      maxlength: [120, "Slug cannot exceed 120 characters"],
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Product description must be at least 10 characters"],
      maxlength: [2000, "Product description cannot exceed 2000 characters"],
    },

    ingredients: {
      type: String,
      required: [true, "Ingredients are required"],
      trim: true,
      minlength: [2, "Ingredients cannot be empty"],
      maxlength: [2000, "Ingredients cannot exceed 2000 characters"],
    },

    preparationMethod: {
      type: String,
      required: [true, "Preparation method is required"],
      trim: true,
      minlength: [10, "Preparation method must be at least 10 characters"],
      maxlength: [3000, "Preparation method cannot exceed 3000 characters"],
    },

    storageInstructions: {
      type: String,
      required: [true, "Storage instructions are required"],
      trim: true,
      minlength: [2, "Storage instructions cannot be empty"],
      maxlength: [1000, "Storage instructions cannot exceed 1000 characters"],
    },

    shelfLife: {
      type: String,
      required: [true, "Shelf life is required"],
      trim: true,
      minlength: [1, "Shelf life cannot be empty"],
      maxlength: [100, "Shelf life cannot exceed 100 characters"],
    },

    images: {
      type: [String],
      required: [true, "Product images are required"],
      validate: [
        {
          validator: function (images) {
            return images.length >= 3 && images.length <= 6;
          },
          message: "Product must have between 3 and 6 images",
        },
        {
          validator: function (images) {
            return new Set(images).size === images.length;
          },
          message: "Duplicate product images are not allowed",
        },
      ],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },

    minPrice: {
      type: Number,
      default: null,
      min: [0, "Minimum price cannot be negative"],
    },

    maxPrice: {
      type: Number,
      default: null,
      min: [0, "Maximum price cannot be negative"],
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/*
 * Prevent duplicate product names
 * after normalization.
 *
 * Example:
 * Chicken Curry
 * chicken curry
 * CHICKEN   CURRY
 *
 * All are treated as the same product name.
 */
productSchema.index(
  {
    nameNormalized: 1,
  },
  {
    unique: true,
  }
);

/*
 * Slug must be unique.
 */
productSchema.index(
  {
    slug: 1,
  },
  {
    unique: true,
  }
);

/*
 * Useful for category-based product listing.
 */
productSchema.index({
  categoryId: 1,
  isActive: 1,
});

/*
 * Useful for newest-product sorting.
 */
productSchema.index({
  createdAt: -1,
});

/*
 * Useful for product listing/filtering by price.
 */
productSchema.index({
  minPrice: 1,
  maxPrice: 1,
  isActive: 1,
});

module.exports = mongoose.model("Product", productSchema);