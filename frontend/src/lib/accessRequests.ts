// The admin access-request query and its row type, shared by the queue and
// the sidebar count.
import { gql } from '@apollo/client';

export const ACCESS_REQUESTS = gql`
  query AccessRequests {
    accessRequests {
      id name slug status requestNote ownerName ownerEmail ownerEmailVerified
      formConfigured rejectionReason createdAt decidedAt
    }
  }
`;

export type AccessRequest = {
  id: string; name: string; slug: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestNote: string | null; ownerName: string | null; ownerEmail: string | null;
  ownerEmailVerified: boolean; formConfigured: boolean; rejectionReason: string | null;
  createdAt: string; decidedAt: string | null;
};
