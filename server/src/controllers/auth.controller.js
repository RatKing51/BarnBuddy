const AppDataSource = require("../data-source");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

module.exports = {
  register: async (req, res) => {
    try {
      const repo = AppDataSource.getRepository("User");
      const { name, email, password } = req.body;

      // Check if user exists
      const existing = await repo.findOne({ where: { email } });
      if (existing) return res.status(400).json({ error: "User already exists" });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = repo.create({ name, email, password: hashedPassword });
      const result = await repo.save(user);

      res.json({ message: "User registered", userId: result.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const repo = AppDataSource.getRepository("User");
      const { email, password } = req.body;

      const user = await repo.findOne({ where: { email } });
      if (!user) return res.status(400).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  me: async (req, res) => {
    // Protected route example
    res.json({ user: req.user });
  },
};
