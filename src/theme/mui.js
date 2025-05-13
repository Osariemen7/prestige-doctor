import { createTheme } from '@mui/material/styles';

// Create a theme instance with correct structure for MUI v6
export const muiTheme = createTheme({
  // Essential properties
  palette: {
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      lighter: '#ebf3ff',  // Light background color for primary elements
    },
    secondary: {
      main: '#059669',
      light: '#10b981',
      dark: '#047857',
    },
    success: {
      main: '#059669',
      light: '#10b981',
      dark: '#047857',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
    }
  },
  
  // MUI v6 specific properties
  shape: {
    borderRadius: 8,
  },
  
  // Override component styles - updated for v6
  components: {
    MuiContainer: {
      defaultProps: {
        disableGutters: false,
      },
      styleOverrides: {
        root: ({theme}) => ({
          paddingLeft: 16,
          paddingRight: 16,
          [`${theme.breakpoints.up('sm')}`]: {
            paddingLeft: 24,
            paddingRight: 24,
          }
        })
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600
        },
        containedPrimary: {
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '&:hover': {
            boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
          }
        }
      }
    }
  }
});
