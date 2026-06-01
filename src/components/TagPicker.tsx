import { useEffect, useState } from 'react';
import { getAllTags } from '../lib/tags';
import { TagIcon } from './TagIcon';
import './TagPicker.css';

interface Props {
  /** Called when the user picks a tag ID (e.g. 'code') or auto-dismiss → null. */
  onPick: (tag: string | null) => void;
}

/**
 * Horizontal row of tag icon buttons. Appears after click-2 (target set).
 * Auto-dismisses after 4 s with no selection — onPick(null).
 * Uses SVG icons from the tag registry — no emoji.
 */
export function TagPicker({ onPick }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const tags = getAllTags();

  // Auto-dismiss after 4 s if the user hasn't tapped anything.
  useEffect(() => {
    if (picked !== null) return;
    const t = window.setTimeout(() => onPick(null), 4000);
    return () => window.clearTimeout(t);
  }, [picked, onPick]);

  const handlePick = (id: string) => {
    setPicked(id);
    window.setTimeout(() => onPick(id), 220);
  };

  return (
    <div className="tag-picker" role="group" aria-label="Tag this session">
      {tags.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tag-picker__btn${picked === t.id ? ' is-picked' : ''}`}
          onClick={() => handlePick(t.id)}
          title={t.label}
          aria-label={t.label}
        >
          <TagIcon def={t} size={15} />
        </button>
      ))}
    </div>
  );
}
