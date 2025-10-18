# Client-Side Documentation Service API Guide

## Overview

This guide provides comprehensive documentation for client-side integration with the Documentation Service API. The service enables end-to-end in-person encounter documentation through audio recording, transcription, and structured medical note generation.

## Base URL
```
https://service.prestigedelta.com/
```

## Authentication Endpoints

### User Registration

#### Endpoint
```
POST /auth/registration/
```

#### Description
Register a new user account. Supports both patient and provider registration.

#### Headers
```
Content-Type: application/json
X-Organization-Domain: <organization-domain>  # REQUIRED: Use "provider.prestigehealth.app" when registering from provider.prestigehealth.app (sets is_provider=true and creates doctor listing)
```

#### Request Body
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Optional",
  "phone_number": "+1234567890",
  "password": "securepassword",
  "confirm_password": "securepassword",
  "is_provider": true,
  "invite_code": "optional-referral-code"
}
```

#### Response
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "is_provider": true,
    "profile_set": false,
    "organization_set": true,
    "referral_code": "ABC123"
  }
}
```

#### Notes
- **IMPORTANT**: Always include the `X-Organization-Domain` header with the correct domain name
- For doctors registering from `provider.prestigehealth.app`, include `X-Organization-Domain: provider.prestigehealth.app` (this automatically sets `is_provider: true` and creates a doctor listing with NGN 5,000 consultation fee)
- Provider profiles are automatically created for users with `is_provider: true`
- Doctor listings are automatically created for providers registering from doctor subdomains

---

### User Login

#### Endpoint
```
POST /auth/login/
```

#### Description
Authenticate an existing user and return JWT tokens.

#### Headers
```
Content-Type: application/json
X-Organization-Domain: <organization-domain>  # REQUIRED: Use "provider.prestigehealth.app" when logging in from provider.prestigehealth.app (sets up doctor profile and listing if needed)
```

#### Request Body
```json
{
  "phone_number": "+1234567890",
  "password": "userpassword"
}
```

#### Response
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "is_provider": true,
    "profile_set": true,
    "organization_set": true,
    "referral_code": "ABC123"
  }
}
```

#### Notes
- **IMPORTANT**: Always include the `X-Organization-Domain` header with the correct domain name
- For doctors logging in from `provider.prestigehealth.app`, include `X-Organization-Domain: provider.prestigehealth.app` (this automatically sets up doctor profile and listing if not already created)
- Doctor profiles and listings are automatically set up on first login from doctor subdomains

---

### Google OAuth Authentication

#### Start Google Login

##### Endpoint
```
GET /auth/google/start?redirect=<redirect-url>
```

##### Description
Initiates Google OAuth login flow. The redirect parameter specifies where to send the user after successful authentication.

##### Query Parameters
- `redirect`: URL to redirect to after login (defaults to https://prestigehealth.app)

##### Example
```
GET /auth/google/start?redirect=https://provider.prestigehealth.app/dashboard
```

#### Google OAuth Callback

##### Endpoint
```
GET /accounts/google/login/callback/
```

##### Description
Handles the callback from Google OAuth. Automatically creates provider profiles and doctor listings for users authenticating from provider.prestigehealth.app.

##### Headers (sent by client in initial request)
```
X-Organization-Domain: provider.prestigehealth.app  # REQUIRED for doctor subdomain access
```

##### Notes
- **IMPORTANT**: For doctor subdomain access, include `X-Organization-Domain: provider.prestigehealth.app` in the initial request to `/auth/google/start`
- Google OAuth automatically detects doctor subdomains and creates provider profiles with doctor listings (NGN 5,000 consultation fee)
- Users are redirected back to the specified redirect URL with JWT tokens set as HttpOnly cookies
- Organization assignment follows the same logic as regular authentication endpoints

---

## Authentication
All requests require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Create an Encounter Object

### Endpoint
```
POST /in-person-encounters/
```

### Description
Creates a new in-person encounter record. This serves as the container for the entire documentation workflow.

### Request Body
```json
{
  "patient_id": "optional-patient-profile-id",
  "medical_review_id": "optional-existing-medical-review-id",
  "patient_first_name": "string",
  "patient_last_name": "string",
  "patient_phone": "string",
  "patient_email": "string",
  "encounter_date": "2024-01-15T10:00:00Z",
  "metadata": {
    "chief_complaint": "Patient's chief complaint",
    "additional_context": "Any additional context"
  }
}
```

### Field Descriptions
- `patient_id` (optional): Link to existing PatientProfile
- `medical_review_id` (optional): Link to existing MedicalReview. If not provided, a new MedicalReview will be created automatically
- `patient_first_name`, `patient_last_name`, `patient_phone`, `patient_email`: Patient information (used if creating new patient record)
- `encounter_date`: When the encounter occurred (defaults to current time)
- `metadata`: Additional context data

### Response
```json
{
  "id": 123,
  "public_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_id": 456,
  "patient_id": null,
  "patient_first_name": "John",
  "patient_last_name": "Doe",
  "patient_phone": "+1234567890",
  "patient_email": "john.doe@example.com",
  "encounter_date": "2024-01-15T10:00:00Z",
  "status": "draft",
  "audio_recording_url": null,
  "transcript": null,
  "transcript_segments": [],
  "note_payload": null,
  "summary": null,
  "metadata": {
    "chief_complaint": "Patient's chief complaint"
  },
  "medical_review_id": 789,
  "medical_review_public_id": "660e8400-e29b-41d4-a716-446655440001",
  "created": "2024-01-15T09:45:00Z",
  "updated": "2024-01-15T09:45:00Z"
}
```

### Important Notes
- The `public_id` is used for all subsequent operations on this encounter
- If no `medical_review_id` is provided, a new MedicalReview is created automatically
- The encounter starts with status "draft"

---

## 2. Upload Audio Recording

### Endpoint
```
POST /in-person-encounters/{public_id}/upload-audio/
```

### Description
Uploads an audio recording file for the encounter. The audio is processed and stored in both S3 and Google Files API for transcription.

### Request Body
Use `multipart/form-data` encoding:

```
audio_file: <audio-file>
original_format: "mp3" (optional)
```

### Supported Audio Formats
- MP3
- WAV
- M4A
- WebM
- Other common audio formats

### Response
```json
{
  "audio_url": "https://prestigehealth.s3.amazonaws.com/in_person_encounters/74c2818e-80be-4d28-ab5d-f48d573ac694.mp3",
  "s3_upload_pending": false,
  "google_file_id": "files/ug4zoi2xtc15",
  "google_upload_pending": false,
  "encounter": {
    "id": 32,
    "public_id": "74c2818e-80be-4d28-ab5d-f48d573ac694",
    "provider_id": 1,
    "patient_first_name": "John",
    "patient_last_name": "",
    "patient_phone": "",
    "patient_email": "",
    "encounter_date": "2025-10-15T17:00:00Z",
    "status": "recorded",
    "audio_recording_url": "https://prestigehealth.s3.amazonaws.com/in_person_encounters/74c2818e-80be-4d28-ab5d-f48d573ac694.mp3",
    "transcript": null,
    "transcript_segments": [],
    "note_payload": null,
    "summary": null,
    "metadata": {},
    "medical_review_id": 13,
    "medical_review_public_id": "c3a1b283-6cd8-4e99-b434-5b87afec2eba",
    "created": "2025-10-16T13:16:21.112559Z",
    "updated": "2025-10-16T13:19:19.208620Z"
  }
}
```

### Important Notes
- **Timing**: Audio upload typically takes 60-90 seconds to complete both S3 and Google Files API uploads
- **Status Monitoring**: Wait for both `s3_upload_pending: false` and `google_upload_pending: false` before proceeding to audio processing
- **Google File ID**: The `google_file_id` (format: "files/{id}") is required for the subsequent audio processing step
- **Encounter Status**: After successful upload, the encounter status changes to "recorded"
- **UX Considerations**: The complete workflow (upload + processing) can take up to 3 minutes total. Implement engaging progress indicators, estimated time displays, and clear status messaging to keep users informed throughout the process

---

## 3. Process Audio (Transcription & Documentation)

### Endpoint
```
POST /ai-processing/process-audio/
```

### Description
Triggers audio transcription and generates structured medical documentation using AI. This endpoint processes uploaded audio and creates SOAP notes.

### Request Body
```json
{
  "encounter_public_id": "74c2818e-80be-4d28-ab5d-f48d573ac694",
  "existing_note": {
    "subjective": {
      "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
      "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired...",
      "review_of_systems": "Constitutional: Weakness, fatigue..."
    },
    "objective": {
      "examination_findings": "General appearance: Alert and oriented...",
      "investigations": "Random Blood Sugar (RBS): 182 mg/dL..."
    },
    "assessment": {
      "primary_diagnosis": "Hypertension (Stage 2)...",
      "differential_diagnosis": "Anemia...",
      "diagnosis_reasoning": "Clinical presentation...",
      "status": "stable"
    },
    "plan": {
      "management": "1. Initiate treatment for Hypertension...",
      "lifestyle_advice": "1. Diet: Reduce intake of simple carbohydrates...",
      "follow_up": "1. Return tomorrow morning...",
      "patient_education": "Educated patient on the findings...",
      "treatment_goal": "Confirmation of Type 2 DM...",
      "plan_reasoning": "Rapid diagnostic confirmation..."
    },
    "next_review": "2025-10-23 17:00",
    "prescription": [
      {
        "medication_name": "Amlodipine",
        "dosage": "5 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-11-15",
        "instructions": "Take once daily for blood pressure control."
      }
    ],
    "investigation": [
      {
        "test_type": "Fasting Blood Sugar (FBS)",
        "reason": "Confirming suspected diabetes...",
        "instructions": "Requires 8-10 hour fast...",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      }
    ]
  },
  "existing_transcript": [
    {
      "speaker": "doctor",
      "text": "Hello, how are you feeling today?",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "speaker": "patient",
      "text": "I've been having some chest pain.",
      "timestamp": "2024-01-01T10:00:05Z"
    }
  ],
  "query": "Create a concise note"
}
```

### Field Descriptions
- `encounter_public_id`: Required. The public ID of the encounter to process
- `existing_note`: Optional. Existing SOAP note structure to refine or update
- `existing_transcript`: Optional. Existing transcript array to process or enhance
- `query`: Required. Instructions for the AI processing (default: "Create a concise note")

### Response
```json
{
  "assistant_response": "The comprehensive history taking and prompt initiation of investigations are appropriate for this complex presentation.\n\nKey areas for continued focus and documentation improvement:\n*   \n**Documentation of Physical Examination:** Ensure explicit documentation of key cardiovascular findings (e.g., JVP, heart sounds, peripheral edema assessment) in the objective section, especially considering reported symptoms like palpitations and 'evening shoe tightness'.\n*   \n**Quantifying Weight Management Goals:** While the weight target (5-10 kg reduction) is set, ensure the patient's height is measured and recorded in the objective data to accurately calculate baseline BMI, anchoring the weight loss goals to standard metrics.\n*   \n**Stress and Work-Life Balance:** You correctly identified long work hours and stress as contributors. Ensure structured psychological support or stress management techniques are offered/discussed at follow-up, rather than solely relying on general advice regarding breaks.\n*   \n**Investigation Timing:** The scheduled time for fasting tests was corrected to tomorrow morning (2025-10-17 09:00), reflecting the consultation time (afternoon today).",
  "patient_summary": "Here is a summary of our discussion and your next steps:\n\n**Key Findings Today:**\n*   Your blood pressure (BP) is high (152/96 mmHg), indicating **Stage 2 Hypertension**.\n*   Your random blood sugar reading (182 mg/dL) is elevated, suggesting **Pre-diabetes or early Type 2 Diabetes**.\n*   Your reported heartburn symptoms are consistent with **Gastroesophageal Reflux Disease (GERD)**.\n\n**Actionable Next Steps (Immediate):**\n*   \n**Start New Medications:** Begin taking Amlodipine 5mg (for BP) and Omeprazole 20mg (for heartburn) as prescribed.\n*   \n**Fasting Blood Tests:** You must come in tomorrow morning **before 9:00 AM** for key diagnostic blood tests (Fasting Blood Sugar, HbA1c, Cholesterol, Kidney Function). Do not consume any food, tea, or chewing gum—only water—after 9:00 PM tonight.\n*   \n**Home BP Monitoring:** Please purchase a digital blood pressure machine and record your BP every morning before breakfast. Bring the records when you return.\n\n**Lifestyle Changes:**\n*   \n**Diet:** Avoid heavy meals late at night (especially after 8 PM). Significantly reduce high-glycemic foods like soft drinks, garri, rice, and white bread. Increase vegetables and unripe plantain.\n*   \n**Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily.\n\n**Follow-up:** We will review your lab results and BP records next week (October 23, 2025) and formulate a precise treatment plan, including a referral to the eye clinic for your reported blurry vision.",
  "doctor_note": {
    "subjective": {
      "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
      "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired (1:58). He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest (2:11). He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate (56:50, 48:80). Additionally, he reports intermittent blurry vision, especially when driving in the evening (5:55). Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work (2:54). He drinks beer on weekends and occasionally consumes energy drinks when working late (1:31). He experiences heartburn when skipping meals (3:41).",
      "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals (3:41), polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema) (39:00). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN) (1:09:50)."
    },
    "objective": {
      "examination_findings": "General appearance: Alert and oriented, slightly overweight. Cardiovascular examination findings not explicitly detailed in the audio. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
      "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated) (1:57:50).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension) (1:57:50).\nWeight: **96 kg** (Patient reports this is high side for height; height not provided for BMI calculation) (3:11)."
    },
    "assessment": {
      "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
      "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
      "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating (2:54, 3:41).",
      "status": "stable"
    },
    "plan": {
      "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
      "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM (2:36, 2:54).\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily (2:45, 3:31).\n3. **Alcohol:** Limit intake to 1-2 bottles per week (3:00).\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours; stress management is essential as stress can raise BP (4:43, 4:50).\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control (3:22).",
      "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests (6:13).\n2. Obtain a home digital BP monitor and record daily morning readings (5:27, 5:37).\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision (6:05).",
      "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes (4:21). Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals.",
      "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
      "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
    },
    "next_review": "2025-10-23 17:00",
    "prescription": [
      {
        "medication_name": "Amlodipine",
        "dosage": "5 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-11-15",
        "instructions": "Take once daily for blood pressure control (3:56)."
      },
      {
        "medication_name": "Omeprazole",
        "dosage": "20 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-10-22",
        "instructions": "Take one capsule before breakfast for heartburn (3:56)."
      }
    ],
    "investigation": [
      {
        "test_type": "Fasting Blood Sugar (FBS)",
        "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
        "instructions": "Requires 8-10 hour fast (No food, no drinks other than water) (6:13).",
        "scheduled_time": "2025-10-17 09:00",
        "interval": 0
      },
      {
        "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
        "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
        "instructions": "To be drawn simultaneously with FBS (4:06).",
        "scheduled_time": "2025-10-17 09:00",
        "interval": 0
      },
      {
        "test_type": "Retina Examination (Eye Clinic Referral)",
        "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia (6:05).",
        "instructions": "To be scheduled once blood test results are available.",
        "scheduled_time": "2025-10-23 17:30",
        "interval": 0
      }
    ]
  },
  "references": [
    "Patient reports two weeks of generalized weakness and getting easily tired (1:58).",
    "He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest (2:11).",
    "I've been drinking a lot of water. I even keep a bottle by my bed (56:50).",
    "I wake up to urinate, maybe three or four times (48:80).",
    "Now that you mention it, sometimes my eyes get blurry when I'm driving in the evening (5:55).",
    "My mom has diabetes and my dad had hypertension before he passed (1:09:50).",
    "Your BP is 152 over 96, and your random blood sugar is 182 (1:57:50).",
    "Last I checked, I was about 96 kilos (3:11).",
    "I get heartburn sometimes when I skip meals (3:41).",
    "For now, cut down on soft drinks, garri, rice, and white bread. Try to eat more vegetables and unripe plantain. Also, start walking. Even 20 to 30 minutes in the evening is fine (2:36)."
  ],
  "public_id": "c3a1b283-6cd8-4e99-b434-5b87afec2eba",
  "encounter_public_id": "74c2818e-80be-4d28-ab5d-f48d573ac694",
  "transcript_history": [
    {
      "encounter_public_id": "74c2818e-80be-4d28-ab5d-f48d573ac694",
      "encounter_date": "2025-10-15T17:00:00+00:00",
      "transcript": [
        {
          "timestamp": "00:00.410",
          "speaker": "doctor",
          "text": "Good afternoon. Please come in."
        },
        {
          "timestamp": "00:03.470",
          "speaker": "doctor",
          "text": "How are you doing today?"
        },
        {
          "timestamp": "00:05.150",
          "speaker": "patient",
          "text": "Good afternoon, doctor."
        },
        {
          "timestamp": "00:07.180",
          "speaker": "patient",
          "text": "I'm fine, but I've not been feeling too well lately."
        },
        {
          "timestamp": "00:11.090",
          "speaker": "patient",
          "text": "Sorry about that."
        },
        {
          "timestamp": "00:13.030",
          "speaker": "doctor",
          "text": "What's been happening?"
        },
        {
          "timestamp": "00:14.910",
          "speaker": "patient",
          "text": "For like two weeks now, I've just been weak."
        },
        {
          "timestamp": "00:18.280",
          "speaker": "patient",
          "text": "I get tired easily and sometimes my heart beats fast when I climb the stairs."
        },
        {
          "timestamp": "00:23.210",
          "speaker": "doctor",
          "text": "All right."
        },
        {
          "timestamp": "00:24.710",
          "speaker": "doctor",
          "text": "Any fever, chest pain, or shortness of breath?"
        },
        {
          "timestamp": "00:28.510",
          "speaker": "patient",
          "text": "No fever, but I feel some light heaviness in my chest sometimes."
        },
        {
          "timestamp": "00:33.240",
          "speaker": "patient",
          "text": "It goes away when I rest."
        },
        {
          "timestamp": "00:35.660",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "00:36.480",
          "speaker": "doctor",
          "text": "Do you notice any swelling in your legs or your feet?"
        },
        {
          "timestamp": "00:39.820",
          "speaker": "patient",
          "text": "No swelling, but my shoes sometimes feel tight in the evening."
        },
        {
          "timestamp": "00:44.350",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "00:45.390",
          "speaker": "doctor",
          "text": "How about your sleep? Do you sleep well through the night?"
        },
        {
          "timestamp": "00:49.370",
          "speaker": "patient",
          "text": "Not really."
        },
        {
          "timestamp": "00:50.250",
          "speaker": "patient",
          "text": "I wake up to urinate, maybe three or four times."
        },
        {
          "timestamp": "00:54.380",
          "speaker": "doctor",
          "text": "Do you feel very thirsty too?"
        },
        {
          "timestamp": "00:56.420",
          "speaker": "patient",
          "text": "Yes, actually."
        },
        {
          "timestamp": "00:58.580",
          "speaker": "patient",
          "text": "I've been drinking a lot of water."
        },
        {
          "timestamp": "01:01.330",
          "speaker": "patient",
          "text": "I even keep a bottle by my bed."
        },
        {
          "timestamp": "01:04.330",
          "speaker": "doctor",
          "text": "All right."
        },
        {
          "timestamp": "01:05.520",
          "speaker": "doctor",
          "text": "Do you have any history of diabetes or high blood pressure in your family?"
        },
        {
          "timestamp": "01:09.950",
          "speaker": "patient",
          "text": "My mom has diabetes, and my dad had hypertension before he passed."
        },
        {
          "timestamp": "01:14.680",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "01:16.330",
          "speaker": "doctor",
          "text": "Have you ever checked your blood pressure or blood sugar before?"
        },
        {
          "timestamp": "01:19.960",
          "speaker": "patient",
          "text": "The last time was maybe last year during a work screening."
        },
        {
          "timestamp": "01:23.390",
          "speaker": "patient",
          "text": "They said it was okay then."
        },
        {
          "timestamp": "01:25.650",
          "speaker": "doctor",
          "text": "All right."
        },
        {
          "timestamp": "01:27.470",
          "speaker": "doctor",
          "text": "Do you take alcohol, smoke, or take energy drinks?"
        },
        {
          "timestamp": "01:31.620",
          "speaker": "patient",
          "text": "I don't smoke."
        },
        {
          "timestamp": "01:33.230",
          "speaker": "patient",
          "text": "I drink beer sometimes on weekends, and I take energy drinks when I'm working late."
        },
        {
          "timestamp": "01:39.130",
          "speaker": "doctor",
          "text": "What kind of work do you do?"
        },
        {
          "timestamp": "01:42.010",
          "speaker": "patient",
          "text": "I'm into logistics. I drive around a lot."
        },
        {
          "timestamp": "01:45.400",
          "speaker": "patient",
          "text": "Sometimes I work from morning till night."
        },
        {
          "timestamp": "01:48.730",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "01:49.120",
          "speaker": "doctor",
          "text": "Long hours and sitting for too long can also contribute to some of these symptoms."
        },
        {
          "timestamp": "01:53.920",
          "speaker": "doctor",
          "text": "Let's check a few things, your blood pressure and sugar."
        },
        {
          "timestamp": "01:57.820",
          "speaker": "doctor",
          "text": "He checks."
        },
        {
          "timestamp": "01:59.200",
          "speaker": "doctor",
          "text": "Your BP is 152/96, and your random blood sugar is 182."
        },
        {
          "timestamp": "02:05.500",
          "speaker": "doctor",
          "text": "That sounds high, doctor."
        },
        {
          "timestamp": "02:08.350",
          "speaker": "patient",
          "text": "Yes, both are bit elevated."
        },
        {
          "timestamp": "02:11.100",
          "speaker": "doctor",
          "text": "It doesn't confirm diabetes yet, but it's a warning sign."
        },
        {
          "timestamp": "02:15.110",
          "speaker": "doctor",
          "text": "We'll do a fasting blood sugar and an HbA1c test to be sure."
        },
        {
          "timestamp": "02:19.200",
          "speaker": "doctor",
          "text": "So it might be diabetes."
        },
        {
          "timestamp": "02:21.750",
          "speaker": "doctor",
          "text": "Possibly early stage."
        },
        {
          "timestamp": "02:23.860",
          "speaker": "doctor",
          "text": "The tiredness, frequent urination, and test all point to that."
        },
        {
          "timestamp": "02:28.710",
          "speaker": "doctor",
          "text": "But don't panic, we'll confirm and manage it."
        },
        {
          "timestamp": "02:33.320",
          "speaker": "doctor",
          "text": "What should I do in the meantime?"
        },
        {
          "timestamp": "02:36.210",
          "speaker": "doctor",
          "text": "For now, cut down on soft drinks, carry rice and white bread."
        },
        {
          "timestamp": "02:41.150",
          "speaker": "doctor",
          "text": "Try to eat more vegetables and on ripe plantain."
        },
        {
          "timestamp": "02:44.570",
          "speaker": "doctor",
          "text": "Also, start walking even 20 to 30 minutes in the evening is fine."
        },
        {
          "timestamp": "02:49.800",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "02:50.880",
          "speaker": "patient",
          "text": "I've been eating late a lot, especially after work."
        },
        {
          "timestamp": "02:54.460",
          "speaker": "doctor",
          "text": "That's common."
        },
        {
          "timestamp": "02:56.380",
          "speaker": "doctor",
          "text": "Try not to eat heavy meals after 8:00 p.m."
        },
        {
          "timestamp": "03:00.010",
          "speaker": "doctor",
          "text": "and reduce alcohol to one or two bottles a week, not more."
        },
        {
          "timestamp": "03:03.830",
          "speaker": "patient",
          "text": "All right, I'll try."
        },
        {
          "timestamp": "03:06.100",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "03:07.220",
          "speaker": "doctor",
          "text": "How's your weight?"
        },
        {
          "timestamp": "03:09.450",
          "speaker": "doctor",
          "text": "Do you know how much you weigh?"
        },
        {
          "timestamp": "03:11.450",
          "speaker": "patient",
          "text": "Last I checked, I was about 96 kilos."
        },
        {
          "timestamp": "03:15.230",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "03:16.460",
          "speaker": "doctor",
          "text": "At your height, that's a bit on the high side."
        },
        {
          "timestamp": "03:19.790",
          "speaker": "doctor",
          "text": "We'll aim to bring it down gradually."
        },
        {
          "timestamp": "03:22.180",
          "speaker": "doctor",
          "text": "Even losing 5 to 10 kilos will make a big difference in your blood pressure and sugar."
        },
        {
          "timestamp": "03:27.760",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "03:28.550",
          "speaker": "doctor",
          "text": "So I need to start exercise,"
        },
        {
          "timestamp": "03:31.480",
          "speaker": "doctor",
          "text": "exactly."
        },
        {
          "timestamp": "03:33.000",
          "speaker": "doctor",
          "text": "Simple brisk walking, skipping, or jogging if you can manage."
        },
        {
          "timestamp": "03:37.140",
          "speaker": "doctor",
          "text": "Do you have any other medical condition, maybe ulcer or back pain?"
        },
        {
          "timestamp": "03:41.340",
          "speaker": "patient",
          "text": "I get heartburn sometimes when I skip meals."
        },
        {
          "timestamp": "03:44.780",
          "speaker": "doctor",
          "text": "Okay, that might be also related."
        },
        {
          "timestamp": "03:47.580",
          "speaker": "doctor",
          "text": "I'll give you something for that too."
        },
        {
          "timestamp": "03:50.120",
          "speaker": "doctor",
          "text": "Any medications you're currently taking?"
        },
        {
          "timestamp": "03:53.450",
          "speaker": "patient",
          "text": "No, none."
        },
        {
          "timestamp": "03:55.890",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "03:56.300",
          "speaker": "doctor",
          "text": "I'll start you on a mild blood pressure tablet and an antacid."
        },
        {
          "timestamp": "04:00.370",
          "speaker": "doctor",
          "text": "The main thing is to come in fast tomorrow morning for the test."
        },
        {
          "timestamp": "04:04.140",
          "speaker": "patient",
          "text": "All right, I can do that."
        },
        {
          "timestamp": "04:06.500",
          "speaker": "doctor",
          "text": "When you come, we'll check your fasting sugar, cholesterol, and kidney function."
        },
        {
          "timestamp": "04:11.700",
          "speaker": "doctor",
          "text": "If the results show early diabetes, we'll start a small tablet and monitor it closely."
        },
        {
          "timestamp": "04:18.240",
          "speaker": "doctor",
          "text": "Is it something that can be reversed?"
        },
        {
          "timestamp": "04:21.340",
          "speaker": "doctor",
          "text": "If we catch it early and you adjust your diet and lifestyle, yes, your numbers can return to normal."
        },
        {
          "timestamp": "04:27.660",
          "speaker": "doctor",
          "text": "But it requires discipline."
        },
        {
          "timestamp": "04:29.730",
          "speaker": "doctor",
          "text": "You need to be consistent with exercise and avoid sugary things."
        },
        {
          "timestamp": "04:34.860",
          "speaker": "patient",
          "text": "I understand."
        },
        {
          "timestamp": "04:36.760",
          "speaker": "patient",
          "text": "I'll take it seriously."
        },
        {
          "timestamp": "04:38.810",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "04:40.200",
          "speaker": "doctor",
          "text": "I like that attitude."
        },
        {
          "timestamp": "04:42.440",
          "speaker": "doctor",
          "text": "Also, make sure you're getting enough rest."
        },
        {
          "timestamp": "04:45.480",
          "speaker": "doctor",
          "text": "You mentioned you drive long hours, try to take breaks."
        },
        {
          "timestamp": "04:49.560",
          "speaker": "doctor",
          "text": "Stress can make your blood pressure rise."
        },
        {
          "timestamp": "04:53.310",
          "speaker": "doctor",
          "text": "True."
        },
        {
          "timestamp": "04:54.190",
          "speaker": "doctor",
          "text": "Sometimes leg traffic alone can raise BP."
        },
        {
          "timestamp": "04:57.670",
          "speaker": "doctor",
          "text": "Laughs. You're right about that."
        },
        {
          "timestamp": "05:00.170",
          "speaker": "doctor",
          "text": "That's why it's important to balance work and your health."
        },
        {
          "timestamp": "05:03.690",
          "speaker": "doctor",
          "text": "That won't make sense if you end up in the hospital."
        },
        {
          "timestamp": "05:07.210",
          "speaker": "patient",
          "text": "That's true, doctor."
        },
        {
          "timestamp": "05:09.210",
          "speaker": "patient",
          "text": "I've been ignoring it because I thought it was just tiredness."
        },
        {
          "timestamp": "05:13.280",
          "speaker": "doctor",
          "text": "You did well to come in."
        },
        {
          "timestamp": "05:15.100",
          "speaker": "doctor",
          "text": "Many people wait until it becomes serious."
        },
        {
          "timestamp": "05:18.600",
          "speaker": "doctor",
          "text": "After the test, we'll plan your meals and exercise schedule."
        },
        {
          "timestamp": "05:23.990",
          "speaker": "doctor",
          "text": "Should I get a little blood pressure monitor to check my BP at home?"
        },
        {
          "timestamp": "05:27.330",
          "speaker": "doctor",
          "text": "That's a very good idea."
        },
        {
          "timestamp": "05:29.390",
          "speaker": "doctor",
          "text": "Get a little blood pressure monitor, you can get one around 12,000, 15,000 Nigerian nairas."
        },
        {
          "timestamp": "05:37.070",
          "speaker": "doctor",
          "text": "Check your BP every morning before breakfast and write it down."
        },
        {
          "timestamp": "05:40.600",
          "speaker": "doctor",
          "text": "Bring the record when you come next week."
        },
        {
          "timestamp": "05:43.550",
          "speaker": "patient",
          "text": "All right, I'll get one."
        },
        {
          "timestamp": "05:46.240",
          "speaker": "doctor",
          "text": "Perfect."
        },
        {
          "timestamp": "05:47.320",
          "speaker": "doctor",
          "text": "I'll print out your prescription and write down the test list."
        },
        {
          "timestamp": "05:51.320",
          "speaker": "doctor",
          "text": "Do you have any other symptoms like numbness in your feet or blurry vision?"
        },
        {
          "timestamp": "05:56.030",
          "speaker": "patient",
          "text": "Now that you mention it, sometimes my eyes get blurry when I'm driving in the evening."
        },
        {
          "timestamp": "06:01.740",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "06:02.940",
          "speaker": "doctor",
          "text": "That could also be related to blood sugar."
        },
        {
          "timestamp": "06:05.250",
          "speaker": "doctor",
          "text": "We'll refer you to the eye clinic to check your retina once your results are out."
        },
        {
          "timestamp": "06:10.300",
          "speaker": "patient",
          "text": "All right, thank you, doctor."
        },
        {
          "timestamp": "06:12.820",
          "speaker": "doctor",
          "text": "You're welcome."
        },
        {
          "timestamp": "06:14.250",
          "speaker": "doctor",
          "text": "Please come tomorrow before 9:00 a.m. for the fasting test."
        },
        {
          "timestamp": "06:18.260",
          "speaker": "doctor",
          "text": "And don't forget, no food, not even tea or chewing gum."
        },
        {
          "timestamp": "06:22.440",
          "speaker": "doctor",
          "text": "Only water is allowed."
        },
        {
          "timestamp": "06:24.600",
          "speaker": "patient",
          "text": "Okay, no water."
        },
        {
          "timestamp": "06:26.770",
          "speaker": "patient",
          "text": "I'll come early."
        },
        {
          "timestamp": "06:28.680",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "06:30.820",
          "speaker": "doctor",
          "text": "See you then."
        },
        {
          "timestamp": "06:31.990",
          "speaker": "doctor",
          "text": "Take care of yourself and try to rest today."
        },
        {
          "timestamp": "06:34.680",
          "speaker": "patient",
          "text": "Thank you, doctor."
        },
        {
          "timestamp": "06:36.680",
          "speaker": "doctor",
          "text": "God bless you."
        },
        {
          "timestamp": "06:38.520",
          "speaker": "patient",
          "text": "Amen."
        },
        {
          "timestamp": "06:39.500",
          "speaker": "doctor",
          "text": "Safe journey home."
        }
      ],
      "transcript_segments": [
        {
          "timestamp": "00:00.410",
          "speaker": "doctor",
          "text": "Good afternoon. Please come in."
        },
        {
          "timestamp": "00:03.470",
          "speaker": "doctor",
          "text": "How are you doing today?"
        },
        {
          "timestamp": "00:05.150",
          "speaker": "patient",
          "text": "Good afternoon, doctor."
        },
        {
          "timestamp": "00:07.180",
          "speaker": "patient",
          "text": "I'm fine, but I've not been feeling too well lately."
        },
        {
          "timestamp": "00:11.090",
          "speaker": "patient",
          "text": "Sorry about that."
        },
        {
          "timestamp": "00:13.030",
          "speaker": "doctor",
          "text": "What's been happening?"
        },
        {
          "timestamp": "00:14.910",
          "speaker": "patient",
          "text": "For like two weeks now, I've just been weak."
        },
        {
          "timestamp": "00:18.280",
          "speaker": "patient",
          "text": "I get tired easily and sometimes my heart beats fast when I climb the stairs."
        },
        {
          "timestamp": "00:23.210",
          "speaker": "doctor",
          "text": "All right."
        },
        {
          "timestamp": "00:24.710",
          "speaker": "doctor",
          "text": "Any fever, chest pain, or shortness of breath?"
        },
        {
          "timestamp": "00:28.510",
          "speaker": "patient",
          "text": "No fever, but I feel some light heaviness in my chest sometimes."
        },
        {
          "timestamp": "00:33.240",
          "speaker": "patient",
          "text": "It goes away when I rest."
        },
        {
          "timestamp": "00:35.660",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "00:36.480",
          "speaker": "doctor",
          "text": "Do you notice any swelling in your legs or your feet?"
        },
        {
          "timestamp": "00:39.820",
          "speaker": "patient",
          "text": "No swelling, but my shoes sometimes feel tight in the evening."
        },
        {
          "timestamp": "00:44.350",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "00:45.390",
          "speaker": "doctor",
          "text": "How about your sleep? Do you sleep well through the night?"
        },
        {
          "timestamp": "00:49.370",
          "speaker": "patient",
          "text": "Not really."
        },
        {
          "timestamp": "00:50.250",
          "speaker": "patient",
          "text": "I wake up to urinate, maybe three or four times."
        },
        {
          "timestamp": "00:54.380",
          "speaker": "doctor",
          "text": "Do you feel very thirsty too?"
        },
        {
          "timestamp": "00:56.420",
          "speaker": "patient",
          "text": "Yes, actually."
        },
        {
          "timestamp": "00:58.580",
          "speaker": "patient",
          "text": "I've been drinking a lot of water."
        },
        {
          "timestamp": "01:01.330",
          "speaker": "patient",
          "text": "I even keep a bottle by my bed."
        },
        {
          "timestamp": "01:04.330",
          "speaker": "doctor",
          "text": "All right."
        },
        {
          "timestamp": "01:05.520",
          "speaker": "doctor",
          "text": "Do you have any history of diabetes or high blood pressure in your family?"
        },
        {
          "timestamp": "01:09.950",
          "speaker": "patient",
          "text": "My mom has diabetes, and my dad had hypertension before he passed."
        },
        {
          "timestamp": "01:14.680",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "01:16.330",
          "speaker": "doctor",
          "text": "Have you ever checked your blood pressure or blood sugar before?"
        },
        {
          "timestamp": "01:19.960",
          "speaker": "patient",
          "text": "The last time was maybe last year during a work screening."
        },
        {
          "timestamp": "01:23.390",
          "speaker": "patient",
          "text": "They said it was okay then."
        },
        {
          "timestamp": "01:25.650",
          "speaker": "doctor",
          "text": "All right."
        },
        {
          "timestamp": "01:27.470",
          "speaker": "doctor",
          "text": "Do you take alcohol, smoke, or take energy drinks?"
        },
        {
          "timestamp": "01:31.620",
          "speaker": "patient",
          "text": "I don't smoke."
        },
        {
          "timestamp": "01:33.230",
          "speaker": "patient",
          "text": "I drink beer sometimes on weekends, and I take energy drinks when I'm working late."
        },
        {
          "timestamp": "01:39.130",
          "speaker": "doctor",
          "text": "What kind of work do you do?"
        },
        {
          "timestamp": "01:42.010",
          "speaker": "patient",
          "text": "I'm into logistics. I drive around a lot."
        },
        {
          "timestamp": "01:45.400",
          "speaker": "patient",
          "text": "Sometimes I work from morning till night."
        },
        {
          "timestamp": "01:48.730",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "01:49.120",
          "speaker": "doctor",
          "text": "Long hours and sitting for too long can also contribute to some of these symptoms."
        },
        {
          "timestamp": "01:53.920",
          "speaker": "doctor",
          "text": "Let's check a few things, your blood pressure and sugar."
        },
        {
          "timestamp": "01:57.820",
          "speaker": "doctor",
          "text": "He checks."
        },
        {
          "timestamp": "01:59.200",
          "speaker": "doctor",
          "text": "Your BP is 152/96, and your random blood sugar is 182."
        },
        {
          "timestamp": "02:05.500",
          "speaker": "doctor",
          "text": "That sounds high, doctor."
        },
        {
          "timestamp": "02:08.350",
          "speaker": "patient",
          "text": "Yes, both are bit elevated."
        },
        {
          "timestamp": "02:11.100",
          "speaker": "doctor",
          "text": "It doesn't confirm diabetes yet, but it's a warning sign."
        },
        {
          "timestamp": "02:15.110",
          "speaker": "doctor",
          "text": "We'll do a fasting blood sugar and an HbA1c test to be sure."
        },
        {
          "timestamp": "02:19.200",
          "speaker": "doctor",
          "text": "So it might be diabetes."
        },
        {
          "timestamp": "02:21.750",
          "speaker": "doctor",
          "text": "Possibly early stage."
        },
        {
          "timestamp": "02:23.860",
          "speaker": "doctor",
          "text": "The tiredness, frequent urination, and test all point to that."
        },
        {
          "timestamp": "02:28.710",
          "speaker": "doctor",
          "text": "But don't panic, we'll confirm and manage it."
        },
        {
          "timestamp": "02:33.320",
          "speaker": "doctor",
          "text": "What should I do in the meantime?"
        },
        {
          "timestamp": "02:36.210",
          "speaker": "doctor",
          "text": "For now, cut down on soft drinks, carry rice and white bread."
        },
        {
          "timestamp": "02:41.150",
          "speaker": "doctor",
          "text": "Try to eat more vegetables and on ripe plantain."
        },
        {
          "timestamp": "02:44.570",
          "speaker": "doctor",
          "text": "Also, start walking even 20 to 30 minutes in the evening is fine."
        },
        {
          "timestamp": "02:49.800",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "02:50.880",
          "speaker": "patient",
          "text": "I've been eating late a lot, especially after work."
        },
        {
          "timestamp": "02:54.460",
          "speaker": "doctor",
          "text": "That's common."
        },
        {
          "timestamp": "02:56.380",
          "speaker": "doctor",
          "text": "Try not to eat heavy meals after 8:00 p.m."
        },
        {
          "timestamp": "03:00.010",
          "speaker": "doctor",
          "text": "and reduce alcohol to one or two bottles a week, not more."
        },
        {
          "timestamp": "03:03.830",
          "speaker": "patient",
          "text": "All right, I'll try."
        },
        {
          "timestamp": "03:06.100",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "03:07.220",
          "speaker": "doctor",
          "text": "How's your weight?"
        },
        {
          "timestamp": "03:09.450",
          "speaker": "doctor",
          "text": "Do you know how much you weigh?"
        },
        {
          "timestamp": "03:11.450",
          "speaker": "patient",
          "text": "Last I checked, I was about 96 kilos."
        },
        {
          "timestamp": "03:15.230",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "03:16.460",
          "speaker": "doctor",
          "text": "At your height, that's a bit on the high side."
        },
        {
          "timestamp": "03:19.790",
          "speaker": "doctor",
          "text": "We'll aim to bring it down gradually."
        },
        {
          "timestamp": "03:22.180",
          "speaker": "doctor",
          "text": "Even losing 5 to 10 kilos will make a big difference in your blood pressure and sugar."
        },
        {
          "timestamp": "03:27.760",
          "speaker": "doctor",
          "text": "Hm."
        },
        {
          "timestamp": "03:28.550",
          "speaker": "doctor",
          "text": "So I need to start exercise,"
        },
        {
          "timestamp": "03:31.480",
          "speaker": "doctor",
          "text": "exactly."
        },
        {
          "timestamp": "03:33.000",
          "speaker": "doctor",
          "text": "Simple brisk walking, skipping, or jogging if you can manage."
        },
        {
          "timestamp": "03:37.140",
          "speaker": "doctor",
          "text": "Do you have any other medical condition, maybe ulcer or back pain?"
        },
        {
          "timestamp": "03:41.340",
          "speaker": "patient",
          "text": "I get heartburn sometimes when I skip meals."
        },
        {
          "timestamp": "03:44.780",
          "speaker": "doctor",
          "text": "Okay, that might be also related."
        },
        {
          "timestamp": "03:47.580",
          "speaker": "doctor",
          "text": "I'll give you something for that too."
        },
        {
          "timestamp": "03:50.120",
          "speaker": "doctor",
          "text": "Any medications you're currently taking?"
        },
        {
          "timestamp": "03:53.450",
          "speaker": "patient",
          "text": "No, none."
        },
        {
          "timestamp": "03:55.890",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "03:56.300",
          "speaker": "doctor",
          "text": "I'll start you on a mild blood pressure tablet and an antacid."
        },
        {
          "timestamp": "04:00.370",
          "speaker": "doctor",
          "text": "The main thing is to come in fast tomorrow morning for the test."
        },
        {
          "timestamp": "04:04.140",
          "speaker": "patient",
          "text": "All right, I can do that."
        },
        {
          "timestamp": "04:06.500",
          "speaker": "doctor",
          "text": "When you come, we'll check your fasting sugar, cholesterol, and kidney function."
        },
        {
          "timestamp": "04:11.700",
          "speaker": "doctor",
          "text": "If the results show early diabetes, we'll start a small tablet and monitor it closely."
        },
        {
          "timestamp": "04:18.240",
          "speaker": "doctor",
          "text": "Is it something that can be reversed?"
        },
        {
          "timestamp": "04:21.340",
          "speaker": "doctor",
          "text": "If we catch it early and you adjust your diet and lifestyle, yes, your numbers can return to normal."
        },
        {
          "timestamp": "04:27.660",
          "speaker": "doctor",
          "text": "But it requires discipline."
        },
        {
          "timestamp": "04:29.730",
          "speaker": "doctor",
          "text": "You need to be consistent with exercise and avoid sugary things."
        },
        {
          "timestamp": "04:34.860",
          "speaker": "patient",
          "text": "I understand."
        },
        {
          "timestamp": "04:36.760",
          "speaker": "patient",
          "text": "I'll take it seriously."
        },
        {
          "timestamp": "04:38.810",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "04:40.200",
          "speaker": "doctor",
          "text": "I like that attitude."
        },
        {
          "timestamp": "04:42.440",
          "speaker": "doctor",
          "text": "Also, make sure you're getting enough rest."
        },
        {
          "timestamp": "04:45.480",
          "speaker": "doctor",
          "text": "You mentioned you drive long hours, try to take breaks."
        },
        {
          "timestamp": "04:49.560",
          "speaker": "doctor",
          "text": "Stress can make your blood pressure rise."
        },
        {
          "timestamp": "04:53.310",
          "speaker": "doctor",
          "text": "True."
        },
        {
          "timestamp": "04:54.190",
          "speaker": "doctor",
          "text": "Sometimes leg traffic alone can raise BP."
        },
        {
          "timestamp": "04:57.670",
          "speaker": "doctor",
          "text": "Laughs. You're right about that."
        },
        {
          "timestamp": "05:00.170",
          "speaker": "doctor",
          "text": "That's why it's important to balance work and your health."
        },
        {
          "timestamp": "05:03.690",
          "speaker": "doctor",
          "text": "That won't make sense if you end up in the hospital."
        },
        {
          "timestamp": "05:07.210",
          "speaker": "patient",
          "text": "That's true, doctor."
        },
        {
          "timestamp": "05:09.210",
          "speaker": "patient",
          "text": "I've been ignoring it because I thought it was just tiredness."
        },
        {
          "timestamp": "05:13.280",
          "speaker": "doctor",
          "text": "You did well to come in."
        },
        {
          "timestamp": "05:15.100",
          "speaker": "doctor",
          "text": "Many people wait until it becomes serious."
        },
        {
          "timestamp": "05:18.600",
          "speaker": "doctor",
          "text": "After the test, we'll plan your meals and exercise schedule."
        },
        {
          "timestamp": "05:23.990",
          "speaker": "doctor",
          "text": "Should I get a little blood pressure monitor to check my BP at home?"
        },
        {
          "timestamp": "05:27.330",
          "speaker": "doctor",
          "text": "That's a very good idea."
        },
        {
          "timestamp": "05:29.390",
          "speaker": "doctor",
          "text": "Get a little blood pressure monitor, you can get one around 12,000, 15,000 Nigerian nairas."
        },
        {
          "timestamp": "05:37.070",
          "speaker": "doctor",
          "text": "Check your BP every morning before breakfast and write it down."
        },
        {
          "timestamp": "05:40.600",
          "speaker": "doctor",
          "text": "Bring the record when you come next week."
        },
        {
          "timestamp": "05:43.550",
          "speaker": "patient",
          "text": "All right, I'll get one."
        },
        {
          "timestamp": "05:46.240",
          "speaker": "doctor",
          "text": "Perfect."
        },
        {
          "timestamp": "05:47.320",
          "speaker": "doctor",
          "text": "I'll print out your prescription and write down the test list."
        },
        {
          "timestamp": "05:51.320",
          "speaker": "doctor",
          "text": "Do you have any other symptoms like numbness in your feet or blurry vision?"
        },
        {
          "timestamp": "05:56.030",
          "speaker": "patient",
          "text": "Now that you mention it, sometimes my eyes get blurry when I'm driving in the evening."
        },
        {
          "timestamp": "06:01.740",
          "speaker": "doctor",
          "text": "Okay."
        },
        {
          "timestamp": "06:02.940",
          "speaker": "doctor",
          "text": "That could also be related to blood sugar."
        },
        {
          "timestamp": "06:05.250",
          "speaker": "doctor",
          "text": "We'll refer you to the eye clinic to check your retina once your results are out."
        },
        {
          "timestamp": "06:10.300",
          "speaker": "patient",
          "text": "All right, thank you, doctor."
        },
        {
          "timestamp": "06:12.820",
          "speaker": "doctor",
          "text": "You're welcome."
        },
        {
          "timestamp": "06:14.250",
          "speaker": "doctor",
          "text": "Please come tomorrow before 9:00 a.m. for the fasting test."
        },
        {
          "timestamp": "06:18.260",
          "speaker": "doctor",
          "text": "And don't forget, no food, not even tea or chewing gum."
        },
        {
          "timestamp": "06:22.440",
          "speaker": "doctor",
          "text": "Only water is allowed."
        },
        {
          "timestamp": "06:24.600",
          "speaker": "patient",
          "text": "Okay, no water."
        },
        {
          "timestamp": "06:26.770",
          "speaker": "patient",
          "text": "I'll come early."
        },
        {
          "timestamp": "06:28.680",
          "speaker": "doctor",
          "text": "Good."
        },
        {
          "timestamp": "06:30.820",
          "speaker": "doctor",
          "text": "See you then."
        },
        {
          "timestamp": "06:31.990",
          "speaker": "doctor",
          "text": "Take care of yourself and try to rest today."
        },
        {
          "timestamp": "06:34.680",
          "speaker": "patient",
          "text": "Thank you, doctor."
        },
        {
          "timestamp": "06:36.680",
          "speaker": "doctor",
          "text": "God bless you."
        },
        {
          "timestamp": "06:38.520",
          "speaker": "patient",
          "text": "Amen."
        },
        {
          "timestamp": "06:39.500",
          "speaker": "doctor",
          "text": "Safe journey home."
        }
      ]
    }
  ]
}

### Important Notes
- **Timing**: Audio processing typically takes 60-90 seconds to complete transcription and generate structured medical documentation
- **Total Workflow Time**: Combined upload (60-90s) + processing (60-90s) = up to 3 minutes total
- The `assistant_response` provides AI feedback and suggestions for the doctor
- `patient_summary` contains a patient-friendly summary of findings and next steps
- `doctor_note` contains the complete structured SOAP note with detailed sections
- `references` lists key transcript excerpts referenced in the documentation
- `public_id` is the unique identifier for the generated note
- `encounter_public_id` links back to the original encounter
- `transcript_history` contains the full transcript data used for processing
- The endpoint can process existing transcripts and notes for refinement or updates
- **UX Best Practices**: Show progress indicators, estimated completion times, and engaging messaging during the 3-minute workflow to maintain user engagement

---

## 5. Finalize Encounter

### Endpoint
```
POST /in-person-encounters/{public_id}/finalize/
```

### Description
Finalizes the encounter by saving the complete medical review documentation and optionally creating a patient record and sending them a summary. This endpoint marks the encounter as complete and handles patient communication.

### Request Body
```json
{
  "note_payload": {
    "subjective": {
      "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
      "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired. He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest. He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate. Additionally, he reports intermittent blurry vision, especially when driving in the evening. Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work. He drinks beer on weekends and occasionally consumes energy drinks when working late. He experiences heartburn when skipping meals.",
      "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals, polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN)."
    },
    "objective": {
      "examination_findings": "General appearance: Alert and oriented, slightly overweight. Cardiovascular examination findings not explicitly detailed in the audio. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
      "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension).\nWeight: **96 kg** (Noted as high side for height; height not provided for BMI calculation)."
    },
    "assessment": {
      "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
      "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
      "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating.",
      "status": "stable"
    },
    "plan": {
      "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
      "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM.\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily.\n3. **Alcohol:** Limit intake to 1-2 bottles per week.\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours.\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control.",
      "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests.\n2. Obtain a home digital BP monitor and record daily morning readings.\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision.",
      "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes. Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals.",
      "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
      "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
    },
    "next_review": "2025-10-23 17:00",
    "prescription": [
      {
        "medication_name": "Amlodipine",
        "dosage": "5 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-11-15",
        "instructions": "Take once daily for blood pressure control."
      },
      {
        "medication_name": "Omeprazole",
        "dosage": "20 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-10-22",
        "instructions": "Take one capsule before breakfast for heartburn."
      }
    ],
    "investigation": [
      {
        "test_type": "Fasting Blood Sugar (FBS)",
        "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
        "instructions": "Requires 8-10 hour fast (No food, no drinks other than water).",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      },
      {
        "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
        "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
        "instructions": "To be drawn simultaneously with FBS.",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      },
      {
        "test_type": "Retina Examination (Eye Clinic Referral)",
        "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia.",
        "instructions": "To be scheduled once blood test results are available.",
        "scheduled_time": "2025-10-23 17:30",
        "interval": 0
      }
    ]
  },
  "send_summary": true,
  "create_patient": true,
  "patient_phone": "+2348012345678",
  "patient_first_name": "John",
  "patient_last_name": "Doe",
  "patient_email": "john.doe@example.com",
  "patient_summary": "Your blood pressure is elevated. We'll start medication and monitor your progress. Please reduce salt in your diet and exercise daily. Follow up in 2 weeks."
}
```

### Field Descriptions
- `note_payload`: Required. Complete SOAP note structure with subjective, objective, assessment, and plan sections
- `send_summary`: Optional. Whether to send the patient summary via SMS/email (default: false)
- `create_patient`: Optional. Whether to create a patient record if one doesn't exist (default: false)
- `patient_phone`: Required if `send_summary` is true. Patient's phone number for SMS communication
- `patient_first_name`: Required if `create_patient` is true. Patient's first name
- `patient_last_name`: Required if `create_patient` is true. Patient's last name
- `patient_email`: Optional. Patient's email address
- `patient_summary`: Required if `send_summary` is true. Patient-friendly summary of findings and next steps

### Response
```json
{
  "encounter": {
    "id": 32,
    "public_id": "74c2818e-80be-4d28-ab5d-f48d573ac694",
    "provider_id": 1,
    "patient_id": 3,
    "patient_first_name": "John",
    "patient_last_name": "Doe",
    "patient_phone": "+2348012345678",
    "patient_email": "john.doe@example.com",
    "encounter_date": "2025-10-15T17:00:00Z",
    "status": "finalized",
    "audio_recording_url": "https://prestigehealth.s3.amazonaws.com/in_person_encounters/74c2818e-80be-4d28-ab5d-f48d573ac694.mp3",
    "transcript": [
      {
        "timestamp": "00:00.410",
        "speaker": "doctor",
        "text": "Good afternoon. Please come in."
      },
      {
        "timestamp": "00:03.470",
        "speaker": "doctor",
        "text": "How are you doing today?"
      },
      {
        "timestamp": "00:05.150",
        "speaker": "patient",
        "text": "Good afternoon, doctor."
      },
      {
        "timestamp": "00:07.180",
        "speaker": "patient",
        "text": "I'm fine, but I've not been feeling too well lately."
      },
      {
        "timestamp": "00:11.090",
        "speaker": "patient",
        "text": "Sorry about that."
      },
      {
        "timestamp": "00:13.030",
        "speaker": "doctor",
        "text": "What's been happening?"
      },
      {
        "timestamp": "00:14.910",
        "speaker": "patient",
        "text": "For like two weeks now, I've just been weak."
      },
      {
        "timestamp": "00:18.280",
        "speaker": "patient",
        "text": "I get tired easily and sometimes my heart beats fast when I climb the stairs."
      },
      {
        "timestamp": "00:23.210",
        "speaker": "doctor",
        "text": "All right."
      },
      {
        "timestamp": "00:24.710",
        "speaker": "doctor",
        "text": "Any fever, chest pain, or shortness of breath?"
      },
      {
        "timestamp": "00:28.510",
        "speaker": "patient",
        "text": "No fever, but I feel some light heaviness in my chest sometimes."
      },
      {
        "timestamp": "00:33.240",
        "speaker": "patient",
        "text": "It goes away when I rest."
      },
      {
        "timestamp": "00:35.660",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "00:36.480",
        "speaker": "doctor",
        "text": "Do you notice any swelling in your legs or your feet?"
      },
      {
        "timestamp": "00:39.820",
        "speaker": "patient",
        "text": "No swelling, but my shoes sometimes feel tight in the evening."
      },
      {
        "timestamp": "00:44.350",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "00:45.390",
        "speaker": "doctor",
        "text": "How about your sleep? Do you sleep well through the night?"
      },
      {
        "timestamp": "00:49.370",
        "speaker": "patient",
        "text": "Not really."
      },
      {
        "timestamp": "00:50.250",
        "speaker": "patient",
        "text": "I wake up to urinate, maybe three or four times."
      },
      {
        "timestamp": "00:54.380",
        "speaker": "doctor",
        "text": "Do you feel very thirsty too?"
      },
      {
        "timestamp": "00:56.420",
        "speaker": "patient",
        "text": "Yes, actually."
      },
      {
        "timestamp": "00:58.580",
        "speaker": "patient",
        "text": "I've been drinking a lot of water."
      },
      {
        "timestamp": "01:01.330",
        "speaker": "patient",
        "text": "I even keep a bottle by my bed."
      },
      {
        "timestamp": "01:04.330",
        "speaker": "doctor",
        "text": "All right."
      },
      {
        "timestamp": "01:05.520",
        "speaker": "doctor",
        "text": "Do you have any history of diabetes or high blood pressure in your family?"
      },
      {
        "timestamp": "01:09.950",
        "speaker": "patient",
        "text": "My mom has diabetes, and my dad had hypertension before he passed."
      },
      {
        "timestamp": "01:14.680",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "01:16.330",
        "speaker": "doctor",
        "text": "Have you ever checked your blood pressure or blood sugar before?"
      },
      {
        "timestamp": "01:19.960",
        "speaker": "patient",
        "text": "The last time was maybe last year during a work screening."
      },
      {
        "timestamp": "01:23.390",
        "speaker": "patient",
        "text": "They said it was okay then."
      },
      {
        "timestamp": "01:25.650",
        "speaker": "doctor",
        "text": "All right."
      },
      {
        "timestamp": "01:27.470",
        "speaker": "doctor",
        "text": "Do you take alcohol, smoke, or take energy drinks?"
      },
      {
        "timestamp": "01:31.620",
        "speaker": "patient",
        "text": "I don't smoke."
      },
      {
        "timestamp": "01:33.230",
        "speaker": "patient",
        "text": "I drink beer sometimes on weekends, and I take energy drinks when I'm working late."
      },
      {
        "timestamp": "01:39.130",
        "speaker": "doctor",
        "text": "What kind of work do you do?"
      },
      {
        "timestamp": "01:42.010",
        "speaker": "patient",
        "text": "I'm into logistics. I drive around a lot."
      },
      {
        "timestamp": "01:45.400",
        "speaker": "patient",
        "text": "Sometimes I work from morning till night."
      },
      {
        "timestamp": "01:48.730",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "01:49.120",
        "speaker": "doctor",
        "text": "Long hours and sitting for too long can also contribute to some of these symptoms."
      },
      {
        "timestamp": "01:53.920",
        "speaker": "doctor",
        "text": "Let's check a few things, your blood pressure and sugar."
      },
      {
        "timestamp": "01:57.820",
        "speaker": "doctor",
        "text": "He checks."
      },
      {
        "timestamp": "01:59.200",
        "speaker": "doctor",
        "text": "Your BP is 152/96, and your random blood sugar is 182."
      },
      {
        "timestamp": "02:05.500",
        "speaker": "doctor",
        "text": "That sounds high, doctor."
      },
      {
        "timestamp": "02:08.350",
        "speaker": "patient",
        "text": "Yes, both are bit elevated."
      },
      {
        "timestamp": "02:11.100",
        "speaker": "doctor",
        "text": "It doesn't confirm diabetes yet, but it's a warning sign."
      },
      {
        "timestamp": "02:15.110",
        "speaker": "doctor",
        "text": "We'll do a fasting blood sugar and an HbA1c test to be sure."
      },
      {
        "timestamp": "02:19.200",
        "speaker": "doctor",
        "text": "So it might be diabetes."
      },
      {
        "timestamp": "02:21.750",
        "speaker": "doctor",
        "text": "Possibly early stage."
      },
      {
        "timestamp": "02:23.860",
        "speaker": "doctor",
        "text": "The tiredness, frequent urination, and test all point to that."
      },
      {
        "timestamp": "02:28.710",
        "speaker": "doctor",
        "text": "But don't panic, we'll confirm and manage it."
      },
      {
        "timestamp": "02:33.320",
        "speaker": "doctor",
        "text": "What should I do in the meantime?"
      },
      {
        "timestamp": "02:36.210",
        "speaker": "doctor",
        "text": "For now, cut down on soft drinks, carry rice and white bread."
      },
      {
        "timestamp": "02:41.150",
        "speaker": "doctor",
        "text": "Try to eat more vegetables and on ripe plantain."
      },
      {
        "timestamp": "02:44.570",
        "speaker": "doctor",
        "text": "Also, start walking even 20 to 30 minutes in the evening is fine."
      },
      {
        "timestamp": "02:49.800",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "02:50.880",
        "speaker": "patient",
        "text": "I've been eating late a lot, especially after work."
      },
      {
        "timestamp": "02:54.460",
        "speaker": "doctor",
        "text": "That's common."
      },
      {
        "timestamp": "02:56.380",
        "speaker": "doctor",
        "text": "Try not to eat heavy meals after 8:00 p.m."
      },
      {
        "timestamp": "03:00.010",
        "speaker": "doctor",
        "text": "and reduce alcohol to one or two bottles a week, not more."
      },
      {
        "timestamp": "03:03.830",
        "speaker": "patient",
        "text": "All right, I'll try."
      },
      {
        "timestamp": "03:06.100",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "03:07.220",
        "speaker": "doctor",
        "text": "How's your weight?"
      },
      {
        "timestamp": "03:09.450",
        "speaker": "doctor",
        "text": "Do you know how much you weigh?"
      },
      {
        "timestamp": "03:11.450",
        "speaker": "patient",
        "text": "Last I checked, I was about 96 kilos."
      },
      {
        "timestamp": "03:15.230",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "03:16.460",
        "speaker": "doctor",
        "text": "At your height, that's a bit on the high side."
      },
      {
        "timestamp": "03:19.790",
        "speaker": "doctor",
        "text": "We'll aim to bring it down gradually."
      },
      {
        "timestamp": "03:22.180",
        "speaker": "doctor",
        "text": "Even losing 5 to 10 kilos will make a big difference in your blood pressure and sugar."
      },
      {
        "timestamp": "03:27.760",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "03:28.550",
        "speaker": "doctor",
        "text": "So I need to start exercise,"
      },
      {
        "timestamp": "03:31.480",
        "speaker": "doctor",
        "text": "exactly."
      },
      {
        "timestamp": "03:33.000",
        "speaker": "doctor",
        "text": "Simple brisk walking, skipping, or jogging if you can manage."
      },
      {
        "timestamp": "03:37.140",
        "speaker": "doctor",
        "text": "Do you have any other medical condition, maybe ulcer or back pain?"
      },
      {
        "timestamp": "03:41.340",
        "speaker": "patient",
        "text": "I get heartburn sometimes when I skip meals."
      },
      {
        "timestamp": "03:44.780",
        "speaker": "doctor",
        "text": "Okay, that might be also related."
      },
      {
        "timestamp": "03:47.580",
        "speaker": "doctor",
        "text": "I'll give you something for that too."
      },
      {
        "timestamp": "03:50.120",
        "speaker": "doctor",
        "text": "Any medications you're currently taking?"
      },
      {
        "timestamp": "03:53.450",
        "speaker": "patient",
        "text": "No, none."
      },
      {
        "timestamp": "03:55.890",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "03:56.300",
        "speaker": "doctor",
        "text": "I'll start you on a mild blood pressure tablet and an antacid."
      },
      {
        "timestamp": "04:00.370",
        "speaker": "doctor",
        "text": "The main thing is to come in fast tomorrow morning for the test."
      },
      {
        "timestamp": "04:04.140",
        "speaker": "patient",
        "text": "All right, I can do that."
      },
      {
        "timestamp": "04:06.500",
        "speaker": "doctor",
        "text": "When you come, we'll check your fasting sugar, cholesterol, and kidney function."
      },
      {
        "timestamp": "04:11.700",
        "speaker": "doctor",
        "text": "If the results show early diabetes, we'll start a small tablet and monitor it closely."
      },
      {
        "timestamp": "04:18.240",
        "speaker": "doctor",
        "text": "Is it something that can be reversed?"
      },
      {
        "timestamp": "04:21.340",
        "speaker": "doctor",
        "text": "If we catch it early and you adjust your diet and lifestyle, yes, your numbers can return to normal."
      },
      {
        "timestamp": "04:27.660",
        "speaker": "doctor",
        "text": "But it requires discipline."
      },
      {
        "timestamp": "04:29.730",
        "speaker": "doctor",
        "text": "You need to be consistent with exercise and avoid sugary things."
      },
      {
        "timestamp": "04:34.860",
        "speaker": "patient",
        "text": "I understand."
      },
      {
        "timestamp": "04:36.760",
        "speaker": "patient",
        "text": "I'll take it seriously."
      },
      {
        "timestamp": "04:38.810",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "04:40.200",
        "speaker": "doctor",
        "text": "I like that attitude."
      },
      {
        "timestamp": "04:42.440",
        "speaker": "doctor",
        "text": "Also, make sure you're getting enough rest."
      },
      {
        "timestamp": "04:45.480",
        "speaker": "doctor",
        "text": "You mentioned you drive long hours, try to take breaks."
      },
      {
        "timestamp": "04:49.560",
        "speaker": "doctor",
        "text": "Stress can make your blood pressure rise."
      },
      {
        "timestamp": "04:53.310",
        "speaker": "doctor",
        "text": "True."
      },
      {
        "timestamp": "04:54.190",
        "speaker": "doctor",
        "text": "Sometimes leg traffic alone can raise BP."
      },
      {
        "timestamp": "04:57.670",
        "speaker": "doctor",
        "text": "Laughs. You're right about that."
      },
      {
        "timestamp": "05:00.170",
        "speaker": "doctor",
        "text": "That's why it's important to balance work and your health."
      },
      {
        "timestamp": "05:03.690",
        "speaker": "doctor",
        "text": "That won't make sense if you end up in the hospital."
      },
      {
        "timestamp": "05:07.210",
        "speaker": "patient",
        "text": "That's true, doctor."
      },
      {
        "timestamp": "05:09.210",
        "speaker": "patient",
        "text": "I've been ignoring it because I thought it was just tiredness."
      },
      {
        "timestamp": "05:13.280",
        "speaker": "doctor",
        "text": "You did well to come in."
      },
      {
        "timestamp": "05:15.100",
        "speaker": "doctor",
        "text": "Many people wait until it becomes serious."
      },
      {
        "timestamp": "05:18.600",
        "speaker": "doctor",
        "text": "After the test, we'll plan your meals and exercise schedule."
      },
      {
        "timestamp": "05:23.990",
        "speaker": "doctor",
        "text": "Should I get a little blood pressure monitor to check my BP at home?"
      },
      {
        "timestamp": "05:27.330",
        "speaker": "doctor",
        "text": "That's a very good idea."
      },
      {
        "timestamp": "05:29.390",
        "speaker": "doctor",
        "text": "Get a little blood pressure monitor, you can get one around 12,000, 15,000 Nigerian nairas."
      },
      {
        "timestamp": "05:37.070",
        "speaker": "doctor",
        "text": "Check your BP every morning before breakfast and write it down."
      },
      {
        "timestamp": "05:40.600",
        "speaker": "doctor",
        "text": "Bring the record when you come next week."
      },
      {
        "timestamp": "05:43.550",
        "speaker": "patient",
        "text": "All right, I'll get one."
      },
      {
        "timestamp": "05:46.240",
        "speaker": "doctor",
        "text": "Perfect."
      },
      {
        "timestamp": "05:47.320",
        "speaker": "doctor",
        "text": "I'll print out your prescription and write down the test list."
      },
      {
        "timestamp": "05:51.320",
        "speaker": "doctor",
        "text": "Do you have any other symptoms like numbness in your feet or blurry vision?"
      },
      {
        "timestamp": "05:56.030",
        "speaker": "patient",
        "text": "Now that you mention it, sometimes my eyes get blurry when I'm driving in the evening."
      },
      {
        "timestamp": "06:01.740",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "06:02.940",
        "speaker": "doctor",
        "text": "That could also be related to blood sugar."
      },
      {
        "timestamp": "06:05.250",
        "speaker": "doctor",
        "text": "We'll refer you to the eye clinic to check your retina once your results are out."
      },
      {
        "timestamp": "06:10.300",
        "speaker": "patient",
        "text": "All right, thank you, doctor."
      },
      {
        "timestamp": "06:12.820",
        "speaker": "doctor",
        "text": "You're welcome."
      },
      {
        "timestamp": "06:14.250",
        "speaker": "doctor",
        "text": "Please come tomorrow before 9:00 a.m. for the fasting test."
      },
      {
        "timestamp": "06:18.260",
        "speaker": "doctor",
        "text": "And don't forget, no food, not even tea or chewing gum."
      },
      {
        "timestamp": "06:22.440",
        "speaker": "doctor",
        "text": "Only water is allowed."
      },
      {
        "timestamp": "06:24.600",
        "speaker": "patient",
        "text": "Okay, no water."
      },
      {
        "timestamp": "06:26.770",
        "speaker": "patient",
        "text": "I'll come early."
      },
      {
        "timestamp": "06:28.680",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "06:30.820",
        "speaker": "doctor",
        "text": "See you then."
      },
      {
        "timestamp": "06:31.990",
        "speaker": "doctor",
        "text": "Take care of yourself and try to rest today."
      },
      {
        "timestamp": "06:34.680",
        "speaker": "patient",
        "text": "Thank you, doctor."
      },
      {
        "timestamp": "06:36.680",
        "speaker": "doctor",
        "text": "God bless you."
      },
      {
        "timestamp": "06:38.520",
        "speaker": "patient",
        "text": "Amen."
      },
      {
        "timestamp": "06:39.500",
        "speaker": "doctor",
        "text": "Safe journey home."
      }
    ],
    "transcript_segments": [
      {
        "timestamp": "00:00.410",
        "speaker": "doctor",
        "text": "Good afternoon. Please come in."
      },
      {
        "timestamp": "00:03.470",
        "speaker": "doctor",
        "text": "How are you doing today?"
      },
      {
        "timestamp": "00:05.150",
        "speaker": "patient",
        "text": "Good afternoon, doctor."
      },
      {
        "timestamp": "00:07.180",
        "speaker": "patient",
        "text": "I'm fine, but I've not been feeling too well lately."
      },
      {
        "timestamp": "00:11.090",
        "speaker": "patient",
        "text": "Sorry about that."
      },
      {
        "timestamp": "00:13.030",
        "speaker": "doctor",
        "text": "What's been happening?"
      },
      {
        "timestamp": "00:14.910",
        "speaker": "patient",
        "text": "For like two weeks now, I've just been weak."
      },
      {
        "timestamp": "00:18.280",
        "speaker": "patient",
        "text": "I get tired easily and sometimes my heart beats fast when I climb the stairs."
      },
      {
        "timestamp": "00:23.210",
        "speaker": "doctor",
        "text": "All right."
      },
      {
        "timestamp": "00:24.710",
        "speaker": "doctor",
        "text": "Any fever, chest pain, or shortness of breath?"
      },
      {
        "timestamp": "00:28.510",
        "speaker": "patient",
        "text": "No fever, but I feel some light heaviness in my chest sometimes."
      },
      {
        "timestamp": "00:33.240",
        "speaker": "patient",
        "text": "It goes away when I rest."
      },
      {
        "timestamp": "00:35.660",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "00:36.480",
        "speaker": "doctor",
        "text": "Do you notice any swelling in your legs or your feet?"
      },
      {
        "timestamp": "00:39.820",
        "speaker": "patient",
        "text": "No swelling, but my shoes sometimes feel tight in the evening."
      },
      {
        "timestamp": "00:44.350",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "00:45.390",
        "speaker": "doctor",
        "text": "How about your sleep? Do you sleep well through the night?"
      },
      {
        "timestamp": "00:49.370",
        "speaker": "patient",
        "text": "Not really."
      },
      {
        "timestamp": "00:50.250",
        "speaker": "patient",
        "text": "I wake up to urinate, maybe three or four times."
      },
      {
        "timestamp": "00:54.380",
        "speaker": "doctor",
        "text": "Do you feel very thirsty too?"
      },
      {
        "timestamp": "00:56.420",
        "speaker": "patient",
        "text": "Yes, actually."
      },
      {
        "timestamp": "00:58.580",
        "speaker": "patient",
        "text": "I've been drinking a lot of water."
      },
      {
        "timestamp": "01:01.330",
        "speaker": "patient",
        "text": "I even keep a bottle by my bed."
      },
      {
        "timestamp": "01:04.330",
        "speaker": "doctor",
        "text": "All right."
      },
      {
        "timestamp": "01:05.520",
        "speaker": "doctor",
        "text": "Do you have any history of diabetes or high blood pressure in your family?"
      },
      {
        "timestamp": "01:09.950",
        "speaker": "patient",
        "text": "My mom has diabetes, and my dad had hypertension before he passed."
      },
      {
        "timestamp": "01:14.680",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "01:16.330",
        "speaker": "doctor",
        "text": "Have you ever checked your blood pressure or blood sugar before?"
      },
      {
        "timestamp": "01:19.960",
        "speaker": "patient",
        "text": "The last time was maybe last year during a work screening."
      },
      {
        "timestamp": "01:23.390",
        "speaker": "patient",
        "text": "They said it was okay then."
      },
      {
        "timestamp": "01:25.650",
        "speaker": "doctor",
        "text": "All right."
      },
      {
        "timestamp": "01:27.470",
        "speaker": "doctor",
        "text": "Do you take alcohol, smoke, or take energy drinks?"
      },
      {
        "timestamp": "01:31.620",
        "speaker": "patient",
        "text": "I don't smoke."
      },
      {
        "timestamp": "01:33.230",
        "speaker": "patient",
        "text": "I drink beer sometimes on weekends, and I take energy drinks when I'm working late."
      },
      {
        "timestamp": "01:39.130",
        "speaker": "doctor",
        "text": "What kind of work do you do?"
      },
      {
        "timestamp": "01:42.010",
        "speaker": "patient",
        "text": "I'm into logistics. I drive around a lot."
      },
      {
        "timestamp": "01:45.400",
        "speaker": "patient",
        "text": "Sometimes I work from morning till night."
      },
      {
        "timestamp": "01:48.730",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "01:49.120",
        "speaker": "doctor",
        "text": "Long hours and sitting for too long can also contribute to some of these symptoms."
      },
      {
        "timestamp": "01:53.920",
        "speaker": "doctor",
        "text": "Let's check a few things, your blood pressure and sugar."
      },
      {
        "timestamp": "01:57.820",
        "speaker": "doctor",
        "text": "He checks."
      },
      {
        "timestamp": "01:59.200",
        "speaker": "doctor",
        "text": "Your BP is 152/96, and your random blood sugar is 182."
      },
      {
        "timestamp": "02:05.500",
        "speaker": "doctor",
        "text": "That sounds high, doctor."
      },
      {
        "timestamp": "02:08.350",
        "speaker": "patient",
        "text": "Yes, both are bit elevated."
      },
      {
        "timestamp": "02:11.100",
        "speaker": "doctor",
        "text": "It doesn't confirm diabetes yet, but it's a warning sign."
      },
      {
        "timestamp": "02:15.110",
        "speaker": "doctor",
        "text": "We'll do a fasting blood sugar and an HbA1c test to be sure."
      },
      {
        "timestamp": "02:19.200",
        "speaker": "doctor",
        "text": "So it might be diabetes."
      },
      {
        "timestamp": "02:21.750",
        "speaker": "doctor",
        "text": "Possibly early stage."
      },
      {
        "timestamp": "02:23.860",
        "speaker": "doctor",
        "text": "The tiredness, frequent urination, and test all point to that."
      },
      {
        "timestamp": "02:28.710",
        "speaker": "doctor",
        "text": "But don't panic, we'll confirm and manage it."
      },
      {
        "timestamp": "02:33.320",
        "speaker": "doctor",
        "text": "What should I do in the meantime?"
      },
      {
        "timestamp": "02:36.210",
        "speaker": "doctor",
        "text": "For now, cut down on soft drinks, carry rice and white bread."
      },
      {
        "timestamp": "02:41.150",
        "speaker": "doctor",
        "text": "Try to eat more vegetables and on ripe plantain."
      },
      {
        "timestamp": "02:44.570",
        "speaker": "doctor",
        "text": "Also, start walking even 20 to 30 minutes in the evening is fine."
      },
      {
        "timestamp": "02:49.800",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "02:50.880",
        "speaker": "patient",
        "text": "I've been eating late a lot, especially after work."
      },
      {
        "timestamp": "02:54.460",
        "speaker": "doctor",
        "text": "That's common."
      },
      {
        "timestamp": "02:56.380",
        "speaker": "doctor",
        "text": "Try not to eat heavy meals after 8:00 p.m."
      },
      {
        "timestamp": "03:00.010",
        "speaker": "doctor",
        "text": "and reduce alcohol to one or two bottles a week, not more."
      },
      {
        "timestamp": "03:03.830",
        "speaker": "patient",
        "text": "All right, I'll try."
      },
      {
        "timestamp": "03:06.100",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "03:07.220",
        "speaker": "doctor",
        "text": "How's your weight?"
      },
      {
        "timestamp": "03:09.450",
        "speaker": "doctor",
        "text": "Do you know how much you weigh?"
      },
      {
        "timestamp": "03:11.450",
        "speaker": "patient",
        "text": "Last I checked, I was about 96 kilos."
      },
      {
        "timestamp": "03:15.230",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "03:16.460",
        "speaker": "doctor",
        "text": "At your height, that's a bit on the high side."
      },
      {
        "timestamp": "03:19.790",
        "speaker": "doctor",
        "text": "We'll aim to bring it down gradually."
      },
      {
        "timestamp": "03:22.180",
        "speaker": "doctor",
        "text": "Even losing 5 to 10 kilos will make a big difference in your blood pressure and sugar."
      },
      {
        "timestamp": "03:27.760",
        "speaker": "doctor",
        "text": "Hm."
      },
      {
        "timestamp": "03:28.550",
        "speaker": "doctor",
        "text": "So I need to start exercise,"
      },
      {
        "timestamp": "03:31.480",
        "speaker": "doctor",
        "text": "exactly."
      },
      {
        "timestamp": "03:33.000",
        "speaker": "doctor",
        "text": "Simple brisk walking, skipping, or jogging if you can manage."
      },
      {
        "timestamp": "03:37.140",
        "speaker": "doctor",
        "text": "Do you have any other medical condition, maybe ulcer or back pain?"
      },
      {
        "timestamp": "03:41.340",
        "speaker": "patient",
        "text": "I get heartburn sometimes when I skip meals."
      },
      {
        "timestamp": "03:44.780",
        "speaker": "doctor",
        "text": "Okay, that might be also related."
      },
      {
        "timestamp": "03:47.580",
        "speaker": "doctor",
        "text": "I'll give you something for that too."
      },
      {
        "timestamp": "03:50.120",
        "speaker": "doctor",
        "text": "Any medications you're currently taking?"
      },
      {
        "timestamp": "03:53.450",
        "speaker": "patient",
        "text": "No, none."
      },
      {
        "timestamp": "03:55.890",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "03:56.300",
        "speaker": "doctor",
        "text": "I'll start you on a mild blood pressure tablet and an antacid."
      },
      {
        "timestamp": "04:00.370",
        "speaker": "doctor",
        "text": "The main thing is to come in fast tomorrow morning for the test."
      },
      {
        "timestamp": "04:04.140",
        "speaker": "patient",
        "text": "All right, I can do that."
      },
      {
        "timestamp": "04:06.500",
        "speaker": "doctor",
        "text": "When you come, we'll check your fasting sugar, cholesterol, and kidney function."
      },
      {
        "timestamp": "04:11.700",
        "speaker": "doctor",
        "text": "If the results show early diabetes, we'll start a small tablet and monitor it closely."
      },
      {
        "timestamp": "04:18.240",
        "speaker": "doctor",
        "text": "Is it something that can be reversed?"
      },
      {
        "timestamp": "04:21.340",
        "speaker": "doctor",
        "text": "If we catch it early and you adjust your diet and lifestyle, yes, your numbers can return to normal."
      },
      {
        "timestamp": "04:27.660",
        "speaker": "doctor",
        "text": "But it requires discipline."
      },
      {
        "timestamp": "04:29.730",
        "speaker": "doctor",
        "text": "You need to be consistent with exercise and avoid sugary things."
      },
      {
        "timestamp": "04:34.860",
        "speaker": "patient",
        "text": "I understand."
      },
      {
        "timestamp": "04:36.760",
        "speaker": "patient",
        "text": "I'll take it seriously."
      },
      {
        "timestamp": "04:38.810",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "04:40.200",
        "speaker": "doctor",
        "text": "I like that attitude."
      },
      {
        "timestamp": "04:42.440",
        "speaker": "doctor",
        "text": "Also, make sure you're getting enough rest."
      },
      {
        "timestamp": "04:45.480",
        "speaker": "doctor",
        "text": "You mentioned you drive long hours, try to take breaks."
      },
      {
        "timestamp": "04:49.560",
        "speaker": "doctor",
        "text": "Stress can make your blood pressure rise."
      },
      {
        "timestamp": "04:53.310",
        "speaker": "doctor",
        "text": "True."
      },
      {
        "timestamp": "04:54.190",
        "speaker": "doctor",
        "text": "Sometimes leg traffic alone can raise BP."
      },
      {
        "timestamp": "04:57.670",
        "speaker": "doctor",
        "text": "Laughs. You're right about that."
      },
      {
        "timestamp": "05:00.170",
        "speaker": "doctor",
        "text": "That's why it's important to balance work and your health."
      },
      {
        "timestamp": "05:03.690",
        "speaker": "doctor",
        "text": "That won't make sense if you end up in the hospital."
      },
      {
        "timestamp": "05:07.210",
        "speaker": "patient",
        "text": "That's true, doctor."
      },
      {
        "timestamp": "05:09.210",
        "speaker": "patient",
        "text": "I've been ignoring it because I thought it was just tiredness."
      },
      {
        "timestamp": "05:13.280",
        "speaker": "doctor",
        "text": "You did well to come in."
      },
      {
        "timestamp": "05:15.100",
        "speaker": "doctor",
        "text": "Many people wait until it becomes serious."
      },
      {
        "timestamp": "05:18.600",
        "speaker": "doctor",
        "text": "After the test, we'll plan your meals and exercise schedule."
      },
      {
        "timestamp": "05:23.990",
        "speaker": "doctor",
        "text": "Should I get a little blood pressure monitor to check my BP at home?"
      },
      {
        "timestamp": "05:27.330",
        "speaker": "doctor",
        "text": "That's a very good idea."
      },
      {
        "timestamp": "05:29.390",
        "speaker": "doctor",
        "text": "Get a little blood pressure monitor, you can get one around 12,000, 15,000 Nigerian nairas."
      },
      {
        "timestamp": "05:37.070",
        "speaker": "doctor",
        "text": "Check your BP every morning before breakfast and write it down."
      },
      {
        "timestamp": "05:40.600",
        "speaker": "doctor",
        "text": "Bring the record when you come next week."
      },
      {
        "timestamp": "05:43.550",
        "speaker": "patient",
        "text": "All right, I'll get one."
      },
      {
        "timestamp": "05:46.240",
        "speaker": "doctor",
        "text": "Perfect."
      },
      {
        "timestamp": "05:47.320",
        "speaker": "doctor",
        "text": "I'll print out your prescription and write down the test list."
      },
      {
        "timestamp": "05:51.320",
        "speaker": "doctor",
        "text": "Do you have any other symptoms like numbness in your feet or blurry vision?"
      },
      {
        "timestamp": "05:56.030",
        "speaker": "patient",
        "text": "Now that you mention it, sometimes my eyes get blurry when I'm driving in the evening."
      },
      {
        "timestamp": "06:01.740",
        "speaker": "doctor",
        "text": "Okay."
      },
      {
        "timestamp": "06:02.940",
        "speaker": "doctor",
        "text": "That could also be related to blood sugar."
      },
      {
        "timestamp": "06:05.250",
        "speaker": "doctor",
        "text": "We'll refer you to the eye clinic to check your retina once your results are out."
      },
      {
        "timestamp": "06:10.300",
        "speaker": "patient",
        "text": "All right, thank you, doctor."
      },
      {
        "timestamp": "06:12.820",
        "speaker": "doctor",
        "text": "You're welcome."
      },
      {
        "timestamp": "06:14.250",
        "speaker": "doctor",
        "text": "Please come tomorrow before 9:00 a.m. for the fasting test."
      },
      {
        "timestamp": "06:18.260",
        "speaker": "doctor",
        "text": "And don't forget, no food, not even tea or chewing gum."
      },
      {
        "timestamp": "06:22.440",
        "speaker": "doctor",
        "text": "Only water is allowed."
      },
      {
        "timestamp": "06:24.600",
        "speaker": "patient",
        "text": "Okay, no water."
      },
      {
        "timestamp": "06:26.770",
        "speaker": "patient",
        "text": "I'll come early."
      },
      {
        "timestamp": "06:28.680",
        "speaker": "doctor",
        "text": "Good."
      },
      {
        "timestamp": "06:30.820",
        "speaker": "doctor",
        "text": "See you then."
      },
      {
        "timestamp": "06:31.990",
        "speaker": "doctor",
        "text": "Take care of yourself and try to rest today."
      },
      {
        "timestamp": "06:34.680",
        "speaker": "patient",
        "text": "Thank you, doctor."
      },
      {
        "timestamp": "06:36.680",
        "speaker": "doctor",
        "text": "God bless you."
      },
      {
        "timestamp": "06:38.520",
        "speaker": "patient",
        "text": "Amen."
      },
      {
        "timestamp": "06:39.500",
        "speaker": "doctor",
        "text": "Safe journey home."
      }
    ],
    "note_payload": {
      "subjective": {
        "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
        "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired. He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest. He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate. Additionally, he reports intermittent blurry vision, especially when driving in the evening. Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work. He drinks beer on weekends and occasionally consumes energy drinks when working late. He experiences heartburn when skipping meals.",
        "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals, polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN)."
      },
      "objective": {
        "examination_findings": "General appearance: Alert and oriented, slightly overweight. Cardiovascular examination findings not explicitly detailed in the audio. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
        "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension).\nWeight: **96 kg** (Noted as high side for height; height not provided for BMI calculation)."
      },
      "assessment": {
        "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
        "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
        "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating.",
        "status": "stable"
      },
      "plan": {
        "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
        "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM.\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily.\n3. **Alcohol:** Limit intake to 1-2 bottles per week.\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours.\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control.",
        "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests.\n2. Obtain a home digital BP monitor and record daily morning readings.\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision.",
        "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes. Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals.",
        "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
        "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
      },
      "next_review": "2025-10-23 17:00",
      "prescription": [
        {
          "medication_name": "Amlodipine",
          "dosage": "5 mg",
          "route": "Oral",
          "interval": 24,
          "end_date": "2025-11-15",
          "instructions": "Take once daily for blood pressure control."
        },
        {
          "medication_name": "Omeprazole",
          "dosage": "20 mg",
          "route": "Oral",
          "interval": 24,
          "end_date": "2025-10-22",
          "instructions": "Take one capsule before breakfast for heartburn."
        }
      ],
      "investigation": [
        {
          "test_type": "Fasting Blood Sugar (FBS)",
          "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
          "instructions": "Requires 8-10 hour fast (No food, no drinks other than water).",
          "scheduled_time": "2025-10-16 09:00",
          "interval": 0
        },
        {
          "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
          "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
          "instructions": "To be drawn simultaneously with FBS.",
          "scheduled_time": "2025-10-16 09:00",
          "interval": 0
        },
        {
          "test_type": "Retina Examination (Eye Clinic Referral)",
          "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia.",
          "instructions": "To be scheduled once blood test results are available.",
          "scheduled_time": "2025-10-23 17:30",
          "interval": 0
        }
      ]
    },
    "summary": "Your blood pressure is elevated. We'll start medication and monitor your progress. Please reduce salt in your diet and exercise daily. Follow up in 2 weeks.",
    "metadata": {
      "original_doctor_note": {
        "subjective": {
          "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
          "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired (1:58). He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest (2:11). He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate (56:50, 48:80). Additionally, he reports intermittent blurry vision, especially when driving in the evening (5:55). Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work (2:54). He drinks beer on weekends and occasionally consumes energy drinks when working late (1:31). He experiences heartburn when skipping meals (3:41).",
          "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals (3:41), polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema) (39:00). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN) (1:09:50)."
        },
        "objective": {
          "examination_findings": "General appearance: Alert and oriented, slightly overweight. Cardiovascular examination findings not explicitly detailed in the audio. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
          "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated) (1:57:50).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension) (1:57:50).\nWeight: **96 kg** (Patient reports this is high side for height; height not provided for BMI calculation) (3:11)."
        },
        "assessment": {
          "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
          "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
          "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating (2:54, 3:41).",
          "status": "stable"
        },
        "plan": {
          "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
          "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM (2:36, 2:54).\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily (2:45, 3:31).\n3. **Alcohol:** Limit intake to 1-2 bottles per week (3:00).\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours; stress management is essential as stress can raise BP (4:43, 4:50).\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control (3:22).",
          "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests (6:13).\n2. Obtain a home digital BP monitor and record daily morning readings (5:27, 5:37).\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision (6:05).",
          "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes (4:21). Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals.",
          "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
          "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
        },
        "next_review": "2025-10-23 17:00",
        "prescription": [
          {
            "medication_name": "Amlodipine",
            "dosage": "5 mg",
            "route": "Oral",
            "interval": 24,
            "end_date": "2025-11-15",
            "instructions": "Take once daily for blood pressure control (3:56)."
          },
          {
            "medication_name": "Omeprazole",
            "dosage": "20 mg",
            "route": "Oral",
            "interval": 24,
            "end_date": "2025-10-22",
            "instructions": "Take one capsule before breakfast for heartburn (3:56)."
          }
        ],
        "investigation": [
          {
            "test_type": "Fasting Blood Sugar (FBS)",
            "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
            "instructions": "Requires 8-10 hour fast (No food, no drinks other than water) (6:13).",
            "scheduled_time": "2025-10-17 09:00",
            "interval": 0
          },
          {
            "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
            "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
            "instructions": "To be drawn simultaneously with FBS (4:06).",
            "scheduled_time": "2025-10-17 09:00",
            "interval": 0
          },
          {
            "test_type": "Retina Examination (Eye Clinic Referral)",
            "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia (6:05).",
            "instructions": "To be scheduled once blood test results are available.",
            "scheduled_time": "2025-10-23 17:30",
            "interval": 0
          }
        ]
      },
      "processed": true,
      "processed_at": "2025-10-16T15:02:46.814803+00:00"
    },
    "medical_review_id": 13,
    "medical_review_public_id": "c3a1b283-6cd8-4e99-b434-5b87afec2eba",
    "created": "2025-10-16T13:16:21.112559Z",
    "updated": "2025-10-16T15:05:08.950003Z"
  },
  "medical_review_id": 13,
  "medical_review_public_id": "c3a1b283-6cd8-4e99-b434-5b87afec2eba",
  "documentation": {
    "subjective": {
      "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
      "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired. He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest. He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate. Additionally, he reports intermittent blurry vision, especially when driving in the evening. Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work. He drinks beer on weekends and occasionally consumes energy drinks when working late. He experiences heartburn when skipping meals.",
      "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals, polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN)."
    },
    "objective": {
      "examination_findings": "General appearance: Alert and oriented, slightly overweight. Cardiovascular examination findings not explicitly detailed in the audio. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
      "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension).\nWeight: **96 kg** (Noted as high side for height; height not provided for BMI calculation)."
    },
    "assessment": {
      "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
      "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
      "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating.",
      "status": "stable"
    },
    "plan": {
      "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
      "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM.\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily.\n3. **Alcohol:** Limit intake to 1-2 bottles per week.\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours.\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control.",
      "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests.\n2. Obtain a home digital BP monitor and record daily morning readings.\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision.",
      "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes. Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals.",
      "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
      "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
    },
    "next_review": "2025-10-23 17:00",
    "prescription": [
      {
        "medication_name": "Amlodipine",
        "dosage": "5 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-11-15",
        "instructions": "Take once daily for blood pressure control."
      },
      {
        "medication_name": "Omeprazole",
        "dosage": "20 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-10-22",
        "instructions": "Take one capsule before breakfast for heartburn."
      }
    ],
    "investigation": [
      {
        "test_type": "Fasting Blood Sugar (FBS)",
        "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
        "instructions": "Requires 8-10 hour fast (No food, no drinks other than water).",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      },
      {
        "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
        "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
        "instructions": "To be drawn simultaneously with FBS.",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      },
      {
        "test_type": "Retina Examination (Eye Clinic Referral)",
        "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia.",
        "instructions": "To be scheduled once blood test results are available.",
        "scheduled_time": "2025-10-23 17:30",
        "interval": 0
      }
    ]
  },
  "patient_summary": "Your blood pressure is elevated. We'll start medication and monitor your progress. Please reduce salt in your diet and exercise daily. Follow up in 2 weeks."
}
```

### Important Notes
- **Finalization Process**: This endpoint saves the complete medical review and marks the encounter as finalized
- **Patient Creation**: When `create_patient` is true, a new patient record is created with the provided details
- **Patient Communication**: When `send_summary` is true, the `patient_summary` text is sent to the patient via SMS/email
- **Status Change**: Encounter status changes from "documented" to "finalized" after successful completion
- **Medical Review**: The complete SOAP note is saved to the associated MedicalReview record
- **Required Fields**: `note_payload` is always required; patient details are required when creating/sending to patient

### Endpoint
```
GET /in-person-encounters/
```

### Description
Retrieves a list of encounters for the authenticated provider, including existing transcripts and notes for reruns.

### Query Parameters
- `status`: Filter by encounter status (`draft`, `recorded`, `transcribed`, `documented`, `finalized`)
- `patient_id`: Filter by patient profile ID
- `date_from`: Filter encounters from this date (ISO format)
- `date_to`: Filter encounters to this date (ISO format)
- `limit`: Number of results to return (default: 20)
- `offset`: Pagination offset

### Example Request
```
GET /in-person-encounters/?status=transcribed&limit=10
```

### Response
```json
{
  "count": 25,
  "next": "https://service.prestigedelta.com/in-person-encounters/?limit=10&offset=10",
  "previous": null,
  "results": [
    {
      "id": 123,
      "public_id": "550e8400-e29b-41d4-a716-446655440000",
      "patient_id": 456,
      "patient_first_name": "John",
      "patient_last_name": "Doe",
      "encounter_date": "2024-01-15T10:00:00Z",
      "status": "transcribed",
      "audio_recording_url": "https://s3.amazonaws.com/bucket/audio.mp3",
      "google_file_id": "1ABC...XYZ",
      "transcript": [
        {
          "timestamp": "2024-01-15T10:00:05Z",
          "speaker": "doctor",
          "text": "How are you feeling?"
        },
        {
          "timestamp": "2024-01-15T10:00:12Z",
          "speaker": "patient",
          "text": "I've been having chest pains."
        }
      ],
      "transcript_segments": [...],
      "note_payload": {
        "subjective": {...},
        "objective": {...},
        "assessment": {...},
        "plan": {...}
      },
      "summary": "Patient reports chest pain",
      "metadata": {...},
      "medical_review_id": 789,
      "created": "2024-01-15T09:45:00Z",
      "updated": "2024-01-15T10:15:00Z"
    }
  ]
}
```

### Individual Encounter Query
```
GET /in-person-encounters/{public_id}/
```

Returns detailed information about a specific encounter including full transcript and documentation.

---

## 6. Complete Workflow Example

### JavaScript/TypeScript Example

```javascript
// 1. Create encounter
const createEncounter = async (patientData) => {
  const response = await fetch('/in-person-encounters/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      patient_first_name: patientData.firstName,
      patient_last_name: patientData.lastName,
      patient_phone: patientData.phone,
      encounter_date: new Date().toISOString(),
      metadata: {
        chief_complaint: patientData.chiefComplaint
      }
    })
  });
  
  const encounter = await response.json();
  return encounter.public_id; // Use this for subsequent operations
};

// 2. Upload audio (takes 60-90 seconds)
const uploadAudio = async (encounterId, audioFile) => {
  const formData = new FormData();
  formData.append('audio_file', audioFile);
  formData.append('original_format', 'mp3');
  
  const response = await fetch(`/in-person-encounters/${encounterId}/upload-audio/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const result = await response.json();
  
  // Wait for uploads to complete (S3 + Google Files API)
  if (result.s3_upload_pending || result.google_upload_pending) {
    // Poll or wait for completion - UX: Show progress indicator
    await waitForUploads(encounterId);
  }
  
  return result.google_file_id;
};

// 3. Process recording (takes 60-90 seconds)
const processRecording = async (encounterId, existingNote = null, existingTranscript = null) => {
  const requestBody = {
    encounter_public_id: encounterId,
    query: "Create a concise note"
  };
  
  if (existingNote) {
    requestBody.existing_note = existingNote;
  }
  
  if (existingTranscript) {
    requestBody.existing_transcript = existingTranscript;
  }
  
  const response = await fetch(`/ai-processing/process-audio/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  const result = await response.json();
  return result;
};

// 5. Query reviews with existing data
const getReviews = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/provider-reviews/?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.results; // Array of reviews with encounter details
};

// Get most recent encounter from reviews for downstream API requests
const getMostRecentEncounter = async () => {
  const reviews = await getReviews({ limit: 1, hours: 168 }); // Last 7 days
  if (reviews.length > 0) {
    return reviews[0].in_person_encounter; // Return the encounter details
  }
  return null;
};

// Get specific review for documentation/review workflow
const getReviewForDocumentation = async (reviewId) => {
  const response = await fetch(`/provider-reviews/${reviewId}/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const review = await response.json();
  return review; // Complete review with full encounter details for documentation
};

// Documentation Workflow: Use /provider-reviews/{id}/ for review and finalization
const performDocumentationWorkflow = async (reviewId) => {
  // 1. Get the complete review with encounter details
  const review = await getReviewForDocumentation(reviewId);
  
  // 2. Access encounter data for documentation
  const encounter = review.in_person_encounter;
  const transcript = encounter.transcript;
  const existingNotes = encounter.note_payload;
  
  // 3. Perform documentation tasks using the encounter data
  // ... documentation logic here ...
  
  // 4. Finalize using encounter public_id
  await finalizeEncounter(encounter.public_id, finalDocumentation);
};

// Complete workflow (total: up to 3 minutes)
const processEncounter = async (patientData, audioFile) => {
  try {
    // Step 1: Create encounter
    const encounterId = await createEncounter(patientData);
    console.log('Encounter created:', encounterId);
    
    // UX: Show "Preparing encounter..." (instant)
    
    // Step 2: Upload audio (60-90 seconds)
    console.log('Starting audio upload...');
    // UX: Show "Uploading audio recording..." with progress indicator
    const googleFileId = await uploadAudio(encounterId, audioFile);
    console.log('Audio uploaded, Google File ID:', googleFileId);
    
    // Step 3: Process recording (60-90 seconds)
    console.log('Starting audio processing...');
    // UX: Show "Processing audio and generating documentation..." with progress indicator
    const processingResult = await processRecording(encounterId);
    console.log('Processing complete:', processingResult);
    
    // UX: Show "Documentation complete!" with success animation
    
    return processingResult;
  } catch (error) {
    console.error('Error in encounter processing:', error);
    // UX: Show error message with retry option
    throw error;
  }
};
```

---

## Error Handling

### Common HTTP Status Codes
- `400 Bad Request`: Invalid request data or validation error
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: User doesn't have permission for this encounter
- `404 Not Found`: Encounter not found
- `422 Unprocessable Entity`: Business logic validation failed

### Error Response Format
```json
{
  "detail": "Error message",
  "field_errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

---

## Data Structures

### Transcript Segment
```json
{
  "timestamp": "ISO 8601 datetime string",
  "speaker": "doctor|patient|unknown",
  "text": "Transcribed speech content"
}
```

### Documentation Payload (SOAP Format)
```json
{
  "subjective": {
    "chief_complaint": "string",
    "history_of_present_illness": "string",
    "review_of_systems": {...},
    "past_medical_history": {...},
    "medications": [...],
    "allergies": [...]
  },
  "objective": {
    "vital_signs": {...},
    "physical_exam": {...},
    "diagnostic_data": {...}
  },
  "assessment": {
    "primary_diagnosis": "string",
    "differential_diagnoses": [...],
    "problem_list": [...]
  },
  "plan": {
    "diagnostic_plan": [...],
    "therapeutic_plan": [...],
    "patient_education": "string",
    "follow_up": "string"
  }
}
```

---

## 7. Finalize Patient Encounter

### Endpoint
```
POST /in-person-encounters/{public_id}/finalize/
```

### Description
Finalizes a patient encounter by linking it to a patient profile, storing the final documentation, and updating the associated medical review. This endpoint should be called after the encounter has been documented and reviewed.

### Request Body
```json
{
  "note_payload": {
    "subjective": {...},
    "objective": {...},
    "assessment": {...},
    "plan": {...}
  },
  "patient": "optional-patient-profile-id",
  "patient_phone": "optional-phone-number",
  "patient_first_name": "optional-first-name",
  "patient_last_name": "optional-last-name",
  "patient_email": "optional-email",
  "patient_summary": "optional-patient-friendly-summary",
  "metadata": {
    "additional_context": "any additional metadata"
  },
  "send_summary": false,
  "create_patient": true
}
```

### Field Descriptions
- `note_payload`: Required. The complete SOAP documentation payload
- `patient`: Optional. Existing patient profile ID to link the encounter to
- `patient_phone`: Optional. Patient phone number (used to find/create patient)
- `patient_first_name`, `patient_last_name`, `patient_email`: Optional patient information
- `patient_summary`: Optional. Patient-friendly summary text
- `metadata`: Optional. Additional metadata to merge with encounter
- `send_summary`: Boolean. Whether to send summary via WhatsApp (default: false)
- `create_patient`: Boolean. Whether to auto-create patient if not found (default: true)

### Response
```json
{
  "encounter": {
    "id": 123,
    "public_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "finalized",
    "patient_id": 456,
    // ... full encounter data
  },
  "medical_review_id": 789,
  "medical_review_public_id": "660e8400-e29b-41d4-a716-446655440001",
  "documentation": {
    "subjective": {...},
    "objective": {...},
    "assessment": {...},
    "plan": {...}
  },
  "patient_summary": "Patient-friendly summary text"
}
```

### Important Notes
- The encounter status changes to "finalized" after successful completion
- A medical review is created/updated with the final documentation
- Patient information is resolved and linked automatically
- WhatsApp summary can be sent if `send_summary` is true and patient phone is available

---

## 8. Query Medical Reviews

### List Provider's Medical Reviews
```
GET /provider-reviews/
```

### Description
Retrieves a list of medical reviews for the authenticated provider, filtered by time period. Each review includes complete encounter details with transcripts, documentation, and patient information.

**Important**: This endpoint's serializer includes full encounter details in the `in_person_encounter` field. Use the most recent encounter from this endpoint for downstream API requests rather than querying encounters directly.

### Query Parameters
- `hours`: Number of hours to look back (default: 24, max: 168)
- `status`: Filter by review status (`approved`, `pending`, `rejected`)
- `patient_id`: Filter by specific patient ID
- `date_from`: Filter reviews from this date (ISO format)
- `date_to`: Filter reviews to this date (ISO format)
- `limit`: Number of results to return (default: 20)
- `offset`: Pagination offset

### Example Request
```
GET /provider-reviews/?hours=48&status=approved&limit=10
```

### Response
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 789,
      "public_id": "660e8400-e29b-41d4-a716-446655440001",
      "patient": {
        "id": 456,
        "user": {
          "first_name": "John",
          "last_name": "Doe"
        }
      },
      "chief_complaint": "Chest pain",
      "assessment_diagnosis": "Acute coronary syndrome",
      "status": "approved",
      "review_status": "approved",
      "created": "2024-01-15T10:00:00Z",
      "updated": "2024-01-15T11:00:00Z",
      "in_person_encounter": {
        "id": 123,
        "public_id": "550e8400-e29b-41d4-a716-446655440000",
        "encounter_date": "2024-01-15T10:00:00Z",
        "status": "finalized",
        "audio_recording_url": "https://s3.amazonaws.com/bucket/audio.mp3",
        "transcript": [
          {
            "timestamp": "2024-01-15T10:00:05Z",
            "speaker": "doctor",
            "text": "How are you feeling?"
          },
          {
            "timestamp": "2024-01-15T10:00:12Z",
            "speaker": "patient",
            "text": "I've been having chest pains."
          }
        ],
        "note_payload": {
          "subjective": {
            "chief_complaint": "Chest pain",
            "history_of_present_illness": "45-year-old male presents with..."
          },
          "objective": {
            "examination_findings": "Alert and oriented...",
            "investigations": "ECG: Normal sinus rhythm..."
          },
          "assessment": {
            "primary_diagnosis": "Acute coronary syndrome",
            "differential_diagnosis": ["Pulmonary embolism", "Pericarditis"]
          },
          "plan": {
            "management": "Admit for cardiac workup...",
            "follow_up": "Cardiology follow-up in 1 week"
          }
        },
        "summary": "Patient admitted for cardiac evaluation",
        "created": "2024-01-15T09:45:00Z",
        "updated": "2024-01-15T10:15:00Z"
      }
    }
  ]
}
```

### Get Specific Medical Review
```
GET /provider-reviews/{public_id}/
```

### Description
Retrieves detailed information about a specific medical review. **This is the primary endpoint for documentation and review workflows** - it provides complete encounter details including full transcripts, SOAP documentation, and all metadata needed for medical review and finalization.

### Response
```json
{
  "id": 10,
  "public_id": "948cf7d1-579f-447e-94cf-1b82413d292e",
  "patient_full_name": null,
  "doctor_name": "Aibueku Uyi",
  "chief_complaint": "Fever and cough",
  "history_of_present_illness": null,
  "review_of_systems": null,
  "physical_examination_findings": null,
  "investigation_results": null,
  "ai_diagnosis": null,
  "doctor_diagnosis": null,
  "differential_diagnosis": null,
  "diagnosis_reason": null,
  "assessment_diagnosis": null,
  "status": "unknown",
  "ai_management_plan": null,
  "doctor_management_plan": null,
  "management_plan": null,
  "lifestyle_advice": null,
  "patient_education": null,
  "follow_up_plan": null,
  "management_plan_reason": null,
  "treatment_goal": null,
  "health_score": null,
  "follow_up": null,
  "follow_up_at": null,
  "daily_progress_notes": null,
  "discharge_instructions": null,
  "review_status": "pending",
  "report_url": null,
  "pre_report_url": null,
  "pre_report_sent": false,
  "report_sent": false,
  "health_summary_updated": false,
  "send_attempt": 0,
  "session_recording": "https://prestigehealth.s3.amazonaws.com/in_person_encounters/f22cf91c-7ad2-4947-ad1f-a73724c16e1e.mp3",
  "session_conversation": [],
  "doctor_note": {
    "subjective": {
      "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
      "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired. He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest. He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate. Additionally, he reports intermittent blurry vision, especially when driving in the evening. Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work. He drinks beer on weekends and occasionally consumes energy drinks when working late. He experiences heartburn when skipping meals.",
      "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals, polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN)."
    },
    "objective": {
      "examination_findings": "General appearance: Alert and oriented, slightly overweight. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
      "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension).\nWeight: **96 kg** (High side; patient self-reported, weight management advised)."
    },
    "assessment": {
      "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
      "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
      "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating.",
      "status": "stable"
    },
    "plan": {
      "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
      "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM.\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily.\n3. **Alcohol:** Limit intake to 1-2 bottles per week.\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours to mitigate stress, a factor noted to raise BP.\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control.",
      "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests.\n2. Obtain a home digital BP monitor and record daily morning readings.\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision.",
      "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes. Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals. Emphasized the importance of consistency and discipline for potential reversal.",
      "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
      "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
    },
    "next_review": "2025-10-23 17:00",
    "prescription": [
      {
        "medication_name": "Amlodipine",
        "dosage": "5 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-11-15",
        "instructions": "Take once daily for blood pressure control."
      },
      {
        "medication_name": "Omeprazole",
        "dosage": "20 mg",
        "route": "Oral",
        "interval": 24,
        "end_date": "2025-10-22",
        "instructions": "Take one capsule before breakfast for heartburn."
      }
    ],
    "investigation": [
      {
        "test_type": "Fasting Blood Sugar (FBS)",
        "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
        "instructions": "Requires 8-10 hour fast (No food, no drinks other than water). Schedule time is approximate, patient needs to arrive fasting before 9:00 AM.",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      },
      {
        "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
        "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
        "instructions": "To be drawn simultaneously with FBS.",
        "scheduled_time": "2025-10-16 09:00",
        "interval": 0
      },
      {
        "test_type": "Retina Examination (Eye Clinic Referral)",
        "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia.",
        "instructions": "To be scheduled once blood test results are available.",
        "scheduled_time": "2025-10-23 17:30",
        "interval": 0
      }
    ]
  },
  "public_doctor_note": null,
  "template": null,
  "precision_context": null,
  "created": "2025-10-15T16:49:41.222022Z",
  "updated": "2025-10-15T16:49:41.222022Z",
  "conducted_by_ai": false,
  "patient_summary": null,
  "transcribe_session_marker": true,
  "in_person_encounters": [
    {
      "id": 29,
      "public_id": "f22cf91c-7ad2-4947-ad1f-a73724c16e1e",
      "provider_id": 1,
      "patient_first_name": "John",
      "patient_last_name": "Doe",
      "patient_phone": "",
      "patient_email": "",
      "encounter_date": "2025-10-15T17:00:00Z",
      "status": "documented",
      "audio_recording_url": "https://prestigehealth.s3.amazonaws.com/in_person_encounters/f22cf91c-7ad2-4947-ad1f-a73724c16e1e.mp3",
      "transcript": null,
      "transcript_segments": [],
      "note_payload": {
        "organization_id": 1,
        "subjective": {
          "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
          "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired. He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest. He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate. Additionally, he reports intermittent blurry vision, especially when driving in the evening. Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work. He drinks beer on weekends and occasionally consumes energy drinks when working late. He experiences heartburn when skipping meals.",
          "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals, polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN)."
        },
        "objective": {
          "examination_findings": "",
          "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension).\nWeight: **96 kg** (High side; patient self-reported, weight management advised)."
        },
        "assessment": {
          "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
          "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
          "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating.",
          "status": "stable"
        },
        "plan": {
          "management": "",
          "lifestyle_advice": "",
          "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests.\n2. Obtain a home digital BP monitor and record daily morning readings.\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision.",
          "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes. Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals. Emphasized the importance of consistency and discipline for potential reversal.",
          "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
          "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
        },
        "next_review": "",
        "prescription": [],
        "investigation": []
      },
      "summary": "Here is a summary of your consultation and key steps moving forward:\n\n*   \n**Key Findings:** Your blood pressure (BP) and random blood sugar (RBS) were elevated today, suggesting **Hypertension (High BP)** and possibly **Early Diabetes/Pre-diabetes**. We are also treating your **Heartburn (GERD)**.\n\n*   \n**Urgent Next Step (Tomorrow):** You must return **tomorrow morning before 9:00 AM, strictly fasting** (no food, no tea, no gum—**only water is allowed**). We need to perform Fasting Blood Sugar, HbA1c, Cholesterol, and Kidney tests to confirm the diagnosis.\n\n*   \n**Treatment Started:** We have prescribed a **Blood Pressure Tablet (Amlodipine)** and an **Antacid (Omeprazole)**. Please take these exactly as instructed.\n\n*   \n**Lifestyle Changes (Start Now):** To help reverse these conditions, you must:\n    *   \n**Diet:** Avoid heavy meals after 8:00 PM. Cut down significantly on soft drinks, rice, white bread, and *garri*. Increase vegetables and unripe plantain.\n    *   \n**Activity:** Start brisk walking for 20-30 minutes daily.\n    *   \n**Monitoring:** Please purchase a home digital BP monitor and record your BP every morning before breakfast. Bring this record next week.\n\n*   \n**Follow-up:** We will review all your test results and BP records next week on **2025-10-23 at 5:00 PM** to establish a long-term plan, including an Eye Clinic referral for your blurry vision.",
      "metadata": {
        "chief_complaint": "Fever and cough",
        "notes": "Patient presents with acute respiratory symptoms",
        "original_doctor_note": {
          "subjective": {
            "chief_complaint": "Patient presents with generalized weakness and easy fatigability for the past two weeks.",
            "history_of_present_illness": "Patient reports two weeks of generalized weakness and getting easily tired. He experiences occasional palpitations/fast heartbeat when climbing stairs and intermittent mild chest heaviness that resolves with rest. He reports significant polydipsia (keeping a bottle of water by his bed) and nocturia, waking 3-4 times nightly to urinate. Additionally, he reports intermittent blurry vision, especially when driving in the evening. Work involves long hours in logistics, driving, often working from morning till night. He reports eating heavy meals late, often after work. He drinks beer on weekends and occasionally consumes energy drinks when working late. He experiences heartburn when skipping meals.",
            "review_of_systems": "Constitutional: Weakness, fatigue. No fever. Cardiovascular: Palpitations on exertion, intermittent mild chest heaviness resolving with rest. Gastrointestinal: Heartburn when skipping meals, polydipsia. Genitourinary: Nocturia (3-4 times nightly). Ocular: Intermittent blurry vision, especially while driving in the evening. Extremities: Reports shoes feel tight in the evening (suggestive of dependent edema). Family History: Mother has Diabetes Mellitus (DM), Father had Hypertension (HTN)."
          },
          "objective": {
            "examination_findings": "General appearance: Alert and oriented, slightly overweight. No overt pedal edema, but patient reports evening shoe tightness. Physical exam otherwise unremarkable (Not mentioned in audio).",
            "investigations": "Random Blood Sugar (RBS): **182 mg/dL** (Elevated).\nBlood Pressure (BP): **152/96 mmHg** (Elevated, Stage 2 Hypertension).\nWeight: **96 kg** (High side; patient self-reported, weight management advised)."
          },
          "assessment": {
            "primary_diagnosis": "Hypertension (Stage 2).\nEarly Type 2 Diabetes Mellitus / Pre-diabetes (Suspected).\nGERD (Gastroesophageal Reflux Disease).",
            "differential_diagnosis": "Anemia (Fatigue/Weakness), Anxiety/Stress (Palpitations/BP), Early Congestive Heart Failure (DOE/Edema).",
            "diagnosis_reasoning": "Clinical presentation (polyuria, polydipsia, fatigue, blurring vision) combined with a positive family history of DM and HTN, along with objective findings of elevated RBS (182 mg/dL) and elevated BP (152/96 mmHg), strongly suggest emerging Type 2 Diabetes and established Hypertension. The chest heaviness and pedal tightness are likely related to cardiovascular strain. Heartburn is consistent with GERD, exacerbated by late eating.",
            "status": "stable"
          },
          "plan": {
            "management": "1. Initiate treatment for Hypertension with a mild blood pressure tablet (Amlodipine 5mg OD).\n2. Initiate treatment for GERD symptoms with an antacid (Omeprazole 20mg OD).\n3. Schedule comprehensive laboratory investigations for definitive diagnosis.\n4. Commence urgent lifestyle modifications.",
            "lifestyle_advice": "1. **Diet:** Reduce intake of simple carbohydrates and high-glycemic foods (soft drinks, garri, rice, white bread). Increase consumption of vegetables and unripe plantain. Avoid heavy meals after 8:00 PM.\n2. **Exercise:** Start brisk walking, skipping, or jogging for 20-30 minutes daily.\n3. **Alcohol:** Limit intake to 1-2 bottles per week.\n4. **Rest/Stress:** Ensure adequate sleep and take breaks during long working/driving hours to mitigate stress, a factor noted to raise BP.\n5. **Weight Management:** Aim for gradual weight loss (5-10 kg reduction) to improve BP and sugar control.",
            "follow_up": "1. Return tomorrow morning, fasting (no food, no tea, no chewing gum, only water allowed) before 9:00 AM for blood tests.\n2. Obtain a home digital BP monitor and record daily morning readings.\n3. Follow up in one week (2025-10-23) with BP records and laboratory results.\n4. Referral to Eye Clinic will be arranged after lab results are available to check the retina due to reported blurring vision.",
            "patient_education": "Educated patient on the findings (elevated BP and RBS) and the strong possibility of early diabetes, which can be reversible with strict adherence to diet and lifestyle changes. Provided education on the necessity of home BP monitoring and avoiding sugary drinks and late meals. Emphasized the importance of consistency and discipline for potential reversal.",
            "treatment_goal": "Confirmation of Type 2 DM/Pre-diabetes diagnosis; achievement of target BP (<130/80 mmHg); weight reduction; and symptom resolution (fatigue, palpitations, heartburn, nocturia).",
            "plan_reasoning": "Rapid diagnostic confirmation (FBS, HbA1c) is necessary to determine the level of glycemic control required. Treatment with low-dose HTN medication addresses immediate cardiac risk. Lifestyle changes are the cornerstone for managing both pre-diabetes and HTN, aiming for reversal where possible. Antacid addresses acute GERD symptoms. Eye referral addresses diabetic complication screening."
          },
          "next_review": "2025-10-23 17:00",
          "prescription": [
            {
              "medication_name": "Amlodipine",
              "dosage": "5 mg",
              "route": "Oral",
              "interval": 24,
              "end_date": "2025-11-15",
              "instructions": "Take once daily for blood pressure control."
            },
            {
              "medication_name": "Omeprazole",
              "dosage": "20 mg",
              "route": "Oral",
              "interval": 24,
              "end_date": "2025-10-22",
              "instructions": "Take one capsule before breakfast for heartburn."
            }
          ],
          "investigation": [
            {
              "test_type": "Fasting Blood Sugar (FBS)",
              "reason": "Confirming suspected diabetes/pre-diabetes following elevated RBS (182 mg/dL) and classic symptoms.",
              "instructions": "Requires 8-10 hour fast (No food, no drinks other than water). Schedule time is approximate, patient needs to arrive fasting before 9:00 AM.",
              "scheduled_time": "2025-10-16 09:00",
              "interval": 0
            },
            {
              "test_type": "HbA1c, Lipid Profile, Renal Function Test (RFT)",
              "reason": "Assessing long-term glucose control, cardiovascular risk, and kidney function, crucial for HTN/DM diagnosis and management.",
              "instructions": "To be drawn simultaneously with FBS.",
              "scheduled_time": "2025-10-16 09:00",
              "interval": 0
            },
            {
              "test_type": "Retina Examination (Eye Clinic Referral)",
              "reason": "Screening for diabetic retinopathy due to reported intermittent blurry vision and potential hyperglycemia.",
              "instructions": "To be scheduled once blood test results are available.",
              "scheduled_time": "2025-10-23 17:30",
              "interval": 0
            }
          ]
        },
        "processed": true,
        "processed_at": "2025-10-15T18:12:16.508426+00:00"
      },
      "medical_review_id": 10,
      "medical_review_public_id": "948cf7d1-579f-447e-94cf-1b82413d292e",
      "created": "2025-10-15T16:49:41.238026Z",
      "updated": "2025-10-15T18:12:16.508426Z"
    }
  ],
  "is_finalized": false
}

### Field Descriptions
- `count`: Total number of reviews matching the query
- `next`: URL for next page of results (null if no more pages)
- `previous`: URL for previous page of results (null if first page)
- `results[]`: Array of medical review objects
- `results[].id`: Internal review ID
- `results[].public_id`: Public UUID for the review (use this for API calls)
- `results[].patient.id`: Patient's internal ID
- `results[].patient.user.first_name`: Patient's first name
- `results[].patient.user.last_name`: Patient's last name
- `results[].patient.user.phone_number`: Patient's phone number
- `results[].patient.date_of_birth`: Patient's date of birth (ISO format)
- `results[].patient.gender`: Patient's gender
- `results[].patient.subscription_status`: Patient's subscription status
- `results[].in_person_encounter.id`: Encounter's internal ID
- `results[].in_person_encounter.status`: Current status of the encounter (draft, recorded, transcribed, documented, finalized)
- `results[].in_person_encounter.encounter_date`: Date and time of the encounter (ISO format)
- `results[].in_person_encounter.transcript`: Full text transcript of the encounter
- `results[].in_person_encounter.documentation`: Structured medical documentation object
- `results[].in_person_encounter.documentation.assistant_response`: AI-generated clinical summary
- `results[].in_person_encounter.documentation.patient_summary`: Patient-friendly summary
- `results[].in_person_encounter.documentation.investigations`: Investigation findings
- `results[].in_person_encounter.documentation.primary_diagnosis`: Primary diagnosis
- `results[].in_person_encounter.documentation.management`: Treatment plan
- `results[].in_person_encounter.documentation.lifestyle_advice`: Lifestyle recommendations
- `results[].in_person_encounter.documentation.follow_up`: Follow-up instructions
- `results[].in_person_encounter.documentation.prescription[]`: Array of prescribed medications
- `results[].in_person_encounter.documentation.investigation[]`: Array of ordered investigations
- `results[].in_person_encounter.processed`: Whether the encounter has been processed
- `results[].in_person_encounter.processed_at`: Timestamp when processing completed (ISO format)
- `results[].medical_review_id`: Internal medical review ID
- `results[].medical_review_public_id`: Public UUID for the medical review
- `results[].created`: Review creation timestamp (ISO format)
- `results[].updated`: Review last update timestamp (ISO format)
- `is_finalized`: Boolean indicating if any encounter in the results has been finalized (true if at least one encounter has status 'finalized')

---

## 9. Provider Dashboard

### Endpoint
```
GET /providerdashboard/
```

### Description
Retrieves a comprehensive dashboard for the authenticated provider, including consultation rates, expected payout, and patient information with activity metrics.

### Response
```json
{
  "provider_info": {
    "consultation_rate": 5000.00,
    "currency": "NGN",
    "expected_monthly_payout": 3500.00,
    "active_subscribed_patients_count": 8,
    "pending_subscribed_patients_count": 3
  },
  "patients": [
    {
      "id": 456,
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1234567890"
      },
      "recent_reviews_count": 2,
      "active_care_plan_metrics_count": 5,
      "recent_metric_records_count": 12,
      "pending_ai_review_count": 1,
      "subscription_status": "active",
      "last_encounter_date": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Field Descriptions
- `provider_info.consultation_rate`: Provider's consultation fee
- `provider_info.expected_monthly_payout`: 70% of total active subscription revenue
- `provider_info.active_subscribed_patients_count`: Patients with non-expired subscriptions
- `provider_info.pending_subscribed_patients_count`: Patients with expired subscriptions
- `patients[].recent_reviews_count`: Medical reviews in last 30 days
- `patients[].active_care_plan_metrics_count`: Active metrics in remote care plan
- `patients[].recent_metric_records_count`: Metric readings in last 30 days
- `patients[].pending_ai_review_count`: Pending AI-generated reviews

---

## 10. Provider Patients

### Endpoint
```
GET /provider/patients/
```

### Description
Retrieves a list of patients associated with the authenticated provider, with optional filtering by subscription status.

### Query Parameters
- `subscription_status`: Filter by status (`active`, `pending`, `both`, `all`) - default: `all`

### Example Request
```
GET /provider/patients/?subscription_status=active
```

### Response
```json
{
  "count": 15,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 456,
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1234567890"
      },
      "doctor": {
        "id": 123,
        "user": {
          "first_name": "Dr. Jane",
          "last_name": "Smith"
        }
      },
      "chronic_conditions": ["Hypertension", "Diabetes"],
      "last_encounter_date": "2024-01-15T10:00:00Z",
      "subscription_status": "active",
      "subscription_end_date": "2024-02-15T00:00:00Z"
    }
  ]
}
```

### Important Notes
- `subscription_status` can be: `active` (is_active=True), `pending` (is_active=False), `both`, or `all`
- Results are ordered by most recent patient ID
- Includes patient profile information and subscription details

---

## Best Practices

1. **Use `/provider-reviews/` for encounter data**: The `/provider-reviews/` endpoint includes complete encounter details in the `in_person_encounter` field. Use this for downstream API requests instead of querying encounters directly.
2. **Documentation happens in review detail view**: Use `GET /provider-reviews/{public_id}/` for complete review workflows including transcripts, existing documentation, and finalization.
3. **Always check upload status**: Wait for both S3 and Google uploads to complete before processing
4. **Handle large transcripts**: Transcripts can be lengthy; implement pagination if displaying in UI
5. **Validate audio files**: Check file size and format before upload
6. **Implement retry logic**: Network requests may fail; implement appropriate retry mechanisms
7. **Cache encounter data**: Store encounter information locally to reduce API calls
8. **Monitor processing status**: Use the encounter status field to track workflow progress

---

## Rate Limiting

- Audio upload: 10 requests per minute per user
- Processing requests: 5 requests per minute per user
- General queries: 100 requests per minute per user

---

## Support

For technical support or questions about this API, please contact the development team.</content>
<parameter name="filePath">c:\Users\user\OneDrive\Documents\PRESTIGE_HEALTH\PRESTIGEHEALTH\CLIENT_DOCUMENTATION_API.md
