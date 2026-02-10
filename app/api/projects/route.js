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
            project_name: body.project_name,
            manufacturer: body.manufacturer || 'N/A',
            notes: body.notes || null,
            quote_amount: body.quote_amount || 0,
            status: 'active',
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
        const { data, error } = await supabase.from('projects').update({
            customer: body.customer,
            project_name: body.project_name,
            notes: body.notes,
            quote_amount: body.quote_amount,
            last_follow_up: new Date().toISOString()
        }).eq('id', body.id).select().single();
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
