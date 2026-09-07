import { getExactDecisionHashes } from './doctorDecisionContract';

describe('doctor decision contract', () => {
  it('reads the exact server proposal and draft hashes', () => {
    expect(getExactDecisionHashes({
      care_kernel_proposal: {
        proposal_hash: 'proposal-v3',
        ai_draft_hash: 'draft-v3',
      },
    })).toEqual({ proposalHash: 'proposal-v3', aiDraftHash: 'draft-v3' });
  });

  it('fails closed when the authenticated projection has no proposal', () => {
    expect(getExactDecisionHashes({})).toEqual({ proposalHash: '', aiDraftHash: '' });
  });

  it('accepts the legacy camel-case projection without inventing values', () => {
    expect(getExactDecisionHashes({
      careKernelProposal: { proposalHash: 'proposal-v2', aiDraftHash: 'draft-v2' },
    })).toEqual({ proposalHash: 'proposal-v2', aiDraftHash: 'draft-v2' });
  });
});
