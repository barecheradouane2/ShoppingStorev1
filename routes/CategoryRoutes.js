const express = require("express");

const router = express.Router();

const Category = require("../models/CategorySchema");

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + "-" + file.originalname;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description } = req.body;

    const newCategory = new Category({
      name,
      description,
      Image: req.file ? req.file.filename : null,
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    let { page = 1, limit = 7, all } = req.query;

    if (all == "true") {
      const categories = await Category.find({});
      return res.json({
        total: categories.length,
        categories,
      });
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const total = await Category.countDocuments();

    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const products = await Product.find({ category: categoryId }).sort({
      createdAt: -1,
    });

    // Embed products inside category
    const categoryWithProducts = {
      ...category.toObject(), // convert Mongoose doc to plain object
      products,
    };

    res.json({ category: categoryWithProducts });
  } catch (error) {
    console.error("Error fetching category with products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const updatedData = { name, description };
    if (req.file) {
      updatedData.image = req.file.filename;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
