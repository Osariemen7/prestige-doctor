import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildCompleteDocumentationEdit,
  copy,
  documentationChanges,
  formatDateTime,
  publicHashSuffix,
} from './contract';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  HashBadge,
  Icon,
  LoadingState,
  Modal,
  SafetyBanner,
  StatusBadge,
} from './components';
import {
  fetchProposal,
  getCommandKey,
  mutateReviewClaim,
  submitDoctorDecision,
  fetchReviewDraft,
  saveReviewDraft,
} from './api';
import { trackDoctorEvent } from './analytics';
import { setClinicalSubmissionActive, setDoctorFormDirty } from '../pwa/updateGuard';

const SECTION_DEFINITIONS = [
  {
    id: 'subjective',
    short: 'S',
    label: 'Subjective',
    eyebrow: 'Patient story',
    description: 'Symptoms, history, medicines, allergies, and the exact patient goal.',
    fields: [
      ['chief_complaint', 'Chief complaint', 2],
      ['history_of_presenting_complaint', 'History of presenting complaint', 5],
      ['relevant_history_review_of_systems', 'Relevant history and review of systems', 4],
      ['medications_and_adherence', 'Medicines and adherence', 4],
      ['allergies', 'Allergies and sensitivities', 3],
      ['patient_goal', 'Patient goal in their own words', 3],
    ],
  },
  {
    id: 'objective',
    short: 'O',
    label: 'Objective',
    eyebrow: 'Verified findings',
    description: 'Only returned observations, examinations, results, and explicit remote limitations.',
    fields: [
      ['verified_observations', 'Verified observations', 4],
      ['examination_summary', 'Examination summary', 4],
      ['investigation_results', 'Available investigation results', 4],
      ['remote_assessment_limitations', 'Remote-assessment limitations', 4],
    ],
  },
  {
    id: 'assessment',
    short: 'A',
    label: 'Assessment',
    eyebrow: 'Clinical interpretation',
    description: 'The clinician-owned impression, confidence, differential, risk exclusions, and rationale.',
    fields: [
      ['primary_impression', 'Primary impression', 3],
      ['confidence', 'Confidence', 2],
      ['ranked_differential', 'Ranked differential', 5],
      ['must_not_miss', 'Must-not-miss conditions', 4],
      ['clinical_rationale', 'Concise clinical rationale', 5],
    ],
  },
  {
    id: 'plan',
    short: 'P',
    label: 'Plan',
    eyebrow: 'Management and follow-up',
    description: 'Management, referrals, education, safety net, outcomes, and the next checkpoint.',
    fields: [
      ['management', 'Management plan', 5],
      ['referrals_actions', 'Referrals and other actions', 4],
      ['education', 'Patient education', 4],
    ],
  },
  { id: 'prescriptions', short: 'Rx', label: 'Prescriptions', eyebrow: 'Exact medicine authority', description: 'Complete patient-specific regimens and explicit safety review.' },
  { id: 'investigations', short: 'Ix', label: 'Investigations', eyebrow: 'Order and review checkpoints', description: 'Tests, timing, preparation, and who must interpret the result.' },
];

const getAt = (value, path) => path.split('.').reduce((current, key) => current?.[key], value);

const withAt = (value, path, nextValue) => {
  const result = copy(value || {});
  const keys = path.split('.');
  let cursor = result;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = cursor[key] && typeof cursor[key] === 'object' ? cursor[key] : {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = nextValue;
  return result;
};

const conciseValue = (value) => {
  if (value === undefined) return 'Not present';
  if (value === null || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Confirmed' : 'Not confirmed';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const validateDocumentationDraft = (draft) => {
  const errors = [];
  ['subjective', 'objective', 'assessment', 'plan'].forEach((section) => {
    if (!draft?.[section] || typeof draft[section] !== 'object' || Object.values(draft[section]).every((value) => !String(value || '').trim())) errors.push(`${section}: add structured documentation or an explicit not-assessed statement`);
  });
  const prescriptions = Array.isArray(draft?.prescription) ? draft.prescription : [];
  const investigations = Array.isArray(draft?.investigation) ? draft.investigation : [];
  if (prescriptions.length && draft?.action_disposition?.prescription !== 'included') errors.push('prescriptions: disposition must be included');
  if (!prescriptions.length && draft?.action_disposition?.prescription !== 'none_indicated') errors.push('prescriptions: explicitly confirm none indicated');
  prescriptions.forEach((item, index) => {
    const regimen = item?.patient_specific_regimen || {};
    const required = ['dose_amount', 'dose_unit', 'route', 'duration_days', 'maximum_daily_dose', 'maximum_daily_dose_unit', 'indication', 'patient_instructions'];
    if (!item?.medication_name || !item?.formulation) errors.push(`prescription ${index + 1}: medicine and formulation are required`);
    required.forEach((field) => { if (regimen[field] === undefined || regimen[field] === '') errors.push(`prescription ${index + 1}: ${field.replaceAll('_', ' ')} is required`); });
    if (!regimen.frequency_text && !regimen.interval_hours) errors.push(`prescription ${index + 1}: timing or interval is required`);
    if (regimen.allergies_reviewed !== true) errors.push(`prescription ${index + 1}: confirm allergy review`);
    if (regimen.interactions_reviewed !== true) errors.push(`prescription ${index + 1}: confirm interaction review`);
  });
  if (investigations.length && draft?.action_disposition?.investigation !== 'included') errors.push('investigations: disposition must be included');
  if (!investigations.length && draft?.action_disposition?.investigation !== 'none_indicated') errors.push('investigations: explicitly confirm none indicated');
  investigations.forEach((item, index) => {
    ['test_type', 'reason', 'urgency', 'timing', 'instructions'].forEach((field) => { if (!String(item?.[field] || '').trim()) errors.push(`investigation ${index + 1}: ${field.replaceAll('_', ' ')} is required`); });
    if (typeof item?.result_review?.medical_interpretation_required !== 'boolean') errors.push(`investigation ${index + 1}: result-review authority must be explicit`);
  });
  return [...new Set(errors)];
};

function ChangedField({ label, path, draft, original, onChange, onUndo, rows = 3, readOnly = false }) {
  const value = getAt(draft, path) ?? '';
  const originalValue = getAt(original, path) ?? '';
  const changed = JSON.stringify(value) !== JSON.stringify(originalValue);
  const id = `documentation-${path.replaceAll('.', '-')}`;
  return <div className={`doc-field ${changed ? 'doc-field--changed' : ''}`}>
    <div className="doc-field__label-row"><label htmlFor={id}>{label}</label>{changed && <span className="doc-changed-badge">Changed</span>}</div>
    <textarea id={id} className="vnext-textarea doc-field__input" rows={rows} value={value} readOnly={readOnly} aria-readonly={readOnly} onChange={(event) => onChange(path, event.target.value)} />
    {changed && <div className="doc-field__audit"><details><summary>View original</summary><p>{conciseValue(originalValue)}</p></details><button type="button" onClick={() => onUndo(path)}>Undo change</button></div>}
  </div>;
}

const RegimenInput = ({ label, value, onChange, type = 'text', disabled = false }) => <label className="doc-mini-field"><span>{label}</span><input className="vnext-input" type={type} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(type === 'checkbox' ? event.target.checked : event.target.value)} checked={type === 'checkbox' ? Boolean(value) : undefined} /></label>;

function PrescriptionEditor({ items, originalItems, capabilities, onChange, readOnly = false }) {
  const update = (index, path, value) => onChange(items.map((item, itemIndex) => itemIndex === index ? withAt(item, path, value) : item));
  const remove = (index) => onChange(items.filter((_, itemIndex) => itemIndex !== index));
  const add = () => {
    const option = capabilities.medication_options?.[0];
    if (!option) return;
    onChange([...items, { medication_name: option.label || option.name || '', medication_code: option.code || '', formulation: '', patient_specific_regimen: { dose_amount: '', dose_unit: '', route: '', frequency_text: '', duration_days: '', maximum_daily_dose: '', maximum_daily_dose_unit: '', indication: '', calculation_basis: {}, patient_instructions: '', allergies_reviewed: false, interactions_reviewed: false } }]);
  };
  return <fieldset className="doc-action-stack" disabled={readOnly} aria-disabled={readOnly}>
    <div className="doc-section-intro"><div><div className="vnext-eyebrow">Exact medicine authority</div><h2>Prescriptions</h2><p>Quantity and repeat authority are server-calculated and cannot be edited here.</p></div>{capabilities.can_add_prescription && <ActionButton variant="secondary" onClick={add} disabled={readOnly || !capabilities.medication_options?.length}>Add from server options</ActionButton>}</div>
    {!items.length && <EmptyState title="No prescription actions" body="Use the explicit none-indicated disposition below; an empty array alone is not a clinical decision." />}
    {items.map((item, index) => {
      const regimen = item.patient_specific_regimen || {};
      const original = originalItems[index];
      const changed = JSON.stringify(item) !== JSON.stringify(original);
      return <article className={`doc-action-card ${changed ? 'doc-action-card--changed' : ''}`} key={item.action_public_id || `${item.medication_name}-${index}`}>
        <div className="doc-action-card__header"><div><span className="doc-action-index">Rx {index + 1}</span><h3>{item.medication_name || 'New prescription'}</h3></div><div className="doc-action-card__header-actions">{changed && <span className="doc-changed-badge">Changed</span>}{capabilities.can_add_prescription && <button type="button" className="vnext-button vnext-button--text vnext-button--small" onClick={() => remove(index)}>Remove</button>}</div></div>
        <div className="doc-action-grid">
          <RegimenInput disabled={readOnly} label="Medicine" value={item.medication_name} onChange={(value) => update(index, 'medication_name', value)} />
          <RegimenInput disabled={readOnly} label="Formulation / strength" value={item.formulation} onChange={(value) => update(index, 'formulation', value)} />
          <RegimenInput disabled={readOnly} label="Dose" value={regimen.dose_amount} onChange={(value) => update(index, 'patient_specific_regimen.dose_amount', value)} />
          <RegimenInput disabled={readOnly} label="Unit" value={regimen.dose_unit} onChange={(value) => update(index, 'patient_specific_regimen.dose_unit', value)} />
          <RegimenInput disabled={readOnly} label="Route" value={regimen.route} onChange={(value) => update(index, 'patient_specific_regimen.route', value)} />
          <RegimenInput disabled={readOnly} label="Timing / frequency" value={regimen.frequency_text} onChange={(value) => update(index, 'patient_specific_regimen.frequency_text', value)} />
          <RegimenInput disabled={readOnly} label="Duration (days)" value={regimen.duration_days} onChange={(value) => update(index, 'patient_specific_regimen.duration_days', value)} />
          <RegimenInput disabled={readOnly} label="Maximum daily dose" value={regimen.maximum_daily_dose} onChange={(value) => update(index, 'patient_specific_regimen.maximum_daily_dose', value)} />
          <RegimenInput disabled={readOnly} label="Maximum dose unit" value={regimen.maximum_daily_dose_unit} onChange={(value) => update(index, 'patient_specific_regimen.maximum_daily_dose_unit', value)} />
          <RegimenInput disabled={readOnly} label="Indication" value={regimen.indication || item.indication} onChange={(value) => update(index, 'patient_specific_regimen.indication', value)} />
          <label className="doc-mini-field doc-mini-field--wide"><span>Calculation basis</span><textarea className="vnext-textarea" rows="2" value={typeof regimen.calculation_basis === 'string' ? regimen.calculation_basis : regimen.calculation_basis?.basis || ''} readOnly={readOnly} onChange={(event) => update(index, 'patient_specific_regimen.calculation_basis', { ...regimen.calculation_basis, basis: event.target.value })} /></label>
          <label className="doc-mini-field doc-mini-field--wide"><span>Patient instructions</span><textarea className="vnext-textarea" rows="3" value={regimen.patient_instructions || ''} readOnly={readOnly} onChange={(event) => update(index, 'patient_specific_regimen.patient_instructions', event.target.value)} /></label>
        </div>
        <div className="doc-attestations">
          <label><input type="checkbox" disabled={readOnly} checked={regimen.allergies_reviewed === true} onChange={(event) => update(index, 'patient_specific_regimen.allergies_reviewed', event.target.checked)} /> I reviewed the returned allergies and sensitivities for this prescription.</label>
          <label><input type="checkbox" disabled={readOnly} checked={regimen.interactions_reviewed === true} onChange={(event) => update(index, 'patient_specific_regimen.interactions_reviewed', event.target.checked)} /> I reviewed medicine interactions and contraindications for this prescription.</label>
        </div>
        {item.order_authorization && <div className="doc-readonly-authority"><Icon name="LockKeyhole" size={15} /><span><strong>Server-calculated authority</strong> · dispense {item.order_authorization.dispense_quantity ?? 'not returned'} · repeats {item.order_authorization.permitted_repeat_count ?? 'not returned'} · total authorized {item.order_authorization.authorized_quantity ?? 'not returned'}</span></div>}
        {changed && original && <details className="doc-action-original"><summary>Compare original prescription</summary><pre>{JSON.stringify(original, null, 2)}</pre><button type="button" className="vnext-button vnext-button--secondary vnext-button--small" onClick={() => onChange(items.map((row, itemIndex) => itemIndex === index ? copy(original) : row))}>Undo all changes to this prescription</button></details>}
      </article>;
    })}
  </fieldset>;
}

function InvestigationEditor({ items, originalItems, capabilities, onChange, readOnly = false }) {
  const update = (index, path, value) => onChange(items.map((item, itemIndex) => itemIndex === index ? withAt(item, path, value) : item));
  const add = () => {
    const option = capabilities.investigation_options?.[0];
    if (!option) return;
    onChange([...items, { test_type: option.label || option.name || '', test_code: option.code || '', reason: '', urgency: '', timing: '', preparation: '', instructions: '', result_review: { medical_interpretation_required: true, owner: '', due: '', checkpoint_type: 'investigation_result_interpretation' } }]);
  };
  return <fieldset className="doc-action-stack" disabled={readOnly} aria-disabled={readOnly}>
    <div className="doc-section-intro"><div><div className="vnext-eyebrow">Order and interpretation</div><h2>Investigations</h2><p>Ordering or attendance never implies interpretation. Medical review remains a later Care Kernel checkpoint.</p></div>{capabilities.can_add_investigation && <ActionButton variant="secondary" onClick={add} disabled={readOnly || !capabilities.investigation_options?.length}>Add from server options</ActionButton>}</div>
    {!items.length && <EmptyState title="No investigation actions" body="Use the explicit none-indicated disposition below; an empty array alone is not a clinical decision." />}
    {items.map((item, index) => {
      const changed = JSON.stringify(item) !== JSON.stringify(originalItems[index]);
      return <article className={`doc-action-card doc-action-card--investigation ${changed ? 'doc-action-card--changed' : ''}`} key={item.action_public_id || `${item.test_code}-${index}`}>
        <div className="doc-action-card__header"><div><span className="doc-action-index">Ix {index + 1}</span><h3>{item.test_type || 'New investigation'}</h3></div><div className="doc-action-card__header-actions">{changed && <span className="doc-changed-badge">Changed</span>}{capabilities.can_add_investigation && <button type="button" className="vnext-button vnext-button--text vnext-button--small" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div></div>
        <div className="doc-action-grid">
          <RegimenInput label="Test" value={item.test_type} onChange={(value) => update(index, 'test_type', value)} />
          <RegimenInput label="Code" value={item.test_code} onChange={(value) => update(index, 'test_code', value)} />
          <RegimenInput label="Urgency" value={item.urgency} onChange={(value) => update(index, 'urgency', value)} />
          <RegimenInput label="Timing" value={item.timing} onChange={(value) => update(index, 'timing', value)} />
          <label className="doc-mini-field doc-mini-field--wide"><span>Clinical indication</span><textarea className="vnext-textarea" rows="3" value={item.reason || ''} onChange={(event) => update(index, 'reason', event.target.value)} /></label>
          <label className="doc-mini-field doc-mini-field--wide"><span>Preparation</span><textarea className="vnext-textarea" rows="2" value={item.preparation || ''} onChange={(event) => update(index, 'preparation', event.target.value)} /></label>
          <label className="doc-mini-field doc-mini-field--wide"><span>Patient / provider instructions</span><textarea className="vnext-textarea" rows="3" value={item.instructions || ''} onChange={(event) => update(index, 'instructions', event.target.value)} /></label>
          <RegimenInput label="Result-review owner" value={item.result_review?.owner} onChange={(value) => update(index, 'result_review.owner', value)} />
          <RegimenInput label="Review due" value={item.result_review?.due} onChange={(value) => update(index, 'result_review.due', value)} />
        </div>
        <div className="doc-attestations"><label><input type="checkbox" checked={item.result_review?.medical_interpretation_required === true} onChange={(event) => update(index, 'result_review.medical_interpretation_required', event.target.checked)} /> Medical interpretation is required at the returned result-review checkpoint.</label></div>
        {changed && originalItems[index] && <details className="doc-action-original"><summary>Compare original investigation</summary><pre>{JSON.stringify(originalItems[index], null, 2)}</pre><button type="button" className="vnext-button vnext-button--secondary vnext-button--small" onClick={() => onChange(items.map((row, itemIndex) => itemIndex === index ? copy(originalItems[index]) : row))}>Undo all changes to this investigation</button></details>}
      </article>;
    })}
  </fieldset>;
}

function ChangeReview({ changes }) {
  if (!changes.length) return <div className="doc-no-changes"><Icon name="CheckCircle2" /><div><strong>No documentation amendments</strong><span>Approval will sign the exact AI-prepared content hash.</span></div></div>;
  return <div className="doc-change-list">{changes.map((change, index) => <article key={`${change.path}-${index}`}><div><span className={`doc-change-kind doc-change-kind--${change.change}`}>{change.change}</span><strong>{change.path.replaceAll('.', ' › ')}</strong></div><dl><div><dt>Original</dt><dd>{conciseValue(change.before)}</dd></div><div><dt>Clinician version</dt><dd>{conciseValue(change.after)}</dd></div></dl></article>)}</div>;
}

export default function ClinicalDocumentationWorkspace({ demo, proposalId }) {
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(null);
  const [activeSection, setActiveSection] = useState('subjective');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [finalAttestation, setFinalAttestation] = useState(false);
  const [result, setResult] = useState(null);
  const [unresolved, setUnresolved] = useState(null);
  const [staleComparison, setStaleComparison] = useState(null);
  const [reapplyChanges, setReapplyChanges] = useState([]);
  const [draftVersion, setDraftVersion] = useState(0);
  const [draftSaveState, setDraftSaveState] = useState("saved");
  const draftHydratedRef = useRef(false);
  const draftSaveKeyRef = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);
  const commandKeyRef = useRef(null);
  const frozenPayloadRef = useRef(null);

  const clearProtectedState = useCallback((claimError) => {
    setProposal(null); setOriginal(null); setDraft(null); setStaleComparison(null); setReapplyChanges([]); setResult(null); setUnresolved(null); setError(claimError);
  }, []);

  const load = useCallback(async (signal, preserveDraft = false) => {
    setLoading(true); setError(null);
    try {
      const next = await fetchProposal({ proposalId, demo, signal });
      const contract = next.clinical_documentation?.edit_contract;
      setProposal(next);
      if (!preserveDraft) {
        setOriginal(contract ? copy(contract) : null);
        setDraft(contract ? copy(contract) : null);
      }
    } catch (loadError) {
      if (loadError?.status === 403) clearProtectedState(loadError); else setError(loadError);
    } finally { setLoading(false); }
  }, [clearProtectedState, demo, proposalId]);

  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load, reloadKey]);
  useEffect(() => { trackDoctorEvent('documentation_opened', { mode: demo ? 'demo' : 'live' }); }, [demo]);

  const isClaimed = Boolean(proposal?.review_claim?.claimed_by_current_doctor || (demo && Number(proposal?.review_claim?.claimed_by_provider_id) === 17));
  useEffect(() => {
    if (!proposal || !isClaimed || result) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      mutateReviewClaim({ proposalId, action: 'heartbeat', demo }).then(setProposal).catch((claimError) => { if (claimError?.status === 403 || claimError?.code === 'claim_lost') clearProtectedState(claimError); });
    }, 60000);
    return () => window.clearInterval(interval);
  }, [clearProtectedState, demo, isClaimed, proposal, proposalId, result]);

  const changes = useMemo(() => documentationChanges(original || {}, draft || {}), [draft, original]);
  const validationErrors = useMemo(() => draft ? validateDocumentationDraft(draft) : [], [draft]);
  useEffect(() => { if (!draft || result) return undefined; return setDoctorFormDirty(changes.length > 0); }, [changes.length, draft, result]);
  const persistDraft = useCallback(async () => {
    if (!draft || !proposal || result || !draftHydratedRef.current || !changes.length) return;
    setDraftSaveState("saving");
    try {
      const saved = await saveReviewDraft({ proposalId, demo, commandKey: draftSaveKeyRef.current || (draftSaveKeyRef.current = getCommandKey("review-draft:"+proposalId)), payload: { content: copy(draft), base_proposal_hash: proposal.proposal_hash, expected_version: draftVersion, proposal_version: documentation?.source_plan_version_id || null } });
      setDraftVersion(Number(saved?.version || saved?.state_version || draftVersion + 1));
      setDraftSaveState(saved?.status === "stale" ? "stale" : "saved");
    } catch (saveError) { setDraftSaveState(saveError?.status === 409 || saveError?.staleProposal ? "stale" : "failed"); }
  }, [changes.length, demo, draft, draftVersion, proposal, proposalId, result, documentation]);
  useEffect(() => { if (!draft || !changes.length || result || !draftHydratedRef.current) return undefined; const timer = window.setTimeout(persistDraft, 1000); return () => window.clearTimeout(timer); }, [draft, changes.length, persistDraft, result]);
  const documentation = proposal?.clinical_documentation;
  const safety = ['safety', 'emergency'].includes(proposal?.status) || proposal?.authority_route === 'physical_care';
  const capabilities = documentation?.editor_capabilities || {};

  const updatePath = (path, value) => {
    setDraft((current) => withAt(current, path, value));
    trackDoctorEvent('documentation_edit_started', { mode: demo ? 'demo' : 'live', section: path.split('.')[0] });
  };
  const undoPath = (path) => setDraft((current) => withAt(current, path, copy(getAt(original, path))));
  const updateActions = (key, rows) => {
    setDraft((current) => ({ ...current, [key]: rows, action_disposition: { ...(current.action_disposition || {}), [key === 'prescription' ? 'prescription' : 'investigation']: rows.length ? 'included' : 'none_indicated' } }));
    trackDoctorEvent('documentation_edit_started', { mode: demo ? 'demo' : 'live', section: key === 'prescription' ? 'prescriptions' : 'investigations' });
  };

  const claim = async () => {
    setBusy(true); setMutationError(null);
    try { setProposal(await mutateReviewClaim({ proposalId, action: 'claim', demo })); }
    catch (claimError) { if (claimError?.status === 403) clearProtectedState(claimError); else setMutationError(claimError); }
    finally { setBusy(false); }
  };

  const openConfirmation = () => {
    setMutationError(null); setConfirmOpen(true);
    trackDoctorEvent('documentation_confirmation_opened', { mode: demo ? 'demo' : 'live', changed_fields: changes.length, action_count: (draft?.prescription?.length || 0) + (draft?.investigation?.length || 0) });
  };

  const submit = async () => {
    const decision = changes.length ? 'edit_and_approve' : 'approve_as_written';
    const payload = {
      decision,
      proposal_hash: proposal.proposal_hash,
      reason: reason.trim(),
      clinical_attestations: { allergies_and_interactions_reviewed: finalAttestation, documentation_reviewed: true },
      ...(changes.length ? { edited_proposal: { ...buildCompleteDocumentationEdit(documentation.edit_contract, draft), clinical_attestations: { allergies_and_interactions_reviewed: finalAttestation, documentation_reviewed: true } } } : {}),
    };
    frozenPayloadRef.current = copy(payload);
    setBusy(true); setMutationError(null); setUnresolved(null);
    const releaseSubmissionGuard = setClinicalSubmissionActive(true);
    if (!commandKeyRef.current) commandKeyRef.current = getCommandKey(`documentation-decision:${proposalId}:${proposal.proposal_hash}`);
    try {
      const next = await submitDoctorDecision({ proposalId, payload: frozenPayloadRef.current, demo, commandKey: commandKeyRef.current, correlationId: proposal.correlation_id });
      setProposal(next); setResult(next); setConfirmOpen(false); setOriginal(null); setDraft(null); setStaleComparison(null); setReapplyChanges([]); frozenPayloadRef.current = null;
      trackDoctorEvent('documentation_decision_result', { mode: demo ? 'demo' : 'live', decision, status: next.status });
    } catch (submitError) {
      setMutationError(submitError);
      if (submitError?.status === 403) {
        setConfirmOpen(false); clearProtectedState(submitError);
      } else if (submitError?.status === 409 || submitError?.staleProposal) {
        const staleDraft = copy(draft);
        setStaleComparison(staleDraft); setConfirmOpen(false); setLoading(true);
        try {
          const latest = await fetchProposal({ proposalId, demo });
          const latestContract = latest.clinical_documentation?.edit_contract;
          setProposal(latest); setOriginal(copy(latestContract)); setDraft(copy(latestContract)); setReapplyChanges(documentationChanges(latestContract || {}, staleDraft || {})); commandKeyRef.current = null;
        } catch (refreshError) { if (refreshError?.status === 403) clearProtectedState(refreshError); else setError(refreshError); }
        finally { setLoading(false); }
      } else {
        setUnresolved({ message: 'The decision is unresolved. The frozen payload and command identity remain in page memory for a safe retry.' });
      }
    } finally { releaseSubmissionGuard(); setBusy(false); }
  };

  const reapply = (change, index) => {
    setDraft((current) => withAt(current, change.path, copy(change.after)));
    setReapplyChanges((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  if (loading) return <><div className="doc-page-header"><div><div className="vnext-eyebrow">Clinical documentation</div><h1>Reviewing exact SOAP packet</h1></div></div><LoadingState label="Authorizing the latest documentation version…" /></>;
  if (error) return <><div className="doc-page-header"><div><div className="vnext-eyebrow">Clinical documentation</div><h1>Documentation unavailable</h1></div><ActionButton variant="secondary" onClick={() => navigate(-1)}>Back</ActionButton></div><ErrorState error={error} onRetry={() => setReloadKey((value) => value + 1)} /></>;
  if (!proposal || !documentation) return <EmptyState title="Documentation projection unavailable" body="The server did not return an authorized clinical documentation contract." action="Return to case" onAction={() => navigate(-1)} />;

  if (documentation.state === 'unavailable' || documentation.schema_version !== 'care_plan_documentation.v2') return <><div className="doc-page-header"><div><div className="vnext-eyebrow">Clinical documentation</div><h1>{proposal.patient?.display_name || 'Authorized case'}</h1><p>Exact-version SOAP review</p></div><ActionButton variant="secondary" onClick={() => navigate(-1)}>Back to case</ActionButton></div>{safety && <SafetyBanner emergency={proposal.status === 'emergency'}>Use the server-returned physical-care route before ordinary documentation actions.</SafetyBanner>}<div className="doc-unavailable"><Icon name="LockKeyhole" size={24} /><h2>Signed SOAP workflow unavailable</h2><p>{documentation.reason || 'This proposal does not contain hash-covered care_plan_documentation.v2 content.'}</p><p className="vnext-small vnext-muted">Legacy hashes are never rewritten. Request a newly generated v2 proposal where the backend supports it.</p></div></>;

  const currentSection = SECTION_DEFINITIONS.find((section) => section.id === activeSection) || SECTION_DEFINITIONS[0];
  const canEdit = capabilities.can_edit && !documentation.signed && !safety;
  const editable = isClaimed && canEdit;
  const approvalDisabled = !editable || validationErrors.length > 0 || busy;
  return <div className="doc-workspace">
    <div className="doc-page-header"><div><div className="vnext-eyebrow">AI-prepared clinical documentation</div><h1>{proposal.patient?.display_name || 'Authorized patient'}</h1><p>{proposal.presenting_problem || 'Presenting problem not returned'}</p></div><div className="doc-page-header__actions"><StatusBadge status={documentation.signed ? 'authorized' : 'pending'} label={documentation.signed ? 'Clinician signed' : 'Not signed'} /><HashBadge hash={documentation.content_hash} exact={false} /><ActionButton variant="secondary" onClick={() => navigate(-1)}>Back to case</ActionButton></div></div>
    {safety && <SafetyBanner emergency={proposal.status === 'emergency'}>The server safety route takes precedence. Documentation approval controls are suppressed.</SafetyBanner>}
    {!documentation.signed && !isClaimed && !safety && <div className="doc-claim-banner"><Icon name="LockKeyhole" /><div><strong>Claim this case before editing or signing</strong><p>The SOAP packet is read-only until the server returns an active privacy-safe lease.</p></div><ActionButton variant="primary" onClick={claim} disabled={busy}>{busy ? 'Claiming…' : 'Claim and review'}</ActionButton></div>}
    {mutationError && <div className="doc-inline-error"><ErrorState error={mutationError} compact /></div>}
    {unresolved && <div className="vnext-notice vnext-notice--warning doc-unresolved" role="status"><strong>Decision unresolved</strong><p>{unresolved.message}</p><ActionButton variant="secondary" onClick={submit} disabled={busy}>Retry frozen decision</ActionButton></div>}
    {!result && <section className="doc-context-card doc-draft-save" aria-live="polite"><div className="doc-context-card__row"><span>Unsaved review draft</span><strong>{draftSaveState === "saving" ? "Saving…" : draftSaveState === "failed" ? "Save failed" : draftSaveState === "stale" ? "Version changed" : changes.length ? "Saved" : "No changes"}</strong></div><p className="vnext-small vnext-muted">This draft is private working material and never signs or activates care.</p><div className="vnext-form-actions"><ActionButton variant="secondary" onClick={persistDraft} disabled={draftSaveState === "saving" || !changes.length}>{draftSaveState === "saving" ? "Saving…" : "Save draft"}</ActionButton>{draftSaveState === "stale" && <span className="vnext-small vnext-field--danger">Reload the latest proposal before saving again.</span>}</div></section>}
    {reapplyChanges.length > 0 && <section className="doc-reapply" aria-labelledby="doc-reapply-title"><div><div className="vnext-eyebrow">New exact version loaded</div><h2 id="doc-reapply-title">Reapply prior draft changes one field at a time</h2><p>No old value was merged automatically. Compare each change with the current server proposal.</p></div><div>{reapplyChanges.map((change, index) => <article key={`${change.path}-${index}`}><div><strong>{change.path.replaceAll('.', ' › ')}</strong><span>{conciseValue(change.after)}</span></div><ActionButton variant="secondary" onClick={() => reapply(change, index)}>Reapply this field</ActionButton></article>)}</div></section>}
    {result || documentation.signed ? <section className="doc-signed-result"><div className="doc-signed-result__mark"><Icon name="CheckCircle2" size={26} /></div><div><div className="vnext-eyebrow">Server-authorized outcome</div><h2>Documentation signed against the exact clinical version</h2><p>The AI draft is now either approved as written or replaced by an immutable clinician-authored child version.</p><dl><div><dt>Signed version</dt><dd>{proposal.execution_state?.signed_version_id || documentation.version_id || 'Returned in documentation projection'}</dd></div><div><dt>Signed hash</dt><dd><code>…{publicHashSuffix(proposal.execution_state?.signed_content_hash || documentation.content_hash)}</code></dd></div><div><dt>Downstream owner</dt><dd>{proposal.execution_state?.downstream_owner?.role || proposal.execution_state?.owner || 'Not returned'}</dd></div><div><dt>Due</dt><dd>{formatDateTime(proposal.execution_state?.due_at)}</dd></div><div><dt>Next checkpoint</dt><dd>{proposal.execution_state?.next_checkpoint?.title || proposal.execution_state?.next_checkpoint || 'Not returned'}</dd></div></dl>{documentation.amendment_diff?.length > 0 && <p className="vnext-small vnext-muted">The server recorded {documentation.amendment_diff.length} privacy-minimal amendment paths.</p>}<ActionButton variant="primary" onClick={() => navigate(-1)}>Return to case</ActionButton></div></section> : <>
      <div className="doc-mobile-stepper" aria-label="Documentation steps">{SECTION_DEFINITIONS.map((section, index) => <button key={section.id} aria-current={section.id === activeSection ? 'step' : undefined} onClick={() => setActiveSection(section.id)}><span>{section.short}</span><small>{index + 1} of {SECTION_DEFINITIONS.length}</small></button>)}</div>
      <div className="doc-layout">
        <aside className="doc-section-rail"><div className="doc-section-rail__header"><span>Documentation</span><strong>{changes.length} change{changes.length === 1 ? '' : 's'}</strong></div><nav aria-label="SOAP documentation sections">{SECTION_DEFINITIONS.map((section, index) => <button key={section.id} aria-current={section.id === activeSection ? 'page' : undefined} onClick={() => setActiveSection(section.id)}><span className="doc-section-rail__index">{section.short}</span><span><strong>{section.label}</strong><small>{index + 1} of {SECTION_DEFINITIONS.length}</small></span>{changes.some((change) => change.path === section.id || change.path.startsWith(`${section.id}.`) || (section.id === 'prescriptions' && change.path.startsWith('prescription')) || (section.id === 'investigations' && change.path.startsWith('investigation'))) && <i aria-label="Contains changes" />}</button>)}</nav><div className="doc-section-rail__privacy"><Icon name="LockKeyhole" size={15} /> Draft held in page memory only</div></aside>
        <fieldset className="doc-editor" aria-label="Structured clinical documentation editor" disabled={!editable} aria-disabled={!editable}>
          {['subjective', 'objective', 'assessment'].includes(currentSection.id) && <section aria-labelledby={`doc-${currentSection.id}-title`}><div className={`doc-section-intro doc-section-intro--${currentSection.id}`}><div><div className="vnext-eyebrow">{currentSection.eyebrow}</div><h2 id={`doc-${currentSection.id}-title`}>{currentSection.label}</h2><p>{currentSection.description}</p></div><span className="doc-section-letter">{currentSection.short}</span></div><div className="doc-field-stack">{currentSection.fields.map(([key, label, rows]) => <ChangedField key={key} label={label} path={`${currentSection.id}.${key}`} rows={rows} draft={draft} original={original} onChange={updatePath} onUndo={undoPath} />)}</div></section>}
          {currentSection.id === 'plan' && <section aria-labelledby="doc-plan-title"><div className="doc-section-intro doc-section-intro--plan"><div><div className="vnext-eyebrow">{currentSection.eyebrow}</div><h2 id="doc-plan-title">Plan</h2><p>{currentSection.description}</p></div><span className="doc-section-letter">P</span></div><div className="doc-field-stack">{currentSection.fields.map(([key, label, rows]) => <ChangedField key={key} label={label} path={`plan.${key}`} rows={rows} draft={draft} original={original} onChange={updatePath} onUndo={undoPath} />)}<ChangedField label="Safety net" path="safety_net.instructions" rows={4} draft={draft} original={original} onChange={updatePath} onUndo={undoPath} /><ChangedField label="Expected outcomes" path="expected_outcomes" rows={4} draft={draft} original={original} onChange={updatePath} onUndo={undoPath} /><ChangedField label="Follow-up checkpoint" path="next_review.checkpoint" rows={3} draft={draft} original={original} onChange={updatePath} onUndo={undoPath} /></div></section>}
          {currentSection.id === 'prescriptions' && <><PrescriptionEditor items={draft.prescription || []} originalItems={original.prescription || []} capabilities={capabilities} onChange={(rows) => updateActions('prescription', rows)} /><label className="doc-none-disposition"><input type="checkbox" checked={(draft.prescription || []).length === 0 && draft.action_disposition?.prescription === 'none_indicated'} disabled={(draft.prescription || []).length > 0} onChange={(event) => updatePath('action_disposition.prescription', event.target.checked ? 'none_indicated' : '')} /> No prescription is clinically indicated in this plan.</label></>}
          {currentSection.id === 'investigations' && <><InvestigationEditor items={draft.investigation || []} originalItems={original.investigation || []} capabilities={capabilities} onChange={(rows) => updateActions('investigation', rows)} /><label className="doc-none-disposition"><input type="checkbox" checked={(draft.investigation || []).length === 0 && draft.action_disposition?.investigation === 'none_indicated'} disabled={(draft.investigation || []).length > 0} onChange={(event) => updatePath('action_disposition.investigation', event.target.checked ? 'none_indicated' : '')} /> No investigation is clinically indicated in this plan.</label></>}
          <div className="doc-editor-footer"><ActionButton variant="secondary" onClick={() => setDraft(copy(original))} disabled={!changes.length || busy}>Undo all amendments</ActionButton><ActionButton variant="primary" onClick={openConfirmation} disabled={approvalDisabled}>{validationErrors.length ? `Resolve ${validationErrors.length} issue${validationErrors.length === 1 ? '' : 's'}` : changes.length ? `Review ${changes.length} change${changes.length === 1 ? '' : 's'}` : 'Review exact approval'}</ActionButton></div>
        </fieldset>
        <aside className="doc-context-rail">
          <section className="doc-context-card doc-context-card--status"><div className="vnext-eyebrow">Clinical authority</div><div className="doc-context-status"><StatusBadge status="pending" label="Not signed" /><span>{documentation.missing_sections?.length ? `${documentation.missing_sections.length} incomplete section(s)` : 'All sections present'}</span></div><dl><div><dt>AI draft</dt><dd><code>…{publicHashSuffix(documentation.source_draft_hash)}</code></dd></div><div><dt>Content hash</dt><dd><code>…{publicHashSuffix(documentation.content_hash)}</code></dd></div><div><dt>Source version</dt><dd>{documentation.source_plan_version_id || 'Not returned'}</dd></div></dl></section>
          <details className="doc-context-card doc-context-evidence" open><summary><span>Evidence provenance</span><strong>{documentation.provenance_coverage?.mapped_source_count || 0} mapped</strong></summary><div>{(documentation.source_provenance || []).map((source, index) => <article key={source.public_id || `${source.path}-${index}`}><div><span className={`doc-source-dot ${source.verified ? 'doc-source-dot--verified' : ''}`} /><strong>{source.label || source.path || 'Clinical source'}</strong></div><small>{source.path || 'Field mapping not returned'}</small>{source.limitation && <p>{source.limitation}</p>}</article>)}</div></details>
          <section className="doc-context-card"><div className="doc-context-card__row"><span>Amendments</span><strong>{changes.length}</strong></div><div className="doc-context-card__row"><span>Prescriptions</span><strong>{draft.prescription?.length || 0}</strong></div><div className="doc-context-card__row"><span>Investigations</span><strong>{draft.investigation?.length || 0}</strong></div>{validationErrors.length > 0 && <div className="doc-validation"><strong>Before confirmation</strong><ul>{validationErrors.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul>{validationErrors.length > 6 && <span>+ {validationErrors.length - 6} more</span>}</div>}<ActionButton variant="primary" onClick={openConfirmation} disabled={approvalDisabled}>{changes.length ? 'Review amendments' : 'Review and sign'}</ActionButton></section>
        </aside>
      </div>
      <div className="doc-mobile-review"><div><strong>{changes.length} change{changes.length === 1 ? '' : 's'}</strong><span>{validationErrors.length ? `${validationErrors.length} issue(s) to resolve` : 'Ready for exact-hash review'}</span></div><ActionButton variant="primary" onClick={openConfirmation} disabled={approvalDisabled}>Review</ActionButton></div>
    </>}
    <Modal open={confirmOpen} title={changes.length ? 'Confirm every clinical amendment' : 'Approve exact AI-prepared documentation'} onClose={() => !busy && setConfirmOpen(false)} footer={<><ActionButton variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>Continue reviewing</ActionButton><ActionButton variant="primary" onClick={submit} disabled={busy || !reason.trim() || !finalAttestation}>{busy ? 'Submitting exact decision…' : changes.length ? 'Sign amended version' : 'Approve exact version'}</ActionButton></>}>
      <div className="doc-confirm-summary"><div><span>Source proposal hash</span><code>…{publicHashSuffix(proposal.proposal_hash)}</code></div><div><span>Source content hash</span><code>…{publicHashSuffix(documentation.content_hash)}</code></div><div><span>Decision</span><strong>{changes.length ? 'Edit and approve immutable child version' : 'Approve as written'}</strong></div></div>
      <ChangeReview changes={changes} />
      <div className="doc-confirm-attest"><label><input type="checkbox" checked={finalAttestation} onChange={(event) => setFinalAttestation(event.target.checked)} /> I reviewed the SOAP sections, returned source evidence, allergies, interactions, prescription limits, investigation instructions, safety net, and result-review authority.</label></div>
      <label className="doc-confirm-reason" htmlFor="documentation-clinical-reason"><span>Clinical reason</span><textarea id="documentation-clinical-reason" className="vnext-textarea" rows="4" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the concise clinical basis for this exact-version decision." /></label>
      <p className="vnext-small vnext-muted">The source evidence remains immutable. Only the server can create the signed version, recalculate authority, and return the downstream owner and checkpoint.</p>
    </Modal>
  </div>;
}
