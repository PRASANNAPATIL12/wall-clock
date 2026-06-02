import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { tick as hapticTick } from '../lib/haptic';
import { getPickerPos } from '../lib/pickerUtils';
import { getAllTags } from '../lib/tags';
import { TagIcon } from './TagIcon';
import '../styles/pickers.css';
import './ActivityPickerPopup.css';

interface Props {
  value: string | null;
  onChange: (tagId: string | null) => void;
  onClose: () => void;
  onManageTags?: () => void;
  anchorEl: HTMLElement | null;
}

export function ActivityPickerPopup({ value, onChange, onClose, onManageTags, anchorEl }: Props) {
  const tags = getAllTags();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Height: items * 44 + manage button 48 + top/bottom padding 12
  const listH = Math.min(tags.length * 44 + 60 + 12, 380);
  const pos = getPickerPos(anchorEl, 220, listH);

  const select = (id: string) => {
    hapticTick();
    onChange(value === id ? null : id);
    onClose();
  };

  return createPortal(
    <>
      <div className="picker-backdrop" onClick={onClose} />
      <div
        className="picker-popup activity-picker"
        style={{ left: pos.left, top: pos.top, width: 220 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="activity-picker__list">
          {tags.map(tag => {
            const isActive = value === tag.id;
            return (
              <button
                key={tag.id}
                className={`activity-picker__item${isActive ? ' is-active' : ''}`}
                onClick={() => select(tag.id)}
              >
                <span className="activity-picker__icon">
                  <TagIcon def={tag} size={13} />
                </span>
                <span className="activity-picker__label">{tag.label}</span>
                {isActive && (
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden className="activity-picker__check">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider + Manage tags button */}
        <div className="activity-picker__footer">
          <button
            className="activity-picker__manage"
            onClick={() => { onClose(); onManageTags?.(); }}
          >
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Manage tags
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
