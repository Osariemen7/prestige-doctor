import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CaseScreen from './ClinicalCaseScreen';
import { fetchProposal, fetchReviewInbox, mutateReviewClaim } from './api';
vi.mock('./api', () => ({ fetchProposal: vi.fn(), fetchReviewInbox: vi.fn(), mutateReviewClaim: vi.fn() }));
test('a backend 403 exposes only the authorized pool preview until a claim succeeds', async () => {
  fetchProposal.mockRejectedValue({ status: 403, message: 'Active case-review claim required.' });
  fetchReviewInbox.mockResolvedValue({ items: [{ public_id: 'pool-1', pool_preview: true, claimable: true, urgency: 'routine', route_mode: 'covering_pool' }] });
  mutateReviewClaim.mockResolvedValue({ public_id: 'pool-1', proposal_hash: 'hash', patient: { display_name: 'Authorized after claim' }, review_claim: { claimed_by_current_doctor: true }, clinical_documentation: { state: 'unavailable' } });
  render(<MemoryRouter><CaseScreen proposalId="pool-1" /></MemoryRouter>);
  const claim = await screen.findByRole('button', { name: /claim/i });
  expect(screen.queryByText('Authorized after claim')).not.toBeInTheDocument();
  expect(fetchReviewInbox).toHaveBeenCalledWith(expect.objectContaining({ queue: 'pool' }));
  fireEvent.click(claim);
  await waitFor(() => expect(screen.getAllByText('Authorized after claim').length).toBeGreaterThan(0));
});
