import React, { useEffect, useState } from 'react';

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [guide, setGuide] = useState(false);
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
  useEffect(() => {
    const onPrompt = (event) => { event.preventDefault(); setPrompt(event); };
    const onInstalled = () => { setInstalled(true); setGuide(false); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  if (installed) return null;
  const install = async () => {
    if (!prompt) { setGuide((value) => !value); return; }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return <span className="doctor-install"><button className="vnext-button vnext-button--secondary vnext-button--small" type="button" onClick={install}>Download app</button>{guide && <span role="status" className="doctor-install__guide">{ios ? 'Open in Safari, tap Share, then Add to Home Screen.' : 'Open this website in Chrome or Edge, then choose Install app or Add to Home screen from the browser menu. If you opened it inside WhatsApp, first choose Open in browser.'}<button type="button" onClick={() => setGuide(false)} aria-label="Close installation help">Close</button></span>}</span>;
}
