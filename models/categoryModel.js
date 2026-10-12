const mongoose = require("mongoose");

const normalizeCategoryName = (value) => {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/\s+/g, " ");
};

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
      set: normalizeCategoryName,
    },

    nameNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      set: normalizeCategoryName,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [60, "Slug cannot exceed 60 characters"],
    },
      image: {
      type: String,
      required: [true, "Category image is required"],
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/*
  Database-level protection against duplicate
  normalized category names.
*/
categorySchema.index(
  { nameNormalized: 1 },
  { unique: true }
);

/*
  Useful for admin listing/sorting.
*/
categorySchema.index({ createdAt: -1 });

categorySchema.index({ isActive: 1 });

module.exports = mongoose.model("Category", categorySchema);