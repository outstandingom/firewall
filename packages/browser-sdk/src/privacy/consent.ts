export function isOptedOut(): boolean {
  try {
    if (localStorage.getItem('awo_consent') === 'opt-out') {
      return true;
    }
    const dnt = navigator.doNotTrack || (window as any).doNotTrack || navigator.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes') {
      return true;
    }
    if ((navigator as any).globalPrivacyControl) {
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

export function optOut(): void {
  try {
    localStorage.setItem('awo_consent', 'opt-out');
  } catch (e) { /* ignore */ }
}

export function optIn(): void {
  try {
    localStorage.setItem('awo_consent', 'opt-in');
  } catch (e) { /* ignore */ }
}
