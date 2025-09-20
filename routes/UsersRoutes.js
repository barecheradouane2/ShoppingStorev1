const express = require("express");

const router = express.Router();
const User = require("../models/UserSchema");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    let token = jwt.sign({ email, id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1w" });

    res.status(201).json({ message: "User registered successfully", token });
    
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const user  = await User.findOne({ email });
    if (!user) {            
        return res.status(400).json({ message: "Invalid credentials" });            

    }   
    const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      let token = jwt.sign({ email, id: user._id }, process.env.JWT_SECRET, { expiresIn: "1w" });

     res.status(200).json({ message: "Login successful", user, token });
  } catch (error) {
     res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // Exclude passwords

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;