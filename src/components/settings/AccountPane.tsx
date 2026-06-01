import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { listAllSessions } from '../../lib/sessionStore';
import { supabase } from '../../lib/supabase';

interface Props {
  user: User;
  /** Called when the user taps Sign out (passed down from SettingsDialog). */
  onSignOut: () => Promise<void>;
}

/**
 * Account pane — shows identity, joined date, plus data tools:
 *   · Export my data        (downloads JSON of all session rows)
 *   · Delete my history     (removes all the user's session rows; the
 *                            auth account itself can be deleted from the
 *                            Supabase dashboard if you ever need to —
 *                            client SDK has no admin permissions)
 */
export function AccountPane({ user, onSignOut }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : '—';

  const handleExport = async () => {
    setBusy(true);
    setMsg(null);
    const rows = await listAllSessions(user.id);
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), sessions: rows }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wall-clock-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBusy(false);
    setMsg(`Exported ${rows.length} session${rows.length === 1 ? '' : 's'}.`);
  };

  const handleDelete = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', user.id);
    setBusy(false);
    setConfirming(false);
    if (error) {
      setMsg(`Delete failed: ${error.message}`);
    } else {
      setMsg('All your session history has been deleted.');
    }
  };

  return (
    <div>
      <h3>Account</h3>

      <div style={section}>
        <div style={labelStyle}>Signed in as</div>
        <div style={valueStyle}>{user.email}</div>
      </div>

      <div style={section}>
        <div style={labelStyle}>Joined</div>
        <div style={valueStyle}>{joined}</div>
      </div>

      <div style={{ ...section, marginTop: 24 }}>
        <button type="button" onClick={handleExport} disabled={busy} style={btnPrimary}>
          Export my data
        </button>
        <p style={hintStyle}>Downloads all your session rows as JSON.</p>
      </div>

      <div style={section}>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            style={btnDanger}
          >
            Delete my history
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleDelete} disabled={busy} style={btnDanger}>
              Yes, delete everything
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} style={btnGhost}>
              Cancel
            </button>
          </div>
        )}
        <p style={hintStyle}>
          Deletes every session row from your account. The login itself stays —
          you can sign in again any time.
        </p>
      </div>

      {msg && <p style={{ ...hintStyle, color: 'var(--fg)' }}>{msg}</p>}

      {/* ---- Sign out ---- */}
      <div style={{ ...section, marginTop: 28, borderTop: '1px solid var(--fg-faint)', paddingTop: 18 }}>
        <div style={labelStyle}>Session</div>
        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          style={btnGhost}
        >
          Sign out
        </button>
        <p style={hintStyle}>Signs you out on this device. Your data stays in the cloud.</p>
      </div>
    </div>
  );
}

const section: React.CSSProperties = { marginBottom: 14 };
const labelStyle: React.CSSProperties = { fontSize: 11.5, color: 'var(--fg-muted)', marginBottom: 2 };
const valueStyle: React.CSSProperties = { fontSize: 14, marginBottom: 6 };
const hintStyle: React.CSSProperties = { fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 6 };
const btnBase: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
};
const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'var(--fg)',
  color: 'var(--bg-elev)',
  border: 'none',
};
const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: 'var(--fg)',
  border: '1px solid var(--fg-faint)',
};
const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: 'var(--hand-second)',
  border: '1px solid var(--hand-second)',
};
