import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .or('is_archived.is.null,is_archived.eq.false')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (e) {
        console.error('GET error:', e);
        return NextResponse.json([]);
    }
}

export async function POST(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();
        const { data, error } = await supabase.from('projects').insert({
            customer: body.customer,
            manufacturer: body.manufacturer || 'N/A',
            project_name: body.project_name,
            quote_amount: body.quote_amount || 0,
            margin: body.margin || 0,
            priority: body.priority || 'non-priority',
            status: body.status || 'quoted',
            next_steps: body.next_steps,
            reminder_question: body.reminder_question,
            notes: body.notes,
            is_archived: false,
            last_follow_up: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return NextResponse.json(data);
    } catch (e) {
        console.error('POST error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();
        const updateData = { updated_at: new Date().toISOString() };
        
        if (body.customer !== undefined) updateData.customer = body.customer;
        if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer;
        if (body.project_name !== undefined) updateData.project_name = body.project_name;
        if (body.quote_amount !== undefined) updateData.quote_amount = body.quote_amount;
        if (body.margin !== undefined) updateData.margin = body.margin;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.next_steps !== undefined) updateData.next_steps = body.next_steps;
        if (body.reminder_question !== undefined) updateData.reminder_question = body.reminder_question;
        if (body.notes !== undefined) updateData.notes = body.notes;
        if (body.last_follow_up !== undefined) updateData.last_follow_up = body.last_follow_up;
        
        const { data, error } = await supabase.from('projects').update(updateData).eq('id', body.id).select().single();
        if (error) throw error;
        return NextResponse.json(data);
    } catch (e) {
        console.error('PUT error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { error } = await supabase.from('projects').update({ is_archived: true }).eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
