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
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';

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

// Mobile card view for investigations
const InvestigationCard = ({ investigation }) => (
  <Card elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        {investigation.test_type || 'N/A'}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Reason:</strong> {investigation.reason || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Scheduled:</strong> {formatDate(investigation.scheduled_time)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            <strong>Status:</strong>
          </Typography>
          <Chip 
            label={investigation.status || 'Pending'} 
            size="small"
            color={investigation.status === 'Completed' ? 'success' : investigation.status === 'Cancelled' ? 'error' : 'default'}
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Instructions:</strong> {investigation.additional_instructions || 'None'}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const InvestigationsDisplay = ({ investigations = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!investigations || investigations.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
        <ScienceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
          No Investigations Ordered
        </Typography>
        <Typography variant="body2" color="text.secondary">
          There are no investigations recorded for this consultation note.
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
        Investigations Ordered
      </Typography>
      
      {isMobile ? (
        // Mobile card layout
        <Box>
          {investigations.map((inv, index) => (
            <InvestigationCard key={index} investigation={inv} />
          ))}
        </Box>
      ) : (
        // Desktop table layout
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table aria-label="investigations table">
            <TableHead sx={{ backgroundColor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Test Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Scheduled Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Additional Instructions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {investigations.map((inv, index) => (
                <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {inv.test_type || 'N/A'}
                  </TableCell>
                  <TableCell>{inv.reason || 'N/A'}</TableCell>
                  <TableCell>{formatDate(inv.scheduled_time)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={inv.status || 'Pending'} 
                      size="small"
                      color={inv.status === 'Completed' ? 'success' : inv.status === 'Cancelled' ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{inv.additional_instructions || 'None'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default InvestigationsDisplay;
