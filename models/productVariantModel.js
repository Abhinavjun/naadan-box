const mongoose = require("mongoose");

const normalizeVariantName = (value) => {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/\s+/g, " ");
};

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    variantName: {
      type: String,
      required: [true, "Variant name is required"],
      trim: true,
      minlength: [1, "Variant name cannot be empty"],
      maxlength: [30, "Variant name cannot exceed 30 characters"],
      set: normalizeVariantName,
    },

    variantNameNormalized: {
      type: String,
      required: [true, "Normalized variant name is required"],
      trim: true,
      lowercase: true,
      maxlength: [
        30,
        "Normalized variant name cannot exceed 30 characters",
      ],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
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
 * Prevent duplicate variants for the same product.
 *
 * Example:
 *
 * Product A + 500g       → allowed
 * Product A + 500G       → rejected
 * Product A + "500 g"    → depends on normalization rules
 * Product B + 500g       → allowed
 */
productVariantSchema.index(
  {
    productId: 1,
    variantNameNormalized: 1,
  },
  {
    unique: true,
  }
);

/*
 * Useful for fetching active/inactive
 * variants belonging to a product.
 */
productVariantSchema.index({
  productId: 1,
  isActive: 1,
});

module.exports = mongoose.model(
  "ProductVariant",
  productVariantSchema
);