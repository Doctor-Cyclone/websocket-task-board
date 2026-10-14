export function createRateLimiter(limit = 30, windowMs = 1000) {
  let windowStart = Date.now();
  let count = 0;

  return () => {
    const now = Date.now();

    if (now - windowStart >= windowMs) {
      windowStart = now;
      count = 0;
    }

    count += 1;

    return count <= limit;
  };
}
