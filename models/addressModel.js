const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
        match: /^[A-Za-z]+(?: [A-Za-z]+)*$/
    },
    phone: {
        type: String,
        required: true,
        match: /^\d{10}$/
    },
    addressLine: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 200
    },
    city: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
        match: /^[A-Za-z]+(?: [A-Za-z]+)*$/
    },
    state: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
        match: /^[A-Za-z]+(?: [A-Za-z]+)*$/
    },
    pincode: {
        type: String,
        required: true,
        match: /^\d{6}$/
    },
    landmark: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null
    },
    addressType: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home"
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

addressSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Address", addressSchema);