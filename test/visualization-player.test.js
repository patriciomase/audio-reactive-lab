import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisualizationPlayer } from '../src/runtime/visualization-player.js';

function fixture({ hasCamera = false, prepareTransition } = {}) {
  const changes = [];
  const errors = [];
  const timers = [];
  const cleared = [];
  const definitions = ['orbit', 'trace', 'pulse'].map((id) => ({
    id,
    label: id,
    settings: [],
    carouselEligible: id === 'trace' ? ({ hasCamera: active }) => active : undefined,
    create: () => ({ render() {} }),
  }));
  const player = createVisualizationPlayer({
    definitions,
    initialId: 'orbit',
    eligibility: () => ({ hasCamera }),
    prepareTransition,
    onChange: (change) => changes.push(change),
    onError: (failure) => errors.push(failure),
    setTimer: (callback, delay) => { const timer = { callback, delay }; timers.push(timer); return timer; },
    clearTimer: (timer) => cleared.push(timer),
  });
  return { player, changes, errors, timers, cleared };
}

test('selects an initial visualization and reports the transition', async () => {
  const { player, changes } = fixture();
  assert.equal(await player.select('orbit', { reason: 'initial' }), true);
  assert.equal(player.currentId, 'orbit');
  assert.equal(changes[0].current.id, 'orbit');
});

test('carousel skips camera definitions that are not eligible', async () => {
  const { player } = fixture();
  await player.select('orbit');
  await player.advance({ reason: 'carousel' });
  assert.equal(player.currentId, 'pulse');
});

test('changing carousel configuration replaces and cancels timers', async () => {
  const { player, timers, cleared } = fixture();
  await player.select('orbit');
  player.configureCarousel({ enabled: true, intervalMs: 45000 });
  const first = timers.at(-1);
  player.configureCarousel({ enabled: true, intervalMs: 20000 });
  assert.equal(timers.at(-1).delay, 20000);
  assert.ok(cleared.includes(first));
  player.configureCarousel({ enabled: false, intervalMs: 20000 });
  assert.ok(cleared.includes(timers.at(-1)));
});

test('a rejected preparation keeps the previous visualization active', async () => {
  const { player, errors } = fixture({
    prepareTransition: async ({ nextDefinition }) => {
      if (nextDefinition.id === 'trace') throw new Error('camera denied');
    },
  });
  await player.select('orbit');
  assert.equal(await player.select('trace', { reason: 'user' }), false);
  assert.equal(player.currentId, 'orbit');
  assert.equal(errors[0].phase, 'enter');
});
