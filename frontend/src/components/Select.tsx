// A dropdown that looks like the rest of the app instead of the operating
// system's native menu. It behaves as a listbox: the trigger opens it with a
// click, Enter, Space or the arrow keys; arrows move, Enter or Space picks,
// Escape or a click outside closes and returns focus to the trigger.
//
// Colours come from the dashboard tokens when present (--cd-*), with carbon
// fallbacks, so it fits wherever it is dropped in.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export type SelectOption<T extends string> = { value: T; label: string; description?: string };

const styles = `
  .sel { position: relative; display: inline-block; }
  .sel-block { display: block; }
  .sel-trigger {
    display: inline-flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
    font: 500 12.5px/1 'Inter', system-ui, sans-serif; color: var(--cd-text, #f2f2f0);
    background: var(--cd-surface2, #1f1f21); border: 1px solid var(--cd-border2, #2e2e31);
    border-radius: 999px; min-height: 32px; padding: 0 12px 0 14px; cursor: pointer;
    transition: border-color 150ms ease-out, background 150ms ease-out;
  }
  .sel-block .sel-trigger { border-radius: 10px; min-height: 42px; font-size: 14px; }
  .sel-trigger:hover { border-color: rgba(91,156,246,0.45); }
  .sel-trigger:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 2px; }
  .sel-trigger svg { flex: none; color: var(--cd-text-dim, #8a8a8f); transition: transform 150ms ease-out; }
  .sel-open .sel-trigger svg { transform: rotate(180deg); }
  .sel-list {
    position: absolute; z-index: 40; top: calc(100% + 6px); right: 0; min-width: 100%; width: max-content; max-width: 320px;
    margin: 0; padding: 6px; list-style: none;
    background: var(--cd-surface, #171718); border: 1px solid var(--cd-border2, #2e2e31); border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0,0,0,0.45);
  }
  .sel-block .sel-list { left: 0; right: 0; width: auto; max-width: none; }
  .sel-list:focus { outline: none; }
  .sel-option {
    display: grid; grid-template-columns: 1fr 16px; align-items: center; gap: 2px 12px;
    padding: 9px 10px; border-radius: 8px; cursor: pointer;
    font-family: 'Inter', system-ui, sans-serif; color: var(--cd-text, #f2f2f0);
  }
  .sel-option[data-active="true"] { background: rgba(91,156,246,0.12); }
  .sel-option-label { font-size: 13px; font-weight: 600; }
  .sel-option-desc { grid-column: 1; font-size: 12px; line-height: 1.4; color: var(--cd-text-dim, #8a8a8f); }
  .sel-option svg { grid-row: 1; grid-column: 2; color: #5b9cf6; }
`;

export function Select<T extends string>({ value, options, onChange, label, id, block = false }: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name, for when no visible <label htmlFor={id}> names it. */
  label?: string;
  id?: string;
  /** Full width, form-field sized, instead of a compact pill. */
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find(o => o.value === value) ?? options[0];

  const show = (at = Math.max(0, options.findIndex(o => o.value === value))) => {
    setActive(at);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const pick = (i: number) => {
    const o = options[i];
    if (o && o.value !== value) onChange(o.value);
    close();
  };

  // Focus moves into the list when it opens, and a click anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      show();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(); }
  };

  return (
    <div ref={root} className={`sel${block ? ' sel-block' : ''}${open ? ' sel-open' : ''}`}>
      <style>{styles}</style>
      <button
        ref={trigger} id={id} type="button" className="sel-trigger"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={label ? `${label}: ${current?.label}` : undefined}
        onClick={() => (open ? close() : show())} onKeyDown={onTriggerKey}
      >
        <span>{current?.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list} id={listId} className="sel-list" role="listbox" tabIndex={-1}
          aria-label={label} aria-activedescendant={`${listId}-${active}`} onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value} id={`${listId}-${i}`} role="option" aria-selected={o.value === value}
              className="sel-option" data-active={i === active}
              onMouseEnter={() => setActive(i)} onClick={() => pick(i)}
            >
              <span className="sel-option-label">{o.label}</span>
              {o.value === value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {o.description && <span className="sel-option-desc">{o.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
