const axios = require("axios");


const getPincodeDetails = async (pincode) => {
    // pin validation
    if (!/^\d{6}$/.test(pincode)) {
        throw new Error("INVALID_PINCODE");
    }

    try {
        const response = await axios.get(  `https://api.postalpincode.in/pincode/${pincode}`, {   timeout: 5000  }  );

        const result = response.data?.[0];

        
        if (!result) {
            throw new Error("PINCODE_NOT_FOUND");
        }

        if (result.Status !== "Success") {
            throw new Error("PINCODE_NOT_FOUND");
        }

        if (!result.PostOffice || result.PostOffice.length === 0) {
            throw new Error("PINCODE_NOT_FOUND");
        }

        // post office details
        const postOffice = result.PostOffice[0];

        const details = {
            pincode: pincode,
            state: postOffice.State,
            district: postOffice.District,
            city: postOffice.Name
        };

        return details;

    } catch (error) {

            console.error("Pincode API error:", error.response?.data || error.message);


            
        if (error.message === "INVALID_PINCODE") {
            throw error;
        }

        if (error.message === "PINCODE_NOT_FOUND") {
            throw error;
        }

        console.error("Pincode API error:", error);
        throw new Error("PINCODE_SERVICE_ERROR");
    }
};

// validation of pincode (state)
const validatePincodeState = async (pincode, state) => {
    const details = await getPincodeDetails(pincode);

    const pincodeState = details.state.toLowerCase();
    const enteredState = state.trim().toLowerCase();

    if (pincodeState !== enteredState) {
        throw new Error("PINCODE_STATE_MISMATCH");
    }

    return details;
};

module.exports = {
    getPincodeDetails: getPincodeDetails,
    validatePincodeState: validatePincodeState
};