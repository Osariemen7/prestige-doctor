# AI Triage and Realtime Encounter End-to-End Implementation Plan

## Purpose

Prestige should treat AI-generated medical reviews and live doctor encounters as one connected clinical loop:

1. A patient or caregiver chats with an AI triage agent.
2. The AI creates a structured medical review with evidence, suggested subjective/objective sections, assessment, plan, risk flags, and missing data.
3. The doctor reviews the generated medical review.
4. The doctor approves as-is, edits and approves, requests more information, converts to a live encounter, or escalates.
5. The approved review becomes an official clinical artifact with patient instructions, orders, follow-up, reminders, and audit trail.

This turns intake, documentation, doctor review, patient communication, and follow-through into one workflow. The enterprise value is not just faster notes. It is safer throughput, better patient follow-through, doctor oversight at scale, and auditable care.

## Product Principles

- Doctors remain the final clinical authority.
- AI should reduce blank-page work, not hide uncertainty.
- Every AI claim must have a source: patient report, caregiver report, uploaded media, prior record, device reading, clinician observation, or model inference.
- Objective findings must be labeled carefully. A patient-reported blood pressure is not the same as a clinician-measured vital sign.
- The default doctor experience should be fast review and approval, with easy correction.
- The patient experience should not end at triage. It should end with clear next steps, follow-up, reminders, and escalation when needed.
- The hospital experience should include governance, auditability, quality metrics, and predictable workflows.

## Current Repo Anchors

The current app already contains many of the required building blocks:

- `src/components/ReviewsHome.jsx`
  - Unified documentation queue and detail shell.
  - Review status badges.
  - Live visit readiness, callback state, live artifact counts, and review stream refresh.

- `src/components/ReviewDetail.jsx`
  - Review detail workflow.
  - Doctor note display and editing.
  - Finalization.
  - Patient summary.
  - Live visit context.
  - Visual captures.
  - Follow-up actions.
  - Booking request flow.
  - Clinical feedback scores for AI-generated reviews.

- `src/components/RecordingModal.jsx`
  - Current batch-style audio capture.
  - Background processing.
  - Existing note and existing transcript support.

- `src/components/LiveCopilotDashboard.jsx`
  - Current live copilot surface.
  - Transcript feed.
  - Differential suggestions.
  - Probing questions.
  - Medication, investigation, and clinical action draft trays.
  - Sync back into the doctor note.

- `src/services/geminiLiveService.js`
  - Existing service shape for live instructions, function schemas, ephemeral token creation, and tool execution.
  - This can guide the OpenAI Realtime service shape, while replacing provider-specific assumptions.

- `src/components/BookAppointmentModal.jsx`
  - Patient self-booking and callback request loop.

## OpenAI Realtime Model Strategy

Use `gpt-realtime-mini` for low-latency live encounter assistance. The official model page describes it as a cost-efficient GPT Realtime model that supports realtime audio and text over WebRTC, WebSocket, or SIP; it also supports function calling and a 32,000 token context window. It supports text input/output, image input, and audio input/output, but not structured outputs.

Sources:

- https://platform.openai.com/docs/models/gpt-realtime-mini
- https://platform.openai.com/docs/guides/realtime/
- https://platform.openai.com/docs/guides/realtime-server-controls

Use it for:

- Live doctor-patient encounters.
- Hybrid clarification calls after AI chat triage.
- Low-latency patient/caregiver voice clarification.
- Live question coaching, transcript capture, and action drafting.

Do not rely on raw realtime model output as the final structured medical record. Because `gpt-realtime-mini` does not support structured outputs, use backend validation, function calls, schema normalization, and doctor approval before saving official clinical artifacts.

Recommended pattern:

- Browser or mobile app uses WebRTC for audio.
- Backend creates short-lived realtime sessions and controls business logic.
- Backend opens a sideband server connection for tool calls, instruction updates, guardrails, and audit logging.
- Tool calls create draft objects first; final writes require doctor approval.

## Target Workflows

### Workflow A: AI Chat Triage to Doctor Approval

This is the workflow described by the user and should be first-class.

1. Patient or caregiver starts AI chat triage.
2. AI collects symptoms, timeline, severity, red flags, medications, allergies, relevant history, vitals if available, photos/files if needed, and patient goal.
3. AI creates a draft `MedicalReview` with `origin = ai_triage`.
4. Review enters doctor queue as `pending_doctor_review`.
5. Doctor opens review detail.
6. Doctor sees a review cockpit:
   - patient or caregiver story
   - AI-generated subjective section
   - reported objective data
   - AI-suggested assessment
   - AI-suggested plan
   - missing information
   - red flags
   - evidence links
   - suggested patient response
   - suggested follow-up or escalation
7. Doctor chooses one action:
   - Approve as-is
   - Edit and approve
   - Request more information
   - Convert to live encounter
   - Escalate
   - Reject or close
8. Approved review becomes official documentation.
9. Patient receives next steps.
10. System tracks whether the patient completes the plan.

### Workflow B: Live Encounter Documentation and Assistance

1. Doctor starts a live encounter from a review or new patient.
2. App starts an OpenAI Realtime session using `gpt-realtime-mini`.
3. The session is preloaded with patient context, current review, prior summaries, medications, allergies, labs, and hospital instructions.
4. During the encounter, the AI drafts:
   - transcript
   - SOAP note sections
   - differentials and uncertainty
   - missing questions
   - medication, investigation, referral, procedure, and counselling drafts
   - patient education points
   - follow-up plan
5. Doctor reviews the generated content.
6. Doctor approves final note, draft clinical actions, patient summary, and follow-up.
7. Patient receives instructions and the follow-through loop starts.

### Workflow C: Hybrid AI Triage to Live Clarification

1. Patient or caregiver completes AI chat triage.
2. AI generates a review but marks unresolved risk or missing information.
3. Doctor opens the review and clicks `Convert to live encounter`.
4. `gpt-realtime-mini` starts with the triage summary already loaded.
5. The live copilot focuses only on unresolved questions and risk clarification.
6. Doctor approves the final review after live clarification.

This hybrid flow is a strong hospital value proposition because doctors do not repeat the whole intake. They only clarify what matters.

## Review Origins and Status Model

Add or standardize these review origins:

- `ai_triage`: generated from patient or caregiver chat.
- `live_encounter`: generated from doctor-patient live audio/video/in-person encounter.
- `hybrid`: AI triage reviewed and clarified through a live encounter.
- `manual`: doctor-created review without AI intake.
- `imported`: review created from imported records or external documentation.

Standardize these statuses:

- `draft_from_ai`: AI draft exists but not queued for doctor yet.
- `pending_doctor_review`: doctor needs to review.
- `in_review`: doctor has opened or claimed the review.
- `needs_patient_info`: doctor requested additional patient/caregiver information.
- `live_clarification_needed`: doctor or AI determined live clarification is needed.
- `live_clarification_scheduled`: callback or live visit is scheduled.
- `ready_to_approve`: all required information is available.
- `approved`: doctor approved clinical content.
- `finalized`: official record created and patient workflow triggered.
- `escalated`: urgent or specialist workflow started.
- `rejected`: doctor rejected AI draft.
- `closed`: no further action needed.

Map existing statuses to this model:

- Current `pending` maps to `pending_doctor_review`.
- Current `in_review` remains `in_review`.
- Current `approved` remains `approved`.
- Current `finalized` remains `finalized`.
- Current `rejected` remains `rejected`.
- Current live readiness values should remain as secondary state, not replace review status.

## Data Model Additions

### MedicalReview Fields

Add or normalize:

- `origin`
- `review_status`
- `triage_session_public_id`
- `source_channel`: chat, audio, video, in_person, caregiver_chat, imported
- `submitted_by`: patient, caregiver, nurse, doctor, system
- `caregiver_relationship`
- `caregiver_authorized`
- `patient_present`
- `patient_identity_confirmed`
- `chief_complaint`
- `urgency_level`: routine, soon, urgent, emergency
- `risk_flags`
- `missing_information`
- `contraindication_flags`
- `ai_generated_note`
- `doctor_note`
- `patient_summary`
- `doctor_review_summary`
- `evidence_map`
- `recommended_actions`
- `doctor_decision`
- `doctor_edit_diff`
- `approval_metadata`
- `finalization_metadata`
- `patient_follow_through_status`
- `requires_doctor_action`
- `model_metadata`

### Evidence Map Shape

Every generated section should include references to source evidence.

```json
{
  "subjective.history_of_present_illness": [
    {
      "source_type": "patient_chat",
      "source_id": "msg_123",
      "quote": "Chest pain started yesterday evening",
      "confidence": "high"
    }
  ],
  "objective.vitals": [
    {
      "source_type": "patient_reported_vital",
      "label": "Blood pressure",
      "value": "150/95",
      "captured_at": "2026-06-07T09:30:00Z",
      "verification_status": "patient_reported"
    }
  ],
  "assessment.primary_diagnosis": [
    {
      "source_type": "model_inference",
      "supporting_sources": ["msg_123", "msg_126"],
      "confidence": "medium"
    }
  ]
}
```

### Generated Note Source Labels

Use explicit labels:

- `patient_reported`
- `caregiver_reported`
- `clinician_observed`
- `device_reported`
- `lab_result`
- `uploaded_media`
- `prior_record`
- `model_inferred`
- `doctor_verified`

Important rule:

Do not write patient-reported or caregiver-reported data as clinician-observed objective findings. For example, write "Patient reports home BP of 150/95" instead of "BP is 150/95" unless verified by clinic measurement or trusted device integration.

## Backend Contracts

### AI Triage Session

Create or formalize:

```http
POST /ai-triage/sessions/
```

Creates an AI triage session.

Request:

```json
{
  "patient_id": 123,
  "submitted_by": "patient",
  "caregiver_relationship": null,
  "entry_channel": "chat",
  "chief_complaint": "Chest discomfort"
}
```

Response:

```json
{
  "triage_session_public_id": "uuid",
  "status": "active"
}
```

### AI Triage Message

```http
POST /ai-triage/sessions/{public_id}/messages/
```

Stores a patient or caregiver message, runs triage reasoning, and returns the next question or guidance.

### Complete AI Triage and Create Medical Review

```http
POST /ai-triage/sessions/{public_id}/complete/
```

Creates a provider review.

Response:

```json
{
  "medical_review_public_id": "uuid",
  "review_status": "pending_doctor_review",
  "origin": "ai_triage",
  "urgency_level": "soon",
  "requires_doctor_action": true
}
```

### Provider Review Queue

Extend existing:

```http
GET /provider-reviews/?hours=168&origin=ai_triage&status=pending_doctor_review
```

Include:

- origin
- source channel
- urgency level
- risk flags count
- missing information count
- caregiver indicator
- ready-to-approve indicator
- patient follow-through state
- live clarification state

### Provider Review Detail

Extend existing:

```http
GET /provider-reviews/{public_id}/
```

Include:

- full triage transcript
- evidence map
- AI generated note
- editable doctor note
- patient/caregiver source details
- red flags
- missing data
- recommended next actions
- linked live encounter artifacts
- linked patient follow-up workflow

### Doctor Decision Endpoint

Add:

```http
POST /provider-reviews/{public_id}/doctor-decision/
```

Request:

```json
{
  "decision": "approve_as_is",
  "note_payload": {},
  "patient_summary": "Patient-friendly plan",
  "doctor_feedback": {
    "safety_score": 5,
    "diagnostic_quality_score": 4,
    "management_quality_score": 4,
    "patient_communication_score": 5,
    "local_feasibility_score": 4,
    "edit_reason": ""
  },
  "doctor_edit_diff": {
    "level": "minimal",
    "percentChanged": 0,
    "originalWordCount": 120,
    "revisedWordCount": 118
  },
  "approval_metadata": {
    "quality_risk": "low",
    "acceptance_state": "accepted",
    "approval_blocker_count": 0,
    "approval_warning_count": 0,
    "evidence_anchor_count": 8,
    "source_verification_count": 1,
    "edit_burden_level": "minimal",
    "edit_burden_percent": 0
  }
}
```

Supported decisions:

- `approve_as_is`
- `edit_and_approve`
- `request_more_info`
- `convert_to_live_encounter`
- `schedule_callback`
- `escalate`
- `reject`
- `close`

Governance requirements:

- Store `doctor_feedback` and `clinical_training_feedback` with the final doctor decision.
- Store `doctor_edit_diff` as an operational estimate of how much the doctor changed the AI draft.
- Store `approval_metadata.quality_risk`, `acceptance_state`, approval blocker/warning counts, evidence anchor count, source verification count, and edit burden.
- Include these fields in provider review detail and queue status stream so hospital reporting can track AI acceptance, correction burden, source-verification burden, and quality-risk backlog.
- Do not use the governance score to auto-approve clinical content. It is an audit and quality-improvement signal only.

### Request More Information

```http
POST /provider-reviews/{public_id}/request-more-info/
```

Request:

```json
{
  "questions": [
    {
      "question": "How long does the chest discomfort last each time?",
      "reason": "Clarify exertional pattern and urgency"
    }
  ],
  "delivery_channel": "chat"
}
```

### Patient Follow-through

Add a doctor-approved next-steps endpoint:

```http
POST /provider-reviews/{public_id}/patient-follow-through/
```

Purpose:

- Send the approved patient summary.
- Send medication, lab, referral, procedure, and follow-up tasks.
- Track completion status in the patient app and provider queue.
- Feed patient adherence/completion metrics back to hospital reporting.

The frontend sends `patient_summary`, `tasks`, `delivery_channels`, and audit metadata. The backend persists the tasks, delivers them through patient app/chat, and returns follow-through state in provider review detail.

Implementation contract:

- Approved follow-through tasks are stored as `TaskChecklistItem` rows on the patient review workflow task.
- Each returned task includes `checklist_item_id`, `workflow_state`, `is_next_in_line`, `is_completed`, and `responsible_party_role`.
- Provider review detail returns `total_tasks`, `completed_tasks`, and `remaining_tasks` so the review page and enterprise reporting can show actual patient progress.
- Realtime-origin prescriptions, investigations, referrals, procedures, counselling items, and other clinical actions are excluded from follow-through until their metadata shows `approval_status = doctor_approved`, `requires_doctor_approval = false`, and `draft_only = false`.
- The provider review detail payload should preserve `excluded_realtime_draft_action_count` and `pending_realtime_draft_actions` when the frontend blocks or filters pending realtime drafts.

Patient/caregiver completion contract:

```http
POST /task-threads/{task_public_id}/checklist-items/{checklist_item_id}/completion/
```

The endpoint accepts `completed`, `note`, and `record_compliance`, updates the native checklist item, promotes the next task, marks the task objective complete when all items are done, and writes a medical-review-linked `TaskEvent` for provider audit and hospital reporting.

WhatsApp AI agent completion loop:

1. Patient or authorized caregiver replies on WhatsApp with a completion intent, such as "I have taken it", "done", "the lab is completed", or "I could not do it".
2. The agent verifies the active patient/caregiver context, maps the message to the current `is_next_in_line` checklist item, and classifies the reply as completion, unable-to-complete/barrier, safety escalation, or unclear.
3. The backend calls the checklist completion endpoint with `source_channel = whatsapp_ai_agent`, `actor_role = patient` or `authorized_caregiver`, `completed`, `note`, `completion_intent`, and `record_compliance`.
4. If the item is completed, the backend promotes the next incomplete checklist item and returns it to the agent so the conversation can continue with the next step.
5. If the patient reports worsening symptoms or safety-net triggers, the agent does not mark the checklist item complete; it writes a `TaskEvent` and updates provider review follow-through attention so the doctor queue can escalate. If the patient cannot complete a step, record `completed = false` and flag the barrier for provider follow-up.
6. The provider review detail and status stream expose the latest completion, active checklist item, completion channel, and aggregate task progress.

Provider queue behavior:

- `completion_intent = safety_escalation` or `should_escalate = true` becomes error-level follow-through attention and floats above routine doctor action.
- `completion_intent = unable_to_complete`, barrier intents, or WhatsApp `completed = false` become warning-level follow-through attention.
- Queue cards and review detail must describe the latest event as completed, barrier, or safety concern instead of treating every WhatsApp update as a successful completion.
- Queue summaries and enterprise dashboards should expose separate counts for `whatsapp_safety_escalation_count` and `whatsapp_completion_barrier_count`, with filters that open the exact affected reviews.
- The doctor follow-through payload includes a `workflow_action` / `provider_recommended_action`: safety escalations record a provider queue escalation without routine patient messaging, while barriers trigger targeted WhatsApp/patient-app follow-up to collect the obstacle and propose the next step.

The doctor-facing follow-through payload includes:

- `patient_handoff.patient_summary`, `safety_net`, `teach_back_prompts`, `escalation_triggers`, `adherence_supports`, and `whatsapp_agent_goals`.
- `completion_tracking.allowed_channels` with `whatsapp_ai_agent`, `patient_app`, and `chat`.
- `completion_tracking.active_checklist_item_id` and `active_task_public_id` when the backend has persisted checklist rows.
- `agent_follow_up.channel = whatsapp_ai_agent`.
- `agent_follow_up.can_mark_items_complete_by_conversation = true`.
- `agent_follow_up.should_promote_next_task_after_completion = true`.
- `agent_follow_up.teach_back_prompts`, `safety_net_triggers`, and `adherence_supports` so the agent can confirm understanding, screen barriers, and escalate worsening symptoms.
- Escalation rules for worsening symptoms, overdue tasks, and unauthorized caregiver delivery.

The patient/caregiver dashboard uses the magic-link equivalent:

```http
POST /engagement-dashboard/tasks/checklist-completion/?token={dashboard_token}&patient_id={patient_id}
```

`prestige-sub` renders pending checklist rows as interactive completion controls, calls this endpoint, shows success/error feedback, and refreshes the engagement dashboard so patients and caregivers see their progress immediately.

### OpenAI Realtime Session

Add OpenAI-specific session creation:

```http
POST /provider-reviews/{public_id}/realtime-session/
```

Backend responsibilities:

- Authenticate doctor.
- Verify doctor has access to the review.
- Use the backend `.env` `OPENAI_API_KEY` to create a short-lived OpenAI Realtime client secret.
- Set model to `gpt-realtime-mini` or a pinned snapshot after evaluation.
- Load patient/review context into instructions.
- Define available tools.
- Start or attach sideband server connection.
- Return browser-safe connection details only. Never return the standard OpenAI API key.

Response:

```json
{
  "session_id": "rt_session_id",
  "connection_mode": "browser_webrtc",
  "client_secret": {
    "value": "ek_short_lived_client_secret",
    "expires_at": 1780833600
  },
  "model": "gpt-realtime-mini",
  "expires_at": "2026-06-07T12:00:00Z",
  "instructions": "Doctor-safe clinical assistant prompt with patient/review context",
  "client_session_config": {
    "type": "realtime",
    "model": "gpt-realtime-mini"
  }
}
```

Frontend behavior:

- `LiveCopilotDashboard` calls this backend endpoint first.
- If `client_secret.value` is present, the browser opens a WebRTC Realtime call directly to OpenAI using that short-lived secret.
- If no client secret is present, the dashboard stays in local preview mode and clearly labels the session as preview.
- The frontend tolerates both object and string client secret shapes, but the object shape above is preferred because it exposes expiry cleanly.
- The response includes a `capability_contract` with the expected clinical copilot jobs: documentation, missing-data detection, focused doctor questions, evidence-based reasoning, safety flags, patient education drafts, and follow-through tasks for patient/caregiver completion.
- The frontend consumes structured Realtime copilot updates with `type: "prestige.copilot.update"` and applies them to the OpenAI Realtime Brief, ranked differentials, probing questions, draft orders/actions, and patient follow-through suggestions.
- Realtime transcripts should be persisted by the backend after the session through review artifacts or a webhook/sideband path.

### Tool Execution Router

Keep the existing `/runfunction/` pattern, but split tools into permission classes.

Read-only tools:

- `get_patient_context`
- `get_prior_reviews`
- `get_active_medications`
- `get_allergies`
- `get_recent_labs`
- `get_care_plan`

Draft-only tools:

- `draft_note_update`
- `draft_prescription`
- `draft_investigation`
- `draft_referral`
- `draft_patient_summary`
- `draft_follow_up`
- `draft_more_info_questions`

Doctor-approved tools:

- `save_note`
- `finalize_review`
- `place_order`
- `send_patient_summary`
- `request_patient_booking`
- `send_more_info_questions`
- `escalate_case`

Rule:

Realtime tool calls may draft and suggest. Privileged actions require an explicit doctor UI action and backend permission check.

## Frontend Implementation Plan

### ReviewsHome Queue

Update the queue to make AI triage reviews visible and actionable.

Add filters:

- All
- AI Triage
- Live Encounters
- Hybrid
- Urgent
- Needs Info
- Ready to Approve
- Finalized

Add queue card signals:

- `AI Triage`
- `Caregiver`
- `Urgent`
- `Missing Info: N`
- `Red Flags: N`
- `Ready to Approve`
- `Live Clarification Needed`
- `Patient Reply Waiting`
- `Follow-up Pending`

Queue sorting should prioritize:

1. Emergency or urgent flags.
2. High-risk symptoms.
3. Pending doctor SLA.
4. Patient waiting for reply.
5. Ready-to-approve reviews.
6. Oldest unresolved reviews.

### ReviewDetail Approval Cockpit

For `origin = ai_triage`, the detail page should open with an approval cockpit before the long note.

Sections:

- Case summary
- Source and submitter
- Urgency and risk flags
- Missing information
- AI suggested action
- Evidence map
- Patient/caregiver transcript
- Generated SOAP draft
- Suggested orders/actions
- Patient message preview
- Doctor decision bar

Primary actions:

- `Approve as-is`
- `Edit and approve`
- `Request more info`
- `Start live clarification`
- `Escalate`
- `Reject`

The current doctor note editor should remain, but the doctor should not need to scroll through the entire note just to approve a clean low-risk case.

### Source-Aware SOAP Display

SOAP sections should visually distinguish:

- patient-reported facts
- caregiver-reported facts
- clinician-verified facts
- AI-inferred assessment
- missing or uncertain fields

Suggested display:

- Subjective: normal note text plus evidence chips.
- Objective: grouped into `Reported`, `Uploaded/Device`, `Clinician Verified`.
- Assessment: include "supports" and "uncertainties".
- Plan: include "doctor-approved" and "pending approval" state.

### Doctor Decision Bar

Add a sticky action bar for pending AI triage reviews.

Actions:

- Approve
- Edit
- Ask Patient
- Start Live
- Escalate

Approval should:

1. Validate required source labels.
2. Validate required patient identity fields.
3. Validate caregiver relationship, patient presence, identity confidence, and recipient authorization when the review was caregiver-submitted.
4. Validate no unacknowledged red flags.
5. Validate orders require doctor approval.
6. Save doctor note.
7. Finalize or mark approved.
8. Trigger patient plan delivery if selected.

### LiveCopilotDashboard

Replace the simulated/provider-specific live behavior with an OpenAI Realtime session while preserving the useful UI concepts:

- transcript feed
- ranked working hypotheses
- missing questions
- recommended meds
- recommended investigations
- other clinical actions
- note generation
- sync to EMR draft

Add modes:

- `live_encounter`
- `triage_clarification`
- `doctor_dictation`
- `patient_follow_up_call`

In `triage_clarification` mode, the copilot should not restart the full history. It should focus on the missing information and red flags from the AI triage review.

### RecordingModal

Keep batch recording as fallback and for low-connectivity environments. Do not remove it.

Positioning:

- Realtime mode: live support and faster finalization.
- Recording mode: reliable fallback, background processing, offline-friendly capture.

## Patient and Caregiver Loop

After doctor approval, the patient or caregiver should receive:

- plain-language summary
- diagnosis or working diagnosis with uncertainty
- medications and how to take them
- tests and preparation instructions
- danger signs
- follow-up schedule
- what to do if symptoms worsen
- appointment booking link if needed
- reminders for medications, labs, vitals, or check-ins

For caregiver-submitted triage:

- show the caregiver relationship
- identify whether the patient was present
- mark any patient identity uncertainty
- send patient-facing instructions to the authorized recipient only
- preserve consent and access rules

## Safety and Governance

### Hard Safety Rules

- AI cannot finalize a review.
- AI cannot independently prescribe.
- AI cannot independently discharge a patient.
- AI cannot hide missing information.
- AI cannot convert patient-reported data into clinician-observed facts.
- AI must escalate emergency red flags.
- Doctor approval is required for final clinical content.

### Red Flag Examples

The backend should maintain condition-specific red flag rules, starting with:

- chest pain with exertion, breathlessness, syncope, diaphoresis
- stroke symptoms
- severe abdominal pain with guarding, fever, pregnancy, or persistent vomiting
- severe headache with neurologic symptoms
- difficulty breathing
- pregnancy complications
- pediatric danger signs
- suicidal ideation or severe mental health risk
- uncontrolled bleeding
- severe allergic reaction
- very abnormal vitals

### Audit Trail

Store:

- model name and snapshot
- prompt/instruction version
- generated draft version
- evidence map
- doctor edits
- doctor decision
- approval timestamp
- finalized note
- patient message sent
- orders created
- follow-up tasks
- tool calls and results
- safety flags acknowledged

Local fallback reconciliation:

```http
POST /provider-reviews/{public_id}/workflow-events/reconcile/
```

The frontend may capture doctor decisions, more-info requests, follow-through sends, realtime session requests, or live copilot artifacts locally when a newer backend endpoint returns 404 or 405. The reconcile endpoint accepts `events`, `client_event_ids`, and metadata. On success it should persist equivalent backend `TaskEvent` or workflow audit rows and return either `reconciled_event_ids` or `success: true`.

Frontend behavior:

- Pending local events remain visible in the doctor audit trail.
- A doctor can click `Sync Pending` once backend support is available.
- Successful reconciliation clears only the events reported as reconciled, preserving unrelated reviews and failed events.
- Failed reconciliation leaves every pending local event in browser storage for retry.

### Privacy and Compliance

- Use ephemeral realtime credentials.
- Never expose permanent OpenAI API keys to browser clients.
- Keep privileged tool execution on backend.
- Log minimum necessary PHI.
- Apply organization and provider access control to every review, realtime session, and tool call.
- Define retention rules for transcripts, audio, visual captures, and AI intermediate reasoning artifacts.

## Implementation Phases

### Phase 0: Alignment and Schemas

Deliverables:

- Finalize review origin and status values.
- Finalize generated review payload shape.
- Finalize evidence map schema.
- Finalize doctor decision contract.
- Define safety flags and required source labels.

Acceptance criteria:

- A sample AI triage review can be represented end to end.
- A sample live encounter review can be represented end to end.
- A sample hybrid review can be represented end to end.

### Phase 1: Backend AI Triage Review Creation

Deliverables:

- AI triage session APIs.
- Triage completion creates `MedicalReview`.
- Generated review includes source-labeled SOAP draft.
- Evidence map is stored.
- Missing data and red flags are stored.
- Queue returns origin, urgency, missing info, and risk flags.

Acceptance criteria:

- Patient/caregiver chat creates a pending doctor review.
- Doctor can fetch full review detail.
- AI-generated subjective/objective/assessment/plan are clearly separated from doctor-approved fields.

### Phase 2: Doctor Review Queue

Deliverables:

- Queue filters for AI triage, urgent, needs info, ready to approve.
- Queue cards show origin, caregiver status, urgency, missing info, and risk flags.
- Sorting prioritizes risk and patient waiting state.

Acceptance criteria:

- Doctor can identify urgent AI triage cases without opening every review.
- Doctor can distinguish AI triage from live encounter reviews.

### Phase 3: Approval Cockpit in ReviewDetail

Deliverables:

- AI triage approval cockpit.
- Evidence-linked generated note sections.
- Doctor action bar.
- Approve as-is.
- Edit and approve.
- Request more info.
- Escalate.
- Convert to live clarification.

Acceptance criteria:

- Doctor can approve a clean AI triage review in under 30 seconds.
- Doctor can edit and approve without losing evidence.
- Doctor can request missing info from the patient/caregiver.
- Doctor cannot finalize a review with unresolved emergency flags unless an escalation action is recorded.

### Phase 4: OpenAI Realtime Live and Hybrid Encounters

Deliverables:

- OpenAI realtime session endpoint.
- WebRTC client integration for `gpt-realtime-mini`.
- Backend sideband control channel.
- Tool schemas for draft-only and doctor-approved actions.
- Live transcript and artifact persistence.
- Live copilot syncs note and doctor-approval-required drafts back to `ReviewDetail`.

Acceptance criteria:

- Doctor can start live encounter from a review.
- Doctor can start live clarification from an AI triage review.
- Live copilot uses existing triage context.
- Tool calls draft actions, but do not finalize or prescribe without doctor approval.
- Session artifacts appear in review detail after the call.

### Phase 5: Patient Follow-Through

Deliverables:

- Approved patient summary delivery.
- More-info question delivery.
- Booking request delivery.
- Reminders for labs, meds, vitals, and follow-up.
- Patient action status returned to provider queue.
- Follow-through attention state for overdue, missed, failed, or stalled patient tasks.

Acceptance criteria:

- Patient receives doctor-approved next steps.
- Provider can see whether the patient completed requested actions.
- Follow-up state changes appear in the review queue.
- Overdue or stalled follow-through plans surface in the queue and command center as `Needs Follow-up`.

### Phase 6: Quality, Safety, and Enterprise Reporting

Deliverables:

- Doctor feedback capture.
- AI draft edit-distance metrics.
- Safety flag review.
- Time-to-approval metrics.
- Patient follow-through metrics.
- Department and hospital dashboards.

Acceptance criteria:

- Hospital admins can measure documentation time saved.
- Hospital admins can measure patient follow-through.
- Clinical leads can audit AI suggestions and doctor corrections.

## Testing Plan

### Unit and Contract Tests

- Review origin/status mapping.
- Evidence map validation.
- Source label validation.
- Doctor decision payload validation.
- Tool permission class validation.
- Red flag rule validation.
- Patient/caregiver identity handling.

### Frontend Tests

- Queue filters and sorting.
- AI triage card display.
- Approval cockpit rendering.
- Approve as-is flow.
- Edit and approve flow.
- Request more info flow.
- Convert to live clarification flow.
- Escalation flow.
- Finalization validation.

### Realtime Tests

- Session creation.
- Ephemeral credential expiration.
- WebRTC connection.
- Sideband tool handling.
- Transcript persistence.
- Tool call draft creation.
- Doctor approval enforcement.
- Disconnect and fallback behavior.

### End-to-End Scenarios

1. Low-risk AI triage review approved as-is.
2. AI triage review edited and approved.
3. AI triage review returns to patient for more information.
4. AI triage review converted to live clarification.
5. Live encounter produces note, orders, and patient summary.
6. Red-flag triage escalates before finalization.
7. Caregiver submits triage and doctor approves with caregiver caveat.
8. Patient receives plan and completes follow-up actions.

## Success Metrics

The provider review home should expose an operational command center so doctors and hospital teams can see these metrics without exporting data.

Command center metrics:

- active review count
- AI triage and hybrid review share
- urgent/emergency safety queue count
- missing-information count
- ready-to-approve AI review count
- review finalization rate
- average open review age
- patient follow-through send rate
- follow-through task completion rate
- pending backend workflow sync count

These metrics are intentionally computed from queue data when backend reporting is not yet available. The backend should later return authoritative hospital-level metrics for department, provider, and organization reporting.

Doctor productivity:

- median time from opening review to approval
- percent of reviews approved without full rewrite
- doctor edit distance from AI draft
- documentation completion rate
- after-hours documentation reduction

Clinical quality:

- missing red flags caught
- doctor correction categories
- evidence coverage per note
- unverified objective claims prevented
- escalation appropriateness

Patient productivity:

- patient response time to more-info requests
- lab completion rate
- medication pickup or adherence check-in rate
- follow-up booking completion rate
- symptom diary completion rate

Hospital value:

- reviews completed per doctor per day
- triage-to-doctor throughput
- callback leakage reduction
- avoidable repeat intake reduction
- audit readiness
- provider satisfaction
- patient satisfaction

## Rollout Plan

### Pilot

- Start with one department and low-to-moderate risk complaints.
- Require doctor approval for all AI-generated reviews.
- Do not allow autonomous order placement.
- Track doctor edits and safety flags closely.

### Expansion

- Add specialty-specific triage templates.
- Add local hospital protocols.
- Add structured follow-through tasks.
- Add realtime clarification for higher-value cases.

### Enterprise Hardening

- Role-based review assignment.
- Department dashboards.
- SLA monitoring.
- Audit exports.
- Model snapshot pinning and evaluation.
- Clinical governance review cycles.

## Key Product Decision

The product should not be framed as "AI triage makes the diagnosis." It should be framed as:

"Every patient interaction becomes a reviewable, evidence-linked, doctor-approved care artifact that drives the next safe action."

That is the enterprise-grade loop hospitals can trust, doctors can love, and patients can feel.
