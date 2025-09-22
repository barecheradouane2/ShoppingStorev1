const express = require("express");

const router = express.Router();
const Order = require("../models/OrderSchema");
const Product = require("../models/ProductSchema");

const isEqual = require("lodash.isequal");


const { handleProductStock } = require("../utils/stockHandler");


// Create a new order
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
      orderItems
    } = req.body;

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

    if (orderStatus == "confirmed") {

     await handleProductStock(orderItems, "decrease");

      
    }

    const newOrder = new Order({
      orderStatus,
      fullName,
      telephone,
      wilaya,
      commune,
      address,
      shippingStatus,
      Shipping,
      orderItems
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//update order  status so when the order is confirmed and the status is changed i need to update the stock of the products
router.put("/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { orderStatus, shippingStatus, wilaya, commune, address, orderItems, telephone, fullName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Handle status changes
    if (orderStatus === "confirmed" && order.orderStatus !== "confirmed") {
      await handleProductStock(orderItems, "decrease");
    } else if (orderStatus !== "confirmed" && order.orderStatus === "confirmed") {
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

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
        .limit(limit)
        .populate("Shipping");
    const totalOrders = await Order.countDocuments();
    res.json({
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page
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
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    // if order is confirmded and then deleted we need to restock the products 
    if (order.orderStatus === "confirmed") {
        await handleProductStock(order.orderItems, "increase");
    }
    await order.remove();
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

