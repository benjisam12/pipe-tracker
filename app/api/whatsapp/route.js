import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
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

        console.log(`Received from ${phone}: ${body}`);

        const supabase = getSupabase();

        let session = await getSession(supabase, phone);
        let response;

        switch (session?.session_state) {
            case 'adding_project':
                response = await handleAddProject(supabase, session, body, phone);
                break;
            default:
                response = await handleCommand(supabase, message, phone);
        }

        await sendWhatsAppMessage(phone, response);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function handleCommand(supabase, message, phone) {
    if (message === 'ADD' || message === 'NEW') {
        await updateSession(supabase, phone, 'adding_project', { step: 'customer' });
        return '📝 *Add New Project*\n\nWhat is the *customer name*?';
    }
    if (message === 'LIST') {
        const { data } = await supabase.from('projects').select('*').eq('is_archived', false).limit(10);
        if (!data || data.length === 0) return '📋 No projects yet. Type *ADD* to create one!';
        let msg = '📋 *Your Projects*\n\n';
        data.forEach((p, i) => { msg += `${i+1}. ${p.customer} - $${p.quote_amount}\n`; });
        return msg;
    }
    if (message === 'HELP') {
        return '📱 *Commands*\n\n• *ADD* - Add project\n• *LIST* - View projects';
    }
    return '👋 Hi! Type *HELP* for commands or *ADD* to add a project.';
}

async function handleAddProject(supabase, session, input, phone) {
    const context = session.context || {};
    
    if (context.step === 'customer') {
        context.customer = input;
        context.step = 'amount';
        await updateSession(supabase, phone, 'adding_project', context);
        return `✅ Customer: *${input}*\n\nWhat is the *quote amount*? (e.g., 50000)`;
    }
    
    if (context.step === 'amount') {
        const amount = parseFloat(input.replace(/[,$]/g, '')) || 0;
        await supabase.from('projects').insert({
            customer: context.customer,
            quote_amount: amount,
            priority: 'non-priority',
            status: 'quoted',
            last_follow_up: new Date().toISOString()
        });
        await updateSession(supabase, phone, 'idle', {});
        return `🎉 *Project Added!*\n\n📋 ${context.customer}\n💰 $${amount}`;
    }
    
    await updateSession(supabase, phone, 'idle', {});
    return 'Something went wrong. Type *ADD* to start over.';
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
        body: new URLSearchParams({
            From: twilioNumber,
            To: `whatsapp:${phone}`,
            Body: message,
        }),
    });
}
