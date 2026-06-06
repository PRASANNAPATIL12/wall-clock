import { memo } from 'react';
import { AnalogClock } from '../../components/AnalogClock';
import { DigitalClock } from '../../components/DigitalClock';
import { usePersistedState } from '../../hooks/usePersistedState';

/**
 * HeroClock — a calm, live clock for Scene 1 of the landing page.
 *
 * Renders ONLY the visual clock (analog or digital), with no focus ring
 * and no controls. The clock should look as alive as the real app, but
 * be non-interactive — there is no session lifecycle on the landing page.
 *
 * Honors the user's persisted preferences:
 *   - `wall.mode`    → analog (default) or digital
 *   - `wall.tz`      → timezone (default: local)
 *   - `wall.format`  → 12h or 24h (digital only)
 */
export const HeroClock = memo(function HeroClock() {
  // Read the same localStorage keys the real app uses, so the landing
  // clock matches whatever the user last chose in the app.
  const [mode]   = usePersistedState<'analog' | 'digital'>('wall.mode', 'analog');
  const [tz]     = usePersistedState<string>('wall.tz', 'local');
  const [format] = usePersistedState<'12' | '24'>('wall.format', '24');

  return (
    <div className="hero-clock" aria-label="Live focus clock">
      {/* Wrapper that locks aspect ratio + sets the visual size */}
      <div className="hero-clock__inner">
        {mode === 'analog' ? (
          <AnalogClock timezone={tz} />
        ) : (
          <DigitalClock
            timezone={tz}
            format={format}
            /* Anonymous mode — no focus controls, no schedule */
            userId={null}
            isVisible={false}
            schedulingViewOpen={false}
          />
        )}
      </div>
    </div>
  );
});
