export function sanitizeString(str: string, maxLength: number = 500): string {
  if (!str) return '';
  let clean = str.trim().replace(/\0/g, '');
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
}

export function sanitizeUrl(url: string): string {
  if (!url) return '';
  try {
    let parsed: URL;
    if (!url.startsWith('http')) {
      if (url.startsWith('/')) {
        parsed = new URL(url, 'http://localhost');
      } else {
        return url;
      }
    } else {
      parsed = new URL(url);
    }
    
    parsed.username = '';
    parsed.password = '';
    
    const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth', 'session', 'credit', 'card', 'cvv', 'ssn'];
    const params = new URLSearchParams(parsed.search);
    for (const key of Array.from(params.keys())) {
      if (sensitiveParams.some(sp => key.toLowerCase().includes(sp))) {
        params.set(key, '[REDACTED]');
      }
    }
    parsed.search = params.toString();
    
    if (!url.startsWith('http')) {
       return parsed.pathname + parsed.search + parsed.hash;
    }
    
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.some(sh => key.toLowerCase().includes(sh))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function sanitizeMetadata(metadata: unknown, depth = 0): Record<string, unknown> {
  if (depth > 3 || !metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const result: Record<string, unknown> = {};
  const entries = Object.entries(metadata).slice(0, 50);
  
  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value, 1000);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.slice(0, 50).map(item => 
          typeof item === 'string' ? sanitizeString(item, 1000) : item
        );
      } else {
        result[key] = sanitizeMetadata(value, depth + 1);
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

export function stripHtml(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '');
}

export function isValidTimestamp(ts: string): boolean {
  if (!ts) return false;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return false;
  
  const now = new Date().getTime();
  const time = d.getTime();
  if (time < new Date('2020-01-01').getTime()) return false;
  if (time > now + 86400000) return false;
  
  return d.toISOString() === ts || ts.includes('T');
}
