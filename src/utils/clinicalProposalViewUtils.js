const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const asClinicalList = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && item !== '');
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

export const formatClinicalFieldLabel = (value) => String(value || '')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const displayClinicalValue = (value, empty = 'Not supplied by server') => {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.length ? value.map((item) => displayClinicalValue(item)).join(', ') : empty;
  if (isObject(value)) {
    const preferred = value.label || value.title || value.name || value.detail || value.summary || value.status || value.state;
    if (preferred !== undefined && preferred !== null && preferred !== '') return String(preferred);
    return Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${formatClinicalFieldLabel(key)}: ${displayClinicalValue(item)}`)
      .join(' · ') || empty;
  }
  return String(value);
};

const clone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

/**
 * The edit contract is server-issued. Returning null rather than synthesising
 * a document makes the UI fail closed when the backend does not release v2.
 */
export const getClinicalEditContract = (documentation) => {
  const contract = documentation?.edit_contract;
  if (!isObject(contract) || contract.schema_version !== 'care_plan_edit.v2') return null;
  return clone(contract);
};

export const setClinicalPath = (source, path, value) => {
  const next = clone(source) || {};
  const parts = String(path).split('.').filter(Boolean);
  let cursor = next;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value;
      return;
    }
    if (!isObject(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  });
  return next;
};

export const getClinicalPath = (source, path) => String(path).split('.').filter(Boolean).reduce(
  (value, part) => value?.[part],
  source
);

export const getClinicalDiff = (before, after, prefix = '') => {
  if (isObject(before) && isObject(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap((key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!(key in before)) return [{ path, change: 'added' }];
      if (!(key in after)) return [{ path, change: 'removed' }];
      return getClinicalDiff(before[key], after[key], path);
    });
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    if (JSON.stringify(before) === JSON.stringify(after)) return [];
    return [{ path: prefix || 'document', change: 'changed' }];
  }
  if (before !== after) return [{ path: prefix || 'document', change: 'changed' }];
  return [];
};

export const getClinicalReviewRisk = (proposal) => {
  const packet = proposal?.exception_packet || {};
  const documentation = proposal?.clinical_documentation || {};
  const evidenceQuality = proposal?.evidence_quality || {};
  const missingEvidence = asClinicalList(packet.missing_evidence || documentation.missing_evidence || evidenceQuality.gaps);
  const missingSections = asClinicalList(documentation.missing_sections);
  const mustNotMiss = asClinicalList(packet.must_not_miss || documentation.sections?.assessment?.must_not_miss);
  const priority = String(packet.priority || '').toLowerCase();
  return {
    priority: priority || 'not supplied',
    mustNotMiss,
    missingEvidence,
    missingSections,
    highRisk: ['critical', 'high'].includes(priority),
  };
};

export const getClinicalEvidenceRows = (proposal) => asClinicalList(
  proposal?.evidence || proposal?.clinical_documentation?.source_provenance
).filter((item) => item !== null && item !== undefined);

export const getClinicalAttestationRequirements = () => ([
  {
    key: 'documentation_reviewed',
    label: 'I reviewed the complete SOAP packet and its linked source evidence.',
  },
  {
    key: 'allergies_and_interactions_reviewed',
    label: 'I checked allergies, interactions, medication safety, investigation instructions, and the safety net.',
  },
]);

export const getClinicalDecisionCategoryOptions = () => ([
  { value: 'routine_review', label: 'Routine review' },
  { value: 'missing_evidence', label: 'Missing evidence' },
  { value: 'medication_safety', label: 'Medication or interaction review' },
  { value: 'high_risk', label: 'High-risk or must-not-miss review' },
  { value: 'escalation', label: 'Escalation or live clarification' },
]);

