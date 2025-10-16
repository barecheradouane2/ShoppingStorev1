const express = require("express");

const router = express.Router();
const Order = require("../models/OrderSchema");
const Product = require("../models/ProductSchema");

const isEqual = require("lodash.isequal");

const { handleProductStock } = require("../utils/stockHandler");

const mongoose = require("mongoose");

router.get("/stats", async (req, res) => {
  try {
    const today = new Date();

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [todayOrders, sevenDaysOrders, thirtyDaysOrders, allTimeOrders] =
      await Promise.all([
        Order.find({ createdAt: { $gte: startOfToday } }),
        Order.find({ createdAt: { $gte: sevenDaysAgo } }),
        Order.find({ createdAt: { $gte: thirtyDaysAgo } }),
        Order.find({}),
      ]);

    const stats = {
      today: {
        orders: todayOrders.length,
        sales: todayOrders.reduce((acc, o) => acc + o.totalPrice, 0),
      },
      last7days: {
        orders: sevenDaysOrders.length,
        sales: sevenDaysOrders.reduce((acc, o) => acc + o.totalPrice, 0),
      },
      last30days: {
        orders: thirtyDaysOrders.length,
        sales: thirtyDaysOrders.reduce((acc, o) => acc + o.totalPrice, 0),
      },
      allTime: {
        orders: allTimeOrders.length,
        sales: allTimeOrders.reduce((acc, o) => acc + o.totalPrice, 0),
      },
    };

    const allStatuses = [
      "confirmed",
      "pending",
      "shipped",
      "cancelled",
      "delivered",
    ];
    const statsStatus = Object.fromEntries(
      allStatuses.map((status) => [
        status,
        allTimeOrders.filter((o) => o.orderStatus === status).length,
      ])
    );

    res.json({ stats, statsStatus });
  } catch (error) {
    console.error("Error fetching total sales:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/last7days", async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayStat = stats.find((s) => s._id === dateStr);
      result.unshift({
        date: dateStr,
        totalOrders: dayStat ? dayStat.totalOrders : 0,
        totalSales: dayStat ? dayStat.totalSales : 0,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching last 7 days stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      orderStatus,
      fullName,
      telephone,
      wilaya,
      commune,
      address,
      shippingStatus,
      Shipping,
      orderItems,
    } = req.body;

    // ✅ 1. Validation
    if (
      !fullName ||
      !telephone ||
      !wilaya ||
      !commune ||
      !address ||
      !Shipping ||
      !orderItems ||
      orderItems.length === 0
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ 2. Safely convert product IDs to ObjectId
    const formattedOrderItems = orderItems.map((item) => {
      if (!item.product) {
        throw new Error("Order item is missing a product ID");
      }

      return {
        ...item,
        product: new mongoose.Types.ObjectId(item.product),
      };
    });

    // ✅ 3. Handle stock if confirmed
    if (orderStatus === "confirmed") {
      await handleProductStock(formattedOrderItems, "decrease");
    }

    // ✅ 4. Create the order
    const newOrder = new Order({
      orderStatus,
      fullName,
      telephone,
      wilaya,
      commune,
      address,
      shippingStatus,
      Shipping,
      orderItems: formattedOrderItems,
    });

    await newOrder.save();

    // ✅ 5. Populate product details in the response
    const populatedOrder = await newOrder.populate({
      path: "orderItems.product",
      select: "name ",
    });

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//update order  status so when the order is confirmed and the status is changed i need to update the stock of the products
router.put("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      orderStatus,
      shippingStatus,
      wilaya,
      commune,
      address,
      orderItems,
      telephone,
      fullName,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Handle status changes
    if (orderStatus === "confirmed" && order.orderStatus !== "confirmed") {
      await handleProductStock(orderItems, "decrease");
    } else if (
      orderStatus !== "confirmed" &&
      order.orderStatus === "confirmed"
    ) {
      await handleProductStock(order.orderItems, "increase");
    }

    // Handle order item changes (only if status is confirmed)
    if (orderItems && !isEqual(orderItems, order.orderItems)) {
      if (order.orderStatus === "confirmed") {
        await handleProductStock(order.orderItems, "increase"); // Restock old
      }
      if (orderStatus === "confirmed") {
        await handleProductStock(orderItems, "decrease"); // Decrease new
      }
      order.orderItems = orderItems;
    }

    // Update other fields
    if (orderStatus) order.orderStatus = orderStatus;
    if (shippingStatus) order.shippingStatus = shippingStatus;
    if (wilaya) order.wilaya = wilaya;
    if (commune) order.commune = commune;
    if (address) order.address = address;
    if (telephone) order.telephone = telephone;
    if (fullName) order.fullName = fullName;

    await order.save();
    res.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// get all order with pagination

// router.get("/", async (req, res) => {
//   try {
//     // 🔹 Pagination and query params
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 7;
//     const q = req.query.q?.trim() || "";
//     const all = req.query.all === "true";
//     const skip = (page - 1) * limit;

//     // 🔹 Optional search filter
//     const searchFilter = q
//   ? {
//       $or: [
//         { fullName: { $regex: q, $options: "i" } },
//         { wilaya: { $regex: q, $options: "i" } },
//         { telephone: { $regex: q, $options: "i" } },
//         { orderStatus: { $regex: q, $options: "i" } },
//         { commune: { $regex: q, $options: "i" } },
//         // Search by product name in orderItems (via aggregation-style query)
//         {
//           orderItems: {
//             $elemMatch: {
//               name: { $regex: q, $options: "i" },
//             },
//           },
//         },
//       ],
//     }
//   : {};

//     if (all) {
//       const orders = await Order.find(searchFilter)
//         .sort({ createdAt: -1 })
//         .populate({ path: "Shipping", select: "deskprice homeprice" })
//         .populate({ path: "orderItems.product", select: "name" });

//       return res.json({
//         total: orders.length,
//         stats: {},
//         orders,
//       });
//     }

//     const [counts, totalOrders, orders] = await Promise.all([
//       // Aggregation for stats
//       Order.aggregate([
//         { $match: searchFilter },
//         { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
//       ]),

//       Order.countDocuments(searchFilter),

//       Order.find(searchFilter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate({ path: "Shipping", select: "deskprice homeprice" })
//         .populate({ path: "orderItems.product", select: "name" }),
//     ]);

//     const allStatuses = [
//       "confirmed",
//       "pending",
//       "shipped",
//       "cancelled",
//       "delivered",
//     ];
//     const stats = Object.fromEntries(
//       allStatuses.map((status) => [
//         status,
//         counts.find((c) => c._id === status)?.count || 0,
//       ])
//     );

//     // 🔹 Response
//     res.json({
//        stats,
//       totalPages: Math.ceil(totalOrders / limit),
//       currentPage: page,
//       totalOrders,
//       orders,
//     });
//   } catch (error) {
//     console.error("Error fetching orders:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.get("/", async (req, res) => {
  try {
    // 🔹 Pagination and query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const q = req.query.q?.trim() || "";
    const all = req.query.all === "true";
    const skip = (page - 1) * limit;
    const regex = new RegExp(q, "i");

    // 🔹 Build the base aggregation pipeline
    const pipeline = [
      // Join shipping info
      {
        $lookup: {
          from: "shippings", // collection name in MongoDB
          localField: "Shipping",
          foreignField: "_id",
          as: "Shipping",
        },
      },
      { $unwind: { path: "$Shipping", preserveNullAndEmptyArrays: true } },

      // Unwind orderItems to access products
      { $unwind: { path: "$orderItems", preserveNullAndEmptyArrays: true } },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "orderItems.product",
        },
      },
      {
        $unwind: {
          path: "$orderItems.product",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 Optional search filter
      ...(q
        ? [
            {
              $match: {
                $or: [
                  { fullName: { $regex: regex } },
                  { wilaya: { $regex: regex } },
                  { telephone: { $regex: regex } },
                  { orderStatus: { $regex: regex } },
                  { commune: { $regex: regex } },
                  { "orderItems.product.name": { $regex: regex } },
                ],
              },
            },
          ]
        : []),

      // Re-group by order (to restore full structure)
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          orderItems: { $push: "$orderItems" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { orderItems: "$orderItems" }],
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    // 🔹 If not "all", add pagination
    if (!all) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    // Run aggregation
    const orders = await Order.aggregate(pipeline);

    // 🔹 Stats aggregation (by orderStatus)
    const counts = await Order.aggregate([
      ...(q
        ? [
            {
              $lookup: {
                from: "products",
                localField: "orderItems.product",
                foreignField: "_id",
                as: "products",
              },
            },
            {
              $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
            },
            {
              $match: {
                $or: [
                  { fullName: { $regex: regex } },
                  { wilaya: { $regex: regex } },
                  { telephone: { $regex: regex } },
                  { orderStatus: { $regex: regex } },
                  { commune: { $regex: regex } },
                  { "products.name": { $regex: regex } },
                ],
              },
            },
          ]
        : []),
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const allStatuses = [
      "confirmed",
      "pending",
      "shipped",
      "cancelled",
      "delivered",
    ];
    const stats = Object.fromEntries(
      allStatuses.map((status) => [
        status,
        counts.find((c) => c._id === status)?.count || 0,
      ])
    );

    const totalOrders = await Order.countDocuments();

    // 🔹 Response
    res.json({
      stats,
      totalPages: all ? 1 : Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a specific order by ID
router.get("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("Shipping");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// delete an order by id if it confirmed we need to restock the products
router.delete("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findByIdAndDelete(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    // if order is confirmded and then deleted we need to restock the products
    if (order.orderStatus === "confirmed") {
      await handleProductStock(order.orderItems, "increase");
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
