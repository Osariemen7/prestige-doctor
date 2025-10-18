import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api';

const Process = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    processAudio();
  }, [publicId]);

  const processAudio = async () => {
    setProcessing(true);
    const token = await getAccessToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('https://service.prestigedelta.com/ai-processing/process-audio/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          encounter_public_id: publicId,
          query: 'Create a concise note'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError('Processing failed');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setError('Processing error');
    } finally {
      setProcessing(false);
    }
  };

  const renderNote = (note) => {
    if (!note) return null;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Subjective</h3>
          <p><strong>Chief Complaint:</strong> {note.subjective?.chief_complaint}</p>
          <p><strong>History:</strong> {note.subjective?.history_of_present_illness}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Objective</h3>
          <p><strong>Findings:</strong> {note.objective?.examination_findings}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Assessment</h3>
          <p><strong>Diagnosis:</strong> {note.assessment?.primary_diagnosis}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Plan</h3>
          <p><strong>Management:</strong> {note.plan?.management}</p>
        </div>
      </div>
    );
  };

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing audio and generating notes...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/reviews')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            View All Reviews
          </button>
        </div>

        {result && (
          <div className="space-y-6">
            {result.patient_summary && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Patient Summary</h2>
                <p className="whitespace-pre-wrap">{result.patient_summary}</p>
              </div>
            )}

            {result.doctor_note && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">Medical Notes</h2>
                {renderNote(result.doctor_note)}
              </div>
            )}

            {result.assistant_response && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">AI Assistant Notes</h2>
                <p className="whitespace-pre-wrap">{result.assistant_response}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Process;