export function canvasPixelRatio(mode, deviceRatio) {
  const ratio = Number.isFinite(Number(deviceRatio)) && Number(deviceRatio) > 0 ? Number(deviceRatio) : 1;
  return Math.min(ratio, mode === 'equalizer' ? 1.5 : 2);
}

export function createFrameGate(framesPerSecond) {
  const interval = 1000 / framesPerSecond;
  let previous = null;

  return {
    shouldRender(timestamp) {
      if (previous === null) {
        previous = timestamp;
        return true;
      }
      const elapsed = timestamp - previous;
      if (elapsed + .1 < interval) return false;
      previous = timestamp - elapsed % interval;
      return true;
    },
    reset() {
      previous = null;
    },
  };
}
