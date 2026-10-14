const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000;

export function getReconnectDelay(attempt: number): number {
  const baseDelay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);

  // Spread attempts across 80–100% of the capped exponential delay.
  return Math.round(baseDelay * (0.8 + Math.random() * 0.2));
}
