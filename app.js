
const express = require("express");
const session = require("express-session");
const path = require("path");
const passport = require("./config/passport");

const userRoute = require("./routes/userRoute");
const profileRoutes = require("./routes/profileRoutes");
const adminRoute = require("./routes/adminRoute");
const categoryRoutes = require("./routes/categoryRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const MongoStore = require("connect-mongo").MongoStore;
const app = express();


// # MIDDLEWARE

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

app.use(passport.initialize());


// # SESSION COOKIE SETTINGS

const isProduction = process.env.NODE_ENV === "production";


// # USER SESSION

const userSession = session({
    name: "naadan_user_sid",
    secret: process.env.USER_SESSION_SECRET,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "user_sessions",
        ttl: 24 * 60 * 60
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
});

// # ADMIN SESSION

const adminSession = session({
    name: "naadan_admin_sid",
    secret: process.env.ADMIN_SESSION_SECRET,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "admin_sessions",
        ttl: 24 * 60 * 60
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
    }
});


// # VIEW ENGINE

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));


// # STATIC FILES

app.use(express.static("public"));

app.use("/uploads", express.static("uploads"));


// # ADMIN ROUTES

app.use(
    "/admin",
    adminSession,
    adminRoute
);


// # ADMIN CATEGORY API ROUTES

app.use(
    "/api/admin/categories",
    adminSession,
    categoryRoutes
);


// # USER PROFILE ROUTES

app.use(
    "/profile",
    userSession,
    profileRoutes
);


// # USER ROUTES

app.use(
    "/",
    userSession,
    userRoute
);


// # ERROR HANDLER

app.use(errorHandler);


module.exports = app;
