# Provider Dashboard - Component Architecture

## 🏗️ Component Hierarchy

```
App.js
├── Route: /provider-dashboard
│   └── ProviderDashboard
│       ├── Header (Sticky)
│       │   ├── Logo & Title
│       │   └── Logout Button
│       │
│       ├── Business Metrics Section
│       │   ├── ConsultationRateCard
│       │   ├── ExpectedPayoutCard
│       │   ├── ActivePatientsCard
│       │   └── PendingChurnedCard
│       │
│       ├── Patient Categories (Tabs)
│       │   ├── Tab: Active Patients
│       │   │   └── Grid of PatientCard[]
│       │   │       └── PatientCard
│       │   │           ├── Avatar
│       │   │           ├── Patient Info
│       │   │           ├── Health Score Badge
│       │   │           ├── Chronic Conditions
│       │   │           ├── Care Plan Objective
│       │   │           └── Last Medical Review
│       │   │
│       │   ├── Tab: Pending Patients
│       │   │   └── Grid of PatientCard[]
│       │   │
│       │   └── Tab: Churned Patients
│       │       └── Grid of PatientCard[]
│       │
│       └── PatientDetailModal (Conditional)
│           ├── Modal Header
│           │   ├── Patient Avatar
│           │   ├── Patient Name
│           │   └── Subscription Status Badge
│           │
│           ├── Tab: Overview
│           │   ├── Profile Information Card
│           │   ├── Health Metrics Card
│           │   ├── Chronic Conditions Card
│           │   └── Emergency Contact Card
│           │
│           ├── Tab: Medical Reviews
│           │   ├── Summary Statistics
│           │   └── Accordion of Reviews
│           │       └── ReviewItem[]
│           │           ├── Review Header
│           │           ├── Chief Complaint
│           │           ├── History & Examination
│           │           ├── Assessment & Diagnosis
│           │           ├── Management Plan
│           │           ├── Prescriptions List
│           │           └── Clinical Score
│           │
│           ├── Tab: Care Plan
│           │   ├── Condition Overview Card
│           │   ├── Hospitalization Risk Card
│           │   ├── Prevention Focus Card
│           │   ├── Risk Factors Card
│           │   ├── Lifestyle Modifications Card
│           │   ├── Monitoring Priorities Card
│           │   ├── Early Warning Signs Card
│           │   ├── Success Metrics Card
│           │   └── Insurance Information Card
│           │
│           └── Tab: Metrics
│               └── Stack of MetricChart[]
│                   └── MetricChart
│                       ├── Chart Header
│                       │   ├── Metric Name
│                       │   ├── Status Badge
│                       │   ├── Impact Badge
│                       │   ├── Current Value
│                       │   └── Trend Indicator
│                       ├── Range Information
│                       ├── Line Chart (Chart.js)
│                       └── Recent Readings List
│
└── Route: /provider-dashboard-docs
    └── ProviderDashboardDocs
        ├── Header
        ├── Quick Start Guide
        ├── Features List
        ├── Code Examples (Tabs)
        │   ├── Fetching Dashboard Data
        │   ├── Opening Patient Details
        │   └── Using in Components
        ├── API Response Structure
        ├── Subscription Status Codes
        └── Error Handling Guide
```

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Login                           │
│                     (Provider Account)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Navigate to /provider-dashboard            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               ProviderDashboard Component                    │
│                                                               │
│   useEffect(() => { fetchDashboardData() }, [])             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  getAccessToken() from api.js                │
│                                                               │
│   • Retrieves refresh token from localStorage                │
│   • Calls /tokenrefresh/ endpoint                           │
│   • Updates access token                                     │
│   • Returns fresh JWT                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         API Call: GET /providerdashboard/                    │
│                                                               │
│   Headers: { Authorization: Bearer <token> }                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend Response                         │
│                                                               │
│   {                                                          │
│     provider_info: { ... },                                 │
│     patients: {                                             │
│       active: [...],                                        │
│       pending: [...],                                       │
│       churned: [...]                                        │
│     }                                                        │
│   }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              State Update: setDashboardData(data)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Component Re-render                      │
│                                                               │
│   • Business Metrics Display                                 │
│   • Patient Lists Populate                                   │
│   • Loading State Removed                                    │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐         ┌──────────────────────┐
│ User Clicks      │         │ User Stays on        │
│ Patient Card     │         │ Dashboard            │
└────────┬─────────┘         └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         fetchPatientDetails(patientId)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│      API Call: GET /providerdashboard/{patient_id}/         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Patient Detail Response                   │
│                                                               │
│   {                                                          │
│     id: 123,                                                │
│     profile_data: {...},                                    │
│     medical_reviews: {...},                                 │
│     full_medical_reviews: [...],                            │
│     remote_care_plan: {...},                                │
│     metrics: [...]                                          │
│   }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           State Update: setSelectedPatient(patient)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            PatientDetailModal Opens                          │
│                                                               │
│   • Overview Tab (Default)                                   │
│   • Medical Reviews Tab                                      │
│   • Care Plan Tab                                            │
│   • Metrics Tab with Charts                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 State Management

```javascript
// ProviderDashboard Component State
const [dashboardData, setDashboardData] = useState(null)
//    └── Shape: { provider_info: {...}, patients: {...} }

const [selectedPatient, setSelectedPatient] = useState(null)
//    └── Shape: { id, profile_data, medical_reviews, ... }

const [loading, setLoading] = useState(true)
//    └── Boolean: Shows spinner during fetch

const [selectedTab, setSelectedTab] = useState(0)
//    └── Number: Active tab index (0=Active, 1=Pending, 2=Churned)
```

## 🎨 Styling Architecture

```
ProviderDashboard.css
├── Layout Classes
│   ├── .provider-dashboard
│   ├── .dashboard-header
│   └── .chart-container
│
├── Component Classes
│   ├── .metric-card
│   ├── .patient-card
│   ├── .status-badge
│   └── .accordion-item
│
├── Animation Classes
│   ├── .metric-trend-up
│   ├── .metric-trend-down
│   ├── .loading-spinner
│   └── @keyframes pulse-soft
│
└── Utility Classes
    ├── .health-score-excellent
    ├── .health-score-good
    ├── .health-score-poor
    └── Responsive Media Queries
```

## 🎯 Props Flow

```javascript
// ProviderDashboard → PatientCard
<PatientCard
  patient={patientObject}        // Full patient data
  status="active|pending|churned" // Subscription status
  onClick={() => handleClick()}   // Open detail modal
/>

// ProviderDashboard → PatientDetailModal
<PatientDetailModal
  patient={selectedPatient}      // Complete patient object
  onClose={() => setNull()}      // Close modal callback
/>

// PatientDetailModal → MetricChart
<MetricChart
  metric={metricObject}          // Metric with records array
/>
```

## 📦 Module Dependencies

```
ProviderDashboard.jsx
├── React (useState, useEffect)
├── react-router-dom (useNavigate)
├── @chakra-ui/react (Box, Card, Tabs, etc.)
├── react-icons/fi (Feather icons)
├── ../api (getAccessToken)
├── ./PatientCard
└── ./PatientDetailModal
    ├── date-fns (format)
    └── ./MetricChart
        ├── react-chartjs-2 (Line)
        ├── chart.js (Chart components)
        └── date-fns (format)
```

## 🔐 Authentication Flow

```
User Login
    ↓
localStorage.setItem('user-info', {
  access: "jwt_token",
  refresh: "refresh_token",
  user: { ... }
})
    ↓
Navigate to /provider-dashboard
    ↓
getAccessToken()
    ↓
Check token expiry
    ↓
If expired → Call /tokenrefresh/
    ↓
Return fresh token
    ↓
Use in API headers
```

## 📱 Responsive Breakpoints

```
Base (0px)
├── Mobile Layout
├── Single Column
└── Stacked Cards

SM (480px)
├── Small Devices
└── 2 Column Grids

MD (768px)
├── Tablet Layout
├── 2 Column Stats
└── Tabbed Navigation

LG (992px)
├── Desktop Layout
├── 3-4 Column Stats
└── Side-by-side Modals

XL (1280px)
├── Large Desktop
├── Full 4 Column Layout
└── Expanded Charts
```

## 🎭 Component Variants

### PatientCard States
- **Default**: Normal card appearance
- **Hover**: Elevated with shadow
- **Active**: Green accent
- **Pending**: Yellow accent
- **Churned**: Red accent

### MetricChart States
- **Normal**: Green status badge
- **Caution**: Yellow status badge
- **Alert**: Red status badge
- **No Data**: Empty state with icon

### Modal States
- **Loading**: Spinner in center
- **Loaded**: Full content with tabs
- **Error**: Error message with retry

## 🚀 Performance Optimizations

```
Component Level:
├── React.memo() for PatientCard
├── useMemo() for filtered lists
└── useCallback() for handlers

API Level:
├── Backend prefetch_related
├── Data limiting (last 5 reviews)
└── Metric record limits (last 10)

Rendering:
├── Conditional rendering
├── Lazy loading for modal
└── Virtualized lists (future)
```

---

**This architecture provides:**
✅ Clear component hierarchy  
✅ Efficient data flow  
✅ Proper state management  
✅ Responsive design patterns  
✅ Performance optimizations  
✅ Security best practices  
