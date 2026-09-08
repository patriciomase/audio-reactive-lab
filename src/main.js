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

const validModes = new Set(['orbit', 'terrain', 'prism']);
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

function drawBackground(w, h, b) {
  const gradient = ctx.createRadialGradient(w * .5, h * .48, 0, w * .5, h * .48, Math.max(w, h) * .75);
  const center = colorMode === 'original'
    ? `rgba(${20 + b.low * 40}, ${10 + b.mid * 30}, ${38 + b.high * 70}, 1)`
    : color(250 + b.high * 90, colorMode === 'dark' ? 18 : 58, colorMode === 'dark' ? 10 : 14 + b.level * 12);
  gradient.addColorStop(0, center);
  gradient.addColorStop(.5, '#080812');
  gradient.addColorStop(1, '#030305');
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
  const viewportRadius = Math.hypot(w, h) * .62;
  reverbWaves = reverbWaves.filter((wave) => wave.maxRadius * wave.scale < viewportRadius && wave.alpha > .006);
  reverbWaves.forEach((wave) => {
    wave.scale += wave.speed;
    wave.speed *= 1.002;
    wave.alpha *= .996;
    wave.points.forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = color(point.hue, 90, point.lightness, point.alpha * wave.alpha);
      ctx.arc(cx + point.x * wave.scale, cy + point.y * wave.scale, Math.max(.6, point.size * (.55 + wave.alpha * .35)), 0, Math.PI * 2);
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
  for (let i = 0; i < 48; i += 1) {
    sample.push(audio ? audio.frequency[i * 3] / 255 : Math.max(0, Math.sin(i * .4 + frame * .03)) * .18);
  }
  spectrumHistory.unshift(sample);
  spectrumHistory = spectrumHistory.slice(0, 30);
  const yaw = frame * .009;
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
    (z / 29 - .5) * side,
  )));

  ctx.lineWidth = 1.05;
  grid.forEach((row, z) => {
    ctx.beginPath();
    row.forEach((point, i) => i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = color(190 + z * 4 + b.high * 80, 90, 64, .82 - z / 45);
    ctx.stroke();
  });
  for (let column = 0; column < 48; column += 3) {
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

function draw() {
  frame += 1;
  const b = bands();
  drawBackground(innerWidth, innerHeight, b);
  if (mode === 'orbit') drawOrbit(innerWidth, innerHeight, b);
  if (mode === 'terrain') drawTerrain(innerWidth, innerHeight, b);
  if (mode === 'prism') drawPrism(innerWidth, innerHeight, b);
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
});
modeButtons.forEach((button) => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  spectrumHistory = [];
  reverbWaves = [];
  modeButtons.forEach((item) => item.classList.toggle('active', item === button));
  const url = new URL(location.href);
  url.searchParams.set('mode', mode);
  history.replaceState({}, '', url);
}));
window.addEventListener('resize', resize);
window.addEventListener('pointermove', (event) => {
  app.classList.toggle('show-modes', Boolean(audio) && event.clientY > innerHeight - 96);
});
document.documentElement.addEventListener('mouseleave', () => app.classList.remove('show-modes'));
window.addEventListener('pagehide', () => audio && stopAudio());
resize();
draw();
