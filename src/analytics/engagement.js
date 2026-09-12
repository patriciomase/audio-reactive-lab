export function createEngagementTracker({ analytics, now = () => performance.now() }) {
  let currentVisualization = null;
  let segmentStartedAt = null;
  let visible = true;
  let microphoneEnabled = false;
  let interactionRecorded = false;

  function audience() {
    if (microphoneEnabled) return 'microphone-user';
    if (interactionRecorded) return 'interactive';
    return 'unconfirmed';
  }

  function startSegment() {
    segmentStartedAt = visible && currentVisualization ? now() : null;
  }

  function flushDuration(reason) {
    if (!currentVisualization || segmentStartedAt === null) return;
    const seconds = Math.max(0, (now() - segmentStartedAt) / 1000);
    segmentStartedAt = null;
    if (seconds < 1) return;
    analytics.track('visualization-duration', {
      visualization: currentVisualization,
      seconds: Math.round(seconds * 10) / 10,
      microphoneEnabled,
      audience: audience(),
      reason,
    });
  }

  return {
    visualizationChanged(visualization, reason = 'unknown') {
      flushDuration('visualization-changed');
      currentVisualization = visualization;
      analytics.track('visualization-view', {
        visualization,
        reason,
        microphoneEnabled,
        audience: audience(),
      });
      startSegment();
    },
    recordInteraction(interaction) {
      if (interactionRecorded) return;
      flushDuration('human-engaged');
      interactionRecorded = true;
      analytics.identify({ audience: 'interactive' });
      analytics.track('human-engaged', { interaction });
      startSegment();
    },
    setMicrophoneEnabled(enabled) {
      const next = Boolean(enabled);
      if (next === microphoneEnabled) return;
      flushDuration(next ? 'microphone-enabled' : 'microphone-disabled');
      microphoneEnabled = next;
      if (microphoneEnabled) {
        analytics.identify({ audience: 'microphone-user', microphoneEnabled: true });
        analytics.track('microphone-enabled', {
          visualization: currentVisualization,
          audience: 'microphone-user',
        });
      }
      startSegment();
    },
    setVisible(nextVisible) {
      if (Boolean(nextVisible) === visible) return;
      if (!nextVisible) flushDuration('page-hidden');
      visible = Boolean(nextVisible);
      if (visible) startSegment();
    },
    checkpoint() {
      flushDuration('heartbeat');
      startSegment();
    },
    finish() {
      flushDuration('page-exit');
      currentVisualization = null;
    },
  };
}
