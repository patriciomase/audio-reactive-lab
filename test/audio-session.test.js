import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioSession, microphoneConstraints } from '../src/audio/audio-session.js';

test('resumes Web Audio during the initiating gesture before microphone permission resolves', async () => {
  const calls = [];
  let grantPermission;
  const stream = { getTracks: () => [] };
  class AudioContextStub {
    state = 'suspended';
    sampleRate = 48000;
    destination = { id: 'destination' };
    resume() { calls.push('resume'); this.state = 'running'; return Promise.resolve(); }
    createMediaStreamSource(value) {
      assert.equal(value, stream);
      return { connect: () => calls.push('source → analyser') };
    }
    createAnalyser() { return { connect: () => calls.push('analyser → silent output') }; }
    createGain() { return { gain: {}, connect: () => calls.push('silent output → destination') }; }
  }
  const mediaDevices = {
    getUserMedia(constraints) {
      calls.push('permission');
      assert.deepEqual(constraints, microphoneConstraints);
      return new Promise((resolve) => { grantPermission = () => resolve(stream); });
    },
  };

  const pendingSession = createAudioSession({ mediaDevices, AudioContextClass: AudioContextStub });
  assert.deepEqual(calls, ['resume', 'permission']);
  grantPermission();
  const session = await pendingSession;

  assert.equal(session.context.state, 'running');
  assert.equal(session.analyser.fftSize, 2048);
  assert.equal(session.analyser.smoothingTimeConstant, .78);
  assert.equal(session.silentOutput.gain.value, 0);
  assert.deepEqual(calls, ['resume', 'permission', 'source → analyser', 'analyser → silent output', 'silent output → destination']);
});

test('retries resume after permission when a mobile browser remains suspended', async () => {
  let resumes = 0;
  class AudioContextStub {
    state = 'suspended';
    destination = {};
    resume() {
      resumes += 1;
      if (resumes === 2) this.state = 'running';
      return Promise.resolve();
    }
    createMediaStreamSource() { return { connect() {} }; }
    createAnalyser() { return { connect() {} }; }
    createGain() { return { gain: {}, connect() {} }; }
  }

  const session = await createAudioSession({
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    AudioContextClass: AudioContextStub,
  });

  assert.equal(resumes, 2);
  assert.equal(session.context.state, 'running');
});
