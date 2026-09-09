import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpectrumHistory } from '../src/audio/spectrum-history.js';

test('samples live spectrum logarithmically into a newest-first history', () => {
  const spectrum = new Uint8Array(128);
  spectrum.fill(255);
  const history = createSpectrumHistory({ columns: 4, rows: 2 });
  const frame = { isLive: true, spectrum, sampleRate: 48000, fftSize: 256, index: 1 };

  const first = history.advance(frame);
  const firstRow = first[0];
  const second = history.advance({ ...frame, index: 2 });

  assert.equal(second.length, 2);
  assert.notEqual(second[0], firstRow);
  assert.equal(second[1], firstRow);
  assert.ok(second[0][0] < second[0][3]);
  const projected = Array.from(second[0], (value, column) => ({ value, column }));
  assert.deepEqual(projected.map(({ column }) => column), [0, 1, 2, 3]);
  assert.ok(projected.every(({ value }) => Number.isFinite(value)));
});

test('caps history and reuses rows after warmup', () => {
  const history = createSpectrumHistory({ columns: 3, rows: 2 });
  const frame = (index) => ({ isLive: false, spectrum: new Uint8Array(0), sampleRate: 48000, fftSize: 2048, index });
  const oldestRow = history.advance(frame(1))[0];
  history.advance(frame(2));
  const rows = history.advance(frame(3));

  assert.equal(rows.length, 2);
  assert.equal(rows[0], oldestRow);
});

test('demo sampling is deterministic for a frame index', () => {
  const sample = () => createSpectrumHistory({ columns: 5, rows: 1 })
    .advance({ isLive: false, spectrum: new Uint8Array(0), sampleRate: 48000, fftSize: 2048, index: 75 })[0];

  assert.deepEqual(sample(), sample());
});
