import jwt from 'jsonwebtoken';

const SECRET = process.env.COMPANY_JWT_SECRET!;

export type CompanyTokenPayload = {
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
    return jwt.verify(token, SECRET) as CompanyTokenPayload;
  } catch {
    return null;
  }
}
