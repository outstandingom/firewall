import { generateId, safeExec } from '../utils/helpers';

const VISITOR_KEY = 'awo_vid';

export function getVisitorId(): string {
  let vid = safeExec(() => localStorage.getItem(VISITOR_KEY));
  if (!vid) {
    vid = safeExec(() => sessionStorage.getItem(VISITOR_KEY));
  }
  if (!vid) {
    vid = generateId();
    safeExec(() => localStorage.setItem(VISITOR_KEY, vid!));
    safeExec(() => sessionStorage.setItem(VISITOR_KEY, vid!));
  }
  return vid;
}

export function resetVisitorId(): string {
  const vid = generateId();
  safeExec(() => localStorage.setItem(VISITOR_KEY, vid));
  safeExec(() => sessionStorage.setItem(VISITOR_KEY, vid));
  return vid;
}
