export function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    let parsed: URL;
    if (url.startsWith('/') || url.startsWith('.')) {
      parsed = new URL(url, 'http://localhost'); // dummy base for relative
    } else if (!url.startsWith('http')) {
      parsed = new URL(`http://${url}`);
    } else {
      parsed = new URL(url);
    }
    
    let path = parsed.pathname;
    
    // Replace UUID segments with :id
    path = path.replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, ':id');
    
    // Replace numeric segments with :id
    path = path.replace(/\b\d+\b/g, ':id');
    
    // Replace long hex segments with :id
    path = path.replace(/\b[0-9a-fA-F]{10,}\b/g, ':id');
    
    return path;
  } catch (e) {
    return url;
  }
}

export function extractDomain(url: string): string {
  if (!url) return '';
  try {
    let parsed: URL;
    if (!url.startsWith('http')) {
      parsed = new URL(`http://${url}`);
    } else {
      parsed = new URL(url);
    }
    return parsed.hostname;
  } catch (e) {
    return url;
  }
}
