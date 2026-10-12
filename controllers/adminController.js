const {
 loginAdminService,
 getUsersService,
 getCustomersForExportService,
 updateUserBlockStatusService,
 getCustomerDetailsService
}=require("../services/adminService");

// load admin login
const loadAdminLogin=(req,res)=>{

 // prevent cache
 res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
 res.setHeader("Pragma","no-cache");
 res.setHeader("Expires","0");

 // check admin session
 if(req.session&&req.session.adminId){
  return res.redirect("/admin/dashboard");
 }

 return res.render("admin/login",{
  error:null,
  email:""
 });
};

const adminLogin=async(req,res)=>{
 const email=req.body.email?.trim().toLowerCase();
 const password=req.body.password;

 if(!email||!password){
  return res.render("admin/login",{
   error:"Email and password are required.",
   email:email||""
  });
 }

 try{
  const admin=await loginAdminService(email,password);

  // create new session
  req.session.regenerate(error=>{
   if(error){
    console.error("Admin session regeneration error:",error);

    return res.render("admin/login",{
     error:"Something went wrong. Please try again.",
     email:email
    });
   }

   req.session.adminId=admin._id.toString();

   req.session.admin={
    id:admin._id.toString(),
    name:admin.name,
    email:admin.email
   };

   return res.redirect("/admin/dashboard");
  });

 }catch(error){
  console.error("Admin login error:",error);

  if(error.message==="ADMIN_INACTIVE"){
   return res.render("admin/login",{
    error:"Your admin account is inactive.",
    email:email
   });
  }

  return res.render("admin/login",{
   error:"Invalid email or password.",
   email:email
  });
 }
};

const adminLogout=(req,res)=>{
 req.session.destroy(error=>{
  if(error){
   console.error("Admin logout error:",error);
   return res.redirect("/admin/dashboard");
  }

res.clearCookie("naadan_admin_sid");
  return res.redirect("/admin/login");
 });
};

const loadAdminDashboard=(req,res)=>{
 return res.render("admin/dashboard",{
  admin:req.session.admin
 });
};

const loadUsers=async(req,res)=>{
 const page=req.query.page;
 const search=req.query.search;
 const status=req.query.status;





 try{
  const data=await getUsersService(page,search,status);

  // checking ajax request
  if(req.headers.accept?.includes("application/json")){
   return res.status(200).json({
    success:true,
    ...data
   });
  }

  return res.render("admin/customers",{
   ...data,
   admin:req.session.admin
  });

 }catch(error){
  console.error("Load users error:",error);

  // ajax error
  if(req.headers.accept?.includes("application/json")){
   return res.status(500).json({
    success:false,
    message:"Unable to load customers. Please try again."
   });
  }

  return res.status(500).render("admin/customers",{
   users:[],
   currentPage:1,
   totalPages:0,
   totalUsers:0,
   search:search||"",
   status:status||"all",
   admin:req.session.admin,
   error:"Unable to load customers. Please try again."
  });
 }
};

// export customers
const exportCustomers=async(req,res)=>{
 try{
  const customers=await getCustomersForExportService();

  const headers=[
   "Name",
   "Email",
   "Phone",
   "Email Verification",
   "Account Status",
   "Joined Date"
  ];

  // create csv rows
  const rows=customers.map(customer=>[
   customer.name||"",
   customer.email||"",
   customer.phone||"",
   customer.isVerified?"Verified":"Not Verified",
   customer.isBlocked?"Blocked":"Active",
   customer.createdAt
    ?new Date(customer.createdAt).toLocaleDateString("en-IN")
    :""
  ]);

  // create csv
  const csvData=[headers,...rows];

  const csv=csvData
   .map(row=>{
    return row
     .map(value=>{
      return `"${String(value).replace(/"/g,'""')}"`;
     })
     .join(",");
   })
   .join("\n");

  // csv response
  res.setHeader("Content-Type","text/csv");
  res.setHeader(
   "Content-Disposition",
   'attachment; filename="naadan-box-customers.csv"'
  );

  return res.send(csv);

 }catch(error){
  console.error("Export customers error:",error);

  return res.status(500).json({
   success:false,
   message:"Unable to export customers."
  });
 }
};

// update customer block status
const updateUserBlockStatus=async(req,res)=>{
 const userId=req.params.userId;
 const isBlocked=req.body.isBlocked;

 // check status
 if(typeof isBlocked!=="boolean"){
  return res.status(400).json({
   success:false,
   message:"Invalid block status."
  });
 }

 try{
  const user=await updateUserBlockStatusService(userId,isBlocked);

  let message="Customer unblocked successfully.";

  if(isBlocked){
   message="Customer blocked successfully.";
  }

  return res.status(200).json({
   success:true,
   message:message,
   isBlocked:user.isBlocked
  });

 }catch(error){
  console.error("Update customer block status error:",error);

  if(error.message==="INVALID_USER_ID"){
   return res.status(400).json({
    success:false,
    message:"Invalid customer ID."
   });
  }

  if(error.message==="USER_NOT_FOUND"){
   return res.status(404).json({
    success:false,
    message:"Customer not found."
   });
  }

  return res.status(500).json({
   success:false,
   message:"Unable to update customer status."
  });
 }
};

// load customer details
const loadCustomerDetails=async(req,res)=>{
 const userId=req.params.userId;

 try{
  const customer=await getCustomerDetailsService(userId);

  return res.render("admin/customer-details",{
   admin:req.session.admin,
   customer:customer
  });

 }catch(error){
  console.error("Load customer details error:",error);

  if(error.message==="INVALID_USER_ID"){
   return res.status(400).send("Invalid customer ID.");
  }

  if(error.message==="USER_NOT_FOUND"){
   return res.status(404).send("Customer not found.");
  }

  return res.status(500).send("Unable to load customer details.");
 }
};





const loadCategories = async (req, res, next) => {
    try {
        return res.render("admin/categories", {
            pageTitle: "Categories",
            showSearch: false,
            admin: req.session.admin,
            activePage : "categories"
        });
    } catch (error) {
        next(error);
    }
};



const loadAddCategory = async (req, res, next) => {
    try {
        return res.render("admin/addCategory", {
            pageTitle: "Add Category",
            showSearch: false,
            admin: req.session.admin
        });
    } catch (error) {
        next(error);
    }
};

const loadCategoryDetails = async (req, res, next) => {
    try {
        return res.render("admin/category-details", {
            pageTitle: "Category Details",
            showSearch: false,
            admin: req.session.admin
        });
    } catch (error) {
        next(error);
    }
};


const loadEditCategory = async (req, res, next) => {
    try {
        return res.render("admin/editCategory", {
            pageTitle: "Edit Category",
            showSearch: false,
            admin: req.session.admin
        });
    } catch (error) {
        next(error);
    }
};



module.exports={
 loadAdminLogin:loadAdminLogin,
 adminLogin:adminLogin,
 adminLogout:adminLogout,
 loadAdminDashboard:loadAdminDashboard,
 loadUsers:loadUsers,
 updateUserBlockStatus:updateUserBlockStatus,
 loadCustomerDetails:loadCustomerDetails,
 exportCustomers:exportCustomers,
 loadCategories:loadCategories,
 loadAddCategory,loadAddCategory,
 loadCategoryDetails,loadCategoryDetails,
 loadEditCategory
};