import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  Info,
  LockKeyhole,
  Menu,
  RefreshCw,
  ShieldAlert,
  Timer,
  UserRound,
  X,
} from 'lucide-react';
import { formatDateTime, formatRelativeDue, publicHashSuffix, statusLabel, statusTone } from './contract';

export const Icon = ({ name, size = 18, ...props }) => {
  const icons = { AlertTriangle, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, FileCheck2, Info, LockKeyhole, Menu, RefreshCw, ShieldAlert, Timer, UserRound, X };
  const Component = icons[name] || Info;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props} />;
};

export function StatusBadge({ status, label, dot = false }) {
  return <span className={`vnext-status vnext-status--${statusTone(status)}`}><span className="vnext-status__mark" aria-hidden="true">{dot ? '•' : statusTone(status) === 'success' ? '✓' : statusTone(status) === 'danger' ? '!' : '·'}</span>{label || statusLabel(status)}</span>;
}

export function UrgencyBadge({ item }) {
  const due = formatRelativeDue(item?.due_at);
  const urgent = item?.urgency === 'urgent' || due.overdue || due.urgency === 'urgent';
  return <span className={`vnext-urgency ${urgent ? 'vnext-urgency--urgent' : item?.urgency === 'soon' ? 'vnext-urgency--soon' : ''}`}><span className="vnext-urgency__bar" aria-hidden="true" />{urgent ? (due.overdue ? 'Overdue' : 'Urgent') : item?.urgency === 'soon' ? 'Due soon' : 'Routine'}</span>;
}

export function LoadingState({ label = 'Loading the latest server state…' }) {
  return <div className="vnext-state" role="status"><span className="vnext-spinner" aria-hidden="true" />{label}</div>;
}

export function ErrorState({ error, onRetry, compact = false }) {
  const schema = error?.code === 'schema_mismatch';
  const forbidden = error?.status === 403;
  const message = forbidden ? 'This protected case is no longer available to you.' : schema ? 'We could not safely display the latest care state.' : error?.message || 'The latest care state could not be loaded.';
  return <div className={`vnext-state vnext-state--error ${compact ? 'vnext-state--compact' : ''}`} role="alert"><Icon name={forbidden ? 'LockKeyhole' : 'AlertTriangle'} /><div><strong>{message}</strong>{!compact && <p>Nothing was recorded locally. Retry when the connection is ready.</p>}{onRetry && <button className="vnext-button vnext-button--secondary vnext-button--small" onClick={onRetry}><Icon name="RefreshCw" size={15} /> Try again</button>}</div></div>;
}

export function EmptyState({ title, body, action, onAction }) {
  return <div className="vnext-empty"><div className="vnext-empty__icon"><Icon name="Info" /></div><h2>{title}</h2><p>{body}</p>{action && <button className="vnext-button vnext-button--secondary" onClick={onAction}>{action}</button>}</div>;
}

export function Panel({ children, className = '', title, eyebrow, action, onAction, as = 'section', ...props }) {
  const Component = as;
  return <Component {...props} className={`vnext-panel ${className}`}>
    {(title || eyebrow || action) && <div className="vnext-panel__header"><div>{eyebrow && <div className="vnext-eyebrow">{eyebrow}</div>}{title && <h2>{title}</h2>}</div>{action && <button className="vnext-button vnext-button--text vnext-button--small" onClick={onAction}>{action}</button>}</div>}
    {children}
  </Component>;
}

export function SectionHeading({ eyebrow, title, description, right }) {
  return <div className="vnext-section-heading"><div>{eyebrow && <div className="vnext-eyebrow">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{right}</div>;
}

export function Field({ label, value, tone, mono = false }) {
  return <div className={`vnext-field ${tone ? `vnext-field--${tone}` : ''}`}><dt>{label}</dt><dd className={mono ? 'vnext-mono' : ''}>{value === undefined || value === null || value === '' ? 'Not supplied' : value}</dd></div>;
}

export function DetailGrid({ children, className = '' }) {
  return <dl className={`vnext-detail-grid ${className}`}>{children}</dl>;
}

export function SafetyBanner({ title = 'Safety route takes precedence', children, emergency = false }) {
  return <div className={`vnext-safety ${emergency ? 'vnext-safety--emergency' : ''}`} role="alert"><Icon name="ShieldAlert" size={20} /><div><strong>{title}</strong><p>{children}</p></div></div>;
}

export function HashBadge({ hash, exact = true }) {
  return <span className="vnext-hash"><Icon name="FileCheck2" size={15} /><span>{exact ? 'Exact proposal' : 'Proposal'} <code>…{publicHashSuffix(hash)}</code></span></span>;
}

export function AccountabilityStrip({ owner, dueAt, blocker, nextUpdateAt }) {
  return <div className="vnext-accountability" aria-label="Accountability checkpoint"><div><span>Owner</span><strong>{owner || 'Not supplied'}</strong></div><div><span>Due</span><strong>{formatDateTime(dueAt)}</strong></div><div><span>Blocker</span><strong>{blocker || 'No blocker returned'}</strong></div><div><span>Prestige update</span><strong>{formatDateTime(nextUpdateAt)}</strong></div></div>;
}

export function EvidenceCard({ evidence }) {
  return <article className="vnext-evidence-card"><div className="vnext-evidence-card__top"><strong>{evidence.label}</strong><StatusBadge status={evidence.verified ? 'completed' : 'pending'} label={evidence.verified ? 'Verified' : 'Unverified'} /></div><div className="vnext-evidence-card__value">{typeof evidence.value === 'object' ? JSON.stringify(evidence.value) : evidence.value || 'No value returned'}</div><div className="vnext-evidence-card__meta"><span>{formatDateTime(evidence.observed_at)}</span><span>Source: {evidence.provenance?.source || 'Not supplied'}</span><span>Captured by: {evidence.provenance?.captured_by || 'Not supplied'}</span></div>{evidence.provenance?.limitation && <div className="vnext-evidence-card__limitation">Limitation: {evidence.provenance.limitation}</div>}</article>;
}

export function ActionButton({ children, icon, variant = 'primary', disabled, onClick, type = 'button', title }) {
  return <button type={type} title={title} disabled={disabled} className={`vnext-button vnext-button--${variant}`} onClick={onClick}>{icon && <Icon name={icon} size={16} />}{children}</button>;
}

export function Modal({ open, title, children, onClose, footer }) {
  const closeRef = useRef(null);
  const modalRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const handler = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'Tab') {
        const focusable = Array.from(modalRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    closeRef.current?.focus();
    return () => { document.removeEventListener('keydown', handler); previouslyFocused?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="vnext-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><div ref={modalRef} className="vnext-modal" role="dialog" aria-modal="true" aria-labelledby="vnext-modal-title"><div className="vnext-modal__header"><h2 id="vnext-modal-title">{title}</h2><button ref={closeRef} className="vnext-icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="X" /></button></div><div className="vnext-modal__body">{children}</div>{footer && <div className="vnext-modal__footer">{footer}</div>}</div></div>;
}

export class RouteErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() { if (this.state.error) return <ErrorState error={this.state.error} onRetry={() => this.setState({ error: null })} />; return this.props.children; }
}

export const LinkArrow = () => <Icon name="ChevronRight" size={16} />;
export const SafeNote = ({ children }) => <p className="vnext-safe-note"><Icon name="Info" size={15} />{children}</p>;
export const ProtectedLabel = () => <span className="vnext-protected"><Icon name="LockKeyhole" size={13} /> Protected context</span>;
export const ActiveDot = () => <span className="vnext-active-dot" aria-label="Active" />;
export const Checkmark = () => <Icon name="CheckCircle2" size={16} />;
