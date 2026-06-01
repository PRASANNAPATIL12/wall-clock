import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client + shared types for the Wall Clock backend.
 *
 * Credentials are read from Vite env vars:
 *   VITE_SUPABASE_URL       — project URL (e.g. https://abc.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  — anon/public key (long JWT)
 *
 * Both are safe to ship in the client bundle: the anon key only grants
 * access permitted by row-level security policies on the database.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Fail loud in dev so misconfigured deploys are obvious; soft warn in prod.
  // eslint-disable-next-line no-console
  console.warn(
    '[wall-clock] Supabase env vars missing. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in .env (dev) or your hosting platform (prod).',
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/* ---------- Shared types for the `sessions` table ---------- */

export interface SessionRow {
  id: string;
  user_id: string;
  start_time: string; // ISO timestamp
  goal_time: string | null;
  end_time: string;
  completed: boolean;
  bonus_seconds: number;
  tag: string | null;
  tz: string;
  date_local: string; // YYYY-MM-DD
  created_at: string;
}

/** Shape used when inserting a new session — server fills in id/created_at. */
export interface SessionInsert {
  user_id: string;
  start_time: string;
  goal_time: string | null;
  end_time: string;
  completed: boolean;
  bonus_seconds: number;
  tag: string | null;
  tz: string;
  date_local: string;
}
