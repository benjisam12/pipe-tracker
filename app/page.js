'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [search, setSearch] = useState('');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const [projRes, taskRes] = await Promise.all([fetch('/api/projects'), fetch('/api/tasks')]);
        setProjects(await projRes.json());
        setTasks(await taskRes.json());
        setLoading(false);
    }

    const filteredProjects = projects.filter(p => 
        p.customer?.toLowerCase().includes(search.toLowerCase()) ||
        p.project_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.notes?.toLowerCase().includes(search.toLowerCase())
    );

    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
    const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString());

    return (
        <div style={styles.body}>
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logo}><span style={{fontSize:'32px'}}>🔧</span><span style={styles.logoText}>Pipe Tracker</span></div>
                    <div style={styles.searchBox}>
                        <input type="text" placeholder="🔍 Search projects..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
                    </div>
                </div>
            </header>

            <div style={styles.container}>
                {/* Stats */}
                <div style={styles.statsGrid}>
                    <StatCard icon="📁" num={projects.length} label="Projects" color="#3b82f6" />
                    <StatCard icon="✅" num={tasks.length} label="Open Tasks" color="#10b981" />
                    <StatCard icon="📅" num={todayTasks.length} label="Due Today" color="#f59e0b" />
                    <StatCard icon="🔴" num={overdueTasks.length} label="Overdue" color="#ef4444" />
                </div>

                {loading ? <div style={styles.loading}>Loading...</div> : (
                    <div style={styles.mainGrid}>
                        {/* Projects */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>📁 Projects</h2>
                                <button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} style={styles.addBtn}>+ Add</button>
                            </div>
                            <div style={styles.cardList}>
                                {filteredProjects.length === 0 ? <EmptyState icon="📁" text="No projects" hint="Click + Add to create one" /> :
                                    filteredProjects.map(p => (
                                        <div key={p.id} style={styles.card}>
                                            <div style={styles.cardHeader}>
                                                <div style={styles.cardTitle}>{p.customer}</div>
                                                <div style={styles.cardActions}>
                                                    <button onClick={() => { setEditingProject(p); setShowProjectModal(true); }} style={styles.iconBtn}>✏️</button>
                                                    <button onClick={() => deleteProject(p.id)} style={styles.iconBtn}>🗑️</button>
                                                </div>
                                            </div>
                                            <div style={styles.cardSub}>{p.project_name || 'No details'}</div>
                                            {p.notes && <div style={styles.cardNotes}>📝 {p.notes}</div>}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Tasks */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>✅ Tasks</h2>
                                <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} style={styles.addBtn}>+ Add</button>
                            </div>
                            <div style={styles.cardList}>
                                {tasks.length === 0 ? <EmptyState icon="✅" text="All done!" hint="Click + Add to create a task" /> :
                                    tasks.map(t => {
                                        const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                                        const isToday = t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString();
                                        return (
                                            <div key={t.id} style={{...styles.card, borderLeft: isOverdue ? '4px solid #ef4444' : isToday ? '4px solid #f59e0b' : '4px solid #e5e7eb'}}>
                                                <div style={styles.cardHeader}>
                                                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                                        <button onClick={() => completeTask(t.id)} style={styles.checkBtn}>○</button>
                                                        <div>
                                                            <div style={styles.cardTitle}>{t.title}</div>
                                                            <div style={styles.cardSub}>📅 {t.due_date ? formatDate(t.due_date) : 'No due date'} {isOverdue && <span style={styles.tag}>Overdue</span>}{isToday && !isOverdue && <span style={{...styles.tag, background:'#fef3c7',color:'#d97706'}}>Today</span>}</div>
                                                        </div>
                                                    </div>
                                                    <div style={styles.cardActions}>
                                                        <button onClick={() => { setEditingTask(t); setShowTaskModal(true); }} style={styles.iconBtn}>✏️</button>
                                                        <button onClick={() => deleteTask(t.id)} style={styles.iconBtn}>🗑️</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Project Modal */}
            {showProjectModal && <ProjectModal project={editingProject} onClose={() => setShowProjectModal(false)} onSave={saveProject} />}
            
            {/* Task Modal */}
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

function StatCard({ icon, num, label, color }) {
    return (
        <div style={{...styles.statCard, borderLeft: `4px solid ${color}`}}>
            <div style={{fontSize:'28px'}}>{icon}</div>
            <div><div style={styles.statNum}>{num}</div><div style={styles.statLabel}>{label}</div></div>
        </div>
    );
}

function EmptyState({ icon, text, hint }) {
    return <div style={styles.empty}><div style={{fontSize:'40px'}}>{icon}</div><div>{text}</div><div style={{fontSize:'13px',color:'#94a3b8'}}>{hint}</div></div>;
}

function ProjectModal({ project, onClose, onSave }) {
    const [customer, setCustomer] = useState(project?.customer || '');
    const [projectName, setProjectName] = useState(project?.project_name || '');
    const [notes, setNotes] = useState(project?.notes || '');
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>{project ? '✏️ Edit Project' : '➕ New Project'}</h3>
                <input placeholder="Customer name *" value={customer} onChange={e => setCustomer(e.target.value)} style={styles.input} />
                <input placeholder="Project name / details *" value={projectName} onChange={e => setProjectName(e.target.value)} style={styles.input} />
                <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} style={{...styles.input, height:'80px'}} />
                <div style={styles.modalActions}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={() => customer && projectName && onSave({ customer, project_name: projectName, notes })} style={styles.saveBtn}>Save</button>
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
                    <button onClick={() => title && onSave({ title, due_date: dueDate || null, status: task?.status || 'pending' })} style={styles.saveBtn}>Save</button>
                </div>
            </div>
        </div>
    );
}

function formatDate(d) {
    const date = new Date(d);
    const today = new Date(); today.setHours(0,0,0,0); date.setHours(0,0,0,0);
    if (date.getTime() === today.getTime()) return 'Today';
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = {
    body: { fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: 'linear-gradient(135deg,#f5f7fa,#e4e8ec)', minHeight: '100vh' },
    header: { background: 'linear-gradient(135deg,#1e3a5f,#2d5a87)', padding: '20px 0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
    headerContent: { maxWidth: '1400px', margin: '0 auto', padding: '0 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoText: { color: 'white', fontSize: '24px', fontWeight: '700' },
    searchBox: { flex: 1, maxWidth: '400px' },
    searchInput: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: 'none', fontSize: '14px', outline: 'none' },
    container: { maxWidth: '1400px', margin: '0 auto', padding: '30px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '20px', marginBottom: '30px' },
    statCard: { background: 'white', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    statNum: { fontSize: '28px', fontWeight: '700', color: '#1e3a5f' },
    statLabel: { color: '#64748b', fontSize: '14px' },
    mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(350px,1fr))', gap: '25px' },
    section: { background: 'white', borderRadius: '16px', padding: '25px', boxShadow: '0 2px 15px rgba(0,0,0,0.05)' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f1f5f9' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#1e3a5f', margin: 0 },
    addBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
    cardList: { display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' },
    card: { background: '#f8fafc', borderRadius: '10px', padding: '15px', border: '1px solid #e2e8f0' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontWeight: '600', color: '#1e3a5f', fontSize: '15px' },
    cardSub: { color: '#64748b', fontSize: '13px', marginTop: '4px' },
    cardNotes: { color: '#94a3b8', fontSize: '12px', marginTop: '6px', fontStyle: 'italic' },
    cardActions: { display: 'flex', gap: '5px' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' },
    checkBtn: { background: 'none', border: '2px solid #cbd5e1', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px' },
    tag: { background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', marginLeft: '8px' },
    empty: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
    loading: { textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '18px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'white', borderRadius: '16px', padding: '30px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalTitle: { margin: '0 0 20px 0', color: '#1e3a5f' },
    input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
    cancelBtn: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' },
    saveBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500' }
};
