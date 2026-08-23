import {
  clearLocalWorkflowEvents,
  getLocalWorkflowEvents,
  recordPatientFollowThroughCompletion,
  recordWhatsAppFollowThroughMessage,
  submitDoctorDecision,
} from './doctorWorkflowApi';

describe('legacy workflow compatibility is fail-closed', () => {
  test('there is no browser clinical event store', () => {
    window.localStorage.setItem('prestige_doctor_workflow_events', JSON.stringify([{ kind: 'should-not-be-read' }]));
    expect(getLocalWorkflowEvents()).toEqual([]);
    expect(clearLocalWorkflowEvents()).toBe(0);
    expect(window.localStorage.getItem('prestige_doctor_workflow_events')).toContain('should-not-be-read');
  });

  test('a clinical decision without an exact hash remains failed', async () => {
    await expect(submitDoctorDecision('proposal-1', { decision: 'approve_as_written' })).rejects.toMatchObject({ code: 'exact_hash_required' });
  });

  test('legacy follow-through actions do not synthesize local success', async () => {
    await expect(recordPatientFollowThroughCompletion({ reviewPublicId: 'review-1' })).rejects.toMatchObject({ code: 'contract_unavailable' });
    await expect(recordWhatsAppFollowThroughMessage({ reviewPublicId: 'review-1', message: 'hello' })).rejects.toMatchObject({ code: 'contract_unavailable' });
    expect(getLocalWorkflowEvents()).toEqual([]);
  });
});
