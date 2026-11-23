-- ==============================================================================
-- V-ACT HUB: Phase 1 Database Schema & RLS Policies
-- Migration: 0001_init.sql
-- ==============================================================================

-- 1. Helper function for updating updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. Tables Definition
-- ==============================================================================

-- 2.1 SUBJECTS (e.g. Tiếng Anh, Tiếng Việt, Toán học...)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    position INT NOT NULL DEFAULT 0,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 TOPICS (Chuyên đề, e.g. Chuyên đề 15: Câu điều kiện)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 SETS (Bộ đề / Bài luyện tập, e.g. Bài tập áp dụng, Bài luyện tập số 1)
CREATE TABLE IF NOT EXISTS sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 PASSAGES (Đoạn văn dùng chung cho nhóm câu hỏi đọc hiểu / điền từ)
CREATE TABLE IF NOT EXISTS passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 QUESTIONS (Câu hỏi trắc nghiệm 4 đáp án)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES passages(id) ON DELETE SET NULL,
    no INT NOT NULL DEFAULT 1,
    prompt TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of 4 options
    correct_index INT NULL CHECK (correct_index IS NULL OR (correct_index >= 0 AND correct_index <= 3)),
    answer_source TEXT NOT NULL DEFAULT 'none' CHECK (answer_source IN ('document', 'ai', 'none', 'user')),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT DEFAULT '',
    formula TEXT DEFAULT '',
    explanation TEXT DEFAULT '',
    figure JSONB DEFAULT NULL, -- Object { url: string, caption?: string } or null
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 SET PROGRESS (Tiến độ hoàn thành bài, số sao, điểm số)
CREATE TABLE IF NOT EXISTS set_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    score NUMERIC NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    stars INT NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
    attempts_count INT NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_set UNIQUE (user_id, set_id)
);

-- 2.7 QUESTION ATTEMPTS (Lịch sử trả lời câu hỏi, phục vụ ôn lại câu sai và thống kê)
CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    set_id UUID REFERENCES sets(id) ON DELETE CASCADE,
    selected_index INT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 USER STATS (XP, streak, đóng băng streak, mục tiêu điểm thi)
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    xp INT NOT NULL DEFAULT 0,
    streak INT NOT NULL DEFAULT 0,
    max_streak INT NOT NULL DEFAULT 0,
    last_active_date TEXT, -- Định dạng YYYY-MM-DD theo múi giờ Asia/Ho_Chi_Minh
    streak_freezes_weekly INT NOT NULL DEFAULT 3, -- 3 lượt/tuần, reset hàng tuần
    streak_freezes_reserve INT NOT NULL DEFAULT 0, -- Tích lũy vĩnh viễn khi xong chuyên đề
    target_major_code TEXT NOT NULL DEFAULT '106', -- Mặc định 106 Khoa học Máy tính
    target_major_name TEXT NOT NULL DEFAULT 'Khoa học Máy tính',
    target_score NUMERIC NOT NULL DEFAULT 85.45,
    daily_goal_xp INT NOT NULL DEFAULT 50,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 SETTINGS (Cài đặt âm thanh, rung, giao diện sáng/tối, API key)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    haptics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    gemini_api_key TEXT NOT NULL DEFAULT '',
    gemini_model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    reminder_time TEXT DEFAULT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Indexes for High Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_subjects_user_pos ON subjects(user_id, position);
CREATE INDEX IF NOT EXISTS idx_topics_subject_pos ON topics(subject_id, position);
CREATE INDEX IF NOT EXISTS idx_sets_topic_pos ON sets(topic_id, position);
CREATE INDEX IF NOT EXISTS idx_passages_set_pos ON passages(set_id, position);
CREATE INDEX IF NOT EXISTS idx_questions_set_pos ON questions(set_id, position);
CREATE INDEX IF NOT EXISTS idx_questions_passage ON questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_set_progress_user ON set_progress(user_id, set_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_q ON question_attempts(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_incorrect ON question_attempts(user_id, is_correct);

-- ==============================================================================
-- 4. Triggers for Automatic updated_at
-- ==============================================================================
CREATE OR REPLACE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_sets_updated_at BEFORE UPDATE ON sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_passages_updated_at BEFORE UPDATE ON passages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_set_progress_updated_at BEFORE UPDATE ON set_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_question_attempts_updated_at BEFORE UPDATE ON question_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy helper: All operations restricted to the row owner
CREATE POLICY "Users can manage own subjects" ON subjects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own topics" ON topics
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own sets" ON sets
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own passages" ON passages
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own questions" ON questions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own set_progress" ON set_progress
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own question_attempts" ON question_attempts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own user_stats" ON user_stats
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings" ON settings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 6. Storage Bucket & Policies: 'figures'
-- ==============================================================================
-- Create the figures bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('figures', 'figures', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for images in the figures bucket
CREATE POLICY "Public figures read access" ON storage.objects
    FOR SELECT USING (bucket_id = 'figures');

-- Authenticated users can upload images only into their own user_id directory
CREATE POLICY "Users can upload figures in their own folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'figures' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Authenticated users can update images in their own folder
CREATE POLICY "Users can update figures in their own folder" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'figures' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Authenticated users can delete images in their own folder
CREATE POLICY "Users can delete figures in their own folder" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'figures' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
