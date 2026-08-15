import { generateId, now, safeExec } from '../utils/helpers';
import { EventQueue } from './queue';

const SESSION_KEY = 'awo_sid';
const SESSION_DATA_KEY = 'awo_sdata';

export interface SessionData {
  id: string;
  started_at: string;
  last_activity: number;
  page_count: number;
}

export class SessionManager {
  private timeout: number;
  private queue: EventQueue;

  constructor(timeoutMs: number, queue: EventQueue) {
    this.timeout = timeoutMs;
    this.queue = queue;
    this.initSession();
  }

  private initSession() {
    let sdata: SessionData | null = null;
    try {
      const raw = sessionStorage.getItem(SESSION_DATA_KEY);
      if (raw) sdata = JSON.parse(raw);
    } catch (e) { /* */ }

    const currentTime = Date.now();
    if (!sdata || (currentTime - sdata.last_activity > this.timeout)) {
      if (sdata) {
        this.emitSessionEnd(sdata);
      }
      sdata = {
        id: generateId(),
        started_at: now(),
        last_activity: currentTime,
        page_count: 1
      };
      this.emitSessionStart(sdata);
    } else {
      sdata.page_count++;
      sdata.last_activity = currentTime;
    }
    
    this.saveSession(sdata);
  }

  public getSession(): SessionData {
    try {
      const raw = sessionStorage.getItem(SESSION_DATA_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* */ }
    
    const sdata = {
      id: generateId(),
      started_at: now(),
      last_activity: Date.now(),
      page_count: 1
    };
    this.saveSession(sdata);
    return sdata;
  }

  public touchSession() {
    const sdata = this.getSession();
    sdata.last_activity = Date.now();
    this.saveSession(sdata);
  }

  public endSession() {
    const sdata = this.getSession();
    this.emitSessionEnd(sdata);
    safeExec(() => sessionStorage.removeItem(SESSION_DATA_KEY));
  }

  private saveSession(sdata: SessionData) {
    safeExec(() => sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sdata)));
    safeExec(() => sessionStorage.setItem(SESSION_KEY, sdata.id));
  }

  private emitSessionStart(sdata: SessionData) {
    this.queue.push({
      type: 'session_start',
      timestamp: now(),
      session_id: sdata.id,
      data: { started_at: sdata.started_at }
    });
  }

  private emitSessionEnd(sdata: SessionData) {
    this.queue.push({
      type: 'session_end',
      timestamp: now(),
      session_id: sdata.id,
      data: { 
        started_at: sdata.started_at,
        ended_at: now(),
        page_count: sdata.page_count,
        duration_ms: Date.now() - new Date(sdata.started_at).getTime()
      }
    });
  }
}
