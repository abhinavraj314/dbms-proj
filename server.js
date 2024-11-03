const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "unifest",
  password: process.env.DB_PASSWORD || "mysql314",
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
}

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully");
  }
});

// Authentication routes
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userCheck = await pool.query(
      'SELECT * FROM "User" WHERE username = $1',
      [username]
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await pool.query(
      'INSERT INTO "User" (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );
    req.session.user = {
      id: newUser.rows[0].id,
      username: newUser.rows[0].username,
    };
    res.json({
      user: { id: newUser.rows[0].id, username: newUser.rows[0].username },
    });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ message: "An error occurred during signup" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM "User" WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = { id: user.id, username: user.username };
      res.json({ user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Could not log out, please try again" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/api/user", (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// Event routes
app.get("/api/events", async (req, res) => {
  try {
    console.log("Fetching events...");
    const result = await pool.query(
      'SELECT * FROM "Event" ORDER BY "eventDate", "eventTime"'
    );
    console.log("Events fetched:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching events:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch events", details: error.message });
  }
});

// Registration routes
app.get("/api/registrations", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT r.*, e."eventName", s.name as "studentName" FROM "Registration" r JOIN "Event" e ON r."eventId" = e.id JOIN "Student" s ON r."studentId" = s.id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching registrations" });
  }
});

app.post("/api/registrations", async (req, res) => {
  const { studentId, eventId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "Registration" ("studentId", "eventId") VALUES ($1, $2) RETURNING *',
      [studentId, eventId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error registering for event:", error);
    res
      .status(500)
      .json({ message: "An error occurred while registering for the event" });
  }
});

app.post("/api/registrations/clear", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('DELETE FROM "Registration"');
    await client.query("COMMIT");
    console.log("Successfully cleared all registrations");
    res.json({ message: "All registrations cleared successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error clearing registrations:", error);
    res.status(500).json({ message: "Failed to clear registrations" });
  } finally {
    client.release();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!", details: err.message });
});

// Catch-all handler for any request that doesn't match the ones above
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
