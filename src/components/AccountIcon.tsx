import type { User } from '@supabase/supabase-js';
import './AccountIcon.css';

interface Props {
  user: User;
  onClick: () => void;
}

/**
 * Upper-left circular pill showing the user's initials. Replaces JoinPill
 * once signed in; clicking opens the SettingsDialog.
 */
export function AccountIcon({ user, onClick }: Props) {
  const initials = computeInitials(user);
  return (
    <button
      className="account-icon"
      type="button"
      onClick={onClick}
      aria-label="Open settings"
      title={user.email ?? 'Account'}
    >
      {initials}
    </button>
  );
}

function computeInitials(user: User): string {
  const name = (user.user_metadata?.full_name as string | undefined)?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  const email = user.email ?? '';
  return email.slice(0, 2).toUpperCase() || '··';
}
