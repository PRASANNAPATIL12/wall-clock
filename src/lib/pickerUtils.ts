/**
 * Compute a safe position for a picker popup relative to a trigger element.
 *
 * Logic:
 *   1. Default: below the anchor, left-aligned
 *   2. Flip above if popup would clip viewport bottom
 *   3. Shift left if popup would clip viewport right
 *   4. On narrow screens (< 640px): horizontally centered, prefer below
 */
export function getPickerPos(
  anchorEl: HTMLElement | null,
  popupW: number,
  popupH: number,
  margin = 8,
): { left: number; top: number } {
  if (!anchorEl || typeof window === 'undefined') return { left: 16, top: 100 };

  const rect = anchorEl.getBoundingClientRect();
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;

  // Mobile: center horizontally, smart vertical
  if (vw < 640) {
    const w    = Math.min(popupW, vw - 32);
    const left = Math.max(16, (vw - w) / 2);
    let top    = rect.bottom + margin;
    if (top + popupH > vh - 16) top = rect.top - popupH - margin;
    if (top < 16) top = Math.max(16, (vh - popupH) / 2);
    return { left, top };
  }

  // Desktop: below → flip above if needed
  let top  = rect.bottom + margin;
  let left = rect.left;

  if (top + popupH > vh - 16) top = rect.top - popupH - margin;
  top  = Math.max(16, Math.min(top,  vh - popupH - 16));

  if (left + popupW > vw - 16) left = vw - popupW - 16;
  left = Math.max(16, left);

  return { left, top };
}
