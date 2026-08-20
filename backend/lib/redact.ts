// What each role is allowed to see of a submission.
//
// Reviewers (Owner, Employee+) decide on statements and need the document
// details to do it. A plain Employee can read decisions but not act on them, so
// there is no reason for a passport number to reach their screen — or their CSV
// export, which is the most likely route for this data to leave the system.
export type Redactable = { idDocumentNumber?: string | null };

export function redactForRole<T extends Redactable>(row: T, role: string): T {
  if (role !== 'EMPLOYEE') return row;
  return { ...row, idDocumentNumber: null };
}

export function redactAllForRole<T extends Redactable>(rows: T[], role: string): T[] {
  if (role !== 'EMPLOYEE') return rows;
  return rows.map(r => redactForRole(r, role));
}
