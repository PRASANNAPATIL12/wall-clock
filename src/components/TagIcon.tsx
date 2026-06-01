import type { TagDef } from '../lib/tags';

interface Props {
  def: TagDef;
  size?: number;
  className?: string;
}

/**
 * Renders a single tag's SVG icon at the requested size.
 * Uses Feather-style stroke rendering (fill=none, currentColor).
 */
export function TagIcon({ def, size = 16, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={def.sw ?? 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={def.path} />
    </svg>
  );
}
