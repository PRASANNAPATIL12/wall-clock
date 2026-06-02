import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { tick as hapticTick } from '../lib/haptic';
import { getPickerPos } from '../lib/pickerUtils';
import '../styles/pickers.css';
import './DatePickerPopup.css';

const DOW   = ['S','M','T','W','T','F','S'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fromStr(s: string) {
  const [y,m,d] = s.split('-').map(Number);
  return { year: y!, month: m!-1, day: d! };
}
function todayStr() { return toStr(new Date()); }

interface GridCell { day: number; str: string; type: 'prev'|'cur'|'next' }

function buildGrid(year: number, month: number): GridCell[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMo = new Date(year, month+1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: GridCell[] = [];

  for (let i = firstDow-1; i >= 0; i--)
    cells.push({ day: daysInPrev-i, type:'prev', str: toStr(new Date(year,month-1,daysInPrev-i)) });
  for (let d = 1; d <= daysInMo; d++)
    cells.push({ day: d, type:'cur', str: toStr(new Date(year,month,d)) });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)
    cells.push({ day: d, type:'next', str: toStr(new Date(year,month+1,d)) });
  return cells;
}

interface Props {
  value: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
  anchorEl: HTMLElement | null;
}

export function DatePickerPopup({ value, onConfirm, onCancel, anchorEl }: Props) {
  const today = todayStr();
  const init  = fromStr(value || today);
  const [selected, setSelected]     = useState(value || today);
  const [dispYear, setDispYear]     = useState(init.year);
  const [dispMonth, setDispMonth]   = useState(init.month);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const grid = buildGrid(dispYear, dispMonth);

  const prevMonth = () => {
    hapticTick();
    setDispMonth(m => { if (m===0){ setDispYear(y=>y-1); return 11; } return m-1; });
  };
  const nextMonth = () => {
    hapticTick();
    setDispMonth(m => { if (m===11){ setDispYear(y=>y+1); return 0; } return m+1; });
  };
  const selectDay = (cell: GridCell) => {
    hapticTick();
    setSelected(cell.str);
    if (cell.type !== 'cur') {
      const p = fromStr(cell.str);
      setDispYear(p.year); setDispMonth(p.month);
    }
  };

  const pos = getPickerPos(anchorEl, 288, 368);
  const selParsed = fromStr(selected);
  const selDateObj = new Date(selParsed.year, selParsed.month, selParsed.day);
  const previewText = selDateObj.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });

  return createPortal(
    <>
      <div className="picker-backdrop" onClick={onCancel} />
      <div
        className="picker-popup date-picker"
        style={{ left: pos.left, top: pos.top, width: 288 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Preview header */}
        <div className="date-picker__header">
          <div className="date-picker__label">Select date</div>
          <div className="date-picker__preview">{previewText}</div>
        </div>

        <div className="picker-divider" />

        {/* Month navigation */}
        <div className="date-picker__nav">
          <span className="date-picker__month-year">
            {MONTHS[dispMonth]} {dispYear}
          </span>
          <div className="date-picker__nav-btns">
            <button className="date-picker__nav-btn" onClick={prevMonth} aria-label="Previous month">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button className="date-picker__nav-btn" onClick={nextMonth} aria-label="Next month">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="date-picker__dow">
          {DOW.map((d,i) => <span key={i} className="date-picker__dow-label">{d}</span>)}
        </div>

        {/* Calendar grid */}
        <div className="date-picker__grid">
          {grid.map((cell, i) => {
            const isSel   = cell.str === selected;
            const isToday = cell.str === today;
            const isOther = cell.type !== 'cur';
            return (
              <button
                key={i}
                className={[
                  'date-picker__day',
                  isSel   ? 'is-selected'   : '',
                  isToday && !isSel ? 'is-today' : '',
                  isOther ? 'is-other-month' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectDay(cell)}
                tabIndex={isOther ? -1 : 0}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="picker-footer">
          <button className="picker-btn picker-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="picker-btn picker-btn--primary" onClick={() => onConfirm(selected)}>OK</button>
        </div>
      </div>
    </>,
    document.body,
  );
}
