import test from 'node:test';
import assert from 'node:assert/strict';
import { createBeatZoomController, createBeatZoomEffect } from '../src/effects/breathing-zoom.js';

test('stays still without a beat and gives bass transients a subtle release envelope', () => {
  const zoom = createBeatZoomController();
  const quiet = Array.from({ length: 30 }, (_, frame) => zoom.advance({
    frame,
    bands: { low: .12, level: .12 },
    audioFrame: { isLive: true },
  }));
  const beat = zoom.advance({ frame: 30, bands: { low: .8, level: .4 }, audioFrame: { isLive: true } });
  const release = Array.from({ length: 30 }, (_, offset) => zoom.advance({
    frame: 31 + offset,
    bands: { low: .12, level: .12 },
    audioFrame: { isLive: true },
  }));

  assert.deepEqual(new Set(quiet), new Set([1]));
  assert.ok(beat > 1.015 && beat <= 1.035);
  assert.ok(release.every((scale, index) => index === 0 || scale <= release[index - 1]));
  assert.ok(release.at(-1) < 1.001);
});

test('zooms around the viewport center and restores the canvas', () => {
  const operations = [];
  const ctx = {
    save: () => operations.push(['save']),
    restore: () => operations.push(['restore']),
    translate: (x, y) => operations.push(['translate', x, y]),
    scale: (x, y) => operations.push(['scale', x, y]),
  };

  const paintBeatZoom = createBeatZoomEffect();
  paintBeatZoom({
    ctx,
    width: 1000,
    height: 600,
    bands: { low: .8, level: .5 },
    audioFrame: { isLive: true },
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
