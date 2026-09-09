import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyphField } from '../src/visualizations/glyph-field.js';

test('a replacement displaces one glyph and fades it instead of accumulating characters', () => {
  const field = createGlyphField({ random: () => 0, displacedFade: .5 });
  field.resize(4, 4);
  field.write(1, () => ({ character: 'A', alpha: 1 }));
  field.write(1, () => ({ character: 'B', alpha: 1 }));

  let cell = field.entries()[0];
  assert.equal(cell.current.character, 'B');
  assert.equal(cell.outgoing.character, 'A');

  for (let frame = 0; frame < 8; frame += 1) field.advance();
  cell = field.entries()[0];
  assert.equal(cell.current.character, 'B');
  assert.equal(cell.outgoing, null);
});

test('caps occupied cells to keep the board sparse', () => {
  let value = 0;
  const field = createGlyphField({
    maxDensity: .12,
    random: () => ((value += .173) % 1),
  });
  field.resize(10, 10);
  field.write(500, () => ({ character: 'X', alpha: 1 }));

  assert.ok(field.entries().length <= 12);
});
