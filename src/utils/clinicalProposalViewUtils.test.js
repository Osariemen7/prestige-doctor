import {
  displayClinicalValue,
  getClinicalDiff,
  getClinicalEditContract,
  getClinicalReviewRisk,
  setClinicalPath,
} from './clinicalProposalViewUtils';

describe('clinical proposal view contract helpers', () => {
  it('fails closed when the server does not issue the v2 edit contract', () => {
    expect(getClinicalEditContract({ edit_contract: { schema_version: 'legacy' } })).toBeNull();
    expect(getClinicalEditContract({ edit_contract: { schema_version: 'care_plan_edit.v2', assessment: {} } })).toMatchObject({
      schema_version: 'care_plan_edit.v2',
    });
  });

  it('updates a focused field and exposes privacy-minimal diffs', () => {
    const original = { assessment: { primary_impression: 'Stable', confidence: 'moderate' } };
    const changed = setClinicalPath(original, 'assessment.primary_impression', 'Needs review');
    expect(original.assessment.primary_impression).toBe('Stable');
    expect(changed.assessment.primary_impression).toBe('Needs review');
    expect(getClinicalDiff(original, changed)).toEqual([
      { path: 'assessment.primary_impression', change: 'changed' },
    ]);
  });

  it('only reflects server-provided safety priority and evidence fields', () => {
    const risk = getClinicalReviewRisk({
      exception_packet: {
        priority: 'high',
        must_not_miss: ['Chest pain red flags'],
        missing_evidence: ['Current vital signs'],
      },
      clinical_documentation: { missing_sections: ['objective'] },
    });
    expect(risk).toMatchObject({
      highRisk: true,
      priority: 'high',
      mustNotMiss: ['Chest pain red flags'],
      missingEvidence: ['Current vital signs'],
      missingSections: ['objective'],
    });
    expect(displayClinicalValue({ label: 'Home BP' })).toBe('Home BP');
  });
});

