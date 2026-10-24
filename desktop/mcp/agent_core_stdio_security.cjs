'use strict';

const fs = require('node:fs');
const { TextDecoder } = require('node:util');

const LIMITS = Object.freeze({
  lineChars: 5000000, lineBytes: 8 * 1024 * 1024,
  activeRequests: 4, queuedRequests: 16, queuedBytes: 16 * 1024 * 1024,
  responseBytes: 16 * 1024 * 1024, outputBytes: 32 * 1024 * 1024,
  jobs: 256, jobBytes: 8 * 1024 * 1024, totalJobBytes: 32 * 1024 * 1024,
  jobTtlMs: 60 * 60 * 1000, planSteps: 64, directiveChars: 8000,
  diagnostics: 100, diagnosticChars: 512, auditBytes: 1024 * 1024,
  auditFiles: 3, configBytes: 1024 * 1024, configValues: 10000, configDepth: 16
});

function utf8Decoder() { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }); }

// Startup configuration is also an input boundary. Size checks precede reads,
// regular-file checks reject devices/pipes, and the extra byte detects growth.
// Never surface JSON parser messages: they can contain configuration contents.
function readConfigurationJson(filePath, limits = LIMITS) {
  let fd;
  try {
    fd = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size > limits.configBytes) throw new Error();
    const bytes = Buffer.alloc(before.size + 1); let used = 0;
    while (used < bytes.length) {
      const count = fs.readSync(fd, bytes, used, bytes.length - used, used);
      if (!count) break;
      used += count;
    }
    const after = fs.fstatSync(fd);
    if (used !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error();
    const value = JSON.parse(utf8Decoder().decode(bytes.subarray(0, used)));
    const stack = [[value, 0]]; let count = 1;
    while (stack.length) {
      const [item, depth] = stack.pop();
      if (depth > limits.configDepth) throw new Error();
      if (item && typeof item === 'object') for (const key of Object.keys(item)) {
        if (++count > limits.configValues) throw new Error();
        stack.push([item[key], depth + 1]);
      }
    }
    return value;
  } catch (_) {
    const error = new Error('Configuration must be a bounded regular UTF-8 JSON file within the local structure limits.');
    error.code = 'ALLOFLOW_CONFIG_INVALID'; throw error;
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}

// Byte accounting includes the complete stored record, not just its result.
// Lazy expiry runs on every access; the unref'ed sweep releases idle records too.
class BoundedJobs {
  constructor(limits = LIMITS, now = Date.now) { this.limits = limits; this.now = now; this.records = new Map(); this.bytes = 0; }
  delete(id) { const entry = this.records.get(id); if (entry) { this.bytes -= entry.bytes; this.records.delete(id); } }
  sweep() { const now = this.now(); for (const [id, entry] of this.records) if (entry.expires <= now) this.delete(id); }
  get(id) { this.sweep(); return this.records.get(id)?.record; }
  prepare(record) {
    const bytes = Buffer.byteLength(JSON.stringify(record), 'utf8');
    if (bytes > this.limits.jobBytes || bytes > this.limits.totalJobBytes) {
      const error = new Error('Job result exceeds the local storage limit.'); error.rpcCode = -32602; throw error;
    }
    return () => {
      this.sweep(); this.delete(record.job.jobId);
      while (this.records.size >= this.limits.jobs || this.bytes + bytes > this.limits.totalJobBytes) this.delete(this.records.keys().next().value);
      this.records.set(record.job.jobId, { record, bytes, expires: this.now() + this.limits.jobTtlMs }); this.bytes += bytes;
    };
  }
}

// At most one response is handed to the writable stream at a time. Callbacks
// release accounting only after that write flushes, so a slow host cannot build
// an unbounded stream buffer. Input pauses immediately when write() says so.
class BoundedOutput {
  constructor(stream, { limits = LIMITS, pressure = () => {}, fatal = () => {} } = {}) {
    this.stream = stream; this.limits = limits; this.pressure = pressure; this.fatal = fatal;
    this.queue = []; this.bytes = 0; this.writing = false; this.blocked = false; this.closed = false;
    stream.on('error', () => this.fail());
    stream.on('drain', () => { this.blocked = false; this.pressure(false); this.flush(); });
  }
  fail() { if (this.closed) return; this.closed = true; this.queue.length = 0; this.bytes = 0; this.fatal(); }
  send(message) {
    if (this.closed) return;
    let line = JSON.stringify(message) + '\n';
    let bytes = Buffer.byteLength(line, 'utf8');
    if (bytes > this.limits.responseBytes) {
      line = JSON.stringify({ jsonrpc: '2.0', id: message.id ?? null, error: { code: -32005, message: 'Response exceeds the local transport limit.' } }) + '\n';
      bytes = Buffer.byteLength(line, 'utf8');
    }
    if (this.bytes + bytes > this.limits.outputBytes) { this.fail(); return; }
    this.queue.push({ line, bytes }); this.bytes += bytes; this.flush();
  }
  flush() {
    if (this.closed || this.writing || this.blocked || !this.queue.length) return;
    const item = this.queue.shift(); this.writing = true;
    const accepted = this.stream.write(item.line, () => {
      if (this.closed) return;
      this.bytes -= item.bytes; this.writing = false; this.flush(); this.pressure(this.blocked);
    });
    if (!accepted) { this.blocked = true; this.pressure(true); }
  }
  get idle() { return !this.writing && !this.queue.length; }
}

// Consume buffers rather than readline's unbounded accumulated string. Oversize
// input is discarded until newline, with one error per frame, even without EOF.
// Queue saturation retains only the unconsumed tail of one bounded stream chunk.
class BoundedInput {
  constructor(stream, { limits = LIMITS, dispatch, oversized, malformed = () => {}, idle = () => {}, failure = () => {} }) {
    this.stream = stream; this.limits = limits; this.dispatch = dispatch; this.oversized = oversized; this.malformed = malformed; this.idle = idle; this.failure = failure;
    this.queue = []; this.queuedBytes = 0; this.active = 0; this.frame = ''; this.frameBytes = 0;
    this.decoder = utf8Decoder(); this.discarding = false; this.tail = null; this.outputBlocked = false; this.ended = false; this.pumping = false; this.closed = false;
    stream.on('data', chunk => { this.tail = this.tail ? Buffer.concat([this.tail, chunk]) : chunk; this.pump(); });
    stream.on('end', () => { this.ended = true; this.pump(); });
    stream.on('error', failure);
  }
  setPressure(blocked) { this.outputBlocked = blocked; this.pump(); }
  close() { this.closed = true; this.queue.length = 0; this.queuedBytes = 0; this.frame = ''; this.tail = null; this.stream.destroy(); }
  get saturated() {
    return this.outputBlocked || this.queue.length >= this.limits.queuedRequests || this.queuedBytes > this.limits.queuedBytes - this.limits.lineBytes;
  }
  enqueue(line, bytes) { this.queue.push({ line, bytes }); this.queuedBytes += bytes; this.run(); }
  run() {
    if (this.closed) return;
    while (!this.outputBlocked && this.active < this.limits.activeRequests && this.queue.length) {
      const item = this.queue.shift(); this.queuedBytes -= item.bytes; this.active++;
      Promise.resolve().then(() => this.dispatch(item.line)).catch(this.failure).finally(() => { this.active--; this.run(); this.pump(); });
    }
  }
  finishFrame() {
    if (!this.discarding) {
      try { this.frame += this.decoder.decode(); }
      catch (_) { this.discarding = true; this.malformed(); }
      if (!this.discarding) {
        if (this.frame.length > this.limits.lineChars) this.oversized();
        else if (this.frame.trim()) this.enqueue(this.frame, this.frameBytes);
      }
    }
    this.frame = ''; this.frameBytes = 0; this.discarding = false; this.decoder = utf8Decoder();
  }
  pump() {
    if (this.pumping || this.closed) return; this.pumping = true;
    try {
      while (this.tail?.length && !this.saturated) {
        const end = this.tail.indexOf(10);
        const piece = end < 0 ? this.tail : this.tail.subarray(0, end);
        if (!this.discarding) {
          this.frameBytes += piece.length;
          if (this.frameBytes > this.limits.lineBytes) { this.discarding = true; this.frame = ''; this.oversized(); }
          else {
            try { this.frame += this.decoder.decode(piece, { stream: true }); }
            catch (_) { this.discarding = true; this.frame = ''; this.malformed(); }
            if (!this.discarding && this.frame.length > this.limits.lineChars) { this.discarding = true; this.frame = ''; this.oversized(); }
          }
        }
        this.tail = end < 0 ? null : this.tail.subarray(end + 1);
        if (end >= 0) this.finishFrame();
      }
      if (this.saturated) this.stream.pause(); else this.stream.resume();
      if (this.ended && !this.tail?.length && !this.saturated && (this.frameBytes || this.discarding)) this.finishFrame();
      this.run();
      if (this.ended && !this.tail?.length && !this.frameBytes && !this.active && !this.queue.length) this.idle();
    } finally { this.pumping = false; }
  }
}

function boundedDiagnostics(items, limits = LIMITS) {
  if (!Array.isArray(items)) return [];
  const result = items.slice(0, limits.diagnostics).map(item => {
    if (!item || typeof item !== 'object') return String(item).slice(0, limits.diagnosticChars);
    return Object.fromEntries(Object.entries(item).slice(0, 8).map(([key, value]) => [key.slice(0, 64), typeof value === 'string' ? value.slice(0, limits.diagnosticChars) : (typeof value === 'number' || typeof value === 'boolean' ? value : null)]));
  });
  if (items.length > limits.diagnostics) result.push({ code: 'diagnostics-truncated', message: 'Additional diagnostics omitted; correct these errors and validate again.' });
  return result;
}

module.exports = { LIMITS, BoundedJobs, BoundedInput, BoundedOutput, boundedDiagnostics, readConfigurationJson };
