import { useCallback, useMemo, useRef, useState } from 'react';
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
import { DatePickerPopup }     from '../DatePickerPopup';
import { TimePickerPopup }     from '../TimePickerPopup';
import { DurationPickerPopup } from '../DurationPickerPopup';
import { ActivityPickerPopup } from '../ActivityPickerPopup';
import './PlanPane.css';

interface Props {
  user: User;
  onScheduleChanged?: () => void;
  onManageTags?: () => void;
}

/* ---- Defaults ---- */
function defaultDate(): string {
  const now = new Date();
  if (now.getHours() >= 18) {
    const t = new Date(now); t.setDate(now.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  }
  return todayLocalDate();
}
function defaultTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  const m = [0,15,30,45].reduce((a,b) => Math.abs(b-now.getMinutes()) < Math.abs(a-now.getMinutes()) ? b : a);
  const h = m < now.getMinutes() ? now.getHours() + 1 : now.getHours();
  return `${String(h%24).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
}

/* ---- Date formatting helpers ---- */
function fmtDateBtn(s: string): string {
  const today    = todayLocalDate();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  if (s === today)    return 'Today';
  if (s === tomorrow) return 'Tomorrow';
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

function fmtTimeBtn(s: string): string {
  const [hh,mm] = s.split(':').map(Number);
  const per = (hh??0) < 12 ? 'AM' : 'PM';
  const h12 = (hh??0)===0 ? 12 : (hh??0)>12 ? (hh??0)-12 : (hh??0);
  return `${h12}:${String(mm??0).padStart(2,'0')} ${per}`;
}

/* ---- Glass toggle ---- */
function GlassToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on}
      className={`plan-toggle${on ? ' is-on' : ''}`} onClick={onToggle}>
      <span className="plan-toggle__thumb" />
    </button>
  );
}

/* ---- Session card ---- */
function SessionCard({ session, onDelete }: { session: PlannedSession; onDelete: (id:string)=>void }) {
  const tag = session.tag ? DEFAULT_TAGS.find(t => t.id === session.tag) : null;
  return (
    <div className="plan-card">
      <div className="plan-card__icon">
        {tag ? <TagIcon def={tag} size={14} />
              : <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
      </div>
      <div className="plan-card__info">
        <span className="plan-card__tag">{tag?.label ?? session.tag ?? 'Focus'}</span>
        <span className="plan-card__time">{fmtTime(session.start_time_local)} · {fmtDuration(session.duration_minutes)}</span>
      </div>
      {session.sync_to_calendar && (
        <div className="plan-card__cal" title="Google Calendar">
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
      )}
      <button type="button" className="plan-card__delete" onClick={() => onDelete(session.id)} aria-label="Delete">
        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

/* ========================================================= */
export function PlanPane({ user, onScheduleChanged, onManageTags }: Props) {
  const tags = useMemo(getAllTags, []);

  // Form state
  const [date,     setDate]     = useState(defaultDate);
  const [time,     setTime]     = useState(defaultTime);
  const [duration, setDuration] = useState('60');
  const [tag,      setTag]      = useState<string | null>(null);
  const [calSync,  setCalSync]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Open/close state for each picker
  const [openPicker, setOpenPicker] = useState<'date'|'time'|'duration'|'activity'|null>(null);

  // Refs for anchor positioning
  const dateBtnRef     = useRef<HTMLButtonElement>(null);
  const timeBtnRef     = useRef<HTMLButtonElement>(null);
  const durBtnRef      = useRef<HTMLButtonElement>(null);
  const actBtnRef      = useRef<HTMLButtonElement>(null);

  // Sessions list
  const [sessions,  setSessions]  = useState<PlannedSession[]>([]);
  const [loadedKey, setLoadedKey] = useState(0);

  const loadSessions = useCallback(async () => {
    const today = todayLocalDate();
    const in60  = (() => { const d = new Date(); d.setDate(d.getDate()+60); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    setSessions(await listPlannedSessions(user.id, today, in60));
  }, [user.id]);

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
    setLoadedKey(k => k+1);
    onScheduleChanged?.();
  };

  const handleDelete = async (id: string) => {
    await deletePlannedSession(id);
    setLoadedKey(k => k+1);
    onScheduleChanged?.();
  };

  const today    = todayLocalDate();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const grouped  = useMemo(() => {
    const m = new Map<string, PlannedSession[]>();
    for (const s of sessions) {
      const a = m.get(s.scheduled_date) ?? [];
      a.push(s); m.set(s.scheduled_date, a);
    }
    return m;
  }, [sessions]);

  function dateLabel(d: string) {
    if (d===today)    return 'Today';
    if (d===tomorrow) return 'Tomorrow';
    return new Date(d+'T00:00:00').toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
  }

  const actTag = tag ? tags.find(t => t.id === tag) : null;

  return (
    <div className="plan-pane">
      <div className="plan-columns">

        {/* ──── LEFT: Add Focus Block ──── */}
        <div className="plan-col plan-col--form">
          <div className="plan-col__header">
            <h3>Add focus block</h3>
            <p className="plan-col__subtitle">Schedule a focus session on your calendar.</p>
          </div>

          <div className="plan-form">
            {/* WHEN section */}
            <div className="plan-section">
              <div className="plan-section__label">When</div>
              <div className="plan-field-row">
                {/* Date button */}
                <button ref={dateBtnRef} type="button"
                  className={`plan-field-btn${openPicker==='date'?' is-open':''}`}
                  onClick={() => setOpenPicker(v => v==='date' ? null : 'date')}>
                  <span className="plan-field-btn__icon">
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <span className="plan-field-btn__label">Date</span>
                  <span className="plan-field-btn__value">{fmtDateBtn(date)}</span>
                  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="plan-field-btn__chevron">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {/* Time button */}
                <button ref={timeBtnRef} type="button"
                  className={`plan-field-btn${openPicker==='time'?' is-open':''}`}
                  onClick={() => setOpenPicker(v => v==='time' ? null : 'time')}>
                  <span className="plan-field-btn__icon">
                    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                  <span className="plan-field-btn__label">Time</span>
                  <span className="plan-field-btn__value">{fmtTimeBtn(time)}</span>
                  <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="plan-field-btn__chevron">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* HOW LONG section */}
            <div className="plan-section">
              <div className="plan-section__label">How long</div>
              <button ref={durBtnRef} type="button"
                className={`plan-field-btn plan-field-btn--wide${openPicker==='duration'?' is-open':''}`}
                onClick={() => setOpenPicker(v => v==='duration' ? null : 'duration')}>
                <span className="plan-field-btn__icon">
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </span>
                <span className="plan-field-btn__label">Duration</span>
                <span className="plan-field-btn__value">{fmtDuration(Number(duration))}</span>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="plan-field-btn__chevron">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            {/* WHAT section */}
            <div className="plan-section">
              <div className="plan-section__label">What</div>
              <button ref={actBtnRef} type="button"
                className={`plan-field-btn plan-field-btn--wide${openPicker==='activity'?' is-open':''}`}
                onClick={() => setOpenPicker(v => v==='activity' ? null : 'activity')}>
                <span className="plan-field-btn__icon">
                  {actTag
                    ? <TagIcon def={actTag} size={13} />
                    : <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10"/></svg>}
                </span>
                <span className="plan-field-btn__label">Activity</span>
                <span className="plan-field-btn__value">{actTag?.label ?? 'None'}</span>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="plan-field-btn__chevron">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Calendar toggle + Save */}
            <div className="plan-form__footer">
              <div className="plan-toggle-row">
                <div className="plan-toggle-row__text">
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Add to Google Calendar
                </div>
                <GlassToggle on={calSync} onToggle={() => setCalSync(v => !v)} />
              </div>

              <button type="button" className="plan-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save focus block'}
              </button>
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="plan-col-divider" />

        {/* ──── RIGHT: Scheduled sessions ──── */}
        <div className="plan-col plan-col--history">
          <div className="plan-col__header">
            <h3>Scheduled</h3>
            <p className="plan-col__subtitle">
              {sessions.length > 0
                ? `${sessions.length} session${sessions.length>1?'s':''} planned`
                : 'Nothing planned yet'}
            </p>
          </div>

          <div className="plan-history">
            {grouped.size === 0 ? (
              <div className="plan-history__empty">
                <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.35}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>Add a focus block to see<br/>your upcoming schedule here.</p>
              </div>
            ) : (
              Array.from(grouped.entries()).map(([d, arr]) => (
                <div key={d} className="plan-list__group">
                  <div className="plan-list__date">{dateLabel(d)}</div>
                  {arr.map(s => <SessionCard key={s.id} session={s} onDelete={handleDelete} />)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ──── Pickers (portaled to document.body) ──── */}
      {openPicker === 'date' && (
        <DatePickerPopup
          value={date}
          onConfirm={v => { setDate(v); setOpenPicker(null); }}
          onCancel={() => setOpenPicker(null)}
          anchorEl={dateBtnRef.current}
        />
      )}
      {openPicker === 'time' && (
        <TimePickerPopup
          value={time}
          onConfirm={v => { setTime(v); setOpenPicker(null); }}
          onCancel={() => setOpenPicker(null)}
          anchorEl={timeBtnRef.current}
        />
      )}
      {openPicker === 'duration' && (
        <DurationPickerPopup
          value={duration}
          onChange={v => setDuration(v)}
          onClose={() => setOpenPicker(null)}
          anchorEl={durBtnRef.current}
        />
      )}
      {openPicker === 'activity' && (
        <ActivityPickerPopup
          value={tag}
          onChange={v => setTag(v)}
          onClose={() => setOpenPicker(null)}
          onManageTags={onManageTags}
          anchorEl={actBtnRef.current}
        />
      )}
    </div>
  );
}
