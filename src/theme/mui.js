import { experimental_extendTheme as extendTheme } from '@mui/material/styles';

export const muiTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#2563eb',
          light: '#3b82f6',
          dark: '#1d4ed8',
        },
        secondary: {
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
        }
      },
    }
  },
  cssVarPrefix: 'mui-prestige',
  components: {
    MuiCircularProgress: {
      defaultProps: {
        color: 'primary'
      },
      styleOverrides: {
        root: {
          display: 'inline-block',
        }
      }
    }
  }
});
