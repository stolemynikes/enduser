// Whether the anti-robot check is switched on for this deployment.
//
// Lives apart from the widget so the component file exports only a component,
// which is what Fast Refresh needs to reload it cleanly.
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

export const PUBLIC_CONFIG = gql`query PublicConfig { publicConfig { turnstileSiteKey } }`;

/** True when the server requires a token and the form does not have one yet. */
export function useTurnstileRequired(token: string): boolean {
  const { data } = useQuery<any>(PUBLIC_CONFIG);
  const siteKey: string | null = data?.publicConfig?.turnstileSiteKey ?? null;
  return !!siteKey && !token;
}
