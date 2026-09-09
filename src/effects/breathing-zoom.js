export function breathingZoomScale({ frame, bands }) {
  const energy = Math.min(1, bands.level ?? 0);
  const phase = frame * (.012 + energy * .01);
  const breath = Math.sin(phase) * .5 + .5;
  return 1 + breath * (.08 + energy * .08);
}

export function paintBreathingZoom({ ctx, width, height, bands, frame, paintSource }) {
  const scale = breathingZoomScale({ frame, bands });
  ctx.save();
  ctx.translate(width * .5, height * .5);
  ctx.scale(scale, scale);
  ctx.translate(width * -.5, height * -.5);
  paintSource(ctx);
  ctx.restore();
}
