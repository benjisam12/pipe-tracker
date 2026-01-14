export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>🏭 Pipe Tracker</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Your tube & pipe plant equipment tracking system is running!
      </p>

      <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>📱 WhatsApp Bot Active</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Send messages to your Twilio WhatsApp number to interact with the bot.
        </p>
      </div>

      <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>💬 Quick Commands</h2>
        <ul style={{ color: '#666', fontSize: '14px', paddingLeft: '20px' }}>
          <li><strong>ADD</strong> - Add new project</li>
          <li><strong>LIST</strong> - View all projects</li>
          <li><strong>URGENT</strong> - See overdue projects</li>
          <li><strong>TASKS</strong> - View all tasks</li>
          <li><strong>PRIORITY</strong> - Priority tasks</li>
          <li><strong>HELP</strong> - All commands</li>
        </ul>
      </div>

      <div style={{ background: '#fefce8', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>🔗 API Endpoints</h2>
        <ul style={{ color: '#666', fontSize: '14px', paddingLeft: '20px' }}>
          <li><code>/api/whatsapp</code> - WhatsApp webhook</li>
          <li><code>/api/cron?type=daily_digest</code> - Daily digest</li>
          <li><code>/api/cron?type=super_priority</code> - Super priority check</li>
        </ul>
      </div>
    </div>
  );
}
