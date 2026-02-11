'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskLists, setTaskLists] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [projectView, setProjectView] = useState('cards');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showProjectDetail, setShowProjectDetail] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedListId, setSelectedListId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [projRes, taskRes, listRes] = await Promise.all([
                fetch('/api/projects'),
                fetch('/api/tasks'),
                fetch('/api/task-lists')
            ]);
            const projData = await projRes.json();
            const taskData = await taskRes.json();
            let listData = [];
            try { listData = await listRes.json(); } catch(e) {}
            setProjects(Array.isArray(projData) ? projData : []);
            setTasks(Array.isArray(taskData) ? taskData : []);
            setTaskLists(Array.isArray(listData) && listData.length > 0 ? listData : defaultLists);
        } catch(e) { console.error(e); }
        setLoading(false);
    }

    const defaultLists = [
        { id: 1, name: 'Exhibition Prep', description: 'ADIPEC 2026 preparation', color: '#ef4444', icon: '📅' },
        { id: 2, name: 'Website Rebuild', description: 'New company website project', color: '#22c55e', icon: '🌐' },
        { id: 3, name: 'Office Admin', description: 'General administrative tasks', color: '#6366f1', icon: '💼' },
        { id: 4, name: 'Supplier Visits', description: 'Factory visits and audits', color: '#f59e0b', icon: '✈️' },
    ];

    const filteredProjects = projects.filter(p => {
        const matchesSearch = !search || 
            p.customer?.toLowerCase().includes(search.toLowerCase()) ||
            p.manufacturer?.toLowerCase().includes(search.toLowerCase());
        const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });

    const needsAttention = projects.filter(p => {
        const lastUpdate = new Date(p.last_follow_up || p.created_at);
        return (new Date() - lastUpdate) / (1000*60*60*24) > 7;
    });

    const totalPipeline = projects.reduce((s, p) => s + (parseFloat(p.quote_amount) || 0), 0);
    const superPriority = projects.filter(p => p.priority === 'super');
    const priorityProjects = projects.filter(p => p.priority === 'priority');
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
    const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString() && t.status !== 'completed');
    const upcomingTasks = tasks.filter(t => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'completed');

    const statusGroups = {
    'quoted': { name: 'Quoted', color: '#6b7280' },
    'active': { name: 'Active', color: '#3b82f6' },
    'negotiation': { name: 'Negotiation', color: '#f59e0b' },
    'lc_pending': { name: 'LC Pending', color: '#a855f7' },
    'final_stage': { name: 'Final Stage', color: '#22c55e' }
};

    return (
        <div style={styles.body}>
            {/* HEADER */}
            <header style={styles.header}>
                <div>
                    <h1 style={styles.title}>Tube & Pipe Plant Equipment Tracker</h1>
                    <p style={styles.subtitle}>Managing {projects.length} quotations • {needsAttention.length} need attention</p>
                </div>
                <div style={styles.headerActions}>
                    <button style={styles.teamBtn}>👥 3 team members</button>
                    <button style={styles.importBtn}>↑ Import</button>
                    <button onClick={() => { setEditingProject(null); setShowProjectModal(true); }} style={styles.newBtn}>+ New Project</button>
                </div>
            </header>

            {/* TABS */}
            <nav style={styles.tabs}>
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                    { id: 'projects', label: 'All Projects', icon: '📁' },
                    { id: 'priority-tasks', label: 'Priority Tasks', icon: '⚡', count: overdueTasks.length + todayTasks.length },
                    { id: 'tasks', label: 'Tasks', icon: '✓', count: tasks.length - completedTasks },
                    { id: 'urgent', label: 'Urgent', icon: '⚠️', count: needsAttention.length }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={activeTab === tab.id ? {...styles.tab, ...styles.tabActive} : styles.tab}>
                        {tab.icon} {tab.label} {tab.count !== undefined && <span style={styles.tabCount}>({tab.count})</span>}
                    </button>
                ))}
            </nav>

            <main style={styles.main}>
                {loading ? <div style={styles.loading}>Loading...</div> : (
                    <>
                        {/* DASHBOARD TAB */}
                        {activeTab === 'dashboard' && (
                            <>
                                <div style={styles.statsGrid}>
                                    <StatCard label="Super Priority" value={superPriority.length} sub={'$' + formatMoney(superPriority.reduce((s,p) => s + (parseFloat(p.quote_amount)||0), 0))} color="#ef4444" icon="🚨" />
                                    <StatCard label="Total Pipeline" value={'$' + formatMoney(totalPipeline)} sub={projects.length + ' projects'} color="#3b82f6" icon="📈" />
                                    <StatCard label="Tasks Due" value={todayTasks.length} sub={completedTasks + '/' + tasks.length + ' done'} color="#22c55e" icon="✅" />
                                    <StatCard label="Avg. Margin" value="11.9%" sub="Negotiation markup" color="#a855f7" icon="📊" />
                                </div>

                                {needsAttention.length > 0 && (
                                    <Section title="🔔 Projects Needing Attention" count={needsAttention.length} titleColor="#ef4444" borderColor="#fee2e2">
                                        <div style={styles.attentionGrid}>
                                            {needsAttention.slice(0, 3).map(p => (
                                                <div key={p.id} style={styles.attentionCard} onClick={() => setShowProjectDetail(p)}>
                                                    <div style={styles.attentionHeader}>
                                                        <span style={styles.attentionCustomer}>{p.customer}</span>
                                                    </div>
                                                    <div style={styles.attentionMfr}>{p.manufacturer}</div>
                                                    {p.reminder_question && (
                                                        <div style={styles.reminderBox}>💬 {p.reminder_question}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                <Section title="✓ Task Lists" action={<button style={styles.newListBtn}>+ New List</button>}>
                                    <div style={styles.taskListsGrid}>
                                        {taskLists.map(list => {
                                            const listTasks = tasks.filter(t => t.list_id == list.id);
                                            const done = listTasks.filter(t => t.status === 'completed').length;
                                            const pct = listTasks.length ? Math.round(done / listTasks.length * 100) : 0;
                                            return (
                                                <div key={list.id} style={styles.taskListCard}>
                                                    <div style={{...styles.taskListHeader, background: list.color}}>
                                                        {list.icon} {list.name}
                                                    </div>
                                                    <div style={styles.taskListBody}>
                                                        <div style={styles.taskListDesc}>{list.description}</div>
                                                        <div style={styles.taskListProgress}>
                                                            <span>{done} of {listTasks.length} tasks</span>
                                                            <span>{pct}% complete</span>
                                                        </div>
                                                        <div style={styles.progressBar}><div style={{...styles.progressFill, width: pct + '%', background: list.color}} /></div>
                                                        {listTasks.slice(0, 3).map(t => (
                                                            <div key={t.id} style={styles.taskListItem}>
                                                                <span style={{...styles.taskDot, background: t.due_date && new Date(t.due_date) < new Date() ? '#ef4444' : '#f59e0b'}} />
                                                                <span style={styles.taskItemText}>{t.title}</span>
                                                                <span style={styles.taskItemDate}>{t.due_date ? formatDate(t.due_date) : ''}</span>
                                                            </div>
                                                        ))}
                                                        {listTasks.length > 3 && <div style={styles.moreText}>+{listTasks.length - 3} more</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Section>
                            </>
                        )}

                        {/* ALL PROJECTS TAB */}
                        {activeTab === 'projects' && (
                            <Section>
                                <div style={styles.projectsToolbar}>
                                    <input type="text" placeholder="🔍 Search by customer, manufacturer..." value={search} onChange={e => setSearch(e.target.value)} style={styles.searchInput} />
                                    <div style={styles.filterTabs}>
                                        {[{id:'all',label:'All'},{id:'super',label:'Super Priority'},{id:'priority',label:'Priority'},{id:'non-priority',label:'Non-Priority'}].map(f => (
                                            <button key={f.id} onClick={() => setPriorityFilter(f.id)} style={priorityFilter === f.id ? {...styles.filterTab, ...styles.filterTabActive} : styles.filterTab}>{f.label}</button>
                                        ))}
                                    </div>
                                    <div style={styles.viewTabs}>
                                        {[{id:'cards',icon:'▦'},{id:'kanban',icon:'☰☰'},{id:'list',icon:'≡'},{id:'table',icon:'▤'}].map(v => (
                                            <button key={v.id} onClick={() => setProjectView(v.id)} style={projectView === v.id ? {...styles.viewTab, ...styles.viewTabActive} : styles.viewTab}>{v.icon} {v.id.charAt(0).toUpperCase() + v.id.slice(1)}</button>
                                        ))}
                                    </div>
                                    <button style={styles.exportBtn}>↓ Export</button>
                                </div>

                                {projectView === 'cards' && (
                                    <div style={styles.cardsGrid}>
                                        {filteredProjects.map(p => (
                                            <ProjectCard key={p.id} project={p} onClick={() => setShowProjectDetail(p)} onEdit={() => { setEditingProject(p); setShowProjectModal(true); }} />
                                        ))}
                                    </div>
                                )}

                                {projectView === 'kanban' && (
                                    <div style={styles.kanbanBoard}>
                                        {Object.entries(statusGroups).map(([status, info]) => {
                                            const statusProjects = filteredProjects.filter(p => p.status === status);
                                            const total = statusProjects.reduce((s, p) => s + (parseFloat(p.quote_amount) || 0), 0);
                                            return (
                                                <div key={status} style={styles.kanbanColumn}>
                                                    <div style={{...styles.kanbanHeader, background: info.color}}>
                                                        <span>{info.name}</span>
                                                        <span style={styles.kanbanCount}>{statusProjects.length}</span>
                                                    </div>
                                                    <div style={styles.kanbanTotal}>${formatMoney(total)}</div>
                                                    <div style={styles.kanbanCards}>
                                                        {statusProjects.map(p => (
                                                            <div key={p.id} style={styles.kanbanCard} onClick={() => setShowProjectDetail(p)}>
                                                                <div style={styles.kanbanCardTitle}>{p.customer}</div>
                                                                <div style={styles.kanbanCardMfr}>{p.manufacturer}</div>
                                                                <div style={styles.kanbanCardAmount}>${formatMoney(p.quote_amount)} <span style={styles.marginText}>+{p.margin || 0}%</span></div>
                                                                <div style={styles.kanbanCardNext}>{p.next_steps}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {projectView === 'table' && (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>PRIORITY</th>
                                                <th style={styles.th}>CUSTOMER</th>
                                                <th style={styles.th}>MANUFACTURER</th>
                                                <th style={styles.th}>QUOTE</th>
                                                <th style={styles.th}>MARGIN</th>
                                                <th style={styles.th}>STATUS</th>
                                                <th style={styles.th}>LAST FOLLOW-UP</th>
                                                <th style={styles.th}>NEXT STEPS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProjects.map(p => (
                                                <tr key={p.id} style={styles.tr} onClick={() => setShowProjectDetail(p)}>
                                                    <td style={styles.td}><PriorityBadge priority={p.priority} /></td>
                                                    <td style={{...styles.td, fontWeight: 600}}>{p.customer}</td>
                                                    <td style={styles.td}>{p.manufacturer}</td>
                                                    <td style={{...styles.td, fontWeight: 600}}>${formatMoney(p.quote_amount)}</td>
                                                    <td style={{...styles.td, color: '#22c55e'}}>+{p.margin || 0}%</td>
                                                    <td style={styles.td}><StatusBadge status={p.status} /></td>
                                                    <td style={styles.td}>{formatDate(p.last_follow_up)}</td>
                                                    <td style={{...styles.td, color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.next_steps}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {projectView === 'list' && (
                                    <div style={styles.listView}>
                                        {filteredProjects.map(p => (
                                            <div key={p.id} style={styles.listItem} onClick={() => setShowProjectDetail(p)}>
                                                <div style={{...styles.listBar, background: p.priority === 'super' ? '#ef4444' : p.priority === 'priority' ? '#f59e0b' : '#3b82f6'}} />
                                                <div style={styles.listContent}>
                                                    <div style={styles.listTitle}>{p.customer}</div>
                                                    <div style={styles.listSub}>{p.manufacturer} • {p.next_steps}</div>
                                                </div>
                                                <div style={styles.listRight}>
                                                    <div style={styles.listAmount}>${formatMoney(p.quote_amount)}</div>
                                                    <div style={styles.listMargin}>+{p.margin || 0}%</div>
                                                </div>
                                                <StatusBadge status={p.status} />
                                                <div style={styles.listDate}>{formatDate(p.last_follow_up)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Section>
                        )}

                        {/* PRIORITY TASKS TAB */}
                        {activeTab === 'priority-tasks' && (
                            <Section>
                                <div style={styles.sectionHeader}>
                                    <div>
                                        <h2 style={styles.sectionTitle}>Priority Tasks</h2>
                                        <p style={styles.sectionSub}>Tasks linked to your projects - sorted by urgency</p>
                                    </div>
                                    <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} style={styles.newBtn}>+ Add Project Task</button>
                                </div>
                                <div style={styles.taskStatsGrid}>
                                    <div style={{...styles.taskStatCard, borderColor: '#ef4444'}}><span style={{color:'#ef4444'}}>● Overdue</span><div style={{fontSize:'28px',fontWeight:'700',color:'#ef4444'}}>{overdueTasks.length}</div></div>
                                    <div style={{...styles.taskStatCard, borderColor: '#f59e0b'}}><span style={{color:'#f59e0b'}}>● Due Today</span><div style={{fontSize:'28px',fontWeight:'700',color:'#f59e0b'}}>{todayTasks.length}</div></div>
                                    <div style={{...styles.taskStatCard, borderColor: '#3b82f6'}}><span style={{color:'#3b82f6'}}>● Upcoming</span><div style={{fontSize:'28px',fontWeight:'700',color:'#3b82f6'}}>{upcomingTasks.length}</div></div>
                                    <div style={{...styles.taskStatCard, borderColor: '#22c55e'}}><span style={{color:'#22c55e'}}>● Completed</span><div style={{fontSize:'28px',fontWeight:'700',color:'#22c55e'}}>{completedTasks}</div></div>
                                </div>
                                <div style={styles.priorityTasksList}>
                                    {[...overdueTasks, ...todayTasks, ...upcomingTasks].map(t => (
                                        <div key={t.id} style={styles.priorityTaskCard}>
                                            <button onClick={() => completeTask(t.id)} style={styles.taskCheckbox}>○</button>
                                            <div style={{flex:1}}>
                                                <div style={styles.taskTags}>
                                                    <span style={styles.taskTypeTag}>Follow Up</span>
                                                    <PriorityBadge priority={t.priority || 'normal'} />
                                                    {t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString() && <span style={styles.dueTodayTag}>Due Today</span>}
                                                </div>
                                                <div style={styles.priorityTaskTitle}>{t.title}</div>
                                            </div>
                                            <div style={styles.priorityTaskDate}>{formatDate(t.due_date)}</div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* TASKS TAB */}
                        {activeTab === 'tasks' && (
                            <Section>
                                <div style={styles.sectionHeader}>
                                    <div>
                                        <h2 style={styles.sectionTitle}>Tasks & To-Do Lists</h2>
                                        <p style={styles.sectionSub}>{completedTasks} of {tasks.length} tasks completed</p>
                                    </div>
                                    <button style={styles.newBtn}>+ New List</button>
                                </div>
                                <div style={styles.taskListsExpanded}>
                                    {taskLists.map(list => {
                                        const listTasks = tasks.filter(t => t.list_id == list.id);
                                        return (
                                            <div key={list.id} style={styles.expandedListCard}>
                                                <div style={{...styles.expandedListHeader, background: list.color}}>
                                                    <span>{list.icon} {list.name}</span>
                                                    <button onClick={() => { setSelectedListId(list.id); setEditingTask(null); setShowTaskModal(true); }} style={styles.addTaskBtn}>+</button>
                                                </div>
                                                <div style={styles.expandedListBody}>
                                                    {listTasks.map(t => (
                                                        <div key={t.id} style={{...styles.expandedTaskItem, opacity: t.status === 'completed' ? 0.5 : 1}}>
                                                            <button onClick={() => completeTask(t.id)} style={{...styles.taskCheckbox, background: t.status === 'completed' ? list.color : 'transparent', borderColor: list.color}}>
                                                                {t.status === 'completed' && '✓'}
                                                            </button>
                                                            <div style={{flex:1}}>
                                                                <div style={{textDecoration: t.status === 'completed' ? 'line-through' : 'none'}}>{t.title}</div>
                                                                <div style={styles.taskMeta}><span style={{...styles.taskPriorityTag, color: t.priority === 'urgent' ? '#ef4444' : t.priority === 'high' ? '#f59e0b' : '#6b7280'}}>{t.priority || 'normal'}</span> {t.due_date && formatDate(t.due_date)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}

                        {/* URGENT TAB */}
                        {activeTab === 'urgent' && (
                            <Section title="Projects Needing Follow-Up" titleColor="#ef4444" subtitle="These projects have exceeded their reminder threshold.">
                                <div style={styles.urgentGrid}>
                                    {needsAttention.map(p => (
                                        <div key={p.id} style={styles.urgentCard} onClick={() => setShowProjectDetail(p)}>
                                            <div style={styles.urgentCardHeader}>
                                                <PriorityBadge priority={p.priority} />
                                                <span style={styles.dueTag}>🔔 Due</span>
                                                <span style={styles.urgentAmount}>${formatMoney(p.quote_amount)}</span>
                                                <span style={styles.marginText}>+{p.margin || 0}%</span>
                                            </div>
                                            <div style={styles.urgentCustomer}>{p.customer}</div>
                                            <div style={styles.urgentMfr}>{p.manufacturer}</div>
                                            <div style={styles.urgentDate}>📅 {formatDate(p.last_follow_up)} • 📄 {p.versions || 1} ver</div>
                                            <div style={styles.urgentNext}>Next: {p.next_steps}</div>
                                            {p.reminder_question && <div style={styles.reminderBox}>💬 {p.reminder_question}</div>}
                                            <StatusBadge status={p.status} />
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </>
                )}
            </main>

            {/* MODALS */}
            {showProjectModal && <ProjectModal project={editingProject} onClose={() => setShowProjectModal(false)} onSave={saveProject} />}
            {showProjectDetail && <ProjectDetailModal project={showProjectDetail} onClose={() => setShowProjectDetail(null)} onEdit={() => { setEditingProject(showProjectDetail); setShowProjectDetail(null); setShowProjectModal(true); }} onMarkFollowedUp={() => markFollowedUp(showProjectDetail.id)} />}
            {showTaskModal && <TaskModal task={editingTask} listId={selectedListId} onClose={() => setShowTaskModal(false)} onSave={saveTask} />}
        </div>
    );

    async function saveProject(data) {
        const method = editingProject ? 'PUT' : 'POST';
        const body = editingProject ? { ...data, id: editingProject.id } : data;
        await fetch('/api/projects', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setShowProjectModal(false);
        loadData();
    }

    async function saveTask(data) {
        const method = editingTask ? 'PUT' : 'POST';
        const body = editingTask ? { ...data, id: editingTask.id } : data;
        await fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setShowTaskModal(false);
        loadData();
    }

    async function completeTask(id) {
        await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'completed' }) });
        loadData();
    }

    async function markFollowedUp(id) {
        await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, last_follow_up: new Date().toISOString() }) });
        setShowProjectDetail(null);
        loadData();
    }
}

// COMPONENTS
function StatCard({ label, value, sub, color, icon }) {
    return (
        <div style={styles.statCard}>
            <div><div style={styles.statLabel}>{label}</div><div style={styles.statValue}>{value}</div><div style={styles.statSub}>{sub}</div></div>
            <div style={{...styles.statIcon, background: color + '20', color}}>{icon}</div>
        </div>
    );
}

function Section({ title, subtitle, count, titleColor, borderColor, action, children }) {
    return (
        <div style={{...styles.section, borderColor: borderColor || '#e5e7eb'}}>
            {(title || action) && (
                <div style={styles.sectionHeader}>
                    <div>
                        {title && <h2 style={{...styles.sectionTitle, color: titleColor || '#111827'}}>{title} {count !== undefined && <span>({count})</span>}</h2>}
                        {subtitle && <p style={styles.sectionSub}>{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}

function PriorityBadge({ priority }) {
    const colors = { super: '#ef4444', priority: '#f59e0b', 'non-priority': '#3b82f6', high: '#f59e0b', urgent: '#ef4444', normal: '#6b7280', low: '#9ca3af' };
    const labels = { super: 'Super Priority', priority: 'Priority', 'non-priority': 'Non-Priority', high: 'High', urgent: 'Urgent', normal: 'Normal', low: 'Low' };
    return <span style={{...styles.badge, background: colors[priority] || '#6b7280', color: '#fff'}}>{labels[priority] || priority}</span>;
}

function StatusBadge({ status }) {
    const colors = { quoted: '#6b7280', negotiation: '#f59e0b', lc_pending: '#a855f7', final_stage: '#22c55e', active: '#3b82f6' };
    const labels = { quoted: 'Quoted', negotiation: 'In Negotiation', lc_pending: 'LC Pending', final_stage: 'Final Stage', active: 'Active' };
    return <span style={{...styles.statusBadge, color: colors[status] || '#6b7280'}}>{labels[status] || status}</span>;
}

function ProjectCard({ project: p, onClick, onEdit }) {
    const isOverdue = (new Date() - new Date(p.last_follow_up || p.created_at)) / (1000*60*60*24) > 7;
    return (
        <div style={{...styles.projectCard, borderColor: isOverdue ? '#fee2e2' : '#e5e7eb'}} onClick={onClick}>
            <div style={styles.cardTop}>
                <PriorityBadge priority={p.priority} />
                {isOverdue && <span style={styles.dueTag}>🔔 Due</span>}
                <span style={styles.cardAmount}>${formatMoney(p.quote_amount)}</span>
                <span style={styles.marginText}>+{p.margin || 0}%</span>
            </div>
            <div style={styles.cardCustomer}>{p.customer}</div>
            <div style={styles.cardMfr}>{p.manufacturer}</div>
            <div style={styles.cardDate}>📅 {formatDate(p.last_follow_up)} • 📄 {p.versions || 1} ver</div>
            <div style={styles.cardNext}>Next: {p.next_steps || 'No next steps'}</div>
            {p.reminder_question && <div style={styles.reminderBox}>💬 {p.reminder_question}</div>}
            <div style={styles.cardFooter}>
                <StatusBadge status={p.status} />
                <div>
                    <button onClick={e => { e.stopPropagation(); onEdit(); }} style={styles.iconBtn}>✏️</button>
                    <button style={styles.iconBtn}>↗️</button>
                </div>
            </div>
        </div>
    );
}

function ProjectModal({ project, onClose, onSave }) {
    const [form, setForm] = useState({
        customer: project?.customer || '',
        manufacturer: project?.manufacturer || '',
        project_name: project?.project_name || '',
        quote_amount: project?.quote_amount || '',
        margin: project?.margin || '',
        priority: project?.priority || 'non-priority',
        status: project?.status || 'quoted',
        next_steps: project?.next_steps || '',
        reminder_question: project?.reminder_question || '',
        notes: project?.notes || ''
    });
    const update = (key, val) => setForm({ ...form, [key]: val });
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>{project ? 'Edit Project' : 'New Project'}</h3>
                <div style={styles.formGrid}>
                    <input placeholder="Customer *" value={form.customer} onChange={e => update('customer', e.target.value)} style={styles.input} />
                    <input placeholder="Manufacturer" value={form.manufacturer} onChange={e => update('manufacturer', e.target.value)} style={styles.input} />
                </div>
                <input placeholder="Project name / details" value={form.project_name} onChange={e => update('project_name', e.target.value)} style={styles.input} />
                <div style={styles.formGrid}>
                    <input type="number" placeholder="Quote Amount" value={form.quote_amount} onChange={e => update('quote_amount', e.target.value)} style={styles.input} />
                    <input type="number" placeholder="Margin %" value={form.margin} onChange={e => update('margin', e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGrid}>
                    <select value={form.priority} onChange={e => update('priority', e.target.value)} style={styles.input}>
                        <option value="super">Super Priority</option>
                        <option value="priority">Priority</option>
                        <option value="non-priority">Non-Priority</option>
                    </select>
                    <select value={form.status} onChange={e => update('status', e.target.value)} style={styles.input}>
                        <option value="quoted">Quoted</option>
                        <option value="negotiation">In Negotiation</option>
                        <option value="lc_pending">LC Pending</option>
                        <option value="final_stage">Final Stage</option>
                    </select>
                </div>
                <input placeholder="Next Steps" value={form.next_steps} onChange={e => update('next_steps', e.target.value)} style={styles.input} />
                <input placeholder="Follow-up Reminder Question (e.g., Did we receive the LC?)" value={form.reminder_question} onChange={e => update('reminder_question', e.target.value)} style={styles.input} />
                <textarea placeholder="Notes" value={form.notes} onChange={e => update('notes', e.target.value)} style={{...styles.input, height: '80px'}} />
                <div style={styles.modalActions}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={() => form.customer && onSave({...form, quote_amount: parseFloat(form.quote_amount) || 0, margin: parseFloat(form.margin) || 0})} style={styles.saveBtn}>Save Project</button>
                </div>
            </div>
        </div>
    );
}

function ProjectDetailModal({ project: p, onClose, onEdit, onMarkFollowedUp }) {
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modal, maxWidth: '600px'}} onClick={e => e.stopPropagation()}>
                <div style={styles.detailHeader}>
                    <div style={styles.detailBadges}><PriorityBadge priority={p.priority} /> <StatusBadge status={p.status} /></div>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>
                <h2 style={styles.detailTitle}>{p.customer}</h2>
                <p style={styles.detailMfr}>{p.manufacturer}</p>
                <div style={styles.detailStats}>
                    <div style={styles.detailStatBox}><div style={styles.detailStatLabel}>Quote Amount</div><div style={styles.detailStatValue}>${formatMoney(p.quote_amount)}</div></div>
                    <div style={{...styles.detailStatBox, background: '#f0fdf4'}}><div style={styles.detailStatLabel}>Negotiation Margin</div><div style={{...styles.detailStatValue, color: '#22c55e'}}>+{p.margin || 0}%</div><div style={{color: '#22c55e', fontSize: '13px'}}>${formatMoney((p.quote_amount || 0) * (p.margin || 0) / 100)} profit</div></div>
                </div>
                {p.next_steps && <div style={styles.detailSection}><h4>Next Steps</h4><div style={styles.nextStepsBox}>{p.next_steps}</div></div>}
                {p.reminder_question && <div style={styles.detailSection}><h4 style={{color: '#ef4444'}}>🔔 Follow-Up Reminder</h4><div style={styles.reminderBoxLarge}>{p.reminder_question}</div></div>}
                {p.notes && <div style={styles.detailSection}><h4>Notes</h4><div style={styles.notesBox}>{p.notes}</div></div>}
                <div style={styles.detailMeta}>
                    <div><span style={styles.metaLabel}>Last Follow-Up</span><br/>{formatDate(p.last_follow_up)}</div>
                    <div><span style={styles.metaLabel}>Created</span><br/>{formatDate(p.created_at)}</div>
                    <div><span style={styles.metaLabel}>Document Versions</span><br/>{p.versions || 1} versions</div>
                </div>
                <div style={styles.detailActions}>
                    <button onClick={onMarkFollowedUp} style={styles.followUpBtn}>✓ Mark Followed Up</button>
                    <button onClick={onEdit} style={styles.editBtn}>✏️ Edit</button>
                    <button style={styles.filesBtn}>📁 Files</button>
                </div>
            </div>
        </div>
    );
}

function TaskModal({ task, listId, onClose, onSave }) {
    const [form, setForm] = useState({ title: task?.title || '', due_date: task?.due_date || '', priority: task?.priority || 'normal', list_id: task?.list_id || listId || '' });
    const update = (k, v) => setForm({ ...form, [k]: v });
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>{task ? 'Edit Task' : 'New Task'}</h3>
                <input placeholder="Task description *" value={form.title} onChange={e => update('title', e.target.value)} style={styles.input} />
                <input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} style={styles.input} />
                <select value={form.priority} onChange={e => update('priority', e.target.value)} style={styles.input}>
                    <option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
                </select>
                <div style={styles.modalActions}>
                    <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={() => form.title && onSave({ ...form, status: task?.status || 'pending' })} style={styles.saveBtn}>Save Task</button>
                </div>
            </div>
        </div>
    );
}

function formatMoney(n) { n = parseFloat(n) || 0; return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? n.toLocaleString() : n.toString(); }
function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

const styles = {
    body: { fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: '#f8fafc', minHeight: '100vh' },
    header: { background: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 },
    subtitle: { fontSize: '13px', color: '#6b7280', margin: '4px 0 0' },
    headerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    teamBtn: { padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' },
    importBtn: { padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' },
    newBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
    tabs: { background: '#fff', padding: '0 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '4px', overflowX: 'auto' },
    tab: { padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
    tabActive: { color: '#2563eb', borderBottomColor: '#2563eb', fontWeight: '500' },
    tabCount: { color: '#9ca3af' },
    main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    loading: { textAlign: 'center', padding: '60px', color: '#6b7280' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
    statCard: { background: '#fff', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' },
    statLabel: { fontSize: '13px', color: '#6b7280' },
    statValue: { fontSize: '24px', fontWeight: '700', color: '#111827', margin: '4px 0' },
    statSub: { fontSize: '12px', color: '#9ca3af' },
    statIcon: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
    section: { background: '#fff', borderRadius: '10px', padding: '20px', marginBottom: '20px', border: '1px solid #e5e7eb' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
    sectionTitle: { fontSize: '15px', fontWeight: '600', margin: 0 },
    sectionSub: { fontSize: '13px', color: '#6b7280', margin: '4px 0 0' },
    attentionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' },
    attentionCard: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', cursor: 'pointer' },
    attentionCustomer: { fontWeight: '600', color: '#111827' },
    attentionMfr: { fontSize: '13px', color: '#6b7280', marginBottom: '10px' },
    reminderBox: { background: '#fef2f2', color: '#dc2626', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' },
    taskListsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
    taskListCard: { borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' },
    taskListHeader: { padding: '12px 14px', color: '#fff', fontWeight: '600', fontSize: '14px' },
    taskListBody: { padding: '14px' },
    taskListDesc: { fontSize: '13px', color: '#6b7280', marginBottom: '12px' },
    taskListProgress: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' },
    progressBar: { height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' },
    progressFill: { height: '100%', borderRadius: '2px' },
    taskListItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px' },
    taskDot: { width: '6px', height: '6px', borderRadius: '50%' },
    taskItemText: { flex: 1, color: '#374151' },
    taskItemDate: { color: '#9ca3af', fontSize: '12px' },
    moreText: { fontSize: '12px', color: '#6b7280', marginTop: '8px' },
    newListBtn: { padding: '6px 12px', border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '13px' },
    projectsToolbar: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', minWidth: '240px' },
    filterTabs: { display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '6px', padding: '4px' },
    filterTab: { padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' },
    filterTabActive: { background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    viewTabs: { display: 'flex', gap: '4px', marginLeft: 'auto' },
    viewTab: { padding: '6px 12px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' },
    viewTabActive: { background: '#f3f4f6', borderColor: '#d1d5db' },
    exportBtn: { padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' },
    cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    projectCard: { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', cursor: 'pointer', background: '#fff' },
    cardTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
    cardAmount: { marginLeft: 'auto', fontWeight: '700', color: '#111827' },
    marginText: { color: '#22c55e', fontSize: '13px' },
    cardCustomer: { fontWeight: '600', color: '#111827', fontSize: '16px' },
    cardMfr: { color: '#6b7280', fontSize: '13px', marginBottom: '8px' },
    cardDate: { fontSize: '12px', color: '#9ca3af', marginBottom: '10px' },
    cardNext: { fontSize: '13px', color: '#374151', background: '#f9fafb', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px' },
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f3f4f6' },
    badge: { padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' },
    statusBadge: { fontSize: '12px', fontWeight: '500' },
    dueTag: { background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' },
    kanbanBoard: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', overflowX: 'auto' },
    kanbanColumn: { minWidth: '260px' },
    kanbanHeader: { padding: '12px 14px', borderRadius: '8px 8px 0 0', color: '#fff', fontWeight: '600', display: 'flex', justifyContent: 'space-between' },
    kanbanCount: { background: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' },
    kanbanTotal: { padding: '8px 14px', background: '#f9fafb', fontSize: '13px', color: '#6b7280' },
    kanbanCards: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' },
    kanbanCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', cursor: 'pointer' },
    kanbanCardTitle: { fontWeight: '600', color: '#111827', marginBottom: '2px' },
    kanbanCardMfr: { fontSize: '12px', color: '#6b7280', marginBottom: '8px' },
    kanbanCardAmount: { fontWeight: '600', marginBottom: '6px' },
    kanbanCardNext: { fontSize: '12px', color: '#6b7280' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', borderBottom: '1px solid #e5e7eb' },
    tr: { cursor: 'pointer' },
    td: { padding: '12px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' },
    listView: { display: 'flex', flexDirection: 'column', gap: '8px' },
    listItem: { display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' },
    listBar: { width: '4px', height: '40px', borderRadius: '2px' },
    listContent: { flex: 1 },
    listTitle: { fontWeight: '600', color: '#111827' },
    listSub: { fontSize: '13px', color: '#6b7280' },
    listRight: { textAlign: 'right' },
    listAmount: { fontWeight: '600' },
    listMargin: { color: '#22c55e', fontSize: '13px' },
    listDate: { fontSize: '12px', color: '#9ca3af' },
    taskStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' },
    taskStatCard: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', borderLeftWidth: '4px' },
    priorityTasksList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    priorityTaskCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#f9fafb', borderRadius: '8px' },
    taskCheckbox: { width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #d1d5db', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff' },
    taskTags: { display: 'flex', gap: '6px', marginBottom: '4px' },
    taskTypeTag: { background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' },
    dueTodayTag: { background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' },
    priorityTaskTitle: { fontWeight: '500' },
    priorityTaskDate: { fontSize: '13px', color: '#6b7280' },
    taskListsExpanded: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' },
    expandedListCard: { borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' },
    expandedListHeader: { padding: '14px', color: '#fff', fontWeight: '600', display: 'flex', justifyContent: 'space-between' },
    addTaskBtn: { background: 'rgba(255,255,255,0.3)', border: 'none', color: '#fff', width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    expandedListBody: { padding: '12px' },
    expandedTaskItem: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' },
    taskMeta: { fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
    taskPriorityTag: { fontWeight: '500' },
    urgentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    urgentCard: { border: '1px solid #fee2e2', borderRadius: '10px', padding: '16px', cursor: 'pointer', background: '#fffbfb' },
    urgentCardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
    urgentAmount: { marginLeft: 'auto', fontWeight: '700' },
    urgentCustomer: { fontWeight: '600', fontSize: '16px', color: '#111827' },
    urgentMfr: { color: '#6b7280', fontSize: '13px', marginBottom: '6px' },
    urgentDate: { fontSize: '12px', color: '#9ca3af', marginBottom: '8px' },
    urgentNext: { fontSize: '13px', color: '#374151', background: '#f9fafb', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { margin: '0 0 20px', fontSize: '18px' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
    cancelBtn: { padding: '10px 18px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', cursor: 'pointer' },
    saveBtn: { padding: '10px 18px', border: 'none', borderRadius: '6px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '500' },
    detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
    detailBadges: { display: 'flex', gap: '8px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' },
    detailTitle: { fontSize: '22px', fontWeight: '700', margin: '0 0 4px' },
    detailMfr: { color: '#6b7280', marginBottom: '20px' },
    detailStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
    detailStatBox: { background: '#f9fafb', borderRadius: '8px', padding: '16px' },
    detailStatLabel: { fontSize: '13px', color: '#6b7280', marginBottom: '4px' },
    detailStatValue: { fontSize: '24px', fontWeight: '700' },
    detailSection: { marginBottom: '16px' },
    nextStepsBox: { background: '#eff6ff', color: '#1d4ed8', padding: '12px 14px', borderRadius: '8px', fontSize: '14px' },
    reminderBoxLarge: { background: '#fef2f2', color: '#dc2626', padding: '12px 14px', borderRadius: '8px', fontSize: '14px' },
    notesBox: { background: '#f9fafb', padding: '12px 14px', borderRadius: '8px', fontSize: '14px', color: '#374151' },
    detailMeta: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px 0', borderTop: '1px solid #e5e7eb', marginBottom: '16px' },
    metaLabel: { fontSize: '12px', color: '#9ca3af' },
    detailActions: { display: 'flex', gap: '10px' },
    followUpBtn: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '500' },
    editBtn: { padding: '12px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer' },
    filesBtn: { padding: '12px 20px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fff', cursor: 'pointer' }
};
