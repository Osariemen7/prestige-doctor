# Provider Dashboard

An elegant, comprehensive dashboard for healthcare providers to monitor their business performance and manage patient care.

## Features

### 📊 Business Overview
- **Consultation Rate**: Track the percentage of assigned patients with consultations
- **Expected Monthly Payout**: View estimated earnings (70% of active subscription revenue)
- **Active Patients**: Monitor currently subscribed patients
- **Pending & Churned Patients**: Keep track of patients requiring attention

### 👥 Patient Management

#### Patient Categories
Patients are automatically organized into three categories:

1. **Active Patients**: Patients with active subscriptions (`is_active=true` and `end_date > current_time`)
2. **Pending Patients**: Patients with inactive subscriptions but not expired (`is_active=false` but `end_date > current_time`)
3. **Churned Patients**: Patients with expired subscriptions (`end_date <= current_time`)

#### Patient Cards Display
Each patient card shows:
- Patient name and avatar
- Age and contact information
- Health score with color-coded badges
- Chronic conditions
- Care plan objective
- Last medical review summary
- Status badge with color coding

### 🔍 Patient Detail View

The comprehensive patient detail modal includes four tabs:

#### 1. Overview Tab
- **Profile Information**: Full contact details, DOB, blood group, occupation, etc.
- **Health Metrics**: Height, weight, BMI, and health score
- **Chronic Conditions**: List of all chronic conditions with badges
- **Emergency Contact**: Complete emergency contact information

#### 2. Medical Reviews Tab
- **Summary Statistics**: Total reviews, recent reviews count, pending AI reviews
- **Full Medical Reviews**: Expandable accordion showing:
  - Review status (finalized/pending/draft)
  - AI-assisted indicator
  - Chief complaint
  - History of present illness
  - Physical examination findings
  - Assessment & diagnosis
  - Management plan
  - Lifestyle advice
  - Follow-up plan
  - Prescriptions with dosage
  - Clinical encounter scores with feedback
  - Reviewing doctor information

#### 3. Care Plan Tab
- **Condition Overview**: Care plan name and details
- **Timeline**: Start and end dates
- **7-Day Hospitalization Risk**: Color-coded risk assessment
- **Prevention Focus**: Primary prevention strategy
- **Risk Factors**: List of addressed risk factors
- **Lifestyle Modifications**: Recommended lifestyle changes
- **Monitoring Priorities**: Key metrics to monitor
- **Early Warning Signs**: Critical symptoms to watch for
- **Success Metrics**: Goals and target values
- **Clinical Rationale**: Evidence-based reasoning
- **Insurance Information**: Provider and member ID

#### 4. Metrics Tab
Interactive charts for each active metric showing:
- **Current Value**: Latest recorded value
- **Status Badge**: Normal/Caution/Alert based on ranges
- **Trend Indicator**: Increase/decrease from previous reading
- **Impact Category**: High/Medium/Low badge
- **Metric Type**: Output/Input/Outcome badge
- **Line Chart**: Visual trend over time with normal range overlay
- **Range Information**: Normal and caution ranges
- **Recent Readings**: Last 3 recordings with timestamps

## Technology Stack

- **React**: UI framework
- **Chakra UI**: Component library for consistent, accessible design
- **Chart.js & react-chartjs-2**: Advanced data visualization
- **React Icons**: Icon library (Feather icons)
- **date-fns**: Date formatting and manipulation
- **React Router**: Navigation

## Routes

- `/provider-dashboard` - Main provider dashboard

## API Integration

The dashboard integrates with two main endpoints:

### 1. Dashboard List Endpoint
```
GET /providerdashboard/
```
Returns provider metrics and categorized patient lists.

### 2. Patient Detail Endpoint
```
GET /providerdashboard/{patient_id}/
```
Returns comprehensive patient information including medical reviews, care plans, and metrics.

## Usage

### Accessing the Dashboard

Navigate to `/provider-dashboard` after logging in with a provider account.

### Viewing Patients

1. Select a tab (Active/Pending/Churned) to view categorized patients
2. Click on any patient card to open the detailed view
3. Navigate through the tabs in the detail modal to explore different aspects of patient care

### Understanding Metrics

- **Green badges**: Values within normal range
- **Yellow badges**: Values in caution range
- **Red badges**: Values outside safe ranges

### Color Coding

- **Active Status**: Green
- **Pending Status**: Yellow
- **Churned Status**: Red
- **Health Score**: 
  - 80-100: Green (Excellent)
  - 60-79: Yellow (Good)
  - 0-59: Red (Needs Attention)

## Components

### Main Components

1. **ProviderDashboard.jsx**: Main dashboard container
2. **PatientCard.jsx**: Individual patient card component
3. **PatientDetailModal.jsx**: Comprehensive patient detail view
4. **MetricChart.jsx**: Interactive metric visualization

### Features

- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Real-time Updates**: Automatic data refresh
- **Loading States**: Elegant loading indicators
- **Error Handling**: Graceful error messages with retry options
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized with lazy loading and code splitting

## Styling

The dashboard uses:
- Chakra UI's theme system for consistent design
- Custom CSS in `ProviderDashboard.css` for animations and effects
- Color mode support (light/dark themes)
- Smooth transitions and hover effects

## Security

- **Authentication Required**: All endpoints require valid JWT tokens
- **Provider Access Only**: 403 error if user is not a provider
- **Automatic Token Refresh**: Seamless token renewal via `getAccessToken()`

## Best Practices

1. **Data Fetching**: Always check for authentication before API calls
2. **Error Handling**: Display user-friendly error messages
3. **Loading States**: Show loading indicators during data fetches
4. **Responsive**: Test on multiple screen sizes
5. **Accessibility**: Use semantic HTML and ARIA labels

## Future Enhancements

- [ ] Real-time notifications for critical alerts
- [ ] Export patient data as PDF
- [ ] Advanced filtering and search
- [ ] Bulk actions for patient management
- [ ] Custom metric dashboards
- [ ] Integration with calendar for appointments
- [ ] Chat/messaging with patients
- [ ] AI-powered insights and recommendations

## Troubleshooting

### Dashboard won't load
- Check authentication token in localStorage
- Verify provider account status
- Check browser console for errors

### Patient details not showing
- Ensure patient ID is valid
- Check network tab for API errors
- Verify provider has access to the patient

### Charts not rendering
- Verify Chart.js is properly installed
- Check metric data format
- Ensure records array has valid data

## Support

For issues or questions, please contact the development team.
