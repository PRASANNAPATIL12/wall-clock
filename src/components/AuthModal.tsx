import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UseAuth } from '../hooks/useAuth';
import './AuthModal.css';

interface Props {
  auth: UseAuth;
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

/** Official Google G logo — four-color SVG, widely recognizable. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/** Close × icon */
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}

/**
 * Sign-in / sign-up modal.
 * Frosted-glass panel over a blurred backdrop.
 * Two paths: Google OAuth (primary) and email/password (secondary).
 */
export function AuthModal({ auth, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Close when the user becomes authenticated.
  useEffect(() => {
    if (auth.user) onClose();
  }, [auth.user, onClose]);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
      setInfo('Account created — check your inbox to confirm your email.');
    } else {
      await auth.signInWithEmail(email, password);
    }
    setBusy(false);
  };

  const handleGoogle = async () => {
    setBusy(true);
    await auth.signInWithGoogle();
    // redirect takes over — no setBusy(false)
  };

  return createPortal(
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
          <CloseIcon />
        </button>

        <div className="auth-modal__header">
          <h2 className="auth-modal__title">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="auth-modal__subtitle">
            {mode === 'signup'
              ? 'Track sessions, build streaks, see your focus history.'
              : 'Sign in to pick up where you left off.'}
          </p>
        </div>

        {/* Primary: Google */}
        <button
          className="auth-modal__google"
          type="button"
          onClick={handleGoogle}
          disabled={busy}
        >
          <GoogleLogo />
          Continue with Google
        </button>

        <div className="auth-modal__divider">
          <span>or continue with email</span>
        </div>

        {/* Secondary: email + password */}
        <form className="auth-modal__form" onSubmit={handleEmailSubmit}>
          <label className="auth-modal__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              disabled={busy}
            />
          </label>
          <label className="auth-modal__field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Minimum 8 characters' : ''}
              disabled={busy}
            />
          </label>
          <button
            className="auth-modal__submit"
            type="submit"
            disabled={busy || !email || !password}
          >
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-modal__toggle">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('signin'); setInfo(null); }}>Sign in</button>
            </>
          ) : (
            <>
              New here?{' '}
              <button type="button" onClick={() => { setMode('signup'); setInfo(null); }}>Create an account</button>
            </>
          )}
        </div>

        {auth.error && <p className="auth-modal__msg auth-modal__msg--error">{auth.error}</p>}
        {info && <p className="auth-modal__msg auth-modal__msg--info">{info}</p>}
      </div>
    </div>,
    document.body
  );
}
