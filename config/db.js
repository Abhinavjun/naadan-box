
const mongoose = require("mongoose");
const dns = require("node:dns");

const connectDB = async () => {
    try {
        // Configure DNS before resolving the MongoDB SRV record.
        dns.setServers(["8.8.8.8", "8.8.4.4"]);

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
