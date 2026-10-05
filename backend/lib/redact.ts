// What leaves the server with an ordinary query.
//
// The identity document number does not — for anybody, in any role. Didit has
// already established who the person is, so no review decision needs it, and it
// is the one field that turns a leak into identity fraud because it sits beside
// a name and an address. It comes back only from the reveal mutation, which
// demands a fresh second factor and records the access (see lib/reveal.ts).
//
// This used to be a role check: Owner and Employee+ received it with every row,
// plain Employees did not. That left a stolen owner session — which is what a
// phishing proxy or malware produces, with the second factor already passed —
// reading every number in the tenant in one query.
export type Redactable = { idDocumentNumber?: string | null };

export function redactForRole<T extends Redactable>(row: T, _role: string): T {
  // The role argument is kept so every call site still reads as a deliberate
  // redaction rather than a mystery, and so a future field that *is*
  // role-dependent has somewhere obvious to go.
  return { ...row, idDocumentNumber: null };
}

export function redactAllForRole<T extends Redactable>(rows: T[], role: string): T[] {
  return rows.map(r => redactForRole(r, role));
}
