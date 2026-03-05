const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Turso client using user's provided credentials
const db = createClient({
  url: process.env.TURSO_URL || 'libsql://moly-db-k8wi.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI1NzEwNjgsImlkIjoiMDE5Y2I1NzctYzAwMS03ZGIxLWEzMWQtZGRiZDI4YmFlYzA0IiwicmlkIjoiOTE0ODc2MmQtNzViMS00ZTZkLWFiOTAtN2Q3MmM3NmM4NTA5In0.ZdugY_afSaHkgcSLu8O3W-wVi1LvF1ocPHgx3GtD1cNCr05Mfm0jLQFayL7IEpDP1kjcn9H1gZQQ72tJb1oAAA'
});

async function initDB() {
  try {
    // Note: Turso/libSQL enforces PRAGMA foreign_keys = ON by default for compatible queries, 
    // but some statements might still need explicit batching if required.

    await db.execute(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      color TEXT
    )`);

    try {
      await db.execute(`ALTER TABLE users ADD COLUMN color TEXT`);
    } catch (e) { /* ignore if exists */ }

    await db.execute(`CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      color TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT,
      priority TEXT DEFAULT 'Medium',
      assignee_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      rank INTEGER,
      FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
    )`);

    try {
      await db.execute(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Medium'`);
    } catch (e) { /* ignore if exists */ }

    try {
      await db.execute(`ALTER TABLE tasks ADD COLUMN board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE`);
    } catch (e) { /* ignore if exists */ }

    try {
      await db.execute(`ALTER TABLE tasks ADD COLUMN due_date DATETIME`);
    } catch (e) { console.error("Error adding due_date column:", e.message); }

    await db.execute(`CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER,
      label_id INTEGER,
      PRIMARY KEY(task_id, label_id),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(label_id) REFERENCES labels(id) ON DELETE CASCADE
    )`);

    const userResult = await db.execute("SELECT count(*) as count FROM users");
    if (userResult.rows[0].count === 0) {
      await db.execute(`INSERT INTO users (id, name, color) VALUES (1, 'User A', '#6366f1'), (2, 'User B', '#a855f7')`);
    }

    const boardResult = await db.execute("SELECT count(*) as count FROM boards");
    if (boardResult.rows[0].count === 0) {
      await db.execute(`INSERT INTO boards (id, name) VALUES (1, 'APP')`);

      // Migrate existing tasks to the default board if board_id is null
      try {
        await db.execute(`UPDATE tasks SET board_id = 1 WHERE board_id IS NULL`);
      } catch (e) { console.error('Migration error:', e); }
    }

    const result = await db.execute("SELECT count(*) as count FROM labels");
    if (result.rows[0].count === 0) {
      await db.execute(`INSERT INTO labels (name, color) VALUES 
        ('Bug', '#ef4444'),
        ('Feature', '#3b82f6'),
        ('Enhancement', '#10b981')`);
    }

    console.log('Connected to Turso database and initialized schema.');
  } catch (err) {
    console.error('Initial DB Error:', err);
  }
}
initDB();

// --- API ROUTES ---

// --- BOARDS API ---
app.get('/api/boards', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM boards ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/boards', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const insertResult = await db.execute({
      sql: `INSERT INTO boards (name) VALUES (?)`,
      args: [name]
    });
    res.json({ id: parseInt(insertResult.lastInsertRowid.toString()), name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/boards/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    await db.execute({
      sql: `UPDATE boards SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [name, id]
    });
    res.json({ success: true, id: parseInt(id), name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/boards/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.execute({ sql: `DELETE FROM boards WHERE id = ?`, args: [id] });
    res.json({ success: true, deleted: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- USERS API ---
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const userColor = color || '#3b82f6';

  try {
    const insertResult = await db.execute({
      sql: `INSERT INTO users (name, color) VALUES (?, ?)`,
      args: [name, userColor]
    });
    res.json({ id: parseInt(insertResult.lastInsertRowid.toString()), name, color: userColor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: `UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?`, args: [id] });
    const result = await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [id] });
    res.json({ success: true, deleted: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/labels', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM labels');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/labels', async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await db.execute({ sql: `INSERT INTO labels (name, color) VALUES (?, ?)`, args: [name, color] });
    res.json({ id: parseInt(result.lastInsertRowid.toString()), name, color });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/labels/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
  try {
    await db.execute({ sql: `UPDATE labels SET name = ?, color = ? WHERE id = ?`, args: [name, color, id] });
    res.json({ success: true, id, name, color });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/labels/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: `DELETE FROM task_labels WHERE label_id = ?`, args: [id] });
    const result = await db.execute({ sql: `DELETE FROM labels WHERE id = ?`, args: [id] });
    res.json({ success: true, deleted: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  const { boardId } = req.query;
  const query = `
    SELECT t.*, u.name as assignee_name, u.color as assignee_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    ${boardId ? 'WHERE t.board_id = ?' : ''}
    ORDER BY t.rank ASC, t.created_at DESC
  `;
  try {
    const taskResult = await db.execute({
      sql: query,
      args: boardId ? [boardId] : []
    });
    const labelResult = await db.execute(`SELECT tl.task_id, l.* FROM task_labels tl JOIN labels l ON tl.label_id = l.id`);

    const tasksWithLabels = taskResult.rows.map(t => {
      return {
        ...t,
        labels: labelResult.rows.filter(l => l.task_id === t.id)
      };
    });
    res.json(tasksWithLabels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { title, description, status, priority, assignee_id, label_ids, board_id, due_date } = req.body;
  const initialStatus = status || 'Backlog';
  const initialPriority = priority || 'Medium';
  const targetBoardId = board_id || 1; // Default to APP if none provided

  console.log("POST /api/tasks req.body:", req.body);

  try {
    // For Turso, SQLite max subqueries are a bit sensitive but standard SQL works. 
    // We will do rank calc directly before
    const rankResult = await db.execute({
      sql: `SELECT COALESCE(MAX(rank), 0) + 1 as newRank FROM tasks WHERE status = ? AND board_id = ?`,
      args: [initialStatus, targetBoardId]
    });
    const nextRank = rankResult.rows[0].newRank;

    const taskResult = await db.execute({
      sql: `INSERT INTO tasks (board_id, title, description, status, priority, assignee_id, due_date, rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [targetBoardId, title, description || '', initialStatus, initialPriority, assignee_id || null, due_date || null, nextRank]
    });

    const taskId = parseInt(taskResult.lastInsertRowid.toString());

    if (label_ids && label_ids.length > 0) {
      const inserts = label_ids.map(lId => ({
        sql: `INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`,
        args: [taskId, lId]
      }));
      // Execute as a quick batch
      await db.batch(inserts);
    }

    res.json({ id: taskId, title, status: initialStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, assignee_id, label_ids, rank, due_date } = req.body;

  console.log(`PUT /api/tasks/${id} req.body:`, req.body);

  const updates = [];
  const args = [];
  if (title !== undefined) { updates.push('title = ?'); args.push(title); }
  if (description !== undefined) { updates.push('description = ?'); args.push(description); }
  if (status !== undefined) { updates.push('status = ?'); args.push(status); }
  if (priority !== undefined) { updates.push('priority = ?'); args.push(priority); }
  if (assignee_id !== undefined) { updates.push('assignee_id = ?'); args.push(assignee_id); }
  if (due_date !== undefined) { updates.push('due_date = ?'); args.push(due_date); }
  if (rank !== undefined) { updates.push('rank = ?'); args.push(rank); }

  try {
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      args.push(id);
      await db.execute({ sql: `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, args });
    }

    if (label_ids !== undefined) {
      await db.execute({ sql: `DELETE FROM task_labels WHERE task_id = ?`, args: [id] });
      if (label_ids.length > 0) {
        const inserts = label_ids.map(lId => ({
          sql: `INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`,
          args: [id, lId]
        }));
        await db.batch(inserts);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.execute({ sql: `DELETE FROM tasks WHERE id = ?`, args: [id] });
    res.json({ success: true, deleted: result.rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update ranks for drag & drop
app.put('/api/tasks/rank/bulk', async (req, res) => {
  const { updates } = req.body;
  try {
    const batchOps = updates.map(u => ({
      sql: "UPDATE tasks SET status = ?, rank = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [u.status, u.rank, u.id]
    }));
    await db.batch(batchOps, "write");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
