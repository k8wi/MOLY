import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import SettingsModal from './SettingsModal';
import api from './api';

const columns = [
    { id: 'Backlog', title: 'Backlog' },
    { id: 'In Progress', title: 'In Progress' },
    { id: 'Done', title: 'Done' }
];

export default function KanbanBoard() {
    const [boards, setBoards] = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [labels, setLabels] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // Filters
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedLabelId, setSelectedLabelId] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('');

    useEffect(() => {
        fetchData();
    }, [selectedBoardId]); // Re-fetch when board changes

    const fetchData = async () => {
        try {
            // First fetch boards if not loaded
            let currentBoards = boards;
            if (currentBoards.length === 0) {
                currentBoards = await api.getBoards();
                setBoards(currentBoards);
            }

            // Determine active board ID
            let activeBoardId = selectedBoardId;
            if (!activeBoardId && currentBoards.length > 0) {
                activeBoardId = currentBoards[0].id;
                setSelectedBoardId(activeBoardId);
            }

            if (!activeBoardId) return; // No boards exist

            const [fetchedTasks, fetchedUsers, fetchedLabels] = await Promise.all([
                api.getTasks(activeBoardId),
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

    const handleLabelSave = (savedLabel) => {
        setLabels(prev => {
            const exists = prev.find(l => l.id === savedLabel.id);
            if (exists) {
                return prev.map(l => l.id === savedLabel.id ? savedLabel : l);
            }
            return [...prev, savedLabel];
        });
        fetchData(); // Refresh tasks to reflect new label colors/names if rendered there
    };

    const handleLabelDelete = (deletedId) => {
        setLabels(prev => prev.filter(l => l.id !== deletedId));
        fetchData(); // Refresh tasks in case they lost a label
    };

    const handleTaskSave = async (taskData) => {
        try {
            if (taskData.id) {
                await api.updateTask(taskData.id, taskData);
            } else {
                await api.createTask({ ...taskData, board_id: selectedBoardId });
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

    const handleBoardSave = (savedBoard) => {
        setBoards(prev => {
            const exists = prev.find(b => b.id === savedBoard.id);
            if (exists) {
                return prev.map(b => b.id === savedBoard.id ? savedBoard : b);
            }
            return [...prev, savedBoard];
        });
        // Select the newly created board automatically
        if (!boards.find(b => b.id === savedBoard.id)) {
            setSelectedBoardId(savedBoard.id);
        }
    };

    const handleBoardDelete = (deletedId) => {
        const newBoards = boards.filter(b => b.id !== deletedId);
        setBoards(newBoards);
        if (selectedBoardId === deletedId && newBoards.length > 0) {
            setSelectedBoardId(newBoards[0].id);
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/MOLY.png" alt="MOLY Logo" style={{ height: '32px', width: 'auto' }} />
                    <h1 style={{ margin: 0 }}>MOLY</h1>

                    <select
                        className="board-select"
                        value={selectedBoardId || ''}
                        onChange={(e) => setSelectedBoardId(parseInt(e.target.value))}
                    >
                        {boards.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="toolbar">
                    <div className="stats-card">
                        <div className="stats-item">Total Tasks <span className="stats-count">{tasks.length}</span></div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setIsSettingsModalOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Settings
                    </button>
                    <button className="btn btn-primary" onClick={openNewTaskModal}>+ Create Task</button>
                </div>
            </header>

            {/* Main Layout containing Board and Sidebar */}
            <div className="main-wrapper">
                <div className="board-container">
                    <DragDropContext onDragEnd={onDragEnd}>
                        {columns.map(col => {
                            const filteredTasks = tasks.filter(t => {
                                const matchUser = selectedUserId === null || t.assignee_id === selectedUserId;
                                const matchLabel = selectedLabelId === '' || t.labels?.some(l => l.id.toString() === selectedLabelId.toString());
                                const matchPriority = selectedPriority === '' || t.priority === selectedPriority;
                                return t.status === col.id && matchUser && matchLabel && matchPriority;
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
                                <span className="metric-inline">{tasks.length}</span>
                            </div>
                            {users.map(u => {
                                const userTaskCount = tasks.filter(t => t.assignee_id === u.id).length;
                                return (
                                    <div
                                        key={u.id}
                                        className={`user-row ${selectedUserId === u.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                                        title={u.name}
                                    >
                                        <div className="metric-avatar" style={{ backgroundColor: u.color }}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="metric-inline">{userTaskCount}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="dashboard-section">
                        <span className="dashboard-section-title">Filter by Attributes</span>
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

                            <select
                                className="filter-dropdown"
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                                style={{ marginTop: '0.5rem' }}
                            >
                                <option value="">All Priorities</option>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>

                            {(selectedUserId !== null || selectedLabelId !== '' || selectedPriority !== '') && (
                                <button
                                    className="filter-clear"
                                    onClick={() => { setSelectedUserId(null); setSelectedLabelId(''); setSelectedPriority(''); }}
                                    style={{ marginTop: '0.5rem' }}
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

            {isSettingsModalOpen && (
                <SettingsModal
                    boards={boards}
                    users={users}
                    labels={labels}
                    onClose={() => setIsSettingsModalOpen(false)}
                    onBoardSave={handleBoardSave}
                    onBoardDelete={handleBoardDelete}
                    onUserSave={handleUserCreate}
                    onUserDelete={handleUserDelete}
                    onLabelSave={handleLabelSave}
                    onLabelDelete={handleLabelDelete}
                />
            )}
        </div>
    );
}
