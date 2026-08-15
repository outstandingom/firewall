export const PRIVACY_PATTERNS = {
  SENSITIVE_KEYS: /password|token|secret|key|auth|session|credit|card|ssn|api_key/i,
  EMAIL: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
  PHONE: /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/gi,
};

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const searchParams = new URLSearchParams(parsed.search);
    let modified = false;
    
    for (const [key] of Array.from(searchParams.entries())) {
      if (PRIVACY_PATTERNS.SENSITIVE_KEYS.test(key)) {
        searchParams.set(key, '[REDACTED]');
        modified = true;
      }
    }
    
    if (modified) {
      parsed.search = searchParams.toString();
    }
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

export function sanitizeText(text: string, maxLength = 100): string {
  if (!text) return '';
  let sanitized = text.substring(0, maxLength);
  sanitized = sanitized.replace(PRIVACY_PATTERNS.EMAIL, '[EMAIL]');
  sanitized = sanitized.replace(PRIVACY_PATTERNS.PHONE, '[PHONE]');
  return sanitized.trim();
}

export function shouldIgnoreElement(el: Element, ignoreAttributes: string[] = ['data-monitor-ignore']): boolean {
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    for (const attr of ignoreAttributes) {
      if (current.hasAttribute(attr)) return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function shouldMaskElement(el: Element, maskAttributes: string[] = ['data-monitor-mask']): boolean {
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    for (const attr of maskAttributes) {
      if (current.hasAttribute(attr)) return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function isPasswordField(el: Element): boolean {
  if (el.tagName.toLowerCase() === 'input') {
    const type = (el as HTMLInputElement).type;
    return type === 'password';
  }
  return false;
}
