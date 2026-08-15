export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
