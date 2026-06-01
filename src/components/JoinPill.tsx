import './JoinPill.css';

interface Props {
  onClick: () => void;
}

/**
 * Upper-left CTA shown to anonymous visitors.
 * Two-line pill: action + value proposition.
 * No emoji — matches the minimalist glass design of all other controls.
 */
export function JoinPill({ onClick }: Props) {
  return (
    <button className="join-pill" type="button" onClick={onClick} aria-label="Sign up to track your focus progress">
      <span className="join-pill__primary">Track your progress</span>
      <span className="join-pill__sub">Join the focus community</span>
    </button>
  );
}
