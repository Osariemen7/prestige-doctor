import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { ContentCopy as ContentCopyIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import Confetti from 'react-confetti';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  textAlign: 'center',
};

const InviteColleagueModal = ({ open, handleClose }) => {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('user-info'));
    if (userInfo && userInfo.user && userInfo.user.referral_code) {
      setReferralCode(userInfo.user.referral_code);
    }
  }, []);

  const handleCopy = useCallback(() => {
    const inviteLink = `${window.location.origin}/register/${referralCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setShowConfetti(true);

    setTimeout(() => {
      setCopied(false);
      setShowConfetti(false);
    }, 6000);
  }, [referralCode]);

  const inviteLink = `${window.location.origin}/register/${referralCode}`;

  return (
    <>
      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1600, pointerEvents: 'none' }}>
          <Confetti 
            recycle={false} 
            numberOfPieces={300} 
            spread={120}
            origin={{ y: 0.6 }}
            colors={['#2563EB', '#1d4ed8', '#FFD700', '#FF6B6B', '#4ECDC4']}
          />
        </div>
      )}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="invite-colleague-modal-title"
        aria-describedby="invite-colleague-modal-description"
      >
        <Box sx={style}>
          <Typography id="invite-colleague-modal-title" variant="h6" component="h2">
            Invite a Colleague
          </Typography>
          <Typography id="invite-colleague-modal-description" sx={{ mt: 2 }}>
            Share your unique referral link with colleagues to invite them to join our platform.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
            <Tooltip title={inviteLink}>
              <Typography
                variant="body1"
                sx={{
                  p: 1,
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {inviteLink}
              </Typography>
            </Tooltip>
            <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
              <IconButton onClick={handleCopy}>
                {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>How it works:</strong>
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              • Share the link with your colleagues to invite them to join
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              • When your invited colleague reaches 10 subscribing patients, you earn NGN 10,000
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              • You can later add your invited colleagues to collaborate with you on patient care
            </Typography>
          </Box>
          <Button onClick={handleClose} sx={{ mt: 4 }}>Close</Button>
        </Box>
      </Modal>
    </>
  );
};

export default InviteColleagueModal;