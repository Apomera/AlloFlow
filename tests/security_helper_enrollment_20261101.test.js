import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../walkthrough_copilot_module.js');
const owner = 'owner@school.example';

it('mailbox setup ships the reviewed owner manifest for offline copying', () => {
  const source = readFileSync('view_share_session_surfaces_source.jsx', 'utf8');
  const literal = /const ownerManifest = (.+);/.exec(source)?.[1];
  expect(literal).toBeTruthy();
  const copiedManifest = JSON.parse(JSON.parse(literal));
  expect(copiedManifest).toEqual(JSON.parse(readFileSync('apps_script/session_mailbox/appsscript.json', 'utf8')));
});

function fixture(kind, initial = {}) {
  const props = new Map(Object.entries(initial));
  const writes = [];
  const identity = { active: owner, effective: owner, onLock: null, busy: false };
  const cache = new Map();
  let sequence = 0;
  const state = {
    Session: {
      getActiveUser: () => ({ getEmail: () => identity.active }),
      getEffectiveUser: () => ({ getEmail: () => identity.effective }),
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => props.get(key) ?? null,
      getProperties: () => Object.fromEntries(props),
      setProperty: (key, value) => { props.set(key, String(value)); writes.push(['set', key]); },
      deleteProperty: key => { props.delete(key); writes.push(['delete', key]); },
    }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => { if (identity.onLock) identity.onLock(); return !identity.busy; },
      releaseLock: () => {},
    }) },
    CacheService: { getScriptCache: () => ({ get: key => cache.get(key) ?? null, put: (key, value) => cache.set(key, value) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType() { return this; }, getContent: () => value }) },
    Utilities: { getUuid: () => (++sequence).toString(16).padStart(32, '0') },
  };
  const context = createContext(state);
  const directory = kind === 'mailbox' ? 'session_mailbox' : 'walkthrough_records';
  runInContext(readFileSync(`apps_script/${directory}/Code.gs`, 'utf8'), context);
  const tokenKey = kind === 'mailbox' ? 'admin' : 'wr_admin_token';
  const ownerKey = kind === 'mailbox' ? 'admin_owner_email' : 'wr_owner_email';
  return {
    props, writes, identity, context, tokenKey, ownerKey,
    setup: () => context[kind === 'mailbox' ? 'setupMailboxOwner' : 'setupWalkthroughOwner'](),
    rotate: () => context[kind === 'mailbox' ? 'rotateMailboxOwnerToken' : 'forgetConnection'](),
    post: body => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).getContent()),
    accepts: token => kind === 'mailbox'
      ? context.requestActor({ admin: token }, 'ABCDE', 'synthetic-session-secret', props.get(tokenKey))?.role === 'teacher'
      : context.wrAuthorize_({ token }) === null,
  };
}

describe.each(['mailbox', 'walkthrough'])('%s owner enrollment', kind => {
  it('public claims cannot issue a credential before or after owner setup', () => {
    const f = fixture(kind);
    const claim = kind === 'mailbox' ? { a: 'claim' } : { action: 'claim' };
    for (const active of ['', owner]) {
      f.identity.active = active;
      const result = f.post(claim);
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('admin');
      expect(f.props.has(f.tokenKey)).toBe(false);
      expect(f.writes).toEqual([]);
    }
    f.setup();
    const original = f.props.get(f.tokenKey);
    expect(f.post(claim).ok).toBe(false);
    expect(f.props.get(f.tokenKey)).toBe(original);
  });

  it.each([['', owner], [owner, ''], ['other@school.example', owner]])('refuses absent or mismatched identity (%s)', (active, effective) => {
    const f = fixture(kind);
    Object.assign(f.identity, { active, effective });
    expect(f.setup).toThrow(/identity could not be verified/);
    expect(f.rotate).toThrow(/identity could not be verified/);
    expect(f.writes).toEqual([]);
  });

  it('does not dispatch editor setup or recovery through public HTTP actions', () => {
    const f = fixture(kind);
    const setup = kind === 'mailbox' ? 'setupMailboxOwner' : 'setupWalkthroughOwner';
    const rotate = kind === 'mailbox' ? 'rotateMailboxOwnerToken' : 'forgetConnection';
    f.identity.active = '';
    for (const action of [setup, rotate]) {
      expect(f.post(kind === 'mailbox' ? { a: action } : { action }).ok).toBe(false);
      expect(f.props.has(f.tokenKey)).toBe(false);
    }
    expect(f.writes).toEqual([]);
  });

  it('owner setup creates once, binds identity, and returns no credential', () => {
    const f = fixture(kind);
    const result = f.setup();
    const token = f.props.get(f.tokenKey);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(f.props.get(f.ownerKey)).toBe(owner);
    expect(result).not.toContain(token);
    f.setup();
    expect(f.props.get(f.tokenKey)).toBe(token);
    expect(f.accepts(token)).toBe(true);
  });

  it('preserves a legacy token during owner migration', () => {
    const key = kind === 'mailbox' ? 'admin' : 'wr_admin_token';
    const f = fixture(kind, { [key]: 'synthetic-existing-token', retainedData: 'keep' });
    f.setup();
    expect(f.props.get(key)).toBe('synthetic-existing-token');
    expect(f.props.get('retainedData')).toBe('keep');
    expect(f.accepts('synthetic-existing-token')).toBe(true);
  });

  it('rechecks authority after acquiring the lock and denies another bound owner', () => {
    const f = fixture(kind);
    f.identity.onLock = () => { f.identity.active = 'other@school.example'; };
    expect(f.setup).toThrow(/identity could not be verified/);
    expect(f.writes).toEqual([]);
    f.identity.onLock = null;
    f.identity.active = owner;
    f.setup();
    const token = f.props.get(f.tokenKey);
    Object.assign(f.identity, { active: 'other@school.example', effective: 'other@school.example' });
    expect(f.rotate).toThrow(/identity could not be verified/);
    expect(f.props.get(f.tokenKey)).toBe(token);
  });

  it('fails closed on lock contention and atomically revokes the old token during owner reset', () => {
    const f = fixture(kind);
    f.identity.busy = true;
    expect(f.setup).toThrow(/busy/);
    expect(f.writes).toEqual([]);
    f.identity.busy = false;
    f.setup();
    const before = f.props.get(f.tokenKey);
    f.rotate();
    const after = f.props.get(f.tokenKey);
    expect(after).not.toBe(before);
    expect(f.accepts(before)).toBe(false);
    expect(f.accepts(after)).toBe(true);
    expect(f.writes).not.toContainEqual(['delete', f.tokenKey]);
  });
});

it('mailbox owner recovery does not interrupt an active class', () => {
  const f = fixture('mailbox');
  f.setup();
  const before = f.props.get('admin');
  f.props.set('sess_ABCDE', 'synthetic-session-secret|' + Date.now());
  expect(f.rotate).toThrow(/Close active sessions/);
  expect(f.props.get('admin')).toBe(before);
  f.props.set('sess_ABCDE', 'synthetic-session-secret|' + (Date.now() - 7 * 60 * 60 * 1000));
  expect(() => f.rotate()).not.toThrow();
});

it('Walkthrough client cannot fall back to first-caller enrollment against an older server', async () => {
  const sent = [];
  const client = core.createDelivery({ execUrl: 'https://script.google.com/macros/s/SYNTHETIC/exec', post: (...args) => { sent.push(args); return Promise.resolve({ ok: true }); } }).value;
  expect((await client.claim()).ok).toBe(false);
  expect((await client.selfTest()).ok).toBe(false);
  expect(sent).toEqual([]);
});
