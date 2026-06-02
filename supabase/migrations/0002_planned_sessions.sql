-- ============================================================
-- Planned sessions — user-created future focus schedule
-- ============================================================

CREATE TABLE IF NOT EXISTS public.planned_sessions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- When the session is planned
  scheduled_date            DATE NOT NULL,        -- YYYY-MM-DD in user's timezone
  start_time_local          TIME NOT NULL,        -- HH:MM:00 in user's timezone (24h)
  duration_minutes          INTEGER NOT NULL DEFAULT 60,
  tz                        TEXT NOT NULL,        -- IANA timezone at time of creation

  -- What the session is for
  tag                       TEXT,                 -- activity tag ID ('code', 'study', …)
  title                     TEXT,                 -- optional free-text label

  -- Google Calendar sync (stub — populated once OAuth branding is approved)
  sync_to_calendar          BOOLEAN NOT NULL DEFAULT true,
  google_calendar_event_id  TEXT,                 -- null until synced
  google_calendar_html_link TEXT,                 -- deeplink into Google Calendar

  -- Lifecycle
  completed                 BOOLEAN NOT NULL DEFAULT false,
  linked_session_id         UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX planned_user_date_idx
  ON public.planned_sessions (user_id, scheduled_date);

CREATE INDEX planned_user_upcoming_idx
  ON public.planned_sessions (user_id, scheduled_date, start_time_local)
  WHERE completed = false;

-- Row-Level Security — owner sees only their own rows
ALTER TABLE public.planned_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_sessions: owner only" ON public.planned_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER planned_sessions_updated_at
  BEFORE UPDATE ON public.planned_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
