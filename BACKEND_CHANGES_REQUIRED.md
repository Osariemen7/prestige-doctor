# Backend API Changes Required

## Summary
The frontend now manages upload/processing status client-side. The backend needs minimal changes to support the new workflow.

## Required Changes

### 1. `/ai-processing/process-audio/` Endpoint

#### Current Request Body:
```json
{
  "encounter_public_id": "uuid",
  "existing_note": {},
  "existing_transcript": [],
  "query": "string"
}
```

#### New Request Body (add these fields):
```json
{
  "encounter_public_id": "uuid",
  "patient_first_name": "string (optional)",
  "patient_last_name": "string (optional)",
  "patient_phone_number": "string (required if save_documentation is true)",
  "save_documentation": "boolean (default: true)",
  "existing_note": {},
  "existing_transcript": [],
  "query": "string"
}
```

#### Implementation:
```python
def process_audio(request):
    data = request.data
    encounter_id = data.get('encounter_public_id')
    patient_first_name = data.get('patient_first_name')
    patient_last_name = data.get('patient_last_name')
    patient_phone_number = data.get('patient_phone_number')
    save_documentation = data.get('save_documentation', True)
    
    # ... existing processing logic ...
    
    # If save_documentation is True, trigger finalization
    if save_documentation:
        # Update encounter with patient details
        encounter.patient_first_name = patient_first_name or encounter.patient_first_name
        encounter.patient_last_name = patient_last_name or encounter.patient_last_name
        encounter.patient_phone_number = patient_phone_number or encounter.patient_phone_number
        encounter.save()
        
        # Trigger asynchronous finalization (celery task or similar)
        # This should:
        # 1. Save the documentation to the medical review
        # 2. Create patient record if needed
        # 3. Optionally send summary (based on save_documentation flag or separate field)
        finalize_encounter_async.delay(
            encounter_id=encounter.id,
            note_payload=processed_note,
            patient_phone=patient_phone_number
        )
    
    # Return the processed data immediately
    return Response({
        'doctor_note': processed_note,
        'patient_summary': patient_summary,
        'transcript': transcript,
        # ... other response data
    })
```

### 2. `/provider-reviews/` Serializer

#### Ensure These Fields Are Included in Response:
```python
class ProviderReviewSerializer(serializers.ModelSerializer):
    patient_first_name = serializers.CharField(source='in_person_encounter.patient_first_name', allow_null=True)
    patient_last_name = serializers.CharField(source='in_person_encounter.patient_last_name', allow_null=True)
    patient_phone_number = serializers.CharField(source='in_person_encounter.patient_phone_number', allow_null=True)
    
    class Meta:
        model = MedicalReview
        fields = [
            # ... existing fields
            'patient_first_name',
            'patient_last_name',
            'patient_phone_number',
        ]
```

#### Or if the relationship is different:
```python
# If in_person_encounters is an array
def get_patient_first_name(self, obj):
    if obj.in_person_encounters and len(obj.in_person_encounters) > 0:
        return obj.in_person_encounters[0].patient_first_name
    return None
```

### 3. Asynchronous Finalization (Recommended)

Create a Celery task or background job:

```python
@shared_task
def finalize_encounter_async(encounter_id, note_payload, patient_phone):
    """
    Asynchronously finalize the encounter:
    1. Save documentation to medical review
    2. Create patient record if needed
    3. Send summary if applicable
    """
    encounter = InPersonEncounter.objects.get(id=encounter_id)
    
    # Save documentation
    encounter.note_payload = note_payload
    encounter.status = 'finalized'
    encounter.save()
    
    # Update medical review
    medical_review = encounter.medical_review
    medical_review.doctor_note = note_payload
    medical_review.save()
    
    # Create patient if needed
    if patient_phone:
        patient, created = PatientProfile.objects.get_or_create(
            phone_number=patient_phone,
            defaults={
                'first_name': encounter.patient_first_name,
                'last_name': encounter.patient_last_name,
            }
        )
        encounter.patient = patient
        encounter.save()
```

## Frontend Expectations

### 1. Upload Endpoint (`/in-person-encounters/{id}/upload-audio/`)
Must return:
```json
{
  "s3_upload_pending": false,
  "google_upload_pending": false,
  "google_file_id": "files/xxx"
}
```

Frontend will NOT proceed to processing if either upload is pending.

### 2. Process Endpoint (`/ai-processing/process-audio/`)
Should return immediately (not wait for finalization):
```json
{
  "doctor_note": { /* SOAP structure */ },
  "patient_summary": "string",
  "transcript": [],
  "public_id": "uuid",
  "encounter_public_id": "uuid"
}
```

Finalization happens asynchronously in the background.

## Testing

### Test Cases:
1. **Process with save_documentation=true**
   - Verify patient details saved to encounter
   - Verify finalization triggered
   - Verify response returns immediately

2. **Process with save_documentation=false**
   - Verify processing completes
   - Verify finalization NOT triggered
   - Audio uploaded but not finalized

3. **Process with existing patient data**
   - Verify existing data not overwritten
   - Verify only new data updated

4. **Concurrent requests**
   - Multiple encounters processing simultaneously
   - Each should handle independently

## Migration Checklist

- [ ] Add patient fields to process-audio endpoint
- [ ] Add save_documentation field handling
- [ ] Update provider-reviews serializer
- [ ] Create/update asynchronous finalization task
- [ ] Test upload -> process -> finalize workflow
- [ ] Test with save_documentation=false
- [ ] Verify concurrent processing works
- [ ] Deploy and monitor

## Questions?

**Q: Does the frontend wait for finalization?**
A: No. The process-audio endpoint should return immediately after processing. Finalization happens asynchronously.

**Q: How does the frontend know when finalization is complete?**
A: It refetches the review data after processing completes. The refetched data includes the finalized documentation.

**Q: What if finalization fails?**
A: The frontend will refetch and show whatever data is available. Consider adding a `finalization_status` field if you need to track this.

**Q: Can I still use the old workflow?**
A: Yes, if `save_documentation` is not provided or is `false`, skip the finalization step.
