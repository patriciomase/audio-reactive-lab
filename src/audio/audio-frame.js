function average(data, from, to) {
  let sum = 0;
  const end = Math.min(to, data.length);
  for (let index = from; index < end; index += 1) sum += data[index];
  return sum / Math.max(1, end - from) / 255;
}

export function createAudioFrameSampler() {
  let spectrum = new Uint8Array(0);
  let waveform = new Uint8Array(0);

  return {
    sample({ analyser = null, sampleRate = 48000, sensitivity = 1, index = 0, time = 0 }) {
      const isLive = Boolean(analyser);
      if (isLive) {
        if (spectrum.length !== analyser.frequencyBinCount) spectrum = new Uint8Array(analyser.frequencyBinCount);
        if (waveform.length !== analyser.fftSize) waveform = new Uint8Array(analyser.fftSize);
        analyser.getByteFrequencyData(spectrum);
        analyser.getByteTimeDomainData(waveform);
      }

      const bands = isLive
        ? {
            low: average(spectrum, 1, 12) * sensitivity,
            mid: average(spectrum, 12, 80) * sensitivity,
            high: average(spectrum, 80, 240) * sensitivity,
          }
        : {
            low: 0.16 + Math.sin(index * 0.018) * 0.08,
            mid: 0.12 + Math.sin(index * 0.027 + 2) * 0.06,
            high: 0.08 + Math.sin(index * 0.043 + 4) * 0.04,
          };
      bands.level = isLive ? (bands.low + bands.mid + bands.high) / 3 : 0.14;

      return {
        index,
        time,
        isLive,
        spectrum,
        waveform,
        sampleRate,
        fftSize: analyser?.fftSize ?? 2048,
        bands,
      };
    },
  };
}
