export const validAudioBase64 = (size = 192, byte = 65) => {
  // Structurally valid as WAV and includes MPEG frame headers so callers can
  // exercise either supported MIME without weakening production validation.
  const length = Math.max(192, size);
  const buffer = Buffer.alloc(length, byte);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(length - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(length - 44, 40);
  buffer.set([0xff, 0xe3, 0x18, 0x00], 44);
  buffer.set([0xff, 0xe3, 0x18, 0x00], 116);
  return buffer.toString('base64');
};
