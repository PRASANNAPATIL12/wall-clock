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
  // ---- Extended set ----
  {
    id: 'exercise',
    label: 'Exercise',
    path: 'M22 12h-4l-3 9L9 3l-3 9H2', // activity / pulse
  },
  {
    id: 'read',
    label: 'Read',
    path: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z', // bookmark
  },
  {
    id: 'plan',
    label: 'Plan',
    path: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 4 0M9 5a2 2 0 0 0 4 0M9 12l2 2 4-4', // clipboard+check
  },
  {
    id: 'research',
    label: 'Research',
    path: 'M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM21 21l-4.35-4.35', // search
  },
  {
    id: 'music',
    label: 'Music',
    path: 'M9 18V5l12-2v13M9 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', // music note
  },
  {
    id: 'break',
    label: 'Break',
    path: 'M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z', // coffee cup
  },
  {
    id: 'personal',
    label: 'Personal',
    path: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', // heart
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

/** Dispatched after saveCustomTag or deleteCustomTag so live listeners
 *  (e.g. TagPicker) can refresh their tag list without prop drilling. */
export const TAGS_CHANGED_EVENT = 'wall.tags.changed';

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
    window.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
  } catch { /* ignore */ }
  return tag;
}

export function deleteCustomTag(id: string): void {
  const updated = getCustomTags().filter((t) => t.id !== id);
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
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
