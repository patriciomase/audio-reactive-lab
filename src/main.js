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
  ctx.globalCompositeOperation = 'lighter';
  for (let ring = 0; ring < 5; ring += 1) {
    const energy = ring < 2 ? b.low : ring < 4 ? b.mid : b.high;
    const count = 28 + ring * 12;
    const radius = 80 + ring * 46 + energy * 65;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + frame * (0.002 + ring * 0.0007) * (ring % 2 ? -1 : 1);
      const wobble = Math.sin(a * (3 + ring) + frame * .018) * (8 + energy * 24);
      const x = cx + Math.cos(a) * (radius + wobble);
      const y = cy + Math.sin(a) * (radius + wobble) * .72;
      ctx.beginPath();
      ctx.fillStyle = color(255 + ring * 24 + b.high * 80, 90, 65 + energy * 20, .24 + energy * .62);
      ctx.arc(x, y, 1.2 + energy * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawTerrain(w, h, b) {
  const sample = [];
  for (let i = 0; i < 48; i += 1) {
    sample.push(audio ? audio.frequency[i * 3] / 255 : Math.max(0, Math.sin(i * .4 + frame * .03)) * .18);
  }
  spectrumHistory.unshift(sample);
  spectrumHistory = spectrumHistory.slice(0, 30);
  ctx.lineWidth = 1.2;
  spectrumHistory.forEach((row, z) => {
    const perspective = 1 - z / 48;
    const baseY = h * .72 - z * 10;
    ctx.beginPath();
    row.forEach((value, i) => {
      const x = w / 2 + (i - row.length / 2) * (w / 45) * perspective;
      const y = baseY - value * (170 + b.low * 100) * perspective;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color(190 + z * 4 + b.high * 80, 90, 64, .85 - z / 38);
    ctx.stroke();
  });
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
  app.classList.remove('immersive');
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
  modeButtons.forEach((item) => item.classList.toggle('active', item === button));
  const url = new URL(location.href);
  url.searchParams.set('mode', mode);
  history.replaceState({}, '', url);
}));
window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => audio && stopAudio());
resize();
draw();
