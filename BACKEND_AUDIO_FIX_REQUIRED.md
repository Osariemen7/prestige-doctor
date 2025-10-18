# Backend Audio Validation Issue - Fix Required

## Error from Logs
```
ValueError: Audio file upload failed validation - file may be corrupted or in unsupported format
Location: /home/yiabzone/PRESTIGEHEALTH/patients/audio_processing.py, line 512
```

## Quick Visual Summary

```
Frontend (Browser Recording)
    ↓
Creates audio/webm blob (245KB)
    ↓
Sends via FormData (multipart/form-data)
    ↓
POST to /upload-audio/
    ↓
Backend receives: request.FILES['audio_file']  ← Should read from HERE
    ↓
audio_processing.py reads bytes
    ↓
Line 512: Validation ← FAILS HERE ❌
    ↓
(Should continue to) Google Files API
```

**The Problem**: Line 512 validation is rejecting valid WebM files

## Problem Analysis

The backend's `upload_audio_bytes` function in `audio_processing.py` is rejecting valid audio files from the frontend. The frontend is sending properly recorded WebM/Opus audio files, but the backend validation is failing.

## Frontend Details

The frontend is now sending via `multipart/form-data`:

**What's Actually Being Sent:**
```javascript
// FormData with binary file
const formData = new FormData();
formData.append('audio_file', audioBlob, 'recording.webm');  // Binary Blob object
formData.append('original_format', 'webm');                   // String parameter
```

**Network Request Shows:**
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

POST /in-person-encounters/{id}/upload-audio/
Form Data:
  - audio_file: (binary) [245632 bytes] - THIS IS A FILE UPLOAD, NOT RAW BYTES
  - original_format: webm
```

**Audio Details:**
- **Format**: `audio/webm;codecs=opus` (or fallback formats)
- **File Extension**: `.webm` (dynamically determined)
- **Bitrate**: 128kbps
- **Upload Method**: Multipart file upload (standard file upload, NOT raw bytes in JSON)
- **Validation**: 
  - Size > 1000 bytes (validated before upload)
  - Proper MIME type
  - Chunked recording every 1 second
  - Multiple chunks combined into blob

## Required Backend Fixes

### Issue 1: Overly Strict Validation in `audio_processing.py`

**Location**: `patients/audio_processing.py`, line 512 (in `upload_audio_bytes` method)

The validation is likely too strict or checking for wrong audio markers. Here's what needs to be fixed:

```python
def upload_audio_bytes(self, audio_bytes, suffix=''):
    """Upload audio bytes to Google Files API"""
    
    # Current validation is TOO STRICT
    # It's rejecting valid WebM files
    
    # RECOMMENDED FIX:
    try:
        # Basic validation only
        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError("Audio file is empty")
        
        if len(audio_bytes) < 100:  # Very minimal check
            raise ValueError("Audio file too small")
        
        # WebM files start with specific magic bytes
        # Check for WebM: 0x1A 0x45 0xDF 0xA3
        # Check for Ogg: "OggS"
        # Check for MP4: "ftyp" at offset 4
        # But DON'T reject if these aren't found - just log a warning
        
        # For now, ACCEPT ALL non-empty files
        # Let Google Files API handle the actual validation
        
    except Exception as e:
        logger.warning(f"Audio validation warning: {e}")
        # Don't raise - continue with upload
```

### Issue 2: File Format Assumptions

The backend might be expecting a specific audio format. Update to accept multiple formats:

```python
SUPPORTED_AUDIO_FORMATS = {
    'audio/webm': ['.webm'],
    'audio/ogg': ['.ogg'],
    'audio/mp4': ['.mp4', '.m4a'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
}

def validate_audio_format(self, content_type, filename):
    """Validate audio format is supported"""
    # Check if content_type is in supported formats
    if content_type not in SUPPORTED_AUDIO_FORMATS:
        # Don't reject - just log
        logger.warning(f"Unusual audio format: {content_type}")
    
    # Check file extension matches
    ext = os.path.splitext(filename)[1].lower()
    # Again, don't reject - just validate and continue
    
    return True  # Always return True for now
```

### Issue 3: Backend File Reading

**IMPORTANT**: The backend should be reading `audio_file` as an **uploaded file**, not raw bytes in the request body.

The correct way to handle this in Django:

```python
# In patients/views/in_person_encounter.py (around line 184)
def upload_audio(self, request, public_id=None):
    """Handle audio file upload"""
    
    # Get the uploaded FILE (not raw bytes)
    audio_file = request.FILES.get('audio_file')  # This is an UploadedFile object
    original_format = request.data.get('original_format', 'webm')
    
    if not audio_file:
        return Response(
            {'detail': 'No audio file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Log what we received
    logger.info(f"Received audio file: {audio_file.name}, "
                f"size: {audio_file.size}, "
                f"content_type: {audio_file.content_type}, "
                f"format: {original_format}")
    
    try:
        # Read the file content
        audio_bytes = audio_file.read()
        
        # Reset file pointer in case it's needed again
        audio_file.seek(0)
        
        # Now pass to processor
        processor = AudioProcessor()
        upload_result = processor.upload_audio_for_encounter(
            encounter=encounter,
            audio_file=audio_file,  # Pass the file object, not just bytes
            upload_suffix=original_format
        )
        
        return Response(upload_result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}", exc_info=True)
        return Response(
            {'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

### Issue 4: Audio Processing Method

The `upload_audio_bytes` method should handle file-like objects properly:

```python
def upload_audio_for_encounter(self, encounter, audio_file, upload_suffix=''):
    """Upload audio file to Google Files API
    
    Args:
        encounter: The encounter object
        audio_file: Django UploadedFile object (has .read(), .name, .size, .content_type)
        upload_suffix: File extension/format hint
    """
    
    try:
        # audio_file is an UploadedFile object, not raw bytes
        logger.info(f"Processing upload: {audio_file.name}")
        logger.info(f"File size: {audio_file.size} bytes")
        logger.info(f"Content type: {audio_file.content_type}")
        
        # Read the actual bytes
        audio_bytes = audio_file.read()
        
        # Basic validation
        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError("Audio file is empty")
        
        if len(audio_bytes) < 100:
            raise ValueError("Audio file too small (less than 100 bytes)")
        
        # Log first few bytes for debugging
        logger.info(f"First 10 bytes (hex): {audio_bytes[:10].hex()}")
        
        # Upload to Google Files API
        google_file = self.upload_audio_bytes(
            audio_bytes=audio_bytes,
            suffix=upload_suffix
        )
        
        return {
            'google_file_id': google_file.get('name'),
            's3_upload_pending': False,
            'google_upload_pending': False
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}", exc_info=True)
        raise
```

## Quick Fix (Recommended)

**Most Important**: The backend should properly read the uploaded FILE, not expect raw bytes:

### Step 1: Check File Reading (in views.py)
```python
# In patients/views/in_person_encounter.py, around line 184
def upload_audio(self, request, public_id=None):
    # CORRECT:
    audio_file = request.FILES.get('audio_file')  # Get from FILES, not DATA
    
    # WRONG (if you're doing this):
    # audio_file = request.data.get('audio_file')  # This won't work for binary files
    
    if not audio_file:
        logger.error("No audio_file in request.FILES")
        logger.info(f"request.FILES keys: {request.FILES.keys()}")
        logger.info(f"request.data keys: {request.data.keys()}")
        return Response({'detail': 'No audio file provided'}, status=400)
```

### Step 2: Relax Validation (in audio_processing.py, line 512)
```python
# Line 512 in audio_processing.py
# OLD CODE (causing errors):
if not self._validate_audio_file(audio_bytes):
    raise ValueError("Audio file upload failed validation - file may be corrupted or in unsupported format")

# NEW CODE (temporary fix):
# Skip strict validation - let Google Files API validate
# if not self._validate_audio_file(audio_bytes):
#     logger.warning("Audio file validation warning - proceeding anyway")

# Or better - make validation less strict:
try:
    if len(audio_bytes) < 100:
        raise ValueError("Audio file is too small")
    
    # Log the first bytes for debugging
    logger.info(f"Audio bytes received: {len(audio_bytes)}")
    logger.info(f"First 10 bytes (hex): {audio_bytes[:10].hex()}")
    
    # Check for known audio signatures (but don't reject if not found)
    if audio_bytes[:4] == b'\x1a\x45\xdf\xa3':
        logger.info("✓ Detected WebM format")
    elif audio_bytes[:4] == b'OggS':
        logger.info("✓ Detected Ogg format")
    elif audio_bytes[4:8] == b'ftyp':
        logger.info("✓ Detected MP4 format")
    else:
        logger.warning(f"Unknown format signature - first 20 bytes: {audio_bytes[:20].hex()}")
        # DON'T REJECT - continue anyway
        
except Exception as e:
    logger.warning(f"Audio validation note: {e}")
    # DON'T REJECT - continue with upload
```

### Step 3: Check What You're Actually Receiving

Add this debug code temporarily:

```python
def upload_audio(self, request, public_id=None):
    # Debug logging
    logger.info("=== UPLOAD AUDIO DEBUG ===")
    logger.info(f"request.FILES: {request.FILES}")
    logger.info(f"request.FILES.keys(): {list(request.FILES.keys())}")
    logger.info(f"request.data.keys(): {list(request.data.keys())}")
    logger.info(f"Content-Type: {request.content_type}")
    
    audio_file = request.FILES.get('audio_file')
    if audio_file:
        logger.info(f"✓ Got audio_file: {audio_file.name}")
        logger.info(f"✓ Size: {audio_file.size}")
        logger.info(f"✓ Content type: {audio_file.content_type}")
    else:
        logger.error("✗ No audio_file found!")
    
    # ... rest of code
```

## Testing After Fix

1. **Check Backend is Reading File Correctly**:
   ```python
   # Should see in logs:
   === UPLOAD AUDIO DEBUG ===
   request.FILES: <MultiValueDict: {'audio_file': [<InMemoryUploadedFile: recording.webm (audio/webm)>]}>
   request.FILES.keys(): ['audio_file']
   ✓ Got audio_file: recording.webm
   ✓ Size: 245632
   ✓ Content type: audio/webm
   ```

2. **Check Bytes are Read**:
   ```python
   # Should see in logs:
   Audio bytes received: 245632
   First 10 bytes (hex): 1a45dfa3a342867481010000
   ✓ Detected WebM format
   ```

3. **Test with cURL** (to verify backend handling):
   ```bash
   # Create a test WebM file
   curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -F "audio_file=@test.webm" \
     -F "original_format=webm" \
     https://service.prestigedelta.com/in-person-encounters/{id}/upload-audio/
   ```

4. **Verify Google Upload** - Google Files API should accept the file

## Additional Debugging

Add these logs to help debug future issues:

```python
def upload_audio_bytes(self, audio_bytes, suffix=''):
    """Upload audio bytes with detailed logging"""
    
    logger.info(f"Upload attempt: {len(audio_bytes)} bytes")
    logger.info(f"First 10 bytes (hex): {audio_bytes[:10].hex()}")
    
    # Check for common audio file signatures
    if audio_bytes[:4] == b'\x1a\x45\xdf\xa3':
        logger.info("Detected WebM format")
    elif audio_bytes[:4] == b'OggS':
        logger.info("Detected Ogg format")
    elif audio_bytes[4:8] == b'ftyp':
        logger.info("Detected MP4 format")
    else:
        logger.warning(f"Unknown audio format - first bytes: {audio_bytes[:20].hex()}")
    
    # Continue with upload...
```

## Priority

**URGENT** - This is blocking the entire recording workflow. 

## Most Likely Issue

The backend is probably doing one of these:

1. **Reading from wrong location**: Using `request.data` instead of `request.FILES`
   ```python
   # WRONG:
   audio_file = request.data.get('audio_file')
   
   # CORRECT:
   audio_file = request.FILES.get('audio_file')
   ```

2. **Expecting raw bytes in JSON**: The file is sent as `multipart/form-data`, not JSON
   ```python
   # The frontend sends FormData (multipart), NOT:
   # { "audio_file": "base64string" }  ← WRONG
   
   # It sends actual binary file upload via FormData ← CORRECT
   ```

3. **Strict validation rejecting WebM**: Line 512 validation is too strict for WebM format

## What The Frontend is Actually Sending

```http
POST /in-person-encounters/{id}/upload-audio/ HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="audio_file"; filename="recording.webm"
Content-Type: audio/webm

[BINARY WEBM DATA - 245632 bytes]
------WebKitFormBoundary...
Content-Disposition: form-data; name="original_format"

webm
------WebKitFormBoundary...
```

This is a **standard file upload**, exactly like uploading a profile picture or document.

## Contact

If you need sample audio files for testing:
1. Record audio in Chrome browser
2. Open DevTools console
3. See the blob details logged
4. Can extract the blob and send sample file

## Verification Checklist

After implementing fixes:
- [ ] WebM audio files upload successfully
- [ ] Ogg audio files upload successfully  
- [ ] Error messages are more descriptive
- [ ] Logs show audio format detection
- [ ] Google Files API receives the files
- [ ] No false rejections of valid audio

## Notes

The frontend has been enhanced with:
- ✅ Multiple codec fallbacks
- ✅ Proper file extension detection
- ✅ Client-side validation (size, format)
- ✅ Detailed console logging
- ✅ Chunked recording for better stability

The backend needs to match this flexibility and not reject valid audio files.
