// # MODULES
const mongoose = require("mongoose");
const Address = require("../models/addressModel");
const { validatePincodeState } = require("./pincodeService");

// # VALIDATE ADDRESS ID
const validateId = id => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("INVALID_ADDRESS_ID");
    }
};

// # VALIDATE ADDRESS DATA
const validateAddressData = data => {
    if (!data.fullName || !/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(data.fullName.trim())) {
        throw new Error("INVALID_NAME");
    }

    if (!data.phone || !/^\d{10}$/.test(data.phone.trim())) {
        throw new Error("INVALID_PHONE");
    }

    if (!data.addressLine || data.addressLine.trim().length < 5 || data.addressLine.trim().length > 200) {
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

// # GET USER ADDRESSES
const getUserAddresses = async userId => {
    return await Address.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();
};

// # ADD ADDRESS
const addAddress = async (userId, addressData) => {
    validateAddressData(addressData);

    const pincodeDetails = await validatePincodeState(
        addressData.pincode.trim(),
        addressData.state.trim()
    );

    const addressCount = await Address.countDocuments({ userId });

    if (addressCount >= 10) {
        throw new Error("ADDRESS_LIMIT_REACHED");
    }

    if (addressData.isDefault || addressCount === 0) {
        await Address.updateMany(
            { userId },
            { $set: { isDefault: false } }
        );
        addressData.isDefault = true;
    }

    return await Address.create({
        userId,
        ...addressData,
        city: pincodeDetails.city
    });
};

// # UPDATE ADDRESS
const updateAddress = async (userId, addressId, addressData) => {
    validateId(addressId);
    validateAddressData(addressData);

    const address = await Address.findOne({
        _id: addressId,
        userId
    });

    if (!address) throw new Error("ADDRESS_NOT_FOUND");

    const pincodeDetails = await validatePincodeState(
        addressData.pincode.trim(),
        addressData.state.trim()
    );

    if (addressData.isDefault) {
        await Address.updateMany(
            { userId, _id: { $ne: addressId } },
            { $set: { isDefault: false } }
        );
    }

    Object.assign(address, {
        ...addressData,
        city: pincodeDetails.city
    });

    await address.save();

    return address;
};

// # DELETE ADDRESS
const deleteAddress = async (userId, addressId) => {
    validateId(addressId);

    const address = await Address.findOne({
        _id: addressId,
        userId
    });

    if (!address) throw new Error("ADDRESS_NOT_FOUND");

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

// # EXPORT SERVICES
module.exports = {
    getUserAddresses,
    addAddress,
    updateAddress,
    deleteAddress
};