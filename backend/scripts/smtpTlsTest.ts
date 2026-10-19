// Mail is never sent in the clear.
//
// Pentest finding (19 October 2026): the transport took STARTTLS only when the
// relay offered it, so anyone able to strip that offer read the relay login and
// every reset link. This stands up a relay that offers no STARTTLS — what a
// stripped connection looks like — and checks the send fails before the login
// or the message is handed over.
//
// Run: npx tsx scripts/smtpTlsTest.ts   (no database needed)
import net from 'node:net';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const seen: string[] = [];
const relay = net.createServer(socket => {
  socket.write('220 plain.test ESMTP\r\n');
  socket.on('data', buf => {
    for (const line of buf.toString().split('\r\n').filter(Boolean)) {
      seen.push(line);
      const verb = line.split(' ')[0].toUpperCase();
      // No STARTTLS in the list, but AUTH is offered: the bait.
      if (verb === 'EHLO') socket.write('250-plain.test\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (verb === 'QUIT') { socket.write('221 bye\r\n'); socket.end(); }
      else socket.write('250 ok\r\n');
    }
  });
});
await new Promise<void>(r => relay.listen(0, '127.0.0.1', () => r()));
const { port } = relay.address() as net.AddressInfo;

process.env.MAIL_PREVIEW = '0';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = String(port);
process.env.SMTP_USER = 'relay-user';
process.env.SMTP_PASS = 'relay-secret';
const { sendPasswordReset } = await import('../services/email.ts');

let error: unknown = null;
try {
  await sendPasswordReset('buyer@test.local', 'Buyer', 'https://example.test/reset/secret-token');
} catch (err) { error = err; }

check('a relay without STARTTLS refuses the send', error != null, 'the message was accepted in the clear');
check('the relay login was never sent', !seen.some(l => /^AUTH/i.test(l)), seen.join(' | '));
check('the message was never sent', !seen.some(l => /^(MAIL|DATA)/i.test(l)), seen.join(' | '));

relay.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
