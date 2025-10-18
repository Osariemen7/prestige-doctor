export const getExistingNote = (review) => {
  if (!review || !review.doctor_note) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(review.doctor_note));
  } catch (error) {
    // Fallback to shallow copy if deep clone fails
    return { ...review.doctor_note };
  }
};

const normalizeSegment = (segment) => {
  if (!segment) {
    return null;
  }

  if (typeof segment === 'string') {
    const text = segment.trim();
    if (!text) {
      return null;
    }
    return {
      speaker: 'unknown',
      text,
      timestamp: null
    };
  }

  if (typeof segment === 'object' && !Array.isArray(segment)) {
    const normalized = { ...segment };

    if (normalized.content && !normalized.text) {
      normalized.text = normalized.content;
    }

    if (normalized.role && !normalized.speaker) {
      normalized.speaker = normalized.role;
    }

    return normalized;
  }

  return null;
};

const collectSegments = (segments, source) => {
  if (!source) {
    return;
  }

  if (Array.isArray(source)) {
    source.forEach((item) => collectSegments(segments, item));
    return;
  }

  const normalized = normalizeSegment(source);
  if (normalized) {
    segments.push(normalized);
  }
};

export const collectReviewTranscripts = (review) => {
  if (!review) {
    return [];
  }

  const segments = [];

  collectSegments(segments, review.transcript);
  collectSegments(segments, review.transcript_segments);
  collectSegments(segments, review.encounter_transcripts);
  collectSegments(segments, review.transcripts);

  if (Array.isArray(review.in_person_encounters)) {
    review.in_person_encounters.forEach((encounter) => {
      collectSegments(segments, encounter?.transcript);
      collectSegments(segments, encounter?.transcript_segments);
      collectSegments(segments, encounter?.encounter_transcripts);
    });
  }

  if (Array.isArray(review.encounters)) {
    review.encounters.forEach((encounter) => {
      collectSegments(segments, encounter?.transcript);
      collectSegments(segments, encounter?.transcript_segments);
      collectSegments(segments, encounter?.encounter_transcripts);
    });
  }

  const seen = new Set();
  const uniqueSegments = [];

  segments.forEach((segment) => {
    const textValue = typeof segment.text === 'string' ? segment.text : segment.content || '';
    const key = `${segment.timestamp || ''}|${segment.speaker || ''}|${textValue}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueSegments.push({ ...segment });
    }
  });

  return uniqueSegments;
};
