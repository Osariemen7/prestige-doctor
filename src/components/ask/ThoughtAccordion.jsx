import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme, alpha } from '@mui/material/styles';
import CitationLink from './CitationLink'; // Import CitationLink

const ThoughtAccordion = ({ thinkContent, citations }) => {
  const theme = useTheme();
  // Use the primary blue color for consistency with citations
  const primaryBlue = theme.palette.primary.main; // Typically a shade of blue

  return (
    <Accordion
      elevation={0} // Remove default elevation
      sx={{
        mb: 2,
        border: `1px solid ${alpha(primaryBlue, 0.3)}`, // Lighter blue border
        borderRadius: 2, // Consistent border radius
        '&:before': { display: 'none' }, // Remove default top border
        background: theme.palette.background.paper, // Use whitish background (theme's paper color)
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: primaryBlue }} />} // Blue expand icon
        aria-controls="panel1a-content"
        id="panel1a-header"
        sx={{
          minHeight: '40px', // Reduce height
          '& .MuiAccordionSummary-content': { my: 0.5 }, // Adjust margin
          borderBottom: `1px solid ${alpha(primaryBlue, 0.2)}`, // Very light blue border for summary
          backgroundColor: alpha(primaryBlue, 0.03), // Very subtle blue background for header
          '&:hover': { background: alpha(primaryBlue, 0.06) } // Slightly darker hover effect
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 'medium', color: theme.palette.primary.dark }}>
          AI Reasoning (Why this answer?)
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1.5, pb: 1.5, background: theme.palette.background.paper }}> {/* Ensure details background is also white */}
        <ReactMarkdown
          skipHtml={true}
          remarkPlugins={[remarkGfm]}
          components={{ a: CitationLink }} // Use the styled CitationLink
        >
          {thinkContent}
        </ReactMarkdown>
      </AccordionDetails>
    </Accordion>
  );
};

export default ThoughtAccordion;
