import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useModalDismiss } from '../lib/useModalDismiss.ts';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmApi = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmApi>((o) => {
    setOpts(o);
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  const panelRef = useModalDismiss(opts != null, () => close(false));

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <>
          <style>{styles}</style>
          <div className="confirm-bg" onClick={() => close(false)}>
            <div
              className="confirm-box"
              role="dialog"
              aria-modal="true"
              aria-label={opts.title ?? 'Confirm'}
              ref={panelRef}
              tabIndex={-1}
              onClick={e => e.stopPropagation()}
            >
              {opts.title && <div className="confirm-title">{opts.title}</div>}
              <div className="confirm-msg">{opts.message}</div>
              <div className="confirm-actions">
                <button className="confirm-btn confirm-cancel" onClick={() => close(false)}>
                  {opts.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  className={`confirm-btn ${opts.danger ? 'confirm-danger' : 'confirm-ok'}`}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {opts.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}

const styles = `
  .confirm-bg {
    position: fixed; inset: 0; z-index: 70 /* Z.CONFIRM */;
    background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: confirm-fade 0.15s ease;
  }
  .confirm-box {
    width: 100%; max-width: 380px;
    background: #1a1a1c; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
    padding: 22px; outline: none;
    font-family: 'Inter', system-ui, sans-serif; color: #f0f2f8;
    box-shadow: 0 16px 48px rgba(0,0,0,0.45);
  }
  .confirm-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
  .confirm-msg { font-size: 13.5px; line-height: 1.55; color: #c2c8da; }
  .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  .confirm-btn {
    font-family: inherit; font-size: 13px; font-weight: 500;
    padding: 9px 16px; border-radius: 8px; cursor: pointer; border: 1px solid transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .confirm-cancel { background: transparent; border-color: rgba(255,255,255,0.14); color: #c2c8da; }
  .confirm-cancel:hover { background: rgba(255,255,255,0.06); }
  .confirm-ok { background: #5b9cf6; color: #0f0f10; }
  .confirm-ok:hover { background: #79afff; }
  .confirm-danger { background: #f04e5e; color: #fff; }
  .confirm-danger:hover { background: #ff6473; }
  @keyframes confirm-fade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .confirm-bg { animation: none; } }
`;
