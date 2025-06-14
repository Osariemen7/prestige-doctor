import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { BootstrapButton, ValidationTextField } from "./material";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Autocomplete,
  IconButton,
  styled
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(6),
  }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
}));

const Organization =()=>{
  const [info, setInfo] = useState([])
  const [account_number, setNuban] = useState('')
  const [owner_bvn, setBVN] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
  const [pin_id, setPinid] = useState('')
  const [message, setMessage] = useState('')
  const [name, setOrgName] = useState('')
  const navigate = useNavigate();
 
  const getRefreshToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info');
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) {
        return parsedUserInfo.refresh;
      }
      console.log('No user information found in storage.');
      return null;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
  };

  const getAccessToken = async () => {
    let refresh = await getRefreshToken();
    let term = { refresh };
    let rep = await fetch('https://service.prestigedelta.com/tokenrefresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(term)
    });
    rep = await rep.json();
    if (rep) {
      return rep.access;
    }
  };

   
  
 const handleBank = (event, newValue) => {
    setSelectedOption(newValue);}
  
    const handleOrg = (event, newValue) => {
        setOrgName(event.target.value)
  }
    

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const type = 'virtual_clinic';
    const bank_code = selectedOption?.value;
    const account_name = users?.account_name;
  
    // Ensure all required fields are filled
    if (
      !account_name ||
      !name?.trim() ||
      !account_number?.trim() ||
      !bank_code ||
      !address?.trim()
    ) {
      setMessage('All Fields must be Filled');
      return; // Exit early if validation fails
    }
  
    const data = {
      owner_bvn,
      bank_code,
      account_name,
      name,
      address,
      account_number,
      type,
          };
  
    try {
      const token = await getAccessToken();
  
      if (!token) {
        console.log('No access token available.');
        return;
      }
  
      const response = await fetch(
        `https://service.prestigedelta.com/setorganization/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify( data ),
        }
      );
  
      if (response.ok) {
        const result = await response.json();
        console.log('Submission successful:', result);
        navigate('/account')
        // Handle success logic here
      } else {
        console.error('Failed to submit:', response.statusText);
        alert('Failed to submit edits');
      }
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit edits');
    }
  };
  

  const handleAcct =(event)=> {
    setNuban(event.target.value)
}
const handleBVN=(event)=> {
  setBVN(event.target.value)
}

const handleAddress=(event)=> {
    setAddress(event.target.value)
  }
  


  const fetchDa = async () => {
    const accessToken = await getAccessToken();
    
  let response = await fetch("https://service.prestigedelta.com/banklist/",{
  method: "GET",
  headers:{'Authorization': `Bearer ${accessToken}`},
  })
  //localStorage.setItem('user-info', JSON.stringify(tok))
  
  if (response.status === 401) {
    navigate('/');
  } else { 
  response = await response.json();
  setLoading(false)
  setInfo(response)
    }}
    useEffect(() => {
      fetchDa()
    }, [])
    
    const options = info.map((item) => ({
      label: item.bank_name,
      value: item.bank_code,
    }));
//  const trim = (selected) => {
//    let pip;
//    if (selected === null  ){
//      pip = 0;
//      else {}
//    }
//  }

    const teams = (selectedOption) => {
      let ref;

        if ( selectedOption === null || typeof selectedOption === 'undefined') {
           ref = 10;
            }
             else {
           ref= selectedOption.value;
         }
          return ref}
       let bank_code = teams(selectedOption)

       const fetchData = async () => {
        try {
          const accessToken = await getAccessToken();
      
          if (!accessToken) {
            console.error('No access token available.');
            return;
          }
      
          const response = await fetch(
            `https://service.prestigedelta.com/banktransfer/?bank_code=${bank_code}&nuban=${account_number}`,
            {
              method: "GET",
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
      
          if (!response.ok) {
            console.error(`Failed to fetch data: ${response.status} - ${response.statusText}`);
            return;
          }
      
          const data = await response.json();
      
          // Handle the fetched data
          setUsers(data);
      
          // Uncomment if you want to navigate after setting users
          // navigate('/components/token');
        } catch (error) {
          console.error('An error occurred while fetching data:', error);
        }
      };
      
  
  useEffect(() => {
  if (selectedOption !== '' && account_number.length=== 10) {
    fetchData();
  }
}, [selectedOption, account_number]);

   console.log(bank_code) 
   console.log(users)

    if(loading) {
      return(
      <p>Loading...</p>)
    } 

  return(
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        overflowY: 'auto',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4,  }}>  
          <IconButton
            component={Link}
            to="/account"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Set Organization
          </Typography>
        </Box>

        <StyledPaper elevation={3}>
          <form>
            <StyledTextField
              fullWidth
              label="Name of Organization"
              variant="outlined"
              onChange={handleOrg}
              required
            />

            <StyledTextField
              fullWidth
              label="Address of Organization"
              variant="outlined"
              onChange={handleAddress}
              required
            />

            <StyledTextField
              fullWidth
              label="Bank Verification Number"
              variant="outlined"
              type="number"
              onChange={handleBVN}
              required
            />

            <Autocomplete
              value={selectedOption}
              options={options}
              onChange={(event, newValue) => handleBank(newValue)}
              renderInput={(params) => (
                <StyledTextField
                  {...params}
                  label="Select Bank"
                  required
                />
              )}
            />

            <StyledTextField
              fullWidth
              label="Account Number"
              variant="outlined"
              type="number"
              onChange={handleAcct}
              required
            />

            {users?.account_name && (
              <Typography
                sx={{
                  textAlign: 'center',
                  my: 2,
                  color: 'text.primary',
                  fontWeight: 'medium'
                }}
              >
                {users.account_name}
              </Typography>
            )}

            {message && (
              <Typography
                sx={{
                  textAlign: 'center',
                  my: 2,
                  color: 'error.main'
                }}
              >
                {message}
              </Typography>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              sx={{
                mt: 3,
                py: 1.5,
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              Next
            </Button>
          </form>
        </StyledPaper>
      </Container>
    </Box>
  )
    
}
export default Organization
