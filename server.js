const express = require('express');
const app = express();

const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();
const connectDB = require('./config/db');
connectDB();

app.use(cors());

app.use(express.json());

app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use("/users", require("./routes/UsersRoutes"));
app.use("/categories", require("./routes/CategoryRoutes"));
app.use("/products", require("./routes/ProductRoutes"));
app.use("/expenses", require("./routes/ExpenseRoutes"));
app.use("/shippings", require("./routes/ShippingRoutes"));
app.use("/orders", require("./routes/OrderRoutes"));

// app.use("/images", express.static("images"));









const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});