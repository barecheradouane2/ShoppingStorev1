const mongoose = require('mongoose');

const SizeSchema = new mongoose.Schema({
  name: { type: String },
  qty: { type: Number, min: 0 }
});

const ColorVariantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  colorCode: { type: String },
  qty: { type: Number, default: 0, min: 0 },
  sizes: [SizeSchema]
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  wholesaleprice: { type: Number, required: true },
  retailprice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  isFeatured: { type: Boolean, default: false },
  images: [{ type: String }],
  isPublished: { type: Boolean, default: true },
  sizes: [SizeSchema],
  colorVariants: [ColorVariantSchema]
}, { timestamps: true });

ProductSchema.pre('save', function(next) {

  if (this.isModified('quantity') && !this.colorVariants.length >0 && !this.sizes.length>0) {
    return next();
  }


  if (this.colorVariants && this.colorVariants.length >0) {
    this.quantity = this.colorVariants.reduce((sum, v) => {
      if (v.sizes && v.sizes.length) {
        return sum + v.sizes.reduce((s, sz) => s + (sz.qty || 0), 0);
      }
      return sum + (v.qty || 0);
    }, 0);
  } else if (this.colorVariants.length === 0 && this.sizes && this.sizes.length>0) {
    this.quantity = this.sizes.reduce((s, sz) => s + (sz.qty || 0), 0);
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
