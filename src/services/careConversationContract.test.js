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
});
