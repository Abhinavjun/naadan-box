const mongoose = require("mongoose");

const normalizeBatchNumber = (value) => {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/\s+/g, " ");
};

const inventoryBatchSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: [true, "Product variant is required"],
    },

    batchNumber: {
      type: String,
      required: [true, "Batch number is required"],
      trim: true,
      minlength: [1, "Batch number cannot be empty"],
      maxlength: [50, "Batch number cannot exceed 50 characters"],
      set: normalizeBatchNumber,
    },

    batchNumberNormalized: {
      type: String,
      required: [true, "Normalized batch number is required"],
      trim: true,
      lowercase: true,
      maxlength: [50, "Normalized batch number cannot exceed 50 characters"],
      set: normalizeBatchNumber,
    },

    quantity: {
      type: Number,
      required: [true, "Batch quantity is required"],
      min: [0, "Batch quantity cannot be negative"],
      max: [1000000, "Batch quantity exceeds the allowed limit"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Batch quantity must be a whole number",
      },
    },

    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },

    receivedAt: {
      type: Date,
      required: [true, "Received date is required"],
      default: Date.now,
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
 * Prevent duplicate batch numbers
 * for the same product variant.
 *
 * Example:
 * Variant A + BATCH-001 → allowed
 * Variant A + batch-001 → rejected
 * Variant B + BATCH-001 → allowed
 */
inventoryBatchSchema.index(
  {
    variantId: 1,
    batchNumberNormalized: 1,
  },
  {
    unique: true,
  }
);

/*
 * Supports FEFO:
 * First Expiry, First Out.
 */
inventoryBatchSchema.index({
  variantId: 1,
  expiryDate: 1,
  isActive: 1,
});

/*
 * Useful for finding active batches
 * belonging to a particular variant.
 */
inventoryBatchSchema.index({
  variantId: 1,
  isActive: 1,
});

module.exports = mongoose.model(
  "InventoryBatch",
  inventoryBatchSchema
);