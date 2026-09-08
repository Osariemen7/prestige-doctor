import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import DiagnosticResultReviewPanel from './DiagnosticResultReviewPanel';

describe('DiagnosticResultReviewPanel', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('shows provenance and next action without locally completing the result', () => {
    act(() => {
      root.render(
        <DiagnosticResultReviewPanel
          review={{
            review_status: 'pending',
            investigation_results: [{
              id: 4,
              test_type: 'HbA1c',
              fulfillment_status: 'completed',
              result_verification_status: 'unverified',
              results: '6.8%',
              next_action: 'doctor_review',
            }],
          }}
        />
      );
    });

    expect(container.querySelector('[data-testid="diagnostic-result-review-panel"]')).not.toBeNull();
    expect(container.textContent).toContain('Unverified');
    expect(container.textContent).toContain('Doctor Review');
    expect(container.textContent).toMatch(/do not present it as a provider-confirmed result/i);
  });
});
