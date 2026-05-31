-- Wall Clock — initial schema for focus sessions
--
-- HOW TO APPLY:
--   1. Open the Supabase dashboard for the wall-clock project
--   2. Go to SQL Editor -> New Query
--   3. Paste the contents of this file
--   4. Click "Run"
--
-- Idempotent: safe to run multiple times. Each statement is guarded.

-- ---------- sessions table ----------

CREATE TABLE IF NOT EXISTS public.sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time      TIMESTAMPTZ NOT NULL,
  goal_time       TIMESTAMPTZ,
  end_time        TIMESTAMPTZ NOT NULL,
  completed       BOOLEAN NOT NULL,
  bonus_seconds   INTEGER NOT NULL DEFAULT 0,
  tag             TEXT,
  tz              TEXT NOT NULL,
  date_local      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- indexes ----------

CREATE INDEX IF NOT EXISTS sessions_user_start_idx
  ON public.sessions (user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS sessions_user_date_idx
  ON public.sessions (user_id, date_local);

CREATE INDEX IF NOT EXISTS sessions_user_tag_idx
  ON public.sessions (user_id, tag);

-- ---------- row-level security ----------

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop+recreate policies so re-running this script doesn't fail
DROP POLICY IF EXISTS "sessions: owner select" ON public.sessions;
DROP POLICY IF EXISTS "sessions: owner insert" ON public.sessions;
DROP POLICY IF EXISTS "sessions: owner update" ON public.sessions;
DROP POLICY IF EXISTS "sessions: owner delete" ON public.sessions;

CREATE POLICY "sessions: owner select" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions: owner insert" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions: owner update" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions: owner delete" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id);
