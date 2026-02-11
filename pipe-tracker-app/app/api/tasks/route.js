import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
}

// GET all tasks
export async function GET(request) {
    try {
        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);
        const listId = searchParams.get('list_id');
        const completed = searchParams.get('completed');

        let query = supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (listId) {
            query = query.eq('list_id', listId);
        }

        if (completed === 'true') {
            query = query.eq('is_completed', true);
        } else if (completed === 'false') {
            query = query.eq('is_completed', false);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ tasks: data || [] });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 });
    }
}

// POST - Create new task
export async function POST(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.title) {
            return NextResponse.json({ error: 'Task title required' }, { status: 400 });
        }

        const taskData = {
            title: body.title,
            description: body.description || null,
            due_date: body.due_date || null,
            priority: body.priority || 'normal',
            list_id: body.list_id ? parseInt(body.list_id) : null,
            project_id: body.project_id ? parseInt(body.project_id) : null,
            is_completed: false,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ task: data });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update task
export async function PUT(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        // Build update object with only provided fields
        const updateData = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.due_date !== undefined) updateData.due_date = body.due_date;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.list_id !== undefined) updateData.list_id = body.list_id ? parseInt(body.list_id) : null;
        if (body.project_id !== undefined) updateData.project_id = body.project_id ? parseInt(body.project_id) : null;
        if (body.is_completed !== undefined) {
            updateData.is_completed = body.is_completed;
            if (body.is_completed) {
                updateData.completed_at = new Date().toISOString();
            } else {
                updateData.completed_at = null;
            }
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ task: data });
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete task
export async function DELETE(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', body.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
