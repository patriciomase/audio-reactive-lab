export function createLoadMonitor({ sampleWindowMs = 500 } = {}) {
  let startedAt = null;
  let renderCount = 0;
  let totalDrawMs = 0;
  let maximumDrawMs = 0;

  function reset() {
    startedAt = null;
    renderCount = 0;
    totalDrawMs = 0;
    maximumDrawMs = 0;
  }

  return {
    record(timestamp, drawMs) {
      if (startedAt === null) startedAt = timestamp;
      renderCount += 1;
      totalDrawMs += drawMs;
      maximumDrawMs = Math.max(maximumDrawMs, drawMs);
      const elapsed = timestamp - startedAt;
      if (elapsed < sampleWindowMs) return null;

      const sample = {
        fps: renderCount * 1000 / Math.max(1, elapsed),
        averageDrawMs: totalDrawMs / renderCount,
        maximumDrawMs,
      };
      startedAt = timestamp;
      renderCount = 0;
      totalDrawMs = 0;
      maximumDrawMs = 0;
      return sample;
    },
    reset,
  };
}
