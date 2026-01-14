-- =====================================================
-- TASKS & TO-DO LISTS - Additional Schema
-- =====================================================
-- Run this AFTER the main schema.sql

-- =====================================================
-- TASK_LISTS - Parent categories/projects for tasks
-- =====================================================
CREATE TABLE task_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT 'blue', -- 'blue', 'green', 'purple', 'orange', 'red', 'gray'
    icon VARCHAR(50) DEFAULT 'folder', -- lucide icon name

    -- Optional link to a project
    linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- 'high', 'normal', 'low'
    due_date DATE,

    -- Progress tracking
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- TASKS - Individual to-do items
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parent list (optional - can be standalone project task)
    task_list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- For subtasks

    -- Direct link to project (for project-specific tasks)
    linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'

    -- Task type for project tasks
    task_type VARCHAR(50), -- 'quotation', 'follow_up', 'documentation', 'inspection', 'payment', 'general'

    -- Dates
    due_date DATE,
    due_time TIME,
    reminder_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),

    -- Additional info
    notes TEXT,
    tags TEXT[], -- Array of tags like ['exhibition', 'urgent', 'website']
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of {name, url}

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TASK_COMMENTS - Comments on tasks
-- =====================================================
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_task_lists_archived ON task_lists(is_archived);
CREATE INDEX idx_task_lists_linked_project ON task_lists(linked_project_id);
CREATE INDEX idx_tasks_list ON tasks(task_list_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_linked_project ON tasks(linked_project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);

-- =====================================================
-- TRIGGERS - Auto-update task counts
-- =====================================================
CREATE OR REPLACE FUNCTION update_task_list_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update counts for the affected task list
    IF TG_OP = 'DELETE' THEN
        UPDATE task_lists SET
            total_tasks = (SELECT COUNT(*) FROM tasks WHERE task_list_id = OLD.task_list_id AND parent_task_id IS NULL),
            completed_tasks = (SELECT COUNT(*) FROM tasks WHERE task_list_id = OLD.task_list_id AND parent_task_id IS NULL AND status = 'completed'),
            updated_at = NOW()
        WHERE id = OLD.task_list_id;
        RETURN OLD;
    ELSE
        UPDATE task_lists SET
            total_tasks = (SELECT COUNT(*) FROM tasks WHERE task_list_id = NEW.task_list_id AND parent_task_id IS NULL),
            completed_tasks = (SELECT COUNT(*) FROM tasks WHERE task_list_id = NEW.task_list_id AND parent_task_id IS NULL AND status = 'completed'),
            updated_at = NOW()
        WHERE id = NEW.task_list_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_counts
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_list_counts();

-- Auto-update timestamps
CREATE TRIGGER trigger_task_lists_updated_at
    BEFORE UPDATE ON task_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON task_lists
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON tasks
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON task_comments
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- VIEW - Tasks needing attention
-- =====================================================
CREATE OR REPLACE VIEW tasks_needing_attention AS
SELECT
    t.*,
    COALESCE(tl.name, 'Project Tasks') as list_name,
    COALESCE(tl.color, 'blue') as list_color,
    p.customer as project_customer,
    p.manufacturer as project_manufacturer,
    p.priority as project_priority,
    CASE
        WHEN t.due_date < CURRENT_DATE THEN 'overdue'
        WHEN t.due_date = CURRENT_DATE THEN 'due_today'
        WHEN t.due_date = CURRENT_DATE + 1 THEN 'due_tomorrow'
        ELSE 'upcoming'
    END as urgency,
    CURRENT_DATE - t.due_date as days_overdue,
    CASE WHEN t.linked_project_id IS NOT NULL THEN true ELSE false END as is_project_task
FROM tasks t
LEFT JOIN task_lists tl ON t.task_list_id = tl.id
LEFT JOIN projects p ON t.linked_project_id = p.id
WHERE t.status NOT IN ('completed', 'cancelled')
AND t.due_date IS NOT NULL
AND t.due_date <= CURRENT_DATE + 7
ORDER BY t.due_date ASC, t.priority DESC;

-- =====================================================
-- VIEW - Project Tasks (tasks linked to projects)
-- =====================================================
CREATE OR REPLACE VIEW project_tasks AS
SELECT
    t.*,
    p.customer as project_customer,
    p.manufacturer as project_manufacturer,
    p.quote_amount as project_value,
    p.priority as project_priority,
    p.status as project_status,
    p.last_follow_up as project_last_follow_up,
    CASE
        WHEN t.due_date < CURRENT_DATE THEN 'overdue'
        WHEN t.due_date = CURRENT_DATE THEN 'due_today'
        WHEN t.due_date = CURRENT_DATE + 1 THEN 'due_tomorrow'
        ELSE 'upcoming'
    END as urgency,
    CURRENT_DATE - t.due_date as days_overdue
FROM tasks t
JOIN projects p ON t.linked_project_id = p.id
WHERE t.status NOT IN ('completed', 'cancelled')
AND p.is_archived = false
ORDER BY
    CASE p.priority
        WHEN 'super' THEN 1
        WHEN 'priority' THEN 2
        ELSE 3
    END,
    t.due_date ASC NULLS LAST,
    t.priority DESC;

-- =====================================================
-- VIEW - Priority Tasks (combines urgent project tasks + general urgent tasks)
-- =====================================================
CREATE OR REPLACE VIEW priority_tasks AS
SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority as task_priority,
    t.task_type,
    t.due_date,
    t.linked_project_id,
    t.task_list_id,
    p.customer as project_customer,
    p.manufacturer as project_manufacturer,
    p.quote_amount as project_value,
    p.priority as project_priority,
    tl.name as list_name,
    CASE
        WHEN t.due_date < CURRENT_DATE THEN 'overdue'
        WHEN t.due_date = CURRENT_DATE THEN 'due_today'
        WHEN t.due_date = CURRENT_DATE + 1 THEN 'due_tomorrow'
        ELSE 'upcoming'
    END as urgency,
    CURRENT_DATE - t.due_date as days_overdue,
    CASE WHEN t.linked_project_id IS NOT NULL THEN true ELSE false END as is_project_task,
    -- Priority score for sorting
    CASE
        WHEN t.due_date < CURRENT_DATE AND t.priority = 'urgent' THEN 1
        WHEN t.due_date < CURRENT_DATE THEN 2
        WHEN t.due_date = CURRENT_DATE AND t.priority = 'urgent' THEN 3
        WHEN t.due_date = CURRENT_DATE THEN 4
        WHEN p.priority = 'super' THEN 5
        WHEN t.priority = 'urgent' THEN 6
        WHEN p.priority = 'priority' THEN 7
        WHEN t.priority = 'high' THEN 8
        ELSE 9
    END as priority_score
FROM tasks t
LEFT JOIN projects p ON t.linked_project_id = p.id
LEFT JOIN task_lists tl ON t.task_list_id = tl.id
WHERE t.status NOT IN ('completed', 'cancelled')
AND (
    -- Include if: overdue, due today/tomorrow, urgent priority, or linked to super/priority project
    t.due_date <= CURRENT_DATE + 1
    OR t.priority IN ('urgent', 'high')
    OR p.priority IN ('super', 'priority')
)
ORDER BY priority_score ASC, t.due_date ASC NULLS LAST;

-- =====================================================
-- SAMPLE DATA
-- =====================================================
-- Uncomment to add sample task lists

/*
INSERT INTO task_lists (name, description, color, icon, priority, due_date) VALUES
('Exhibition Prep', 'ADIPEC 2026 preparation tasks', 'purple', 'calendar', 'high', '2026-02-15'),
('Website Rebuild', 'New company website project', 'green', 'globe', 'normal', '2026-03-01'),
('Office Admin', 'General administrative tasks', 'gray', 'briefcase', 'low', NULL);

-- Get the list IDs and insert tasks
WITH lists AS (
    SELECT id, name FROM task_lists
)
INSERT INTO tasks (task_list_id, title, priority, due_date, status) VALUES
((SELECT id FROM lists WHERE name = 'Exhibition Prep'), 'Book exhibition booth', 'urgent', '2026-01-20', 'pending'),
((SELECT id FROM lists WHERE name = 'Exhibition Prep'), 'Get quotes for booth design', 'high', '2026-01-25', 'pending'),
((SELECT id FROM lists WHERE name = 'Exhibition Prep'), 'Email organizer for badge list', 'normal', '2026-01-30', 'pending'),
((SELECT id FROM lists WHERE name = 'Exhibition Prep'), 'Prepare product brochures', 'high', '2026-02-01', 'pending'),
((SELECT id FROM lists WHERE name = 'Exhibition Prep'), 'Arrange hotel bookings', 'normal', '2026-02-05', 'pending'),
((SELECT id FROM lists WHERE name = 'Website Rebuild'), 'Contact web developers', 'high', '2026-01-18', 'pending'),
((SELECT id FROM lists WHERE name = 'Website Rebuild'), 'Gather content from team', 'normal', '2026-01-25', 'pending'),
((SELECT id FROM lists WHERE name = 'Website Rebuild'), 'Review competitor websites', 'low', '2026-01-20', 'pending'),
((SELECT id FROM lists WHERE name = 'Website Rebuild'), 'Prepare product images', 'normal', '2026-02-01', 'pending'),
((SELECT id FROM lists WHERE name = 'Office Admin'), 'Renew trade license', 'urgent', '2026-01-31', 'pending'),
((SELECT id FROM lists WHERE name = 'Office Admin'), 'Update company profile', 'low', NULL, 'pending');
*/
