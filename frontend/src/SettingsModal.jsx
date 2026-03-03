import React, { useState } from 'react';
import api from './api';

export default function SettingsModal({
    users, labels,
    onClose,
    onUserSave, onUserDelete,
    onLabelSave, onLabelDelete
}) {
    const [activeTab, setActiveTab] = useState('labels'); // 'labels' or 'users'

    // --- Labels State ---
    const [labelName, setLabelName] = useState('');
    const [labelColor, setLabelColor] = useState('#3b82f6');
    const [editingLabel, setEditingLabel] = useState(null);

    // --- Users State ---
    const [userName, setUserName] = useState('');
    const [userColor, setUserColor] = useState('#3b82f6');

    const presetColors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
        '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
    ];

    // --- Labels Actions ---
    const handleLabelSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingLabel) {
                const updated = await api.updateLabel(editingLabel.id, { name: labelName, color: labelColor });
                onLabelSave(updated);
                cancelLabelEdit();
            } else {
                const newLabel = await api.createLabel({ name: labelName, color: labelColor });
                onLabelSave(newLabel);
                setLabelName('');
                setLabelColor('#3b82f6');
            }
        } catch (err) {
            console.error("Failed to save label", err);
            alert("Failed to save label");
        }
    };

    const handleLabelEditClick = (label) => {
        setEditingLabel(label);
        setLabelName(label.name);
        setLabelColor(label.color);
    };

    const cancelLabelEdit = () => {
        setEditingLabel(null);
        setLabelName('');
        setLabelColor('#3b82f6');
    };

    const handleLabelDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this label? Tasks using it will lose this label.")) return;
        try {
            await api.deleteLabel(id);
            onLabelDelete(id);
            if (editingLabel && editingLabel.id === id) cancelLabelEdit();
        } catch (err) {
            console.error("Failed to delete label", err);
            alert("Failed to delete label");
        }
    };

    // --- Users Actions ---
    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            const created = await api.createUser({ name: userName.trim(), color: userColor });
            onUserSave(created);
            setUserName('');
            setUserColor('#3b82f6');
        } catch (err) {
            console.error("Failed to save user", err);
            alert("Failed to save user");
        }
    };

    const handleUserDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user? Their assigned tasks will become unassigned.")) return;
        try {
            await api.deleteUser(id);
            onUserDelete(id);
        } catch (err) {
            console.error("Failed to delete user", err);
            alert("Failed to delete user");
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', height: '600px', flexDirection: 'row', margin: 'auto' }}>
                {/* Sidebar Navigation */}
                <div style={{ width: '220px', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-kanban)', display: 'flex', flexDirection: 'column' }}>
                    <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '1rem' }}>
                        <h2>Settings</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 1rem' }}>
                        <button
                            className={`settings-tab ${activeTab === 'labels' ? 'active' : ''}`}
                            onClick={() => setActiveTab('labels')}
                        >
                            Manage Labels
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            Manage Users
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="modal-header" style={{ justifyContent: 'flex-end', borderBottom: 'none', paddingBottom: 0 }}>
                        <button className="modal-close" onClick={onClose}>&times;</button>
                    </div>

                    <div className="modal-body" style={{ flex: 1, overflowY: 'auto', paddingTop: '0' }}>

                        {activeTab === 'labels' && (
                            <div className="settings-panel">
                                <h3>Labels</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Create, edit, and organize the labels used to categorize your tasks.</p>

                                <form onSubmit={handleLabelSubmit} className="form-group settings-card">
                                    <label>{editingLabel ? 'Edit Label' : 'Create New Label'}</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            className="input-base"
                                            type="text"
                                            placeholder="Label Name"
                                            value={labelName}
                                            onChange={(e) => setLabelName(e.target.value)}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                        <button type="submit" className="btn btn-primary btn-sm">
                                            {editingLabel ? 'Save' : 'Create'}
                                        </button>
                                        {editingLabel && (
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelLabelEdit}>
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                    <div className="color-picker" style={{ marginTop: '0.5rem' }}>
                                        {presetColors.map(c => (
                                            <div
                                                key={c}
                                                className={`color-swatch ${labelColor === c ? 'selected' : ''}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setLabelColor(c)}
                                            />
                                        ))}
                                    </div>
                                </form>

                                <div className="user-list">
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>Existing Labels</label>
                                    {labels.length === 0 ? (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-kanban)', borderRadius: 'var(--radius-md)' }}>No labels found.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {labels.map(l => (
                                                <div key={l.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    backgroundColor: 'var(--bg-kanban)',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '50px',
                                                    border: '1px solid var(--border-color)',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: l.color, boxShadow: '0 0 0 2px var(--bg-primary)' }}></div>
                                                        <span style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{l.name}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => handleLabelEditClick(l)}>Edit</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleLabelDeleteClick(l.id)}>Delete</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="settings-panel">
                                <h3>Users</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Manage team members who can be assigned to tasks.</p>

                                <form onSubmit={handleUserSubmit} className="form-group settings-card">
                                    <label>Add New User</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            className="input-base"
                                            type="text"
                                            placeholder="User Name"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                        <input
                                            type="color"
                                            value={userColor}
                                            onChange={e => setUserColor(e.target.value)}
                                            style={{ width: '36px', height: '36px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent' }}
                                        />
                                        <button type="submit" className="btn btn-primary btn-sm">
                                            Create User
                                        </button>
                                    </div>
                                </form>

                                <div className="user-list">
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>Team Members</label>
                                    {users.length === 0 ? (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem', backgroundColor: 'var(--bg-kanban)', borderRadius: 'var(--radius-md)' }}>No users found.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {users.map(u => (
                                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-kanban)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: u.color || 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{u.name}</span>
                                                    </div>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleUserDeleteClick(u.id)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}
