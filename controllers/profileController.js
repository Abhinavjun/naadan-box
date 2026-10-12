

const {
    getUserProfileService,
    updateUserProfileService,
    updateUserProfileImageService,
    deleteUserProfileImageService
} = require("../services/profileService");


// load profile
const loadProfile=async(req,res)=>{
 try{
  const user=await getUserProfileService(req.session.userId);





  return res.render("user/profile",{user});
 }catch(error){
  if(error.message==="USER_NOT_FOUND"){
   return res.redirect("/login");
  }

  console.error("Load profile error:",error);

  return res.status(500).send("Something went wrong. Please try again.");
 }
};

// update profile
const updateProfile=async(req,res)=>{


const { name, phone, gender, dateOfBirth } = req.body;

try {
    const profileData = {
        name,
        phone,
        gender,
        dateOfBirth
    };

    const user = await updateUserProfileService(
        req.session.userId,
        profileData
    );


  return res.json({
   success:true,
   message:"Profile updated successfully.",
   user:{
    name:user.name,
    phone:user.phone,
    gender:user.gender,
    dateOfBirth:user.dateOfBirth
   }
  });

 }catch(error){



  if (error.message === "INVALID_DATE_OF_BIRTH") {
    return res.status(400).json({
        success: false,
        field: "dateOfBirth",
        message: "Please enter a valid date of birth."
    });
}


if (error.message === "INVALID_PROFILE_NAME") {
    return res.status(400).json({
        success: false,
        field: "name",
        message: "Name must be 3–50 characters and contain only letters, spaces, apostrophes, or hyphens."
    });
}


if (error.message === "INVALID_PHONE") {
    return res.status(400).json({
        success: false,
        field: "phone",
        message: "Phone number must contain exactly 10 digits."
    });
}


if (error.message === "PHONE_ALREADY_EXISTS") {
    return res.status(409).json({
        success: false,
        field: "phone",
        message: "This phone number is already in use."
    });
}


if (error.message === "INVALID_GENDER") {
    return res.status(400).json({
        success: false,
        field: "gender",
        message: "Please select a valid gender."
    });
}



  if(error.message==="USER_NOT_FOUND"){
   return res.status(404).json({
    success:false,
    message:"User not found."
   });
  }

  console.error("Update profile error:",error);

  return res.status(500).json({
   success:false,
   message:"Unable to update profile. Please try again."
  });
 }
};

// upload profile image

const uploadProfileImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Please select an image."
        });
    }

    try {
        const result = await updateUserProfileImageService(
            req.session.userId,
            req.file
        );

        return res.json({
            success: true,
            message: "Profile image updated successfully.",
            profileImage: result.profileImage
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (error.message === "INVALID_PROFILE_IMAGE") {
            return res.status(400).json({
                success: false,
                message: "Please select a valid image."
            });
        }

        console.error("Profile image upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update profile image."
        });
    }
};

// delete profile image

const deleteProfileImage = async (req, res) => {
    try {
        const result = await deleteUserProfileImageService(
            req.session.userId
        );

        return res.json({
            success: true,
            message: "Profile image deleted successfully.",
            profileImage: result.profileImage
        });
    } catch (error) {
        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (error.message === "NO_CUSTOM_PROFILE_IMAGE") {
            return res.status(400).json({
                success: false,
                message: "No custom profile image to delete."
            });
        }

        console.error("Profile image delete error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete profile image."
        });
    }
};


module.exports={
 loadProfile,
 updateProfile,
 uploadProfileImage,
 deleteProfileImage
};