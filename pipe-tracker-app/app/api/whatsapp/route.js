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

// Handle GET request (verification)
export async function GET() {
    return NextResponse.json({ status: 'Pipe Tracker WhatsApp Bot Active' });
}

// Handle POST request (incoming messages)
export async function POST(request) {
    try {
        const formData = await request.formData();
        const from = formData.get('From');
        const body = formData.get('Body');

        const phone = from?.replace('whatsapp:', '') || '';
        const message = body?.trim().toUpperCase() || '';

        console.log(`Received from ${phone}: ${body}`);

        const supabase = getSupabase();

        // Get or create session
        let session = await getSession(supabase, phone);
        let response;

        // Handle based on session state
        switch (session?.session_state) {
            case 'adding_project':
                response = await handleAddProject(supabase, session, body, phone);
                break;
            case 'responding_reminder':
                response = await handleReminderResponse(supabase, session, message, phone);
                break;
            case 'adding_task':
                response = await handleAddTask(supabase, session, body, phone);
                break;
            default:
                response = await handleCommand(supabase, message, phone, session);
        }

        // Send response
        await sendWhatsAppMessage(phone, response);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error handling message:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Command handler
async function handleCommand(supabase, message, phone, session) {
    if (message === 'ADD' || message === 'NEW') {
        await updateSession(supabase, phone, 'adding_project', { step: 'customer' });
        return `📝 *Add New Project*\n\nLet's add a new project.\n\nWhat's the *customer name*?`;
    }

    if (message === 'LIST' || message === 'PROJECTS') {
        return await getProjectsList(supabase);
    }

    if (message === 'URGENT' || message === 'OVERDUE') {
        return await getOverdueProjects(supabase);
    }

    if (message === 'STATS' || message === 'SUMMARY') {
        return await getStatsSummary(supabase);
    }

    if (message === 'FOCUS' || message === 'DAILY') {
        return await getDailyFocus(supabase);
    }

    if (message === 'TASKS' || message === 'TODO') {
        return await getTasksList(supabase);
    }

    if (message === 'ADDTASK' || message === 'NEWTASK') {
        await updateSession(supabase, phone, 'adding_task', { step: 'title' });
        return `📝 *Add New Task*\n\nWhat's the task?`;
    }

    if (message === 'DUETASKS' || message === 'DUETODAY') {
        return await getDueTasks(supabase);
    }

    if (message === 'PRIORITY') {
        return await getPriorityTasks(supabase);
    }

    if (message === 'HELP' || message === 'MENU') {
        return getHelpMessage();
    }

    if (message.startsWith('SEARCH ')) {
        const query = message.replace('SEARCH ', '');
        return await searchProjects(supabase, query);
    }

    return `👋 Hi! I didn't understand that.\n\n${getHelpMessage()}`;
}

// Add project flow
async function handleAddProject(supabase, session, input, phone) {
    const context = session.context || {};
    const step = context.step;

    switch (step) {
        case 'customer':
            context.customer = input;
            context.step = 'manufacturer';
            await updateSession(supabase, phone, 'adding_project', context);
            return `✅ Customer: *${input}*\n\nWho is the *manufacturer/supplier*?`;

        case 'manufacturer':
            context.manufacturer = input;
            context.step = 'quote_amount';
            await updateSession(supabase, phone, 'adding_project', context);
            return `✅ Manufacturer: *${input}*\n\nWhat's the *quote amount* in USD?\n\n(e.g., 500000 or 1.5M)`;

        case 'quote_amount':
            context.quote_amount = parseAmount(input);
            context.step = 'priority';
            await updateSession(supabase, phone, 'adding_project', context);
            return `✅ Amount: *$${formatAmount(context.quote_amount)}*\n\nWhat's the *priority*?\n\n• *SUPER* - 12 hour follow-up\n• *PRIORITY* - 2-3 day follow-up\n• *NORMAL* - 5 day follow-up`;

        case 'priority':
            const priorityMap = { 'SUPER': 'super', 'PRIORITY': 'priority', 'NORMAL': 'non-priority' };
            context.priority = priorityMap[input.toUpperCase()] || 'non-priority';

            // Save project
            const { data: project } = await supabase
                .from('projects')
                .insert({
                    customer: context.customer,
                    manufacturer: context.manufacturer,
                    quote_amount: context.quote_amount,
                    priority: context.priority,
                    status: 'quoted',
                    last_follow_up: new Date().toISOString()
                })
                .select()
                .single();

            await updateSession(supabase, phone, 'idle', {});

            return `🎉 *Project Added!*\n\n📋 ${project.customer}\n🏭 ${project.manufacturer}\n💰 $${formatAmount(project.quote_amount)}\n🔴 ${project.priority}\n\nI'll remind you based on priority!`;

        default:
            await updateSession(supabase, phone, 'idle', {});
            return `Something went wrong. Type *ADD* to start over.`;
    }
}

// Add task flow
async function handleAddTask(supabase, session, input, phone) {
    const context = session.context || {};
    const step = context.step;

    switch (step) {
        case 'title':
            context.title = input;
            context.step = 'due';
            await updateSession(supabase, phone, 'adding_task', context);
            return `✅ Task: *${input}*\n\nWhen is it due?\n\n• *TODAY*\n• *TOMORROW*\n• *WEEK*\n• Or type a date (Jan 25)\n• *SKIP* - No due date`;

        case 'due':
            const dueDate = parseDueDate(input);

            const { data: task } = await supabase
                .from('tasks')
                .insert({
                    title: context.title,
                    due_date: dueDate,
                    status: 'pending',
                    priority: 'normal'
                })
                .select()
                .single();

            await updateSession(supabase, phone, 'idle', {});

            let response = `🎉 *Task Added!*\n\n📝 ${task.title}`;
            if (task.due_date) response += `\n📅 Due: ${formatDueDate(task.due_date)}`;

            return response;

        default:
            await updateSession(supabase, phone, 'idle', {});
            return `Something went wrong. Type *ADDTASK* to try again.`;
    }
}

// Reminder response handler
async function handleReminderResponse(supabase, session, message, phone) {
    const projectId = session.current_project_id;
    if (!projectId) {
        await updateSession(supabase, phone, 'idle', {});
        return `No active reminder. Type *URGENT* to see overdue projects.`;
    }

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    if (!project) {
        await updateSession(supabase, phone, 'idle', {});
        return `Project not found.`;
    }

    let response = '';
    let updates = {};

    switch (message) {
        case 'DONE':
        case 'YES':
            updates.last_follow_up = new Date().toISOString();
            response = `✅ Marked as followed up!\n\n*${project.customer}* updated.`;
            break;
        case 'CALL':
            updates.last_follow_up = new Date().toISOString();
            response = `📞 Great! Good luck with ${project.customer}!`;
            break;
        case 'WON':
            updates.status = 'won';
            updates.last_follow_up = new Date().toISOString();
            response = `🎉🎉🎉 *CONGRATULATIONS!*\n\nDeal closed with ${project.customer}!\nValue: $${formatAmount(project.quote_amount)}`;
            break;
        case 'LOST':
            updates.status = 'lost';
            response = `😔 ${project.customer} marked as lost.`;
            break;
        case 'SKIP':
            response = `⏰ OK, I'll remind you tomorrow about ${project.customer}.`;
            break;
        default:
            return `Reply with: *DONE* | *CALL* | *WON* | *LOST* | *SKIP*`;
    }

    if (Object.keys(updates).length > 0) {
        await supabase.from('projects').update(updates).eq('id', projectId);
    }

    await updateSession(supabase, phone, 'idle', {});
    return response;
}

// Get projects list
async function getProjectsList(supabase) {
    const { data } = await supabase
        .from('projects')
        .select('customer, quote_amount, priority, status')
        .eq('is_archived', false)
        .order('priority')
        .limit(10);

    if (!data || data.length === 0) {
        return `📋 No active projects.\n\nType *ADD* to add your first project!`;
    }

    let message = `📋 *Your Projects (Top 10)*\n\n`;
    data.forEach((p, i) => {
        const emoji = p.priority === 'super' ? '🔴' : p.priority === 'priority' ? '🟡' : '🔵';
        message += `${i + 1}. ${emoji} ${p.customer}\n   $${formatAmount(p.quote_amount)} - ${p.status}\n\n`;
    });

    return message;
}

// Get overdue projects
async function getOverdueProjects(supabase) {
    const { data } = await supabase
        .from('projects_needing_attention')
        .select('*')
        .limit(10);

    if (!data || data.length === 0) {
        return `✅ *All caught up!*\n\nNo projects need immediate follow-up.`;
    }

    let message = `🚨 *Projects Needing Attention*\n\n`;
    data.forEach((p, i) => {
        const emoji = p.priority === 'super' ? '🔴' : p.priority === 'priority' ? '🟡' : '🔵';
        message += `${i + 1}. ${emoji} *${p.customer}*\n   ${p.smart_message}\n   💰 $${formatAmount(p.quote_amount)}\n\n`;
    });

    return message;
}

// Get stats summary
async function getStatsSummary(supabase) {
    const { data: projects } = await supabase
        .from('projects')
        .select('priority, quote_amount')
        .eq('is_archived', false);

    if (!projects) return `No data available.`;

    const superP = projects.filter(p => p.priority === 'super');
    const priority = projects.filter(p => p.priority === 'priority');
    const totalValue = projects.reduce((sum, p) => sum + parseFloat(p.quote_amount), 0);

    return `📊 *Pipeline Summary*\n\n🔴 Super Priority: ${superP.length} projects\n🟡 Priority: ${priority.length} projects\n💰 *Total: $${formatAmount(totalValue)}*`;
}

// Get daily focus
async function getDailyFocus(supabase) {
    const { data } = await supabase
        .from('daily_focus_projects')
        .select('*');

    if (!data || data.length === 0) {
        return `No non-priority projects to focus on today.`;
    }

    let message = `🎯 *Today's Focus*\n\n`;
    data.forEach((p, i) => {
        message += `${i + 1}. *${p.customer}*\n   $${formatAmount(p.quote_amount)}\n\n`;
    });

    return message;
}

// Get tasks list
async function getTasksList(supabase) {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

    if (!tasks || tasks.length === 0) {
        return `✅ *All Tasks Complete!*\n\nType *ADDTASK* to create a new task.`;
    }

    let message = `📋 *Your Tasks*\n\n`;
    tasks.forEach((t, i) => {
        const dueText = t.due_date ? formatDueDate(t.due_date) : 'No due date';
        message += `${i + 1}. ${t.title}\n   📅 ${dueText}\n\n`;
    });

    return message;
}

// Get due tasks
async function getDueTasks(supabase) {
    const { data: tasks } = await supabase
        .from('tasks_needing_attention')
        .select('*')
        .limit(10);

    if (!tasks || tasks.length === 0) {
        return `✅ *All caught up!*\n\nNo tasks due soon.`;
    }

    let message = `⏰ *Tasks Due*\n\n`;
    tasks.forEach((t, i) => {
        const urgencyEmoji = t.urgency === 'overdue' ? '🔴' : t.urgency === 'due_today' ? '🟡' : '🔵';
        message += `${urgencyEmoji} ${t.title}\n`;
    });

    return message;
}

// Get priority tasks
async function getPriorityTasks(supabase) {
    const { data: tasks } = await supabase
        .from('priority_tasks')
        .select('*')
        .limit(10);

    if (!tasks || tasks.length === 0) {
        return `✅ *No Priority Tasks!*`;
    }

    let message = `🎯 *Priority Tasks*\n\n`;
    tasks.forEach((t, i) => {
        const urgencyEmoji = t.urgency === 'overdue' ? '🔴' : t.urgency === 'due_today' ? '🟡' : '🔵';
        message += `${urgencyEmoji} *${t.title}*\n`;
        if (t.project_customer) message += `   📋 ${t.project_customer}\n`;
        message += `\n`;
    });

    return message;
}

// Search projects
async function searchProjects(supabase, query) {
    const { data } = await supabase
        .from('projects')
        .select('*')
        .or(`customer.ilike.%${query}%,manufacturer.ilike.%${query}%`)
        .eq('is_archived', false)
        .limit(5);

    if (!data || data.length === 0) {
        return `🔍 No projects found for "${query}"`;
    }

    let message = `🔍 *Search Results*\n\n`;
    data.forEach((p, i) => {
        message += `${i + 1}. ${p.customer}\n   ${p.manufacturer} - $${formatAmount(p.quote_amount)}\n\n`;
    });

    return message;
}

// Help message
function getHelpMessage() {
    return `📱 *Pipe Tracker Commands*\n\n` +
        `*📋 PROJECTS*\n` +
        `• *ADD* - Add new project\n` +
        `• *LIST* - View projects\n` +
        `• *URGENT* - Overdue projects\n` +
        `• *STATS* - Pipeline summary\n` +
        `• *SEARCH [name]* - Search\n\n` +
        `*✅ TASKS*\n` +
        `• *TASKS* - View tasks\n` +
        `• *ADDTASK* - Add task\n` +
        `• *PRIORITY* - Priority tasks\n` +
        `• *DUETASKS* - Due tasks`;
}

// Helper functions
async function getSession(supabase, phone) {
    const { data } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone_number', phone)
        .single();

    if (data) return data;

    const { data: newSession } = await supabase
        .from('whatsapp_sessions')
        .insert({ phone_number: phone })
        .select()
        .single();

    return newSession;
}

async function updateSession(supabase, phone, state, context, projectId = null) {
    await supabase
        .from('whatsapp_sessions')
        .upsert({
            phone_number: phone,
            session_state: state,
            context: context,
            current_project_id: projectId,
            last_message_at: new Date().toISOString()
        });
}

// Send WhatsApp message using fetch (no Twilio SDK)
async function sendWhatsAppMessage(phone, message) {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = getWhatsAppNumber();
        const toNumber = `whatsapp:+${phone.replace(/\D/g, '')}`;

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
            const errorData = await response.text();
            throw new Error(`Twilio API error: ${response.status} - ${errorData}`);
        }
    } catch (error) {
        console.error(`Failed to send to ${phone}:`, error.message);
    }
}

function parseAmount(input) {
    input = input.toUpperCase().replace(/[,$\s]/g, '');
    if (input.includes('M')) return parseFloat(input.replace('M', '')) * 1000000;
    if (input.includes('K')) return parseFloat(input.replace('K', '')) * 1000;
    return parseFloat(input) || 0;
}

function formatAmount(amount) {
    amount = parseFloat(amount) || 0;
    if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
    return amount.toFixed(0);
}

function parseDueDate(input) {
    const upper = input.toUpperCase();
    const today = new Date();

    if (upper === 'TODAY') return today.toISOString().split('T')[0];
    if (upper === 'TOMORROW') {
        today.setDate(today.getDate() + 1);
        return today.toISOString().split('T')[0];
    }
    if (upper === 'WEEK') {
        today.setDate(today.getDate() + 7);
        return today.toISOString().split('T')[0];
    }
    if (upper === 'SKIP' || upper === 'NONE') return null;

    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

    return null;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'Today';

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

    if (date < today) {
        const days = Math.round((today - date) / (1000 * 60 * 60 * 24));
        return `${days} day${days > 1 ? 's' : ''} overdue`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
