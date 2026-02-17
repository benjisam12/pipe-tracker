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
        const status = searchParams.get('status');

        let query = supabase
            .from('tasks')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (listId) {
            query = query.eq('task_list_id', listId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Map database columns to what frontend expects
        const tasks = (data || []).map(task => ({
            ...task,
            is_completed: task.status === 'completed',
            list_id: task.task_list_id || task.list_id
        }));

        return NextResponse.json({ tasks });
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

        const listId = body.list_id || body.task_list_id || null;

        const taskData = {
            title: body.title,
            description: body.description || null,
            due_date: body.due_date || null,
            priority: body.priority || 'normal',
            task_list_id: listId || null,
            linked_project_id: body.project_id || null,
            status: 'pending',
            task_type: body.task_type || 'task',
            notes: body.notes || null,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('tasks')
            .insert(taskData)
            .select()
            .single();

        if (error) throw error;

        const task = {
            ...data,
            is_completed: data.status === 'completed',
            list_id: data.task_list_id
        };

        return NextResponse.json({ task });
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

        const updateData = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.due_date !== undefined) updateData.due_date = body.due_date;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.notes !== undefined) updateData.notes = body.notes;

        if (body.list_id !== undefined || body.task_list_id !== undefined) {
            const lid = body.list_id || body.task_list_id;
            updateData.task_list_id = lid || null;
        }

        if (body.linked_project_id !== undefined) {
            updateData.linked_project_id = body.linked_project_id || null;
        }

        if (body.is_completed !== undefined) {
            updateData.status = body.is_completed ? 'completed' : 'pending';
            updateData.completed_at = body.is_completed ? new Date().toISOString() : null;
        }

        if (body.status !== undefined) {
            updateData.status = body.status;
            if (body.status === 'completed') {
                updateData.completed_at = new Date().toISOString();
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

        const task = {
            ...data,
            is_completed: data.status === 'completed',
            list_id: data.task_list_id
        };

        return NextResponse.json({ task });
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
