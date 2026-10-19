import 'dotenv/config';
// Whether this instance is reachable from the internet.
//
// NODE_ENV is a developer's convenience, and it was still "development" on an
// instance published to the internet through a tunnel. The deployment answers
// that question better than the environment name does: if the public URL is
// not a loopback address, the hardening is on regardless of NODE_ENV.
export function publiclyReachable(): boolean {
  const url = process.env.FRONTEND_URL;
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return !/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/i.test(hostname) && !hostname.endsWith('.local');
  } catch {
    return false;
  }
}

export const IS_PROD = process.env.NODE_ENV === 'production';
export const IS_EXPOSED = IS_PROD || publiclyReachable();
