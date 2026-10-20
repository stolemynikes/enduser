import { ApolloClient, CombinedGraphQLErrors, InMemoryCache, HttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = new HttpLink({ uri: '/graphql' });

// Only the two authenticated areas of the app send a token. Everything else —
// the public form, the embed, register/login/invite — is anonymous, and used to
// attach whichever token happened to be in localStorage to requests that never
// needed one.
function tokenForPath(path: string): string | null {
  if (path.startsWith('/admin')) return localStorage.getItem('adminToken');
  if (path.startsWith('/company')) return localStorage.getItem('companyToken');
  return null;
}

/**
 * Who a token is for — the account and, for a seller, the company — read from
 * its payload. Not verified here (the server does that); only compared.
 */
function identityOf(token: string | null): string {
  if (!token) return '';
  try {
    const raw = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(raw)) as { adminId?: string; companyUserId?: string; companyId?: string; support?: boolean };
    return p.adminId && !p.companyId ? `admin:${p.adminId}` : `company:${p.companyUserId}:${p.companyId}:${p.support ? 's' : ''}`;
  } catch {
    return 'unknown';
  }
}

// The cache holds what the last account was allowed to read. When the account
// behind the requests changes — signing out and in as someone else, switching
// company, entering or leaving a support session — it is emptied first, so
// nothing one account fetched is shown to the next. A renewed token for the
// same account keeps it.
//
// Every place that changes the account calls newIdentity() before it
// navigates, so a page that reads the cache first never sees the previous
// account's data. The check in authLink below is the backstop for a path that
// forgot: it only runs once a request goes out.
let lastIdentity: string | null = null;

export function newIdentity(): void {
  lastIdentity = null;
  void client.clearStore();
}

const authLink = setContext((_, { headers }) => {
  // A request may name its token itself (accepting an invitation as the
  // account already signed in); otherwise the path decides.
  const named = headers?.authorization as string | undefined;
  const token = named ? named.replace(/^Bearer /, '') : tokenForPath(window.location.pathname);
  const identity = identityOf(token);
  if (lastIdentity !== null && identity !== lastIdentity) client.cache.reset();
  lastIdentity = identity;
  if (named) return { headers };
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : '' } };
});

// A token expires (admin 8h, company 30d) and every query starts answering
// "Unauthorized". Without this the dashboard just filled with error toasts and
// the only way out was clearing storage by hand.
const AUTH_FAILURES = new Set(['Unauthorized', 'Membership not found']);

const errorLink = onError(({ error }) => {
  // Apollo Client 4 hands the handler one error; GraphQL errors arrive wrapped.
  const messages = CombinedGraphQLErrors.is(error)
    ? error.errors.map(e => e.message)
    : [error?.message ?? ''];
  if (!messages.some(m => AUTH_FAILURES.has(m))) return;
  const path = window.location.pathname;
  if (path.startsWith('/admin')) {
    localStorage.removeItem('adminToken');
    if (path !== '/admin') window.location.assign('/admin?expired=1');
    return;
  }
  if (path.startsWith('/company')) {
    // An ended support session returns staff to their own dashboard, where the
    // admin token is still valid, rather than to the company sign-in page.
    const wasSupport = localStorage.getItem('supportMode') === '1';
    ['companyToken', 'companyRole', 'companyName', 'companySlug', 'supportMode']
      .forEach(k => localStorage.removeItem(k));
    window.location.assign(wasSupport ? '/admin/dashboard' : '/login?expired=1');
  }
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
