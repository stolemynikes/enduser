import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { COUNTRIES } from '../src/lib/countries.ts';
import { Turnstile } from '../src/components/Turnstile.tsx';
import { useTurnstileRequired } from '../src/lib/useTurnstile.ts';
import { listOf, useI18n } from '../src/i18n/index.ts';
import { I18nProvider } from '../src/i18n/I18nProvider.tsx';
import en, { type Messages, type ServerErrorCode } from '../src/i18n/messages/en.ts';
import { LanguagePicker } from '../src/components/LanguagePicker.tsx';
import { COUNTRY_CODE } from '../src/lib/countries.ts';
import { readPublicTheme, storePublicTheme } from '../src/lib/publicTheme.ts';

const SUBMIT_STATEMENT = gql`
  mutation SubmitEndUserStatement($input: SubmitInput!) {
    submitEndUserStatement(input: $input) {
      id
      status
      viesStatus
    }
  }
`;

// An unknown slug gets the full 404 page, loaded only when it is needed.
const NotFound = lazy(() => import('./NotFound.tsx'));

const FORM_INFO = gql`
  query FormInfo($slug: String!) {
    formInfo(slug: $slug) {
      companyName
      configured
      identityVerificationAvailable
      config { orderNumber address buyerTypes casNumbers concentration idVerification customTermsMode customTermsText customTermsUrl }
    }
  }
`;

type FieldMode = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
type BuyerPolicy = 'COMPANY_ONLY' | 'INDIVIDUAL_ONLY' | 'BOTH';

type FormConfig = {
  orderNumber: FieldMode;
  address: FieldMode;
  buyerTypes: BuyerPolicy;
  casNumbers: FieldMode;
  concentration: FieldMode;
  idVerification: FieldMode;
  customTermsMode: 'TEXT' | 'LINK';
  customTermsText: string;
  customTermsUrl: string;
};

// Mirrors the backend default (backend/lib/formConfig.ts) — shown on /form
// without a slug and while the company config is loading. The English text lives
// in the message file so its translations sit beside it.
const DEFAULT_TERMS_TEXT = en.defaultTerms;

// A seller who never wrote terms of their own is served the platform default,
// which exists in every language. Anything else is the seller's own legal text
// and is shown exactly as written — translating it silently would put words in
// their mouth that they never agreed to.
const isDefaultTerms = (text: string) =>
  !text.trim() || text.replace(/\s+/g, ' ').trim() === DEFAULT_TERMS_TEXT.replace(/\s+/g, ' ').trim();

const DEFAULT_CONFIG: FormConfig = {
  orderNumber: 'REQUIRED', address: 'REQUIRED', buyerTypes: 'COMPANY_ONLY',
  casNumbers: 'REQUIRED', concentration: 'OPTIONAL', idVerification: 'REQUIRED',
  customTermsMode: 'TEXT', customTermsText: DEFAULT_TERMS_TEXT, customTermsUrl: '',
};

type FormData = {
  email: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  street: string;
  zipCode: string;
  place: string;
  country: string;
  companyName: string;
  vatNumber: string;
  substances: string;
  casNumbers: string;
  concentration: string;
  statement: string;
};

const empty: FormData = {
  email: '', orderNumber: '', firstName: '', lastName: '', street: '',
  zipCode: '', place: '', country: '', companyName: '', vatNumber: '',
  substances: '', casNumbers: '', concentration: '', statement: '',
};

// Outcome of the hosted identity check. PENDING means the buyer has not
// finished yet; everything else is terminal and lets them submit — a failed
// check is flagged for the seller's reviewer, never an automatic refusal.
type VerificationStatus =
  | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'DECLINED' | 'EXPIRED' | 'ERROR';

const VERIFY_POLL_MS = 4000;

/**
 * `embed` renders the same form for the /embed/:slug route, which is what a
 * seller drops into their own website in an iframe. Only the presentation
 * changes: no page chrome, no theme switcher (the host picks it with
 * ?theme=dark), and the height is reported to the parent so it can size the
 * frame. Everything that matters — the config, the identity session, the
 * submit mutation — runs exactly as it does on the hosted page, in this
 * origin, where the embedding site cannot read it.
 */
export default function Form({ embed = false }: { embed?: boolean }) {
  return (
    <I18nProvider>
      <StatementForm embed={embed} />
    </I18nProvider>
  );
}

type MissingKey = keyof Messages['missing'];

/** The sentence for a failed submit, in the buyer's language where we have one. */
function submitErrorText(err: any, t: Messages): string {
  const code = err?.errors?.[0]?.extensions?.code ?? err?.graphQLErrors?.[0]?.extensions?.code;
  if (code && code in t.server) return t.server[code as ServerErrorCode];
  if (err?.networkError?.statusCode === 429 || err?.statusCode === 429 || /\b429\b/.test(String(err?.message))) {
    return t.errRateLimited;
  }
  return t.errGeneric;
}

function StatementForm({ embed }: { embed: boolean }) {
  const { lang, t } = useI18n();
  const { slug } = useParams<{ slug?: string }>();
  const [form, setForm] = useState<FormData>(empty);
  const [agreed, setAgreed] = useState(false);
  const [buyerChoice, setBuyerChoice] = useState<'' | 'INDIVIDUAL' | 'COMPANY'>('');
  // Identity is verified by Didit, not here: the document is photographed and
  // checked on their hosted page and never passes through this app. All we hold
  // is the session id, and even that only tells the server which session to read
  // the decision from — the browser is never told what the document said.
  const [verifySessionId, setVerifySessionId] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<'idle' | 'starting' | 'waiting' | 'done'>('idle');
  const [verifyStatus, setVerifyStatus] = useState<VerificationStatus | null>(null);
  // Kept only when the popup was blocked, so the buyer gets a link to click.
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [botToken, setBotToken] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (embed) {
      // The embedding page chooses, via ?theme= on the iframe src.
      return new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';
    }
    return readPublicTheme() ?? 'light';
  });
  useEffect(() => {
    if (!embed) return;
    document.documentElement.classList.add('eu-embed-page');
    return () => document.documentElement.classList.remove('eu-embed-page');
  }, [embed]);
  useEffect(() => {
    if (!embed) storePublicTheme(theme);
    document.documentElement.classList.toggle('eu-dark-page', theme === 'dark');
    document.body.classList.toggle('eu-dark-page', theme === 'dark');
    return () => {
      document.documentElement.classList.remove('eu-dark-page');
      document.body.classList.remove('eu-dark-page');
    };
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const wrapClass = `eu-wrap${theme === 'dark' ? ' eu-dark' : ''}${embed ? ' eu-embed' : ''}`;

  // Tell the embedding page how tall the form is so it can size the iframe.
  // The message carries a pixel height and nothing else, so it is safe to post
  // to any parent origin — the seller's site is not known here.
  useEffect(() => {
    if (!embed) return;
    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent?.postMessage({ type: 'eustatement:height', height }, '*');
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [embed]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyWindowRef = useRef<Window | null>(null);

  const [submitMutation] = useMutation<any>(SUBMIT_STATEMENT);

  const { data: formInfoData } = useQuery<any>(FORM_INFO, { variables: { slug }, skip: !slug });
  const companyDisplayName: string | undefined = formInfoData?.formInfo?.companyName;
  useDocumentTitle(companyDisplayName ? t.docTitleCompany(companyDisplayName) : t.docTitle);
  const seller = companyDisplayName ?? undefined;
  const cfg: FormConfig = formInfoData?.formInfo?.config ?? DEFAULT_CONFIG;
  // False only when the platform has no verification provider configured.
  // Assumed available while the query is in flight so the button does not flash.
  const idVerificationAvailable: boolean = formInfoData?.formInfo?.identityVerificationAvailable ?? true;
  const show = (m: FieldMode) => m !== 'HIDDEN';
  const req = (m: FieldMode) => m === 'REQUIRED';

  // Buyer type: forced by the company's policy, or chosen by the buyer when both
  // are accepted. A company buyer must provide company name + VAT (VIES-checked).
  const showBuyerToggle = cfg.buyerTypes === 'BOTH';
  const buyerType: '' | 'INDIVIDUAL' | 'COMPANY' =
    cfg.buyerTypes === 'COMPANY_ONLY' ? 'COMPANY'
    : cfg.buyerTypes === 'INDIVIDUAL_ONLY' ? 'INDIVIDUAL'
    : buyerChoice;
  const isCompany = buyerType === 'COMPANY';

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Stop polling if the buyer navigates away mid-verification.
  useEffect(() => stopPolling, []);

  const pollVerification = (sessionId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`/verification-status/${sessionId}`);
        const status: VerificationStatus = data.status;
        setVerifyStatus(status);
        if (status !== 'PENDING') {
          stopPolling();
          setVerifyState('done');
          setVerifyUrl(null);
          verifyWindowRef.current?.close();
          verifyWindowRef.current = null;
        }
      } catch (err: any) {
        // The session is gone (expired, or the server restarted) — send the
        // buyer back to the start rather than spinning forever.
        if (err?.response?.status === 404) {
          stopPolling();
          setVerifySessionId(null);
          setVerifyState('idle');
          setVerifyStatus(null);
          setErrorMsg(t.errVerifyExpired);
        }
      }
    }, VERIFY_POLL_MS);
  };

  const startVerification = async () => {
    setErrorMsg('');
    setVerifyState('starting');
    setVerifyStatus(null);
    try {
      const { data } = await axios.post('/verification-session', { companySlug: slug ?? '' });
      setVerifySessionId(data.sessionId);
      setVerifyUrl(null);
      // Opened from the click handler so the popup blocker allows it. Didit's
      // page refuses to be framed, so when the popup is blocked the fallback
      // must leave this document: a new tab when embedded (the iframe may not
      // navigate its host), this tab otherwise.
      const opened = window.open(data.url, 'didit-verification', 'width=520,height=760');
      if (opened) {
        verifyWindowRef.current = opened;
      } else if (embed) {
        setVerifyUrl(data.url);
      } else {
        window.location.href = data.url;
      }
      setVerifyState('waiting');
      setVerifyStatus('PENDING');
      pollVerification(data.sessionId);
    } catch {
      setVerifyState('idle');
      setErrorMsg(t.errVerifyStart);
    }
  };

  // A finished check — whatever the outcome — is enough to submit. A declined
  // or escalated result is passed on to the seller as a flag; the form never
  // refuses a buyer on the strength of an automated check.
  const verificationFinished = verifyState === 'done' && !!verifySessionId && verifyStatus !== 'PENDING';


  // What the buyer still has to do before the form can be sent. Same list for
  // the hosted form, a company's /{slug} form and the embedded one — they are
  // this component. The server re-checks all of it; this is here so nobody
  // submits a half-filled form, and in particular so nobody spends an identity
  // verification on a submission that was going to be rejected anyway.
  const botCheckPending = useTurnstileRequired(botToken);
  const filled = (v: string) => v.trim().length > 0;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  // Kept as keys, not sentences, so the logic below never depends on the
  // wording — and the wording can be in any language.
  const missingKeys: MissingKey[] = [];
  if (!emailLooksValid) missingKeys.push('email');
  if (!filled(form.firstName)) missingKeys.push('firstName');
  if (!filled(form.lastName)) missingKeys.push('lastName');
  if (req(cfg.orderNumber) && !filled(form.orderNumber)) missingKeys.push('orderNumber');
  if (showBuyerToggle && !buyerChoice) missingKeys.push('buyerType');
  if (isCompany && !filled(form.companyName)) missingKeys.push('companyName');
  if (isCompany && !filled(form.vatNumber)) missingKeys.push('vatNumber');
  if (req(cfg.address)) {
    if (!filled(form.street)) missingKeys.push('street');
    if (!filled(form.zipCode)) missingKeys.push('zipCode');
    if (!filled(form.place)) missingKeys.push('place');
    if (!filled(form.country)) missingKeys.push('country');
  }
  if (!filled(form.substances)) missingKeys.push('substance');
  if (req(cfg.casNumbers) && !filled(form.casNumbers)) missingKeys.push('cas');
  if (req(cfg.concentration) && !filled(form.concentration)) missingKeys.push('concentration');
  if (!filled(form.statement)) missingKeys.push('intendedUse');
  if (show(cfg.idVerification) && !verificationFinished) missingKeys.push('identity');
  if (!agreed) missingKeys.push('terms');
  if (botCheckPending) missingKeys.push('robot');
  const canSubmit = missingKeys.length === 0 && (!show(cfg.idVerification) || idVerificationAvailable);
  // A verification is a real, finite resource, so it is not offered until the
  // rest of the form is filled in — an abandoned half-form should not cost one.
  // The terms checkbox is deliberately not in here: it is the last thing the
  // buyer ticks, after verifying.
  const missingBeforeVerify = missingKeys.filter(k => k !== 'identity' && k !== 'terms');
  const describe = (keys: MissingKey[]) => listOf(lang, keys.map(k => t.missing[k]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Also reached by pressing Enter in a field, where the disabled button is
    // no defence.
    // Everything the old one-by-one checks covered is in missingKeys already
    // (terms, buyer type, company fields, verification), so one message says
    // all of it at once instead of revealing problems one submit at a time.
    if (missingKeys.length > 0) {
      setErrorMsg(t.errIncomplete(describe(missingKeys)));
      return;
    }
    if (show(cfg.idVerification) && !idVerificationAvailable) {
      setErrorMsg(t.errIdUnavailable);
      return;
    }

    setErrorMsg('');
    setSubmitState('submitting');

    // Omit fields the company has hidden from its form
    const input: Record<string, unknown> = {
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      substances: form.substances,
      statement: form.statement,
      agreedToTerms: true,
      // The language the buyer read the form in — a hint for which language
      // the stated use is written in, and later for replying in it.
      locale: lang,
      ...(slug ? { companySlug: slug } : {}),
    };
    if (show(cfg.orderNumber)) input.orderNumber = form.orderNumber;
    if (show(cfg.address)) {
      input.street = form.street;
      input.zipCode = form.zipCode;
      input.place = form.place;
      input.country = form.country;
    }
    input.buyerType = buyerType;
    if (isCompany) {
      input.companyName = form.companyName;
      input.vatNumber = form.vatNumber;
    }
    if (show(cfg.casNumbers)) input.casNumbers = form.casNumbers;
    if (show(cfg.concentration)) input.concentration = form.concentration;
    if (show(cfg.idVerification)) {
      // The only identity value the browser sends. Everything about the
      // document is read from Didit by the server against this session.
      input.diditSessionId = verifySessionId;
    }
    if (botToken) input.turnstileToken = botToken;

    try {
      await submitMutation({ variables: { input } });
      setSubmitState('success');
      if (embed) window.parent?.postMessage({ type: 'eustatement:submitted' }, '*');
    } catch (err: any) {
      setSubmitState('error');
      setErrorMsg(submitErrorText(err, t));
    }
  };

  // Forms are served at the root (/{slug}), so an unknown slug doubles as the
  // 404 page; a known slug whose owner hasn't finished setup shows a "not
  // ready" page. /form (no slug) keeps rendering the standard form.
  if (slug && formInfoData && (formInfoData.formInfo == null || formInfoData.formInfo.configured === false)) {
    const notFound = formInfoData.formInfo == null;
    // Inside a seller's iframe a full dark page would look broken, so the embed
    // keeps the small card below.
    if (notFound && !embed) {
      return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f0f10' }} />}>
          <NotFound />
        </Suspense>
      );
    }
    return (
      <>
        <style>{styles}</style>
        <div className={wrapClass}>
          <div className="eu-success">
            <div className="eu-success-icon eu-notready-icon">…</div>
            <h2 className="eu-success-title">{notFound ? t.notFoundTitle : t.notReadyTitle}</h2>
            <p className="eu-success-body">{notFound ? t.notFoundBody : t.notReadyBody}</p>
            <p className="eu-success-note">{t.contactSupplier}</p>
          </div>
        </div>
      </>
    );
  }

  if (submitState === 'success') {
    return (
      <>
        <style>{styles}</style>
        <div className={wrapClass}>
          <div className="eu-success">
            <div className="eu-success-icon">✓</div>
            <h2 className="eu-success-title">{t.successTitle}</h2>
            <p className="eu-success-body">{t.successBody}</p>
            <p className="eu-success-note">{t.successNote}</p>
          </div>
        </div>
      </>
    );
  }

  const busy = submitState === 'submitting';

  // The stored value stays the English name; the buyer reads and sorts by the
  // name in their own language, which the browser supplies from the ISO code.
  const countryOptions = (() => {
    let namer: Intl.DisplayNames | null = null;
    try { namer = new Intl.DisplayNames([lang], { type: 'region' }); } catch { /* old browser — English names */ }
    const collator = new Intl.Collator(lang);
    return COUNTRIES
      .map(value => ({ value, label: (COUNTRY_CODE[value] && namer?.of(COUNTRY_CODE[value])) || value }))
      .sort((a, b) => collator.compare(a.label, b.label));
  })();

  let sectionNo = 0;
  const sec = () => String(++sectionNo).padStart(2, '0');

  return (
    <>
      <style>{styles}</style>
      <div className={wrapClass}>
        <header className="eu-header">
          {/* A row of its own rather than floated over the title: two controls
              side by side would otherwise sit on top of the centred heading on
              a narrow phone. */}
          <div className="eu-toolbar">
          <LanguagePicker />
          {!embed && (
          <button type="button" className="eu-theme-btn" onClick={toggleTheme} title={t.themeToggle} aria-label={t.themeToggle}>
            {theme === 'light' ? (
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
              </svg>
            )}
          </button>
          )}
          </div>
          <div className="eu-header-badge">{t.badge}</div>
          <h1 className="eu-title">{t.title}</h1>
          <p className="eu-subtitle">{t.subtitle}</p>
          {companyDisplayName && <p className="eu-company-line">{t.submittedTo(companyDisplayName)}</p>}
          <div className="eu-header-rule" />
        </header>

        <form className="eu-form" onSubmit={handleSubmit} noValidate>

          {/* SECTION – Buyer type (only when the company accepts both) */}
          {showBuyerToggle && (
            <section className="eu-section">
              <div className="eu-section-label"><span>{sec()}</span> {t.secBuyerType}</div>
              <p className="eu-id-note">{t.buyerTypeQuestion}</p>
              <div className="eu-buyer-seg" role="radiogroup" aria-label={t.secBuyerType}>
                <button type="button" role="radio" aria-checked={buyerChoice === 'INDIVIDUAL'}
                  className={`eu-buyer-btn${buyerChoice === 'INDIVIDUAL' ? ' eu-buyer-active' : ''}`}
                  onClick={() => setBuyerChoice('INDIVIDUAL')}>{t.buyerIndividual}</button>
                <button type="button" role="radio" aria-checked={buyerChoice === 'COMPANY'}
                  className={`eu-buyer-btn${buyerChoice === 'COMPANY' ? ' eu-buyer-active' : ''}`}
                  onClick={() => setBuyerChoice('COMPANY')}>{t.buyerCompany}</button>
              </div>
            </section>
          )}

          {/* SECTION – Contact */}
          <section className="eu-section">
            <div className="eu-section-label"><span>{sec()}</span> {t.secContact}</div>
            <div className="eu-grid-2">
              <Field label={t.email} id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              {show(cfg.orderNumber) && (
                <Field label={t.orderNumber} id="orderNumber" value={form.orderNumber} onChange={set('orderNumber')}
                  required={req(cfg.orderNumber)} />
              )}
              <Field label={t.firstName} id="firstName" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" />
              <Field label={t.lastName} id="lastName" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" />
            </div>
          </section>

          {/* SECTION – Company (only for company buyers) */}
          {isCompany && (
            <section className="eu-section">
              <div className="eu-section-label"><span>{sec()}</span> {t.secCompany}</div>
              <div className="eu-grid-2">
                <Field label={t.companyName} id="companyName" value={form.companyName} onChange={set('companyName')}
                  required autoComplete="organization" />
                <Field label={t.vatNumber} id="vatNumber" value={form.vatNumber} onChange={set('vatNumber')}
                  required hint={t.vatHint} />
              </div>
            </section>
          )}

          {/* SECTION – Address */}
          {show(cfg.address) && (
            <section className="eu-section">
              <div className="eu-section-label"><span>{sec()}</span> {t.secAddress}</div>
              <div className="eu-grid-1">
                <Field label={t.street} id="street" value={form.street} onChange={set('street')} required={req(cfg.address)} autoComplete="street-address" />
              </div>
              <div className="eu-grid-3">
                <Field label={t.zipCode} id="zipCode" value={form.zipCode} onChange={set('zipCode')} required={req(cfg.address)} autoComplete="postal-code" />
                <Field label={t.place} id="place" value={form.place} onChange={set('place')} required={req(cfg.address)} autoComplete="address-level2" />
                <div className="eu-field">
                  <label className="eu-label" htmlFor="country">
                    {t.country} {req(cfg.address) ? <span className="eu-req">*</span> : <span className="eu-optional">{t.optional}</span>}
                  </label>
                  <select className="eu-input eu-select" id="country" value={form.country}
                    onChange={set('country')} required={req(cfg.address)} autoComplete="country-name">
                    <option value="">{t.countrySelect}</option>
                    {countryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* SECTION – Substance */}
          <section className="eu-section">
            <div className="eu-section-label"><span>{sec()}</span> {t.secSubstance}</div>
            <div className={show(cfg.casNumbers) ? 'eu-grid-2' : 'eu-grid-1'}>
              <Field label={t.substanceName} id="substances" value={form.substances} onChange={set('substances')} />
              {show(cfg.casNumbers) && (
                <Field label={t.casNo} id="casNumbers" value={form.casNumbers} onChange={set('casNumbers')}
                  required={req(cfg.casNumbers)} />
              )}
            </div>
            {show(cfg.concentration) && (
              <div className="eu-grid-1">
                <Field label={t.concentration} id="concentration" value={form.concentration}
                  onChange={set('concentration')} required={req(cfg.concentration)}
                  hint={t.concentrationHint} />
              </div>
            )}
            <div className="eu-grid-1">
              <div className="eu-field">
                <label className="eu-label" htmlFor="statement">{t.intendedUse} <span className="eu-req">*</span></label>
                <textarea className="eu-textarea" id="statement" value={form.statement}
                  onChange={set('statement')} required rows={4} aria-describedby="statement-hint" />
                <span className="eu-hint" id="statement-hint">{t.intendedUseHint}</span>
              </div>
            </div>
          </section>

          {/* SECTION – Identity */}
          {show(cfg.idVerification) && (
          <section className="eu-section">
            <div className="eu-section-label"><span>{sec()}</span> {t.secIdentity}</div>
            <p className="eu-id-note">{t.idNote}</p>

            {verifyState === 'idle' && !idVerificationAvailable && (
              <div className="eu-id-warning">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
                <div>
                  <div className="eu-id-warning-title">{t.idUnavailableTitle}</div>
                  <div className="eu-id-warning-note">{t.idUnavailableNote(seller)}</div>
                </div>
              </div>
            )}

            {verifyState === 'idle' && idVerificationAvailable && missingBeforeVerify.length > 0 && (
              <p className="eu-missing-note">{t.fillFirst(describe(missingBeforeVerify))}</p>
            )}

            {verifyState === 'idle' && idVerificationAvailable && (
              <div className="eu-file-options">
                <button type="button" className="eu-file-btn eu-file-btn--camera"
                  disabled={missingBeforeVerify.length > 0} onClick={startVerification}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                    <path d="M10 2.5l6 2.5v4.5c0 3.5-2.4 6.6-6 8-3.6-1.4-6-4.5-6-8V5l6-2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.5 10l1.8 1.8L13 8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t.verifyButton}
                </button>
              </div>
            )}

            {verifyState === 'starting' && (
              <div className="eu-file-extracting">
                <span className="eu-spinner eu-spinner--dark" />
                <span>{t.verifyOpening}</span>
              </div>
            )}

            {verifyState === 'waiting' && (
              <div className="eu-verify-waiting">
                <div className="eu-file-extracting">
                  <span className="eu-spinner eu-spinner--dark" />
                  <span>{t.verifyWaiting}</span>
                </div>
                <p className="eu-verify-hint">{t.verifyWaitingHint}</p>
                {verifyUrl && (
                  <p className="eu-verify-hint">
                    {t.verifyBlocked}{' '}
                    <a className="eu-terms-extlink" href={verifyUrl} target="_blank" rel="noopener noreferrer">
                      {t.verifyBlockedLink} ↗
                    </a>
                  </p>
                )}
                <button type="button" className="eu-file-redo-btn" onClick={startVerification}>
                  {t.verifyRestart}
                </button>
              </div>
            )}

            {verifyState === 'done' && verifyStatus === 'APPROVED' && (
              <div className="eu-file-done">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{t.verified}</span>
              </div>
            )}

            {verifyState === 'done' && verifyStatus === 'IN_REVIEW' && (
              <div className="eu-id-ok">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{ flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 002 0V7zm-1 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"/>
                </svg>
                <span>{t.verifyInReview}</span>
              </div>
            )}

            {verifyState === 'done' && verifyStatus !== 'APPROVED' && verifyStatus !== 'IN_REVIEW' && (
              <div className="eu-id-warning">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
                <div>
                  <div className="eu-id-warning-title">{t.verifyFailedTitle}</div>
                  <div className="eu-id-warning-note">
                    {t.verifyFailedNote}{' '}
                    <button type="button" className="eu-file-redo-btn" onClick={startVerification}>{t.verifyTryAgain}</button>
                  </div>
                </div>
              </div>
            )}
          </section>
          )}

          {/* SECTION – Terms */}
          <section className="eu-section eu-section-terms">
            <div className="eu-section-label"><span>{sec()}</span> {t.secTerms}</div>
            <div className="eu-terms-box">
              {cfg.customTermsMode === 'LINK' && cfg.customTermsUrl ? (
                <>
                  <p className="eu-terms-intro">{t.termsIntro(seller)}</p>
                  <p className="eu-terms-custom">
                    <a className="eu-terms-extlink" href={cfg.customTermsUrl} target="_blank" rel="noreferrer">
                      {t.termsReadLink(seller)} ↗
                    </a>
                  </p>
                </>
              ) : isDefaultTerms(cfg.customTermsText) ? (
                <p className="eu-terms-custom">{t.defaultTerms}</p>
              ) : (
                <>
                  {lang !== 'en' && <p className="eu-terms-intro">{t.termsAsWritten(seller)}</p>}
                  <p className="eu-terms-custom">{cfg.customTermsText}</p>
                </>
              )}
            </div>
            <label className="eu-checkbox-label">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="eu-checkbox" />
              <span className="eu-checkbox-box" aria-hidden="true">
                {agreed && <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span>{t.agree} <span className="eu-req">*</span></span>
            </label>
          </section>

          {/* Required note */}
          <p className="eu-req-note"><span className="eu-req">*</span> {t.requiredNote}</p>

          {/* Error */}
          {(submitState === 'error' || errorMsg) && (
            <div className="eu-error-bar" role="alert">{errorMsg}</div>
          )}

          {/* Anti-robot check — renders nothing unless the server asks for it */}
          <Turnstile onToken={setBotToken} theme={theme === 'dark' ? 'dark' : 'light'} />

          {/* Submit */}
          {missingKeys.length > 0 && (
            <p className="eu-missing-note" aria-live="polite">{t.stillToComplete(describe(missingKeys))}</p>
          )}
          <div className="eu-submit-row">
            <button type="submit" className="eu-btn" disabled={busy || !canSubmit}>
              {busy ? (
                <span className="eu-btn-inner">
                  <span className="eu-spinner" />
                  {t.submitting}
                </span>
              ) : (
                <span className="eu-btn-inner">
                  <span>{t.submit}</span>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                    <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        <footer className="eu-footer">
          <p>{t.footer}</p>
          {/* New tab on purpose: following either link must not cost the buyer a
              half-filled form, and inside a seller's iframe it must not navigate
              the frame away from the form either. */}
          <p className="eu-powered">
            {t.poweredBy}{' '}
            <a href="/" target="_blank" rel="noopener">eustatement</a>
            <span aria-hidden="true"> · </span>
            <a href={`/how-it-works?lang=${lang}${slug ? `&seller=${encodeURIComponent(slug)}` : ''}`}
              target="_blank" rel="noopener">{t.howItWorksLink}</a>
          </p>
        </footer>
      </div>
    </>
  );
}

function Field({
  label, id, type = 'text', value, onChange, hint, required = true, autoComplete,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; hint?: string;
  required?: boolean; autoComplete?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="eu-field">
      <label className="eu-label" htmlFor={id}>
        {label} {required ? <span className="eu-req">*</span> : <span className="eu-optional">{t.optional}</span>}
      </label>
      <input className="eu-input" id={id} type={type} value={value} onChange={onChange} required={required}
        autoComplete={autoComplete} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <span className="eu-hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #0f1e3c;
    --navy-mid: #1a3160;
    --accent: #c8102e;
    --gold: #b8952a;
    --paper: #faf9f6;
    --white: #ffffff;
    --border: #d4d0c8;
    --border-dark: #b0a898;
    --text: #1a1814;
    --text-mid: #4a4540;
    --text-light: #7a756e;
    --focus: #1a3160;
    --section-bg: #f4f2ee;
    --r: 3px;
  }

  html, body { background: var(--paper); overflow-x: hidden; }

  /* Embedded in a seller's own page: no page background or outer chrome, and
     no vertical scrollbar of its own — the parent sizes the frame from the
     height we post to it. */
  html.eu-embed-page, html.eu-embed-page body { background: transparent; }
  .eu-file-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .eu-missing-note {
    font-size: 11.5px; line-height: 1.6; color: var(--text-light);
    border-left: 2px solid var(--border-dark); padding-left: 10px; margin-bottom: 4px;
  }

  .eu-wrap.eu-embed { padding: 0 0 1rem; max-width: none; background: transparent; }
  @media (max-width: 640px) { .eu-wrap.eu-embed { padding: 0 0 1rem; } }

  .eu-wrap {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    max-width: 820px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 3rem;
    background: var(--paper);
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
    overflow-x: hidden;
  }

  /* HEADER */
  .eu-header {
    text-align: center;
    padding-bottom: 2rem;
    margin-bottom: 2rem;
  }
  .eu-header-badge {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.25em;
    color: var(--accent);
    border: 1px solid var(--accent);
    padding: 3px 10px;
    margin-bottom: 1.2rem;
    text-transform: uppercase;
  }
  .eu-title {
    text-wrap: balance; overflow-wrap: break-word;
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 700;
    color: var(--navy);
    letter-spacing: -0.01em;
    margin-bottom: 0.4rem;
  }
  .eu-subtitle {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.18em;
    color: var(--text-light);
    text-transform: uppercase;
    margin-bottom: 1.5rem;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  .eu-company-line {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--text-mid, var(--text-light));
    text-transform: uppercase;
    margin: -0.9rem 0 1.5rem;
  }
  .eu-optional {
    font-style: italic;
    font-weight: 300;
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.65;
  }
  .eu-header-rule {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--navy), var(--accent), var(--navy), transparent);
    opacity: 0.3;
  }

  /* SECTIONS */
  .eu-section {
    margin-bottom: 2rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 1.5rem 1.5rem 1.75rem;
    position: relative;
  }
  .eu-section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-light);
    margin-bottom: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .eu-section-label span {
    font-size: 11px;
    font-weight: 700;
    color: var(--navy);
    background: var(--section-bg);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 1px 6px;
    letter-spacing: 0.05em;
  }

  /* GRIDS */
  .eu-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 1.25rem;
  }
  .eu-grid-3 {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    gap: 1rem 1.25rem;
    margin-top: 1rem;
  }
  .eu-grid-1 { display: grid; grid-template-columns: 1fr; gap: 1rem; }
  /* Stacked grids inside one section need the same rhythm as fields inside a
     grid; without it a label sat directly on the field above it. */
  .eu-grid-1 + .eu-grid-1, .eu-grid-2 + .eu-grid-1 { margin-top: 1rem; }

  @media (max-width: 640px) {
    .eu-wrap { padding: 1.5rem 1rem 2rem; }
    .eu-grid-2, .eu-grid-3 { grid-template-columns: 1fr; }
    .eu-id-fields { grid-template-columns: 1fr; }
    .eu-section { padding: 1.25rem 1rem 1.5rem; }
    .eu-title { font-size: 1.4rem; }
    .eu-subtitle { font-size: 9px; letter-spacing: 0.06em; }
    .eu-header-badge { font-size: 8px; letter-spacing: 0.15em; }
    .eu-submit-row { justify-content: stretch; }
    .eu-btn { width: 100%; }
    .eu-file-hint { font-size: 9px; }
    .eu-terms-box { padding: 1rem; max-height: 200px; }
    .eu-terms-custom { font-size: 10.5px; }
  }

  /* BUYER TYPE SEGMENTED CONTROL */
  .eu-buyer-seg { display: flex; gap: 0.75rem; }
  .eu-buyer-btn {
    flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text-mid); background: var(--paper);
    border: 1.5px solid var(--border); border-radius: var(--r);
    padding: 12px 16px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .eu-buyer-btn:hover { border-color: var(--border-dark); }
  .eu-buyer-active { border-color: var(--navy); background: var(--section-bg); color: var(--navy); font-weight: 700; }

  /* FIELDS */
  .eu-field { display: flex; flex-direction: column; gap: 5px; }
  .eu-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: var(--text-mid);
    text-transform: uppercase;
  }
  .eu-req { color: var(--accent); margin-left: 1px; }
  .eu-hint {
    font-size: 10px;
    color: var(--text-light);
    font-style: italic;
    letter-spacing: 0;
  }
  .eu-input, .eu-textarea {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    color: var(--text);
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 9px 12px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    width: 100%;
  }
  .eu-input:hover, .eu-textarea:hover { border-color: var(--border-dark); }
  .eu-input:focus, .eu-textarea:focus {
    border-color: var(--focus);
    background: var(--white);
    box-shadow: 0 0 0 3px rgba(26, 49, 96, 0.08);
  }
  .eu-textarea { resize: vertical; min-height: 90px; }
  .eu-input-readonly, .eu-input-readonly:hover {
    opacity: 0.7;
    cursor: not-allowed;
    border-style: dashed;
    border-color: var(--border);
  }

  /* ID NOTE */
  .eu-id-note {
    font-size: 11px;
    color: var(--text-light);
    margin-bottom: 1rem;
    line-height: 1.6;
    letter-spacing: 0;
  }

  /* ID VALIDATION BANNERS */
  .eu-id-warning {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-left: 3px solid #f97316;
    border-radius: var(--r);
    padding: 0.75rem 1rem;
    margin-top: 1rem;
    color: #9a3412;
    font-size: 11.5px;
    line-height: 1.5;
  }
  .eu-id-warning-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
    letter-spacing: 0.03em;
  }
  .eu-id-warning-note {
    font-size: 10.5px;
    color: #c2410c;
    font-style: italic;
  }
  .eu-id-ok {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    font-size: 11px;
    color: #15803d;
    letter-spacing: 0.03em;
  }

  /* ID PHOTO PREVIEW */
  .eu-id-preview {
    margin-top: 1rem;
    display: flex; justify-content: center;
  }
  .eu-id-preview-img {
    max-width: 100%; max-height: 220px;
    border-radius: 6px;
    border: 1px solid var(--border-dark);
    object-fit: contain;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  }

  /* ID FIELDS */
  .eu-id-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem 1.25rem;
    margin-top: 1.25rem;
  }
  @media (max-width: 640px) {
    .eu-id-fields { grid-template-columns: 1fr; }
  }

  /* SELECT */
  .eu-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%237a756e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 28px;
    cursor: pointer;
  }

  /* IDENTITY VERIFICATION */
  .eu-file-extracting {
    display: flex; align-items: center; gap: 0.875rem;
    padding: 1.25rem 1.5rem;
    border: 1.5px dashed var(--border-dark);
    border-radius: var(--r);
    background: var(--paper);
    font-size: 12px; color: var(--text-mid);
    margin-top: 0.25rem;
  }
  .eu-file-done {
    display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;
    padding: 0.875rem 1.25rem;
    border: 1.5px solid #86efac;
    background: #f0fdf4;
    border-radius: var(--r);
    font-size: 12px; color: #15803d;
    margin-top: 0.25rem;
  }
  .eu-file-redo-btn {
    background: none; border: none; padding: 0; cursor: pointer;
    font-family: inherit; font-size: 12px; color: var(--navy-mid);
    text-decoration: underline; text-underline-offset: 2px;
  }
  .eu-file-redo-btn:hover { color: var(--navy); }

  .eu-file-options {
    display: flex; align-items: center; gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  .eu-file-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--navy); background: var(--white);
    border: 1.5px solid var(--border-dark); border-radius: var(--r);
    padding: 10px 18px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    text-decoration: none;
  }
  .eu-file-btn:hover { border-color: var(--navy); background: #f0ede8; }
  .eu-file-btn--camera { color: var(--navy-mid); }

  .eu-verify-waiting {
    display: flex; flex-direction: column; align-items: flex-start; gap: 0.625rem;
    margin-top: 0.25rem;
  }
  .eu-verify-waiting .eu-file-extracting { margin-top: 0; width: 100%; }
  .eu-verify-hint {
    font-size: 11.5px; color: var(--text-mid); line-height: 1.6; margin: 0;
  }

  /* TERMS */
  .eu-section-terms { background: #fcfbf8; }
  .eu-terms-box {
    background: var(--section-bg);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
    max-height: 240px;
    overflow-y: auto;
  }
  .eu-terms-box::-webkit-scrollbar { width: 5px; }
  .eu-terms-box::-webkit-scrollbar-thumb { background: var(--border-dark); border-radius: 3px; }
  .eu-terms-intro {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--navy);
    margin-bottom: 0.5rem;
    letter-spacing: 0.02em;
  }
  .eu-terms-custom {
    font-size: 11px;
    color: var(--text-mid);
    line-height: 1.6;
    white-space: pre-line;
  }
  .eu-terms-custom + .eu-terms-custom { margin-top: 0.75rem; }
  .eu-terms-extlink {
    color: var(--navy);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .eu-terms-extlink:hover { color: var(--gold); }
  .eu-checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 12px;
    color: var(--text);
    line-height: 1.5;
    user-select: none;
  }
  .eu-checkbox { position: absolute; opacity: 0; width: 0; height: 0; }
  .eu-checkbox-box {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border: 1.5px solid var(--border-dark);
    border-radius: 2px;
    background: var(--white);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
    transition: border-color 0.15s, background 0.15s;
    color: var(--white);
  }
  .eu-checkbox:checked + .eu-checkbox-box {
    background: var(--navy);
    border-color: var(--navy);
  }
  .eu-checkbox:focus + .eu-checkbox-box {
    box-shadow: 0 0 0 3px rgba(26, 49, 96, 0.12);
  }
  .eu-checkbox-box svg { width: 12px; height: 12px; }

  /* FOOTER NOTES */
  .eu-req-note {
    font-size: 10.5px;
    color: var(--text-light);
    margin-bottom: 1rem;
    text-align: right;
    letter-spacing: 0.04em;
  }

  /* ERROR */
  .eu-error-bar {
    background: #fff1f2;
    border: 1px solid #fca5a5;
    border-left: 3px solid var(--accent);
    border-radius: var(--r);
    padding: 0.75rem 1rem;
    font-size: 12px;
    color: #9f1239;
    margin-bottom: 1.25rem;
  }

  /* SUBMIT */
  .eu-submit-row { display: flex; justify-content: flex-end; }
  .eu-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--white);
    background: var(--navy);
    border: none;
    border-radius: var(--r);
    padding: 13px 28px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    min-width: 200px;
  }
  .eu-btn:hover:not(:disabled) { background: var(--navy-mid); box-shadow: 0 4px 16px rgba(15,30,60,0.25); }
  .eu-btn:active:not(:disabled) { transform: translateY(1px); }
  .eu-btn:disabled { opacity: 0.65; cursor: not-allowed; }
  .eu-btn-inner { display: flex; align-items: center; justify-content: center; gap: 10px; }

  /* SPINNER */
  .eu-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  .eu-spinner--dark {
    width: 28px;
    height: 28px;
    border-color: rgba(15,30,60,0.15);
    border-top-color: var(--navy-mid);
    display: block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* SUCCESS */
  .eu-success {
    text-align: center;
    padding: 3rem 2rem;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--r);
  }
  .eu-success-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #f0fdf4;
    border: 2px solid #86efac;
    color: #16a34a;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.25rem;
  }
  .eu-notready-icon {
    background: #f8f6f1;
    border-color: var(--border-dark, #d6d0c4);
    color: var(--text-mid);
  }
  .eu-success-title {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 1.6rem;
    color: var(--navy);
    margin-bottom: 0.75rem;
  }
  .eu-success-body {
    font-size: 12px;
    color: var(--text-mid);
    max-width: 460px;
    margin: 0 auto 0.75rem;
    line-height: 1.7;
    letter-spacing: 0;
  }
  .eu-success-note {
    font-size: 10.5px;
    color: var(--text-light);
    letter-spacing: 0.06em;
    font-style: italic;
  }

  /* FOOTER */
  /* .eu-footer p is uppercase and tiny for the legal line; this line is read. */
  .eu-footer .eu-powered {
    margin-top: 0.75rem;
    font-size: 11.5px; letter-spacing: 0.02em; text-transform: none;
    color: var(--text-mid);
  }
  .eu-powered a {
    color: var(--navy-mid); text-decoration: underline; text-underline-offset: 2px;
    display: inline-block; padding: 6px 2px; /* a larger hit area without moving the line */
  }
  .eu-powered a:hover { color: var(--navy); }
  .eu-powered a:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .eu-footer {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .eu-footer p {
    font-size: 9.5px;
    letter-spacing: 0.1em;
    color: var(--text-light);
    text-transform: uppercase;
  }

  /* THEME TOGGLE */
  .eu-header { position: relative; }
  .eu-toolbar {
    display: flex; justify-content: flex-end; align-items: center; gap: 8px;
    margin-bottom: 1.25rem;
  }
  .eu-theme-btn {
    flex-shrink: 0;
    background: transparent; border: 1px solid var(--border-dark);
    border-radius: 50%; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-light); cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .eu-theme-btn:hover { background: var(--section-bg); color: var(--text-mid); border-color: var(--navy-mid); }
  .eu-theme-btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  @media (pointer: coarse) { .eu-theme-btn { width: 44px; height: 44px; } }

  /* ── DARK THEME ─────────────────────────────────── */
  .eu-dark {
    --navy:        #7ba7e8;
    --navy-mid:    #5b8fd4;
    --accent:      #e85555;
    --gold:        #c9a84c;
    --paper:       #0f0f10;
    --white:       #19191b;
    --border:      rgba(255,255,255,0.09);
    --border-dark: rgba(255,255,255,0.16);
    --text:        #e8eaf0;
    --text-mid:    #9ca3af;
    --text-light:  #6b7480;
    --focus:       #7ba7e8;
    --section-bg:  #1f1f22;
  }
  html.eu-dark-page, body.eu-dark-page, .eu-dark { background: #0f0f10; }
  .eu-dark .eu-section { background: var(--white); }
  .eu-dark .eu-section-terms { background: #13172280; }
  .eu-dark .eu-terms-box { background: var(--section-bg); }
  .eu-dark .eu-input, .eu-dark .eu-textarea {
    background: var(--paper); color: var(--text);
    border-color: var(--border-dark);
  }
  .eu-dark .eu-input:focus, .eu-dark .eu-textarea:focus {
    background: var(--white);
    border-color: var(--focus);
  }
  .eu-dark .eu-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }
  .eu-dark .eu-file-btn { background: var(--white); color: var(--text); border-color: var(--border-dark); }
  .eu-dark .eu-file-btn:hover { background: var(--section-bg); }
  .eu-dark .eu-error-bar { background: rgba(159,18,57,0.15); border-color: rgba(252,165,165,0.3); color: #fca5a5; }
  .eu-dark .eu-success { background: var(--white); border-color: var(--border-dark); }
  .eu-dark .eu-checkbox-box { background: var(--white); border-color: var(--border-dark); }
  .eu-dark input:checked + .eu-checkbox-box { background: var(--navy-mid); border-color: var(--navy-mid); }
  .eu-dark .eu-header-badge { color: var(--accent); border-color: var(--accent); }

`;
