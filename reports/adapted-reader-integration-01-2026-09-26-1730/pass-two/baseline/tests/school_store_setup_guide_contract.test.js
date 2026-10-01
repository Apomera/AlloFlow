import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const require2 = createRequire(import.meta.url);
const { createSchoolStoreSetupGuide } = require2(resolve(process.cwd(), 'school_store_setup_guide.js'));
const targets = ['practice', 'connection', 'launch', 'check', 'approval', 'handoff', 'files', 'configuration', 'deploy'];

describe('shared School Store setup guide contract', () => {
  it('exposes only three immutable paths with working manual anchors and fixed targets', () => {
    const guide = createSchoolStoreSetupGuide();
    const manual = read('school-rewards-manual.html');
    expect(guide.getPaths().map(p => p.id)).toEqual(['practice', 'join', 'setup']);
    expect(Object.isFrozen(guide)).toBe(true);
    expect(Object.isFrozen(guide.getPaths())).toBe(true);
    for (const path of guide.getPaths()) {
      expect(guide.getPath(path.id)).toBe(path);
      expect(Object.isFrozen(path)).toBe(true);
      expect(Object.isFrozen(path.steps)).toBe(true);
      expect(new Set(path.steps.map(s => s.id)).size).toBe(path.steps.length);
      for (const step of path.steps) {
        expect(Object.isFrozen(step)).toBe(true);
        expect(targets).toContain(step.target);
        expect(manual).toContain('id="' + step.manualHash + '"');
      }
    }
    for (const invalid of ['', 'JOIN', '__proto__', 'constructor', 'https://example.test/', null, {}]) {
      expect(guide.getPath(invalid)).toBe(null);
    }
  });

  it('does not use browser capabilities or identities', () => {
    expect(read('school_store_setup_guide.js')).not.toMatch(/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|navigator|document|window)\b/);
    expect(JSON.stringify(createSchoolStoreSetupGuide().getPaths())).not.toMatch(/https?:\/\//);
  });

  it('provides fixed, frozen local troubleshooting topics with valid manual sections', () => {
    const topics = createSchoolStoreSetupGuide().getTroubleshooting();
    expect(topics.map(topic => topic.id)).toEqual(['new-tab', 'sign-in', 'role-access', 'address', 'connections']);
    expect(Object.isFrozen(topics)).toBe(true);
    for (const topic of topics) {
      expect(Object.isFrozen(topic)).toBe(true);
      expect(Object.keys(topic)).toEqual(['id', 'title', 'body', 'manualHash']);
      expect(read('school-rewards-manual.html')).toContain('id="' + topic.manualHash + '"');
      expect(topic.body.length).toBeGreaterThan(40);
    }
    expect(JSON.stringify(topics)).not.toMatch(/https?:\/\//);
  });

  for (const moduleName of ['school_rewards', 'udl_chat', 'allo_commands']) {
    it('embeds the same guide and has an exact desktop mirror: ' + moduleName, () => {
      const built = read(moduleName + '_module.js');
      expect(built.replace(/\r\n/g, '\n')).toContain(read('school_store_setup_guide.js').replace(/\r\n/g, '\n').trim());
      expect(read('desktop/web-app/public/' + moduleName + '_module.js')).toBe(built);
    });
  }
});

describe.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'])('host setup navigation: %s', (file) => {
  const source = read(file);
  const match = source.match(/openSchoolStoreGuide: \(path\) => \{([\s\S]*?)\n      \},/);
  function host(flags = {}) {
    expect(match).toBeTruthy();
    let state = { path: null, serial: 4 };
    const open = vi.fn();
    const set = vi.fn(fn => { state = fn(state); });
    const call = new Function('path', 'isTeacherMode', 'isStudentLinkMode', 'isParentMode', 'isIndependentMode', 'handleOpenSchoolRewards', 'setSchoolRewardsGuide', match[1]);
    return { open, set, state: () => state, call: path => call(path, flags.teacher !== false, !!flags.student, !!flags.parent, !!flags.independent, open, set) };
  }
  it('only navigates to a fixed path and refreshes repeated guide requests', () => {
    const h = host();
    expect(h.call('join')).toBe(true);
    expect(h.state()).toEqual({ path: 'join', serial: 5 });
    expect(h.call('join')).toBe(true);
    expect(h.state()).toEqual({ path: 'join', serial: 6 });
    expect(h.open).toHaveBeenCalledTimes(2);
    expect(match[1]).not.toMatch(/fetch|localStorage|postMessage|location|grant|savePortalUrl/);
  });
  it('fails closed for student, parent, independent, and unrecognized paths', () => {
    for (const flags of [{ teacher: false }, { student: true }, { parent: true }, { independent: true }]) {
      const h = host(flags);
      expect(h.call('setup')).toBe(false);
      expect(h.open).not.toHaveBeenCalled();
      expect(h.set).not.toHaveBeenCalled();
    }
    for (const path of [null, '', 'admin', 'JOIN', {}, '__proto__', 'https://example.test/']) {
      const h = host();
      expect(h.call(path)).toBe(false);
      expect(h.open).not.toHaveBeenCalled();
      expect(h.set).not.toHaveBeenCalled();
    }
  });
  it('wires guide state into the actual AlloFlow panel and resets ordinary opens', () => {
    expect(source).toContain('initialPath: schoolRewardsGuide.path');
    expect(source).toContain('initialGuide: Boolean(schoolRewardsGuide.path)');
    expect(source).toContain('guideRequestSerial: schoolRewardsGuide.serial');
    expect(source).toMatch(/handleOpenSchoolRewards = React\.useCallback\(\(\) => \{\s*setSchoolRewardsGuide\(current => \(\{ path: null, serial: current\.serial \+ 1 \}\)\);/);
  });
});
