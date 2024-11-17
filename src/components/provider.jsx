import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation
import Select from 'react-select'; // For dropdowns
import './ProviderPage.css'; // CSS for styling
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon


const ProviderPage = () => {
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [dateOfRegistration, setDateOfRegistration] = useState(new Date());
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const navigate = useNavigate();

  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
  ];

  const getAccessToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info'); // Use localStorage for web
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) {
        setAccessToken(parsedUserInfo.access);
        console.log('Access Token:', parsedUserInfo.access);
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

  const handleDateChange = (event) => {
    setDateOfRegistration(event.target.value);
  };

  const handleSubmit = async () => {
    const providerType = 'doctor';
    const formData = {
      clinic_name: clinicName,
      specialty: specialty,
      qualifications: qualifications.value,
      date_of_registration: dateOfRegistration,
      provider_type: providerType,
      bio: bio,
    };

    try {
      const response = await fetch('https://health.prestigedelta.com/provider/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.status !== 200) {
        setMessage(result.message || 'An error occurred');
      } else {
        localStorage.setItem('user-info', JSON.stringify(result));
        navigate('/'); // Redirect to LoginPage
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during updating');
    }
    alert('Form Submitted: ' + JSON.stringify(formData, null, 2));
  };

  return (
    <div>
        
  
    <div className="provider-container">
    <div className="back-icon" onClick={() => navigate('/register')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>


      <h1 className="provider-title">Clinic Registration</h1>

      <input
        className="provider-input"
        type="text"
        placeholder="Clinic/Hospital Name"
        value={clinicName}
        onChange={(e) => setClinicName(e.target.value)}
      />

      <input
        className="provider-input"
        type="text"
        placeholder="Specialty (e.g cardiologist)"
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
      />
    
      <Select
        className="provider-select"
        options={qualificationOptions}
        value={qualifications}
        onChange={(selectedOption) => setQualifications(selectedOption)}
        placeholder="Select Qualification"
      />

      <div className="provider-date-container">
        <label htmlFor="dateOfRegistration">Date of Registration</label>
        <input
          id="dateOfRegistration"
          className="provider-input"
          type="date"
          value={dateOfRegistration.toISOString().split('T')[0]}
          onChange={handleDateChange}
        />
      </div>

      <textarea
        className="provider-textarea"
        placeholder="Bio (e.g cardiologist with over 7 years of practice)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      ></textarea>

      {message && <p className="provider-message">{message}</p>}

      <button className="provider-button" onClick={handleSubmit}>
        Submit
      </button>
    </div>
    </div>
  );
};

export default ProviderPage;
