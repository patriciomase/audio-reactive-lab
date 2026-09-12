import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrismVisualization } from '../src/visualizations/prism.js';

function createContext() {
  const operations = [];
  return {
    operations,
    save() { operations.push('save'); },
    restore() { operations.push('restore'); },
    beginPath() { operations.push('beginPath'); },
    moveTo() {},
    lineTo() {},
    stroke() { operations.push('stroke'); },
  };
}

test('renders both atmospheric and foreground Prism wave layers', () => {
  const ctx = createContext();
  createPrismVisualization().render({
    ctx,
    width: 160,
    height: 100,
    bands: { level: .4, mid: .3, high: .2 },
    audioFrame: { isLive: true, waveform: new Uint8Array(32).fill(140) },
    frame: 12,
    color: (...values) => values.join(','),
  });

  assert.equal(ctx.operations.filter((operation) => operation === 'stroke').length, 15);
  assert.equal(ctx.operations.filter((operation) => operation === 'beginPath').length, 15);
  assert.deepEqual(ctx.operations.slice(0, 2), ['save', 'beginPath']);
  assert.equal(ctx.operations.includes('restore'), true);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
});

test('renders deterministic demo waves without live waveform data', () => {
  const ctx = createContext();
  const visualization = createPrismVisualization();
  const renderFrame = {
    ctx,
    width: 80,
    height: 60,
    bands: { level: .14, mid: .12, high: .08 },
    audioFrame: { isLive: false, waveform: new Uint8Array(0) },
    frame: 42,
    color: () => '#fff',
  };

  assert.doesNotThrow(() => visualization.render(renderFrame));
});
