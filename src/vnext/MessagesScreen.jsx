import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCareCapabilities, getCareConversation, listCareConversations, markCareConversationRead, replyToCareConversation } from '../services/careConversationApi';
import { EmptyState, ErrorState, LoadingState } from './components';

const newId = () => globalThis.crypto?.randomUUID?.() || `doctor-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function MessagesScreen({ conversationId }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [available, setAvailable] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const pending = useRef(null);
  const generation = useRef(0);
  const load = useCallback(async (background = false) => {
    const current = ++generation.current;
    if (!background) { setLoading(true); setError(null); setConversation(null); }
    try {
      const capability = await getCareCapabilities();
      if (current !== generation.current) return;
      const enabled = capability.capabilities.care_conversation_api && capability.capabilities.proactive_app_inbox;
      setAvailable(enabled);
      if (!enabled) { setItems([]); setConversation(null); return; }
      const collection = await listCareConversations();
      const detail = conversationId ? await getCareConversation(conversationId) : null;
      if (current !== generation.current) return;
      setItems(collection.items); setConversation(detail);
      if (detail?.allowed_actions.read && detail.unread_count) await markCareConversationRead(detail.conversation_id);
    } catch (failure) { if (current === generation.current) { setError(failure); if ([401, 403, 404].includes(failure.status)) setConversation(null); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [conversationId]);
  useEffect(() => { pending.current = null; setMessage(''); void load(); return () => { generation.current += 1; }; }, [load]);
  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); if (navigator.onLine && !document.hidden) void load(true); };
    const interval = window.setInterval(() => { if (!sending && !pending.current) refresh(); }, 30000);
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load, sending]);
  const activeTurn = conversation?.turns.find((turn) => turn.turn_id === conversation.active_reply_turn_id);
  const submit = async (action) => {
    if (!online || sending || !conversation?.allowed_actions.reply || !activeTurn || (!message.trim() && !action)) return;
    const payload = pending.current || { client_turn_id: newId(), reply_to_turn_id: activeTurn.turn_id, expected_loop_state_version: activeTurn.state_version, message: message.trim(), media: [], ...(action ? { selected_action_id: action } : {}) };
    pending.current = payload; setSending(true); setError(null);
    try {
      const result = await replyToCareConversation(conversation.conversation_id, payload);
      setConversation(result.conversation); setMessage(''); pending.current = null;
      window.dispatchEvent(new Event('doctor-notifications-changed'));
    } catch (failure) {
      setError(failure);
      if (failure.status === 409) { pending.current = null; await load(true); setError(new Error('This conversation changed. Review the latest messages before sending again.')); }
      if ([400, 403, 404].includes(failure.status)) pending.current = null;
    } finally { setSending(false); }
  };
  return <><div className="vnext-page-header"><div><h1>Care messages</h1><p>Coordinate with patients and their care team. Clinical decisions remain in the review workspace.</p></div><button type="button" className="vnext-button vnext-button--secondary" onClick={() => load()} disabled={loading || sending}>Refresh</button></div>
    {!online && <p role="status" className="vnext-notice vnext-notice--warning">You are offline. Messages will only send when you reconnect and choose Send.</p>}
    {error && <ErrorState error={error} onRetry={() => load()} />}
    {loading ? <LoadingState /> : !available ? <EmptyState title="Care messaging is unavailable" body="Please use your clinical review queue while this service is unavailable." /> : <div className="doctor-messages">
      <aside className="vnext-panel" aria-label="Your conversations">{items.length ? items.map((item) => <button type="button" className="vnext-alert-row" aria-current={conversationId === item.conversation_id ? 'page' : undefined} key={item.conversation_id} onClick={() => navigate(`/app/messages/${encodeURIComponent(item.conversation_id)}`)}><span><strong>{item.current_commitment?.next_action || 'Care conversation'}</strong><small>{item.unread_count ? `${item.unread_count} unread` : 'Up to date'}</small></span></button>) : <EmptyState title="No care conversations yet" body="Conversations assigned to you will appear here." />}</aside>
      <section className="vnext-panel" aria-label="Conversation">{conversation ? <div className="doctor-conversation"><div className="doctor-conversation__turns" role="log" aria-label="Messages">{conversation.turns.map((turn) => <article key={turn.turn_id} className={`doctor-message doctor-message--${turn.direction}`}><strong>{turn.sender_role === 'doctor' ? 'You' : turn.sender_role.replaceAll('_', ' ')}</strong><p>{turn.message}</p></article>)}</div>
        {conversation.allowed_actions.reply && activeTurn ? <form onSubmit={(event) => { event.preventDefault(); void submit(); }}><label htmlFor="care-reply">Reply</label><textarea id="care-reply" className="vnext-textarea" value={message} onChange={(event) => { setMessage(event.target.value); if (!sending) pending.current = null; }} disabled={sending} maxLength={10000} />
          <div className="vnext-form-actions">{(activeTurn.structured?.quick_actions || []).map((action) => <button type="button" className="vnext-button vnext-button--secondary" key={action.id} disabled={!online || sending} onClick={() => submit(action.id)}>{action.label}</button>)}<button type="submit" className="vnext-button vnext-button--primary" disabled={!online || sending || !message.trim()}>{sending ? 'Sending…' : pending.current ? 'Retry reply' : 'Send reply'}</button></div></form> : <p>There is no reply requested at this checkpoint.</p>}
      </div> : <EmptyState title="Choose a conversation" body="Open a conversation to view its latest messages." />}</section>
    </div>}</>;
}
