export const microphoneConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

export async function createAudioSession({ mediaDevices, AudioContextClass }) {
  if (!mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable in this browser.');
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');

  const context = new AudioContextClass();
  let stream;
  try {
    // Resume during the original tap. Mobile browsers can lose user activation
    // while their asynchronous microphone permission prompt is open.
    const initialResume = context.state === 'suspended' ? context.resume() : Promise.resolve();
    const streamRequest = mediaDevices.getUserMedia(microphoneConstraints);
    [stream] = await Promise.all([streamRequest, initialResume]);
    if (context.state === 'suspended') await context.resume();

    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = .78;
    source.connect(analyser);
    // Keep the analysis graph active on mobile Chromium without playing the
    // microphone through the speakers and creating acoustic feedback.
    const silentOutput = context.createGain();
    silentOutput.gain.value = 0;
    analyser.connect(silentOutput);
    silentOutput.connect(context.destination);
    return { context, stream, analyser, source, silentOutput, hasCamera: false };
  } catch (cause) {
    stream?.getTracks().forEach((track) => track.stop());
    await context.close().catch(() => {});
    throw cause;
  }
}
