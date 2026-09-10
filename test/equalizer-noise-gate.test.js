import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdaptiveNoiseGate } from '../src/audio/equalizer-noise-gate.js';

test('learns and suppresses a steady ambient floor', () => {
  const gate = createAdaptiveNoiseGate();
  let output = 0;

  for (let frame = 0; frame < 180; frame += 1) output = gate.sample(0, .18, { learn: true });

  assert.ok(output < .01, `expected ambient output below .01, received ${output}`);
});

test('preserves a bass transient above the learned floor', () => {
  const gate = createAdaptiveNoiseGate();
  for (let frame = 0; frame < 180; frame += 1) gate.sample(0, .18, { learn: true });

  assert.ok(gate.sample(0, .55, { learn: false }) > .35);
});

test('does not learn active music as background noise', () => {
  const gate = createAdaptiveNoiseGate();
  for (let frame = 0; frame < 180; frame += 1) gate.sample(0, .08, { learn: true });

  let output = 0;
  for (let frame = 0; frame < 180; frame += 1) output = gate.sample(0, .35, { learn: false });

  assert.ok(output > .25);
});
