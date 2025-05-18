import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // Example icon

// Helper function to format date strings
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

// Mobile card view for prescriptions
const PrescriptionCard = ({ prescription }) => (
  <Card elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        {prescription.medication_name || 'N/A'} - {prescription.dosage || 'N/A'}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Route:</strong> {prescription.route || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Interval:</strong> {prescription.interval || 'N/A'} hours
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Period:</strong> {formatDate(prescription.start_date)} - {formatDate(prescription.end_date)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            <strong>Status:</strong>
          </Typography>
          <Chip 
            label={prescription.status || 'Active'} 
            size="small"
            color={prescription.status === 'Completed' ? 'success' : prescription.status === 'Cancelled' ? 'error' : 'primary'}
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Instructions:</strong> {prescription.instructions || 'None'}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const PrescriptionsDisplay = ({ prescriptions = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
        <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          No Prescriptions Issued
        </Typography>
        <Typography variant="body2" color="text.secondary">
          There are no prescriptions recorded for this consultation note.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, overflow: 'hidden' }}>
      <Typography variant="h6" gutterBottom sx={{ 
        fontWeight: 'bold', 
        color: 'primary.dark', 
        mb: 2,
        fontSize: { xs: '1rem', sm: '1.25rem' }
      }}>
        Prescriptions
      </Typography>

      {isMobile ? (
        // Mobile card layout
        <Box>
          {prescriptions.map((rx, index) => (
            <PrescriptionCard key={index} prescription={rx} />
          ))}
        </Box>
      ) : (
        // Desktop table layout
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table aria-label="prescriptions table">
            <TableHead sx={{ backgroundColor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Medication</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Dosage</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Route</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Interval (hrs)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Instructions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prescriptions.map((rx, index) => (
                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {rx.medication_name || 'N/A'}
                  </TableCell>
                  <TableCell>{rx.dosage || 'N/A'}</TableCell>
                  <TableCell>{rx.route || 'N/A'}</TableCell>
                  <TableCell>{rx.interval || 'N/A'}</TableCell>
                  <TableCell>{formatDate(rx.start_date)}</TableCell>
                  <TableCell>{formatDate(rx.end_date)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={rx.status || 'Active'} 
                      size="small"
                      color={rx.status === 'Completed' ? 'success' : rx.status === 'Cancelled' ? 'error' : 'primary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{rx.instructions || 'None'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default PrescriptionsDisplay;
