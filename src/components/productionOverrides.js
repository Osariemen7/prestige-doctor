import './production-overrides.css';

// This file is intentionally kept minimal.
// Its primary purpose is to ensure the production CSS overrides 
// are loaded after all other CSS files during the build process.

export default function EnsureProductionOverrides() {
  // This component doesn't render anything
  return null;
}
