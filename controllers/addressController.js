const {
 getUserAddresses,
 addAddress,
 updateAddress,
 deleteAddress
}=require("../services/addressService");

const {getPincodeDetails}=require("../services/pincodeService");

// error handler
const handleError=(res,error)=>{
 const messages={
  INVALID_ADDRESS_ID:"Invalid address.",
  ADDRESS_NOT_FOUND:"Address not found.",
  INVALID_NAME:"Enter a valid full name.",
  INVALID_PHONE:"Phone number must contain exactly 10 digits.",
  INVALID_ADDRESS:"Address must be between 5 and 200 characters.",
  INVALID_CITY:"Enter a valid city.",
  INVALID_STATE:"Enter a valid state.",
  INVALID_PINCODE:"Enter a valid 6-digit PIN code.",
  PINCODE_NOT_FOUND:"This PIN code does not exist.",
  PINCODE_STATE_MISMATCH:"The PIN code does not belong to the selected state.",
  PINCODE_SERVICE_ERROR:"Unable to verify the PIN code right now. Please try again.",
  INVALID_LANDMARK:"Landmark cannot exceed 100 characters.",
  INVALID_ADDRESS_TYPE:"Invalid address type.",
  ADDRESS_LIMIT_REACHED:"You can save a maximum of 10 addresses."
 };

 return res.status(400).json({
  success:false,
  message:messages[error.message]||"Unable to process address. Please try again."
 });
};

const loadAddresses=async(req,res)=>{
 try{
  const addresses=await getUserAddresses(req.session.userId);

  return res.json({
   success:true,
   addresses
  });
 }catch(error){
  console.error("Load addresses error:",error);

  return res.status(500).json({
   success:false,
   message:"Unable to load addresses."
  });
 }
};

// create address
const createAddress=async(req,res)=>{
 try{
  const address=await addAddress(req.session.userId,{
   fullName:req.body.fullName?.trim(),
   phone:req.body.phone?.trim(),
   addressLine:req.body.addressLine?.trim(),
   city:req.body.city?.trim(),
   state:req.body.state?.trim(),
   pincode:req.body.pincode?.trim(),
   landmark:req.body.landmark?.trim()||null,
   addressType:req.body.addressType,
   isDefault:req.body.isDefault==="true"||req.body.isDefault===true
  });

  return res.status(201).json({
   success:true,
   message:"Address added successfully.",
   address
  });
 }catch(error){
  console.error("Create address error:",error);
  return handleError(res,error);
 }
};

// update address
const editAddress=async(req,res)=>{
 try{
  const address=await updateAddress(req.session.userId,req.params.id,{
   fullName:req.body.fullName?.trim(),
   phone:req.body.phone?.trim(),
   addressLine:req.body.addressLine?.trim(),
   city:req.body.city?.trim(),
   state:req.body.state?.trim(),
   pincode:req.body.pincode?.trim(),
   landmark:req.body.landmark?.trim()||null,
   addressType:req.body.addressType,
   isDefault:req.body.isDefault==="true"||req.body.isDefault===true
  });

  return res.json({
   success:true,
   message:"Address updated successfully.",
   address
  });
 }catch(error){
  console.error("Update address error:",error);
  return handleError(res,error);
 }
};

const removeAddress=async(req,res)=>{
 try{
  await deleteAddress(req.session.userId,req.params.id);

  return res.json({
   success:true,
   message:"Address deleted successfully."
  });
 }catch(error){
  console.error("Delete address error:",error);
  return handleError(res,error);
 }
};

// verify pincode
const checkPincode=async(req,res)=>{
 try{
  const details=await getPincodeDetails(req.params.pincode);

  return res.json({
   success:true,
   pincode:details.pincode,
   city:details.city,
   state:details.state
  });
 }catch(error){
  console.error("Pincode verification error:",error);
  return handleError(res,error);
 }
};

module.exports={
 loadAddresses,
 checkPincode,
 createAddress,
 editAddress,
 removeAddress
};