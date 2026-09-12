import { normalizeQueueItem, normalizeProposal, publicHashSuffix, statusTone } from './contract';
describe('vNext projection contracts', () => {
  test('pool previews remove protected identity and clinical details', () => {
    const row = normalizeQueueItem({ public_id: 'pool-1', pool_preview: true, patient: { display_name: 'Should not appear' }, proposal_hash: 'secret-hash', presenting_problem: 'private diagnosis', urgency: 'urgent' });
    expect(row.pool_preview).toBe(true);
    expect(row.patient).toBeUndefined();
    expect(row.proposal_hash_suffix).toBeUndefined();
    expect(row.presenting_problem).toBeUndefined();
  });

  test('proposal normalization preserves exact hash and complete regimen authority', () => {
    const proposal = normalizeProposal({ public_id: 'proposal-1', proposal_hash: 'proposal-hash-123456', hash_contract: { exact_hash_required: true }, proposed_plan_version: { regimens: [{ medication_name: 'Amlodipine', dose_amount: '5', dose_unit: 'mg', route: 'by mouth', frequency_text: 'once daily', duration_days: '60', order_authorization: { authorized_quantity: 60, dispense_quantity: 30, permitted_repeat_count: 1 } }] } });
    expect(proposal.hash_contract.exact_hash_required).toBe(true);
    expect(proposal.proposal_hash).toBe('proposal-hash-123456');
    expect(proposal.proposed_plan_version.regimens[0].order_authorization.authorized_quantity).toBe(60);
  });

  test('status tones are semantic and hash suffixes remain compact', () => {
    expect(statusTone('emergency')).toBe('danger');
    expect(statusTone('authorized')).toBe('success');
    expect(publicHashSuffix('abcdef123456789')).toBe('def123456789');
  });
});

// Mirrors ProviderCareReviewInboxView's privacy preview and full serializer fields.
test('routes backend pool previews and full assigned projections correctly', () => {
  expect(normalizeQueueItem({ public_id: 'pool', pool_preview: true, review_route_mode: 'covering_pool' }).route_mode).toBe('covering_pool');
  expect(normalizeQueueItem({ public_id: 'assigned', review_claim: { route_mode: 'assigned', claimed_by_current_doctor: true } })).toEqual(expect.objectContaining({ route_mode: 'assigned', claimed_by_current_doctor: true }));
});
test('does not infer exact-hash authority when the server contract is missing', () => {
  expect(normalizeProposal({ public_id: 'old', proposal_hash: 'hash' }).hash_contract.exact_hash_required).toBe(false);
});
