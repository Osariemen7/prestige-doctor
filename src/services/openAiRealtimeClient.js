const REALTIME_CALLS_URL = process.env.REACT_APP_OPENAI_REALTIME_CALLS_URL || 'https://api.openai.com/v1/realtime/calls';
const DEFAULT_REALTIME_MODEL = 'gpt-realtime-mini';
const COPILOT_UPDATE_TOOL_NAME = 'prestige_emit_copilot_update';

const asObject = (value) => (value && typeof value === 'object' ? value : {});

export const extractRealtimeClientSecret = (sessionResponse = {}) => {
  const payload = asObject(sessionResponse);
  const session = asObject(payload.session);
  const realtime = asObject(payload.realtime);

  const candidates = [
    payload.client_secret?.value,
    payload.client_secret,
    session.client_secret?.value,
    session.client_secret,
    realtime.client_secret?.value,
    realtime.client_secret,
    payload.ephemeral_key?.value,
    payload.ephemeral_key,
    payload.ephemeral_token?.value,
    payload.ephemeral_token,
    payload.value,
    payload.token,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim()) || '';
};

export const hasRealtimeClientSecret = (sessionResponse = {}) => Boolean(extractRealtimeClientSecret(sessionResponse));

const parseRealtimeEvent = (rawData) => {
  if (typeof rawData !== 'string') return rawData;
  try {
    return JSON.parse(rawData);
  } catch {
    return { type: 'raw.message', text: rawData };
  }
};

const getTranscriptFromEvent = (event) => {
  if (!event || typeof event !== 'object') return null;
  const type = String(event.type || '');
  const text =
    event.transcript ||
    event.text ||
    event.output_text ||
    event.delta ||
    event.item?.content?.find?.((part) => part?.transcript || part?.text)?.transcript ||
    event.item?.content?.find?.((part) => part?.transcript || part?.text)?.text;

  if (!text || !type) return null;

  if (type.includes('input_audio_transcription.completed')) {
    return { speaker: 'patient', text };
  }

  if (
    type.includes('response.audio_transcript.done') ||
    type.includes('response.output_text.done') ||
    type.includes('response.text.done')
  ) {
    return { speaker: 'doctor', text };
  }

  return null;
};

const COPILOT_UPDATE_KEYS = [
  'running_summary',
  'missing_information',
  'risk_flags',
  'suggested_questions',
  'draft_assessment',
  'candidate_actions',
  'patient_follow_through_tasks',
];

const findTextParts = (value, depth = 0) => {
  if (!value || depth > 5) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => findTextParts(item, depth + 1));
  }
  if (typeof value !== 'object') return [];

  const directText = [
    value.text,
    value.transcript,
    value.output_text,
    value.delta,
    value.arguments,
  ].filter((item) => typeof item === 'string');

  return [
    ...directText,
    ...findTextParts(value.content, depth + 1),
    ...findTextParts(value.item, depth + 1),
    ...findTextParts(value.response, depth + 1),
    ...findTextParts(value.output, depth + 1),
  ];
};

const tryParseJsonText = (text) => {
  if (typeof text !== 'string' || !text.trim()) return null;
  const trimmed = text.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

const looksLikeCopilotUpdate = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (String(value.type || '').trim() === 'prestige.copilot.update') return true;
  return COPILOT_UPDATE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
};

const normalizeCopilotUpdate = (value) => {
  if (!value || typeof value !== 'object') return null;
  const payload = value.payload && typeof value.payload === 'object' ? value.payload : value;
  if (!looksLikeCopilotUpdate(payload)) return null;
  return {
    type: 'prestige.copilot.update',
    ...payload,
  };
};

export const extractCopilotUpdateFromRealtimeEvent = (event) => {
  if (!event || typeof event !== 'object') return null;

  const directCandidates = [
    event,
    event.payload,
    event.data,
    event.update,
    event.item,
    event.response,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeCopilotUpdate(candidate);
    if (normalized) return normalized;
  }

  for (const textPart of findTextParts(event)) {
    const normalized = normalizeCopilotUpdate(tryParseJsonText(textPart));
    if (normalized) return normalized;
  }

  return null;
};

const collectToolCallCandidates = (value, depth = 0) => {
  if (!value || depth > 5) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectToolCallCandidates(item, depth + 1));
  }
  if (typeof value !== 'object') return [];

  const candidates = [value];
  [
    value.item,
    value.function_call,
    value.tool_call,
    value.call,
    value.data,
    value.response,
  ].forEach((candidate) => {
    if (candidate && typeof candidate === 'object') {
      candidates.push(candidate);
    }
  });

  return [
    ...candidates,
    ...collectToolCallCandidates(value.output, depth + 1),
    ...collectToolCallCandidates(value.content, depth + 1),
    ...collectToolCallCandidates(value.items, depth + 1),
  ];
};

const getToolCallName = (candidate) => (
  candidate?.name ||
  candidate?.function?.name ||
  candidate?.tool?.name ||
  candidate?.item?.name ||
  ''
);

const getToolCallArguments = (candidate) => (
  candidate?.arguments ||
  candidate?.args ||
  candidate?.function?.arguments ||
  candidate?.tool?.arguments ||
  candidate?.item?.arguments ||
  ''
);

const getToolCallId = (candidate) => (
  candidate?.call_id ||
  candidate?.callId ||
  candidate?.tool_call_id ||
  candidate?.item?.call_id ||
  ''
);

export const extractCopilotToolCallFromRealtimeEvent = (event) => {
  if (!event || typeof event !== 'object') return null;

  for (const candidate of collectToolCallCandidates(event)) {
    const name = String(getToolCallName(candidate) || '').trim();
    if (name !== COPILOT_UPDATE_TOOL_NAME) continue;

    const rawArguments = getToolCallArguments(candidate);
    const parsedArguments = rawArguments && typeof rawArguments === 'object'
      ? rawArguments
      : tryParseJsonText(rawArguments);
    const update = normalizeCopilotUpdate(parsedArguments);
    if (!update) continue;

    return {
      callId: String(getToolCallId(candidate) || '').trim(),
      name,
      arguments: parsedArguments,
      update,
    };
  }

  return null;
};

export const buildRealtimeFunctionCallOutputEvents = (toolCall, outputPayload = {}) => {
  const callId = String(toolCall?.callId || toolCall?.call_id || '').trim();
  if (!callId) return [];

  const output = {
    success: true,
    handled_by: 'prestige_doctor_workspace',
    action: 'copilot_update_applied',
    ...outputPayload,
  };

  return [
    {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output),
      },
    },
    { type: 'response.create' },
  ];
};

export const createOpenAiRealtimePeerSession = async ({
  sessionResponse,
  model = DEFAULT_REALTIME_MODEL,
  instructions = '',
  onConnectionStateChange,
  onTranscript,
  onEvent,
  onError,
} = {}) => {
  const clientSecret = extractRealtimeClientSecret(sessionResponse);
  if (!clientSecret) {
    throw new Error('Backend did not return an OpenAI Realtime client secret.');
  }

  if (typeof window === 'undefined' || typeof window.RTCPeerConnection === 'undefined') {
    throw new Error('This browser does not support WebRTC realtime sessions.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not available in this browser.');
  }

  const peerConnection = new window.RTCPeerConnection();
  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const remoteAudio = new Audio();
  remoteAudio.autoplay = true;
  const acknowledgedToolCallIds = new Set();

  mediaStream.getAudioTracks().forEach((track) => {
    peerConnection.addTrack(track, mediaStream);
  });

  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams || [];
    if (remoteStream) {
      remoteAudio.srcObject = remoteStream;
      remoteAudio.play?.().catch(() => null);
    }
  };

  const dataChannel = peerConnection.createDataChannel('oai-events');

  const notifyConnectionState = (state) => {
    if (typeof onConnectionStateChange === 'function') {
      onConnectionStateChange(state);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    notifyConnectionState(peerConnection.connectionState);
  };

  dataChannel.onopen = () => {
    notifyConnectionState('connected');
    if (instructions) {
      dataChannel.send(JSON.stringify({
        type: 'session.update',
        session: { instructions },
      }));
    }
  };

  dataChannel.onmessage = (message) => {
    const event = parseRealtimeEvent(message.data);
    if (typeof onEvent === 'function') {
      onEvent(event);
    }

    const copilotToolCall = extractCopilotToolCallFromRealtimeEvent(event);
    if (copilotToolCall?.callId && !acknowledgedToolCallIds.has(copilotToolCall.callId)) {
      acknowledgedToolCallIds.add(copilotToolCall.callId);
      buildRealtimeFunctionCallOutputEvents(copilotToolCall, {
        update_keys: Object.keys(copilotToolCall.update || {}).filter((key) => key !== 'type'),
      }).forEach((responseEvent) => {
        if (dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(responseEvent));
        }
      });
    }

    const transcript = getTranscriptFromEvent(event);
    if (transcript && typeof onTranscript === 'function') {
      onTranscript(transcript);
    }
  };

  dataChannel.onerror = (event) => {
    if (typeof onError === 'function') {
      onError(event);
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const response = await fetch(REALTIME_CALLS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      'Content-Type': 'application/sdp',
    },
    body: offer.sdp,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `OpenAI Realtime connection failed with status ${response.status}`);
  }

  const answerSdp = await response.text();
  await peerConnection.setRemoteDescription({
    type: 'answer',
    sdp: answerSdp,
  });

  const close = () => {
    dataChannel.close?.();
    mediaStream.getTracks().forEach((track) => track.stop());
    peerConnection.getSenders?.().forEach((sender) => sender.track?.stop?.());
    peerConnection.close();
    if (remoteAudio.srcObject) {
      remoteAudio.srcObject.getTracks?.().forEach((track) => track.stop());
      remoteAudio.srcObject = null;
    }
  };

  return {
    model,
    peerConnection,
    dataChannel,
    mediaStream,
    remoteAudio,
    close,
    sendEvent: (event) => {
      if (dataChannel.readyState !== 'open') return false;
      dataChannel.send(JSON.stringify(event));
      return true;
    },
  };
};
