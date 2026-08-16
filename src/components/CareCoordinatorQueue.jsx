import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Container, Divider, IconButton,
  List, ListItemButton, Paper, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  getCareCapabilities, getCareConversation, listCareConversations,
  markCareConversationRead, replyToCareConversation,
} from '../services/careConversationApi';
import { demoDoctorCapabilities, demoDoctorConversation } from '../demo/careConversationFixture';

const getRoot = () => {
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  try { return Function('return this')(); } catch {
    return {};
  }
};

const _root = getRoot();

const newId = () => (_root.crypto?.randomUUID?.() || `doctor-turn-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const words = (value) => String(value || '').replaceAll('_', ' ');
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not scheduled';

export default function CareCoordinatorQueue({ demoMode = false }) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState(null);
  const [items, setItems] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const activeTurn = useMemo(() => conversation?.turns.find((turn) => turn.turn_id === conversation.active_reply_turn_id) || null, [conversation]);
  const quickActions = activeTurn?.structured?.quick_actions || [];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (demoMode) {
        setCapabilities(demoDoctorCapabilities); setItems([demoDoctorConversation]); setConversation(demoDoctorConversation); return;
      }
      const capability = await getCareCapabilities();
      setCapabilities(capability);
      if (!capability.capabilities.care_conversation_api || !capability.capabilities.proactive_app_inbox) return;
      const collection = await listCareConversations();
      setItems(collection.items);
      const selected = conversationId || collection.items[0]?.conversation_id;
      if (selected) {
        const detail = await getCareConversation(selected);
        setConversation(detail);
        if (detail.unread_count) await markCareConversationRead(selected);
      } else setConversation(null);
    } catch (requestError) {
      setError(requestError.code === 'contract_mismatch'
        ? 'The care-coordinator queue is waiting for a compatible server contract.'
        : (requestError.message || 'The care-coordinator queue could not be loaded.'));
    } finally { setLoading(false); }
  }, [conversationId, demoMode]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (selectedActionId = null) => {
    if (!conversation?.allowed_actions.reply || !activeTurn || (!message.trim() && !selectedActionId)) return;
    setSending(true); setError('');
    try {
      if (demoMode) {
        const action = quickActions.find((item) => item.id === selectedActionId);
        const inboundId = newId(); const outboundId = newId();
        const next = { ...conversation, continuity_version: conversation.continuity_version + 1, unread_count: 0, active_reply_turn_id: outboundId,
          turns: [...conversation.turns,
            { turn_id: inboundId, direction: 'inbound', sender_role: 'doctor', audience_role: 'care_kernel', message: message.trim() || action?.label || 'Acknowledged', reply_to_turn_id: activeTurn.turn_id, state_version: activeTurn.state_version, status: 'ready', structured: { requested_response_type: null, quick_actions: [], next_checkpoint_at: null } },
            { turn_id: outboundId, direction: 'outbound', sender_role: 'care_kernel', audience_role: 'doctor', message: 'Acknowledged. The clinical review queue remains the only place to approve or amend a clinical plan.', reply_to_turn_id: inboundId, state_version: activeTurn.state_version + 1, status: 'ready', structured: { requested_response_type: 'task_update', quick_actions: [], next_checkpoint_at: '2026-08-12T12:00:00+01:00' } },
          ] };
        setConversation(next); setItems([next]); setMessage(''); return;
      }
      const result = await replyToCareConversation(conversation.conversation_id, {
        client_turn_id: newId(), reply_to_turn_id: activeTurn.turn_id,
        expected_loop_state_version: activeTurn.state_version, message: message.trim(), media: [],
        selected_action_id: selectedActionId,
      });
      setConversation(result.conversation); setMessage('');
      setItems((current) => current.map((item) => item.conversation_id === result.conversation.conversation_id ? result.conversation : item));
    } catch (requestError) {
      if (requestError.status === 409) { await load(); setError('The task changed while you were replying. The current checkpoint is now shown.'); }
      else setError(requestError.message || 'The reply could not be sent.');
    } finally { setSending(false); }
  };

  const available = capabilities?.capabilities?.care_conversation_api && capabilities?.capabilities?.proactive_app_inbox;
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fb', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        {demoMode && <Alert severity="warning" sx={{ mb: 2 }}><strong>Synthetic demo:</strong> no production patient data or writes are used on this route.</Alert>}
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="h4" fontWeight={900}>Care coordinator</Typography>
          <Typography color="text.secondary">Consented transition context and operational checkpoints. Clinical decisions remain in the review queue.</Typography>
        </Stack>
        <Alert severity="info" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          A conversational reply cannot approve a plan, attest a discharge, change triage, or create a clinical decision. Use the existing review and exact-hash decision routes.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
          : !available ? <Alert severity="info">This feature is not enabled for your authenticated provider role.</Alert>
          : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '350px minmax(0, 1fr)' }, gap: 2 }}>
              <Card variant="outlined" sx={{ display: { xs: conversationId ? 'none' : 'block', md: 'block' }, overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}><Typography fontWeight={900}>Assigned checkpoints</Typography></Box><Divider />
                {items.length === 0 ? <Typography color="text.secondary" sx={{ p: 3 }}>No assigned care conversations.</Typography> : (
                  <List disablePadding>{items.map((item) => (
                    <ListItemButton key={item.conversation_id} selected={item.conversation_id === conversation?.conversation_id} onClick={() => navigate(`/care-coordinator/${item.conversation_id}`)} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ minWidth: 0, width: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" gap={1}>
                          <Typography fontWeight={850} noWrap>Patient case {item.patient_id}</Typography>
                          {item.unread_count > 0 && <Chip size="small" color="primary" label={item.unread_count} />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" noWrap>{words(item.current_commitment?.next_action || item.tasks[0]?.task_type || 'care checkpoint')}</Typography>
                      </Box>
                    </ListItemButton>
                  ))}</List>
                )}
              </Card>
              <Card variant="outlined" sx={{ minHeight: 600, display: { xs: conversationId || items.length === 0 ? 'block' : 'none', md: 'block' } }}>
                {!conversation ? <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 600 }}><SmartToyOutlinedIcon color="disabled" sx={{ fontSize: 56 }} /><Typography fontWeight={800}>Select a checkpoint</Typography></Stack> : (
                  <Stack sx={{ minHeight: 600 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2 }}>
                      <IconButton onClick={() => navigate('/care-coordinator')} sx={{ display: { md: 'none' } }}><ArrowBackIcon /></IconButton>
                      <Box sx={{ flex: 1 }}><Typography fontWeight={900}>Patient case {conversation.patient_id}</Typography><Typography variant="caption" color="text.secondary">Protocol-bound care conversation</Typography></Box>
                      <Chip size="small" label={words(conversation.status)} />
                    </Stack><Divider />
                    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                      {conversation.tasks.map((task) => (
                        <Paper variant="outlined" key={task.task_id} sx={{ p: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">{words(task.relation)} checkpoint</Typography>
                          <Typography variant="body2" fontWeight={800}>{words(task.task_type)}</Typography>
                          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1 }}><Chip size="small" label={words(task.state)} /><Chip size="small" color={task.risk_tier === 'urgent' || task.risk_tier === 'emergency' ? 'error' : 'default'} label={words(task.risk_tier)} /></Stack>
                          <Typography variant="caption" color="text.secondary">Due {dateTime(task.due_at)}</Typography>
                        </Paper>
                      ))}
                    </Box>
                    {conversation.active_response_obligation?.status === 'care_operations_review' && <Alert severity="warning" sx={{ mx: 2 }}>Prestige care operations is reviewing the next safe response.</Alert>}
                    <Stack spacing={1} sx={{ p: 2, flex: 1, bgcolor: '#f8fafc', overflowY: 'auto' }}>
                      {conversation.turns.map((turn) => (
                        <Paper key={turn.turn_id} elevation={0} sx={{ p: 1.5, maxWidth: '86%', alignSelf: turn.direction === 'outbound' ? 'flex-start' : 'flex-end', bgcolor: turn.direction === 'outbound' ? 'white' : 'primary.main', color: turn.direction === 'outbound' ? 'text.primary' : 'primary.contrastText', border: '1px solid', borderColor: turn.direction === 'outbound' ? 'divider' : 'primary.main' }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{turn.message}</Typography>
                        </Paper>
                      ))}
                    </Stack>
                    {quickActions.length > 0 && <Stack direction="row" flexWrap="wrap" gap={1} sx={{ px: 2, pt: 1 }}>{quickActions.map((action) => <Button key={action.id} size="small" variant="outlined" disabled={sending} onClick={() => submit(action.id)}>{action.label}</Button>)}</Stack>}
                    <Stack direction="row" spacing={1} sx={{ p: 2 }}>
                      <TextField fullWidth size="small" label="Operational reply" value={message} onChange={(event) => setMessage(event.target.value)} disabled={!activeTurn || sending || !conversation.allowed_actions.reply} />
                      <IconButton color="primary" disabled={!activeTurn || sending || !message.trim()} onClick={() => submit()}>{sending ? <CircularProgress size={22} /> : <SendIcon />}</IconButton>
                    </Stack>
                  </Stack>
                )}
              </Card>
            </Box>
          )}
      </Container>
    </Box>
  );
}
