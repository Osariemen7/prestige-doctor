import {
  claimClinicalProposal,
  getClinicalProposal,
  getClinicalServiceJoin,
  getDoctorClinicalServiceOrder,
  listDoctorCareTransitions,
  listDoctorClinicalServiceOrders,
  scheduleClinicalService,
  submitClinicalProposalDecision,
} from './doctorCareLoopApi';
import { getAccessToken } from '../api';

jest.mock('../api', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('doctor-token')),
}));

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(body),
});

describe('doctor CareLoop API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    getAccessToken.mockResolvedValue('doctor-token');
  });

  afterEach(() => jest.clearAllMocks());

  it('uses the authenticated doctor transition collection and preserves server ordering', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      schema_version: 'v1',
      results: [{ public_id: 'transition-1', status: 'active' }],
      next_cursor: 'next-1',
    }));

    const result = await listDoctorCareTransitions({
      status: 'active',
      review_public_id: 'review-1',
    });
    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toContain('/doctor/care-transitions');
    expect(url).toContain('status=active');
    expect(url).toContain('review_public_id=review-1');
    expect(options.headers.Authorization).toBe('Bearer doctor-token');
    expect(result.results).toEqual([{ public_id: 'transition-1', status: 'active' }]);
    expect(result.next_cursor).toBe('next-1');
  });

  it('reads the doctor clinical-service collection without applying a client ranking', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ results: [{ public_id: 'order-1' }] }));

    const result = await listDoctorClinicalServiceOrders({ modality: 'written' });
    const [url] = global.fetch.mock.calls[0];

    expect(url).toContain('/doctor/clinical-service-orders');
    expect(url).toContain('modality=written');
    expect(result.results).toEqual([{ public_id: 'order-1' }]);
  });

  it('loads the order and proposal projections through their canonical server routes', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ public_id: 'order-1', proposal_id: 'proposal-1' }))
      .mockResolvedValueOnce(jsonResponse({ public_id: 'proposal-1', proposal_hash: 'proposal-hash' }));

    await expect(getDoctorClinicalServiceOrder('order-1')).resolves.toMatchObject({ proposal_id: 'proposal-1' });
    await expect(getClinicalProposal('proposal-1')).resolves.toMatchObject({ proposal_hash: 'proposal-hash' });
    expect(global.fetch.mock.calls[0][0]).toContain('/doctor/clinical-service-orders/order-1');
    expect(global.fetch.mock.calls[1][0]).toContain('/care/proposals/proposal-1');
  });

  it('sends claims and decisions through the existing server routes with idempotency and exact hashes', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ public_id: 'proposal-1', review_claim: { claimed_by_current_doctor: true } }))
      .mockResolvedValueOnce(jsonResponse({ decision_id: 'decision-1', decision: 'edit_and_approve' }));

    await claimClinicalProposal('proposal-1', {
      idempotencyKey: 'claim-key',
      correlationId: 'claim-correlation',
    });
    await submitClinicalProposalDecision('proposal-1', {
      proposalHash: 'proposal-hash-v4',
      aiDraftHash: 'draft-hash-v4',
      decision: 'edit_and_approve',
      editedProposal: { assessment: { summary: 'Edited by doctor' } },
      idempotencyKey: 'decision-key',
      correlationId: 'decision-correlation',
    });

    const [claimUrl, claimOptions] = global.fetch.mock.calls[0];
    const [decisionUrl, decisionOptions] = global.fetch.mock.calls[1];
    expect(claimUrl).toContain('/care/proposals/proposal-1/review-claim');
    expect(claimOptions.headers['Idempotency-Key']).toBe('claim-key');
    expect(claimOptions.headers['X-Correlation-ID']).toBe('claim-correlation');
    expect(decisionUrl).toContain('/care/proposals/proposal-1/doctor-decision');
    expect(decisionOptions.headers['Idempotency-Key']).toBe('decision-key');
    expect(JSON.parse(decisionOptions.body)).toMatchObject({
      decision: 'edit_and_approve',
      proposal_hash: 'proposal-hash-v4',
      ai_draft_hash: 'draft-hash-v4',
      edited_proposal: { assessment: { summary: 'Edited by doctor' } },
    });
  });

  it('blocks approval when the exact proposal hash is absent and surfaces stale server responses', async () => {
    await expect(submitClinicalProposalDecision('proposal-1', {
      decision: 'approve_as_written',
    })).rejects.toThrow('exact server proposal hash');
    expect(global.fetch).not.toHaveBeenCalled();

    await expect(submitClinicalProposalDecision('proposal-1', {
      proposalHash: 'proposal-hash',
      decision: 'approve_as_written',
    })).rejects.toThrow('exact server AI draft hash');
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch.mockResolvedValueOnce(jsonResponse({ code: 'stale_proposal' }, false, 409));
    await expect(submitClinicalProposalDecision('proposal-1', {
      proposalHash: 'stale-hash',
      aiDraftHash: 'draft-hash',
      decision: 'approve_as_written',
    })).rejects.toMatchObject({ status: 409, payload: { code: 'stale_proposal' } });
  });

  it('keeps schedule and join state server-confirmed', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ status: 'scheduled', server_action: { type: 'join_appointment' } }))
      .mockResolvedValueOnce(jsonResponse({ available: true, server_action: { type: 'join_appointment', channel_name: 'server-channel' } }));

    await scheduleClinicalService('order-1', { start_time: '2026-08-10T10:00:00.000Z' }, {
      idempotencyKey: 'schedule-key',
      correlationId: 'schedule-correlation',
    });
    await expect(getClinicalServiceJoin('order-1')).resolves.toMatchObject({
      available: true,
      server_action: { channel_name: 'server-channel' },
    });

    expect(global.fetch.mock.calls[0][0]).toContain('/care/clinical-service-orders/order-1/schedule');
    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('schedule-key');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      start_time: '2026-08-10T10:00:00.000Z',
    });
    expect(global.fetch.mock.calls[1][0]).toContain('/care/clinical-service-orders/order-1/join');
  });
});
