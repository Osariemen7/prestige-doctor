import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';

const InstallContext = createContext(null);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;

// Keep the deferred event in the app shell while sign-in and workspace pages load.
export function DoctorInstallProvider({ children }) {
  const pending = useRef(null);
  const inFlight = useRef(false);
  const confirmed = useRef(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const displayMode = window.matchMedia?.('(display-mode: standalone)');
    const onPrompt = event => {
      if (confirmed.current || isStandalone() || typeof event.prompt !== 'function') return;
      event.preventDefault();
      pending.current = event;
      setAvailable(true);
    };
    const onInstalled = () => {
      confirmed.current = true;
      pending.current = null;
      setInstalled(true);
      setAvailable(false);
    };
    const onDisplayMode = () => setInstalled(confirmed.current || isStandalone());
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    displayMode?.addEventListener?.('change', onDisplayMode);
    // Older Safari exposes the MediaQueryList listener API instead.
    if (!displayMode?.addEventListener) displayMode?.addListener?.(onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode?.removeEventListener?.('change', onDisplayMode);
      if (!displayMode?.removeEventListener) displayMode?.removeListener?.(onDisplayMode);
    };
  }, []);
  const requestInstall = async () => {
    if (inFlight.current || installed || accepted) return 'pending';
    const event = pending.current;
    if (!event) return 'manual';
    // Each browser event can be used only once, including after dismissal/error.
    pending.current = null;
    inFlight.current = true;
    setAvailable(false);
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice?.outcome === 'accepted') setAccepted(true);
      return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch {
      return 'unavailable';
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return <InstallContext.Provider value={{ hidden: installed, accepted, busy, available, requestInstall }}>{children}</InstallContext.Provider>;
}

function installationSteps() {
  const { userAgent, platform, maxTouchPoints } = navigator;
  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)) {
    return ['Open this page in Safari. If you came from WhatsApp, first choose Open in browser.', 'Tap Share, then Add to Home Screen.', 'Keep Open as Web App enabled if shown, then tap Add.', 'Open Prestige Doctor from the new Home Screen icon.'];
  }
  if (/Android/.test(userAgent)) {
    return ['Open this page in Chrome or Edge. If you came from WhatsApp, first choose Open in browser.', 'Open the browser menu and choose Install app or Add to Home screen, if offered.', 'Confirm the installation, then open Prestige Doctor from your home screen.'];
  }
  if (/Mac/.test(platform) && /Safari/.test(userAgent) && !/Chrome|Chromium|Edg/.test(userAgent)) {
    return ['In Safari, open the File menu or Share menu.', 'Choose Add to Dock, if offered, then confirm Add.', 'Open Prestige Doctor from your Dock.'];
  }
  return ['Open this page in Chrome or Edge.', 'In the browser menu, look for Install app or Apps, then Install this site as an app.', 'Confirm the installation, then open Prestige Doctor from your apps.'];
}

export default function InstallButton() {
  const install = useContext(InstallContext);
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState('');
  const helpId = useId();
  if (!install) throw new Error('InstallButton requires DoctorInstallProvider.');
  if (install.hidden) return null;
  if (install.accepted) return <span className="doctor-install__status" role="status">Installation requested. Open Prestige Doctor from your home screen or apps when ready.</span>;
  const onInstall = async () => {
    if (install.available) setGuide(false);
    const outcome = await install.requestInstall();
    if (outcome === 'manual') { setNotice(''); setGuide(value => !value); }
    if (outcome === 'dismissed' || outcome === 'unavailable') {
      setNotice(outcome === 'dismissed' ? 'Installation was dismissed. You can use the steps below or try again when your browser offers installation.' : 'The browser could not open its install prompt. Try the steps below.');
      setGuide(true);
    }
  };
  return <div className="doctor-install" onKeyDown={event => { if (event.key === 'Escape') setGuide(false); }}>
    <button className="vnext-button vnext-button--secondary vnext-button--small" type="button" disabled={install.busy} onClick={onInstall} aria-expanded={guide} aria-controls={guide ? helpId : undefined}>{install.busy ? 'Opening install…' : 'Install app'}</button>
    {guide && <div id={helpId} role="region" aria-label="Install the doctor app" className="doctor-install__guide">
      <strong>Install Prestige Doctor</strong>
      {notice && <p role="status">{notice}</p>}
      <ol>{installationSteps().map(step => <li key={step}>{step}</li>)}</ol>
      <p>If no install option appears, you can keep using the website. Installation needs your confirmation in the browser.</p>
      <button type="button" onClick={() => setGuide(false)} aria-label="Close installation help">Close</button>
    </div>}
  </div>;
}
