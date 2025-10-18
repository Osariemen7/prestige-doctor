# Test File Upload for Audio Processing

## Problem Analysis

The production logs show that audio upload is working (no more validation errors at line 512), but there's a Google Gemini API permission denied error:

```
"message": "You do not have permission to access the File kvh23zqytseo or it may not exist.",
"status": "PERMISSION_DENIED"
```

This suggests:
1. ✅ Audio upload to backend works
2. ✅ Audio gets sent to Google Files API 
3. ❌ Google Files API file has wrong permissions or doesn't exist
4. ❌ Gemini API can't access the file for transcription

## Testing Strategy

Since recording works locally with MP4 but fails in production with WebM, we need to test file upload vs recording to isolate the issue.

### Test 1: Upload the same MP4 file that works locally
1. Use the new "Upload File" option in RecordingModal
2. Upload the exact MP4 file that works locally
3. Check if it gets the same permission error

### Test 2: Upload a WebM file
1. Record audio in browser (creates WebM)
2. Download the WebM blob as file
3. Upload it using "Upload File" option
4. Compare with recording flow

## How to Test

1. **Open RecordingModal** in the app
2. **Click "Upload File"** toggle
3. **Select your test MP4 file**
4. **Fill patient details**
5. **Monitor browser console** and production logs

## Expected Results

### If MP4 upload works:
- Confirms the issue is with WebM format or browser-generated WebM files
- Backend validation or Google Files API has issues with WebM

### If MP4 upload fails with same error:
- Issue is not format-specific
- Problem is with Google Files API permissions or file storage
- Check service account permissions, file visibility settings

## Debug Commands

### Check file exists in Google Cloud:
```bash
# On production server
gcloud storage ls gs://your-bucket/
```

### Check file permissions:
```bash
# Check if file is publicly accessible
gsutil acl get gs://your-bucket/kvh23zqytseo
```

### Test Gemini API access:
```bash
# Test with a known working file
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"file_uri": "gs://your-bucket/test-file.mp4"}' \
  https://generativelanguage.googleapis.com/v1beta/files/test-file:transcribe
```

## Quick Fix Options

### Option 1: Make files public
```python
# In audio_processing.py, when uploading to Google Files
file = genai.upload_file(path=audio_path, mime_type=mime_type)
file.make_public()  # Add this line
```

### Option 2: Use service account properly
```python
# Ensure correct service account credentials
import google.auth
credentials, project = google.auth.default()
genai.configure(credentials=credentials)
```

### Option 3: Check file URI format
```python
# Ensure correct URI format for Gemini
file_uri = f"gs://{bucket_name}/{file_name}"
# Should be: gs://bucket/file.mp4
```

## Next Steps

1. Test file upload with MP4 that works locally
2. Check production logs for differences
3. Fix Google Files API permissions
4. Re-test with WebM files