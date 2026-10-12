const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
},
email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
},
phone: {
    type: String,
    trim: true,
    default: null
},

password: {
    type: String,
    required: false,
    default : null
},

googleId: { 

    type: String,
    default: null
},

profileImage: {
    type: String,
    default: "default-profile.png"
},
googleProfileImage: {
    type: String,
    default: null
},
gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    default: null
},
dateOfBirth: {
    type: Date,
    default: null
},
referralCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
},

referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},
isVerified: {
    type: Boolean,
    default: false
},
isBlocked: {
    type: Boolean,
    default: false
}, 



},{timestamps : true});


userSchema.index(
    { phone: 1 },
    {
        unique: true,
        partialFilterExpression: {
            phone: { $type: "string" }
        }
    }
);

module.exports = mongoose.model("User",userSchema);