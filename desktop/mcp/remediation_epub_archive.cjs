'use strict';
// This is a deliberately narrow reader for the connector's generated EPUBs. Validate
// every byte before invoking EPUBCheck or Ace; never repair ambiguous ZIP structures.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Readable } = require('stream');
const { TextDecoder } = require('util');
const LIMITS = Object.freeze({ archiveBytes: 256 * 1024 * 1024, entries: 4096,
  entryBytes: 128 * 1024 * 1024, inflatedBytes: 512 * 1024 * 1024,
  ratio: 200, ratioFloorBytes: 1024 * 1024, nameBytes: 1024, depth: 32, timeoutMs: 60000 });
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function reject(reason) { throw Object.assign(Error('EPUB archive rejected: ' + reason), { code: 'ALLOFLOW_EPUB_ARCHIVE_UNSAFE' }); }
function abort(signal, deadline) {
  if (signal?.aborted) throw Object.assign(Error('EPUB validation cancelled'), { code: 'ALLOFLOW_VALIDATION_CANCELLED' });
  if (Date.now() > deadline) reject('preflight time limit exceeded');
}
function nameOf(bytes, flags) {
  let name;
  try {
    if (!(flags & 0x800) && bytes.some(b => b > 127)) reject('ambiguous filename encoding');
    name = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) { reject('invalid filename encoding'); }
  if (!name || bytes.length > LIMITS.nameBytes || name !== name.normalize('NFC') || /[\x00-\x1f\x7f<>:"\\|?*%]/.test(name) || name.startsWith('/')) reject('unsafe or noncanonical filename');
  const directory = name.endsWith('/'), segments = (directory ? name.slice(0, -1) : name).split('/');
  if (segments.length > LIMITS.depth || segments.some(s => !s || s === '.' || s === '..' || /[. ]$/.test(s) || /^(?:con|prn|aux|nul|clock\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(s))) reject('unsafe or noncanonical path component');
  return { name, directory, key: segments.join('/').toLowerCase(), segments };
}
function extraFields(bytes, nameBytes) {
  for (let p = 0; p < bytes.length;) {
    if (p + 4 > bytes.length) reject('truncated extra field');
    const id = bytes.readUInt16LE(p), len = bytes.readUInt16LE(p + 2); p += 4;
    if (p + len > bytes.length) reject('truncated extra field');
    // Reject link metadata, ZIP64, encryption, path overrides, and unknown extensions.
    // JSZip's Unicode path extra is accepted only when it repeats the canonical name.
    if (id === 0x7075) {
      if (len < 5 || bytes[p] !== 1 || !bytes.subarray(p + 5, p + len).equals(nameBytes)) reject('conflicting Unicode path extra field');
    } else if (![0x5455, 0x7875].includes(id)) reject('unsupported ZIP extra field');
    p += len;
  }
}
function parse(bytes) {
  if (bytes.length < 22 || bytes.length > LIMITS.archiveBytes) reject('archive size is outside the allowed range');
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (bytes.readUInt32LE(p) === 0x06054b50 && p + 22 + bytes.readUInt16LE(p + 20) === bytes.length) { end = p; break; }
  }
  if (end < 0) reject('missing or noncanonical central directory');
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16);
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== count || count === 0xffff || size === 0xffffffff || start === 0xffffffff) reject('multipart and ZIP64 archives are unsupported');
  if (!count || count > LIMITS.entries || start + size !== end) reject('invalid or excessive directory entries');
  const entries = [], names = new Map(); let p = start, total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > end || bytes.readUInt32LE(p) !== 0x02014b50) reject('malformed central directory');
    const flags = bytes.readUInt16LE(p + 8), method = bytes.readUInt16LE(p + 10), crc = bytes.readUInt32LE(p + 16);
    const compressed = bytes.readUInt32LE(p + 20), expanded = bytes.readUInt32LE(p + 24), nameLen = bytes.readUInt16LE(p + 28);
    const extraLen = bytes.readUInt16LE(p + 30), commentLen = bytes.readUInt16LE(p + 32), attributes = bytes.readUInt32LE(p + 38), offset = bytes.readUInt32LE(p + 42);
    if (p + 46 + nameLen + extraLen + commentLen > end || bytes.readUInt16LE(p + 34)) reject('truncated or multipart entry');
    if ((flags & ~0x806) || ![0, 8].includes(method)) reject('encryption, streaming descriptors, or compression method is unsupported');
    const nameBytes = bytes.subarray(p + 46, p + 46 + nameLen), item = nameOf(nameBytes, flags);
    extraFields(bytes.subarray(p + 46 + nameLen, p + 46 + nameLen + extraLen), nameBytes);
    const kind = (attributes >>> 16) & 0xf000;
    if ((kind && kind !== 0x8000 && kind !== 0x4000) || (kind === 0x4000 && !item.directory) || (kind === 0x8000 && item.directory) || ((attributes & 0x10) && !item.directory)) reject('links, special files, or conflicting directory attributes');
    if (names.has(item.key)) reject('duplicate or case-colliding filename');
    names.set(item.key, item.directory);
    total += expanded;
    if (expanded > LIMITS.entryBytes || total > LIMITS.inflatedBytes || (expanded > LIMITS.ratioFloorBytes && expanded > Math.max(1, compressed) * LIMITS.ratio)) reject('inflated size or compression ratio limit exceeded');
    if (item.directory && expanded !== 0) reject('directory entry contains data');
    if (offset + 30 > start || bytes.readUInt32LE(offset) !== 0x04034b50) reject('invalid local header offset');
    const localNameLen = bytes.readUInt16LE(offset + 26), localExtraLen = bytes.readUInt16LE(offset + 28), dataStart = offset + 30 + localNameLen + localExtraLen, dataEnd = dataStart + compressed;
    if (dataEnd > start || bytes.readUInt16LE(offset + 6) !== flags || bytes.readUInt16LE(offset + 8) !== method || bytes.readUInt32LE(offset + 14) !== crc || bytes.readUInt32LE(offset + 18) !== compressed || bytes.readUInt32LE(offset + 22) !== expanded || !bytes.subarray(offset + 30, offset + 30 + localNameLen).equals(nameBytes)) reject('central and local entry metadata disagree');
    extraFields(bytes.subarray(offset + 30 + localNameLen, dataStart), nameBytes);
    entries.push({ ...item, method, crc, compressed, expanded, offset, dataStart, dataEnd });
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (p !== end) reject('unaccounted central directory data');
  for (const item of entries) {
    for (let i = 1; i < item.segments.length; i++) if (names.get(item.segments.slice(0, i).join('/').toLowerCase()) === false) reject('file and directory path conflict');
  }
  let next = 0;
  for (const item of entries.slice().sort((a, b) => a.offset - b.offset)) {
    if (item.offset !== next) reject('overlapping entries or unaccounted archive data');
    next = item.dataEnd;
  }
  if (next !== start) reject('unaccounted local archive data');
  return { entries, total };
}
function readBounded(filePath) {
  if (!fs.lstatSync(filePath).isFile()) reject('input must be a regular file');
  const fd = fs.openSync(filePath, 'r');
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size < 22 || before.size > LIMITS.archiveBytes) reject('archive size is outside the allowed range');
    const bytes = Buffer.alloc(before.size); let read = 0;
    while (read < bytes.length) {
      const n = fs.readSync(fd, bytes, read, Math.min(65536, bytes.length - read), read);
      if (!n) reject('input changed while reading'); read += n;
    }
    const after = fs.fstatSync(fd);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) reject('input changed while reading');
    return bytes;
  } finally { fs.closeSync(fd); }
}
async function visit(bytes, entries, options, write) {
  const deadline = Date.now() + LIMITS.timeoutMs; let total = 0;
  for (const item of entries) {
    abort(options.signal, deadline); let size = 0, crc = -1;
    const data = bytes.subarray(item.dataStart, item.dataEnd);
    async function* chunks() { for (let p = 0; p < data.length; p += 65536) yield data.subarray(p, p + 65536); }
    const input = Readable.from(chunks()), output = item.method === 8 ? input.pipe(zlib.createInflateRaw()) : input;
    const stop = () => output.destroy(Object.assign(Error('EPUB validation cancelled'), { code: 'ALLOFLOW_VALIDATION_CANCELLED' }));
    options.signal?.addEventListener('abort', stop, { once: true });
    try {
      for await (const chunk of output) {
        abort(options.signal, deadline); size += chunk.length; total += chunk.length;
        if (size > item.expanded || size > LIMITS.entryBytes || total > LIMITS.inflatedBytes) reject('actual inflated size exceeds metadata or limits');
        for (let i = 0; i < chunk.length; i++) crc = CRC[(crc ^ chunk[i]) & 255] ^ (crc >>> 8);
        if (write) write(item, chunk);
      }
      if (size !== item.expanded || ((crc ^ -1) >>> 0) !== item.crc || (item.method === 8 && output.bytesWritten !== item.compressed)) reject('entry checksum, size, or compressed stream mismatch');
    } catch (error) {
      if (error.code === 'ALLOFLOW_VALIDATION_CANCELLED' || error.code === 'ALLOFLOW_EPUB_ARCHIVE_UNSAFE') throw error;
      reject('invalid compressed data');
    } finally { input.destroy(); output.destroy(); options.signal?.removeEventListener('abort', stop); }
  }
}
async function inspect(filePath, options = {}) {
  abort(options.signal, Infinity);
  const bytes = readBounded(filePath), parsed = parse(bytes);
  await visit(bytes, parsed.entries, options);
  return { status: 'passed', entries: parsed.entries.length, archiveBytes: bytes.length, inflatedBytes: parsed.total, policy: 'alloflow-generated-epub-v1' };
}
function snapshot(filePath, destination) {
  // Read exactly the bounded file size; a racing producer cannot grow an unbounded
  // copy before preflight has a chance to inspect it.
  fs.writeFileSync(destination, readBounded(filePath), { flag: 'wx', mode: 0o600 });
}
async function extract(filePath, parent, options = {}) {
  abort(options.signal, Infinity);
  const bytes = readBounded(filePath), parsed = parse(bytes);
  // First verify all compressed streams, so corrupt input never reaches an extractor.
  await visit(bytes, parsed.entries, options);
  const root = fs.mkdtempSync(path.join(parent, 'epub-expanded-'));
  let handle = null, currentName = null;
  try {
    for (const item of parsed.entries) {
      const target = path.resolve(root, ...item.segments);
      if (!target.startsWith(root + path.sep)) reject('entry escaped the extraction root');
      fs.mkdirSync(item.directory ? target : path.dirname(target), { recursive: true, mode: 0o700 });
      if (!item.directory) fs.closeSync(fs.openSync(target, 'wx', 0o600));
    }
    await visit(bytes, parsed.entries, options, (item, chunk) => {
      if (item.name !== currentName) {
        if (handle !== null) fs.closeSync(handle);
        handle = fs.openSync(path.join(root, ...item.segments), fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0)); currentName = item.name;
      }
      let written = 0;
      while (written < chunk.length) written += fs.writeSync(handle, chunk, written, chunk.length - written);
    });
    return root;
  } catch (error) {
    if (handle !== null) fs.closeSync(handle); handle = null;
    fs.rmSync(root, { recursive: true, force: true }); throw error;
  } finally { if (handle !== null) fs.closeSync(handle); }
}
module.exports = { inspect, extract, snapshot, LIMITS };
