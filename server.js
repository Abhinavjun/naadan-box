
require("dotenv").config();

const connectDB = require("./config/db");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try { 
        // Configure DNS and establish the MongoDB connection first.
        await connectDB();

        // Load app.js only after the database connection succeeds.
        const app = require("./app");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
