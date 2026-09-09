export function createSpectrumHistory({
  columns,
  rows,
  minFrequency = 45,
  maxFrequency = 14000,
  responseCurve = 0.82,
  lowGain = 0.68,
  highGain = 1.2,
}) {
  if (!Number.isInteger(columns) || columns < 2) throw new Error('Spectrum history needs at least two columns.');
  if (!Number.isInteger(rows) || rows < 1) throw new Error('Spectrum history needs at least one row.');

  const history = [];

  function writeLiveRow(row, audioFrame) {
    const upperFrequency = Math.min(maxFrequency, audioFrame.sampleRate / 2);
    const hertzPerBin = audioFrame.sampleRate / audioFrame.fftSize;
    for (let column = 0; column < columns; column += 1) {
      const position = column / (columns - 1);
      const frequency = minFrequency * Math.pow(upperFrequency / minFrequency, position);
      const bin = Math.min(audioFrame.spectrum.length - 1, Math.round(frequency / hertzPerBin));
      const gain = lowGain + position * (highGain - lowGain);
      row[column] = Math.pow(audioFrame.spectrum[bin] / 255, responseCurve) * gain;
    }
  }

  function writeDemoRow(row, frameIndex) {
    for (let column = 0; column < columns; column += 1) {
      const position = column / (columns - 1);
      row[column] = (
        Math.max(0, Math.sin(column * .29 + frameIndex * .03)) * .13
        + Math.max(0, Math.sin(column * .11 - frameIndex * .018)) * .06
      ) * (.8 + position * .2);
    }
  }

  return {
    advance(audioFrame) {
      const row = history.length === rows ? history.pop() : new Float32Array(columns);
      if (audioFrame.isLive) writeLiveRow(row, audioFrame);
      else writeDemoRow(row, audioFrame.index);
      history.unshift(row);
      return history;
    },
    get length() { return history.length; },
  };
}
