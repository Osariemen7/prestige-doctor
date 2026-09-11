import { fetchProposal, fetchReviewInbox, mutateReviewClaim, resetSyntheticDemo, submitDoctorDecision } from './api';

describe('synthetic Care Kernel adapter', () => {
  beforeEach(() => resetSyntheticDemo());

  test('returns server-ordered queue rows without using funding as priority', async () => {
    const result = await fetchReviewInbox({ demo: true });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].public_id).toBe('proposal-pregnancy-safety-123');
    expect(result.items.findIndex((row) => row.public_id === 'proposal-hypertension-v2')).toBeGreaterThan(0);
    expect(result.items.map((row) => row.route_rank)).toEqual(expect.arrayContaining([5, 10, 15, 20, 25]));
    expect(JSON.stringify(result.items)).not.toMatch(/price|margin|settlement|sponsor/i);
  });

  test('pool case needs a claim before details are returned', async () => {
    const inbox = await fetchReviewInbox({ demo: true });
    const specialistPreview = inbox.items.find((row) => row.public_id === 'proposal-specialist-call-123');
    expect(specialistPreview).toMatchObject({ pool_preview: true, route_mode: 'covering_pool' });
    expect(specialistPreview.patient).toBeUndefined();
    expect(specialistPreview.presenting_problem).toBeUndefined();
    expect(specialistPreview.proposal_hash).toBeUndefined();

    await expect(fetchProposal({ proposalId: 'proposal-pool-preview-123', demo: true })).rejects.toMatchObject({ status: 404, code: 'contract_unavailable' });
    const claimed = await mutateReviewClaim({ proposalId: 'proposal-pool-preview-123', action: 'claim', demo: true });
    expect(claimed.review_claim.claimed_by_provider_id).toBe(17);
    const proposal = await fetchProposal({ proposalId: 'proposal-pool-preview-123', demo: true });
    expect(proposal.patient.display_name).toBe('Pool patient after claim');
  });

  test('stale exact hash rejects the decision and does not return local success', async () => {
    await mutateReviewClaim({ proposalId: 'proposal-hypertension-v2', action: 'claim', demo: true });
    await expect(submitDoctorDecision({ proposalId: 'proposal-hypertension-v2', demo: true, payload: { decision: 'approve_as_written', proposal_hash: 'old-hash', reason: 'test' } })).rejects.toMatchObject({ status: 409, code: 'stale_proposal' });
  });
});
