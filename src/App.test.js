import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
  NavLink: ({ to, children, className }) => <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>,
  useLocation: () => ({ pathname: '/demo/doctor' }),
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('lucide-react', () => {
  const React = require('react');
  const makeIcon = (name) => (props) => React.createElement('span', { ...props, 'data-icon': name });
  return ['Activity', 'AlertTriangle', 'Bell', 'BookOpen', 'Check', 'CheckCircle2', 'ChevronRight', 'CircleHelp', 'ClipboardList', 'Clock3', 'FileCheck2', 'FileText', 'HeartPulse', 'Info', 'LayoutDashboard', 'LockKeyhole', 'Menu', 'MessageSquare', 'RefreshCw', 'ShieldAlert', 'ShieldCheck', 'Stethoscope', 'Timer', 'UserRound', 'UsersRound', 'X'].reduce((icons, name) => ({ ...icons, [name]: makeIcon(name) }), {});
});

import DoctorVNextApp from './vnext/DoctorVNextApp';

test('doctor synthetic demo opens the server-shaped review queue', async () => {
  render(<DoctorVNextApp demo />);
  expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument();
  expect(await screen.findByText('Synthetic demo')).toBeInTheDocument();
  expect((await screen.findAllByText('Amina Okafor')).length).toBeGreaterThan(0);
});
