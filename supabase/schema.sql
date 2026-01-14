-- =====================================================
-- TUBE & PIPE PLANT EQUIPMENT TRACKER - DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROJECTS TABLE - Core project/quotation tracking
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    customer VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    project_type VARCHAR(100), -- 'Coating Plant', 'Spiral Mill', 'Hydrotester', 'Spare Parts', 'Equipment', 'Consumables'

    -- Financial
    quote_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    negotiation_pct DECIMAL(5,2) DEFAULT 10, -- Markup percentage
    currency VARCHAR(3) DEFAULT 'USD',

    -- Priority & Status
    priority VARCHAR(20) NOT NULL DEFAULT 'non-priority', -- 'super', 'priority', 'non-priority'
    status VARCHAR(50) DEFAULT 'quoted', -- 'quoted', 'negotiation', 'lc_pending', 'technical_review', etc.

    -- Follow-up Tracking
    last_follow_up TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_follow_up TIMESTAMP WITH TIME ZONE,
    next_steps TEXT,

    -- Details
    notes TEXT,
    document_versions INTEGER DEFAULT 1,

    -- File Links (Google Drive, etc.)
    file_links JSONB DEFAULT '[]'::jsonb, -- Array of {name, url} objects

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),

    -- Soft delete
    is_archived BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- FOLLOW_UP_HISTORY - Track all interactions
-- =====================================================
CREATE TABLE follow_up_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    follow_up_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    follow_up_type VARCHAR(50), -- 'call', 'email', 'meeting', 'whatsapp', 'other'
    summary TEXT,
    outcome TEXT,
    next_action TEXT,

    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REMINDERS - Smart reminder queue
-- =====================================================
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    reminder_type VARCHAR(50), -- 'overdue', 'scheduled', 'daily_focus'
    message TEXT NOT NULL,
    smart_prompt TEXT, -- AI-generated contextual message

    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_via VARCHAR(50), -- 'whatsapp', 'email', 'push'

    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    response TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEAM_MEMBERS - User profiles
-- =====================================================
CREATE TABLE team_members (
    id UUID PRIMARY KEY REFERENCES auth.users(id),

    full_name VARCHAR(255),
    phone_number VARCHAR(20), -- For WhatsApp
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,

    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'

    -- Notification preferences
    notify_super_priority BOOLEAN DEFAULT TRUE,
    notify_priority BOOLEAN DEFAULT TRUE,
    notify_non_priority BOOLEAN DEFAULT TRUE,
    daily_digest_time TIME DEFAULT '08:00:00',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WHATSAPP_SESSIONS - Track conversation state
-- =====================================================
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,

    session_state VARCHAR(50) DEFAULT 'idle', -- 'idle', 'adding_project', 'updating_project', 'responding_reminder'
    context JSONB DEFAULT '{}'::jsonb, -- Store conversation context
    current_project_id UUID REFERENCES projects(id),

    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_projects_priority ON projects(priority) WHERE NOT is_archived;
CREATE INDEX idx_projects_status ON projects(status) WHERE NOT is_archived;
CREATE INDEX idx_projects_last_follow_up ON projects(last_follow_up) WHERE NOT is_archived;
CREATE INDEX idx_projects_customer ON projects(customer);
CREATE INDEX idx_reminders_scheduled ON reminders(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_whatsapp_phone ON whatsapp_sessions(phone_number);

-- =====================================================
-- FUNCTIONS - Smart reminder calculation
-- =====================================================

-- Function to calculate if a project needs follow-up
CREATE OR REPLACE FUNCTION calculate_follow_up_status(
    p_priority VARCHAR,
    p_last_follow_up TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    is_overdue BOOLEAN,
    hours_since_follow_up NUMERIC,
    days_since_follow_up NUMERIC,
    urgency_level INTEGER
) AS $$
DECLARE
    hours_diff NUMERIC;
    days_diff NUMERIC;
BEGIN
    hours_diff := EXTRACT(EPOCH FROM (NOW() - p_last_follow_up)) / 3600;
    days_diff := hours_diff / 24;

    RETURN QUERY SELECT
        CASE
            WHEN p_priority = 'super' AND hours_diff >= 12 THEN TRUE
            WHEN p_priority = 'priority' AND days_diff >= 2 THEN TRUE
            WHEN p_priority = 'non-priority' AND days_diff >= 5 THEN TRUE
            ELSE FALSE
        END as is_overdue,
        ROUND(hours_diff, 1) as hours_since_follow_up,
        ROUND(days_diff, 1) as days_since_follow_up,
        CASE
            WHEN p_priority = 'super' THEN
                CASE WHEN hours_diff >= 24 THEN 3 WHEN hours_diff >= 12 THEN 2 ELSE 1 END
            WHEN p_priority = 'priority' THEN
                CASE WHEN days_diff >= 5 THEN 3 WHEN days_diff >= 2 THEN 2 ELSE 1 END
            ELSE
                CASE WHEN days_diff >= 10 THEN 3 WHEN days_diff >= 5 THEN 2 ELSE 1 END
        END as urgency_level;
END;
$$ LANGUAGE plpgsql;

-- View for projects needing attention
CREATE OR REPLACE VIEW projects_needing_attention AS
SELECT
    p.*,
    fs.is_overdue,
    fs.hours_since_follow_up,
    fs.days_since_follow_up,
    fs.urgency_level,
    CASE p.status
        WHEN 'lc_pending' THEN 'LC Draft not received from ' || p.customer
        WHEN 'quoted' THEN 'Waiting for response on quotation from ' || p.customer
        WHEN 'technical_review' THEN 'Technical review pending for ' || p.customer
        WHEN 'budget_approval' THEN 'Budget approval pending from ' || p.customer
        WHEN 'negotiation' THEN 'Negotiation ongoing with ' || p.customer
        WHEN 'evaluation' THEN p.customer || ' still evaluating - follow up needed'
        WHEN 'final_negotiation' THEN 'Final stage with ' || p.customer || ' - close the deal!'
        WHEN 'documentation' THEN 'Documentation pending for ' || p.customer
        WHEN 'revision_needed' THEN 'Revised quote needed for ' || p.customer
        WHEN 'inspection' THEN 'Inspection coordination needed for ' || p.customer
        ELSE 'Follow up needed with ' || p.customer
    END as smart_message
FROM projects p
CROSS JOIN LATERAL calculate_follow_up_status(p.priority, p.last_follow_up) fs
WHERE p.is_archived = FALSE
AND fs.is_overdue = TRUE
ORDER BY fs.urgency_level DESC, p.quote_amount DESC;

-- View for daily focus (random non-priority projects)
CREATE OR REPLACE VIEW daily_focus_projects AS
SELECT * FROM projects
WHERE priority = 'non-priority'
AND is_archived = FALSE
ORDER BY RANDOM()
LIMIT 5;

-- =====================================================
-- TRIGGERS - Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Policies - Allow authenticated users full access (small team)
CREATE POLICY "Allow full access to authenticated users" ON projects
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON follow_up_history
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON reminders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON team_members
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access to authenticated users" ON whatsapp_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE DATA (Optional - remove in production)
-- =====================================================
-- Uncomment below to insert sample data for testing

/*
INSERT INTO projects (customer, manufacturer, project_type, quote_amount, negotiation_pct, priority, status, last_follow_up, next_steps, notes) VALUES
('Saudi Steel Pipe Company', 'Shawflex (Canada)', 'Coating Plant', 4500000, 8, 'super', 'negotiation', NOW() - INTERVAL '14 hours', 'Waiting for revised technical specs', '3LPE Coating Plant - 48" capacity'),
('Welspun Middle East', 'SMS Group (Germany)', 'Spiral Mill', 12500000, 5, 'super', 'lc_pending', NOW() - INTERVAL '1 day', 'LC Draft review pending', '100" Spiral Pipe Mill - complete line'),
('Jindal SAW Gulf', 'Bauhuis (Netherlands)', 'Hydrotester', 890000, 12, 'priority', 'quoted', NOW() - INTERVAL '3 days', 'Send updated quotation', 'Hydrotester 3000 bar'),
('Abu Dhabi Pipe Factory', 'Blastrac (Belgium)', 'Spare Parts', 320000, 15, 'priority', 'technical_review', NOW() - INTERVAL '2 days', 'Technical meeting Jan 18', 'Shot Blasting Machine spare parts'),
('Yas Pipes (UAE)', 'Vastraco (Belgium)', 'Coating Plant', 6800000, 6, 'super', 'final_negotiation', NOW() - INTERVAL '6 hours', 'Final pricing by Jan 16', 'Complete 3LPE + FBE Coating Line');
*/
