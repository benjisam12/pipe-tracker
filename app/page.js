import { createClient } from '@supabase/supabase-js';

async function getProjects() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    const { data } = await supabase.from('projects').select('*').eq('is_archived', false).order('created_at', { ascending: false });
    return data || [];
}

async function getTasks() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    const { data } = await supabase.from('tasks').select('*').neq('status', 'completed').order('due_date', { ascending: true, nullsFirst: false });
    return data || [];
}

export default async function Home() {
    const projects = await getProjects();
    const tasks = await getTasks();

    return (
        <html>
            <head>
                <title>Pipe Tracker Dashboard</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>{`
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
                    .container { max-width: 1200px; margin: 0 auto; }
                    h1 { color: #333; margin-bottom: 20px; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
                    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    .card h2 { color: #444; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    .item { padding: 12px; border-bottom: 1px solid #eee; }
                    .item:last-child { border-bottom: none; }
                    .item-title { font-weight: 600; color: #333; }
                    .item-sub { color: #666; font-size: 14px; margin-top: 4px; }
                    .item-notes { color: #888; font-size: 13px; margin-top: 4px; font-style: italic; }
                    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px; }
                    .overdue { background: #fee; color: #c00; }
                    .today { background: #fff3e0; color: #e65100; }
                    .upcoming { background: #e3f2fd; color: #1565c0; }
                    .stats { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
                    .stat { background: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    .stat-num { font-size: 28px; font-weight: bold; color: #333; }
                    .stat-label { color: #666; font-size: 14px; }
                    .empty { color: #999; padding: 20px; text-align: center; }
                `}</style>
            </head>
            <body>
                <div className="container">
                    <h1>📊 Pipe Tracker Dashboard</h1>
                    
                    <div className="stats">
                        <div className="stat">
                            <div className="stat-num">{projects.length}</div>
                            <div className="stat-label">Projects</div>
                        </div>
                        <div className="stat">
                            <div className="stat-num">{tasks.length}</div>
                            <div className="stat-label">Open Tasks</div>
                        </div>
                        <div className="stat">
                            <div className="stat-num">{tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length}</div>
                            <div className="stat-label">Overdue</div>
                        </div>
                    </div>

                    <div className="grid">
                        <div className="card">
                            <h2>📁 Projects</h2>
                            {projects.length === 0 ? (
                                <div className="empty">No projects yet. Send ADD on WhatsApp!</div>
                            ) : (
                                projects.map((p, i) => (
                                    <div key={i} className="item">
                                        <div className="item-title">{p.customer}</div>
                                        <div className="item-sub">📁 {p.project_name || 'N/A'}</div>
                                        {p.notes && <div className="item-notes">📝 {p.notes}</div>}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="card">
                            <h2>✅ Tasks</h2>
                            {tasks.length === 0 ? (
                                <div className="empty">No tasks! Send TASK on WhatsApp to add one.</div>
                            ) : (
                                tasks.map((t, i) => {
                                    const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                                    const isToday = t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString();
                                    return (
                                        <div key={i} className="item">
                                            <div className="item-title">
                                                {t.title}
                                                {isOverdue && <span className="badge overdue">Overdue</span>}
                                                {isToday && !isOverdue && <span className="badge today">Today</span>}
                                            </div>
                                            <div className="item-sub">
                                                📅 {t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
