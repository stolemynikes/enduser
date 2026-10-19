// The admin health page: how the checks and the outside services are doing.
//
// Aggregates only. Every figure is a count or a time — no company names, no
// buyer data, no override reasons (those are the seller's, and free text). The
// admin sees whether the platform works, not what anyone submitted.
import { prisma } from './prisma.ts';
import { SERVICES, type Service } from './ops.ts';
import { DIDIT_ENABLED } from '../services/didit.ts';
import { TRANSLATION_ENABLED } from '../services/translate.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Failures in a row before a service counts as down rather than degraded. */
const DOWN_STREAK = 3;

function configured(service: Service): boolean {
  if (service === 'didit') return DIDIT_ENABLED;
  if (service === 'translate') return TRANSLATION_ENABLED;
  if (service === 'mail') return !!process.env.SMTP_HOST;
  return true;
}

export async function adminHealth(rawDays: number) {
  // Bounded, so a caller cannot make one request count across all of history.
  const days = Math.min(365, Math.max(1, Math.floor(Number(rawDays) || 30)));
  const since = new Date(Date.now() - days * DAY_MS);
  const inWindow = { isTest: false, createdAt: { gte: since } };
  const events = (kind: string) => prisma.opsEvent.count({ where: { kind, createdAt: { gte: since } } });

  const [
    health, substance, vies, identity, overrides,
    started, submitted, purgedAfterSubmit, purgedAbandoned, purgedRefused, purgeFailed, gaveUp,
    stuckInReview, mail, untranslated,
  ] = await Promise.all([
    prisma.serviceHealth.findMany(),
    prisma.submission.groupBy({ by: ['substanceCheckStatus'], _count: { _all: true }, where: inWindow }),
    prisma.submission.groupBy({ by: ['viesStatus'], _count: { _all: true }, where: inWindow }),
    prisma.submission.groupBy({ by: ['idVerificationStatus'], _count: { _all: true }, where: inWindow }),
    prisma.submissionOverride.groupBy({
      by: ['category'], _count: { _all: true },
      where: { createdAt: { gte: since }, submission: { isTest: false } },
    }),
    events('didit-session-started'),
    prisma.submission.count({ where: { ...inWindow, idVerificationSessionId: { not: null } } }),
    prisma.submission.count({ where: { ...inWindow, idVerificationSessionId: { not: null }, idVerificationPurged: true } }),
    events('didit-purge-abandoned'),
    events('didit-purge-refused'),
    events('didit-purge-failed'),
    events('didit-purge-gaveup'),
    prisma.submission.count({
      where: {
        isTest: false, idVerificationStatus: 'IN_REVIEW', idVerificationPurged: false,
        createdAt: { lt: new Date(Date.now() - 7 * DAY_MS) },
      },
    }),
    prisma.opsEvent.groupBy({
      by: ['detail'], _count: { _all: true },
      where: { kind: 'mail-failed', createdAt: { gte: since } },
    }),
    prisma.submission.count({ where: { ...inWindow, statementLang: null } }),
  ]);

  const count = (groups: { _count: { _all: number } }[], pick: (g: any) => boolean) =>
    groups.filter(pick).reduce((n, g) => n + g._count._all, 0);
  const overridden = (category: string) => count(overrides, g => g.category === category);

  const services = SERVICES.map(service => {
    const row = health.find(h => h.service === service);
    const state = !configured(service) ? 'DISABLED'
      : !row ? 'UNKNOWN'
      : row.failStreak === 0 ? 'OK'
      : row.failStreak >= DOWN_STREAK ? 'DOWN'
      : 'DEGRADED';
    return {
      service,
      state,
      lastOkAt: row?.lastOkAt?.toISOString() ?? null,
      lastFailAt: row?.lastFailAt?.toISOString() ?? null,
      failStreak: row?.failStreak ?? 0,
    };
  });

  return {
    days,
    services,
    checks: [
      {
        kind: 'substance',
        ok: count(substance, g => g.substanceCheckStatus === 'OK'),
        flagged: count(substance, g => g.substanceCheckStatus === 'FLAGGED'),
        error: count(substance, g => g.substanceCheckStatus === 'ERROR'),
        open: count(substance, g => g.substanceCheckStatus === 'PENDING'),
        overridden: overridden('SUBSTANCE'),
      },
      {
        kind: 'vies',
        ok: count(vies, g => g.viesStatus === 'VALID'),
        flagged: count(vies, g => g.viesStatus === 'INVALID'),
        error: count(vies, g => g.viesStatus === 'ERROR'),
        open: 0,
        overridden: overridden('VIES'),
      },
      {
        kind: 'identity',
        ok: count(identity, g => g.idVerificationStatus === 'APPROVED'),
        flagged: count(identity, g => g.idVerificationStatus === 'DECLINED' || g.idVerificationStatus === 'EXPIRED'),
        error: count(identity, g => g.idVerificationStatus === 'ERROR'),
        open: count(identity, g => g.idVerificationStatus === 'IN_REVIEW' || g.idVerificationStatus === 'PENDING'),
        overridden: overridden('IDENTITY'),
      },
    ],
    didit: { started, submitted, purgedAfterSubmit, purgedAbandoned, purgedRefused, purgeFailed, gaveUp, stuckInReview },
    mailFailures: mail
      .map(g => ({ kind: g.detail ?? 'unknown', count: g._count._all }))
      .sort((a, b) => b.count - a.count),
    untranslated,
    translationEnabled: TRANSLATION_ENABLED,
  };
}
