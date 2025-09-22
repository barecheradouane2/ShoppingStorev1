const mongoose = require('mongoose');

const OrderItemSchema = require("./OrderItemSchema");


// i think when the order is confirmed i should add the user name of the user who confirmed the order and the date of confirmation
// what do you suggest ?



const OrderSchema = new mongoose.Schema(
  {
    orderDate: { type: Date, default: Date.now },
    totalPrice: { type: Number},
    // confirmedBy: { type: String }, 
    // confirmedAt: { type: Date }, 

    orderStatus: {
      type: String,
      enum: ["pending","attempt", "confirmed", "canceled", "pick-up", "exchange"],
      default: "pending"
    },

    fullName: { type: String, required: true },
    telephone: { type: String, required: true },
    wilaya: { type: String, required: true },
    commune: { type: String, required: true },
    address: { type: String, required: true },
     shippingStatus: {
      type: String,
      enum: ["home", "desk"],
      default: "home"
    },

    Shipping: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipping', required: true },
   
     orderItems: [OrderItemSchema],

   // Embedded array of order items
  },
  { timestamps: true }
);


OrderSchema.pre("save", async function (next) {
  try {
    if (this.orderItems && this.orderItems.length) {
      
      this.totalPrice = this.orderItems.reduce(
        (sum, item) => sum + (item.totalItemPrice || 0),
        0
      );

    
      const shipping = await mongoose.model("Shipping").findById(this.Shipping);

      if (shipping) {
        
        if (this.shippingStatus === "home") {
          this.totalPrice += shipping.homeprice || 0;
        } else if (this.shippingStatus === "desk") {
          this.totalPrice += shipping.deskprice || 0;
        }
      }
    } else {
      this.totalPrice = 0;
    }

    next();
  } catch (err) {
    next(err);
  }
});


module.exports = mongoose.model("Order", OrderSchema);

