export function createBeatZoomController({ maxZoom = .035, release = .86 } = {}) {
  let lowAverage = .12;
  let previousLow = 0;
  let lastBeat = -100;
  let zoom = 0;

  return {
    advance({ frame, bands, audioFrame }) {
      const low = bands.low ?? 0;
      lowAverage += (low - lowAverage) * .028;
      const beat = (audioFrame?.isLive
        ? low > Math.max(.17, lowAverage * 1.3) && low - previousLow > .014
        : frame % 52 === 0)
        && frame - lastBeat > 16;
      if (beat) {
        zoom = Math.max(zoom, Math.min(maxZoom, .014 + Math.min(1, low) * .025));
        lastBeat = frame;
      }
      previousLow = low;
      const scale = 1 + zoom;
      zoom *= release;
      return scale;
    },
  };
}

export function createBeatZoomEffect(options) {
  const controller = createBeatZoomController(options);
  return function paintBeatZoom({ ctx, width, height, bands, audioFrame, frame, paintSource }) {
    const scale = controller.advance({ frame, bands, audioFrame });
    ctx.save();
    ctx.translate(width * .5, height * .5);
    ctx.scale(scale, scale);
    ctx.translate(width * -.5, height * -.5);
    paintSource(ctx);
    ctx.restore();
  };
}
