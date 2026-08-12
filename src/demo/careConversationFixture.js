export const demoDoctorCapabilities = {
  contract_version: 'care-conversation-turn-v1', role: 'doctor', provider_roles: ['clinic'],
  capabilities: { care_conversation_api: true, proactive_runtime: true, proactive_app_inbox: true, proactive_whatsapp: false, task_assignment: true, conversation_preferences: false },
};

export const demoDoctorConversation = {
  conversation_id: '22222222-2222-4222-8222-222222222222', patient_id: 'demo-patient-ada', stakeholder_role: 'doctor',
  organization_id: 'demo-lagoon-pharmacy', business_unit_id: 'demo-lagoon-ikeja', status: 'active', continuity_version: 3,
  unread_count: 1, last_activity_at: '2026-08-11T09:05:00+01:00', active_reply_turn_id: '22222222-2222-4222-8222-222222222223',
  active_response_obligation: { status: 'awaiting_stakeholder_reply', task_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  current_commitment: { task_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', state: 'waiting', owner: 'doctor', deadline: '2026-08-12T12:00:00+01:00', next_action: 'review_consented_follow_up_checkpoint' },
  tasks: [{ task_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', relation: 'primary', state: 'waiting', task_type: 'purchase_follow_up', risk_tier: 'routine', due_at: '2026-08-12T12:00:00+01:00', requires_response: true, assignment_actions: ['release', 'decline'] }],
  turns: [
    { turn_id: '22222222-2222-4222-8222-222222222223', direction: 'outbound', sender_role: 'care_kernel', audience_role: 'doctor', message: 'The patient consented to the provider-funded follow-up and confirmed collection tomorrow. The operational checkpoint is ready; no clinical decision has been created by this conversation.', reply_to_turn_id: null, state_version: 7, status: 'ready', structured: { requested_response_type: 'task_update', next_checkpoint_at: '2026-08-12T12:00:00+01:00', quick_actions: [{ id: 'demo-doctor-acknowledge', label: 'Acknowledge checkpoint', task_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] } },
  ],
  allowed_actions: { reply: true, read: true, pause: false, update_delivery_preferences: false }, delivery_preferences: {},
};
