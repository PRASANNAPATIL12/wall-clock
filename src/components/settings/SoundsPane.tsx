import { useState } from 'react';
import {
  type GoalSound,
  type TickSound,
  previewGoalSound,
  readGoalSound,
  readTickSound,
} from '../../lib/haptic';

const GOALS: Array<{ value: GoalSound; label: string }> = [
  { value: 'bell', label: 'Bell chime' },
  { value: 'tok', label: 'Soft tok' },
  { value: 'silent', label: 'Silent' },
];

const TICKS: Array<{ value: TickSound; label: string }> = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

function set(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function SoundsPane() {
  const [goal, setGoal] = useState<GoalSound>(() => readGoalSound());
  const [ticks, setTicks] = useState<TickSound>(() => readTickSound());

  const handleGoal = (v: GoalSound) => {
    setGoal(v);
    set('wall.sound.goal', v);
    if (v !== 'silent') previewGoalSound(v);
  };

  const handleTicks = (v: TickSound) => {
    setTicks(v);
    set('wall.sound.ticks', v);
  };

  return (
    <div>
      <h3>Sounds</h3>

      <section style={{ marginBottom: 22 }}>
        <h4 style={rowLabelStyle}>Goal completion sound</h4>
        <div style={pillRowStyle}>
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => handleGoal(g.value)}
              style={pillStyle(goal === g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4 style={rowLabelStyle}>Drag ticks (while adjusting end-point)</h4>
        <div style={pillRowStyle}>
          {TICKS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTicks(t.value)}
              style={pillStyle(ticks === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const rowLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--fg-muted)',
  margin: '0 0 8px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const pillRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 999,
  background: active ? 'var(--fg)' : 'transparent',
  color: active ? 'var(--bg-elev)' : 'var(--fg-muted)',
  border: `1px solid ${active ? 'var(--fg)' : 'var(--fg-faint)'}`,
  fontFamily: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
});
