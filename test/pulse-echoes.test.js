import test from 'node:test';
import assert from 'node:assert/strict';
import { createPulseEchoes } from '../src/visualizations/pulse-echoes.js';

function frame(time) {
  return { time, x: 50, y: 50, radius: 10, hue: 220, width: 100, height: 100 };
}

test('emits a translucent pulse copy after four to eight seconds', () => {
  const echoes = createPulseEchoes({ random: () => 0 });
  echoes.update(frame(0));
  echoes.update(frame(3999));
  assert.equal(echoes.items.length, 0);

  echoes.update(frame(4000));
  assert.equal(echoes.items.length, 1);
  assert.equal(echoes.items[0].alpha, .3);
});

test('moves echoes along a constant straight trajectory', () => {
  const values = [0, .5, .25, .5, 0];
  const echoes = createPulseEchoes({ random: () => values.shift() ?? 0 });
  echoes.update(frame(0));
  echoes.update(frame(4000));
  const emitted = echoes.items[0];
  const start = { x: emitted.x, y: emitted.y };

  echoes.update(frame(4100));
  const first = { x: emitted.x - start.x, y: emitted.y - start.y };
  echoes.update(frame(4200));
  const second = { x: emitted.x - start.x, y: emitted.y - start.y };

  assert.ok(Math.abs(first.x) < 1e-9);
  assert.ok(first.y > 0);
  assert.ok(Math.abs(second.x) < 1e-9);
  assert.ok(Math.abs(second.y - first.y * 2) < 1e-9);
});

test('removes echoes after the full circle leaves the viewport', () => {
  const echoes = createPulseEchoes({ random: () => 0 });
  echoes.update(frame(0));
  echoes.update(frame(4000));
  for (let time = 4100; time <= 18000; time += 100) echoes.update(frame(time));

  assert.ok(echoes.items.length <= 3);
  assert.ok(echoes.items.every((echo) => echo.x + echo.radius >= 0 && echo.x - echo.radius <= 100));
});
