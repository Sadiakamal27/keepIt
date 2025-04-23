const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize database
const db = new sqlite3.Database('./database.sqlite');

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
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
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
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        res.json({ id: this.lastID, email });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ id: user.id, email: user.email });
  });
});

// CRUD operations for records (protected routes)
// Middleware to verify user
function authenticateUser(req, res, next) {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = userId;
  next();
}

// Get all records for a user
app.get('/records', authenticateUser, (req, res) => {
  db.all(
    'SELECT * FROM records WHERE user_id = ?',
    [req.userId],
    (err, records) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(records);
    }
  );
});

// Add a new record
app.post('/records', authenticateUser, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  db.run(
    'INSERT INTO records (user_id, name, email) VALUES (?, ?, ?)',
    [req.userId, name, email],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ id: this.lastID, name, email });
    }
  );
});

// Delete a record
app.delete('/records/:id', authenticateUser, (req, res) => {
  db.run(
    'DELETE FROM records WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json({ success: true });
    }
  );
});

//getting all notes for a user
app.get('/notes', authenticateUser, (req, res) => {
  db.all(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
    [req.userId],
    (err, notes) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(notes);
    }
  )

});

//get a single note
app.get('/notes/:id', authenticateUser, (req, res) => {
  db.all(
    'SELECT * FROM notes WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    (err, note) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      res.json(note);
    }
  )
});


//create a new note
app.post('/notes', authenticateUser, (req, res) => {

  const [title, content] = req.body;

  const finalTitle = title || "Untitled";
  const finalContent = content || " ";

  db.run(
    'INSERT INTO notes (user_id , title , content ) VALUE (? ,? , ?)'
    [req.userId, finalTitle, finalContent],
    function (error) {
      if (error) {
        return res.status(500).json({ error: "INTERNAL SERVER ERROR" })
      }
      res.json(
        {
          id:this.lastID,
          title: finalTitle,
          content:finalContent,
          user_id: req.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
        }
      )
    }
  )

});


//update a note
app.put('/notes/:id', authenticateUser, (req, res) => {
  const { title, content = "" } = req.body;  // Default content to empty string
  
  // No content validation - allow empty updates
  db.run(
    `UPDATE notes 
     SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`,
    [title || 'Untitled', content, req.params.id, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found or not owned by user' });
      }
      res.json({ 
        success: true,
        updatedNote: {
          id: req.params.id,
          title: title || 'Untitled',
          content: content || ""
        }
      });
    }
  );
});

//delete a note

app.delete('/notes/:id', authenticateUser, (req, res) => {
  db.run(
    'DELETE FROM notes WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found or not owned by user' });
      }
      res.json({ success: true });
    }
  );
});

const PORT = 5000;
// Add this near your other routes (before app.listen)
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
