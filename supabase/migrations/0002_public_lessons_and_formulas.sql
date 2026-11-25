-- ==============================================================================
-- V-ACT HUB: Phase 4+ Database Schema Updates
-- Migration: 0002_public_lessons_and_formulas.sql
-- Purpose:
--   1. Add resume_state column to set_progress (for in-progress exam resume sync)
--   2. Create formula_groups table (for cloud sync of Formula Notebook)
--   3. Open SELECT RLS policies for public lessons (visibility = 'public')
--      so admin-published lessons are visible to all users automatically.
-- ==============================================================================

-- 1. Add resume_state to set_progress if missing
ALTER TABLE set_progress
ADD COLUMN IF NOT EXISTS resume_state JSONB DEFAULT NULL;

-- 2. Create formula_groups table (id is TEXT to support fg_<topicId>_... IDs)
CREATE TABLE IF NOT EXISTS formula_groups (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INT NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formula_groups_topic_order
    ON formula_groups(topic_id, "order");

CREATE OR REPLACE TRIGGER trg_formula_groups_updated_at
    BEFORE UPDATE ON formula_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE formula_groups ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. Public Lessons RLS Policies (Read-only for public, Full control for owner)
-- ==============================================================================

-- 3.1 SUBJECTS
DROP POLICY IF EXISTS "Users can manage own subjects" ON subjects;
DROP POLICY IF EXISTS "Public or own subjects select" ON subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON subjects;

CREATE POLICY "Public or own subjects select" ON subjects
    FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects
    FOR DELETE USING (auth.uid() = user_id);

-- 3.2 TOPICS (visible if topic itself is public OR parent subject is public)
DROP POLICY IF EXISTS "Users can manage own topics" ON topics;
DROP POLICY IF EXISTS "Public or own topics select" ON topics;
DROP POLICY IF EXISTS "Users can insert own topics" ON topics;
DROP POLICY IF EXISTS "Users can update own topics" ON topics;
DROP POLICY IF EXISTS "Users can delete own topics" ON topics;

CREATE POLICY "Public or own topics select" ON topics
    FOR SELECT USING (
        auth.uid() = user_id
        OR visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = topics.subject_id AND s.visibility = 'public'
        )
    );

CREATE POLICY "Users can insert own topics" ON topics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics" ON topics
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics" ON topics
    FOR DELETE USING (auth.uid() = user_id);

-- 3.3 SETS (visible if set is public OR parent topic/subject is public)
DROP POLICY IF EXISTS "Users can manage own sets" ON sets;
DROP POLICY IF EXISTS "Public or own sets select" ON sets;
DROP POLICY IF EXISTS "Users can insert own sets" ON sets;
DROP POLICY IF EXISTS "Users can update own sets" ON sets;
DROP POLICY IF EXISTS "Users can delete own sets" ON sets;

CREATE POLICY "Public or own sets select" ON sets
    FOR SELECT USING (
        auth.uid() = user_id
        OR visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM topics t
            JOIN subjects s ON s.id = t.subject_id
            WHERE t.id = sets.topic_id
              AND (t.visibility = 'public' OR s.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert own sets" ON sets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sets" ON sets
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sets" ON sets
    FOR DELETE USING (auth.uid() = user_id);

-- 3.4 PASSAGES (visible if parent set/topic/subject is public)
DROP POLICY IF EXISTS "Users can manage own passages" ON passages;
DROP POLICY IF EXISTS "Public or own passages select" ON passages;
DROP POLICY IF EXISTS "Users can insert own passages" ON passages;
DROP POLICY IF EXISTS "Users can update own passages" ON passages;
DROP POLICY IF EXISTS "Users can delete own passages" ON passages;

CREATE POLICY "Public or own passages select" ON passages
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM sets st
            JOIN topics t ON t.id = st.topic_id
            JOIN subjects s ON s.id = t.subject_id
            WHERE st.id = passages.set_id
              AND (st.visibility = 'public' OR t.visibility = 'public' OR s.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert own passages" ON passages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passages" ON passages
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own passages" ON passages
    FOR DELETE USING (auth.uid() = user_id);

-- 3.5 QUESTIONS (visible if parent set/topic/subject is public)
DROP POLICY IF EXISTS "Users can manage own questions" ON questions;
DROP POLICY IF EXISTS "Public or own questions select" ON questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON questions;
DROP POLICY IF EXISTS "Users can update own questions" ON questions;
DROP POLICY IF EXISTS "Users can delete own questions" ON questions;

CREATE POLICY "Public or own questions select" ON questions
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM sets st
            JOIN topics t ON t.id = st.topic_id
            JOIN subjects s ON s.id = t.subject_id
            WHERE st.id = questions.set_id
              AND (st.visibility = 'public' OR t.visibility = 'public' OR s.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert own questions" ON questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions" ON questions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own questions" ON questions
    FOR DELETE USING (auth.uid() = user_id);

-- 3.6 FORMULA GROUPS (visible if parent topic/subject is public)
DROP POLICY IF EXISTS "Public or own formula_groups select" ON formula_groups;
DROP POLICY IF EXISTS "Users can insert own formula_groups" ON formula_groups;
DROP POLICY IF EXISTS "Users can update own formula_groups" ON formula_groups;
DROP POLICY IF EXISTS "Users can delete own formula_groups" ON formula_groups;

CREATE POLICY "Public or own formula_groups select" ON formula_groups
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM topics t
            JOIN subjects s ON s.id = t.subject_id
            WHERE t.id = formula_groups.topic_id
              AND (t.visibility = 'public' OR s.visibility = 'public')
        )
    );

CREATE POLICY "Users can insert own formula_groups" ON formula_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own formula_groups" ON formula_groups
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own formula_groups" ON formula_groups
    FOR DELETE USING (auth.uid() = user_id);
