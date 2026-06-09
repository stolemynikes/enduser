import { prisma } from './lib/prisma.ts';
import bcrypt from 'bcrypt';

const username = process.env.ADMIN_USERNAME ?? 'admin';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Set ADMIN_PASSWORD env var before seeding.');
  process.exit(1);
}

const existing = await prisma.admin.findUnique({ where: { username } });
if (existing) {
  console.log('Admin already exists, skipping.');
} else {
  const hashed = await bcrypt.hash(password, 12);
  await prisma.admin.create({ data: { username, password: hashed } });
  console.log(`Admin created — username: ${username}`);
}

await prisma.$disconnect();
