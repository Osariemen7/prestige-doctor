import { beforeEach, expect, it } from 'vitest';
import {
  isDoctorUpdateGuarded,
  resetDoctorUpdateGuards,
  setClinicalSubmissionActive,
  setDoctorFormDirty,
} from './updateGuard';

beforeEach(() => resetDoctorUpdateGuards());

it('does not let an inactive form lease release another component’s dirty-form lease', () => {
  const releaseDirtyForm = setDoctorFormDirty(true);
  const releaseInactiveForm = setDoctorFormDirty(false);

  releaseInactiveForm();
  expect(isDoctorUpdateGuarded()).toBe(true);

  releaseDirtyForm();
  expect(isDoctorUpdateGuarded()).toBe(false);
});

it('releases only its own lease and tolerates duplicate cleanup', () => {
  const releaseFirst = setDoctorFormDirty(true);
  const releaseSecond = setDoctorFormDirty(true);

  releaseFirst();
  releaseFirst();
  expect(isDoctorUpdateGuarded()).toBe(true);

  releaseSecond();
  expect(isDoctorUpdateGuarded()).toBe(false);
});

it('keeps a new lease active when stale cleanup runs after a test reset', () => {
  const releaseStale = setDoctorFormDirty(true);
  resetDoctorUpdateGuards();
  const releaseCurrent = setClinicalSubmissionActive(true);

  releaseStale();
  expect(isDoctorUpdateGuarded()).toBe(true);

  releaseCurrent();
  expect(isDoctorUpdateGuarded()).toBe(false);
});
