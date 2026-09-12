import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrbitVisualization } from '../src/visualizations/orbit.js';
import { createTerrainVisualization } from '../src/visualizations/terrain.js';
import { createTunnelVisualization } from '../src/visualizations/tunnel.js';
import { createPacmanVisualization } from '../src/visualizations/pacman.js';

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
