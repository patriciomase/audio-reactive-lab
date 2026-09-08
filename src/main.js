import './styles.css';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const app = document.querySelector('main');
const listenButton = document.querySelector('.listen');
const status = document.querySelector('.status');
const statusText = status.querySelector('span');
const error = document.querySelector('.error');
const sensitivityInput = document.querySelector('#sensitivity');
const sensitivityValue = document.querySelector('.meter b');
const colorModeInput = document.querySelector('#color-mode');
const modeButtons = [...document.querySelectorAll('nav button')];

const validModes = new Set(['orbit', 'terrain', 'prism', 'overlap', 'dancers']);
const requestedMode = new URLSearchParams(location.search).get('mode');
let mode = validModes.has(requestedMode) ? requestedMode : 'orbit';
let sensitivity = Number(sensitivityInput.value);
let colorMode = colorModeInput.value;
let randomHue = Math.random() * 360;
let audio = null;
let frame = 0;
let spectrumHistory = [];
let reverbWaves = [];
let previousLow = 0;
let orbitAngle = 0;
let orbitDirection = 1;
let reverseUntil = 0;
let lastWaveFrame = -100;
let squares = [];
let terrainAngle = 0;
let terrainDirection = 1;
let terrainVelocity = .0045;
let terrainTargetVelocity = .0045;
let terrainNextTurnFrame = null;
let overlapShape = {
  value: 0,
  from: 0,
  target: 0,
  started: 0,
  duration: 0,
  nextAt: performance.now() + 120000 + Math.random() * 60000,
};

const TERRAIN_COLUMNS = 72;
const TERRAIN_ROWS = 44;
const dancerMask = document.createElement('canvas');
const dancerOutline = document.createElement('canvas');
const dancerMaskCtx = dancerMask.getContext('2d');
const dancerOutlineCtx = dancerOutline.getContext('2d');
dancerMask.width = dancerOutline.width = 220;
dancerMask.height = dancerOutline.height = 340;

const dancers = Array.from({ length: 7 }, (_, index) => ({
  x: .1 + index * .135,
  depth: .58 + ((index * 37) % 42) / 100,
  phase: index * .91,
  hue: 180 + index * 31,
}));

modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));

function average(data, from, to) {
  let sum = 0;
  const end = Math.min(to, data.length);
  for (let i = from; i < end; i += 1) sum += data[i];
  return sum / Math.max(1, end - from) / 255;
}

function resize() {
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function bands() {
  if (!audio) return {
    low: 0.16 + Math.sin(frame * 0.018) * 0.08,
    mid: 0.12 + Math.sin(frame * 0.027 + 2) * 0.06,
    high: 0.08 + Math.sin(frame * 0.043 + 4) * 0.04,
    level: 0.14,
  };
  audio.analyser.getByteFrequencyData(audio.frequency);
  audio.analyser.getByteTimeDomainData(audio.waveform);
  const low = average(audio.frequency, 1, 12) * sensitivity;
  const mid = average(audio.frequency, 12, 80) * sensitivity;
  const high = average(audio.frequency, 80, 240) * sensitivity;
  return { low, mid, high, level: (low + mid + high) / 3 };
}

function color(hue, saturation, lightness, alpha = 1) {
  if (colorMode === 'dark') return `hsla(${220 + hue * .03}, ${Math.min(saturation, 24)}%, ${Math.min(lightness, 28)}%, ${alpha * .72})`;
  if (colorMode === 'colorful') return `hsla(${(hue + frame * .18) % 360}, ${Math.max(saturation, 82)}%, ${Math.max(lightness, 58)}%, ${alpha})`;
  if (colorMode === 'random') return `hsla(${(randomHue + hue * .42) % 360}, ${Math.max(saturation, 68)}%, ${lightness}%, ${alpha})`;
  if (colorMode === 'vibrant') return `hsla(${(hue * 1.7 + 30) % 360}, 100%, ${Math.max(lightness, 62)}%, ${Math.min(1, alpha * 1.18)})`;
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
}

function drawBackground(w, h) {
  const gradient = ctx.createRadialGradient(w * .5, h * .48, 0, w * .5, h * .48, Math.max(w, h) * .75);
  gradient.addColorStop(0, '#111118');
  gradient.addColorStop(.48, '#08080d');
  gradient.addColorStop(1, '#020204');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawOrbit(w, h, b) {
  const cx = w / 2, cy = h / 2;
  const transient = b.low > .38 && b.low - previousLow > .045;
  if (transient) reverseUntil = frame + 34;
  const targetDirection = frame < reverseUntil ? -1 : 1;
  orbitDirection += (targetDirection - orbitDirection) * (targetDirection < 0 ? .24 : .1);
  orbitAngle += .0064 * orbitDirection;
  previousLow = b.low;

  const points = [];
  for (let ring = 0; ring < 5; ring += 1) {
    const energy = ring < 2 ? b.low : ring < 4 ? b.mid : b.high;
    const count = 28 + ring * 12;
    const radius = 80 + ring * 46 + energy * 65;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + orbitAngle * (1 + ring * .18) * (ring % 2 ? -1 : 1);
      const wobble = Math.sin(a * (3 + ring) + frame * .018) * (8 + energy * 24);
      const x = cx + Math.cos(a) * (radius + wobble);
      const y = cy + Math.sin(a) * (radius + wobble) * .72;
      points.push({
        x: x - cx,
        y: y - cy,
        size: .9 + ring * .18 + (Math.sin(i * 2.37 + ring) + 1) * .16 + energy * 4.1,
        hue: 255 + ring * 24 + b.high * 80,
        lightness: 65 + energy * 20,
        alpha: .24 + energy * .62,
      });
    }
  }

  const waveInterval = Math.max(54, 128 - b.level * 90);
  if ((transient || frame - lastWaveFrame > waveInterval) && frame - lastWaveFrame > 28) {
    reverbWaves.push({
      points: points.map((point) => ({ ...point })),
      scale: 1.02,
      speed: .0073 + b.low * .006,
      alpha: Math.min(.78, .52 + b.level * .5),
      maxRadius: 310 + b.low * 65,
    });
    lastWaveFrame = frame;
  }

  ctx.globalCompositeOperation = 'lighter';
  const viewportRadius = Math.hypot(w, h) * .78;
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
}

function drawTerrain(w, h, b) {
  const sample = [];
  for (let i = 0; i < TERRAIN_COLUMNS; i += 1) {
    const position = i / (TERRAIN_COLUMNS - 1);
    if (audio) {
      const minFrequency = 45;
      const maxFrequency = Math.min(14000, audio.context.sampleRate / 2);
      const frequency = minFrequency * Math.pow(maxFrequency / minFrequency, position);
      const bin = Math.min(audio.frequency.length - 1, Math.round(frequency / (audio.context.sampleRate / audio.analyser.fftSize)));
      const balanced = Math.pow(audio.frequency[bin] / 255, .82) * (.68 + position * .52);
      sample.push(balanced);
    } else {
      sample.push((Math.max(0, Math.sin(i * .29 + frame * .03)) * .13 + Math.max(0, Math.sin(i * .11 - frame * .018)) * .06) * (.8 + position * .2));
    }
  }
  spectrumHistory.unshift(sample);
  spectrumHistory = spectrumHistory.slice(0, TERRAIN_ROWS);

  if (terrainNextTurnFrame === null) terrainNextTurnFrame = frame + 420 + Math.random() * 540;
  if (frame >= terrainNextTurnFrame && terrainTargetVelocity !== 0) {
    terrainTargetVelocity = 0;
    terrainNextTurnFrame = Infinity;
  }
  terrainVelocity += (terrainTargetVelocity - terrainVelocity) * .025;
  if (terrainTargetVelocity === 0 && Math.abs(terrainVelocity) < .00006) {
    terrainDirection *= -1;
    terrainTargetVelocity = .0045 * terrainDirection;
    terrainNextTurnFrame = frame + 420 + Math.random() * 720;
  }
  terrainAngle += terrainVelocity;

  const yaw = terrainAngle;
  const pitch = .82 + b.low * .08;
  const roll = b.high * .025;
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const cosX = Math.cos(pitch), sinX = Math.sin(pitch);
  const cosZ = Math.cos(roll), sinZ = Math.sin(roll);
  const focal = Math.max(w, h) * 1.15;
  const project = (x, y, z) => {
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const x3 = x1 * cosZ - y2 * sinZ;
    const y3 = x1 * sinZ + y2 * cosZ;
    const scale = focal / (focal + z2);
    return { x: w / 2 + x3 * scale, y: h * .56 + y3 * scale };
  };

  const side = Math.min(w, h) * .9;
  const grid = spectrumHistory.map((row, z) => row.map((value, i) => project(
    (i / (row.length - 1) - .5) * side,
    -value * side * (.32 + b.low * .12),
    (z / (TERRAIN_ROWS - 1) - .5) * side,
  )));

  ctx.lineWidth = 1.05;
  grid.forEach((row, z) => {
    ctx.beginPath();
    row.forEach((point, i) => i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = color(190 + z * 4 + b.high * 80, 90, 64, .82 - z / 45);
    ctx.stroke();
  });
  for (let column = 0; column < TERRAIN_COLUMNS; column += 2) {
    ctx.beginPath();
    grid.forEach((row, z) => {
      const point = row[column];
      if (z === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = color(225 + column * 2 + b.high * 70, 84, 60, .24);
    ctx.stroke();
  }
}

function drawPrism(w, h, b) {
  ctx.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 9; layer += 1) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 5) {
      const index = Math.floor((x / w) * ((audio?.waveform.length ?? 1024) - 1));
      const live = audio ? (audio.waveform[index] - 128) / 128 : Math.sin(x * .012 + frame * .03) * .12;
      const y = h / 2 + live * (110 + b.level * 260) + Math.sin(x * .006 + layer + frame * .008) * (24 + b.mid * 50);
      if (x === 0) ctx.moveTo(x, y + layer * 3); else ctx.lineTo(x, y + layer * 3);
    }
    ctx.strokeStyle = color(180 + layer * 22 + frame * .15, 95, 66, .12 + b.level * .3);
    ctx.lineWidth = 1 + b.high * 3;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function createSquares(w, h) {
  const count = w < 700 ? 9 : 14;
  const now = performance.now();
  squares = Array.from({ length: count }, (_, index) => {
    const size = 74 + ((index * 47) % 128);
    const angle = index * 2.399;
    const shade = Math.random() * 34;
    const fadeDuration = 10000 + Math.random() * 8000;
    return {
      x: w * (.18 + ((index * .173) % .64)),
      y: h * (.14 + ((index * .277) % .72)),
      size,
      vx: Math.cos(angle) * (.14 + (index % 4) * .045),
      vy: Math.sin(angle) * (.14 + (index % 3) * .05),
      phase: index * .73,
      hue: 185 + index * 27,
      shade,
      shadeFrom: shade,
      shadeTarget: Math.random() < .3 ? 0 : 7 + Math.random() * 29,
      fadeStarted: now - Math.random() * fadeDuration,
      fadeDuration,
    };
  });
}

function drawOverlap(w, h, b) {
  if (!squares.length) createSquares(w, h);
  const pulse = 1 + b.low * .42 + Math.max(0, b.level - .18) * .3;
  const speed = 1 + b.mid * 1.8;
  const now = performance.now();
  if (now >= overlapShape.nextAt) {
    overlapShape.from = overlapShape.value;
    overlapShape.target = overlapShape.target === 0 ? 1 : 0;
    overlapShape.started = now;
    overlapShape.duration = 8000 + Math.random() * 7000;
    overlapShape.nextAt = Infinity;
  }
  if (overlapShape.started) {
    const morphProgress = Math.min(1, (now - overlapShape.started) / overlapShape.duration);
    const easedMorph = .5 - Math.cos(morphProgress * Math.PI) / 2;
    overlapShape.value = overlapShape.from + (overlapShape.target - overlapShape.from) * easedMorph;
    if (morphProgress >= 1) {
      overlapShape.started = 0;
      overlapShape.nextAt = now + 120000 + Math.random() * 60000;
    }
  }
  const boxes = squares.map((square) => {
    let fadeProgress = Math.min(1, (now - square.fadeStarted) / square.fadeDuration);
    const easedFade = .5 - Math.cos(fadeProgress * Math.PI) / 2;
    square.shade = square.shadeFrom + (square.shadeTarget - square.shadeFrom) * easedFade;
    if (fadeProgress >= 1) {
      square.shadeFrom = square.shade;
      square.shadeTarget = Math.random() < .3 ? 0 : 7 + Math.random() * 29;
      square.fadeStarted = now;
      square.fadeDuration = 10000 + Math.random() * 8000;
    }
    square.x += square.vx * speed;
    square.y += square.vy * speed;
    const size = square.size * (pulse + Math.sin(frame * .018 + square.phase) * .025);
    const half = size / 2;
    if (square.x - half < -10 || square.x + half > w + 10) square.vx *= -1;
    if (square.y - half < -10 || square.y + half > h + 10) square.vy *= -1;
    square.x = Math.max(-10 + half, Math.min(w + 10 - half, square.x));
    square.y = Math.max(-10 + half, Math.min(h + 10 - half, square.y));
    return { ...square, size, left: square.x - half, top: square.y - half, right: square.x + half, bottom: square.y + half };
  });

  const shapePath = (box) => {
    ctx.beginPath();
    ctx.roundRect(box.left, box.top, box.size, box.size, box.size * .5 * overlapShape.value);
  };

  boxes.forEach((box) => {
    ctx.fillStyle = `rgb(${box.shade}, ${box.shade}, ${box.shade + 2})`;
    ctx.strokeStyle = `rgba(225, 225, 232, ${.18 + b.high * .25})`;
    ctx.lineWidth = 1;
    shapePath(box);
    ctx.fill();
    ctx.stroke();
  });

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const left = Math.max(boxes[i].left, boxes[j].left);
      const top = Math.max(boxes[i].top, boxes[j].top);
      const right = Math.min(boxes[i].right, boxes[j].right);
      const bottom = Math.min(boxes[i].bottom, boxes[j].bottom);
      if (right <= left || bottom <= top) continue;
      ctx.save();
      shapePath(boxes[i]);
      ctx.clip();
      shapePath(boxes[j]);
      ctx.fillStyle = color((boxes[i].hue + boxes[j].hue) / 2 + b.high * 80, 88, 58 + b.level * 20, .22 + b.low * .28);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function endpoint(origin, length, angle) {
  return { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length };
}

function drawLimb(context, points, width) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
}

function renderDancer(phase, b, strokeColor) {
  dancerMaskCtx.clearRect(0, 0, dancerMask.width, dancerMask.height);
  dancerMaskCtx.fillStyle = '#fff';
  dancerMaskCtx.strokeStyle = '#fff';

  const beat = Math.max(0, Math.sin(phase * 2)) * b.low;
  const bounce = Math.sin(phase * 2) * (5 + b.low * 14) - beat * 10;
  const lean = Math.sin(phase * .73) * (8 + b.mid * 12);
  const pelvis = { x: 110, y: 205 + bounce };
  const chest = { x: 110 + lean, y: 128 + bounce * .55 };
  const neck = { x: chest.x + lean * .18, y: chest.y - 27 };
  const shoulderL = { x: chest.x - 27, y: chest.y + 2 };
  const shoulderR = { x: chest.x + 27, y: chest.y - 2 };
  const hipL = { x: pelvis.x - 18, y: pelvis.y };
  const hipR = { x: pelvis.x + 18, y: pelvis.y };

  drawLimb(dancerMaskCtx, [neck, chest, pelvis], 43);
  const armSwing = Math.sin(phase) * (1 + b.mid * .5);
  const elbowL = endpoint(shoulderL, 48, 2.35 + armSwing * .72);
  const handL = endpoint(elbowL, 50, 1.9 + Math.sin(phase * 1.31 + 1) * 1.05);
  const elbowR = endpoint(shoulderR, 48, .8 + armSwing * .72);
  const handR = endpoint(elbowR, 50, 1.15 + Math.sin(phase * 1.17 + 2) * 1.05);
  drawLimb(dancerMaskCtx, [shoulderL, elbowL, handL], 17);
  drawLimb(dancerMaskCtx, [shoulderR, elbowR, handR], 17);

  const stride = Math.sin(phase) * (.48 + b.low * .28);
  const kneeL = endpoint(hipL, 61, 1.62 + stride);
  const footL = endpoint(kneeL, 62, 1.47 - stride * .52);
  const kneeR = endpoint(hipR, 61, 1.52 - stride);
  const footR = endpoint(kneeR, 62, 1.67 + stride * .52);
  drawLimb(dancerMaskCtx, [hipL, kneeL, footL], 22);
  drawLimb(dancerMaskCtx, [hipR, kneeR, footR], 22);

  dancerMaskCtx.beginPath();
  dancerMaskCtx.arc(neck.x, neck.y - 24, 20, 0, Math.PI * 2);
  dancerMaskCtx.fill();

  dancerOutlineCtx.clearRect(0, 0, dancerOutline.width, dancerOutline.height);
  const outlineWidth = 3.5 + b.high * 4;
  for (let direction = 0; direction < 12; direction += 1) {
    const angle = direction / 12 * Math.PI * 2;
    dancerOutlineCtx.drawImage(dancerMask, Math.cos(angle) * outlineWidth, Math.sin(angle) * outlineWidth);
  }
  dancerOutlineCtx.globalCompositeOperation = 'destination-out';
  dancerOutlineCtx.drawImage(dancerMask, 0, 0);
  dancerOutlineCtx.globalCompositeOperation = 'source-in';
  dancerOutlineCtx.fillStyle = strokeColor;
  dancerOutlineCtx.fillRect(0, 0, dancerOutline.width, dancerOutline.height);
  dancerOutlineCtx.globalCompositeOperation = 'source-over';
}

function drawDancers(w, h, b) {
  const tempo = frame * (.018 + b.mid * .018);
  const floor = h * .92;
  const activeDancers = dancers.slice(0, w < 600 ? 4 : dancers.length);
  ctx.globalCompositeOperation = 'lighter';
  activeDancers.forEach((dancer, index) => {
    const scale = dancer.depth * Math.min(1, h / 690, w / 1050);
    const phase = tempo + dancer.phase + Math.sin(frame * .003 + index) * .24;
    const x = w * ((index + .5) / activeDancers.length) + Math.sin(phase * .37 + index) * (12 + b.mid * 18);
    for (let trail = 2; trail >= 0; trail -= 1) {
      const alpha = trail === 0 ? .62 + b.level * .35 : .055 + b.high * .06;
      renderDancer(phase - trail * (.14 + b.high * .12), b, color(dancer.hue + trail * 24 + frame * .04, 88, 68, alpha));
      const drift = trail * (5 + b.high * 8);
      ctx.drawImage(dancerOutline, x - dancerOutline.width * scale / 2 - drift, floor - dancerOutline.height * scale, dancerOutline.width * scale, dancerOutline.height * scale);
    }
  });
  ctx.globalCompositeOperation = 'source-over';
}

function draw() {
  frame += 1;
  const b = bands();
  drawBackground(innerWidth, innerHeight);
  if (mode === 'orbit') drawOrbit(innerWidth, innerHeight, b);
  if (mode === 'terrain') drawTerrain(innerWidth, innerHeight, b);
  if (mode === 'prism') drawPrism(innerWidth, innerHeight, b);
  if (mode === 'overlap') drawOverlap(innerWidth, innerHeight, b);
  if (mode === 'dancers') drawDancers(innerWidth, innerHeight, b);
  requestAnimationFrame(draw);
}

async function startAudio() {
  try {
    error.hidden = true;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = .78;
    source.connect(analyser);
    audio = { context, stream, analyser, frequency: new Uint8Array(analyser.frequencyBinCount), waveform: new Uint8Array(analyser.fftSize) };
    status.classList.add('live');
    statusText.textContent = 'MIC LIVE';
    listenButton.classList.add('secondary');
    listenButton.textContent = 'Stop listening';
    app.classList.add('immersive');
    window.umami?.track('microphone-enabled');
  } catch {
    error.textContent = 'Microphone access was blocked. Allow it in your browser and try again.';
    error.hidden = false;
  }
}

function stopAudio() {
  audio.stream.getTracks().forEach((track) => track.stop());
  audio.context.close();
  audio = null;
  status.classList.remove('live');
  statusText.textContent = 'DEMO SIGNAL';
  listenButton.classList.remove('secondary');
  listenButton.innerHTML = 'Enable microphone <span>↗</span>';
  app.classList.remove('immersive', 'show-modes');
}

listenButton.addEventListener('click', () => audio ? stopAudio() : startAudio());
sensitivityInput.addEventListener('input', () => {
  sensitivity = Number(sensitivityInput.value);
  sensitivityValue.textContent = sensitivity.toFixed(1);
});
colorModeInput.addEventListener('change', () => {
  colorMode = colorModeInput.value;
  if (colorMode === 'random') randomHue = Math.random() * 360;
  window.umami?.track('color-changed', { color: colorMode });
});
modeButtons.forEach((button) => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  spectrumHistory = [];
  reverbWaves = [];
  modeButtons.forEach((item) => item.classList.toggle('active', item === button));
  const url = new URL(location.href);
  url.searchParams.set('mode', mode);
  history.replaceState({}, '', url);
  window.umami?.track('visualization-changed', { visualization: mode });
}));
window.addEventListener('resize', resize);
window.addEventListener('resize', () => { squares = []; });
window.addEventListener('pointermove', (event) => {
  app.classList.toggle('show-modes', Boolean(audio) && event.clientY > innerHeight - 96);
});
document.documentElement.addEventListener('mouseleave', () => app.classList.remove('show-modes'));
window.addEventListener('pagehide', () => audio && stopAudio());
resize();
draw();
