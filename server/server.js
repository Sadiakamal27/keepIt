import express from "express";
import { WebSocketServer } from "ws";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import cors from "cors";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database("./database.sqlite");

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT DEFAULT 'Untitled',
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS collaborators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER,
      email TEXT NOT NULL,
      permission TEXT DEFAULT 'read',
      token TEXT UNIQUE,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
});

// Authentication middleware
function authenticateUser(req, res, next) {
  const userId = req.headers["user-id"];
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  db.get("SELECT id FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) return res.status(401).json({ error: "Unauthorized" });
    req.userId = userId;
    next();
  });
}

// Generate a random token
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Collaboration Endpoints

// Generate collaboration token
app.post("/notes/:noteId/collaborate", authenticateUser, (req, res) => {
  const noteId = req.params.noteId;
  const userId = req.userId;

  db.get("SELECT id FROM notes WHERE id = ? AND user_id = ?", [noteId, userId], (err, note) => {
    if (err || !note) {
      return res.status(404).json({ error: "Note not found or not authorized" });
    }

    const token = generateToken();
    
    db.run(
      "INSERT INTO collaborators (note_id, email, permission, token) VALUES (?, (SELECT email FROM users WHERE id = ?), 'read', ?)",
      [noteId, userId, token],
      function(err) {
        if (err) return res.status(500).json({ error: "Failed to generate token" });
        res.status(200).json({ token });
      }
    );
  });
});

// Get note with collaboration token
app.get("/notes/collaborate/:noteId", (req, res) => {
  const noteId = req.params.noteId;
  const token = req.headers["collaboration-token"];

  if (!token) return res.status(401).json({ error: "Token required" });

  db.get(
    `SELECT n.*, c.permission 
     FROM notes n
     JOIN collaborators c ON n.id = c.note_id
     WHERE n.id = ? AND c.token = ?`,
    [noteId, token],
    (err, note) => {
      if (err || !note) {
        return res.status(404).json({ error: "Note not found or invalid token" });
      }
      res.status(200).json(note);
    }
  );
});

// Add collaborator
app.post("/notes/:noteId/collaborators", authenticateUser, (req, res) => {
  const noteId = req.params.noteId;
  const { email, permission } = req.body;
  const userId = req.userId;

  // Verify user owns the note
  db.get("SELECT id FROM notes WHERE id = ? AND user_id = ?", [noteId, userId], (err, note) => {
    if (err || !note) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Verify email exists
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
      if (err || !user) {
        return res.status(400).json({ error: "User not found" });
      }

      const token = generateToken();
      
      db.run(
        "INSERT INTO collaborators (note_id, email, permission, token) VALUES (?, ?, ?, ?)",
        [noteId, email, permission || 'read', token],
        function(err) {
          if (err) return res.status(500).json({ error: "Failed to add collaborator" });
          
          // Send email invitation
          const inviteLink = `http://localhost:3000/collaborate/${noteId}?token=${token}`;
          sendInviteEmail(email, inviteLink);
          
          res.status(200).json({ success: true });
        }
      );
    });
  });
});

// Get collaborators for a note
app.get("/notes/:noteId/collaborators", authenticateUser, (req, res) => {
  const noteId = req.params.noteId;
  const userId = req.userId;

  // Verify user owns the note or is a collaborator
  db.get(
    `SELECT 1 FROM notes WHERE id = ? AND user_id = ?
     UNION
     SELECT 1 FROM collaborators WHERE note_id = ? AND email = (SELECT email FROM users WHERE id = ?)`,
    [noteId, userId, noteId, userId],
    (err, result) => {
      if (err || !result) {
        return res.status(403).json({ error: "Not authorized" });
      }

      db.all(
        "SELECT email, permission FROM collaborators WHERE note_id = ?",
        [noteId],
        (err, collaborators) => {
          if (err) return res.status(500).json({ error: "Database error" });
          res.status(200).json(collaborators);
        }
      );
    }
  );
});

// Helper function to send invite emails
function sendInviteEmail(toEmail, inviteLink) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Invitation to collaborate on a note",
    text: `You've been invited to collaborate on a note. Click this link to access it: ${inviteLink}`,
    html: `<p>You've been invited to collaborate on a note. <a href="${inviteLink}">Click here</a> to access it.</p>`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("Email send error:", err);
    else console.log("Email sent:", info.response);
  });
}

// WebSocket server for real-time collaboration
const server = app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
  const noteId = req.url.split('/')[2]; // Extract noteId from URL
  
  ws.on("message", (message) => {
    // Broadcast updates to all clients in the same note room
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          noteId,
          content: message.toString()
        }));
      }
    });
  });
});

server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/collaborate/")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});