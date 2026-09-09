import test from 'node:test';
import assert from 'node:assert/strict';
import { createKaleidoscopeGrid, paintKaleidoscope } from '../src/effects/kaleidoscope.js';

function createContext() {
  const operations = [];
  return {
    operations,
    save() {},
    restore() {},
    translate(x, y) { operations.push(['translate', x, y]); },
    rotate(angle) { operations.push(['rotate', angle]); },
    beginPath() {},
    moveTo() {},
    arc() {},
    rect(x, y, width, height) { operations.push(['rect', x, y, width, height]); },
    closePath() {},
    clip() {},
    scale(x, y) { operations.push(['scale', x, y]); },
  };
}

test('fills a stable rectangular grid with alternating mirrored sources', () => {
  const ctx = createContext();
  let paints = 0;
  paintKaleidoscope({
    ctx,
    width: 1200,
    height: 800,
    bands: { mid: .5 },
    frame: 12,
    paintSource() { paints += 1; },
  });

  const grid = createKaleidoscopeGrid(1200, 800);
  assert.equal(paints, grid.tiles.length);
  assert.ok(grid.columns >= 5 && grid.rows >= 3);
  assert.equal(grid.tiles[0].x, 0);
  assert.equal(grid.tiles.at(-1).y + grid.tiles.at(-1).height, 800);
  assert.equal(ctx.operations.some(([operation]) => operation === 'rotate'), false);
  assert.ok(ctx.operations.some(([operation, x]) => operation === 'scale' && x === -1));
  assert.ok(ctx.operations.some(([operation, , y]) => operation === 'scale' && y === -1));
});
