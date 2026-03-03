import React, { useState, useEffect } from 'react';

export default function TaskModal({ task, users, labels, onClose, onSave, onLabelCreate, onDelete }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'Backlog',
        priority: 'Medium',
        assignee_id: '',
        label_ids: []
    });

    const [isAddingLabel, setIsAddingLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

    useEffect(() => {
        if (task) {
            setFormData({
                id: task.id,
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'Backlog',
                priority: task.priority || 'Medium',
                assignee_id: task.assignee_id || '',
                label_ids: task.labels ? task.labels.map(l => l.id) : []
            });
        }
    }, [task]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLabelToggle = (labelId) => {
        setFormData(prev => {
            const isSelected = prev.label_ids.includes(labelId);
            if (isSelected) {
                return { ...prev, label_ids: prev.label_ids.filter(id => id !== labelId) };
            } else {
                return { ...prev, label_ids: [...prev.label_ids, labelId] };
            }
        });
    };

    const handleCreateLabel = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newLabelName.trim()) return;

        try {
            if (onLabelCreate) {
                const created = await onLabelCreate({ name: newLabelName.trim(), color: newLabelColor });
                if (created) {
                    setFormData(prev => ({ ...prev, label_ids: [...prev.label_ids, created.id] }));
                }
            }
            setNewLabelName('');
            setIsAddingLabel(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            assignee_id: formData.assignee_id ? parseInt(formData.assignee_id) : null
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{task ? 'Edit Task' : 'Create Task'}</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                name="title"
                                className="input-base"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                className="input-base"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Status</label>
                                <select name="status" className="input-base" value={formData.status} onChange={handleChange}>
                                    <option value="Backlog">Backlog</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Done</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Priority</label>
                                <select name="priority" className="input-base" value={formData.priority} onChange={handleChange}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Assignee</label>
                                <select name="assignee_id" className="input-base" value={formData.assignee_id} onChange={handleChange}>
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>Labels</label>
                                {!isAddingLabel && (
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingLabel(true)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                    >
                                        + New Label
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {labels.map(l => {
                                    const isSelected = formData.label_ids.includes(l.id);
                                    return (
                                        <div
                                            key={l.id}
                                            onClick={() => handleLabelToggle(l.id)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                border: `1px solid ${l.color}`,
                                                backgroundColor: isSelected ? l.color : 'transparent',
                                                color: isSelected ? 'white' : l.color,
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {l.name}
                                        </div>
                                    );
                                })}
                            </div>

                            {isAddingLabel && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', padding: '8px', backgroundColor: 'var(--bg-kanban)', borderRadius: 'var(--radius-sm)' }}>
                                    <input
                                        type="text"
                                        className="input-base"
                                        placeholder="Label Name"
                                        value={newLabelName}
                                        onChange={e => setNewLabelName(e.target.value)}
                                        style={{ flex: 1, padding: '4px 8px' }}
                                    />
                                    <input
                                        type="color"
                                        value={newLabelColor}
                                        onChange={e => setNewLabelColor(e.target.value)}
                                        style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <button type="button" onClick={handleCreateLabel} className="btn btn-primary" style={{ padding: '4px 8px' }}>Add</button>
                                    <button type="button" onClick={() => setIsAddingLabel(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>Cancel</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            {task && onDelete && (
                                <button type="button" onClick={() => onDelete(task.id)} className="btn btn-secondary" style={{ backgroundColor: 'var(--danger-red)', color: 'white' }}>Delete</button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">{task ? 'Save Changes' : 'Create Task'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
