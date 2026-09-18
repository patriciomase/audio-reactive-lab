import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrbitVisualization } from '../src/visualizations/orbit.js';
import { createTerrainVisualization } from '../src/visualizations/terrain.js';
import { createTunnelVisualization } from '../src/visualizations/tunnel.js';
import { createPacmanVisualization } from '../src/visualizations/pacman.js';
import { createGalaxianFrequencyLanes, createGalaxianShotController, createGalaxianVisualization } from '../src/visualizations/galaxian.js';

function createContext() {
  const counts = { arc: 0, fill: 0, stroke: 0, closePath: 0 };
  return {
    counts,
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() { counts.arc += 1; },
    fill() { counts.fill += 1; },
    stroke() { counts.stroke += 1; },
    closePath() { counts.closePath += 1; },
  };
}

function renderFrame(ctx, frame = 1) {
  return {
    ctx,
    width: 800,
    height: 600,
    bands: { low: .2, mid: .15, high: .1, level: .15 },
    audioFrame: { isLive: false, index: frame, spectrum: new Uint8Array(0), sampleRate: 48000, fftSize: 2048 },
    frame,
    color: (...values) => values.join(','),
  };
}

test('Orbit activation renders its particle rings and owns disposable wave state', () => {
  const ctx = createContext();
  const orbit = createOrbitVisualization();
  orbit.render(renderFrame(ctx, 40));

  assert.ok(ctx.counts.arc > 200);
  assert.equal(ctx.counts.arc, ctx.counts.fill);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
  assert.doesNotThrow(() => orbit.dispose());
});

test('Terrain activation samples history and renders rows and columns', () => {
  const ctx = createContext();
  createTerrainVisualization({ random: () => .5 }).render(renderFrame(ctx));

  assert.ok(ctx.counts.stroke > 30);
});

test('Tunnel activation samples history and renders closed rings and rails', () => {
  const ctx = createContext();
  const tunnel = createTunnelVisualization({ random: () => .5 });
  tunnel.render(renderFrame(ctx));

  assert.ok(ctx.counts.stroke > 20);
  assert.ok(ctx.counts.closePath > 0);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
  assert.doesNotThrow(() => tunnel.dispose());
});

test('Pac-Man activation sends independently sized characters across the viewport', () => {
  const draws = [];
  const ctx = {
    ...createContext(),
    save() {}, restore() {}, translate() {}, scale() {},
    drawImage(image, x, y, width, height) { draws.push({ source: image.src, x, y, width, height }); },
  };
  const createImage = () => ({ complete: true, naturalWidth: 64, src: '' });
  const pacman = createPacmanVisualization({ random: (() => {
    let value = 0;
    return () => (value += .137) % 1;
  })(), createImage });

  pacman.render(renderFrame(ctx));

  assert.ok(draws.length >= 12);
  assert.ok(new Set(draws.map(({ width }) => Math.round(width))).size > 3);
  assert.equal(draws.filter(({ source }) => source.includes('pacman-')).length, 1);
  assert.doesNotThrow(() => pacman.dispose());
});

test('Galaxian activation renders a multi-row fleet and player fighter', () => {
  const draws = [];
  let shadowWrites = 0;
  const ctx = {
    ...createContext(),
    save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {},
    drawImage(image, x, y, width, height) { draws.push({ source: image.src, x, y, width, height }); },
  };
  Object.defineProperty(ctx, 'shadowBlur', { set() { shadowWrites += 1; } });
  const galaxian = createGalaxianVisualization({
    random: () => .5,
    createImage: () => ({ complete: true, naturalWidth: 64, src: '' }),
  });

  galaxian.render(renderFrame(ctx, 54));

  assert.ok(draws.length > 40);
  assert.equal(draws.filter(({ source }) => source.includes('fighter')).length, 1);
  assert.ok(new Set(draws.map(({ y }) => Math.round(y / 20))).size >= 5);
  assert.equal(shadowWrites, 0, 'per-ship canvas shadows are too expensive for the fleet');
  assert.doesNotThrow(() => galaxian.dispose());
});

test('Galaxian frequency lanes normalize bass and treble independently', () => {
  const controller = createGalaxianFrequencyLanes(2);
  const spectrum = new Uint8Array(1024);
  spectrum.fill(210, 1, 8);
  spectrum.fill(28, 300, 1024);
  let lanes;
  for (let frame = 0; frame < 180; frame += 1) {
    lanes = controller.update({
      audioFrame: { isLive: true, spectrum, sampleRate: 48000, fftSize: 2048 },
      bands: { low: .8, mid: .2, high: .1 },
      frame,
    });
  }

  assert.ok(Math.abs(lanes[0].energy - lanes[1].energy) < .15);
});

test('Galaxian enemy equalizer bars never overlap', () => {
  let draws = [];
  const ctx = {
    ...createContext(),
    save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {},
    drawImage(image, x, y, width, height) { draws.push({ source: image.src, x, y, width, height }); },
  };
  const galaxian = createGalaxianVisualization({
    random: () => .5,
    createImage: () => ({ complete: true, naturalWidth: 64, src: '' }),
  });
  for (let frame = 1; frame <= 300; frame += 1) {
    draws = [];
    galaxian.render(renderFrame(ctx, frame));
    const enemies = draws.filter(({ source }) => !source.includes('fighter'));
    for (let left = 0; left < enemies.length; left += 1) {
      for (let right = left + 1; right < enemies.length; right += 1) {
        const a = enemies[left];
        const b = enemies[right];
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        assert.ok(overlapX <= 0 || overlapY <= 0, `enemy rectangles overlap at frame ${frame} by ${overlapX.toFixed(1)}×${overlapY.toFixed(1)}`);
      }
    }
  }
});

test('Galaxian shots stay between one and two per second without burst catch-up', () => {
  const controller = createGalaxianShotController({ random: () => .5 });
  for (let time = 0; time <= 10000; time += 100) {
    controller.update({ time, width: 800, height: 600, level: .5, spawnX: 400, spawnY: 200 });
  }
  assert.ok(controller.fired >= 10);
  assert.ok(controller.fired <= 20);
  const beforePause = controller.fired;
  controller.update({ time: 30000, width: 800, height: 600, level: 1, spawnX: 400, spawnY: 200 });
  assert.equal(controller.fired, beforePause + 1);
});

test('Galaxian fighter selects a path clear of every approaching shot', () => {
  const controller = createGalaxianShotController({ random: () => .5 });
  let fighterX = 400;
  for (let time = 0; time <= 12000; time += 1000 / 60) {
    controller.update({ time, width: 800, height: 600, level: 1, spawnX: 400, spawnY: 170 });
    const safe = controller.safeTarget({ preferredX: 400, fighterY: 510, width: 800, margin: 44 });
    fighterX += (safe.x - fighterX) * (.055 + safe.urgency * .2);
    controller.shots.forEach((shot) => {
      const collides = Math.abs(shot.x - fighterX) < 30 && shot.y > 485 && shot.y < 535;
      assert.equal(collides, false);
    });
  }
});
