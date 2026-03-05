import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function TaskCard({ task, index, onClick }) {
    let dueInfo = null;
    if (task.due_date) {
        const due = new Date(task.due_date);
        const today = new Date();
        due.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        let text = "";

        if (diffDays < 0) {
            text = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
        } else if (diffDays === 0) {
            text = "Due today";
        } else if (diffDays === 1) {
            text = "Due in 1 day";
        } else {
            text = `Due in ${diffDays} days`;
        }

        dueInfo = { text, color: "var(--text-secondary)", isUrgent: false };
    }

    return (
        <Draggable draggableId={task.id.toString()} index={index}>
            {(provided, snapshot) => (
                <div
                    className={`task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                    style={{
                        ...provided.draggableProps.style,
                        border: task.priority === 'High' ? '2px solid #ef4444' : task.priority === 'Low' ? '2px solid #eab308' : '2px solid #f97316',
                        borderLeftColor: task.labels && task.labels.length > 0 ? task.labels[0].color : (task.priority === 'High' ? '#ef4444' : task.priority === 'Low' ? '#eab308' : '#f97316')
                    }}
                >
                    <div className="task-title" style={{ marginBottom: dueInfo ? '0.25rem' : '0.5rem' }}>{task.title}</div>

                    {dueInfo && (
                        <div style={{ fontSize: '0.75rem', color: dueInfo.color, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: dueInfo.isUrgent ? '600' : 'normal' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            {dueInfo.text}
                        </div>
                    )}

                    <div className="task-meta">
                        <div className="task-labels">
                            {task.labels && task.labels.map(l => (
                                <span key={l.id} className="label-pill" style={{ backgroundColor: l.color }}>
                                    {l.name}
                                </span>
                            ))}
                        </div>
                        {task.assignee_name && (
                            <div
                                className="task-assignee"
                                title={task.assignee_name}
                                style={{ backgroundColor: task.assignee_color || 'var(--accent-blue)' }}
                            >
                                {task.assignee_name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </Draggable >
    );
}
