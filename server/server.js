import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize database
const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
  );

  db.run(
    "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL DEFAULT 'Untitled', content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))"
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS collaborators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )`
  );

  // Add the email column if it doesn't exist
  db.run(
    `ALTER TABLE collaborators ADD COLUMN email TEXT`,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Error adding email column to collaborators:", err);
      } else {
        console.log("Email column added to collaborators table (or already exists).");
      }
    }
  );
  db.run(
    `ALTER TABLE collaborators ADD COLUMN permission TEXT NOT NULL DEFAULT 'read'`,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Error adding permission column to collaborators:", err);
      } else {
        console.log("Permission column added to collaborators table (or already exists).");
      }
    }
  );

  db.run(
    `ALTER TABLE collaborators ADD COLUMN token TEXT UNIQUE`,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Error adding token column to collaborators:", err);
      } else {
        console.log("Token column added to collaborators table (or already exists).");
      }
    }
  );
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

// Generate share token for a note
app.post("/notes/:noteId/share-token", authenticateUser, (req, res) => {
  const { noteId } = req.params;
  const userId = req.userId;
  const { permission } = req.body;

  if (!['read', 'full'].includes(permission)) {
    return res.status(400).json({ error: "Invalid permission. Must be 'read' or 'full'" });
  }

  db.get(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId],
    (err, note) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!note) {
        return res.status(403).json({ error: "Unauthorized or note not found" });
      }

      const token = crypto.randomUUID();
      db.run(
        "INSERT INTO collaborators (note_id, email, permission, token) VALUES (?, ?, ?, ?)",
        [noteId, null, permission, token],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Failed to generate share token" });
          }
          res.json({ token });
        }
      );
    }
  );
});
// Add collaborator
app.post("/notes/:id/collaborators", authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { email, permission } = req.body;

  if (!email || !permission) {
    return res.status(400).json({ error: "Email and permission are required" });
  }

  const token = crypto.randomBytes(16).toString("hex");

  db.get(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [id, req.userId],
    (err, note) => {
      if (err) return res.status(500).json({ error: "Internal server error" });
      if (!note) return res.status(404).json({ error: "Note not found or not owned" });

      db.run(
        "INSERT INTO collaborators (note_id, email, permission, token) VALUES (?, ?, ?, ?)",
        [id, email, permission, token],
        function (err) {
          if (err) {
            return res.status(400).json({ error: "Failed to add collaborator" });
          }
          res.json({ success: true, token });
        }
      );
    }
  );
});

// Fetch collaborators for a note
app.get("/notes/:id/collaborators", authenticateUser, (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [id, req.userId],
    (err, note) => {
      if (err) return res.status(500).json({ error: "Internal server error" });
      if (!note) return res.status(404).json({ error: "Note not found or not owned" });

      db.all(
        "SELECT email, permission FROM collaborators WHERE note_id = ?",
        [id],
        (err, collaborators) => {
          if (err) return res.status(500).json({ error: "Internal server error" });
          res.json(collaborators);
        }
      );
    }
  );
});

// Generate share token for a note
app.post("/notes/:noteId/share-token", authenticateUser, (req, res) => {
  const { noteId } = req.params;
  const userId = req.userId;
  const { permission } = req.body; // Get permission from request body

  // Validate permission
  if (!['read', 'full'].includes(permission)) {
    return res.status(400).json({ error: "Invalid permission. Must be 'read' or 'full'" });
  }

  db.get(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    [noteId, userId],
    (err, note) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!note) {
        return res.status(403).json({ error: "Unauthorized or note not found" });
      }

      const token = crypto.randomUUID();
      db.run(
        "INSERT INTO collaborators (note_id, email, permission, token) VALUES (?, ?, ?, ?)",
        [noteId, null, permission, token], // Use permission from request body
        function (err) {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Failed to generate share token" });
          }
          res.json({ token });
        }
      );
    }
  );
});

// Get note for collaborator
app.get("/notes/:noteId/collaborate", (req, res) => {
  const { noteId } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  db.get(
    "SELECT notes.id, notes.title, notes.content, collaborators.permission FROM notes JOIN collaborators ON notes.id = collaborators.note_id WHERE notes.id = ? AND collaborators.token = ?",
    [noteId, token],
    (err, row) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!row) {
        return res.status(403).json({ error: "Invalid token" });
      }
      res.json({ note: { id: row.id, title: row.title, content: row.content }, permission: row.permission });
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
app.put("/notes/:id", (req, res) => {
  const { title, content } = req.body;
  const userId = req.headers["user-id"];
  const token = req.headers.authorization?.split(" ")[1];

  if (!title || content === undefined) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  let query, params;
  if (userId) {
    query = "UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?";
    params = [title, content, req.params.id, userId];
  } else if (token) {
    query = `
      UPDATE notes 
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND id IN (
        SELECT note_id FROM collaborators WHERE token = ? AND permission IN ('write', 'full')
      )
    `;
    params = [title, content, req.params.id, token];
  } else {
    return res.status(401).json({ error: "Authentication required" });
  }

  db.run(query, params, function (err) {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Note not found or not authorized" });
    }
    res.json({
      success: true,
      updatedNote: {
        id: req.params.id,
        title: title,
        content: content,
      },
    });
  });
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