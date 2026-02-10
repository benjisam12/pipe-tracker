import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
    try {
        const supabase = getSupabase();
        const { data } = await supabase.from('task_lists').select('*').order('id');
        return NextResponse.json(data || []);
    } catch (e) {
        return NextResponse.json([]);
    }
}
