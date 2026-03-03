import React, { useState } from 'react';

export default function UserModal({ users, onClose, onSave, onDelete }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name: name.trim(), color });
        setName('');
        setColor('#3b82f6');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Manage Users</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {users && users.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {users.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--bg-kanban)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: u.color || 'var(--accent-blue)' }}></div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{u.name}</span>
                                    </div>
                                    <button
                                        onClick={() => onDelete(u.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--danger-red)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>No users found.</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)' }}>
                    <div className="modal-body">
                        <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Create New User</h3>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                name="name"
                                className="input-base"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="Enter user name..."
                            />
                        </div>
                        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <label style={{ margin: 0 }}>Color Profile</label>
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Done</button>
                        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
