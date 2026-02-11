import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
}

// GET all task lists
export async function GET(request) {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('task_lists')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ lists: data || [] });
    } catch (error) {
        console.error('Error fetching task lists:', error);
        return NextResponse.json({ error: error.message, lists: [] }, { status: 500 });
    }
}

// POST - Create new task list
export async function POST(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json({ error: 'List name required' }, { status: 400 });
        }

        const listData = {
            name: body.name,
            description: body.description || null,
            color: body.color || '#3b82f6',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('task_lists')
            .insert(listData)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ list: data });
    } catch (error) {
        console.error('Error creating task list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update task list
export async function PUT(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'List ID required' }, { status: 400 });
        }

        const updateData = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.color !== undefined) updateData.color = body.color;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('task_lists')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ list: data });
    } catch (error) {
        console.error('Error updating task list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete task list
export async function DELETE(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'List ID required' }, { status: 400 });
        }

        // First, unassign all tasks from this list
        await supabase
            .from('tasks')
            .update({ list_id: null })
            .eq('list_id', body.id);

        // Then delete the list
        const { error } = await supabase
            .from('task_lists')
            .delete()
            .eq('id', body.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting task list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
