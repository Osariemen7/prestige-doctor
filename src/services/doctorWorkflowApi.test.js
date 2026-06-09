import {
  clearLocalWorkflowEvents,
  getLocalWorkflowEvents,
  recordPatientFollowThroughCompletion,
  recordWhatsAppFollowThroughMessage,
  reconcileLocalWorkflowEvents,
  submitDoctorDecision,
} from './doctorWorkflowApi';

jest.mock('../api', () => ({
  getAccessToken: jest.fn(() => Promise.resolve('test-token')),
}));

const LOCAL_EVENT_KEY = 'prestige_doctor_workflow_events';

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  headers: {
    get: () => 'application/json',
  },
  json: () => Promise.resolve(body),
});

describe('doctor workflow local fallback events', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const seedEvents = () => {
    window.localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify([
      {
        id: 'local-1',
        review_public_id: 'review-1',
        kind: 'request_more_info',
        payload: { question: 'How long has the pain lasted?' },
      },
      {
        id: 'local-2',
        review_public_id: 'review-1',
        kind: 'patient_follow_through',
        payload: { patient_summary: 'Take medication and follow up.' },
      },
      {
        id: 'local-other',
        review_public_id: 'review-2',
        kind: 'doctor_decision',
      },
    ]));
  };

  it('clears only locally reconciled events after backend sync succeeds', async () => {
    seedEvents();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      reconciled: 1,
      reconciled_event_ids: ['local-1'],
    }));

    const result = await reconcileLocalWorkflowEvents('review-1');
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);

    expect(global.fetch.mock.calls[0][0]).toContain('/provider-reviews/review-1/workflow-events/reconcile/');
    expect(requestBody.client_event_ids).toEqual(['local-1', 'local-2']);
    expect(result.local_events_cleared).toBe(1);
    expect(result.local_events_remaining).toBe(1);
    expect(getLocalWorkflowEvents().map((event) => event.id)).toEqual(['local-2', 'local-other']);
  });

  it('clears all review events when backend reports a successful bulk reconcile', async () => {
    seedEvents();
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, reconciled: 2 }));

    const result = await reconcileLocalWorkflowEvents('review-1');

    expect(result.local_events_cleared).toBe(2);
    expect(getLocalWorkflowEvents().map((event) => event.id)).toEqual(['local-other']);
  });

  it('preserves local events when reconciliation fails', async () => {
    seedEvents();
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Backend unavailable' }, false, 503));

    await expect(reconcileLocalWorkflowEvents('review-1')).rejects.toThrow('Backend unavailable');

    expect(getLocalWorkflowEvents().map((event) => event.id)).toEqual(['local-1', 'local-2', 'local-other']);
  });

  it('does not call the backend when there are no events for the review', async () => {
    seedEvents();

    const result = await reconcileLocalWorkflowEvents('review-missing');

    expect(result).toEqual({ reconciled: 0, events: [], local_events_cleared: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses the medical review public id for legacy save/finalize fallback', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ detail: 'missing endpoint' }, false, 404))
      .mockResolvedValueOnce(jsonResponse({ saved: true }))
      .mockResolvedValueOnce(jsonResponse({ finalized: true }));

    const result = await submitDoctorDecision('provider-review-1', {
      decision: 'edit_and_approve',
      medical_review_public_id: 'medical-review-1',
      note_payload: { subjective: 'Updated draft' },
    });

    expect(global.fetch.mock.calls[0][0]).toContain('/provider-reviews/provider-review-1/doctor-decision/');
    expect(global.fetch.mock.calls[1][0]).toContain('/medical-reviews/medical-review-1/save-note/');
    expect(global.fetch.mock.calls[2][0]).toContain('/medical-reviews/medical-review-1/finalize/');
    expect(result).toMatchObject({ legacy_fallback: true });
  });

  it('can clear all local events for one review while preserving other reviews', () => {
    seedEvents();

    const cleared = clearLocalWorkflowEvents('review-1');

    expect(cleared).toBe(2);
    expect(getLocalWorkflowEvents().map((event) => event.id)).toEqual(['local-other']);
  });

  it('records WhatsApp AI checklist completion through the native task endpoint', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({
      success: true,
      next_checklist_item: { id: 'next-item' },
    }));

    const result = await recordPatientFollowThroughCompletion({
      reviewPublicId: 'review-1',
      taskPublicId: 'task-123',
      checklistItemId: 'item-456',
      note: 'Patient said the lab is done',
      actorRole: 'authorized_caregiver',
      actorName: 'Ada Okafor',
      completionIntent: 'done',
    });
    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(url).toContain('/task-threads/task-123/checklist-items/item-456/completion/');
    expect(body).toMatchObject({
      completed: true,
      note: 'Patient said the lab is done',
      record_compliance: true,
      source_channel: 'whatsapp_ai_agent',
      actor_role: 'authorized_caregiver',
      actor_name: 'Ada Okafor',
      completion_intent: 'done',
      metadata: {
        completion_loop: 'whatsapp_ai_agent',
        review_public_id: 'review-1',
      },
    });
    expect(result.success).toBe(true);
    expect(getLocalWorkflowEvents()).toEqual([]);
  });

  it('records WhatsApp completion from a command object produced for the active task', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await recordPatientFollowThroughCompletion({
      completionCommand: {
        taskPublicId: 'task-abc',
        checklistItemId: 'item-2',
        payload: {
          completed: false,
          note: 'I could not do it because the lab was closed',
          record_compliance: true,
          source_channel: 'whatsapp_ai_agent',
          actor_role: 'authorized_caregiver',
          actor_name: 'Ada Okafor',
          completion_intent: 'unable_to_complete',
          metadata: {
            review_public_id: 'review-1',
            should_escalate: true,
            escalation_action: 'flag_provider_follow_through_barrier',
          },
        },
      },
    });

    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(url).toContain('/task-threads/task-abc/checklist-items/item-2/completion/');
    expect(body).toMatchObject({
      completed: false,
      note: 'I could not do it because the lab was closed',
      record_compliance: true,
      actor_role: 'authorized_caregiver',
      actor_name: 'Ada Okafor',
      completion_intent: 'unable_to_complete',
      metadata: {
        review_public_id: 'review-1',
        should_escalate: true,
        escalation_action: 'flag_provider_follow_through_barrier',
      },
    });
  });

  it('captures WhatsApp completion locally when checklist identifiers are missing', async () => {
    const result = await recordPatientFollowThroughCompletion({
      reviewPublicId: 'review-1',
      checklistItemId: 'item-456',
      note: 'Patient says the medication was taken',
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      local_fallback: true,
      missing_identifiers: true,
    });
    expect(getLocalWorkflowEvents()[0]).toMatchObject({
      kind: 'patient_follow_through_completion',
      review_public_id: 'review-1',
      reason: 'checklist completion identifiers missing',
      payload: {
        task_public_id: null,
        checklist_item_id: 'item-456',
        source_channel: 'whatsapp_ai_agent',
      },
    });
  });

  it('captures WhatsApp completion locally when the completion endpoint is not available', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404));

    const result = await recordPatientFollowThroughCompletion({
      reviewPublicId: 'review-1',
      taskPublicId: 'task-123',
      checklistItemId: 'item-456',
    });

    expect(result.local_fallback).toBe(true);
    expect(getLocalWorkflowEvents()[0]).toMatchObject({
      kind: 'patient_follow_through_completion',
      review_public_id: 'review-1',
      reason: 'checklist completion endpoint unavailable',
      payload: {
        task_public_id: 'task-123',
        checklist_item_id: 'item-456',
        completed: true,
      },
    });
  });

  it('records an inbound WhatsApp completion message through the native checklist endpoint', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, completed: true }));

    const result = await recordWhatsAppFollowThroughMessage({
      review: {
        public_id: 'review-1',
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [
            {
              title: 'Take medicine',
              status: 'pending',
              checklist_item_id: 'item-2',
              task_public_id: 'task-abc',
              is_next_in_line: true,
            },
          ],
        },
      },
      message: 'Done, I took it',
    });
    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(url).toContain('/task-threads/task-abc/checklist-items/item-2/completion/');
    expect(body).toMatchObject({
      completed: true,
      note: 'Done, I took it',
      source_channel: 'whatsapp_ai_agent',
      completion_intent: 'completed',
      metadata: {
        inbound_whatsapp_message: 'Done, I took it',
        backend_action: 'record_completion',
      },
    });
    expect(result).toMatchObject({
      backendAction: 'record_completion',
      shouldRecordCompletion: true,
      completion_result: { success: true, completed: true },
    });
  });

  it('captures inbound WhatsApp safety escalation locally when the backend message endpoint is missing', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, false, 404));

    const result = await recordWhatsAppFollowThroughMessage({
      review: {
        public_id: 'review-1',
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [
            {
              title: 'Take medicine',
              status: 'pending',
              checklist_item_id: 'item-2',
              task_public_id: 'task-abc',
              is_next_in_line: true,
            },
          ],
        },
      },
      message: 'The chest pain is worse and I cannot breathe',
    });
    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(url).toContain('/provider-reviews/review-1/patient-follow-through/whatsapp-message/');
    expect(body).toMatchObject({
      source_channel: 'whatsapp_ai_agent',
      action: 'escalate_safety_message',
      intent_classification: {
        intent: 'safety_escalation',
        shouldEscalate: true,
      },
      metadata: {
        should_notify_provider: true,
        should_escalate: true,
      },
    });
    expect(result).toMatchObject({
      local_fallback: true,
      backendAction: 'escalate_safety_message',
      shouldRecordCompletion: false,
      shouldEscalate: true,
    });
    expect(getLocalWorkflowEvents()[0]).toMatchObject({
      kind: 'whatsapp_follow_through_message',
      review_public_id: 'review-1',
      action: 'escalate_safety_message',
      reason: 'whatsapp follow-through message endpoint unavailable',
    });
  });
});
