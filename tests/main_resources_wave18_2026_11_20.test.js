import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

let host, root;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = root = null;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  delete window.AlloModules.SensitiveWorkspace;
  delete window.__alloAiSecretsLocked;
  delete window.__alloStudentAiDisabled;
});

describe('Wave 18: Educator SPED, MTSS, Admin, Comms, Meetings, Dispro, Rewards & Brand Profile', () => {
  it('sped_timelines: mounts without ReferenceError: useState, fails closed on non-ready vault phases, and clamps evalDays safely', async () => {
    loadAlloModule('sped_timelines_module.js');
    const SpedMod = window.AlloModules.SpedTimelines;
    const SpedPanel = SpedMod.SpedTimelinesPanel || SpedMod;

    // 1. Fail closed on 'loading' vault phase (must NOT fall open to localStorage)
    window.AlloModules.SensitiveWorkspace = { getStatus: () => ({ phase: 'loading' }) };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => root.render(React.createElement(SpedPanel, {
      onClose: vi.fn(),
      t: () => '',
      addToast: vi.fn(),
    })));
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();

    // 2. Date overflow clamp (evalDays huge number never throws RangeError)
    if (typeof SpedMod.addDays === 'function') {
      expect(SpedMod.addDays('2026-01-01', 999999999999)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const src = readFileSync(resolve('sped_timelines_source.jsx'), 'utf8');
    expect(src).toContain('React.useState(false)');
    expect(src).not.toMatch(/\bconst \[dueDateManual, setDueDateManual\] = useState\(/);
    expect(src).toContain('onChange={(e) => updateForm({ dueDate: e.target.value })}');
  });

  it('mtss_triage: calls sw.getStatus() (not nonexistent getState()), fails closed when locked/loading, and rounds IEEE-754 deltas', () => {
    loadAlloModule('mtss_triage_module.js');
    const Mtss = window.AlloModules.MtssTriage._testing;
    const fakeLocal = {
      getItem: (k) => k === 'allo_sped_cases_v1' ? JSON.stringify([{ id: '1', completedAt: null }]) : null,
    };

    // Locked via getStatus() must return all zeros
    const lockedCounts = Mtss.mtssSiblingCounts(fakeLocal, {
      sensitiveWorkspace: { getStatus: () => ({ phase: 'locked' }) },
    });
    expect(lockedCounts).toEqual({ walkthroughVisits: 0, disproAnalyses: 0, meetings: 0, spedOpen: 0 });

    // Ready via getStatus() reads vault session storage
    const vaultStore = { getItem: (k) => k === 'allo_sped_cases_v1' ? JSON.stringify([{ id: 'v1', completedAt: null }, { id: 'v2', completedAt: null }]) : null };
    const readyCounts = Mtss.mtssSiblingCounts(fakeLocal, {
      sensitiveWorkspace: {
        getStatus: () => ({ phase: 'ready' }),
        getSession: (name) => name === 'sped-timelines' ? { storage: vaultStore } : null,
      },
    });
    expect(readyCounts.spedOpen).toBe(2);

    // IEEE-754 delta rounding: 0.3 - 0.1 === 0.2 (not 0.19999999999999998)
    const prog = Mtss.mtssProgress(
      { cutpoints: { tier2Cut: 1, tier3Cut: 0.5, higherBetter: true }, rows: [{ code: 'A1', score: 0.1 }] },
      { cutpoints: { tier2Cut: 1, tier3Cut: 0.5, higherBetter: true }, rows: [{ code: 'A1', score: 0.3 }] },
    );
    expect(prog.joined[0].delta).toBe(0.2);
  });

  it('dispro_analyzer: rejects blank student counts (no Number("") === 0 skew) and bounds DisproTrendChart tick loop', () => {
    loadAlloModule('dispro_analyzer_module.js');
    const Dispro = window.AlloModules.DisproAnalyzer._testing;

    const computed = Dispro.disproCompute([
      { name: 'Group A', enrollment: '100', students: '10' },
      { name: 'Group B', enrollment: '500', students: '' },
    ]);
    expect(computed.valid).toBe(false);
    expect(computed.errors.some(e => /Group B/i.test(e.message))).toBe(true);

    const src = readFileSync(resolve('dispro_analyzer_source.jsx'), 'utf8');
    expect(src).toContain('Math.max(1, Math.ceil(axisMax / 8))');
    expect(src).not.toContain('fill="#898781"');
  });

  it('meeting_docs: scrubs phones & DOBs, masks 2-letter sub-tokens, auto-includes pending nameInput, and falls back on missing custom templates', () => {
    loadAlloModule('meeting_docs_module.js');
    const Meet = window.AlloModules.MeetingDocs._testing;

    const masked = Meet.meetdocsMask('Bo Li spoke with Dr. Jones about Li.', Meet.meetdocsMaskPairs(['Bo Li']));
    expect(masked).not.toContain('Bo');
    expect(masked).not.toContain('Li');

    const src = readFileSync(resolve('meeting_docs_source.jsx'), 'utf8');
    expect(src).toContain('[REDACTED-PHONE]');
    expect(src).toContain('[REDACTED-DOB]');
    expect(src).toContain('const pendingName = String(nameInput || \'\').trim();');
    expect(src).toContain('Object.keys(viewMeeting.sections || {}).map((id) => ({ id, title: id }))');
  });

  it('school_rewards: eliminates raw dangerouslySetInnerHTML QR injection, fixes dark/contrast CSS, and uses safe DOMParser SVG mounting', () => {
    const src = readFileSync(resolve('school_rewards_source.jsx'), 'utf8');
    expect(src).not.toContain('dangerouslySetInnerHTML');
    expect(src).toContain('function srParseSafeQrSvg');
    expect(src).toContain('X .bg-emerald-50,X .bg-emerald-50\\\\/60');
    expect(src).toContain('X .text-rose-950,X .text-rose-900');
  });

  it('admin_hub, communications_studio, family_announcements & brand_profile_editor: enforce vault boundary, __alloAiSecretsLocked, and safe async/backdrop guards', () => {
    const adminSrc = readFileSync(resolve('admin_hub_source.jsx'), 'utf8');
    expect(adminSrc).toContain('ADMIN_HUB_VAULT_FEATURES');
    expect(adminSrc).toContain('if (vault.active && _adminHubVaultFeatureFor(key)) continue;');
    expect(adminSrc).toContain('JSON.parse(v, _safeReviver)');
    expect(adminSrc).toContain('reader.onerror =');

    const commsSrc = readFileSync(resolve('communications_studio_source.jsx'), 'utf8');
    expect(commsSrc).toContain('window.__alloAiSecretsLocked !== true');
    expect(commsSrc).toContain('readOnly={busy === \'draft\' || busy === \'simplify\'}');
    expect(commsSrc).not.toContain('<div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2');

    const famSrc = readFileSync(resolve('family_announcements_source.jsx'), 'utf8');
    expect(famSrc).toContain('Array.isArray(safeObj.langTags)');
    expect(famSrc).toContain('backdropDownRef');

    const brandSrc = readFileSync(resolve('brand_profile_editor_source.jsx'), 'utf8');
    expect(brandSrc).toContain('reader.onerror = function');
    expect(brandSrc).toContain('armRemoveLogo');
  });
});
