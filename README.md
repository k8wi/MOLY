# MOLY

MOLY is a fast, lightweight, and responsive Jira-like issue tracking application. It features a modern dark-mode Kanban board with drag-and-drop mechanics, fully dynamic labeling, and user assignment capabilities.

## ✨ Features

- **Kanban Board**: Organize tasks into "Backlog", "In Progress", and "Done" columns.
- **Multiple Boards**: Create, rename, delete, and switch between completely isolated Kanban boards (Defaults to "APP" board).
- **Drag-and-Drop**: Seamlessly reorder tasks within columns or move them across statuses.
- **Task Priorities**: Assign Low, Medium, or High priorities with distinct visual color cues on the cards.
- **Due Dates**: Set completion dates for tasks with smart, dynamic text indicating "Due in X days" or "Overdue".
- **Dynamic Task Management**: Create, edit, and safely delete tasks. 
- **Custom Users**: Create users with custom color profiles to easily identify task assignments at a glance on the board.
- **Custom Labels**: Dynamically create and assign multi-colored labels to tasks.
- **Premium Dark Mode UI**: A beautiful, aesthetically pleasing dark theme with subtle micro-animations.
- **Cloud Database**: Fast remote connection powered by Turso (libSQL) using a distributed, lightweight backend.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, CSS (Vanilla), `@hello-pangea/dnd` for drag-and-drop, Axios.
- **Backend**: Node.js, Express, `@libsql/client`.
- **Database**: Turso Cloud Database (SQLite-compatible).

## 🚀 Getting Started Locally

To run MOLY on your local machine, you need to start both the frontend development server and the backend API server.

### 1. Start the Backend Server

Navigate to the `backend` directory, install dependencies, and start the local server.

```bash
cd backend
npm install
node server.js
```
*Note: The server will start on port `3001` and automatically connect to your configured Turso database for persistence.*

### 2. Start the Frontend Application

Open a new terminal window, navigate to the `frontend` directory, install dependencies, and start the Vite development server.

```bash
cd frontend
npm install
npm run dev
```

Visit the local URL provided by Vite (usually `http://localhost:5173`) in your browser to start using MOLY!

## 📦 Preparing for Production Deployment

MOLY's backend is configured to serve the built frontend assets statically, making it a unified application ready for hosting on any Node.js environment (like an Oracle Cloud VPS, Render, or Fly.io). Your data is safely persisted in the Turso Cloud Database independent of the host container.

1. Build the React frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. The built files will be located in `frontend/dist`.
3. Start the backend:
   ```bash
   cd backend
   npm start
   ```
4. Navigate to your server's exposed URL (or `http://localhost:3001` locally) to view the fully compiled production app!
