const mongoose = require("mongoose");
const Product = require("./ProductSchema");

// Order Item Schema (subdocument)
const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number},
  color: { type: String },
  size: { type: String },
  totalItemPrice: { type: Number } // quantity * price
});

OrderItemSchema.pre("save", async function (next) {
  try {
    if (this.isModified("product") || this.isModified("quantity")) {
      const product = await Product.findById(this.product);
      if (product) {
        this.price = product.retailprice;
        this.totalItemPrice = this.quantity * this.price;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = OrderItemSchema; // ✅ Export only the schema
