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

const validModes = new Set(['orbit', 'terrain', 'prism', 'overlap', 'dancers', 'universe', 'tangle']);
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
let universePreviousLow = 0;
let universeLastRipple = -100;
let universeRipples = [];
let tangleDots = [];
let overlapShape = {
  current: 'square',
  from: 'square',
  target: 'square',
  progress: 1,
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
const universeStars = Array.from({ length: 340 }, () => ({
  x: Math.random() * 2 - 1,
  y: Math.random() * 2 - 1,
  z: .12 + Math.random() * .88,
  size: .35 + Math.random() * 1.5,
  hue: 185 + Math.random() * 110,
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
      frequencyPosition: (index + .5) / count,
      energy: 0,
      response: .34 + ((index * 29) % 24) / 100,
      rotation: Math.random() * Math.PI * 2,
      spin: (.0012 + Math.random() * .0032) * (index % 2 ? -1 : 1),
      shade,
      shadeFrom: shade,
      shadeTarget: Math.random() < .3 ? 0 : 7 + Math.random() * 29,
      fadeStarted: now - Math.random() * fadeDuration,
      fadeDuration,
    };
  });
}

function createTangle(w, h) {
  const count = w < 700 ? 11 : 17;
  const radius = Math.min(w, h) * .3;
  tangleDots = Array.from({ length: count }, (_, index) => {
    const angle = index / count * Math.PI * 2;
    const speed = .22 + ((index * 31) % 28) / 100;
    return {
      x: w / 2 + Math.cos(angle) * radius * (.7 + (index % 3) * .12),
      y: h / 2 + Math.sin(angle) * radius * (.7 + ((index + 1) % 4) * .08),
      vx: Math.cos(index * 2.17 + .4) * speed,
      vy: Math.sin(index * 1.83 + .7) * speed,
      energy: 0,
      frequencyPosition: (index + .5) / count,
      hue: 175 + index * 19,
      wavePoints: Array.from({ length: 19 }, () => ({ x: 0, y: 0 })),
    };
  });
}

function tangleEnergy(dot) {
  if (!audio) return .08 + Math.max(0, Math.sin(frame * (.012 + dot.frequencyPosition * .035) + dot.hue)) * .3;
  const minFrequency = 45;
  const maxFrequency = Math.min(15000, audio.context.sampleRate / 2);
  const frequency = minFrequency * Math.pow(maxFrequency / minFrequency, dot.frequencyPosition);
  const bin = frequency / (audio.context.sampleRate / audio.analyser.fftSize);
  const radius = 2 + Math.round(dot.frequencyPosition * 5);
  return average(audio.frequency, Math.max(1, Math.round(bin) - radius), Math.round(bin) + radius + 1)
    * sensitivity * (.8 + dot.frequencyPosition * .65);
}

function drawTangle(w, h, b) {
  if (!tangleDots.length) createTangle(w, h);
  const margin = 22;
  tangleDots.forEach((dot) => {
    const live = Math.min(1.25, tangleEnergy(dot));
    dot.energy += (live - dot.energy) * (live > dot.energy ? .18 : .055);
    const acceleration = 1 + dot.energy * (1.4 + dot.frequencyPosition);
    dot.x += dot.vx * acceleration;
    dot.y += dot.vy * acceleration;
    if (dot.x < margin && dot.vx < 0 || dot.x > w - margin && dot.vx > 0) dot.vx *= -1;
    if (dot.y < margin && dot.vy < 0 || dot.y > h - margin && dot.vy > 0) dot.vy *= -1;
    dot.x = Math.max(margin, Math.min(w - margin, dot.x));
    dot.y = Math.max(margin, Math.min(h - margin, dot.y));
  });

  const centre = { x: 0, y: 0 };
  tangleDots.forEach((dot) => { centre.x += dot.x / tangleDots.length; centre.y += dot.y / tangleDots.length; });
  const edgeWaves = tangleDots.map((dot, index) => {
    const next = tangleDots[(index + 1) % tangleDots.length];
    const dx = next.x - dot.x;
    const dy = next.y - dot.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / length;
    const normalY = dx / length;
    const sharedEnergy = (dot.energy + next.energy) / 2;
    const amplitude = 3 + sharedEnergy * 26;
    const cycles = 1.5 + index % 4;
    dot.wavePoints.forEach((point, pointIndex) => {
      const t = pointIndex / 18;
      const envelope = Math.sin(t * Math.PI);
      const wave = Math.sin(t * Math.PI * 2 * cycles - frame * (.035 + dot.frequencyPosition * .055) + index * .83);
      point.x = dot.x + dx * t + normalX * wave * amplitude * envelope;
      point.y = dot.y + dy * t + normalY * wave * amplitude * envelope;
    });
    return dot.wavePoints;
  });
  ctx.globalCompositeOperation = 'lighter';
  tangleDots.forEach((dot, index) => {
    const next = tangleDots[(index + 1) % tangleDots.length];
    const sharedEnergy = (dot.energy + next.energy) / 2;
    // Every edge forms one translucent interior facet. Where the moving loop
    // crosses itself these facets stack, revealing the overlap as colored fill.
    ctx.beginPath();
    ctx.moveTo(centre.x, centre.y);
    edgeWaves[index].forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fillStyle = color((dot.hue + next.hue) / 2 + frame * .025, 90, 56 + sharedEnergy * 16, .018 + b.low * .035 + sharedEnergy * .04);
    ctx.fill();
  });

  ctx.beginPath();
  edgeWaves.forEach((wave, edgeIndex) => wave.forEach((point, pointIndex) => {
    if (edgeIndex === 0 && pointIndex === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
  }));
  ctx.closePath();
  ctx.fillStyle = color(245 + frame * .02, 88, 55, .018 + b.low * .035);
  ctx.fill('evenodd');
  tangleDots.forEach((dot, index) => {
    const next = tangleDots[(index + 1) % tangleDots.length];
    const sharedEnergy = (dot.energy + next.energy) / 2;
    ctx.beginPath();
    edgeWaves[index].forEach((point, pointIndex) => pointIndex === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = color(dot.hue + sharedEnergy * 70, 86, 68, .25 + sharedEnergy * .52 + b.high * .12);
    ctx.lineWidth = .7 + sharedEnergy * 1.8 + b.high * .6;
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = color(dot.hue, 92, 72, .5 + dot.energy * .45);
    ctx.arc(dot.x, dot.y, 1.8 + dot.energy * 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

function drawOverlap(w, h, b) {
  if (!squares.length) createSquares(w, h);
  const speed = 1 + b.mid * 1.8;
  const now = performance.now();
  if (now >= overlapShape.nextAt) {
    const shapes = ['square', 'circle', 'triangle'].filter((shape) => shape !== overlapShape.current);
    overlapShape.from = overlapShape.current;
    overlapShape.target = shapes[Math.floor(Math.random() * shapes.length)];
    overlapShape.started = now;
    overlapShape.duration = 1000;
    overlapShape.progress = 0;
    overlapShape.nextAt = Infinity;
  }
  if (overlapShape.started) {
    const morphProgress = Math.min(1, (now - overlapShape.started) / overlapShape.duration);
    overlapShape.progress = .5 - Math.cos(morphProgress * Math.PI) / 2;
    if (morphProgress >= 1) {
      overlapShape.current = overlapShape.target;
      overlapShape.from = overlapShape.current;
      overlapShape.progress = 1;
      overlapShape.started = 0;
      overlapShape.nextAt = now + 120000 + Math.random() * 60000;
    }
  }
  const boxes = squares.map((square) => {
    let frequencyEnergy;
    if (audio) {
      // Spread the figures logarithmically across the audible spectrum. A small
      // neighbourhood keeps individual bins from flickering without making the
      // whole group move as one again.
      const minFrequency = 45;
      const maxFrequency = Math.min(15000, audio.context.sampleRate / 2);
      const frequency = minFrequency * Math.pow(maxFrequency / minFrequency, square.frequencyPosition);
      const centreBin = frequency / (audio.context.sampleRate / audio.analyser.fftSize);
      const radius = 2 + Math.round(square.frequencyPosition * 5);
      frequencyEnergy = average(audio.frequency, Math.max(1, Math.round(centreBin) - radius), Math.round(centreBin) + radius + 1)
        * sensitivity * (.78 + square.frequencyPosition * .72);
    } else {
      const demoRate = .011 + square.frequencyPosition * .035;
      frequencyEnergy = .08 + Math.max(0, Math.sin(frame * demoRate + square.phase * 2.7)) * .28;
    }
    square.energy += (Math.min(1.35, frequencyEnergy) - square.energy) * (frequencyEnergy > square.energy ? .2 : .065);
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
    if (overlapShape.from === 'triangle' || overlapShape.target === 'triangle') square.rotation += square.spin;
    const size = square.size * (1 + square.energy * square.response + Math.sin(frame * .012 + square.phase) * .012);
    const half = size / 2;
    if (square.x - half < -10 || square.x + half > w + 10) square.vx *= -1;
    if (square.y - half < -10 || square.y + half > h + 10) square.vy *= -1;
    square.x = Math.max(-10 + half, Math.min(w + 10 - half, square.x));
    square.y = Math.max(-10 + half, Math.min(h + 10 - half, square.y));
    return { ...square, size, left: square.x - half, top: square.y - half, right: square.x + half, bottom: square.y + half };
  });

  const boundaryPoint = (shape, t) => {
    const angle = t * Math.PI * 2 - Math.PI / 2;
    if (shape === 'circle') return { x: Math.cos(angle), y: Math.sin(angle) };
    if (shape === 'square') {
      const scale = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
      return { x: Math.cos(angle) * scale, y: Math.sin(angle) * scale };
    }
    const vertices = [{ x: 0, y: -1 }, { x: .866, y: .5 }, { x: -.866, y: .5 }];
    const segment = t * 3;
    const index = Math.min(2, Math.floor(segment));
    const local = segment - index;
    const start = vertices[index];
    const end = vertices[(index + 1) % 3];
    return { x: start.x + (end.x - start.x) * local, y: start.y + (end.y - start.y) * local };
  };

  const shapePath = (box) => {
    ctx.beginPath();
    const radius = box.size / 2;
    const triangleAmount = (overlapShape.from === 'triangle' ? 1 - overlapShape.progress : 0)
      + (overlapShape.target === 'triangle' ? overlapShape.progress : 0);
    for (let pointIndex = 0; pointIndex <= 48; pointIndex += 1) {
      const t = (pointIndex % 48) / 48;
      const from = boundaryPoint(overlapShape.from, t);
      const to = boundaryPoint(overlapShape.target, t);
      let x = from.x + (to.x - from.x) * overlapShape.progress;
      let y = from.y + (to.y - from.y) * overlapShape.progress;
      if (triangleAmount > 0) {
        const angle = box.rotation * triangleAmount;
        const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
        y = x * Math.sin(angle) + y * Math.cos(angle);
        x = rotatedX;
      }
      const screenX = box.x + x * radius;
      const screenY = box.y + y * radius;
      if (pointIndex === 0) ctx.moveTo(screenX, screenY); else ctx.lineTo(screenX, screenY);
    }
    ctx.closePath();
  };

  boxes.forEach((box) => {
    ctx.fillStyle = `rgb(${box.shade}, ${box.shade}, ${box.shade + 2})`;
    ctx.strokeStyle = `rgba(225, 225, 232, ${.14 + box.energy * .48})`;
    ctx.lineWidth = 1 + box.energy * 1.2;
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
      const sharedEnergy = (boxes[i].energy + boxes[j].energy) / 2;
      ctx.fillStyle = color((boxes[i].hue + boxes[j].hue) / 2 + sharedEnergy * 90, 88, 58 + sharedEnergy * 18, .2 + sharedEnergy * .42);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
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

function renderDancer(phase, b, strokeColor, style) {
  dancerMaskCtx.clearRect(0, 0, dancerMask.width, dancerMask.height);
  dancerMaskCtx.fillStyle = '#fff';
  dancerMaskCtx.strokeStyle = '#fff';

  const groove = Math.sin(phase);
  const counterGroove = Math.sin(phase + Math.PI / 2);
  const beat = Math.pow(Math.max(0, Math.sin(phase * 2)), 2);
  const bounce = -beat * (4 + b.low * 9);
  const sway = groove * (8 + b.mid * 8);
  const pelvis = { x: 110 + sway * .42, y: 205 + bounce };
  const chest = { x: 110 - sway * .28, y: 130 + bounce * .62 };
  const neck = { x: chest.x - sway * .08, y: chest.y - 27 };
  const shoulderL = { x: chest.x - 27, y: chest.y + 2 };
  const shoulderR = { x: chest.x + 27, y: chest.y - 2 };
  const hipL = { x: pelvis.x - 18, y: pelvis.y };
  const hipR = { x: pelvis.x + 18, y: pelvis.y };

  dancerMaskCtx.beginPath();
  dancerMaskCtx.moveTo(chest.x - 31, chest.y - 4);
  dancerMaskCtx.bezierCurveTo(chest.x - 27, chest.y + 22, pelvis.x - 16, pelvis.y - 40, pelvis.x - 22, pelvis.y - 5);
  dancerMaskCtx.quadraticCurveTo(pelvis.x, pelvis.y + 12, pelvis.x + 22, pelvis.y - 5);
  dancerMaskCtx.bezierCurveTo(pelvis.x + 16, pelvis.y - 40, chest.x + 27, chest.y + 22, chest.x + 31, chest.y - 4);
  dancerMaskCtx.quadraticCurveTo(chest.x, chest.y - 17, chest.x - 31, chest.y - 4);
  dancerMaskCtx.fill();
  dancerMaskCtx.beginPath();
  dancerMaskCtx.roundRect(neck.x - 7, neck.y - 5, 14, 31, 6);
  dancerMaskCtx.fill();
  const gestures = [
    [{ x: 54 + groove * 8, y: 54 - b.high * 12 }, { x: 177, y: 142 + counterGroove * 20 }],
    [{ x: 48, y: 125 + groove * 24 }, { x: 172, y: 76 - counterGroove * 18 }],
    [{ x: 68 + groove * 12, y: 82 }, { x: 153 + counterGroove * 15, y: 82 + groove * 15 }],
  ][style % 3];
  const handL = gestures[0];
  const handR = gestures[1];
  const elbowL = { x: (shoulderL.x + handL.x) / 2 - 14, y: (shoulderL.y + handL.y) / 2 + 5 };
  const elbowR = { x: (shoulderR.x + handR.x) / 2 + 14, y: (shoulderR.y + handR.y) / 2 + 5 };
  drawLimb(dancerMaskCtx, [shoulderL, elbowL, handL], 17);
  drawLimb(dancerMaskCtx, [shoulderR, elbowR, handR], 17);

  // The feet stay planted most of the time; shifting the knees and pelvis sells
  // weight transfer without making the figure look airborne or distressed.
  const step = style % 2 ? counterGroove : groove;
  const footL = { x: 72 - Math.max(0, -step) * (8 + b.low * 8), y: 318 - Math.max(0, step) * b.low * 7 };
  const footR = { x: 148 + Math.max(0, step) * (8 + b.low * 8), y: 318 - Math.max(0, -step) * b.low * 7 };
  const kneeL = { x: 86 + sway * .22 - step * 6, y: 260 + Math.abs(step) * 5 };
  const kneeR = { x: 134 + sway * .22 - step * 6, y: 260 + Math.abs(step) * 5 };
  drawLimb(dancerMaskCtx, [hipL, kneeL, footL], 22);
  drawLimb(dancerMaskCtx, [hipR, kneeR, footR], 22);

  dancerMaskCtx.beginPath();
  dancerMaskCtx.ellipse(neck.x, neck.y - 25, 17, 21, sway * .004, 0, Math.PI * 2);
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
  const tempo = frame * (.007 + b.mid * .006);
  const floor = h * .92;
  const activeDancers = dancers.slice(0, w < 600 ? 4 : dancers.length);
  ctx.globalCompositeOperation = 'lighter';
  activeDancers.forEach((dancer, index) => {
    const scale = dancer.depth * Math.min(1, h / 690, w / 1050);
    const phase = tempo + dancer.phase * .72;
    const x = w * ((index + .5) / activeDancers.length) + Math.sin(phase * .5 + index) * (4 + b.mid * 7);
    renderDancer(phase, b, color(dancer.hue + frame * .025, 88, 68, .68 + b.level * .3), index);
    ctx.drawImage(dancerOutline, x - dancerOutline.width * scale / 2, floor - dancerOutline.height * scale, dancerOutline.width * scale, dancerOutline.height * scale);
  });
  ctx.globalCompositeOperation = 'source-over';
}

function drawUniverse(w, h, b) {
  const cx = w * .5;
  const cy = h * .48;
  const shortEdge = Math.min(w, h);
  const flightSpeed = .0014 + b.high * .005;

  ctx.globalCompositeOperation = 'lighter';
  universeStars.forEach((star) => {
    const oldZ = star.z;
    star.z -= flightSpeed;
    if (star.z < .06) {
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
      star.z = 1;
    }
    const spread = shortEdge * .58;
    const x = cx + star.x / star.z * spread;
    const y = cy + star.y / star.z * spread;
    const oldX = cx + star.x / oldZ * spread;
    const oldY = cy + star.y / oldZ * spread;
    if (x < -40 || x > w + 40 || y < -40 || y > h + 40) {
      star.x = (Math.random() * 2 - 1) * .3;
      star.y = (Math.random() * 2 - 1) * .3;
      star.z = 1;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(oldX, oldY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color(star.hue, 72, 78, .12 + (1 - star.z) * .58 + b.high * .2);
    ctx.lineWidth = star.size * (1.15 - star.z) + b.high * 1.2;
    ctx.stroke();
  });

  const transient = b.low > .34 && b.low - universePreviousLow > .035;
  if (transient && frame - universeLastRipple > 30) {
    universeRipples.push({ radius: shortEdge * .06, alpha: .72, tilt: .26 + Math.random() * .12 });
    universeLastRipple = frame;
  }
  universePreviousLow = b.low;
  universeRipples = universeRipples.filter((ripple) => ripple.radius < Math.hypot(w, h) * .7 && ripple.alpha > .01);
  universeRipples.forEach((ripple) => {
    ripple.radius += 1.1 + b.low * 2.2;
    ripple.alpha *= .992;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ripple.radius, ripple.radius * ripple.tilt, frame * .0015, 0, Math.PI * 2);
    ctx.strokeStyle = color(245 + ripple.radius * .04, 92, 68, ripple.alpha * .3);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  const galaxyRotation = frame * (.0012 + b.mid * .0014);
  const galaxyRadius = shortEdge * (.31 + b.low * .035);
  for (let index = 0; index < 620; index += 1) {
    const band = index % 3 === 0 ? b.low : index % 3 === 1 ? b.mid : b.high;
    const arm = index % 4;
    const distance = Math.sqrt((index + .5) / 620);
    const noise = Math.sin(index * 91.733) * .5 + Math.sin(index * 17.17) * .5;
    const angle = arm * Math.PI / 2 + distance * 7.8 + galaxyRotation + noise * (.12 + distance * .18);
    const radius = distance * galaxyRadius * (1 + band * .12);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * (.25 + distance * .08) + Math.sin(angle * 2 + frame * .006) * band * 8;
    const dust = 1 - distance;
    ctx.beginPath();
    ctx.fillStyle = color(205 + arm * 28 + distance * 65, 88, 58 + dust * 26, .08 + dust * .38 + band * .32);
    ctx.arc(x, y, .35 + dust * 1.45 + band * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const coreRadius = shortEdge * (.025 + b.low * .025);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 5);
  core.addColorStop(0, color(46, 100, 92, .92));
  core.addColorStop(.18, color(285, 96, 72, .44 + b.low * .25));
  core.addColorStop(1, color(230, 90, 50, 0));
  ctx.fillStyle = core;
  ctx.fillRect(cx - coreRadius * 5, cy - coreRadius * 5, coreRadius * 10, coreRadius * 10);
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
  if (mode === 'universe') drawUniverse(innerWidth, innerHeight, b);
  if (mode === 'tangle') drawTangle(innerWidth, innerHeight, b);
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
  universeRipples = [];
  modeButtons.forEach((item) => item.classList.toggle('active', item === button));
  const url = new URL(location.href);
  url.searchParams.set('mode', mode);
  history.replaceState({}, '', url);
  window.umami?.track('visualization-changed', { visualization: mode });
}));
window.addEventListener('resize', resize);
window.addEventListener('resize', () => { squares = []; tangleDots = []; });
window.addEventListener('pointermove', (event) => {
  app.classList.toggle('show-modes', Boolean(audio) && event.clientY > innerHeight - 96);
});
document.documentElement.addEventListener('mouseleave', () => app.classList.remove('show-modes'));
window.addEventListener('pagehide', () => audio && stopAudio());
resize();
draw();
