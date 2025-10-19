# Provider Dashboard Implementation Guide

## 🎯 Overview

The Provider Dashboard is a comprehensive business and patient management system for healthcare providers. It provides real-time insights into practice performance, patient welfare, and clinical metrics.

## 📁 File Structure

```
src/
├── components/
│   ├── ProviderDashboard.jsx        # Main dashboard component
│   ├── ProviderDashboard.css        # Dashboard styles
│   ├── PatientCard.jsx              # Patient card component
│   ├── PatientDetailModal.jsx       # Patient detail modal
│   ├── MetricChart.jsx              # Metric visualization
│   ├── ProviderNavigation.jsx       # Navigation menu
│   ├── ProviderQuickAccess.jsx      # Quick access card
│   └── ProviderDashboardDocs.jsx    # Documentation page
├── api.js                           # API utilities
└── App.js                           # Route configuration
```

## 🚀 Getting Started

### 1. Navigate to the Dashboard

After logging in with a provider account, navigate to:
```
/provider-dashboard
```

### 2. Required Dependencies

All dependencies are already installed:
- `@chakra-ui/react` - UI components
- `react-chartjs-2` - Charts
- `chart.js` - Chart library
- `date-fns` - Date formatting
- `react-icons` - Icons
- `react-router-dom` - Routing

### 3. Authentication

The dashboard requires a valid provider account. Authentication is handled automatically via the `getAccessToken()` function from `api.js`.

## 🏗️ Component Architecture

### ProviderDashboard (Main Component)

**Location:** `src/components/ProviderDashboard.jsx`

**Features:**
- Fetches dashboard data on mount
- Displays business metrics
- Shows categorized patient lists
- Handles patient detail navigation
- Manages loading and error states

**Key Functions:**
```javascript
fetchDashboardData()     // Fetch main dashboard data
fetchPatientDetails(id)  // Fetch specific patient details
handleLogout()           // User logout
```

### PatientCard

**Location:** `src/components/PatientCard.jsx`

**Props:**
- `patient` - Patient object with profile and review data
- `status` - Patient status (active/pending/churned)
- `onClick` - Callback when card is clicked

**Displays:**
- Patient avatar and name
- Age and contact info
- Health score
- Chronic conditions
- Care plan objective
- Last medical review

### PatientDetailModal

**Location:** `src/components/PatientDetailModal.jsx`

**Props:**
- `patient` - Complete patient object
- `onClose` - Callback to close modal

**Tabs:**
1. **Overview** - Profile, health metrics, emergency contact
2. **Medical Reviews** - All reviews with expandable details
3. **Care Plan** - Remote care plan details
4. **Metrics** - Interactive charts

### MetricChart

**Location:** `src/components/MetricChart.jsx`

**Props:**
- `metric` - Metric object with records and ranges

**Features:**
- Line chart with trend visualization
- Normal/caution range overlays
- Status badges (Normal/Caution/Alert)
- Recent readings list
- Trend indicators

## 🔌 API Integration

### Endpoints Used

#### 1. Get Dashboard Data
```javascript
GET https://service.prestigedelta.com/providerdashboard/

Response:
{
  provider_info: {
    consultation_rate: number,
    currency: string,
    expected_monthly_payout: number,
    active_subscribed_patients_count: number,
    pending_subscribed_patients_count: number,
    churned_patients_count: number
  },
  patients: {
    active: Patient[],
    pending: Patient[],
    churned: Patient[]
  }
}
```

#### 2. Get Patient Details
```javascript
GET https://service.prestigedelta.com/providerdashboard/{patient_id}/

Response:
{
  id: number,
  profile_data: {...},
  medical_reviews: {...},
  full_medical_reviews: [...],
  remote_care_plan: {...},
  metrics: [...],
  subscription_status: string,
  pending_ai_review_count: number
}
```

### Authentication Flow

```javascript
import { getAccessToken } from '../api';

const fetchData = async () => {
  const token = await getAccessToken();
  
  if (!token) {
    navigate('/login');
    return;
  }

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

## 🎨 Styling Guide

### Theme Colors

**Patient Status:**
- Active: Green (`green.500`)
- Pending: Yellow (`yellow.500`)
- Churned: Red (`red.500`)

**Health Score:**
- 80-100: Green (Excellent)
- 60-79: Yellow (Good)
- 0-59: Red (Poor)

**Impact Categories:**
- High: Red
- Medium: Orange
- Low: Green

### Custom CSS Classes

Located in `ProviderDashboard.css`:

```css
.metric-card          /* Business metric cards */
.patient-card         /* Patient list cards */
.chart-container      /* Chart wrapper */
.status-badge         /* Status indicators */
.metric-trend-up      /* Upward trends */
.metric-trend-down    /* Downward trends */
```

### Responsive Breakpoints

```javascript
{
  base: '0px',    // Mobile
  sm: '480px',    // Small devices
  md: '768px',    // Tablets
  lg: '992px',    // Desktops
  xl: '1280px',   // Large desktops
}
```

## 📊 Data Flow

```
1. User navigates to /provider-dashboard
2. ProviderDashboard component mounts
3. useEffect triggers fetchDashboardData()
4. getAccessToken() retrieves/refreshes JWT
5. API call to /providerdashboard/
6. Data stored in state
7. UI renders with data
8. User clicks patient card
9. fetchPatientDetails(patientId) called
10. API call to /providerdashboard/{id}/
11. PatientDetailModal opens with data
```

## 🔧 Customization

### Adding New Business Metrics

Edit `ProviderDashboard.jsx`:

```javascript
<Card bg={cardBg} boxShadow="md" borderRadius="xl">
  <CardBody>
    <Stat>
      <Flex justify="space-between" align="start">
        <Box>
          <StatLabel color="gray.600">Your Metric</StatLabel>
          <StatNumber fontSize="3xl" color="blue.500">
            {provider_info.your_metric}
          </StatNumber>
          <StatHelpText>Description</StatHelpText>
        </Box>
        <Icon as={FiYourIcon} w={8} h={8} color="blue.500" />
      </Flex>
    </Stat>
  </CardBody>
</Card>
```

### Adding Custom Patient Filters

```javascript
const [filter, setFilter] = useState('all');

const filteredPatients = patients.active.filter(patient => {
  if (filter === 'high-risk') {
    return patient.profile_data.health_score < 60;
  }
  return true;
});
```

### Adding Export Functionality

```javascript
const exportToPDF = () => {
  // Use html2pdf or jsPDF library
  const element = document.getElementById('dashboard-content');
  html2pdf().from(element).save('dashboard.pdf');
};
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Dashboard loads with proper authentication
- [ ] Business metrics display correctly
- [ ] Patient cards render in all three categories
- [ ] Clicking patient card opens detail modal
- [ ] All tabs in detail modal work
- [ ] Charts render with proper data
- [ ] Logout function works
- [ ] Error handling displays properly
- [ ] Loading states show correctly
- [ ] Responsive design works on mobile

### Common Issues

**Issue: Dashboard shows "User is not a provider"**
- Solution: Ensure logged-in user has provider privileges

**Issue: Charts not rendering**
- Solution: Check Chart.js registration in MetricChart.jsx
- Verify metric data has valid records array

**Issue: Patient details not loading**
- Solution: Check patient_id is correctly passed
- Verify API endpoint accessibility

## 🚦 Performance Optimization

### Current Optimizations

1. **Prefetching**: Backend uses `prefetch_related` for efficient queries
2. **Data Limiting**: API limits reviews to last 5, metrics to last 10
3. **Lazy Loading**: Modal only fetches data when opened
4. **Memoization**: Use React.memo for PatientCard

### Future Optimizations

```javascript
// Add React.memo to components
const PatientCard = React.memo(({ patient, status, onClick }) => {
  // Component code
}, (prevProps, nextProps) => {
  return prevProps.patient.id === nextProps.patient.id;
});

// Implement pagination
const [page, setPage] = useState(1);
const patientsPerPage = 10;
const paginatedPatients = patients.active.slice(
  (page - 1) * patientsPerPage,
  page * patientsPerPage
);

// Add infinite scroll
import { useInfiniteScroll } from 'react-infinite-scroll-hook';
```

## 📱 Mobile Responsiveness

### Mobile-First Approach

```javascript
// Grid layouts adjust for mobile
<Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>

// Stat cards stack on mobile
<SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>

// Text size adjusts
<Heading size={{ base: 'md', md: 'lg' }}>

// Hide elements on small screens
<Box display={{ base: 'none', md: 'block' }}>
```

## 🔒 Security Best Practices

1. **Token Management**: Always use `getAccessToken()` for automatic refresh
2. **Sensitive Data**: Never log patient data in production
3. **Error Messages**: Use generic errors, don't expose system details
4. **HTTPS Only**: All API calls use secure connections
5. **Access Control**: Backend validates provider status on every request

## 🎯 Future Enhancements

### Planned Features

1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Filtering**: Search, sort, and filter patients
3. **Bulk Actions**: Manage multiple patients at once
4. **Export Reports**: PDF/Excel export of dashboard data
5. **Notifications**: Alert system for critical patient events
6. **Calendar Integration**: Schedule and track appointments
7. **Messaging**: In-app communication with patients
8. **AI Insights**: Predictive analytics and recommendations

### Implementation Ideas

```javascript
// Real-time updates with WebSocket
useEffect(() => {
  const ws = new WebSocket('wss://service.prestigedelta.com/ws/dashboard');
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    setDashboardData(prevData => ({
      ...prevData,
      ...update
    }));
  };

  return () => ws.close();
}, []);

// Advanced search
const [searchTerm, setSearchTerm] = useState('');
const filteredPatients = patients.active.filter(p =>
  p.profile_data.full_name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

## 📞 Support

For technical issues or questions:
- Check the browser console for errors
- Review API responses in Network tab
- Verify authentication tokens
- Contact development team

## 📚 Additional Resources

- [Chakra UI Documentation](https://chakra-ui.com/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [React Router Documentation](https://reactrouter.com/)
- [API Documentation](./CLIENT_DOCUMENTATION_API.md)

---

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Maintainer:** Development Team
