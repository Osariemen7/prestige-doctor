import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AvailabilitySelector = () => {
  const allDaysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  const [availabilities, setAvailabilities] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Calculate available days by filtering out already selected days
  const availableDays = allDaysOfWeek.filter(
    day => !availabilities.some(availability => availability.day_of_week === day)
  );

  const getRefreshToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info');
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) {
        return parsedUserInfo.refresh;
      }
      console.log('No user information found in storage.');
      return null;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
  };

  const getAccessToken = async () => {
    let refresh = await getRefreshToken();
    let term = { refresh };
    let rep = await fetch('https://health.prestigedelta.com/tokenrefresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(term)
    });
    rep = await rep.json();
    if (rep) {
      return rep.access;
    }
  };

  const handleSubmit = async () => {
    const token = await getAccessToken();
    const formData = {
      availabilities: availabilities,
    };

    try {
      const response = await fetch('https://health.prestigedelta.com/availability/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.status !== 200) {
        setMessage(result.message || 'An error occurred');
      } else {
        
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during updating');
    }
  };

  const handleAddAvailability = () => {
    if (!selectedDay || !startTime || !endTime) return;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const newAvailability = {
      day_of_week: selectedDay,
      start_time: { hour: startHour, minute: startMinute },
      end_time: { hour: endHour, minute: endMinute }
    };

    setAvailabilities([...availabilities, newAvailability]);
    // Only reset the selected day, keep the times
    setSelectedDay('');
  };

  const handleRemoveAvailability = (index) => {
    const newAvailabilities = availabilities.filter((_, i) => i !== index);
    setAvailabilities(newAvailabilities);
  };

  const formatTime = (time) => {
    return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  };

  return (
    <div className="provider">
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-medium mb-4">Set your Available Days</h2>
        <div className="mb-8 space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Day of Week</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="">Select a day</option>
              {availableDays.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="p-2 border rounded-md"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="p-2 border rounded-lg"
            />
          </div>

          <button
            onClick={handleAddAvailability}
            disabled={!selectedDay || !startTime || !endTime}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Add Available Day
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Selected Available Days</h3>
          {availabilities.map((availability, index) => (
            <div key={index} className="flex justify-between items-center p-4 border rounded-md">
              <div>
                <span className="font-medium">{availability.day_of_week}</span>
                <span className="ml-4">
                  {formatTime(availability.start_time)} - {formatTime(availability.end_time)}
                </span>
              </div>
              <button
                onClick={() => handleRemoveAvailability(index)}
                className="text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="text-red-500">{message}</p>
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default AvailabilitySelector;