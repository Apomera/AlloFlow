import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
const CODE = 'ABC23', KEY = 'synthetic_join_secret_1234567890';
const START = 1792872000000, TTL = 6 * 60 * 60 * 1000;

function fixture() {
  let now = START, locked = false, available = true, afterAcquire;
  const values = new Map(), properties = new Map(), puts = [], reads = [], removals = [];
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const cache = {
    get: key => values.get(key) ?? null,
    put(key, value, seconds) { puts.push({ key, value: String(value), seconds }); values.set(key, String(value)); },
    remove: key => { removals.push(key); return values.delete(key); },
    removeAll: keys => keys.forEach(key => { removals.push(key); values.delete(key); }),
    getAll: keys => Object.fromEntries(keys.filter(key => values.has(key)).map(key => [key, values.get(key)])),
  };
  const props = {
    getProperty(key) { reads.push(key); return properties.get(key) ?? null; },
    setProperty: (key, value) => properties.set(key, String(value)),
    deleteProperty: key => properties.delete(key),
    getProperties: () => Object.fromEntries(properties),
  };
  const context = {
    Date: Clock, CacheService: { getScriptCache: () => cache }, PropertiesService: { getScriptProperties: () => props },
    LockService: { getScriptLock: () => ({
      tryLock() { if (!available || locked) return false; locked = true; if (afterAcquire) { const f = afterAcquire; afterAcquire = null; f(); } return true; },
      releaseLock() { expect(locked).toBe(true); locked = false; },
    }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType() { return this; }, getContent: () => text }) },
  };
  vm.runInNewContext(source, context);
  properties.set('admin', 'synthetic_admin_token_1234567890');
  return { context, cache, props, values, properties, puts, reads, removals,
    time(value) { now = value; },
    unavailable() { available = false; },
    afterAcquire(fn) { afterAcquire = fn; },
    marker(value = KEY + '|' + START) { properties.set('sess_' + CODE, value); },
    lookup() { return context.sessionSecretFor(CODE, cache, props); },
    call(p) { return JSON.parse(context.handle({ admin: properties.get('admin'), ...p }).getContent()); },
    http(p) { return JSON.parse(context.doPost({ postData: { contents: JSON.stringify(p) } }).getContent()); },
  };
}

describe('mailbox absolute session access window', () => {
  it('stores the original absolute deadline and does not read durable properties for ordinary warm polls', () => {
    const f = fixture();
    expect(f.call({ a: 'open', c: CODE, k: KEY })).toMatchObject({ ok: true });
    expect(JSON.parse(f.values.get('s:' + CODE))).toEqual({ v: 1, k: KEY, at: START, expiresAt: START + TTL });
    f.reads.length = 0;
    for (let i = 0; i < 20; i++) expect(f.lookup()).toBe(KEY);
    expect(f.reads).toHaveLength(0);
  });

  it('migrates legacy plain-secret caches from their durable creation time, using only remaining TTL', () => {
    const f = fixture(); f.marker(); f.values.set('s:' + CODE, KEY);
    f.time(START + TTL - 12345);
    expect(f.lookup()).toBe(KEY);
    const put = f.puts.at(-1);
    expect(put.seconds).toBe(12);
    expect(JSON.parse(put.value).expiresAt).toBe(START + TTL);
    f.time(START + TTL);
    expect(f.lookup()).toBeNull();
    expect(f.values.has('s:' + CODE)).toBe(false);
    expect(f.properties.has('sess_' + CODE)).toBe(false);
  });

  it('rejects an expired cached envelope even if the cache has not evicted it', () => {
    const f = fixture(); f.marker(); expect(f.lookup()).toBe(KEY);
    f.time(START + TTL + 1);
    expect(f.lookup()).toBeNull();
    expect(f.values.has('s:' + CODE)).toBe(false);
  });

  it('does not create a new one-second cache lease in the final fractional second', () => {
    const f = fixture(); f.marker(); f.time(START + TTL - 10);
    expect(f.lookup()).toBe(KEY);
    expect(f.puts).toHaveLength(0);
    f.time(START + TTL); expect(f.lookup()).toBeNull();
  });

  it.each([undefined, KEY, KEY + '|', KEY + '|0', KEY + '|-1', KEY + '|NaN', KEY + '|1e12', KEY + '|' + START + 'junk', KEY + '|' + (START + 1), 'short|' + START])('denies malformed, missing, or future marker %s without rewarming a legacy cache', value => {
    const f = fixture(); if (value !== undefined) f.marker(value);
    f.values.set('s:' + CODE, KEY);
    f.values.set('d:' + CODE + ':s', JSON.stringify({ w: 1, d: { synthetic: true } }));
    expect(f.lookup()).toBeNull();
    expect(f.values.has('s:' + CODE)).toBe(false);
    expect(f.values.has('d:' + CODE + ':s')).toBe(value === undefined);
    expect(f.puts).toHaveLength(0);
  });

  it.each([{ v: 2, k: KEY, at: START, expiresAt: START + TTL }, { v: 1, k: KEY, at: START, expiresAt: START + TTL + 1 }, { v: 1, k: 123456789012, at: START, expiresAt: START + TTL }])('does not trust a malformed cache envelope', envelope => {
    const f = fixture(); f.values.set('s:' + CODE, JSON.stringify(envelope));
    expect(f.lookup()).toBeNull();
    expect(f.values.has('s:' + CODE)).toBe(false);
  });

  it('re-reads the current marker only after acquiring the lifecycle lock, preserving a replacement session', () => {
    const f = fixture(); f.marker(); f.values.set('s:' + CODE, KEY);
    const replacement = 'replacement_join_secret_123456789';
    f.afterAcquire(() => { f.time(START + 1000); f.marker(replacement + '|' + (START + 1000)); });
    expect(f.lookup()).toBe(replacement);
    expect(JSON.parse(f.values.get('s:' + CODE))).toMatchObject({ k: replacement, at: START + 1000 });
  });

  it('cannot rewarm a legacy cache after close wins the lifecycle lock', () => {
    const f = fixture(); f.marker(); f.values.set('s:' + CODE, KEY);
    f.afterAcquire(() => f.properties.delete('sess_' + CODE));
    expect(f.lookup()).toBeNull(); expect(f.puts).toHaveLength(0);
  });

  it('prunes expired and malformed markers with their known ephemeral cache, preserving an active session and other settings', () => {
    const f = fixture(); f.marker(); f.properties.set('sess_BAD99', KEY + '|bad');
    f.properties.set('sess_LIVE1', KEY + '|' + (START + 1));
    f.properties.set('unrelated', 'keep');
    f.values.set('s:' + CODE, JSON.stringify({ v: 1, k: KEY, at: START, expiresAt: START + TTL }));
    f.values.set('d:' + CODE + ':s', JSON.stringify({ w: 1, d: {} }));
    f.values.set('s:BAD99', KEY); f.values.set('d:BAD99:s', JSON.stringify({ w: 1, d: {} }));
    f.time(START + TTL);
    expect(f.context.pruneExpiredSessions(f.props, f.cache)).toBe(true);
    expect(f.properties.has('sess_' + CODE)).toBe(false);
    expect(f.properties.has('sess_BAD99')).toBe(false);
    expect(f.properties.has('sess_LIVE1')).toBe(true);
    expect(f.properties.get('unrelated')).toBe('keep');
    expect([...f.values.keys()]).toEqual([]);
  });

  it('explicit close removes the cached capability, marker and ephemeral session state', () => {
    const f = fixture(); expect(f.call({ a: 'open', c: CODE, k: KEY }).ok).toBe(true);
    f.values.set('d:' + CODE + ':s', JSON.stringify({ w: 1, d: {} }));
    expect(f.call({ a: 'end', c: CODE })).toEqual({ ok: true });
    expect(f.lookup()).toBeNull(); expect(f.values.has('d:' + CODE + ':s')).toBe(false);
  });

  it('returns retryable busy rather than falsely ending a cold session when its lock is unavailable', () => {
    const f = fixture(); f.marker(); f.unavailable();
    expect(() => f.lookup()).toThrow('mailbox-session-busy');
    expect(f.http({ a: 'join', c: CODE, k: KEY })).toEqual({ ok: false, e: 'busy' });
    expect(f.call({ a: 'open', c: CODE, k: KEY })).toEqual({ ok: false, e: 'busy' });
    expect(f.call({ a: 'closeall' })).toEqual({ ok: false, e: 'busy' });
    expect(f.properties.get('sess_' + CODE)).toBe(KEY + '|' + START);
  });

  it('does not turn unknown or malformed session codes into expensive cache cleanup jobs', () => {
    const f = fixture(); expect(f.lookup()).toBeNull();
    expect(f.removals).toHaveLength(0); expect(f.reads).toEqual(['sess_' + CODE]);
    f.reads.length = 0;
    for (const code of ['', 'abc23', '../bad', 'ABC23:cache', 'A'.repeat(1000)]) expect(f.context.sessionSecretFor(code, f.cache, f.props)).toBeNull();
    expect(f.reads).toHaveLength(0); expect(f.removals).toHaveLength(0);
  });

  it('does not claim successful closure or discard the session body when marker removal fails', () => {
    const f = fixture(); f.marker(); f.values.set('d:' + CODE + ':s', JSON.stringify({ w: 1, d: { synthetic: true } }));
    f.props.deleteProperty = () => {};
    expect(() => f.context.closeSession(f.cache, f.props, CODE)).toThrow('session-close-failed');
    expect(f.properties.has('sess_' + CODE)).toBe(true);
    expect(f.values.has('d:' + CODE + ':s')).toBe(true);
  });

  it('documents the deliberate limit: manual marker edits do not instantly revoke a valid cached envelope', () => {
    const f = fixture(); f.marker(); expect(f.lookup()).toBe(KEY);
    f.properties.delete('sess_' + CODE);
    expect(f.lookup()).toBe(KEY);
    expect(f.context.closeSession(f.cache, f.props, CODE)).toBe(true);
    expect(f.lookup()).toBeNull();
  });
});
