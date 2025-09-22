const express = require("express");
const router = express.Router();
const Shipping = require("../models/ShippingSchema");

// Create a new shipping entry
router.post("/", async (req, res) => {
  try { 
    const { wilayaFrom, wilayaTo, deskprice, homeprice, isavailable } = req.body;
    if (!wilayaTo || !deskprice || !homeprice) {
      return res.status(400).json({ error: "wilaya To, desk price and home price are required" });
    }
    const newShipping = new Shipping({ wilayaFrom, wilayaTo, deskprice, homeprice, isavailable });
    await newShipping.save();
    res.status(201).json(newShipping);
  }
    catch (error) {
    res.status(500).json({ error: "Server error" });
    }
});

// Get all shipping entries
router.get("/", async (req, res) => {
  try {
    // Get page & limit from query params (default page=1, limit=10)
    let { page = 1, limit = 10 } = req.query;
    // Convert them to numbers
    page = parseInt(page);
    limit = parseInt(limit);
    // Count total documents
    const totalShippings = await Shipping.countDocuments();
    const shippings = await Shipping.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({
      totalShippings,
      totalPages: Math.ceil(totalShippings / limit),
      currentPage: page,
      shippings,
    });
  } catch (error) {
    console.error("Error fetching shippings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
    try {
        const shipping = await Shipping.findById(req.params.id);        
        if (!shipping) {
            return res.status(404).json({ error: "Shipping entry not found" });
        }
        res.json(shipping);
    } catch (error) {
        console.error("Error fetching shipping entry:", error);
        res.status(500).json({ error: "Server error" });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const { wilayaFrom, wilayaTo, deskprice, homeprice, isavailable } = req.body;
        const updatedShipping = await Shipping.findByIdAndUpdate(
            req.params.id,
            { wilayaFrom, wilayaTo, deskprice, homeprice, isavailable },
            { new: true }
        );
        if (!updatedShipping) {
            return res.status(404).json({ error: "Shipping entry not found" });
        }
        res.json(updatedShipping);
    } catch (error) {
        console.error("Error updating shipping entry:", error);
        res.status(500).json({ error: "Server error" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const deletedShipping = await Shipping.findByIdAndDelete(req.params.id);    
        if (!deletedShipping) {
            return res.status(404).json({ error: "Shipping entry not found" });
        }
        res.json({ message: "Shipping entry deleted successfully" });
    } catch (error) {
        console.error("Error deleting shipping entry:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;