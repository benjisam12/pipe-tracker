import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
}

// GET all projects
export async function GET(request) {
    try {
        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);
        const priority = searchParams.get('priority');

        let query = supabase
            .from('projects')
            .select('*')
            .or('is_archived.is.null,is_archived.eq.false')
            .order('created_at', { ascending: false });

        if (priority && priority !== 'all') {
            query = query.eq('priority', priority);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ projects: data || [] });
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json({ error: error.message, projects: [] }, { status: 500 });
    }
}

// POST - Create new project
export async function POST(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        // Clean up empty strings to null
        const cleanValue = (val) => {
            if (val === '' || val === 'N/A' || val === 'n/a' || val === 'NA') return null;
            return val;
        };

        const projectData = {
            customer: body.customer,
            manufacturer: cleanValue(body.manufacturer),
            project_name: cleanValue(body.project_name),
            quote_amount: parseFloat(body.quote_amount) || 0,
            margin: parseFloat(body.margin) || 0,
            priority: body.priority || 'non-priority',
            status: body.status || 'quoted',
            next_steps: cleanValue(body.next_steps),
            reminder_question: cleanValue(body.reminder_question),
            notes: cleanValue(body.notes),
            is_archived: false,
            last_follow_up: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ project: data });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update project
export async function PUT(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        // Clean up empty strings to null
        const cleanValue = (val) => {
            if (val === '' || val === 'N/A' || val === 'n/a' || val === 'NA') return null;
            return val;
        };

        // Build update object with only provided fields
        const updateData = {};

        if (body.customer !== undefined) updateData.customer = body.customer;
        if (body.manufacturer !== undefined) updateData.manufacturer = cleanValue(body.manufacturer);
        if (body.project_name !== undefined) updateData.project_name = cleanValue(body.project_name);
        if (body.quote_amount !== undefined) updateData.quote_amount = parseFloat(body.quote_amount) || 0;
        if (body.margin !== undefined) updateData.margin = parseFloat(body.margin) || 0;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.next_steps !== undefined) updateData.next_steps = cleanValue(body.next_steps);
        if (body.reminder_question !== undefined) updateData.reminder_question = cleanValue(body.reminder_question);
        if (body.notes !== undefined) updateData.notes = cleanValue(body.notes);
        if (body.last_follow_up !== undefined) updateData.last_follow_up = body.last_follow_up;
        if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ project: data });
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete project
export async function DELETE(request) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        // Soft delete by archiving
        const { error } = await supabase
            .from('projects')
            .update({ is_archived: true, updated_at: new Date().toISOString() })
            .eq('id', body.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
