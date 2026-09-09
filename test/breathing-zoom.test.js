import test from 'node:test';
import assert from 'node:assert/strict';
import { breathingZoomScale, paintBreathingZoom } from '../src/effects/breathing-zoom.js';

test('breathes from the normal viewport into an audio-reactive close-up', () => {
  const quiet = Array.from({ length: 600 }, (_, frame) => breathingZoomScale({ frame, bands: { level: 0 } }));
  const loud = Array.from({ length: 600 }, (_, frame) => breathingZoomScale({ frame, bands: { level: 1 } }));

  assert.ok(Math.min(...quiet) >= 1);
  assert.ok(Math.max(...quiet) >= 1.079);
  assert.ok(Math.max(...loud) >= 1.159);
  assert.ok(Math.max(...loud) > Math.max(...quiet));
});

test('zooms around the viewport center and restores the canvas', () => {
  const operations = [];
  const ctx = {
    save: () => operations.push(['save']),
    restore: () => operations.push(['restore']),
    translate: (x, y) => operations.push(['translate', x, y]),
    scale: (x, y) => operations.push(['scale', x, y]),
  };

  paintBreathingZoom({
    ctx,
    width: 1000,
    height: 600,
    bands: { level: .5 },
    frame: 80,
    paintSource: () => operations.push(['paint']),
  });

  assert.deepEqual(operations[0], ['save']);
  assert.deepEqual(operations[1], ['translate', 500, 300]);
  assert.equal(operations[2][0], 'scale');
  assert.deepEqual(operations[3], ['translate', -500, -300]);
  assert.deepEqual(operations.at(-2), ['paint']);
  assert.deepEqual(operations.at(-1), ['restore']);
});
