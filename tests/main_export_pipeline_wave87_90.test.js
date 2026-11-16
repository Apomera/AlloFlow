// Verification suite for Waves 87-90:
// - Wave 87: SchoolRewards CSV UTF-8 BOM hardening (srRosterTemplateCsv & srRecognitionCsv downloads)
//            and Word Sounds printable answer-key popup wsOpenKey() window.opener = null isolation
// - Wave 88: Leadership Hub modals (AdminHubPanel, DisproAnalyzerPanel, MtssTriagePanel,
//            SpedTimelinesPanel, UdlWalkthroughPanel, MeetingDocsPanel, SchoolRewardsPanel,
//            EducatorEvaluationPanel, MaineSldPracticePanel) re-render focus retention,
//            ancestor-chain background inert/aria-hidden isolation, scroll lock, IME Escape
//            guards, Shift+Tab wrap from dialog, and opener restoration
// - Wave 89: Educator & Classroom Studio modals (CommunicationsStudioPanel,
//            FamilyAnnouncementsPanel, AnchorChartView interactive dialog, BrandProfileEditor)
//            re-render focus retention, ancestor-chain inert isolation (preserving nested
//            delete/onboarding/review overlays), scroll lock, and opener restoration
// - Wave 90: Content-hash loader pins (?v=), 4-mirror SHA-256 parity across all 14 updated
//            modules (+ standalone bundle), 3-host browser delivery manifest sync, and
//            verifyReaderRelease gate

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');
const { verifyReaderRelease } = require('../dev-tools/check_reader_release.cjs');
const { readEmbeddedManifest } = require('../dev-tools/build_browser_delivery_manifest.cjs');

let React;
let ReactDOMClient;
let act;
let originalBlob;
let LanguageContext;

const activeRoots = [];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sha384Integrity(filePath) {
  return 'sha384-' + createHash('sha384').update(readFileSync(filePath)).digest('base64');
}

function mountWithBackdrop(element) {
  const opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = 'Open tool';
  const main = document.createElement('main');
  main.id = 'app-main-surface';
  const bgBtn = document.createElement('button');
  bgBtn.type = 'button';
  bgBtn.textContent = 'Background button';
  main.appendChild(bgBtn);
  const scriptEl = document.createElement('script');
  scriptEl.type = 'application/json';
  document.body.appendChild(opener);
  document.body.appendChild(main);
  document.body.appendChild(scriptEl);
  opener.focus();

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  activeRoots.push({ root, host });
  act(() => {
    root.render(element);
  });
  return {
    opener,
    main,
    scriptEl,
    host,
    root,
    rerender(nextEl) {
      act(() => {
        root.render(nextEl);
      });
    },
    unmount() {
      const idx = activeRoots.findIndex((entry) => entry.root === root);
      if (idx >= 0) activeRoots.splice(idx, 1);
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function dispatchKey(target, init) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  if (init && init.keyCode != null) {
    Object.defineProperty(event, 'keyCode', { get: () => init.keyCode });
  }
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

beforeAll(() => {
  React = require(resolve(mdDir, 'react'));
  ReactDOMClient = require(resolve(mdDir, 'react-dom/client'));
  ({ act } = require(resolve(mdDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  originalBlob = globalThis.Blob;

  window.AlloModules = window.AlloModules || {};
  LanguageContext = window.AlloLanguageContext = React.createContext({
    t: (k, d) => (typeof d === 'string' ? d : k),
    currentUiLanguage: 'English',
  });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.__alloShared = { safeGetItem: () => null, safeSetItem: () => {}, warnLog: () => {} };
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  for (const mod of [
    'voice_module.js',
    'brand_profile_module.js',
    'school_rewards_module.js',
    'dispro_analyzer_module.js',
    'mtss_triage_module.js',
    'sped_timelines_module.js',
    'udl_walkthrough_module.js',
    'meeting_docs_module.js',
    'educator_evaluation_module.js',
    'admin_hub_module.js',
    'communications_studio_module.js',
    'family_announcements_module.js',
    'anchor_charts_module.js',
    'brand_profile_editor_module.js',
    'maine_sld_practice_module.js',
  ]) {
    loadAlloModule(mod);
  }
});

afterEach(() => {
  vi.useRealTimers();
  while (activeRoots.length) {
    const { root, host } = activeRoots.pop();
    act(() => {
      root.unmount();
    });
    host.remove();
  }
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  localStorage.clear();
  sessionStorage.clear();
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  vi.restoreAllMocks();
});

describe('Wave 87: SchoolRewards CSV UTF-8 BOM & Word Sounds wsOpenKey opener isolation', () => {
  it('SchoolRewardsPanel prepends UTF-8 BOM on both roster-template and recognition-worksheet CSV downloads', () => {
    vi.useFakeTimers();
    const captured = [];
    class CaptureBlob {
      constructor(parts, opts) {
        this.text = parts.map(String).join('');
        this.type = opts && opts.type ? opts.type : '';
        captured.push(this);
      }
    }
    vi.stubGlobal('Blob', CaptureBlob);
    window.Blob = CaptureBlob;
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:sr';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sr-1');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function onAnchorClick() {
      downloads.push(this.download);
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, text: async () => '' });

    // Seed a classroom roster under the real key read by srReadClassroomRoster
    localStorage.setItem(
      'alloflow_roster_key',
      JSON.stringify({
        classId: 'CLS-1',
        groups: { g1: { name: 'Room 101' } },
        students: { 'Azure Fox': 'g1' },
      })
    );

    const { SchoolRewardsPanel } = window.AlloModules.SchoolRewards;
    const { host } = mountWithBackdrop(
      React.createElement(SchoolRewardsPanel, {
        isOpen: true,
        initialPath: 'setup',
        portalUrl: 'https://script.google.com/macros/s/AKfycbxyz_123-abc/exec',
        onClose: () => {},
        addToast: () => {},
        t: () => null,
        recognition: {
          sessionCode: 'ABC123',
          generatedAt: 1,
          rows: [
            {
              codename: '|Azure Fox',
              total: 2,
              reasons: [{ label: 'Persistence', count: 2 }],
              lastAt: 1756800000000,
            },
          ],
        },
      })
    );

    // Select group g1 and download roster template CSV
    const groupCheckbox = host.querySelector('[data-help-key="schoolrewards_roster_group"]');
    expect(groupCheckbox).toBeTruthy();
    act(() => groupCheckbox.click());

    const rosterBtn = host.querySelector('[data-help-key="schoolrewards_roster_download"]');
    expect(rosterBtn).toBeTruthy();
    act(() => rosterBtn.click());

    const worksheetSection = host.querySelector('[data-help-key="schoolrewards_recognition_worksheet"]');
    expect(worksheetSection).toBeTruthy();
    const worksheetBtn = Array.from(worksheetSection.querySelectorAll('button')).find((b) =>
      /download|csv|export/i.test(b.textContent || '')
    );
    expect(worksheetBtn).toBeTruthy();
    act(() => worksheetBtn.click());

    expect(captured.length).toBeGreaterThanOrEqual(2);
    expect(captured[0].type).toBe('text/csv;charset=utf-8');
    expect(captured[0].text.charCodeAt(0)).toBe(0xfeff);
    expect(downloads[0]).toBe('school-rewards-roster-template.csv');

    expect(captured[1].type).toBe('text/csv;charset=utf-8');
    expect(captured[1].text.charCodeAt(0)).toBe(0xfeff);
    expect(downloads[1]).toBe('school-rewards-recognition-worksheet.csv');

    vi.advanceTimersByTime(1500);
    expect(revokeSpy).toHaveBeenCalledWith('blob:sr-1');
  });

  it('Word Sounds embedded printable answer-key script wsOpenKey() severs window.opener', () => {
    const wsSrc = readFileSync(resolve(ROOT, 'word_sounds_module.js'), 'utf8');
    const idx = wsSrc.indexOf('function wsOpenKey()');
    expect(idx).toBeGreaterThan(0);
    const snippet = wsSrc.slice(idx, idx + 420);
    expect(snippet).toContain('try{w.opener=null;}catch(e){}');
  });
});

describe('Wave 88: Leadership Hub modals focus retention across re-renders, background inert isolation & IME Escape', () => {
  it('DisproAnalyzer, MtssTriage, SpedTimelines, UdlWalkthrough, MeetingDocs, and AdminHub retain input focus across inline onClose re-renders and isolate background siblings', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, text: async () => '' });
    const panels = [
      {
        name: 'DisproAnalyzer',
        Comp: window.AlloModules.DisproAnalyzer.DisproAnalyzerPanel,
        focusSel: 'input[type="text"], input:not([type="checkbox"])',
      },
      {
        name: 'MtssTriage',
        Comp: window.AlloModules.MtssTriage.MtssTriagePanel,
        focusSel: '#mtss-t2',
      },
      {
        name: 'SpedTimelines',
        Comp: window.AlloModules.SpedTimelines.SpedTimelinesPanel,
        focusSel: 'button[role="tab"]',
      },
      {
        name: 'UdlWalkthrough',
        Comp: window.AlloModules.UdlWalkthrough.UdlWalkthroughPanel,
        focusSel: 'button[role="tab"]',
      },
      {
        name: 'MeetingDocs',
        Comp: window.AlloModules.MeetingDocs.MeetingDocsPanel,
        focusSel: 'button[role="tab"]',
      },
      {
        name: 'AdminHub',
        Comp: window.AlloModules.AdminHub.AdminHubPanel,
        focusSel: '[data-help-key="adminhub_drive_setup_open"]',
      },
    ];

    for (const { name, Comp, focusSel } of panels) {
      const closes = [];
      const m = mountWithBackdrop(
        React.createElement(Comp, {
          isOpen: true,
          onClose: () => closes.push(name + ':1'),
          openTool: () => {},
          addToast: () => {},
          t: () => null,
        })
      );
      const dialog = m.host.querySelector('[role="dialog"]');
      expect(dialog, `${name} dialog`).not.toBeNull();
      expect(m.main.hasAttribute('inert'), `${name} main inert`).toBe(true);
      expect(m.main.getAttribute('aria-hidden'), `${name} main aria-hidden`).toBe('true');
      expect(m.scriptEl.hasAttribute('inert'), `${name} script excluded`).toBe(false);
      expect(document.body.style.overflow, `${name} scroll lock`).toBe('hidden');

      const control = dialog.querySelector(focusSel);
      expect(control, `${name} focus target`).not.toBeNull();
      act(() => control.focus());
      expect(document.activeElement, `${name} focused control`).toBe(control);

      // Re-render with a fresh inline onClose closure — focus must NOT reset to the first button!
      m.rerender(
        React.createElement(Comp, {
          isOpen: true,
          onClose: () => closes.push(name + ':2'),
          openTool: () => {},
          addToast: () => {},
          t: () => null,
        })
      );
      expect(document.activeElement, `${name} retains focus across re-render`).toBe(control);

      // Shift+Tab from dialog itself wraps to last focusable item
      act(() => dialog.focus());
      dispatchKey(dialog, { key: 'Tab', shiftKey: true });
      expect(dialog.contains(document.activeElement), `${name} Shift+Tab stays inside`).toBe(true);
      expect(document.activeElement, `${name} Shift+Tab moves off dialog`).not.toBe(dialog);

      // IME Escape ignored; real Escape invokes updated callback
      dispatchKey(dialog, { key: 'Escape', isComposing: true });
      dispatchKey(dialog, { key: 'Escape', keyCode: 229 });
      expect(closes, `${name} IME Escape ignored`).toEqual([]);
      dispatchKey(dialog, { key: 'Escape' });
      expect(closes, `${name} Escape uses latest onClose`).toEqual([name + ':2']);

      m.unmount();
      expect(m.main.hasAttribute('inert'), `${name} restores inert`).toBe(false);
      expect(m.main.getAttribute('aria-hidden'), `${name} restores aria-hidden`).toBeNull();
      expect(document.body.style.overflow, `${name} restores overflow`).toBe('');
      expect(document.activeElement, `${name} restores opener`).toBe(m.opener);
      document.body.innerHTML = '';
    }
  });

  it('EducatorEvaluationPanel and MaineSldPracticePanel isolate host background without inerting internal onboarding/confirm dialogs', () => {
    // 1. EducatorEvaluationPanel (mounts AeLocalOnboarding sibling inside .ae-shell on fresh storage)
    const aeCloses = [];
    const aeMount = mountWithBackdrop(
      React.createElement(window.AlloModules.EducatorEvaluation.EducatorEvaluationPanel, {
        onClose: () => aeCloses.push('ae-closed'),
      })
    );
    expect(aeMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    const onboarding = aeMount.host.querySelector('.ae-onboarding-overlay');
    expect(onboarding).not.toBeNull();
    // Internal AeLocalOnboarding sibling inside .ae-shell must NOT be inerted!
    expect(onboarding.hasAttribute('inert')).toBe(false);
    aeMount.unmount();
    expect(aeMount.main.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(aeMount.opener);
    document.body.innerHTML = '';

    // 2. MaineSldPracticePanel
    const sldCloses = [];
    const sldMount = mountWithBackdrop(
      React.createElement(window.AlloModules.MaineSldPractice.MaineSldPracticePanel, {
        onClose: () => sldCloses.push('sld:1'),
        t: (_k, d) => d,
      })
    );
    expect(sldMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    sldMount.rerender(
      React.createElement(window.AlloModules.MaineSldPractice.MaineSldPracticePanel, {
        onClose: () => sldCloses.push('sld:2'),
        t: (_k, d) => d,
      })
    );
    const sldDialog = sldMount.host.querySelector('[data-testid="maine-sld-panel"]');
    dispatchKey(sldDialog, { key: 'Escape', isComposing: true });
    expect(sldCloses).toEqual([]);
    dispatchKey(sldDialog, { key: 'Escape' });
    expect(sldCloses).toEqual(['sld:2']);
    sldMount.unmount();
    expect(sldMount.main.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(sldMount.opener);
  });
});

describe('Wave 89: Educator & Classroom Studio modals focus retention & nested dialog safety', () => {
  it('CommunicationsStudio, FamilyAnnouncements, AnchorChart interactive dialog, and BrandProfileEditor isolate background siblings and preserve nested dialogs', () => {
    // 1. CommunicationsStudioPanel
    const commsCloses = [];
    const commsMount = mountWithBackdrop(
      React.createElement(window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel, {
        isOpen: true,
        onClose: () => commsCloses.push('comms:1'),
        addToast: () => {},
        t: () => null,
      })
    );
    expect(commsMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    commsMount.unmount();
    expect(commsMount.main.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(commsMount.opener);
    document.body.innerHTML = '';

    // 2. FamilyAnnouncementsPanel
    const famCloses = [];
    const famMount = mountWithBackdrop(
      React.createElement(window.AlloModules.FamilyAnnouncements.FamilyAnnouncementsPanel, {
        isOpen: true,
        onClose: () => famCloses.push('fam:1'),
        addToast: () => {},
        t: () => null,
      })
    );
    const famInput = famMount.host.querySelector('input[type="text"], textarea');
    act(() => famInput.focus());
    famMount.rerender(
      React.createElement(window.AlloModules.FamilyAnnouncements.FamilyAnnouncementsPanel, {
        isOpen: true,
        onClose: () => famCloses.push('fam:2'),
        addToast: () => {},
        t: () => null,
      })
    );
    expect(document.activeElement).toBe(famInput);
    dispatchKey(famInput, { key: 'Escape' });
    expect(famCloses).toEqual(['fam:2']);
    famMount.unmount();
    expect(famMount.main.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(famMount.opener);
    document.body.innerHTML = '';

    // 3. BrandProfileEditor (nested delete alertdialog inside outer wrapper must stay non-inert)
    const bp = window.AlloModules.BrandProfile;
    bp.saveBrandProfile({
      name: 'Oak Elementary',
      colors: { ...bp.DEFAULT_COLORS },
      fonts: { ...bp.DEFAULT_FONTS },
    });
    const bpCloses = [];
    const bpMount = mountWithBackdrop(
      React.createElement(window.AlloModules.BrandProfileEditor, {
        onClose: () => bpCloses.push('bp:1'),
        t: (_k, d) => d,
        addToast: () => {},
      })
    );
    expect(bpMount.main.hasAttribute('inert')).toBe(true);
    const nameInput = bpMount.host.querySelector('input[aria-label="Profile name"]');
    act(() => nameInput.focus());
    bpMount.rerender(
      React.createElement(window.AlloModules.BrandProfileEditor, {
        onClose: () => bpCloses.push('bp:2'),
        t: (_k, d) => d,
        addToast: () => {},
      })
    );
    expect(document.activeElement).toBe(nameInput);
    const delBtn = Array.from(bpMount.host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Delete');
    act(() => delBtn.click());
    const alertDialog = bpMount.host.querySelector('[role="alertdialog"]');
    expect(alertDialog).not.toBeNull();
    expect(alertDialog.closest('[inert]')).toBeNull();
    bpMount.unmount();
    expect(bpMount.main.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(bpMount.opener);
    document.body.innerHTML = '';

    // 4. AnchorChartView interactive mode modal
    const acMount = mountWithBackdrop(
      React.createElement(
        LanguageContext.Provider,
        { value: { t: (_k, d) => d || _k, currentUiLanguage: 'English' } },
        React.createElement(window.AlloModules.AnchorChartView, {
          generatedContent: {
            id: 'ac-1',
            type: 'anchor-chart',
            title: 'Fractions',
            data: { title: 'Fractions', sections: [{ id: 's1', label: 'Numerator', bullets: ['Top part'] }] },
          },
          isTeacherMode: true,
          handleNoteUpdate: () => {},
          addToast: () => {},
        })
      )
    );
    const interactiveBtn = Array.from(acMount.host.querySelectorAll('button')).find((b) =>
      /response mode|interactive|student responses/i.test(b.textContent || b.getAttribute('aria-label') || '')
    );
    expect(interactiveBtn).toBeTruthy();
    act(() => interactiveBtn.click());
    expect(acMount.main.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    dispatchKey(document, { key: 'Escape' });
    expect(acMount.main.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    acMount.unmount();
  });
});

describe('Wave 90: Content-hash pins, 4-mirror SHA-256 parity & 3-host browser delivery manifest', () => {
  const UPDATED_MODULES = [
    'word_sounds_module.js',
    'school_rewards_module.js',
    'dispro_analyzer_module.js',
    'mtss_triage_module.js',
    'sped_timelines_module.js',
    'udl_walkthrough_module.js',
    'meeting_docs_module.js',
    'educator_evaluation_module.js',
    'educator_evaluation_standalone.js',
    'admin_hub_module.js',
    'communications_studio_module.js',
    'family_announcements_module.js',
    'anchor_charts_module.js',
    'brand_profile_editor_module.js',
    'maine_sld_practice_module.js',
  ];

  const HASH_PINNED = [
    'admin_hub_module.js',
    'maine_sld_practice_module.js',
    'meeting_docs_module.js',
    'family_announcements_module.js',
    'view_live_session_dock_module.js',
    'view_canvas_recovery_dialog_module.js',
  ];

  const MIRROR_DIRS = [
    '.',
    'desktop/web-app/public',
    'desktop/app-build',
    'desktop/web-app/build',
  ];

  const HOST_FILES = [
    'AlloFlowANTI.txt',
    'desktop/web-app/src/AlloFlowANTI.txt',
    'desktop/web-app/src/App.jsx',
  ];

  it('keeps all 15 updated assets byte-identical across mirrors, content-hash pins current, and reader release green', () => {
    const reader = verifyReaderRelease();
    expect(reader.ok).toBe(true);
    expect(reader.errors).toEqual([]);

    const hostTexts = HOST_FILES.map((rel) => readFileSync(resolve(ROOT, rel), 'utf8'));
    expect(hostTexts[1]).toBe(hostTexts[0]);
    expect(hostTexts[2]).toBe(hostTexts[0]);

    const manifests = hostTexts.map((txt) => readEmbeddedManifest(txt));

    for (const mod of UPDATED_MODULES) {
      const rootPath = resolve(ROOT, mod);
      const expectedSha = sha256(rootPath);
      const expectedBytes = readFileSync(rootPath).length;
      const expectedSri = sha384Integrity(rootPath);

      for (const dir of MIRROR_DIRS.slice(1)) {
        const mirrorPath = resolve(ROOT, dir, mod);
        expect(sha256(mirrorPath), `${dir}/${mod} SHA-256 mismatch`).toBe(expectedSha);
      }

      if (manifests[0]?.assets?.[mod]) {
        for (let i = 0; i < HOST_FILES.length; i += 1) {
          expect(manifests[i].assets[mod], `${HOST_FILES[i]} manifest ${mod}`).toEqual({
            bytes: expectedBytes,
            integrity: expectedSri,
          });
        }
      }
    }

    for (const mod of HASH_PINNED) {
      const expectedPin = `${mod}?v=${sha256(resolve(ROOT, mod)).slice(0, 8)}`;
      expect(hostTexts[0], `Missing pin ${expectedPin}`).toContain(expectedPin);
    }
  });
});
