import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('tasks').select('*').neq('status', 'completed').order('due_date', { ascending: true, nullsFirst: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request) {
    const supabase = getSupabase();
    const body = await request.json();
    const { data, error } = await supabase.from('tasks').insert({
        title: body.title,
        due_date: body.due_date || null,
        status: 'pending'
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(request) {
    const supabase = getSupabase();
    const body = await request.json();
    const { data, error } = await supabase.from('tasks').update({
        title: body.title,
        due_date: body.due_date,
        status: body.status
    }).eq('id', body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request) {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
