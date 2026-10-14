// Our own field errors in place of the browser's validation bubbles.
//
// Spread `formProps` on a <form>: the browser stops showing its own popups
// (noValidate), and on submit any field that fails its HTML constraints
// (required, type="email", minLength, pattern) gets a message under it, is
// marked aria-invalid and the first one is focused. The form's own onSubmit
// only runs once everything is valid. A message clears as soon as the field
// is edited.
//
// Errors go under the field's container — the nearest element whose class
// ends in "-field" — so it works with each page's existing markup.
import { useCallback, type FormEvent } from 'react';

const STYLE_ID = 'field-validation-style';
const STYLES = `
  .fv-error {
    display: flex; align-items: flex-start; gap: 6px; margin: 6px 0 0;
    font-size: 12.5px; line-height: 1.45; font-weight: 500; color: #f38b8b;
  }
  .fv-error svg { flex: none; margin-top: 2px; }
  [aria-invalid="true"] { border-color: rgba(240,106,106,0.7) !important; box-shadow: 0 0 0 3px rgba(240,106,106,0.14) !important; }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function labelFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const text = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '';
  const clean = (text ?? '').replace(/\(.*?\)/g, '').replace(/[*:]/g, '').trim();
  if (!clean) return 'This field';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function messageFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const v = el.validity;
  if (v.valueMissing) return `${labelFor(el)} is required.`;
  if (v.typeMismatch && el.type === 'email') return 'Enter a full email address, like name@company.com.';
  if (v.typeMismatch && el.type === 'url') return 'Enter a full web address, starting with https://.';
  if (v.tooShort && 'minLength' in el) return `Use at least ${el.minLength} characters.`;
  if (v.tooLong && 'maxLength' in el) return `Use at most ${el.maxLength} characters.`;
  if (v.patternMismatch) return el.title || 'This doesn’t look right — check the format.';
  if (v.rangeUnderflow || v.rangeOverflow || v.stepMismatch) return 'Enter a number in the allowed range.';
  return el.validationMessage;
}

const ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.3" fill="currentColor"/></svg>';

function clearError(el: Element) {
  const id = el.getAttribute('data-fv-error');
  if (id) document.getElementById(id)?.remove();
  el.removeAttribute('data-fv-error');
  el.removeAttribute('aria-invalid');
  const described = (el.getAttribute('aria-describedby') ?? '').split(' ').filter(x => x && x !== id).join(' ');
  if (described) el.setAttribute('aria-describedby', described); else el.removeAttribute('aria-describedby');
}

let counter = 0;

function showError(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  clearError(el);
  const id = `fv-${++counter}`;
  const p = document.createElement('p');
  p.id = id;
  p.className = 'fv-error';
  p.innerHTML = ICON;
  p.append(document.createTextNode(messageFor(el)));
  const host = el.closest('[class$="-field"]') ?? el.parentElement;
  host?.appendChild(p);
  el.setAttribute('data-fv-error', id);
  el.setAttribute('aria-invalid', 'true');
  el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
  el.addEventListener('input', () => clearError(el), { once: true });
}

export function useFieldValidation() {
  const onSubmitCapture = useCallback((e: FormEvent<HTMLFormElement>) => {
    ensureStyle();
    const form = e.currentTarget;
    const fields = Array.from(form.elements).filter(
      (x): x is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
        x instanceof HTMLInputElement || x instanceof HTMLTextAreaElement || x instanceof HTMLSelectElement,
    );
    fields.forEach(clearError);
    const invalid = fields.filter(f => !f.disabled && !f.checkValidity());
    if (invalid.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    invalid.forEach(showError);
    invalid[0].focus();
  }, []);

  return { formProps: { noValidate: true, onSubmitCapture } };
}
