interface ErrorProperties {
  message?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack_trace?: string;
  error_type?: string;
}

export function generateErrorFingerprint(error: ErrorProperties): string {
  const parts: string[] = [];
  
  if (error.error_type) parts.push(error.error_type);
  if (error.message) parts.push(error.message);
  
  if (error.stack_trace) {
    // Normalize stack trace: remove line and column numbers
    const normalizedStack = error.stack_trace
      .split('\n')
      .map(line => line.replace(/:\d+:\d+/g, ''))
      .join('\n');
    parts.push(normalizedStack);
  } else if (error.filename) {
    parts.push(error.filename);
  }
  
  const text = parts.join('|');
  
  // FNV-1a hash
  let hval = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hval ^= text.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return (hval >>> 0).toString(16);
}
