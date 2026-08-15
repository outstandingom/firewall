import { EventQueue } from '../core/queue';
import { AWOConfig } from '../core/config';
import { now, throttle, getSelector } from '../utils/helpers';
import { shouldIgnoreElement, shouldMaskElement, isPasswordField, sanitizeText } from '../privacy/sanitizer';

export class InteractionCollector {
  private queue: EventQueue;
  private config: AWOConfig;

  constructor(queue: EventQueue, config: AWOConfig) {
    this.queue = queue;
    this.config = config;
  }

  public init() {
    if (!this.config.enableClickTracking) return;

    const clickHandler = throttle((event: MouseEvent) => {
      try {
        const target = event.target as Element;
        if (!target) return;

        if (shouldIgnoreElement(target, this.config.ignoreAttributes)) return;
        if (isPasswordField(target)) return;

        let text = target.textContent || (target as any).value || '';
        text = sanitizeText(text, 100);

        if (shouldMaskElement(target, this.config.maskAttributes)) {
          text = '[masked]';
        }

        const selector = getSelector(target);

        this.queue.push({
          type: 'click',
          timestamp: now(),
          url: window.location.href,
          route: window.location.pathname,
          data: {
            tag_name: target.tagName.toLowerCase(),
            text,
            selector,
            x: event.clientX,
            y: event.clientY
          }
        });
      } catch (e) { /* ignore */ }
    }, 200);

    document.addEventListener('click', clickHandler as any, true);
  }
}
