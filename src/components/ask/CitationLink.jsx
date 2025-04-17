import React from 'react';
import { Link } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const CitationLink = ({ href, children }) => {
  const theme = useTheme();
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        color: theme.palette.primary.dark, // Use darker blue for better contrast
        textDecoration: 'none', // Remove default underline
        fontWeight: 500, // Slightly bolder
        borderBottom: `1px dashed ${theme.palette.primary.light}`, // Dashed underline
        transition: 'color 0.2s, border-bottom-color 0.2s',
        '&:hover': {
          color: theme.palette.primary.main,
          borderBottomColor: theme.palette.primary.main, // Solid underline on hover
          borderBottomStyle: 'solid',
        },
      }}
    >
      {children}
    </Link>
  );
};

export default CitationLink;
