import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import './AccountIcon.css';

interface Props {
  user: User;
  onClick: () => void;
}

/**
 * Upper-left circular pill showing the user's profile photo (Google users)
 * or initials (email/password users). Replaces JoinPill once signed in;
 * clicking opens the SettingsDialog → Account pane.
 *
 * Photo priority: user_metadata.avatar_url → user_metadata.picture → initials fallback.
 * If the image fails to load (network error, revoked token), falls back to initials.
 */
export function AccountIcon({ user, onClick }: Props) {
  const photoUrl = getPhotoUrl(user);
  const initials = computeInitials(user);
  const [imgError, setImgError] = useState(false);
  const showPhoto = !!photoUrl && !imgError;

  return (
    <button
      className={`account-icon${showPhoto ? ' has-photo' : ''}`}
      type="button"
      onClick={onClick}
      aria-label="Open settings"
      title={user.email ?? 'Account'}
    >
      {showPhoto ? (
        <img
          className="account-icon__photo"
          src={photoUrl!}
          alt={initials}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="account-icon__initials">{initials}</span>
      )}
    </button>
  );
}

function getPhotoUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return null;
  // Google OAuth: Supabase surfaces the photo as avatar_url or picture
  const url = (meta.avatar_url ?? meta.picture) as string | undefined;
  return url || null;
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
