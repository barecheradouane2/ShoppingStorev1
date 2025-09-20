const express = require('express');
const app = express();

const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
connectDB();

app.use(express.json());
app.use("/users", require("./routes/UsersRoutes"));
app.use("/categories", require("./routes/CategoryRoutes"));
app.use("/products", require("./routes/ProductRoutes"));




app.use(cors());



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});