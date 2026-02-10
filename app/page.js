'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedListId, setSelectedListId] = useState(null);
    const [taskLists, setTaskLists] = useState([
        { id: 1, name: 'Exhibition Prep', description: 'ADIPEC 2026 preparation', color: '#ef4444', icon: '📅' },
        { id: 2, name: 'Website Rebuild', description: 'New company website project', color: '#22c55e', icon: '🌐' },
        { id: 3, name: 'Office Admin', description: 'General administrative tasks', color: '#6366f1', icon: '💼' },
        { id: 4, name: 'Supplier Visits', description: 'Factory visits and audits', color: '#f59e0b', icon: '✈️' },
    ]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const [projRes, taskRes] = await Promise.all([fetch('/api/projects'), fetch('/api/tasks')]);
        setProjects(await projRes.json() || []);
        setTasks(await taskRes.json() || []);
        setLoading(false);
    }

    const needsAttention = projects.filter(p => {
        const lastUpdate = new Date(p.last_follow_up || p.created_at);
        return (new Date() - lastUpdate) / (1000*60*60*24) > 7;
    });
    const superPriority = projects.filter(p => p.priority === 'super');
    const totalPipeline = projects.reduce((s, p) => s + (parseFloat(p.quote_amount) || 0), 0);
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');

    return (
        <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',background:'#f9fafb',minHeight:'100vh'}}>
            {/* HEADER */}
            <div style={{background:'#fff',padding:'20px 32px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #e5e7eb'}}>
                <div>
                    <h1 style={{fontSize:'22px',fontWeight:'700',color:'#111827',margin:0}}>Tube & Pipe Plant Equipment Tracker</h1>
                    <p style={{fontSize:'14px',color:'#6b7280',margin:'4px 0 0'}}>{projects.length} projects • {tasks.length} tasks • {needsAttention.length} need attention</p>
                </div>
                <div style={{display:'flex',gap:'12px'}}>
                    <button style={{padding:'10px 18px',border:'1px solid #d1d5db',borderRadius:'8px',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontWeight:'500',color:'#374151'}}>
                        <span style={{fontSize:'16px'}}>↑</span> Import
                    </button>
                    <button onClick={()=>{setEditingProject(null);setShowProjectModal(true)}} style={{padding:'10px 18px',border:'none',borderRadius:'8px',background:'#2563eb',color:'#fff',cursor:'pointer',fontWeight:'500'}}>
                        + New Project
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div style={{background:'#fff',padding:'0 32px',borderBottom:'1px solid #e5e7eb'}}>
                <div style={{display:'flex',gap:'4px'}}>
                    {[
                        {id:'dashboard',icon:'📊',label:'Dashboard'},
                        {id:'projects',icon:'📁',label:'Projects'},
                        {id:'priority',icon:'⚡',label:'Priority Tasks',count:overdueTasks.length},
                        {id:'tasks',icon:'✓',label:'Tasks',count:tasks.length - completedTasks},
                        {id:'urgent',icon:'⚠',label:'Urgent',count:needsAttention.length},
                    ].map(t=>(
                        <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
                            padding:'16px 18px',border:'none',background:'transparent',cursor:'pointer',fontSize:'14px',
                            color:activeTab===t.id?'#2563eb':'#6b7280',borderBottom:activeTab===t.id?'2px solid #2563eb':'2px solid transparent',
                            fontWeight:activeTab===t.id?'600':'400',display:'flex',alignItems:'center',gap:'6px'
                        }}>
                            {t.icon} {t.label} {t.count!==undefined&&<span style={{color:'#9ca3af'}}>({t.count})</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{padding:'28px 32px',maxWidth:'1400px',margin:'0 auto'}}>
                {loading ? <div style={{textAlign:'center',padding:'60px',color:'#6b7280'}}>Loading...</div> : (
                    <>
                        {activeTab==='dashboard'&&(
                            <>
                                {/* STATS */}
                                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'20px',marginBottom:'28px'}}>
                                    <StatCard label="Super Priority" value={superPriority.length} sub={'$'+formatM(totalPipeline*0.3)} iconBg="#fee2e2" icon="⚠️"/>
                                    <StatCard label="Total Pipeline" value={'$'+formatM(totalPipeline)} sub={projects.length+' projects'} iconBg="#dbeafe" icon="📈"/>
                                    <StatCard label="Tasks Due" value={tasks.length-completedTasks} sub={completedTasks+'/'+tasks.length+' done'} iconBg="#dcfce7" icon="✅"/>
                                    <StatCard label="Avg. Margin" value="11.9%" sub="Negotiation markup" iconBg="#f3e8ff" icon="📊"/>
                                </div>

                                {/* PROJECTS NEEDING ATTENTION */}
                                <div style={{background:'#fff',borderRadius:'12px',padding:'20px 24px',marginBottom:'24px',border:'1px solid #fee2e2'}}>
                                    <h2 style={{fontSize:'15px',fontWeight:'600',color:'#dc2626',margin:'0 0 16px',display:'flex',alignItems:'center',gap:'8px'}}>
                                        <span>🔔</span> Projects Needing Attention ({needsAttention.length})
                                    </h2>
                                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
                                        {needsAttention.length===0?(
                                            <div style={{gridColumn:'1/-1',padding:'24px',textAlign:'center',color:'#22c55e',background:'#f0fdf4',borderRadius:'8px'}}>
                                                ✅ All projects are up to date!
                                            </div>
                                        ):needsAttention.slice(0,3).map(p=>(
                                            <div key={p.id} style={{border:'1px solid #e5e7eb',borderRadius:'10px',padding:'16px',background:'#fff'}}>
                                                <div style={{fontWeight:'600',color:'#111827',marginBottom:'2px'}}>{p.customer}</div>
                                                <div style={{fontSize:'13px',color:'#6b7280',marginBottom:'12px'}}>{p.project_name||'No details'}</div>
                                                <div style={{fontSize:'13px',color:'#ea580c',background:'#fff7ed',padding:'10px 12px',borderRadius:'6px',display:'flex',alignItems:'center',gap:'6px'}}>
                                                    <span>💬</span> {p.notes||'Follow up required'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* TASK LISTS */}
                                <div style={{background:'#fff',borderRadius:'12px',padding:'20px 24px',border:'1px solid #e5e7eb'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                                        <h2 style={{fontSize:'15px',fontWeight:'600',color:'#111827',margin:0,display:'flex',alignItems:'center',gap:'8px'}}>
                                            <span>✓</span> Task Lists
                                        </h2>
                                        <button onClick={()=>setShowListModal(true)} style={{padding:'8px 14px',border:'none',background:'transparent',color:'#2563eb',cursor:'pointer',fontWeight:'500',fontSize:'14px'}}>
                                            + New List
                                        </button>
                                    </div>
                                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'20px'}}>
                                        {taskLists.map(list=>{
                                            const listTasks = tasks.filter(t=>t.list_id===list.id);
                                            const done = listTasks.filter(t=>t.status==='completed').length;
                                            const pct = listTasks.length ? Math.round(done/listTasks.length*100) : 0;
                                            return (
                                                <div key={list.id} style={{borderRadius:'12px',overflow:'hidden',border:'1px solid #e5e7eb'}}>
                                                    <div style={{background:list.color,padding:'14px 16px',color:'#fff',fontWeight:'600',fontSize:'15px',display:'flex',alignItems:'center',gap:'8px'}}>
                                                        {list.icon} {list.name}
                                                    </div>
                                                    <div style={{padding:'14px 16px'}}>
                                                        <div style={{fontSize:'13px',color:'#6b7280',marginBottom:'14px'}}>{list.description}</div>
                                                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#9ca3af',marginBottom:'8px'}}>
                                                            <span>{done} of {listTasks.length} tasks</span>
                                                            <span>{pct}% complete</span>
                                                        </div>
                                                        <div style={{height:'5px',background:'#e5e7eb',borderRadius:'3px',overflow:'hidden',marginBottom:'14px'}}>
                                                            <div style={{height:'100%',width:pct+'%',background:list.color,borderRadius:'3px'}}></div>
                                                        </div>
                                                        {listTasks.slice(0,3).map(t=>(
                                                            <div key={t.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',fontSize:'13px',borderTop:'1px solid #f3f4f6'}}>
                                                                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:t.due_date&&new Date(t.due_date)<new Date()?'#ef4444':'#f59e0b'}}></span>
                                                                <span style={{flex:1,color:'#374151'}}>{t.title}</span>
                                                                <span style={{color:'#9ca3af',fontSize:'12px'}}>{t.due_date?fmtDate(t.due_date):''}</span>
                                                            </div>
                                                        ))}
                                                        <button onClick={()=>{setSelectedListId(list.id);setEditingTask(null);setShowTaskModal(true)}} style={{marginTop:'10px',width:'100%',padding:'10px',border:'1px dashed #d1d5db',borderRadius:'6px',background:'transparent',color:'#6b7280',cursor:'pointer',fontSize:'13px'}}>
                                                            + Add Task
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab==='projects'&&(
                            <div style={{background:'#fff',borderRadius:'12px',padding:'24px',border:'1px solid #e5e7eb'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                                    <h2 style={{fontSize:'16px',fontWeight:'600',color:'#111827',margin:0}}>📁 All Projects</h2>
                                    <button onClick={()=>{setEditingProject(null);setShowProjectModal(true)}} style={{padding:'8px 16px',border:'none',borderRadius:'6px',background:'#2563eb',color:'#fff',cursor:'pointer',fontWeight:'500',fontSize:'13px'}}>+ Add Project</button>
                                </div>
                                <table style={{width:'100%',borderCollapse:'collapse'}}>
                                    <thead>
                                        <tr style={{background:'#f9fafb',textAlign:'left'}}>
                                            <th style={{padding:'12px 16px',fontSize:'13px',color:'#6b7280',fontWeight:'500'}}>Customer</th>
                                            <th style={{padding:'12px 16px',fontSize:'13px',color:'#6b7280',fontWeight:'500'}}>Project</th>
                                            <th style={{padding:'12px 16px',fontSize:'13px',color:'#6b7280',fontWeight:'500'}}>Notes</th>
                                            <th style={{padding:'12px 16px',fontSize:'13px',color:'#6b7280',fontWeight:'500'}}>Amount</th>
                                            <th style={{padding:'12px 16px',fontSize:'13px',color:'#6b7280',fontWeight:'500',width:'100px'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.map(p=>(
                                            <tr key={p.id} style={{borderTop:'1px solid #e5e7eb'}}>
                                                <td style={{padding:'14px 16px',fontWeight:'500',color:'#111827'}}>{p.customer}</td>
                                                <td style={{padding:'14px 16px',color:'#374151'}}>{p.project_name||'-'}</td>
                                                <td style={{padding:'14px 16px',color:'#6b7280',fontSize:'13px'}}>{p.notes||'-'}</td>
                                                <td style={{padding:'14px 16px',color:'#111827'}}>${formatM(p.quote_amount||0)}</td>
                                                <td style={{padding:'14px 16px'}}>
                                                    <button onClick={()=>{setEditingProject(p);setShowProjectModal(true)}} style={{background:'none',border:'none',cursor:'pointer',marginRight:'8px'}}>✏️</button>
                                                    <button onClick={()=>deleteProject(p.id)} style={{background:'none',border:'none',cursor:'pointer'}}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {(activeTab==='tasks'||activeTab==='priority')&&(
                            <div style={{background:'#fff',borderRadius:'12px',padding:'24px',border:'1px solid #e5e7eb'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                                    <h2 style={{fontSize:'16px',fontWeight:'600',color:'#111827',margin:0}}>{activeTab==='priority'?'⚡ Priority Tasks':'✅ All Tasks'}</h2>
                                    <button onClick={()=>{setEditingTask(null);setSelectedListId(null);setShowTaskModal(true)}} style={{padding:'8px 16px',border:'none',borderRadius:'6px',background:'#2563eb',color:'#fff',cursor:'pointer',fontWeight:'500',fontSize:'13px'}}>+ Add Task</button>
                                </div>
                                {(activeTab==='priority'?overdueTasks:tasks.filter(t=>t.status!=='completed')).map(t=>(
                                    <div key={t.id} style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px',background:'#f9fafb',borderRadius:'8px',marginBottom:'10px',borderLeft:t.due_date&&new Date(t.due_date)<new Date()?'4px solid #ef4444':'4px solid #e5e7eb'}}>
                                        <button onClick={()=>completeTask(t.id)} style={{width:'22px',height:'22px',borderRadius:'50%',border:'2px solid #d1d5db',background:'#fff',cursor:'pointer'}}>○</button>
                                        <div style={{flex:1}}>
                                            <div style={{fontWeight:'500',color:'#111827'}}>{t.title}</div>
                                            <div style={{fontSize:'13px',color:'#6b7280',marginTop:'2px'}}>📅 {t.due_date?fmtDate(t.due_date):'No date'}</div>
                                        </div>
                                        <button onClick={()=>{setEditingTask(t);setShowTaskModal(true)}} style={{background:'none',border:'none',cursor:'pointer'}}>✏️</button>
                                        <button onClick={()=>deleteTask(t.id)} style={{background:'none',border:'none',cursor:'pointer'}}>🗑️</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab==='urgent'&&(
                            <div style={{background:'#fff',borderRadius:'12px',padding:'24px',border:'1px solid #fee2e2'}}>
                                <h2 style={{fontSize:'16px',fontWeight:'600',color:'#dc2626',margin:'0 0 20px'}}>🚨 Urgent - Needs Attention</h2>
                                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'16px'}}>
                                    {needsAttention.length===0?(
                                        <div style={{padding:'40px',textAlign:'center',color:'#22c55e',background:'#f0fdf4',borderRadius:'8px'}}>✅ All caught up!</div>
                                    ):needsAttention.map(p=>(
                                        <div key={p.id} style={{border:'1px solid #fee2e2',borderRadius:'10px',padding:'20px',background:'#fffbfb'}}>
                                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                                                <div style={{fontWeight:'600',color:'#111827'}}>{p.customer}</div>
                                                <button onClick={()=>{setEditingProject(p);setShowProjectModal(true)}} style={{background:'none',border:'none',cursor:'pointer'}}>✏️</button>
                                            </div>
                                            <div style={{fontSize:'14px',color:'#6b7280',marginBottom:'12px'}}>{p.project_name||'No details'}</div>
                                            <div style={{fontSize:'13px',color:'#dc2626',background:'#fee2e2',padding:'10px 12px',borderRadius:'6px'}}>💬 {p.notes||'Requires follow-up'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showProjectModal&&<Modal title={editingProject?'Edit Project':'New Project'} onClose={()=>setShowProjectModal(false)}>
                <ProjectForm project={editingProject} onSave={saveProject} onCancel={()=>setShowProjectModal(false)}/>
            </Modal>}

            {showTaskModal&&<Modal title={editingTask?'Edit Task':'New Task'} onClose={()=>setShowTaskModal(false)}>
                <TaskForm task={editingTask} lists={taskLists} selectedListId={selectedListId} onSave={saveTask} onCancel={()=>setShowTaskModal(false)}/>
            </Modal>}

            {showListModal&&<Modal title="New Task List" onClose={()=>setShowListModal(false)}>
                <ListForm onSave={addList} onCancel={()=>setShowListModal(false)}/>
            </Modal>}
        </div>
    );

    async function saveProject(d){
        if(editingProject)await fetch('/api/projects',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,id:editingProject.id})});
        else await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
        setShowProjectModal(false);loadData();
    }
    async function deleteProject(id){if(confirm('Delete?')){await fetch(`/api/projects?id=${id}`,{method:'DELETE'});loadData();}}
    async function saveTask(d){
        if(editingTask)await fetch('/api/tasks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,id:editingTask.id})});
        else await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
        setShowTaskModal(false);loadData();
    }
    async function completeTask(id){await fetch('/api/tasks',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'completed'})});loadData();}
    async function deleteTask(id){if(confirm('Delete?')){await fetch(`/api/tasks?id=${id}`,{method:'DELETE'});loadData();}}
    function addList(d){setTaskLists([...taskLists,{id:Date.now(),...d}]);setShowListModal(false);}
}

function StatCard({label,value,sub,iconBg,icon}){
    return(
        <div style={{background:'#fff',borderRadius:'12px',padding:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid #e5e7eb'}}>
            <div>
                <div style={{fontSize:'13px',color:'#6b7280'}}>{label}</div>
                <div style={{fontSize:'26px',fontWeight:'700',color:'#111827',margin:'4px 0'}}>{value}</div>
                <div style={{fontSize:'13px',color:'#9ca3af'}}>{sub}</div>
            </div>
            <div style={{width:'48px',height:'48px',borderRadius:'12px',background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px'}}>{icon}</div>
        </div>
    );
}

function Modal({title,children,onClose}){
    return(
        <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'16px',padding:'28px',width:'100%',maxWidth:'460px',boxShadow:'0 25px 50px rgba(0,0,0,0.25)'}}>
                <h3 style={{margin:'0 0 20px',fontSize:'18px',color:'#111827'}}>{title}</h3>
                {children}
            </div>
        </div>
    );
}

function ProjectForm({project,onSave,onCancel}){
    const[c,setC]=useState(project?.customer||'');
    const[p,setP]=useState(project?.project_name||'');
    const[n,setN]=useState(project?.notes||'');
    const[a,setA]=useState(project?.quote_amount||'');
    return(
        <>
            <input placeholder="Customer name *" value={c} onChange={e=>setC(e.target.value)} style={inputStyle}/>
            <input placeholder="Project name/details *" value={p} onChange={e=>setP(e.target.value)} style={inputStyle}/>
            <input placeholder="Quote amount (optional)" value={a} onChange={e=>setA(e.target.value)} style={inputStyle}/>
            <textarea placeholder="Notes (optional, type NA for none)" value={n} onChange={e=>setN(e.target.value)} style={{...inputStyle,height:'80px',resize:'vertical'}}/>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'8px'}}>
                <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                <button onClick={()=>c&&p&&onSave({customer:c,project_name:p,notes:n.toUpperCase()==='NA'?'':n,quote_amount:parseFloat(a)||0})} style={saveBtnStyle}>Save</button>
            </div>
        </>
    );
}

function TaskForm({task,lists,selectedListId,onSave,onCancel}){
    const[t,setT]=useState(task?.title||'');
    const[d,setD]=useState(task?.due_date||'');
    const[l,setL]=useState(task?.list_id||selectedListId||'');
    return(
        <>
            <input placeholder="Task *" value={t} onChange={e=>setT(e.target.value)} style={inputStyle}/>
            <input type="date" value={d} onChange={e=>setD(e.target.value)} style={inputStyle}/>
            <select value={l} onChange={e=>setL(e.target.value)} style={inputStyle}>
                <option value="">No list</option>
                {lists.map(li=><option key={li.id} value={li.id}>{li.name}</option>)}
            </select>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'8px'}}>
                <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                <button onClick={()=>t&&onSave({title:t,due_date:d||null,list_id:l||null,status:task?.status||'pending'})} style={saveBtnStyle}>Save</button>
            </div>
        </>
    );
}

function ListForm({onSave,onCancel}){
    const[n,setN]=useState('');
    const[d,setD]=useState('');
    const[c,setC]=useState('#3b82f6');
    return(
        <>
            <input placeholder="List name *" value={n} onChange={e=>setN(e.target.value)} style={inputStyle}/>
            <input placeholder="Description" value={d} onChange={e=>setD(e.target.value)} style={inputStyle}/>
            <div style={{marginBottom:'14px'}}>
                <label style={{fontSize:'13px',color:'#6b7280',marginBottom:'6px',display:'block'}}>Color</label>
                <div style={{display:'flex',gap:'8px'}}>
                    {['#ef4444','#22c55e','#3b82f6','#6366f1','#f59e0b','#ec4899'].map(col=>(
                        <div key={col} onClick={()=>setC(col)} style={{width:'32px',height:'32px',borderRadius:'8px',background:col,cursor:'pointer',border:c===col?'3px solid #111':'3px solid transparent'}}/>
                    ))}
                </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px',marginTop:'8px'}}>
                <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
                <button onClick={()=>n&&onSave({name:n,description:d,color:c,icon:'📋'})} style={saveBtnStyle}>Create List</button>
            </div>
        </>
    );
}

function formatM(n){n=parseFloat(n)||0;return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+',000':n.toFixed(0);}
function fmtDate(d){return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'});}

const inputStyle={width:'100%',padding:'12px 14px',borderRadius:'8px',border:'1px solid #d1d5db',marginBottom:'14px',fontSize:'14px',outline:'none',boxSizing:'border-box'};
const cancelBtnStyle={padding:'10px 20px',borderRadius:'8px',border:'1px solid #d1d5db',background:'#fff',cursor:'pointer',fontWeight:'500'};
const saveBtnStyle={padding:'10px 20px',borderRadius:'8px',border:'none',background:'#2563eb',color:'#fff',cursor:'pointer',fontWeight:'500'};
