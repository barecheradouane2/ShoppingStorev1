const mongoose = require("mongoose");

// Order Item Schema (subdocument)
const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  color: { type: String },
  size: { type: String },
  totalItemPrice: { type: Number, required: true } // quantity * price
});

module.exports = mongoose.model("OrderItem", OrderItemSchema);