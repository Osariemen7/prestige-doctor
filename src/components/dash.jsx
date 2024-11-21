import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';
import Sidebar from './sidebar'; // Import Sidebar component

const DashboardPage = () => {
  const navigate = useNavigate();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');

  const getAccessToken = () => {
    try {
      const userInfo = localStorage.getItem('user-info');
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

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/medicalreview/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          navigate('/');
        } else {
          const result = await response.json();
          setDataList(result);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  const handleViewDetails = (item) => {
    navigate('/detail', { state: { item } });
  };

  const handleLogout = () => {
    localStorage.removeItem('user-info');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      {/* Persistent Sidebar */}
      <Sidebar navigate={navigate} handleLogout={handleLogout} />

      {/* Main Content */}
      <div className="main-content">
        <h1 className="dashboard-header">Patient Health Dashboard</h1>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="data-list">
            {dataList.map((item, index) => (
              <div
                key={item?.id || index}
                className="item-container"
                onClick={() => handleViewDetails(item)}
              >
                <p className="item-text"><strong>Chief Complaint:</strong> {item.chief_complaint}</p>
                <p className="item-text"><strong>Diagnosis:</strong> {item.assessment_diagnosis}</p>
                <p className="item-text"><strong>Medication:</strong> {item.medication}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
