export function createAdaptiveNoiseGate({ minimumFloor = .025, headroom = .012 } = {}) {
  let floors = new Float32Array(0);

  function ensure(index) {
    if (index < floors.length) return;
    const next = new Float32Array(index + 1);
    next.fill(minimumFloor);
    next.set(floors);
    floors = next;
  }

  return {
    sample(index, value, { learn = true } = {}) {
      ensure(index);
      if (learn) {
        const easing = value > floors[index] ? .035 : .08;
        floors[index] += (value - floors[index]) * easing;
      }
      return Math.max(0, value - floors[index] - headroom) * 1.18;
    },
    reset() {
      floors = new Float32Array(0);
    },
  };
}
