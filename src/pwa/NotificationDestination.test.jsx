import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationDestination from './NotificationDestination';
import { getNotification, readNotification } from './notificationApi';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, NavLink: ({ children }) => <span>{children}</span> }));
jest.mock('./notificationApi', () => ({ getNotification: jest.fn(), readNotification: jest.fn(), notificationPath: (item) => item.route }));
beforeEach(() => { jest.clearAllMocks(); readNotification.mockResolvedValue({}); });
test('reauthorizes the opaque identifier before marking read and navigating', async () => {
  getNotification.mockResolvedValue({ route: '/app/messages/authorized' });
  render(<NotificationDestination notificationId="notification-1" />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/messages/authorized', { replace: true }));
  expect(getNotification).toHaveBeenCalledWith('notification-1', expect.anything());
  expect(readNotification).toHaveBeenCalledWith('notification-1');
});
test('revoked notifications never navigate or acknowledge as read', async () => {
  getNotification.mockRejectedValue(new Error('This notification is no longer authorized.'));
  render(<NotificationDestination notificationId="revoked" />);
  expect(await screen.findByText('This notification is no longer authorized.')).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(readNotification).not.toHaveBeenCalled();
});
