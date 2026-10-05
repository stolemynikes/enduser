// Fields a resolver must not hand back.
//
// This used to be a role check: Owner and Employee+ received the identity
// document number with every row, plain Employees did not. That left a stolen
// owner session — which is what a phishing proxy or malware produces, with the
// second factor already passed — reading every number in the tenant in one
// query.
//
// Since 2026-10-05 the number is stripped for everyone, by a field resolver on
// Submission in index.ts, so no resolver can forget. This file is the belt to
// that braces: resolvers that build their own row shapes still pass through
// here, which keeps the intent visible at the call site.
//
// The role argument is gone on purpose. Keeping a parameter that no longer
// decides anything reads, to the next person, like a role check that is
// present — and a guard somebody believes in is worse than no guard.
export type Redactable = { idDocumentNumber?: string | null };

export function stripSensitive<T extends Redactable>(row: T): T {
  return { ...row, idDocumentNumber: null };
}

export function stripSensitiveAll<T extends Redactable>(rows: T[]): T[] {
  return rows.map(stripSensitive);
}
