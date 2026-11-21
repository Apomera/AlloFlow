// Wave 6 regression suite (2026-11-20): Shell, Onboarding & Resource Stability P0s
// across ProjectSettings, SpotlightTour, LaunchPad, TeacherHistoryTab, Sidebar/HostHandlers,
// Family Mode host copies, Outline/Renderers, AnchorCharts/AppStyles, Timeline, Brainstorm, and VideoRefPlayer.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  ({ act } = require(path.join(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Wave 6 — Shell, Onboarding & Resource Stability P0s', () => {
  describe('1. ProjectSettingsView — Controlled Portal URL, Confirm Disconnect, Unsnapped <details> & QR Preservation', () => {
    it('preserves typed portal URL across parent re-renders and requires two-step Disconnect confirmation', async () => {
      loadAlloModule('view_project_settings_module.js');
      const ProjectSettingsView = window.AlloModules.ProjectSettingsView;
      const savedCalls = [];
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = ReactDOMClient.createRoot(host);

      function Harness() {
        const [settings, setSettings] = React.useState({ allowDictation: true, adventurePermissions: {} });
        const [url, setUrl] = React.useState('https://script.google.com/macros/s/OLD_DEPLOY/exec');
        return React.createElement(ProjectSettingsView, {
          t: (k) => k,
          studentProjectSettings: settings,
          setStudentProjectSettings: setSettings,
          isTeacherMode: true,
          isParentMode: false,
          isIndependentMode: false,
          handleSetIsProjectSettingsOpenToFalse: vi.fn(),
          onOpenPrincipalEvaluation: vi.fn(),
          evaluationPortalUrl: url,
          isEvaluationPortalConnected: Boolean(url),
          onSaveEvaluationPortalUrl: (next) => {
            savedCalls.push(next);
            setUrl(next);
            return { ok: true, url: next };
          },
        });
      }

      try {
        await act(async () => { root.render(React.createElement(Harness)); });
        const input = host.querySelector('#principal-evaluation-portal-url');
        expect(input).toBeTruthy();
        expect(input.value).toBe('https://script.google.com/macros/s/OLD_DEPLOY/exec');

        // Type a new URL, then trigger an unrelated parent re-render via checkbox toggle
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        await act(async () => {
          setter.call(input, 'https://script.google.com/macros/s/NEW_DEPLOY/exec');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const checkbox = host.querySelector('input[type="checkbox"]');
        if (checkbox) {
          await act(async () => { checkbox.click(); });
        }
        // Submit the form — MUST submit NEW_DEPLOY (never stale '')
        const form = input.closest('form');
        await act(async () => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        expect(savedCalls[savedCalls.length - 1]).toBe('https://script.google.com/macros/s/NEW_DEPLOY/exec');

        // Clicking Disconnect once MUST NOT immediately disconnect
        const disconnectBtn = Array.from(form.querySelectorAll('button')).find(b => b.textContent.trim() === 'Disconnect');
        expect(disconnectBtn).toBeTruthy();
        await act(async () => { disconnectBtn.click(); });
        expect(savedCalls).toHaveLength(1);

        // Clicking Confirm disconnect disconnects AND clears input value
        const confirmBtn = Array.from(form.querySelectorAll('button')).find(b => b.textContent.trim() === 'Confirm disconnect');
        expect(confirmBtn).toBeTruthy();
        await act(async () => { confirmBtn.click(); });
        expect(savedCalls[savedCalls.length - 1]).toBe('');
        expect(input.value).toBe('');
      } finally {
        await act(async () => { root.unmount(); });
      }
    });

    it('protects QR codes from High-Contrast inversion in both view_project_settings and app_styles', () => {
      const settingsSrc = fs.readFileSync(path.join(ROOT, 'view_project_settings_source.jsx'), 'utf8');
      const stylesSrc = fs.readFileSync(path.join(ROOT, 'app_styles_source.jsx'), 'utf8');
      expect(settingsSrc).toContain('data-allo-qr-preserve="true"');
      expect(stylesSrc).toContain('.theme-contrast [data-allo-qr-preserve="true"]');
      expect(stylesSrc).toContain('forced-color-adjust: none !important');
    });
  });

  describe('2. SpotlightTourView — Escape, Outside Dismiss, Unclipped Arrow & Button Contrast', () => {
    it('dismisses on document Escape and outside pointerdown while keeping tourRect operable and arrow unclipped', async () => {
      loadAlloModule('view_spotlight_tour_module.js');
      const SpotlightTourView = window.AlloModules.SpotlightTourView;
      const setIsSpotlightMode = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = ReactDOMClient.createRoot(host);

      try {
        await act(async () => {
          root.render(React.createElement(SpotlightTourView, {
            t: (k) => k === 'common.close' ? 'Close' : k,
            debugLog: vi.fn(),
            tourRect: { top: 100, left: 100, right: 200, bottom: 150, width: 100, height: 50 },
            spotlightMessage: { title: 'Guide', text: 'Click the highlighted button.' },
            spotlightOpenTimeRef: { current: Date.now() - 2000 },
            setIsSpotlightMode,
          }));
        });
        const panel = host.querySelector('#spotlight-message-panel');
        expect(panel.className).toContain('overflow-visible');
        expect(panel.className).not.toContain('overflow-hidden');

        // Pointerdown inside tourRect must NOT dismiss
        await act(async () => {
          const ev = new MouseEvent('pointerdown', { bubbles: true, clientX: 150, clientY: 120 });
          document.body.dispatchEvent(ev);
        });
        expect(setIsSpotlightMode).not.toHaveBeenCalled();

        // Pointerdown outside both panel and tourRect dismisses
        await act(async () => {
          const ev = new MouseEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 });
          document.body.dispatchEvent(ev);
        });
        expect(setIsSpotlightMode).toHaveBeenCalledWith(false);

        setIsSpotlightMode.mockClear();
        // Document-level Escape dismisses even if focus moved outside the dialog
        document.body.focus();
        await act(async () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        expect(setIsSpotlightMode).toHaveBeenCalledWith(false);
      } finally {
        await act(async () => { root.unmount(); });
      }
    });
  });

  describe('3. LaunchPad & TeacherHistoryTab', () => {
    it('prevents stranded LaunchPad buttons, supports Arrow/Home/End/Tab in language menu, and ref-counts html scroll lock', () => {
      const lpSrc = fs.readFileSync(path.join(ROOT, 'view_launch_pad_source.jsx'), 'utf8');
      expect(lpSrc).toContain('var restoreButton = function ()');
      expect(lpSrc).toContain("event.key === 'ArrowDown'");
      expect(lpSrc).toContain("event.key === 'ArrowUp'");
      expect(lpSrc).toContain("event.key === 'Home'");
      expect(lpSrc).toContain("event.key === 'End'");
      expect(lpSrc).toContain('window.__alloHtmlScrollLockState');
    });

    it('removes hardcoded dark-on-dark inline color from TeacherHistoryTab group pills', () => {
      const thSrc = fs.readFileSync(path.join(ROOT, 'view_teacher_history_tab_source.jsx'), 'utf8');
      expect(thSrc).toContain('text-slate-800');
      expect(thSrc).not.toContain("color: '#1e293b'");
    });
  });

  describe('4. Video Transcript Dismiss, openSourceInput, Open PDF Project & Family Mode Targets', () => {
    it('dismissing Video Transcript shortcuts does not wipe generatedContent or overwrite mbJoinStatus', () => {
      loadAlloModule('host_handlers_module.js');
      const setGeneratedContent = vi.fn();
      const setMbJoinStatus = vi.fn();
      const setMbJoinError = vi.fn();
      const setActiveView = vi.fn();
      const addToast = vi.fn();

      const handlers = window.AlloModules.HostHandlers({
        videoTranscriptSourceContext: { title: 'Cells', transcript: 'Cells make up living things.', wordCount: 5 },
        setGeneratedContent,
        setMbJoinStatus,
        setMbJoinError,
        setMbJoinRetryable: vi.fn(),
        setActiveView,
        addToast,
      });

      handlers.handleTranscriptSourceAction('dismiss');
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Transcript shortcuts hidden'), 'info');
      expect(setGeneratedContent).not.toHaveBeenCalled();
      expect(setMbJoinStatus).not.toHaveBeenCalled();
      expect(setMbJoinError).not.toHaveBeenCalled();
      expect(setActiveView).not.toHaveBeenCalled();
    });

    it('wires sidebar transcript local dismiss, openSourceInput CTA focus, keyboard-accessible Open PDF project, and Family Mode ui-tool-* IDs', () => {
      const sidebarSrc = fs.readFileSync(path.join(ROOT, 'view_sidebar_panels_source.jsx'), 'utf8');
      expect(sidebarSrc).toContain('[data-source-paste], [data-source-open], button:not([disabled])');
      expect(sidebarSrc).toContain('focus-within:ring-2 focus-within:ring-indigo-600');
      expect(sidebarSrc).toContain('<input type="file" accept=".json" className="sr-only"');
      expect(sidebarSrc).toContain('dismissedTranscriptKey');

      for (const hostFile of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
        const txt = fs.readFileSync(path.join(ROOT, hostFile), 'utf8');
        expect(txt).toContain("(kind === 'glossary' || kind === 'simplified') ? 'ui-tool-' + kind");
      }
    });
  });

  describe('5. Outline Keyless Diagram, Renderers Auto Layout Gate, Anchor Charts & Dark-Mode Inputs', () => {
    it('keeps Create Diagram enabled keyless in OutlineView and gates Auto Layout in ViewRenderers', () => {
      const outlineSrc = fs.readFileSync(path.join(ROOT, 'view_outline_source.jsx'), 'utf8');
      expect(outlineSrc).toContain('generatedContent?.data?.main');
      expect(outlineSrc).toContain('Array.isArray(generatedContent?.data?.branches)');
      const createIdx = outlineSrc.indexOf('onClick={handleInitializeMap}');
      expect(createIdx).toBeGreaterThan(-1);
      const createBtnSnippet = outlineSrc.slice(createIdx, createIdx + 120);
      expect(createBtnSnippet).toContain('disabled={isProcessing}');
      expect(createBtnSnippet).not.toContain('outlineAiOff');

      const renderersSrc = fs.readFileSync(path.join(ROOT, 'view_renderers_source.jsx'), 'utf8');
      expect(renderersSrc).toContain('const autoLayoutAiOff =');
      expect(renderersSrc).toContain('disabled={isProcessing || isMapLocked || autoLayoutAiOff}');
      expect(renderersSrc).not.toContain('className="fill-current text-yellow-700"');
    });

    it('passes fresh iconPromptDraft to handleRegenIcon, gates icon generation when image AI is off, and fixes dark-mode bullet inputs', () => {
      const acSrc = fs.readFileSync(path.join(ROOT, 'anchor_charts_source.jsx'), 'utf8');
      const stylesSrc = fs.readFileSync(path.join(ROOT, 'app_styles_source.jsx'), 'utf8');
      expect(acSrc).toContain('onRegenIcon(sectionIndex, (iconPromptDraft || \'\').trim())');
      expect(acSrc).toContain('const handleRegenIcon = async (idx, promptOverride) =>');
      expect(acSrc).toContain('disabled={isRegeneratingIcon || iconGenDisabled}');
      expect(acSrc).not.toContain("color: '#2d3748',\n                        borderColor:");
      expect(stylesSrc).toContain('.ac-bullets span, .ac-bullets input, .ac-icon-slot span');
    });
  });

  describe('6. Timeline, Brainstorm & VideoRefPlayer Stability', () => {
    it('null-guards Timeline & Brainstorm and uses high-contrast Gamepad icon on Timeline', () => {
      const tlSrc = fs.readFileSync(path.join(ROOT, 'view_timeline_source.jsx'), 'utf8');
      expect(tlSrc).toContain('generatedContent?.data?.items');
      expect(tlSrc).not.toContain('className="fill-current text-yellow-700"');
      expect(tlSrc).toContain('className="fill-current text-yellow-300"');

      const bsSrc = fs.readFileSync(path.join(ROOT, 'view_brainstorm_source.jsx'), 'utf8');
      expect(bsSrc).toContain("items.map((idea, idx) => (!idea || typeof idea !== 'object') ? null : (");
      expect(bsSrc).toContain("value={idea.title || ''}");
    });

    it('floors float duration seconds, uses aria-labelledby, matches SHA-256 case-insensitively, and revokes async Blob URLs on unmount', async () => {
      loadAlloModule('view_video_ref_player_module.js');
      const VideoRefPlayerOverlay = window.AlloModules.VideoRefPlayer.VideoRefPlayerOverlay;
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = ReactDOMClient.createRoot(host);

      try {
        await act(async () => {
          root.render(React.createElement(VideoRefPlayerOverlay, {
            item: { id: 'vid-1', title: 'Fraction Lab', data: { title: 'Fraction Lab', durationSec: 12.789, sha256: 'ABCDEF1234' } },
            onClose: vi.fn(),
            addToast: vi.fn(),
            t: (k) => k,
          }));
        });
        const dialog = host.querySelector('[role="dialog"]');
        expect(dialog.getAttribute('aria-labelledby')).toBe('video-ref-player-title');
        expect(host.querySelector('#video-ref-player-title').textContent).toBe('Fraction Lab');
        expect(host.textContent).toContain('0:12');
        expect(host.textContent).not.toContain('0:12.789');
      } finally {
        await act(async () => { root.unmount(); });
      }

      const vrSrc = fs.readFileSync(path.join(ROOT, 'view_video_ref_player_source.jsx'), 'utf8');
      expect(vrSrc).toContain('hex.toLowerCase() === String(ref.sha256).trim().toLowerCase()');
      expect(vrSrc).toContain('if (!mountedRef.current)');
    });
  });
});
