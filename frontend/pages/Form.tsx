import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import axios from 'axios';

const SUBMIT_STATEMENT = gql`
  mutation SubmitEndUserStatement($input: SubmitInput!) {
    submitEndUserStatement(input: $input) {
      id
      status
      viesStatus
    }
  }
`;

type IdDocumentType = 'PASSPORT' | 'ID_CARD' | 'DRIVERS_LICENSE';

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
  statement: string;
};

const empty: FormData = {
  email: '', orderNumber: '', firstName: '', lastName: '', street: '',
  zipCode: '', place: '', country: '', companyName: '', vatNumber: '',
  substances: '', casNumbers: '', statement: '',
};

const docTypeLabels: Record<IdDocumentType, string> = {
  PASSPORT: 'Paspoort',
  ID_CARD: 'Identiteitskaart',
  DRIVERS_LICENSE: 'Rijbewijs',
};

export default function Form() {
  const [form, setForm] = useState<FormData>(empty);
  const [agreed, setAgreed] = useState(false);
  const [idName, setIdName] = useState('');
  const [idType, setIdType] = useState<IdDocumentType | ''>('');
  const [idNumber, setIdNumber] = useState('');
  const [extractState, setExtractState] = useState<'idle' | 'extracting' | 'done' | 'failed'>('idle');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [submitMutation] = useMutation(SUBMIT_STATEMENT);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErrorMsg('Afbeelding mag maximaal 10 MB zijn.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Gebruik een JPG, PNG of WebP afbeelding.');
      return;
    }

    setErrorMsg('');
    setExtractState('extracting');

    try {
      const fd = new globalThis.FormData();
      fd.append('file', file);
      const { data } = await axios.post('/extract-id', fd);
      setIdName(data.name ?? '');
      setIdType(data.documentType ?? '');
      setIdNumber(data.documentNumber ?? '');
      setExtractState('done');
    } catch {
      setExtractState('failed');
    }

    // Reset file input so the same file can be reselected if needed
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setErrorMsg('U moet akkoord gaan met de voorwaarden.'); return; }
    if (!idName.trim() || !idType || !idNumber.trim()) {
      setErrorMsg('Vul uw documentgegevens in (naam, type en nummer).');
      return;
    }

    setErrorMsg('');
    setSubmitState('submitting');

    try {
      await submitMutation({
        variables: {
          input: {
            ...form,
            idDocumentName: idName.trim(),
            idDocumentType: idType,
            idDocumentNumber: idNumber.trim(),
            agreedToTerms: true,
          },
        },
      });
      setSubmitState('success');
    } catch (err: any) {
      setSubmitState('error');
      setErrorMsg(err?.message ?? 'Er is iets misgegaan. Probeer het opnieuw.');
    }
  };

  if (submitState === 'success') {
    return (
      <>
        <style>{styles}</style>
        <div className="eu-wrap">
          <div className="eu-success">
            <div className="eu-success-icon">✓</div>
            <h2 className="eu-success-title">Statement Received</h2>
            <p className="eu-success-body">
              Your end-user statement has been submitted successfully. You will receive a confirmation
              by email and will be notified once your submission has been reviewed.
            </p>
            <p className="eu-success-note">Please retain this confirmation for your records.</p>
          </div>
        </div>
      </>
    );
  }

  const busy = submitState === 'submitting';

  return (
    <>
      <style>{styles}</style>
      <div className="eu-wrap">
        <header className="eu-header">
          <div className="eu-header-badge">OFFICIAL DOCUMENT</div>
          <h1 className="eu-title">End-User Statement</h1>
          <p className="eu-subtitle">Chemical Substances — Regulated Use Declaration</p>
          <div className="eu-header-rule" />
        </header>

        <form className="eu-form" onSubmit={handleSubmit} noValidate>

          {/* SECTION 1 – Contact */}
          <section className="eu-section">
            <div className="eu-section-label"><span>01</span> Contact Information</div>
            <div className="eu-grid-2">
              <Field label="Email" id="email" type="email" value={form.email} onChange={set('email')} />
              <Field label="Order Number" id="orderNumber" value={form.orderNumber} onChange={set('orderNumber')} />
              <Field label="First Name" id="firstName" value={form.firstName} onChange={set('firstName')} />
              <Field label="Last Name" id="lastName" value={form.lastName} onChange={set('lastName')} />
            </div>
          </section>

          {/* SECTION 2 – Address */}
          <section className="eu-section">
            <div className="eu-section-label"><span>02</span> Address</div>
            <div className="eu-grid-1">
              <Field label="Street" id="street" value={form.street} onChange={set('street')} />
            </div>
            <div className="eu-grid-3">
              <Field label="Zip Code" id="zipCode" value={form.zipCode} onChange={set('zipCode')} />
              <Field label="Place / City" id="place" value={form.place} onChange={set('place')} />
              <Field label="Country" id="country" value={form.country} onChange={set('country')} />
            </div>
          </section>

          {/* SECTION 3 – Company */}
          <section className="eu-section">
            <div className="eu-section-label"><span>03</span> Company Details</div>
            <div className="eu-grid-2">
              <Field label="Company Name" id="companyName" value={form.companyName} onChange={set('companyName')} />
              <Field label="VAT Number" id="vatNumber" value={form.vatNumber} onChange={set('vatNumber')}
                hint="Required for VIES verification (e.g. NL123456789B01)" />
            </div>
          </section>

          {/* SECTION 4 – Substance */}
          <section className="eu-section">
            <div className="eu-section-label"><span>04</span> Substance Information</div>
            <div className="eu-grid-2">
              <Field label="Name of Substance(s)" id="substances" value={form.substances} onChange={set('substances')} />
              <Field label="CAS Number of the Substance" id="casNumbers" value={form.casNumbers} onChange={set('casNumbers')} />
            </div>
            <div className="eu-grid-1">
              <div className="eu-field">
                <label className="eu-label" htmlFor="statement">Statement <span className="eu-req">*</span></label>
                <textarea className="eu-textarea" id="statement" value={form.statement}
                  onChange={set('statement')} required rows={4} />
              </div>
            </div>
          </section>

          {/* SECTION 5 – Identity */}
          <section className="eu-section">
            <div className="eu-section-label"><span>05</span> Identiteitsdocument</div>
            <p className="eu-id-note">
              Upload een foto van uw paspoort, identiteitskaart of rijbewijs. De gegevens worden automatisch uitgelezen — de foto wordt niet bewaard.
            </p>
            <div className="eu-file-area">
              <label className={`eu-file-label ${extractState === 'extracting' ? 'eu-file-label--busy' : ''}`} htmlFor="idPhoto">
                <div className="eu-file-icon">
                  {extractState === 'extracting' ? (
                    <span className="eu-spinner eu-spinner--dark" />
                  ) : extractState === 'done' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="3" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div className="eu-file-text">
                  {extractState === 'extracting' ? (
                    <span className="eu-file-prompt">Gegevens uitlezen…</span>
                  ) : extractState === 'done' ? (
                    <>
                      <span className="eu-file-name">Gegevens uitgelezen</span>
                      <span className="eu-file-change">Nieuwe foto uploaden</span>
                    </>
                  ) : extractState === 'failed' ? (
                    <>
                      <span className="eu-file-name" style={{ color: 'var(--accent)' }}>Uitgelezen mislukt — vul handmatig in</span>
                      <span className="eu-file-change">Opnieuw proberen</span>
                    </>
                  ) : (
                    <>
                      <span className="eu-file-prompt">Foto uploaden <span className="eu-req">*</span></span>
                      <span className="eu-file-hint">JPG of PNG — max 10 MB — foto wordt direct verwijderd</span>
                    </>
                  )}
                </div>
              </label>
              <input id="idPhoto" type="file" accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect} style={{ display: 'none' }}
                disabled={extractState === 'extracting'} />
            </div>

            <div className="eu-id-fields">
              <div className="eu-field">
                <label className="eu-label" htmlFor="idName">Naam zoals op document <span className="eu-req">*</span></label>
                <input className="eu-input" id="idName" type="text" value={idName}
                  onChange={e => setIdName(e.target.value)} required />
              </div>
              <div className="eu-field">
                <label className="eu-label" htmlFor="idType">Documenttype <span className="eu-req">*</span></label>
                <select className="eu-input eu-select" id="idType" value={idType}
                  onChange={e => setIdType(e.target.value as IdDocumentType | '')}>
                  <option value="">— Selecteer —</option>
                  {(Object.entries(docTypeLabels) as [IdDocumentType, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="eu-field">
                <label className="eu-label" htmlFor="idNumber">Documentnummer <span className="eu-req">*</span></label>
                <input className="eu-input" id="idNumber" type="text" value={idNumber}
                  onChange={e => setIdNumber(e.target.value)} required />
              </div>
            </div>
          </section>

          {/* SECTION 6 – Terms */}
          <section className="eu-section eu-section-terms">
            <div className="eu-section-label"><span>06</span> Terms &amp; Conditions</div>
            <div className="eu-terms-box">
              <p className="eu-terms-intro">I hereby confirm that:</p>
              <ul className="eu-terms-list">
                <li>The substances, preparations and products are only used in an authorized manner (in accordance with European and national legislation), used only for research, scientific and educational purposes.</li>
              </ul>
              <p className="eu-terms-intro" style={{ marginTop: '1rem' }}>The ordered substance(s):</p>
              <ul className="eu-terms-list">
                <li>Not used to manufacture or serve as a constituent or intermediate of narcotics and/or psychotropic substances.</li>
                <li>Not used in medicinal products for human or veterinary use, agriculture, food or cosmetics, except as a raw material, auxiliary or operating material and/or as a research and analytical reagent.</li>
                <li>Not used to develop or produce chemical weapons.</li>
                <li>Not to be used for military or illegal purposes.</li>
                <li>Do not re-export the item(s) to third countries without the prior consent of the export control authorities.</li>
                <li>Will not be re-exported/exported or otherwise nationally or resold internationally or transferred to a destination subject to an EU, UN or US embargo, if such act would conflict with the terms of that embargo.</li>
                <li>Supplies the mentioned products only to customers who can also submit such an End-use certificate. We will carefully keep all received certificates and submit them on request.</li>
                <li>I am over 18 years old.</li>
              </ul>
            </div>
            <label className="eu-checkbox-label">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="eu-checkbox" />
              <span className="eu-checkbox-box" aria-hidden="true">
                {agreed && <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <span>I have read and agree to the above terms and conditions <span className="eu-req">*</span></span>
            </label>
          </section>

          {/* Required note */}
          <p className="eu-req-note"><span className="eu-req">*</span> Required fields</p>

          {/* Error */}
          {(submitState === 'error' || errorMsg) && (
            <div className="eu-error-bar">{errorMsg}</div>
          )}

          {/* Submit */}
          <div className="eu-submit-row">
            <button type="submit" className="eu-btn" disabled={busy}>
              {busy ? (
                <span className="eu-btn-inner">
                  <span className="eu-spinner" />
                  Verklaring indienen…
                </span>
              ) : (
                <span className="eu-btn-inner">
                  <span>Send Statement</span>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                    <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        <footer className="eu-footer">
          <p>This document is legally binding. All information provided is subject to verification.</p>
        </footer>
      </div>
    </>
  );
}

function Field({
  label, id, type = 'text', value, onChange, hint,
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; hint?: string;
}) {
  return (
    <div className="eu-field">
      <label className="eu-label" htmlFor={id}>{label} <span className="eu-req">*</span></label>
      <input className="eu-input" id={id} type={type} value={value} onChange={onChange} required />
      {hint && <span className="eu-hint">{hint}</span>}
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
    .eu-terms-list li { font-size: 10.5px; }
  }

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

  /* ID NOTE */
  .eu-id-note {
    font-size: 11px;
    color: var(--text-light);
    margin-bottom: 1rem;
    line-height: 1.6;
    letter-spacing: 0;
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

  /* FILE UPLOAD */
  .eu-file-area { margin-top: 0.25rem; }
  .eu-file-label {
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1.5px dashed var(--border-dark);
    border-radius: var(--r);
    padding: 1.25rem 1.5rem;
    cursor: pointer;
    background: var(--paper);
    transition: border-color 0.15s, background 0.15s;
  }
  .eu-file-label:hover:not(.eu-file-label--busy) { border-color: var(--navy); background: #f0ede8; }
  .eu-file-label--busy { cursor: default; opacity: 0.75; }
  .eu-file-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    color: var(--navy-mid);
  }
  .eu-file-icon svg { width: 100%; height: 100%; }
  .eu-file-text { display: flex; flex-direction: column; gap: 2px; }
  .eu-file-prompt { font-size: 12px; color: var(--text); }
  .eu-file-name { font-size: 12px; color: var(--navy); font-weight: 500; word-break: break-all; }
  .eu-file-hint, .eu-file-change { font-size: 10px; color: var(--text-light); letter-spacing: 0.03em; }
  .eu-file-err { margin-top: 0.5rem; font-size: 11px; color: var(--accent); }

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
  .eu-terms-list {
    list-style: none;
    padding-left: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .eu-terms-list li {
    padding-left: 1.2rem;
    position: relative;
    font-size: 11px;
    color: var(--text-mid);
    line-height: 1.6;
    letter-spacing: 0;
  }
  .eu-terms-list li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--gold);
    font-size: 10px;
  }
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
`;
