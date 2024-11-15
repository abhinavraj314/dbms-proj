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
// Add this helper function for email sending
const sendRegistrationEmail = async (email, eventName, teamName, role) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Team Registration Confirmation - ${eventName}`,
      html: `
        <h1>Team Registration Confirmation</h1>
        <p>You have been registered for ${eventName} as part of team "${teamName}".</p>
        <p>Please arrive on time for the event.</p>
      `,
    });
  } catch (error) {
    console.error("Error sending registration email:", error);
  }
};
// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000", // Your React app URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Important for cookies/session handling
  })
);
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
const validateRegistration = (req, res, next) => {
  const { eventId, teamName, teamMembers } = req.body;

  if (!eventId || typeof eventId !== "number") {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  if (!teamName || typeof teamName !== "string" || teamName.length < 3) {
    return res
      .status(400)
      .json({ message: "Team name must be at least 3 characters long" });
  }

  if (!Array.isArray(teamMembers) || teamMembers.length !== 2) {
    return res
      .status(400)
      .json({ message: "Please provide exactly 2 team members" });
  }

  if (!teamMembers.every((id) => typeof id === "number")) {
    return res.status(400).json({ message: "Invalid team member IDs" });
  }

  next();
};

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
// POST endpoint
// Registration route for team events
// POST /api/registrations
app.post("/api/registrations", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { eventId, teamName, teamMembers } = req.body;
  const username = req.session.user.username;

  try {
    await pool.query("BEGIN");

    // Get leader's information
    const leaderResult = await pool.query(
      'SELECT id, email FROM "Student" WHERE name = $1',
      [username]
    );

    if (leaderResult.rows.length === 0) {
      throw new Error("Student not found");
    }

    const leaderId = leaderResult.rows[0].id;
    const leaderEmail = leaderResult.rows[0].email;

    // Check if event exists
    const eventResult = await pool.query(
      'SELECT "eventName" FROM "Event" WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      throw new Error("Event not found");
    }

    const eventName = eventResult.rows[0].eventName;

    // Validate unique team members
    const uniqueMembers = new Set(teamMembers);
    if (uniqueMembers.size !== teamMembers.length) {
      throw new Error("Duplicate team members are not allowed");
    }

    // Check if any team member is already in a team for this event
    const existingTeamMembers = await pool.query(
      `SELECT tm."studentId" 
       FROM "TeamMember" tm 
       JOIN "Team" t ON tm."teamId" = t.id 
       WHERE t."eventId" = $1 
       AND tm."studentId" = ANY($2)`,
      [eventId, [leaderId, ...teamMembers]]
    );

    if (existingTeamMembers.rows.length > 0) {
      const existingIds = existingTeamMembers.rows.map((row) => row.studentId);
      throw new Error(
        `Students with IDs ${existingIds.join(
          ", "
        )} are already in a team for this event`
      );
    }

    // Check if any team member is already registered for this event
    const existingRegistrations = await pool.query(
      'SELECT "studentId" FROM "Registration" WHERE "eventId" = $1 AND "studentId" = ANY($2)',
      [eventId, [leaderId, ...teamMembers]]
    );

    if (existingRegistrations.rows.length > 0) {
      const existingIds = existingRegistrations.rows.map(
        (row) => row.studentId
      );
      throw new Error(
        `Students with IDs ${existingIds.join(
          ", "
        )} are already registered for this event`
      );
    }

    // Create a new team
    const newTeamResult = await pool.query(
      'INSERT INTO "Team" ("eventId", "teamName") VALUES ($1, $2) RETURNING id',
      [eventId, teamName]
    );

    const teamId = newTeamResult.rows[0].id;

    // Create registration and team membership for the leader
    await pool.query(
      'INSERT INTO "Registration" ("studentId", "eventId", "eventName") VALUES ($1, $2, $3)',
      [leaderId, eventId, `{${eventName}}`]
    );

    await pool.query(
      'INSERT INTO "TeamMember" ("teamId", "studentId") VALUES ($1, $2)',
      [teamId, leaderId]
    );

    // Process team members
    for (const memberId of teamMembers) {
      // Verify student exists
      const memberResult = await pool.query(
        'SELECT id, email FROM "Student" WHERE id = $1',
        [memberId]
      );

      if (memberResult.rows.length === 0) {
        throw new Error(`Student with ID ${memberId} not found`);
      }

      // Create registration for team member
      await pool.query(
        'INSERT INTO "Registration" ("studentId", "eventId", "eventName") VALUES ($1, $2, $3)',
        [memberId, eventId, `{${eventName}}`]
      );

      // Add to TeamMember
      await pool.query(
        'INSERT INTO "TeamMember" ("teamId", "studentId") VALUES ($1, $2)',
        [teamId, memberId]
      );
    }

    await pool.query("COMMIT");

    // Send confirmation emails
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: leaderEmail,
        subject: `Team Registration Confirmation - ${teamName}`,
        html: `
          <h1>Team Registration Confirmation</h1>
          <p>Your team "${teamName}" has been registered successfully for event "${eventName}".</p>
          <p>You have been registered as the team leader.</p>
        `,
      });

      for (const memberId of teamMembers) {
        const memberEmail = (
          await pool.query('SELECT email FROM "Student" WHERE id = $1', [
            memberId,
          ])
        ).rows[0].email;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: memberEmail,
          subject: `Team Registration Confirmation - ${teamName}`,
          html: `
            <h1>Team Registration Confirmation</h1>
            <p>You have been added to team "${teamName}" by ${username} for event "${eventName}".</p>
          `,
        });
      }
    } catch (emailError) {
      console.error("Error sending confirmation emails:", emailError);
    }

    res.status(201).json({
      message: "Team registration successful",
      teamId,
      teamName,
      teamMembers: [leaderId, ...teamMembers],
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error in team registration:", error);
    res.status(400).json({
      message: error.message || "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});
// GET /api/registrations
app.get("/api/registrations", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Not authenticated",
      registrations: [],
    });
  }

  const username = req.session.user.username;

  try {
    const result = await pool.query(
      `SELECT 
        r.id,
        r."eventId",
        e."eventName",
        e."eventDate", 
        e."eventTime",
        e.venue,
        t.id as "teamId",
        t."teamName",
        array_agg(tm."studentId") as "teamMembers"
      FROM "Registration" r
      JOIN "Student" s ON s.id = r."studentId"
      LEFT JOIN "Event" e ON e.id = r."eventId"
      LEFT JOIN "TeamMember" tm ON tm."studentId" = r."studentId"
      LEFT JOIN "Team" t ON t.id = tm."teamId" AND t."eventId" = r."eventId"
      WHERE s.name = $1
      GROUP BY r.id, e."eventName", e."eventDate", e."eventTime", e.venue, t.id, t."teamName"
      ORDER BY e."eventDate" DESC NULLS LAST, e."eventTime" ASC NULLS LAST`,
      [username]
    );

    const formattedResults = result.rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventName: row.eventName,
      eventDate: row.eventDate
        ? row.eventDate.toISOString().split("T")[0]
        : "Date not available",
      eventTime: row.eventTime
        ? row.eventTime.toString().slice(0, 5)
        : "Time not available",
      venue: row.venue || "Venue not specified",
      teamId: row.teamId,
      teamName: row.teamName,
      teamMembers: row.teamMembers,
    }));

    res.json({
      registrations: formattedResults,
      message: "Registrations fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      message: "Failed to fetch registrations",
      registrations: [],
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});
app.post("/api/registrations/clear", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const username = req.session.user.username;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      'DELETE FROM "Registration" WHERE "studentId" = (SELECT id FROM "Student" WHERE name = $1)',
      [username]
    );
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
