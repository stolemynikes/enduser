// Passkeys: the second factor a phishing proxy cannot relay.
//
// A one-time code is six digits that know nothing about where they were typed,
// so a proxy showing the real sign-in page can pass them straight through. A
// passkey signs a challenge *for a named origin*. Put a look-alike domain in
// front of it and the browser refuses to sign at all — not because the person
// noticed, but because the credential is bound to the real hostname. That is
// the whole reason this exists next to TOTP rather than replacing it: TOTP is
// the fallback for a device with no authenticator, this is the one that closes
// the hole.
//
// Verification is done by @simplewebauthn/server rather than by hand. This is
// the opposite call from lib/totp.ts and for the same reason: TOTP is thirty
// lines of HMAC with published test vectors, and WebAuthn is CBOR decoding,
// COSE key parsing and signature verification across several algorithms. The
// first is safer written out; the second is safer delegated.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { prisma } from './prisma.ts';

export type AccountKind = 'companyUser' | 'admin';

const RP_NAME = 'eustatement';

/**
 * Which hostname credentials are bound to.
 *
 * This is the entire security property, so it is derived from the deployment
 * rather than guessed: a credential enrolled against one hostname is useless at
 * another, which is what defeats a look-alike domain — and also what means
 * anything enrolled against a temporary tunnel address dies with the tunnel.
 * `localhost` is allowed by the spec without TLS, so development works.
 */
export function rpId(): string {
  if (process.env.RP_ID) return process.env.RP_ID;
  const url = process.env.FRONTEND_URL;
  if (url) {
    try { return new URL(url).hostname; } catch { /* fall through */ }
  }
  return 'localhost';
}

/** The origins a signature may claim. Must match what the browser actually sends. */
function expectedOrigins(): string[] {
  const host = rpId();
  if (host === 'localhost') {
    // Vite's dev server and the ports it falls back to.
    return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
  }
  // The bare domain and its www form both carry credentials for the same
  // relying party; the browser reports whichever address the page was on.
  return host.startsWith('www.') ? [`https://${host}`] : [`https://${host}`, `https://www.${host}`];
}

// --- The challenge ticket ----------------------------------------------------
//
// A challenge has to be remembered between the two halves of a ceremony. Rather
// than a table and a cleanup job, it travels as a short-lived signed ticket.
// The `purpose` claim is load-bearing: without it a ticket signed with the same
// key could be presented as a session token.

type TicketPurpose = 'passkey-register' | 'passkey-login';

type Ticket = {
  purpose: TicketPurpose;
  kind: AccountKind;
  accountId: string;
  challenge: string;
  /**
   * What a passkey signature is for: 'login', 'step-up', or 'reveal:<id>'.
   * Checked by whoever finishes the ceremony, so a signature made to sign in
   * cannot be spent on a reveal, nor one reveal's on another submission.
   */
  scope?: string;
};

// Tickets are spent once. A synced passkey reports a signature counter of 0,
// so the library's replay check never fires for it, and one assertion could be
// submitted again and again within the ticket's two minutes. One instance
// (see the Dockerfile), so memory is enough.
const spentTickets = new Map<string, number>();
function spendTicket(jti: string | undefined, exp: number | undefined): boolean {
  if (!jti) return false;
  const now = Date.now();
  for (const [k, e] of spentTickets) if (e < now) spentTickets.delete(k);
  if (spentTickets.has(jti)) return false;
  spentTickets.set(jti, (exp ?? 0) * 1000);
  return true;
}

const TICKET_TTL_SECONDS = 120;

function issueTicket(t: Ticket): string {
  // An audience of its own, so a ticket can never be read as a session token
  // signed with the same secret (verifyCompanyToken refuses any audience).
  return jwt.sign(t, process.env.COMPANY_JWT_SECRET!, {
    expiresIn: TICKET_TTL_SECONDS,
    algorithm: 'HS256',
    audience: 'passkey-ticket',
    jwtid: crypto.randomUUID(),
  });
}

function readTicket(token: string, purpose: TicketPurpose): Ticket | null {
  try {
    const claims = jwt.verify(token, process.env.COMPANY_JWT_SECRET!, {
      algorithms: ['HS256'], audience: 'passkey-ticket',
    }) as Ticket & { jti?: string; exp?: number };
    // A ticket for one ceremony must never be accepted for the other, and
    // neither may stand in for a session.
    if (claims.purpose !== purpose) return null;
    return spendTicket(claims.jti, claims.exp) ? claims : null;
  } catch {
    return null;
  }
}

// --- Registration -----------------------------------------------------------

function owner(kind: AccountKind, id: string) {
  return kind === 'admin' ? { adminId: id } : { userId: id };
}

export async function listPasskeys(kind: AccountKind, id: string) {
  const rows = await prisma.passkey.findMany({
    where: owner(kind, id),
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  });
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
  }));
}

export async function countPasskeys(kind: AccountKind, id: string): Promise<number> {
  return prisma.passkey.count({ where: owner(kind, id) });
}

export async function startRegistration(
  kind: AccountKind, id: string, accountName: string,
): Promise<{ optionsJson: string; ticket: string }> {
  const existing = await prisma.passkey.findMany({
    where: owner(kind, id),
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId(),
    userName: accountName,
    // A stable, non-identifying handle. The account id, not the email: this is
    // stored by the authenticator and sometimes shown, and an address there is
    // more than the credential needs to know.
    userID: Buffer.from(id, 'utf8'),
    attestationType: 'none',
    // Offering what is already enrolled stops the same device registering twice
    // and silently shadowing its own earlier credential.
    excludeCredentials: existing.map(c => ({
      id: c.credentialId,
      transports: c.transports ? (c.transports.split(',') as any) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  return {
    optionsJson: JSON.stringify(options),
    ticket: issueTicket({ purpose: 'passkey-register', kind, accountId: id, challenge: options.challenge }),
  };
}

export type RegistrationOutcome =
  | { ok: true; passkeyId: string }
  | { ok: false; reason: 'bad-ticket' | 'rejected' | 'duplicate' };

export async function finishRegistration({
  kind, id, ticket, responseJson, name,
}: {
  kind: AccountKind;
  id: string;
  ticket: string;
  responseJson: string;
  name: string;
}): Promise<RegistrationOutcome> {
  const claims = readTicket(ticket, 'passkey-register');
  // The ticket says who started the ceremony; the session says who is
  // finishing it. They have to be the same person.
  if (!claims || claims.kind !== kind || claims.accountId !== id) {
    return { ok: false, reason: 'bad-ticket' };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: JSON.parse(responseJson),
      expectedChallenge: claims.challenge,
      expectedOrigin: expectedOrigins(),
      expectedRPID: rpId(),
      requireUserVerification: false,
    });
  } catch (err: any) {
    console.warn(`[passkey] registration rejected: ${err?.message ?? 'unknown error'}`);
    return { ok: false, reason: 'rejected' };
  }

  const info = verification.registrationInfo;
  if (!verification.verified || !info) return { ok: false, reason: 'rejected' };

  const credentialId = info.credential.id;
  if (await prisma.passkey.findUnique({ where: { credentialId }, select: { id: true } })) {
    return { ok: false, reason: 'duplicate' };
  }

  const created = await prisma.passkey.create({
    data: {
      ...owner(kind, id),
      credentialId,
      publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
      counter: info.credential.counter,
      transports: info.credential.transports?.join(',') ?? null,
      name: name.trim().slice(0, 60) || 'Passkey',
    },
    select: { id: true },
  });
  return { ok: true, passkeyId: created.id };
}

export async function removePasskey(kind: AccountKind, id: string, passkeyId: string): Promise<boolean> {
  const { count } = await prisma.passkey.deleteMany({
    where: { id: passkeyId, ...owner(kind, id) },
  });
  return count === 1;
}

// --- Authentication ---------------------------------------------------------

export async function startAuthentication(
  kind: AccountKind, id: string, scope: string = 'login',
): Promise<{ optionsJson: string; ticket: string } | null> {
  const credentials = await prisma.passkey.findMany({
    where: owner(kind, id),
    select: { credentialId: true, transports: true },
  });
  if (credentials.length === 0) return null;

  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: 'preferred',
    allowCredentials: credentials.map(c => ({
      id: c.credentialId,
      transports: c.transports ? (c.transports.split(',') as any) : undefined,
    })),
  });

  return {
    optionsJson: JSON.stringify(options),
    ticket: issueTicket({ purpose: 'passkey-login', kind, accountId: id, challenge: options.challenge, scope }),
  };
}

export type AuthOutcome =
  | { ok: true; kind: AccountKind; accountId: string; passkeyName: string }
  | { ok: false; reason: 'bad-ticket' | 'unknown-credential' | 'rejected' };

/**
 * Verifies an assertion against the ticket that asked for it.
 *
 * The ticket carries the account, so the caller learns *who* signed in from
 * here rather than having to be told by the client — which is what stops a
 * valid assertion for one account being presented as a sign-in for another.
 */
export async function finishAuthentication({
  ticket, responseJson, scope = 'login',
}: { ticket: string; responseJson: string; scope?: string }): Promise<AuthOutcome> {
  const claims = readTicket(ticket, 'passkey-login');
  // The signature must have been asked for this purpose (see Ticket.scope).
  if (!claims || (claims.scope ?? 'login') !== scope) return { ok: false, reason: 'bad-ticket' };

  let parsed: { id?: string };
  try { parsed = JSON.parse(responseJson); } catch { return { ok: false, reason: 'rejected' }; }

  const credential = await prisma.passkey.findFirst({
    where: { credentialId: String(parsed.id ?? ''), ...owner(claims.kind, claims.accountId) },
  });
  if (!credential) return { ok: false, reason: 'unknown-credential' };

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: JSON.parse(responseJson),
      expectedChallenge: claims.challenge,
      expectedOrigin: expectedOrigins(),
      expectedRPID: rpId(),
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64url')),
        counter: credential.counter,
        transports: credential.transports ? (credential.transports.split(',') as any) : undefined,
      },
      requireUserVerification: false,
    });
  } catch (err: any) {
    console.warn(`[passkey] assertion rejected: ${err?.message ?? 'unknown error'}`);
    return { ok: false, reason: 'rejected' };
  }

  if (!verification.verified) return { ok: false, reason: 'rejected' };

  await prisma.passkey.update({
    where: { id: credential.id },
    data: {
      // Authenticators that keep a counter expect it to advance; storing it is
      // what makes a cloned device detectable at all.
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  return {
    ok: true,
    kind: claims.kind,
    accountId: claims.accountId,
    passkeyName: credential.name,
  };
}
