import { useCallback, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  createPlannedSession,
  deletePlannedSession,
  fmtDuration,
  fmtTime,
  listPlannedSessions,
  todayLocalDate,
  type PlannedSession,
} from '../../lib/planStore';
import { DEFAULT_TAGS, getAllTags } from '../../lib/tags';
import { TagIcon } from '../TagIcon';
import { ScrollPicker, type PickerItem } from '../ScrollPicker';
import './PlanPane.css';

interface Props {
  user: User;
  /** Bump to trigger a refetch after save/delete. */
  onScheduleChanged?: () => void;
}

/* ============================================================
   Picker item generators
   ============================================================ */

/** Next 60 days as picker items. */
function buildDateItems(): PickerItem[] {
  const items: PickerItem[] = [];
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    const value = `${yyyy}-${mm}-${dd}`;
    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    items.push({ value, label });
  }
  return items;
}

/** 30-minute increments over 24 hours. */
function buildTimeItems(): PickerItem[] {
  const items: PickerItem[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}:00`;
      const period = h < 12 ? 'AM' : 'PM';
      const h12   = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${h12}:${mm} ${period}`;
      items.push({ value, label });
    }
  }
  return items;
}

/** Duration options from 15 min to 8 hours. */
function buildDurationItems(): PickerItem[] {
  const durations = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480];
  return durations.map(d => ({ value: String(d), label: fmtDuration(d) }));
}

/** Get the default date: today before 6 PM, tomorrow after 6 PM. */
function defaultDate(): string {
  const now = new Date();
  if (now.getHours() >= 18) {
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  }
  return todayLocalDate();
}

/** Get next round 30-minute time from now (min 15 min ahead). */
function defaultTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  const m = now.getMinutes() < 30 ? 30 : 0;
  const h = m === 0 ? now.getHours() + 1 : now.getHours();
  const hh = String(h % 24).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

/* ============================================================
   Toggle component (glass style matching design system)
   ============================================================ */
function GlassToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`plan-toggle${on ? ' is-on' : ''}`}
      onClick={onToggle}
    >
      <span className="plan-toggle__thumb" />
    </button>
  );
}

/* ============================================================
   Scheduled session card
   ============================================================ */
function SessionCard({
  session,
  onDelete,
}: {
  session: PlannedSession;
  onDelete: (id: string) => void;
}) {
  const tag = session.tag ? DEFAULT_TAGS.find(t => t.id === session.tag) : null;
  return (
    <div className="plan-card">
      <div className="plan-card__icon">
        {tag
          ? <TagIcon def={tag} size={14} />
          : <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        }
      </div>
      <div className="plan-card__info">
        <span className="plan-card__tag">{tag?.label ?? session.tag ?? 'Focus'}</span>
        <span className="plan-card__time">
          {fmtTime(session.start_time_local)} · {fmtDuration(session.duration_minutes)}
        </span>
      </div>
      {session.sync_to_calendar && (
        <div className="plan-card__cal" title="Syncs to Google Calendar">
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
      )}
      <button
        type="button"
        className="plan-card__delete"
        onClick={() => onDelete(session.id)}
        aria-label="Delete planned session"
      >
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

/* ============================================================
   PlanPane
   ============================================================ */
export function PlanPane({ user, onScheduleChanged }: Props) {
  const dateItems     = useMemo(buildDateItems,     []);
  const timeItems     = useMemo(buildTimeItems,     []);
  const durationItems = useMemo(buildDurationItems, []);
  const tags          = useMemo(getAllTags,          []);

  // Form state
  const [date,     setDate]     = useState(defaultDate);
  const [time,     setTime]     = useState(defaultTime);
  const [duration, setDuration] = useState('60');
  const [tag,      setTag]      = useState<string | null>(null);
  const [calSync,  setCalSync]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Saved sessions
  const [sessions,  setSessions]  = useState<PlannedSession[]>([]);
  const [loadedKey, setLoadedKey] = useState(0);

  // Load/refresh sessions
  const loadSessions = useCallback(async () => {
    const today = todayLocalDate();
    const in60  = (() => {
      const d = new Date(); d.setDate(d.getDate() + 60);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    const rows = await listPlannedSessions(user.id, today, in60);
    setSessions(rows);
  }, [user.id]);

  // Load on mount and when key changes
  useMemo(() => { loadSessions(); }, [loadedKey, loadSessions]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    await createPlannedSession({
      user_id: user.id,
      scheduled_date: date,
      start_time_local: time,
      duration_minutes: Number(duration),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      tag: tag ?? null,
      sync_to_calendar: calSync,
    });
    setSaving(false);
    setLoadedKey(k => k + 1);
    onScheduleChanged?.();
  };

  const handleDelete = async (id: string) => {
    await deletePlannedSession(id);
    setLoadedKey(k => k + 1);
    onScheduleChanged?.();
  };

  // Group sessions by date
  const grouped = useMemo(() => {
    const m = new Map<string, PlannedSession[]>();
    for (const s of sessions) {
      const arr = m.get(s.scheduled_date) ?? [];
      arr.push(s);
      m.set(s.scheduled_date, arr);
    }
    return m;
  }, [sessions]);

  const today    = todayLocalDate();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  function dateLabel(dateStr: string) {
    if (dateStr === today)    return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric',
    });
  }

  return (
    <div className="plan-pane">
      <h3>Plan</h3>

      {/* ---- Add Focus Block form ---- */}
      <div className="plan-form">
        <h4 className="plan-form__title">
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add focus block
        </h4>

        {/* Three scroll pickers: Date · Time · Duration */}
        <div className="plan-pickers">
          <ScrollPicker
            label="Date"
            items={dateItems}
            selected={date}
            onChange={setDate}
          />
          <div className="plan-pickers__sep" aria-hidden />
          <ScrollPicker
            label="Time"
            items={timeItems}
            selected={time}
            onChange={setTime}
            loop
          />
          <div className="plan-pickers__sep" aria-hidden />
          <ScrollPicker
            label="Duration"
            items={durationItems}
            selected={duration}
            onChange={setDuration}
          />
        </div>

        {/* Activity vertical selector */}
        <div className="plan-activities">
          <div className="plan-activities__label">Activity</div>
          <div className="plan-activities__list">
            {tags.map(t => (
              <button
                key={t.id}
                type="button"
                className={`plan-activity-row${tag === t.id ? ' is-selected' : ''}`}
                onClick={() => setTag(prev => prev === t.id ? null : t.id)}
              >
                <span className="plan-activity-row__icon">
                  <TagIcon def={t} size={14} />
                </span>
                <span className="plan-activity-row__label">{t.label}</span>
                {tag === t.id && (
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className="plan-activity-row__check">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Google Calendar toggle */}
        <div className="plan-toggle-row">
          <div className="plan-toggle-row__text">
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Add to Google Calendar
          </div>
          <GlassToggle on={calSync} onToggle={() => setCalSync(v => !v)} />
        </div>

        <button
          type="button"
          className="plan-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save focus block'}
        </button>
      </div>

      {/* ---- Scheduled sessions list ---- */}
      {grouped.size > 0 && (
        <div className="plan-list">
          {Array.from(grouped.entries()).map(([d, arr]) => (
            <div key={d} className="plan-list__group">
              <div className="plan-list__date">{dateLabel(d)}</div>
              {arr.map(s => (
                <SessionCard key={s.id} session={s} onDelete={handleDelete} />
              ))}
            </div>
          ))}
        </div>
      )}

      {grouped.size === 0 && (
        <p className="plan-empty">No sessions planned yet. Add one above.</p>
      )}
    </div>
  );
}
