import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
    return NextResponse.json({ status: 'Pipe Tracker WhatsApp Bot Active' });
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const from = formData.get('From');
        const body = formData.get('Body');
        const phone = from?.replace('whatsapp:', '') || '';
        const message = body?.trim().toUpperCase() || '';
        const originalMessage = body?.trim() || '';
        const supabase = getSupabase();
        let session = await getSession(supabase, phone);
        let response;

        switch (session?.session_state) {
            case 'adding_project':
                response = await handleAddProject(supabase, session, originalMessage, phone);
                break;
            case 'adding_task':
                response = await handleAddTask(supabase, session, originalMessage, phone);
                break;
            default:
                response = await handleCommand(supabase, message, originalMessage, phone);
        }

        await sendWhatsAppMessage(phone, response);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function handleCommand(supabase, message, originalMessage, phone) {
    // ADD PROJECT
    if (message === 'ADD' || message === 'NEW') {
        await updateSession(supabase, phone, 'adding_project', { step: 'customer' });
        return '📝 *Add New Project*\n\nWhat is the *customer name*?';
    }

    // LIST PROJECTS
    if (message === 'LIST' || message === 'PROJECTS') {
        const { data } = await supabase.from('projects').select('*').eq('is_archived', false).order('created_at', { ascending: false }).limit(10);
        if (!data || data.length === 0) return '📋 No projects yet. Type *ADD* to create one!';
        let msg = '📋 *Your Projects*\n\n';
        data.forEach((p, i) => { 
            msg += `${i+1}. *${p.customer}*\n   📁 ${p.project_name || 'N/A'}\n`;
            if (p.notes) msg += `   📝 ${p.notes}\n`;
            msg += '\n';
        });
        return msg;
    }

    // SEARCH
    if (message.startsWith('SEARCH ') || message.startsWith('FIND ')) {
        const query = originalMessage.substring(originalMessage.indexOf(' ') + 1);
        const { data } = await supabase.from('projects').select('*').eq('is_archived', false).or(`customer.ilike.%${query}%,project_name.ilike.%${query}%,notes.ilike.%${query}%`).limit(10);
        if (!data || data.length === 0) return `🔍 No projects found for "${query}"`;
        let msg = `🔍 *Search Results for "${query}"*\n\n`;
        data.forEach((p, i) => {
            msg += `${i+1}. *${p.customer}*\n   📁 ${p.project_name || 'N/A'}\n\n`;
        });
        return msg;
    }

    // STATS
    if (message === 'STATS' || message === 'SUMMARY') {
        const { data: projects } = await supabase.from('projects').select('*').eq('is_archived', false);
        const { data: tasks } = await supabase.from('tasks').select('*').neq('status', 'completed');
        
        const totalProjects = projects?.length || 0;
        const totalTasks = tasks?.length || 0;
        const overdueTasks = tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date()).length || 0;
        
        let msg = '📊 *Stats Summary*\n\n';
        msg += `📁 *Projects:* ${totalProjects}\n`;
        msg += `✅ *Open Tasks:* ${totalTasks}\n`;
        if (overdueTasks > 0) msg += `🔴 *Overdue Tasks:* ${overdueTasks}\n`;
        
        return msg;
    }

    // ADD TASK
    if (message === 'TASK' || message === 'ADDTASK' || message === 'NEWTASK') {
        await updateSession(supabase, phone, 'adding_task', { step: 'title' });
        return '✅ *Add New Task*\n\nWhat is the *task*?';
    }

    // LIST TASKS
    if (message === 'TASKS' || message === 'TODO') {
        const { data } = await supabase.from('tasks').select('*').neq('status', 'completed').order('due_date', { ascending: true, nullsFirst: false }).limit(10);
        if (!data || data.length === 0) return '✅ No tasks! Type *TASK* to add one.';
        let msg = '✅ *Your Tasks*\n\n';
        data.forEach((t, i) => {
            const dueText = t.due_date ? formatDate(t.due_date) : 'No due date';
            const emoji = t.due_date && new Date(t.due_date) < new Date() ? '🔴' : '⚪';
            msg += `${emoji} ${t.title}\n   📅 ${dueText}\n\n`;
        });
        return msg;
    }

    // DONE TASK
    if (message.startsWith('DONE ')) {
        const taskNum = parseInt(message.split(' ')[1]) - 1;
        const { data: tasks } = await supabase.from('tasks').select('*').neq('status', 'completed').order('due_date', { ascending: true, nullsFirst: false }).limit(10);
        if (tasks && tasks[taskNum]) {
            await supabase.from('tasks').update({ status: 'completed' }).eq('id', tasks[taskNum].id);
            return `✅ Completed: *${tasks[taskNum].title}*`;
        }
        return '❌ Task not found. Type *TASKS* to see your list.';
    }

    // HELP
    if (message === 'HELP' || message === 'MENU') {
        return `📱 *Pipe Tracker Commands*

*📁 PROJECTS*
- *ADD* - Add new project
- *LIST* - View all projects
- *SEARCH [text]* - Search projects

*✅ TASKS*
- *TASK* - Add new task
- *TASKS* - View tasks
- *DONE [number]* - Complete task

*📊 OTHER*
- *STATS* - View summary
- *HELP* - Show commands`;
    }

    return '👋 Hi! Type *HELP* for commands.';
}

async function handleAddProject(supabase, session, input, phone) {
    const context = session.context || {};
    
    if (context.step === 'customer') {
        context.customer = input;
        context.step = 'project_name';
        await updateSession(supabase, phone, 'adding_project', context);
        return `✅ Customer: *${input}*\n\nWhat is the *project name/details*?`;
    }
    
    if (context.step === 'project_name') {
        context.project_name = input;
        context.step = 'notes';
        await updateSession(supabase, phone, 'adding_project', context);
        return `✅ Project: *${input}*\n\nAny *notes*? (Type NA if none)`;
    }
    
    if (context.step === 'notes') {
        const notes = (input.toUpperCase() === 'NA' || input.toUpperCase() === 'N/A') ? null : input;
        await supabase.from('projects').insert({
            customer: context.customer,
            project_name: context.project_name,
            notes: notes,
            status: 'active',
            last_follow_up: new Date().toISOString()
        });
        await updateSession(supabase, phone, 'idle', {});
        let response = `🎉 *Project Added!*\n\n👤 ${context.customer}\n📁 ${context.project_name}`;
        if (notes) response += `\n📝 ${notes}`;
        return response;
    }
    
    await updateSession(supabase, phone, 'idle', {});
    return 'Something went wrong. Type *ADD* to start over.';
}

async function handleAddTask(supabase, session, input, phone) {
    const context = session.context || {};
    
    if (context.step === 'title') {
        context.title = input;
        context.step = 'due_date';
        await updateSession(supabase, phone, 'adding_task', context);
        return `✅ Task: *${input}*\n\nWhen is it due?\n\n• *TODAY*\n• *TOMORROW*\n• *WEEK* (7 days)\n• Type a date (e.g., Feb 15)\n• *NA* for no due date`;
    }
    
    if (context.step === 'due_date') {
        const dueDate = parseDate(input);
        await supabase.from('tasks').insert({
            title: context.title,
            due_date: dueDate,
            status: 'pending'
        });
        await updateSession(supabase, phone, 'idle', {});
        let response = `🎉 *Task Added!*\n\n✅ ${context.title}`;
        if (dueDate) response += `\n📅 Due: ${formatDate(dueDate)}`;
        return response;
    }
    
    await updateSession(supabase, phone, 'idle', {});
    return 'Something went wrong. Type *TASK* to start over.';
}

function parseDate(input) {
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
    if (upper === 'NA' || upper === 'N/A' || upper === 'NONE') return null;
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return null;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() === today.getTime()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (date < today) return 'Overdue';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function getSession(supabase, phone) {
    const { data } = await supabase.from('whatsapp_sessions').select('*').eq('phone_number', phone).single();
    if (data) return data;
    const { data: newSession } = await supabase.from('whatsapp_sessions').insert({ phone_number: phone, session_state: 'idle', context: {} }).select().single();
    return newSession;
}

async function updateSession(supabase, phone, state, context) {
    await supabase.from('whatsapp_sessions').update({ session_state: state, context: context, last_message_at: new Date().toISOString() }).eq('phone_number', phone);
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
