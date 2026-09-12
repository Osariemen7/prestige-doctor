import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCareActivity } from './api';
import { formatDateTime, formatRelativeDue } from './contract';
import { ActionButton, EmptyState, ErrorState, LinkArrow, LoadingState, Panel, SafeNote, StatusBadge } from './components';

const PAGE_SIZE = 8;

const useCareActivity = (demo) => {
  const [state, setState] = useState({ loading: true, loadingMore: false, data: null, error: null, loadMoreError: null });
  const [reloadKey, setReloadKey] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    const requestGeneration = ++generation.current;
    const controller = new AbortController();
    setState({ loading: true, loadingMore: false, data: null, error: null, loadMoreError: null });
    fetchCareActivity({ role: 'doctor', demo, limit: PAGE_SIZE, signal: controller.signal })
      .then((data) => { if (active && requestGeneration === generation.current) setState({ loading: false, loadingMore: false, data, error: null, loadMoreError: null }); })
      .catch((error) => { if (active && requestGeneration === generation.current && error?.name !== 'AbortError') setState({ loading: false, loadingMore: false, data: null, error, loadMoreError: null }); });
    return () => { active = false; controller.abort(); };
  }, [demo, reloadKey]);
  const loadMore = useCallback(async () => {
    const cursor = state.data?.next_cursor;
    if (!cursor || state.loadingMore) return;
    const requestGeneration = generation.current;
    setState((current) => ({ ...current, loadingMore: true, loadMoreError: null }));
    try {
      const page = await fetchCareActivity({ role: 'doctor', demo, cursor, limit: PAGE_SIZE });
      if (requestGeneration !== generation.current) return;
      setState((current) => {
        const existing = current.data?.items || [];
        const existingIds = new Set(existing.map((item) => item.public_id).filter(Boolean));
        const additions = (page.items || []).filter((item) => !item.public_id || !existingIds.has(item.public_id));
        return {
          ...current,
          loadingMore: false,
          loadMoreError: null,
          data: { ...current.data, ...page, items: [...existing, ...additions] },
        };
      });
    } catch (error) {
      if (requestGeneration === generation.current && error?.name !== 'AbortError') {
        setState((current) => ({ ...current, loadingMore: false, loadMoreError: error }));
      }
    }
  }, [demo, state.data?.next_cursor, state.loadingMore]);
  return { ...state, loadMore, reload: () => setReloadKey((value) => value + 1) };
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
          <span className="vnext-eyebrow">{item.patient?.display_name || 'Authorized patient'} · {String(item.kind || 'care work').replaceAll('_', ' ')}</span>
          <h3>{item.title}</h3>
        </div>
        <StatusBadge status={item.status} label={item.status_label || undefined} />
      </div>
      <p className="vnext-activity-row__progress">{progressLabel(item)}</p>
      <div className="vnext-activity-row__meta">
        <span><strong>Owner</strong>{item.owner_label || item.owner || 'Not supplied'}</span>
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
    {data.loading ? <LoadingState label="Loading ongoing care work…" /> : data.error ? <ErrorState error={data.error} onRetry={data.reload} /> : !data.data?.items?.length ? <EmptyState title="No ongoing care work" body="The server has not returned an active task that needs your clinical attention." /> : <div className="vnext-activity-list" aria-label="Ongoing care work">{data.data.items.map((item) => <ActivityRow key={item.public_id || `${item.title}-${item.updated_at}`} item={item} onOpenCase={onOpenCase} />)}</div>}
    {!data.loading && !data.error && data.data?.next_cursor && <div className="vnext-activity-more"><ActionButton variant="secondary" onClick={data.loadMore} disabled={data.loadingMore}>{data.loadingMore ? 'Loading more…' : 'Load more ongoing care work'}</ActionButton></div>}
    {data.loadMoreError && <div className="vnext-notice vnext-notice--warning vnext-activity-more-error" role="alert"><span>More ongoing care work could not be loaded. Existing items remain server-confirmed.</span><ActionButton variant="secondary" onClick={data.loadMore} disabled={data.loadingMore}>{data.loadingMore ? 'Retrying…' : 'Try again'}</ActionButton></div>}
    <SafeNote>These are server-confirmed coordination states. Open the linked case for evidence and the exact-hash clinician review flow; this panel cannot approve or alter care.</SafeNote>
  </Panel>;
}
