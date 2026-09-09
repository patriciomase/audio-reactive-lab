import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioFrameSampler } from '../src/audio/audio-frame.js';

test('samples the analyser once and calculates normalized bands', () => {
  let frequencyReads = 0;
  let waveformReads = 0;
  const analyser = {
    frequencyBinCount: 256,
    fftSize: 512,
    getByteFrequencyData(target) {
      frequencyReads += 1;
      target.fill(255, 1, 12);
      target.fill(128, 12, 80);
      target.fill(64, 80, 240);
    },
    getByteTimeDomainData(target) {
      waveformReads += 1;
      target.fill(128);
    },
  };

  const frame = createAudioFrameSampler().sample({ analyser, sampleRate: 44100, sensitivity: 2, index: 7, time: 123 });

  assert.equal(frequencyReads, 1);
  assert.equal(waveformReads, 1);
  assert.equal(frame.isLive, true);
  assert.equal(frame.sampleRate, 44100);
  assert.equal(frame.fftSize, 512);
  assert.equal(frame.index, 7);
  assert.equal(frame.time, 123);
  assert.equal(frame.bands.low, 2);
  assert.ok(Math.abs(frame.bands.mid - 128 / 255 * 2) < 1e-10);
  assert.ok(Math.abs(frame.bands.high - 64 / 255 * 2) < 1e-10);
});

test('demo frames are deterministic and do not allocate new buffers', () => {
  const sampler = createAudioFrameSampler();
  const first = sampler.sample({ index: 42, time: 10 });
  const second = sampler.sample({ index: 42, time: 20 });

  assert.deepEqual(first.bands, second.bands);
  assert.equal(first.spectrum, second.spectrum);
  assert.equal(first.waveform, second.waveform);
  assert.equal(first.isLive, false);
});
