import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rateLimiter.js';

describe('message rate limiter', () => {
  it('limits messages per connection and resets the window', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const allow = createRateLimiter(2);
    expect(allow()).toBe(true);
    expect(allow()).toBe(true);
    expect(allow()).toBe(false);
    vi.spyOn(Date, 'now').mockReturnValue(2000);
    expect(allow()).toBe(true);
  });
  it('does not share quotas between connections', () => {
    const a = createRateLimiter(1);
    const b = createRateLimiter(1);
    expect(a()).toBe(true);
    expect(a()).toBe(false);
    expect(b()).toBe(true);
  });
});
