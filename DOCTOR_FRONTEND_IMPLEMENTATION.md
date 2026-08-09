# Prestige Doctor Frontend Implementation

Status: implementation handoff
Frontend repository: `prestige-doctor`
Backend contract audited from: current `PRESTIGEHEALTH` working-tree routes and serializers on 2026-08-07; base HEAD `7834ea4f`
Audience: frontend implementation agent, clinical workflow reviewer, backend API agent, QA agent

This document supersedes older doctor frontend plans centered on `provider-reviews`, `medical-reviews`, separate doctor-owned review tasks, client-authored clinical state, or guaranteed live encounters. Recheck the final integrated backend commit before release without weakening the authority, privacy, or exact-hash contracts below.

## 1. Product Outcome

Build a doctor workspace that turns agent-prepared cases into short, safe, auditable clinical decisions. The patient case is the unit of work. Doctor review is an inline authority checkpoint in that case, not a second task that recreates intake and documentation.

The application must let a doctor:

- see assigned longitudinal cases before covering-pool cases;
- understand urgency, deadline, authority request, and evidence quality at a glance;
- claim a pooled case before seeing protected identity or clinical details;
- review the agent-compiled history, evidence, differential, exclusions, exact regimen, and proposed plan;
- approve the exact proposal, edit and approve a new exact payload, request information, escalate, convert to a live encounter, or reject;
- continue the same case after information is supplied without creating another review task;
- see the requested clinician class, modality, consent, evidence gaps, safety route, and due time without seeing who funded it or what they paid;
- monitor approved actions, fulfillment, outcomes, and deterioration after the decision;
- govern reusable protocol candidates separately from patient care;
- measure actual active clinical time without counting an idle browser tab.

The first authenticated screen is the Review Queue, not a marketing dashboard.

## 2. Clinical and Commercial Truth

### 2.1 Authority boundaries

The agent may compile a history, diagnostic impression, differentials, uncertainty, must-not-miss conditions, evidence, and patient-specific proposed actions. Server-side policy determines whether an action is autonomous or requires a licensed clinician.

Licensed authority remains mandatory for prescriptions, prescription changes, material care-plan changes, abnormal results requiring a medical decision, uncertain or conflicting assessments, protected-population treatment decisions, protocol exclusions, and deterioration requiring clinical disposition.

The browser never grants authority based on model labels such as `is_otc`. It renders the server's `requested_authority` and proposal state.

### 2.2 Clinical-service and sponsorship separation

The ₦1,000 managed follow-up does not include a paid GP review. GP written review, GP call, specialist written review, and specialist call are separate clinical-service SKUs. A membership or provider may fund an eligible order, but that changes neither inbox rank nor the clinician's authority, decision options, due-time logic, protocol, claim eligibility, or standard of care.

The doctor UI may show:

- clinician class and modality;
- consent state;
- current care-transition protocol and status when clinically relevant;
- AI draft availability and exact proposal hash after authorization;
- evidence gaps, safety escalation, appointment/attendance or discharge outcome, and the next clinically indicated checkpoint.

It must not show patient price, sponsorship amount, provider prepaid balance, reservation or settlement state, the 70/30 split, membership value, provider margin, attributable revenue, or financial performance. Emergency and clinical-authority routing is immediate and never waits for entitlement, payment, or sponsorship.

### 2.3 Doctor relationship

Route a case to the assigned longitudinal doctor first. Open the covering pool only when the assigned doctor is unavailable, declines, expires, or the deadline requires coverage. A pool preview must not reveal patient identity, proposal hash, or clinical detail before an authorized claim.

Do not claim that a doctor is assigned, reviewing, or available unless the returned proposal state proves it.

## 3. Current Repository Constraints

The repository uses Create React App, JavaScript, React Router 7, Chakra UI, MUI, Tailwind, and several overlapping API modules. Large components combine queue, patient record, decision forms, live tools, and old review finalization.

The most serious current defect is `doctorWorkflowApi.js`: when endpoints fail or do not exist, it records clinical decisions and follow-through in `localStorage`. Remove this behavior in the first foundation change. A server failure must remain a visible failed or pending mutation. It must never look like a completed clinical action.

Hardcoded production origins, duplicated authentication access, client-side medication/test catalogs, and old `/medical-reviews/{id}/finalize/` paths must not power new case workflow.

Preserve the existing untracked `.codex-devserver.log`; do not add it to source control.

## 4. Target Technical Foundation

Migrate in place to:

- Vite, React, and strict TypeScript;
- React Router route objects with one registry;
- Tailwind for tokens and layout;
- accessible headless primitives and Lucide icons;
- TanStack Query for server state and mutation invalidation;
- React Hook Form and Zod for decision payloads;
- Vitest, Testing Library, MSW, axe, and Playwright;
- route and panel error boundaries.

Remove Chakra and MUI route by route. Do not introduce a third component system.

Suggested source layout:

```text
src/
  app/
    router.tsx
    providers.tsx
    featureFlags.ts
  api/
    http.ts
    schemas/
    reviewQueue.ts
    clinicalProposals.ts
    patientProgress.ts
    alerts.ts
    protocols.ts
  auth/
  components/
    queue/
    evidence/
    clinical/
    status/
  features/
    review-queue/
    case-workspace/
    patient-progress/
    alerts/
    protocol-governance/
    contribution/
  demo/
  test/
```

### 4.1 HTTP and mutation rules

Use `VITE_API_ORIGIN`. Remove hardcoded API origins from migrated features.

All requests include:

```http
Authorization: Bearer <access-token>
Accept: application/json
X-Client-Version: <build-sha>
```

All state-changing care-kernel commands include:

```http
Idempotency-Key: <stable-logical-action-uuid>
X-Correlation-ID: <case-correlation-uuid>
Content-Type: application/json
```

Generate one idempotency key per claim action, heartbeat, release, and clinical decision. Reuse that key for retries of the same command. Never reuse a decision key for a later proposal hash.

Error behavior:

- `401`: refresh once and retry once;
- `403`: remove protected case data from memory and return to the queue;
- `409` or stale-hash validation: discard no draft, refetch the proposal, show the diff, and require fresh confirmation;
- already claimed: refresh queue and show the current claim state;
- network or `5xx`: keep the decision draft in component memory only and retry with the same idempotency key;
- schema mismatch: fail closed and do not expose raw payload as an editable clinical form;
- decision success: replace cached proposal with the server response before navigating.

Do not store patient data, proposal packets, decision drafts, evidence, or successful clinical actions in browser persistence.

## 5. Route Map

| Route | Purpose | Replaces |
| --- | --- | --- |
| `/app/queue` | Assigned and pooled exception queue | ReviewsHome and ReviewsList |
| `/app/cases/:proposalId` | Inline authority and case workspace | ReviewDetail and old finalize screens |
| `/app/clinical-services/:orderId` | AI-prepared GP/specialist written review or call work item | retired broad review product screens |
| `/app/transitions/:transitionId` | Clinically scoped referral, attendance, discharge, and follow-up context | none |
| `/app/patients/:patientId` | Authorized longitudinal progress | legacy patient details/dashboard |
| `/app/alerts` | Mobilization and SLA alerts | scattered notifications |
| `/app/protocols` | Batched protocol governance | protocol controls embedded in cases |
| `/app/protocols/:candidateId` | Candidate evidence and governance decision | none |
| `/app/contribution` | Active time, dispositions, outcomes, and workload | generic business dashboard |
| `/app/messages` | Authorized patient communication | existing messaging, retained behind adapter |
| `/demo/doctor` | Synthetic linked doctor scenario | none |

`/app/queue` is the post-login route. Keep old URLs as redirects only after their replacement passes.

## 6. Canonical Types

Define Zod schemas and infer TypeScript types. The proposal contract must include all server fields rather than a hand-selected legacy subset.

```ts
type DecisionOption =
  | 'approve_as_written'
  | 'edit_and_approve'
  | 'request_more_information'
  | 'convert_to_live_encounter'
  | 'escalate'
  | 'reject';

type ReviewClaim = {
  mode: 'asynchronous_exception_review';
  claimed_by_provider_id: number | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  route_mode: string;
  route_reason: string;
  route_version: number | string;
  covering_pool_opened_at: string | null;
  synchronous_interaction_promised: false;
};

type ClinicalProposal = {
  public_id: string;
  episode_id: string;
  proposal_hash: string;
  authority_route: string;
  status: string;
  required_approver_id: number | null;
  doctor_review_due_at: string | null;
  intake_readiness: Record<string, unknown>;
  missing_information: { questions: string[]; requested_at: string | null };
  hash_contract: {
    proposal_hash: string;
    plan_content_hash: string;
    patient_snapshot_hash: string;
    parent_content_hash: string | null;
    exact_hash_required: true;
  };
  proposed_plan_version: CarePlanVersion;
  approved_action_preview: ApprovedActionPreview[];
  execution_state: Record<string, unknown>;
  exception_packet: ExceptionPacket;
  review_claim: ReviewClaim;
  authority_checkpoint: Record<string, unknown>;
  clinician_work: Record<string, unknown>;
  mobilization: Record<string, unknown>;
  included_purchase_checkpoint: Record<string, unknown> | null; // legacy compatibility only; never render as a bundled paid review
};
```

Pool previews are a separate discriminated type. They contain only `public_id`, `status`, `urgency`, due time, route information, `pool_preview: true`, and claim metadata. Components must not assume a pool preview is a full proposal.

## 7. Available API Integration

### 7.1 Review queue

```http
GET /provider/care-review-inbox
```

The current endpoint returns up to 200 rows. Partition in the UI without changing server order:

1. cases where `required_approver_id` is the current doctor;
2. already claimed by the current doctor;
3. covering-pool previews;
4. unassigned authorized cases.

Sort only within equal server route ranks, by `doctor_review_due_at`, then creation time. Display overdue, due soon, routine, protected population, requested authority, and information-resubmission indicators when present.

```http
GET /provider/clinical-case-alerts?status={status}
```

Use alerts to prompt queue refresh. Do not use an alert body as the clinical packet.

### 7.2 Claim, heartbeat, release, and decline

```http
POST /care/proposals/{proposalId}/review-claim
```

Claim:

```json
{ "action": "claim" }
```

Heartbeat:

```json
{ "action": "heartbeat" }
```

Release:

```json
{ "action": "release" }
```

Decline coverage:

```json
{ "action": "decline" }
```

Claim behavior:

- a pool preview reveals full details only after a successful claim and returned full proposal;
- the default backend claim lease is currently 15 minutes;
- heartbeat at an interval comfortably below the returned expiry only while the document is visible and the clinician has recently interacted with the case;
- stop heartbeat on blur plus inactivity, route change, logout, decision, or network loss;
- release when the clinician intentionally leaves an unfinished case;
- browser close may rely on lease expiry; do not use unreliable unload requests to claim completion;
- never heartbeat merely because the tab exists.

### 7.3 Case review order

Render the case in this sequence:

1. urgency, deadline, funding, and authority requested;
2. patient identity and population after authorization;
3. presenting problem and patient goal;
4. current care state, medicines, adherence, monitoring, devices, investigations, goals, and barriers;
5. remote evidence with provenance and limitations;
6. working impression, confidence, ranked differential, must-not-miss conditions, and missing evidence;
7. protocol match or exclusion and requested authority;
8. proposed plan and diff from the parent content hash;
9. exact medication regimens and interaction or contraindication checks;
10. approved-action preview and expected outcomes;
11. unresolved questions;
12. decision controls.

Do not put clinical governance candidate publication in this flow. Show only a passive note that case amendments may contribute to later learning.

### 7.4 Doctor decisions

All decisions use:

```http
POST /care/proposals/{proposalId}/doctor-decision
```

Approve exact proposal:

```json
{
  "decision": "approve_as_written",
  "proposal_hash": "exact-current-proposal-hash",
  "reason": "Clinically appropriate based on the verified packet"
}
```

Edit and approve:

```json
{
  "decision": "edit_and_approve",
  "proposal_hash": "exact-current-proposal-hash",
  "reason": "Dose adjusted for the documented patient-specific factor",
  "edited_proposal": {
    "assessment": {},
    "differential": [],
    "plan_summary": "",
    "safety_net": {},
    "expected_outcomes": {},
    "goals": [],
    "actions": []
  }
}
```

The edit form must preserve the complete server plan schema and medication regimen fields. It must not submit only changed display rows unless the backend explicitly adds JSON Patch support.

Request information:

```json
{
  "decision": "request_more_information",
  "proposal_hash": "exact-current-proposal-hash",
  "reason": "A safe decision needs a verified reading",
  "questions": ["Please provide a repeat seated blood-pressure reading after five minutes of rest."]
}
```

This keeps the same clinical-service decision cycle open. It transfers next action to the patient or agent. When information returns, the doctor must receive a new proposal hash and due time.

Convert to live encounter:

```json
{
  "decision": "convert_to_live_encounter",
  "proposal_hash": "exact-current-proposal-hash",
  "reason": "Synchronous clarification is clinically necessary"
}
```

This creates a need for provider-neutral live handoff. It does not mean a call is booked or a doctor is immediately available.

Escalate:

```json
{
  "decision": "escalate",
  "proposal_hash": "exact-current-proposal-hash",
  "reason": "Physical examination and urgent facility capability are required"
}
```

Reject:

```json
{
  "decision": "reject",
  "proposal_hash": "exact-current-proposal-hash",
  "reason": "The proposal is not clinically appropriate and cannot be safely amended remotely"
}
```

Every terminal decision requires a confirmation dialog showing patient, decision, proposal hash suffix, material changes, and resulting action. Disable controls while the command is unresolved. On success, use the returned proposal and activated plan version as the only truth.

### 7.5 Patient progress

Use authorized reads:

```http
GET /care/episodes/{episodeId}
GET /care/plans/{planId}
GET /care/tasks?owner={role}&state={state}&due_before={isoTime}
GET /care/timeline?patient_id={patientId}
GET /care/team?patient_id={patientId}
```

Show task status, observations and trends when the prerequisite observation read API is available, fulfillment progress, deterioration, adverse effects, goal trajectory, and outcome checkpoints. Do not allow the progress view to make a material plan change outside a new exact-hash proposal.

### 7.6 Protocol governance

Governance is a separate route and work mode:

```http
GET /provider/clinical-protocol-candidates
POST /provider/clinical-protocol-candidates/{candidateId}/research
POST /provider/clinical-protocol-candidates/{candidateId}/decision
GET /provider/clinical-protocols/{protocolId}/performance
GET /provider/clinical-protocols/champion
GET /provider/clinical-protocols/efficiency-frontier
```

Candidate decision payload:

```json
{
  "decision": "approve",
  "rationale": "Evidence and measured outcomes support supervised use",
  "performance_snapshot_id": "optional-snapshot-uuid"
}
```

Render citations, cohort match, sample size, completeness, safety events, outcome comparison, total resource cost, and frontier position. Revenue and partner incentives must never appear as ranking inputs.

### 7.7 Separate clinical-service orders

Open an order only from an authorized server-issued public ID:

```http
GET /doctor/clinical-service-orders/{orderId}
POST /care/proposals/{proposalId}/review-claim
POST /care/proposals/{proposalId}/doctor-decision
POST /care/clinical-service-orders/{orderId}/complete-call
```

The doctor order projection is intentionally narrow: public ID, SKU, clinician class, modality, order status, linked proposal ID and exact hash, AI-draft hash and the AI-prepared draft only while it is pending clinician action or needs information, due time, and authority label. The AI draft accelerates review; it is never a signed note. The clinician must compare it with the evidence, then act through the existing exact-hash claim and decision routes. Do not create a second approval API in the client.

For audio/video SKUs, call completion is an operational action after the encounter. It does not replace the exact-hash clinical decision or make a disconnected browser session a completed call. Written and call services use the same authority boundary.

### 7.8 Provider-funded transition context

```http
GET /care/provider-transitions/{transitionId}
```

Show the consented protocol, status, provider, evidence-presence gaps, safety escalation, attendance or discharge outcome, timeline, and the clinically indicated next checkpoint. Use only the clinician projection. Do not show the sponsorship amount, credit reservation, prepaid balance, settlement, margin, return-visit revenue, or business KPIs.

The transition is context for care, not a new authority route. Referral initiation remains clinician-authorized, hospital discharge follow-up requires hospital-clinician attestation, and all prescriptions and material plan decisions still use the existing proposal claim/decision workflow. Sponsorship must never alter queue priority or clinical disposition.

## 8. Required Backend Prerequisites

Do not bridge these with old review endpoints:

1. `GET /care/proposals/{proposalId}` returning the full actor-scoped `ClinicalProposalSerializer` after authorization or claim.
2. Paginate and filter `GET /provider/care-review-inbox` with `queue=assigned|mine|pool`, `urgency`, `due_before`, `authority`, `population`, and `cursor` while preserving minimal pool previews.
3. `GET /provider/care-review-inbox/summary` returning counts by route, urgency, due bucket, authority, and information-resubmission state.
4. Add `patient_id` and `episode_id` filters to `GET /care/tasks`.
5. `GET /care/episodes/{episodeId}/observations?cursor=` and authorized remote-exam session reads.
6. A doctor-scoped clinical-service order collection or a guaranteed order link in each relevant inbox item; the mounted backend currently exposes order detail but no list.
7. A doctor-scoped provider-transition collection or a trusted transition link on the case/proposal projection; the mounted backend currently exposes transition detail but no list.
8. Add server-projected consent, evidence gaps, safety/appointment state, attendance/discharge outcome, and allowed actions where those fields are not yet present. The frontend must not infer them from status names.
9. `GET /provider/patients/{patientId}/care-summary` returning authorized episode, goal, task, fulfillment, deterioration, and outcome summaries without client joins across legacy dashboards.
10. `GET /provider/work-metrics?from=&to=` returning active seconds, cases, decisions, amendments, information cycles, disposition, and measured outcomes.
11. Return an explicit stale-proposal conflict shape containing current proposal ID, hash, status, and safe refetch URL.

All collection endpoints must enforce provider assignment, active delegation, or claimed covering-pool scope. Do not return patient identity in an unclaimed pool preview.

## 9. Screen Specifications

### 9.1 Review Queue

Use a dense table on desktop and stable list rows on narrow screens. Columns:

- route and claim state;
- de-identified preview or patient after authorization;
- urgency;
- population and protected-population marker when permitted;
- requested authority;
- evidence completeness;
- due time and SLA;
- last progress;
- primary action.

Use tabs for `Assigned`, `Mine`, and `Coverage pool`. Counts come from the backend prerequisite summary. Do not load full proposals for every row.

### 9.2 Case Workspace

Desktop layout uses three stable regions:

- left: section navigator and compact patient context;
- center: evidence, assessment, plan, and progress;
- right: deadline, exact-hash status, requested authority, active work session, and decision controls.

On tablets, collapse the left navigation into tabs and keep the decision drawer sticky. On mobile, permit urgent review but show a warning when the viewport cannot safely compare a material plan diff.

The decision panel cannot be nested inside another card. Keep it as a full-height surface.

### 9.3 Medication Regimen Editor

For every medication action require:

- medicine and formulation;
- dose and unit;
- route;
- interval or timing;
- duration;
- maximum daily dose where relevant;
- calculation basis, including weight when relevant;
- contraindication and interaction checks;
- patient instructions;
- prescription or non-prescription authority class.

Highlight any edited field and include it in the confirmation diff. Never source medicine authority from a browser-maintained catalog.

### 9.4 Patient Progress

Use trend charts only for comparable units and verified measurements. Always show source and observed time. A missing outcome is `missing`, not `stable`. Separate immediate acute stabilization from 30/90-day chronic progress in acute-on-chronic cases.

### 9.5 Contribution

Show operational measures, not pressure quotas:

- active clinician minutes;
- cases safely resolved;
- information cycles;
- disposition and escalation;
- agent proposal acceptance and amendment;
- patient outcome completeness;
- doctor minutes per episode;
- attributable clinician resource cost.

Do not rank doctors by fastest decision or margin.

## 10. Visual and Interaction Direction

- Use white and light neutral work surfaces with charcoal text.
- Use blue for neutral actions, green for approved/completed, amber for uncertainty/SLA, and red for urgent safety risk.
- Avoid dark navy dominance, gradients, decorative shapes, and oversized headings.
- Default radius is 4px to 6px; maximum is 8px.
- Use tables and split workspaces rather than collections of cards.
- Use Lucide icons and tooltips for icon-only commands.
- Keep display density configurable between comfortable and compact, but do not hide safety fields.
- Keep all case controls keyboard accessible with visible focus.
- Never use color as the only urgency or decision indicator.
- Keep letter spacing at zero and do not scale type with viewport width.
- Evidence images, keyframes, and documents must preserve aspect ratio and provenance labels.
- Meet WCAG 2.2 AA.

## 11. Demo Workspace

Enable only with `VITE_ENABLE_DEMO=true`. Use MSW, deterministic clocks, and a persistent `Synthetic demo` label.

Required linked cases:

- separate GP written-review order with patient consent, an AI-prepared note, exact proposal hash, clinician amendment, approval, and an auditable patient-safe outcome;
- separate specialist audio/video order showing modality and due time but no price, sponsor, credit, or settlement data;
- pharmacy and laboratory provider-funded follow-up transitions that appear only as consented clinical context and do not change queue priority;
- clinic referral transition with booking, check-in, attended outcome, and next clinically indicated checkpoint;
- hospital discharge transition with clinician-attested packet, first-contact status, warning escalation, and completion evidence;
- information request, patient response, new proposal hash, and approval;
- two-parent caregiver case with clinical visibility for only one parent;
- protected pediatric treatment decision;
- pregnancy case requiring physical care;
- covering-pool preview that reveals details only after claim;
- claim expiry and reallocation;
- stale-hash decision conflict;
- fulfillment deterioration after approval;
- protocol candidate generated from an amendment but governed separately.

Use the same fixture IDs and states as the patient and partner demos.

The sales-demo path should take five minutes or less: open the minimum-necessary queue, claim one case, show the AI-prepared note and evidence gaps, amend the exact proposal, approve it, and reconcile the patient-safe outcome. Then switch to a referral or discharge transition to show safety and continuity without finance. Display measured active review time and completed cases only from server fixtures; do not invent time saved, diagnostic accuracy, clinician earnings, or favourable outcomes.

## 12. Implementation Sequence

1. Remove local clinical-success fallbacks and add tests proving failures remain failures.
2. Protect baseline behavior and migrate the build to Vite/TypeScript.
3. Build tokens, shell, auth adapter, typed API client, Zod schemas, query keys, MSW fixtures, and feature flags.
4. Implement Review Queue, claim lifecycle, full proposal parsing, and pooled privacy.
5. Implement the Case Workspace and all exact-hash decisions.
6. Implement separate clinical-service order detail, AI-draft review, and call completion without adding a second authority path.
7. Implement read-only clinician projections for feature-gated provider transitions.
8. Implement patient progress, alerts, fulfillment follow-through, and measured contribution.
9. Move protocol governance into its separate route.
10. Add the deterministic linked demo.
11. Cut over queue and case routes together. Redirect old review URLs and disable old finalize/save-note writes.
12. Remove unused Chakra, MUI, old API clients, hardcoded catalogs, and local clinical event storage.

## 13. Tests and Release Gates

Unit and contract tests must prove:

- pool previews cannot render identity or clinical details;
- a claim is required before pool details;
- heartbeat occurs only during active visible engagement;
- release stops heartbeat and clears protected cache;
- stale hashes cannot be approved;
- `edit_and_approve` requires a complete clinician-authored plan payload;
- information requests preserve the decision cycle and return the case later with a new hash;
- a terminal decision activates once under duplicate submission;
- failed decisions never create local success;
- emergencies do not wait for entitlement or payment;
- managed follow-up is never presented as containing a paid GP review;
- GP and specialist services remain separate order classes and modalities;
- membership or provider funding never changes ranking, claim eligibility, due-time policy, decision options, or the clinical review standard;
- sponsor amount, prepaid balance, reservation, settlement split, margin, and provider revenue never enter doctor rendering or telemetry;
- an AI-prepared draft cannot become a signed note without exact-hash clinician action;
- transition context cannot create a prescription, discharge decision, or material plan change;
- clinical case work does not require a doctor-owned review task;
- protocol governance remains separate from patient care;
- patient data clears on `403`, logout, claim loss, and route exit.

Playwright must run at 768x1024, 1366x768, and 1440x900 with screenshot and overlap checks. Include keyboard-only decision completion and axe scans.

The doctor frontend is releasable only when:

- no clinical write uses `localStorage` or legacy finalize endpoints;
- every decision is bound to the exact server hash;
- provider queue privacy and claim expiry work under concurrency;
- agent packet, doctor amendment, activated plan, tasks, and patient UI reconcile to the same case;
- the linked patient, doctor, and partner demo passes end to end;
- production deployment and feature activation remain separately authorized.

## 14. Doctor-Approved Recurring Order Contract

This section extends the inline case checkpoint to reusable order authority. It does not introduce an order-review task or a separate repeat-approval queue. Pin the frontend to the merged backend commit containing `AuthorizedOrderAllocation`, `PartnerGeneratedValueAttribution`, and migration `care_kernel.0021_authorized_recurring_order_value`.

### 14.1 Proposal fields

Extend the full proposal schema with:

```ts
type OrderAuthorization = {
  authorized_quantity: number;
  dispense_quantity: number;
  permitted_repeat_count: number;
  repeat_interval_days: number | null;
  authorization_expires_at: string | null;
  item_name: string;
  strength: string;
  form: string;
  service_family: 'medication' | 'investigation' | 'appointment' | 'device';
};

type PatientSpecificRegimen = {
  medication_code: string;
  medication_name: string;
  dose_amount: string;
  dose_unit: string;
  route: string;
  interval_hours: string | null;
  frequency_text: string;
  duration_days: string;
  maximum_daily_dose: string;
  maximum_daily_dose_unit: string;
  indication: string;
  calculation_basis: Record<string, unknown>;
  safety_checks: Record<string, unknown>;
  patient_instructions: string;
  authority_class: string;
  status: 'proposed' | 'protocol_authorized' | 'clinician_authorized' | 'blocked';
  input_hash: string;
  regimen_hash: string;
  order_authorization: OrderAuthorization;
};
```

Reject malformed or incomplete medication proposals before rendering decision controls. The regimen, action, patient snapshot, plan content, and order authorization are all covered by the exact proposal hash. Do not calculate quantities or repeat authority in the browser.

For the launch anchor, display the proposed authority literally:

```text
Amlodipine 5 mg by mouth once daily for 60 days
Dispense now: 30 tablets
Permitted repeat: one further 30-tablet supply
Repeat condition: scheduled safety/adherence checkpoint remains acceptable
Maximum cumulative supply: 60 tablets
```

### 14.2 Inline decision and activation

The clinician continues to use the normal case workflow:

```http
POST /care/proposals/{proposalId}/review-claim
POST /care/proposals/{proposalId}/doctor-decision
```

`approve_as_written` authorizes only the exact hashed regimen and order allocation. `edit_and_approve` must submit the complete amended plan, regimen, and order authorization so the backend creates a new exact content hash. `request_more_information` keeps the same case cycle open; resubmission produces a new proposal hash and deadline.

After a terminal decision, refetch the proposal and episode. The approved plan activates its allocation exactly once. The doctor does not call `/care/commercial-journeys/{id}/authorized-order` or `/care/commercial-journeys/{id}/follow-up-outcome`, create a quote, select a partner, record payment, fulfill an order, or create partner attribution.

An unchanged, still-eligible scheduled repeat does not require another doctor decision. A changed dose, adverse effect, deterioration, abnormal observation, material interaction, expired authorization, or protocol exclusion blocks execution and creates a new inline clinical checkpoint when licensed authority is required.

### 14.3 Case workspace execution view

Add a read-only `Approved execution` section to the case workspace:

- approved plan hash and approval time;
- authorized, reserved, fulfilled, and remaining quantity;
- initial order and repeat sequence;
- next eligibility and expiry;
- partner selected by the patient;
- payment and fulfillment status;
- 48-hour follow-up and later checkpoint status;
- clinical blocker and next authority action.

Show the first and repeat order as children of the same approved action. Preserve the distinction between `fulfilled` and `outcome_recorded`. Missing outcome evidence is not improvement or stability.

The doctor view may show that a sale was fulfilled when operationally relevant, but it must not show partner league tables or use partner revenue as a clinical ranking input. Contribution views may report active clinician minutes and resource cost; they must not encourage approval because an order would generate revenue.

### 14.4 Generalization

Use the same contract for:

- scheduled HbA1c or other approved investigations, including result receipt and the need for medical interpretation;
- a clinician follow-up visit after the approved interval;
- device replacement or recurring consumables;
- non-member purchases with patient-funded managed follow-up.

The server remains authoritative for whether a result, symptom, or observation requires a new clinician decision. A partner result upload never constitutes clinical interpretation or doctor approval.

### 14.5 Cache and concurrency

- After claim: cache the full proposal only within the active claim scope.
- After decision: invalidate proposal, episode, review inbox, alerts, patient progress, and execution summary.
- When execution or outcome events arrive: invalidate execution summary and progress without altering the approved proposal document.
- On `409 stale_proposal`: disable controls, clear the draft decision, and fetch the current proposal ID and hash.
- On claim loss or `403`: immediately clear identity, evidence, regimen, execution, and patient progress caches.
- Never merge an old order allocation into a newly hashed plan.

### 14.6 Linked fixtures and release tests

Use the shared 56-year-old Basic-member hypertension fixture. The doctor must:

1. Claim the ordinary proposal.
2. Review the complete evidence packet and exact amlodipine regimen.
3. Approve the 60-day plan with one conditional repeat.
4. Observe, but not perform, initial order materialization, payment, pickup, and follow-up.
5. Observe the eligible day-28 repeat and terminal outcome evidence in the same case.

MSW and Playwright must cover exact approval, edit-and-approve with a changed regimen hash, information resubmission, stale hash, expired authorization, adverse effect, deterioration, abnormal reading, investigation result requiring authority, unauthorized substitution rejection, and duplicate decision replay. Release requires proof that no doctor-owned review task is created, approval activates once, the clinician never performs commerce actor actions, and unchanged repeats consume only the authority granted by the exact approved plan.
