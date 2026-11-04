
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Admin = require("../models/adminModel");
const User = require("../models/userModel");
const Address = require("../models/addressModel");


// log admin
const loginAdminService = async (email, password) => {
    const admin = await Admin.findOne({ email: email });

    if (!admin) {
        throw new Error("INVALID_CREDENTIALS");
    }

    if (admin.isActive === false) {
        throw new Error("ADMIN_INACTIVE");
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
        throw new Error("INVALID_CREDENTIALS");
    }

    return admin;
};

// get admin
const getAdminService = async (adminId) => {
    const admin = await Admin.findById(adminId);

    if (!admin) {
        throw new Error("ADMIN_NOT_FOUND");
    }

    if (admin.isActive === false) {
        throw new Error("ADMIN_INACTIVE");
    }

    return admin;
    
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// GET USERS
const getUsersService = async (page = 1, search = "", status = "all") => {
    const limit = 10;

    // pagination
    let currentPage = Number(page);

    if (!Number.isInteger(currentPage) || currentPage < 1) {
        currentPage = 1;
    }

    let cleanSearch = "";

    if (typeof search === "string") {
        cleanSearch = search.trim().slice(0, 100);
    }

    let cleanStatus = "all";

    if (status === "active" || status === "blocked" || status === "all") {
        cleanStatus = status;
    }

    const query = {};

    // searching
    if (cleanSearch) {
        const searchValue = escapeRegex(cleanSearch);

        query.$or = [
            { name: { $regex: searchValue, $options: "i" } },
            { email: { $regex: searchValue, $options: "i" } }
        ];
    }

    // filtering status
    if (cleanStatus === "active") {
        query.isBlocked = false;
    }

    if (cleanStatus === "blocked") {
        query.isBlocked = true;
    }

    // count matching users
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    // handle empty results and invalid page numbers
    if (totalPages === 0) {
        currentPage = 1;
    } else if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    // get users for the current page
    const users = await User.find(query)
        .select("name email phone profileImage isVerified isBlocked createdAt")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * limit)
        .limit(limit)
        .lean();
        
        
  

    return {
        users: users,
        currentPage: currentPage,
        totalPages: totalPages,
        totalUsers: totalUsers,
        search: cleanSearch,
        status: cleanStatus
    };
};

// export customers
const getCustomersForExportService = async () => {
    const customers = await User.find({})
        .select("name email phone isVerified isBlocked createdAt")
        .sort({ createdAt: -1 })
        .lean();

    return customers;
};

// actions
const updateUserBlockStatusService = async (userId, isBlocked) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("INVALID_USER_ID");
    }

    if (typeof isBlocked !== "boolean") {
        throw new Error("INVALID_BLOCK_STATUS");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    user.isBlocked = isBlocked;

    await user.save();

    return user;
};

// get customers details
const getCustomerDetailsService = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("INVALID_USER_ID");
    }

    const user = await User.findById(userId)
        .populate("referredBy", "name email referralCode")
        .lean();

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return user;
};

module.exports = {
    loginAdminService: loginAdminService,
    getAdminService: getAdminService,
    getUsersService: getUsersService,
    getCustomersForExportService: getCustomersForExportService,
    updateUserBlockStatusService: updateUserBlockStatusService,
    getCustomerDetailsService: getCustomerDetailsService
};
