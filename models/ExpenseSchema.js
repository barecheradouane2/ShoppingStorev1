const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    expenseName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
