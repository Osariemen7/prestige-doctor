import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, BookOpen, ClipboardList, Clock3, FileText, HeartPulse, LayoutDashboard, Menu, MessageSquare, RefreshCw, ShieldCheck, Stethoscope, UsersRound, X } from 'lucide-react';
import {
  fetchClinicalServiceOrder,
  fetchContribution,
  fetchPatientProgress,
  fetchProviderTransition,
  fetchReviewAlerts,
  fetchReviewInbox,
  fetchProposal,
  fetchProtocolCandidates,
  getCommandKey,
  isDemoEnabled,
  mutateReviewClaim,
  resetSyntheticDemo,
  submitProtocolDecision,
} from './api';
import { formatDateTime, formatRelativeDue, statusLabel, statusTone } from './contract';
import { trackDoctorEvent } from './analytics';
import {
  ActionButton,
  AccountabilityStrip,
  ActiveDot,
  Checkmark,
  DetailGrid,
  EmptyState,
  ErrorState,
  EvidenceCard,
  Field,
  HashBadge,
  Icon,
  LinkArrow,
  LoadingState,
  Panel,
  ProtectedLabel,
  RouteErrorBoundary,
  SafetyBanner,
  SafeNote,
  SectionHeading,
  StatusBadge,
  UrgencyBadge,
} from './components';
import './doctor-vnext.css';


const doctorHref = (href, demo) => demo ? `${href}${href.includes('?') ? '&' : '?'}demo=1` : href;
function PageHeader({ title, description, eyebrow = 'Clinical workspace', actions }) {
  return <div className="vnext-page-header"><div><div className="vnext-eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="vnext-page-header__actions">{actions}</div>}</div>;
}

export default function CaseScreen({ demo, proposalId, focusDecision = false }) {
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [poolPreview, setPoolPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionResult, setDecisionResult] = useState(null);
  const [stale, setStale] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const decisionKeyRef = useRef(null);

  const loadCase = useCallback(async (signal) => {
    setLoading(true); setError(null); setPoolPreview(null);
    try {
      const result = await fetchProposal({ proposalId, demo, signal });
      setProposal(result);
      setDecisionResult(null);
      setStale(false);
    } catch (loadError) {
      if (loadError?.status === 403 || loadError?.status === 404 || loadError?.code === 'contract_unavailable') {
        try {
          const queue = await fetchReviewInbox({ queue: 'pool', demo, signal });
          const row = (queue.items || []).find((item) => item.public_id === proposalId);
          if (row?.pool_preview) { setPoolPreview(row); setProposal(null); setError(null); }
          else setError(loadError);
        } catch (queueError) { setError(queueError); }
      } else setError(loadError);
    } finally { setLoading(false); }
  }, [demo, proposalId]);

  useEffect(() => { const controller = new AbortController(); loadCase(controller.signal); return () => controller.abort(); }, [loadCase, reloadKey]);
  useEffect(() => { trackDoctorEvent('case_opened', { mode: demo ? 'demo' : 'live', route: 'case_workspace' }); }, [demo]);
  useEffect(() => { if (focusDecision && proposal) window.setTimeout(() => document.getElementById('decision-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }, [focusDecision, proposal]);

  const claim = async (action = 'claim') => {
    setClaiming(true); setClaimError(null);
    try {
      const result = await mutateReviewClaim({ proposalId, action, demo, commandKey: undefined });
      setProposal(result); setPoolPreview(null); setLastInteraction(Date.now());
      trackDoctorEvent(action === 'claim' ? 'case_claimed' : 'case_released', { mode: demo ? 'demo' : 'live' });
    } catch (claimErrorValue) { if (claimErrorValue?.status === 403) { setProposal(null); setPoolPreview(null); setDecisionResult(null); setError(claimErrorValue); } else setClaimError(claimErrorValue); }
    finally { setClaiming(false); }
  };

  const isClaimed = Boolean(
    proposal?.review_claim?.claimed_by_current_doctor
    || (demo && Number(proposal?.review_claim?.claimed_by_provider_id) === 17)
  );
  useEffect(() => {
    if (!proposal || !isClaimed || decisionResult) return undefined;
    const interval = window.setInterval(() => {
      const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
      const recentlyEngaged = Date.now() - lastInteraction < 5 * 60 * 1000;
      if (!visible || !recentlyEngaged) return;
      mutateReviewClaim({ proposalId, action: 'heartbeat', demo }).then(setProposal).catch((heartbeatError) => { if (heartbeatError?.status === 403 || heartbeatError?.code === 'claim_lost') { setProposal(null); setPoolPreview(null); setDecisionResult(null); setError(heartbeatError); } });
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [demo, isClaimed, lastInteraction, proposal, proposalId, decisionResult]);

  const submitDecision = async (payload) => {
    setDecisionBusy(true); setDecisionError(null); setStale(false);
    try {
      const result = await import('./api').then(({ submitDoctorDecision, getCommandKey }) => submitDoctorDecision({ proposalId, payload, demo, commandKey: decisionKeyRef.current || (decisionKeyRef.current = getCommandKey(`decision:${proposalId}:${proposal.proposal_hash}`)), correlationId: proposal.correlation_id }));
      setProposal(result); setDecisionResult(result); setLastInteraction(Date.now());
      trackDoctorEvent('decision_result', { mode: demo ? 'demo' : 'live', decision: payload.decision, status: result.status });
    } catch (decisionErrorValue) {
      setDecisionError(decisionErrorValue);
      if (decisionErrorValue?.status === 403) { setProposal(null); setPoolPreview(null); setDecisionResult(null); setError(decisionErrorValue); }
      if (decisionErrorValue?.status === 409 || decisionErrorValue?.staleProposal) {
        setStale(true);
        decisionKeyRef.current = null;
        setReloadKey((value) => value + 1);
      }
    } finally { setDecisionBusy(false); }
  };

  if (loading) return <><PageHeader title="Case workspace" /><LoadingState label="Authorizing the latest case projection…" /></>;
  if (error) return <><PageHeader title="Case workspace" actions={<ActionButton variant="secondary" onClick={() => navigate(doctorHref('/app/queue', demo))}>Back to queue</ActionButton>} /><ErrorState error={error} onRetry={() => setReloadKey((value) => value + 1)} /></>;
  if (poolPreview) return <PoolClaimView row={poolPreview} claiming={claiming} error={claimError} onClaim={() => claim('claim')} onBack={() => navigate(doctorHref('/app/queue', demo))} />;
  if (!proposal) return <><PageHeader title="Case unavailable" /><EmptyState title="This case is no longer available" body="The server did not return an authorized proposal or a claimable pool preview." action="Return to queue" onAction={() => navigate(doctorHref('/app/queue', demo))} /></>;

  const due = formatRelativeDue(proposal.doctor_review_due_at);
  const safety = ['safety', 'emergency'].includes(proposal.status) || proposal.authority_route === 'physical_care';
  const options = proposal.decision_options?.length ? proposal.decision_options : proposal.authority_checkpoint?.allowed_actions || [];
  const execution = proposal.execution_state || {};
  const verifiedDownstream = Boolean(execution.state || proposal.mobilization?.owner || proposal.authority_checkpoint?.last_decision);
  const release = () => claim('release').then(() => navigate(doctorHref('/app/queue', demo)));
  return <div onClick={() => setLastInteraction(Date.now())} onKeyDown={() => setLastInteraction(Date.now())}>
    <div className="vnext-proposal-header"><div><div className="vnext-eyebrow">Case workspace · {proposal.authority_route}</div><h1>{proposal.patient?.display_name || 'Authorized patient'}</h1><p>{proposal.presenting_problem || 'Presenting problem not returned'}</p></div><div className="vnext-proposal-header__badges"><UrgencyBadge item={{ urgency: safety ? 'urgent' : 'routine', due_at: proposal.doctor_review_due_at }} /><StatusBadge status={proposal.status} /><HashBadge hash={proposal.proposal_hash} /></div></div>
    <div className="vnext-toolbar"><ActionButton variant="secondary" icon="ChevronRight" onClick={() => navigate(doctorHref('/app/queue', demo))}>Back to queue</ActionButton>{proposal.patient?.protected && <ProtectedLabel />}<span className="vnext-muted vnext-small">{due.label} · {formatDateTime(proposal.doctor_review_due_at)}</span>{isClaimed && <span className="vnext-claim-state"><ActiveDot /> Active claim · expires {formatDateTime(proposal.review_claim?.claim_expires_at)}</span>}</div>
    {safety && <SafetyBanner emergency={proposal.status === 'emergency'}>The server returned a safety or physical-care route. It takes precedence over commerce, entitlement, and remote review. Follow the returned disposition; do not delay for payment or sponsorship.</SafetyBanner>}
    {stale && <div className="vnext-notice vnext-notice--warning vnext-spaced"><strong>This proposal changed while you were reviewing it.</strong> The latest exact version has been loaded. Review the changed sections and confirm again; your draft remains in this page memory.</div>}
    {claimError && <div className="vnext-spaced"><ErrorState error={claimError} compact /></div>}
    <DocumentationOverviewCard proposal={proposal} onOpen={() => navigate(doctorHref(`/app/cases/${encodeURIComponent(proposal.public_id)}/documentation`, demo))} />
    <div className="vnext-case-layout vnext-spaced">
      <aside className="vnext-case-layout__left"><Panel className="vnext-case-nav-panel"><nav className="vnext-case-nav" aria-label="Case sections">{[['patient-section', 'Patient'], ['evidence-section', 'Evidence'], ['assessment-section', 'Assessment'], ['plan-section', 'Proposal'], ['decision-section', 'Decision']].map(([id, label]) => <button key={id} aria-current="false" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{label}</button>)}</nav><div className="vnext-case-context"><h3>Authority checkpoint</h3><p>{proposal.authority_route}</p><p>Exact hash required: {proposal.hash_contract?.exact_hash_required ? 'yes' : 'not returned'}</p></div></Panel></aside>
      <div className="vnext-case-center">
        <Panel title="Patient and goal" eyebrow="1 · Clinical target" className="vnext-case-section" id="patient-section"><DetailGrid><Field label="Patient" value={proposal.patient?.display_name} /><Field label="Population" value={proposal.patient?.population_label} /><Field label="Age" value={proposal.patient?.age} /><Field label="Clinical target" value={proposal.patient_goal} /><Field label="Desired life outcome" value={proposal.desired_life_outcome} /><Field label="Authority requested" value={proposal.authority_route} /></DetailGrid><div className="vnext-goal-box"><div className="vnext-eyebrow">Canonical patient goal context</div><strong>{proposal.patient_goal || 'Goal wording not returned'}</strong><p>{proposal.desired_life_outcome || 'Desired life outcome not returned'}</p></div></Panel>
        <Panel title="Current care" eyebrow="2 · Longitudinal context" className="vnext-case-section"><DetailGrid><Field label="Medicines" value={proposal.current_care?.medicines?.join(', ')} /><Field label="Adherence" value={proposal.current_care?.adherence} /><Field label="Monitoring" value={proposal.current_care?.monitoring?.join(', ')} /><Field label="Barriers" value={proposal.current_care?.barriers?.join(', ')} /></DetailGrid><p className="vnext-safe-note"><Icon name="CheckCircle2" size={15} />{proposal.current_care?.last_verified_change || 'Only server-returned progress is shown.'}</p></Panel>
        <Panel title="Evidence and provenance" eyebrow="3 · Review the packet" className="vnext-case-section" id="evidence-section"><div className="vnext-evidence-grid">{proposal.evidence?.length ? proposal.evidence.map((item) => <EvidenceCard key={item.id} evidence={item} />) : <EmptyState title="No evidence returned" body="Do not infer a result or physical examination from an empty evidence packet." />}</div>{proposal.evidence_quality?.gaps?.length > 0 && <div className="vnext-notice vnext-notice--warning vnext-spaced"><strong>Evidence gaps</strong><ul className="vnext-list vnext-list--tight">{proposal.evidence_quality.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}</Panel>
        <Panel title="Impression, differential, and safety" eyebrow="4 · Clinical reasoning packet" className="vnext-case-section" id="assessment-section"><div className="vnext-detail-grid"><Field label="Working impression" value={proposal.impression?.summary || proposal.impression?.assessment} /><Field label="Confidence" value={proposal.impression?.confidence} /><div className="vnext-field"><dt>Ranked differential</dt><dd><ul className="vnext-list vnext-list--tight">{proposal.differential?.map((item) => <li key={item}>{typeof item === 'string' ? item : item.label || JSON.stringify(item)}</li>)}</ul></dd></div><div className="vnext-field vnext-field--danger"><dt>Must-not-miss</dt><dd><ul className="vnext-list vnext-list--tight">{proposal.must_not_miss?.map((item) => <li key={item}>{typeof item === 'string' ? item : item.label || JSON.stringify(item)}</li>)}</ul></dd></div></div></Panel>
        <Panel title="Protocol and exact proposal" eyebrow="5 · Clinical authority" className="vnext-case-section" id="plan-section"><DetailGrid><Field label="Protocol" value={proposal.protocol?.name} /><Field label="Protocol version" value={proposal.protocol?.version} /><Field label="Protocol match" value={proposal.protocol?.match} /><Field label="Exclusions" value={proposal.protocol?.exclusions?.join(', ') || 'None returned'} /><Field label="Parent content hash" value={proposal.hash_contract?.parent_content_hash ? `…${proposal.hash_contract.parent_content_hash.slice(-12)}` : 'Not supplied'} mono /><Field label="AI draft" value={proposal.clinician_work?.ai_draft_hash ? `Prepared · …${proposal.clinician_work.ai_draft_hash.slice(-12)} · not signed` : 'Not returned'} mono /></DetailGrid><div className="vnext-diff vnext-spaced"><div className="vnext-diff__row"><span className="vnext-diff__label">Proposed plan</span><span className="vnext-diff__value">{proposal.proposed_plan_version?.plan_summary || 'Plan summary not returned'}</span></div>{proposal.proposed_plan_version?.safety_net?.instructions && <div className="vnext-diff__row"><span className="vnext-diff__label">Safety net</span><span className="vnext-diff__value">{proposal.proposed_plan_version.safety_net.instructions}</span></div>}</div>{proposal.proposed_plan_version?.regimens?.length ? <div className="vnext-regimen-list vnext-spaced">{proposal.proposed_plan_version.regimens.map((item, index) => <RegimenCard key={`${item.medication_name}-${index}`} regimen={item} />)}</div> : null}</Panel>
        <Panel title="Approved execution" eyebrow="6 · Read-only downstream state" className="vnext-case-section"><ExecutionState proposal={proposal} /></Panel>
        {proposal.missing_information?.questions?.length > 0 && <Panel title="Unresolved questions" eyebrow="7 · Returned to patient or agent" className="vnext-case-section"><ul className="vnext-list">{proposal.missing_information.questions.map((question) => <li key={question}>{question}</li>)}</ul></Panel>}
      </div>
      <aside className="vnext-case-layout__right" id="decision-section"><DecisionPanel proposal={proposal} options={options} isClaimed={isClaimed} claiming={claiming} claimError={claimError} decisionBusy={decisionBusy} decisionError={decisionError} onClaim={() => claim('claim')} onRelease={release} onSubmit={submitDecision} decisionResult={decisionResult} verifiedDownstream={verifiedDownstream} /></aside>
    </div>
  </div>;
}

function DocumentationOverviewCard({ proposal, onOpen }) {
  const documentation = proposal.clinical_documentation || {};
  const unavailable = documentation.state === 'unavailable' || documentation.schema_version !== 'care_plan_documentation.v2';
  const mapped = documentation.provenance_coverage?.mapped_source_count || 0;
  const actionCount = (documentation.prescriptions?.length || 0) + (documentation.investigations?.length || 0);
  return <Panel title="AI-prepared clinical documentation" eyebrow="Detailed SOAP and clinical actions" className="vnext-documentation-overview vnext-spaced">
    <div className="vnext-documentation-overview__hero"><div><StatusBadge status={documentation.signed ? 'authorized' : unavailable ? 'unavailable' : 'pending'} label={documentation.signed ? 'Clinician signed' : unavailable ? 'Unavailable for this version' : 'Not signed'} /><h3>{unavailable ? 'This exact proposal has no hash-covered SOAP packet' : 'Review Subjective, Objective, Assessment, Plan, prescriptions, and investigations'}</h3><p>{unavailable ? documentation.reason || 'Legacy content remains unchanged and cannot enter the signed-SOAP workflow.' : 'The AI-prepared note is a draft. Source evidence stays immutable and every clinician amendment is confirmed before an exact-hash decision.'}</p></div><div className="vnext-documentation-overview__mark"><Icon name={documentation.signed ? 'CheckCircle2' : 'FileCheck2'} size={25} /></div></div>
    {!unavailable && <div className="vnext-documentation-overview__metrics"><div><span>Completeness</span><strong>{documentation.missing_sections?.length ? `${documentation.missing_sections.length} gap(s)` : 'All SOAP sections present'}</strong></div><div><span>Provenance</span><strong>{mapped} source mapping{mapped === 1 ? '' : 's'}</strong></div><div><span>Clinical actions</span><strong>{actionCount} item{actionCount === 1 ? '' : 's'}</strong></div><div><span>Exact content</span><strong className="vnext-mono">…{String(documentation.content_hash || 'not-returned').slice(-12)}</strong></div></div>}
    <div className="vnext-documentation-overview__footer"><SafeNote>Funding, settlement, and clinician financial context are excluded from this authority surface.</SafeNote><ActionButton variant={unavailable ? 'secondary' : 'primary'} onClick={onOpen}>{documentation.signed ? 'View signed documentation' : unavailable ? 'View dependency state' : 'Review clinical documentation'}</ActionButton></div>
  </Panel>;
}

function PoolClaimView({ row, claiming, error, onClaim, onBack }) {
  return <><PageHeader title="Coverage pool case" eyebrow="Minimum-necessary preview" description="Claim the case before protected identity, clinical detail, evidence, or proposal version becomes visible." actions={<ActionButton variant="secondary" onClick={onBack}>Back to queue</ActionButton>} /><div className="vnext-pool-claim"><div className="vnext-pool-claim__icon"><Icon name="LockKeyhole" size={24} /></div><h2>Details withheld until claim</h2><p>This server-returned preview contains only the information needed to decide whether to accept coverage.</p><DetailGrid><Field label="Urgency" value={<UrgencyBadge item={row} />} /><Field label="Deadline" value={formatDateTime(row.due_at)} /><Field label="Route" value={row.route_reason || 'Covering pool'} /><Field label="Requested authority" value={row.requested_authority} /><Field label="Protected population" value={row.protected_population ? 'Returned marker' : 'Not indicated in preview'} /><Field label="Claim lease" value="Server-bounded; details returned only after claim" /></DetailGrid>{error && <div className="vnext-spaced"><ErrorState error={error} compact /></div>}<div className="vnext-form-actions"><ActionButton variant="primary" icon="LockKeyhole" onClick={onClaim} disabled={claiming}>{claiming ? 'Claiming…' : 'Claim case and view details'}</ActionButton></div></div></>;
}

function RegimenCard({ regimen }) {
  const allocation = regimen.order_authorization;
  return <div className="vnext-regimen-card"><div className="vnext-regimen-card__header"><strong>{regimen.medication_name || 'Medication not returned'} {regimen.dose_amount && `${regimen.dose_amount} ${regimen.dose_unit}`}</strong><StatusBadge status={regimen.status} label={regimen.authority_class || statusLabel(regimen.status)} /></div><DetailGrid><Field label="Route" value={regimen.route} /><Field label="Frequency" value={regimen.frequency_text} /><Field label="Duration" value={regimen.duration_days ? `${regimen.duration_days} days` : undefined} /><Field label="Maximum daily dose" value={regimen.maximum_daily_dose ? `${regimen.maximum_daily_dose} ${regimen.maximum_daily_dose_unit}` : undefined} /><Field label="Safety checks" value={regimen.safety_checks?.interaction_check} /><Field label="Instructions" value={regimen.patient_instructions} /></DetailGrid>{allocation && <div className="vnext-regimen-card__allocation"><strong>Exact order authorization</strong><span>Dispense now: {allocation.dispense_quantity} · permitted repeat: {allocation.permitted_repeat_count} · maximum cumulative supply: {allocation.authorized_quantity}</span><span>Repeat condition: scheduled safety/adherence checkpoint remains acceptable</span></div>}</div>;
}

function ExecutionState({ proposal }) {
  const execution = proposal.execution_state || {};
  const hasTruth = Boolean(execution.state || execution.approved_plan_hash || execution.next_checkpoint);
  if (!hasTruth) return <div className="vnext-notice vnext-notice--warning"><strong>Decision recorded; coordination status is being refreshed.</strong><p>Only server-returned owner, checkpoint, due time, and execution evidence will appear here.</p></div>;
  return <><DetailGrid><Field label="State" value={<StatusBadge status={execution.state || proposal.status} />} /><Field label="Approved plan hash" value={execution.approved_plan_hash ? `…${execution.approved_plan_hash.slice(-12)}` : 'Not supplied'} mono /><Field label="Owner" value={execution.owner || proposal.mobilization?.owner} /><Field label="Due / checkpoint" value={formatDateTime(execution.due_at)} /><Field label="Next action" value={execution.next_checkpoint || proposal.mobilization?.next_action} /><Field label="Approval time" value={formatDateTime(execution.approved_at)} /></DetailGrid><AccountabilityStrip owner={execution.owner || proposal.mobilization?.owner} dueAt={execution.due_at} blocker={execution.blocker} nextUpdateAt={proposal.mobilization?.next_update_at} /><SafeNote>Fulfilment, attendance, or pickup is not clinical outcome evidence. The case remains open until the returned managed-follow-up and outcome checkpoints are complete.</SafeNote></>;
}

function DecisionPanel({ proposal, options, isClaimed, claiming, claimError, decisionBusy, decisionError, onClaim, onRelease, onSubmit, decisionResult, verifiedDownstream }) {
  const safety = ['safety', 'emergency'].includes(proposal.status) || proposal.authority_route === 'physical_care';
  return <div className={`vnext-case-right-stack ${safety ? 'vnext-case-right-stack--safety' : ''}`}>
    <Panel className={`vnext-decision-panel ${safety ? 'vnext-decision-panel--safety' : ''}`} title="Decision" eyebrow="Exact-hash authority"><div className="vnext-decision-panel__body">
      <HashBadge hash={proposal.proposal_hash} />
      <p>{isClaimed ? 'Your active claim permits review of this exact proposal version.' : 'A bounded claim is required before the decision controls can be used.'}</p>
      {claimError && <ErrorState error={claimError} compact />}
      {!isClaimed && <ActionButton variant="primary" icon="LockKeyhole" onClick={onClaim} disabled={claiming}>{claiming ? 'Claiming…' : 'Claim case for review'}</ActionButton>}
      {isClaimed && <><DecisionComposer proposal={proposal} options={options} disabled={decisionBusy || Boolean(decisionResult)} onSubmit={onSubmit} error={decisionError} /><button className="vnext-button vnext-button--text vnext-button--small vnext-decision-release" onClick={onRelease} disabled={decisionBusy || Boolean(decisionResult)}>Release unfinished case</button></>}
      {!options.length && <div className="vnext-notice vnext-notice--warning vnext-spaced">The server did not return allowed decision actions. Controls remain disabled.</div>}
      {decisionResult && <div className="vnext-decision-result"><div className="vnext-decision-result__icon"><Checkmark /></div><strong>Decision recorded from the server</strong><p>{decisionResult.status === 'waiting_on_patient' ? 'The same decision cycle is waiting for returned information.' : 'The returned proposal and execution state are now the source of truth.'}</p>{verifiedDownstream ? <StatusBadge status={decisionResult.status} /> : <div className="vnext-notice vnext-notice--warning">Coordination status is being refreshed.</div>}</div>}
    </div></Panel>
    <Panel title="Authority reminders" eyebrow="Keep the boundary visible"><ul className="vnext-list vnext-list--tight"><li>AI preparation is not a signed note.</li><li>Funding never changes priority or authority.</li><li>Material changes require a complete new plan payload and exact hash.</li><li>Physical-care routes are not delayed by payment or membership.</li></ul></Panel>
  </div>;
}

function DecisionComposer({ proposal, options, disabled, onSubmit, error }) {
  const navigate = useNavigate();
  const location = useLocation();
  const documentationDemo = new URLSearchParams(location.search).get('demo') === '1';
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [questions, setQuestions] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const begin = (decision) => {
    if (['approve_as_written', 'edit_and_approve'].includes(decision)) {
      navigate(doctorHref(`/app/cases/${encodeURIComponent(proposal.public_id)}/documentation`, documentationDemo));
      return;
    }
    setSelected(decision); setReason(''); setQuestions(''); setConfirmOpen(false);
  };
  const confirm = () => { setConfirmOpen(false); onSubmit({ decision: selected, proposal_hash: proposal.proposal_hash, reason: reason.trim() || 'Clinician decision based on the exact returned packet', ...(selected === 'request_more_information' ? { questions: questions.split('\n').map((item) => item.trim()).filter(Boolean) } : {}) }); };
  const terminal = ['escalate', 'reject'].includes(selected);
  return <div className="vnext-decision-composer"><div className="vnext-decision-actions">{options.map((option) => <button key={option} className={`vnext-button vnext-button--${option === 'escalate' || option === 'reject' ? 'danger' : option === 'approve_as_written' ? 'primary' : 'secondary'}`} onClick={() => begin(option)} disabled={disabled}>{statusLabel(option)}</button>)}</div>{selected && <div className="vnext-decision-draft"><div className="vnext-eyebrow">{statusLabel(selected)}</div><p className="vnext-muted">This action will be sent with exact proposal hash <code>…{proposal.proposal_hash.slice(-12)}</code>.</p>{selected === 'request_more_information' && <div className="vnext-form-field"><label htmlFor="doctor-questions">Structured questions, one per line</label><textarea id="doctor-questions" className="vnext-textarea" value={questions} onChange={(event) => setQuestions(event.target.value)} placeholder="What verified information is needed for a safe decision?" /></div>}{selected !== 'request_more_information' && <div className="vnext-form-field vnext-spaced"><label htmlFor="doctor-reason">Clinical reason</label><textarea id="doctor-reason" className="vnext-textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document the clinical basis for this action" /></div>}{error && <div className="vnext-spaced"><ErrorState error={error} compact /></div>}<div className="vnext-form-actions"><ActionButton variant="secondary" onClick={() => setSelected(null)} disabled={disabled}>Cancel</ActionButton><ActionButton variant="primary" onClick={() => setConfirmOpen(true)} disabled={disabled || (selected === 'request_more_information' && !questions.trim()) || (terminal && !reason.trim())}>{terminal ? 'Review and confirm' : 'Submit request'}</ActionButton></div></div>}
    <DecisionConfirmation open={confirmOpen} proposal={proposal} selected={selected} reason={reason} onClose={() => setConfirmOpen(false)} onConfirm={confirm} disabled={disabled} />
  </div>;
}

function DecisionConfirmation({ open, proposal, selected, reason, onClose, onConfirm, disabled }) {
  if (!selected) return null;
  return <div className={`vnext-confirm-inline ${open ? 'vnext-confirm-inline--open' : ''}`} aria-hidden={!open}>{open && <div className="vnext-confirm-inline__box" role="dialog" aria-modal="true" aria-labelledby="vnext-confirm-title"><div className="vnext-eyebrow">Final confirmation</div><h3 id="vnext-confirm-title">{statusLabel(selected)}</h3><p>Confirm the clinical action for <strong>{proposal.patient?.display_name || 'authorized patient'}</strong> against exact proposal version <code>…{proposal.proposal_hash.slice(-12)}</code>.</p><div className="vnext-notice vnext-notice--warning">Material changes: {selected === 'edit_and_approve' ? 'The complete clinician-authored plan will create a new exact proposal hash.' : selected === 'approve_as_written' ? 'No material plan edit is being submitted.' : selected === 'request_more_information' ? 'The same decision cycle will wait for structured information.' : 'The server will determine the next safe route.'}</div>{reason && <p className="vnext-small vnext-muted">Reason: {reason}</p>}<div className="vnext-form-actions"><ActionButton variant="secondary" onClick={onClose} disabled={disabled}>Go back</ActionButton><ActionButton variant={selected === 'reject' || selected === 'escalate' ? 'danger' : 'primary'} onClick={onConfirm} disabled={disabled}>{disabled ? 'Sending…' : 'Confirm server action'}</ActionButton></div></div>}</div>;
}
