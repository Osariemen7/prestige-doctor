import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessagesScreen from './MessagesScreen';
import { getCareCapabilities, getCareConversation, listCareConversations, replyToCareConversation, markCareConversationRead } from '../services/careConversationApi';
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../services/careConversationApi', () => ({ getCareCapabilities: vi.fn(), getCareConversation: vi.fn(), listCareConversations: vi.fn(), replyToCareConversation: vi.fn(), markCareConversationRead: vi.fn() }));
vi.mock('./components', () => ({ EmptyState: ({title}) => <p>{title}</p>, ErrorState: ({error}) => <p role="alert">{error.message}</p>, LoadingState: () => <p>Loading</p> }));
const conversation = { conversation_id: 'conversation-1', unread_count: 0, current_commitment: { next_action: 'Follow-up' }, active_reply_turn_id: 'turn-1', allowed_actions: { reply: true, read: true }, turns: [{ turn_id: 'turn-1', state_version: 7, direction: 'outbound', sender_role: 'care_kernel', message: 'Please review the update', structured: { quick_actions: [] } }] };
beforeEach(() => { vi.clearAllMocks(); getCareCapabilities.mockResolvedValue({ capabilities: { care_conversation_api: true, proactive_app_inbox: true } }); listCareConversations.mockResolvedValue({ items: [conversation] }); getCareConversation.mockResolvedValue(conversation); markCareConversationRead.mockResolvedValue({}); });
test('an uncertain reply retries the same server-bound command without inventing success', async () => {
  replyToCareConversation.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ conversation });
  render(<MessagesScreen conversationId="conversation-1" />);
  fireEvent.change(await screen.findByLabelText('Reply'), { target: { value: 'Reviewing now' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
  fireEvent.click(screen.getByRole('button', { name: 'Retry reply' }));
  await waitFor(() => expect(replyToCareConversation).toHaveBeenCalledTimes(2));
  expect(replyToCareConversation.mock.calls[0]).toEqual(replyToCareConversation.mock.calls[1]);
  expect(replyToCareConversation.mock.calls[0][1]).toMatchObject({ expected_loop_state_version: 7, reply_to_turn_id: 'turn-1', message: 'Reviewing now' });
});
test('server permission controls whether a reply can be composed', async () => {
  getCareConversation.mockResolvedValue({ ...conversation, allowed_actions: { read: true, reply: false } });
  render(<MessagesScreen conversationId="conversation-1" />);
  expect(await screen.findByText('There is no reply requested at this checkpoint.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Reply')).not.toBeInTheDocument();
});
