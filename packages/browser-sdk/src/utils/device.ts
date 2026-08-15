export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  let os = 'Unknown';
  let osVersion = 'Unknown';
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  // Basic Browser parsing
  if (/Edg/.test(ua)) { browser = 'Edge'; browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || ''; }
  else if (/Firefox/.test(ua)) { browser = 'Firefox'; browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || ''; }
  else if (/Chrome/.test(ua)) { browser = 'Chrome'; browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || ''; }
  else if (/Safari/.test(ua)) { browser = 'Safari'; browserVersion = ua.match(/Version\/(\d+)/)?.[1] || ''; }
  else if (/Opera|OPR/.test(ua)) { browser = 'Opera'; browserVersion = ua.match(/(Opera|OPR)\/(\d+)/)?.[2] || ''; }

  // Basic OS parsing
  if (/Windows/.test(ua)) { os = 'Windows'; osVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || ''; }
  else if (/Mac OS X/.test(ua)) { os = 'macOS'; osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || ''; }
  else if (/Android/.test(ua)) { os = 'Android'; osVersion = ua.match(/Android (\d+(\.\d+)?)/)?.[1] || ''; }
  else if (/iPhone|iPad|iPod/.test(ua)) { os = 'iOS'; osVersion = ua.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || ''; }
  else if (/Linux/.test(ua)) { os = 'Linux'; }

  // Device Type
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    deviceType = 'mobile';
  }

  let timezone = 'Unknown';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) { /* ignore */ }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language || 'Unknown',
    timezone
  };
}
