# Doctor structured clinical review v2

The clinical-service detail screen is a clinician-authority surface. It reads the assigned proposal from `GET /doctor/clinical-service-orders/:orderId` and `GET /care/proposals/:proposalId`; it does not create a local clinical truth or a second proposal format.

## Server contract consumed

- `clinical_documentation.schema_version` must be `care_plan_documentation.v2` for approval actions.
- `clinical_documentation.sections` contains the server SOAP projection.
- `clinical_documentation.prescriptions`, `investigations`, `other_actions`, `source_provenance`, `safety_net`, and `next_review` are rendered as structured evidence and action cards.
- `clinical_documentation.edit_contract` must be `care_plan_edit.v2` before focused field editing is enabled. The contract carries the exact `source_plan_version_id` and all fields required by backend validation.
- `proposal_hash` and the server-issued AI draft hash are required for approval. The browser never calculates either hash.
- `POST /care/proposals/:proposalId/doctor-decision` receives `proposal_hash`, `ai_draft_hash`, optional `edited_proposal`, and the two required `clinical_attestations`: `documentation_reviewed` and `allergies_and_interactions_reviewed`.
- Decision metadata is passed through as `review_started_at`, `decision_at`, and `decision_category` for the backend productivity contract. The server remains authoritative for active work-session timing and decision readback.

The UI disables approval until both attestations are explicitly checked. A 409 causes an authoritative refetch and clears local edits/attestations; a 429 surfaces `Retry-After` when returned. Reject, escalate, and request-more-information require the focused reason/question needed for the next workflow owner.

No raw JSON editor is exposed as the primary workflow. Structured editing shows field-level unsent diffs, then submits the unchanged server contract plus the exact hashes. Deployment remains gated on the authenticated backend integration smoke and release coordinator approval.

## Compatibility checkpoint

| Capability | Current backend evidence | Doctor behavior |
| --- | --- | --- |
| Hash-bound SOAP v2, source provenance, actions, safety net and next review | `ClinicalProposalDoctorSerializer` and `validate_clinical_documentation_payload` | Render; edit only from the server-issued `care_plan_edit.v2` contract |
| Required approval attestations | `documentation_reviewed` and `allergies_and_interactions_reviewed` validation in `record_clinician_decision` | Disable both approval actions until explicitly checked |
| Stale proposal protection | `409 stale_proposal` with `refetch_url` | Refetch current order/proposal and discard stale local edits |
| Idempotent decision command | Existing `Idempotency-Key`/`X-Correlation-ID` request headers | Reuse the canonical API helper |
| Review start/decision timestamps and decision category as persisted KPI fields | Not present in the inspected backend models/serializer | UI captures and forwards optional metadata fields; backend owner must add/advertise the final accepted schema before KPI claims or production enablement |

