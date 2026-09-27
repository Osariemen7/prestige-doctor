import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ResearchReviewScreen from './ResearchReviewScreen';
import { fetchResearchReviewInbox, submitResearchApplicabilityDecision } from './api';

vi.mock('./api', () => ({ fetchResearchReviewInbox: vi.fn(), submitResearchApplicabilityDecision: vi.fn(), getCommandKey: vi.fn(() => 'command-1'), forgetCommandKey: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it('shows scoped queue findings, status and citations without decision controls', async () => {
  fetchResearchReviewInbox.mockResolvedValue({
    research_findings: [{ finding: 'finding-1', claim: 'Review blood pressure evidence', expires_at: '2026-10-01T00:00:00Z', citations: [{ title: 'Clinical source', url: 'https://example.org/evidence' }, { title: 'Unsafe source', url: 'javascript:alert(1)' }] }],
    protocol_updates: [{ candidate: 'update-1', title: 'Guideline update', summary: 'New evidence', jurisdiction: 'NG', citations: [] }],
  });
  render(<MemoryRouter><ResearchReviewScreen /></MemoryRouter>);
  expect(await screen.findByText('Review blood pressure evidence')).toBeInTheDocument();
  expect(screen.getByText('Guideline update')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Clinical source' })).toHaveAttribute('href', 'https://example.org/evidence');
  expect(screen.getByText('Unsafe source').closest('a')).toBeNull();
  expect(screen.getByRole('link', { name: 'Open protocol governance review' })).toHaveAttribute('href', '/app/protocols/update-1');
  expect(screen.queryByRole('button', { name: /approve|reject|apply/i })).not.toBeInTheDocument();
  expect(fetchResearchReviewInbox).toHaveBeenCalledTimes(1);
});

it('keeps demo isolated and refreshes the live inbox explicitly', async () => {
  const demo = render(<ResearchReviewScreen demo />);
  expect(screen.getByText('Research review unavailable in demo')).toBeInTheDocument();
  expect(fetchResearchReviewInbox).not.toHaveBeenCalled();
  demo.unmount();
  fetchResearchReviewInbox.mockResolvedValue({ research_findings: [], protocol_updates: [] });
  render(<MemoryRouter><ResearchReviewScreen /></MemoryRouter>);
  await screen.findByText('No findings awaiting review in your current scope.');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(fetchResearchReviewInbox).toHaveBeenCalledTimes(2));
});

it('binds a non-care-changing decision to the displayed finding hash', async () => {
  fetchResearchReviewInbox.mockResolvedValue({
    research_findings: [{ finding: 'finding-1', finding_hash: 'a'.repeat(64), claim: 'Check evidence', citations: [{ title: 'Source', url: 'https://example.org' }] }],
    protocol_updates: [],
  });
  submitResearchApplicabilityDecision.mockResolvedValue({ public_id: 'decision-1' });
  render(<MemoryRouter><ResearchReviewScreen /></MemoryRouter>);
  await screen.findByText('Check evidence');
  expect(screen.getByText(/Care-changing applicability is not supported by this review contract/)).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Applicable', exact: true })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Clinical rationale'), { target: { value: 'Useful educational context only.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record decision' }));
  await waitFor(() => expect(submitResearchApplicabilityDecision).toHaveBeenCalledWith(expect.objectContaining({
    findingId: 'finding-1', findingHash: 'a'.repeat(64), decision: 'educational_only',
    rationale: 'Useful educational context only.', commandKey: 'command-1',
  })));
});

it('keeps care-changing applicability blocked and offers only the existing proposal-queue route', async () => {
  fetchResearchReviewInbox.mockResolvedValue({
    research_findings: [{ finding: 'finding-2', finding_hash: 'b'.repeat(64), claim: 'Review a scoped finding', citations: [] }],
    protocol_updates: [],
  });
  render(<MemoryRouter><ResearchReviewScreen /></MemoryRouter>);

  await screen.findByText('Review a scoped finding');
  expect(screen.getByRole('link', { name: 'Open clinical review queue' })).toHaveAttribute('href', '/app/queue');
  expect(screen.queryByRole('option', { name: 'Applicable', exact: true })).not.toBeInTheDocument();
  expect(submitResearchApplicabilityDecision).not.toHaveBeenCalled();
});
