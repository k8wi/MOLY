import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

export default function KanbanColumn({ column, tasks, onTaskClick }) {
    return (
        <div className="column">
            <div className="column-header">
                <div className="column-title">{column.title} <span className="stats-count" style={{ marginLeft: '8px' }}>{tasks.length}</span></div>
            </div>
            <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                    <div
                        className="task-list"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                            backgroundColor: snapshot.isDraggingOver ? 'rgba(0,0,0,0.03)' : 'transparent',
                            transition: 'background-color 0.2s ease'
                        }}
                    >
                        {tasks.map((task, index) => (
                            <TaskCard key={task.id} task={task} index={index} onClick={() => onTaskClick(task)} />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
