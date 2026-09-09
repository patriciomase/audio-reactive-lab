import test from 'node:test';
import assert from 'node:assert/strict';
import { paintKaleidoscope } from '../src/effects/kaleidoscope.js';

function createContext() {
  return {
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    beginPath() {},
    moveTo() {},
    arc() {},
    closePath() {},
    clip() {},
    scale() {},
  };
}

test('repeats the source radially instead of stacking every slice at the center', () => {
  let paints = 0;
  paintKaleidoscope({
    ctx: createContext(),
    width: 1200,
    height: 800,
    bands: { mid: .5 },
    frame: 12,
    paintSource() { paints += 1; },
  });

  assert.ok(paints >= 14 * 3, `expected at least three source copies per slice, received ${paints / 14}`);
});
