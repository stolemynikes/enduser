import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import gsap from 'gsap';
import {
  type FormConfigT, type FieldMode, type BuyerPolicy,
  CONFIG_KEYS, CONFIG_ROWS, TERMS_MODES, modeLabels, ID_HIDDEN_WARNING,
  BUYER_TYPE_OPTIONS, BUYER_TYPE_LABEL, BUYER_TYPE_DESC,
  MY_FORM_CONFIG, UPDATE_FORM_CONFIG, draftFromConfig,
  IDENTITY_AVAILABILITY, ID_UNAVAILABLE_WARNING,
} from '../src/lib/formConfigShared';

// First-time setup wizard: full-screen takeover shown instead of the dashboard
// until the owner saves their form config for the first time. Questions reveal
// one at a time (progressive stack) with GSAP animations.

// Step 0 is the buyer-type question; the FieldMode rows follow, then terms, then launch.
const BUYER_STEP = 0;
const FIELD_OFFSET = 1;
const TERMS_STEP = CONFIG_ROWS.length + FIELD_OFFSET;
const LAUNCH_STEP = TERMS_STEP + 1;
const TOTAL_STEPS = LAUNCH_STEP + 1;

type Props = {
  companyName: string;
  companySlug: string;
  onDone: () => void;
};

export default function SetupWizard({ companyName, companySlug, onDone }: Props) {
  const theme = (localStorage.getItem('theme-company') as 'dark' | 'light') ?? 'dark';
  const rootRef = useRef<HTMLDivElement>(null);
  const prevRevealed = useRef(0);

  const [draft, setDraft] = useState<FormConfigT | null>(null);
  const [revealed, setRevealed] = useState(0); // highest visible step index
  const [termsError, setTermsError] = useState('');
  const [saveError, setSaveError] = useState('');

  const { data: cfgData } = useQuery<any>(MY_FORM_CONFIG);
  const { data: idAvailData } = useQuery<any>(IDENTITY_AVAILABILITY);
  const identityAvailable: boolean = idAvailData?.identityVerificationAvailable ?? true;
  // Seeded once from the server, then owned by the wizard. Adjusted during
  // render for the same reason as the dashboard's copy.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && cfgData?.myFormConfig) {
    setSeeded(true);
    setDraft(draftFromConfig(cfgData.myFormConfig));
  }

  const [saveConfig, { loading: saving }] = useMutation<any>(UPDATE_FORM_CONFIG, {
    onCompleted: () => {
      // Exit animation, then hand control back to the dashboard
      gsap.to(rootRef.current, { opacity: 0, y: -12, duration: 0.45, ease: 'power2.in', onComplete: onDone });
    },
    onError: err => setSaveError(err.message),
  });

  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Intro: brand → title → sub → first card
  const ready = draft != null;
  useEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      if (reducedMotion()) {
        gsap.set('.wz-intro > *, .wz-step', { opacity: 1, y: 0 });
        return;
      }
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.wz-intro > *', { opacity: 0, y: 16, duration: 0.6, stagger: 0.12 })
        .from('.wz-step', { opacity: 0, y: 24, duration: 0.55 }, '-=0.25');
    }, rootRef);
    return () => ctx.revert();
  }, [ready]);

  // Each newly revealed card slides in; the just-answered card's badge pops
  useLayoutEffect(() => {
    if (revealed === prevRevealed.current) return;
    prevRevealed.current = revealed;
    const ctx = gsap.context(() => {
      const card = rootRef.current?.querySelector(`.wz-step[data-step="${revealed}"]`);
      const badge = rootRef.current?.querySelector(`.wz-step[data-step="${revealed - 1}"] .wz-badge`);
      if (reducedMotion()) {
        if (card) gsap.set(card, { opacity: 1, y: 0 });
        return;
      }
      if (card) {
        gsap.from(card, { opacity: 0, y: 24, duration: 0.5, ease: 'power3.out' });
        (card as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (badge) gsap.from(badge, { scale: 0, duration: 0.45, ease: 'back.out(1.7)' });
    }, rootRef);
    return () => ctx.revert();
  }, [revealed]);

  if (!draft) {
    return (
      <>
        <style>{styles}</style>
        <div className={`wz-screen${theme === 'light' ? ' wz-light' : ''}`} />
      </>
    );
  }

  const pickMode = (i: number, key: keyof FormConfigT, mode: FieldMode) => {
    setDraft({ ...draft, [key]: mode });
    if (revealed === i) setRevealed(i + 1);
  };

  const pickBuyer = (value: BuyerPolicy) => {
    setDraft({ ...draft, buyerTypes: value });
    if (revealed === BUYER_STEP) setRevealed(BUYER_STEP + 1);
  };

  const continueTerms = () => {
    if (draft.customTermsMode === 'TEXT' && !draft.customTermsText.trim()) {
      setTermsError('Please enter your terms text.');
      return;
    }
    if (draft.customTermsMode === 'LINK') {
      const url = draft.customTermsUrl.trim();
      if (!url) { setTermsError('Please enter a link to your terms page.'); return; }
      if (!/^https?:\/\//i.test(url)) { setTermsError('The link must start with http:// or https://'); return; }
    }
    setTermsError('');
    if (revealed === TERMS_STEP) setRevealed(LAUNCH_STEP);
  };

  const launch = () => {
    setSaveError('');
    const config = Object.fromEntries(CONFIG_KEYS.map(k => [k, draft[k]]));
    saveConfig({ variables: { config } });
  };

  const requiredCount = CONFIG_ROWS.filter(r => draft[r.key] === 'REQUIRED').length;
  const optionalCount = CONFIG_ROWS.filter(r => draft[r.key] === 'OPTIONAL').length;

  const answered = (i: number) => revealed > i;
  const badge = (i: number) => answered(i)
    ? <span className="wz-badge wz-badge-done">✓</span>
    : <span className="wz-badge">{i + 1}</span>;

  return (
    <>
      <style>{styles}</style>
      <div ref={rootRef} className={`wz-screen${theme === 'light' ? ' wz-light' : ''}`}>
        <div className="wz-progress"><div className="wz-progress-fill" style={{ width: `${(revealed / (TOTAL_STEPS - 1)) * 100}%` }} /></div>
        <div className="wz-col">
          <div className="wz-intro">
            <span className="wz-wordmark">eu<b>statement</b></span>
            <h1 className="wz-title">Welcome, {companyName}</h1>
            <p className="wz-sub">
              Let&rsquo;s set up your end-user statement form — a few quick choices and
              you&rsquo;re live at <span className="wz-slug">/{companySlug}</span>.
            </p>
            <p className="wz-always">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12">
                <rect x="4" y="9" width="12" height="8" rx="1.5"/>
                <path d="M7 9V6.5a3 3 0 016 0V9" strokeLinecap="round"/>
              </svg>
              Always collected: email, first &amp; last name, substance(s), statement, terms agreement
            </p>
          </div>

          {revealed >= BUYER_STEP && (
            <div className={`wz-step${answered(BUYER_STEP) ? ' wz-done' : ''}`} data-step={BUYER_STEP}>
              <div className="wz-step-main">
                <div className="wz-step-info">
                  {badge(BUYER_STEP)}
                  <div className="wz-step-text">
                    <span className="wz-step-label">{BUYER_TYPE_LABEL}</span>
                    <span className="wz-step-desc">{BUYER_TYPE_DESC}</span>
                  </div>
                </div>
                <div className="wz-seg">
                  {BUYER_TYPE_OPTIONS.map(opt => (
                    <button key={opt.value}
                      className={`wz-seg-btn${draft.buyerTypes === opt.value && answered(BUYER_STEP) ? ' wz-seg-active' : ''}${draft.buyerTypes === opt.value && !answered(BUYER_STEP) ? ' wz-seg-suggested' : ''}`}
                      onClick={() => pickBuyer(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {CONFIG_ROWS.map((row, idx) => { const i = idx + FIELD_OFFSET; return revealed >= i && (
            <div key={row.key} className={`wz-step${answered(i) ? ' wz-done' : ''}`} data-step={i}>
              <div className="wz-step-main">
                <div className="wz-step-info">
                  {badge(i)}
                  <div className="wz-step-text">
                    <span className="wz-step-label">{row.label}</span>
                    <span className="wz-step-desc">{row.desc}</span>
                    {row.key === 'idVerification' && draft.idVerification === 'HIDDEN' && (
                      <span className="wz-warning">{ID_HIDDEN_WARNING}</span>
                    )}
                    {row.key === 'idVerification' && draft.idVerification === 'REQUIRED' && !identityAvailable && (
                      <span className="wz-warning">{ID_UNAVAILABLE_WARNING}</span>
                    )}
                  </div>
                </div>
                <div className="wz-seg">
                  {row.modes.map(mode => (
                    <button key={mode}
                      className={`wz-seg-btn${draft[row.key] === mode && answered(i) ? ' wz-seg-active' : ''}${draft[row.key] === mode && !answered(i) ? ' wz-seg-suggested' : ''}`}
                      onClick={() => pickMode(i, row.key, mode)}>
                      {modeLabels[mode]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ); })}

          {revealed >= TERMS_STEP && (
            <div className={`wz-step${answered(TERMS_STEP) ? ' wz-done' : ''}`} data-step={TERMS_STEP}>
              <div className="wz-step-main">
                <div className="wz-step-info">
                  {badge(TERMS_STEP)}
                  <div className="wz-step-text">
                    <span className="wz-step-label">Your terms &amp; conditions</span>
                    <span className="wz-step-desc">
                      What your customers must confirm on the form — as text or a link to your
                      own terms page. Prefilled with the standard end-user statement terms.
                    </span>
                  </div>
                </div>
                <div className="wz-seg">
                  {TERMS_MODES.map(m => (
                    <button key={m.value}
                      className={`wz-seg-btn${draft.customTermsMode === m.value ? ' wz-seg-active' : ''}`}
                      onClick={() => setDraft({ ...draft, customTermsMode: m.value })}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {draft.customTermsMode === 'TEXT' && (
                <textarea className="wz-textarea" rows={6}
                  value={draft.customTermsText}
                  onChange={e => setDraft({ ...draft, customTermsText: e.target.value })} />
              )}
              {draft.customTermsMode === 'LINK' && (
                <input className="wz-input" type="url" placeholder="https://yourcompany.com/terms"
                  value={draft.customTermsUrl}
                  onChange={e => setDraft({ ...draft, customTermsUrl: e.target.value })} />
              )}
              <div className="wz-step-foot">
                {termsError && <span className="wz-error">{termsError}</span>}
                {!answered(TERMS_STEP) && (
                  <button className="wz-next-btn" onClick={continueTerms}>Continue →</button>
                )}
              </div>
            </div>
          )}

          {revealed >= LAUNCH_STEP && (
            <div className="wz-step wz-launch" data-step={LAUNCH_STEP}>
              <span className="wz-launch-icon">🚀</span>
              <h2 className="wz-launch-title">Ready to launch</h2>
              <p className="wz-launch-sub">
                Your form collects {requiredCount} required and {optionalCount} optional extra
                field{optionalCount === 1 ? '' : 's'}, identity verification{' '}
                {draft.idVerification === 'REQUIRED' ? 'on' : 'off'}, terms as{' '}
                {draft.customTermsMode === 'TEXT' ? 'text' : 'a link'}. You can change all of
                this later under <b>Form Settings</b> — where you also find the code to put
                the form straight on your own website.
              </p>
              {saveError && <span className="wz-error">{saveError}</span>}
              <button className="wz-launch-btn" onClick={launch} disabled={saving}>
                {saving ? 'Launching…' : 'Save & launch form'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --wz-bg: #0b0d13; --wz-surface: #151926; --wz-surface2: #1b2030;
    --wz-border: rgba(255,255,255,0.07); --wz-border2: rgba(255,255,255,0.12);
    --wz-text: #f0f2f8; --wz-text-mid: #8b93ad; --wz-text-dim: #4e566e;
    --wz-accent: #f04e5e; --wz-green: #3ecf8e; --wz-amber: #f5a623; --wz-blue: #5b9cf6;
  }
  html, body { background: var(--wz-bg); }
  .wz-screen {
    font-family: 'Inter', system-ui, sans-serif; min-height: 100vh;
    background: var(--wz-bg); color: var(--wz-text); font-size: 13px;
  }
  .wz-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: var(--wz-surface2); z-index: 10; }
  .wz-progress-fill {
    height: 100%; background: linear-gradient(90deg, #254a8f, var(--wz-blue));
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .wz-col { max-width: 640px; margin: 0 auto; padding: 4rem 1.5rem 6rem; display: flex; flex-direction: column; gap: 14px; }

  .wz-intro { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.5rem; }
  .wz-wordmark { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; }
  .wz-wordmark b { color: var(--wz-blue); font-weight: 800; }
  .wz-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }
  .wz-sub { font-size: 13.5px; color: var(--wz-text-mid); line-height: 1.6; max-width: 480px; }
  .wz-slug { color: var(--wz-blue); font-weight: 600; }
  .wz-always {
    display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--wz-text-dim);
    background: var(--wz-surface); border: 1px solid var(--wz-border); border-radius: 8px;
    padding: 8px 12px; margin-top: 4px; width: fit-content;
  }
  .wz-always svg { flex-shrink: 0; }

  .wz-step {
    background: var(--wz-surface); border: 1px solid var(--wz-border2); border-radius: 14px;
    padding: 1.15rem 1.35rem;
    box-shadow: 0 0 0 1px rgba(91,156,246,0.18), 0 8px 28px rgba(0,0,0,0.3);
    /* No opacity in this transition list — GSAP animates card opacity, and a CSS
       transition on the same property corrupts the from() tween's recorded end value. */
    transition: box-shadow 0.4s, border-color 0.4s, padding 0.4s;
  }
  .wz-step.wz-done {
    border-color: var(--wz-border); box-shadow: none; padding: 0.85rem 1.35rem;
  }
  .wz-step.wz-done .wz-step-desc, .wz-step.wz-done .wz-step-label { opacity: 0.75; }
  .wz-step-main { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; }
  .wz-step-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .wz-badge {
    flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: var(--wz-text-mid);
    background: var(--wz-surface2); border: 1px solid var(--wz-border2);
  }
  .wz-badge-done { color: #0b0d13; background: var(--wz-green); border-color: var(--wz-green); }
  .wz-step-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .wz-step-label { font-size: 13.5px; font-weight: 600; transition: opacity 0.4s; }
  .wz-step-desc { font-size: 11.5px; color: var(--wz-text-dim); transition: opacity 0.4s; }
  .wz-warning {
    font-size: 11.5px; color: var(--wz-amber); background: rgba(245,166,35,0.08);
    border: 1px solid rgba(245,166,35,0.22); border-radius: 8px;
    padding: 8px 10px; margin-top: 6px; line-height: 1.5;
  }

  .wz-seg { display: flex; background: #0c0f16; border: 1px solid var(--wz-border2); border-radius: 9px; padding: 3px; flex-shrink: 0; }
  .wz-seg-btn {
    font-family: inherit; font-size: 11.5px; font-weight: 500; color: var(--wz-text-dim);
    background: transparent; border: none; border-radius: 6px; padding: 6px 13px;
    cursor: pointer; transition: all 0.15s;
  }
  .wz-seg-btn:hover { color: var(--wz-text); }
  .wz-seg-active { color: #fff !important; background: linear-gradient(135deg, #254a8f, #1a3160); box-shadow: 0 2px 8px rgba(26,49,96,0.4); }
  .wz-seg-suggested { color: var(--wz-text); box-shadow: inset 0 0 0 1px rgba(91,156,246,0.45); }

  .wz-textarea, .wz-input {
    font-family: inherit; font-size: 13px; color: var(--wz-text); background: var(--wz-surface2);
    border: 1px solid var(--wz-border2); border-radius: 8px; padding: 10px 14px;
    width: 100%; outline: none; margin-top: 14px; line-height: 1.6;
    transition: border-color 0.2s, box-shadow 0.2s; resize: vertical;
  }
  .wz-textarea:focus, .wz-input:focus { border-color: var(--wz-blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .wz-step-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 12px; }
  .wz-step-foot:empty { display: none; }
  .wz-error { font-size: 12px; font-weight: 500; color: var(--wz-accent); }
  .wz-next-btn {
    font-family: inherit; font-size: 12.5px; font-weight: 600; color: #fff;
    background: linear-gradient(135deg, #254a8f, #1a3160); border: none; border-radius: 100px;
    padding: 9px 22px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 2px 10px rgba(26,49,96,0.4);
  }
  .wz-next-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(26,49,96,0.55); }

  .wz-launch { text-align: center; padding: 2rem 1.5rem 2.25rem; }
  .wz-launch-icon { font-size: 28px; display: block; margin-bottom: 0.5rem; }
  .wz-launch-title { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
  .wz-launch-sub { font-size: 12.5px; color: var(--wz-text-mid); line-height: 1.7; max-width: 420px; margin: 0 auto 1.25rem; }
  .wz-launch-sub b { color: var(--wz-text); font-weight: 600; }
  .wz-launch .wz-error { display: block; margin-bottom: 0.75rem; }
  .wz-launch-btn {
    font-family: inherit; font-size: 13.5px; font-weight: 600; color: #fff;
    background: linear-gradient(135deg, #2ea36f, #1d7a50); border: none; border-radius: 100px;
    padding: 12px 32px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 18px rgba(46,163,111,0.35);
  }
  .wz-launch-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(46,163,111,0.5); }
  .wz-launch-btn:disabled { opacity: 0.6; cursor: wait; }

  @media (max-width: 600px) {
    .wz-col { padding: 3rem 1rem 4rem; }
    .wz-step-main { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
    .wz-seg { align-self: stretch; }
    .wz-seg-btn { flex: 1; }
  }

  /* ── Light theme ── */
  .wz-light {
    --wz-bg: #f4f5f8; --wz-surface: #ffffff; --wz-surface2: #eef1f7;
    --wz-border: rgba(0,0,0,0.08); --wz-border2: rgba(0,0,0,0.13);
    --wz-text: #111827; --wz-text-mid: #4b5568; --wz-text-dim: #94a3b8;
  }
  .wz-light .wz-step { box-shadow: 0 0 0 1px rgba(37,74,143,0.16), 0 8px 28px rgba(15,23,42,0.08); }
  .wz-light .wz-step.wz-done { box-shadow: none; }
  .wz-light .wz-seg { background: #f0f2f8; }
  .wz-light .wz-seg-btn { color: #6b7280; }
  .wz-light .wz-seg-btn:hover { color: #111827; }
  .wz-light .wz-textarea, .wz-light .wz-input { background: #fff; }
  .wz-light .wz-warning { color: #9a6a0a; background: rgba(245,166,35,0.1); border-color: rgba(200,140,20,0.3); }
  .wz-light .wz-badge-done { color: #fff; }
`;
