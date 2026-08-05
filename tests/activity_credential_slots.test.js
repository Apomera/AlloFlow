// One credential per RESPONDENT, not per device.
//
// A shared laptop is normal: a staffroom machine passed round, or one tablet at
// the back of a classroom. The activity client kept exactly ONE credential per
// activity and ensureCredential() always reused it, so the second person to
// answer silently inherited the first person's identity and OVERWROTE their row.
// In a scheduling poll that quietly loses a respondent, and the organizer cannot
// tell it happened.
//
// The server always supported the fix: every joinactivity mints a fresh
// 'mb-<uuid>' and validates it independently. So this is client-side, and the
// store logic is pure so it can be tested without React or a network.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let S;
beforeAll(() => {
  const src = readFileSync('AlloFlowANTI.txt', 'utf8');
  const names = [
    'alloNormalizeCredentialStore',
    'alloCredentialSlotKey',
    'alloCredentialStoreWith',
    'alloActiveCredential',
    'alloCredentialRoster',
  ];
  // Lift just the helpers out of the monolith by brace matching.
  const parts = names.map((name) => {
    const start = src.indexOf(`function ${name}(`);
    if (start < 0) throw new Error(`${name} not found in AlloFlowANTI.txt`);
    let depth = 0, seen = false, end = -1;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
      if (src[i] === '{') { depth++; seen = true; }
      else if (src[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) throw new Error(`could not brace-match ${name}`);
    return src.slice(start, end);
  });
  const versionLine = 'const ALLO_ACTIVITY_CRED_VERSION = 2;';
  if (!src.includes(versionLine)) throw new Error('version constant missing');
  // eslint-disable-next-line no-new-func
  S = new Function(`${versionLine}\n${parts.join('\n')}\n;return {${names.join(',')}};`)();
});

const cred = (n) => ({ uid: `mb-${'a'.repeat(7)}${n}`, pt: `token-${n}` });

describe('reading a stored credential set', () => {
  it('treats junk as an empty set rather than throwing', () => {
    for (const junk of [null, undefined, '', 'not json', '[]', '42']) {
      expect(S.alloNormalizeCredentialStore(junk)).toEqual({ v: 2, active: '', slots: {} });
    }
  });

  it('migrates a legacy single credential instead of logging that person out', () => {
    // The old shape was the bare {uid, pt}. Someone mid-answer when the upgrade
    // lands must keep their row.
    const store = S.alloNormalizeCredentialStore(JSON.stringify({ uid: 'mb-legacy1', pt: 'tok' }));
    expect(store.active).toBe('s1');
    expect(store.slots.s1).toMatchObject({ uid: 'mb-legacy1', pt: 'tok' });
    expect(S.alloActiveCredential(store)).toMatchObject({ uid: 'mb-legacy1' });
  });

  it('drops malformed slots but keeps the good ones', () => {
    const store = S.alloNormalizeCredentialStore({
      v: 2, active: 'n:sam',
      slots: { 'n:sam': cred(1), 'n:broken': { uid: 'mb-x' }, 'n:jo': cred(2) },
    });
    expect(Object.keys(store.slots).sort()).toEqual(['n:jo', 'n:sam']);
  });

  it('falls back to a real slot when active points at nothing', () => {
    const store = S.alloNormalizeCredentialStore({ v: 2, active: 'n:ghost', slots: { 'n:sam': cred(1) } });
    expect(store.active).toBe('n:sam');
  });
});

describe('keying a respondent', () => {
  it('keys a named respondent on their name, so returning finds their row', () => {
    expect(S.alloCredentialSlotKey('real_name', 'Sam R.', null)).toBe('n:sam r.');
    // Case and padding must not create a second identity for the same person.
    expect(S.alloCredentialSlotKey('real_name', '  SAM r.  ', null)).toBe('n:sam r.');
  });

  it('gives every anonymous start a fresh slot', () => {
    // Linking a return visit to an earlier row is exactly the linkage anonymous
    // mode promises not to keep, so it cannot key on anything stable.
    const empty = { v: 2, active: '', slots: {} };
    expect(S.alloCredentialSlotKey('anonymous', 'ignored', empty)).toBe('s1');
    const one = S.alloCredentialStoreWith(empty, 's1', cred(1), '');
    expect(S.alloCredentialSlotKey('anonymous', 'ignored', one)).toBe('s2');
  });

  it('falls back to a fresh slot when a named respondent gives no name', () => {
    expect(S.alloCredentialSlotKey('real_name', '   ', { v: 2, active: '', slots: {} })).toBe('s1');
  });
});

describe('two people on one device', () => {
  it('keeps both, and does not evict the first', () => {
    // The whole point of the change.
    let store = S.alloCredentialStoreWith(null, 'n:sam', cred(1), 'Sam R.');
    store = S.alloCredentialStoreWith(store, 'n:jo', cred(2), 'Jo P.');

    expect(Object.keys(store.slots).sort()).toEqual(['n:jo', 'n:sam']);
    expect(store.slots['n:sam'].uid).toBe(cred(1).uid);
    expect(store.slots['n:jo'].uid).toBe(cred(2).uid);
    // Two DISTINCT server identities, which is what stops one row overwriting
    // the other.
    expect(store.slots['n:sam'].uid).not.toBe(store.slots['n:jo'].uid);
  });

  it('makes the newest respondent active without losing the others', () => {
    let store = S.alloCredentialStoreWith(null, 'n:sam', cred(1), 'Sam R.');
    store = S.alloCredentialStoreWith(store, 'n:jo', cred(2), 'Jo P.');
    expect(S.alloActiveCredential(store).uid).toBe(cred(2).uid);
    expect(store.slots['n:sam']).toBeTruthy();
  });

  it('lets a named respondent come back and reclaim their own row', () => {
    const samKey = S.alloCredentialSlotKey('real_name', 'Sam R.', null);
    let store = S.alloCredentialStoreWith(null, samKey, cred(1), 'Sam R.');
    store = S.alloCredentialStoreWith(store, 'n:jo', cred(2), 'Jo P.');
    // Sam returns to change their answer: same key, same uid, no second row.
    const key = S.alloCredentialSlotKey('real_name', 'Sam R.', store);
    expect(key).toBe(samKey);
    store = S.alloCredentialStoreWith(store, key, store.slots[key], 'Sam R.');
    expect(S.alloActiveCredential(store).uid).toBe(cred(1).uid);
    expect(Object.keys(store.slots).length).toBe(2);
  });

  it('lists who has answered on this device', () => {
    let store = S.alloCredentialStoreWith(null, 'n:sam', cred(1), 'Sam R.');
    store = S.alloCredentialStoreWith(store, 'n:jo', cred(2), 'Jo P.');
    const roster = S.alloCredentialRoster(store);
    expect(roster.map((r) => r.label).sort()).toEqual(['Jo P.', 'Sam R.']);
    expect(roster.filter((r) => r.active).length).toBe(1);
  });

  it('keeps anonymous respondents separate with no names at all', () => {
    let store = S.alloCredentialStoreWith(null, 's1', cred(1), '');
    const next = S.alloCredentialSlotKey('anonymous', '', store);
    store = S.alloCredentialStoreWith(store, next, cred(2), '');
    expect(Object.keys(store.slots).sort()).toEqual(['s1', 's2']);
    expect(S.alloActiveCredential(store).uid).toBe(cred(2).uid);
  });
});

describe('the monolith actually uses it', () => {
  it('ensureCredential reads the active slot, not a bare credential', () => {
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain('const saved = alloActiveCredential(localStorage.getItem(storageKey));');
      // The old shape would silently reintroduce the overwrite bug.
      expect(src, f).not.toContain("const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');");
      expect(src, f).toContain('const startNewRespondent = React.useCallback(');
    }
  });
});
