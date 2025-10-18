import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = await getAccessToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('https://service.prestigedelta.com/providerdashboard/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate('/create-encounter');
  };

  const handleViewReviews = () => {
    navigate('/reviews');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={handleViewReviews}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              View Reviews
            </button>
            <button
              onClick={handleCreateNew}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Create New Encounter
            </button>
          </div>
        </div>

        {dashboardData && (
          <div className="space-y-8">
            {/* Provider Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Consultation Rate</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ₦{dashboardData.provider_info?.consultation_rate?.toLocaleString() || '0'}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Expected Monthly Payout</h3>
                <p className="text-2xl font-bold text-green-600">
                  ₦{dashboardData.provider_info?.expected_monthly_payout?.toLocaleString() || '0'}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Active Patients</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboardData.provider_info?.active_subscribed_patients_count || 0}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Pending Patients</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardData.provider_info?.pending_subscribed_patients_count || 0}
                </p>
              </div>
            </div>

            {/* Patients List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Patient Activity</h2>
              </div>
              
              <div className="divide-y">
                {dashboardData.patients && dashboardData.patients.length > 0 ? (
                  dashboardData.patients.map((patient) => (
                    <div key={patient.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {patient.user?.first_name} {patient.user?.last_name}
                          </h3>
                          <p className="text-gray-600">{patient.user?.phone_number}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Last encounter: {patient.last_encounter_date ? 
                              new Date(patient.last_encounter_date).toLocaleDateString() : 
                              'No encounters yet'}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Recent Reviews:</span>
                              <span className="ml-2 text-blue-600">{patient.recent_reviews_count || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Active Metrics:</span>
                              <span className="ml-2 text-green-600">{patient.active_care_plan_metrics_count || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Recent Records:</span>
                              <span className="ml-2 text-purple-600">{patient.recent_metric_records_count || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Pending Reviews:</span>
                              <span className="ml-2 text-orange-600">{patient.pending_ai_review_count || 0}</span>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              patient.subscription_status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {patient.subscription_status || 'unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    No patients found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;