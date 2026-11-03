'use strict';

const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SESSION = /^[a-f0-9]{32}$/;
const REQUEST = /^[A-Za-z0-9_-]{8,96}$/;
class ImageProxyError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
const fail = (code, message, status) => { throw new ImageProxyError(code, message, status); };
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some((key) => !allowed.includes(key))) fail('invalid-request', 'Unsupported local image request.');
}
function decodeImage(value, output = false) {
  if (typeof value !== 'string' || value.length > MAX_JSON_BYTES) fail('invalid-image', 'The image is too large or invalid.');
  const raw = value.replace(/^data:image\/(?:png|jpeg|webp);base64,/, '');
  if (!raw || raw.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(raw)) fail('invalid-image', 'Use a PNG, JPEG or WebP image.');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== raw) fail('invalid-image', 'The image is too large or invalid.');
  const png = bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    && bytes.readUInt32BE(8) === 13 && bytes.toString('ascii', 12, 16) === 'IHDR';
  const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (output ? !png : !(png || jpeg || webp)) fail('invalid-image', 'The image format is invalid.');
  if (png) {
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (!width || !height || width * height > 4 * 1024 * 1024 || (output && (width > 1024 || height > 1024))) fail('invalid-image', 'The image dimensions are invalid.');
  }
  return raw;
}
function validateRequest(operation, payload) {
  if (!['generate', 'edit'].includes(operation)) fail('invalid-action', 'Unsupported image action.');
  keys(payload, ['sessionId', 'requestId', 'prompt', 'width', ...(operation === 'edit' ? ['image'] : [])]);
  if (typeof payload.sessionId !== 'string' || !SESSION.test(payload.sessionId)
    || typeof payload.requestId !== 'string' || !REQUEST.test(payload.requestId)) fail('invalid-request', 'Invalid image request identity.');
  if (typeof payload.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > 4000) fail('invalid-prompt', 'Use a prompt between 1 and 4,000 characters.');
  if (!Number.isInteger(payload.width) || payload.width < 64 || payload.width > 1024) fail('invalid-size', 'Choose an image size between 64 and 1024 pixels.');
  const size = Math.floor(payload.width / 32) * 32;
  const body = { model: 'sana-sprint', prompt: payload.prompt, size: `${size}x${size}`, n: 1, num_inference_steps: 2, response_format: 'b64_json' };
  if (operation === 'edit') { body.image = decodeImage(payload.image); body.strength = 0.75; }
  if (Buffer.byteLength(JSON.stringify(body)) > MAX_JSON_BYTES) fail('too-large', 'The image request is too large.', 413);
  return body;
}
async function boundedJson(response) {
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) fail('bad-response', 'The image service returned an invalid response.', 502);
  const reader = response.body?.getReader();
  if (!reader) fail('bad-response', 'The image service returned no image.', 502);
  let bytes = 0; const storage = Buffer.allocUnsafe(MAX_JSON_BYTES);
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      if (bytes + next.value.byteLength > MAX_JSON_BYTES) { await reader.cancel(); fail('too-large', 'The image service response was too large.', 502); }
      storage.set(next.value, bytes); bytes += next.value.byteLength;
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(storage.subarray(0, bytes).toString('utf8')); }
  catch (_) { fail('bad-response', 'The image service returned an invalid response.', 502); }
}
function createLocalImageProxy({ connect, fetch: send = globalThis.fetch, now = Date.now, timeoutMs = 300000 }) {
  if (typeof connect !== 'function' || typeof send !== 'function') throw new Error('Protected image adapters are required.');
  let sessionId = '', active = null, uncertain = false;
  let admissions = [];
  const cancelled = new Set(), seen = new Set();
  const status = () => ({ enabled: Boolean(sessionId), busy: Boolean(active), needsStop: uncertain });
  function setAccess(body) {
    keys(body, ['enabled', 'sessionId']);
    if (typeof body.enabled !== 'boolean' || (body.enabled && (typeof body.sessionId !== 'string' || !SESSION.test(body.sessionId)))) fail('invalid-session', 'Invalid image session.');
    const nextSession = body.enabled ? body.sessionId : '';
    if (nextSession === sessionId) return { enabled: Boolean(sessionId) };
    if (active) active.cancelled = true;
    sessionId = nextSession; cancelled.clear(); seen.clear();
    return { enabled: Boolean(sessionId) };
  }
  function cancel(body) {
    keys(body, ['sessionId', 'requestId']);
    if (typeof body.sessionId !== 'string' || !SESSION.test(body.sessionId)
      || typeof body.requestId !== 'string' || !REQUEST.test(body.requestId)) fail('invalid-request', 'Invalid cancellation request.');
    if (body.sessionId === sessionId) {
      cancelled.add(body.requestId);
      if (cancelled.size > 256) cancelled.delete(cancelled.values().next().value);
    }
    if (active?.sessionId === body.sessionId && active.requestId === body.requestId) active.cancelled = true;
    return { cancelled: true };
  }
  function confirmStopped() {
    uncertain = false;
    if (active) { active.cancelled = true; active.stopped = true; active.controller.abort(); }
  }
  async function request(operation, payload) {
    const body = validateRequest(operation, payload);
    if (!sessionId || payload.sessionId !== sessionId) fail('not-enabled', 'Enable SANA for this app session in Desktop first.', 403);
    if (cancelled.has(payload.requestId)) fail('cancelled', 'Image request cancelled.', 499);
    if (uncertain) fail('needs-stop', 'The previous image request could not be confirmed. Stop and restart local images before retrying.', 409);
    if (active) fail('image-busy', 'An image request is still running. Wait for it to finish.', 429);
    const time = now(); admissions = admissions.filter((stamp) => time - stamp < 60000);
    if (admissions.length >= 10) fail('rate-limit', 'Too many image requests. Wait a minute before retrying.', 429);
    if (seen.has(payload.requestId) || seen.size >= 256) fail('duplicate-request', 'This image request was already handled. Reconnect the app session if its request limit was reached.', 409);
    seen.add(payload.requestId);
    admissions.push(time);
    const job = { sessionId, requestId: payload.requestId, controller: new AbortController(), cancelled: false, stopped: false, sent: false, complete: false };
    active = job;
    const timer = setTimeout(() => job.controller.abort(), timeoutMs);
    try {
      const connection = await connect(operation);
      if (job.cancelled || job.controller.signal.aborted || job.sessionId !== sessionId) fail('cancelled', 'Image request cancelled.', 499);
      if (connection?.ready !== true || !/^[a-f0-9]{64}$/.test(connection.token || '') || (operation === 'edit' && connection.canEdit !== true)) fail('not-ready', 'Start the selected SANA service and check its status before generating.', 409);
      job.sent = true;
      const response = await send('http://127.0.0.1:7860/v1/images/' + (operation === 'edit' ? 'edits' : 'generations'), {
        method: 'POST', redirect: 'error', signal: job.controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + connection.token }, body: JSON.stringify(body),
      });
      if (!response.ok) {
        await response.body?.cancel(); job.complete = true;
        fail('service-error', response.status === 429 ? 'The image service is busy. Wait before retrying.' : 'The image service could not complete the request. Check its setup.', response.status === 429 ? 429 : 502);
      }
      const result = await boundedJson(response); job.complete = true;
      if (job.cancelled || job.sessionId !== sessionId) fail('cancelled', 'Image request cancelled.', 499);
      if (!Array.isArray(result?.data) || result.data.length !== 1) fail('bad-response', 'The image service returned an invalid image.', 502);
      return { image: 'data:image/png;base64,' + decodeImage(result.data[0]?.b64_json, true) };
    } catch (error) {
      if (job.sent && !job.complete) {
        if (!job.stopped) uncertain = true;
        job.controller.abort();
      }
      if (job.cancelled) fail('cancelled', 'Image request cancelled.', 499);
      if (error instanceof ImageProxyError) throw error;
      fail('service-unavailable', uncertain ? 'The image request ended without confirmation. Stop and restart local images before retrying.' : 'The selected local image service is not ready. Check Desktop setup.', 503);
    } finally { clearTimeout(timer); if (active === job) active = null; }
  }
  return Object.freeze({ status, setAccess, cancel, confirmStopped, request });
}
module.exports = { createLocalImageProxy, ImageProxyError, MAX_JSON_BYTES, validateRequest, decodeImage };
