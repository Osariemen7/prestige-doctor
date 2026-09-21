import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HeartPulse } from 'lucide-react';
import { isAuthenticated } from '../api';
import './DoctorPublic.css';

export function DoctorBrand() {
  return <Link to="/" className="doctor-public-brand" aria-label="Prestige for doctors home"><span className="doctor-public-brand-icon"><HeartPulse size={22} strokeWidth={1.8} /></span><span>prestige<span className="doctor-public-brand-label">FOR DOCTORS</span></span></Link>;
}
export function DoctorPublicHeader() {
  const signedIn = isAuthenticated();
  return <header className="doctor-public-header"><div className="doctor-public-width"><DoctorBrand /><nav aria-label="Main navigation"><a className="doctor-public-nav-link" href="/#workspace">Your workspace</a><Link className="doctor-public-button doctor-public-button-small" to={signedIn ? '/app/queue' : '/login'}>{signedIn ? 'Open workspace' : 'Sign in'}<ArrowRight size={16} /></Link></nav></div></header>;
}
export function DoctorPublicFooter() {
  return <footer className="doctor-public-footer doctor-public-width"><DoctorBrand /><p>Thoughtful tools. Clinician-led care.</p><nav aria-label="Footer navigation"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href="mailto:support@prestigedelta.com">Get in touch</a></nav></footer>;
}
