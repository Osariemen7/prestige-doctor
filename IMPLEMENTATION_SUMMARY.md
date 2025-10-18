# Client-Driven Asynchronous Documentation Workflow Implementation

## Overview
This implementation provides a multi-stage asynchronous documentation workflow with real-time client-side status tracking. The status is managed entirely on the frontend based on API call lifecycle, providing users with immediate feedback during the upload and processing stages.

## Architecture

### 1. **Processing Status Context** (`src/contexts/ProcessingStatusContext.jsx`)
A global React context that manages processing statuses for all reviews across the application.

**Features:**
- Tracks status by review ID: `{ reviewId: 'uploading' | 'processing' | null }`
- Provides methods: `setStatus()`, `getStatus()`, `clearStatus()`, `isProcessing()`
- Available throughout the app via `useProcessingStatus()` hook

**Usage:**
```javascript
const { setStatus, getStatus, clearStatus } = useProcessingStatus();

// Set status
setStatus(reviewId, 'uploading');
setStatus(reviewId, 'processing');

// Clear status (when complete)
clearStatus(reviewId);
```

### 2. **Patient Details Modal** (`src/components/PatientDetailsModal.jsx`)
A modal that appears after recording stops to collect patient information before upload/processing.

**Features:**
- Collects: `patient_first_name`, `patient_last_name`, `patient_phone_number`
- Includes "Save Documentation" toggle (enabled by default)
- Pre-populates fields if patient data already exists
- Makes fields read-only if patient data is already present
- Responsive design (Drawer on mobile, Dialog on desktop)

**Props:**
- `open`: Boolean to control visibility
- `onClose`: Callback when modal is closed
- `onSubmit`: Callback with patient data and save_documentation flag
- `initialData`: Pre-populate form with existing patient data
- `loading`: Show loading state during processing

### 3. **Updated Recording Modal** (`src/components/RecordingModal.jsx`)
Modified to integrate the patient details modal and manage the workflow.

**New Props:**
- `encounterData`: Existing encounter data for pre-populating patient details
- `reviewId`: The review ID for status tracking

**Workflow:**
1. **Recording Phase**: User records audio as before
2. **Stop Recording**: Shows patient details modal instead of immediately uploading
3. **Submit Patient Details**: 
   - Sets status to 'uploading'
   - Uploads audio file
   - Sets status to 'processing'
   - Calls process-audio endpoint with patient details and save_documentation flag
   - Clears status when complete
   - Triggers onComplete callback

**Key Changes:**
- Removed upload/processing/complete UI steps
- Added patient details step
- Integrated ProcessingStatusContext for global status tracking
- Audio blob stored temporarily until patient details submitted

### 4. **Reviews List** (`src/components/ReviewsList.jsx`)
Enhanced with real-time status indicators.

**Features:**
- Displays "Uploading..." chip (blue, animated) when status is 'uploading'
- Displays "Processing..." chip (orange, animated) when status is 'processing'
- Auto-refetches review data when all processing completes
- Uses ProcessingStatusContext to get current status

**Visual Indicators:**
```jsx
// Uploading state
<Chip icon={<CloudUploadIcon />} label="Uploading..." color="info" />

// Processing state
<Chip icon={<AutorenewIcon />} label="Processing..." color="warning" />
```

### 5. **Review Detail** (`src/components/ReviewDetail.jsx`)
Enhanced with status banner and auto-refetch.

**Features:**
- Shows prominent Alert banner at top when uploading/processing
- Auto-refetches review data when processing completes
- Passes reviewId and encounterData to RecordingModal

**Status Banners:**
- **Uploading**: Blue info alert with CloudUploadIcon
- **Processing**: Orange warning alert with AutorenewIcon
- Both include descriptive text and pulse animation

### 6. **App Integration** (`src/App.js`)
Wrapped entire app with ProcessingStatusProvider to enable global status access.

```jsx
<ProcessingStatusProvider>
  <Routes>
    {/* All routes */}
  </Routes>
</ProcessingStatusProvider>
```

## Complete Workflow

### User Journey:
1. **Create Encounter**: User creates a new encounter (optional patient details)
2. **Start Recording**: Opens recording modal, records audio
3. **Stop Recording**: Recording modal shows "Recording Complete" message
4. **Patient Details Modal**: Automatically opens
   - Pre-populated if patient data exists (fields locked)
   - "Save Documentation" toggle enabled by default
   - User enters/confirms phone number (required)
   - Clicks "Upload & Process"
5. **Uploading Phase**:
   - Modal closes
   - Review list shows "Uploading..." chip
   - Review detail shows "Uploading Audio..." banner
   - Status: `'uploading'`
6. **Processing Phase**:
   - Upon successful upload
   - Status changes to `'processing'`
   - Review list shows "Processing..." chip
   - Review detail shows "Processing Documentation..." banner
7. **Complete**:
   - Upon successful processing
   - Status cleared (becomes `null`)
   - Reviews automatically refetch
   - Updated documentation appears

### API Call Sequence:
```javascript
// 1. Upload audio
POST /in-person-encounters/{id}/upload-audio/
// -> setStatus(reviewId, 'uploading')

// 2. Process audio (when upload complete)
POST /ai-processing/process-audio/
{
  encounter_public_id,
  patient_first_name,
  patient_last_name,
  patient_phone_number,
  save_documentation: true/false
}
// -> setStatus(reviewId, 'processing')

// 3. On success
// -> clearStatus(reviewId)
// -> Auto-refetch review data
```

## Backend Requirements (Summary)

### `/ai-processing/process-audio/` Endpoint Modifications:
**New Request Fields:**
```json
{
  "encounter_public_id": "uuid",
  "patient_first_name": "string (optional)",
  "patient_last_name": "string (optional)",
  "patient_phone_number": "string",
  "save_documentation": "boolean",
  "query": "string"
}
```

**Behavior:**
- When `save_documentation: true`, trigger asynchronous finalization
- Save patient details to encounter
- Process and store documentation in background

### `/provider-reviews/` Serializer Updates:
**Ensure Response Includes:**
```json
{
  "patient_first_name": "string",
  "patient_last_name": "string", 
  "patient_phone_number": "string"
}
```

## Key Features

### 1. **Client-Side State Management**
- No server-side status tracking needed
- Frontend manages UI state based on API lifecycle
- Enables real-time user feedback

### 2. **Automatic Data Refresh**
- Reviews list and detail pages watch for processing completion
- Auto-refetch when status changes to null
- Seamless transition from processing to viewing results

### 3. **User Experience**
- Clear visual feedback at every stage
- Animated status indicators
- Descriptive messages explaining what's happening
- Estimated time information ("typically takes 60-90 seconds")

### 4. **Responsive Design**
- Patient details modal adapts to screen size
- Drawer on mobile, Dialog on desktop
- Consistent experience across devices

### 5. **Data Validation**
- Phone number required for saving documentation
- Patient data locked if already exists
- Clear error messages

## Files Created/Modified

### Created:
1. `src/contexts/ProcessingStatusContext.jsx` - Global status management
2. `src/components/PatientDetailsModal.jsx` - Post-recording patient details form

### Modified:
1. `src/App.js` - Added ProcessingStatusProvider wrapper
2. `src/components/RecordingModal.jsx` - Integrated patient details workflow
3. `src/components/ReviewsList.jsx` - Added status indicators and auto-refetch
4. `src/components/ReviewDetail.jsx` - Added status banner and auto-refetch

## Testing Checklist

- [ ] Create new encounter
- [ ] Record audio successfully
- [ ] Patient details modal appears after recording
- [ ] Pre-populated fields are read-only
- [ ] Phone number validation works
- [ ] "Save Documentation" toggle functions
- [ ] Upload status appears immediately ("Uploading...")
- [ ] Processing status appears after upload ("Processing...")
- [ ] Status indicators visible in both list and detail views
- [ ] Auto-refetch triggers after processing completes
- [ ] Documentation appears in UI after completion
- [ ] Multiple concurrent uploads/processing handled correctly
- [ ] Error handling works at each stage
- [ ] Mobile responsive design functions properly

## Animation CSS (Add to global styles if not present)

```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
```

## Notes

- Total workflow time: 60-90s upload + 60-90s processing = up to 3 minutes
- Status cleared immediately on success, not after timeout
- Multiple reviews can process simultaneously with independent status tracking
- Backend finalization is asynchronous - frontend doesn't wait for it
- Patient phone number is required for documentation saving
