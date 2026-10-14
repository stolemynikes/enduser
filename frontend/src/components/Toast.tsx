import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastApi = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current++;
    setToasts(t => [...t, { id, message, variant }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const api: ToastApi = {
    toast,
    success: useCallback((m: string) => toast(m, 'success'), [toast]),
    error: useCallback((m: string) => toast(m, 'error'), [toast]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <style>{styles}</style>
      <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.variant}`} role="status" onClick={() => remove(t.id)}>
            <span className="toast-icon" aria-hidden="true">
              {t.variant === 'success' ? '✓' : t.variant === 'error' ? '!' : 'i'}
            </span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const styles = `
  .toast-stack {
    position: fixed; bottom: 20px; right: 20px; z-index: 60 /* Z.TOAST */;
    display: flex; flex-direction: column; gap: 10px;
    max-width: min(360px, calc(100vw - 40px));
    pointer-events: none;
  }
  .toast {
    pointer-events: auto; cursor: pointer;
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 10px;
    font-family: 'Inter', system-ui, sans-serif; font-size: 13px; line-height: 1.4;
    color: #f0f2f8; background: #1f1f21;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
    animation: toast-in 0.22s cubic-bezier(0.22,1,0.36,1);
  }
  .toast-icon {
    flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #0f0f10;
  }
  .toast-msg { flex: 1; }
  .toast--success { border-color: rgba(62,207,142,0.5); }
  .toast--success .toast-icon { background: #3ecf8e; }
  .toast--error { border-color: rgba(240,78,94,0.5); }
  .toast--error .toast-icon { background: #f04e5e; color: #fff; }
  .toast--info .toast-icon { background: #5b9cf6; }
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
`;
