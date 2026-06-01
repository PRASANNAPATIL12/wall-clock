/**
 * Tag registry.
 *
 * Each tag has a short string ID (stored in Supabase sessions.tag),
 * a display label, and an inline SVG path for a 24×24 Feather-style icon.
 * All paths use: fill="none", stroke="currentColor", strokeWidth="1.5",
 * strokeLinecap="round", strokeLinejoin="round".
 * Exception: 'other' uses strokeWidth="2.5" dot technique.
 *
 * Custom user tags are persisted in localStorage under wall.tags.custom.
 */

export interface TagDef {
  id: string;
  label: string;
  /** SVG path data — 24×24 viewBox */
  path: string;
  /** If true, render path with fill instead of stroke (for solid shapes) */
  filled?: boolean;
  /** Override strokeWidth (default 1.5) */
  sw?: number;
  custom?: boolean;
}

export const DEFAULT_TAGS: TagDef[] = [
  {
    id: 'code',
    label: 'Code',
    // </> — left chevron + right chevron
    path: 'M8 6 2 12l6 6M16 6l6 6-6 6',
  },
  {
    id: 'write',
    label: 'Write',
    // Pen / edit
    path: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 11.5-11.5z',
  },
  {
    id: 'study',
    label: 'Study',
    // Open book
    path: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  },
  {
    id: 'design',
    label: 'Design',
    // Pen tool / artboard
    path: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z',
  },
  {
    id: 'rest',
    label: 'Rest',
    // Moon
    path: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  },
  {
    id: 'meet',
    label: 'Meet',
    // Two people
    path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    id: 'other',
    label: 'Other',
    // Three horizontal dots
    path: 'M12 12h.01M19 12h.01M5 12h.01',
    sw: 2.5,
  },
];

// ---- Custom tags (localStorage) ----

const CUSTOM_KEY = 'wall.tags.custom';

export function getCustomTags(): TagDef[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as TagDef[];
    return Array.isArray(arr) ? arr.map((t) => ({ ...t, custom: true })) : [];
  } catch {
    return [];
  }
}

export function saveCustomTag(label: string): TagDef {
  const id = `custom_${Date.now()}`;
  // Default icon: small circle
  const tag: TagDef = {
    id,
    label: label.trim().slice(0, 24),
    path: 'M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    custom: true,
  };
  const existing = getCustomTags();
  const updated = [...existing, tag];
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
  return tag;
}

export function deleteCustomTag(id: string): void {
  const updated = getCustomTags().filter((t) => t.id !== id);
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

/** All tags: defaults first, then custom. Used by TagPicker and TagsPane. */
export function getAllTags(): TagDef[] {
  return [...DEFAULT_TAGS, ...getCustomTags()];
}

/** Look up a tag by ID. Returns undefined for unknown IDs (e.g. legacy emoji). */
export function getTag(id: string | null | undefined): TagDef | undefined {
  if (!id) return undefined;
  return getAllTags().find((t) => t.id === id);
}

/** Fallback tag when the stored ID is unknown. */
export const FALLBACK_TAG: TagDef = DEFAULT_TAGS[DEFAULT_TAGS.length - 1]!;
