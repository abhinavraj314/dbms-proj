const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const nodemailer = require("nodemailer");
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

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax", // Adjust to "strict" or "none" as needed
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
}

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
    process.exit(1); // Exit if the database connection fails
  } else {
    console.log("Database connected successfully");
  }
});

// Authentication routes
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT * FROM "User" WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const result = await pool.query(
      'INSERT INTO "User" (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    // Send welcome email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to PESU Fest!",
        html: `
          <h1>Welcome to PESU Fest!</h1>
          <p>Thank you for signing up, ${username}!</p>
          <p>We're excited to have you join us for our upcoming events.</p>
        `,
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Continue with signup even if email fails
    }

    // Start session
    req.session.user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
    };

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
      },
    });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ message: "An error occurred during signup" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check user by both username and email
    const result = await pool.query(
      'SELECT * FROM "User" WHERE username = $1 AND email = $2',
      [username, email]
    );

    const user = result.rows[0];
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
      };
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
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
