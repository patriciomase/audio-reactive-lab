export function createOrbitVisualization() {
  let reverbWaves = [];
  let previousLow = 0;
  let orbitAngle = 0;
  let orbitDirection = 1;
  let reverseUntil = 0;
  let lastWaveFrame = -100;

  return {
    render({ ctx, width, height, bands, frame, color }) {
      const cx = width / 2;
      const cy = height / 2;
      const transient = bands.low > .38 && bands.low - previousLow > .045;
      if (transient) reverseUntil = frame + 34;
      const targetDirection = frame < reverseUntil ? -1 : 1;
      orbitDirection += (targetDirection - orbitDirection) * (targetDirection < 0 ? .24 : .1);
      orbitAngle += .0064 * orbitDirection;
      previousLow = bands.low;

      const points = [];
      for (let ring = 0; ring < 5; ring += 1) {
        const energy = ring < 2 ? bands.low : ring < 4 ? bands.mid : bands.high;
        const count = 28 + ring * 12;
        const radius = 80 + ring * 46 + energy * 65;
        for (let index = 0; index < count; index += 1) {
          const angle = index / count * Math.PI * 2 + orbitAngle * (1 + ring * .18) * (ring % 2 ? -1 : 1);
          const wobble = Math.sin(angle * (3 + ring) + frame * .018) * (8 + energy * 24);
          const x = cx + Math.cos(angle) * (radius + wobble);
          const y = cy + Math.sin(angle) * (radius + wobble) * .72;
          points.push({
            x: x - cx,
            y: y - cy,
            size: .9 + ring * .18 + (Math.sin(index * 2.37 + ring) + 1) * .16 + energy * 4.1,
            hue: 255 + ring * 24 + bands.high * 80,
            lightness: 65 + energy * 20,
            alpha: .24 + energy * .62,
          });
        }
      }

      const waveInterval = Math.max(54, 128 - bands.level * 90);
      if ((transient || frame - lastWaveFrame > waveInterval) && frame - lastWaveFrame > 28) {
        reverbWaves.push({
          points: points.map((point) => ({ ...point })),
          scale: 1.02,
          speed: .0073 + bands.low * .006,
          alpha: Math.min(.78, .52 + bands.level * .5),
          maxRadius: 310 + bands.low * 65,
        });
        lastWaveFrame = frame;
      }

      ctx.globalCompositeOperation = 'lighter';
      const viewportRadius = Math.hypot(width, height) * .78;
      reverbWaves = reverbWaves.filter((wave) => wave.maxRadius * wave.scale < viewportRadius);
      reverbWaves.forEach((wave) => {
        wave.scale += wave.speed;
        wave.speed *= 1.002;
        const progress = wave.maxRadius * wave.scale / viewportRadius;
        const edgeFade = progress < .72 ? 1 : Math.max(0, 1 - (progress - .72) / .28);
        wave.points.forEach((point) => {
          ctx.beginPath();
          ctx.fillStyle = color(point.hue, 90, point.lightness, point.alpha * wave.alpha * edgeFade);
          ctx.arc(cx + point.x * wave.scale, cy + point.y * wave.scale, Math.max(.6, point.size * (.55 + wave.alpha * edgeFade * .35)), 0, Math.PI * 2);
          ctx.fill();
        });
      });
      points.forEach((point) => {
        ctx.beginPath();
        ctx.fillStyle = color(point.hue, 90, point.lightness, point.alpha);
        ctx.arc(cx + point.x, cy + point.y, point.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    },
    dispose() { reverbWaves = []; },
  };
}
