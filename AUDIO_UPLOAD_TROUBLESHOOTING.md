# Audio Upload Troubleshooting Guide

## Error: "Audio file upload failed validation"

### Root Cause
This error occurs when the backend receives an audio file that doesn't match expected formats or is corrupted during recording/transmission.

### Frontend Fixes Applied

#### 1. **Enhanced Codec Detection**
The recording now tries multiple audio codecs in order of preference:
```javascript
[
  'audio/webm;codecs=opus',  // Preferred - best compatibility
  'audio/webm',               // Fallback webm
  'audio/ogg;codecs=opus',    // OGG with opus
  'audio/mp4',                // MP4 audio
  'audio/mpeg'                // MP3 fallback
]
```

#### 2. **Dynamic File Extension Detection**
The upload function now correctly determines the file extension based on the recorded mimeType:
- `audio/webm` → `.webm`
- `audio/ogg` → `.ogg`
- `audio/mp4` → `.mp4`
- `audio/mpeg` → `.mp3`
- `audio/wav` → `.wav`

#### 3. **Enhanced Logging**
Added comprehensive console logging to debug issues:
```javascript
console.log('Using mimeType:', mimeType);
console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
console.log('Uploading audio:', { size, type, extension, format });
console.log('Upload result:', uploadResult);
```

#### 4. **Better Error Messages**
Improved error handling to show specific error details from backend.

## Testing the Fix

### 1. Check Browser Console
Open DevTools (F12) and look for these logs:
```
Using mimeType: audio/webm;codecs=opus
Audio blob created: 245632 bytes, type: audio/webm;codecs=opus
Uploading audio: { size: 245632, type: "audio/webm;codecs=opus", extension: "webm", format: "webm" }
```

### 2. Verify Audio Recording Works
- Click record button
- Speak for a few seconds
- Stop recording
- Patient details modal should appear
- Check console for blob creation log

### 3. Test Upload
- Fill patient details
- Click "Upload & Process"
- Check console for upload logs
- Look for any error messages

## Common Issues & Solutions

### Issue 1: "No supported audio format found"
**Cause**: Browser doesn't support any audio recording formats
**Solution**: 
- Use Chrome, Edge, or Firefox (latest versions)
- Safari on iOS may have limited codec support

### Issue 2: Upload shows 0 bytes
**Cause**: Recording didn't capture any audio
**Solution**:
- Check microphone permissions
- Try a different browser
- Ensure microphone is not muted

### Issue 3: Backend rejects specific format
**Cause**: Backend expects specific audio format
**Solution**: Update backend to accept multiple formats or add conversion

## Backend Validation Checklist

The backend should accept these formats:
- ✅ `audio/webm` (most common)
- ✅ `audio/ogg`
- ✅ `audio/mp4`
- ✅ `audio/mp3`
- ✅ `audio/wav`

### Recommended Backend Updates

```python
# Django example
from django.core.files.uploadedfile import UploadedFile

ALLOWED_AUDIO_FORMATS = [
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/m4a',
]

def validate_audio_file(uploaded_file: UploadedFile):
    # Check content type
    if uploaded_file.content_type not in ALLOWED_AUDIO_FORMATS:
        # Try to determine from file extension
        ext = uploaded_file.name.split('.')[-1].lower()
        if ext not in ['webm', 'ogg', 'mp4', 'mp3', 'wav', 'm4a']:
            raise ValidationError(
                f"Unsupported audio format: {uploaded_file.content_type}"
            )
    
    # Check file size (not empty, not too large)
    if uploaded_file.size == 0:
        raise ValidationError("Audio file is empty")
    
    if uploaded_file.size > 50 * 1024 * 1024:  # 50MB max
        raise ValidationError("Audio file too large (max 50MB)")
    
    return True
```

## Debugging Steps

### Step 1: Enable Verbose Logging
Open browser console and record audio. You should see:
```
Using mimeType: audio/webm;codecs=opus
Audio blob created: 245632 bytes, type: audio/webm;codecs=opus
Uploading audio: {...}
```

### Step 2: Inspect Network Request
In DevTools Network tab:
1. Filter by "upload-audio"
2. Check request payload
3. Look at "audio_file" - should show file size
4. Check "original_format" parameter

### Step 3: Check Backend Response
If upload fails:
1. Look at response body
2. Note the exact error message
3. Check backend logs for validation errors

### Step 4: Test with Different Browsers
Try these browsers in order:
1. Chrome (best support)
2. Edge (Chromium-based)
3. Firefox
4. Safari (may have limitations)

## Additional Solutions

### Solution A: Force Specific Format
If backend only accepts webm:
```javascript
// In startRecording function, use only:
const mimeType = 'audio/webm;codecs=opus';
if (!MediaRecorder.isTypeSupported(mimeType)) {
  setError('Browser does not support required audio format. Please use Chrome.');
  return;
}
```

### Solution B: Audio Conversion
Add client-side conversion (requires additional library):
```javascript
import lamejs from 'lamejs';

async function convertToMP3(audioBlob) {
  // Convert blob to MP3 format
  // This adds complexity but ensures compatibility
}
```

### Solution C: Check Recording Duration
Ensure minimum recording length:
```javascript
mediaRecorderRef.current.onstop = async () => {
  const audioBlob = new Blob(chunksRef.current, { type: mimeType });
  
  // Reject very short recordings (< 1 second)
  if (audioBlob.size < 10000) {
    setError('Recording too short. Please record at least 1 second.');
    return;
  }
  
  setRecordedAudioBlob(audioBlob);
  setShowPatientModal(true);
};
```

## When to Contact Backend Team

Contact backend if:
1. Upload shows correct format/size but still fails validation
2. Error message doesn't make sense
3. Same file uploads successfully via Postman but fails from app
4. Backend logs show different error than what frontend receives

## Quick Reference

| Browser | Preferred Format | Fallback |
|---------|-----------------|----------|
| Chrome | audio/webm;codecs=opus | audio/webm |
| Firefox | audio/ogg;codecs=opus | audio/webm |
| Safari | audio/mp4 | audio/mpeg |
| Edge | audio/webm;codecs=opus | audio/webm |

## Testing Checklist

- [ ] Audio recording starts successfully
- [ ] Console shows correct mimeType
- [ ] Blob size > 0 after recording
- [ ] Patient modal appears after stopping
- [ ] Upload request sent with correct extension
- [ ] Backend accepts the file format
- [ ] Processing starts after upload
- [ ] No validation errors

## Still Having Issues?

1. Share the console logs from recording to upload
2. Share the Network tab details (request/response)
3. Share backend error logs
4. Test in incognito mode (to rule out extensions)
5. Try on a different device/network
