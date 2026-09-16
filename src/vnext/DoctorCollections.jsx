import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDoctorPatients, fetchDoctorResults, fetchDoctorResultDetail } from './api';
import { useLocation } from 'react-router-dom';

const resultStatus = (search) => {
  const value = new URLSearchParams(search).get('status');
  return ['result_received', 'ordered'].includes(value) ? value : 'all';
};

function mergeItems(existing = [], incoming = []) {
  const rows = new Map();
  [...existing, ...incoming].forEach((item, index) => {
    const key = item.public_id || item.id || `row-${index}`;
    rows.set(key, item);
  });
  return [...rows.values()];
}

function useCollection(loader, args) {
  const argsKey = JSON.stringify(args);
  const [page, setPage] = useState({ key: argsKey, cursor: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const cursor = page.key === argsKey ? page.cursor : null;
  const [state, setState] = useState({ key: argsKey, loading: true, loadingMore: false, data: null, error: null });

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setState((current) => ({
      key: argsKey,
      loading: !cursor,
      loadingMore: Boolean(cursor),
      data: current.key === argsKey ? current.data : null,
      error: null,
    }));

    loader({ ...JSON.parse(argsKey), cursor, signal: controller.signal })
      .then((result) => {
        if (!live) return;
        setState((current) => {
          const previous = current.key === argsKey ? current.data : null;
          const data = cursor && previous ? { ...result, items: mergeItems(previous.items, result.items || []) } : result;
          return { key: argsKey, loading: false, loadingMore: false, data, error: null };
        });
      })
      .catch((error) => {
        if (!live || error?.name === 'AbortError') return;
        setState((current) => ({
          key: argsKey,
          loading: false,
          loadingMore: false,
          data: current.key === argsKey ? current.data : null,
          error,
        }));
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [loader, argsKey, cursor, refreshKey]);

  const refresh = useCallback(() => { setPage({ key: argsKey, cursor: null }); setRefreshKey((value) => value + 1); }, [argsKey]);
  const loadMore = useCallback(() => {
    const next = state.key === argsKey ? state.data?.next_cursor : null;
    if (next && !state.loadingMore) setPage({ key: argsKey, cursor: next });
  }, [argsKey, state]);

  return {
    ...state,
    data: state.key === argsKey ? state.data : null,
    loading: state.key !== argsKey || state.loading,
    refresh,
    loadMore,
  };
}

function title(item, fallback) {
  return item?.title || item?.name || item?.test_name || item?.test_type || fallback;
}

function resultDestination(item) {
  const href = item?.destination?.href;
  return typeof href === 'string' && /^\/app\/results\/[^/?#]+$/.test(href) ? href : null;
}

function CollectionState({ state, label }) {
  if (state.loading && !state.data) return <p role="status">Loading {label}...</p>;
  if (state.error && !state.data) {
    return <div role="alert" className="vnext-notice vnext-notice--warning">
      <p>{label} could not be loaded. Your current work is unchanged.</p>
      <button className="vnext-button vnext-button--secondary" onClick={state.refresh}>Try again</button>
    </div>;
  }
  if (state.error) {
    return <div role="alert" className="vnext-notice vnext-notice--warning">
      The latest refresh failed. The previously loaded {label.toLowerCase()} are still shown.
      <button className="vnext-button vnext-button--secondary" onClick={state.refresh}>Try again</button>
    </div>;
  }
  if (state.loading) return <p role="status">Refreshing {label.toLowerCase()}...</p>;
  return null;
}

function CollectionHeader({ title: heading, description, onRefresh, refreshing }) {
  return <div className="vnext-page-header">
    <div><h1>{heading}</h1><p>{description}</p></div>
    <button className="vnext-button vnext-button--secondary" onClick={onRefresh} disabled={refreshing}>
      {refreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  </div>;
}

export function DoctorPatientsScreen({ demo = false }) {
  const nav = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);
  const state = useCollection(fetchDoctorPatients, { demo, search });
  const updateSearch = (event) => {
    const next = event.target.value;
    setSearch(next);
    const params = new URLSearchParams(location.search);
    if (next) params.set('search', next); else params.delete('search');
    nav({ pathname: location.pathname, search: params.toString() ? '?' + params.toString() : '', hash: location.hash }, { replace: true });
  };

  return <section>
    <CollectionHeader title="Patients" description="Scoped patient context returned by the Care Kernel. Search never grants extra access." onRefresh={state.refresh} refreshing={state.loading} />
    <label className="vnext-form-field">
      <span>Search patients</span>
      <input aria-label="Search patients" className="vnext-input" value={search} onChange={updateSearch} placeholder="Search by name or authorized reference" />
    </label>
    <CollectionState state={state} label="Patients" />
    {!state.loading && !state.error && !state.data?.items?.length && <p>No authorized patients found.</p>}
    {!!state.data?.items?.length && <div className="vnext-list" aria-label="Authorized patients">
      {state.data.items.map((patient) => <button className="vnext-list-row" key={patient.public_id || patient.id} onClick={() => nav(`/app/patients/${encodeURIComponent(patient.public_id || patient.id)}`)}>
        <span><strong>{title(patient, 'Authorized patient')}</strong><small>{patient.patient_id || patient.public_id || 'Reference not returned'}</small></span>
        <span aria-hidden="true">&gt;</span>
      </button>)}
    </div>}
    {state.data?.next_cursor && <button className="vnext-button vnext-button--secondary vnext-spaced" onClick={state.loadMore} disabled={state.loadingMore}>
      {state.loadingMore ? 'Loading more...' : 'Load more patients'}
    </button>}
  </section>;
}

export function DoctorResultsScreen({ demo = false }) {
  const nav = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(() => resultStatus(location.search));
  useEffect(() => { setStatus(resultStatus(location.search)); }, [location.search]);
  const state = useCollection(fetchDoctorResults, { demo, status });
  const updateStatus = (event) => {
    const next = event.target.value;
    setStatus(next);
    const params = new URLSearchParams(location.search);
    if (next === 'all') params.delete('status'); else params.set('status', next);
    nav({ pathname: location.pathname, search: params.toString() ? '?' + params.toString() : '', hash: location.hash }, { replace: true });
  };

  return <section>
    <CollectionHeader title="Results & services" description="Results are shown by server state. Receipt does not mean review." onRefresh={state.refresh} refreshing={state.loading} />
    <label className="vnext-form-field">
      <span>Filter results</span>
      <select className="vnext-select" value={status} onChange={updateStatus}>
        <option value="all">All results</option>
        <option value="result_received">Result received</option>
        <option value="ordered">Awaiting result</option>
      </select>
    </label>
    <CollectionState state={state} label="Results" />
    {!state.loading && !state.error && !state.data?.items?.length && <p>No results returned for review.</p>}
    {!!state.data?.items?.length && <div className="vnext-list" aria-label="Results and services">
      {state.data.items.map((item) => {
        const destination = resultDestination(item);
        const label = title(item, 'Investigation result');
        return <button
          type="button"
          className="vnext-list-row"
          key={item.investigation_id || item.public_id || item.id || item.destination?.href}
          onClick={() => destination && nav(destination, { state: { returnTo: location.pathname + location.search + location.hash } })}
          disabled={!destination}
          aria-label={destination ? `Review result: ${label}` : `Result destination unavailable: ${label}`}
        >
          <span><strong>{label}</strong><small>{item.patient?.display_name || item.patient_name || 'Authorized patient'}</small></span>
          <span>{item.review_required ? 'Review required' : item.status || 'Status unavailable'}</span>
        </button>;
      })}
    </div>}
    {state.data?.next_cursor && <button className="vnext-button vnext-button--secondary vnext-spaced" onClick={state.loadMore} disabled={state.loadingMore}>
      {state.loadingMore ? 'Loading more...' : 'Load more results'}
    </button>}
  </section>;
}


export function DoctorResultDetailScreen({ resultId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchDoctorResultDetail({ resultId, signal: controller.signal })
      .then((data) => live && setState({ loading: false, data, error: null }))
      .catch((error) => {
        if (live && error?.name !== 'AbortError') setState((current) => ({ ...current, loading: false, error }));
      });
    return () => { live = false; controller.abort(); };
  }, [resultId, reloadKey]);

  const backTo = typeof location.state?.returnTo === 'string'
    && /^\/app\/diagnostics(?:[?#]|$)/.test(location.state.returnTo)
    ? location.state.returnTo
    : '/app/diagnostics';

  return <section>
    <div className="vnext-page-header">
      <div><div className="vnext-eyebrow">Authorized investigation record</div><h1>Result review</h1><p>Review the evidence and returned verification state. Opening this record does not mark it reviewed or close follow-up.</p></div>
      <button className="vnext-button vnext-button--secondary" onClick={() => navigate(backTo)}>Back to results</button>
    </div>
    {state.loading && !state.data && <p role="status">Loading authorized result...</p>}
    {state.error && <div role="alert" className="vnext-notice vnext-notice--warning">
      <p>The result could not be loaded in the current clinical scope.</p>
      <button className="vnext-button vnext-button--secondary" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>
    </div>}
    {state.data && state.data.can_view_result !== true && <div role="alert" className="vnext-notice vnext-notice--warning">
      Result contents are not available to the current clinical identity.
    </div>}
    {state.data && state.data.can_view_result === true && <>
      <div className="vnext-card-grid vnext-spaced">
        <article className="vnext-card"><h2>{state.data.test_type || 'Investigation'}</h2><dl className="vnext-detail-grid">
          <div><dt>Patient</dt><dd>{state.data.patient_name || 'Authorized patient'}</dd></div>
          <div><dt>Investigation status</dt><dd>{state.data.fulfillment_status_display || state.data.fulfillment_status || 'Status unavailable'}</dd></div>
          <div><dt>Result verification</dt><dd>{state.data.result_verification_status || 'Not verified'}</dd></div>
          <div><dt>Next action</dt><dd>{state.data.next_action || 'Not returned'}</dd></div>
          <div><dt>Value</dt><dd>{state.data.value || 'Not returned'} {state.data.unit || ''}</dd></div>
          <div><dt>Received</dt><dd>{state.data.created || 'Date not returned'}</dd></div>
        </dl></article>
      </div>
      {state.data.results || state.data.findings
        ? <article className="vnext-card vnext-spaced"><h2>Reported result</h2><p>{state.data.results || state.data.findings}</p></article>
        : <div className="vnext-notice vnext-notice--warning vnext-spaced">No result text was returned for this investigation.</div>}
      {state.data.next_action === 'doctor_review' && <div className="vnext-notice vnext-notice--warning vnext-spaced">
        Clinical interpretation is still required. This read-only screen does not record an interpretation or complete the review.
      </div>}
    </>}
  </section>;
}
