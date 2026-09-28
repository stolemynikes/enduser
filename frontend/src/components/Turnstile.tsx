// Cloudflare Turnstile widget.
//
// Renders nothing until the server says a site key is configured, so development
// and self-hosted instances without bot protection behave exactly as before.
// The script is loaded on demand rather than in index.html, so a visitor who
// never reaches a protected form never loads it.
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { PUBLIC_CONFIG } from '../lib/useTurnstile.ts';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string } }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile script failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Calls `onToken` with a challenge response, or with '' when it expires. */
export function Turnstile({ onToken, theme = 'dark' }: { onToken: (token: string) => void; theme?: 'dark' | 'light' }) {
  const { data } = useQuery<any>(PUBLIC_CONFIG);
  const siteKey: string | null = data?.publicConfig?.turnstileSiteKey ?? null;
  const box = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !box.current || rendered.current) return;
    rendered.current = true;
    loadScript()
      .then(() => {
        if (!box.current || !window.turnstile) return;
        window.turnstile.render(box.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => { setFailed(true); onToken(''); },
        });
      })
      .catch(() => setFailed(true));
  }, [siteKey, theme, onToken]);

  if (!siteKey) return null;
  return (
    <div>
      <div ref={box} />
      {failed && (
        <p style={{ fontSize: 12, color: '#f04e5e', marginTop: 8 }}>
          The anti-robot check could not load. Refresh the page and try again.
        </p>
      )}
    </div>
  );
}
