# Provider Dashboard: Wellness Monitoring Guide

## Overview
The Provider Dashboard now includes **Subjective Wellness Monitoring**. This feature allows doctors to track how patients are feeling between clinical consultations, providing a holistic view of their recovery and chronic condition management.

## New Features for Doctors

### 1. 14-Day Wellness Trends
When viewing a patient's detailed profile in the Provider Dashboard (`GET /providerdashboard/{id}/`), you will now see a `wellness_logs` array containing the last 14 days of patient check-ins.

**Key Data Points:**
- **Wellness Score (0-100)**: An AI-calculated aggregate of mood, energy, and sleep quality.
- **Mood & Energy**: Subjective levels (1-5) with descriptive labels (e.g., "Very Low" to "Very Good").
- **Sleep Quality**: Tracking both perceived quality and actual hours slept.
- **Pain Tracking**: Numeric pain scale (0-10) and specific pain locations.
- **Symptom Journaling**: A list of specific symptoms reported by the patient (e.g., "headache", "nausea").
- **Patient Notes**: Free-text journal entries providing context to their daily experience.

### 2. AI-Synthesized Weekly Reports
The **Weekly Health Report** now automatically incorporates these wellness logs. The AI analyzes the relationship between objective clinical metrics (like Blood Pressure or Glucose) and the patient's subjective wellness data to provide:
- Correlation insights (e.g., "Patient reports low energy on days with elevated BP").
- Risk assessments based on symptom trends.
- Personalized recommendations for the doctor to review.

## Clinical Utility
- **Early Warning**: Identify "soft" symptoms or declining mood before they manifest as clinical emergencies.
- **Adherence Context**: Understand if poor clinical metrics are linked to poor sleep or high pain levels.
- **Patient Engagement**: Use the "Notes" and "Symptoms" sections to start more informed conversations during consultations.

## API Reference for Frontend
Doctors can access this data via:
- **Endpoint**: `GET /providerdashboard/{patient_id}/`
- **Field**: `wellness_logs` (Array of objects)

---
*For technical integration details, refer to the [Client-Side Documentation Service API Guide](../CLIENT_DOCUMENTATION_API.md).*
