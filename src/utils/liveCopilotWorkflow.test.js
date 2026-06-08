import {
  LIVE_COPILOT_DOCTOR_APPROVED_STATUS,
  LIVE_COPILOT_DRAFT_APPROVAL_STATUS,
  LIVE_COPILOT_DRAFT_SOURCE,
  approveAllCopilotDraftActions,
  buildCopilotDraftSyncPayload,
  buildRealtimeSessionPayload,
  filterPatientFacingApprovedActions,
  getIntervalHoursFromCopilotValue,
  getLiveCopilotModeConfig,
  getPendingCopilotDraftActions,
  isCopilotDraftPendingApproval,
  markCopilotActionDoctorApproved,
  normalizeTriageContextForRealtime,
} from './liveCopilotWorkflow';

describe('live copilot workflow payload helpers', () => {
  it('builds a focused triage-clarification realtime payload with safety boundaries', () => {
    const payload = buildRealtimeSessionPayload({
      mode: 'triage_clarification',
      reviewOrigin: 'ai_triage',
      patientId: 42,
      patientName: 'Jane Doe',
      chiefComplaint: 'Chest discomfort',
      continuityBrief: 'AI triage completed before doctor review.',
      triageContext: {
        urgency: { value: 'urgent', label: 'Urgent' },
        missingInformation: [
          { question: 'Does the discomfort worsen with exertion?', reason: 'Rule out cardiac pattern' },
        ],
        riskFlags: [
          { label: 'Chest pain red flag', severity: 'urgent', evidence: 'Patient reports diaphoresis' },
        ],
        evidenceEntries: [
          {
            section: 'subjective',
            field: 'history',
            source_type: 'patient_reported',
            quote: 'Pain started yesterday evening',
          },
        ],
        approvalReadiness: {
          canApprove: false,
          blockers: [{ id: 'emergency_risk', label: 'Escalate unresolved emergency risk before approval.', severity: 'error' }],
          warnings: [{ id: 'source_verification', label: 'Verify patient-reported evidence.', severity: 'warning' }],
        },
      },
    });

    expect(payload).toMatchObject({
      mode: 'triage_clarification',
      review_origin: 'ai_triage',
      patient_id: 42,
      patient_name: 'Jane Doe',
      chief_complaint: 'Chest discomfort',
      capability_expectations: {
        draft_only: true,
        doctor_approval_required: true,
        preserve_source_labels: true,
      },
    });
    expect(payload.triage_context.missing_information[0]).toEqual({
      question: 'Does the discomfort worsen with exertion?',
      reason: 'Rule out cardiac pattern',
    });
    expect(payload.triage_context.risk_flags[0]).toEqual({
      label: 'Chest pain red flag',
      severity: 'urgent',
      evidence: 'Patient reports diaphoresis',
    });
    expect(payload.triage_context.evidence_anchors[0]).toMatchObject({
      section: 'subjective',
      field: 'history',
      source_type: 'patient_reported',
    });
    expect(payload.triage_context.clarification_focus).toMatchObject({
      avoid_repeating_completed_intake: true,
      stop_when_approval_blockers_are_resolved: true,
    });
    expect(payload.triage_context.clarification_focus.focus_items).toEqual([
      'Safety: Chest pain red flag',
      'Ask: Does the discomfort worsen with exertion?',
      'Approval blocker: Escalate unresolved emergency risk before approval.',
    ]);
    expect(payload.triage_context.safety_boundaries).toMatchObject({
      draft_only: true,
      doctor_approval_required: true,
      no_autonomous_prescribing: true,
      no_autonomous_finalization: true,
      preserve_source_labels: true,
    });
  });

  it('does not add clarification focus for a normal live encounter', () => {
    const context = normalizeTriageContextForRealtime({
      missingInformation: ['Current medications'],
    }, 'live_encounter');

    expect(context.clarification_focus).toBeUndefined();
    expect(context.missing_information).toEqual([
      { question: 'Current medications' },
    ]);
  });

  it('returns mode-specific labels for the doctor UI', () => {
    expect(getLiveCopilotModeConfig('triage_clarification')).toMatchObject({
      title: 'AI Triage Clarification',
      startLabel: 'Start Clarification',
      briefTitle: 'Clarification Brief',
    });
    expect(getLiveCopilotModeConfig('live_encounter')).toMatchObject({
      title: 'Live Encounter',
      startLabel: 'Start Consult',
    });
  });

  it('builds doctor-approval draft sync payloads from selected copilot actions', () => {
    const payload = buildCopilotDraftSyncPayload({
      mode: 'triage_clarification',
      reviewOrigin: 'ai_triage',
      prescriptions: [
        { name: 'Paracetamol IV', dosage: '1g', interval: 'Q8h', selected: true },
        { name: 'Antibiotic option', dosage: '500mg', interval: 'Q12h', selected: false },
      ],
      investigations: [
        { name: 'CBC with Diff', reason: 'Assess infection', selected: true },
      ],
      otherActions: [
        { type: 'referral', name: 'Surgery review', notes: 'Urgent consult', selected: true },
      ],
    });

    expect(payload).toMatchObject({
      source: LIVE_COPILOT_DRAFT_SOURCE,
      approval_status: LIVE_COPILOT_DRAFT_APPROVAL_STATUS,
      draft_only: true,
      requires_doctor_approval: true,
      sync_intent: 'doctor_note_draft_for_approval',
    });
    expect(payload.prescriptions).toHaveLength(1);
    expect(payload.prescriptions[0]).toMatchObject({
      medication_name: 'Paracetamol IV',
      route: 'intravenous',
      interval: 8,
      source: LIVE_COPILOT_DRAFT_SOURCE,
      approval_status: LIVE_COPILOT_DRAFT_APPROVAL_STATUS,
      requires_doctor_approval: true,
      clinical_action_kind: 'prescription',
      source_mode: 'triage_clarification',
      review_origin: 'ai_triage',
    });
    expect(payload.investigations[0]).toMatchObject({
      test_type: 'CBC with Diff',
      clinical_action_kind: 'investigation',
      draft_only: true,
    });
    expect(payload.otherActions[0]).toMatchObject({
      action_type: 'referral',
      name: 'Surgery review',
      clinical_action_kind: 'other_action',
      draft_only: true,
    });
  });

  it('parses common copilot interval strings safely', () => {
    expect(getIntervalHoursFromCopilotValue('Q8h')).toBe(8);
    expect(getIntervalHoursFromCopilotValue('every 12 hours')).toBe(12);
    expect(getIntervalHoursFromCopilotValue('As directed', 6)).toBe(6);
  });

  it('distinguishes pending realtime drafts from doctor-approved copilot actions', () => {
    const draft = buildCopilotDraftSyncPayload({
      prescriptions: [{ name: 'Oral rehydration salts', selected: true }],
    }).prescriptions[0];

    expect(isCopilotDraftPendingApproval(draft)).toBe(true);

    const approved = markCopilotActionDoctorApproved(draft, {
      approved_at: '2026-06-08T09:00:00.000Z',
      approved_by: 'doctor-1',
    });

    expect(approved).toMatchObject({
      approval_status: LIVE_COPILOT_DOCTOR_APPROVED_STATUS,
      requires_doctor_approval: false,
      draft_only: false,
      doctor_approved: true,
      approved_by: 'doctor-1',
    });
    expect(isCopilotDraftPendingApproval(approved)).toBe(false);
  });

  it('finds and approves pending copilot draft actions across note sections', () => {
    const draftPayload = buildCopilotDraftSyncPayload({
      prescriptions: [{ name: 'Paracetamol', selected: true }],
      investigations: [{ name: 'CBC', selected: true }],
      otherActions: [{ name: 'Diet counselling', selected: true }],
    });
    const note = {
      prescription: draftPayload.prescriptions,
      investigation: draftPayload.investigations,
      other_actions: draftPayload.otherActions,
    };

    expect(getPendingCopilotDraftActions(note).map((item) => item.kind)).toEqual([
      'prescription',
      'investigation',
      'other_action',
    ]);

    const approvedNote = approveAllCopilotDraftActions(note, {
      approved_at: '2026-06-08T10:00:00.000Z',
    });

    expect(getPendingCopilotDraftActions(approvedNote)).toHaveLength(0);
    expect(approvedNote.prescription[0]).toMatchObject({
      approval_status: LIVE_COPILOT_DOCTOR_APPROVED_STATUS,
      doctor_approved: true,
    });
  });

  it('keeps pending realtime drafts out of patient-facing follow-through lists', () => {
    const pendingDraft = buildCopilotDraftSyncPayload({
      prescriptions: [{ name: 'Antibiotic option', selected: true }],
    }).prescriptions[0];
    const approvedDraft = markCopilotActionDoctorApproved(pendingDraft, {
      approved_at: '2026-06-08T11:00:00.000Z',
    });
    const manualTask = { name: 'Hydration advice' };

    expect(filterPatientFacingApprovedActions([pendingDraft, approvedDraft, manualTask])).toEqual([
      approvedDraft,
      manualTask,
    ]);
  });
});
