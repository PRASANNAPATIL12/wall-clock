import { useEffect, useState } from 'react';
import './TagPicker.css';

export interface TagItem {
  emoji: string;
  label: string;
}

export const TAGS: TagItem[] = [
  { emoji: '💻', label: 'Code' },
  { emoji: '📝', label: 'Write' },
  { emoji: '📚', label: 'Study' },
  { emoji: '🎨', label: 'Design' },
  { emoji: '🧘', label: 'Rest' },
  { emoji: '💬', label: 'Meet' },
  { emoji: '⏱️', label: 'Other' },
];

interface Props {
  /** Called when the user picks a tag (or auto-dismiss → null). */
  onPick: (tag: string | null) => void;
}

/**
 * Horizontal row of emoji tag buttons. Appears after click-2 (target set).
 * Auto-dismisses after 4 s with no selection — `onPick(null)`.
 */
export function TagPicker({ onPick }: Props) {
  const [picked, setPicked] = useState<string | null>(null);

  // Auto-dismiss after 4 s if the user didn't tap anything.
  useEffect(() => {
    if (picked !== null) return;
    const t = window.setTimeout(() => onPick(null), 4000);
    return () => window.clearTimeout(t);
  }, [picked, onPick]);

  const handlePick = (emoji: string) => {
    setPicked(emoji);
    // Brief delay so the user sees the visual confirmation pulse.
    window.setTimeout(() => onPick(emoji), 220);
  };

  return (
    <div className="tag-picker" role="group" aria-label="Tag this session">
      {TAGS.map((t) => (
        <button
          key={t.emoji}
          type="button"
          className={`tag-picker__btn${picked === t.emoji ? ' is-picked' : ''}`}
          onClick={() => handlePick(t.emoji)}
          title={t.label}
          aria-label={t.label}
        >
          <span aria-hidden>{t.emoji}</span>
        </button>
      ))}
    </div>
  );
}
