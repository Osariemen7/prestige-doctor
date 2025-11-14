# Investigation Management - Quick Start Guide

## 🚀 Getting Started (3 Steps)

### Step 1: Verify Dependencies
All required dependencies are already installed in your project:
- ✅ `@mui/material` - Material-UI components
- ✅ `@mui/icons-material` - Icons
- ✅ `@mui/x-date-pickers` - Date/time pickers
- ✅ `date-fns` - Date utilities
- ✅ `react-router-dom` - Routing

### Step 2: Start Your Development Server
```bash
npm start
```

### Step 3: Access the Feature
1. Login as a doctor
2. Look for "Investigations" in the sidebar menu (Science icon 🧪)
3. Click to open the investigation management dashboard

---

## 🎯 First Time Use

### Create Your First Investigation Request

1. **Click "New Investigation" button** (top right, blue gradient button)

2. **Enter Patient Information:**
   - Patient ID: Enter the patient's ID number
   - Payment Method: Select from dropdown (Out of Pocket, Insurance, HMO)

3. **Select Tests:**
   - Click the "Select Test" dropdown
   - Search for tests (e.g., "Blood", "CBC", "Glucose")
   - Tests are grouped by category
   - See price displayed for each test

4. **Fill Test Details:**
   - Test Type: Auto-filled when you select a test
   - Reason: Why this test is needed (e.g., "Annual checkup")
   - Scheduled Time: When the test should be done

5. **Add More Tests (Optional):**
   - Click "Add Test" button
   - Repeat the process for additional tests
   - Remove tests with the red trash icon

6. **Review Total:**
   - See total cost at the bottom
   - Shows number of tests and currency

7. **Create Order Option:**
   - Toggle "Create Order Immediately" to generate payment order
   - If off, creates request without order (can create order later)

8. **Submit:**
   - Click "Create Request" or "Create Request & Order"
   - View confirmation
   - Request appears in your dashboard

---

## 📊 Understanding the Dashboard

### Top Statistics (4 Cards)
1. **Total Requests** - All investigation requests you've created
2. **Pending Payments** - Orders awaiting patient payment
3. **Completed Tests** - Paid and fulfilled investigations
4. **Total Revenue** - Your earnings from investigations (with trend)

### Navigation Tabs
- **Pending** - Requests without orders (need to create order)
- **All Orders** - Complete order history
- **Pending Payment** - Orders waiting for payment
- **Paid** - Completed orders

### Search Bar
- Type patient name, phone number, or test type
- Results filter in real-time

---

## 🔍 Viewing Investigation Details

### From Pending Requests
1. Find the request in "Pending" tab
2. Click "View Details" button
3. See patient info, tests, and costs
4. Options:
   - Edit Request - Modify tests
   - Create Order - Generate payment order

### From Orders
1. Find the order in any order tab
2. Click "View Order" button
3. See complete order details:
   - Patient information
   - All tests ordered
   - Payment status and history
   - Timeline of order events
   - Checkout link (if pending payment)

---

## 💳 Payment Process

### For Pending Payment Orders
1. Navigate to order details
2. See "Payment Pending" alert box
3. Click "Open Checkout" button
4. Share checkout link with patient
5. Patient completes payment
6. Order moves to "Paid" tab
7. Revenue updates automatically

---

## ✏️ Editing Investigations

### To Edit a Pending Request:
1. Open the request details
2. Click "Edit Request" button
3. Modify:
   - Add new tests
   - Update existing tests
   - Remove tests (omit from list)
   - Change scheduled times
   - Update reasons
4. Save changes
5. Optionally create order

**Note:** You can only edit pending requests (not yet ordered)

---

## 💰 Tracking Revenue

### Real-Time Revenue Tracking
- **Dashboard Card**: Shows total revenue with trend
- **Paid Tab**: See all completed orders
- **Order Details**: Individual order amounts

### Revenue Calculation
- Sum of all paid order amounts
- Updated immediately on payment
- Trend percentage shows growth

---

## 📱 Mobile Usage

### Mobile Features
- Floating menu button (top left)
- Tap to open sidebar
- Swipe-friendly navigation
- Stacked cards for easy viewing
- Scrollable tabs
- Touch-optimized buttons

### Best Practices
- Use landscape for better view
- Tap and hold for tooltips
- Swipe tabs horizontally

---

## 🎨 Interface Elements Guide

### Color Meanings
- **Blue** - Primary actions, main elements
- **Green** - Success, completed, paid
- **Orange** - Pending, warning, awaiting action
- **Red** - Failed, error, delete
- **Gray** - Neutral, secondary information

### Button Types
- **Contained (Solid)** - Primary actions (New Investigation, Submit)
- **Outlined** - Secondary actions (Edit, View)
- **Text** - Tertiary actions (Back, Cancel)

### Status Badges
- Colored chips showing status
- Round corners for modern look
- Pulse animation on active statuses

---

## 🔧 Common Tasks

### Task 1: Order Multiple Tests for One Patient
1. Click "New Investigation"
2. Enter patient ID
3. Click "Add Test" multiple times
4. Select different tests
5. Fill details for each
6. Check total cost
7. Create order

### Task 2: Find a Specific Investigation
1. Use search bar
2. Type patient name, phone, or test type
3. Click through tabs to filter by status
4. Click "View Details" on result

### Task 3: Convert Request to Order
1. Go to "Pending" tab
2. Click "View Details" on request
3. Review tests and costs
4. Click "Create Order"
5. Share checkout link with patient

### Task 4: Check Payment Status
1. Go to order tabs
2. Look at status badge color:
   - Orange = Pending payment
   - Green = Paid
3. Click "View Order" for timeline
4. See payment checkpoints

---

## ⚠️ Troubleshooting

### Issue: Can't See Investigations Menu
**Solution:** 
- Ensure you're logged in as a doctor
- Refresh the page
- Check sidebar for Science icon 🧪

### Issue: Tests Not Loading in Dropdown
**Solution:**
- Check internet connection
- Verify API endpoint is accessible
- Look for errors in browser console (F12)

### Issue: Can't Create Order
**Solution:**
- Verify patient ID is correct
- Ensure all required fields are filled
- Check that at least one test is selected
- Look for validation error messages

### Issue: Checkout Link Not Working
**Solution:**
- Verify order is in pending status
- Check that checkout_url is present
- Try copying link manually
- Ensure patient has payment method setup

---

## 🎯 Pro Tips

1. **Bulk Testing** - Add multiple tests at once for comprehensive checkups
2. **Standard Packages** - Create common test combinations (Annual, Diabetes, Cardiac)
3. **Scheduling** - Schedule tests for optimal timing
4. **Follow-ups** - Use search to track patient investigation history
5. **Revenue Optimization** - Monitor trend to identify popular tests
6. **Mobile Efficiency** - Use mobile for quick requests on the go

---

## 📖 API Integration Notes

### Endpoints Used
- Default Listings - Browse available tests
- Pending Investigations - Get requests without orders
- Manage (Unified) - Create/update requests
- Investigation Orders - Track payments

### Authentication
- Automatic token handling
- Auto-refresh on expiry
- Secure API calls

### Error Handling
- User-friendly error messages
- Retry logic for failed requests
- Validation feedback

---

## 🎓 Learning Resources

### Understanding Investigation Workflow
1. Doctor creates request
2. Tests added to request
3. Order created (immediate or later)
4. Patient receives checkout link
5. Payment completed
6. Investigation fulfilled
7. Results delivered

### Key Concepts
- **Investigation Request** - Container for tests
- **Investigation** - Individual test in request
- **Listing** - Available test from lab catalog
- **Order** - Payment record for investigations
- **Checkout** - Payment processing link

---

## 🏆 Success Checklist

- [ ] Created first investigation request
- [ ] Added multiple tests to one request
- [ ] Created order from request
- [ ] Viewed order details
- [ ] Checked payment status
- [ ] Used search functionality
- [ ] Navigated all tabs
- [ ] Viewed revenue statistics
- [ ] Tested on mobile device
- [ ] Shared checkout link

---

## 📞 Need Help?

### Quick Checks
1. Browser console (F12) for errors
2. Network tab for failed API calls
3. Local storage for authentication token
4. React DevTools for component state

### Common Solutions
- Clear browser cache
- Logout and login again
- Check API endpoint availability
- Verify internet connection

---

## 🎉 You're Ready!

Start managing patient investigations and generating revenue with this powerful, elegant feature. The interface is designed to be intuitive, so explore and discover more features as you use it.

**Happy investigating!** 🧪💙
