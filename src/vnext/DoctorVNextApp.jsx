import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallButton from '../pwa/InstallButton';
import NotificationLink from '../pwa/NotificationLink';
import { disableDoctorPush } from '../pwa/notificationApi';
import { logout } from '../api';
import { safeDoctorPath } from '../pwa/safePath';
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import CareActivityPanel from './CareActivityPanel';
const ClinicalDocumentationWorkspace = lazy(() => import('./ClinicalDocumentationWorkspace'));
const MessagesScreen = lazy(() => import('./MessagesScreen'));
const NotificationsScreen = lazy(() => import('../pwa/NotificationsScreen'));
const NotificationDestination = lazy(() => import('../pwa/NotificationDestination'));
const CaseScreen = lazy(() => import('./ClinicalCaseScreen'));
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
import { DoctorPatientsScreen, DoctorResultsScreen } from './DoctorCollections';

const NAV_ITEMS = [
  { href: '/app/queue', label: 'Review queue', icon: ClipboardList },
  { href: '/app/alerts', label: 'Alerts', icon: Bell },
  { href: '/app/protocols', label: 'Protocols', icon: BookOpen },
  { href: '/app/contribution', label: 'Contribution', icon: Activity },
  { href: '/app/messages', label: 'Messages', icon: MessageSquare },
  { href: '/app/diagnostics', label: 'Results & services', icon: FileText },
  { href: '/app/patients', label: 'Patients', icon: UsersRound },
];

const mobileItems = [NAV_ITEMS[0], NAV_ITEMS[4], { href: '/app/notifications', label: 'Notifications', icon: Bell }, NAV_ITEMS[1]];
const doctorHref = (href, demo) => demo ? `${href}${href.includes('?') ? '&' : '?'}demo=1` : href;

const useAsyncData = (loader, dependencies = []) => {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    loader(controller.signal).then((data) => { if (active) setState({ loading: false, data, error: null }); }).catch((error) => { if (active && error?.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => { active = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadKey]);
  return { ...state, reload };
};

const pathIs = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

function DoctorShell({ children, demo, queueCount, onResetDemo }) {
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const navigate = useNavigate();
  useEffect(() => { const onOnline = () => setOffline(false); const onOffline = () => setOffline(true); window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); }; }, []);
  return <div className="vnext-root">
    <a className="vnext-skip-link" href="#doctor-main-content">Skip to main content</a>
    <div className="vnext-shell">
      <header className="vnext-header">
        <div className="vnext-header__inner">
          <div className="vnext-brand"><div className="vnext-brand__mark" aria-hidden="true">PH</div><div><div className="vnext-brand__name">Prestige Doctor</div><div className="vnext-brand__sub">Your care team, connected</div></div></div>
          <div className="vnext-header__right"><InstallButton />{!demo && <NotificationLink />}<button type="button" className="vnext-button vnext-button--text vnext-button--small" onClick={async () => { try { await disableDoctorPush(); } catch { /* Local unsubscribe still protects a shared device. */ } logout(); navigate('/login', { replace: true }); }}>Sign out</button>
            {demo && <><span className="vnext-demo-label">Synthetic demo</span><button className="vnext-button vnext-button--text vnext-button--small" onClick={onResetDemo}>Reset demo</button></>}
            <div className="vnext-session"><span className="vnext-session__avatar">DR</span><span className="vnext-session__name">Current clinician</span></div>
            <button className="vnext-icon-button vnext-mobile-menu-button" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileMenu((value) => !value)}><Icon name={mobileMenu ? 'X' : 'Menu'} /></button>
          </div>
        </div>
      </header>
      {offline && <div className="vnext-offline" role="status"><Icon name="AlertTriangle" size={15} /><span><strong>Connection unavailable.</strong> Server state may be out of date. Clinical actions stay unresolved until the Care Kernel responds.</span></div>}
      <div className="vnext-body">
        <aside className={`vnext-sidebar ${mobileMenu ? 'vnext-sidebar--mobile-open' : ''}`} aria-label="Doctor workspace navigation">
          <div className="vnext-sidebar__label">Workspace</div>
          <nav className="vnext-nav">
            {NAV_ITEMS.map(({ href, label, icon: NavIcon }) => <NavLink key={href} to={doctorHref(href, demo)} className={`vnext-nav__item ${pathIs(location.pathname, href) ? 'vnext-nav__item--active' : ''}`} onClick={() => setMobileMenu(false)}><NavIcon size={17} strokeWidth={1.8} /><span>{label}</span>{href === '/app/queue' && queueCount > 0 && <span className="vnext-nav__count">{queueCount}</span>}</NavLink>)}
          </nav>
          <hr className="vnext-sidebar__rule" />
          <div className="vnext-sidebar__label">Clinical context</div>
          <nav className="vnext-nav"><NavLink to={doctorHref('/app/queue', demo)} className="vnext-nav__item" onClick={() => setMobileMenu(false)}><Stethoscope size={17} /><span>Assigned cases</span></NavLink><NavLink to={doctorHref('/app/contribution', demo)} className="vnext-nav__item" onClick={() => setMobileMenu(false)}><UsersRound size={17} /><span>Work metrics</span></NavLink></nav>
          <hr className="vnext-sidebar__rule" />
          <div className="vnext-sidebar__note"><strong><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Clinical authority</strong>Every decision is bound to the exact server proposal version. No clinical state is stored in this browser.</div>
        </aside>
        <main id="doctor-main-content" className="vnext-main"><div className="vnext-main__inner"><RouteErrorBoundary><Suspense fallback={<LoadingState />}>{children}</Suspense></RouteErrorBoundary></div></main>
      </div>
      <nav className="vnext-mobile-nav" aria-label="Mobile workspace navigation">{mobileItems.map(({ href, label, icon: NavIcon }) => <NavLink key={href} to={doctorHref(href, demo)} className={pathIs(location.pathname, href) ? 'active' : ''}><NavIcon size={18} /><span>{label}</span></NavLink>)}</nav>
    </div>
  </div>;
}

function PageHeader({ title, description, eyebrow = 'Clinical workspace', actions }) {
  return <div className="vnext-page-header"><div><div className="vnext-eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="vnext-page-header__actions">{actions}</div>}</div>;
}

function QueueScreen({ demo }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get('queue') || 'assigned');
  const [urgency, setUrgency] = useState(() => searchParams.get('urgency') || 'all');
  const [status, setStatus] = useState(() => searchParams.get('status') || 'all');
  const [reloadAt, setReloadAt] = useState(0);
  const data = useAsyncData((signal) => fetchReviewInbox({ queue: tab, demo, signal }), [demo, tab, reloadAt]);
  useEffect(() => { trackDoctorEvent('queue_viewed', { mode: demo ? 'demo' : 'live', tab }); }, [demo, tab]);
  useEffect(() => { const next = new URLSearchParams(searchParams); next.set('queue', tab); urgency === 'all' ? next.delete('urgency') : next.set('urgency', urgency); status === 'all' ? next.delete('status') : next.set('status', status); setSearchParams(next, { replace: true }); }, [tab, urgency, status]);
  const rows = useMemo(() => {
    const source = data.data?.items || [];
    const filtered = source.filter((row) => {
      if (urgency === 'urgent' && row.urgency !== 'urgent') return false;
      if (status !== 'all' && row.status !== status) return false;
      if (urgency === 'soon' && !['soon', 'urgent'].includes(row.urgency)) return false;
      if (tab === 'assigned') return row.route_mode === 'assigned' && !row.claimed_by_current_doctor;
      if (tab === 'mine') return row.claimed_by_current_doctor;
      return row.pool_preview || row.route_mode === 'covering_pool';
    });
    // The server provides route priority. The client filters and preserves it;
    // it never re-ranks cases using funding, model labels, or local heuristics.
    return filtered;
  }, [data.data, tab, urgency, status]);
  const counts = data.data?.summary || {};
  return <>
    <PageHeader title="Review queue" description="Server-prioritized cases that need a safe clinical decision. Start with urgency, authority, evidence, and the next accountable checkpoint." actions={<ActionButton icon="RefreshCw" variant="secondary" onClick={() => setReloadAt((value) => value + 1)} disabled={data.loading}>Refresh</ActionButton>} />
    <div className="vnext-card-grid">
      <div className="vnext-metric"><div className="vnext-metric__label">Needs attention</div><div className="vnext-metric__value">{counts.needs_attention ?? '—'}</div><div className="vnext-metric__sub">Server queue count</div></div>
      <div className="vnext-metric"><div className="vnext-metric__label">Urgent route</div><div className="vnext-metric__value">{counts.urgent ?? '—'}</div><div className="vnext-metric__sub">Safety and SLA first</div></div>
      <div className="vnext-metric"><div className="vnext-metric__label">Coverage pool</div><div className="vnext-metric__value">{counts.pool ?? '—'}</div><div className="vnext-metric__sub">Minimum necessary preview</div></div>
    </div>
    <div className="vnext-spaced"><CareActivityPanel demo={demo} onOpenCase={(caseId) => { trackDoctorEvent('ongoing_care_opened', { mode: demo ? 'demo' : 'live' }); navigate(doctorHref(`/app/cases/${encodeURIComponent(caseId)}`, demo)); }} /></div>
    <div className="vnext-section-heading"><div><h2>Cases</h2><p>Funding or sponsorship never changes this order, authority, or due time.</p></div></div>
    <div className="vnext-tabs" role="tablist" aria-label="Queue views">
      {[['assigned', 'Assigned', counts.assigned], ['mine', 'Mine', counts.mine], ['pool', 'Coverage pool', counts.pool]].map(([value, label, count]) => <button key={value} className={`vnext-tab ${tab === value ? 'vnext-tab--active' : ''}`} role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{label}<span className="vnext-count">{count ?? '—'}</span></button>)}
    </div>
    <div className="vnext-toolbar" style={{ marginTop: 14 }}><div className="vnext-filter"><label htmlFor="queue-urgency">Urgency</label><select id="queue-urgency" className="vnext-select" value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="all">All</option><option value="urgent">Urgent only</option><option value="soon">Due soon or urgent</option></select></div><div className="vnext-filter"><label htmlFor="queue-status">Status</label><select id="queue-status" className="vnext-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="needs_attention">Needs attention</option><option value="pending">Pending</option><option value="waiting_on_patient">Waiting on patient</option><option value="in_progress">In progress</option></select></div><SafeNote>Queue order is server-owned. Local filters do not create priority.</SafeNote></div>
    {tab === 'pool' && <div className="vnext-pool-callout"><Icon name="LockKeyhole" size={18} /><p><strong>Coverage pool privacy.</strong> Patient identity, clinical detail, and proposal hashes remain withheld until a successful claim returns the full proposal.</p></div>}
    <div className="vnext-panel" style={{ marginTop: 12 }}>
      {data.loading ? <LoadingState label="Loading the server-prioritized queue…" /> : data.error ? <ErrorState error={data.error} onRetry={() => setReloadAt((value) => value + 1)} /> : rows.length === 0 ? <EmptyState title="No cases in this view" body="The server did not return a case for this filter. Your clinical queue is not being inferred in the browser." /> : <div style={{ overflowX: 'auto' }}><table className="vnext-queue-table"><thead><tr><th>Case</th><th>Route</th><th>Urgency</th><th>Authority</th><th>Evidence</th><th>Deadline</th><th><span className="vnext-sr-only">Action</span></th></tr></thead><tbody>{rows.map((row) => <QueueRow key={row.public_id} row={row} onOpen={() => { trackDoctorEvent('case_opened', { mode: demo ? 'demo' : 'live', route: row.route_mode, pool_preview: row.pool_preview }); navigate(doctorHref(`/app/cases/${encodeURIComponent(row.public_id)}`, demo)); }} />)}</tbody></table></div>}
    </div>
  </>;
}

function QueueRow({ row, onOpen }) {
  const due = formatRelativeDue(row.due_at);
  return <tr>
    <td data-label="Case"><div className="vnext-queue-table__case">{row.pool_preview ? <div className="vnext-private-preview"><Icon name="LockKeyhole" size={16} /><div><strong>Coverage case</strong><span>Details withheld until claim</span></div></div> : <><strong>{row.patient?.display_name || 'Authorized patient'}</strong><span>{row.presenting_problem || 'Clinical case returned by the server'}</span>{row.protected_population && <ProtectedLabel />}</>}</div></td>
    <td data-label="Route"><StatusBadge status={row.route_mode === 'covering_pool' ? 'pending' : row.status} label={row.route_mode === 'covering_pool' ? 'Coverage pool' : row.route_mode === 'assigned' ? 'Assigned' : statusLabel(row.route_mode)} /></td>
    <td data-label="Urgency"><UrgencyBadge item={row} /></td>
    <td data-label="Authority"><span className="vnext-small">{row.requested_authority}</span>{row.information_resubmission && <div className="vnext-small" style={{ color: 'var(--vnext-amber)', marginTop: 3 }}>New information returned</div>}</td>
    <td data-label="Evidence"><span className="vnext-small">{row.pool_preview ? 'Withheld' : row.evidence_completeness?.label || 'Returned by server'}</span></td>
    <td data-label="Deadline"><span className={due.overdue ? 'vnext-field--danger' : ''}>{due.label}</span><div className="vnext-small vnext-muted">{row.due_at ? formatDateTime(row.due_at) : 'Not supplied'}</div></td>
    <td data-label="Action"><button className="vnext-row-action" onClick={onOpen}>{row.pool_preview ? 'Claim to view' : row.claimed_by_current_doctor ? 'Continue review' : 'Open case'} <LinkArrow /></button></td>
  </tr>;
}

function AlertsScreen({ demo }) {
  const data = useAsyncData((signal) => fetchReviewAlerts({ demo, signal }), [demo]);
  const navigate = useNavigate();
  return <><PageHeader title="Alerts" description="Mobilization and SLA signals from the server. An alert is not the clinical packet; open the linked case to review authority and evidence." />{data.loading ? <LoadingState /> : data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : <div className="vnext-panel">{(data.data || []).length ? (data.data || []).map((alert) => <button className="vnext-alert-row" key={alert.public_id} onClick={() => alert.proposal_id && navigate(doctorHref(`/app/cases/${encodeURIComponent(alert.proposal_id)}`, demo))}><span className={`vnext-alert-row__icon vnext-alert-row__icon--${statusTone(alert.status)}`}><Bell size={17} /></span><span><strong>{alert.label}</strong><small>{formatDateTime(alert.due_at)} · {statusLabel(alert.status)}</small></span><LinkArrow /></button>) : <EmptyState title="No active alerts" body="The server has not returned a mobilization alert for this view." />}</div>}</>;
}

function ProtocolsScreen({ demo }) {
  const data = useAsyncData((signal) => fetchProtocolCandidates({ demo, signal }), [demo]);
  const navigate = useNavigate();
  return <><PageHeader title="Protocol governance" description="Learning and protocol decisions stay separate from patient care. Nothing here changes a patient plan or inbox priority." />{data.loading ? <LoadingState /> : data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : <div className="vnext-panel"><div className="vnext-panel__header"><div><div className="vnext-eyebrow">Candidate evidence</div><h2>Review separately from clinical cases</h2></div></div>{(data.data || []).map((candidate) => <button key={candidate.public_id} className="vnext-list-row" onClick={() => navigate(doctorHref(`/app/protocols/${encodeURIComponent(candidate.public_id)}`, demo))}><span><strong>{candidate.title}</strong><small>{candidate.cohort_match} · sample size {candidate.sample_size ?? 'not returned'}</small></span><StatusBadge status="pending" label={statusLabel(candidate.status)} /><LinkArrow /></button>)}</div>}</>;
}

function ProtocolCandidateScreen({ demo, candidateId }) {
  const data = useAsyncData((signal) => fetchProtocolCandidates({ demo, signal }), [demo]);
  const candidate = (data.data || []).find((item) => item.public_id === candidateId);
  const [decision, setDecision] = useState('');
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionResult, setDecisionResult] = useState(null);
  const submit = async () => { setBusy(true); setDecisionError(null); try { const result = await submitProtocolDecision({ candidateId, payload: { decision, rationale }, demo, commandKey: getCommandKey(`protocol:${candidateId}`) }); setDecisionResult(result); } catch (error) { setDecisionError(error); } finally { setBusy(false); } };
  const allowed = candidate?.allowed_actions || [];
  return <><PageHeader title="Protocol candidate" description="Evidence and governance context only. Patient-specific authority remains in the exact proposal workflow." actions={<NavLink className="vnext-button vnext-button--secondary" to={doctorHref('/app/protocols', demo)}>Back to protocols</NavLink>} />{data.loading ? <LoadingState /> : data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : !candidate ? <EmptyState title="Candidate unavailable" body="This governance candidate was not returned by the server." /> : <><Panel title={candidate.title} eyebrow="Separate governance work mode"><DetailGrid><Field label="Cohort match" value={candidate.cohort_match} /><Field label="Sample size" value={candidate.sample_size} /><Field label="Completeness" value={candidate.completeness} /><Field label="Safety events" value={candidate.safety_events} /><Field label="Outcome comparison" value={candidate.outcome_comparison} /><Field label="Frontier position" value={candidate.frontier_position} /></DetailGrid><SafeNote>Revenue, partner incentives, and funding do not rank or decide a protocol.</SafeNote></Panel><Panel title="Decision status" className="vnext-spaced"><StatusBadge status={decisionResult?.status || candidate.status} />{decisionResult ? <p className="vnext-muted">Governance decision recorded by the server at {formatDateTime(decisionResult.decided_at)}. This does not change an existing patient proposal.</p> : allowed.length ? <><p className="vnext-muted">This is a separate governance decision. It does not approve, prescribe, or amend a patient case.</p><div className="vnext-form-field"><label htmlFor="protocol-rationale">Governance rationale</label><textarea id="protocol-rationale" className="vnext-textarea" value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Summarize the evidence and safety basis." /></div><div className="vnext-toolbar vnext-spaced">{allowed.map((option) => <ActionButton key={option} variant={option === 'reject' ? 'danger' : option === 'approve' ? 'primary' : 'secondary'} onClick={() => setDecision(option)} disabled={busy}>{statusLabel(option)}</ActionButton>)}</div>{decision && <div className="vnext-notice vnext-notice--warning"><strong>Ready to submit: {statusLabel(decision)}</strong><div className="vnext-form-actions"><ActionButton variant="secondary" onClick={() => setDecision('')} disabled={busy}>Cancel</ActionButton><ActionButton variant="primary" onClick={submit} disabled={busy || !rationale.trim()}>{busy ? 'Submitting…' : 'Confirm governance decision'}</ActionButton></div></div>}{decisionError && <div className="vnext-spaced"><ErrorState error={decisionError} compact /></div>}</> : <p className="vnext-muted">The server did not return authorized governance actions. This view remains read-only.</p>}</Panel></>}</>;
}

function ContributionScreen({ demo }) {
  const data = useAsyncData((signal) => fetchContribution({ demo, signal }), [demo]);
  return <><PageHeader title="Contribution" description="Measured active clinical work and outcomes, not quotas, speed rankings, margin, or revenue pressure." />{data.loading ? <LoadingState /> : data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : <><div className="vnext-card-grid"><div className="vnext-metric"><div className="vnext-metric__label">Active clinician minutes</div><div className="vnext-metric__value">{data.data.active_minutes ?? '—'}</div><div className="vnext-metric__sub">Server-measured engagement</div></div><div className="vnext-metric"><div className="vnext-metric__label">Safely resolved cases</div><div className="vnext-metric__value">{data.data.safely_resolved_cases ?? '—'}</div><div className="vnext-metric__sub">Returned dispositions</div></div><div className="vnext-metric"><div className="vnext-metric__label">Information cycles</div><div className="vnext-metric__value">{data.data.information_cycles ?? '—'}</div><div className="vnext-metric__sub">Cases needing a return</div></div></div><Panel title="Measured dispositions" className="vnext-spaced"><DetailGrid><Field label="Approved" value={data.data.disposition?.approved} /><Field label="Amended" value={data.data.disposition?.amended} /><Field label="Escalated" value={data.data.disposition?.escalated} /><Field label="Outcome completeness" value={data.data.outcome_completeness} /><Field label="Minutes per episode" value={data.data.minutes_per_episode} /><Field label="Resource cost" value={data.data.attributable_resource_cost} /></DetailGrid></Panel></>}</>;
}

function PatientProgressScreen({ demo, patientId }) {
  const data = useAsyncData((signal) => fetchPatientProgress({ patientId, demo, signal }), [patientId, demo]);
  if (data.loading) return <><PageHeader title="Patient progress" /><LoadingState /></>;
  if (data.error) return <><PageHeader title="Patient progress" /><ErrorState error={data.error} onRetry={data.reload} /></>;
  const progress = data.data;
  const goal = progress.goal || {};
  return <><PageHeader title="Patient progress" description="Authorized longitudinal context is read-only here. Material changes require a new exact-hash clinical proposal." actions={<NavLink className="vnext-button vnext-button--secondary" to={doctorHref('/app/queue', demo)}>Back to queue</NavLink>} />
    <Panel title={progress.patient?.display_name || 'Authorized patient'} eyebrow="Authorized patient context"><DetailGrid><Field label="Patient identifier" value={progress.patient_id} mono /><Field label="Age" value={progress.patient?.age} /><Field label="Population" value={progress.patient?.population_label} /><Field label="Goal status" value={<StatusBadge status={goal.status || 'in_progress'} />} /></DetailGrid></Panel>
    <Panel title="Canonical goal context" className="vnext-spaced"><h3 className="vnext-goal-title">{goal.patient_wording || 'Goal wording not returned'}</h3><p className="vnext-muted">{goal.desired_life_outcome || 'Desired life outcome not returned'}</p>{goal.progress !== undefined && goal.progress !== null && <><div className="vnext-progress-bar" aria-label={`Verified progress ${goal.progress}%`}><span style={{ width: `${Math.max(0, Math.min(100, Number(goal.progress)))}%` }} /></div><p className="vnext-small vnext-muted">{goal.progress}% verified progress · {goal.progress_source || 'Server evidence'}</p></>}</Panel>
    <div className="vnext-card-grid vnext-spaced"><Panel title="Next checkpoint"><DetailGrid><Field label="Action" value={progress.episode?.next_action} /><Field label="Owner" value={progress.episode?.owner} /><Field label="Due" value={formatDateTime(progress.episode?.due_at)} /></DetailGrid></Panel><Panel title="Execution (read-only)"><DetailGrid><Field label="Approved plan hash" value={progress.execution?.approved_plan_hash ? `…${String(progress.execution.approved_plan_hash).slice(-12)}` : 'Not supplied'} mono /><Field label="Authorized quantity" value={progress.execution?.authorized_quantity} /><Field label="Remaining quantity" value={progress.execution?.remaining_quantity} /><Field label="Outcome" value={progress.execution?.outcome_state || 'Missing'} /></DetailGrid></Panel></div>
    <Panel title="Verified timeline" className="vnext-spaced"><div className="vnext-timeline">{(progress.timeline || []).map((item, index) => <div className="vnext-timeline__item" key={`${item.at}-${index}`}><span className="vnext-timeline__dot" /><div><strong>{item.label}</strong><span>{formatDateTime(item.at)} · {statusLabel(item.status)}</span></div></div>)}</div></Panel>
  </>;
}

function ClinicalServiceScreen({ demo, orderId }) {
  const navigate = useNavigate();
  const data = useAsyncData((signal) => fetchClinicalServiceOrder({ orderId, demo, signal }), [orderId, demo]);
  if (data.loading) return <><PageHeader title="Clinical service" /><LoadingState /></>;
  if (data.error) return <><PageHeader title="Clinical service" /><ErrorState error={data.error} onRetry={data.reload} /></>;
  const order = data.data;
  return <><PageHeader title="Clinical service" description="A separate GP or specialist service uses the same exact proposal authority checkpoint. The AI-prepared draft is never a signed note." actions={<><ActionButton variant="secondary" onClick={() => navigate(doctorHref(`/app/cases/${encodeURIComponent(order.linked_proposal_id)}`, demo))} disabled={!order.linked_proposal_id}>Open linked case</ActionButton><ActionButton variant="primary" onClick={() => navigate(doctorHref(`/app/cases/${encodeURIComponent(order.linked_proposal_id)}/documentation`, demo))} disabled={!order.linked_proposal_id}>Review documentation</ActionButton></>} />
    <Panel title={`${order.clinician_class || 'Clinician'} · ${order.modality || 'Service'}`} eyebrow="Server-returned clinical-service projection"><DetailGrid><Field label="Service SKU" value={order.sku} /><Field label="Status" value={<StatusBadge status={order.status} />} /><Field label="Consent" value={order.consent_state || 'Not supplied'} /><Field label="Due" value={formatDateTime(order.due_at)} /><Field label="Authority" value={order.authority_label} /><Field label="Exact proposal" value={<HashBadge hash={order.proposal_hash} />} /></DetailGrid><SafeNote>Service type, patient consent, due time, and authority are separate from any managed follow-up pathway. No funding information is used here.</SafeNote></Panel>
    {order.ai_prepared_draft ? <Panel title="AI-prepared draft" eyebrow={`Draft version …${String(order.ai_draft_hash || 'not returned').slice(-12)}`} className="vnext-spaced"><div className="vnext-notice vnext-notice--warning"><strong>Not signed.</strong> Compare this draft with the evidence, then use the linked proposal’s exact-hash decision flow.</div><div className="vnext-form-grid vnext-spaced"><Field label="Draft impression" value={order.ai_prepared_draft.impression} /><Field label="Draft plan" value={order.ai_prepared_draft.plan} /></div></Panel> : <Panel title="Draft unavailable" className="vnext-spaced"><p className="vnext-muted">The server did not return an AI-prepared draft for this order. No draft is invented in the browser.</p></Panel>}
    {order.modality?.toLowerCase().includes('audio') || order.modality?.toLowerCase().includes('video') ? <Panel title="Operational call state" className="vnext-spaced"><DetailGrid><Field label="Appointment state" value={order.appointment?.state || 'Not supplied'} /><Field label="Join action" value={order.appointment?.join_action ? 'Server action returned' : 'No join action returned'} /></DetailGrid><SafeNote>A browser timer or closed call window cannot establish a completed encounter. Call completion is available only when the server returns that action.</SafeNote></Panel> : null}
  </>;
}

function TransitionScreen({ demo, transitionId }) {
  const data = useAsyncData((signal) => fetchProviderTransition({ transitionId, demo, signal }), [transitionId, demo]);
  if (data.loading) return <><PageHeader title="Care transition" /><LoadingState /></>;
  if (data.error) return <><PageHeader title="Care transition" /><ErrorState error={data.error} onRetry={data.reload} /></>;
  const transition = data.data;
  return <><PageHeader title="Care transition" description="Clinically scoped referral, attendance, discharge, and follow-up context. This screen cannot create a prescription or replace the proposal authority checkpoint." /><Panel title={transition.protocol?.name || 'Provider transition'} eyebrow={`Protocol ${transition.protocol?.version || 'not returned'}`}><DetailGrid><Field label="Status" value={<StatusBadge status={transition.status} />} /><Field label="Consent" value={transition.consent_state || 'Not supplied'} /><Field label="Provider" value={transition.provider?.name} /><Field label="Location" value={transition.provider?.location} /><Field label="Evidence gaps" value={transition.evidence_gaps?.length ? transition.evidence_gaps.join(', ') : 'No gaps returned'} /><Field label="Next checkpoint" value={transition.next_checkpoint?.title} /></DetailGrid></Panel>{transition.safety_escalation && <div className="vnext-spaced"><SafetyBanner emergency={transition.safety_escalation.urgent}>{transition.safety_escalation.instructions || 'Use the server-returned physical-care route if symptoms worsen.'}</SafetyBanner></div>}<div className="vnext-card-grid vnext-spaced"><Panel title="Attendance / check-in"><DetailGrid><Field label="Appointment" value={formatDateTime(transition.attendance?.appointment_at)} /><Field label="Check-in" value={transition.attendance?.check_in_state} /><Field label="Attended" value={transition.attendance?.attended_state} /></DetailGrid></Panel><Panel title="Discharge context"><p className="vnext-muted">{transition.discharge ? 'Clinician-attested discharge context returned by the server.' : 'No discharge context returned for this transition.'}</p>{transition.discharge && <DetailGrid><Field label="Attestation" value={transition.discharge.attestation_state} /><Field label="Next contact" value={transition.discharge.next_clinical_contact} /></DetailGrid>}</Panel></div><Panel title="Transition timeline" className="vnext-spaced"><div className="vnext-timeline">{(transition.timeline || []).map((item, index) => <div className="vnext-timeline__item" key={`${item.at}-${index}`}><span className="vnext-timeline__dot" /><div><strong>{item.label}</strong><span>{formatDateTime(item.at)} · {statusLabel(item.status)}</span></div></div>)}</div></Panel><SafeNote>Provider inclusion, if returned, does not alter clinical priority, consent, authority, or disposition.</SafeNote></>;
}

export default function DoctorVNextApp({ demo = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeDemo = isDemoEnabled(demo || location.pathname.startsWith('/demo/doctor') || new URLSearchParams(location.search).get('demo') === '1');
  const path = (location.pathname === '/demo/doctor' ? location.pathname : safeDoctorPath(location.pathname, '/invalid-route')).replace(/\/$/, '');
  const match = (prefix) => path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length).replace(/^\//, '')) : null;
  let content;
  if (path === '/app' || path === '/app/queue' || path === '/demo/doctor') content = <QueueScreen demo={activeDemo} />;
  else if (path.startsWith('/app/cases/') && path.endsWith('/documentation')) content = <ClinicalDocumentationWorkspace demo={activeDemo} proposalId={decodeURIComponent(path.slice('/app/cases/'.length, -'/documentation'.length))} />;
  else if (path.startsWith('/app/cases/') && path.endsWith('/decision')) content = <CaseScreen demo={activeDemo} proposalId={decodeURIComponent(path.slice('/app/cases/'.length, -'/decision'.length))} focusDecision />;
  else if (path.startsWith('/app/cases/')) content = <CaseScreen demo={activeDemo} proposalId={match('/app/cases/')} />;
  else if (path.startsWith('/app/clinical-services/')) content = <ClinicalServiceScreen demo={activeDemo} orderId={match('/app/clinical-services/')} />;
  else if (path.startsWith('/app/transitions/')) content = <TransitionScreen demo={activeDemo} transitionId={match('/app/transitions/')} />;
  else if (path.startsWith('/app/patients/') && path.endsWith('/approved-care')) content = <PatientProgressScreen demo={activeDemo} patientId={decodeURIComponent(path.slice('/app/patients/'.length, -'/approved-care'.length))} />;
  else if (path.startsWith('/app/patients/')) content = <PatientProgressScreen demo={activeDemo} patientId={match('/app/patients/')} />;
  else if (path === '/app/patients') content = <DoctorPatientsScreen demo={activeDemo} />;
  else if (path === '/app/diagnostics') content = <DoctorResultsScreen demo={activeDemo} />;
  else if (path === '/app/alerts') content = <AlertsScreen demo={activeDemo} />;
  else if (path.startsWith('/app/protocols/')) content = <ProtocolCandidateScreen demo={activeDemo} candidateId={match('/app/protocols/')} />;
  else if (path === '/app/protocols') content = <ProtocolsScreen demo={activeDemo} />;
  else if (path === '/app/contribution') content = <ContributionScreen demo={activeDemo} />;
  else if (path === '/app/messages' || path.startsWith('/app/messages/')) content = <MessagesScreen conversationId={match('/app/messages/')} />;
  else if (path.startsWith('/app/notifications/')) content = <NotificationDestination notificationId={match('/app/notifications/')} />;
  else if (path === '/app/notifications') content = <NotificationsScreen />;
  else content = <EmptyState title="Workspace route unavailable" body="This route is not part of the doctor Care Kernel vNext surface." action="Open review queue" onAction={() => navigate(doctorHref('/app/queue', activeDemo))} />;
  const queueData = useQueueCount(activeDemo);
  const resetDemo = activeDemo ? () => resetSyntheticDemo().then(() => { if (typeof window !== 'undefined') window.location.reload(); }) : undefined;
  return <DoctorShell demo={activeDemo} queueCount={queueData} onResetDemo={resetDemo}><React.Fragment key={path}>{content}</React.Fragment></DoctorShell>;
}

function useQueueCount(demo) {
  const [count, setCount] = useState(0);
  useEffect(() => { let active = true; fetchReviewInbox({ demo }).then((result) => { if (active) setCount((result.items || []).filter((row) => row.status !== 'completed').length); }).catch(() => null); return () => { active = false; }; }, [demo]);
  return count;
}
