// The eustatement mark: a tick held between two brackets — the fail-closed
// gate, with the decision inside it.
//
// Drawn on a 32-unit grid so the same geometry serves the favicon, the app icon
// and the nav. `tone` picks the palette rather than the component guessing:
// "dark" for the product's dark chrome, "light" for a pale ground, "mono" for
// print and anywhere a single colour is all there is.

type Tone = 'dark' | 'light' | 'mono';

const PALETTE: Record<Tone, { bracket: string; tick: string }> = {
  dark: { bracket: '#f2f2f0', tick: '#5b9cf6' },
  light: { bracket: '#141822', tick: '#1f5fd1' },
  mono: { bracket: 'currentColor', tick: 'currentColor' },
};

export function Mark({ size = 22, tone = 'dark', title }: { size?: number; tone?: Tone; title?: string }) {
  const c = PALETTE[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="M11.5 4.5H7A2.5 2.5 0 0 0 4.5 7v18A2.5 2.5 0 0 0 7 27.5h4.5"
        stroke={c.bracket} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20.5 4.5H25A2.5 2.5 0 0 1 27.5 7v18a2.5 2.5 0 0 1-2.5 2.5h-4.5"
        stroke={c.bracket} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10.8 16.4l3.7 3.7 6.9-7.4" stroke={c.tick} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Mark plus wordmark. `textClassName` keeps each surface's existing brand
 * styling — the pages set their own size and colour, and this does not fight it.
 */
export function Wordmark({
  size = 22, tone = 'dark', textClassName,
}: { size?: number; tone?: Tone; textClassName?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
      <Mark size={size} tone={tone} title="eustatement" />
      <span className={textClassName}>eustatement</span>
    </span>
  );
}
