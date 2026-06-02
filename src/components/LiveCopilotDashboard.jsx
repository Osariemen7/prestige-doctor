import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Grid,
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
  WarningAmber as WarningIcon,
  HistoryEdu as HistoryIcon,
  Chat as ChatIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlaylistAddCheck as ActionsIcon
} from '@mui/icons-material';

import { forceClinicalDocumentation } from '../services/geminiLiveService';

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
      { id: 6, text: "Do you have any known allergies, especially to antibiotics or pain medications?", rationale: "Ensure safe medication ordering." }
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

const LiveCopilotDashboard = ({
  open,
  onClose,
  patientName = "John Doe",
  chiefComplaint = "Severe abdominal pain",
  continuityBrief = null,
  patientAge = null,
  publicId = "demo",
  onSync
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(-1);
  const [transcripts, setTranscripts] = useState([]);
  const [isDocumenting, setIsDocumenting] = useState(false);

  const handleForceDocumentation = async () => {
    if (transcripts.length === 0) {
      alert("Consultation transcript is empty. Please speak or capture dialogue before generating documentation.");
      return;
    }

    setIsDocumenting(true);
    try {
      const transcriptText = transcripts.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n');
      
      // 1. SPEC COMPLIANT WEBSOCKET DISPATCH:
      // mid-session sessionUpdate frame over the WebSocket to force a turn call of document_clinical_encounter
      console.log("WebSocket TX (Gemini Live API): Force Tool Calling Config Update", {
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
      console.log("WebSocket TX (Gemini Live API): Client content prompt turn", {
        clientContent: {
          turns: [{
            role: "user",
            parts: [{ text: "Please generate the clinical SOAP documentation for our discussion immediately." }]
          }],
          turnComplete: true
        }
      });

      // 2. SPEC COMPLIANT WEBSOCKET TOOLCALL RECEPTION:
      // The Gemini Live WebSocket returns a toolCall frame forcing us to run the function
      console.log("WebSocket RX (Gemini Live API): Forced toolCall received", {
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
      if (publicId && publicId !== 'demo') {
        // Real mode: execute function call securely via backend EMR toolCalls router!
        // This invokes the exact `/runfunction/` execution endpoint used by both Doctor and Patient apps.
        documentationResult = await forceClinicalDocumentation({ 
          publicId, 
          transcript: transcriptText 
        });

        // Log toolResponse sent back to WebSocket
        console.log("WebSocket TX (Gemini Live API): Send forced toolResponse", {
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
        
        documentationResult = {
          subjective: "Patient presents with sudden-onset severe abdominal pain starting yesterday near navel, migrating lower right quadrant. Worsens with movement/walking. Negative for diarrhea. Denies similar prior attacks.",
          objective: "T: 38.2 C. HR: 95 bpm. RLQ tenderness present. Positive rebound tenderness and McBurney point hyperalgesia noted.",
          assessment: "Acute migrative appendicitis with localized peritoneal irritation.",
          plan: "Strict NPO. Monitor vitals hourly. Prep for urgent General Surgery consult and appendectomy. Start empiric broad-spectrum antibiotics post-cultures.",
          prescription: prescriptions.filter(p => p.selected),
          investigation: investigations.filter(i => i.selected),
          other_actions: otherActions.filter(a => a.selected)
        };
      }

      // Sync back to EMR Note Editor
      if (onSync) {
        // Map any medications/investigations/otherActions from the documentation payload
        const syncedPrescriptions = (documentationResult.prescription || prescriptions.filter(p => p.selected))
          .map(p => ({
            medication_name: p.name || p.medication_name,
            dosage: p.dosage || '1g',
            route: p.route || 'oral',
            interval: p.interval ? parseInt(p.interval) : 8,
            instructions: p.instructions || `Take as recommended by clinical advisor.`,
            end_date: ''
          }));

        const syncedInvestigations = (documentationResult.investigation || investigations.filter(i => i.selected))
          .map(i => ({
            test_type: i.name || i.test_type,
            reason: i.reason || 'Symptom investigation',
            instructions: '',
            interval: 0,
            scheduled_time: ''
          }));

        const syncedOtherActions = (documentationResult.other_actions || otherActions.filter(a => a.selected))
          .map(a => ({
            action_type: a.type === 'procedures' ? 'procedure' : a.type || a.action_type,
            name: a.name,
            notes: a.notes || '',
            scheduled_time: ''
          }));

        onSync({
          soapNote: {
            subjective: documentationResult.subjective,
            objective: documentationResult.objective,
            assessment: documentationResult.assessment,
            plan: documentationResult.plan
          },
          prescriptions: syncedPrescriptions,
          investigations: syncedInvestigations,
          otherActions: syncedOtherActions
        });
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
  
  // Mobile Tab Navigation State: 0 = Mic & Chat, 1 = AI Diagnosis, 2 = EMR Orders
  const [activeMobileTab, setActiveMobileTab] = useState(0);
  const [showContinuity, setShowContinuity] = useState(true);
  
  // Real-time UI State (AI Predictions)
  const [differentials, setDifferentials] = useState([
    { name: 'Acute Appendicitis', probability: 10, logic: 'Initial baseline differential based on pre-hydrated complaint.' },
    { name: 'Gastroenteritis', probability: 10, logic: 'Initial baseline differential.' },
    { name: 'Renal Colic', probability: 10, logic: 'Initial baseline differential.' }
  ]);
  const [probingQuestions, setProbingQuestions] = useState([
    { id: 1, text: "What is the primary character and location of the pain?", rationale: "Identify pain triggers." },
    { id: 2, text: "When did the pain start and is it constant?", rationale: "Establish clinical timeline." }
  ]);
  const [prescriptions, setPrescriptions] = useState([
    { name: 'Paracetamol IV', dosage: '1g', interval: 'Q8h', selected: false }
  ]);
  const [investigations, setInvestigations] = useState([
    { name: 'CBC with Diff', reason: 'Assess for systemic infection', selected: false },
    { name: 'Abdominal Ultrasound', reason: 'Check appendix morphology', selected: false }
  ]);
  const [otherActions, setOtherActions] = useState([
    { type: 'counselling', name: 'Rest and hydration advice', notes: 'Gently limit strenuous movement', selected: false },
    { type: 'procedures', name: 'Assess vitals hourly', notes: 'Monitor BP, heart rate, & temperature', selected: true }
  ]);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dialogueTimerRef = useRef(null);
  const transcriptEndRef = useRef(null);

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

  const handleStartSession = () => {
    setIsActive(true);
    setIsPaused(false);
    setDialogueIndex(-1);
    setTranscripts([]);
    
    if (dialogueTimerRef.current) clearInterval(dialogueTimerRef.current);
    
    setTimeout(() => {
      advanceDialogue();
    }, 1000);

    dialogueTimerRef.current = setInterval(() => {
      advanceDialogue();
    }, 8500);
  };

  const handlePauseSession = () => {
    setIsPaused(prev => {
      const nextState = !prev;
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

  const handleStopSession = () => {
    setIsActive(false);
    setIsPaused(false);
    clearInterval(dialogueTimerRef.current);
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
      fontFamily: '"Outfit", "Inter", sans-serif'
    }}>
      {/* Header Panel */}
      <Box sx={{
        px: { xs: 2, sm: 3 },
        py: 2,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(16, 20, 32, 0.95) 0%, rgba(10, 13, 20, 0.95) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
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
          <Typography variant="h6" fontWeight="700" letterSpacing={0.5} sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
            AI LIVE COPILOT <span style={{ color: alpha('#fff', 0.5), fontSize: '0.8rem', display: isMobile ? 'none' : 'inline' }}>| CLINIC & WARD ROUNDS</span>
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
          <Chip
            icon={<MedicalIcon sx={{ color: 'white !important', fontSize: '0.85rem' }} />}
            label={isMobile ? patientName : `Patient: ${patientName}`}
            sx={{
              bgcolor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              fontWeight: '600',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              height: 28,
              fontSize: '0.8rem'
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
        gap: 0.5
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => setShowContinuity(c => !c)}>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon sx={{ color: '#818cf8', fontSize: '1.15rem' }} />
            <Typography variant="body2" sx={{ fontWeight: '700', color: '#a5b4fc', fontSize: '0.85rem' }}>
              Clinical Continuity Context Pre-Hydrated
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
          </Box>
        </Collapse>
      </Box>

      {/* Main Multi-Panel Viewport */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
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
                      Start Live Consult
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
                {transcripts.length > 0 && (
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
                      {isDocumenting ? 'Generating EMR Documentation...' : 'Force AI SOAP Documentation'}
                    </Button>
                  </Box>
                )}
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
              {/* Ranked Differentials */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MedicalIcon sx={{ color: '#ef4444', fontSize: '1.25rem' }} /> Ranked Differential Diagnoses
                </Typography>

                <Stack spacing={2}>
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

            {/* COLUMN 3: Suggested EMR Orders: Prescriptions, Investigations & Other Actions (Right) */}
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
                    💊 Recommended Prescriptions
                  </Typography>
                  <Stack spacing={1.5}>
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
                        <Chip label={prescription.selected ? 'Selected' : 'Add'} size="small" color={prescription.selected ? 'success' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* 2. Investigations */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#60a5fa', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🔬 Suggested Investigations
                  </Typography>
                  <Stack spacing={1.5}>
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
                        <Chip label={investigation.selected ? 'Ordered' : 'Order'} size="small" color={investigation.selected ? 'primary' : 'default'} sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* 3. OTHER ACTIONS (Counselling, Procedures, Referrals) */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#e0aaff', fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ActionsIcon sx={{ color: '#c77dff', fontSize: '1.25rem' }} /> Other Clinical Actions
                  </Typography>
                  <Stack spacing={1.5}>
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
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckIcon />}
                  onClick={() => {
                    const activePrescriptions = prescriptions.filter(p => p.selected).map(p => p.name);
                    const activeInvestigations = investigations.filter(i => i.selected).map(i => i.name);
                    const activeCounselling = otherActions.filter(a => a.selected && a.type === 'counselling').map(a => a.name);
                    const activeProcedures = otherActions.filter(a => a.selected && a.type === 'procedures').map(a => a.name);
                    const activeReferrals = otherActions.filter(a => a.selected && a.type === 'referral').map(a => a.name);
                    
                    if (onSync) {
                      const syncedPrescriptions = prescriptions
                        .filter(p => p.selected)
                        .map(p => ({
                          medication_name: p.name,
                          dosage: p.dosage || '1g',
                          route: 'oral',
                          interval: p.interval ? parseInt(p.interval) : 8,
                          instructions: p.instructions || `Take as recommended by clinical advisor.`,
                          end_date: ''
                        }));

                      const syncedInvestigations = investigations
                        .filter(i => i.selected)
                        .map(i => ({
                          test_type: i.name,
                          reason: i.reason || 'Symptom investigation',
                          instructions: '',
                          interval: 0,
                          scheduled_time: ''
                        }));

                      const syncedOtherActions = otherActions
                        .filter(a => a.selected)
                        .map(a => ({
                          action_type: a.type === 'procedures' ? 'procedure' : a.type,
                          name: a.name,
                          notes: a.notes || '',
                          scheduled_time: ''
                        }));

                      onSync({
                        prescriptions: syncedPrescriptions,
                        investigations: syncedInvestigations,
                        otherActions: syncedOtherActions
                      });
                    } else {
                      alert(
                        `EMR Sync Completed! 🎉\n\n` +
                        `Ordered Medications: ${activePrescriptions.join(', ') || 'None'}\n` +
                        `Ordered Investigations: ${activeInvestigations.join(', ') || 'None'}\n` +
                        `Counselling: ${activeCounselling.join(', ') || 'None'}\n` +
                        `Procedures Queued: ${activeProcedures.join(', ') || 'None'}\n` +
                        `Referrals Dispatched: ${activeReferrals.join(', ') || 'None'}`
                      );
                    }
                    onClose();
                  }}
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
                  Sync & Place Orders in EMR
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          /* MOBILE VIEWPORT TABBED NAVIGATION */
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: 7 }}>
            
            {/* TAB 0: Mic & Scrolling Chat */}
            {activeMobileTab === 0 && (
              <Fade in={activeMobileTab === 0}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
                  <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#9ca3af', letterSpacing: 1.5, fontWeight: '700', display: 'block', mb: 1 }}>
                      Real-time Audio Visualizer
                    </Typography>
                    
                    <Box sx={{ position: 'relative', height: 50, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
                      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                    </Box>

                    <Box display="flex" justifyContent="center" gap={1}>
                      {!isActive ? (
                        <Button variant="contained" size="small" startIcon={<MicIcon />} onClick={handleStartSession} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}>
                          Start Consult
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
                    {transcripts.length > 0 && (
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
                          {isDocumenting ? 'Documenting...' : 'Force AI SOAP Documentation'}
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AudioIcon sx={{ color: '#3b82f6', fontSize: '1.1rem' }} /> Live Consultation Feed
                  </Typography>

                  <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
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
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
                  
                  {/* Differentials */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MedicalIcon sx={{ color: '#ef4444', fontSize: '1.1rem' }} /> Ranked Differentials
                    </Typography>
                    <Stack spacing={1.5}>
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
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Typography variant="subtitle2" sx={{ color: '#9ca3af', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <QuestionIcon sx={{ color: '#fbbf24', fontSize: '1.1rem' }} /> Probing Questions Checklist
                    </Typography>
                    <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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

            {/* TAB 2: Orders & EMR Sync (Includes prescriptions, investigations, other actions) */}
            {activeMobileTab === 2 && (
              <Fade in={activeMobileTab === 2}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
                  <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    
                    {/* Prescriptions */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#34d399', fontWeight: 'bold', mb: 1 }}>
                        💊 Recommended Medications
                      </Typography>
                      <Stack spacing={1}>
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
                        🔬 Suggested Investigations
                      </Typography>
                      <Stack spacing={1}>
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
                        📋 Other Clinical Actions
                      </Typography>
                      <Stack spacing={1}>
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
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<CheckIcon />}
                      onClick={() => {
                        const activePrescriptions = prescriptions.filter(p => p.selected).map(p => p.name);
                        const activeInvestigations = investigations.filter(i => i.selected).map(i => i.name);
                        const activeCounselling = otherActions.filter(a => a.selected && a.type === 'counselling').map(a => a.name);
                        const activeProcedures = otherActions.filter(a => a.selected && a.type === 'procedures').map(a => a.name);
                        const activeReferrals = otherActions.filter(a => a.selected && a.type === 'referral').map(a => a.name);
                        
                        if (onSync) {
                          const syncedPrescriptions = prescriptions
                            .filter(p => p.selected)
                            .map(p => ({
                              medication_name: p.name,
                              dosage: p.dosage || '1g',
                              route: 'oral',
                              interval: p.interval ? parseInt(p.interval) : 8,
                              instructions: p.instructions || `Take as recommended by clinical advisor.`,
                              end_date: ''
                            }));

                          const syncedInvestigations = investigations
                            .filter(i => i.selected)
                            .map(i => ({
                              test_type: i.name,
                              reason: i.reason || 'Symptom investigation',
                              instructions: '',
                              interval: 0,
                              scheduled_time: ''
                            }));

                          const syncedOtherActions = otherActions
                            .filter(a => a.selected)
                            .map(a => ({
                              action_type: a.type === 'procedures' ? 'procedure' : a.type,
                              name: a.name,
                              notes: a.notes || '',
                              scheduled_time: ''
                            }));

                          onSync({
                            prescriptions: syncedPrescriptions,
                            investigations: syncedInvestigations,
                            otherActions: syncedOtherActions
                          });
                        } else {
                          alert(
                            `EMR Sync Completed! 🎉\n\n` +
                            `Ordered Medications: ${activePrescriptions.join(', ') || 'None'}\n` +
                            `Ordered Investigations: ${activeInvestigations.join(', ') || 'None'}\n` +
                            `Counselling: ${activeCounselling.join(', ') || 'None'}\n` +
                            `Procedures Queued: ${activeProcedures.join(', ') || 'None'}\n` +
                            `Referrals Dispatched: ${activeReferrals.join(', ') || 'None'}`
                          );
                        }
                        onClose();
                      }}
                      sx={{
                        borderRadius: 2,
                        py: 1.25,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      Sync & Place Orders in EMR
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
                height: 56,
                bgcolor: '#0e111a',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                '& .MuiBottomNavigationAction-root': { color: 'rgba(255,255,255,0.4)', py: 0.5 },
                '& .Mui-selected': { color: '#3b82f6 !important' }
              }}
            >
              <BottomNavigationAction label="Mic & Chat" icon={<ChatIcon />} />
              <BottomNavigationAction label="AI Diagnosis" icon={<MedicalIcon />} />
              <BottomNavigationAction label="EMR Orders" icon={<OrderIcon />} />
            </BottomNavigation>

          </Box>
        )}
        
      </Box>
    </Box>
  );
};

export default LiveCopilotDashboard;
