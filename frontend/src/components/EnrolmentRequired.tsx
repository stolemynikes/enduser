// The screen an account sees when a second factor is required and it has none.
//
// Shown instead of the dashboard rather than as a banner over it, because the
// server refuses every other request anyway — a dashboard full of failed
// queries behind a dismissible notice would read as a broken product rather
// than as a step to take.
//
// UX rules this follows deliberately:
//   - it says what is being asked and why, in terms of this account's access,
//     rather than "your administrator requires MFA"
//   - the stronger option is first and recommended in words
//   - signing out stays reachable: a person on the wrong account must be able
//     to leave without being told to enrol on it
//   - one h1, then the two panels, so the heading order is not a jumble
import { PasskeySettings } from './PasskeySettings.tsx';
import { MfaSettings } from './MfaSettings.tsx';
import { Wordmark } from './Mark.tsx';

export function EnrolmentRequired({
  email,
  mfaEnabled,
  recoveryCodesLeft,
  onEnrolled,
  onSignOut,
}: {
  email?: string;
  mfaEnabled: boolean;
  recoveryCodesLeft: number;
  onEnrolled: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="er-wrap">
      <style>{styles}</style>
      <div className="er-card">
        <header className="er-head">
          <Wordmark size={18} textClassName="er-brand" accentClassName="er-brand-accent" />
          <h1 className="er-title">One more step before you can continue</h1>
          <p className="er-lede">
            This account can read the details every buyer submits — their name, their address and,
            with a further check, their identity document number. A password on its own is the
            only thing between a convincing phishing email and all of it, so a second step is now
            required.
          </p>
          {email && <p className="er-who">Signed in as {email}</p>}
        </header>

        <PasskeySettings onChanged={onEnrolled} />

        <div className="er-or">
          <span>or, if this device has no passkey support</span>
        </div>

        <MfaSettings
          enabled={mfaEnabled}
          recoveryCodesLeft={recoveryCodesLeft}
          onChanged={onEnrolled}
        />

        <footer className="er-foot">
          <button className="er-signout" onClick={onSignOut}>
            Sign out instead
          </button>
        </footer>
      </div>
    </div>
  );
}

const styles = `
  .er-wrap {
    /* The dashboard's own tokens, since both panels style themselves from them. */
    --cd-bg: #0b0d13; --cd-surface: #151926; --cd-surface2: #1b2030; --cd-surface3: #232940;
    --cd-border: rgba(255,255,255,0.07); --cd-border2: rgba(255,255,255,0.12);
    --cd-text: #f0f2f8; --cd-text-mid: #8b93ad; --cd-text-dim: #4e566e;
    --cd-accent: #f04e5e; --cd-green: #3ecf8e; --cd-amber: #f5a623; --cd-blue: #5b9cf6;
    --cd-r: 12px; --cd-r-sm: 8px; --cd-r-pill: 100px;

    font-family: 'Inter', system-ui, sans-serif; font-size: 13px;
    min-height: 100vh; min-height: 100dvh; background: var(--cd-bg); color: var(--cd-text);
    display: flex; align-items: flex-start; justify-content: center;
    padding: clamp(1.25rem, 5vh, 4rem) 1.25rem;
  }
  .er-card {
    width: 100%; max-width: 640px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .er-head { display: flex; flex-direction: column; gap: 9px; margin-bottom: 4px; }
  .er-brand { font-size: 13px; font-weight: 800; letter-spacing: -0.02em; color: var(--cd-text); }
  .er-brand-accent { color: var(--cd-blue); }
  .er-title {
    margin: 10px 0 0; font-size: 21px; font-weight: 700; line-height: 1.3;
    letter-spacing: -0.02em; color: var(--cd-text); text-wrap: balance;
  }
  .er-lede { margin: 0; font-size: 13px; line-height: 1.65; color: var(--cd-text-mid); max-width: 62ch; }
  .er-who {
    margin: 0; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }

  .er-or {
    display: flex; align-items: center; gap: 12px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }
  .er-or::before, .er-or::after {
    content: ''; flex: 1 1 auto; height: 1px; background: var(--cd-border);
  }

  .er-foot { display: flex; justify-content: center; padding-top: 6px; }
  .er-signout {
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    color: var(--cd-text-dim); background: none; border: none;
    padding: 9px 14px; border-radius: var(--cd-r-sm);
    transition: color 160ms ease-out, background 160ms ease-out;
  }
  .er-signout:hover { color: var(--cd-accent); background: rgba(240,78,94,0.08); }
  .er-signout:focus-visible { outline: 2px solid var(--cd-accent); outline-offset: 1px; }

  @media (prefers-reduced-motion: reduce) { .er-signout { transition: none; } }
`;
