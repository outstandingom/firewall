export function generateId(length = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export function now(): string {
  return new Date().toISOString();
}

export function safeExec<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (e) {
    return fallback;
  }
}

export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const time = Date.now();
    if (time - lastCall >= ms) {
      lastCall = time;
      fn.apply(this, args);
    }
  } as T;
}

export function getSelector(el: Element): string {
  let path = '';
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path = selector + (path ? ` > ${path}` : '');
      break;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    path = selector + (path ? ` > ${path}` : '');
    current = current.parentElement;
  }
  return path.substring(0, 200);
}
