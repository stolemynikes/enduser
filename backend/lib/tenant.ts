import { prisma } from './prisma.ts';

// Tenant-scoped access to submissions. Company resolvers must go through this
// instead of touching prisma.submission directly — the companyId filter is
// injected structurally, so a missed `where: { companyId }` can't happen.
//
// Unique-where operations (update/delete) can't carry a companyId filter in
// Prisma, so mutations verify ownership first and only then act by id.
export function tenantSubmissions(companyId: string) {
  return {
    findMany(args?: { orderBy?: any; include?: any; where?: any; take?: number; skip?: number }) {
      return prisma.submission.findMany({
        ...args,
        where: { ...(args?.where ?? {}), companyId },
      });
    },

    count(where?: any) {
      return prisma.submission.count({ where: { ...(where ?? {}), companyId } });
    },

    /** Returns the submission only if it belongs to this tenant; throws otherwise. */
    async getOwned(id: string) {
      const sub = await prisma.submission.findFirst({ where: { id, companyId } });
      if (!sub) throw new Error('Not found');
      return sub;
    },

    async update(id: string, data: any, include?: any) {
      await this.getOwned(id);
      return prisma.submission.update({ where: { id }, data, include });
    },

    async delete(id: string) {
      await this.getOwned(id);
      return prisma.submission.delete({ where: { id } });
    },
  };
}
