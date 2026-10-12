const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        otp: {
            type: String,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true
        },
sentAt: {
    type: Date,
    default: Date.now
},

attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
},




        purpose: {
            type: String,
            enum: ["signup", "forgot-password"],
            required: true
        }
    },
    {
        timestamps: true
    }



    
);



otpSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);


otpSchema.index(
    { email: 1, purpose: 1 },
    { unique: true }

);




module.exports = mongoose.model("Otp", otpSchema);