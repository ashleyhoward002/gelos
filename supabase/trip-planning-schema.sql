-- Comprehensive Trip Planning Schema
-- Run this in Supabase SQL Editor

-- ============ TRAVEL INFO (Flights) ============

CREATE TABLE IF NOT EXISTS trip_flights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flight_type TEXT NOT NULL CHECK (flight_type IN ('departure', 'return')),

    airline TEXT,
    flight_number TEXT,
    departure_city TEXT,
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    confirmation_number TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ACCOMMODATIONS ============

CREATE TABLE IF NOT EXISTS trip_accommodations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,

    name TEXT NOT NULL, -- Hotel/Airbnb name
    accommodation_type TEXT DEFAULT 'hotel', -- hotel, airbnb, house, other
    address TEXT,
    check_in_date DATE,
    check_in_time TIME,
    check_out_date DATE,
    check_out_time TIME,
    confirmation_number TEXT,
    access_code TEXT, -- Door code
    contact_phone TEXT,
    notes TEXT,

    cost_per_night DECIMAL(12, 2),
    total_cost DECIMAL(12, 2),
    currency TEXT DEFAULT 'USD',
    booked_by UUID REFERENCES auth.users(id),

    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room assignments for accommodations
CREATE TABLE IF NOT EXISTS trip_room_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    accommodation_id UUID NOT NULL REFERENCES trip_accommodations(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL, -- "Room 1", "Master Bedroom", etc.
    user_ids UUID[] NOT NULL, -- Array of user IDs in this room
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ACTIVITIES & EXCURSIONS ============

CREATE TABLE IF NOT EXISTS trip_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    activity_date DATE,
    start_time TIME,
    end_time TIME,
    location TEXT,

    cost_per_person DECIMAL(12, 2) DEFAULT 0,
    total_cost DECIMAL(12, 2), -- For flat-rate activities
    currency TEXT DEFAULT 'USD',

    is_group_activity BOOLEAN DEFAULT false, -- Everyone participates
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'interested', 'booked', 'completed', 'cancelled')),
    confirmation_number TEXT,
    notes TEXT,

    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Who's participating in each activity
CREATE TABLE IF NOT EXISTS trip_activity_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES trip_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'in', 'out', 'maybe')),
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(activity_id, user_id)
);

-- ============ ITINERARY ITEMS (Day-by-day schedule) ============

CREATE TABLE IF NOT EXISTS trip_itinerary_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,

    item_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    title TEXT NOT NULL,
    location TEXT,
    notes TEXT,

    item_type TEXT DEFAULT 'activity' CHECK (item_type IN ('activity', 'meal', 'transport', 'free_time', 'other')),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'booked', 'optional', 'free_time')),

    cost DECIMAL(12, 2),
    currency TEXT DEFAULT 'USD',
    confirmation_number TEXT,

    -- Link to activity if applicable
    activity_id UUID REFERENCES trip_activities(id) ON DELETE SET NULL,

    sort_order INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ TASKS / TO-DO ============

CREATE TABLE IF NOT EXISTS trip_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,

    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),

    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Task assignments (many-to-many)
CREATE TABLE IF NOT EXISTS trip_task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES trip_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(task_id, user_id)
);

-- ============ DOCUMENTS ============

CREATE TABLE IF NOT EXISTS trip_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for shared docs

    title TEXT NOT NULL,
    file_url TEXT, -- Storage URL
    external_url TEXT, -- External link

    category TEXT DEFAULT 'other' CHECK (category IN ('flights', 'hotel', 'activities', 'insurance', 'passport', 'other')),
    is_private BOOLEAN DEFAULT FALSE, -- Only visible to uploader
    notes TEXT,

    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PACKING LISTS ============

CREATE TABLE IF NOT EXISTS trip_packing_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    outing_id UUID NOT NULL REFERENCES outings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for shared list

    item_name TEXT NOT NULL,
    category TEXT DEFAULT 'misc' CHECK (category IN ('clothes', 'toiletries', 'electronics', 'documents', 'misc')),
    is_packed BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE, -- Shared with everyone vs personal

    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_trip_flights_outing_id ON trip_flights(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_flights_user_id ON trip_flights(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_outing_id ON trip_accommodations(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_outing_id ON trip_activities(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_participants_activity_id ON trip_activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_participants_user_id ON trip_activity_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_items_outing_id ON trip_itinerary_items(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_items_item_date ON trip_itinerary_items(item_date);
CREATE INDEX IF NOT EXISTS idx_trip_tasks_outing_id ON trip_tasks(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_task_assignments_task_id ON trip_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_trip_documents_outing_id ON trip_documents(outing_id);
CREATE INDEX IF NOT EXISTS idx_trip_packing_items_outing_id ON trip_packing_items(outing_id);

-- ============ ENABLE RLS ============

ALTER TABLE trip_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_packing_items ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Trip Flights
CREATE POLICY "Group members can view flights"
    ON trip_flights FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_flights.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Users can manage their own flights"
    ON trip_flights FOR ALL
    USING (auth.uid() = user_id);

-- Accommodations
CREATE POLICY "Group members can view accommodations"
    ON trip_accommodations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_accommodations.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can create accommodations"
    ON trip_accommodations FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_accommodations.outing_id AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Creators can update accommodations"
    ON trip_accommodations FOR UPDATE
    USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_accommodations.outing_id AND o.created_by = auth.uid()
    ));

CREATE POLICY "Creators can delete accommodations"
    ON trip_accommodations FOR DELETE
    USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_accommodations.outing_id AND o.created_by = auth.uid()
    ));

-- Room Assignments
CREATE POLICY "Group members can view room assignments"
    ON trip_room_assignments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trip_accommodations a
        JOIN outings o ON o.id = a.outing_id
        WHERE a.id = trip_room_assignments.accommodation_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can manage room assignments"
    ON trip_room_assignments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM trip_accommodations a
        JOIN outings o ON o.id = a.outing_id
        WHERE a.id = trip_room_assignments.accommodation_id AND is_group_member(o.group_id)
    ));

-- Activities
CREATE POLICY "Group members can view activities"
    ON trip_activities FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_activities.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can create activities"
    ON trip_activities FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_activities.outing_id AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Creators can update activities"
    ON trip_activities FOR UPDATE
    USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_activities.outing_id AND o.created_by = auth.uid()
    ));

CREATE POLICY "Creators can delete activities"
    ON trip_activities FOR DELETE
    USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_activities.outing_id AND o.created_by = auth.uid()
    ));

-- Activity Participants
CREATE POLICY "Group members can view participants"
    ON trip_activity_participants FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trip_activities a
        JOIN outings o ON o.id = a.outing_id
        WHERE a.id = trip_activity_participants.activity_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Users can manage their own participation"
    ON trip_activity_participants FOR ALL
    USING (auth.uid() = user_id);

-- Itinerary Items
CREATE POLICY "Group members can view itinerary"
    ON trip_itinerary_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_itinerary_items.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can create itinerary items"
    ON trip_itinerary_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_itinerary_items.outing_id AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Group members can update itinerary items"
    ON trip_itinerary_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_itinerary_items.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Creators can delete itinerary items"
    ON trip_itinerary_items FOR DELETE
    USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_itinerary_items.outing_id AND o.created_by = auth.uid()
    ));

-- Tasks
CREATE POLICY "Group members can view tasks"
    ON trip_tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_tasks.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can create tasks"
    ON trip_tasks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_tasks.outing_id AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Group members can update tasks"
    ON trip_tasks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_tasks.outing_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Creators can delete tasks"
    ON trip_tasks FOR DELETE
    USING (auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_tasks.outing_id AND o.created_by = auth.uid()
    ));

-- Task Assignments
CREATE POLICY "Group members can view task assignments"
    ON trip_task_assignments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trip_tasks t
        JOIN outings o ON o.id = t.outing_id
        WHERE t.id = trip_task_assignments.task_id AND is_group_member(o.group_id)
    ));

CREATE POLICY "Group members can manage task assignments"
    ON trip_task_assignments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM trip_tasks t
        JOIN outings o ON o.id = t.outing_id
        WHERE t.id = trip_task_assignments.task_id AND is_group_member(o.group_id)
    ));

-- Documents
CREATE POLICY "View own or shared documents"
    ON trip_documents FOR SELECT
    USING (
        (is_private = FALSE AND EXISTS (
            SELECT 1 FROM outings o WHERE o.id = trip_documents.outing_id AND is_group_member(o.group_id)
        ))
        OR auth.uid() = created_by
    );

CREATE POLICY "Group members can upload documents"
    ON trip_documents FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_documents.outing_id AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Uploaders can update documents"
    ON trip_documents FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Uploaders can delete documents"
    ON trip_documents FOR DELETE
    USING (auth.uid() = created_by);

-- Packing Items
CREATE POLICY "View own or shared packing items"
    ON trip_packing_items FOR SELECT
    USING (
        (is_shared = TRUE AND EXISTS (
            SELECT 1 FROM outings o WHERE o.id = trip_packing_items.outing_id AND is_group_member(o.group_id)
        ))
        OR auth.uid() = user_id
        OR auth.uid() = created_by
    );

CREATE POLICY "Group members can add packing items"
    ON trip_packing_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM outings o WHERE o.id = trip_packing_items.outing_id AND is_group_member(o.group_id)
    ) AND auth.uid() = created_by);

CREATE POLICY "Owners can update packing items"
    ON trip_packing_items FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Owners can delete packing items"
    ON trip_packing_items FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = created_by);

-- ============ HELPER FUNCTIONS ============

-- Calculate per-person cost for a trip
CREATE OR REPLACE FUNCTION get_trip_per_person_breakdown(p_outing_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    full_name TEXT,
    total_cost DECIMAL(12, 2),
    activities_cost DECIMAL(12, 2),
    accommodations_cost DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    WITH attendees AS (
        SELECT ta.user_id, u.display_name, u.full_name
        FROM trip_attendees ta
        JOIN users u ON u.id = ta.user_id
        WHERE ta.outing_id = p_outing_id AND ta.status = 'going'
    ),
    accommodation_share AS (
        -- Split accommodation cost among all attendees
        SELECT
            a.user_id,
            COALESCE(SUM(acc.total_cost) / NULLIF(COUNT(*) OVER (), 0), 0) as share
        FROM attendees a
        CROSS JOIN trip_accommodations acc
        WHERE acc.outing_id = p_outing_id
        GROUP BY a.user_id
    ),
    activity_costs AS (
        SELECT
            ap.user_id,
            COALESCE(SUM(
                CASE
                    WHEN act.is_group_activity THEN act.cost_per_person
                    WHEN ap.status = 'in' THEN act.cost_per_person
                    ELSE 0
                END
            ), 0) as cost
        FROM attendees a
        LEFT JOIN trip_activity_participants ap ON ap.user_id = a.user_id
        LEFT JOIN trip_activities act ON act.id = ap.activity_id AND act.outing_id = p_outing_id
        GROUP BY ap.user_id
    )
    SELECT
        a.user_id,
        a.display_name,
        a.full_name,
        (COALESCE(acs.share, 0) + COALESCE(ac.cost, 0))::DECIMAL(12, 2) as total_cost,
        COALESCE(ac.cost, 0)::DECIMAL(12, 2) as activities_cost,
        COALESCE(acs.share, 0)::DECIMAL(12, 2) as accommodations_cost
    FROM attendees a
    LEFT JOIN accommodation_share acs ON acs.user_id = a.user_id
    LEFT JOIN activity_costs ac ON ac.user_id = a.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
