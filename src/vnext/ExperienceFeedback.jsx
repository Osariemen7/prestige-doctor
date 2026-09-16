import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiDiagnostics, getCommandKey, forgetCommandKey, submitExperienceFeedback } from './api';
import { setDoctorFormDirty } from '../pwa/updateGuard';
import './experience-feedback.css';

const CATEGORIES = [
  ['blocked', 'I could not continue'],
  ['wrong_status', 'The status looks wrong'],
  ['missing_action', 'An action is missing'],
  ['slow_or_failed', 'Something was slow or failed'],
  ['other', 'Something else'],
];

const STATIC_ROUTES = new Set([
  '/app', '/app/queue', '/app/alerts', '/app/protocols', '/app/contribution',
  '/app/messages', '/app/diagnostics', '/app/patients', '/app/notifications',
]);

export function doctorFeedbackRoute(pathname = '') {
  const path = String(pathname).split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  if (STATIC_ROUTES.has(path)) return path;
  const patterns = [
    [/^\/app\/cases\/[^/]+\/documentation$/, '/app/cases/:proposalId/documentation'],
    [/^\/app\/cases\/[^/]+\/decision$/, '/app/cases/:proposalId/decision'],
    [/^\/app\/cases\/[^/]+$/, '/app/cases/:proposalId'],
    [/^\/app\/patients\/[^/]+\/approved-care$/, '/app/patients/:patientId/approved-care'],
    [/^\/app\/patients\/[^/]+$/, '/app/patients/:patientId'],
    [/^\/app\/clinical-services\/[^/]+$/, '/app/clinical-services/:orderId'],
    [/^\/app\/transitions\/[^/]+$/, '/app/transitions/:transitionId'],
    [/^\/app\/results\/[^/]+$/, '/app/results/:resultId'],
    [/^\/app\/notifications\/[^/]+$/, '/app/notifications/:notificationId'],
  ];
  return patterns.find(([pattern]) => pattern.test(path))?.[1] || (path.startsWith('/app/') ? '/app/other' : '/other');
}

function makeScope() {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now() + '-' + Math.random().toString(16).slice(2);
  return 'doctor-experience-feedback:' + id;
}

export default function ExperienceFeedback({ demo = false }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('editing');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const intentRef = useRef(null);
  const scopeRef = useRef(null);
  const reportButtonRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    descriptionRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && phase !== 'sending') {
        setOpen(false);
        reportButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, phase]);

  useEffect(() => {
    const hasUnconfirmedReport = phase !== 'success' && Boolean(category || description.trim());
    if (!hasUnconfirmedReport) return undefined;
    return setDoctorFormDirty(true);
  }, [category, description, phase]);

  if (demo) return null;

  const resetForAnother = () => {
    if (scopeRef.current) forgetCommandKey(scopeRef.current);
    intentRef.current = null;
    scopeRef.current = null;
    setCategory('');
    setDescription('');
    setPhase('editing');
    setError('');
    setReceipt('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (phase === 'sending' || phase === 'success') return;
    if (!intentRef.current) {
      if (!category || !description.trim()) {
        setError('Choose a category and describe what happened.');
        return;
      }
      scopeRef.current = makeScope();
      intentRef.current = {
        commandKey: getCommandKey(scopeRef.current),
        payload: {
          app: 'doctor',
          category,
          description: description.trim(),
          route: doctorFeedbackRoute(location.pathname),
          app_version: apiDiagnostics.clientVersion,
        },
      };
    }

    setPhase('sending');
    setError('');
    try {
      const result = await submitExperienceFeedback({
        payload: intentRef.current.payload,
        commandKey: intentRef.current.commandKey,
      });
      const serverReceipt = result?.receipt;
      if (typeof serverReceipt !== 'string' || !serverReceipt.trim()) {
        throw new Error('receipt_unavailable');
      }
      setReceipt(serverReceipt.trim());
      setPhase('success');
      if (scopeRef.current) forgetCommandKey(scopeRef.current);
    } catch {
      setPhase('retry');
      setError('We could not confirm receipt. Your text stays in this form while this page is open; retry the same submission.');
    }
  };

  const frozen = phase === 'sending' || phase === 'retry' || phase === 'success';
  return <>
    <button
      ref={reportButtonRef}
      type="button"
      className="vnext-nav__item vnext-feedback-trigger"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
    >
      <span className="vnext-feedback-trigger__icon" aria-hidden="true">?</span>
      <span>Report a problem</span>
    </button>
    {open && <div className="vnext-feedback-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && phase !== 'sending') setOpen(false); }}>
      <section className="vnext-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="doctor-feedback-title" aria-describedby="doctor-feedback-help">
        <div className="vnext-feedback-dialog__header">
          <div><span className="vnext-eyebrow">Prestige Doctor</span><h2 id="doctor-feedback-title">Report a problem</h2></div>
          {phase !== 'sending' && <button type="button" className="vnext-button vnext-button--secondary" onClick={() => setOpen(false)} aria-label="Close report form">Close</button>}
        </div>
        {phase === 'success' ? <div className="vnext-feedback-success" role="status">
          <strong>Your report was received.</strong>
          <p>Receipt: <code>{receipt}</code></p>
          <button type="button" className="vnext-button vnext-button--primary" onClick={resetForAnother}>Report another problem</button>
        </div> : <form onSubmit={submit}>
          <p id="doctor-feedback-help" className="vnext-feedback-help">Tell us what went wrong. Avoid patient names or other identifying details. Your report is encrypted at rest and excluded from product analytics.</p>
          <label className="vnext-feedback-field">
            <span>What happened?</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={frozen} required>
              <option value="">Choose a category</option>
              {CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className="vnext-feedback-field">
            <span>Describe the problem</span>
            <textarea ref={descriptionRef} value={description} onChange={(event) => setDescription(event.target.value)} disabled={frozen} maxLength={4000} rows={5} required placeholder="What were you trying to do, and what happened instead?" />
            <small>{description.length}/4000</small>
          </label>
          {error && <div className="vnext-feedback-error" role="alert">{error}</div>}
          <div className="vnext-feedback-actions">
            {phase !== 'sending' && <button type="button" className="vnext-button vnext-button--secondary" onClick={() => setOpen(false)}>Close for now</button>}
            <button type="submit" className="vnext-button vnext-button--primary" disabled={phase === 'sending' || (phase === 'editing' && (!category || !description.trim()))}>
              {phase === 'sending' ? 'Sending…' : phase === 'retry' ? 'Retry same report' : 'Send report'}
            </button>
          </div>
        </form>}
      </section>
    </div>}
  </>;
}
