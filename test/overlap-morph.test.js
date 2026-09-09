import test from 'node:test';
import assert from 'node:assert/strict';
import { OVERLAP_MORPH_DURATION, overlapMorphDelay } from '../src/visualizations/overlap-morph.js';

test('keeps shape changes frequent enough to discover and slow enough to see', () => {
  assert.equal(overlapMorphDelay(() => 0), 18000);
  assert.equal(overlapMorphDelay(() => 1), 36000);
  assert.equal(OVERLAP_MORPH_DURATION, 2200);
});
