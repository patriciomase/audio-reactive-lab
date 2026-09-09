function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createPulseVisualization({ effect = null } = {}) {
  let x = innerWidth * .5;
  let y = innerHeight * .5;
  let hue = 230;
  let trails = [];
  let lastTrailX = x;
  let lastTrailY = y;

  function update({ width, height, bands, audioFrame, frame }) {
    const diameter = width * (width <= 700 ? 1 / 3 : 1 / 12);
    const radius = diameter * .5;
    const amplitude = Math.min(width, height) * (.018 + Math.min(1, bands.level) * .09);
    let waveX;
    let waveY;
    if (audioFrame.isLive) {
      const xIndex = (frame * 17) % audioFrame.waveform.length;
      const yIndex = (xIndex + Math.floor(audioFrame.waveform.length * .37)) % audioFrame.waveform.length;
      const sampleX = (audioFrame.waveform[xIndex] - 128) / 128;
      const sampleY = (audioFrame.waveform[yIndex] - 128) / 128;
      waveX = clamp(sampleX * 6 + Math.sin(frame * .71) * bands.high * .42 + Math.sin(frame * .29) * bands.low * .24, -1, 1);
      waveY = clamp(sampleY * 6 + Math.sin(frame * .83 + 1.4) * bands.mid * .38 + Math.sin(frame * .37) * bands.low * .22, -1, 1);
    } else {
      waveX = Math.sin(frame * .19) * (.46 + bands.mid);
      waveY = Math.sin(frame * .23 + 1.7) * (.42 + bands.high);
    }
    x += (width * .5 + waveX * amplitude - x) * .62;
    y += (height * .5 + waveY * amplitude - y) * .62;
    hue += (205 + bands.low * 150 + bands.mid * 210 + bands.high * 290 - hue) * .08;

    const trailDistance = Math.hypot(x - lastTrailX, y - lastTrailY);
    if (trailDistance > Math.max(2, radius * .1)) {
      trails.push({ x: lastTrailX, y: lastTrailY, radius, hue, alpha: .08 });
      trails = trails.slice(-9);
      lastTrailX = x;
      lastTrailY = y;
    }
    trails = trails.filter((trail) => trail.alpha > .012);
    trails.forEach((trail) => { trail.alpha *= .74; });
    return { radius };
  }

  function paint(target, pulse, color) {
    trails.forEach((trail) => {
      target.fillStyle = color(trail.hue, 90, 58, trail.alpha);
      target.beginPath();
      target.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
      target.fill();
    });
    target.fillStyle = color(hue, 92, 60, .38);
    target.beginPath();
    target.arc(x, y, pulse.radius, 0, Math.PI * 2);
    target.fill();
  }

  return {
    render(renderFrame) {
      const pulse = update(renderFrame);
      const paintSource = (target) => paint(target, pulse, renderFrame.color);
      if (effect) effect({ ...renderFrame, paintSource });
      else paintSource(renderFrame.ctx);
    },
    dispose() {
      trails = [];
    },
  };
}
