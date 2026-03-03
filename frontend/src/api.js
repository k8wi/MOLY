import axios from 'axios';

// Use proxy configured in vite.config.js for local dev, and relative path for prod
const API_BASE = '/api';

const api = {
    // Tasks
    getTasks: () => axios.get(`${API_BASE}/tasks`).then(res => res.data),
    createTask: (data) => axios.post(`${API_BASE}/tasks`, data).then(res => res.data),
    updateTask: (id, data) => axios.put(`${API_BASE}/tasks/${id}`, data).then(res => res.data),
    deleteTask: (id) => axios.delete(`${API_BASE}/tasks/${id}`).then(res => res.data),
    bulkUpdateRanks: (updates) => axios.put(`${API_BASE}/tasks/rank/bulk`, { updates }).then(res => res.data),

    // Users
    getUsers: () => axios.get(`${API_BASE}/users`).then(res => res.data),
    createUser: (data) => axios.post(`${API_BASE}/users`, data).then(res => res.data),
    deleteUser: (id) => axios.delete(`${API_BASE}/users/${id}`).then(res => res.data),

    // Labels
    getLabels: () => axios.get(`${API_BASE}/labels`).then(res => res.data),
    createLabel: (data) => axios.post(`${API_BASE}/labels`, data).then(res => res.data),
    updateLabel: (id, data) => axios.put(`${API_BASE}/labels/${id}`, data).then(res => res.data),
    deleteLabel: (id) => axios.delete(`${API_BASE}/labels/${id}`).then(res => res.data),
};

export default api;
