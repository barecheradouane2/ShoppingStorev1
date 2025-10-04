// utils/stockHandler.js
const Product = require("../models/ProductSchema");

async function handleProductStock(orderItems, action = "decrease") {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    const qtyChange = action === "decrease" ? -item.quantity : item.quantity;

    // Update global product quantity
    product.quantity += qtyChange;

    // Handle colorVariants
    if (product.colorVariants && product.colorVariants.length > 0) {
      const variant = product.colorVariants.find(v => v.colorName === item.color);
      if (variant) {
        variant.qty += qtyChange;

        if (variant.sizes && variant.sizes.length > 0) {
          const size = variant.sizes.find(s => s.name === item.size);
          if (size) size.qty += qtyChange;
        }
      }
    }
    

    // Handle sizes (no color)
    if ((!product.colorVariants || product.colorVariants.length === 0) && product.sizes && product.sizes.length > 0) {
      const size = product.sizes.find(s => s.name === item.size);
      if (size) size.qty += qtyChange;
    }

    await product.save();
  }
}



// for (const item of orderItems) {
//         const product = await Product.findById(item.productId);
//         if (!product) continue;

//         // 🔎 check global stock
//         if (product.quantity < item.quantity) {
//           return res
//             .status(400)
//             .json({ error: `Not enough stock for ${product.name}` });
//         }

//         product.quantity -= item.quantity;

//         // 🔎 update colorVariants if exist
//         if (product.colorVariants && product.colorVariants.length > 0) {
//           const variant = product.colorVariants.find(
//             (v) => v.colorName === item.color
//           );
//           if (variant) {
//             if (variant.qty < item.quantity) {
//               return res
//                 .status(400)
//                 .json({ error: `Not enough stock for ${product.name} - ${variant.colorName}` });
//             }
//             variant.qty -= item.quantity;

//             // check size inside this color
//             if (variant.sizes && variant.sizes.length > 0 && item.size) {
//               const sizeVariant = variant.sizes.find((s) => s.name === item.size);
//               if (sizeVariant) {
//                 if (sizeVariant.qty < item.quantity) {
//                   return res
//                     .status(400)
//                     .json({ error: `Not enough stock for ${product.name} - ${variant.colorName} - ${item.size}` });
//                 }
//                 sizeVariant.qty -= item.quantity;
//               }
//             }
//           }
//         }

//         // 🔎 if product has only sizes (no colorVariants)
//         else if (product.sizes && product.sizes.length > 0 && item.size) {
//           const sizeVariant = product.sizes.find((s) => s.name === item.size);
//           if (sizeVariant) {
//             if (sizeVariant.qty < item.quantity) {
//               return res
//                 .status(400)
//                 .json({ error: `Not enough stock for ${product.name} - ${item.size}` });
//             }
//             sizeVariant.qty -= item.quantity;
//           }
//         }

//         await product.save(); // ✅ save once per product
//       }








module.exports = { handleProductStock };
