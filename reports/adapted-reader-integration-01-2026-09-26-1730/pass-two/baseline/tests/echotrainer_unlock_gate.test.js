import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// isEnvUnlocked compared its requirement string against five exact spellings and
// ended in `return true`, so any requirement it did not recognise — a new tier, or a
// typo in an existing one — unlocked the environment for everyone. A locked-content
// check must fail closed.

const sourcePath = 'stem_lab/stem_tool_echotrainer.js';
const read = () => fs.readFileSync(sourcePath, 'utf8');

function loadGate(unlockTable) {
  const src = read().replace(/\r\n/g, '\n');
  const tableStart = src.indexOf('  var ENV_UNLOCK = {');
  const gateStart = src.indexOf('  /**\n   * Goals needed to unlock an environment');
  const gateEnd = src.indexOf('  // ── Material glow colors', gateStart);
  expect(tableStart, 'ENV_UNLOCK table').toBeGreaterThan(-1);
  expect(gateStart, 'unlock gate').toBeGreaterThan(-1);
  expect(gateEnd).toBeGreaterThan(gateStart);
  const table = unlockTable
    ? 'var ENV_UNLOCK = ' + JSON.stringify(unlockTable) + ';'
    : src.slice(tableStart, src.indexOf('\n  };', tableStart) + 5);
  const out = {};
  new Function('exports', table + '\n' + src.slice(gateStart, gateEnd) + `
    exports.isEnvUnlocked = isEnvUnlocked;
    exports.envUnlockThreshold = envUnlockThreshold;
    exports.ENV_UNLOCK = ENV_UNLOCK;
  `)(out);
  return out;
}

describe('Echo Navigator — environment unlock gate', () => {
  it('opens the starter environment with no progress', () => {
    const g = loadGate();
    expect(g.isEnvUnlocked('simple_room', { goalsFound: 0 })).toBe(true);
    expect(g.isEnvUnlocked('simple_room', {})).toBe(true);
    expect(g.isEnvUnlocked('simple_room', null)).toBe(true);
  });

  it('honours each existing tier exactly', () => {
    const g = loadGate();
    const tiers = { corridor: 1, cave: 1, forest: 2, urban: 3, school: 3, grocery: 5, park: 5, challenge: 8 };
    for (const [env, need] of Object.entries(tiers)) {
      expect(g.envUnlockThreshold(env), env + ' threshold').toBe(need);
      expect(g.isEnvUnlocked(env, { goalsFound: need - 1 }), env + ' below').toBe(false);
      expect(g.isEnvUnlocked(env, { goalsFound: need }), env + ' at').toBe(true);
      expect(g.isEnvUnlocked(env, { goalsFound: need + 10 }), env + ' above').toBe(true);
    }
  });

  it('parses a tier that was never hardcoded, instead of unlocking it', () => {
    // The old chain had no branch for 12, so it fell through to `return true`.
    const g = loadGate({ hard_mode: { requires: 'goalsFound >= 12', label: 'Find 12 goals' } });
    expect(g.envUnlockThreshold('hard_mode')).toBe(12);
    expect(g.isEnvUnlocked('hard_mode', { goalsFound: 11 })).toBe(false);
    expect(g.isEnvUnlocked('hard_mode', { goalsFound: 12 })).toBe(true);
  });

  it('fails closed on an unparseable requirement', () => {
    const g = loadGate({ typo: { requires: 'goalsFund >= 3', label: 'oops' } });
    expect(g.isEnvUnlocked('typo', { goalsFound: 0 })).toBe(false);
    expect(g.isEnvUnlocked('typo', { goalsFound: 999 })).toBe(false);
  });

  it('tolerates spacing variations in the requirement', () => {
    const g = loadGate({ spaced: { requires: 'goalsFound>=4', label: 'x' } });
    expect(g.envUnlockThreshold('spaced')).toBe(4);
    expect(g.isEnvUnlocked('spaced', { goalsFound: 4 })).toBe(true);
  });

  it('treats an unknown environment id as open, as before', () => {
    const g = loadGate();
    // Not in the table at all means no gate was ever declared for it.
    expect(g.isEnvUnlocked('does_not_exist', { goalsFound: 0 })).toBe(true);
  });
});

describe('Echo Navigator — environment picker is translatable', () => {
  it('localises names, descriptions and unlock hints at the point of use', () => {
    const source = read();
    // ENVIRONMENTS and ENV_UNLOCK are module-scope tables with no translator in
    // scope, so the picker resolves them by id when it renders.
    expect(source).toMatch(/var envName = t\('stem\.echotrainer\.env_' \+ env\.id \+ '_name', env\.name\)/);
    expect(source).toMatch(/var envDesc = t\('stem\.echotrainer\.env_' \+ env\.id \+ '_desc', env\.desc\)/);
    expect(source).toMatch(/var envHint = t\('stem\.echotrainer\.unlock_' \+ env\.id/);
  });

  it('uses the localised values in every place the picker shows them', () => {
    const source = read();
    for (const key of ['aria_env_open', 'aria_env_locked', 'title_env_locked']) {
      expect(source, key).toContain('stem.echotrainer.' + key);
    }
    // The raw table fields must no longer be concatenated into user-visible strings.
    expect(source).not.toMatch(/env\.name \+ ': ' \+ env\.desc/);
    expect(source).not.toMatch(/'Locked: ' \+ \(ENV_UNLOCK/);
    // Including the announcement made when an environment is chosen.
    expect(source).toMatch(/\{ name: envName, desc: envDesc, mode: is3D \?/);
  });

  it('routes the last two ternary-shaped announcements through the translator', () => {
    const source = read();
    for (const key of ['sr_multibounce_off', 'sr_multibounce_on', 'sr_waypoint_on', 'sr_waypoint_off']) {
      expect(source, key).toContain('stem.echotrainer.' + key);
    }
    expect(source).not.toMatch(/announceToSR\(multiBounce \? 'Multi-bounce/);
    expect(source).not.toMatch(/announceToSR\(newMode \? 'Waypoint challenge ON/);
  });
});
