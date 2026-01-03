const express = require("express");
const pool = require("../data-source");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
require("dotenv").config();


const router = express.Router();
const SECRET = process.env.JWT_SECRET;

// Sign Up
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const userResult = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
            [name, email, hashed]
        );
        const user = userResult.rows[0];

        const herdResult = await pool.query(
            "INSERT INTO herds (user_id, name) VALUES ($1, $2) RETURNING *",
            [user.id, "Default Herd"]
        );

        res.status(201).json({
            user,
            defaultHerd: herdResult.rows[0]
        });

        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "User creation failed" })
    }
})

// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, email:user.email }, SECRET, { expiresIn: "1h" });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login Failed" });
    }
})

router.get("/me", authMiddleware, (req, res) => {
    res.json({
        message: 'You are auth',
        user: req.user,
    });
});

router.delete("/me", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 RETURNING *",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found"});
        }
        
        res.json({ message: "User account deleted usccesffully", user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erorr: "Failed to delete user" });
    }
})

// Exporting
module.exports = router