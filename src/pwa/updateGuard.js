let dirtyForms = 0;
let clinicalSubmissions = 0;
const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('doctor-update-guard-changed')); };
export const setDoctorFormDirty = (dirty) => { dirtyForms = Math.max(0, dirtyForms + (dirty ? 1 : -1)); announce(); return () => setDoctorFormDirty(false); };
export const setClinicalSubmissionActive = (active) => { clinicalSubmissions = Math.max(0, clinicalSubmissions + (active ? 1 : -1)); announce(); return () => setClinicalSubmissionActive(false); };
export const isDoctorUpdateGuarded = () => dirtyForms > 0 || clinicalSubmissions > 0;
export const resetDoctorUpdateGuards = () => { dirtyForms = 0; clinicalSubmissions = 0; };
