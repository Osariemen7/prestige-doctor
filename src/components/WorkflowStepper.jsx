import React from 'react';
import { Stepper, Step, StepLabel } from '@mui/material';

const steps = ['Create Encounter', 'Upload Audio', 'Process Documentation'];

const WorkflowStepper = ({ stage = 0 }) => {
  let activeStep = 0;
  if (stage <= 0) {
    activeStep = 0;
  } else if (stage === 1) {
    activeStep = 1;
  } else if (stage === 2) {
    activeStep = 1;
  } else {
    activeStep = 2;
  }

  const isStepCompleted = (index) => {
    if (index === 0) return stage > 0;
    if (index === 1) return stage > 2;
    if (index === 2) return stage > 3;
    return false;
  };

  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
      {steps.map((label, index) => (
        <Step key={label} completed={isStepCompleted(index)}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};

export default WorkflowStepper;
