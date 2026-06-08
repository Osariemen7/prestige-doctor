import {
  buildWhatsAppCompletionCommand,
  buildWhatsAppInboundFollowThroughResult,
  buildPatientHandoffPlan,
  classifyWhatsAppCompletionIntent,
  filterEvidenceForSoapField,
  getAiGovernanceSignals,
  getCaregiverContext,
  getClinicalFeedbackSummary,
  getDoctorApprovalReadiness,
  getDoctorQueuePriority,
  getEvidenceEntries,
  getFollowThroughAttention,
  getFollowThroughOperationalSignals,
  getFollowThroughRecommendedAction,
  getNoteEditBurden,
  getSourceLabel,
  getWhatsAppFollowThroughAgentState,
  summarizeEvidenceSources,
  sortReviewsForDoctorQueue,
} from './aiReviewWorkflow';

describe('source-aware AI review evidence helpers', () => {
  it('flattens nested SOAP evidence while preserving source and field provenance', () => {
    const review = {
      ai_triage: {
        evidence_map: {
          subjective: {
            chief_complaint: {
              quote: 'Headache for three days',
              source_type: 'patient_reported',
              verification_status: 'unverified',
            },
          },
          objective: {
            vitals: [
              {
                value: 'BP 150/90 measured at home',
                source_type: 'patient_reported',
                confidence_score: 0.62,
              },
            ],
          },
        },
      },
    };

    const entries = getEvidenceEntries(review);
    const objectiveVitals = filterEvidenceForSoapField(entries, 'objective', 'vitals');
    const subjectiveComplaint = filterEvidenceForSoapField(entries, 'subjective', 'chief_complaint');

    expect(objectiveVitals).toHaveLength(1);
    expect(objectiveVitals[0]).toMatchObject({
      section: 'objective',
      field: 'vitals',
      quote: 'BP 150/90 measured at home',
    });
    expect(getSourceLabel(objectiveVitals[0])).toBe('Patient reported');
    expect(subjectiveComplaint).toHaveLength(1);
  });

  it('summarizes patient/caregiver and AI-inferred evidence as needing verification', () => {
    const summary = summarizeEvidenceSources([
      {
        section: 'assessment',
        field: 'differential',
        quote: 'Possible pneumonia based on cough and fever',
        source_type: 'ai_inferred',
      },
      {
        section: 'subjective',
        field: 'medications',
        quote: 'Patient says they take amlodipine',
        source_type: 'patient_reported',
      },
    ]);

    expect(summary.count).toBe(2);
    expect(summary.needsVerification).toBe(true);
    expect(summary.sources.map((source) => source.label)).toEqual([
      'AI inferred',
      'Patient reported',
    ]);
  });

  it('does not mark verified clinician and lab evidence as needing verification', () => {
    const summary = summarizeEvidenceSources([
      {
        section: 'objective',
        field: 'exam',
        quote: 'Wheeze heard on auscultation',
        source_type: 'clinician_observed',
      },
      {
        section: 'objective',
        field: 'labs',
        quote: 'HbA1c 8.4%',
        source_type: 'lab_result',
        verification_status: 'verified',
      },
    ]);

    expect(summary.needsVerification).toBe(false);
    expect(summary.sources.map((source) => source.label)).toEqual([
      'Clinician observed',
      'Lab result',
    ]);
    expect(summary.confidenceLabel).toBe('Verified');
  });

  it('blocks AI triage approval when source labels or patient identity are missing', () => {
    const readiness = getDoctorApprovalReadiness({
      origin: 'ai_triage',
      ai_triage: {
        generated_note: {
          subjective: { history: 'Patient reports abdominal pain.' },
        },
      },
      patient_first_name: 'Jane',
    });

    expect(readiness.canApprove).toBe(false);
    expect(readiness.blockers.map((item) => item.id)).toEqual([
      'patient_identity',
      'source_labels',
    ]);
  });

  it('allows approval when identity, source labels, and emergency gates are clear', () => {
    const readiness = getDoctorApprovalReadiness(
      {
        origin: 'ai_triage',
        ai_triage: {
          evidence_map: {
            subjective: [
              {
                field: 'history',
                quote: 'Patient reports improving cough.',
                source_type: 'patient_reported',
              },
            ],
          },
        },
      },
      {
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '+2348012345678',
      }
    );

    expect(readiness.canApprove).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.warnings.map((item) => item.id)).toContain('source_verification');
  });

  it('summarizes doctor feedback and note edits into governance signals', () => {
    const review = {
      origin: 'ai_triage',
      patient_first_name: 'Jane',
      patient_last_name: 'Doe',
      patient_phone_number: '+2348012345678',
      ai_triage: {
        generated_note: {
          assessment: 'Likely viral upper respiratory infection.',
          plan: 'Rest, fluids, paracetamol, routine follow-up.',
        },
        evidence_map: {
          subjective: [
            {
              quote: 'Cough and fever for five days.',
              source_type: 'patient_reported',
            },
          ],
        },
      },
      doctor_note: {
        assessment: 'Possible pneumonia with persistent fever.',
        plan: 'Order chest x-ray, CBC, start antibiotics if bacterial features persist, follow up in 24 hours.',
      },
    };

    const governance = getAiGovernanceSignals(review, {
      feedback: {
        accepted_ai_diagnosis: false,
        accepted_ai_plan: false,
        correction_severity: 'major',
        correction_categories: ['diagnosis_correction', 'investigation_or_referral'],
        safety_score: 2,
      },
      decision: 'edit_and_approve',
    });

    expect(governance.qualityRisk).toBe('high');
    expect(governance.acceptanceState).toBe('corrected');
    expect(governance.feedbackCaptured).toBe(true);
    expect(governance.feedbackSummary.hasMajorCorrection).toBe(true);
    expect(governance.editBurden.meaningfulEdits).toBe(true);
    expect(governance.sourceVerificationCount).toBe(1);
    expect(governance.reasons).toEqual(expect.arrayContaining([
      'Major or low-score doctor correction recorded',
    ]));
  });

  it('treats clean accepted AI feedback as low governance risk when sources are verified', () => {
    const governance = getAiGovernanceSignals(
      {
        origin: 'ai_triage',
        patient_first_name: 'Jane',
        patient_last_name: 'Doe',
        patient_phone_number: '+2348012345678',
        ai_triage: {
          generated_note: {
            assessment: 'Improving cough.',
            plan: 'Supportive care.',
          },
          evidence_map: {
            subjective: [
              {
                quote: 'Improving cough confirmed during nurse call.',
                source_type: 'clinician_verified',
                verification_status: 'verified',
              },
            ],
          },
        },
        doctor_note: {
          assessment: 'Improving cough.',
          plan: 'Supportive care.',
        },
      },
      {
        feedback: {
          accepted_ai_diagnosis: true,
          accepted_ai_plan: true,
          correction_severity: 'none',
          safety_score: 5,
          diagnostic_quality_score: 5,
          management_quality_score: 5,
        },
        decision: 'approve_as_is',
      }
    );

    expect(governance.qualityRisk).toBe('low');
    expect(governance.acceptanceState).toBe('accepted');
    expect(governance.feedbackSummary.averageScore).toBe(5);
    expect(governance.editBurden.level).toBe('minimal');
    expect(governance.reasons).toEqual([]);
  });

  it('estimates note edit burden from draft and final note text', () => {
    const minimal = getNoteEditBurden(
      { assessment: 'Stable malaria symptoms improving', plan: 'Continue artemether lumefantrine' },
      { assessment: 'Stable malaria symptoms improving', plan: 'Continue artemether lumefantrine' }
    );
    const heavy = getNoteEditBurden(
      { assessment: 'Viral illness', plan: 'Rest and fluids' },
      { assessment: 'Severe dehydration with possible sepsis', plan: 'Urgent IV fluids, blood cultures, antibiotics, emergency transfer' }
    );
    const summary = getClinicalFeedbackSummary({
      accepted_ai_diagnosis: false,
      correction_severity: 'critical',
      management_quality_score: 1,
    });

    expect(minimal.level).toBe('minimal');
    expect(heavy.meaningfulEdits).toBe(true);
    expect(heavy.level).toBe('heavy');
    expect(summary.hasMajorCorrection).toBe(true);
  });

  it('blocks caregiver-submitted approval when recipient authorization is denied', () => {
    const review = {
      origin: 'ai_triage',
      submitted_by: 'caregiver',
      caregiver_relationship: 'daughter',
      caregiver_authorized: false,
      patient_first_name: 'Mary',
      patient_last_name: 'Okafor',
      patient_phone_number: '+2348012345678',
      ai_triage: {
        evidence_map: {
          subjective: [
            {
              quote: 'Mother has had a cough for three days.',
              source_type: 'caregiver_reported',
            },
          ],
        },
      },
    };

    expect(getCaregiverContext(review)).toMatchObject({
      isCaregiverSubmitted: true,
      relationship: 'daughter',
      authorizedRecipient: false,
      authorizationBlocked: true,
    });

    const readiness = getDoctorApprovalReadiness(review);
    expect(readiness.canApprove).toBe(false);
    expect(readiness.blockers.map((item) => item.id)).toContain('caregiver_authorization');
  });

  it('warns when caregiver triage lacks patient presence or identity confirmation', () => {
    const readiness = getDoctorApprovalReadiness({
      origin: 'ai_triage',
      submitted_by: 'caregiver',
      caregiver_relationship: 'son',
      caregiver_authorized: true,
      patient_present: false,
      patient_identity_confirmed: false,
      patient_first_name: 'Mary',
      patient_last_name: 'Okafor',
      patient_phone_number: '+2348012345678',
      ai_triage: {
        evidence_map: {
          subjective: [
            {
              quote: 'She reports dizziness through her son.',
              source_type: 'caregiver_reported',
            },
          ],
        },
      },
    });

    expect(readiness.canApprove).toBe(true);
    expect(readiness.warnings.map((item) => item.id)).toEqual(expect.arrayContaining([
      'caregiver_patient_identity',
      'caregiver_patient_presence',
    ]));
  });

  it('prioritizes emergency risk, patient waiting, SLA pressure, and ready AI reviews over routine work', () => {
    const now = Date.parse('2026-06-08T12:00:00Z');
    const reviews = [
      {
        public_id: 'routine',
        created: '2026-06-08T11:00:00Z',
        review_status: 'pending',
      },
      {
        public_id: 'ready-ai',
        origin: 'ai_triage',
        created: '2026-06-08T10:00:00Z',
        ai_triage: {
          evidence_map: {
            subjective: [{ quote: 'Mild cough is improving.', source_type: 'patient_reported' }],
          },
        },
      },
      {
        public_id: 'sla-pressure',
        created: '2026-06-06T12:00:00Z',
        review_status: 'pending',
      },
      {
        public_id: 'patient-waiting',
        created: '2026-06-08T08:00:00Z',
        last_patient_message_at: '2026-06-08T10:30:00Z',
      },
      {
        public_id: 'emergency',
        created: '2026-06-08T11:55:00Z',
        urgency_level: 'emergency',
      },
    ];

    expect(sortReviewsForDoctorQueue(reviews, { now }).map((review) => review.public_id)).toEqual([
      'emergency',
      'patient-waiting',
      'sla-pressure',
      'ready-ai',
      'routine',
    ]);
  });

  it('returns queue priority labels that explain why a review floated up', () => {
    const priority = getDoctorQueuePriority(
      {
        public_id: 'patient-waiting',
        last_patient_message_at: '2026-06-08T10:00:00Z',
      },
      { now: Date.parse('2026-06-08T12:00:00Z') }
    );

    expect(priority.label).toBe('Patient waiting');
    expect(priority.reasons[0]).toBe('Patient response waiting 2.0h');
  });

  it('detects overdue and stalled patient follow-through needing doctor attention', () => {
    const now = Date.parse('2026-06-08T12:00:00Z');

    const overdue = getFollowThroughAttention(
      {
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [
            { title: 'Complete CBC', status: 'pending', due_at: '2026-06-08T10:00:00Z' },
          ],
        },
      },
      { now }
    );

    expect(overdue).toMatchObject({
      needsAttention: true,
      status: 'overdue',
      color: 'warning',
    });
    expect(overdue.reasons[0]).toBe('1 task overdue');

    const stalled = getFollowThroughAttention(
      {
        patient_follow_through: {
          sent_at: '2026-06-06T08:00:00Z',
          total_tasks: 2,
          completed_tasks: 0,
          remaining_tasks: 2,
          tasks: [
            { title: 'Take medication', status: 'pending' },
            { title: 'Book follow-up', status: 'pending' },
          ],
        },
      },
      { now }
    );

    expect(stalled).toMatchObject({
      needsAttention: true,
      status: 'stalled',
      shortLabel: 'Stalled',
    });
    expect(stalled.reasons[0]).toBe('No completed task after 52.0h');
  });

  it('surfaces WhatsApp safety escalation above normal follow-through progress', () => {
    const attention = getFollowThroughAttention({
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        total_tasks: 2,
        completed_tasks: 1,
        remaining_tasks: 1,
        latest_completion: {
          completed: false,
          source_channel: 'whatsapp_ai_agent',
          completion_intent: 'safety_escalation',
          note: 'The chest pain is worse and I cannot breathe',
          metadata: {
            should_escalate: true,
            escalation_action: 'escalate_to_doctor_queue',
          },
        },
        tasks: [
          { title: 'Take medicine', status: 'completed' },
          { title: 'Book follow-up', status: 'pending' },
        ],
      },
    });

    expect(attention).toMatchObject({
      needsAttention: true,
      status: 'safety_escalation',
      severity: 'error',
      shortLabel: 'Escalate',
      nextAction: 'Review the patient or caregiver message and escalate clinically before continuing routine follow-through.',
    });
    expect(attention.reasons[0]).toBe('The chest pain is worse and I cannot breathe');
  });

  it('surfaces WhatsApp unable-to-complete barriers as follow-through attention', () => {
    const attention = getFollowThroughAttention({
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        total_tasks: 2,
        completed_tasks: 0,
        remaining_tasks: 2,
        tasks: [
          {
            title: 'Complete CBC',
            status: 'pending',
            completion: {
              completed: false,
              source_channel: 'whatsapp_ai_agent',
              completion_intent: 'unable_to_complete',
              note: 'The lab was closed and I could not do it',
            },
          },
          { title: 'Return for follow-up', status: 'pending' },
        ],
      },
    }, { now: Date.parse('2026-06-08T12:00:00Z') });

    expect(attention).toMatchObject({
      needsAttention: true,
      status: 'completion_barrier',
      severity: 'warning',
      shortLabel: 'Barrier',
    });
    expect(attention.reasons[0]).toBe('The lab was closed and I could not do it');
  });

  it('floats WhatsApp safety escalations ahead of routine doctor action in the queue', () => {
    const now = Date.parse('2026-06-08T12:00:00Z');
    const reviews = [
      {
        public_id: 'routine',
        created: '2026-06-08T10:00:00Z',
        requires_doctor_action: true,
      },
      {
        public_id: 'whatsapp-safety',
        created: '2026-06-08T11:00:00Z',
        is_finalized: true,
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          total_tasks: 2,
          completed_tasks: 1,
          remaining_tasks: 1,
          latest_completion: {
            source_channel: 'whatsapp_ai_agent',
            completion_intent: 'safety_escalation',
            note: 'Patient says symptoms are worse',
            metadata: { should_escalate: true },
          },
          tasks: [{ title: 'Return if worse', status: 'pending' }],
        },
      },
    ];

    expect(sortReviewsForDoctorQueue(reviews, { now }).map((review) => review.public_id)).toEqual([
      'whatsapp-safety',
      'routine',
    ]);
    expect(getDoctorQueuePriority(reviews[1], { now })).toMatchObject({
      label: 'Follow-up risk',
      color: 'error',
    });
  });

  it('summarizes WhatsApp follow-through operational signals for dashboards', () => {
    const safetySignals = getFollowThroughOperationalSignals({
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        latest_completion: {
          source_channel: 'whatsapp_ai_agent',
          completion_intent: 'safety_escalation',
          note: 'Breathing is worse',
          metadata: { should_escalate: true },
        },
        tasks: [{ title: 'Return if worse', status: 'pending' }],
      },
    });
    const barrierSignals = getFollowThroughOperationalSignals({
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        tasks: [
          {
            title: 'Complete CBC',
            status: 'pending',
            completion: {
              source_channel: 'whatsapp_ai_agent',
              completion_intent: 'unable_to_complete',
              completed: false,
              note: 'No transport',
            },
          },
        ],
      },
    });

    expect(safetySignals).toMatchObject({
      needsAttention: true,
      status: 'safety_escalation',
      isSafetyEscalation: true,
      isCompletionBarrier: false,
      isPatientOutcomeRisk: true,
      reason: 'Breathing is worse',
    });
    expect(barrierSignals).toMatchObject({
      needsAttention: true,
      status: 'completion_barrier',
      isSafetyEscalation: false,
      isCompletionBarrier: true,
      isPatientOutcomeRisk: true,
      reason: 'No transport',
    });
  });

  it('recommends provider escalation instead of patient messaging for WhatsApp safety concerns', () => {
    const action = getFollowThroughRecommendedAction({
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        latest_completion: {
          source_channel: 'whatsapp_ai_agent',
          completion_intent: 'safety_escalation',
          note: 'Breathing is worse',
          metadata: { should_escalate: true },
        },
        tasks: [{ title: 'Return if worse', status: 'pending' }],
      },
    });

    expect(action).toMatchObject({
      id: 'escalate_follow_through_safety',
      buttonLabel: 'Record Safety Escalation',
      severity: 'error',
      shouldSendPatientMessage: false,
      deliveryChannels: ['provider_queue'],
      payload: {
        escalation_action: 'escalate_to_doctor_queue',
        patient_message_delivery: false,
        create_provider_task: true,
      },
    });
  });

  it('recommends a targeted WhatsApp follow-up for completion barriers', () => {
    const action = getFollowThroughRecommendedAction({
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        tasks: [
          {
            title: 'Complete CBC',
            status: 'pending',
            completion: {
              source_channel: 'whatsapp_ai_agent',
              completion_intent: 'unable_to_complete',
              completed: false,
              note: 'No transport',
            },
          },
        ],
      },
    });

    expect(action).toMatchObject({
      id: 'resolve_completion_barrier',
      buttonLabel: 'Send Barrier Follow-up',
      severity: 'warning',
      shouldSendPatientMessage: true,
      deliveryChannels: ['whatsapp', 'patient_app', 'chat'],
      payload: {
        escalation_action: 'flag_provider_follow_through_barrier',
        collect_barrier_details: true,
      },
    });
  });

  it('tracks WhatsApp AI checklist completion and identifies the next active patient task', () => {
    const state = getWhatsAppFollowThroughAgentState(
      {
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          total_tasks: 3,
          completed_tasks: 1,
          remaining_tasks: 2,
          tasks: [
            {
              title: 'Take morning amlodipine',
              status: 'completed',
              checklist_item_id: 'item-1',
              task_public_id: 'task-abc',
              completion: {
                checklist_item_description: 'Take morning amlodipine',
                completed_at: '2026-06-08T09:00:00Z',
                source_channel: 'whatsapp',
                actor_role: 'ai_agent',
              },
            },
            {
              title: 'Book CBC test',
              status: 'pending',
              checklist_item_id: 'item-2',
              task_public_id: 'task-abc',
              is_next_in_line: true,
            },
            {
              title: 'Return for follow-up',
              status: 'pending',
              checklist_item_id: 'item-3',
              task_public_id: 'task-abc',
            },
          ],
        },
      },
      { now: Date.parse('2026-06-08T12:00:00Z') }
    );

    expect(state.canMarkItemsComplete).toBe(true);
    expect(state.activeTaskReadyForCompletion).toBe(true);
    expect(state.activeChecklistItemId).toBe('item-2');
    expect(state.activeTaskThreadId).toBe('task-abc');
    expect(state.nextTask.title).toBe('Book CBC test');
    expect(state.completedByWhatsAppCount).toBe(1);
    expect(state.latestCompletionChannel).toBe('WhatsApp AI agent');
    expect(state.progress.latestCompletion.checklist_item_description).toBe('Take morning amlodipine');
  });

  it('builds a native checklist completion command for WhatsApp AI', () => {
    const command = buildWhatsAppCompletionCommand({
      public_id: 'review-1',
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        tasks: [
          {
            title: 'Book CBC test',
            status: 'pending',
            checklist_item_id: 'item-2',
            task_public_id: 'task-abc',
            is_next_in_line: true,
          },
        ],
      },
    });

    expect(command).toMatchObject({
      canRecord: true,
      endpoint: '/task-threads/task-abc/checklist-items/item-2/completion/',
      taskPublicId: 'task-abc',
      checklistItemId: 'item-2',
      activeTaskTitle: 'Book CBC test',
      payload: {
        completed: true,
        record_compliance: true,
        source_channel: 'whatsapp_ai_agent',
        actor_role: 'patient',
        completion_intent: 'patient_or_caregiver_confirmed_done',
        metadata: {
          review_public_id: 'review-1',
          completion_loop: 'whatsapp_ai_agent',
          active_task_title: 'Book CBC test',
          should_promote_next_task_after_completion: true,
        },
      },
    });
    expect(command.blockers).toEqual([]);
  });

  it('classifies WhatsApp completion, barrier, and safety escalation messages', () => {
    expect(classifyWhatsAppCompletionIntent('Done, I took the medicine')).toMatchObject({
      intent: 'completed',
      completed: true,
      shouldRecordCompletion: true,
      shouldEscalate: false,
    });
    expect(classifyWhatsAppCompletionIntent('I could not do the lab because transport was unavailable')).toMatchObject({
      intent: 'unable_to_complete',
      completed: false,
      shouldRecordCompletion: true,
      shouldEscalate: true,
      escalation: {
        action: 'flag_provider_follow_through_barrier',
      },
    });
    expect(classifyWhatsAppCompletionIntent('The chest pain is worse and I cannot breathe')).toMatchObject({
      intent: 'safety_escalation',
      completed: false,
      shouldRecordCompletion: false,
      shouldEscalate: true,
    });
  });

  it('converts WhatsApp barrier messages into incomplete checklist command payloads', () => {
    const command = buildWhatsAppCompletionCommand(
      {
        public_id: 'review-1',
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [
            {
              title: 'Complete CBC',
              status: 'pending',
              checklist_item_id: 'item-2',
              task_public_id: 'task-abc',
              is_next_in_line: true,
            },
          ],
        },
      },
      { patientMessage: 'I have not done it because the lab was closed' }
    );

    expect(command.canRecord).toBe(true);
    expect(command.shouldEscalate).toBe(true);
    expect(command.payload).toMatchObject({
      completed: false,
      note: 'I have not done it because the lab was closed',
      record_compliance: true,
      completion_intent: 'unable_to_complete',
      metadata: {
        should_escalate: true,
        escalation_action: 'flag_provider_follow_through_barrier',
      },
    });
  });

  it('blocks WhatsApp safety escalation messages from being marked complete', () => {
    const command = buildWhatsAppCompletionCommand(
      {
        public_id: 'review-1',
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [
            {
              title: 'Take antibiotic',
              status: 'pending',
              checklist_item_id: 'item-2',
              task_public_id: 'task-abc',
              is_next_in_line: true,
            },
          ],
        },
      },
      { patientMessage: 'Pain is getting worse and I feel unsafe' }
    );

    expect(command.canRecord).toBe(false);
    expect(command.shouldEscalate).toBe(true);
    expect(command.blockers.map((item) => item.id)).toContain('safety_escalation_detected');
    expect(command.payload).toMatchObject({
      completed: false,
      record_compliance: false,
      completion_intent: 'safety_escalation',
    });
  });

  it('blocks caregiver WhatsApp completion when checklist ids or authorization are missing', () => {
    const command = buildWhatsAppCompletionCommand(
      {
        public_id: 'review-1',
        submitted_by: 'caregiver',
        caregiver_relationship: 'daughter',
        caregiver_authorized: null,
        patient_follow_through: {
          sent_at: '2026-06-08T08:00:00Z',
          tasks: [
            {
              title: 'Take antibiotic',
              status: 'pending',
              is_next_in_line: true,
            },
          ],
        },
      },
      { actorRole: 'authorized_caregiver' }
    );

    expect(command.canRecord).toBe(false);
    expect(command.endpoint).toBe('');
    expect(command.blockers.map((item) => item.id)).toEqual(expect.arrayContaining([
      'missing_checklist_identifiers',
      'caregiver_authorization_unknown',
    ]));
  });

  it('turns inbound WhatsApp messages into backend-ready completion and escalation decisions', () => {
    const review = {
      public_id: 'review-1',
      patient_follow_through: {
        sent_at: '2026-06-08T08:00:00Z',
        tasks: [
          {
            title: 'Take antibiotic',
            status: 'pending',
            checklist_item_id: 'item-2',
            task_public_id: 'task-abc',
            is_next_in_line: true,
          },
        ],
      },
    };

    const completion = buildWhatsAppInboundFollowThroughResult(review, {
      patientMessage: 'Done, I took the medicine',
    });
    expect(completion).toMatchObject({
      backendAction: 'record_completion',
      shouldRecordCompletion: true,
      shouldEscalate: false,
      command: {
        canRecord: true,
        taskPublicId: 'task-abc',
        checklistItemId: 'item-2',
      },
      auditEvent: {
        kind: 'whatsapp_follow_through_message',
        action: 'record_completion',
        intent: 'completed',
      },
    });

    const safety = buildWhatsAppInboundFollowThroughResult(review, {
      patientMessage: 'Pain is worse and I cannot breathe',
    });
    expect(safety).toMatchObject({
      backendAction: 'escalate_safety_message',
      shouldRecordCompletion: false,
      shouldEscalate: true,
      shouldNotifyProvider: true,
      command: {
        canRecord: false,
      },
      auditEvent: {
        action: 'escalate_safety_message',
        intent: 'safety_escalation',
        escalation_action: 'escalate_to_doctor_queue',
      },
    });
  });

  it('builds patient handoff safety-net, teach-back, and adherence supports for WhatsApp follow-through', () => {
    const handoff = buildPatientHandoffPlan(
      {
        origin: 'ai_triage',
        submitted_by: 'caregiver',
        caregiver_relationship: 'daughter',
        caregiver_authorized: true,
        patient_summary: 'Take the prescribed medication, complete CBC, and return if symptoms worsen.',
        risk_flags: [
          {
            label: 'Chest pain or shortness of breath',
            severity: 'severe',
            description: 'Seek urgent care if this occurs.',
          },
        ],
        missing_information: ['Current temperature'],
      },
      {
        note: {
          plan: {
            safety_net: ['Persistent fever beyond 48 hours'],
            teach_back_prompts: ['Tell me how you will take the medication today.'],
          },
        },
        tasks: [
          { type: 'medication', title: 'Take amoxicillin' },
          { type: 'investigation', title: 'Complete CBC' },
        ],
      }
    );

    expect(handoff.patientSummary).toContain('Take the prescribed medication');
    expect(handoff.safetyNet.map((item) => item.label)).toEqual(expect.arrayContaining([
      'Persistent fever beyond 48 hours',
      'Chest pain or shortness of breath',
    ]));
    expect(handoff.escalationTriggers.some((item) => item.action === 'seek_urgent_care')).toBe(true);
    expect(handoff.teachBackPrompts.map((item) => item.label)).toEqual(expect.arrayContaining([
      'Tell me how you will take the medication today.',
      'Please reply with when you will complete: Take amoxicillin.',
    ]));
    expect(handoff.adherenceSupports.map((item) => item.id)).toEqual(expect.arrayContaining([
      'caregiver-support',
      'medication-support',
      'investigation-support',
      'missing-info-support',
    ]));
  });

  it('adds a default safety-net when the doctor plan has no explicit triggers', () => {
    const handoff = buildPatientHandoffPlan(
      { patient_summary: 'Continue hydration and rest.' },
      {
        tasks: [
          { type: 'task', title: 'Drink fluids' },
        ],
      }
    );

    expect(handoff.safetyNet).toHaveLength(1);
    expect(handoff.safetyNet[0]).toMatchObject({
      action: 'contact_care_team',
      severity: 'warning',
      source: 'default',
    });
    expect(handoff.teachBackPrompts.length).toBeGreaterThan(0);
  });

  it('falls back to the first incomplete task when backend checklist rows are not returned yet', () => {
    const state = getWhatsAppFollowThroughAgentState(
      {},
      {
        tasks: [
          { title: 'Take medication', status: 'completed' },
          { title: 'Check blood pressure', status: 'pending' },
        ],
      }
    );

    expect(state.canMarkItemsComplete).toBe(true);
    expect(state.activeTaskReadyForCompletion).toBe(false);
    expect(state.nextTask.title).toBe('Check blood pressure');
    expect(state.nextAction).toBe('Ask whether "Check blood pressure" is complete, then promote the next task.');
  });

  it('floats stalled follow-through above routine SLA pressure', () => {
    const now = Date.parse('2026-06-08T12:00:00Z');
    const reviews = [
      {
        public_id: 'sla-pressure',
        created: '2026-06-06T12:00:00Z',
        review_status: 'pending',
      },
      {
        public_id: 'stalled-follow-through',
        created: '2026-06-08T11:00:00Z',
        review_status: 'finalized',
        is_finalized: true,
        patient_follow_through: {
          sent_at: '2026-06-06T08:00:00Z',
          total_tasks: 1,
          completed_tasks: 0,
          remaining_tasks: 1,
          tasks: [{ title: 'Check blood pressure', status: 'pending' }],
        },
      },
    ];

    expect(getDoctorQueuePriority(reviews[1], { now })).toMatchObject({
      label: 'Follow-up risk',
      color: 'warning',
    });
    expect(sortReviewsForDoctorQueue(reviews, { now }).map((review) => review.public_id)).toEqual([
      'stalled-follow-through',
      'sla-pressure',
    ]);
  });

  it('orders same-priority unresolved reviews by oldest first', () => {
    const now = Date.parse('2026-06-08T12:00:00Z');
    const reviews = [
      { public_id: 'newer', created: '2026-06-08T11:30:00Z', review_status: 'pending' },
      { public_id: 'older', created: '2026-06-08T10:30:00Z', review_status: 'pending' },
    ];

    expect(sortReviewsForDoctorQueue(reviews, { now }).map((review) => review.public_id)).toEqual([
      'older',
      'newer',
    ]);
  });
});
