import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { FactCheck, OpenInNew, WarningAmber } from '@mui/icons-material';

const asArray = (value) => (Array.isArray(value) ? value : []);
const normalize = (value) => String(value || '').trim().toLowerCase();
const label = (value) => String(value || 'Unknown').replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const getCandidateResults = (review) => {
  const candidates = [
    ...asArray(review?.investigation_results),
    ...asArray(review?.investigations),
    ...asArray(review?.care_kernel?.investigations),
    ...asArray(review?.diagnostic_results),
  ];
  const note = typeof review?.doctor_note === 'object' ? review.doctor_note : review?.note_payload;
  candidates.push(...asArray(note?.investigation));
  return candidates.filter((item, index, list) => {
    if (!item || typeof item !== 'object') return false;
    const key = item.id || item.investigation_id || `${item.test_type || item.name || 'investigation'}-${index}`;
    return list.findIndex((entry, entryIndex) => (entry?.id || entry?.investigation_id || `${entry?.test_type || entry?.name || 'investigation'}-${entryIndex}`) === key) === index;
  });
};

const isResultBearing = (item) => Boolean(
  item?.result_url || item?.results || item?.narrative_result || item?.value !== undefined ||
  item?.result_verification_status || item?.verification_status
);

const resultStatus = (item) => normalize(
  item?.result_verification_status || item?.verification_status || 'not_submitted'
);

const investigationStatus = (item) => normalize(item?.fulfillment_status || item?.status || 'requested');

export default function DiagnosticResultReviewPanel({ review, onRequestMoreInfo }) {
  const results = useMemo(() => getCandidateResults(review).filter(isResultBearing), [review]);
  if (results.length === 0) return null;

  const reviewStatus = normalize(review?.review_status || (review?.is_finalized ? 'finalized' : 'pending'));
  const reviewComplete = ['approved', 'finalized'].includes(reviewStatus);

  return (
    <Card variant="outlined" sx={{ mb: 3, borderColor: 'info.light', bgcolor: 'rgba(239,246,255,0.62)' }} data-testid="diagnostic-result-review-panel">
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <FactCheck color="info" />
                <Typography variant="h6" fontWeight={900}>Diagnostic result review</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                These facts are server-projected from the investigation. Review the exact patient/dependent, provenance and next action before communicating through the approved WhatsApp follow-through.
              </Typography>
            </Box>
            <Chip label={reviewComplete ? 'Review recorded' : 'Review required'} color={reviewComplete ? 'success' : 'warning'} variant="outlined" size="small" />
          </Stack>
          <Divider />
          {results.map((item, index) => {
            const verification = resultStatus(item);
            const status = investigationStatus(item);
            const name = item.test_type || item.name || `Investigation ${item.id || index + 1}`;
            const nextAction = item.next_action || (status === 'completed' ? 'doctor_review' : 'await_provider_result');
            const reportHref = item.result_url || item.report_url;
            const verified = ['verified', 'provider_verified', 'staff_verified'].includes(verification);
            return (
              <Box key={item.id || item.investigation_id || `${name}-${index}`} sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                  <Box>
                    <Typography fontWeight={800}>{name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Patient/dependent: {item.patient_name || item.dependent_name || review.patient_first_name || 'Server-scoped record'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap">
                    <Chip label={label(status)} size="small" variant="outlined" />
                    <Chip label={label(verification)} size="small" color={verified ? 'success' : 'warning'} variant="outlined" />
                  </Stack>
                </Stack>
                {(item.value !== undefined && item.value !== null) && <Typography sx={{ mt: 1 }}><strong>Value:</strong> {item.value} {item.unit || ''}</Typography>}
                {(item.results || item.narrative_result) && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{item.results || item.narrative_result}</Typography>}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Next server action: <strong>{label(nextAction)}</strong>
                </Typography>
                {reportHref && (
                  <Button component={Link} href={reportHref} target="_blank" rel="noopener noreferrer" size="small" endIcon={<OpenInNew />} sx={{ mt: 1 }}>
                    Open report artifact
                  </Button>
                )}
                {!verified && <Alert severity="warning" icon={<WarningAmber />} sx={{ mt: 1 }}>Unverified or legacy evidence. Do not present it as a provider-confirmed result.</Alert>}
              </Box>
            );
          })}
          <Alert severity={reviewComplete ? 'info' : 'warning'}>
            {reviewComplete
              ? 'The clinical review is recorded. Follow the server-issued next action and the existing WhatsApp follow-through controls.'
              : 'Use the existing doctor decision bar to document assessment, escalation or a request for more information. This panel never marks a result or care episode complete locally.'}
          </Alert>
          {!reviewComplete && onRequestMoreInfo && (
            <Button variant="outlined" onClick={() => onRequestMoreInfo()} sx={{ alignSelf: 'flex-start' }}>
              Ask for missing result context
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
