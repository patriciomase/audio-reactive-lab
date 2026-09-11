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
    resume() { calls.push('resume'); this.state = 'running'; return Promise.resolve(); }
    createMediaStreamSource(value) {
      assert.equal(value, stream);
      return { connect: () => calls.push('connect') };
    }
    createAnalyser() { return {}; }
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
  assert.deepEqual(calls, ['resume', 'permission', 'connect']);
});

test('retries resume after permission when a mobile browser remains suspended', async () => {
  let resumes = 0;
  class AudioContextStub {
    state = 'suspended';
    resume() {
      resumes += 1;
      if (resumes === 2) this.state = 'running';
      return Promise.resolve();
    }
    createMediaStreamSource() { return { connect() {} }; }
    createAnalyser() { return {}; }
  }

  const session = await createAudioSession({
    mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) },
    AudioContextClass: AudioContextStub,
  });

  assert.equal(resumes, 2);
  assert.equal(session.context.state, 'running');
});
