const productService = require("../services/productService");
const fs = require("fs/promises");





const createProduct = async (req, res, next) => {
    try {
        const product = await productService.createProductService({
            ...req.body,
            images: req.files?.map((file) => file.path),
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: product,
        });
    } catch (error) {
        if (req.files?.length) {
            await Promise.all(
                req.files.map((file) =>
                    fs.unlink(file.path).catch((fileError) => {
                        console.error(
                            "Failed to remove the uploaded image:",
                            fileError.message
                        );
                    })
                )
            );
        }

        return next(error);
    }
};




 const getProducts = async(req,res,next) => {
    try {
         const products = await productService.getProductService({
            page : req.query.page,
            limit  : req.query.limit,
            search:req.query.search,
            categoryId : req.query.categoryId,
            status : req.query.status
         });


 return res.status(200).json({
            success: true,
            message: "Products fetched successfully.",
            data: products
        });



    }  catch (error) {
        next(error);
    }
 }


 const getProductById = async(req,res,next) => {

try {
    const product = await productService.getProductByIdService(req.params.productId);

       return res.status(200).json({
            success: true,
            message: "Product fetched successfully.",
            data: product
        });

} catch(error)  {
    next(error);
}


 }

 module.exports ={
    createProduct,getProducts,getProductById,
 };