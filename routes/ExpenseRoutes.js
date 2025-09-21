const express = require("express");
const router = express.Router();
const Expense = require("../models/ExpenseSchema");

// Create a new expense
router.post("/", async (req, res) => {
  try {
    const { expenseName, price, date, notes } = req.body;
    if (!expenseName || !price) {
      return res.status(400).json({ error: "expense Name and Price are required" });
    }
    const newExpense = new Expense({ expenseName, price, date, notes });
    await newExpense.save();
    res.status(201).json(newExpense);
  }
    catch (error) {
    res.status(500).json({ error: "Server error" });
    }
});

// Get all expenses
router.get("/", async (req, res) => {
  try {
    // Get page & limit from query params (default page=1, limit=10)
    let { page = 1, limit = 10 } = req.query;

    // Convert them to numbers
    page = parseInt(page);
    limit = parseInt(limit);

    // Count total documents
    const totalExpenses = await Expense.countDocuments();

    
    const expenses = await Expense.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      totalExpenses,
      totalPages: Math.ceil(totalExpenses / limit),
      currentPage: page,
      expenses,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Server error" });
  }
});


route.get("/:id", async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Update an expense
router.put("/:id", async (req, res) => {
  try {
    const { expenseName, price, date, notes } = req.body; 
    const expense = await Expense.findByIdAndUpdate(
        req.params.id,
        { expenseName, price, date, notes },
        { new: true }
    );
    if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
    }
    res.json(expense);
    } catch (error) {
    res.status(500).json({ error: "Server error" });
    }
});

// Delete an expense
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id); 
    if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ message: "Expense deleted" });
    } catch (error) {
    res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;