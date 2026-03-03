const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.resolve(__dirname, 'jira_clone.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to db:', err);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON;');
      // Create tables
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        color TEXT
      )`);

      // Try adding color column if it doesn't exist to alter older schemas seamlessly
      db.run(`ALTER TABLE users ADD COLUMN color TEXT`, (err) => {
        // ignore error as column probably exists
      });

      db.run(`CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        color TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT,
        assignee_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        rank INTEGER,
        FOREIGN KEY(assignee_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER,
        label_id INTEGER,
        PRIMARY KEY(task_id, label_id),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(label_id) REFERENCES labels(id) ON DELETE CASCADE
      )`);

      // Insert default users if not exists
      db.run(`INSERT OR IGNORE INTO users (id, name, color) VALUES (1, 'User A', '#6366f1'), (2, 'User B', '#a855f7')`);

      // Insert default labels if not exists
      db.get("SELECT count(*) as count FROM labels", (err, row) => {
        if (row && row.count === 0) {
          db.run(`INSERT INTO labels (name, color) VALUES 
            ('Bug', '#ef4444'),
            ('Feature', '#3b82f6'),
            ('Enhancement', '#10b981')`);
        }
      });
    });
  }
});

// --- API ROUTES ---

// USERS
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const userColor = color || '#3b82f6';
  db.run(`INSERT INTO users (name, color) VALUES (?, ?)`, [name, userColor], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, color: userColor });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?`, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, deleted: this.changes });
    });
  });
});

// LABELS
app.get('/api/labels', (req, res) => {
  db.all('SELECT * FROM labels', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/labels', (req, res) => {
  const { name, color } = req.body;
  db.run(`INSERT INTO labels (name, color) VALUES (?, ?)`, [name, color], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, color });
  });
});

// TASKS
app.get('/api/tasks', (req, res) => {
  const query = `
    SELECT t.*, u.name as assignee_name, u.color as assignee_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    ORDER BY t.rank ASC, t.created_at DESC
  `;
  db.all(query, [], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch labels for all tasks
    db.all(`SELECT tl.task_id, l.* FROM task_labels tl JOIN labels l ON tl.label_id = l.id`, [], (labelErr, labels) => {
      if (labelErr) return res.status(500).json({ error: labelErr.message });

      const tasksWithLabels = tasks.map(t => {
        return {
          ...t,
          labels: labels.filter(l => l.task_id === t.id)
        };
      });
      res.json(tasksWithLabels);
    });
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, description, status, assignee_id, label_ids } = req.body;
  const initialStatus = status || 'Backlog';

  db.run(
    `INSERT INTO tasks (title, description, status, assignee_id, rank) 
     SELECT ?, ?, ?, ?, COALESCE(MAX(rank), 0) + 1 FROM tasks WHERE status = ?`,
    [title, description || '', initialStatus, assignee_id || null, initialStatus],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const taskId = this.lastID;

      if (label_ids && label_ids.length > 0) {
        const placeholders = label_ids.map(() => '(?, ?)').join(',');
        const values = [];
        label_ids.forEach(lId => { values.push(taskId, lId); });
        db.run(`INSERT INTO task_labels (task_id, label_id) VALUES ${placeholders}`, values, (err) => {
          if (err) console.error(err);
          res.json({ id: taskId, title, status: initialStatus });
        });
      } else {
        res.json({ id: taskId, title, status: initialStatus });
      }
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, assignee_id, label_ids, rank } = req.body;

  const updates = [];
  const values = [];
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (assignee_id !== undefined) { updates.push('assignee_id = ?'); values.push(assignee_id); }
  if (rank !== undefined) { updates.push('rank = ?'); values.push(rank); }

  const handleLabels = () => {
    if (label_ids !== undefined) {
      db.run(`DELETE FROM task_labels WHERE task_id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (label_ids.length > 0) {
          const placeholders = label_ids.map(() => '(?, ?)').join(',');
          const labelValues = label_ids.flatMap(lId => [id, lId]);
          db.run(`INSERT INTO task_labels (task_id, label_id) VALUES ${placeholders}`, labelValues, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
          });
        } else {
          res.json({ success: true });
        }
      });
    } else {
      res.json({ success: true });
    }
  };

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      handleLabels();
    });
  } else {
    handleLabels();
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM tasks WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});

// Bulk update ranks for drag & drop
app.put('/api/tasks/rank/bulk', (req, res) => {
  const { updates } = req.body; // Array of { id, status, rank }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("UPDATE tasks SET status = ?, rank = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    updates.forEach(u => {
      stmt.run(u.status, u.rank, u.id);
    });
    stmt.finalize();
    db.run("COMMIT", (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route to serve the React app for any unhandled routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
