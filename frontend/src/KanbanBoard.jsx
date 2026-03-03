import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import UserModal from './UserModal';
import api from './api';

const columns = [
    { id: 'Backlog', title: 'Backlog' },
    { id: 'In Progress', title: 'In Progress' },
    { id: 'Done', title: 'Done' }
];

export default function KanbanBoard() {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [labels, setLabels] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // Filters
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedLabelId, setSelectedLabelId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [fetchedTasks, fetchedUsers, fetchedLabels] = await Promise.all([
                api.getTasks(),
                api.getUsers(),
                api.getLabels()
            ]);
            setTasks(fetchedTasks);
            setUsers(fetchedUsers);
            setLabels(fetchedLabels);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    const onDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const sourceStatus = source.droppableId;
        const destStatus = destination.droppableId;

        const newTasks = Array.from(tasks);
        const draggedTaskIndex = newTasks.findIndex(t => t.id === parseInt(draggableId));
        if (draggedTaskIndex === -1) return;

        const draggedTask = { ...newTasks[draggedTaskIndex] };

        const destTasks = newTasks.filter(t => t.status === destStatus).sort((a, b) => a.rank - b.rank);
        if (sourceStatus === destStatus) {
            destTasks.splice(source.index, 1);
        }

        let newRank;
        if (destTasks.length === 0) {
            newRank = 1000;
        } else if (destination.index === 0) {
            newRank = destTasks[0].rank - 1000;
        } else if (destination.index === destTasks.length) {
            newRank = destTasks[destTasks.length - 1].rank + 1000;
        } else {
            newRank = (destTasks[destination.index - 1].rank + destTasks[destination.index].rank) / 2;
        }

        draggedTask.status = destStatus;
        draggedTask.rank = newRank;

        newTasks[draggedTaskIndex] = draggedTask;
        setTasks([...newTasks].sort((a, b) => a.rank - b.rank));

        try {
            await api.updateTask(draggedTask.id, { status: destStatus, rank: newRank });
        } catch (err) {
            console.error(err);
            fetchData(); // Rollback UI if API fails
        }
    };

    const openNewTaskModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const openEditTaskModal = (task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const closeUserModal = () => {
        setIsUserModalOpen(false);
    };

    const handleLabelCreate = async (labelData) => {
        try {
            const created = await api.createLabel(labelData);
            setLabels([...labels, created]);
            return created;
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleUserCreate = async (userData) => {
        try {
            const created = await api.createUser(userData);
            setUsers([...users, created]);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleUserDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? Their assigned tasks will become unassigned.")) return;
        try {
            await api.deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
            fetchData(); // Refresh tasks to show unassigned
        } catch (err) {
            console.error(err);
        }
    };

    const handleTaskSave = async (taskData) => {
        try {
            if (taskData.id) {
                await api.updateTask(taskData.id, taskData);
            } else {
                await api.createTask(taskData);
            }
            fetchData();
            closeModal();
        } catch (err) {
            console.error(err);
        }
    };

    const handleTaskDelete = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await api.deleteTask(taskId);
            fetchData();
            closeModal();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <h1>MOLY</h1>
                <div className="toolbar">
                    <div className="stats-card">
                        <div className="stats-item">Total Tasks <span className="stats-count">{tasks.length}</span></div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setIsUserModalOpen(true)}>Manage Users</button>
                    <button className="btn btn-primary" onClick={openNewTaskModal}>+ Create Task</button>
                </div>
            </header>

            {/* Main Layout containing Board and Sidebar */}
            <div className="main-wrapper">
                <div className="board-container">
                    <DragDropContext onDragEnd={onDragEnd}>
                        {columns.map(col => {
                            // Apply filters
                            const filteredTasks = tasks.filter(t => {
                                const matchUser = selectedUserId === null || t.assignee_id === selectedUserId;
                                const matchLabel = selectedLabelId === '' || t.labels?.some(l => l.id.toString() === selectedLabelId.toString());
                                return t.status === col.id && matchUser && matchLabel;
                            });
                            const columnTasks = filteredTasks.sort((a, b) => a.rank - b.rank);
                            return (
                                <KanbanColumn
                                    key={col.id}
                                    column={col}
                                    tasks={columnTasks}
                                    onTaskClick={openEditTaskModal}
                                />
                            );
                        })}
                    </DragDropContext>
                </div>

                {/* Dashboard & Filters Sidebar */}
                <aside className="dashboard-sidebar">
                    <div className="dashboard-section">
                        <span className="dashboard-section-title">Task Load</span>
                        <div className="dashboard-users">
                            <div
                                className={`user-row ${selectedUserId === null ? 'selected' : ''}`}
                                onClick={() => setSelectedUserId(null)}
                            >
                                <div className="metric-avatar" title="All Users" style={{ backgroundColor: 'var(--border-color)' }}>
                                    All
                                </div>
                                <span className="user-name">All Users</span>
                            </div>
                            {users.map(u => {
                                const userTaskCount = tasks.filter(t => t.assignee_id === u.id).length;
                                return (
                                    <div
                                        key={u.id}
                                        className={`user-row ${selectedUserId === u.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                                    >
                                        <div className="metric-avatar" title={u.name} style={{ backgroundColor: u.color }}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="user-name">{u.name}</span>
                                        <span className="metric-inline">{userTaskCount}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="dashboard-section">
                        <span className="dashboard-section-title">Filter by Label</span>
                        <div className="dashboard-filters">
                            <select
                                className="filter-dropdown"
                                value={selectedLabelId}
                                onChange={(e) => setSelectedLabelId(e.target.value)}
                            >
                                <option value="">All Labels</option>
                                {labels.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            {(selectedUserId !== null || selectedLabelId !== '') && (
                                <button
                                    className="filter-clear"
                                    onClick={() => { setSelectedUserId(null); setSelectedLabelId(''); }}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                </aside>
            </div>



            {isModalOpen && (
                <TaskModal
                    task={editingTask}
                    users={users}
                    labels={labels}
                    onClose={closeModal}
                    onSave={handleTaskSave}
                    onLabelCreate={handleLabelCreate}
                    onDelete={handleTaskDelete}
                />
            )}

            {isUserModalOpen && (
                <UserModal
                    users={users}
                    onClose={closeUserModal}
                    onSave={handleUserCreate}
                    onDelete={handleUserDelete}
                />
            )}
        </div>
    );
}
