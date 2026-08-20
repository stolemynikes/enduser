import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate, Link } from 'react-router-dom';
import { PasswordInput } from '../src/components/PasswordInput.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';

const REGISTER_COMPANY = gql`
  mutation RegisterCompany($name: String!, $slug: String!, $email: String!, $password: String!, $yourName: String!) {
    registerCompany(name: $name, slug: $slug, email: $email, password: $password, yourName: $yourName) {
      token
      role
      company { id name slug }
    }
  }
`;

function toSlug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type Strength = 'short' | 'okay' | 'strong';
function strengthOf(pw: string): Strength {
  if (pw.length < 8) return 'short';
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length;
  return pw.length >= 12 && variety >= 3 ? 'strong' : 'okay';
}

export default function CompanyRegister() {
  const navigate = useNavigate();
  useDocumentTitle('Register — EU Statement');
  const [companyName, setCompanyName] = useState('');
  const [yourName, setYourName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [register, { loading }] = useMutation<any>(REGISTER_COMPANY);

  // The form URL is derived from the company name and not editable; the
  // backend appends a number if the slug is reserved or already taken.
  const slug = toSlug(companyName);

  const strength = strengthOf(password);
  const meterWidth = strength === 'strong' ? 100 : strength === 'okay' ? 66
    : Math.max(10, (password.length / 8) * 40);
  const mismatch = password2.length > 0 && password2 !== password;
  const match = password2.length > 0 && password2 === password;
  const passwordOk = strength !== 'short' && match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password2 !== password) { setError('Passwords don’t match.'); return; }
    try {
      const { data } = await register({ variables: { name: companyName, slug, email, password, yourName } });
      localStorage.setItem('companyToken', data.registerCompany.token);
      localStorage.setItem('companyRole', data.registerCompany.role);
      localStorage.setItem('companyName', data.registerCompany.company.name);
      localStorage.setItem('companySlug', data.registerCompany.company.slug);
      navigate('/company/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cr-wrap">
        <div className="cr-card">
          <div className="cr-logo">
            <span className="cr-brand">eu<span className="cr-brand-accent">statement</span></span>
            <span className="cr-logo-tag">COMPANY</span>
          </div>
          <h1 className="cr-title">Register your company</h1>
          <p className="cr-sub">Create an account to manage end-user statements</p>
          <form onSubmit={handleSubmit} className="cr-form">
            <div className="cr-field">
              <label className="cr-label">Company Name</label>
              <input className="cr-input" type="text" value={companyName}
                onChange={e => setCompanyName(e.target.value)} required autoFocus />
            </div>
            <div className="cr-field">
              <label className="cr-label">Form URL</label>
              <div className="cr-slug-preview">
                <span className="cr-slug-prefix">/</span>
                <span className={`cr-slug-value${slug ? '' : ' cr-slug-empty'}`}>{slug || 'your-company'}</span>
              </div>
              <span className="cr-hint">Derived from your company name — this is the link you share with customers. If it&rsquo;s taken, a number is added.</span>
            </div>
            <hr className="cr-divider" />
            <div className="cr-field">
              <label className="cr-label">Your Name</label>
              <input className="cr-input" type="text" value={yourName}
                onChange={e => setYourName(e.target.value)} required autoComplete="name" />
            </div>
            <div className="cr-field">
              <label className="cr-label">Your Email</label>
              <input className="cr-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="cr-field">
              <label className="cr-label">Password</label>
              <PasswordInput className="cr-input" value={password}
                onChange={setPassword} required minLength={8} autoComplete="new-password" />
              {password.length === 0 ? (
                <span className="cr-hint">Minimum 8 characters</span>
              ) : (
                <>
                  <div className="cr-meter">
                    <div className={`cr-meter-fill cr-meter-${strength}`} style={{ width: `${meterWidth}%` }} />
                  </div>
                  <span key={strength} className={`cr-pw-note cr-pw-${strength}`}>
                    {strength === 'short' && <>Too short — minimum 8 characters</>}
                    {strength === 'okay' && <>Okay — 12+ characters with mixed types is stronger</>}
                    {strength === 'strong' && <><span className="cr-check">✓</span> Strong password</>}
                  </span>
                </>
              )}
            </div>
            <div className="cr-field">
              <label className="cr-label">Confirm Password</label>
              <PasswordInput className={`cr-input${mismatch ? ' cr-input-bad' : ''}${match && strength !== 'short' ? ' cr-input-good' : ''}`}
                value={password2}
                onChange={setPassword2} required minLength={8} autoComplete="new-password" />
              {mismatch && (
                <span className="cr-pw-note cr-pw-short cr-shake">Passwords don&rsquo;t match</span>
              )}
              {match && strength !== 'short' && (
                <span className="cr-pw-note cr-pw-strong"><span className="cr-check">✓</span> Passwords match</span>
              )}
            </div>
            {error && <div className="cr-error" role="alert">{error}</div>}
            <button className="cr-btn" type="submit" disabled={loading || !slug || !passwordOk}>
              {loading ? 'Creating account…' : 'Create company account'}
            </button>
          </form>
          <p className="cr-footer-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0b0d13; font-family: 'Inter', system-ui, sans-serif; }
  .cr-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0b0d13; padding: 1.5rem;
  }
  .cr-card {
    background: linear-gradient(160deg, #151926, #10131c); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 2.5rem 2rem; width: 100%; max-width: 440px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .cr-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .cr-brand { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: #f0f2f8; }
  .cr-brand-accent { color: #5b9cf6; }
  .cr-logo-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.18em;
    color: #5b9cf6; background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.22);
    padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
  }
  .cr-title { font-size: 22px; font-weight: 600; color: #f0f2f8; margin-bottom: 6px; }
  .cr-sub { font-size: 13px; color: #6b7485; margin-bottom: 2rem; }
  .cr-form { display: flex; flex-direction: column; gap: 1rem; }
  .cr-field { display: flex; flex-direction: column; gap: 6px; }
  .cr-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7485; }
  .cr-hint { font-size: 11px; color: #4e566e; font-style: italic; }
  .cr-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 0.25rem 0; }
  .cr-slug-preview {
    display: flex; align-items: baseline; background: #0c0f16;
    border: 1px dashed rgba(255,255,255,0.12); border-radius: 8px;
    padding: 10px 14px; font-size: 13px; cursor: default; user-select: none;
  }
  .cr-slug-prefix { color: #4e566e; }
  .cr-slug-value { color: #5b9cf6; font-weight: 600; }
  .cr-slug-empty { color: #4e566e; font-weight: 400; font-style: italic; }
  .cr-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8;
    background: #0c0f16; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 10px 14px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cr-input:focus { border-color: #5b9cf6; box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .cr-input-bad, .cr-input-bad:focus { border-color: rgba(240,78,94,0.6); box-shadow: 0 0 0 3px rgba(240,78,94,0.12); }
  .cr-input-good, .cr-input-good:focus { border-color: rgba(62,207,142,0.55); box-shadow: 0 0 0 3px rgba(62,207,142,0.1); }
  .cr-meter { height: 4px; background: rgba(255,255,255,0.07); border-radius: 100px; overflow: hidden; margin-top: 2px; }
  .cr-meter-fill {
    height: 100%; border-radius: 100px;
    transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.4s;
  }
  .cr-meter-short { background: #f04e5e; }
  .cr-meter-okay { background: #f5a623; }
  .cr-meter-strong { background: #3ecf8e; }
  .cr-pw-note {
    display: inline-flex; align-items: center; gap: 5px; font-size: 11px;
    animation: crFadeUp 0.3s ease-out;
  }
  .cr-pw-short { color: #f04e5e; }
  .cr-pw-okay { color: #f5a623; }
  .cr-pw-strong { color: #3ecf8e; }
  .cr-check { display: inline-block; font-weight: 700; animation: crPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .cr-shake { animation: crShake 0.4s ease-out; }
  @keyframes crFadeUp { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes crPop { from { transform: scale(0); } 60% { transform: scale(1.3); } to { transform: scale(1); } }
  @keyframes crShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); } 40% { transform: translateX(4px); }
    60% { transform: translateX(-3px); } 80% { transform: translateX(2px); }
  }
  .cr-error {
    background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #f04e5e;
  }
  .cr-btn {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #fff;
    background: linear-gradient(135deg, #254a8f, #1a3160); border: none; border-radius: 10px; padding: 12px;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 8px 24px rgba(26,49,96,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
    margin-top: 0.25rem;
  }
  .cr-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(37,74,143,0.55), inset 0 1px 0 rgba(255,255,255,0.1); }
  .cr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cr-footer-link { font-size: 12px; color: #6b7485; text-align: center; margin-top: 1.5rem; }
  .cr-footer-link a { color: #5b9cf6; text-decoration: none; }
  .cr-footer-link a:hover { text-decoration: underline; }
`;
