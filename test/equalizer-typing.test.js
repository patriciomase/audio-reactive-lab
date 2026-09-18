import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEqualizerKey,
  createEqualizerTypingAnimation,
  EQUALIZER_DEFAULT_TEXT,
  EQUALIZER_TYPING_PROMPT,
} from '../src/visualizations/equalizer-typing.js';

test('Equalizer typing demo deletes, types its prompt, then restores the title', () => {
  const animation = createEqualizerTypingAnimation();
  assert.equal(animation.textAt(1000), EQUALIZER_DEFAULT_TEXT);
  assert.equal(animation.textAt(3700).length < EQUALIZER_DEFAULT_TEXT.length, true);
  assert.equal(animation.textAt(6200), EQUALIZER_TYPING_PROMPT);
  assert.equal(animation.textAt(11030), EQUALIZER_DEFAULT_TEXT);
});

test('typing on the Equalizer replaces the demo and then appends normally', () => {
  const key = (value, extras = {}) => ({ key: value, metaKey: false, ctrlKey: false, altKey: false, ...extras });
  assert.equal(applyEqualizerKey(EQUALIZER_DEFAULT_TEXT, key('h'), { demoActive: true }), 'H');
  assert.equal(applyEqualizerKey('H', key('i')), 'HI');
  assert.equal(applyEqualizerKey('HI', key('Backspace')), 'H');
  assert.equal(applyEqualizerKey('HI', key('f', { metaKey: true })), null);
});
