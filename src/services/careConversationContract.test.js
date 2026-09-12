import { careConversationSchema, parseContract } from './careConversationContract';
import { demoDoctorConversation } from '../demo/careConversationFixture';

describe('care-conversation-turn-v1 doctor contract', () => {
  test('accepts the linked synthetic doctor projection', () => {
    expect(parseContract(careConversationSchema, demoDoctorConversation, 'fixture').patient_id).toBe('demo-patient-ada');
  });

  test('does not accept a client projection without server allowed actions', () => {
    const unsafe = { ...demoDoctorConversation, allowed_actions: undefined };
    expect(() => parseContract(careConversationSchema, unsafe, 'fixture')).toThrow('care-conversation-turn-v1');
  });

  test('accepts the six task links returned by the canonical conversation projection', () => {
    const task = {
      task_id: 'task-1', relation: 'related', state: 'waiting', task_type: 'care_follow_up',
      risk_tier: 'routine', due_at: null, requires_response: false, assignment_actions: [],
    };
    expect(parseContract(careConversationSchema, { ...demoDoctorConversation, tasks: Array.from({ length: 6 }, (_, index) => ({ ...task, task_id: `task-${index + 1}` })) }, 'fixture').tasks).toHaveLength(6);
  });
});
