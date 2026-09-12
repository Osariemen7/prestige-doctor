import React, { useEffect, useState } from 'react';
import { fetchCareActivity } from './api';
import { formatDateTime, formatRelativeDue } from './contract';
import { ActionButton, EmptyState, ErrorState, LinkArrow, LoadingState, Panel, SafeNote, StatusBadge } from './components';

const useCareActivity = (demo) => {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchCareActivity({ role: 'doctor', demo, signal: controller.signal })
      .then((data) => { if (active) setState({ loading: false, data, error: null }); })
      .catch((error) => { if (active && error?.name !== 'AbortError') setState({ loading: false, data: null, error }); });
    return () => { active = false; controller.abort(); };
  }, [demo, reloadKey]);
  return { ...state, reload: () => setReloadKey((value) => value + 1) };
};

const progressLabel = (item) => {
  if (item.progress_label) return item.progress_label;
  if (item.progress !== null && item.progress !== undefined) return `${item.progress}% verified progress`;
  return 'Verified progress was not returned';
};

function ActivityRow({ item, onOpenCase }) {
  const due = formatRelativeDue(item.due_at);
  const hasCase = Boolean(item.case_id);
  return <article className="vnext-activity-row">
    <div className="vnext-activity-row__content">
      <div className="vnext-activity-row__top">
        <div className="vnext-activity-row__title">
          <span className="vnext-eyebrow">{item.patient?.display_name || 'Authorized patient'} · {item.kind.replaceAll('_', ' ')}</span>
          <h3>{item.title}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="vnext-activity-row__progress">{progressLabel(item)}</p>
      <div className="vnext-activity-row__meta">
        <span><strong>Owner</strong>{item.owner || 'Not supplied'}</span>
        <span><strong>Checkpoint</strong>{item.next_checkpoint.title || 'Not supplied'}</span>
        <span><strong>Due</strong>{due.label}{item.due_at ? ` · ${formatDateTime(item.due_at)}` : ''}</span>
      </div>
      {item.blocker && <div className="vnext-notice vnext-notice--warning"><strong>Blocker:</strong> {item.blocker}</div>}
      <p className="vnext-small vnext-muted">{item.updated_at ? `Updated ${formatDateTime(item.updated_at)}` : 'Updated time not returned'}{item.action_label ? ` · Next action: ${item.action_label}` : ''}</p>
    </div>
    <ActionButton variant="secondary" onClick={() => onOpenCase?.(item.case_id)} disabled={!hasCase} title={hasCase ? 'Open the server-authorized case context' : 'No authorized case destination was returned'}>{hasCase ? 'Open case' : 'Case unavailable'} <LinkArrow /></ActionButton>
  </article>;
}

export default function CareActivityPanel({ demo = false, onOpenCase }) {
  const data = useCareActivity(demo);
  return <Panel title="Ongoing care work" eyebrow="Server-owned continuity" action="Refresh" onAction={data.reload}>
    {data.loading ? <LoadingState label="Loading ongoing care work…" /> : data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : !data.data?.items?.length ? <EmptyState title="No ongoing care work" body="The server has not returned an active task that needs your clinical attention." /> : <div className="vnext-activity-list" aria-label="Ongoing care work">{data.data.items.slice(0, 8).map((item) => <ActivityRow key={item.public_id || `${item.title}-${item.updated_at}`} item={item} onOpenCase={onOpenCase} />)}</div>}
    {!data.loading && !data.error && data.data?.items?.length > 8 && <p className="vnext-small vnext-muted" style={{ padding: '12px 18px', margin: 0 }}>Showing the first 8 server-prioritized items.</p>}
    <SafeNote>These are server-confirmed coordination states. Open the linked case for evidence and the exact-hash clinician review flow; this panel cannot approve or alter care.</SafeNote>
  </Panel>;
}
