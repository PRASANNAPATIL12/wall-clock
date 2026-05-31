import './JoinPill.css';

interface Props {
  onClick: () => void;
}

/**
 * Upper-left pill shown to anonymous users — clicking opens the AuthModal.
 * Replaced by AccountIcon once the user is signed in.
 */
export function JoinPill({ onClick }: Props) {
  return (
    <button className="join-pill" type="button" onClick={onClick}>
      <span className="join-pill__emoji" aria-hidden>✨</span>
      <span className="join-pill__label">Join the focus community</span>
    </button>
  );
}
