import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTraceEdges } from '../src/visualizations/trace.js';

test('detects a high-contrast contour and rejects a flat frame', () => {
  const width = 12;
  const height = 8;
  const flat = new Uint8ClampedArray(width * height * 4).fill(40);
  const split = new Uint8ClampedArray(flat);
  for (let y = 0; y < height; y += 1) {
    for (let x = width / 2; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      split[offset] = split[offset + 1] = split[offset + 2] = 240;
    }
  }
  assert.equal(detectTraceEdges(flat, width, height, 0).edgePixels, 0);
  assert.ok(detectTraceEdges(split, width, height, 0).edgePixels > 0);
});

test('more energy cannot raise the adaptive edge threshold', () => {
  const width = 10;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  data.forEach((_, index) => { data[index] = index % 17 * 12; });
  const quiet = detectTraceEdges(data, width, height, 0);
  const loud = detectTraceEdges(data, width, height, 1);
  assert.ok(loud.edgePixels >= quiet.edgePixels);
});
