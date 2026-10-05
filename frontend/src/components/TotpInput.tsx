// The six-digit field, and the one place that explains recovery codes.
//
// Shared by both sign-in forms and the account screen so the behaviour cannot
// drift between them: the same keyboard on a phone, the same autocomplete hint
// the browser and password managers understand, the same tolerance for a code
// pasted with a space in it, and the same acceptance of a recovery code typed
// where a generated one is expected.
import { forwardRef } from 'react';

export const TotpInput = forwardRef<HTMLInputElement, {
  id: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
  /** Recovery codes carry letters, so the field cannot be digits-only. */
  allowRecoveryCode?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}>(function TotpInput(
  { id, className, value, onChange, allowRecoveryCode = true, autoFocus, disabled },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      className={className}
      // "one-time-code" is what iOS and password managers look for to offer the
      // code from a message or a vault.
      autoComplete="one-time-code"
      // A numeric keypad on a phone, but still a text field so a recovery code
      // can be typed. inputMode is the hint; type stays text.
      inputMode={allowRecoveryCode ? 'text' : 'numeric'}
      type="text"
      // Enough for "ABCDE-FGHIJ"; a generated code is six.
      maxLength={allowRecoveryCode ? 11 : 6}
      placeholder={allowRecoveryCode ? '123456 or a recovery code' : '123456'}
      value={value}
      autoFocus={autoFocus}
      disabled={disabled}
      spellCheck={false}
      autoCapitalize={allowRecoveryCode ? 'characters' : 'off'}
      onChange={e => {
        const raw = e.target.value;
        // Spaces come from people reading a code off a screen, and from pasting.
        onChange(allowRecoveryCode ? raw.replace(/\s/g, '').toUpperCase() : raw.replace(/\D/g, ''));
      }}
      required
    />
  );
});
