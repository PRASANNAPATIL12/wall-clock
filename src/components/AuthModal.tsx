import { useEffect, useState } from 'react';
import type { UseAuth } from '../hooks/useAuth';
import './AuthModal.css';

interface Props {
  auth: UseAuth;
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

/**
 * Sign-in / sign-up modal. Two paths:
 *   1. Continue with Google (OAuth redirect via Supabase)
 *   2. Email + password (sign-up or sign-in toggle)
 *
 * Function-first styling — visual polish later.
 */
export function AuthModal({ auth, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Close the modal automatically once the user becomes authenticated.
  useEffect(() => {
    if (auth.user) onClose();
  }, [auth.user, onClose]);

  // Escape closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    setInfo(null);
    if (mode === 'signup') {
      await auth.signUpWithEmail(email, password);
      setInfo(
        'Check your inbox for a confirmation link (if confirmations are enabled).',
      );
    } else {
      await auth.signInWithEmail(email, password);
    }
    setBusy(false);
  };

  const handleGoogle = async () => {
    setBusy(true);
    await auth.signInWithGoogle();
    // No setBusy(false) — the redirect takes over.
  };

  return (
    <div className="auth-modal__backdrop" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in or sign up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="auth-modal__title">Join the focus community</h2>
        <p className="auth-modal__subtitle">
          Track your sessions, build a streak, see your history.
        </p>

        <button
          className="auth-modal__google"
          type="button"
          onClick={handleGoogle}
          disabled={busy}
        >
          <span className="auth-modal__google-icon" aria-hidden>G</span>
          Continue with Google
        </button>

        <div className="auth-modal__divider"><span>or</span></div>

        <form className="auth-modal__form" onSubmit={handleEmailSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={busy}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              disabled={busy}
            />
          </label>
          <button
            className="auth-modal__submit"
            type="submit"
            disabled={busy || !email || !password}
          >
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-modal__toggle">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('signin')}>Sign in</button>
            </>
          ) : (
            <>
              New here?{' '}
              <button type="button" onClick={() => setMode('signup')}>Create an account</button>
            </>
          )}
        </div>

        {auth.error && <div className="auth-modal__error">{auth.error}</div>}
        {info && <div className="auth-modal__info">{info}</div>}
      </div>
    </div>
  );
}
