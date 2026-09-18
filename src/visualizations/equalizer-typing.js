export const EQUALIZER_DEFAULT_TEXT = 'FATBEATS.ORG';
export const EQUALIZER_TYPING_PROMPT = 'TYPE HERE';

const HOLD_MS = 2600;
const DELETE_MS = 95;
const TYPE_MS = 135;

function transitionText(from, to, elapsed) {
  const deleteDuration = from.length * DELETE_MS;
  if (elapsed < deleteDuration) {
    return from.slice(0, Math.max(0, from.length - Math.floor(elapsed / DELETE_MS) - 1));
  }
  const typed = Math.floor((elapsed - deleteDuration) / TYPE_MS) + 1;
  return to.slice(0, Math.min(to.length, typed));
}

export function createEqualizerTypingAnimation() {
  let startedAt = null;
  const toPromptDuration = EQUALIZER_DEFAULT_TEXT.length * DELETE_MS + EQUALIZER_TYPING_PROMPT.length * TYPE_MS;
  const toDefaultDuration = EQUALIZER_TYPING_PROMPT.length * DELETE_MS + EQUALIZER_DEFAULT_TEXT.length * TYPE_MS;
  const cycleDuration = HOLD_MS + toPromptDuration + HOLD_MS + toDefaultDuration;

  return {
    textAt(time) {
      if (startedAt === null) startedAt = time;
      let elapsed = Math.max(0, time - startedAt) % cycleDuration;
      if (elapsed < HOLD_MS) return EQUALIZER_DEFAULT_TEXT;
      elapsed -= HOLD_MS;
      if (elapsed < toPromptDuration) return transitionText(EQUALIZER_DEFAULT_TEXT, EQUALIZER_TYPING_PROMPT, elapsed);
      elapsed -= toPromptDuration;
      if (elapsed < HOLD_MS) return EQUALIZER_TYPING_PROMPT;
      elapsed -= HOLD_MS;
      return transitionText(EQUALIZER_TYPING_PROMPT, EQUALIZER_DEFAULT_TEXT, elapsed);
    },
    reset() { startedAt = null; },
  };
}

export function applyEqualizerKey(text, event, { demoActive = false, maxLength = 24 } = {}) {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (event.key === 'Backspace') return text.slice(0, -1);
  if (event.key.length !== 1 || text.length >= maxLength) return null;
  const base = demoActive ? '' : text;
  return `${base}${event.key}`.slice(0, maxLength).toUpperCase();
}
