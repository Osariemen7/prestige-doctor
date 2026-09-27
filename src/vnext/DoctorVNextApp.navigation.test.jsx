import { expect, it } from 'vitest';
import { selectMobileNavigationItems } from './DoctorVNextApp';

it('keeps the mobile queue, patients, and messages destinations stable when navigation items are inserted', () => {
  expect(selectMobileNavigationItems().map(({ href }) => href)).toEqual([
    '/app/queue',
    '/app/patients',
    '/app/messages',
  ]);
});
