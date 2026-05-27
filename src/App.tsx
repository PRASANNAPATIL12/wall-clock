import { useEffect, useRef } from 'react';
import { AnalogClock } from './components/AnalogClock';
import { DigitalClock } from './components/DigitalClock';
import { ThemeToggle } from './components/controls/ThemeToggle';
import { FullscreenToggle } from './components/controls/FullscreenToggle';
import { TimezoneSelector } from './components/controls/TimezoneSelector';
import { ModeToggle, type Mode } from './components/controls/ModeToggle';
import { FormatToggle, type Format } from './components/controls/FormatToggle';
import { CoffeeLink } from './components/controls/CoffeeLink';
import { useTheme } from './hooks/useTheme';
import { useFullscreen } from './hooks/useFullscreen';
import { useIdle } from './hooks/useIdle';
import { usePersistedState } from './hooks/usePersistedState';
import { useNow } from './hooks/useNow';
import { getZonedTime } from './lib/timezones';

import './components/controls/Controls.css';
import './App.css';

export default function App() {
  const [theme, , toggleTheme] = useTheme();
  const [isFs, toggleFs] = useFullscreen();
  const [mode, setMode] = usePersistedState<Mode>('wall.mode', 'analog');
  const [tz, setTz] = usePersistedState<string>('wall.tz', 'local');
  const [format, setFormat] = usePersistedState<Format>('wall.format', '24');

  useIdle(5000);

  // Document title — only ticks once per minute, cheap
  const now = useNow('second');
  const titleRef = useRef<string>('');
  useEffect(() => {
    const { hours, minutes } = getZonedTime(now, tz);
    const t = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} · Wall Clock`;
    if (t !== titleRef.current) {
      document.title = t;
      titleRef.current = t;
    }
  }, [now, tz]);

  const isAnalog = mode === 'analog';

  return (
    <main className="stage">
      {/* Clock canvas with cross-dissolve between modes */}
      <div className="canvas">
        <div className={`mode-layer ${isAnalog ? 'is-in' : 'is-out-up'}`} aria-hidden={!isAnalog}>
          <AnalogClock timezone={tz} />
        </div>
        <div className={`mode-layer ${!isAnalog ? 'is-in' : 'is-out-down'}`} aria-hidden={isAnalog}>
          <DigitalClock timezone={tz} format={format} />
        </div>
      </div>

      {/* Controls */}
      <div className="controls controls--tl">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="controls controls--tr">
        <FullscreenToggle isFullscreen={isFs} onToggle={toggleFs} />
      </div>

      <div className="controls controls--bl">
        <TimezoneSelector value={tz} onChange={setTz} />
        <ModeToggle mode={mode} onChange={setMode} />
        {!isAnalog && (
          <div className="fmt-mount">
            <FormatToggle format={format} onChange={setFormat} />
          </div>
        )}
      </div>

      <div className="controls controls--br">
        <CoffeeLink />
      </div>
    </main>
  );
}
