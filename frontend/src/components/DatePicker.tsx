// A date field that matches the rest of the app instead of the browser's own
// picker. The trigger shows the chosen date (or "Any date"); it opens a month
// calendar where arrows move by day, Page Up/Down by month, Enter picks and
// Escape closes. Values are plain YYYY-MM-DD strings, like <input type="date">.
//
// Colours come from the company dashboard (--cd-*) or admin dashboard tokens
// when present, with carbon fallbacks.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
};
const nice = (iso: string) => fromIso(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const styles = `
  .dp { position: relative; display: inline-block; }
  .dp-trigger {
    display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 12px;
    font: 500 12.5px/1 'Inter', system-ui, sans-serif; color: var(--cd-text, var(--text, #f2f2f0));
    background: var(--cd-surface, var(--surface, #171718)); border: 1px solid var(--cd-border2, var(--border2, #2e2e31));
    border-radius: 999px; cursor: pointer; transition: border-color 150ms ease-out;
  }
  .dp-trigger:hover { border-color: rgba(91,156,246,0.45); }
  .dp-trigger:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 2px; }
  .dp-trigger svg { color: var(--cd-text-dim, var(--text-dim, #8a8a8f)); flex: none; }
  .dp-empty { color: var(--cd-text-dim, var(--text-dim, #8a8a8f)); }
  .dp-pop {
    position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; width: 272px; padding: 12px;
    background: var(--cd-surface, var(--surface, #171718)); border: 1px solid var(--cd-border2, var(--border2, #2e2e31));
    border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,0.45);
    font-family: 'Inter', system-ui, sans-serif; color: var(--cd-text, var(--text, #f2f2f0));
    animation: dp-in 140ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @keyframes dp-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  .dp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .dp-month { font-size: 13px; font-weight: 700; }
  .dp-nav {
    width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
    background: none; border: none; border-radius: 8px; color: var(--cd-text-mid, var(--text-mid, #a3a3a6)); cursor: pointer;
  }
  .dp-nav:hover { background: var(--cd-surface2, var(--surface2, #1f1f21)); color: inherit; }
  .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .dp-wd { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-align: center; padding: 4px 0 6px; color: var(--cd-text-dim, var(--text-dim, #8a8a8f)); }
  .dp-day {
    height: 34px; border: none; border-radius: 8px; background: none; cursor: pointer;
    font: 500 12.5px/1 'Inter', system-ui, sans-serif; color: inherit; font-variant-numeric: tabular-nums;
    transition: background 120ms ease-out;
  }
  .dp-day:hover:not(:disabled) { background: var(--cd-surface2, var(--surface2, #1f1f21)); }
  .dp-day:focus-visible { outline: 2px solid #5b9cf6; outline-offset: -2px; }
  .dp-outside { color: var(--cd-text-dim, var(--text-dim, #8a8a8f)); opacity: 0.55; }
  .dp-today { box-shadow: inset 0 0 0 1px rgba(91,156,246,0.6); }
  .dp-selected, .dp-selected:hover:not(:disabled) { background: #5b9cf6; color: #0f0f10; font-weight: 700; }
  .dp-day:disabled { opacity: 0.25; cursor: default; }
  .dp-foot { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--cd-border, var(--border, #2e2e31)); }
  .dp-link { font: 600 12px 'Inter', system-ui, sans-serif; color: #5b9cf6; background: none; border: none; border-radius: 6px; padding: 6px 8px; cursor: pointer; }
  .dp-link:hover { background: rgba(91,156,246,0.1); }
  .dp-link-quiet { color: var(--cd-text-mid, var(--text-mid, #a3a3a6)); }
  @media (prefers-reduced-motion: reduce) { .dp-pop { animation: none; } }
`;

export function DatePicker({ value, onChange, label, min, max, align = 'left' }: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "From date". */
  label: string;
  min?: string;
  max?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(() => (value ? fromIso(value) : new Date()));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();
  const todayIso = toIso(new Date());

  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const show = () => { setFocus(value ? fromIso(value) : new Date()); setOpen(true); };
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const pick = (iso: string) => { if (!inRange(iso)) return; onChange(iso); close(); };

  // Focus follows the highlighted day; a click elsewhere closes the calendar.
  useEffect(() => {
    if (!open) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-iso="${toIso(focus)}"]`)?.focus();
  }, [open, focus]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1), ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1), PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -((focus.getDay() + 6) % 7)), End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
    };
    if (moves[e.key]) { e.preventDefault(); setFocus(moves[e.key]()); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  // Six weeks starting on the Monday on or before the 1st.
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  return (
    <div ref={root} className="dp">
      <style>{styles}</style>
      <button ref={trigger} type="button" className="dp-trigger" aria-haspopup="dialog" aria-expanded={open}
        aria-label={`${label}: ${value ? nice(value) : 'any date'}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); show(); } }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className={value ? '' : 'dp-empty'}>{value ? nice(value) : 'Any date'}</span>
      </button>
      {open && (
        <div className="dp-pop" role="dialog" aria-label={label} style={align === 'right' ? { left: 'auto', right: 0 } : undefined}>
          <div className="dp-head">
            <button type="button" className="dp-nav" aria-label="Previous month" onClick={() => setFocus(f => addMonths(f, -1))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="dp-month" id={`${id}-m`} aria-live="polite">
              {focus.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" className="dp-nav" aria-label="Next month" onClick={() => setFocus(f => addMonths(f, 1))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div ref={grid} className="dp-grid" role="group" aria-labelledby={`${id}-m`} onKeyDown={onKey}>
            {WEEKDAYS.map(w => <span key={w} className="dp-wd" aria-hidden="true">{w}</span>)}
            {days.map(d => {
              const iso = toIso(d);
              const outside = d.getMonth() !== focus.getMonth();
              const focused = iso === toIso(focus);
              return (
                <button key={iso} type="button" data-iso={iso} tabIndex={focused ? 0 : -1}
                  className={`dp-day${outside ? ' dp-outside' : ''}${iso === todayIso ? ' dp-today' : ''}${iso === value ? ' dp-selected' : ''}`}
                  disabled={!inRange(iso)} aria-pressed={iso === value}
                  aria-label={d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  onClick={() => pick(iso)}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dp-foot">
            <button type="button" className="dp-link" disabled={!inRange(todayIso)} onClick={() => pick(todayIso)}>Today</button>
            <button type="button" className="dp-link dp-link-quiet" onClick={() => { onChange(''); close(); }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
