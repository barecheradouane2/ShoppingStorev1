const mongoose = require('mongoose');
const ShippingSchema = new mongoose.Schema({
    wilayaFrom: { type: String},
    wilayaTo: { type: String, required: true },
    placeName: { type: String ,default: function() { return this.wilayaTo; }},
    deskprice: { type: Number, required: true },
    homeprice: { type: Number, required: true },
    isavailable: { type: Boolean, default: true }

}, { timestamps: true });
module.exports = mongoose.model('Shipping', ShippingSchema);