import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadMonitor } from '../src/rendering/load-monitor.js';

test('reports render rate and draw cost over a bounded sampling window', () => {
  const monitor = createLoadMonitor({ sampleWindowMs: 500 });

  assert.equal(monitor.record(0, 2), null);
  assert.equal(monitor.record(250, 4), null);
  assert.deepEqual(monitor.record(500, 6), {
    fps: 6,
    averageDrawMs: 4,
    maximumDrawMs: 6,
  });
});

test('reset discards an incomplete sampling window', () => {
  const monitor = createLoadMonitor({ sampleWindowMs: 500 });
  monitor.record(0, 20);
  monitor.reset();

  assert.equal(monitor.record(1000, 2), null);
  assert.equal(monitor.record(1500, 2)?.averageDrawMs, 2);
});
