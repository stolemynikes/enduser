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

const authLink = setContext((_, { headers }) => {
  const token = tokenForPath(window.location.pathname);
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
    ['companyToken', 'companyRole', 'companyName', 'companySlug', 'supportMode']
      .forEach(k => localStorage.removeItem(k));
    window.location.assign('/login?expired=1');
  }
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
