import './FocusMessage.css';

interface Props {
  text: string;
  /** Total lifecycle duration in ms (fade-in + hold + fade-out). Default 3000. */
  duration?: number;
  /** Change this to restart the animation (use Date.now()). */
  msgKey: number;
}

/**
 * Subtle, auto-fading text label that appears centered inside the clock face
 * after each focus-ring interaction (click 1, click 2, drag, click 3).
 *
 * Rendered as position:absolute inside .analog (which has position:relative),
 * at 63% from the top — below the clock hands but inside the face circle.
 * Lightweight: no background, no border, just quiet muted text that fades.
 */
export function FocusMessage({ text, duration = 3000, msgKey }: Props) {
  return (
    <div
      className="focus-msg"
      key={msgKey}
      style={{ animationDuration: `${duration}ms` } as React.CSSProperties}
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </div>
  );
}
