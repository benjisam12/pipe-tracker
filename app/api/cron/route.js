import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase lazily
function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
}

function getWhatsAppNumber() {
    return process.env.TWILIO_WHATSAPP_NUMBER;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const reminderType = searchParams.get('type') || 'all';

    console.log(`Running ${reminderType} reminders at ${new Date().toISOString()}`);

    try {
        const supabase = getSupabase();

        switch (reminderType) {
            case 'daily_digest':
                await sendDailyDigest(supabase);
                break;
            case 'super_priority':
                await checkSuperPriority(supabase);
                break;
            case 'priority':
                await checkPriority(supabase);
                break;
            case 'non_priority':
                await checkNonPriority(supabase);
                break;
            case 'tasks':
                await checkTaskReminders(supabase);
                break;
            case 'all':
                await checkSuperPriority(supabase);
                await checkPriority(supabase);
                await checkTaskReminders(supabase);
                break;
            default:
                console.log('Unknown reminder type:', reminderType);
        }

        return NextResponse.json({ success: true, type: reminderType });
    } catch (error) {
        console.error('Cron error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Daily digest
async function sendDailyDigest(supabase) {
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('is_archived', false);

    if (!projects) return;

    const superP = projects.filter(p => p.priority === 'super');
    const priority = projects.filter(p => p.priority === 'priority');
    const totalValue = projects.reduce((sum, p) => sum + parseFloat(p.quote_amount), 0);

    const { data: overdue } = await supabase
        .from('projects_needing_attention')
        .select('*')
        .limit(5);

    let message = `☀️ *Good Morning! Daily Report*\n`;
    message += `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;
    message += `📊 *Pipeline Overview*\n`;
    message += `🔴 Super Priority: ${superP.length}\n`;
    message += `🟡 Priority: ${priority.length}\n`;
    message += `💰 *Total: $${formatAmount(totalValue)}*\n\n`;

    if (overdue && overdue.length > 0) {
        message += `🚨 *Needs Attention (${overdue.length}):*\n`;
        overdue.forEach(p => {
            message += `• ${p.customer}\n`;
        });
    }

    message += `\n💬 Reply *URGENT* for details`;

    await sendToTeam(supabase, message);
}

// Super priority check (every 4 hours)
async function checkSuperPriority(supabase) {
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('priority', 'super')
        .eq('is_archived', false);

    if (!projects) return;

    const now = new Date();
    const overdueProjects = projects.filter(p => {
        const lastFollow = new Date(p.last_follow_up);
        const hoursDiff = (now - lastFollow) / (1000 * 60 * 60);
        return hoursDiff >= 12;
    });

    if (overdueProjects.length === 0) return;

    for (const project of overdueProjects) {
        const lastFollow = new Date(project.last_follow_up);
        const hoursDiff = Math.round((now - lastFollow) / (1000 * 60 * 60));

        let message = `🔴 *SUPER PRIORITY ALERT*\n\n`;
        message += `*${project.customer}*\n`;
        message += `${project.manufacturer}\n`;
        message += `💰 $${formatAmount(project.quote_amount)}\n\n`;
        message += `⏰ *${hoursDiff} hours* since last follow-up\n\n`;
        message += `Reply: *DONE* | *CALL* | *SKIP*`;

        await sendToTeam(supabase, message, project.id);
    }
}

// Priority check (every 12 hours)
async function checkPriority(supabase) {
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('priority', 'priority')
        .eq('is_archived', false);

    if (!projects) return;

    const now = new Date();
    const overdueProjects = projects.filter(p => {
        const lastFollow = new Date(p.last_follow_up);
        const daysDiff = (now - lastFollow) / (1000 * 60 * 60 * 24);
        return daysDiff >= 2;
    });

    if (overdueProjects.length === 0) return;

    let message = `🟡 *PRIORITY FOLLOW-UPS (${overdueProjects.length})*\n\n`;
    overdueProjects.slice(0, 5).forEach((project, i) => {
        const lastFollow = new Date(project.last_follow_up);
        const daysDiff = Math.round((now - lastFollow) / (1000 * 60 * 60 * 24));
        message += `*${i + 1}. ${project.customer}*\n`;
        message += `   💰 $${formatAmount(project.quote_amount)} | ${daysDiff} days\n\n`;
    });

    message += `Reply *URGENT* for full list`;

    await sendToTeam(supabase, message);
}

// Non-priority check (daily)
async function checkNonPriority(supabase) {
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('priority', 'non-priority')
        .eq('is_archived', false);

    if (!projects) return;

    const now = new Date();
    const overdueProjects = projects.filter(p => {
        const lastFollow = new Date(p.last_follow_up);
        const daysDiff = (now - lastFollow) / (1000 * 60 * 60 * 24);
        return daysDiff >= 5;
    });

    if (overdueProjects.length === 0) return;

    let message = `🔵 *Non-Priority Reminder*\n\n`;
    message += `${overdueProjects.length} projects haven't been touched in 5+ days:\n\n`;
    overdueProjects.slice(0, 3).forEach(p => {
        message += `• ${p.customer}\n`;
    });

    message += `\nReply *FOCUS* to see today's focus list`;

    await sendToTeam(supabase, message);
}

// Task reminders
async function checkTaskReminders(supabase) {
    const { data: tasks } = await supabase
        .from('tasks_needing_attention')
        .select('*')
        .in('urgency', ['overdue', 'due_today', 'due_tomorrow'])
        .limit(5);

    if (!tasks || tasks.length === 0) return;

    let message = `✅ *Task Reminders*\n\n`;

    const overdue = tasks.filter(t => t.urgency === 'overdue');
    const dueToday = tasks.filter(t => t.urgency === 'due_today');

    if (overdue.length > 0) {
        message += `🔴 *OVERDUE:*\n`;
        overdue.forEach(t => message += `• ${t.title}\n`);
        message += `\n`;
    }

    if (dueToday.length > 0) {
        message += `🟡 *DUE TODAY:*\n`;
        dueToday.forEach(t => message += `• ${t.title}\n`);
    }

    message += `\nReply *TASKS* to manage`;

    await sendToTeam(supabase, message);
}

// Send to team - uses fetch instead of Twilio SDK
async function sendToTeam(supabase, message, projectId = null) {
    const { data: teamMembers } = await supabase
        .from('team_members')
        .select('phone_number')
        .eq('whatsapp_enabled', true);

    if (!teamMembers || teamMembers.length === 0) {
        console.log('No team members with WhatsApp enabled');
        return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = getWhatsAppNumber();

    for (const member of teamMembers) {
        if (member.phone_number) {
            try {
                const toNumber = `whatsapp:+${member.phone_number.replace(/\D/g, '')}`;

                // Use fetch instead of Twilio SDK
                const response = await fetch(
                    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            From: twilioNumber,
                            To: toNumber,
                            Body: message,
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`Twilio API error: ${response.status}`);
                }

                if (projectId) {
                    await supabase.from('whatsapp_sessions').upsert({
                        phone_number: member.phone_number,
                        session_state: 'responding_reminder',
                        current_project_id: projectId,
                        last_message_at: new Date().toISOString()
                    });
                }

                console.log(`Sent to ${member.phone_number}`);
            } catch (error) {
                console.error(`Failed to send to ${member.phone_number}:`, error.message);
            }
        }
    }
}

function formatAmount(amount) {
    amount = parseFloat(amount) || 0;
    if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toFixed(0);
}
