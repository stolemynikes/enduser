// Set an admin account's password.
//
// Admin passwords are bcrypt hashes, so a forgotten one cannot be recovered —
// only replaced. There is no self-service reset flow for admins (the account
// has no email attached), which makes this script the supported path.
//
// The password is read from the terminal with echo off and never taken as an
// argv value: arguments show up in `ps` and in shell history, which is how a
// reset ends up leaking the credential it just created.
//
// Run: npx tsx scripts/setAdminPassword.ts [username]     (defaults to "admin")
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.ts';

// Matches resolvers/company.ts, which hashes at 12. The existing admin rows are
// cost 10 from an earlier convention; rewriting one upgrades it.
const COST = 12;
const MIN_LENGTH = 12;

// A pipe is drained in one go, so every line arrives before the second prompt
// subscribes — listening per prompt silently drops all but the first. Read the
// whole of stdin once and hand out lines from the queue instead.
let pipedLines: string[] | null = null;

async function readPipedLine(): Promise<string> {
  if (pipedLines === null) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    pipedLines = Buffer.concat(chunks).toString('utf8').split('\n');
    if (pipedLines.at(-1) === '') pipedLines.pop();   // trailing newline
  }
  if (!pipedLines.length) throw new Error('stdin ended before a password was provided');
  return pipedLines.shift()!;
}

/** Prompt with echo suppressed. Falls back to a piped stdin when not a TTY. */
function prompt(question: string): Promise<string> {
  if (!process.stdin.isTTY) return readPipedLine();

  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let value = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        switch (ch) {
          case '\n': case '\r': case '':      // Enter / EOF
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.off('data', onData);
            process.stdout.write('\n');
            return resolve(value);
          case '':                            // Ctrl-C
            process.stdin.setRawMode(false);
            process.stdout.write('\n');
            return reject(new Error('cancelled'));
          case '': case '\b':                 // Backspace
            value = value.slice(0, -1);
            break;
          default:
            if (ch >= ' ') value += ch;
        }
      }
    };
    process.stdin.on('data', onData);
  });
}

/** Release the DB pool and any stdin reader so the process can actually exit. */
async function finish(code: number): Promise<never> {
  await prisma.$disconnect();
  process.exit(code);
}

const username = process.argv[2] ?? 'admin';

const admin = await prisma.admin.findUnique({ where: { username }, select: { id: true } });
if (!admin) {
  const all = await prisma.admin.findMany({ select: { username: true } });
  console.error(`No admin named "${username}". Existing: ${all.map(a => a.username).join(', ') || '(none)'}`);
  await finish(1);
}

const password = await prompt(`New password for "${username}" (hidden): `);
if (password.length < MIN_LENGTH) {
  console.error(`Too short — ${MIN_LENGTH} characters minimum, got ${password.length}.`);
  await finish(1);
}

const again = await prompt('Confirm: ');
if (again !== password) {
  console.error('The two entries did not match — nothing was changed.');
  await finish(1);
}

await prisma.admin.update({
  // finish() returns never, so this is only reached with a real row — the
  // compiler can't see that through the await.
  where: { id: admin!.id },
  data: { password: await bcrypt.hash(password, COST) },
});

console.log(`Password updated for "${username}". Existing tokens stay valid until they expire (8h).`);
await finish(0);
