interface RateLimitInfo {
  count: number;
  resetMs: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitInfo>();

  checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let info = this.limits.get(key);

    if (!info || now > info.resetMs) {
      info = {
        count: 0,
        resetMs: now + windowMs,
      };
    }

    info.count += 1;
    this.limits.set(key, info);

    const allowed = info.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - info.count);

    return {
      allowed,
      remaining,
      resetMs: info.resetMs,
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, info] of this.limits.entries()) {
      if (now > info.resetMs) {
        this.limits.delete(key);
      }
    }
  }
}

export const globalRateLimiter = new RateLimiter();

// Run cleanup every minute
setInterval(() => globalRateLimiter.cleanup(), 60 * 1000).unref();
