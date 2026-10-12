// modules
const passport=require("passport");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const User=require("../models/userModel");
const {generateReferralCode}=require("../services/referralService");

// google strategy
passport.use(
 new GoogleStrategy({
  clientID:process.env.GOOGLE_CLIENT_ID,
  clientSecret:process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:"/auth/google/callback"
 },async(accessToken,refreshToken,profile,done)=>{
  try{
   const email=profile.emails?.[0]?.value?.trim().toLowerCase();

   if(!email){
    return done(new Error("GOOGLE_EMAIL_NOT_FOUND"),null);
   }

   // find existing user
   let user=await User.findOne({email});

   if(user){
    if(user.isBlocked){
     return done(new Error("USER_BLOCKED"),null);
    }

    const oldGoogleProfileImage=user.googleProfileImage;
    const googleProfileImage=profile.photos?.[0]?.value||null;

    console.log("Google profile photo:", googleProfileImage);
console.log("Current profile image:", user.profileImage);
console.log("Current Google profile image:", user.googleProfileImage);

    // link google account
    if(!user.googleId){
     user.googleId=profile.id;
    }

    if(googleProfileImage){
     user.googleProfileImage=googleProfileImage;

     if(!user.profileImage ||
        user.profileImage==="default-profile.png" ||
        user.profileImage===oldGoogleProfileImage){
      user.profileImage=googleProfileImage;
     }
    }else if(!user.profileImage){
     user.profileImage="default-profile.png";
    }

    await user.save();
    return done(null,user);
   }

   const googleProfileImage=profile.photos?.[0]?.value||null;

   user=new User({
    name:profile.displayName||"Google User",
    email,
    googleId:profile.id,
    password:null,
    profileImage:googleProfileImage||"default-profile.png",
    googleProfileImage,
    referralCode:generateReferralCode(),
    isVerified:true,
    isBlocked:false
   });

   await user.save();
   return done(null,user);

  }catch(error){
   console.error("Google authentication error:",error);
   return done(error,null);
  }
 })
);

// export passport
module.exports=passport;