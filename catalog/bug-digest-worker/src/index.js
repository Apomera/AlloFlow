import { DurableObject } from 'cloudflare:workers';

export const INBOX_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/bug-inbox';
const SENDER = 'alerts@alloflow.dev';
const OBJECT_NAME = 'alloflow-developer-inbox-v1';
const RECEIPT = /^bug:(\d{13}):[a-z0-9]{1,32}$/;
const OPERATION = /^[A-Za-z0-9_-]{16,100}$/;
const MAX_ATTEMPTS = 3;
const SEND_TIMEOUT = 15000;
const RETRY_DELAY = 60000;
const SCAN_LEASE = 300000;
const MAX_SCAN_PAGES = 40;
const PRIVATE_HEADERS = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const DEFINITE_REJECTIONS = new Set(['E_VALIDATION_ERROR', 'E_FIELD_MISSING', 'E_TOO_MANY_RECIPIENTS', 'E_SENDER_NOT_VERIFIED', 'E_RECIPIENT_NOT_ALLOWED', 'E_RECIPIENT_SUPPRESSED', 'E_SENDER_DOMAIN_NOT_AVAILABLE', 'E_CONTENT_TOO_LARGE', 'E_RATE_LIMIT_EXCEEDED', 'E_DAILY_LIMIT_EXCEEDED']);
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const validOperation = value => typeof value === 'string' && value === value.trim() && OPERATION.test(value);
const errorResult = (error, status = 400) => ({ ok: false, error, httpStatus: status });
const response = (body, status = body.httpStatus || 200) => {
  const { httpStatus, ...payload } = body;
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', ...PRIVATE_HEADERS } });
};

const localClock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function localParts(time) {
  return Object.fromEntries(localClock.formatToParts(new Date(time)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}
function nineOnDate(year, month, day) {
  const target = Date.UTC(year, month - 1, day, 9);
  let guess = target + 5 * 3600000;
  for (let i = 0; i < 3; i++) {
    const local = localParts(guess);
    guess += target - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  }
  return guess;
}
export function nextNewYorkNine(now) {
  const local = localParts(now);
  const today = nineOnDate(local.year, local.month, local.day);
  if (today > now) return today;
  const next = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return nineOnDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

async function authorized(request, expected) {
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match || !expected) return false;
  const encode = new TextEncoder();
  const [left, right] = await Promise.all([match[1], expected].map(value => crypto.subtle.digest('SHA-256', encode.encode(value))));
  const a = new Uint8Array(left); const b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function smallJson(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return errorResult('JSON content type required.', 415);
  const reader = request.body?.getReader();
  if (!reader) return errorResult('JSON body required.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return errorResult('Body too large.', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { ok: true, payload: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch (_) { return errorResult('Invalid JSON body.'); }
}

export class BugDigest extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1), enabled INTEGER NOT NULL DEFAULT 0,
          cutoff_ms INTEGER, next_run INTEGER, revision INTEGER NOT NULL DEFAULT 0,
          scan_id TEXT, scan_started INTEGER, last_scan INTEGER, last_error TEXT
        );
        INSERT OR IGNORE INTO settings (id) VALUES (1);
        CREATE TABLE IF NOT EXISTS receipts (receipt TEXT PRIMARY KEY, batch_id TEXT NOT NULL, discovered_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS batches (
          id TEXT PRIMARY KEY, kind TEXT NOT NULL, count INTEGER NOT NULL, status TEXT NOT NULL,
          attempts INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, problem TEXT
        );
        CREATE TABLE IF NOT EXISTS attempts (
          operation_id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, attempt_number INTEGER NOT NULL,
          status TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER, provider_id TEXT, problem TEXT,
          UNIQUE(batch_id, attempt_number)
        );
        CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, kind TEXT NOT NULL, fingerprint TEXT NOT NULL, batch_id TEXT);
      `);
      // A process restart cannot establish whether an external send completed.
      // Preserve reservations and require deliberate review/retry, never replay.
      this.sql("UPDATE attempts SET status = 'uncertain', problem = 'process-restarted' WHERE status = 'sending'");
      this.sql("UPDATE batches SET status = 'uncertain', problem = 'process-restarted' WHERE status = 'sending'");
    });
  }

  sql(query, ...values) { return this.ctx.storage.sql.exec(query, ...values); }
  settings() { return this.sql('SELECT * FROM settings WHERE id = 1').one(); }
  batch(id) { return this.sql('SELECT * FROM batches WHERE id = ?', id).toArray()[0] || null; }
  recoverStaleAttempts() {
    const cutoff = Date.now() - 120000;
    this.ctx.storage.transactionSync(() => {
      this.sql("UPDATE attempts SET status = 'uncertain', problem = 'attempt-interrupted' WHERE status = 'sending' AND started_at <= ?", cutoff);
      this.sql("UPDATE batches SET status = 'uncertain', problem = 'attempt-interrupted' WHERE status = 'sending' AND updated_at <= ?", cutoff);
    });
  }
  emailConfigured() { return typeof this.env.DIGEST_RECIPIENT === 'string' && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(this.env.DIGEST_RECIPIENT) && !!this.env.EMAIL?.send; }
  existingOperation(id, kind, fingerprint) {
    const previous = this.sql('SELECT * FROM operations WHERE id = ?', id).toArray()[0];
    if (!previous) return null;
    return previous.kind === kind && previous.fingerprint === fingerprint
      ? { ok: true, duplicate: true, ...(previous.batch_id ? { batch: this.batch(previous.batch_id) } : {}) }
      : errorResult('Operation ID was already used for another request.', 409);
  }

  status() {
    this.recoverStaleAttempts();
    const state = this.settings();
    return { ok: true, enabled: !!state.enabled, configured: state.cutoff_ms !== null,
      cutoff: state.cutoff_ms === null ? null : new Date(state.cutoff_ms).toISOString(),
      next_run: state.next_run === null ? null : new Date(state.next_run).toISOString(),
      schedule: '09:00 America/New_York', recipient_configured: this.emailConfigured(),
      last_scan: state.last_scan, last_error: state.last_error,
      reserved_receipts: this.sql('SELECT COUNT(*) AS count FROM receipts').one().count,
      batches: this.sql('SELECT * FROM batches ORDER BY created_at DESC, id DESC LIMIT 20').toArray() };
  }

  setup(payload) {
    if (!only(payload, ['operationId', 'enabled', 'cutoff']) || !validOperation(payload.operationId) || typeof payload.enabled !== 'boolean') return errorResult('Provide operationId and enabled; cutoff is required on first enable.');
    const fingerprint = JSON.stringify([payload.enabled, payload.cutoff ?? null]);
    const prior = this.existingOperation(payload.operationId, 'setup', fingerprint);
    if (prior) return { ...prior, ...(prior.ok ? { state: this.status() } : {}) };
    const now = Date.now(); const current = this.settings();
    let cutoff = current.cutoff_ms;
    if (payload.cutoff !== undefined) {
      const parsed = typeof payload.cutoff === 'string' ? Date.parse(payload.cutoff) : NaN;
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > now || new Date(parsed).toISOString() !== payload.cutoff) return errorResult('cutoff must be an exact ISO timestamp no later than now.');
      if (cutoff !== null && cutoff !== parsed) return errorResult('The initial cutoff is immutable.', 409);
      cutoff = parsed;
    }
    if (payload.enabled && cutoff === null) return errorResult('Choose an explicit cutoff before enabling.');
    if (payload.enabled && !this.emailConfigured()) return errorResult('Email binding or verified recipient is not configured.', 503);
    this.ctx.storage.transactionSync(() => {
      this.sql('UPDATE settings SET enabled = ?, cutoff_ms = ?, next_run = ?, revision = revision + 1, scan_id = NULL, scan_started = NULL WHERE id = 1', payload.enabled ? 1 : 0, cutoff, payload.enabled ? (current.enabled && current.next_run ? current.next_run : nextNewYorkNine(now)) : null);
      this.sql('INSERT INTO operations (id, kind, fingerprint) VALUES (?, ?, ?)', payload.operationId, 'setup', fingerprint);
    });
    return { ok: true, state: this.status() };
  }

  reserve(kind, count, operationId, now, id = crypto.randomUUID()) {
    this.sql('INSERT INTO batches (id, kind, count, status, attempts, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)', id, kind, count, 'sending', now, now);
    this.sql('INSERT INTO attempts (operation_id, batch_id, attempt_number, status, started_at) VALUES (?, ?, 1, ?, ?)', operationId, id, 'sending', now);
    return id;
  }

  async deliver(batchId, operationId) {
    // This explicit durability barrier precedes the external side effect.
    await this.ctx.storage.sync();
    const batch = this.batch(batchId);
    const attempt = this.sql('SELECT * FROM attempts WHERE operation_id = ?', operationId).one();
    let status = 'uncertain'; let problem = null; let providerId = null;
    let timer;
    try {
      if (!this.emailConfigured()) { status = 'failed'; problem = 'email-not-configured'; }
      else {
        const isTest = batch.kind === 'test';
        const subject = isTest ? '[AlloFlow] Notification setup test' : `[AlloFlow] ${batch.count} new error report${batch.count === 1 ? '' : 's'}`;
        const sentence = isTest ? 'This is an explicitly requested test of AlloFlow developer notifications. No report content is included.' : `${batch.count} new error report${batch.count === 1 ? ' is' : 's are'} available in your private developer inbox.`;
        const result = await Promise.race([
          this.env.EMAIL.send({ from: { email: SENDER, name: 'AlloFlow' }, to: this.env.DIGEST_RECIPIENT, subject,
            text: `${sentence}\n\nOpen the private inbox and sign in: ${INBOX_URL}\n`,
            html: `<p>${sentence}</p><p><a href="${INBOX_URL}">Open the private developer inbox</a> and sign in.</p>` }),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('send-timeout'), { digestTimeout: true })), SEND_TIMEOUT); }),
        ]);
        if (result && typeof result.messageId === 'string' && result.messageId.length > 0 && result.messageId.length <= 512) { status = 'accepted'; providerId = result.messageId; }
        else problem = 'missing-provider-acknowledgement';
      }
    } catch (error) {
      status = DEFINITE_REJECTIONS.has(error?.code) ? 'failed' : 'uncertain';
      problem = DEFINITE_REJECTIONS.has(error?.code) ? error.code : error?.digestTimeout ? 'send-timeout' : 'unknown-send-outcome';
    } finally { if (timer) clearTimeout(timer); }
    const finished = Date.now();
    this.ctx.storage.transactionSync(() => {
      this.sql('UPDATE attempts SET status = ?, finished_at = ?, provider_id = ?, problem = ? WHERE operation_id = ?', status, finished, providerId, problem, operationId);
      // Never let a stale response from an older attempt override a later one.
      this.sql('UPDATE batches SET status = ?, updated_at = ?, problem = ? WHERE id = ? AND attempts = ?', status, finished, problem, batchId, attempt.attempt_number);
    });
    return { ok: true, batch: this.batch(batchId) };
  }

  async test(payload) {
    if (!only(payload, ['operationId']) || !validOperation(payload.operationId)) return errorResult('Provide a unique operationId (16–100 letters, digits, underscores or hyphens).');
    const prior = this.existingOperation(payload.operationId, 'test', 'test');
    if (prior) return prior;
    if (!this.emailConfigured()) return errorResult('Email binding or verified recipient is not configured.', 503);
    const now = Date.now(); let batchId;
    this.ctx.storage.transactionSync(() => {
      batchId = this.reserve('test', 0, payload.operationId, now);
      this.sql('INSERT INTO operations (id, kind, fingerprint, batch_id) VALUES (?, ?, ?, ?)', payload.operationId, 'test', 'test', batchId);
    });
    return this.deliver(batchId, payload.operationId);
  }

  async retry(payload) {
    if (!only(payload, ['operationId', 'batchId', 'acceptDuplicateRisk']) || !validOperation(payload.operationId) || typeof payload.batchId !== 'string' || payload.batchId.length > 100 || payload.acceptDuplicateRisk !== true) return errorResult('Provide operationId, batchId, and acceptDuplicateRisk:true.');
    this.recoverStaleAttempts();
    const prior = this.existingOperation(payload.operationId, 'retry', payload.batchId);
    if (prior) return prior;
    const batch = this.batch(payload.batchId); const now = Date.now();
    if (!batch) return errorResult('Batch not found.', 404);
    if (!['failed', 'uncertain'].includes(batch.status) || batch.attempts >= MAX_ATTEMPTS) return errorResult('Batch is not eligible for another explicit retry.', 409);
    if (now - batch.updated_at < RETRY_DELAY) return errorResult('Wait at least one minute after the previous outcome.', 409);
    if (!this.emailConfigured()) return errorResult('Email binding or verified recipient is not configured.', 503);
    this.ctx.storage.transactionSync(() => {
      this.sql('UPDATE batches SET status = ?, attempts = attempts + 1, updated_at = ?, problem = NULL WHERE id = ?', 'sending', now, batch.id);
      this.sql('INSERT INTO attempts (operation_id, batch_id, attempt_number, status, started_at) VALUES (?, ?, ?, ?, ?)', payload.operationId, batch.id, batch.attempts + 1, 'sending', now);
      this.sql('INSERT INTO operations (id, kind, fingerprint, batch_id) VALUES (?, ?, ?, ?)', payload.operationId, 'retry', batch.id, batch.id);
    });
    return this.deliver(batch.id, payload.operationId);
  }

  async tick() {
    const now = Date.now(); const initial = this.settings();
    if (!initial.enabled || initial.next_run > now) return { ok: true, skipped: true };
    if (initial.scan_id && now - initial.scan_started < SCAN_LEASE) return { ok: true, skipped: true, scanning: true };
    const scanId = crypto.randomUUID();
    this.sql('UPDATE settings SET scan_id = ?, scan_started = ? WHERE id = 1', scanId, now);
    try {
      // Restart at the beginning every time. A timestamp watermark would lose
      // older keys that become visible after an eventually consistent scan.
      const names = new Set(); const cursors = new Set(); let cursor; let complete = false;
      for (let pageNumber = 0; pageNumber < MAX_SCAN_PAGES; pageNumber++) {
        const page = await this.env.BUG_REPORTS.list({ prefix: 'bug:', limit: 1000, ...(cursor ? { cursor } : {}) });
        if (!page || !Array.isArray(page.keys) || typeof page.list_complete !== 'boolean') throw new Error('invalid-scan');
        for (const key of page.keys) {
          const match = typeof key?.name === 'string' ? key.name.match(RECEIPT) : null;
          if (!match || match[0] !== key.name) throw new Error('invalid-receipt-key');
          if (Number(match[1]) > initial.cutoff_ms && Number(match[1]) <= now) names.add(key.name);
        }
        if (page.list_complete) { complete = true; break; }
        if (typeof page.cursor !== 'string' || !page.cursor || cursors.has(page.cursor)) throw new Error('invalid-cursor');
        cursors.add(page.cursor); cursor = page.cursor;
      }
      if (!complete) throw new Error('scan-bound-exceeded');
      const current = this.settings();
      if (!current.enabled || current.revision !== initial.revision || current.scan_id !== scanId) return { ok: true, skipped: true };
      let batchId = null;
      this.ctx.storage.transactionSync(() => {
        const newNames = [...names].filter(name => this.sql('SELECT receipt FROM receipts WHERE receipt = ?', name).toArray().length === 0);
        if (newNames.length) {
          batchId = this.reserve('digest', newNames.length, scanId, now);
          for (const name of newNames) this.sql('INSERT INTO receipts (receipt, batch_id, discovered_at) VALUES (?, ?, ?)', name, batchId, now);
        }
        this.sql('UPDATE settings SET next_run = ?, last_scan = ?, last_error = NULL, scan_id = NULL, scan_started = NULL WHERE id = 1', nextNewYorkNine(Date.now()), Date.now());
      });
      return batchId ? this.deliver(batchId, scanId) : { ok: true, empty: true };
    } catch (_) {
      this.sql('UPDATE settings SET scan_id = NULL, scan_started = NULL, last_error = ? WHERE id = 1 AND scan_id = ?', 'scan-or-storage-failed', scanId);
      return errorResult('Digest scan failed; no partial batch was sent.', 502);
    }
  }
}

export default {
  async fetch(request, env) {
    if (!env.ADMIN_TOKEN) return response(errorResult('Admin access is not configured.', 503));
    if (!(await authorized(request, env.ADMIN_TOKEN))) return response(errorResult('Unauthorized.', 401));
    const url = new URL(request.url);
    if (url.search) return response(errorResult('Query parameters are not accepted.'));
    try {
      const stub = env.BUG_DIGEST.getByName(OBJECT_NAME);
      if (request.method === 'GET' && url.pathname === '/admin/status') return response(await stub.status());
      const action = { '/admin/setup': 'setup', '/admin/test': 'test', '/admin/retry': 'retry' }[url.pathname];
      if (request.method !== 'POST' || !action) return response(errorResult('Not found.', 404));
      const body = await smallJson(request);
      if (!body.ok) return response(body);
      return response(await stub[action](body.payload));
    } catch (_) { return response(errorResult('Digest service is unavailable. Check private status before retrying.', 502)); }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const result = await env.BUG_DIGEST.getByName(OBJECT_NAME).tick();
      if (!result.ok) {
        console.error(JSON.stringify({ event: 'digest-scan-failed' }));
        throw new Error('Digest scan failed; inspect private admin status.');
      }
      if (result.batch && ['failed', 'uncertain'].includes(result.batch.status)) {
        console.warn(JSON.stringify({ event: 'digest-send-needs-review', batch_id: result.batch.id, status: result.batch.status }));
      }
    })());
  },
};
