import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // For route parameters
import './DetailPage.css'; // For styling
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon


const DetailPage = () => {
  const { state } = useLocation();
  const { item } = state; // Retrieve the passed item from the route state
  const [message, setMessage] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const navigate = useNavigate()

  const getAccessToken = () => {
    try {
      const userInfo = localStorage.getItem('user-info'); // Use localStorage for web
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo?.access) {
        setAccessToken(parsedUserInfo.access);
      } else {
        console.log('No user information found in storage.');
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  };

  useEffect(() => {
    getAccessToken();
  }, []);

  const handleApprove = async () => {
    try {
      const reviewStatus = { review_status: 'approved' };
      const response = await fetch(`https://health.prestigedelta.com/medicalreview/${item.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(reviewStatus),
      });

      if (response.status === 200) {
        setMessage('Diagnosis approved successfully!');
        setSuccessModalVisible(true);
      } else {
        setMessage('Failed to approve diagnosis!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage('An error occurred.');
    }
  };

  const handleEdit = async () => {
    try {
      const response = await fetch(`https://health.prestigedelta.com/medicalreview/${item.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(userMessage),
      });

      if (response.status === 200) {
        setMessage('Diagnosis updated successfully!');
        setSuccessModalVisible(true);
      } else {
        setMessage('Failed to update diagnosis!');
      }
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating diagnosis:', error);
      setMessage('An error occurred.');
    }
  };

  return (
    <div className="detail-container">
       <div className="back-icon" onClick={() => navigate('/dashboard')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>
      <h1 className="section-header">Patient Profile</h1>
      <p className="sub-header">Details of patient’s health</p>

      <div className="info-card">
        <p className="info-label">Patient ID</p>
        <p className="info-value">{item.patient}</p>
      </div>

      {item.assessment_diagnosis && (
        <div className="info-card">
          <p className="info-label">Diagnosis</p>
          <p className="info-value">{item.assessment_diagnosis}</p>
        </div>
      )}
      {item.allergies && (
        <div className="info-card">
          <p className="info-label">Allergies</p>
          <p className="info-value">{item.allergies}</p>
        </div>
      )}
      {item.medications && (
        <div className="info-card">
          <p className="info-label">Medications</p>
          <p className="info-value">{item.medications}</p>
        </div>
      )}

      <h2 className="section-header">Patient History</h2>
      {item.chief_complaints && (
        <div className="detail-card">
          <p className="detail-label">Chief Complaint:</p>
          <p className="detail-value">{item.chief_complaints}</p>
        </div>
      )}
      {item.history_of_present_illness && (
        <div className="detail-card">
          <p className="detail-label">History of Present Illness</p>
          <p className="detail-value">{item.history_of_present_illness}</p>
        </div>
      )}
      {item.management_plan && (
        <div className="detail-card">
          <p className="detail-label">Management Plan:</p>
          <p className="detail-value">{item.management_plan}</p>
        </div>
      )}

      <p>{message}</p>
      
      {isEditModalVisible && (
        <div className="modal-container">
          <div className="modal-content">
            <textarea
              className="text-input"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Edit diagnosis..."
            />
            <button onClick={handleEdit} className="submit-button">
              Submit
            </button>
            <button onClick={() => setEditModalVisible(false)} className="close-button">
              Cancel
            </button>
          </div>
        </div>
      )}

      {isSuccessModalVisible && (
        <div className="modal-container">
          <div className="modal-content">
            <p className="modal-message">{message}</p>
            <button
              onClick={() => setSuccessModalVisible(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailPage;
