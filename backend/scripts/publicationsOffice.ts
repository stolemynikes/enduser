// Fetches an act from the EU Publications Office over HTTPS, all the way.
//
// The service redirects even an https:// request to an http:// address, and a
// plain `redirect: 'follow'` takes that downgrade silently. The text fetched
// here becomes vendored compliance data, so a network attacker able to rewrite
// it in transit could change what the check calls a listed substance. Every
// hop is therefore followed by hand, upgraded to https, and held to the one
// host that serves these documents.
const HOST = 'publications.europa.eu';
const MAX_HOPS = 5;

export async function fetchAct(url: string, language: string): Promise<Response> {
  let next = new URL(url);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    next.protocol = 'https:';
    if (next.hostname !== HOST) throw new Error(`refusing redirect to ${next.hostname}`);
    const res = await fetch(next, {
      headers: { Accept: 'application/xhtml+xml', 'Accept-Language': language },
      signal: AbortSignal.timeout(60_000),
      redirect: 'manual',
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      next = new URL(location, next);
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
}
