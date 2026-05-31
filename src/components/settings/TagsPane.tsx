/**
 * Tags pane — read-only list of the fixed tag set for now. Custom tags
 * are a future Phase 2 feature.
 */

const TAGS: Array<{ emoji: string; label: string }> = [
  { emoji: '💻', label: 'Code' },
  { emoji: '📝', label: 'Write' },
  { emoji: '📚', label: 'Study' },
  { emoji: '🎨', label: 'Design' },
  { emoji: '🧘', label: 'Rest' },
  { emoji: '💬', label: 'Meet' },
  { emoji: '⏱️', label: 'Other' },
];

export function TagsPane() {
  return (
    <div>
      <h3>Tags</h3>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 0, marginBottom: 16 }}>
        Pick a tag when you set a goal to categorize your session.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        {TAGS.map((t) => (
          <li key={t.emoji} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
          }}>
            <span style={{ fontSize: 18 }}>{t.emoji}</span>
            <span>{t.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
