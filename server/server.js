import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize database
const db = new sqlite3.Database("./database.sqlite");

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

// User registration
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ error: "Email already exists" });
        }
        res.json({ id: this.lastID, email });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// User login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ id: user.id, email: user.email });
  });
});

// Middleware to verify user
function authenticateUser(req, res, next) {
  const userId = req.headers["user-id"];
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

// Get all notes for a user
app.get("/notes", authenticateUser, (req, res) => {
  db.all(
    "SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    [req.userId],
    (err, notes) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      res.json(notes);
    }
  );
});

// Create a new note
app.post("/notes", authenticateUser, (req, res) => {
  console.log("Received note creation request with body:", req.body);
  console.log("User ID:", req.userId);

  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  db.run(
    "INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)",
    [req.userId, title, content],
    function (error) {
      if (error) {
        console.error("Database error:", error);
        return res.status(500).json({
          error: "Internal server error",
          details: error.message,
        });
      }
      console.log("Note inserted with ID:", this.lastID);
      res.status(201).json({
        id: this.lastID,
        user_id: req.userId,
        title: title,
        content: content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  );
});

// Get a single note
app.get("/notes/:id", authenticateUser, (req, res) => {
  db.get(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [req.params.id, req.userId],
    (err, note) => {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    }
  );
});

// Update a note
app.put("/notes/:id", authenticateUser, (req, res) => {
  const { title, content } = req.body;

  if (!title || content === undefined) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  db.run(
    `UPDATE notes 
     SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`,
    [title, content, req.params.id, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Note not found or not owned by user" });
      }
      res.json({
        success: true,
        updatedNote: {
          id: req.params.id,
          title: title,
          content: content,
        },
      });
    }
  );
});

// Delete a note
app.delete("/notes/:id", authenticateUser, (req, res) => {
  db.run(
    "DELETE FROM notes WHERE id = ? AND user_id = ?",
    [req.params.id, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Note not found or not owned by user" });
      }
      res.json({ success: true });
    }
  );
});

const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});