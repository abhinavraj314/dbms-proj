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

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000", // Your React app URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Important for cookies/session handling
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
    process.exit(1);
  } else {
    console.log("Database connected successfully");
  }
});

// Sample API endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running correctly" });
});

// Authentication routes (e.g., signup, login)
app.post("/api/signup", async (req, res) => {
  const { username, email, password, studentId, phone, department } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if email already exists in either User or Student table
    const emailCheck = await client.query(
      'SELECT u.email AS user_email, s.email AS student_email FROM "User" u FULL OUTER JOIN "Student" s ON s.email = u.email WHERE u.email = $1 OR s.email = $1',
      [email]
    );
    if (emailCheck.rows.length > 0) {
      throw new Error("Email already registered");
    }

    // Check if username already exists in User table
    const userCheck = await client.query(
      'SELECT username FROM "User" WHERE username = $1',
      [username]
    );
    if (userCheck.rows.length > 0) {
      throw new Error("Username already taken");
    }

    // Check if studentId already exists in Student table
    const studentCheck = await client.query(
      'SELECT id FROM "Student" WHERE id = $1',
      [studentId]
    );
    if (studentCheck.rows.length > 0) {
      throw new Error("Student ID already exists");
    }

    // Hash the password for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into User table
    const userResult = await client.query(
      'INSERT INTO "User" (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    // Insert into Student table using userId as the id field
    await client.query(
      'INSERT INTO "Student" (id, name, email, phone, department) VALUES ($1, $2, $3, $4, $5)',
      [studentId, username, email, phone, department]
    );

    await client.query("COMMIT");

    // Send welcome email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to PESU Fest!",
        html: `
          <h1>Welcome to PESU Fest!</h1>
          <p>Thank you for signing up, ${username}!</p>
          <p>Your student ID: ${studentId}</p>
          <p>We're excited to have you join us for our upcoming events.</p>
        `,
      });
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
    }

    // Set session data
    req.session.user = {
      id: userId,
      username,
      email,
      studentId,
    };

    // Send response
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: userId,
        username,
        email,
        studentId,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in signup:", error);
    res.status(400).json({
      message: error.message || "An error occurred during signup",
    });
  } finally {
    client.release();
  }
});

app.post("/api/login", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Log received values for debugging (avoid logging passwords in production)
    console.log("Login attempt with:", { username, email });

    // Query the User table based on username and email
    const userResult = await pool.query(
      `SELECT * FROM "User" WHERE username = $1 AND email = $2`,
      [username.trim(), email.trim().toLowerCase()]
    );

    // Log the query result
    console.log("Database query result:", userResult.rows);

    if (userResult.rows.length === 0) {
      console.log(
        "User not found with username:",
        username,
        "and email:",
        email
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    console.log("User found:", user);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("Invalid password for user:", username);
      return res.status(401).json({ message: "Invlid credentials" });
    }

    // Set session data
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      studentId: user.student_id,
    };

    console.log("Login successful for user:", username);

    // Return user data
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        studentId: user.student_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "An error occurred during login",
      details: error.message,
    });
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

app.get("/api/user", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const result = await pool.query(
      `SELECT u.username, u.email, s.name, s.department 
       FROM "User" u 
       JOIN "Student" s ON s.name = u.username  
       WHERE u.username = $1`,
      [req.session.user.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: "Failed to fetch user info" });
  }
});
app.get("/api/events", async (req, res) => {
  try {
    console.log("Fetching events...");
    const result = await pool.query(
      'SELECT * FROM "Event" ORDER BY "eventDate", "eventTime"'
    );
    console.log("Events fetched:", result);

    // Set proper headers
    res.setHeader("Content-Type", "application/json");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      error: "Failed to fetch events",
      details: error.message,
    });
  }
});
// Registration routes
app.post("/api/registrations", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { eventId } = req.body;
  const username = req.session.user.username;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if student exists and get their ID
    const studentResult = await client.query(
      'SELECT id FROM "Student" WHERE name = $1',
      [username]
    );

    if (studentResult.rows.length === 0) {
      throw new Error("Student not found");
    }

    const studentId = studentResult.rows[0].id;

    // Check if event exists and get its details
    const eventResult = await client.query(
      'SELECT "eventName" FROM "Event" WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      throw new Error("Event not found");
    }

    // Check if already registered
    const existingReg = await client.query(
      'SELECT id FROM "Registration" WHERE "studentId" = $1 AND "eventId" = $2',
      [studentId, eventId]
    );

    if (existingReg.rows.length > 0) {
      throw new Error("Already registered for this event");
    }

    // Create registration with properly formatted array
    const result = await client.query(
      'INSERT INTO "Registration" ("studentId", "eventId", "eventName") VALUES ($1, $2, $3) RETURNING *',
      [studentId, eventId, `{${eventResult.rows[0].eventName}}`] // Format as PostgreSQL array
    );

    await client.query("COMMIT");

    // Return registration with event details
    const registration = {
      ...result.rows[0],
      event: eventResult.rows[0],
    };

    console.log("Registration successful:", registration);
    res.status(201).json(registration);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in registration:", error);
    res.status(400).json({
      message: error.message || "Failed to register for event",
    });
  } finally {
    client.release();
  }
});

app.get("/api/registrations", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const username = req.session.user.username;

  try {
    // Join with Event table and Student table to get all details
    const result = await pool.query(
      `SELECT 
        r.id,
        r."eventId",
        r."eventName"[1] as "eventName", -- Extract first element of the array
        e."eventDate",
        e."eventTime",
        e.venue
       FROM "Registration" r
       JOIN "Event" e ON e.id = r."eventId"
       JOIN "Student" s ON s.id = r."studentId"
       WHERE s.name = $1
       ORDER BY e."eventDate", e."eventTime"`,
      [username]
    );

    console.log(
      `Fetched ${result.rows.length} registrations for user: ${username}`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      message: "Failed to fetch registrations",
      details: error.message,
    });
  }
});

app.post("/api/registrations/clear", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const studentId = req.session.user.studentId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query('DELETE FROM "Registration" WHERE "studentId" = $1', [
      studentId,
    ]);
    await client.query("COMMIT");
    res.json({ message: "All your registrations cleared successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error clearing registrations:", error);
    res.status(500).json({ message: "Failed to clear registrations" });
  } finally {
    client.release();
  }
});

// Error handling middleware
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`CORS enabled for origin: http://localhost:3000`);
});
