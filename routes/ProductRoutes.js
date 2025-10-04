const express = require("express");
const router = express.Router();
const multer = require("multer");
const Product = require("../models/ProductSchema");
const Category = require("../models/CategorySchema");
const Expense = require("../models/ExpenseSchema");

const fs = require("fs");

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

// i think i should add purshase relation that help the admin to know how many purshase for each product
// when the admin add new product i should add the product to purcahse when he update i should update the purshase
// when he delete the product i should delete the purshase
//when he add quantity to the product i should add the quantity to the purshase

router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    let {
      name,
      description,
      quantity,
      wholesaleprice,
      retailprice,
      categoryId,
      discount,
      sizes,
      Colorvariants,
    } = req.body;

    if (
      !name ||
      !description ||
      !wholesaleprice ||
      !retailprice ||
      !categoryId
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    if (typeof sizes === "string") {
      sizes = JSON.parse(sizes);
    }
    if (typeof Colorvariants === "string") {
      Colorvariants = JSON.parse(Colorvariants);
    }

    const newProduct = new Product({
      name,
      quantity,
      description,
      wholesaleprice,
      retailprice,
      discount: discount || 0,
      category: categoryId,
      images: req.files.map((file) => file.filename),
      sizes: sizes,
      colorVariants: Colorvariants,
    });

    await newProduct.save();

    const newExpense = new Expense({
      expenseName: name,
      price: wholesaleprice,
    });
    await newExpense.save();

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// i should check if the qunantity for each size or color variant is positive number
// سعر الحملة
router.put("/addquantity/:id", async (req, res) => {
  try {
    const { quantity, wholesaleprice, colorVariants, sizes } = req.body;
    if (!quantity || quantity <= 0 || !wholesaleprice || wholesaleprice <= 0) {
      return res.status(400).json({
        error: "Quantity and wholesale price must be positive numbers",
      });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    product.quantity += quantity;

    if (colorVariants && Array.isArray(colorVariants)) {
      colorVariants.forEach((variant) => {
        const existingVariant = product.colorVariants.find(
          (v) => v.colorName === variant.colorName
        );
        if (existingVariant) {
          variant.qty += quantity;

          if (variant.sizes && Array.isArray(variant.sizes)) {
            variant.sizes.forEach((size) => {
              const existingSize = variant.sizes.find(
                (s) => s.name === size.name
              );
              if (existingSize) {
                existingSize.qty += quantity;
              }
            });
          }
        }
      });
    }

    if (sizes && Array.isArray(sizes)) {
      sizes.forEach((size) => {
        const existingSize = product.sizes.find(
          (s) => s.sizeName === size.sizeName
        );
        if (existingSize) {
          existingSize.qty += quantity;
        }
      });
    }

    await product.save();

    const newExpense = new Expense({
      expenseName: product.name,
      price: wholesaleprice,
    });
    await newExpense.save();

    res.json({ message: "Quantity added successfully", product });
  } catch (err) {
    console.error("Error adding quantity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const {
      name,
      description,
      wholesaleprice,
      retailprice,
      discount,
      categoryId,
      sizes,
      Colorvariants,
      isFeatured,
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      product.category = categoryId;
    }

    if (req.files && req.files.length > 0) {
      const imagePaths = req.files.map((file) => file.filename);
      product.images = imagePaths;
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (wholesaleprice) {
      const oldExpense = await Expense.findOne({
        expenseName: product.name,
        price: wholesaleprice,
        date: product.createdAt,
      });
      product.wholesaleprice = wholesaleprice;
      if (oldExpense) {
        oldExpense.price = wholesaleprice;
        await oldExpense.save();
      } else {
        const newExpense = new Expense({
          expenseName: product.name,
          price: wholesaleprice,
        });
        await newExpense.save();
      }
    }
    if (retailprice) product.retailprice = retailprice;
    if (discount) product.discount = discount;
    if (typeof isFeatured !== "undefined")
      product.isFeatured = isFeatured === "true";

    if (sizes) product.sizes = sizes;
    if (Colorvariants) product.Colorvariants = Colorvariants;

    await product.save();

    res.json(product);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 5, category, featured, q } = req.query;
    const filter = {};

    // basic filters
    if (category) filter.category = category;
    if (featured) filter.isFeatured = featured === "true";

    // search filter
    if (q) {
      // find matching category IDs first
      const cats = await Category.find({
        name: { $regex: q, $options: "i" },
      }).select("_id");

      const catIds = cats.map((c) => c._id);

      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { category: { $in: catIds } },
      ];
    }

    // run queries in parallel
    const [stats, total, products] = await Promise.all([
      // combined aggregation stats
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: "$quantity" },
            valueOfStock: {
             $sum: "$wholesaleprice"
            },
            estimatedIncome: {
              $sum: { $multiply: ["$retailprice", "$quantity"] },
            },
          },
        },
      ]),

      // total count for pagination
      Product.countDocuments(filter),

      // paginated product list
      Product.find(filter)
        .populate("category", "name")
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
    ]);

    const statsObj = stats[0] || {};

    res.json({
      totalstock: statsObj.totalQuantity || 0,
      valueofstock: statsObj.valueOfStock || 0,
      estimatedincome: (statsObj.estimatedIncome - statsObj.valueOfStock) || 0,
      total,
      totalPages: Math.ceil(total / limit),
      page: parseInt(page),
      limit: parseInt(limit),
      products,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// router.get("/", async (req, res) => {
//   try {
//     const { page = 1, limit = 10, category, featured, q } = req.query;
//     const filter = {};

//     if (category) filter.category = category;
//     if (featured) filter.isFeatured = featured === "true";
//     if (q) {
//       filter.$or = [
//         { name: { $regex: q, $options: "i" } },
//         { "category.name": { $regex: q, $options: "i" } }, // <-- dot notation
//       ];
//     }

//     // if (q){
//     //   filter.name = { $regex: q, $options: "i" };
//     //   filter.category.name = { $regex: q, $options: "i" };

//     // }

//     //     if (q) {
//     //
//     //   const cats = await Category.find({
//     //     name: { $regex: q, $options: 'i' }
//     //   }).select('_id');

//     //   const catIds = cats.map(c => c._id);

//     //   // 2. build product filter
//     //   filter.$or = [
//     //     { name: { $regex: q, $options: 'i' } },
//     //     { category: { $in: catIds } }
//     //   ];
//     // }

//     const totalstock = await Product.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalQuantity: { $sum: "$quantity" },
//         },
//       },
//     ]);

//     const valueofstock = await Product.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalQuantity: { $sum: "$wholesaleprice" },
//         },
//       },
//     ]);

//     const estimatedincome = await Product.aggregate([
//       {
//         $project: {
//           total: { $multiply: ["$retailprice", "$quantity"] }, // compute price × qty per product
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           grandTotal: { $sum: "$total" }, // sum all those totals
//         },
//       },
//     ]);

//     const products = await Product.find(filter)
//       .populate("category", "name")
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     const total = await Product.countDocuments(filter);

//     res.json({
//       totalstock: totalstock[0] ? totalstock[0].totalQuantity : 0,
//       valueofstock: valueofstock[0] ? valueofstock[0].totalQuantity : 0,
//       estimatedincome: estimatedincome[0] ? estimatedincome[0].grandTotal : 0,
//       total,
//       totalPages: Math.ceil(total / limit),
//       page: parseInt(page),
//       limit: parseInt(limit),
//       products,
//     });
//   } catch (err) {
//     console.error("Error fetching products:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.images.forEach((img) => {
      const filePath = `./public/images/${img}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    res.json({ message: "Product deleted successfully", product });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
