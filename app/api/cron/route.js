import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
    const supabase = getSupabase();
    
    // Get overdue tasks
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .lt('due_date', new Date().toISOString().split('T')[0]);
    
    // Get projects not updated in 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: staleProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('is_archived', false)
        .lt('last_follow_up', weekAgo.toISOString());

    if ((!tasks || tasks.length === 0) && (!staleProjects || staleProjects.length === 0)) {
        return NextResponse.json({ message: 'No reminders needed' });
    }

    let message = '⏰ *Daily Reminder*\n\n';
    
    if (tasks && tasks.length > 0) {
        message += `🔴 *Overdue Tasks (${tasks.length}):*\n`;
        tasks.slice(0, 5).forEach(t => {
            message += `• ${t.title}\n`;
        });
        message += '\n';
    }
    
    if (staleProjects && staleProjects.length > 0) {
        message += `📁 *Projects needing attention (${staleProjects.length}):*\n`;
        staleProjects.slice(0, 5).forEach(p => {
            message += `• ${p.customer}\n`;
        });
    }
    
    message += '\nReply *TASKS* or *LIST* to see details.';

    // Get team members to notify
    const { data: team } = await supabase
        .from('team_members')
        .select('phone_number')
        .eq('whatsapp_enabled', true);

    if (team && team.length > 0) {
        for (const member of team) {
            await sendWhatsAppMessage(member.phone_number, message);
        }
    }

    return NextResponse.json({ success: true, tasks: tasks?.length || 0, staleProjects: staleProjects?.length || 0 });
}

async function sendWhatsAppMessage(phone, message) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: twilioNumber, To: `whatsapp:${phone}`, Body: message }),
    });
}
