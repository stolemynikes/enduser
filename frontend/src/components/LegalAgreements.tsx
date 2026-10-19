// The company's agreement to the Terms, the DPA and the Privacy Policy.
//
// The banner appears for the owner when the published version is newer than
// the one the company accepted, and stays until it is accepted: the reason it
// is there stays true until then. The panel in Account shows the history and
// downloads the record of it.
import { gql } from '@apollo/client';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';

const COMPANY_LEGAL = gql`
  query CompanyLegal {
    companyLegal { currentVersion acceptedVersion needsAcceptance history { version acceptedAt acceptedBy } }
  }
`;
const ACCEPT_LEGAL = gql`
  mutation AcceptLegal($version: String!) {
    acceptLegal(version: $version) { currentVersion acceptedVersion needsAcceptance history { version acceptedAt acceptedBy } }
  }
`;
const RECORD = gql`query LegalAcceptanceRecord { legalAcceptanceRecord }`;

type Legal = {
  currentVersion: string; acceptedVersion: string | null; needsAcceptance: boolean;
  history: { version: string; acceptedAt: string; acceptedBy: string }[];
};

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function useLegal(skip: boolean) {
  return useQuery<{ companyLegal: Legal }>(COMPANY_LEGAL, { skip });
}

export function LegalBanner({ isOwner, support }: { isOwner: boolean; support: boolean }) {
  const { data } = useLegal(!isOwner || support);
  const [accept, { loading, error }] = useMutation<{ acceptLegal: Legal }>(ACCEPT_LEGAL, {
    refetchQueries: [{ query: COMPANY_LEGAL }],
  });
  const legal = data?.companyLegal;
  if (!isOwner || support || !legal?.needsAcceptance) return null;
  return (
    <div className="cd-banner cd-banner--info" role="status">
      <span>
        <b>{legal.acceptedVersion ? 'Our Terms and Data Processing Agreement changed' : 'Please accept our Terms and Data Processing Agreement'}</b>{' '}
        — version of {dateLabel(legal.currentVersion)}. Read the{' '}
        <Link to="/terms" target="_blank">Terms</Link>, the <Link to="/dpa" target="_blank">DPA</Link> and the{' '}
        <Link to="/privacy" target="_blank">Privacy Policy</Link>, then accept them for this company.
        {error && <> <b role="alert">{error.message}</b></>}
      </span>
      <span className="cd-banner-actions">
        <button className="cd-banner-btn" disabled={loading}
          onClick={() => accept({ variables: { version: legal.currentVersion } }).catch(() => {})}>
          {loading ? 'Recording…' : 'Accept for this company'}
        </button>
      </span>
    </div>
  );
}

export function LegalAgreementsPanel() {
  const { data } = useLegal(false);
  const [fetchRecord, { loading }] = useLazyQuery<{ legalAcceptanceRecord: string }>(RECORD, { fetchPolicy: 'no-cache' });
  const legal = data?.companyLegal;
  if (!legal) return null;

  const download = async () => {
    const { data: rec } = await fetchRecord();
    if (!rec?.legalAcceptanceRecord) return;
    const bin = atob(rec.legalAcceptanceRecord);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'eustatement-acceptance-record.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const latest = legal.history[0];
  return (
    <div className="cd-embed">
      <div className="cd-formcfg-info">
        <span className="cd-formcfg-label">Agreements</span>
        <span className="cd-formcfg-desc">
          {latest
            ? <>Terms, DPA and Privacy Policy of {dateLabel(latest.version)}, accepted on {dateLabel(latest.acceptedAt)} by {latest.acceptedBy}.</>
            : <>No acceptance recorded yet.</>}
          {legal.needsAcceptance && <> <b style={{ color: 'var(--cd-amber, #e8b54a)' }}>A newer version waits for acceptance.</b></>}
        </span>
      </div>
      <div className="cd-embed-row">
        <button className="cd-embed-btn" disabled={loading} onClick={() => void download()}>
          {loading ? 'Preparing…' : 'Download the record (PDF)'}
        </button>
      </div>
    </div>
  );
}
