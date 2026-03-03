import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

export default function TaskCard({ task, index, onClick }) {
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
                        borderLeftColor: task.labels && task.labels.length > 0 ? task.labels[0].color : 'transparent'
                    }}
                >
                    <div className="task-title">{task.title}</div>

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
            )}
        </Draggable>
    );
}
