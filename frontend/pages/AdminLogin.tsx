import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const ADMIN_LOGIN = gql`
  mutation AdminLogin($username: String!, $password: String!) {
    adminLogin(username: $username, password: $password) {
      token
    }
  }
`;

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [login, { loading }] = useMutation(ADMIN_LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({ variables: { username, password } });
      localStorage.setItem('adminToken', data.adminLogin.token);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid username or password.');
    }
  };

  return (
    <>
      <style>{loginStyles}</style>
      <div className="al-wrap">
        <div className="al-card">
          <div className="al-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f04e5e" strokeWidth="1.8" width="22" height="22">
              <rect x="3" y="11" width="18" height="11" rx="2" strokeLinecap="round"/>
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="al-title">Welcome back</h1>
          <p className="al-sub">Sign in to the End-User Statement review dashboard</p>

          <form className="al-form" onSubmit={handleSubmit}>
            <div className="al-field">
              <label className="al-label" htmlFor="username">Username</label>
              <input className="al-input" id="username" type="text" value={username}
                onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
            <div className="al-field">
              <label className="al-label" htmlFor="password">Password</label>
              <input className="al-input" id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="al-error">{error}</div>}
            <button className="al-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f1117; --surface: #1a1d27; --surface2: #212533;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
    --text: #f0f2f8; --text-mid: #8b93ad; --text-dim: #4e566e;
    --accent: #f04e5e; --blue: #5b9cf6;
    --ease: cubic-bezier(0.4,0,0.2,1);
  }
  html, body { background: var(--bg); margin: 0; }
  .al-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif; background: var(--bg);
  }
  .al-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 2.75rem 2.25rem; width: 400px; max-width: calc(100vw - 3rem); text-align: center;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5); box-sizing: border-box;
  }
  @media (max-width: 480px) {
    .al-card { padding: 2rem 1.5rem; border-radius: 16px; }
    .al-sub { font-size: 11px; }
  }
  .al-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: rgba(240,78,94,0.12); border: 1px solid rgba(240,78,94,0.2);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.5rem; font-size: 20px;
  }
  .al-title {
    font-size: 1.375rem; font-weight: 700; color: var(--text);
    margin-bottom: 0.35rem; letter-spacing: -0.02em;
  }
  .al-sub { font-size: 12px; color: var(--text-dim); margin-bottom: 2rem; line-height: 1.5; overflow-wrap: break-word; }
  .al-form { display: flex; flex-direction: column; gap: 1rem; text-align: left; }
  .al-field { display: flex; flex-direction: column; gap: 6px; }
  .al-label { font-size: 12px; font-weight: 500; color: var(--text-mid); }
  .al-input {
    font-family: 'Inter', sans-serif; font-size: 14px; color: var(--text);
    background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px;
    padding: 11px 14px; outline: none; width: 100%;
    transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }
  .al-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .al-error {
    background: rgba(240,78,94,0.08); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 10px; padding: 0.75rem 1rem; font-size: 12.5px; color: var(--accent);
    text-align: left;
  }
  .al-btn {
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
    color: #0f1117; background: var(--text); border: none; border-radius: 10px;
    padding: 13px; cursor: pointer; transition: opacity 0.2s var(--ease), transform 0.1s var(--ease);
    margin-top: 0.25rem;
  }
  .al-btn:hover:not(:disabled) { opacity: 0.9; }
  .al-btn:active:not(:disabled) { transform: scale(0.99); }
  .al-btn:disabled { opacity: 0.35; cursor: not-allowed; }
`;
