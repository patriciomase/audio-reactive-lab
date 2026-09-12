import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngagementTracker } from '../src/analytics/engagement.js';

function harness() {
  let time = 0;
  const events = [];
  const identities = [];
  const tracker = createEngagementTracker({
    now: () => time,
    analytics: {
      track: (name, data) => events.push({ name, data }),
      identify: (data) => identities.push(data),
    },
  });
  return { tracker, events, identities, advance: (milliseconds) => { time += milliseconds; } };
}

test('records visualization views and visible duration by mode', () => {
  const { tracker, events, advance } = harness();
  tracker.visualizationChanged('orbit', 'initial');
  advance(4250);
  tracker.visualizationChanged('prism', 'user');

  assert.deepEqual(events, [
    { name: 'visualization-view', data: { visualization: 'orbit', reason: 'initial', microphoneEnabled: false, audience: 'unconfirmed' } },
    { name: 'visualization-duration', data: { visualization: 'orbit', seconds: 4.3, microphoneEnabled: false, audience: 'unconfirmed', reason: 'visualization-changed' } },
    { name: 'visualization-view', data: { visualization: 'prism', reason: 'user', microphoneEnabled: false, audience: 'unconfirmed' } },
  ]);
});

test('microphone success upgrades the session and splits confirmed-human time', () => {
  const { tracker, events, identities, advance } = harness();
  tracker.visualizationChanged('pulse', 'initial');
  advance(2000);
  tracker.setMicrophoneEnabled(true);
  advance(5100);
  tracker.finish();

  assert.deepEqual(identities, [{ audience: 'microphone-user', microphoneEnabled: true }]);
  assert.deepEqual(events.filter(({ name }) => name === 'visualization-duration').map(({ data }) => [data.seconds, data.audience]), [
    [2, 'unconfirmed'],
    [5.1, 'microphone-user'],
  ]);
  assert.equal(events.some(({ name, data }) => name === 'microphone-enabled' && data.visualization === 'pulse'), true);
});

test('hidden time is excluded and first interaction is recorded once', () => {
  const { tracker, events, identities, advance } = harness();
  tracker.visualizationChanged('terrain', 'initial');
  tracker.recordInteraction('pointer');
  tracker.recordInteraction('keyboard');
  advance(1500);
  tracker.setVisible(false);
  advance(10000);
  tracker.setVisible(true);
  advance(2500);
  tracker.finish();

  assert.deepEqual(identities, [{ audience: 'interactive' }]);
  assert.equal(events.filter(({ name }) => name === 'human-engaged').length, 1);
  assert.deepEqual(events.filter(({ name }) => name === 'visualization-duration').map(({ data }) => data.seconds), [1.5, 2.5]);
});
