import { vi } from 'vitest';
import { fetchCareActivity, submitDoctorDecision, request, fetchProposal } from './api';
import { getAccessToken } from '../api';

vi.mock('../api', () => ({
  getAccessToken: vi.fn(() => Promise.resolve('access-token')),
  logout: vi.fn(),
}));

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(''),
});

describe('doctor Care Kernel HTTP contract', () => {
  beforeEach(() => { getAccessToken.mockResolvedValue('access-token'); global.fetch = vi.fn(() => Promise.resolve(jsonResponse({ public_id: 'proposal-1', proposal_hash: 'server-hash', status: 'authorized', review_claim: {}, proposed_plan_version: {}, authority_checkpoint: {}, execution_state: {} }))); });
  afterEach(() => vi.restoreAllMocks());

  test('mutations carry auth, client, idempotency, correlation, and exact hash', async () => {
    await submitDoctorDecision({ proposalId: 'proposal-1', payload: { decision: 'approve_as_written', proposal_hash: 'server-hash', reason: 'Verified packet reviewed' }, commandKey: 'stable-command-key', correlationId: 'case-correlation' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer access-token');
    expect(options.headers.Accept).toBe('application/json');
    expect(options.headers['X-Client-Version']).toBeTruthy();
    expect(options.headers['Idempotency-Key']).toBe('stable-command-key');
    expect(options.headers['X-Correlation-ID']).toBe('case-correlation');
    expect(JSON.parse(options.body)).toEqual(expect.objectContaining({ proposal_hash: 'server-hash', decision: 'approve_as_written' }));
  });

  test('activity projection requests the doctor role and stays read-only', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      items: [{
        public_id: 'task-1',
        title: 'Review returned care update',
        status: 'waiting_on_clinician',
        proposal_id: 'proposal-1',
        next_checkpoint: { title: 'Review evidence' },
      }],
    }));
    const result = await fetchCareActivity({ role: 'doctor', cursor: 'next-page', limit: 8 });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/care/activity?role=doctor&cursor=next-page&limit=8');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer access-token');
    expect(options.headers['Idempotency-Key']).toBeUndefined();
    expect(result.items[0]).toMatchObject({ public_id: 'task-1', case_id: 'proposal-1', status: 'waiting_on_clinician' });
  });
});

test('refreshes rejected access once and replays the same exact decision command', async () => {
  global.fetch = vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 401)).mockResolvedValueOnce(jsonResponse({ ok: true }));
  getAccessToken.mockResolvedValueOnce('rejected').mockResolvedValueOnce('fresh').mockResolvedValueOnce('fresh');
  await request('/care/proposals/p/doctor-decision', { method: 'POST', body: { proposal_hash: 'reviewed' }, commandKey: 'decision-1' });
  expect(getAccessToken).toHaveBeenCalledWith({ forceRefresh: true });
  expect(global.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({ body: global.fetch.mock.calls[0][1].body, headers: expect.objectContaining({ Authorization: 'Bearer fresh', 'Idempotency-Key': 'decision-1' }) }));
});
test('rejects a live proposal without explicit exact-hash authority', async () => {
  global.fetch = vi.fn().mockResolvedValue(jsonResponse({ public_id: 'old', proposal_hash: 'hash' }));
  await expect(fetchProposal({ proposalId: 'old' })).rejects.toMatchObject({ code: 'schema_mismatch' });
});
