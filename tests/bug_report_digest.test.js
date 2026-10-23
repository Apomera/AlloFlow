import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';

// Execute the production class against actual SQLite. Only the Workers base
// class/binding transport is replaced; no SQL matching mock or live services.
const source = readFileSync('catalog/bug-digest-worker/src/index.js', 'utf8');
const factory = new Function('DurableObject', 'crypto', source.replace("import { DurableObject } from 'cloudflare:workers';", '')
  .replace(/export (const|class|function) /g, '$1 ').replace('export default {', 'const worker = {')
  + '\nreturn { worker, BugDigest, nextNewYorkNine, INBOX_URL };');
const { worker, BugDigest, nextNewYorkNine, INBOX_URL } = factory(class { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }, webcrypto);
const databases = [];
const key = time => `bug:${time}:abcdef12`;
const baseTime = Date.parse('2026-10-22T12:00:00.000Z'); // 08:00 New York
let time = baseTime;
function rig() {
  time = baseTime; vi.spyOn(Date, 'now').mockImplementation(() => time);
  const db = new DatabaseSync(':memory:'); databases.push(db);
  const ctx = {
    blockConcurrencyWhile: fn => { ctx.ready = fn(); },
    storage: {
      sql: { exec(query, ...args) {
        let rows = [];
        if (query.includes('CREATE TABLE')) db.exec(query);
        else rows = db.prepare(query).all(...args);
        return { toArray: () => rows.map(row => ({ ...row })), one: () => { if (rows.length !== 1) throw new Error('Expected one row'); return { ...rows[0] }; } };
      } },
      transactionSync(fn) { db.exec('BEGIN'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } },
      sync: vi.fn(async () => {}),
    },
  };
  const names = new Set();
  const env = { ADMIN_TOKEN: 'synthetic-digest-admin-token', DIGEST_RECIPIENT: 'verified-synthetic@example.test',
    EMAIL: { send: vi.fn(async () => ({ messageId: 'synthetic-provider-message' })) },
    BUG_REPORTS: {
      get: vi.fn(() => { throw new Error('Must never load report bodies'); }),
      put: vi.fn(() => { throw new Error('Must never modify reports'); }),
      list: vi.fn(async ({ prefix, limit, cursor = '0' }) => {
        const ordered = [...names].filter(name => name.startsWith(prefix)).sort(); const start = Number(cursor); const end = Math.min(ordered.length, start + limit);
        return { keys: ordered.slice(start, end).map(name => ({ name, metadata: { private: 'metadata must not enter mail' } })), list_complete: end === ordered.length, cursor: end < ordered.length ? String(end) : '' };
      }),
    },
  };
  const instance = new BugDigest(ctx, env);
  env.BUG_DIGEST = { getByName: vi.fn(() => instance) };
  return { db, ctx, env, instance, names };
}
function enable(r) {
  return r.instance.setup({ operationId: 'setup_operation_0001', enabled: true, cutoff: new Date(baseTime).toISOString() });
}
function due(r, day = 0) { time = Date.parse('2026-10-22T13:00:00.000Z') + day * 86400000; return r.instance.tick(); }
function call(r, path = '/admin/status', method = 'GET', payload, authorization = `Bearer ${r.env.ADMIN_TOKEN}`) {
  return worker.fetch(new Request('https://digest.test' + path, { method, headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    ...(payload === undefined ? {} : { body: typeof payload === 'string' ? payload : JSON.stringify(payload) }) }), r.env);
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); while (databases.length) databases.pop().close(); });

describe('digest schedule and configuration', () => {
  it.each([
    ['2026-03-07T15:00:00.000Z', '2026-03-08T13:00:00.000Z'],
    ['2026-10-31T14:00:00.000Z', '2026-11-01T14:00:00.000Z'],
    ['2026-10-22T12:59:00.000Z', '2026-10-22T13:00:00.000Z'],
    ['2026-10-22T13:00:00.000Z', '2026-10-23T13:00:00.000Z'],
  ])('calculates New York 09:00 after %s', (input, expected) => expect(new Date(nextNewYorkNine(Date.parse(input))).toISOString()).toBe(expected));
  it('is off until explicit setup, rejects missing cutoff and keeps the cutoff immutable', async () => {
    const r = rig(); expect(r.instance.status()).toMatchObject({ enabled: false, configured: false });
    await due(r); expect(r.env.BUG_REPORTS.list).not.toHaveBeenCalled(); expect(r.env.EMAIL.send).not.toHaveBeenCalled();
    expect(r.instance.setup({ enabled: true, operationId: 'missing_cutoff_0001' }).ok).toBe(false);
    expect(enable(r).ok).toBe(true);
    expect(r.instance.setup({ enabled: true, operationId: 'changed_cutoff_0001', cutoff: new Date(baseTime - 1).toISOString() }).httpStatus).toBe(409);
    expect(r.instance.setup({ enabled: false, operationId: 'disable_operation_01' }).ok).toBe(true);
    expect(r.instance.status().enabled).toBe(false);
  });
  it('requires configured email before enabling and does not expose the recipient', () => {
    const r = rig(); delete r.env.DIGEST_RECIPIENT;
    expect(enable(r).httpStatus).toBe(503); expect(JSON.stringify(r.instance.status())).not.toContain('example.test');
  });
  it('makes setup idempotent and rejects reused IDs with different payloads', () => {
    const r = rig(); expect(enable(r).ok).toBe(true); expect(enable(r).duplicate).toBe(true);
    expect(r.instance.setup({ operationId: 'setup_operation_0001', enabled: false }).httpStatus).toBe(409);
  });
});

describe('digest admin boundary', () => {
  it('requires bearer authentication for every route before accessing state', async () => {
    const r = rig();
    for (const path of ['/admin/status', '/admin/test', '/anything?token=' + r.env.ADMIN_TOKEN]) {
      const res = await call(r, path, 'GET', undefined, ''); expect(res.status).toBe(401);
      expect(res.headers.get('Cache-Control')).toBe('no-store, private');
    }
    expect(r.env.BUG_DIGEST.getByName).not.toHaveBeenCalled();
  });
  it('keeps validation failures private and rejects query tokens, malformed IDs, oversized JSON and unknown fields', async () => {
    const r = rig();
    for (const [path, body, expected] of [
      ['/admin/test?token=x', {}, 400], ['/admin/test', '{', 400], ['/admin/test', 'x'.repeat(4097), 413],
      ['/admin/test', { operationId: 'short' }, 400], ['/admin/test', { operationId: 'synthetic_test_0001\n' }, 400],
      ['/admin/test', { operationId: 'synthetic_test_0001', to: 'unapproved@example.test' }, 400],
    ]) { const res = await call(r, path, 'POST', body); expect(res.status).toBe(expected); expect(res.headers.get('Cache-Control')).toContain('no-store'); }
    expect(r.env.EMAIL.send).not.toHaveBeenCalled();
  });
});

describe('complete scans and durable receipt reservations', () => {
  it('sends only a count and fixed inbox link for new keys; old keys and review notes never enter mail', async () => {
    const r = rig(); enable(r); r.names.add(key(baseTime - 1)); r.names.add(key(baseTime + 1)); r.names.add('bug-review:private-note');
    const result = await due(r); expect(result.batch).toMatchObject({ status: 'accepted', count: 1 });
    const message = r.env.EMAIL.send.mock.calls[0][0];
    expect(message).toMatchObject({ from: { email: 'alerts@alloflow.dev' }, to: r.env.DIGEST_RECIPIENT });
    expect(message.text).toContain('1 new error report'); expect(message.text).toContain(INBOX_URL);
    expect(JSON.stringify(message)).not.toContain('bug:'); expect(JSON.stringify(message)).not.toContain('metadata must');
    expect(r.env.BUG_REPORTS.get).not.toHaveBeenCalled(); expect(r.env.BUG_REPORTS.put).not.toHaveBeenCalled();
    await r.instance.tick(); await due(r, 1); expect(r.env.EMAIL.send).toHaveBeenCalledOnce();
  });
  it('sends no empty digest and catches a previously omitted older key on a later day', async () => {
    const r = rig(); enable(r); await due(r); expect(r.env.EMAIL.send).not.toHaveBeenCalled();
    r.names.add(key(baseTime + 50)); await due(r, 1); expect(r.env.EMAIL.send).toHaveBeenCalledOnce();
    r.names.add(key(baseTime + 20)); await due(r, 2); expect(r.env.EMAIL.send).toHaveBeenCalledTimes(2);
    expect(r.instance.status().reserved_receipts).toBe(2);
  });
  it('follows empty continuation pages and does not reserve partial scans', async () => {
    const r = rig(); enable(r);
    r.env.BUG_REPORTS.list.mockResolvedValueOnce({ keys: [{ name: key(baseTime + 1) }], list_complete: false, cursor: 'first' })
      .mockResolvedValueOnce({ keys: [], list_complete: false, cursor: 'second' }).mockResolvedValueOnce({ keys: [], list_complete: true });
    expect((await due(r)).batch.count).toBe(1); expect(r.env.BUG_REPORTS.list.mock.calls[2][0].cursor).toBe('second');
  });
  it.each(['missing', 'repeated', 'throw', 'bounded'])('fails visibly on %s continuation without mail or partial reservations', async failure => {
    const r = rig(); enable(r);
    let page = 0;
    r.env.BUG_REPORTS.list.mockImplementation(async () => {
      page++;
      if (failure === 'throw' && page > 1) throw Error('private-provider-diagnostic');
      return { keys: [{ name: key(baseTime + 1) }], list_complete: false, ...(failure === 'missing' ? {} : { cursor: failure === 'bounded' ? String(page) : 'same' }) };
    });
    const result = await due(r); expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain('private-provider');
    expect(r.instance.status().reserved_receipts).toBe(0); expect(r.env.EMAIL.send).not.toHaveBeenCalled();
  });
  it('does not duplicate overlapping scans or finalize a scan disabled during external KV I/O', async () => {
    const r = rig(); enable(r); let release;
    r.env.BUG_REPORTS.list.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const scanning = due(r); expect((await r.instance.tick()).scanning).toBe(true);
    r.instance.setup({ operationId: 'disable_during_scan', enabled: false });
    release({ keys: [{ name: key(baseTime + 1) }], list_complete: true }); await scanning;
    expect(r.instance.status().reserved_receipts).toBe(0); expect(r.env.EMAIL.send).not.toHaveBeenCalled();
  });
  it('persists reservations before calling the send binding', async () => {
    const r = rig(); enable(r); r.names.add(key(baseTime + 1)); let persist;
    r.ctx.storage.sync.mockImplementation(() => new Promise(resolve => { persist = resolve; }));
    const pending = due(r); await vi.waitFor(() => expect(r.ctx.storage.sync).toHaveBeenCalledOnce());
    expect(r.instance.status().reserved_receipts).toBe(1); expect(r.env.EMAIL.send).not.toHaveBeenCalled();
    persist(); expect((await pending).batch.status).toBe('accepted');
  });
});

describe('manual tests and uncertain email outcomes', () => {
  it('sends a deduplicated manual test while disabled without scanning or touching reports', async () => {
    const r = rig(); const body = { operationId: 'manual_test_operation' };
    const first = await r.instance.test(body); const repeat = await r.instance.test(body);
    expect(first.batch).toMatchObject({ kind: 'test', count: 0, status: 'accepted' }); expect(repeat.duplicate).toBe(true);
    expect(r.env.EMAIL.send).toHaveBeenCalledOnce(); expect(r.env.BUG_REPORTS.list).not.toHaveBeenCalled();
    expect(r.instance.status()).toMatchObject({ enabled: false, configured: false, reserved_receipts: 0 });
    expect(r.env.EMAIL.send.mock.calls[0][0].subject).toContain('setup test');
  });
  it('deduplicates concurrent calls with the same test operation before any external send completes', async () => {
    const r = rig(); let finish; r.env.EMAIL.send.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const sending = r.instance.test({ operationId: 'concurrent_test_op' }); await vi.waitFor(() => expect(r.env.EMAIL.send).toHaveBeenCalledOnce());
    expect((await r.instance.test({ operationId: 'concurrent_test_op' })).batch.status).toBe('sending');
    finish({ messageId: 'accepted-test' }); await sending; expect(r.env.EMAIL.send).toHaveBeenCalledOnce();
  });
  it.each([['E_SENDER_NOT_VERIFIED', 'failed'], ['E_INTERNAL_SERVER_ERROR', 'uncertain'], [undefined, 'uncertain']])('classifies %s without exposing provider text or automatically resending', async (code, expected) => {
    const r = rig(); enable(r); r.names.add(key(baseTime + 1));
    r.env.EMAIL.send.mockRejectedValue(Object.assign(Error('private-provider-diagnostic'), { code }));
    const first = await due(r); expect(first.batch.status).toBe(expected); expect(JSON.stringify(first)).not.toContain('private-provider');
    await due(r, 1); expect(r.env.EMAIL.send).toHaveBeenCalledOnce(); expect(r.instance.status().reserved_receipts).toBe(1);
  });
  it('requires explicit duplicate-risk acceptance and bounds retries to three attempts', async () => {
    const r = rig(); r.env.EMAIL.send.mockRejectedValue(Error('uncertain'));
    const first = await r.instance.test({ operationId: 'failed_test_operation' }); const batchId = first.batch.id;
    expect((await r.instance.retry({ operationId: 'retry_operation_01', batchId })).ok).toBe(false);
    expect((await r.instance.retry({ operationId: 'retry_operation_01', batchId, acceptDuplicateRisk: true })).httpStatus).toBe(409);
    for (let i = 1; i <= 2; i++) { time += 61000; const input = { operationId: `retry_operation_0${i}`, batchId, acceptDuplicateRisk: true }; expect((await r.instance.retry(input)).batch.attempts).toBe(i + 1); expect((await r.instance.retry(input)).duplicate).toBe(true); }
    time += 61000; expect((await r.instance.retry({ operationId: 'retry_operation_03', batchId, acceptDuplicateRisk: true })).httpStatus).toBe(409);
    expect(r.env.EMAIL.send).toHaveBeenCalledTimes(3);
  });
  it('marks missing provider acknowledgement uncertain and recovers interrupted reservations after restart', async () => {
    const r = rig(); r.env.EMAIL.send.mockResolvedValue(undefined);
    expect((await r.instance.test({ operationId: 'missing_ack_test_01' })).batch.status).toBe('uncertain');
    const id = r.instance.reserve('digest', 1, 'interrupted_op_01', time);
    const restarted = new BugDigest(r.ctx, r.env); await r.ctx.ready;
    expect(restarted.batch(id)).toMatchObject({ status: 'uncertain', problem: 'process-restarted' });
    await restarted.tick(); expect(r.env.EMAIL.send).toHaveBeenCalledOnce();
  });
  it('bounds a stalled send and never automatically replays it', async () => {
    const r = rig(); vi.useFakeTimers(); r.env.EMAIL.send.mockImplementation(() => new Promise(() => {}));
    const pending = r.instance.test({ operationId: 'stalled_send_test_01' }); await vi.advanceTimersByTimeAsync(15001);
    expect((await pending).batch).toMatchObject({ status: 'uncertain', problem: 'send-timeout' });
    await r.instance.test({ operationId: 'stalled_send_test_01' }); expect(r.env.EMAIL.send).toHaveBeenCalledOnce();
  });
});
