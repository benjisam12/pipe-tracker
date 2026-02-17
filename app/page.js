'use client';

import { useState, useEffect } from 'react';

export default function Home() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskLists, setTaskLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [viewMode, setViewMode] = useState('cards');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchProjects();
        fetchTasks();
        fetchTaskLists();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(data.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            const data = await res.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const fetchTaskLists = async () => {
        try {
            const res = await fetch('/api/task-lists');
            const data = await res.json();
            setTaskLists(data.lists || []);
        } catch (error) {
            console.error('Error fetching task lists:', error);
        }
    };

    const filteredProjects = projects.filter(p => {
        const matchesFilter = priorityFilter === 'all' || p.priority === priorityFilter;
        const matchesSearch = searchQuery === '' ||
            p.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const superPriorityProjects = projects.filter(p => p.priority === 'super');
    const priorityProjects = projects.filter(p => p.priority === 'priority');
    const nonPriorityProjects = projects.filter(p => p.priority === 'non-priority');

    const totalValue = projects.reduce((sum, p) => sum + parseFloat(p.quote_amount || 0), 0);
    const overdueProjects = projects.filter(p => {
        const lastFollow = new Date(p.last_follow_up);
        const daysDiff = (new Date() - lastFollow) / (1000 * 60 * 60 * 24);
        if (p.priority === 'super') return daysDiff >= 0.5;
        if (p.priority === 'priority') return daysDiff >= 2;
        return daysDiff >= 5;
    });

    const formatAmount = (amount) => {
        amount = parseFloat(amount) || 0;
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
        if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
        return '$' + amount.toFixed(0);
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTimeAgo = (date) => {
        if (!date) return 'Never';
        const diff = new Date() - new Date(date);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return days + 'd ago';
        if (hours > 0) return hours + 'h ago';
        return 'Just now';
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'super': return { bg: '#fee2e2', border: '#ef4444', text: '#dc2626', badge: '#ef4444' };
            case 'priority': return { bg: '#fef3c7', border: '#f59e0b', text: '#d97706', badge: '#f59e0b' };
            default: return { bg: '#dbeafe', border: '#3b82f6', text: '#2563eb', badge: '#3b82f6' };
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'quoted': return '#3b82f6';
            case 'negotiating': return '#f59e0b';
            case 'won': return '#22c55e';
            case 'lost': return '#ef4444';
            case 'active': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const saveProject = async (projectData) => {
        try {
            const method = editingProject ? 'PUT' : 'POST';
            const body = editingProject ? { ...projectData, id: editingProject.id } : projectData;
            const res = await fetch('/api/projects', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                fetchProjects();
                setShowProjectModal(false);
                setEditingProject(null);
            }
        } catch (error) {
            console.error('Error saving project:', error);
        }
    };

    const deleteProject = async (id) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            const res = await fetch('/api/projects', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                fetchProjects();
                setSelectedProject(null);
            }
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const saveTask = async (taskData) => {
        try {
            const method = editingTask?.id ? 'PUT' : 'POST';
            const body = editingTask?.id ? { ...taskData, id: editingTask.id } : taskData;
            const res = await fetch('/api/tasks', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                fetchTasks();
                setShowTaskModal(false);
                setEditingTask(null);
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const toggleTask = async (task) => {
        try {
            const res = await fetch('/api/tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: task.id, is_completed: !task.is_completed })
            });
            if (res.ok) fetchTasks();
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    };

    const deleteTask = async (id) => {
        try {
            const res = await fetch('/api/tasks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const markFollowUp = async (projectId) => {
        try {
            const res = await fetch('/api/projects', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: projectId, last_follow_up: new Date().toISOString() })
            });
            if (res.ok) fetchProjects();
        } catch (error) {
            console.error('Error marking follow-up:', error);
        }
    };

    const ProjectCard = ({ project, compact = false }) => {
        const colors = getPriorityColor(project.priority);
        return (
            <div onClick={() => setSelectedProject(project)} style={{ background: 'white', borderRadius: '12px', padding: compact ? '12px' : '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer', borderLeft: '4px solid ' + colors.badge, transition: 'all 0.2s', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                        <div style={{ fontWeight: '600', fontSize: compact ? '14px' : '16px', color: '#1f2937' }}>{project.customer}</div>
                        {!compact && project.project_name && (<div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{project.project_name}</div>)}
                    </div>
                    <span style={{ background: colors.bg, color: colors.text, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>
                        {project.priority === 'super' ? 'Super' : project.priority === 'priority' ? 'Priority' : 'Normal'}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: compact ? '16px' : '18px', fontWeight: '700', color: '#059669' }}>{formatAmount(project.quote_amount)}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{getTimeAgo(project.last_follow_up)}</div>
                </div>
                {!compact && project.reminder_question && (
                    <div style={{ marginTop: '10px', padding: '8px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                        {project.reminder_question}
                    </div>
                )}
            </div>
        );
    };

    const TaskListCard = ({ list }) => {
        const listTasks = tasks.filter(t => t.list_id === list.id);
        const completedCount = listTasks.filter(t => t.is_completed).length;
        const progress = listTasks.length > 0 ? (completedCount / listTasks.length) * 100 : 0;
        return (
            <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>{list.name}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{completedCount}/{listTasks.length}</span>
                </div>
                <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ height: '100%', width: progress + '%', background: progress === 100 ? '#22c55e' : '#3b82f6', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
                {listTasks.slice(0, 3).map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <input type="checkbox" checked={task.is_completed} onChange={() => toggleTask(task)} style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: '13px', color: task.is_completed ? '#9ca3af' : '#374151', textDecoration: task.is_completed ? 'line-through' : 'none', flex: 1 }}>{task.title}</span>
                    </div>
                ))}
                {listTasks.length > 3 && (<div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>+{listTasks.length - 3} more tasks</div>)}
                <button onClick={() => { setEditingTask({ list_id: list.id }); setShowTaskModal(true); }} style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>+ Add Task</button>
            </div>
        );
    };const DashboardTab = () => (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Pipeline</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>{formatAmount(totalValue)}</div>
                </div>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Active Projects</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{projects.length}</div>
                </div>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Super Priority</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{superPriorityProjects.length}</div>
                </div>
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Needs Attention</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{overdueProjects.length}</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 300px', gap: '20px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                        <span style={{ fontWeight: '600', color: '#dc2626' }}>Super Priority</span>
                        <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{superPriorityProjects.length}</span>
                    </div>
                    {superPriorityProjects.map(project => (<ProjectCard key={project.id} project={project} compact />))}
                    {superPriorityProjects.length === 0 && (<div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '14px' }}>No super priority projects</div>)}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                        <span style={{ fontWeight: '600', color: '#d97706' }}>Priority</span>
                        <span style={{ marginLeft: 'auto', background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{priorityProjects.length}</span>
                    </div>
                    {priorityProjects.map(project => (<ProjectCard key={project.id} project={project} compact />))}
                    {priorityProjects.length === 0 && (<div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '14px' }}>No priority projects</div>)}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', background: '#dbeafe', borderRadius: '8px' }}>
                        <span style={{ fontWeight: '600', color: '#2563eb' }}>Non-Priority</span>
                        <span style={{ marginLeft: 'auto', background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{nonPriorityProjects.length}</span>
                    </div>
                    {nonPriorityProjects.map(project => (<ProjectCard key={project.id} project={project} compact />))}
                    {nonPriorityProjects.length === 0 && (<div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '14px' }}>No non-priority projects</div>)}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Task Lists</span>
                        <button onClick={async () => { const name = prompt('Enter task list name:'); if (name) { await fetch('/api/task-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); fetchTaskLists(); } }} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>+ New</button>
                    </div>
                    {taskLists.map(list => (<TaskListCard key={list.id} list={list} />))}
                    {taskLists.length === 0 && (<div style={{ textAlign: 'center', padding: '30px 20px', color: '#9ca3af', fontSize: '14px', background: 'white', borderRadius: '12px' }}>No task lists yet. Create one to get started!</div>)}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginTop: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Unassigned Tasks</div>
                        {tasks.filter(t => !t.list_id && !t.is_completed).slice(0, 5).map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <input type="checkbox" checked={task.is_completed} onChange={() => toggleTask(task)} style={{ cursor: 'pointer' }} />
                                <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>{task.title}</span>
                            </div>
                        ))}
                        <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>+ Quick Task</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const ProjectsTab = () => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
                    <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                    {['cards', 'kanban', 'list', 'table'].map(view => (
                        <button key={view} onClick={() => setViewMode(view)} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', background: viewMode === view ? 'white' : 'transparent', color: viewMode === view ? '#3b82f6' : '#6b7280', fontWeight: viewMode === view ? '600' : '400' }}>{view.charAt(0).toUpperCase() + view.slice(1)}</button>
                    ))}
                </div>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                    <option value="all">All Priorities</option>
                    <option value="super">Super Priority</option>
                    <option value="priority">Priority</option>
                    <option value="non-priority">Non-Priority</option>
                </select>
                <button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ Add Project</button>
            </div>
            {viewMode === 'cards' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredProjects.map(project => (<ProjectCard key={project.id} project={project} />))}
                </div>
            )}
            {viewMode === 'kanban' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {['quoted', 'negotiating', 'active', 'won'].map(status => (
                        <div key={status} style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(status) }} />
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: '10px' }}>{filteredProjects.filter(p => p.status === status).length}</span>
                            </div>
                            {filteredProjects.filter(p => p.status === status).map(project => (<ProjectCard key={project.id} project={project} compact />))}
                        </div>
                    ))}
                </div>
            )}
            {viewMode === 'list' && (
                <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
                    {filteredProjects.map((project, i) => (
                        <div key={project.id} onClick={() => setSelectedProject(project)} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: i < filteredProjects.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#1f2937' }}>{project.customer}</div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>{project.project_name || 'No project name'}</div>
                            </div>
                            <div style={{ width: '120px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>{formatAmount(project.quote_amount)}</div>
                            <div style={{ width: '100px', textAlign: 'center' }}>
                                <span style={{ background: getPriorityColor(project.priority).bg, color: getPriorityColor(project.priority).text, padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{project.priority}</span>
                            </div>
                            <div style={{ width: '100px', textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>{getTimeAgo(project.last_follow_up)}</div>
                        </div>
                    ))}
                </div>
            )}
            {viewMode === 'table' && (
                <div style={{ background: 'white', borderRadius: '12px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Customer</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Project</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Manufacturer</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Amount</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Priority</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: '#6b7280' }}>Last Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map(project => (
                                <tr key={project.id} onClick={() => setSelectedProject(project)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{project.customer}</td>
                                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{project.project_name || '-'}</td>
                                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{project.manufacturer || '-'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>{formatAmount(project.quote_amount)}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ background: getPriorityColor(project.priority).bg, color: getPriorityColor(project.priority).text, padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{project.priority}</span></td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>{project.status}</span></td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280', fontSize: '13px' }}>{getTimeAgo(project.last_follow_up)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {filteredProjects.length === 0 && (<div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}><div style={{ fontSize: '18px', fontWeight: '500' }}>No projects found</div></div>)}
        </div>
    );

    const TasksTab = () => {
        const incompleteTasks = tasks.filter(t => !t.is_completed);
        const completedTasks = tasks.filter(t => t.is_completed);
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Lists</h3>
                        <button onClick={async () => { const name = prompt('Enter list name:'); if (name) { await fetch('/api/task-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); fetchTaskLists(); } }} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>+ New List</button>
                    </div>
                    {taskLists.map(list => (<TaskListCard key={list.id} list={list} />))}
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>All Tasks</h3>
                        <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>+ Add Task</button>
                    </div>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '16px' }}>To Do ({incompleteTasks.length})</h4>
                        {incompleteTasks.map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', borderRadius: '8px', marginBottom: '8px' }}>
                                <input type="checkbox" checked={task.is_completed} onChange={() => toggleTask(task)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '500' }}>{task.title}</div>
                                    {task.due_date && (<div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Due: {formatDate(task.due_date)}</div>)}
                                </div>
                                <button onClick={() => { setEditingTask(task); setShowTaskModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>Edit</button>
                                <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}>X</button>
                            </div>
                        ))}
                        {completedTasks.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginTop: '24px', marginBottom: '16px' }}>Completed ({completedTasks.length})</h4>
                                {completedTasks.slice(0, 10).map(task => (
                                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', opacity: 0.6 }}>
                                        <input type="checkbox" checked={task.is_completed} onChange={() => toggleTask(task)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>{task.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ProjectModal = () => {
        const [form, setForm] = useState(editingProject || { customer: '', project_name: '', manufacturer: '', quote_amount: '', margin: '', priority: 'non-priority', status: 'quoted', next_steps: '', reminder_question: '', notes: '' });
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', borderRadius: '16px', width: '600px', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{editingProject ? 'Edit Project' : 'Add New Project'}</h2>
                        <button onClick={() => { setShowProjectModal(false); setEditingProject(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>x</button>
                    </div>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Customer *</label><input type="text" value={form.customer} onChange={(e) => setForm({...form, customer: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="Customer name" /></div>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Manufacturer</label><input type="text" value={form.manufacturer} onChange={(e) => setForm({...form, manufacturer: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="Manufacturer name" /></div>
                        </div>
                        <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Project Name / Details</label><input type="text" value={form.project_name} onChange={(e) => setForm({...form, project_name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="Project details" /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Quote Amount ($)</label><input type="number" value={form.quote_amount} onChange={(e) => setForm({...form, quote_amount: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="0" /></div>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Margin (%)</label><input type="number" value={form.margin} onChange={(e) => setForm({...form, margin: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="0" /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Priority</label><select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="super">Super Priority</option><option value="priority">Priority</option><option value="non-priority">Non-Priority</option></select></div>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Status</label><select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="quoted">Quoted</option><option value="negotiating">Negotiating</option><option value="active">Active</option><option value="won">Won</option><option value="lost">Lost</option></select></div>
                        </div>
                        <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Next Steps</label><textarea value={form.next_steps} onChange={(e) => setForm({...form, next_steps: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', minHeight: '60px' }} placeholder="What is the next action?" /></div>
                        <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>AI Reminder Question</label><input type="text" value={form.reminder_question} onChange={(e) => setForm({...form, reminder_question: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="e.g., Did we receive the LC Draft?" /></div>
                        <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', minHeight: '80px' }} placeholder="Additional notes..." /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button onClick={() => { setShowProjectModal(false); setEditingProject(null); }} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                        <button onClick={() => saveProject(form)} disabled={!form.customer} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: form.customer ? '#3b82f6' : '#e5e7eb', color: form.customer ? 'white' : '#9ca3af', cursor: form.customer ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: '600' }}>{editingProject ? 'Save Changes' : 'Add Project'}</button>
                    </div>
                </div>
            </div>
        );
    };

    const TaskModal = () => {
        const [form, setForm] = useState(editingTask || { title: '', due_date: '', priority: 'normal', list_id: null });
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', borderRadius: '16px', width: '450px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{editingTask?.id ? 'Edit Task' : 'Add New Task'}</h2>
                        <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>x</button>
                    </div>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Task Title *</label><input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} placeholder="What needs to be done?" /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Due Date</label><input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} /></div>
                            <div><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Priority</label><select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>List</label>
                            <select value={form.list_id || ''} onChange={(e) => setForm({...form, list_id: e.target.value || null})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                <option value="">No List (Unassigned)</option>
                                {taskLists.map(list => (<option key={list.id} value={list.id}>{list.name}</option>))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => saveTask(form)} disabled={!form.title} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: form.title ? '#3b82f6' : '#e5e7eb', color: form.title ? 'white' : '#9ca3af', cursor: form.title ? 'pointer' : 'not-allowed', fontWeight: '600' }}>{editingTask?.id ? 'Save Changes' : 'Add Task'}</button>
                    </div>
                </div>
            </div>
        );
    };

    const ProjectDetailModal = () => {
        if (!selectedProject) return null;
        const colors = getPriorityColor(selectedProject.priority);
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div style={{ background: 'white', borderRadius: '16px', width: '700px', maxHeight: '90vh', overflow: 'auto' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: '700' }}>{selectedProject.customer}</h2>
                                <span style={{ background: colors.bg, color: colors.text, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>{selectedProject.priority}</span>
                            </div>
                            {selectedProject.project_name && (<div style={{ color: '#6b7280' }}>{selectedProject.project_name}</div>)}
                        </div>
                        <button onClick={() => setSelectedProject(null)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#6b7280' }}>x</button>
                    </div>
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px' }}><div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Quote Amount</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>{formatAmount(selectedProject.quote_amount)}</div></div>
                            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px' }}><div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Margin</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{selectedProject.margin || 0}%</div></div>
                            <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px' }}><div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Status</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', textTransform: 'capitalize' }}>{selectedProject.status}</div></div>
                        </div>
                        {selectedProject.manufacturer && (<div style={{ marginBottom: '20px' }}><div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Manufacturer</div><div style={{ fontSize: '16px', fontWeight: '500' }}>{selectedProject.manufacturer}</div></div>)}
                        {selectedProject.reminder_question && (<div style={{ background: '#fef3c7', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}><div style={{ fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>AI Reminder</div><div style={{ fontSize: '16px', fontWeight: '500', color: '#92400e' }}>{selectedProject.reminder_question}</div></div>)}
                        {selectedProject.next_steps && (<div style={{ marginBottom: '20px' }}><div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Next Steps</div><div style={{ fontSize: '15px', lineHeight: '1.6' }}>{selectedProject.next_steps}</div></div>)}
                        {selectedProject.notes && (<div style={{ marginBottom: '20px' }}><div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Notes</div><div style={{ fontSize: '15px', lineHeight: '1.6', color: '#4b5563' }}>{selectedProject.notes}</div></div>)}
                        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '20px' }}>Last follow-up: {getTimeAgo(selectedProject.last_follow_up)}</div>
                    </div>
                    <div style={{ padding: '20px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '12px' }}>
                        <button onClick={() => markFollowUp(selectedProject.id)} style={{ padding: '12px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Mark Follow-up Done</button>
                        <button onClick={() => { setEditingProject(selectedProject); setSelectedProject(null); setShowProjectModal(true); }} style={{ padding: '12px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Edit</button>
                        <button onClick={() => deleteProject(selectedProject.id)} style={{ padding: '12px 20px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Delete</button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', color: '#6b7280' }}>Loading Pipe Tracker...</div></div></div>);
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
            <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937' }}>Pipe Tracker</h1>
                <nav style={{ display: 'flex', gap: '4px' }}>
                    {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'projects', label: 'Projects' }, { id: 'tasks', label: 'Tasks' }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: activeTab === tab.id ? '#3b82f6' : 'transparent', color: activeTab === tab.id ? 'white' : '#6b7280', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.id ? '600' : '400' }}>{tab.label}</button>
                    ))}
                </nav>
                <button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>+ New Project</button>
            </header>
            <main style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'projects' && <ProjectsTab />}
                {activeTab === 'tasks' && <TasksTab />}
            </main>
            {showProjectModal && <ProjectModal />}
            {showTaskModal && <TaskModal />}
            {selectedProject && <ProjectDetailModal />}
        </div>
    );
}
