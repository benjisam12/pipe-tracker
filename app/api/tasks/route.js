import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
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
        const { data, error } = await supabase.from('tasks').insert({
            title: body.title,
            due_date: body.due_date || null,
            list_id: body.list_id ? parseInt(body.list_id) : null,
            priority: body.priority || 'normal',
            status: 'pending'
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
        const updateData = {};
        
        if (body.title !== undefined) updateData.title = body.title;
        if (body.due_date !== undefined) updateData.due_date = body.due_date;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.list_id !== undefined) updateData.list_id = body.list_id ? parseInt(body.list_id) : null;
        if (body.priority !== undefined) updateData.priority = body.priority;
        
        const { data, error } = await supabase.from('tasks').update(updateData).eq('id', body.id).select().single();
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
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('DELETE error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
