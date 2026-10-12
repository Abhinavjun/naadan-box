const categoryService = require("../services/categoryService");
const fs = require("fs/promises");

// CREATE CATEGORY

const createCategory = async (req, res, next) => {
    try {
        const category = await categoryService.createCategoryService(
            {...req.body,image:req.file?.path}
        );

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });
    } catch (error) {
      if (req.file?.path) {
        try {
            await fs.unlink(req.file.path);
        } catch (fileError) {
            console.error(
                "Failed to remove uploaded category image:",
                fileError
            );
        }
    }

    next(error);
}
    
};


// GET CATEGORIES

const getCategories = async (req, res, next) => {
    try {
        const result = await categoryService.getCategoriesService(
            req.query
        );

        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};


// GET CATEGORY BY ID

const getCategoryById = async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryByIdService(
            req.params.categoryId
        );

        return res.status(200).json({
            success: true,
            message: "Category fetched successfully",
            data: category,
        });
    } catch (error) {
        next(error);
    }
};


// UPDATE CATEGORY

const updateCategory = async (req, res, next) => {
    try {
        const result = await categoryService.updateCategoryService(
            req.params.categoryId,{...req.body,image: req.file?.path,} 
            
        );

        const {category,oldImage} = result;

if(req.file?.path && category._oldImage) {
    try {
        await fs.unlink(oldImage)
    } catch (fileError) {
        console.error("Failed to remove old category image:" ,fileError)
    }
}
    

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error) {

     if(req.file?.path) {
        try {
            await fs.unlink(req.file.path);
        } catch(fileError) {
            console.error("Failed to remove uploaded category image:", fileError)
        };
     }


        next(error);
    }
};


// DEACTIVATE CATEGORY

const deactivateCategory = async (req, res, next) => {
    try {
        const category =
            await categoryService.deactivateCategoryService(
                req.params.categoryId
            );

        return res.status(200).json({
            success: true,
            message: "Category deactivated successfully",
            data: category,
        });
    } catch (error) {
        next(error);
    }
};



const restoreCategory = async(req,res,next) => {
    try {
         const category = await categoryService.restoreCategoryService(
            req.params.categoryId
        );


          return res.status(200).json({
            success: true,
            message: "Category restored successfully",
            data: category,
        });
    }
catch (error) {
    next(error);
}   

    

};


// EXPORT CONTROLLERS

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deactivateCategory,restoreCategory
};