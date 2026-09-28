import jwt from 'jsonwebtoken';

const SECRET = process.env.COMPANY_JWT_SECRET!;

export type CompanyTokenPayload = {
  /** Issued-at, present on verified tokens; used to refuse pre-reset sessions. */
  iat?: number;
  companyUserId: string;
  companyId: string;
  role: string;
  // Set on tokens issued via adminSupportLogin so support sessions are
  // distinguishable and every operation can be audit-logged.
  support?: boolean;
  adminId?: string;
};

export function signCompanyToken(payload: CompanyTokenPayload): string {
  // Support sessions are privileged admin access into a tenant — keep them short.
  return jwt.sign(payload, SECRET, { expiresIn: payload.support ? '2h' : '30d' });
}

export function verifyCompanyToken(token: string): CompanyTokenPayload | null {
  try {
    // Pin the algorithm rather than letting the library infer it from the key.
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as CompanyTokenPayload;
  } catch {
    return null;
  }
}
