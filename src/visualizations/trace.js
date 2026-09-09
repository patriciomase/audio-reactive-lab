export function detectTraceEdges(data, width, height, energy) {
  const grayscale = new Uint8Array(width * height);
  for (let pixel = 0; pixel < grayscale.length; pixel += 1) {
    const offset = pixel * 4;
    grayscale[pixel] = data[offset] * .299 + data[offset + 1] * .587 + data[offset + 2] * .114;
  }
  const gradients = new Uint16Array(width * height);
  let gradientTotal = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      const horizontal = grayscale[pixel + 1] - grayscale[pixel - 1];
      const vertical = grayscale[pixel + width] - grayscale[pixel - width];
      const strength = Math.abs(horizontal) + Math.abs(vertical);
      gradients[pixel] = strength;
      gradientTotal += strength;
    }
  }
  const threshold = Math.max(8, Math.min(34,
    gradientTotal / Math.max(1, (width - 2) * (height - 2)) * 1.7 - Math.min(7, energy * 9)));
  const alpha = new Uint8ClampedArray(width * height);
  let edgePixels = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      const horizontal = grayscale[pixel + 1] - grayscale[pixel - 1];
      const vertical = grayscale[pixel + width] - grayscale[pixel - width];
      const strength = gradients[pixel];
      if (strength < threshold) continue;
      const horizontalEdge = Math.abs(horizontal) >= Math.abs(vertical);
      const before = gradients[pixel - (horizontalEdge ? 1 : width)];
      const after = gradients[pixel + (horizontalEdge ? 1 : width)];
      if (strength < before || strength < after) continue;
      alpha[pixel] = Math.min(255, (strength - threshold) * 7);
      edgePixels += 1;
    }
  }
  return { alpha, edgePixels };
}

export function createTraceVisualization({
  video,
  resolveRgb,
  paintBackdrop,
  createCanvas = () => document.createElement('canvas'),
  random = Math.random,
}) {
  const captureCanvas = createCanvas();
  const captureContext = captureCanvas.getContext('2d', { willReadFrequently: true });
  let layers = [];
  let previousLow = 0;
  let lowAverage = .12;
  let lastBeat = -100;
  let lastAttempt = -100;

  function capture({ width: viewportWidth, height: viewportHeight, bands, frame }) {
    if (video.readyState < 2 || !video.videoWidth) return false;
    const portrait = viewportHeight > viewportWidth;
    const width = portrait ? 270 : 480;
    const height = portrait ? 480 : 270;
    captureCanvas.width = width;
    captureCanvas.height = height;
    const cropScale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const sourceWidth = width / cropScale;
    const sourceHeight = height / cropScale;
    const sourceX = (video.videoWidth - sourceWidth) / 2;
    const sourceY = (video.videoHeight - sourceHeight) / 2;
    captureContext.save();
    captureContext.translate(width, 0);
    captureContext.scale(-1, 1);
    captureContext.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    captureContext.restore();

    const source = captureContext.getImageData(0, 0, width, height);
    const edges = detectTraceEdges(source.data, width, height, bands.low);
    if (edges.edgePixels < width * height * .001) return false;
    const outline = captureContext.createImageData(width, height);
    const hue = (190 + layers.length * 37 + frame * .7) % 360;
    const [red, green, blue] = resolveRgb({ hue, frame });
    edges.alpha.forEach((alpha, pixel) => {
      if (!alpha) return;
      const offset = pixel * 4;
      outline.data[offset] = red;
      outline.data[offset + 1] = green;
      outline.data[offset + 2] = blue;
      outline.data[offset + 3] = alpha;
    });
    const layerCanvas = createCanvas();
    layerCanvas.width = width;
    layerCanvas.height = height;
    layerCanvas.getContext('2d').putImageData(outline, 0, 0);
    layers.forEach((layer) => { layer.latest = false; });
    layers.push({
      canvas: layerCanvas,
      x: 0, y: 0,
      vx: (random() * 2 - 1) * (.08 + bands.low * .12),
      vy: (random() * 2 - 1) * (.06 + bands.low * .09),
      alpha: .92,
      scale: 1,
      growth: .00015 + random() * .00028,
      latest: true,
    });
    if (layers.length > 18) layers.shift();
    return true;
  }

  return {
    render(renderFrame) {
      const { ctx, width, height, bands, frame } = renderFrame;
      paintBackdrop(renderFrame);
      lowAverage += (bands.low - lowAverage) * .025;
      const beat = bands.low > Math.max(.18, lowAverage * 1.32)
        && bands.low - previousLow > .014 && frame - lastBeat > 18;
      const needsRefresh = layers.length === 0 || frame - lastBeat > 180;
      if ((beat || needsRefresh) && frame - lastAttempt > 15) {
        if (capture(renderFrame)) lastBeat = frame;
        lastAttempt = frame;
      }
      previousLow = bands.low;

      ctx.globalCompositeOperation = 'lighter';
      layers = layers.filter((layer) => layer.latest || layer.alpha > .018);
      layers.forEach((layer) => {
        layer.x += layer.vx;
        layer.y += layer.vy;
        layer.scale += layer.growth;
        layer.alpha = layer.latest ? Math.max(.16, layer.alpha * .9965) : layer.alpha * .995;
        const cover = Math.max(width / layer.canvas.width, height / layer.canvas.height) * layer.scale;
        const drawWidth = layer.canvas.width * cover;
        const drawHeight = layer.canvas.height * cover;
        ctx.globalAlpha = layer.alpha;
        ctx.drawImage(layer.canvas, (width - drawWidth) / 2 + layer.x, (height - drawHeight) / 2 + layer.y, drawWidth, drawHeight);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
    dispose() {
      layers = [];
      captureCanvas.width = 0;
      captureCanvas.height = 0;
    },
  };
}
