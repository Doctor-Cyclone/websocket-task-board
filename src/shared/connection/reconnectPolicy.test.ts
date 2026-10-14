import { describe, expect, it, vi } from 'vitest';
import { getReconnectDelay } from './reconnectPolicy';

describe('reconnect jitter', () => {
  it.each([0, 1, 2, 3, 4, 20])(
    'stays within 80–100%% of the capped delay for attempt %i',
    (attempt) => {
      const base = Math.min(2000 * 2 ** attempt, 30000);
      vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(getReconnectDelay(attempt)).toBe(Math.round(base * 0.8));
      vi.spyOn(Math, 'random').mockReturnValue(1);
      expect(getReconnectDelay(attempt)).toBe(base);
    },
  );

  it('spreads the same attempt across different delays', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(1);
    expect([getReconnectDelay(0), getReconnectDelay(0), getReconnectDelay(0)]).toEqual([
      1600, 1800, 2000,
    ]);
  });
});
