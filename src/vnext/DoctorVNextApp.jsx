import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import ClinicalDocumentationWorkspace from './ClinicalDocumentationWorkspace';
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

const NAV_ITEMS = [
  { href: '/app/queue', label: 'Review queue', icon: ClipboardList },
  { href: '/app/alerts', label: 'Alerts', icon: Bell },
  { href: '/app/protocols', label: 'Protocols', icon: BookOpen },
  { href: '/app/contribution', label: 'Contribution', icon: Activity },
  { href: '/app/messages', label: 'Messages', icon: MessageSquare },
];

const mobileItems = NAV_ITEMS.slice(0, 4);
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
          <div className="vnext-brand"><div className="vnext-brand__mark" aria-hidden="true">PH</div><div><div className="vnext-brand__name">Prestige Clinical Workspace</div><div className="vnext-brand__sub">Care Kernel vNext · accountable review</div></div></div>
          <div className="vnext-header__right">
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
        <main id="doctor-main-content" className="vnext-main"><div className="vnext-main__inner"><RouteErrorBoundary>{children}</RouteErrorBoundary></div></main>
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
  const [tab, setTab] = useState('assigned');
  const [urgency, setUrgency] = useState('all');
  const [reloadAt, setReloadAt] = useState(0);
  const data = useAsyncData((signal) => fetchReviewInbox({ queue: tab, demo, signal }), [demo, tab, reloadAt]);
  useEffect(() => { trackDoctorEvent('queue_viewed', { mode: demo ? 'demo' : 'live', tab }); }, [demo, tab]);
  const rows = useMemo(() => {
    const source = data.data?.items || [];
    const filtered = source.filter((row) => {
      if (urgency === 'urgent' && row.urgency !== 'urgent') return false;
      if (urgency === 'soon' && !['soon', 'urgent'].includes(row.urgency)) return false;
      if (tab === 'assigned') return row.route_mode === 'assigned' && !row.claimed_by_current_doctor;
      if (tab === 'mine') return row.claimed_by_current_doctor;
      return row.pool_preview || row.route_mode === 'covering_pool';
    });
    // The server provides route priority. The client filters and preserves it;
    // it never re-ranks cases using funding, model labels, or local heuristics.
    return filtered;
  }, [data.data, tab, urgency]);
  const counts = data.data?.summary || {};
  return <>
    <PageHeader title="Review queue" description="Server-prioritized cases that need a safe clinical decision. Start with urgency, authority, evidence, and the next accountable checkpoint." actions={<ActionButton icon="RefreshCw" variant="secondary" onClick={() => setReloadAt((value) => value + 1)} disabled={data.loading}>Refresh</ActionButton>} />
    <div className="vnext-card-grid">
      <div className="vnext-metric"><div className="vnext-metric__label">Needs attention</div><div className="vnext-metric__value">{counts.needs_attention ?? '—'}</div><div className="vnext-metric__sub">Server queue count</div></div>
      <div className="vnext-metric"><div className="vnext-metric__label">Urgent route</div><div className="vnext-metric__value">{counts.urgent ?? '—'}</div><div className="vnext-metric__sub">Safety and SLA first</div></div>
      <div className="vnext-metric"><div className="vnext-metric__label">Coverage pool</div><div className="vnext-metric__value">{counts.pool ?? '—'}</div><div className="vnext-metric__sub">Minimum necessary preview</div></div>
    </div>
    <div className="vnext-section-heading"><div><h2>Cases</h2><p>Funding or sponsorship never changes this order, authority, or due time.</p></div></div>
    <div className="vnext-tabs" role="tablist" aria-label="Queue views">
      {[['assigned', 'Assigned', counts.assigned], ['mine', 'Mine', counts.mine], ['pool', 'Coverage pool', counts.pool]].map(([value, label, count]) => <button key={value} className={`vnext-tab ${tab === value ? 'vnext-tab--active' : ''}`} role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{label}<span className="vnext-count">{count ?? '—'}</span></button>)}
    </div>
    <div className="vnext-toolbar" style={{ marginTop: 14 }}><div className="vnext-filter"><label htmlFor="queue-urgency">Show</label><select id="queue-urgency" className="vnext-select" value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="all">All server-routed cases</option><option value="urgent">Urgent only</option><option value="soon">Due soon or urgent</option></select></div><SafeNote>Queue order is server-owned. Local filters do not create priority.</SafeNote></div>
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

function MessagesScreen() {
  return <><PageHeader title="Messages" description="Patient communication remains scoped to authorized server projections and existing conversation context." /><EmptyState title="Messaging is not available in this route yet" body="Open communication from a server-authorized case or conversation deep link. No broad patient directory is loaded here." />;</>;
}

function CaseScreen({ demo, proposalId, focusDecision = false }) {
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
      if (loadError?.status === 404 || loadError?.code === 'contract_unavailable') {
        try {
          const queue = await fetchReviewInbox({ demo, signal });
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
  const path = location.pathname.replace(/\/$/, '');
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
  else if (path === '/app/alerts') content = <AlertsScreen demo={activeDemo} />;
  else if (path.startsWith('/app/protocols/')) content = <ProtocolCandidateScreen demo={activeDemo} candidateId={match('/app/protocols/')} />;
  else if (path === '/app/protocols') content = <ProtocolsScreen demo={activeDemo} />;
  else if (path === '/app/contribution') content = <ContributionScreen demo={activeDemo} />;
  else if (path === '/app/messages') content = <MessagesScreen />;
  else content = <EmptyState title="Workspace route unavailable" body="This route is not part of the doctor Care Kernel vNext surface." action="Open review queue" onAction={() => navigate(doctorHref('/app/queue', activeDemo))} />;
  const queueData = useQueueCount(activeDemo);
  const resetDemo = activeDemo ? () => resetSyntheticDemo().then(() => { if (typeof window !== 'undefined') window.location.reload(); }) : undefined;
  return <DoctorShell demo={activeDemo} queueCount={queueData} onResetDemo={resetDemo}>{content}</DoctorShell>;
}

function useQueueCount(demo) {
  const [count, setCount] = useState(0);
  useEffect(() => { let active = true; fetchReviewInbox({ demo }).then((result) => { if (active) setCount((result.items || []).filter((row) => row.status !== 'completed').length); }).catch(() => null); return () => { active = false; }; }, [demo]);
  return count;
}
