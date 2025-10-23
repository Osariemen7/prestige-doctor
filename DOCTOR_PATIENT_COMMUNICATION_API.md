# Doctor-Patient Messaging API Documentation

This guide explains how to build a doctor-facing messaging experience on top of the Prestige Health provider APIs. It covers the full flow from creating patients to retrieving conversations and sending WhatsApp messages (text and media) using the current provider messaging endpoints.

## Base URL

```
https://service.prestigehealth.com/
```

## Authentication

All endpoints require JWT authentication. Include the token in every request:

```
Authorization: Bearer <jwt_token>
```

---

## 1. Patient Management

### 1.1 Create a patient profile

**Endpoint:** `POST /appointments/create-patient/`

Creates (or reuses) a patient for the authenticated doctor. The API automatically links the patient to the doctor’s organization. If `phone_number` is omitted a dummy number is allocated.

**Request**

```json
{
  "phone_number": "+2348012345678",   // optional
  "first_name": "John",              // required
  "last_name": "Doe",               // required
  "chronic_conditions": ["Hypertension", "Diabetes"],   // optional
  "notes": "Prefers evening appointments"               // optional
}
```

**Success (200)**

```json
{
  "patient_id": 123,
  "user_id": 456,
  "phone_number": "+2348012345678",
  "first_name": "John",
  "last_name": "Doe",
  "organization_id": 21,
  "added_by_doctor_id": 9,
  "created": true
}
```

**Common validation errors (400)**

```json
{
  "error": "first_name and last_name are required."
}
```

### 1.2 List all patients visible to the doctor

**Endpoint:** `GET /providermessages/all-patients/`

Returns every patient the doctor can message (subscribed members, directly added patients, demo patients, etc.).

**Success (200)**

```json
[
  {
    "patient_id": 123,
    "patient_name": "John Doe",
    "patient_phone": "+2348012345678",
    "subscription_status": "active",
    "subscription_id": 991
  },
  {
    "patient_id": 124,
    "patient_name": "Ada Lovelace",
    "patient_phone": "+2348098765432",
    "subscription_status": null,
    "subscription_id": null
  }
]
```

Use this list to populate patient selectors in the doctor UI.

---

## 2. Conversation Retrieval

All doctor-to-patient conversations are surfaced through the `ProviderMessageViewSet`. The endpoints return `GPTThread` objects, each containing the latest messages so the frontend can render an inbox-like experience.

### 2.1 Fetch the doctor’s active threads

**Endpoint:** `GET /providermessages/`

Returns the most recent `GPTThread` for each patient assigned to (or recently contacted by) the authenticated doctor. The default list is limited to the past seven days and includes nested message history.

**Success (200)**

```json
[
  {
    "id": 501,
    "public_id": "8f03b95b-2b7b-493d-9d13-5cf7d7d92ad8",
    "patient": 123,
    "patient_name": "John Doe",
    "messages": [
      {
        "message_id": 9001,
        "role": "user",
        "message_value": "My blood pressure was high this morning",
        "media_url": null,
        "media_type": null,
        "created": "2025-10-21T07:45:33Z",
        "from_doctor": false
      },
      {
        "message_id": 9002,
        "role": "assistant",
        "message_value": "Thanks for the update. Please take a reading again at noon and let me know.",
        "media_url": null,
        "media_type": null,
        "created": "2025-10-21T08:02:11Z",
        "from_doctor": true
      }
    ],
    "responder_provider_name": "Dr. Smith",
    "responder_provider_id": 9,
    "created": "2025-10-20T11:14:52Z",
    "updated": "2025-10-21T08:02:11Z"
  }
]
```

### 2.2 Fetch organization threads (triage queue)

**Endpoint:** `GET /providermessages/organization-threads/`

Returns all threads for the doctor’s organization (again limited to recent days). Threads assigned to the requesting doctor are returned first, followed by unassigned threads so the UI can implement a “pick up conversation” experience.

### 2.3 Fetch a single thread with full history

**Endpoint:** `GET /providermessages/{public_id}/`

Use the thread `public_id` from the list response. The payload mirrors the structure above but may contain a longer message history. This endpoint is handy when the doctor opens an existing conversation and you need more than the most recent messages bundled in the list view.

---

## 3. Messaging Workflows

### 3.1 Preview a template message

**Endpoint:** `POST /providermessages/preview-template-message/`

Generates the WhatsApp content that would be delivered using the current doctor template configuration. The message is not sent—use this for UI previews or validation.

**Request**

```json
{
  "patient_id": 123,
  "custom_snippet": "I'd like to check how you're doing after yesterday's visit."
}
```

**Success (200)**

```json
{
  "success": true,
  "preview": {
    "message": "Hi John Doe, this is Dr. Smith. I'd like to check how you're doing after yesterday's visit. If you have any questions, you can respond to this message. Thank you!",
    "template_used": "doctor_check_in",
    "patient_name": "John Doe",
    "doctor_name": "Dr. Smith",
    "recipient_phone": "+2348012345678"
  }
}
```

### 3.2 Send a template message (start a WhatsApp conversation)

**Endpoint:** `POST /providermessages/send-template-message/`

Initiates a WhatsApp template send to the patient. This is required for the first outbound message because WhatsApp requires pre-approved templates when starting a conversation window.

**Request**

```json
{
  "patient_id": 123,
  "custom_snippet": "I'd like to check how you're doing after yesterday's visit."
}
```

**Success (200)**

```json
{
  "success": true,
  "message": "Template message sent successfully",
  "conversation_type": "new",
  "public_id": "8f03b95b-2b7b-493d-9d13-5cf7d7d92ad8",
  "thread_id": 501,
  "message_id": 9123,
  "template_used": "doctor_check_in"
}
```

Store the returned `public_id` and `thread_id`; they are needed to continue the conversation with freeform messages.

### 3.3 Continue an existing thread (text and media)

**Endpoint:** `POST /providermessages/send-message/`

Sends a WhatsApp message (text and/or media) into an existing conversation thread. The request **must** include the `public_id` the doctor is replying to.

**Body fields**

| Field | Required | Description |
|-------|----------|-------------|
| `public_id` | Yes | The conversation identifier returned by the template message or threads list |
| `message` | Conditional | Text body. Required unless `media_url` is provided |
| `media_url` | Conditional | HTTPS link to an uploaded asset (see upload endpoints) |
| `media_type` | Conditional | Must be one of `image`, `video`, `audio`, `document` when `media_url` is provided |
| `media_filename` | No | Friendly filename shown on WhatsApp for documents |
| `media_mime_type` | No | MIME type hint (e.g. `application/pdf`) |

**Examples**

*Text-only*

```json
{
  "public_id": "8f03b95b-2b7b-493d-9d13-5cf7d7d92ad8",
  "message": "Please take another reading tomorrow morning and update me here."
}
```

*Document with caption*

```json
{
  "public_id": "8f03b95b-2b7b-493d-9d13-5cf7d7d92ad8",
  "message": "Here is your updated prescription.",
  "media_url": "https://cdn.prestigehealth.app/uploads/prescription-123.pdf",
  "media_type": "document",
  "media_filename": "prescription-123.pdf",
  "media_mime_type": "application/pdf"
}
```

**Success (200)**

```json
{
  "success": true,
  "message": "Message sent successfully",
  "conversation_type": "existing",
  "public_id": "8f03b95b-2b7b-493d-9d13-5cf7d7d92ad8",
  "thread_id": 501,
  "message_id": 9155,
  "media_url": "https://cdn.prestigehealth.app/uploads/prescription-123.pdf",
  "media_type": "document",
  "media_type_display": "Document"
}
```

**Validation errors (400)**

- Missing `public_id`
- Missing both `message` and `media_url`
- `media_url` provided without `media_type`
- Unsupported `media_type`

### Media upload helper endpoints

Use the existing upload endpoints before calling `send-message`:

- `POST /ai-processing/upload-file/`

#### Upload File

**Endpoint:** `POST /ai-processing/upload-file/`

Upload a file to both S3 and Google Files storage. The endpoint automatically categorizes the file and returns URLs and metadata for use in messaging.

Upload a file to both S3 and Google Files storage. The endpoint automatically categorizes the file and returns URLs and metadata for use in messaging.

**Request**

Upload a file using `multipart/form-data`:

```
Content-Type: multipart/form-data

file: <binary file data>
```

**Success Response (200 OK)**

```json
{
  "success": true,
  "unique_id": "abc123-def456-ghi789",
  "s3_url": "https://prestigehealth.s3.amazonaws.com/uploads/abc123-def456-ghi789.jpg",
  "file_info": {
    "category": "image",
    "extension": "jpg",
    "size": 245760,
    "mime_type": "image/jpeg"
  },
  "upload_status": {
    "s3_success": true,
    "google_success": true,
    "overall_success": true
  },
  "google_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
}
```

**Response Fields:**

- `success`: Boolean indicating overall success
- `unique_id`: Unique identifier for the uploaded file
- `s3_url`: S3 URL of the uploaded file (use as `media_url` in send-message)
- `file_info.category`: File category (`audio`, `document`, `video`, `image`)
- `file_info.extension`: File extension
- `file_info.size`: File size in bytes
- `file_info.mime_type`: MIME type of the file
- `upload_status.s3_success`: Whether S3 upload succeeded
- `upload_status.google_success`: Whether Google Files upload succeeded
- `upload_status.overall_success`: Whether both uploads succeeded
- `google_file_id`: Google Files ID (only included if Google upload succeeded)

**Error Response (400 Bad Request)**

```json
{
  "error": "No file provided"
}
```

The server responds with an `s3_url`; pass that value as `media_url` in the send-message call. Use `file_info.category` to determine the appropriate `media_type` for WhatsApp messaging.

---

## 4. Messaging Modes

The WhatsApp integration currently supports the following delivery types via `send-message`:

- **Text**: plain doctor instructions or follow-ups.
- **Image**: JPEG/PNG for lab results, wound photos, etc.
- **Video**: patient education clips (keep under the WhatsApp size limit).
- **Audio**: voice notes from the doctor.
- **Document**: PDFs or other files that benefit from a filename display.

Always validate media size and type before uploading to avoid runtime errors.

---

## 5. Frontend Integration Blueprint (React)

Below is a reference implementation that ties the endpoints together. The pattern uses simple polling (no WebSockets) for message refreshes.

```javascript
// api/providerMessagingClient.js

const BASE_URL = 'https://service.prestigehealth.com';

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  'Content-Type': 'application/json'
});

export async function createPatient(payload) {
  const res = await fetch(`${BASE_URL}/appointments/create-patient/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function listPatients() {
  const res = await fetch(`${BASE_URL}/providermessages/all-patients/`, {
    headers: authHeaders()
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function listThreads() {
  const res = await fetch(`${BASE_URL}/providermessages/`, {
    headers: authHeaders()
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getThread(threadId) {
  const res = await fetch(`${BASE_URL}/providermessages/${threadId}/`, {
    headers: authHeaders()
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function previewTemplate(patientId, snippet) {
  const res = await fetch(`${BASE_URL}/providermessages/preview-template-message/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ patient_id: patientId, custom_snippet: snippet })
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function sendTemplateMessage(patientId, snippet) {
  const res = await fetch(`${BASE_URL}/providermessages/send-template-message/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ patient_id: patientId, custom_snippet: snippet })
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function sendFreeformMessage(payload) {
  const res = await fetch(`${BASE_URL}/providermessages/send-message/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}
```

```javascript
// hooks/useProviderMessaging.js

import { useEffect, useState, useCallback } from 'react';
import {
  listPatients,
  listThreads,
  getThread,
  previewTemplate,
  sendTemplateMessage,
  sendFreeformMessage
} from '../api/providerMessagingClient';

const POLL_INTERVAL_MS = 30000;

export function useProviderMessaging() {
  const [patients, setPatients] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshThreads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listThreads();
      setThreads(data);
      if (selectedThread) {
        const fresh = data.find((t) => t.id === selectedThread.id);
        if (fresh) setSelectedThread(fresh);
      }
    } catch (err) {
      setError(err.error || 'Unable to load conversations');
    } finally {
      setLoading(false);
    }
  }, [selectedThread]);

  useEffect(() => {
    listPatients().then(setPatients).catch(() => {});
    refreshThreads();
    const handle = setInterval(() => refreshThreads(), POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [refreshThreads]);

  const openThread = async (threadId) => {
    try {
      setLoading(true);
      const data = await getThread(threadId);
      setSelectedThread(data);
    } catch (err) {
      setError(err.error || 'Unable to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendTemplate = async (patientId, snippet) => {
    const result = await sendTemplateMessage(patientId, snippet);
    await refreshThreads();
    return result;
  };

  const sendMessage = async ({ public_id, message, media_url, media_type, media_filename, media_mime_type }) => {
    const payload = { public_id };
    if (message) payload.message = message;
    if (media_url) payload.media_url = media_url;
    if (media_type) payload.media_type = media_type;
    if (media_filename) payload.media_filename = media_filename;
    if (media_mime_type) payload.media_mime_type = media_mime_type;

    await sendFreeformMessage(payload);
    await refreshThreads();
  };

  return {
    patients,
    threads,
    selectedThread,
    loading,
    error,
    previewTemplate,
    sendTemplate,
    sendMessage,
    openThread,
    refreshThreads
  };
}
```

### UI guidance

- Use the patient list to pick a recipient, then preview and send a template message to open the conversation window.
- Persist the returned `public_id` so follow-up messages can be sent without re-initiating a template.
- Poll `GET /providermessages/` or `GET /providermessages/{public_id}/` in the background to keep the conversation up to date (no WebSocket channel is required).
- Display media thumbnails or download links based on the `media_type` returned in each message.

---

## 6. Error Handling Cheat Sheet

| HTTP Code | Meaning | Typical Cause |
|-----------|---------|---------------|
| 400 | Bad Request | Missing required fields, unsupported media type |
| 401 | Unauthorized | Missing/expired JWT |
| 403 | Forbidden | Doctor lacks access to the patient/thread |
| 404 | Not Found | Unknown `public_id` or patient |
| 429 | Too Many Requests | Hitting internal rate limits (retry with backoff) |

Implement toast notifications or inline validation messages so doctors understand why a message failed.

---

## 7. Implementation Checklist

1. Authenticate the provider and store the JWT securely.
2. Call `GET /providermessages/all-patients/` to populate selectors.
3. Allow doctors to preview and send template messages to start conversations.
4. Use `GET /providermessages/` (and optionally `/organization-threads/`) to render the inbox.
5. For active threads, send follow-up text or media using `POST /providermessages/send-message/`.
6. Poll for updates every 20–30 seconds, or provide a manual refresh button.
7. Surface errors gracefully and encourage doctors to retry failed sends.

Following the steps above gives the frontend everything needed to deliver a polished doctor-to-patient messaging experience on WhatsApp without introducing WebSocket complexity or legacy GPT thread endpoints.
# Doctor-Patient Communication Interface API Documentation

## Overview

This documentation provides a comprehensive guide for building a client-side interface that enables doctors to communicate with patients through a hybrid AI-human system. The interface supports patient creation, conversation management, message sending, and responder switching between AI assistants and human doctors.

## Base URL
```
https://service.prestigehealth.com/
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Patient Management

### 1.1 Create Patient
**Endpoint:** `POST /appointments/create-patient/`

Creates a new patient profile associated with the authenticated doctor.

**Request Body:**
```json
{
  "phone_number": "+2348012345678",  // Optional: if not provided, creates dummy user
  "first_name": "John",              // Required
  "last_name": "Doe",                // Required
  "chronic_conditions": [            // Optional: array of chronic conditions
    "Hypertension",
    "Diabetes"
  ]
}
```

**Response (Success - 200):**
```json
{
  "patient_id": 123,
  "user_id": 456,
  "phone_number": "+2348012345678",
  "first_name": "John",
  "last_name": "Doe",
  "chronic_conditions": ["Hypertension", "Diabetes"],
  "organization_id": 789,
  "added_by_doctor_id": 101,
  "created": true
}
```

**Response (Error - 400):**
```json
{
  "error": "first_name and last_name are required."
}
```

### 1.2 Get All Patients
**Endpoint:** `GET /providermessages/all-patients/`

Retrieves all patients associated with the authenticated provider (subscribed, added_by_doctor, etc.).

**Response (Success - 200):**
```json
[
  {
    "patient_id": 123,
    "patient_name": "John Doe",
    "patient_phone": "+2348012345678",
    "subscription_status": "active",    // "active", "pending", or null
    "subscription_id": 456             // null if no subscription
  },
  {
    "patient_id": 124,
    "patient_name": "Jane Smith",
    "patient_phone": "+2348098765432",
    "subscription_status": null,        // Patient added by doctor but no subscription
    "subscription_id": null
  }
]
```

---

## 2. Conversation Management

### 2.1 Get Conversation List
**Endpoint:** `GET /patient-threads/`

Retrieves all conversation threads for the authenticated user's patients, ordered by most recently updated.

**Response (Success - 200):**
```json
{
  "doctor": {
    "id": 101,
    "name": "Dr. Smith",
    "specialty": "General Practice",
    "phone": "+2348012345678"
  },
  "threads": [
    {
      "id": 201,
      "public_id": "abc-123-def",
      "interlocutor": 301,
      "interlocutor_name": "John Doe",
      "interlocutor_phone": "+2348012345678",
      "patient_id": 123,
      "doctor_id": 101,
      "responder_provider_name": "Dr. Smith",
      "responder_provider_id": 101,
      "created": "2024-10-20T10:00:00Z",
      "updated": "2024-10-22T14:30:00Z",
      "responding": false,
      "responder": "assistant",  // "assistant", "doctor", or "human_staff"
      "messages": [
        {
          "message_id": "msg_123",
          "thread": 201,
          "role": "user",
          "message_value": "I have a headache",
          "image": null,
          "created": "2024-10-22T14:25:00Z"
        },
        {
          "message_id": "msg_124",
          "thread": 201,
          "role": "assistant",
          "message_value": "I'm sorry to hear you're experiencing a headache. Can you tell me more about it?",
          "image": null,
          "created": "2024-10-22T14:26:00Z"
        }
      ],
      "task_public_id": null,
      "task_status": null,
      "task_title": null,
      "task_objective": null,
      "task_objective_completed": null,
      "task_objective_completed_at": null,
      "task_next_check_in_at": null,
      "task_next_check_in_summary": null,
      "task_checklist": null
    }
  ]
}
```

### 2.2 Get Individual Conversation
**Endpoint:** `GET /patient-threads/{thread_id}/`

Retrieves a specific conversation thread with all its messages.

**Response (Success - 200):**
```json
{
  "id": 201,
  "public_id": "abc-123-def",
  "interlocutor": 301,
  "interlocutor_name": "John Doe",
  "interlocutor_phone": "+2348012345678",
  "patient_id": 123,
  "doctor_id": 101,
  "responder_provider_name": "Dr. Smith",
  "responder_provider_id": 101,
  "created": "2024-10-20T10:00:00Z",
  "updated": "2024-10-22T14:30:00Z",
  "responding": false,
  "responder": "assistant",
  "messages": [
    {
      "message_id": "msg_123",
      "thread": 201,
      "role": "user",
      "message_value": "I have a headache that started this morning",
      "image": null,
      "created": "2024-10-22T14:25:00Z"
    },
    {
      "message_id": "msg_124",
      "thread": 201,
      "role": "assistant",
      "message_value": "I'm sorry to hear you're experiencing a headache. Can you tell me more about the intensity and any other symptoms?",
      "image": null,
      "created": "2024-10-22T14:26:00Z"
    },
    {
      "message_id": "msg_125",
      "thread": 201,
      "role": "user",
      "message_value": "It's moderate and I feel nauseous too",
      "image": null,
      "created": "2024-10-22T14:27:00Z"
    }
  ],
  "task_public_id": null,
  "task_status": null,
  "task_title": null,
  "task_objective": null,
  "task_objective_completed": null,
  "task_objective_completed_at": null,
  "task_next_check_in_at": null,
  "task_next_check_in_summary": null,
  "task_checklist": null
}
```

---

## 3. Message Sending

### 3.1 Send Message in Conversation
**Endpoint:** `POST /gpt-threads/{thread_id}/send-message/`

Sends a message in an existing conversation thread. Only the assigned responder provider can send messages.

**Request Body:**
```json
{
  "message": "Please take 2 tablets of paracetamol every 6 hours and rest. Call me if symptoms worsen."
}
```

**Response (Success - 200):**
```json
{
  "status": "Message sent"
}
```

**Response (Error - 403):**
```json
{
  "error": "Not authorized to send messages in this thread"
}
```

**Response (Error - 400):**
```json
{
  "error": "Message is required"
}
```

### 3.2 Start New Conversation with Patient
**Endpoint:** `POST /patient-threads/send/`

Creates a new conversation thread with a patient and sends the first message.

**Request Body:**
```json
{
  "patient_id": 123,                    // Required: Patient ID
  "query": "Hello, how are you feeling today?",  // Required: Message content
  "responder": "doctor",                // Optional: "assistant" (default) or "doctor"
  "daily_report": false,                // Optional: Generate daily report
  "expertise_level": "medium"           // Optional: "low", "medium", "high"
}
```

**Response (Success - 200):**
```json
{
  "thread_id": 201,
  "public_id": "abc-123-def",
  "message": "Hello, how are you feeling today?",
  "responder": "doctor",
  "patient_id": 123,
  "created": "2024-10-22T15:00:00Z"
}
```

---

## 4. Responder Switching

### 4.1 Switch Conversation Responder
**Endpoint:** `POST /patient-threads/{thread_id}/switch-responder/`

Switches who responds to messages in a conversation (AI assistant ↔ human doctor).

**Request Body (Switch to Doctor):**
```json
{
  "responder": "doctor",
  "provider_id": 101,                    // Required when switching to doctor
  "send_handoff_message": true,          // Optional: Send handoff message to patient
  "handoff_message": "I'm taking over this conversation to provide personalized care."  // Optional
}
```

**Request Body (Switch to AI Assistant):**
```json
{
  "responder": "assistant",
  "objective_completed": true,           // Optional: Mark objective as completed
  "send_handoff_message": true,          // Optional: Send handoff message to patient
  "handoff_message": "I'll let our AI assistant continue helping you."  // Optional
}
```

**Request Body (Switch to Human Staff):**
```json
{
  "responder": "human_staff",
  "provider_id": 102,                    // Required when switching to human_staff
  "send_handoff_message": true,
  "handoff_message": "Transferring you to our support staff."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Switched to doctor responder",
  "previous_responder": "assistant",
  "current_responder": "doctor",
  "responder_provider_id": 101,
  "responder_provider_name": "Dr. Smith"
}
```

**Response (Error - 400):**
```json
{
  "error": "doctor_assignment_required",
  "detail": "provider_id is required when switching to doctor responder."
}
```

---

## 5. Implementation Guide

### 5.1 Frontend Architecture

```javascript
// Example React/JavaScript implementation structure

class DoctorCommunicationInterface {
  constructor(apiBaseUrl, authToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.authToken = authToken;
  }

  // Authentication header for all requests
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Patient Management
  async createPatient(patientData) {
    const response = await fetch(`${this.apiBaseUrl}/appointments/create-patient/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(patientData)
    });
    return response.json();
  }

  async getAllPatients() {
    const response = await fetch(`${this.apiBaseUrl}/providermessages/all-patients/`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Conversation Management
  async getConversationList() {
    const response = await fetch(`${this.apiBaseUrl}/patient-threads/`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async getConversation(threadId) {
    const response = await fetch(`${this.apiBaseUrl}/patient-threads/${threadId}/`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Message Sending
  async sendMessage(threadId, message) {
    const response = await fetch(`${this.apiBaseUrl}/gpt-threads/${threadId}/send-message/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message })
    });
    return response.json();
  }

  async startNewConversation(patientId, message, options = {}) {
    const payload = {
      patient_id: patientId,
      query: message,
      responder: options.responder || 'assistant',
      daily_report: options.dailyReport || false,
      expertise_level: options.expertiseLevel || 'medium'
    };

    const response = await fetch(`${this.apiBaseUrl}/patient-threads/send/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  // Responder Switching
  async switchResponder(threadId, responderConfig) {
    const response = await fetch(`${this.apiBaseUrl}/patient-threads/${threadId}/switch-responder/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(responderConfig)
    });
    return response.json();
  }
}
```

### 5.2 UI Components

#### Patient List Component
```jsx
function PatientList({ patients, onSelectPatient }) {
  return (
    <div className="patient-list">
      {patients.map(patient => (
        <div
          key={patient.patient_id}
          className="patient-item"
          onClick={() => onSelectPatient(patient)}
        >
          <div className="patient-name">{patient.patient_name}</div>
          <div className="patient-phone">{patient.patient_phone}</div>
          <div className={`subscription-status ${patient.subscription_status || 'no-subscription'}`}>
            {patient.subscription_status || 'Added by Doctor'}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Conversation List Component
```jsx
function ConversationList({ threads, onSelectThread }) {
  return (
    <div className="conversation-list">
      {threads.map(thread => (
        <div
          key={thread.id}
          className="conversation-item"
          onClick={() => onSelectThread(thread)}
        >
          <div className="patient-name">{thread.interlocutor_name}</div>
          <div className="last-message">
            {thread.messages[thread.messages.length - 1]?.message_value?.substring(0, 50)}...
          </div>
          <div className="responder-badge">
            Responder: {thread.responder}
          </div>
          <div className="timestamp">
            {new Date(thread.updated).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Message Thread Component
```jsx
function MessageThread({ thread, onSendMessage, onSwitchResponder }) {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(thread.id, newMessage);
      setNewMessage('');
    }
  };

  const handleSwitchToDoctor = () => {
    onSwitchResponder(thread.id, {
      responder: 'doctor',
      provider_id: 101, // Current doctor's ID
      send_handoff_message: true,
      handoff_message: 'I\'m taking over this conversation to provide personalized care.'
    });
  };

  const handleSwitchToAI = () => {
    onSwitchResponder(thread.id, {
      responder: 'assistant',
      send_handoff_message: true,
      handoff_message: 'I\'ll let our AI assistant continue helping you.'
    });
  };

  return (
    <div className="message-thread">
      <div className="thread-header">
        <h3>{thread.interlocutor_name}</h3>
        <div className="responder-controls">
          <span>Current Responder: {thread.responder}</span>
          {thread.responder === 'assistant' ? (
            <button onClick={handleSwitchToDoctor}>Take Over</button>
          ) : (
            <button onClick={handleSwitchToAI}>Delegate to AI</button>
          )}
        </div>
      </div>

      <div className="messages">
        {thread.messages.map(message => (
          <div key={message.message_id} className={`message ${message.role}`}>
            <div className="message-content">{message.message_value}</div>
            <div className="message-timestamp">
              {new Date(message.created).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="message-input">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
```

### 5.3 Real-time Updates

For real-time messaging, implement WebSocket connections or polling:

```javascript
// Polling example for real-time updates
function pollForUpdates(threadId, lastUpdateTime) {
  setInterval(async () => {
    const thread = await getConversation(threadId);
    if (new Date(thread.updated) > new Date(lastUpdateTime)) {
      // Update UI with new messages
      updateConversation(thread);
      lastUpdateTime = thread.updated;
    }
  }, 5000); // Poll every 5 seconds
}
```

---

## 6. Error Handling

### Common Error Responses

**Authentication Error (401):**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**Permission Denied (403):**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**Not Found (404):**
```json
{
  "detail": "Not found."
}
```

**Validation Error (400):**
```json
{
  "field_name": ["Error message"],
  "non_field_errors": ["General error message"]
}
```

### Error Handling Best Practices

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: this.getHeaders(),
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || 'API call failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    // Handle error in UI (show toast, retry, etc.)
    throw error;
  }
}
```

---

## 7. Rate Limiting

- API endpoints are rate-limited to prevent abuse
- Implement exponential backoff for failed requests
- Cache frequently accessed data (patient lists, conversation history)

---

## 8. Security Considerations

- Always use HTTPS in production
- Store JWT tokens securely (httpOnly cookies or secure storage)
- Implement token refresh logic
- Validate all user inputs on both client and server side
- Use Content Security Policy (CSP) headers

This documentation provides a complete foundation for building a doctor-patient communication interface with AI assistance capabilities.</content>
<parameter name="filePath">c:\Users\user\OneDrive\Documents\PRESTIGE_HEALTH\PRESTIGEHEALTH\DOCTOR_PATIENT_COMMUNICATION_API.md