import { asText, copy, documentationChanges, normalizeProposal } from './contract';

// These identifiers are shared synthetic references for the patient/doctor/
// partner rollout. They are deliberately not production records.
export const DEMO_IDS = Object.freeze({
  patient: '123',
  episode: 'episode-hypertension-123',
  goal: 'goal-hypertension-123',
  journey: 'journey-hypertension-123',
  proposal: 'proposal-hypertension-v2',
  clinicalService: 'clinical-service-gp-written-123',
  specialistService: 'clinical-service-specialist-call-123',
  transition: 'transition-clinic-referral-123',
  doctor: 17,
});

const DEMO_NOW = '2026-08-07T11:00:00+01:00';

const regimen = {
  medication_code: 'amlodipine',
  medication_name: 'Amlodipine',
  dose_amount: '5',
  dose_unit: 'mg',
  route: 'by mouth',
  interval_hours: '24',
  frequency_text: 'once daily',
  duration_days: '60',
  maximum_daily_dose: '5',
  maximum_daily_dose_unit: 'mg',
  indication: 'Stable hypertension',
  calculation_basis: { basis: 'server_protocol', weight_kg: null },
  safety_checks: { interaction_check: 'passed', contraindications: 'none returned' },
  patient_instructions: 'Take at the same time each day. Continue the returned monitoring plan.',
  authority_class: 'clinician_authorized_required',
  status: 'proposed',
  input_hash: 'input-amlodipine-demo-v1',
  regimen_hash: 'regimen-amlodipine-demo-v1',
  order_authorization: {
    authorized_quantity: 60,
    dispense_quantity: 30,
    permitted_repeat_count: 1,
    repeat_interval_days: 28,
    authorization_expires_at: '2026-10-06T23:59:00+01:00',
    item_name: 'Amlodipine',
    strength: '5 mg',
    form: 'tablet',
    service_family: 'medication',
  },
};

const evidence = [
  {
    public_id: 'evidence-bp-123',
    evidence_type: 'blood_pressure',
    label: 'Home blood pressure',
    value: '138/86 mmHg',
    observed_at: '2026-08-06T18:20:00+01:00',
    verified: true,
    provenance: { source: 'patient_device_entry', captured_by: 'patient', capture_channel: 'patient_web_app' },
  },
  {
    public_id: 'evidence-adherence-123',
    evidence_type: 'adherence_report',
    label: 'Adherence report',
    value: 'No missed doses reported in the last 7 days',
    observed_at: '2026-08-06T18:25:00+01:00',
    verified: true,
    provenance: { source: 'care_loop', captured_by: 'patient', capture_channel: 'patient_web_app' },
  },
];

const basePlan = {
  assessment: { summary: 'Stable hypertension on current monitoring evidence.', confidence: 'moderate' },
  differential: ['Uncontrolled hypertension', 'Measurement variation'],
  plan_summary: 'Continue the exact monitored regimen and reassess at the server checkpoint.',
  safety_net: { instructions: 'Escalate for chest pain, severe breathlessness, weakness, confusion, or a severe persistent reading.' },
  expected_outcomes: { short_term: 'Maintain readings in the returned target range', checkpoint: 'Review adherence and repeat reading at day 28' },
  goals: [{ public_id: DEMO_IDS.goal, patient_wording: 'Keep my blood pressure steady so I can keep working and caring for my family.' }],
  actions: [{ public_id: 'action-amlodipine-123', type: 'medication', label: 'Continue exact amlodipine regimen', authority_state: 'proposed' }],
  regimens: [regimen],
};

const hydrochlorothiazideRegimen = {
  medication_code: 'hydrochlorothiazide-12-5mg-tablet',
  medication_name: 'Hydrochlorothiazide',
  dose_amount: '12.5',
  dose_unit: 'mg',
  route: 'by mouth',
  interval_hours: '24',
  frequency_text: 'once every morning',
  duration_days: '60',
  maximum_daily_dose: '12.5',
  maximum_daily_dose_unit: 'mg',
  indication: 'Stable hypertension on an established combination regimen',
  calculation_basis: { basis: 'existing_verified_regimen', weight_based: false },
  safety_checks: { interaction_check: 'review_required', contraindications: 'none returned' },
  patient_instructions: 'Take in the morning. Continue the returned blood pressure monitoring plan.',
  authority_class: 'clinician_authorized_required',
  status: 'proposed',
  input_hash: 'input-hydrochlorothiazide-demo-v1',
  regimen_hash: 'regimen-hydrochlorothiazide-demo-v1',
  order_authorization: {
    authorized_quantity: 60,
    dispense_quantity: 30,
    permitted_repeat_count: 1,
    repeat_interval_days: 28,
    authorization_expires_at: '2026-10-06T23:59:00+01:00',
    item_name: 'Hydrochlorothiazide',
    strength: '12.5 mg',
    form: 'tablet',
    service_family: 'medication',
  },
};

const documentationSources = [
  { public_id: 'source-bp-123', path: 'objective.verified_observations', label: 'Home blood pressure log', source: 'patient_device_entry', captured_by: 'patient', capture_channel: 'patient_web_app', observed_at: '2026-08-06T18:20:00+01:00', verified: true, limitation: 'Home technique was reviewed remotely; no in-person examination was performed.' },
  { public_id: 'source-adherence-123', path: 'subjective.medications_and_adherence', label: 'Medication adherence report', source: 'care_loop', captured_by: 'patient', capture_channel: 'patient_web_app', observed_at: '2026-08-06T18:25:00+01:00', verified: true },
  { public_id: 'source-goal-123', path: 'subjective.patient_goal', label: 'Exact patient goal', source: 'patient_goal_contract.v2', captured_by: 'patient', capture_channel: 'whatsapp', observed_at: '2026-08-05T09:20:00+01:00', verified: true },
  { public_id: 'source-history-123', path: 'subjective.history_of_presenting_complaint', label: 'Longitudinal care history', source: 'care_kernel_episode', captured_by: 'care_agent', capture_channel: 'whatsapp', observed_at: '2026-08-06T18:30:00+01:00', verified: false, limitation: 'Patient-reported; clinician verification is required.' },
];

const documentationPrescription = (sourceRegimen, formulation) => ({
  medication_name: sourceRegimen.medication_name,
  formulation,
  indication: sourceRegimen.indication,
  patient_specific_regimen: {
    ...sourceRegimen,
    allergies_reviewed: false,
    interactions_reviewed: false,
  },
  order_authorization: sourceRegimen.order_authorization,
});

const documentationInvestigations = [
  {
    test_type: 'Serum electrolytes, urea and creatinine',
    test_code: 'EUC',
    reason: 'Monitor renal function and electrolytes while continuing the established thiazide-containing regimen.',
    urgency: 'routine',
    timing: 'Within 14 days',
    preparation: 'No fasting required unless the laboratory advises otherwise.',
    instructions: 'Attend an accredited laboratory with the server-issued request.',
    result_review: { medical_interpretation_required: true, owner: 'Assigned clinician', due: 'Within 48 hours of result receipt', checkpoint_type: 'investigation_result_interpretation' },
  },
  {
    test_type: 'Urine albumin-to-creatinine ratio',
    test_code: 'UACR',
    reason: 'Screen for kidney involvement in longitudinal hypertension care.',
    urgency: 'routine',
    timing: 'Within 30 days',
    preparation: 'Use a clean early-morning urine sample if practical.',
    instructions: 'Follow the laboratory collection instructions and submit the sample promptly.',
    result_review: { medical_interpretation_required: true, owner: 'Assigned clinician', due: 'Within 48 hours of result receipt', checkpoint_type: 'investigation_result_interpretation' },
  },
];

const documentationEditContract = {
  schema_version: 'care_plan_edit.v2',
  source_plan_version_id: 'plan-version-hypertension-v2',
  subjective: {
    chief_complaint: 'Routine blood pressure follow-up; no new acute complaint.',
    history_of_presenting_complaint: 'Home readings have remained near target over the last seven days. No chest pain, severe breathlessness, focal weakness, confusion, or severe persistent headache reported.',
    relevant_history_review_of_systems: 'Known hypertension. No new ankle swelling, dizziness, or postural symptoms reported.',
    medications_and_adherence: 'Amlodipine 5 mg daily and hydrochlorothiazide 12.5 mg each morning; no missed doses reported in the last seven days.',
    allergies: 'No medicine allergy was returned in the current verified snapshot; clinician review required before signing.',
    patient_goal: 'Keep my blood pressure steady so I can keep working and caring for my family.',
  },
  objective: {
    verified_observations: 'Latest verified home blood pressure: 138/86 mmHg. Seven-day readings are within the server-returned monitoring range.',
    examination_summary: 'No physical examination was performed in this asynchronous documentation review.',
    investigation_results: 'No new laboratory result was returned with this proposal.',
    remote_assessment_limitations: 'Home measurement and patient-reported symptoms cannot exclude findings that require an in-person examination.',
  },
  assessment: {
    primary_impression: 'Hypertension, currently stable on the verified home monitoring evidence and established regimen.',
    confidence: 'Moderate',
    ranked_differential: '1. Stable treated hypertension\n2. Measurement variation\n3. Early loss of control if adherence or technique changes',
    must_not_miss: 'Hypertensive emergency symptoms; medicine adverse effect; clinically important electrolyte or renal-function change.',
    clinical_rationale: 'Current readings, adherence report, absence of returned red-flag symptoms, and continuity of the existing regimen support monitored continuation with laboratory checkpoints.',
  },
  plan: {
    management: 'Continue the established blood pressure regimen while preserving the day-28 safety and adherence checkpoint.',
    referrals_actions: 'Arrange laboratory monitoring. Escalate to physical assessment if red-flag symptoms or severe persistent readings occur.',
    education: 'Review home blood pressure technique, adherence, and when to seek urgent care.',
  },
  differential: basePlan.differential,
  safety_net: { instructions: 'Seek urgent physical care for chest pain, severe breathlessness, new weakness, confusion, fainting, or a severe persistent blood pressure reading.' },
  expected_outcomes: ['Maintain home readings in the returned target range', 'Complete laboratory monitoring', 'Review adherence and safety at day 28'],
  source_provenance: documentationSources,
  action_disposition: { prescription: 'included', investigation: 'included' },
  prescription: [
    documentationPrescription(regimen, '5 mg tablet'),
    documentationPrescription(hydrochlorothiazideRegimen, '12.5 mg tablet'),
  ],
  investigation: documentationInvestigations,
  procedure: [],
  appointment: [],
  device: [],
  referral: [],
  admission: [],
  next_review: { timing: '28 days', checkpoint: 'Safety, adherence, blood pressure, and laboratory review' },
  goal_target: { goal_id: DEMO_IDS.goal, target: 'Maintain the server-returned blood pressure range' },
  goal_metrics: [{ code: 'home_blood_pressure', cadence: 'weekly' }],
  extension_fields: { originating_channel: 'whatsapp', template_revision: 2 },
};

const clinicalDocumentation = {
  schema_version: 'care_plan_documentation.v2',
  state: 'ai_prepared',
  source: 'ai_prepared',
  signed: false,
  signed_at: null,
  source_plan_version_id: 'plan-version-hypertension-v2',
  version_id: 'plan-version-hypertension-v2',
  content_hash: 'documentation-content-hypertension-v2-31f9a7',
  proposal_hash: 'proposal-hypertension-v2-8e4c1b',
  source_draft_hash: 'ai-draft-hypertension-v2-9a01bd',
  sections: {
    subjective: documentationEditContract.subjective,
    objective: documentationEditContract.objective,
    assessment: documentationEditContract.assessment,
    plan: documentationEditContract.plan,
  },
  prescriptions: documentationEditContract.prescription,
  investigations: documentationEditContract.investigation,
  other_actions: { procedure: [], appointment: [], device: [], referral: [], admission: [] },
  source_provenance: documentationSources,
  provenance_coverage: { mapped_source_count: documentationSources.length, complete: true },
  missing_sections: [],
  action_disposition: documentationEditContract.action_disposition,
  amendment_diff: [],
  edit_contract: documentationEditContract,
  editor_capabilities: {
    can_edit: true,
    can_add_prescription: true,
    can_add_investigation: true,
    medication_options: [
      { code: 'amlodipine-5mg-tablet', label: 'Amlodipine 5 mg tablet' },
      { code: 'hydrochlorothiazide-12-5mg-tablet', label: 'Hydrochlorothiazide 12.5 mg tablet' },
    ],
    investigation_options: [
      { code: 'EUC', label: 'Serum electrolytes, urea and creatinine' },
      { code: 'UACR', label: 'Urine albumin-to-creatinine ratio' },
    ],
  },
  financial_details_hidden: true,
};

const makeProposal = (overrides = {}) => ({
  public_id: DEMO_IDS.proposal,
  episode_id: DEMO_IDS.episode,
  proposal_hash: 'proposal-hypertension-v2-8e4c1b',
  status: 'needs_attention',
  authority_route: 'clinician_review',
  required_approver_id: DEMO_IDS.doctor,
  doctor_review_due_at: '2026-08-07T14:00:00+01:00',
  patient: { public_id: DEMO_IDS.patient, display_name: 'Amina Okafor', age: 56, sex: 'female', population_label: 'Adult', protected: false },
  patient_goal: 'Keep my blood pressure steady so I can keep working and caring for my family.',
  desired_life_outcome: 'Stay well enough for work and family responsibilities.',
  presenting_problem: 'Follow-up after a stable home blood pressure review.',
  current_care: {
    medicines: ['Amlodipine 5 mg once daily'],
    adherence: 'No missed doses reported in the last 7 days',
    monitoring: ['Home blood pressure log'],
    barriers: ['Needs a clear next checkpoint'],
    last_verified_change: 'Blood pressure remains within the server-returned monitoring range.',
  },
  evidence,
  evidence_quality: { label: 'Sufficient for review', score: 0.88, gaps: [] },
  impression: { summary: 'Stable hypertension on current evidence.', confidence: 'moderate', reasoning: 'Evidence and prior plan are internally consistent.' },
  differential: basePlan.differential,
  must_not_miss: ['Severe hypertension with acute symptoms', 'Medication adverse effect'],
  missing_information: { questions: [], requested_at: null, returned_at: null },
  protocol: { name: 'Hypertension follow-up v3', version: '3.2', match: 'matched', exclusions: [] },
  proposed_plan_version: basePlan,
  approved_action_preview: [{ label: 'Amlodipine 5 mg by mouth once daily for 60 days', detail: 'Dispense now: 30 tablets · permitted repeat: one further 30-tablet supply' }],
  execution_state: { state: 'not_started', next_checkpoint: 'Day 28 safety and adherence checkpoint', owner: 'Care Kernel coordination', due_at: '2026-09-04T12:00:00+01:00' },
  hash_contract: { proposal_hash: 'proposal-hypertension-v2-8e4c1b', plan_content_hash: 'plan-hypertension-v2', patient_snapshot_hash: 'patient-snapshot-123-v2', parent_content_hash: 'plan-hypertension-v1', exact_hash_required: true },
  review_claim: { mode: 'asynchronous_exception_review', claimed_by_provider_id: null, claimed_at: null, claim_expires_at: null, route_mode: 'assigned', route_reason: 'Assigned longitudinal doctor', route_version: 2, synchronous_interaction_promised: false },
  authority_checkpoint: { requested_authority: 'Prescription continuation and recurring order allocation', allowed_actions: ['approve_as_written', 'edit_and_approve', 'request_more_information', 'convert_to_live_encounter', 'escalate', 'reject'] },
  clinician_work: { ai_draft_hash: 'ai-draft-hypertension-v2', ai_prepared_draft: { impression: 'Stable hypertension on current monitoring evidence.', plan: 'Continue exact monitored regimen and reassess at the server checkpoint.', signed: false } },
  mobilization: { owner: 'Assigned longitudinal doctor', next_update_at: '2026-08-07T15:00:00+01:00' },
  included_purchase_checkpoint: { status: 'provider_included', label: 'Provider-included managed follow-up', does_not_include_clinician_review: true },
  clinical_documentation: copy(clinicalDocumentation),
  allowed_actions: ['approve_as_written', 'edit_and_approve', 'request_more_information', 'convert_to_live_encounter', 'escalate', 'reject'],
  correlation_id: 'case-correlation-hypertension-123',
  ...overrides,
});

const makeQueueItem = (proposal, overrides = {}) => ({
  public_id: proposal.public_id,
  status: proposal.status,
  urgency: 'routine',
  doctor_review_due_at: proposal.doctor_review_due_at,
  route_mode: 'assigned',
  route_reason: 'Assigned longitudinal doctor',
  route_rank: 10,
  pool_preview: false,
  claimable: true,
  claimed_by_current_doctor: false,
  review_claim: proposal.review_claim,
  information_resubmission: false,
  requested_authority: proposal.authority_route,
  protected_population: Boolean(proposal.patient?.protected),
  patient: proposal.patient,
  presenting_problem: proposal.presenting_problem,
  evidence_completeness: proposal.evidence_quality,
  last_progress: proposal.current_care.last_verified_change,
  proposal_hash: proposal.proposal_hash,
  created_at: '2026-08-07T08:30:00+01:00',
  ...overrides,
});

const specialistProposal = makeProposal({
  public_id: 'proposal-specialist-call-123',
  episode_id: 'episode-specialist-123',
  proposal_hash: 'proposal-specialist-v1-07ab91',
  patient: { public_id: '124', display_name: 'Chinedu Nwosu', age: 42, sex: 'male', population_label: 'Adult', protected: false },
  patient_goal: 'Understand the next safe step for recurring headaches.',
  desired_life_outcome: 'Return to work without recurrent severe headaches.',
  presenting_problem: 'Recurring headaches with a specialist audio/video review requested.',
  authority_route: 'specialist_review',
  required_approver_id: null,
  doctor_review_due_at: '2026-08-08T12:00:00+01:00',
  review_claim: { mode: 'asynchronous_exception_review', route_mode: 'covering_pool', route_reason: 'Specialist service requires covering review', route_version: 4, synchronous_interaction_promised: false },
  authority_checkpoint: { requested_authority: 'Specialist assessment', allowed_actions: ['approve_as_written', 'edit_and_approve', 'request_more_information', 'convert_to_live_encounter', 'escalate', 'reject'] },
  clinician_work: { ai_draft_hash: 'ai-draft-specialist-v1', ai_prepared_draft: { impression: 'Headache pattern requires specialist review.', plan: 'Review full history and decide the next safe route.', signed: false } },
  protocol: { name: 'Headache escalation protocol', version: '1.4', match: 'needs specialist review', exclusions: ['New focal neurological deficit requires physical assessment'] },
  proposed_plan_version: { ...basePlan, plan_summary: 'Specialist review of the recurring headache pattern; no medication change proposed.' },
  clinical_documentation: { schema_version: 'legacy', state: 'unavailable', signed: false, missing_sections: ['subjective', 'objective', 'assessment', 'plan'], reason: 'This synthetic specialist packet demonstrates the honest capability-unavailable state.', edit_contract: null, editor_capabilities: { can_edit: false, can_add_prescription: false, can_add_investigation: false } },
});

const transition = {
  public_id: 'transition-clinic-referral-123',
  protocol: { name: 'Clinic referral to attendance', version: '2.1', category: 'clinic_referral' },
  status: 'in_progress',
  provider: { name: 'Synthetic General Clinic', location: 'Lagos mainland', contact: 'Returned by the server' },
  consent_state: 'consented',
  evidence_gaps: [],
  safety_escalation: { instructions: 'Use urgent physical care if symptoms worsen before attendance.' },
  attendance: { appointment_at: '2026-08-09T10:00:00+01:00', check_in_state: 'issued', attended_state: 'pending' },
  discharge: null,
  timeline: [
    { at: '2026-08-06T09:00:00+01:00', label: 'Referral accepted', status: 'completed' },
    { at: '2026-08-09T10:00:00+01:00', label: 'Attendance checkpoint', status: 'pending' },
  ],
  next_checkpoint: { title: 'Confirm attendance evidence', owner: 'Synthetic General Clinic', due_at: '2026-08-09T12:00:00+01:00', blocker: null },
  allowed_actions: [],
};

const createState = () => {
  const primary = makeProposal();
  const specialist = specialistProposal;
  const safety = makeProposal({
    public_id: 'proposal-pregnancy-safety-123',
    episode_id: 'episode-pregnancy-123',
    proposal_hash: 'proposal-pregnancy-v1-0fa421',
    status: 'safety',
    authority_route: 'physical_care',
    doctor_review_due_at: '2026-08-07T11:30:00+01:00',
    patient: { public_id: '125', display_name: 'Synthetic protected patient', age: 31, sex: 'female', population_label: 'Pregnancy context', protected: true },
    patient_goal: 'Know what to do safely now.',
    desired_life_outcome: 'Be assessed safely without delay.',
    presenting_problem: 'Pregnancy context with a server-returned safety route.',
    current_care: { medicines: [], adherence: 'Not applicable', monitoring: ['Server safety routing'], barriers: ['Needs physical assessment'] },
    evidence: [{ public_id: 'evidence-safety-123', evidence_type: 'safety_signal', label: 'Safety signal', value: 'Server returned urgent physical-care routing', observed_at: DEMO_NOW, verified: true, provenance: { source: 'care_kernel', captured_by: 'care_kernel', capture_channel: 'care_runtime', limitation: 'Remote review cannot replace physical assessment.' } }],
    evidence_quality: { label: 'Safety route takes precedence', score: null, gaps: ['Physical assessment required'] },
    proposed_plan_version: { ...basePlan, plan_summary: 'Do not wait for payment, entitlement, or remote decision. Use the returned physical-care route.' },
    authority_checkpoint: { requested_authority: 'Physical care disposition', allowed_actions: ['escalate'] },
    allowed_actions: ['escalate'],
    clinical_documentation: { schema_version: 'care_plan_documentation.v2', state: 'unavailable', signed: false, missing_sections: ['physical_examination'], reason: 'The server safety route requires physical assessment before documentation approval.', edit_contract: null, editor_capabilities: { can_edit: false, can_add_prescription: false, can_add_investigation: false } },
  });
  return {
    inbox: [
      makeQueueItem(safety, { route_rank: 5, urgency: 'urgent', route_mode: 'assigned', route_reason: 'Safety route', protected_population: true }),
      makeQueueItem(primary),
      makeQueueItem(specialist, { route_rank: 20, route_mode: 'covering_pool', route_reason: 'Covering pool opened', pool_preview: true, claimable: true, claimed_by_current_doctor: false }),
      {
        public_id: 'proposal-pool-preview-123', status: 'pending', urgency: 'soon', doctor_review_due_at: '2026-08-07T18:00:00+01:00', route_mode: 'covering_pool', route_reason: 'Assigned doctor unavailable', route_rank: 25, pool_preview: true, claimable: true, claimed_by_current_doctor: false, review_claim: { claimable: true, claim_expires_at: null }, requested_authority: 'Clinical review', protected_population: false,
      },
      makeQueueItem(primary, { public_id: 'proposal-info-returned-123', status: 'needs_attention', urgency: 'soon', doctor_review_due_at: '2026-08-07T16:30:00+01:00', route_rank: 15, information_resubmission: true, route_reason: 'New information returned', presenting_problem: 'New verified information returned to the same clinical decision cycle.', proposal_hash: 'proposal-info-returned-v3-9f0b22' }),
    ],
    proposals: {
      [primary.public_id]: primary,
      [safety.public_id]: safety,
      [specialist.public_id]: specialist,
      'proposal-info-returned-123': makeProposal({ public_id: 'proposal-info-returned-123', episode_id: 'episode-hypertension-123', proposal_hash: 'proposal-info-returned-v3-9f0b22', status: 'needs_attention', missing_information: { questions: [], requested_at: '2026-08-06T13:00:00+01:00', returned_at: '2026-08-07T08:00:00+01:00' }, patient: { public_id: DEMO_IDS.patient, display_name: 'Amina Okafor', age: 56, sex: 'female', population_label: 'Adult', protected: false }, presenting_problem: 'Returned blood pressure evidence is ready for fresh review.' }),
      'proposal-pool-preview-123': makeProposal({ public_id: 'proposal-pool-preview-123', episode_id: 'episode-pool-123', proposal_hash: 'proposal-pool-v1-3c21d8', patient: { public_id: '126', display_name: 'Pool patient after claim', age: 68, sex: 'female', population_label: 'Adult', protected: false }, presenting_problem: 'Pool case details are visible only after a successful claim.', clinical_documentation: { schema_version: 'legacy', state: 'unavailable', signed: false, missing_sections: ['subjective', 'objective', 'assessment', 'plan'], reason: 'This pool fixture has no hash-covered v2 documentation.', edit_contract: null, editor_capabilities: { can_edit: false } } }),
    },
    claims: {},
    services: {
      'clinical-service-gp-written-123': { public_id: 'clinical-service-gp-written-123', sku: 'gp_written_review', clinician_class: 'GP', modality: 'Written review', status: 'pending_doctor', linked_proposal_id: DEMO_IDS.proposal, proposal_hash: 'proposal-hypertension-v2-8e4c1b', ai_draft_hash: 'ai-draft-hypertension-v2', ai_prepared_draft: { impression: 'Stable hypertension on current monitoring evidence.', plan: 'Continue exact monitored regimen and reassess at the server checkpoint.', signed: false }, due_at: '2026-08-07T14:00:00+01:00', authority_label: 'Licensed clinician review required', consent_state: 'consented', appointment: null, allowed_actions: [] },
      'clinical-service-specialist-call-123': { public_id: 'clinical-service-specialist-call-123', sku: 'specialist_audio_video', clinician_class: 'Specialist', modality: 'Audio/video call', status: 'pending_doctor', linked_proposal_id: specialist.public_id, proposal_hash: specialist.proposal_hash, ai_draft_hash: 'ai-draft-specialist-v1', ai_prepared_draft: specialist.clinician_work.ai_prepared_draft, due_at: specialist.doctor_review_due_at, authority_label: 'Licensed specialist review required', consent_state: 'consented', appointment: { state: 'not_scheduled', scheduling_action: null }, allowed_actions: [] },
    },
    transitions: { [transition.public_id]: transition },
  };
};

let demoState = createState();
let demoProtocolDecisions = {};

export const resetDemoState = () => {
  demoState = createState();
  demoProtocolDecisions = {};
  return getDemoSnapshot();
};

export const getDemoSnapshot = () => copy(demoState);

export const getDemoInbox = () => copy(demoState.inbox);

export const getDemoProposal = (proposalId) => {
  const proposal = demoState.proposals[proposalId];
  if (!proposal) return null;
  const item = demoState.inbox.find((row) => row.public_id === proposalId);
  if (item?.pool_preview && !demoState.claims[proposalId]) return null;
  return copy(normalizeProposal(proposal));
};

const demoError = (message, status, payload = {}) => {
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  error.code = payload.code || (status === 409 ? 'stale_proposal' : 'demo_error');
  return error;
};

export const claimDemoProposal = (proposalId, action) => {
  const proposal = demoState.proposals[proposalId];
  if (!proposal) throw demoError('This synthetic case is no longer available.', 404);
  const item = demoState.inbox.find((row) => row.public_id === proposalId);
  if (item?.pool_preview && action === 'claim') {
    demoState.claims[proposalId] = true;
    item.pool_preview = false;
    item.patient = proposal.patient;
    item.presenting_problem = proposal.presenting_problem;
    item.proposal_hash = proposal.proposal_hash;
    item.evidence_completeness = proposal.evidence_quality;
  }
  if (action === 'claim') {
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    proposal.review_claim = { ...proposal.review_claim, claimed_by_provider_id: DEMO_IDS.doctor, claimed_by_current_doctor: true, claimed_at: DEMO_NOW, claim_expires_at: expires };
    if (item) Object.assign(item, { claimed_by_current_doctor: true, claim_expires_at: expires });
  }
  if (action === 'heartbeat') {
    if (proposal.review_claim?.claimed_by_provider_id !== DEMO_IDS.doctor) throw demoError('The case is not claimed by this clinician.', 409, { code: 'claim_lost' });
    proposal.review_claim.claim_expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    if (item) item.claim_expires_at = proposal.review_claim.claim_expires_at;
  }
  if (action === 'release' || action === 'decline') {
    proposal.review_claim = { ...proposal.review_claim, claimed_by_provider_id: null, claimed_by_current_doctor: false, claimed_at: null, claim_expires_at: null };
    if (item) Object.assign(item, { claimed_by_current_doctor: false, claim_expires_at: null });
  }
  return copy(normalizeProposal(proposal));
};

export const submitDemoDecision = (proposalId, payload) => {
  const proposal = demoState.proposals[proposalId];
  if (!proposal) throw demoError('This synthetic proposal is not available.', 404);
  if (payload.proposal_hash !== proposal.proposal_hash) {
    throw demoError('This proposal changed while you were reviewing it. Refresh the exact version before deciding.', 409, { code: 'stale_proposal', current_proposal_id: proposal.public_id, current_proposal_hash: proposal.proposal_hash, status: proposal.status });
  }
  if (proposal.review_claim?.claimed_by_provider_id !== DEMO_IDS.doctor) throw demoError('Claim the case before submitting a clinical decision.', 409, { code: 'claim_required' });
  if (['approve_as_written', 'edit_and_approve'].includes(payload.decision) && proposal.clinical_documentation?.schema_version === 'care_plan_documentation.v2') {
    const attestation = payload.clinical_attestations || {};
    if (attestation.documentation_reviewed !== true || attestation.allergies_and_interactions_reviewed !== true) throw demoError('Complete the clinical documentation and safety attestations before signing.', 422, { code: 'clinical_attestations_required' });
  }
  if (payload.decision === 'edit_and_approve') {
    const edit = payload.edited_proposal || {};
    const missingSection = ['subjective', 'objective', 'assessment', 'plan'].find((name) => !edit[name] || typeof edit[name] !== 'object' || Array.isArray(edit[name]));
    const regimenMissingAttestation = (edit.prescription || []).some((item) => item?.patient_specific_regimen?.allergies_reviewed !== true || item?.patient_specific_regimen?.interactions_reviewed !== true);
    const investigationIncomplete = (edit.investigation || []).some((item) => !item?.test_type || !item?.reason || !item?.urgency || !item?.timing || !item?.instructions || typeof item?.result_review?.medical_interpretation_required !== 'boolean');
    if (edit.schema_version !== 'care_plan_edit.v2' || edit.source_plan_version_id !== proposal.clinical_documentation?.source_plan_version_id || missingSection || !Array.isArray(edit.prescription) || !Array.isArray(edit.investigation) || regimenMissingAttestation || investigationIncomplete) {
      throw demoError('The complete exact-version SOAP, action fields, and safety attestations are required.', 422, { code: 'complete_documentation_required', errors: { section: missingSection, medication_attestations: regimenMissingAttestation, investigation_fields: investigationIncomplete } });
    }
    const previous = proposal.clinical_documentation.edit_contract;
    const signedHash = 'documentation-clinician-amended-4d19b2';
    proposal.hash_contract = { ...proposal.hash_contract, parent_content_hash: proposal.clinical_documentation.content_hash, plan_content_hash: signedHash };
    proposal.clinical_documentation = {
      ...proposal.clinical_documentation,
      state: 'clinician_signed',
      source: 'clinician_amended',
      signed: true,
      signed_at: DEMO_NOW,
      signed_by: { role: 'Licensed clinician', provider_public_id: 'synthetic-doctor-17' },
      version_id: 'plan-version-hypertension-v3-clinician',
      content_hash: signedHash,
      sections: { subjective: edit.subjective, objective: edit.objective, assessment: edit.assessment, plan: edit.plan },
      prescriptions: edit.prescription,
      investigations: edit.investigation,
      action_disposition: edit.action_disposition,
      amendment_diff: documentationChanges(previous, edit).map(({ path, change }) => ({ path, change })),
      edit_contract: null,
      editor_capabilities: { ...proposal.clinical_documentation.editor_capabilities, can_edit: false, can_add_prescription: false, can_add_investigation: false },
    };
    proposal.proposed_plan_version = { ...proposal.proposed_plan_version, assessment: edit.assessment, differential: edit.differential, safety_net: edit.safety_net, expected_outcomes: edit.expected_outcomes, clinician_authored: true };
  } else if (payload.decision === 'approve_as_written' && proposal.clinical_documentation?.state === 'ai_prepared') {
    proposal.clinical_documentation = {
      ...proposal.clinical_documentation,
      state: 'clinician_signed',
      source: 'ai_prepared',
      signed: true,
      signed_at: DEMO_NOW,
      signed_by: { role: 'Licensed clinician', provider_public_id: 'synthetic-doctor-17' },
      amendment_diff: [],
      edit_contract: null,
      editor_capabilities: { ...proposal.clinical_documentation.editor_capabilities, can_edit: false, can_add_prescription: false, can_add_investigation: false },
    };
  }
  const terminal = ['approve_as_written', 'edit_and_approve', 'escalate', 'reject'].includes(payload.decision);
  proposal.status = payload.decision === 'request_more_information' ? 'waiting_on_patient' : payload.decision === 'convert_to_live_encounter' ? 'pending' : payload.decision === 'escalate' ? 'safety' : payload.decision === 'reject' ? 'rejected' : 'authorized';
  proposal.authority_checkpoint = { ...proposal.authority_checkpoint, last_decision: payload.decision, decision_reason: payload.reason, decision_at: DEMO_NOW, allowed_actions: [] };
  proposal.mobilization = { owner: payload.decision === 'request_more_information' ? 'Patient / Care Kernel' : 'Care Kernel coordination', next_update_at: '2026-08-08T12:00:00+01:00' };
  if (payload.decision === 'request_more_information') proposal.missing_information = { questions: payload.questions || [], requested_at: DEMO_NOW, returned_at: null };
  if (terminal && payload.decision !== 'reject') proposal.execution_state = { state: 'authorized', approved_at: DEMO_NOW, approved_by: 'Current clinician', signed_version_id: proposal.clinical_documentation?.version_id, signed_content_hash: proposal.clinical_documentation?.content_hash, next_checkpoint: { task_id: 'task-day28-123', type: 'clinical_follow_up', title: 'Day 28 safety, adherence, blood pressure, and laboratory review', state: 'ready' }, downstream_owner: { role: 'Care Kernel coordination' }, due_at: '2026-09-04T12:00:00+01:00' };
  if (payload.decision === 'reject') proposal.execution_state = { state: 'not_activated', next_action: 'Server-defined safe route' };
  proposal.review_claim = { ...proposal.review_claim, claimed_by_provider_id: DEMO_IDS.doctor, claimed_by_current_doctor: true, claim_expires_at: null };
  return copy(normalizeProposal(proposal));
};

export const getDemoClinicalService = (orderId) => copy(demoState.services[orderId] || null);
export const getDemoTransition = (transitionId) => copy(demoState.transitions[transitionId] || null);
export const getDemoProgress = (patientId) => copy({
  patient_id: patientId,
  patient: { public_id: DEMO_IDS.patient, display_name: 'Amina Okafor', age: 56, population_label: 'Adult' },
  goal: { public_id: DEMO_IDS.goal, patient_wording: 'Keep my blood pressure steady so I can keep working and caring for my family.', desired_life_outcome: 'Stay well enough for work and family responsibilities.', progress: 64, progress_source: 'Care Kernel verified evidence', status: 'in_progress' },
  episode: { public_id: DEMO_IDS.episode, status: 'in_progress', next_action: 'Complete the day 28 safety and adherence checkpoint', owner: 'Care Kernel coordination', due_at: '2026-09-04T12:00:00+01:00' },
  tasks: [{ public_id: 'task-bp-day28-123', label: 'Day 28 safety and adherence checkpoint', status: 'pending', owner: 'Patient / Care Kernel', due_at: '2026-09-04T12:00:00+01:00' }],
  observations: evidence,
  timeline: [{ at: '2026-08-06T18:20:00+01:00', label: 'Verified home blood pressure recorded', status: 'completed' }, { at: '2026-09-04T12:00:00+01:00', label: 'Safety and adherence checkpoint', status: 'pending' }],
  team: [{ role: 'Assigned longitudinal doctor', owner: 'Current clinician', state: 'authorized' }, { role: 'Care Kernel coordination', owner: 'Care coordination', state: 'in_progress' }],
  execution: { approved_plan_hash: demoState.proposals[DEMO_IDS.proposal]?.proposal_hash || 'not returned', authorized_quantity: 60, reserved_quantity: 0, fulfilled_quantity: 0, remaining_quantity: 60, repeat_eligibility: 'At day 28 if the returned safety conditions remain acceptable', outcome_state: 'missing' },
});

export const getDemoAlerts = () => copy([
  { public_id: 'alert-safety-123', type: 'safety', status: 'needs_attention', label: 'Pregnancy-context case has a server-returned physical-care route', proposal_id: 'proposal-pregnancy-safety-123', due_at: '2026-08-07T11:30:00+01:00' },
  { public_id: 'alert-info-123', type: 'resubmission', status: 'needs_attention', label: 'New information returned to an existing decision cycle', proposal_id: 'proposal-info-returned-123', due_at: '2026-08-07T16:30:00+01:00' },
]);

export const getDemoProtocols = () => copy([{ public_id: 'protocol-candidate-hypertension-123', title: 'Hypertension follow-up v3 amendment', status: demoProtocolDecisions['protocol-candidate-hypertension-123']?.decision === 'approve' ? 'approved' : 'pending_governance', cohort_match: 'Adult stable hypertension', sample_size: 42, completeness: 'sufficient', safety_events: 0, outcome_comparison: 'Awaiting server comparison', resource_cost: 'Server metric only', frontier_position: 'not_ranked', allowed_actions: ['approve', 'reject', 'request_research'] }]);

export const submitDemoProtocolDecision = (candidateId, payload) => {
  if (candidateId !== 'protocol-candidate-hypertension-123') throw demoError('This governance candidate is not available.', 404);
  if (!payload?.decision || !payload?.rationale) throw demoError('A governance decision and rationale are required.', 422, { code: 'rationale_required' });
  demoProtocolDecisions[candidateId] = { ...payload, decided_at: DEMO_NOW };
  return copy({ ...getDemoProtocols()[0], decision: payload.decision, rationale: payload.rationale, decided_at: DEMO_NOW });
};

export const getDemoContribution = () => copy({ active_minutes: 38, safely_resolved_cases: 12, information_cycles: 3, disposition: { approved: 8, amended: 2, escalated: 2 }, outcome_completeness: 'Server-measured; 9 of 12 cases have returned outcome evidence', minutes_per_episode: 14, attributable_resource_cost: 'Server metric only' });

export const getDemoInitialState = () => ({ now: DEMO_NOW, ids: DEMO_IDS, synthetic: true });

export const isDemoProposal = (proposalId) => asText(proposalId).startsWith('proposal-');
