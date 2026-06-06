/**
 * App — standalone entry point for the live focus clock at `/app`.
 *
 * Delegates to FocusClockApp (the full surface) without the `embedded`
 * prop, so the .stage container uses `position: fixed; inset: 0` and
 * covers the viewport — original /app behaviour, unchanged.
 *
 * The cinematic landing page at `/` also renders FocusClockApp but
 * with `embedded={true}` so the surface lives inside Scene 1.
 */
import { FocusClockApp } from './FocusClockApp';

export default function App() {
  return <FocusClockApp />;
}
