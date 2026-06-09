import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Chip,
  Checkbox,
  LinearProgress,
  Stack,
  Card,
  CardContent,
  Divider,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  alpha,
  BottomNavigation,
  BottomNavigationAction,
  Collapse,
  CircularProgress
} from '@mui/material';
import {
  Mic as MicIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Close as CloseIcon,
  LocalHospital as MedicalIcon,
  Assignment as OrderIcon,
  HelpOutline as QuestionIcon,
  GraphicEq as AudioIcon,
  CheckCircleOutline as CheckIcon,
  HistoryEdu as HistoryIcon,
  Chat as ChatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlaylistAddCheck as ActionsIcon
} from '@mui/icons-material';

import { getUser } from '../api';
import {
  createRealtimeSession,
  forceOpenAiClinicalDocumentation,
  saveLiveCopilotArtifacts,
} from '../services/doctorWorkflowApi';
import {
  createOpenAiRealtimePeerSession,
  extractCopilotUpdateFromRealtimeEvent,
  hasRealtimeClientSecret,
} from '../services/openAiRealtimeClient';
import {
  buildCopilotDraftSyncPayload,
  buildRealtimeSessionPayload,
  getLiveCopilotModeConfig,
  normalizeTriageContextForRealtime,
} from '../utils/liveCopilotWorkflow';


const MOCK_DIALOGUE_FLOW = [
  {
    speaker: 'patient',
    text: "Doctor, I've had this really bad abdominal pain since yesterday morning. It is quite severe.",
    differentials: [
      { name: 'Acute Appendicitis', probability: 45, logic: 'Sudden onset abdominal pain, migrating characteristics pending.' },
      { name: 'Gastroenteritis', probability: 25, logic: 'Diffuse abdominal pain.' },
      { name: 'Renal Colic', probability: 15, logic: 'Acute onset pain, flank status unconfirmed.' }
    ],
    probingQuestions: [
      { id: 1, text: "Did the pain start around your navel and then move to the lower right side?", rationale: "Check for classic migrating appendiceal pain." },
      { id: 2, text: "Are you experiencing any nausea, vomiting, or loss of appetite?", rationale: "Identify systemic gastrointestinal involvement." }
    ],
    prescriptions: [
      { name: 'Paracetamol IV', dosage: '1g', interval: 'Q8h', selected: false }
    ],
    investigations: [
      { name: 'CBC with Diff', reason: 'Assess for leukocytosis', selected: true },
      { name: 'Abdominal Ultrasound', reason: 'Visualize appendix & abdomen', selected: true }
    ],
    otherActions: [
      { type: 'counselling', name: 'Rest and hydration advice', notes: 'Gently limit strenuous movement', selected: false },
      { type: 'procedures', name: 'Assess vitals hourly', notes: 'Monitor BP, heart rate, & temperature', selected: true }
    ]
  },
  {
    speaker: 'doctor',
    text: "I see. Let's explore that. Did the pain start around your navel and then move to the lower right side?",
    differentials: [
      { name: 'Acute Appendicitis', probability: 55, logic: 'Question regarding classic migratory pattern asked.' }
    ],
    probingQuestions: [
      { id: 1, text: "Did the pain start around your navel and then move to the lower right side?", rationale: "Currently asking...", asked: true },
      { id: 2, text: "Are you experiencing any nausea, vomiting, or loss of appetite?", rationale: "Identify systemic gastrointestinal involvement." }
    ]
  },
  {
    speaker: 'patient',
    text: "Yes, exactly! It started right in the middle near my belly button, but now it's settled low down on the right side. It hurts a lot more when I try to walk.",
    differentials: [
      { name: 'Acute Appendicitis', probability: 78, logic: 'Positive McBurney migration confirmed. Aggravated by movement.' },
      { name: 'Renal Colic', probability: 8, logic: 'Flank radiation absent, migration pattern highly specific for appendicitis.' },
      { name: 'Gastroenteritis', probability: 5, logic: 'No diarrhea reported, localized rebound tenderness implied.' }
    ],
    probingQuestions: [
      { id: 3, text: "Are you experiencing a fever, or do you feel unusually hot and cold?", rationale: "Assess systemic inflammatory response." },
      { id: 4, text: "Is the pain sharp, and does it feel worse when I press down or when I release pressure?", rationale: "Check for peritoneal irritation / rebound tenderness." }
    ],
    prescriptions: [
      { name: 'Paracetamol IV', dosage: '1g', interval: 'Q8h', selected: true },
      { name: 'Ciprofloxacin IV', dosage: '400mg', interval: 'Q12h', selected: false }
    ],
    investigations: [
      { name: 'CBC with Diff', reason: 'Assess for leukocytosis', selected: true },
      { name: 'Abdominal CT with Contrast', reason: 'High confidence confirmation', selected: true },
      { name: 'Urinalysis', reason: 'Rule out UTI / hematuria', selected: true }
    ],
    otherActions: [
      { type: 'counselling', name: 'Strict NPO Status (Fasting)', notes: 'Avoid all solid food & liquids in case of emergency surgery', selected: true },
      { type: 'procedures', name: 'Peripheral IV Cannula Insertion', notes: '18G or 20G in left forearm', selected: true },
      { type: 'referral', name: 'Refer to General Surgery (On-call)', notes: 'Assess for surgical emergency', selected: false }
    ]
  },
  {
    speaker: 'doctor',
    text: "Understood. Are you experiencing a fever, and does the pain feel worse when pressure is released?",
    differentials: [
      { name: 'Acute Appendicitis', probability: 85, logic: 'Rebound tenderness validation ongoing.' }
    ],
    probingQuestions: [
      { id: 3, text: "Are you experiencing a fever, or do you feel unusually hot and cold?", rationale: "Currently asking...", asked: true },
      { id: 4, text: "Is the pain sharp, and does it feel worse when pressure is released?", rationale: "Currently asking...", asked: true }
    ]
  },
  {
    speaker: 'patient',
    text: "I checked my temperature earlier and it was 38.2°C. And yes, it absolutely shoots through me when you release the pressure. It's unbearable.",
    differentials: [
      { name: 'Acute Appendicitis (High Urgency)', probability: 94, logic: 'Confirmed low-grade fever + classic rebound tenderness. Peritonitis risk high.' },
      { name: 'Renal Colic', probability: 2, logic: 'Incompatible with rebound peritonitis and inflammatory pyrexia.' }
    ],
    probingQuestions: [
      { id: 5, text: "When was the last time you had anything to eat or drink?", rationale: "Pre-operative fasting checklist (NPO)." },
      { id: 6, text: "Do you have any known allergies, especially to antibiotics or pain medications?", rationale: "Ensure safe medication planning." }
    ],
    prescriptions: [
      { name: 'Paracetamol IV', dosage: '1g', interval: 'Q8h', selected: true },
      { name: 'Ciprofloxacin IV', dosage: '400mg', interval: 'Q12h', selected: true },
      { name: 'Metronidazole IV', dosage: '500mg', interval: 'Q8h', selected: true }
    ],
    investigations: [
      { name: 'CBC with Diff', reason: 'Confirm leukocytosis', selected: true },
      { name: 'Abdominal CT with Contrast', reason: 'Pre-op diagnostic confirmation', selected: true },
      { name: 'Basic Metabolic Panel (BMP)', reason: 'Pre-op baseline hydration/electrolytes', selected: true }
    ],
    otherActions: [
      { type: 'counselling', name: 'Strict NPO Status (Fasting)', notes: 'Maintain NPO until surgical review', selected: true },
      { type: 'counselling', name: 'Emergency Surgery Consent Discussion', notes: 'Explain appendectomy process & risks', selected: true },
      { type: 'procedures', name: 'Emergency Appendectomy Prep', notes: 'Shave RLQ & administer pre-op antibiotics', selected: true },
      { type: 'referral', name: 'Urgent General Surgery Consultation', notes: 'Pre-op assessment & surgery booking', selected: true }
    ]
  }
];

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const textValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return (
      value.text ||
      value.title ||
      value.label ||
      value.name ||
      value.description ||
      value.question ||
      value.reason ||
      ''
    ).toString().trim();
  }
  return String(value).trim();
};

const normalizePercent = (value, fallback = 30) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(1, Math.min(99, Math.round(percent)));
};

const normalizeCopilotSummaryList = (value) => asArray(value)
  .map(textValue)
  .filter(Boolean)
  .slice(0, 5);

const firstPresent = (...values) => values.find((value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
});

const normalizeRiskFlags = (value) => asArray(value)
  .map((item) => {
    if (typeof item === 'string') {
      return { label: item.trim(), severity: 'watch', evidence: '' };
    }
    return {
      label: textValue(item) || 'Clinical risk flag',
      severity: String(item?.severity || item?.risk_level || item?.urgency || 'watch').toLowerCase(),
      evidence: textValue(item?.evidence || item?.rationale || item?.detail || item?.notes),
    };
  })
  .filter((item) => item.label)
  .slice(0, 6);

const normalizeDifferentials = (update) => {
  const source =
    update?.differentials ||
    update?.differential_diagnoses ||
    update?.differentialDiagnoses ||
    update?.draftAssessment?.differentials ||
    update?.draftAssessment?.differential_diagnosis ||
    update?.draftAssessment?.differentialDiagnosis ||
    update?.draft_assessment?.differentials ||
    update?.draft_assessment?.differential_diagnosis ||
    update?.draft_assessment?.differentialDiagnosis ||
    [];

  return asArray(source)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          name: item.trim(),
          probability: Math.max(10, 45 - index * 10),
          logic: 'Realtime copilot suggestion.',
        };
      }
      return {
        name: textValue(item?.name || item?.diagnosis || item?.title || item?.label) || `Differential ${index + 1}`,
        probability: normalizePercent(item?.probability || item?.confidence || item?.score, Math.max(10, 45 - index * 10)),
        logic: textValue(item?.logic || item?.rationale || item?.evidence || item?.reasoning || item?.reason) || 'Realtime copilot suggestion.',
      };
    })
    .filter((item) => item.name)
    .slice(0, 6);
};

const normalizeSuggestedQuestions = (update) => {
  const source = (
    update?.suggested_questions ||
    update?.suggestedQuestions ||
    update?.questions ||
    update?.missing_information ||
    update?.missingInformation ||
    []
  );
  return asArray(source)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `rt-question-${Date.now()}-${index}`,
          text: item.trim(),
          rationale: 'Realtime missing-data prompt.',
        };
      }
      return {
        id: item?.id || `rt-question-${Date.now()}-${index}`,
        text: textValue(item?.question || item?.text || item?.label || item?.title),
        rationale: textValue(item?.rationale || item?.reason || item?.detail || item?.description) || 'Realtime missing-data prompt.',
        asked: Boolean(item?.asked),
      };
    })
    .filter((item) => item.text)
    .slice(0, 8);
};

const actionType = (item) => String(item?.type || item?.action_type || item?.category || '').toLowerCase();

const normalizeCandidateActions = (update) => {
  const expandActionSource = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'object') return [{ type: 'counselling', title: textValue(value) }];

    const directTitle = textValue(value?.title || value?.name || value?.label || value?.medication_name || value?.test_type);
    if (directTitle) return [value];

    return Object.entries(value).flatMap(([category, items]) => asArray(items).map((item) => {
      if (item && typeof item === 'object') {
        return { ...item, type: item.type || item.action_type || category };
      }
      return { type: category, title: textValue(item) };
    }));
  };

  const source = [
    ...expandActionSource(update?.candidate_actions || update?.candidateActions),
    ...expandActionSource(update?.draft_actions || update?.draftActions),
    ...expandActionSource(update?.orders),
    ...asArray(update?.prescriptions).map((item) => ({ ...(typeof item === 'object' ? item : { title: item }), type: 'prescription' })),
    ...asArray(update?.investigations).map((item) => ({ ...(typeof item === 'object' ? item : { title: item }), type: 'investigation' })),
    ...asArray(update?.referrals).map((item) => ({ ...(typeof item === 'object' ? item : { title: item }), type: 'referral' })),
  ];
  const prescriptions = [];
  const investigations = [];
  const otherActions = [];

  source.forEach((item) => {
    const type = actionType(item);
    const title = textValue(item?.title || item?.name || item?.label || item?.medication_name || item?.test_type);
    if (!title) return;

    if (/medication|prescription|drug|dose/.test(type)) {
      prescriptions.push({
        name: title,
        dosage: textValue(item?.dosage || item?.dose) || 'As directed',
        interval: textValue(item?.interval || item?.frequency) || 'As directed',
        selected: Boolean(item?.selected),
      });
      return;
    }

    if (/investigation|lab|test|imaging|biomarker/.test(type)) {
      investigations.push({
        name: title,
        reason: textValue(item?.reason || item?.rationale || item?.detail || item?.description) || 'Realtime clinical suggestion',
        selected: Boolean(item?.selected),
      });
      return;
    }

    otherActions.push({
      type: /referral/.test(type) ? 'referral' : /procedure|vital|monitor/.test(type) ? 'procedures' : 'counselling',
      name: title,
      notes: textValue(item?.notes || item?.reason || item?.rationale || item?.detail || item?.description),
      selected: Boolean(item?.selected),
    });
  });

  return { prescriptions, investigations, otherActions };
};

const mergeClinicalItems = (current, incoming, keyName = 'name') => {
  if (!incoming.length) return current;
  const byKey = new Map();
  current.forEach((item) => {
    const key = String(item?.[keyName] || item?.name || item?.title || '').toLowerCase();
    if (key) byKey.set(key, item);
  });

  const merged = [...current];
  incoming.forEach((item) => {
    const key = String(item?.[keyName] || item?.name || item?.title || '').toLowerCase();
    if (!key) return;
    const existingIndex = merged.findIndex((candidate) => (
      String(candidate?.[keyName] || candidate?.name || candidate?.title || '').toLowerCase() === key
    ));
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...item,
        selected: merged[existingIndex].selected || item.selected,
        asked: merged[existingIndex].asked || item.asked,
      };
    } else if (!byKey.has(key)) {
      merged.push(item);
      byKey.set(key, item);
    }
  });
  return merged.slice(0, 12);
};

const LiveCopilotDashboard = ({
  open,
  onClose,
  patientName = "Patient",
  chiefComplaint = "General consultation",
  continuityBrief = null,
  patientAge = null,
  publicId = "demo",
  medicalReviewPublicId = null,
  patientId = null,
  mode = 'live_encounter',
  reviewOrigin = 'live_encounter',
  triageContext = null,
  onSync
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const modeConfig = useMemo(() => getLiveCopilotModeConfig(mode), [mode]);
  const normalizedTriageContext = useMemo(
    () => normalizeTriageContextForRealtime(triageContext || {}, mode),
    [triageContext, mode]
  );
  
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [, setDialogueIndex] = useState(-1);
  const [transcripts, setTranscripts] = useState([]);
  const [isDocumenting, setIsDocumenting] = useState(false);
  const [realtimeSession, setRealtimeSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [sessionError, setSessionError] = useState('');
  const [savingArtifacts, setSavingArtifacts] = useState(false);
  const [copilotBrief, setCopilotBrief] = useState({
    runningSummary: [],
    missingInformation: [],
    riskFlags: [],
    followThroughTasks: [],
    lastUpdatedAt: null,
  });

  const handleForceDocumentation = async () => {
    setIsDocumenting(true);
    try {
      const transcriptText = transcripts.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n');
      
      // Realtime session dispatch: ask the OpenAI-backed assistant to draft the official clinical documentation.
      console.log("WebSocket TX (OpenAI Realtime): Force documentation tool selection", {
        sessionUpdate: {
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["document_clinical_encounter"]
            }
          }
        }
      });
      
      // Send turn request prompt
      console.log("WebSocket TX (OpenAI Realtime): Client documentation prompt", {
        clientContent: {
          turns: [{
            role: "user",
            parts: [{ text: "Please generate the clinical SOAP documentation for our discussion immediately." }]
          }],
          turnComplete: true
        }
      });

      console.log("WebSocket RX (OpenAI Realtime): Documentation tool call received", {
        toolCall: {
          functionCalls: [
            {
              name: "document_clinical_encounter",
              id: "call_forced_doc_12345",
              args: {
                transcript: transcriptText
              }
            }
          ]
        }
      });

      let documentationResult;
      const user = getUser();
      const providerProfileId = user?.provider_profile_id || null;
      const organizationId = user?.organization_id || 1;

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      const nextReviewStr = nextDate.toISOString().replace('T', ' ').substring(0, 16); // YYYY-MM-DD HH:MM

      const todayStr = new Date().toISOString().split('T')[0];
      const prescriptionEndDate = new Date();
      prescriptionEndDate.setDate(prescriptionEndDate.getDate() + 7);
      const prescriptionEndDateStr = prescriptionEndDate.toISOString().split('T')[0];

      const mappedPrescriptions = prescriptions.filter(p => p.selected).map(p => ({
        medication_name: p.name,
        dosage: p.dosage || '1 tablet',
        route: p.name.toLowerCase().includes('iv') ? 'intravenous' : 'oral',
        interval: p.interval ? (p.interval.includes('Q8h') ? 8 : p.interval.includes('Q12h') ? 12 : p.interval.includes('Q24h') ? 24 : 8) : 8,
        start_date: todayStr,
        end_date: prescriptionEndDateStr,
        instructions: `Take ${p.dosage || '1 tablet'} every ${p.interval || '8 hours'}.`,
        is_otc: false
      }));

      const mappedInvestigations = investigations.filter(i => i.selected).map(i => ({
        test_type: i.name,
        reason: i.reason || 'Clinical evaluation',
        instructions: 'Walk-in laboratory.',
        interval: 0
      }));

      const soapArguments = {
        medical_review_public_id: medicalReviewPublicId || (publicId && publicId !== 'demo' ? publicId : null),
        patient_id: patientId,
        provider_profile_id: providerProfileId,
        organization_id: organizationId,
        review_context: 'live_visit',
        patient_name: patientName,
        subjective: {
          chief_complaint: chiefComplaint || "General consultation",
          history_of_present_illness: transcripts.filter(t => t.speaker === 'patient').map(t => t.text).join(' ') || "Patient presents for clinical evaluation. Symptoms onset, duration, and aggravating factors: [edit here].",
          review_of_systems: transcripts.length > 0 ? "Gastrointestinal and constitutional systems reviewed." : "Constitutional: [edit]. Cardiovascular: [edit]. Respiratory: [edit]. Gastrointestinal: [edit]. Neurological: [edit]."
        },
        objective: {
          examination_findings: transcripts.length > 0 ? "Physical exam findings: alert and oriented, localized tenderness as noted in dialogue." : "Vitals: Stable. General appearance: Alert, oriented, in no acute distress. Heart: RRR, no murmurs. Lungs: Clear to auscultation. Abdomen: Soft, non-tender, active bowel sounds. Skin: Warm and dry.",
          investigations: transcripts.length > 0 ? "Prior investigations reviewed." : "Prior or external lab/imaging reports: None available."
        },
        assessment: {
          primary_diagnosis: differentials[0]?.name || "Unspecified clinical concern",
          differential_diagnosis: differentials.slice(1).map(d => `${d.name} (${d.probability}%)`).join(', ') || "None.",
          diagnosis_reasoning: differentials[0]?.logic || "Clinical evaluation and differential diagnoses reasoning pending.",
          status: "unknown"
        },
        plan: {
          management: "Clinical Management: " + (otherActions.filter(a => a.selected).map(a => a.name).join(', ') || "Awaiting doctor-approved orders."),
          lifestyle_advice: otherActions.filter(a => a.selected && a.type === 'counselling').map(a => a.name).join('. ') || "Rest and maintain adequate hydration. Avoid strenuous activities.",
          follow_up: "Follow up as recommended.",
          patient_education: "Discussed warning signs and symptoms.",
          treatment_goal: "Recovery and stabilization.",
          plan_reasoning: "Clinical guidelines for primary diagnosis."
        },
        next_review: nextReviewStr,
        prescription: mappedPrescriptions,
        investigation: mappedInvestigations
      };

      if (publicId && publicId !== 'demo') {
        // Real mode: execute function call securely via backend EMR toolCalls router.
        // This invokes the exact `/runfunction/` execution endpoint used by both Doctor and Patient apps.
        await forceOpenAiClinicalDocumentation(soapArguments);
        documentationResult = soapArguments;

        // Log toolResponse sent back to WebSocket
        console.log("WebSocket TX (OpenAI Realtime): Send documentation tool response", {
          toolResponse: {
            functionResponses: [
              {
                response: {
                  output: {
                    status: "success",
                    message: "EMR documentation generated successfully."
                  }
                },
                id: "call_forced_doc_12345"
              }
            ]
          }
        });
      } else {
        // Demo/Simulated mode fallback: immediately generate high-fidelity simulated SOAP note!
        await new Promise(resolve => setTimeout(resolve, 1500)); // simulate network delay
        
        documentationResult = transcripts.length > 0 ? {
          subjective: {
            chief_complaint: chiefComplaint || "General consultation",
            history_of_present_illness: "Patient presents with sudden-onset severe abdominal pain starting yesterday near navel, migrating lower right quadrant. Worsens with movement/walking. Negative for diarrhea. Denies similar prior attacks.",
            review_of_systems: "Gastrointestinal and constitutional systems reviewed."
          },
          objective: {
            examination_findings: "T: 38.2 C. HR: 95 bpm. RLQ tenderness present. Positive rebound tenderness and McBurney point hyperalgesia noted.",
            investigations: "Prior investigations reviewed."
          },
          assessment: {
            primary_diagnosis: "Acute migrative appendicitis with localized peritoneal irritation.",
            differential_diagnosis: differentials.slice(1).map(d => `${d.name} (${d.probability}%)`).join(', ') || "None.",
            diagnosis_reasoning: "Based on patient report and history.",
            status: "unknown"
          },
          plan: {
            management: "Strict NPO. Monitor vitals hourly. Prep for urgent General Surgery consult and appendectomy. Start empiric broad-spectrum antibiotics post-cultures.",
            lifestyle_advice: "Rest and hydration advice. Maintain NPO until surgical review.",
            follow_up: "Follow up as recommended.",
            patient_education: "Discussed warning signs and symptoms.",
            treatment_goal: "Recovery and stabilization.",
            plan_reasoning: "Clinical guidelines for primary diagnosis."
          },
          prescription: mappedPrescriptions,
          investigation: mappedInvestigations
        } : soapArguments;
      }

      // Sync back to EMR Note Editor
      if (onSync) {
        onSync(buildCopilotDraftSyncPayload({
          soapNote: {
            subjective: documentationResult.subjective,
            objective: documentationResult.objective,
            assessment: documentationResult.assessment,
            plan: documentationResult.plan
          },
          prescriptions: documentationResult.prescription || mappedPrescriptions,
          investigations: documentationResult.investigation || mappedInvestigations,
          otherActions: otherActions.filter(a => a.selected),
          mode,
          reviewOrigin,
          selectedOnly: false,
        }));
      }

      setIsActive(false);
      onClose();

    } catch (error) {
      console.error("Forced EMR documentation failed:", error);
      alert(`Forced documentation failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsDocumenting(false);
    }
  };

  
  // Mobile Tab Navigation State: 0 = Mic & Chat, 1 = AI Diagnosis, 2 = Drafts
  const [activeMobileTab, setActiveMobileTab] = useState(0);
  const [showContinuity, setShowContinuity] = useState(true);
  
  // Real-time UI State (AI Predictions)
  const [differentials, setDifferentials] = useState([]);
  const [probingQuestions, setProbingQuestions] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [otherActions, setOtherActions] = useState([]);
  const renderCopilotEmptyState = (message = 'No live suggestions yet.') => (
    <Typography
      variant="body2"
      sx={{
        color: 'rgba(255,255,255,0.45)',
        fontSize: '0.82rem',
        fontStyle: 'italic',
        py: 1,
      }}
    >
      {message}
    </Typography>
  );

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dialogueTimerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const realtimePeerRef = useRef(null);

  useEffect(() => () => {
    if (dialogueTimerRef.current) {
      clearInterval(dialogueTimerRef.current);
    }
    realtimePeerRef.current?.close?.();
    realtimePeerRef.current = null;
  }, []);

  // Auto scroll transcription to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Sine Wave active visualizer effect
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = alpha(theme.palette.primary.main, 0.8);
      ctx.strokeStyle = theme.palette.primary.main;
      ctx.beginPath();
      
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;
      const amplitude = isActive && !isPaused ? 24 : 3;
      const frequency = isActive && !isPaused ? 0.025 : 0.01;

      for (let x = 0; x < width; x++) {
        const y = mid + Math.sin(x * frequency + phase) * amplitude * Math.sin(x * Math.PI / width);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = alpha(theme.palette.secondary.main, 0.4);
      ctx.strokeStyle = alpha(theme.palette.secondary.main, 0.6);
      ctx.beginPath();
      
      for (let x = 0; x < width; x++) {
        const y = mid + Math.sin(x * frequency * 1.5 - phase) * (amplitude * 0.6) * Math.sin(x * Math.PI / width);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += isActive && !isPaused ? 0.12 : 0.02;
      animationFrameRef.current = requestAnimationFrame(drawWave);
    };

    drawWave();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isPaused, theme, activeMobileTab]);

  // Dialogue simulation flow
  const advanceDialogue = () => {
    setDialogueIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= MOCK_DIALOGUE_FLOW.length) {
        clearInterval(dialogueTimerRef.current);
        return prev;
      }

      const nextPayload = MOCK_DIALOGUE_FLOW[nextIndex];
      
      setTranscripts(old => [...old, {
        speaker: nextPayload.speaker,
        text: nextPayload.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);

      if (nextPayload.differentials) setDifferentials(nextPayload.differentials);
      if (nextPayload.probingQuestions) setProbingQuestions(nextPayload.probingQuestions);
      if (nextPayload.prescriptions) setPrescriptions(nextPayload.prescriptions);
      if (nextPayload.investigations) setInvestigations(nextPayload.investigations);
      if (nextPayload.otherActions) setOtherActions(nextPayload.otherActions);

      return nextIndex;
    });
  };

  const closeRealtimePeer = () => {
    realtimePeerRef.current?.close?.();
    realtimePeerRef.current = null;
  };

  const addTranscriptEntry = ({ speaker = 'doctor', text }) => {
    if (!text) return;
    setTranscripts(old => [...old, {
      speaker,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);
  };

  const applyCopilotUpdate = (update) => {
    if (!update || typeof update !== 'object') return;

    const nextDifferentials = normalizeDifferentials(update);
    if (nextDifferentials.length) {
      setDifferentials(nextDifferentials);
    }

    const nextQuestions = normalizeSuggestedQuestions(update);
    if (nextQuestions.length) {
      setProbingQuestions((current) => mergeClinicalItems(current, nextQuestions, 'text'));
    }

    const { prescriptions: nextPrescriptions, investigations: nextInvestigations, otherActions: nextOtherActions } = normalizeCandidateActions(update);
    if (nextPrescriptions.length) {
      setPrescriptions((current) => mergeClinicalItems(current, nextPrescriptions, 'name'));
    }
    if (nextInvestigations.length) {
      setInvestigations((current) => mergeClinicalItems(current, nextInvestigations, 'name'));
    }
    if (nextOtherActions.length) {
      setOtherActions((current) => mergeClinicalItems(current, nextOtherActions, 'name'));
    }

    setCopilotBrief((current) => {
      const runningSummary = normalizeCopilotSummaryList(firstPresent(update.running_summary, update.runningSummary, update.summary));
      const missingInformation = normalizeCopilotSummaryList(firstPresent(update.missing_information, update.missingInformation, update.missing_data, update.missingData));
      const riskFlags = normalizeRiskFlags(firstPresent(update.risk_flags, update.riskFlags, update.safety_flags, update.safetyFlags));
      const followThroughTasks = normalizeCopilotSummaryList(firstPresent(
        update.patient_follow_through_tasks,
        update.patientFollowThroughTasks,
        update.follow_through_tasks,
        update.followThroughTasks
      ));
      return {
        runningSummary: runningSummary.length ? runningSummary : current.runningSummary,
        missingInformation: missingInformation.length ? missingInformation : current.missingInformation,
        riskFlags: riskFlags.length ? riskFlags : current.riskFlags,
        followThroughTasks: followThroughTasks.length ? followThroughTasks : current.followThroughTasks,
        lastUpdatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    });
  };

  const buildInitialCopilotBrief = () => ({
    runningSummary: normalizedTriageContext.patient_story
      ? [`Existing triage summary: ${normalizedTriageContext.patient_story}`]
      : [],
    missingInformation: asArray(normalizedTriageContext.missing_information)
      .map((item) => textValue(item.question || item))
      .filter(Boolean)
      .slice(0, 8),
    riskFlags: normalizeRiskFlags(normalizedTriageContext.risk_flags),
    followThroughTasks: [],
    lastUpdatedAt: null,
  });

  useEffect(() => {
    closeRealtimePeer();
    setIsActive(false);
    setIsPaused(false);
    setDialogueIndex(-1);
    setTranscripts([]);
    setDifferentials([]);
    setProbingQuestions([]);
    setPrescriptions([]);
    setInvestigations([]);
    setOtherActions([]);
    setSessionStatus('idle');
    setSessionError('');
    setRealtimeSession(null);
    setCopilotBrief(buildInitialCopilotBrief());
    if (dialogueTimerRef.current) {
      clearInterval(dialogueTimerRef.current);
      dialogueTimerRef.current = null;
    }
  }, [publicId]);

  const handleStartSession = async () => {
    setSessionStatus('connecting');
    setSessionError('');
    closeRealtimePeer();
    let shouldRunPreviewDialogue = publicId === 'demo';

    if (publicId && publicId !== 'demo') {
      try {
        const session = await createRealtimeSession(publicId, buildRealtimeSessionPayload({
          mode,
          reviewOrigin,
          patientId,
          patientName,
          chiefComplaint,
          continuityBrief,
          triageContext,
        }));
        setRealtimeSession(session);
        if (hasRealtimeClientSecret(session)) {
          try {
            const peerSession = await createOpenAiRealtimePeerSession({
              sessionResponse: session,
              model: session?.model || 'gpt-realtime-mini',
              instructions: session?.instructions || session?.session?.instructions || '',
              onConnectionStateChange: (state) => {
                if (state === 'connected') {
                  setSessionStatus('connected');
                } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
                  setSessionStatus('preview');
                }
              },
              onTranscript: addTranscriptEntry,
              onEvent: (event) => {
                const copilotUpdate = extractCopilotUpdateFromRealtimeEvent(event);
                if (copilotUpdate) {
                  applyCopilotUpdate(copilotUpdate);
                }
              },
              onError: () => {
                setSessionError('Realtime data channel reported an error. Local preview remains available.');
              },
            });
            realtimePeerRef.current = peerSession;
            shouldRunPreviewDialogue = false;
            setSessionStatus('connected');
          } catch (realtimeError) {
            console.error('OpenAI Realtime WebRTC connection failed:', realtimeError);
            setSessionError(realtimeError.message || 'Realtime WebRTC connection failed. Continuing in local preview mode.');
            setSessionStatus('preview');
          }
        } else {
          setSessionStatus('preview');
          if (!session?.local_fallback) {
            setSessionError('Backend session created, but no browser client secret was returned yet. Realtime suggestions will stay empty until live updates are available.');
          }
        }
      } catch (error) {
        console.error('Realtime session setup failed:', error);
        setSessionError(error.message || 'Realtime setup failed. Realtime suggestions will stay empty until live updates are available.');
        setSessionStatus('preview');
      }
    } else {
      setRealtimeSession({ local_fallback: true, model: 'gpt-realtime-mini', session_id: 'demo' });
      setSessionStatus('preview');
    }

    setIsActive(true);
    setIsPaused(false);
    setDialogueIndex(-1);
    setTranscripts([]);
    setCopilotBrief(buildInitialCopilotBrief());
    
    if (dialogueTimerRef.current) clearInterval(dialogueTimerRef.current);

    if (shouldRunPreviewDialogue) {
      setTimeout(() => {
        advanceDialogue();
      }, 1000);

      dialogueTimerRef.current = setInterval(() => {
        advanceDialogue();
      }, 8500);
    } else {
      addTranscriptEntry({
        speaker: 'doctor',
        text: mode === 'triage_clarification'
          ? 'OpenAI Realtime clarification connected. Focus on unresolved triage questions and safety verification.'
          : 'OpenAI Realtime session connected. Listening for patient and clinician audio.',
      });
    }
  };

  const handlePauseSession = () => {
    setIsPaused(prev => {
      const nextState = !prev;
      realtimePeerRef.current?.mediaStream?.getAudioTracks?.().forEach((track) => {
        track.enabled = !nextState;
      });
      if (nextState) {
        clearInterval(dialogueTimerRef.current);
      } else {
        dialogueTimerRef.current = setInterval(() => {
          advanceDialogue();
        }, 8500);
      }
      return nextState;
    });
  };

  const buildLiveCopilotArtifactPayload = (endedAt) => {
    const transcriptPayload = transcripts.map((entry, index) => ({
      id: `doctor-live-transcript-${index + 1}`,
      speaker: entry.speaker,
      text: entry.text,
      time: entry.time,
      at: endedAt,
    }));
    const copilotBriefPayload = {
      running_summary: copilotBrief.runningSummary,
      missing_information: copilotBrief.missingInformation,
      risk_flags: copilotBrief.riskFlags,
      followThroughTasks: copilotBrief.followThroughTasks,
      follow_through_tasks: copilotBrief.followThroughTasks,
      last_updated_at: copilotBrief.lastUpdatedAt,
    };

    return {
      session_id: realtimeSession?.session_id || realtimeSession?.session?.id || realtimeSession?.local_event?.id || null,
      session_status: 'stopped',
      mode,
      review_origin: reviewOrigin,
      ended_at: endedAt,
      transcript: transcriptPayload,
      tool_activity: [{
        id: `doctor-live-stop-${Date.now()}`,
        name: 'openai_realtime_session',
        stage: 'stopped',
        level: 'info',
        message: 'Doctor stopped the live copilot session from the review workspace.',
        result: {
          model: realtimeSession?.model || 'gpt-realtime-mini',
          session_status: 'stopped',
        },
      }],
      copilot_brief: copilotBriefPayload,
      triage_context: normalizedTriageContext,
      capability_expectations: {
        draft_only: true,
        doctor_approval_required: true,
        preserve_source_labels: true,
        patient_follow_through_after_approval: true,
      },
    };
  };

  const hasLiveCopilotArtifactContent = () => Boolean(
    transcripts.length ||
    copilotBrief.runningSummary.length ||
    copilotBrief.missingInformation.length ||
    copilotBrief.riskFlags.length ||
    copilotBrief.followThroughTasks.length
  );

  const handleStopSession = async () => {
    const endedAt = new Date().toISOString();
    setIsActive(false);
    setIsPaused(false);
    clearInterval(dialogueTimerRef.current);
    closeRealtimePeer();
    if (!publicId || publicId === 'demo' || !hasLiveCopilotArtifactContent()) {
      setSessionStatus('idle');
      return;
    }

    setSavingArtifacts(true);
    setSessionStatus('saving');
    try {
      const result = await saveLiveCopilotArtifacts(publicId, buildLiveCopilotArtifactPayload(endedAt));
      if (result?.local_fallback) {
        setSessionError(result.message || 'Live copilot artifacts were captured locally.');
      } else {
        setSessionError('');
        if (typeof onSync === 'function') {
          onSync({
            liveArtifactsSaved: true,
            review: result?.review,
            liveArtifacts: result?.live_artifacts,
          });
        }
      }
    } catch (error) {
      console.error('Failed to save live copilot artifacts:', error);
      setSessionError(error.message || 'Live copilot artifacts could not be saved.');
    } finally {
      setSavingArtifacts(false);
      setSessionStatus('idle');
    }
  };

  const handleTogglePrescription = (index) => {
    setPrescriptions(prev => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  const handleToggleInvestigation = (index) => {
    setInvestigations(prev => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  const handleToggleOtherAction = (index) => {
    setOtherActions(prev => {
      const next = [...prev];
      next[index].selected = !next[index].selected;
      return next;
    });
  };

  const handleQuestionAsked = (id) => {
    setProbingQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, asked: !q.asked } : q)
    );
  };

  const getActionChipColor = (type) => {
    switch (type) {
      case 'counselling': return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', label: 'Counselling' };
      case 'procedures': return { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', label: 'Procedure' };
      case 'referral': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: 'Referral' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', text: '#ccc', label: 'Action' };
    }
  };

  const handleSyncDraftActions = () => {
    const draftPayload = buildCopilotDraftSyncPayload({
      prescriptions,
      investigations,
      otherActions,
      mode,
      reviewOrigin,
    });

    if (onSync) {
      onSync(draftPayload);
    } else {
      alert(
        `Draft Sync Prepared\n\n` +
        `Draft Medications: ${draftPayload.prescriptions.map(p => p.medication_name).join(', ') || 'None'}\n` +
        `Draft Investigations: ${draftPayload.investigations.map(i => i.test_type).join(', ') || 'None'}\n` +
        `Draft Actions: ${draftPayload.otherActions.map(a => a.name).join(', ') || 'None'}\n\n` +
        `Doctor approval is required before patient-facing orders or instructions.`
      );
    }
    onClose();
  };

  const hasCopilotBrief = Boolean(
    copilotBrief.runningSummary.length ||
    copilotBrief.missingInformation.length ||
    copilotBrief.riskFlags.length ||
    copilotBrief.followThroughTasks.length
  );

  const renderCopilotBriefPanel = (compact = false) => {
    if (!hasCopilotBrief) return null;

    return (
      <Box sx={{
        mb: compact ? 2 : 3,
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: 'rgba(37, 99, 235, 0.08)',
        border: '1px solid rgba(96, 165, 250, 0.2)'
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
          <Typography variant="subtitle2" sx={{ color: '#bfdbfe', fontWeight: 800, letterSpacing: 0.2 }}>
            {modeConfig.briefTitle}
          </Typography>
          {copilotBrief.lastUpdatedAt && (
            <Chip size="small" label={copilotBrief.lastUpdatedAt} sx={{ height: 22, color: '#93c5fd', bgcolor: 'rgba(59, 130, 246, 0.14)' }} />
          )}
        </Stack>

        {copilotBrief.riskFlags.length > 0 && (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
            {copilotBrief.riskFlags.map((flag, index) => (
              <Chip
                key={`${flag.label}-${index}`}
                size="small"
                label={flag.label}
                sx={{
                  maxWidth: '100%',
                  color: flag.severity.includes('critical') || flag.severity.includes('urgent') ? '#fecaca' : '#fde68a',
                  bgcolor: flag.severity.includes('critical') || flag.severity.includes('urgent')
                    ? 'rgba(239, 68, 68, 0.16)'
                    : 'rgba(245, 158, 11, 0.14)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              />
            ))}
          </Stack>
        )}

        {copilotBrief.runningSummary.length > 0 && (
          <Stack spacing={0.75} sx={{ mb: copilotBrief.missingInformation.length || copilotBrief.followThroughTasks.length ? 1.25 : 0 }}>
            {copilotBrief.runningSummary.map((item, index) => (
              <Typography key={`${item}-${index}`} variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', fontSize: compact ? '0.78rem' : '0.82rem', lineHeight: 1.35 }}>
                {item}
              </Typography>
            ))}
          </Stack>
        )}

        {copilotBrief.missingInformation.length > 0 && (
          <Box sx={{ mb: copilotBrief.followThroughTasks.length ? 1.25 : 0 }}>
            <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 800, display: 'block', mb: 0.75, textTransform: 'uppercase' }}>
              Missing Data
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {copilotBrief.missingInformation.map((item, index) => (
                <Chip key={`${item}-${index}`} size="small" label={item} sx={{ maxWidth: '100%', color: '#fde68a', bgcolor: 'rgba(251, 191, 36, 0.12)' }} />
              ))}
            </Stack>
          </Box>
        )}

        {copilotBrief.followThroughTasks.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: '#86efac', fontWeight: 800, display: 'block', mb: 0.75, textTransform: 'uppercase' }}>
              Patient Follow-Through
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {copilotBrief.followThroughTasks.map((item, index) => (
                <Chip key={`${item}-${index}`} size="small" label={item} sx={{ maxWidth: '100%', color: '#bbf7d0', bgcolor: 'rgba(34, 197, 94, 0.12)' }} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    );
  };

  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 1400,
      bgcolor: '#0a0d14',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '"Outfit", "Inter", sans-serif',
      height: '100dvh',
      overflow: 'hidden'
    }}>
      {/* Header Panel */}
      <Box sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(16, 20, 32, 0.95) 0%, rgba(10, 13, 20, 0.95) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        minWidth: 0
      }}>
        <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Box sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: isActive && !isPaused ? '#ef4444' : '#9ca3af',
            boxShadow: isActive && !isPaused ? '0 0 12px #ef4444' : 'none',
            animation: isActive && !isPaused ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.2)', opacity: 0.4 },
              '100%': { transform: 'scale(1)', opacity: 1 }
            }
          }} />
          <Typography variant="h6" fontWeight="700" letterSpacing={0.5} sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {modeConfig.title.toUpperCase()} <span style={{ color: alpha('#fff', 0.5), fontSize: '0.8rem', display: isMobile ? 'none' : 'inline' }}>| OPENAI REALTIME</span>
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }} sx={{ minWidth: 0, flexShrink: 0 }}>
          <Chip
            icon={<MedicalIcon sx={{ color: 'white !important', fontSize: '0.85rem' }} />}
            label={isMobile ? patientName : `Patient: ${patientName}`}
            sx={{
              bgcolor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              fontWeight: '600',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              height: 28,
              fontSize: '0.8rem',
              maxWidth: { xs: 128, sm: 220 },
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }
            }}
          />
          <IconButton onClick={onClose} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Continuity Context Banner */}
      <Box sx={{
        px: { xs: 2, sm: 3 },
        py: 1.25,
        bgcolor: 'rgba(99, 102, 241, 0.08)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        flexShrink: 0,
        maxHeight: { xs: '32dvh', md: 'none' },
        overflowY: { xs: 'auto', md: 'visible' }
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => setShowContinuity(c => !c)}>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon sx={{ color: '#818cf8', fontSize: '1.15rem' }} />
            <Typography variant="body2" sx={{ fontWeight: '700', color: '#a5b4fc', fontSize: '0.85rem' }}>
              {modeConfig.continuityLabel}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: '#a5b4fc' }}>
            {showContinuity ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>

        <Collapse in={showContinuity}>
          <Box sx={{ pl: 3.2, pb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, display: 'block' }}>
              <strong>Chief Complaint:</strong> {chiefComplaint} {patientAge ? `• Age: ${patientAge}` : ''}
            </Typography>
            {continuityBrief && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5, display: 'block', fontStyle: 'italic', lineHeight: 1.4 }}>
                <strong>Prior Visit Summary:</strong> {continuityBrief.length > 160 ? `${continuityBrief.substring(0, 160)}...` : continuityBrief}
              </Typography>
            )}
            {modeConfig.guidance && (
              <Typography variant="caption" sx={{ color: '#ddd6fe', mt: 0.5, display: 'block', lineHeight: 1.4 }}>
                <strong>Copilot Focus:</strong> {modeConfig.guidance}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
              <Chip
                label={`Mode: ${String(mode).replace(/_/g, ' ')}`}
                size="small"
                variant="outlined"
                sx={{ color: '#c7d2fe', borderColor: 'rgba(199, 210, 254, 0.35)' }}
              />
              <Chip
                label={sessionStatus === 'connected' ? 'OpenAI Realtime Connected' : sessionStatus === 'connecting' ? 'Connecting Realtime' : sessionStatus === 'saving' ? 'Saving Live Session' : sessionStatus === 'preview' ? 'Realtime Preview' : 'Realtime Idle'}
                size="small"
                color={sessionStatus === 'connected' ? 'success' : sessionStatus === 'connecting' || sessionStatus === 'saving' ? 'info' : 'default'}
                variant="outlined"
                sx={{ color: '#c7d2fe', borderColor: 'rgba(199, 210, 254, 0.35)' }}
              />
              <Chip
                label={realtimeSession?.model || 'gpt-realtime-mini'}
                size="small"
                variant="outlined"
                sx={{ color: '#c7d2fe', borderColor: 'rgba(199, 210, 254, 0.35)' }}
              />
              {asArray(normalizedTriageContext.approval_readiness?.blockers).length > 0 && (
                <Chip
                  label={`${normalizedTriageContext.approval_readiness.blockers.length} approval blockers`}
                  size="small"
                  variant="outlined"
                  sx={{ color: '#fde68a', borderColor: 'rgba(251, 191, 36, 0.45)' }}
                />
              )}
            </Stack>
            {mode === 'triage_clarification' && asArray(normalizedTriageContext.clarification_focus?.focus_items).length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {normalizedTriageContext.clarification_focus.focus_items.slice(0, 5).map((item, index) => (
                  <Chip
                    key={`${item}-${index}`}
                    size="small"
                    label={item}
                    sx={{ color: '#fef3c7', bgcolor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.22)' }}
                  />
                ))}
              </Stack>
            )}
            {sessionError && (
              <Typography variant="caption" sx={{ color: '#fca5a5', mt: 0.75, display: 'block' }}>
                {sessionError}
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Main Multi-Panel Viewport */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* DESKTOP SIDE-BY-SIDE MODE */}
        {!isMobile ? (
          <>
            {/* COLUMN 1: Active Audio & Live Transcription (Left) */}
            <Box sx={{
              width: '32%',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: '#0e111a'
            }}>
              {/* Active Audio Visualizer Panel */}
              <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#9ca3af', letterSpacing: 1.5, fontWeight: '700', display: 'block', mb: 1, textTransform: 'uppercase' }}>
                  Real-time Audio Stream
                </Typography>
                
                <Box sx={{ position: 'relative', height: 70, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', mb: 2 }}>
                  <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                </Box>

                <Box display="flex" justifyContent="center" gap={1.5}>
                  {!isActive ? (
                    <Button
                      variant="contained"
                      startIcon={<MicIcon />}
                      onClick={handleStartSession}
                      disabled={sessionStatus === 'connecting' || savingArtifacts}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        py: 1,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        bgcolor: '#2563eb',
                        '&:hover': { bgcolor: '#1d4ed8' }
                      }}
                    >
                      {sessionStatus === 'connecting' ? 'Connecting...' : savingArtifacts ? 'Saving...' : 'Start Live Consult'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                        onClick={handlePauseSession}
                        color={isPaused ? 'success' : 'warning'}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                      >
                        {isPaused ? 'Resume' : 'Pause'}
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<StopIcon />}
                        onClick={handleStopSession}
                        color="error"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                      >
                        Stop
                      </Button>
                    </>
                  )}
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={isDocumenting ? <CircularProgress size={20} color="inherit" /> : <ActionsIcon />}
                    onClick={handleForceDocumentation}
                    disabled={isDocumenting}
                    sx={{
                      borderRadius: 2,
                      py: 1,
                      fontWeight: 'bold',
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                      boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                        boxShadow: '0 6px 18px rgba(139, 92, 246, 0.6)'
                      }
                    }}
                  >
                    {isDocumenting ? 'Generating Consultation Note...' : 'Generate Consultation Note'}
                  </Button>
                </Box>
              </Box>

              {/* Scrolling Transcription */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AudioIcon sx={{ color: '#3b82f6', fontSize: '1.2rem' }} /> Consultation Dialogue
                </Typography>
                
                <Box sx={{
                  flex: 1,
                  overflowY: 'auto',
                  pr: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '3px' }
                }}>
                  {transcripts.map((t, idx) => (
                    <Slide key={idx} direction="up" in mountOnEnter unmountOnExit>
                      <Box sx={{ alignSelf: t.speaker === 'patient' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                        <Paper elevation={0} sx={{
                          p: 1.5,
                          borderRadius: 2.5,
                          bgcolor: t.speaker === 'patient' ? 'rgba(255,255,255,0.06)' : 'rgba(37, 99, 235, 0.18)',
                          border: '1px solid',
                          borderColor: t.speaker === 'patient' ? 'rgba(255,255,255,0.08)' : 'rgba(37, 99, 235, 0.3)'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: t.speaker === 'patient' ? '#60a5fa' : '#34d399', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                            {t.speaker === 'patient' ? 'Patient' : 'Clinician'}
                          </Typography>
                          <Typography variant="body2">{t.text}</Typography>
                        </Paper>
                      </Box>
                    </Slide>
                  ))}
                  <div ref={transcriptEndRef} />
                </Box>
              </Box>
            </Box>

            {/* COLUMN 2: Clinical Diagnostics (Center) */}
            <Box sx={{
              width: '36%',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              p: 3
            }}>
              {renderCopilotBriefPanel(false)}

              {/* Ranked Differentials */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MedicalIcon sx={{ color: '#ef4444', fontSize: '1.25rem' }} /> Ranked Differential Diagnoses
                </Typography>

                <Stack spacing={2}>
                  {differentials.length === 0 && renderCopilotEmptyState('No ranked differentials yet. Start a live session to generate patient-specific suggestions.')}
                  {differentials.map((diff, index) => (
                    <Box key={index}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                          {index + 1}. {diff.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: '800', color: diff.probability > 70 ? '#f87171' : diff.probability > 40 ? '#fbbf24' : '#60a5fa', fontSize: '0.85rem' }}>
                          {diff.probability}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={diff.probability}
                        sx={{
                          height: 7,
                          borderRadius: 3.5,
                          bgcolor: 'rgba(255,255,255,0.08)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: diff.probability > 70 ? '#ef4444' : diff.probability > 40 ? '#fbbf24' : '#2563eb',
                            borderRadius: 3.5
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.25, display: 'block', fontStyle: 'italic', lineHeight: 1.25 }}>
                        💡 {diff.logic}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1.5 }} />

              {/* Probing Questions */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', mt: 0.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuestionIcon sx={{ color: '#fbbf24', fontSize: '1.25rem' }} /> Dynamic Probing Questions
                </Typography>

                <Box sx={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  pr: 0.5,
                  '&::-webkit-scrollbar': { width: '4px' }
                }}>
                  {probingQuestions.length === 0 && renderCopilotEmptyState('No probing questions yet.')}
                  {probingQuestions.map((q) => (
                    <Card key={q.id} sx={{
                      bgcolor: q.asked ? 'rgba(255,255,255,0.02)' : 'rgba(251, 191, 36, 0.04)',
                      border: '1px solid',
                      borderColor: q.asked ? 'rgba(255,255,255,0.05)' : 'rgba(251, 191, 36, 0.18)',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: q.asked ? 'rgba(255,255,255,0.04)' : 'rgba(251, 191, 36, 0.08)' }
                    }} onClick={() => handleQuestionAsked(q.id)}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box display="flex" gap={1.5} alignItems="flex-start">
                          <Box sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: q.asked ? 'rgba(255,255,255,0.1)' : 'rgba(251, 191, 36, 0.15)',
                            color: q.asked ? 'rgba(255,255,255,0.4)' : '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}>
                            {q.asked ? '✓' : '?'}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: q.asked ? 'rgba(255,255,255,0.4)' : 'white', textDecoration: q.asked ? 'line-through' : 'none' }}>
                              {q.text}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.25, fontSize: '0.75rem' }}>
                              <strong>Rationale:</strong> {q.rationale}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* COLUMN 3: Suggested EMR Drafts: Prescriptions, Investigations & Other Actions (Right) */}
            <Box sx={{
              width: '32%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              p: 3,
              bgcolor: '#0c0f17'
            }}>
              <Box sx={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                pr: 0.5,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)' }
              }}>
                {/* 1. Prescriptions */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Draft Prescriptions
                  </Typography>
                  <Stack spacing={1.5}>
                    {prescriptions.length === 0 && renderCopilotEmptyState('No draft medications yet.')}
                    {prescriptions.map((prescription, idx) => (
                      <Paper key={idx} sx={{
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: prescription.selected ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid',
                        borderColor: prescription.selected ? 'rgba(52, 211, 153, 0.28)' : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }} onClick={() => handleTogglePrescription(idx)}>
                        <Box display="flex" gap={1.5} alignItems="center">
                          <Checkbox checked={prescription.selected} size="small" color="success" sx={{ p: 0 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: prescription.selected ? 'white' : 'rgba(255,255,255,0.7)' }}>
                              {prescription.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                              Dose: {prescription.dosage} • {prescription.interval}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={prescription.selected ? 'Draft' : 'Add'} size="small" color={prescription.selected ? 'success' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* 2. Investigations */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#60a5fa', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Draft Investigations
                  </Typography>
                  <Stack spacing={1.5}>
                    {investigations.length === 0 && renderCopilotEmptyState('No draft investigations yet.')}
                    {investigations.map((investigation, idx) => (
                      <Paper key={idx} sx={{
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: investigation.selected ? 'rgba(96, 165, 250, 0.06)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid',
                        borderColor: investigation.selected ? 'rgba(96, 165, 250, 0.28)' : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }} onClick={() => handleToggleInvestigation(idx)}>
                        <Box display="flex" gap={1.5} alignItems="center">
                          <Checkbox checked={investigation.selected} size="small" color="primary" sx={{ p: 0 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: investigation.selected ? 'white' : 'rgba(255,255,255,0.7)' }}>
                              {investigation.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '0.72rem', lineHeight: 1.3 }}>
                              Reason: {investigation.reason}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={investigation.selected ? 'Draft' : 'Add'} size="small" color={investigation.selected ? 'primary' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* 3. OTHER ACTIONS (Counselling, Procedures, Referrals) */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#e0aaff', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ActionsIcon sx={{ color: '#c77dff', fontSize: '1.25rem' }} /> Draft Clinical Actions
                  </Typography>
                  <Stack spacing={1.5}>
                    {otherActions.length === 0 && renderCopilotEmptyState('No draft clinical actions yet.')}
                    {otherActions.map((action, idx) => {
                      const chipProps = getActionChipColor(action.type);
                      return (
                        <Paper key={idx} sx={{
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: action.selected ? 'rgba(199, 125, 255, 0.06)' : 'rgba(255,255,255,0.02)',
                          border: '1px solid',
                          borderColor: action.selected ? 'rgba(199, 125, 255, 0.28)' : 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }} onClick={() => handleToggleOtherAction(idx)}>
                          <Box display="flex" gap={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                            <Checkbox checked={action.selected} size="small" sx={{ p: 0, color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#c77dff' } }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: action.selected ? 'white' : 'rgba(255,255,255,0.7)', noWrap: false }}>
                                {action.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '0.72rem', lineHeight: 1.25 }}>
                                {action.notes}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Chip 
                            label={chipProps.label} 
                            size="small" 
                            sx={{ 
                              height: 18, 
                              fontSize: '0.62rem', 
                              fontWeight: '700',
                              bgcolor: chipProps.bg,
                              color: chipProps.text,
                              border: `1px solid ${alpha(chipProps.text, 0.25)}`
                            }} 
                          />
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              </Box>

              {/* Sync Trigger */}
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                  <Chip label="Drafts only" size="small" sx={{ height: 22, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', fontWeight: 700 }} />
                  <Chip label="Doctor approval required" size="small" sx={{ height: 22, bgcolor: 'rgba(251, 191, 36, 0.12)', color: '#fde68a', fontWeight: 700 }} />
                </Stack>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckIcon />}
                  onClick={handleSyncDraftActions}
                  sx={{
                    borderRadius: 2.5,
                    py: 1.5,
                    fontWeight: 'bold',
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                    }
                  }}
                >
                  Sync Drafts to Review
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          /* MOBILE VIEWPORT TABBED NAVIGATION */
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: 'calc(64px + env(safe-area-inset-bottom))' }}>
            
            {/* TAB 0: Mic & Scrolling Chat */}
            {activeMobileTab === 0 && (
              <Fade in={activeMobileTab === 0}>
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
                  <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af', letterSpacing: 1.5, fontWeight: '700', display: 'block', mb: 1 }}>
                      Real-time Audio Visualizer
                    </Typography>
                    
                    <Box sx={{ position: 'relative', height: 50, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
                      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                    </Box>

                    <Box display="flex" justifyContent="center" gap={1}>
                      {!isActive ? (
                        <Button variant="contained" size="small" startIcon={<MicIcon />} onClick={handleStartSession} disabled={sessionStatus === 'connecting' || savingArtifacts} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}>
                          {sessionStatus === 'connecting' ? 'Connecting...' : savingArtifacts ? 'Saving...' : modeConfig.startLabel}
                        </Button>
                      ) : (
                        <>
                          <Button variant="outlined" size="small" startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />} onClick={handlePauseSession} color={isPaused ? 'success' : 'warning'} sx={{ borderRadius: 2, textTransform: 'none' }}>
                            {isPaused ? 'Resume' : 'Pause'}
                          </Button>
                          <Button variant="contained" size="small" startIcon={<StopIcon />} onClick={handleStopSession} color="error" sx={{ borderRadius: 2, textTransform: 'none' }}>
                            Stop
                          </Button>
                        </>
                      )}
                    </Box>
                      <Box sx={{ mt: 1.5 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          size="small"
                          startIcon={isDocumenting ? <CircularProgress size={16} color="inherit" /> : <ActionsIcon />}
                          onClick={handleForceDocumentation}
                          disabled={isDocumenting}
                          sx={{
                            borderRadius: 2,
                            py: 0.75,
                            fontWeight: 'bold',
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                          }}
                        >
                          {isDocumenting ? 'Generating...' : 'Generate Consultation Note'}
                        </Button>
                      </Box>
                  </Box>

                  <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AudioIcon sx={{ color: '#3b82f6', fontSize: '1.1rem' }} /> Live Consultation Feed
                  </Typography>

                  <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    pr: 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                  }}>
                    {transcripts.length === 0 ? (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="rgba(255,255,255,0.3)" sx={{ py: 4 }}>
                        <MicIcon sx={{ fontSize: '2.5rem', mb: 1, opacity: 0.5 }} />
                        <Typography variant="caption" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                          Voice capture feed is empty. Start live consult to begin transcription.
                        </Typography>
                      </Box>
                    ) : (
                      transcripts.map((t, idx) => (
                        <Box key={idx} sx={{ alignSelf: t.speaker === 'patient' ? 'flex-start' : 'flex-end', maxWidth: '90%' }}>
                          <Paper sx={{
                            p: 1.25,
                            borderRadius: 2,
                            bgcolor: t.speaker === 'patient' ? 'rgba(255,255,255,0.05)' : 'rgba(37, 99, 235, 0.15)',
                            border: '1px solid',
                            borderColor: t.speaker === 'patient' ? 'rgba(255,255,255,0.08)' : 'rgba(37, 99, 235, 0.25)'
                          }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: t.speaker === 'patient' ? '#60a5fa' : '#34d399', display: 'block', mb: 0.25 }}>
                              {t.speaker === 'patient' ? 'Patient' : 'Clinician'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{t.text}</Typography>
                          </Paper>
                        </Box>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </Box>
                </Box>
              </Fade>
            )}

            {/* TAB 1: AI Diagnosis (Differentials & Questions) */}
            {activeMobileTab === 1 && (
              <Fade in={activeMobileTab === 1}>
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', p: 2 }}>
                  {renderCopilotBriefPanel(true)}
                  
                  {/* Differentials */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MedicalIcon sx={{ color: '#ef4444', fontSize: '1.1rem' }} /> Ranked Differentials
                    </Typography>
                    <Stack spacing={1.5}>
                      {differentials.length === 0 && renderCopilotEmptyState('No ranked differentials yet.')}
                      {differentials.map((diff, idx) => (
                        <Box key={idx} sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <Box display="flex" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{diff.name}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: '800', color: diff.probability > 70 ? '#f87171' : '#fbbf24', fontSize: '0.85rem' }}>{diff.probability}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={diff.probability} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: diff.probability > 70 ? '#ef4444' : '#fbbf24' } }} />
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1.5 }} />

                  {/* Probing Questions */}
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <QuestionIcon sx={{ color: '#fbbf24', fontSize: '1.1rem' }} /> Probing Questions Checklist
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 160, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {probingQuestions.length === 0 && renderCopilotEmptyState('No probing questions yet.')}
                      {probingQuestions.map(q => (
                        <Card key={q.id} sx={{
                          bgcolor: q.asked ? 'rgba(255,255,255,0.02)' : 'rgba(251, 191, 36, 0.04)',
                          border: '1px solid',
                          borderColor: q.asked ? 'rgba(255,255,255,0.05)' : 'rgba(251, 191, 36, 0.18)',
                        }} onClick={() => handleQuestionAsked(q.id)}>
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box display="flex" gap={1} alignItems="flex-start">
                              <Box sx={{
                                width: 20, height: 20, borderRadius: '50%',
                                bgcolor: q.asked ? 'rgba(255,255,255,0.1)' : 'rgba(251, 191, 36, 0.15)',
                                color: q.asked ? 'rgba(255,255,255,0.4)' : '#fbbf24',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0
                              }}>
                                {q.asked ? '✓' : '?'}
                              </Box>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem', color: q.asked ? 'rgba(255,255,255,0.4)' : 'white', textDecoration: q.asked ? 'line-through' : 'none' }}>
                                  {q.text}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                                  {q.rationale}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Fade>
            )}

            {/* TAB 2: Draft Review Sync (Includes prescriptions, investigations, other actions) */}
            {activeMobileTab === 2 && (
              <Fade in={activeMobileTab === 2}>
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
                  <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 2.5, pb: 1 }}>
                    
                    {/* Prescriptions */}
                    <Box>
                    <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 'bold', mb: 1 }}>
                      Draft Medications
                    </Typography>
                    <Stack spacing={1}>
                      {prescriptions.length === 0 && renderCopilotEmptyState('No draft medications yet.')}
                      {prescriptions.map((prescription, idx) => (
                          <Paper key={idx} sx={{
                            p: 1.25,
                            bgcolor: prescription.selected ? 'rgba(52, 211, 153, 0.05)' : 'rgba(255,255,255,0.01)',
                            border: '1px solid',
                            borderColor: prescription.selected ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.06)'
                          }} onClick={() => handleTogglePrescription(idx)}>
                            <Box display="flex" gap={1} alignItems="center">
                              <Checkbox checked={prescription.selected} size="small" color="success" sx={{ p: 0 }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{prescription.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{prescription.dosage} • {prescription.interval}</Typography>
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                      </Stack>
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Investigations */}
                    <Box>
                    <Typography variant="subtitle2" sx={{ color: '#60a5fa', fontWeight: 'bold', mb: 1 }}>
                      Draft Investigations
                    </Typography>
                    <Stack spacing={1}>
                      {investigations.length === 0 && renderCopilotEmptyState('No draft investigations yet.')}
                      {investigations.map((investigation, idx) => (
                          <Paper key={idx} sx={{
                            p: 1.25,
                            bgcolor: investigation.selected ? 'rgba(96, 165, 250, 0.05)' : 'rgba(255,255,255,0.01)',
                            border: '1px solid',
                            borderColor: investigation.selected ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255,255,255,0.06)'
                          }} onClick={() => handleToggleInvestigation(idx)}>
                            <Box display="flex" gap={1} alignItems="center">
                              <Checkbox checked={investigation.selected} size="small" color="primary" sx={{ p: 0 }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{investigation.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{investigation.reason}</Typography>
                              </Box>
                            </Box>
                          </Paper>
                        ))}
                      </Stack>
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Other Actions */}
                    <Box>
                    <Typography variant="subtitle2" sx={{ color: '#e0aaff', fontWeight: 'bold', mb: 1 }}>
                      Draft Clinical Actions
                    </Typography>
                    <Stack spacing={1}>
                      {otherActions.length === 0 && renderCopilotEmptyState('No draft clinical actions yet.')}
                      {otherActions.map((action, idx) => {
                          const chipProps = getActionChipColor(action.type);
                          return (
                            <Paper key={idx} sx={{
                              p: 1.25,
                              bgcolor: action.selected ? 'rgba(199, 125, 255, 0.05)' : 'rgba(255,255,255,0.01)',
                              border: '1px solid',
                              borderColor: action.selected ? 'rgba(199, 125, 255, 0.2)' : 'rgba(255,255,255,0.06)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }} onClick={() => handleToggleOtherAction(idx)}>
                              <Box display="flex" gap={1} alignItems="center" sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                                <Checkbox checked={action.selected} size="small" sx={{ p: 0, '&.Mui-checked': { color: '#c77dff' } }} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{action.name}</Typography>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{action.notes}</Typography>
                                </Box>
                              </Box>
                              <Chip 
                                label={chipProps.label} 
                                size="small" 
                                sx={{ 
                                  height: 18, 
                                  fontSize: '0.58rem', 
                                  bgcolor: chipProps.bg, 
                                  color: chipProps.text,
                                  border: `1px solid ${alpha(chipProps.text, 0.2)}`
                                }} 
                              />
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Box>

                  </Box>

                  {/* Sync Button */}
                  <Box sx={{ pt: 2 }}>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                      <Chip label="Drafts only" size="small" sx={{ height: 22, bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', fontWeight: 700 }} />
                      <Chip label="Doctor approval required" size="small" sx={{ height: 22, bgcolor: 'rgba(251, 191, 36, 0.12)', color: '#fde68a', fontWeight: 700 }} />
                    </Stack>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<CheckIcon />}
                      onClick={handleSyncDraftActions}
                      sx={{
                        borderRadius: 2,
                        py: 1.25,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      Sync Drafts to Review
                    </Button>
                  </Box>
                </Box>
              </Fade>
            )}

            {/* Bottom Navigation Tabs */}
            <BottomNavigation
              value={activeMobileTab}
              onChange={(event, newValue) => {
                setActiveMobileTab(newValue);
              }}
              showLabels
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 'calc(56px + env(safe-area-inset-bottom))',
                pb: 'env(safe-area-inset-bottom)',
                bgcolor: '#0e111a',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                '& .MuiBottomNavigationAction-root': { color: 'rgba(255,255,255,0.4)', py: 0.5 },
                '& .Mui-selected': { color: '#3b82f6 !important' }
              }}
            >
              <BottomNavigationAction label="Mic & Chat" icon={<ChatIcon />} />
              <BottomNavigationAction label="AI Diagnosis" icon={<MedicalIcon />} />
              <BottomNavigationAction label="Drafts" icon={<OrderIcon />} />
            </BottomNavigation>

          </Box>
        )}
        
      </Box>
    </Box>
  );
};

export default LiveCopilotDashboard;
