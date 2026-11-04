
const mongoose = require("mongoose");
const Address = require("../models/addressModel");
const { validatePincodeState } = require("./pincodeService");

// VALIDATE ADDRESS DATA
const validateAddress = (data) => {
    if (!data.fullName || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(data.fullName.trim())) {
        throw new Error("INVALID_NAME");
    }

    if (!data.phone || !/^\d{10}$/.test(data.phone.trim())) {
        throw new Error("INVALID_PHONE");
    }

    if (!data.addressLine || data.addressLine.trim().length < 5 ||
        data.addressLine.trim().length > 200) {
        throw new Error("INVALID_ADDRESS");
    }

    if (!data.state || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(data.state.trim())) {
        throw new Error("INVALID_STATE");
    }

    if (!data.pincode || !/^\d{6}$/.test(data.pincode.trim())) {
        throw new Error("INVALID_PINCODE");
    }

    if (data.landmark && data.landmark.trim().length > 100) {
        throw new Error("INVALID_LANDMARK");
    }

    if (!["Home", "Work", "Other"].includes(data.addressType)) {
        throw new Error("INVALID_ADDRESS_TYPE");
    }
};

// VALIDATE ADDRESS ID
const validateId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("INVALID_ADDRESS_ID");
    }
};

// GET ADDRESSES
const getUserAddresses = async (userId) => {
    const addresses = await Address.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 });

    return addresses;
};

// ADD ADDRESS
const addAddress = async (userId, data) => {
    validateAddress(data);

    const pincodeDetails = await validatePincodeState(
        data.pincode.trim(),
        data.state.trim()
    );

    const count = await Address.countDocuments({ userId });

    if (count >= 10) {
        throw new Error("ADDRESS_LIMIT_REACHED");
    }

    if (data.isDefault || count === 0) {
        await Address.updateMany(
            { userId },
            { isDefault: false }
        );

        data.isDefault = true;
    }

    const address = await Address.create({
        ...data,
        userId,
        city: pincodeDetails.city
    });

    return address;
};

// UPDATE ADDRESS
const updateAddress = async (userId, addressId, data) => {
    validateId(addressId);
    validateAddress(data);

    const address = await Address.findOne({
        _id: addressId,
        userId
    });

    if (!address) {
        throw new Error("ADDRESS_NOT_FOUND");
    }

    const pincodeDetails = await validatePincodeState(
        data.pincode.trim(),
        data.state.trim()
    );

    if (data.isDefault) {
        await Address.updateMany(
            { userId, _id: { $ne: addressId } },
            { isDefault: false }
        );
    }

    Object.assign(address, data);
    address.city = pincodeDetails.city;

    await address.save();

    return address;
};

// DELETE ADDRESS
const deleteAddress = async (userId, addressId) => {
    validateId(addressId);

    const address = await Address.findOne({
        _id: addressId,
        userId
    });

    if (!address) {
        throw new Error("ADDRESS_NOT_FOUND");
    }

    await address.deleteOne();

    if (address.isDefault) {
        const nextAddress = await Address.findOne({ userId })
            .sort({ createdAt: -1 });

        if (nextAddress) {
            nextAddress.isDefault = true;
            await nextAddress.save();
        }
    }

    return address;
};

// EXPORT SERVICES
module.exports = {
    getUserAddresses,
    addAddress,
    updateAddress,
    deleteAddress
};
