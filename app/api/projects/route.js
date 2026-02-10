import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('projects').select('*').eq('is_archived', false).order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request) {
    const supabase = getSupabase();
    const body = await request.json();
    const { data, error } = await supabase.from('projects').insert({
        customer: body.customer,
        project_name: body.project_name,
        notes: body.notes || null,
        status: 'active',
        last_follow_up: new Date().toISOString()
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(request) {
    const supabase = getSupabase();
    const body = await request.json();
    const { data, error } = await supabase.from('projects').update({
        customer: body.customer,
        project_name: body.project_name,
        notes: body.notes
    }).eq('id', body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request) {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { error } = await supabase.from('projects').update({ is_archived: true }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
