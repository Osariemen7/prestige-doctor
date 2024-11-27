import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Typography, Button, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import { purple } from '@mui/material/colors';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';


export const BootstrapButton = styled(Button)`
  && {
    box-shadow: none;
    text-transform: none;
    font-size: 16px;
    padding: 6px 39%;
    border: 1px solid;
    line-height: 2;
    background-color: #0063cc;
    border-color: #0063cc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";

    @media (min-width: 768px) { /* Adjust as needed for laptop view */
      padding: 6px 18%;
    }

    &:hover {
      background-color: #0069d9;
      border-color: #0062cc;
      box-shadow: none;
    }

    &:active {
      box-shadow: none;
      background-color: #0062cc;
      border-color: #005cbf;
    }

    &:focus {
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5);
    }
  }
`;

  export const CssTextField = styled(TextField)`
  && {
    & label.Mui-focused {
      color: #0096FF;
    }
    & .MuiInput-underline:after {
      border-bottom-color: #0096FF;
    }
    & .MuiOutlinedInput-root {
      & fieldset {
        border-color: #E0E3E7;
      }
      &:hover fieldset {
        border-color: #B2BAC2;
      }
      &.Mui-focused fieldset {
        border-color: #6F7E8C;
      }
    }
    width: 88%;
    max-width: 100%;

    @media (min-width: 768px) { /* Adjust as needed for laptop view */
      width: 40%;
    }
  }
`;
   
  export const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
      border: 0,
    },
  }));
  
 export const ColorButton = styled(Button)(({ theme }) => ({
    color: theme.palette.getContrastText(purple[500]),
    backgroundColor: purple[500],
    '&:hover': {
      backgroundColor: purple[700],
    },
  }));


  export const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));
  
  export const ValidationTextField = styled(TextField)`
  && {
    & input:valid + fieldset {
      border-color: #E0E3E7;
      border-width: 1px;
      padding: 5px;
    }
    & input:invalid + fieldset {
      border-color: red;
      border-width: 1px;
    }
    & input:valid:focus + fieldset {
      border-left-width: 4px;
      padding: 6px !important; /* override inline-style */
    }
    width: 88%;
    max-width: 100%;

    @media (min-width: 768px) { /* Adjust as needed for laptop view */
      width: 40%;
    }
  }
`;

export const ValidationEyeField = styled(TextField)`
  && {
    & input:valid + fieldset {
      border-color: #E0E3E7;
      border-width: 1px;
      padding: 5px;
    }
    & input:invalid + fieldset {
      border-color: red;
      border-width: 1px;
    }
    & input:valid:focus + fieldset {
      border-left-width: 4px;
      padding: 6px !important; /* override inline-style */
    }
    width: 88%;
    max-width: 100%;
    margin-left: 2%;

    @media (min-width: 768px) { /* Adjust as needed for laptop view */
      width: 40%;
      /* Adjust margin-left to center or align the component within the container */
    }
  }
`;
  