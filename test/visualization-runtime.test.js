import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisualizationRuntime } from '../src/runtime/visualization-runtime.js';

test('activation restarts state and disposes the previous visualization', async () => {
  const events = [];
  let generation = 0;
  const runtime = createVisualizationRuntime({
    definitions: [{
      id: 'pulse',
      label: 'Pulse',
      create: () => {
        const current = ++generation;
        return {
          render: () => events.push(`render:${current}`),
          dispose: () => events.push(`dispose:${current}`),
        };
      },
    }],
  });
  await runtime.activate('pulse');
  runtime.render({});
  await runtime.activate('pulse');
  runtime.render({});
  assert.deepEqual(events, ['render:1', 'dispose:1', 'render:2']);
});

test('render failures are isolated and dispose the failed activation', async () => {
  const errors = [];
  let disposed = false;
  const runtime = createVisualizationRuntime({
    definitions: [{
      id: 'broken',
      label: 'Broken',
      create: () => ({
        render: () => { throw new Error('boom'); },
        dispose: () => { disposed = true; },
      }),
    }],
    onError: (error, definition, phase) => errors.push([error.message, definition.id, phase]),
  });
  await runtime.activate('broken');
  assert.equal(runtime.render({}), false);
  assert.equal(runtime.activeId, null);
  assert.equal(disposed, true);
  assert.deepEqual(errors, [['boom', 'broken', 'render']]);
});

test('carousel eligibility is catalog-driven', () => {
  const runtime = createVisualizationRuntime({
    definitions: [
      { id: 'orbit', label: 'Orbit', create: () => ({ render() {} }) },
      { id: 'trace', label: 'Trace', create: () => ({ render() {} }), carouselEligible: ({ hasCamera }) => hasCamera },
    ],
  });
  assert.deepEqual(runtime.eligible({ hasCamera: false }).map(({ id }) => id), ['orbit']);
  assert.deepEqual(runtime.eligible({ hasCamera: true }).map(({ id }) => id), ['orbit', 'trace']);
});

test('a failed preparation preserves the current activation', async () => {
  let renders = 0;
  const runtime = createVisualizationRuntime({
    definitions: [
      { id: 'orbit', label: 'Orbit', create: () => ({ render: () => { renders += 1; } }) },
      { id: 'trace', label: 'Trace', create: () => ({ render() {} }) },
    ],
    beforeActivate: async ({ nextDefinition }) => {
      if (nextDefinition.id === 'trace') throw new Error('camera denied');
    },
  });
  await runtime.activate('orbit');
  assert.equal(await runtime.activate('trace'), false);
  assert.equal(runtime.activeId, 'orbit');
  assert.equal(runtime.render({}), true);
  assert.equal(renders, 1);
});
