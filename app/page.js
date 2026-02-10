'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskLists, setTaskLists] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showTaskListModal, setShowTaskListModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [editingTaskList, setEditingTaskList] = useState(null);
    const [selectedList, setSelectedList] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const [projRes, taskRes] = await Promise.all([fetch('/api/projects'), fetch('/api/tasks')]);
        const projectsData = await projRes.json();
        const tasksData = await taskRes.json();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        
        // Group tasks into lists (mock for now - you can add task_lists table later)
        const lists = [
            { id: 1, name: 'Exhibition Prep', description: 'ADIPEC 2026 preparation', color: '#ef4444', icon: '📅' },
            { id: 2, name: 'Website Rebuild', description: 'New company website project', color: '#22c55e', icon: '🌐' },
            { id: 3, name: 'Office Admin', description: 'General administrative tasks', color: '#6366f1', icon: '💼' },
            { id: 4, name: 'Supplier Visits', description: 'Factory visits and audits', color: '#f59e0b', icon: '✈️' },
        ];
        setTaskLists(lists);
        setLoading(false);
    }

    const superPriority = projects.filter(p => p.priority === 'super' || p.status === 'urgent');
    const needsAttention = projects.filter(p => {
        const lastUpdate = new Date(p.last_follow_up || p.created_at);
        const daysSince = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24);
        return daysSince > 7;
    });
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
    const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString());
    const totalPipeline = projects.reduce((sum, p) => sum + (parseFloat(p.quote_amount) || 0), 0);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'projects', label: 'Projects', icon: '📁', count: projects.length },
        { id: 'priority', label: 'Priority Tasks', icon: '⚡', count: overdueTasks.length },
        { id: 'tasks', label: 'Tasks', icon: '✅', count: tasks.length },
        { id: 'urgent', label: 'Urgent', icon: '🚨', count: needsAttention.length },
    ];

    return (
        <div style={styles.body}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <h1 style={styles.title}>Tube & Pipe Plant Equipment Tracker</h1>
                    <p style={styles.subtitle}>{projects.length} projects • {tasks.length} tasks • {needsAttention.length} need attention</p>
                </div>
                <div style={styles.headerRight}>
                    <button style={styles.importBtn}>📤 Import</button>
                    <button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} style={styles.newProjectBtn}>+ New Project</button>
                </div>
            </header>

            {/* Tabs */}
            <div style={styles.tabsContainer}>
                <div style={styles.tabs}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={activeTab === tab.id ? {...styles.tab, ...styles.tabActive} : styles.tab}>
                            {tab.icon} {tab.label} {tab.count !== undefined && <span style={styles.tabCount}>({tab.count})</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.container}>
                {loading ? <div style={styles.loading}>Loading...</div> : (
                    <>
                        {/* Dashboard Tab */}
                        {activeTab === 'dashboard' && (
                            <>
                                {/* Stats Cards */}
                                <div style={styles.statsGrid}>
                                    <div style={styles.statCard}>
                                        <div>
                                            <div style={styles.statLabel}>Super Priority</div>
                                            <div style={styles.statNumber}>{superPriority.length}</div>
                                            <div style={styles.statSub}>${formatMoney(totalPipeline * 0.3)}</div>
                                        </div>
                                        <div style={{...styles.statIcon, background: '#fee2e2', color: '#ef4444'}}>🚨</div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div>
                                            <div style={styles.statLabel}>Total Pipeline</div>
                                            <div style={styles.statNumber}>${formatMoney(totalPipeline)}</div>
                                            <div style={styles.statSub}>{projects.length} projects</div>
                                        </div>
                                        <div style={{...styles.statIcon, background: '#dbeafe', color: '#3b82f6'}}>📈</div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div>
                                            <div style={styles.statLabel}>Tasks Due</div>
                                            <div style={styles.statNumber}>{todayTasks.length}</div>
                                            <div style={styles.statSub}>{tasks.filter(t=>t.status==='completed').length}/{tasks.length} done</div>
                                        </div>
                                        <div style={{...styles.statIcon, background: '#dcfce7', color: '#22c55e'}}>✅</div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div>
                                            <div style={styles.statLabel}>Avg. Margin</div>
                                            <div style={styles.statNumber}>11.9%</div>
                                            <div style={styles.statSub}>Negotiation markup</div>
                                        </div>
                                        <div style={{...styles.statIcon, background: '#f3e8ff', color: '#a855f7'}}>📊</div>
                                    </div>
                                </div>

                                {/* Projects Needing Attention */}
                                <div style={styles.section}>
                                    <div style={styles.sectionHeader}>
                                        <h2 style={{...styles.sectionTitle, color: '#ef4444'}}>🔔 Projects Needing Attention ({needsAttention.length})</h2>
                                    </div>
                                    <div style={styles.attentionGrid}>
                                        {needsAttention.length === 0 ? (
                                            <div style={styles.emptyAttention}>✅ All projects are up to date!</div>
                                        ) : needsAttention.slice(0, 3).map(p => (
                                            <div key={p.id} style={styles.attentionCard}>
                                                <div style={styles.attentionTitle}>{p.customer}</div>
                                                <div style={styles.attentionSub}>{p.project_name || 'No details'}</div>
                                                <div style={styles.attentionNote}>💬 {p.notes || 'Follow up required'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Task Lists */}
                                <div style={styles.section}>
                                    <div style={styles.sectionHeader}>
                                        <h2 style={styles.sectionTitle}>✅ Task Lists</h2>
                                        <button onClick={() => { setEditingTaskList(null); setShowTaskListModal(true); }} style={styles.newListBtn}>+ New List</button>
                                    </div>
                                    <div style={styles.taskListsGrid}>
                                        {taskLists.map(list => {
                                            const listTasks = tasks.filter(t => t.list_id === list.id || (!t.list_id && list.id === 1));
                                            const completed = listTasks.filter(t => t.status === 'completed').length;
                                            const percent = listTasks.length > 0 ? Math.round((completed / listTasks.length) * 100) : 0;
                                            return (
                                                <div key={list.id} style={styles.taskListCard}>
                                                    <div style={{...styles.taskListHeader, background: list.color}}>
                                                        <span>{list.icon} {list.name}</span>
                                                    </div>
                                                    <div style={styles.taskListDesc}>{list.description}</div>
                                                    <div style={styles.taskListProgress}>
                                                        <span>{completed} of {listTasks.length} tasks</span>
                                                        <span>{percent}% complete</span>
                                                    </div>
                                                    <div style={styles.progressBar}>
                                                        <div style={{...styles.progressFill, width: `${percent}%`, background: list.color}}></div>
                                                    </div>
                                                    <div style={styles.taskListItems}>
                                                        {listTasks.slice(0, 3).map(t => (
                                                            <div key={t.id} style={styles.taskListItem}>
                                                                <span style={{...styles.taskDot, background: t.due_date && new Date(t.due_date) < new Date() ? '#ef4444' : '#f59e0b'}}></span>
                                                                <span style={styles.taskItemTitle}>{t.title}</span>
                                                                <span style={styles.taskItemDate}>{t.due_date ? formatShortDate(t.due_date) : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Projects Tab */}
                        {activeTab === 'projects' && (
                            <div style={styles.section}>
                                <div style={styles.sectionHeader}>
                                    <h2 style={styles.sectionTitle}>📁 All Projects</h2>
                                    <button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} style={styles.addBtn}>+ Add Project</button>
                                </div>
                                <div style={styles.projectsTable}>
                                    <div style={styles.tableHeader}>
                                        <div style={{flex:2}}>Customer</div>
                                        <div style={{flex:2}}>Project</div>
                                        <div style={{flex:2}}>Notes</div>
                                        <div style={{flex:1}}>Status</div>
                                        <div style={{flex:1}}>Actions</div>
                                    </div>
                                    {projects.map(p => (
                                        <div key={p.id} style={styles.tableRow}>
                                            <div style={{flex:2, fontWeight:'600'}}>{p.customer}</div>
                                            <div style={{flex:2}}>{p.project_name || '-'}</div>
                                            <div style={{flex:2, color:'#64748b'}}>{p.notes || '-'}</div>
                                            <div style={{flex:1}}><span style={styles.statusBadge}>{p.status || 'active'}</span></div>
                                            <div style={{flex:1, display:'flex', gap:'8px'}}>
                                                <button onClick={() => { setEditingProject(p); setShowProjectModal(true); }} style={styles.iconBtn}>✏️</button>
                                                <button onClick={() => deleteProject(p.id)} style={styles.iconBtn}>🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tasks Tab */}
                        {(activeTab === 'tasks' || activeTab === 'priority') && (
                            <div style={styles.section}>
                                <div style={styles.sectionHeader}>
                                    <h2 style={styles.sectionTitle}>{activeTab === 'priority' ? '⚡ Priority Tasks' : '✅ All Tasks'}</h2>
                                    <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} style={styles.addBtn}>+ Add Task</button>
                                </div>
                                <div style={styles.tasksList}>
                                    {(activeTab === 'priority' ? overdueTasks : tasks).map(t => {
                                        const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                                        return (
                                            <div key={t.id} style={{...styles.taskRow, borderLeft: isOverdue ? '4px solid #ef4444' : '4px solid #e5e7eb'}}>
                                                <button onClick={() => completeTask(t.id)} style={styles.checkbox}>○</button>
                                                <div style={{flex:1}}>
                                                    <div style={styles.taskTitle}>{t.title}</div>
                                                    <div style={styles.taskMeta}>📅 {t.due_date ? formatShortDate(t.due_date) : 'No date'} {isOverdue && <span style={styles.overdueTag}>Overdue</span>}</div>
                                                </div>
                                                <div style={{display:'flex', gap:'8px'}}>
                                                    <button onClick={() => { setEditingTask(t); setShowTaskModal(true); }} style={styles.iconBtn}>✏️</button>
                                                    <button onClick={() => deleteTask(t.id)} style={styles.iconBtn}>🗑️</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Urgent Tab */}
                        {activeTab === 'urgent' && (
                            <div style={styles.section}>
                                <div style={styles.sectionHeader}>
                                    <h2 style={{...styles.sectionTitle, color: '#ef4444'}}>🚨 Urgent - Needs Attention</h2>
                                </div>
                                <div style={styles.urgentGrid}>
                                    {needsAttention.length === 0 ? (
                                        <div style={styles.emptyState}>✅ All caught up! No urgent items.</div>
                                    ) : needsAttention.map(p => (
                                        <div key={p.id} style={styles.urgentCard}>
                                            <div style={styles.urgentHeader}>
                                                <div style={styles.urgentTitle}>{p.customer}</div>
                                                <button onClick={() => { setEditingProject(p); setShowProjectModal(true); }} style={styles.iconBtn}>✏️</button>
                                            </div>
                                            <div style={styles.urgentProject}>{p.project_name || 'No details'}</div>
                                            <div style={styles.urgentNote}>💬 {p.notes || 'Requires follow-up'}</div>
                                            <div style={styles.urgentDate}>Last update: {formatShortDate(p.last_follow_up || p.created_at)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showProjectModal && <ProjectModal project={editingProject} onClose={() => setShowProjectModal(false)} onSave={saveProject} />}
            {showTaskModal && <TaskModal task={editingTask} onClose={() => setShowTaskModal(false)} onSave={saveTask} />}
        </div>
    );

    async function saveProject(data) {
        if (editingProject) {
            await fetch('/api/projects', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...data, id: editingProject.id}) });
        } else {
            await fetch('/api/projects', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
        }
        setShowProjectModal(false);
        loadData();
    }

    async function deleteProject(id) {
        if (confirm('Delete this project?')) {
            await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
            loadData();
        }
    }

    async function saveTask(data) {
        if (editingTask) {
            await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...data, id: editingTask.id}) });
        } else {
            await fetch('/api/tasks', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
        }
        setShowTaskModal(false);
        loadData();
    }

    async function completeTask(id) {
        await fetch('/api/tasks', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, status: 'completed' }) });
        loadData();
    }

    async function deleteTask(id) {
        if (confirm('Delete this task?')) {
            await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
            loadData();
        }
    }
}

function ProjectModal({ project, onClose, onSave }) {
    const [customer, setCustomer] = useState(project?.customer || '');
    const [projectName, setProjectName] = useState(project?.project_name || '');
    const [notes, setNotes] = useState(project?.notes || '');
    const [quoteAmount, setQuoteAmount] = useState(project?.quote_amount || '');
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>{project ? '✏️ Edit Project' : '➕ New Project'}</h3>
                <input placeholder="Customer name *" value={customer} onChange={e => setCustomer(e.target.value)} style={styles.input} />
                <input placeholder="Project name / details *" value={projectName} onChange={e => setProjectName(e.target.value)} style={styles.input} />
                <input placeholder="Quote amount (optional)" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)} style={styles.input} />
                <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} style={{...styles.input, height:'80px', resize:'vertical'}} />
                <div style={styles.modalActions}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={() => customer && projectName && onSave({ customer, project_name: projectName, notes, quote_amount: parseFloat(quoteAmount) || 0 })} style={styles.saveBtn}>Save Project</button>
                </div>
            </div>
        </div>
    );
}

function TaskModal({ task, onClose, onSave }) {
    const [title, setTitle] = useState(task?.title || '');
    const [dueDate, setDueDate] = useState(task?.due_date || '');
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>{task ? '✏️ Edit Task' : '➕ New Task'}</h3>
                <input placeholder="Task description *" value={title} onChange={e => setTitle(e.target.value)} style={styles.input} />
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={styles.input} />
                <div style={styles.modalActions}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={() => title && onSave({ title, due_date: dueDate || null, status: task?.status || 'pending' })} style={styles.saveBtn}>Save Task</button>
                </div>
            </div>
        </div>
    );
}

function formatMoney(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toFixed(0);
}

function formatShortDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = {
    body: { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: '#f8fafc', minHeight: '100vh' },
    header: { background: 'white', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '15px' },
    headerLeft: {},
    headerRight: { display: 'flex', gap: '12px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 },
    subtitle: { fontSize: '14px', color: '#64748b', marginTop: '4px' },
    importBtn: { padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' },
    newProjectBtn: { padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500' },
    tabsContainer: { background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 30px' },
    tabs: { display: 'flex', gap: '8px', overflowX: 'auto' },
    tab: { padding: '16px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#64748b', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    tabActive: { color: '#3b82f6', borderBottom: '2px solid #3b82f6', fontWeight: '500' },
    tabCount: { color: '#94a3b8' },
    container: { padding: '30px', maxWidth: '1400px', margin: '0 auto' },
    loading: { textAlign: 'center', padding: '60px', color: '#64748b' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { background: 'white', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    statLabel: { fontSize: '14px', color: '#64748b' },
    statNumber: { fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '4px 0' },
    statSub: { fontSize: '13px', color: '#94a3b8' },
    statIcon: { width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
    section: { background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', margin: 0 },
    addBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
    newListBtn: { padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#3b82f6' },
    attentionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
    attentionCard: { border: '1px solid #fee2e2', borderRadius: '10px', padding: '16px', background: '#fff' },
    attentionTitle: { fontWeight: '600', color: '#1e293b', marginBottom: '4px' },
    attentionSub: { fontSize: '13px', color: '#64748b', marginBottom: '10px' },
    attentionNote: { fontSize: '13px', color: '#ef4444', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' },
    emptyAttention: { padding: '30px', textAlign: 'center', color: '#22c55e', background: '#f0fdf4', borderRadius: '8px', gridColumn: '1/-1' },
    taskListsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
    taskListCard: { border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' },
    taskListHeader: { padding: '14px 16px', color: 'white', fontWeight: '600', fontSize: '15px' },
    taskListDesc: { padding: '12px 16px 0', fontSize: '13px', color: '#64748b' },
    taskListProgress: { padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' },
    progressBar: { height: '4px', background: '#e2e8f0', margin: '0 16px' },
    progressFill: { height: '100%', borderRadius: '2px', transition: 'width 0.3s' },
    taskListItems: { padding: '12px 16px 16px' },
    taskListItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', fontSize: '13px' },
    taskDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
    taskItemTitle: { flex: 1, color: '#374151' },
    taskItemDate: { color: '#94a3b8', fontSize: '12px' },
    projectsTable: { border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
    tableHeader: { display: 'flex', padding: '12px 16px', background: '#f8fafc', fontWeight: '600', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
    tableRow: { display: 'flex', padding: '14px 16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', background: '#dbeafe', color: '#1d4ed8' },
    tasksList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    taskRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#f8fafc', borderRadius: '8px' },
    checkbox: { width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '12px' },
    taskTitle: { fontWeight: '500', color: '#1e293b' },
    taskMeta: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
    overdueTag: { background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginLeft: '8px' },
    urgentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' },
    urgentCard: { border: '1px solid #fee2e2', borderRadius: '10px', padding: '20px', background: 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)' },
    urgentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    urgentTitle: { fontWeight: '600', color: '#1e293b', fontSize: '16px' },
    urgentProject: { color: '#64748b', fontSize: '14px', marginBottom: '10px' },
    urgentNote: { fontSize: '13px', color: '#b91c1c', background: '#fee2e2', padding: '10px 12px', borderRadius: '6px', marginBottom: '10px' },
    urgentDate: { fontSize: '12px', color: '#94a3b8' },
    emptyState: { padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { background: 'white', borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
    modalTitle: { margin: '0 0 24px 0', color: '#1e293b', fontSize: '20px' },
    input: { width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' },
    cancelBtn: { padding: '12px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '500' },
    saveBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500' }
};
