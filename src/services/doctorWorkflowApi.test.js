import {
  createRealtimeSession,
  recordPatientFollowThroughCompletion,
  recordWhatsAppFollowThroughMessage,
  requestPatientInformation,
  saveLiveCopilotArtifacts,
  sendPatientFollowThrough,
  submitDoctorDecision,
} from './doctorWorkflowApi';

jest.mock('../api', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('test-token')),
}));

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  headers: {
    get: () => 'application/json',
  },
  json: () => Promise.resolve(body),
});

describe('doctor workflow server authority', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not fall back to legacy or local approval when the decision endpoint is unavailable', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404));

    await expect(submitDoctorDecision('review-1', {
      decision: 'approve_as_is',
      note_payload: { subjective: 'Updated draft' },
    })).rejects.toMatchObject({
      status: 404,
      endpointMissing: true,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toBeNull();
  });

  it('only returns a decision after the canonical server route confirms it', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      decision_id: 'decision-1',
      decision: 'approve_as_is',
      message: 'Decision recorded by the server.',
    }));

    await expect(submitDoctorDecision('review-1', {
      decision: 'approve_as_is',
      note_payload: { subjective: 'Server-bound draft' },
    })).resolves.toMatchObject({
      decision_id: 'decision-1',
      decision: 'approve_as_is',
    });
    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toBeNull();
  });

  it('rejects missing checklist identifiers instead of recording local completion', async () => {
    await expect(recordPatientFollowThroughCompletion({
      reviewPublicId: 'review-1',
      checklistItemId: 'item-456',
      note: 'Patient says the medication was taken',
    })).rejects.toThrow('Server task and checklist identifiers are required');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toBeNull();
  });

  it('does not turn an unavailable completion endpoint into a successful completion', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404));

    await expect(recordPatientFollowThroughCompletion({
      reviewPublicId: 'review-1',
      taskPublicId: 'task-123',
      checklistItemId: 'item-456',
    })).rejects.toMatchObject({ endpointMissing: true });

    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toBeNull();
  });

  it('returns server-confirmed completion data', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      success: true,
      completed: true,
      next_checklist_item: { id: 'next-item' },
    }));

    await expect(recordPatientFollowThroughCompletion({
      reviewPublicId: 'review-1',
      taskPublicId: 'task-123',
      checklistItemId: 'item-456',
      note: 'Patient said the lab is done',
    })).resolves.toMatchObject({
      success: true,
      completed: true,
    });
  });

  it('fails closed for request, follow-through, realtime, and artifact mutations', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404));

    await expect(requestPatientInformation('review-1', { questions: [{ question: 'What changed?' }] }))
      .rejects.toMatchObject({ endpointMissing: true });
    await expect(sendPatientFollowThrough('review-1', { patient_summary: 'Follow up' }))
      .rejects.toMatchObject({ endpointMissing: true });
    await expect(createRealtimeSession('review-1', { mode: 'triage_clarification' }))
      .rejects.toMatchObject({ endpointMissing: true });
    await expect(saveLiveCopilotArtifacts('review-1', { transcript: [] }))
      .rejects.toMatchObject({ endpointMissing: true });

    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toBeNull();
  });

  it('does not locally acknowledge a WhatsApp safety escalation when its server route is unavailable', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404));

    await expect(recordWhatsAppFollowThroughMessage({
      review: {
        public_id: 'review-1',
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [{
            title: 'Take medicine',
            status: 'pending',
            checklist_item_id: 'item-2',
            task_public_id: 'task-abc',
            is_next_in_line: true,
          }],
        },
      },
      message: 'The chest pain is worse and I cannot breathe',
    })).rejects.toMatchObject({ endpointMissing: true });

    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toBeNull();
  });
});
