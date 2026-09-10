import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasPixelRatio, createFrameGate } from '../src/rendering/render-performance.js';

test('caps Equalizer resolution below other visualizations on dense displays', () => {
  assert.equal(canvasPixelRatio('equalizer', 2), 1.5);
  assert.equal(canvasPixelRatio('orbit', 2), 2);
  assert.equal(canvasPixelRatio('equalizer', 1), 1);
});

test('limits selected frames while preserving an immediate frame after reset', () => {
  const gate = createFrameGate(45);
  const rendered = [0, 16.67, 33.34, 50.01, 66.68].filter((time) => gate.shouldRender(time));

  assert.deepEqual(rendered, [0, 33.34, 50.01, 66.68]);
  gate.reset();
  assert.equal(gate.shouldRender(70), true);
});
