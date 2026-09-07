// Shared contract helpers for doctor decisions. The backend exposes the
// version binding under care_kernel_proposal; tolerate the camel-case alias
// used by older authenticated projections without inventing a local hash.
export const getExactDecisionHashes = (review = {}) => {
  const proposal = review?.care_kernel_proposal || review?.careKernelProposal || {};
  return {
    proposalHash: proposal.proposal_hash || proposal.proposalHash || '',
    aiDraftHash: proposal.ai_draft_hash || proposal.aiDraftHash || '',
  };
};
