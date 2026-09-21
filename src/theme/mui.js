import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  palette: {
    primary: { main: '#087e78', light: '#39a59b', dark: '#09665f', lighter: '#edf6f2' },
    secondary: { main: '#182e36', light: '#4c6871', dark: '#102127' },
    success: { main: '#27846b', light: '#e8f4ed', dark: '#1a6550' },
    background: { default: '#f6f7f4', paper: '#ffffff' },
    text: { primary: '#182e36', secondary: '#687c80' },
    divider: '#dde7e4',
    grey: { 50: '#f6f7f4', 100: '#eef2ef', 200: '#dde7e4' },
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 550, letterSpacing: '-.045em' },
    h2: { fontWeight: 550, letterSpacing: '-.035em' },
    h3: { fontWeight: 550, letterSpacing: '-.025em' },
    h4: { fontWeight: 550, letterSpacing: '-.025em' },
    h5: { fontWeight: 600, letterSpacing: '-.02em' },
    h6: { fontWeight: 600, letterSpacing: '-.015em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 42, borderRadius: 8, paddingInline: 18 }, contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, elevation1: { boxShadow: '0 2px 12px #182e3607', border: '1px solid #dde7e4' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 }, notchedOutline: { borderColor: '#d5dfdc' } } },
    MuiInputLabel: { styleOverrides: { root: { color: '#687c80' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiTableCell: { styleOverrides: { root: { borderBottomColor: '#e8eeea' }, head: { background: '#f6f7f4', color: '#687c80', fontWeight: 600 } } },
    MuiContainer: { defaultProps: { disableGutters: false } },
  },
});
