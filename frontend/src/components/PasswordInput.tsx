import { useState } from 'react';

type Props = {
  className?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  placeholder?: string;
  minLength?: number;
};

/** Password field with a show/hide toggle. Wraps the page's own input class so
 *  it inherits each page's styling; the toggle is self-styled and theme-neutral. */
export function PasswordInput({ className, value, onChange, autoComplete, required, autoFocus, id, placeholder, minLength }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        id={id}
        className={className}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        minLength={minLength}
        style={{ paddingRight: 42, width: '100%' }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 6,
          color: 'currentColor', opacity: 0.55, display: 'flex', lineHeight: 0,
        }}
      >
        {show ? (
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 3l14 14" strokeLinecap="round" />
            <path d="M8.4 8.4a2.2 2.2 0 003.2 3.1M6.5 6.6C4.6 7.7 3.2 9.4 2.5 10c1.3 2.4 4.2 4.5 7.5 4.5 1.3 0 2.5-.3 3.6-.9M11.7 5.7C11.2 5.6 10.6 5.5 10 5.5c-.5 0-1 .05-1.4.13" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10z" />
            <circle cx="10" cy="10" r="2.2" />
          </svg>
        )}
      </button>
    </div>
  );
}
