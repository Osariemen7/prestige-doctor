const dirtyFormLeases = new Set();
const clinicalSubmissionLeases = new Set();
const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('doctor-update-guard-changed')); };

const acquireLease = (leases, active, label) => {
  if (!active) return () => {};
  const lease = Symbol(label);
  leases.add(lease);
  announce();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (leases.delete(lease)) announce();
  };
};

export const setDoctorFormDirty = (dirty) => acquireLease(dirtyFormLeases, dirty, 'doctor-dirty-form');
export const setClinicalSubmissionActive = (active) => acquireLease(clinicalSubmissionLeases, active, 'doctor-clinical-submission');
export const isDoctorUpdateGuarded = () => dirtyFormLeases.size > 0 || clinicalSubmissionLeases.size > 0;
export const resetDoctorUpdateGuards = () => { dirtyFormLeases.clear(); clinicalSubmissionLeases.clear(); };
