import { vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CareActivityPanel from './CareActivityPanel';
import { fetchCareActivity } from './api';

vi.mock('./api', () => ({ fetchCareActivity: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

test('shows server-owned progress and opens only the returned case destination', async () => {
  fetchCareActivity.mockResolvedValue({
    items: [{
      public_id: 'task-1',
      kind: 'clinical_review',
      title: 'Review the returned care update',
      status: 'waiting_on_clinician',
      patient: { display_name: 'Authorized patient' },
      case_id: 'proposal-1',
      progress: 38,
      progress_label: '38% verified progress',
      owner: 'Assigned clinician',
      blocker: 'Decision required',
      next_checkpoint: { title: 'Review evidence', due_at: null },
      updated_at: null,
      due_at: null,
    }],
  });
  const onOpenCase = vi.fn();
  render(<MemoryRouter><CareActivityPanel onOpenCase={onOpenCase} /></MemoryRouter>);
  expect(await screen.findByText('Review the returned care update')).toBeInTheDocument();
  expect(screen.getByText('38% verified progress')).toBeInTheDocument();
  expect(screen.getByText('Decision required')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /open case/i }));
  expect(onOpenCase).toHaveBeenCalledWith('proposal-1');
});

test('reports a projection error without inventing ongoing work', async () => {
  fetchCareActivity.mockRejectedValue(new Error('Projection unavailable'));
  render(<MemoryRouter><CareActivityPanel /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Projection unavailable');
  expect(screen.queryByText('Ongoing care work')).toBeInTheDocument();
});

test('keeps a work item without a case destination read-only', async () => {
  fetchCareActivity.mockResolvedValue({ items: [{ public_id: 'task-2', title: 'Await provider response', status: 'waiting_on_provider', kind: 'coordination', next_checkpoint: {}, patient: null }] });
  render(<MemoryRouter><CareActivityPanel /></MemoryRouter>);
  expect(await screen.findByText('Await provider response')).toBeInTheDocument();
  const action = screen.getByRole('button', { name: /case unavailable/i });
  expect(action).toBeDisabled();
  await waitFor(() => expect(fetchCareActivity).toHaveBeenCalledWith(expect.objectContaining({ role: 'doctor', demo: false })));
});
