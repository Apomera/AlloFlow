// Shell configuration (/allo-shell-config.json) — a deployment-level default
// that may NARROW the app but never widen it.
//
// The rule under test is the one that matters: a static file on a public host
// cannot grant a capability. It is exactly as trustworthy as the URL, which the
// app already treats as "only a routing hint", so anything that GRANTS must
// still come from the assignment packet or the live-session document.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const anti = read('AlloFlowANTI.txt');

// Evaluate the REAL helpers sliced out of ANTI, rather than a copy that could
// drift away from what ships.
const start = anti.indexOf('const ALLO_AI_POLICY_RANK');
const end = anti.indexOf('let _alloShellConfig = null;');
const helpers = new Function(
  anti.slice(start, end) + '\nreturn { tighten: _alloTightenAiPolicy, normalize: _alloNormalizeShellConfig, ROLES: ALLO_SHELL_ROLES };'
)();

describe('tighten-only: a shell config cannot widen what the packet allowed', () => {
  it('cannot hand a student AI their teacher disabled', () => {
    // The whole point. A student who reads the config file and edits it, or a
    // teacher who copies a config from somewhere else, must not be able to
    // re-enable AI on an assignment whose packet said off.
    expect(helpers.tighten('off', 'student-byok')).toBe('off');
    expect(helpers.tighten('pending', 'student-byok')).toBe('pending');
  });

  it('CAN narrow what the packet allowed', () => {
    expect(helpers.tighten('student-byok', 'off')).toBe('off');
    expect(helpers.tighten('pending', 'off')).toBe('off');
    expect(helpers.tighten('student-byok', 'pending')).toBe('pending');
  });

  it('leaves the packet untouched when no ceiling is declared', () => {
    for (const missing of [undefined, null, '']) {
      expect(helpers.tighten('student-byok', missing)).toBe('student-byok');
      expect(helpers.tighten('off', missing)).toBe('off');
    }
  });

  it('collapses an unknown ceiling to off rather than passing the junk onward', () => {
    // A typo in a hand-edited file must fail toward off. It also must not
    // travel onward AS a policy: returning 'yes-please' fails closed by
    // accident, because every consumer compares against 'student-byok', but an
    // accidental safety is not a designed one.
    expect(helpers.tighten('student-byok', 'yes-please')).toBe('off');
    expect(helpers.tighten('student-byok', 42)).toBe('off');
    expect(helpers.tighten('student-byok', {})).toBe('off');
  });

  it('is idempotent, so applying it twice cannot drift', () => {
    const once = helpers.tighten('student-byok', 'off');
    expect(helpers.tighten(once, 'off')).toBe(once);
  });
});

describe('normalization refuses anything it does not understand', () => {
  it('rejects non-objects outright', () => {
    for (const junk of [null, undefined, 'off', 42, ['off']]) {
      expect(helpers.normalize(junk)).toBeNull();
    }
  });

  it('NEVER allows a shell file to force teacher mode', () => {
    // A config that could select teacher mode would hand teacher tools to
    // anyone who loads the page — the opposite of narrowing, and the one role
    // that must always be a deliberate human choice.
    expect(helpers.ROLES).toEqual(['student', 'parent', 'independent']);
    expect(helpers.normalize({ forceRole: 'teacher' })).toBeNull();
  });

  it('accepts the three narrowing roles', () => {
    for (const role of ['student', 'parent', 'independent']) {
      expect(helpers.normalize({ forceRole: role }).forceRole).toBe(role);
    }
  });

  it('drops unknown keys rather than passing them through', () => {
    const out = helpers.normalize({ forceRole: 'student', allowEverything: true, admin: 1 });
    expect(out.allowEverything).toBeUndefined();
    expect(out.admin).toBeUndefined();
  });

  it('only accepts a studentAi ceiling from the known vocabulary', () => {
    expect(helpers.normalize({ ceilings: { studentAi: 'off' } }).ceilings.studentAi).toBe('off');
    expect(helpers.normalize({ ceilings: { studentAi: 'anything' } }).ceilings).toEqual({});
  });

  it('returns null for an empty config, so nothing downstream has to special-case it', () => {
    expect(helpers.normalize({})).toBeNull();
  });
});

describe('the shell role is the WEAKEST signal, and honors the password gate', () => {
  const block = anti.slice(
    anti.indexOf('// ── Shell-configured role (/allo-shell-config.json)'),
    anti.indexOf('const handleStudentEntryConfirm')
  );

  it('yields to student entry, to a family link, and to a role already chosen', () => {
    // A deployment default must never override something more specific that
    // the situation already decided.
    expect(block).toContain('if (_alloShellRoleHandledRef.current || hasSelectedRole) return undefined;');
    expect(block).toContain('if (_alloHasAnyStudentEntry()) return undefined;');
  });

  it('re-checks after the async load, since state can change while fetching', () => {
    expect(block).toContain('if (_alloShellRoleHandledRef.current || hasSelectedRole) return;');
  });

  it('routes through the teacher password gate exactly as a manual click does', () => {
    expect(block).toContain('if (APP_CONFIG._cfg_validation_key) {');
    expect(block).toContain('setPendingRole(cfg.forceRole);');
    expect(block).toContain('setIsGateOpen(true);');
  });
});

describe('the ceiling is applied at the single point policy is decided', () => {
  it('tightens inside the policy normalizer, not at each call site', () => {
    // One place to enforce it means no consumer has to remember to ask, which
    // is the same shape as visibleBody carrying the population rule.
    expect(anti).toContain('normalized = _alloTightenAiPolicy(normalized, _shellCeiling);');
  });

  it('a missing config file leaves behaviour exactly as before', () => {
    // Almost every deployment has no such file. A 404 must be silent and inert.
    expect(anti).toContain("const res = await fetch('/allo-shell-config.json', { cache: 'no-store' });");
    expect(anti).toContain('if (!res.ok) return null;');
  });

  it('ships in BOTH ANTI copies', () => {
    expect(read('desktop/web-app/src/AlloFlowANTI.txt')).toContain('function _alloTightenAiPolicy(');
  });
});
