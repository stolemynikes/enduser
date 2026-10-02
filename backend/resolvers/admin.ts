import { prisma } from '../lib/prisma.ts';
import { signCompanyToken } from '../services/companyAuth.ts';
import { checkVies, matchViesAddress } from '../services/vies.ts';
import { checkSubstanceUse } from '../services/substanceCheck.ts';
import { runSubstanceCheck } from './submission.ts';

type Ctx = { admin?: boolean; adminId?: string };
type BuyerType = 'INDIVIDUAL' | 'COMPANY';

function requireAdmin(ctx: Ctx) {
  if (!ctx.admin || !ctx.adminId) throw new Error('Unauthorized');
  return ctx.adminId;
}

// Monday 00:00 of the week containing d (local time).
function weekStart(d: Date) {
  const w = new Date(d);
  w.setHours(0, 0, 0, 0);
  w.setDate(w.getDate() - ((w.getDay() + 6) % 7));
  return w;
}

export const adminResolvers = {
  Query: {
    adminCompanies: async (_: unknown, __: unknown, ctx: Ctx) => {
      requireAdmin(ctx);
      const companies = await prisma.company.findMany({
        include: { _count: { select: { members: true, submissions: { where: { isTest: false } } } } },
        orderBy: { createdAt: 'desc' },
        // The query-cost rule charges this field 100 rows; serve no more than
        // it is charged for, so the budget and the resolver agree.
        take: 200,
      });
      const perCompany = await prisma.submission.groupBy({
        by: ['companyId'],
        _count: { _all: true },
        _max: { createdAt: true },
        where: { companyId: { not: null }, isTest: false },
      });
      const pending = await prisma.submission.groupBy({
        by: ['companyId'],
        _count: { _all: true },
        where: { companyId: { not: null }, status: 'PENDING_REVIEW', isTest: false },
      });
      const lastBy = new Map(perCompany.map(g => [g.companyId, g._max.createdAt]));
      const pendingBy = new Map(pending.map(g => [g.companyId, g._count._all]));
      return companies.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        membersCount: c._count.members,
        submissionsCount: c._count.submissions,
        pendingCount: pendingBy.get(c.id) ?? 0,
        configured: c.formConfig != null,
        lastSubmissionAt: lastBy.get(c.id)?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      }));
    },

    /**
     * Platform statistics. Everything here is either an aggregate the database
     * computes, or a bounded window of rows — it used to pull every submission
     * and every company into memory to count them, which is a self-inflicted
     * outage the day the platform succeeds.
     */
    adminInsights: async (_: unknown, __: unknown, ctx: Ctx) => {
      requireAdmin(ctx);
      // The chart covers 12 weeks, so only 12 weeks of rows are read.
      const chartFrom = weekStart(new Date());
      chartFrom.setDate(chartFrom.getDate() - 11 * 7);
      const [byStatus, byVies, totalCompanies, mrzInvalid, likelySynthetic, reviewed, totalSubmissions, subDates, companyDates] =
        await Promise.all([
          prisma.submission.groupBy({ by: ['status'], _count: { _all: true }, where: { isTest: false } }),
          prisma.submission.groupBy({ by: ['viesStatus'], _count: { _all: true }, where: { isTest: false } }),
          prisma.company.count(),
          // Identity counters span both pipelines: idMrzValid/idLikelySynthetic
          // are only set on rows from the old in-house OCR, the verification
          // fields only on Didit-verified rows.
          prisma.submission.count({
            where: { isTest: false, OR: [{ idMrzValid: false }, { idVerificationStatus: 'DECLINED' }] },
          }),
          prisma.submission.count({
            where: {
              isTest: false,
              OR: [{ idLikelySynthetic: true }, { idLivenessPassed: false }, { idFaceMatch: false }],
            },
          }),
          // Average time to review, over the most recent decisions rather than
          // all of them. The figure is indistinguishable; the memory is not.
          prisma.submission.findMany({
            where: { status: { in: ['APPROVED', 'DENIED'] }, isTest: false },
            select: { createdAt: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 2000,
          }),
          prisma.submission.count({ where: { isTest: false } }),
          prisma.submission.findMany({
            where: { isTest: false, createdAt: { gte: chartFrom } },
            select: { createdAt: true },
          }),
          prisma.company.findMany({
            where: { createdAt: { gte: chartFrom } },
            select: { createdAt: true },
          }),
        ]);

      const statusCount = (s: string) => byStatus.find(g => g.status === s)?._count._all ?? 0;
      const viesCount = (s: string) => byVies.find(g => g.viesStatus === s)?._count._all ?? 0;

      // updatedAt is the review touch — close enough for a time-to-review average.
      const avgReviewHours = reviewed.length
        ? reviewed.reduce((sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()), 0) / reviewed.length / 3_600_000
        : null;

      // Last 12 ISO weeks, oldest first.
      const weeks: { start: Date; submissions: number; companies: number }[] = [];
      const thisWeek = weekStart(new Date());
      for (let i = 11; i >= 0; i--) {
        const start = new Date(thisWeek);
        start.setDate(start.getDate() - i * 7);
        weeks.push({ start, submissions: 0, companies: 0 });
      }
      const bump = (dates: { createdAt: Date }[], key: 'submissions' | 'companies') => {
        for (const { createdAt } of dates) {
          const ws = weekStart(createdAt).getTime();
          const w = weeks.find(x => x.start.getTime() === ws);
          if (w) w[key]++;
        }
      };
      bump(subDates, 'submissions');
      bump(companyDates, 'companies');

      return {
        totalCompanies,
        totalSubmissions,
        pendingReview: statusCount('PENDING_REVIEW'),
        approved: statusCount('APPROVED'),
        denied: statusCount('DENIED'),
        avgReviewHours,
        viesInvalid: viesCount('INVALID'),
        viesError: viesCount('ERROR'),
        mrzInvalid,
        likelySynthetic,
        weekly: weeks.map(w => ({
          weekStart: w.start.toISOString().slice(0, 10),
          submissions: w.submissions,
          companies: w.companies,
        })),
      };
    },

    // Test tools — run an individual check with arbitrary input. No rows, no emails.
    testVies: async (
      _: unknown,
      { vat, street, zipCode, place }:
        { vat: string; street?: string; zipCode?: string; place?: string },
      ctx: Ctx,
    ) => {
      requireAdmin(ctx);
      if (typeof vat !== 'string' || vat.length > 50) throw new Error('VAT number is too long.');
      const countryCode = vat.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
      const lookup = await checkVies(countryCode, vat);
      const hasAddress = !!(street?.trim() || zipCode?.trim() || place?.trim());
      const addressMatch =
        lookup.status === 'VALID' && hasAddress
          ? matchViesAddress({ street, zipCode, place }, lookup.address)
          : 'NOT_CHECKED';
      return { status: lookup.status, name: lookup.name, address: lookup.address, addressMatch };
    },

    testSubstanceCheck: async (
      _: unknown,
      { substances, casNumbers, concentration, statement, buyerType }:
        { substances: string; casNumbers: string; concentration?: string; statement: string; buyerType: BuyerType },
      ctx: Ctx,
    ) => {
      requireAdmin(ctx);
      // Mirrors the public form's caps: the test tool reaches the same outbound
      // services, so it gets the same bounds.
      const cap = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
      return checkSubstanceUse({
        substances: cap(substances, 255),
        casNumbers: cap(casNumbers, 255),
        concentration: cap(concentration, 100),
        statement: cap(statement, 2000),
        buyerType,
      });
    },
  },

  Mutation: {
    // Issues a company OWNER token for the target company so the admin sees
    // exactly the owner's dashboard. The token carries support/adminId claims
    // and the session is recorded in SupportAccess.
    adminSupportLogin: async (_: unknown, { companyId }: { companyId: string }, ctx: Ctx) => {
      const adminId = requireAdmin(ctx);
      const owner = await prisma.companyMember.findFirst({
        where: { companyId, role: 'OWNER' },
        include: { company: true },
      });
      if (!owner) throw new Error('Company or owner not found');

      await prisma.supportAccess.create({ data: { adminId, companyId } });
      console.log(`[support] admin ${adminId} opened support session for company ${owner.company.slug} (${companyId})`);

      const token = signCompanyToken({
        companyUserId: owner.userId,
        companyId,
        role: 'OWNER',
        support: true,
        adminId,
      });
      return {
        token,
        company: { id: owner.company.id, name: owner.company.name, slug: owner.company.slug },
        role: 'OWNER',
      };
    },

    // Creates a real submission row flagged isTest, mirroring the live pipeline
    // (VIES when a VAT is present, background substance check) but sending NO
    // emails. Marked + excluded from analytics so it never pollutes real data.
    createTestSubmission: async (_: unknown, { input }: { input: Record<string, string> }, ctx: Ctx) => {
      requireAdmin(ctx);
      const buyerType: BuyerType = input.buyerType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'COMPANY';
      const isCompany = buyerType === 'COMPANY';

      let companyId: string | undefined;
      if (input.companySlug) {
        const co = await prisma.company.findUnique({ where: { slug: input.companySlug } });
        if (co) companyId = co.id;
      }

      const companyName = isCompany ? (input.companyName?.trim() || 'Test Company BV') : '';
      const vatNumber = isCompany ? (input.vatNumber?.trim() || '') : '';

      const street = input.street?.trim() || '';
      const zipCode = input.zipCode?.trim() || '';
      const place = input.place?.trim() || '';

      let viesStatus: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED' = 'NOT_CHECKED';
      let viesName: string | null = null;
      let viesAddress: string | null = null;
      let viesAddressMatch: 'NOT_CHECKED' | 'UNAVAILABLE' | 'MATCH' | 'PARTIAL' | 'MISMATCH' = 'NOT_CHECKED';
      if (vatNumber) {
        const cc = vatNumber.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
        const lookup = await checkVies(cc, vatNumber);
        viesStatus = lookup.status;
        if (viesStatus === 'VALID' && isCompany) {
          viesName = lookup.name;
          viesAddress = lookup.address;
          if (street || zipCode || place) {
            viesAddressMatch = matchViesAddress({ street, zipCode, place }, viesAddress);
          }
        }
      }

      const substances = input.substances?.trim() || 'Acetone';
      const casNumbers = input.casNumbers?.trim() || '';
      const statement = input.statement?.trim() || 'Test submission — laboratory use.';
      const willCheckSubstance = !!substances && !!casNumbers;

      // Simulated identity outcome. Nothing here talks to Didit — these are the
      // fields a real decision would have written, so the dashboard renders
      // exactly as it does for a genuine verification. No session id is set: a
      // fake one could collide with the webhook's lookup by session id.
      const ID_STATUSES = ['NOT_CHECKED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'DECLINED', 'EXPIRED', 'ERROR'] as const;
      type IdStatus = (typeof ID_STATUSES)[number];
      const idStatus = (ID_STATUSES as readonly string[]).includes(input.idVerificationStatus as string)
        ? (input.idVerificationStatus as IdStatus)
        : 'NOT_CHECKED';
      const idChecked = idStatus !== 'NOT_CHECKED';

      const rawExpiry = (input.idDocumentExpiry as string | undefined)?.trim();
      const idExpiry = rawExpiry && /^\d{4}-\d{2}-\d{2}$/.test(rawExpiry) && !Number.isNaN(Date.parse(rawExpiry))
        ? new Date(rawExpiry)
        : null;
      const idDocType = input.idDocumentType === 'PASSPORT' || input.idDocumentType === 'ID_CARD'
        ? input.idDocumentType
        : null;

      const submission = await prisma.submission.create({
        data: {
          email: input.email?.trim() || 'test@example.com',
          orderNumber: 'TEST',
          firstName: input.firstName?.trim() || 'Test',
          lastName: input.lastName?.trim() || 'User',
          street, zipCode, place,
          country: input.country?.trim() || 'Netherlands',
          companyName, vatNumber, buyerType,
          substances, casNumbers, statement,
          concentration: input.concentration?.trim() || null,
          viesStatus, viesName, viesAddress, viesAddressMatch,
          substanceCheckStatus: willCheckSubstance ? 'PENDING' : 'NOT_CHECKED',
          idVerificationStatus: idStatus,
          // The approval gate treats a null idDataCollectedAt as "this form did
          // not ask for ID", and skips the identity category entirely. Without
          // this a simulated DECLINED or expired document stayed approvable —
          // exactly the state the test submission exists to rehearse.
          idDataCollectedAt: idChecked ? new Date() : null,
          idVerificationCheckedAt: idChecked ? new Date() : null,
          idDocumentName: idChecked ? (input.idDocumentName as string)?.trim() || 'TEST USER' : null,
          idDocumentType: idDocType,
          idDocumentNumber: idChecked ? (input.idDocumentNumber as string)?.trim() || null : null,
          idDocumentExpiry: idExpiry,
          idLivenessPassed: idChecked ? (input.idLivenessPassed as unknown as boolean | null) ?? null : null,
          idFaceMatch: idChecked ? (input.idFaceMatch as unknown as boolean | null) ?? null : null,
          idVerificationWarnings: idChecked ? (input.idVerificationWarnings as string)?.trim() || null : null,
          idVerificationPurged: idChecked ? (input.idVerificationPurged as unknown as boolean) === true : false,
          status: 'PENDING_REVIEW',
          isTest: true,
          ...(companyId ? { companyId } : {}),
        },
        include: { overrides: true },
      });

      if (willCheckSubstance) void runSubstanceCheck(submission.id);
      return submission;
    },

    deleteTestSubmissions: async (_: unknown, __: unknown, ctx: Ctx) => {
      requireAdmin(ctx);
      const { count } = await prisma.submission.deleteMany({ where: { isTest: true } });
      return count;
    },
  },
};
