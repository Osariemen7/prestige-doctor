import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchResearchReviewInbox, forgetCommandKey, getCommandKey, submitResearchApplicabilityDecision } from './api';
import { formatDateTime } from './contract';
import { EmptyState, ErrorState, LoadingState, Panel, SafeNote } from './components';

const safeCitationUrl = (value) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
};

function Citations({ citations }) {
  if (!Array.isArray(citations) || citations.length === 0) return <p className="vnext-muted">No citations returned.</p>;
  return <ul>{citations.map((citation, index) => {
    const title = typeof citation === 'string' ? citation : citation?.title || citation?.url || 'Untitled source';
    const href = safeCitationUrl(typeof citation === 'string' ? citation : citation?.url);
    return <li key={index}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{title}</a> : <span>{title}</span>}</li>;
  })}</ul>;
}

function EvidenceList({ title, value }) {
  if (!Array.isArray(value) || !value.length) return null;
  return <section><h4>{title}</h4><ul>{value.map((entry, index) => <li key={index}>{typeof entry === 'string' ? entry : JSON.stringify(entry)}</li>)}</ul></section>;
}

function ResearchFindingCard({ item, onReviewed }) {
  const [decision, setDecision] = useState('educational_only');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const actionable = /^[0-9a-f]{64}$/i.test(String(item.finding_hash || ''));
  const submit = async (event) => {
    event.preventDefault();
    if (!actionable || submitting || !rationale.trim()) return;
    const scope = `research-review:${item.finding}:${item.finding_hash}:${decision}:${rationale.trim()}`;
    setSubmitting(true);
    setError('');
    try {
      await submitResearchApplicabilityDecision({
        findingId: item.finding, findingHash: item.finding_hash,
        decision, rationale: rationale.trim(), commandKey: getCommandKey(scope),
      });
      forgetCommandKey(scope);
      onReviewed();
    } catch (failure) {
      setError(failure?.message || 'The review decision was not confirmed. Retry the same decision or refresh.');
    } finally {
      setSubmitting(false);
    }
  };
  return <article className="vnext-spaced">
    <h3>{item.claim || 'Untitled finding'}</h3>
    <p className="vnext-muted">Status: awaiting review · Expires: {formatDateTime(item.expires_at)} · Retrieved: {formatDateTime(item.retrieved_at)} · Jurisdiction: {item.jurisdiction || 'Not supplied'} · Source tier: {item.source_tier || 'Not supplied'}</p>
    {item.live_revalidation_required && <SafeNote>Live source revalidation is required before relying on this finding.</SafeNote>}
    {item.uncertainty && <p><strong>Uncertainty:</strong> {item.uncertainty}</p>}
    {item.applicability && Object.keys(item.applicability).length > 0 && <section><h4>Applicability evidence</h4><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(item.applicability, null, 2)}</pre></section>}
    <EvidenceList title="Patient fact references" value={item.patient_fact_refs} />
    <EvidenceList title="Conflicting evidence" value={item.conflicts} />
    <EvidenceList title="Potential harms" value={item.potential_harms} />
    <EvidenceList title="Alternatives" value={item.alternatives} />
    <h4>Citations</h4><Citations citations={item.citations} />
    {!actionable ? <SafeNote>Exact reviewed evidence is unavailable. Refresh or ask care operations; no decision can be recorded here.</SafeNote> :
      <form onSubmit={submit}>
        <label htmlFor={`research-decision-${item.finding}`}>Applicability decision</label>
        <select id={`research-decision-${item.finding}`} value={decision} onChange={(event) => setDecision(event.target.value)} disabled={submitting}>
          <option value="educational_only">Educational only</option>
          <option value="not_applicable">Not applicable</option>
          <option value="more_information">More information required</option>
          <option value="reject">Reject finding</option>
        </select>
        <label htmlFor={`research-rationale-${item.finding}`}>Clinical rationale</label>
        <textarea id={`research-rationale-${item.finding}`} value={rationale} onChange={(event) => setRationale(event.target.value)} rows={3} maxLength={2000} disabled={submitting} required />
        <SafeNote>
          Care-changing applicability is not supported by this review contract: the finding is not linked to a server-issued patient proposal, and this endpoint accepts only non-care-changing decisions. Do not apply this finding to a patient plan. Open the review queue to work an independently issued proposal; a direct handoff requires the server to bind this finding and its current hash to a proposal and return that proposal’s exact hash.
          <br /><Link className="vnext-button vnext-button--secondary" to="/app/queue">Open clinical review queue</Link>
        </SafeNote>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="vnext-button vnext-button--secondary" disabled={submitting || !rationale.trim()}>{submitting ? 'Recording decision…' : 'Record decision'}</button>
      </form>}
  </article>;
}

export default function ResearchReviewScreen({ demo = false }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: !demo, data: null, error: null });
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  useEffect(() => {
    if (demo) return undefined;
    const controller = new AbortController();
    let active = true;
    setState({ loading: true, data: null, error: null });
    fetchResearchReviewInbox({ signal: controller.signal })
      .then((data) => { if (active) setState({ loading: false, data, error: null }); })
      .catch((error) => { if (active && error?.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => { active = false; controller.abort(); };
  }, [demo, reloadKey]);

  return <>
    <div className="vnext-page-header"><div><div className="vnext-eyebrow">Clinician research</div><h1>Research review</h1><p>Scoped findings and protocol updates awaiting review. This page displays server status and citations only.</p></div>{!demo && <button type="button" className="vnext-button vnext-button--secondary" onClick={reload}>Refresh</button>}</div>
    <SafeNote>Research shown here is not an approved patient plan. Decisions are bound to the exact server-issued finding hash; this page cannot change a treatment plan.</SafeNote>
    {demo ? <EmptyState title="Research review unavailable in demo" body="This view requires the live clinician scoped inbox." /> : state.loading ? <LoadingState /> : state.error ? <ErrorState error={state.error} onRetry={reload} /> : <>
      <Panel title="Patient research findings" className="vnext-spaced">
        {state.data.research_findings.length === 0 ? <p className="vnext-muted">No findings awaiting review in your current scope.</p> : state.data.research_findings.map((item) => <ResearchFindingCard key={item.finding} item={item} onReviewed={reload} />)}
      </Panel>
      <Panel title="Protocol updates" className="vnext-spaced">
        {state.data.protocol_updates.length === 0 ? <p className="vnext-muted">No protocol updates awaiting review.</p> : state.data.protocol_updates.map((item) => <article key={item.candidate} className="vnext-spaced"><h3>{item.title || 'Untitled protocol update'}</h3><p>{item.summary || 'No summary returned.'}</p><p className="vnext-muted">Status: awaiting review · Jurisdiction: {item.jurisdiction || 'Not supplied'} · Retrieved: {formatDateTime(item.retrieved_at)}</p><h4>Citations</h4><Citations citations={item.citations} />{typeof item.candidate === 'string' && item.candidate.trim() ? <p><Link className="vnext-button vnext-button--secondary" to={'/app/protocols/' + encodeURIComponent(item.candidate.trim())}>Open protocol governance review</Link></p> : <SafeNote>This update has no candidate reference for the existing governance review workflow, so no decision can be opened here.</SafeNote>}</article>)}
      </Panel>
    </>}
  </>;
}
