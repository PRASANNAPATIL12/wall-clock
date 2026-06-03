import { useState } from 'react';
import {
  DEFAULT_TAGS,
  getCustomTags,
  saveCustomTag,
  deleteCustomTag,
  type TagDef,
} from '../../lib/tags';
import { TagIcon } from '../TagIcon';
import './TagsPane.css';

interface TagsPaneProps {
  /**
   * When true the "Add custom tag" form opens immediately (auto-focused).
   * Used when the user tapped "+" in the TagPicker — they want to create
   * a tag right now, not browse the list first.
   */
  autoOpenAdd?: boolean;
}

/**
 * Tags pane — shows default tags (read-only) and custom tags (add/delete).
 * Custom tags are persisted in localStorage (wall.tags.custom).
 * Changes here are reflected live in the TagPicker via TAGS_CHANGED_EVENT.
 */
export function TagsPane({ autoOpenAdd = false }: TagsPaneProps) {
  const [custom, setCustom] = useState<TagDef[]>(() => getCustomTags());
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(autoOpenAdd);

  const handleAdd = () => {
    const label = input.trim();
    if (!label) return;
    saveCustomTag(label);
    setCustom(getCustomTags());
    setInput('');
    setAdding(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomTag(id);
    setCustom(getCustomTags());
  };

  return (
    <div className="tags-pane">
      <h3>Tags</h3>
      <p className="tags-pane__hint">
        Pick a tag when you set a focus goal to categorize your session.
        Custom tags appear in the tag picker alongside the defaults.
      </p>

      {/* Default tags — read-only */}
      <h4 className="tags-pane__section-label">Default</h4>
      <ul className="tags-pane__list">
        {DEFAULT_TAGS.map((t) => (
          <li key={t.id} className="tags-pane__row">
            <span className="tags-pane__icon">
              <TagIcon def={t} size={15} />
            </span>
            <span className="tags-pane__label">{t.label}</span>
            <span className="tags-pane__badge">built-in</span>
          </li>
        ))}
      </ul>

      {/* Custom tags */}
      {(custom.length > 0 || adding) && (
        <>
          <h4 className="tags-pane__section-label" style={{ marginTop: 20 }}>Custom</h4>
          <ul className="tags-pane__list">
            {custom.map((t) => (
              <li key={t.id} className="tags-pane__row">
                <span className="tags-pane__icon">
                  <TagIcon def={t} size={15} />
                </span>
                <span className="tags-pane__label">{t.label}</span>
                <button
                  type="button"
                  className="tags-pane__delete"
                  onClick={() => handleDelete(t.id)}
                  aria-label={`Delete ${t.label}`}
                  title="Delete"
                >
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Add tag inline */}
      {adding ? (
        <div className="tags-pane__add-row">
          <input
            className="tags-pane__input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tag name"
            maxLength={24}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setInput(''); }
            }}
          />
          <button
            type="button"
            className="tags-pane__btn tags-pane__btn--primary"
            onClick={handleAdd}
            disabled={!input.trim()}
          >
            Add
          </button>
          <button
            type="button"
            className="tags-pane__btn"
            onClick={() => { setAdding(false); setInput(''); }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="tags-pane__add-trigger"
          onClick={() => setAdding(true)}
        >
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add custom tag
        </button>
      )}
    </div>
  );
}
