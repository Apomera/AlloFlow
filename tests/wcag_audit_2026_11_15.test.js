import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
import { spawnSync } from 'node:child_process';
const DESKTOP_MIRRORS = ['.', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
const windows = [];

function expectAllExistingMirrorsMatch(relativePath) {
  const baseline = readFileSync(relativePath, 'utf8');
  for (const root of DESKTOP_MIRRORS.slice(1)) {
    const candidate = `${root}/${relativePath}`;
    if (existsSync(candidate)) {
      expect(readFileSync(candidate, 'utf8'), `${candidate} drift`).toBe(baseline);
    }
  }
}

afterEach(() => {
  for (const w of windows.splice(0)) w.close();
  vi.useRealTimers();
});

describe('WCAG 2.2 AA Nov 15, 2026 audit remediations (Phase 1 + Batch 2)', () => {
  it('keeps all modified modules and mirrored companion pages synchronized across desktop copies', () => {
    const mirroredFiles = [
      'app_styles_module.js',
      'view_math_module.js',
      'view_header_module.js',
      'view_educator_hub_modal_module.js',
      'view_sidebar_panels_module.js',
      'view_history_panel_module.js',
      'view_glossary_module.js',
      'error_reporter_module.js',
      'sel_hub/sel_hub_module.js',
      'sel_hub/sel_tool_cultureexplorer.js',
      'sel_hub/sel_tool_quietquestions.js',
      'stem_lab/stem_tool_cellular.js',
      'stem_lab/stem_tool_heatlab.js',
      'stem_lab/stem_tool_forge.js',
      'stem_lab/stem_tool_timeline.js',
      'stem_lab/stem_tool_magnetism.js',
      'stem_lab/stem_tool_birdlab.js',
      'stem_lab/stem_tool_wave.js',
      'school-rewards-practice.html',
      'stem_lab/stem_tool_beehive.js',
      'stem_lab/stem_tool_lifeskills.js',
      'math_fluency_module.js',
      'view_full_pack_run_module.js',
      'stem_lab/stem_tool_singing.js',
      'video_studio_module.js',
      'poet_tree_module.js',
      'music_studio/open_groove_module.js',
      'research_hub_module.js',
      'story_stage_module.js',
      'studio_module.js',
      'student_analytics_module.js',
      'story_forge_module.js',
      'stem_lab/stem_lab_module.js',
      'allohaven_module.js',
      'sensitive_workspace_module.js',
      'lingua_practice_module.js',
      'learning_web_explorer_module.js',
      'accessibility_lab_module.js',
      'view_misc_modals_module.js',
      'view_export_preview_module.js',
      'timeline_studio_module.js',
    ];
    for (const file of mirroredFiles) {
      expectAllExistingMirrorsMatch(file);
    }
    if (existsSync('ml-shots.html')) {
      expectAllExistingMirrorsMatch('ml-shots.html');
    }
  });

  it('gives math preview containers region roles, keyboard scrollability, i18n labels, and AA contrast', () => {
    const src = readFileSync('view_math_source.jsx', 'utf8');
    expect(src).toContain('role="region"');
    expect(src).toContain("aria-label={tr('math.explanation_preview_aria'");
    expect(src).toContain("aria-label={tr('math.expression_preview_aria'");
    expect(src).toContain("aria-label={tr('math.answer_key_preview_aria'");
    expect(src).toContain('text-orange-800');
    expect(src).not.toContain('text-orange-600');
  });

  it('darkens the SEL Hub crash-fallback button and updates features.html VPAT link text', () => {
    const selHub = readFileSync('sel_hub/sel_hub_module.js', 'utf8');
    const fallbackStart = selHub.indexOf('sel.hub.ui.tool_open_failed_title');
    const fallbackEnd = selHub.indexOf('sel.hub.ui.back_to_hub', fallbackStart);
    expect(fallbackStart).toBeGreaterThan(-1);
    expect(fallbackEnd).toBeGreaterThan(fallbackStart);
    const fallbackBlock = selHub.slice(fallbackStart, fallbackEnd);
    expect(fallbackBlock).toContain("background: shellIsContrast ? '#000000' : '#0369a1'");
    expect(fallbackBlock).not.toContain('#0ea5e9');

    const featuresHtml = readFileSync('features.html', 'utf8');
    expect(featuresHtml).toContain('>review the current VPAT</a>');
    expect(featuresHtml).not.toContain('>review the v1.2 VPAT</a>');
  });

  it('enforces dark-mode badge/warning contrast and high-contrast button hover descendant ink in app styles', () => {
    const src = readFileSync('app_styles_source.jsx', 'utf8');
    const mod = readFileSync('app_styles_module.js', 'utf8');
    for (const content of [src, mod]) {
      expect(content).toContain('.theme-dark .bg-yellow-400:not([data-stem-tool-surface] *)');
      expect(content).toContain('color: #1e1b4b !important;');
      expect(content).toContain('#fecaca !important');
      expect(content).toContain('.theme-contrast .allo-docsuite button[class]:hover:not(:disabled) * { color: #000000 !important; }');
    }
  });

  it('preserves WCAG 2.5.3 Label in Name, 1.4.3 contrast, and compact toolbar wrapping in view_header', () => {
    const src = readFileSync('view_header_source.jsx', 'utf8');
    expect(src).toContain("t('toolbar.start_setup') || 'Start & setup'");
    expect(src).toContain('flex max-w-full flex-wrap md:flex-nowrap items-center justify-end gap-1.5 sm:gap-2');
    expect(src).toContain('bg-indigo-700');
    expect(src).toContain("t('common.dismiss') || 'Dismiss help tip'");
    expect(src).toContain('text-yellow-100');
    expect(src).toContain('text-white');
    expect(src).not.toContain('aria-label={t(\'common.dismiss\') || \'Dismiss help tip\'}');
  });

  it('uses >=4.5:1 -800 card descriptions and -600 section headings in view_educator_hub_modal', () => {
    const src = readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
    expect(src).not.toMatch(/text-(?:indigo|amber|emerald|rose|sky|purple|violet|blue)-600/);
    expect(src).not.toContain('text-slate-500');
  });

  it('removes horizontal truncation on workspace-create tool-finder status text and hides phonetic glyph from glossary button name', () => {
    const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    expect(sidebar).toContain('<p className="mt-0.5 text-xs leading-relaxed text-slate-600" aria-live="polite">');
    expect(sidebar).not.toContain('truncate" aria-live="polite">');

    const glossary = readFileSync('view_glossary_source.jsx', 'utf8');
    expect(glossary).toContain('<span aria-hidden="true">/əˈ/</span>');
  });

  it('runtime renders ErrorReporter #allo-err-badge with leading visible label and aria-hidden warning icon (WCAG 2.5.3)', () => {
    const reporterSrc = readFileSync('error_reporter_module.js', 'utf8');
    const dom = new JSDOM('<html><body></body></html>', {
      url: 'https://alloflow.example/app/',
      runScripts: 'outside-only',
      virtualConsole: new VirtualConsole(),
    });
    const w = dom.window;
    windows.push(w);
    w.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
    w.eval(reporterSrc);

    w.console.error('Test failure for WCAG 2.5.3 badge verification');
    const badge = w.document.getElementById('allo-err-badge');
    expect(badge).not.toBeNull();
    expect(badge.style.display).not.toBe('none');

    const iconSpan = badge.querySelector('span[aria-hidden="true"]');
    expect(iconSpan).not.toBeNull();
    expect(iconSpan.textContent).toContain('⚠');

    const ariaLabel = badge.getAttribute('aria-label') || '';
    const visibleTextWithoutHidden = badge.textContent.replace(iconSpan.textContent, '').trim();
    expect(visibleTextWithoutHidden).toBe('1 error');
    expect(ariaLabel.startsWith(visibleTextWithoutHidden)).toBe(true);
    expect(ariaLabel).toBe('1 error — View captured errors and report a bug');
  });

  it('runtime renders HistoryPanel .rp-phase-row with visible DOM text leading aria-label (WCAG 2.5.3)', () => {
    const React = require('../desktop/web-app/node_modules/react');
    const { renderToStaticMarkup } = require('../desktop/web-app/node_modules/react-dom/server');
    const historySrc = readFileSync('view_history_panel_module.js', 'utf8');
    const dom = new JSDOM('<html><body></body></html>', {
      url: 'https://alloflow.example/app/',
      runScripts: 'outside-only',
      virtualConsole: new VirtualConsole(),
    });
    const w = dom.window;
    windows.push(w);
    w.React = React;
    const noopIcon = () => null;
    for (const icon of [
      'AlertCircle', 'ChevronDown', 'ChevronUp', 'Cloud', 'CloudOff', 'Download',
      'Folder', 'FolderInput', 'FolderOpen', 'FolderPlus', 'GripVertical', 'History',
      'Lock', 'Maximize', 'Minimize', 'Pencil', 'RefreshCw', 'Save', 'Search',
      'Settings', 'Share2', 'Trash2', 'Upload', 'X',
    ]) {
      w[icon] = noopIcon;
    }

    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;
    globalThis.window = w;
    globalThis.document = w.document;
    try {
      w.eval(historySrc);
      const { HistoryPanel } = w.AlloModules.HistoryPanel;
      expect(typeof HistoryPanel).toBe('function');

      const sampleItem = {
        id: 'hist-1',
        title: 'Photosynthesis Investigation',
        type: 'study_guide',
        lessonPart: 'hook',
        stemMeta: { label: 'Biology Lab' },
        timestamp: '2026-11-15T12:00:00.000Z',
        createdAt: '2026-11-15T12:00:00.000Z',
      };

      const html = renderToStaticMarkup(
        React.createElement(HistoryPanel, {
          activeSidebarTab: 'history',
          activeStation: null,
          activeUnitId: null,
          cloudSyncStatus: 'idle',
          editTitle: '',
          editingId: null,
          generatedContent: null,
          getDefaultTitle: () => 'Untitled',
          getFilteredHistory: () => [sampleItem],
          getIconForType: () => null,
          history: [sampleItem],
          isTeacherMode: true,
          sanitizeString: (s) => String(s || ''),
          t: (k) => k,
          units: [],
        })
      );

      w.document.body.innerHTML = html;
      const openBtn = w.document.querySelector('[role="listitem"] button[aria-label]');
      expect(openBtn).not.toBeNull();
      const aria = openBtn.getAttribute('aria-label') || '';
      const visibleText = openBtn.textContent || '';
      expect(aria).toContain('Photosynthesis Investigation');
      expect(aria.indexOf('Photosynthesis Investigation')).toBe(0);
      expect(visibleText).toContain('Photosynthesis Investigation');
      expect(visibleText).toMatch(/Photosynthesis Investigation\s+\S/);
    } finally {
      globalThis.window = prevWindow;
      globalThis.document = prevDocument;
    }
  });
});

describe('WCAG 2.2 AA Nov 15, 2026 audit remediations (Batch 4 STEM tools)', () => {
  it('renders Forge dark empty-preview shell with dark panel background (#0f172a) rather than #fff', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_forge.js', 'forge');
    const html = renderTool('forge', {}, { isDark: true, isTeacherMode: true });
    const host = document.createElement('div');
    host.innerHTML = html;
    const hint = Array.from(host.querySelectorAll('div')).find((el) =>
      (el.textContent || '').includes('Validate + preview') && el.children.length === 0
    );
    expect(hint).toBeTruthy();
    // The hint now sits in a centring column inside the preview panel; read the
    // nearest ancestor that actually paints a background (the panel itself).
    let painted = hint.parentElement;
    while (painted && !(painted.style && painted.style.background)) painted = painted.parentElement;
    const wrapperBg = painted && painted.style.background;
    expect(wrapperBg).not.toBe('#fff');
    expect(wrapperBg).toMatch(/#0f172a|rgb\(15,\s*23,\s*42\)/i);
  });

  it('renders Timeline Studio labels inside #0f172a card with text-slate-300 and zero text-slate-400', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_timeline.js', 'timelineStudio');
    const html = renderTool('timelineStudio', {});
    const host = document.createElement('div');
    host.innerHTML = html;
    const srcLabel = host.querySelector('label[for="tl-src"]');
    expect(srcLabel).not.toBeNull();
    expect(srcLabel.className).toContain('text-slate-300');
    expect(host.querySelectorAll('.text-slate-400')).toHaveLength(0);
  });

  it('injects Magnetism light-mode contrast rules for .mag-pole-chip and .mag-quiz-step', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: { tab: 'quiz' } });
    expect(html).toContain('color:#ffffff');
    expect(html).toContain(':is(.theme-default,.theme-light) .mag-root .mag-quiz-step[data-state="current"]{border-color:#e11d48;background:#fff1f2;color:#9f1239}');
    expect(html).toContain(':is(.theme-default,.theme-light) .mag-root .mag-quiz-step[data-state="confirmed"]{border-color:#059669;background:#ecfdf5;color:#065f46}');
    expect(html).toContain(':is(.theme-default,.theme-light) .mag-root .mag-quiz-step[data-state="revised"]{border-color:#d97706;background:#fffbeb;color:#92400e}');
  });

  it('renders BirdLab hero container with fixed deep forest ground (#102e2b) instead of light canvas variable', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'menu' } });
    const host = document.createElement('div');
    host.innerHTML = html;
    const hero = host.querySelector('.birdlab-hero');
    expect(hero).not.toBeNull();
    const bg = hero.style.background || '';
    expect(bg).not.toContain('--allo-stem-canvas');
    expect(bg).toMatch(/#102e2b|rgb\(16,\s*46,\s*43\)/i);
  });

  it('injects Wave dark-remap contrast rules for -900/-950 utility text', () => {
    const oldStyle = document.getElementById('allo-wave-dark-remap-css');
    if (oldStyle) oldStyle.remove();
    resetStemLab();
    loadTool('stem_lab/stem_tool_wave.js', 'wave');
    const styleEl = document.getElementById('allo-wave-dark-remap-css');
    expect(styleEl).not.toBeNull();
    const css = styleEl.textContent || '';
    expect(css).toContain('.theme-dark [data-stem-tool-shell="wave"] :is(.text-amber-900,.text-amber-950){color:#fef3c7!important}');
    expect(css).toContain('.theme-dark [data-stem-tool-shell="wave"] :is(.text-cyan-900,.text-cyan-950){color:#cffafe!important}');
    expect(css).toContain('.theme-dark [data-stem-tool-shell="wave"] :is(.text-indigo-900,.text-indigo-950){color:#e0e7ff!important}');
  });
});

describe('WCAG 2.2 AA Nov 15, 2026 audit remediations (Batch 5 SEL tools)', () => {
  function mountSelTool(relativePath, toolId, toolData, ctxOpts = {}) {
    const webRequire = createRequire(resolve(process.cwd(), 'desktop', 'web-app', 'package.json'));
    const React = webRequire('react');
    const RDS = webRequire('react-dom/server');
    const dom = new JSDOM('<!DOCTYPE html><html lang="en"><body></body></html>');
    const w = dom.window;
    windows.push(w);
    const noop = () => {};
    w.React = React;
    w.AlloIcons = new Proxy({}, { get: () => () => null });
    w.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    w.SelHub = {
      _registry: {},
      registerTool(id, cfg) { this._registry[id] = cfg; },
      isRegistered(id) { return !!this._registry[id]; },
      getRegisteredTools() { return Object.values(this._registry); },
      renderTool(id, c) { return this._registry[id] ? this._registry[id].render(c) : null; },
    };

    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;
    globalThis.window = w;
    globalThis.document = w.document;
    try {
      w.eval(readFileSync(relativePath, 'utf8'));
      const tool = w.SelHub._registry[toolId];
      expect(tool, `${toolId} failed to register`).toBeTruthy();
      const ctx = Object.assign({
        React,
        toolData: toolData || {},
        setToolData: noop,
        update: noop,
        updateMulti: noop,
        setSelHubTool: noop,
        addToast: noop,
        awardXP: noop,
        announceToSR: noop,
        t: (k) => k,
        isDark: true,
        isContrast: false,
        theme: { isDark: true, isContrast: false, reduceMotion: false, palette: new Proxy({}, { get: () => '#888888' }) },
        icons: new Proxy({}, { get: () => () => null }),
        gradeLevel: 'Middle School',
        gradeBand: 'middle',
        a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
        props: {},
      }, ctxOpts);
      const html = RDS.renderToStaticMarkup(React.createElement(() => tool.render(ctx)));
      return { html, doc: w.document };
    } finally {
      globalThis.window = prevWindow;
      globalThis.document = prevDocument;
    }
  }

  it('renders Culture Explorer dark-shell headers, subtitles, and counters with light inks instead of dark slate on #0f172a', () => {
    const tabsToCheck = ['research', 'worldmap', 'recipes', 'music', 'stories', 'calendar', 'language', 'compare', 'quiz', 'journal', 'badges'];
    for (const tab of tabsToCheck) {
      const { html } = mountSelTool('sel_hub/sel_tool_cultureexplorer.js', 'cultureExplorer', {
        cultureExplorer: { tab, quizActive: tab === 'quiz', quizQuestions: tab === 'quiz' ? [{ q: 'Q', opts: ['A', 'B'], ans: 0, why: 'W' }] : [] },
      });
      const host = document.createElement('div');
      host.innerHTML = html;
      const mainH2 = host.querySelector('h2');
      expect(mainH2).not.toBeNull();
      expect(mainH2.className).toContain('text-slate-100');
      const subtitle = mainH2.nextElementSibling;
      expect(subtitle && subtitle.className).toContain('text-slate-300');
      const shellHeading = host.querySelector('#culture-research-title, div.text-center.mb-2 > h3');
      expect(shellHeading, `missing tab shell heading on ${tab}`).not.toBeNull();
      expect(shellHeading.className).toContain('text-slate-100');
      expect(shellHeading.className).not.toContain('text-slate-800');
      const shellSub = shellHeading.nextElementSibling;
      if (shellSub && shellSub.tagName === 'P') {
        expect(shellSub.className).toContain('text-slate-300');
        expect(shellSub.className).not.toContain('text-slate-600');
      }
      if (tab === 'badges') {
        expect(html).toContain('text-cyan-300');
        expect(html).toContain('text-slate-300 ml-1');
      }
    }
  });

  it('lightens Quiet Questions theme accent labels across gradient/dark/contrast shells including #ec4899 Growth and #a855f7 Longing', () => {
    // q17 = Growth (#ec4899), q05 = Longing (#a855f7), q13 = Connection (#16a34a)
    for (const [manualOverride, expectedHex, expectedRgb] of [
      [16, '#ec4899', 'rgb(244, 114, 182)'],
      [4, '#a855f7', 'rgb(192, 132, 252)'],
      [12, '#16a34a', 'rgb(74, 222, 128)'],
    ]) {
      const { html } = mountSelTool('sel_hub/sel_tool_quietquestions.js', 'quietQuestions', {
        quietQuestions: { view: 'this-week', manualOverride },
      }, { isDark: true, isContrast: false });
      const host = document.createElement('div');
      host.innerHTML = html;
      const badge = host.querySelector('[style*="text-transform:uppercase"]');
      expect(badge).not.toBeNull();
      expect(badge.style.color).toBe(expectedRgb);
      expect(badge.getAttribute('style') || '').not.toContain(`color:${expectedHex}`);
    }
    const hc = mountSelTool('sel_hub/sel_tool_quietquestions.js', 'quietQuestions', {
      quietQuestions: { view: 'this-week', manualOverride: 16 },
    }, { isDark: true, isContrast: true, theme: { isDark: true, isContrast: true, reduceMotion: false, palette: {} } });
    expect(hc.html).toContain('color:#ffff00');
  });
});

describe('WCAG 2.2 AA Nov 15, 2026 audit remediations (Wave 2: held-file closure, labels, mobile toast, AlloBot)', () => {
  it('gives the Beehive Plan/Start command a black/#00ff00 high-contrast treatment and keeps its N shortcut scoped with an off switch (2.1.4)', () => {
    const src = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
    expect(src).toContain('.theme-contrast [data-stem-tool-shell=\\"beehive\\"] .bee-command .bee-command-go{background:#000000!important;background-image:none!important;color:#00ff00!important;-webkit-text-fill-color:#00ff00!important;border-color:#00ff00!important}');
    expect(src).toContain("if (e.isComposing || e.keyCode === 229 || e.repeat || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;");
    expect(src).toContain("target.closest('[data-beehive-root=\"true\"]')");
    expect(src).toContain("oneKeyShortcuts: d.oneKeyShortcuts !== false");
    expect(src).toContain("if (!ks.oneKeyShortcuts && key !== '?') return;");
  });

  it('routes the previously over-baseline accessible names of the four held files through translators', () => {
    for (const file of ['math_fluency_module.js', 'walkthrough_copilot_cdn_module.js', 'stem_lab/stem_tool_beehive.js', 'stem_lab/stem_tool_lifeskills.js']) {
      const result = spawnSync(process.execPath, ['dev-tools/check_hardcoded_aria_text.cjs', '--quiet', file], { encoding: 'utf8' });
      expect(result.status, file + ' ' + result.stdout + result.stderr).toBe(0);
    }
    expect(readFileSync('math_fluency_module.js', 'utf8')).toContain("'aria-label': tr('Session goal progress')");
    expect(readFileSync('walkthrough_copilot_source.jsx', 'utf8')).toContain("t('walkthrough_copilot.close', 'Close Walkthrough Copilot')");
    expect(readFileSync('stem_lab/stem_tool_lifeskills.js', 'utf8')).toContain("__alloT('stem.lifeskills.aria_tilt_3d_camera_up'");
  }, 60000);

  it('registers every new __alloT key (STEM ratchet exits 0) and the walkthrough copilot keys in both ui_strings copies', () => {
    const result = spawnSync(process.execPath, ['dev-tools/check_stem_i18n_registration.cjs'], { encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const ui = JSON.parse(readFileSync(file, 'utf8'));
      expect(ui.walkthrough_copilot.close).toBe('Close Walkthrough Copilot');
      expect(ui.stem.lifeskills.aria_tilt_3d_camera_up).toBe('Tilt 3D camera up');
    }
  }, 120000);

  it('keeps the website library page nav wrapping and 24px target size when promo stylesheets are not served beside it (2.5.8 / 1.4.10)', () => {
    const html = readFileSync('library.html', 'utf8');
    expect(html).toContain(':where(*, *::before, *::after) { box-sizing: border-box; }');
    expect(html).toContain(':where(html, body) { max-width: 100%; overflow-x: clip; }');
    expect(html).toContain(':where(.nav-links) { display: flex; flex-wrap: wrap; max-width: 100%; gap: 8px 16px; }');
    expect(html).toContain(':where(.nav-links a) { display: inline-flex; align-items: center; min-height: 24px; }');
    expect(readFileSync('desktop/web-app/public/library.html', 'utf8')).toBe(html);
  });

  it('puts whitespace between inline history-row parts so axe 2.5.3 sees "Title Type Phase ... Open" (history rows) and Plan Full Pack names its visible subtitle', () => {
    const history = readFileSync('view_history_panel_source.jsx', 'utf8');
    expect(history).toMatch(/\{itemTitle\}\s*<\/div>\s*\{' '\}\s*<div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5/);
    expect(history).toMatch(/<\/div>\s*\{' '\}\s*<span\s+aria-hidden="true"\s+className=\{`shrink-0 rounded-md/);
    const fullPack = readFileSync('view_full_pack_run_source.jsx', 'utf8');
    expect(fullPack).toContain("[t('fullpack.action_plan') || 'Plan full pack', t('fullpack.plan_first_help') || 'Start with a resource list you can review and edit before generation.'].join(' ')");
    expect(fullPack).toMatch(/<\/span>\s*\{' '\}\s*<span className="text-xs leading-relaxed text-slate-600 block mt-0\.5">/);
    expect(readFileSync('view_full_pack_run_module.js', 'utf8')).toContain("t('fullpack.plan_first_help') || 'Start with a resource list");
  });

  it('docks narrow-screen toasts at the bottom and stops AlloBot catching clicks meant for an open modal dialog (2.4.11 / 2.4.3)', () => {
    for (const file of ['app_styles_source.jsx', 'app_styles_module.js']) {
      const css = readFileSync(file, 'utf8');
      expect(css, file).toContain('@media (max-width: 639px) { [data-toast-region] { top: auto !important; bottom: calc(env(safe-area-inset-bottom, 0px) + 0.75rem) !important; } }');
      expect(css, file).toContain('body:has([role="dialog"][aria-modal="true"]:not([data-stem-tool-surface])) [data-allobot-control-surface="true"] { pointer-events: none !important; }');
    }
  });

  it('keeps resource Previous/Next visible text separated by a space (2.5.3) and tags the toast region without adding comments to the host', () => {
    // The nav buttons now show only the arrow + the neighbour's title; the
    // accessible name ("Previous resource: {title}") still contains that
    // visible title, which is what 2.5.3 Label in Name requires.
    const PREV_BTN = "aria-label={previous ? text('resource_nav.previous_named', 'Previous resource: {title}', { title: title(previous) }) : text('resource_nav.previous', 'Previous resource')}><span aria-hidden=\"true\">‹ </span>{previous ? <span aria-hidden=\"true\">{title(previous)}</span> : text('resource_nav.previous', 'Previous resource')}</button>";
    const NEXT_BTN = "aria-label={next ? text('resource_nav.next_named', 'Next resource: {title}', { title: title(next) }) : text('resource_nav.next', 'Next resource')}>{next ? <span aria-hidden=\"true\">{title(next)}</span> : text('resource_nav.next', 'Next resource')}<span aria-hidden=\"true\"> ›</span></button>";
    const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(anti).toContain(PREV_BTN);
    expect(anti).toContain(NEXT_BTN);
    expect(anti).toMatch(/<div\s+data-toast-region\s+className="fixed inset-x-4 z-\[170\]/);
    const app = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
    expect(app).toMatch(/<div\s+data-toast-region\s+className="fixed inset-x-4 z-\[170\]/);
    expect(app).toContain(PREV_BTN);
    expect(app).toContain(NEXT_BTN);
  });

  it('never swallows forward Tab in the Document Builder editable preview when the first inner target cannot take focus (2.1.2 / 2.4.3)', () => {
    for (const file of ['view_export_preview_source.jsx', 'view_export_preview_module.js']) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).toContain('skipTargetUnreachable');
      expect(src, file).toMatch(/inner\[0\]\.focus\(\);[\s\S]{0,200}?if \(doc\d*\.activeElement === inner\[0\]\)/);
      expect(src, file).toContain('|| skipTargetUnreachable;');
      expect(src, file).not.toMatch(/e\.preventDefault\(\); inner\[0\]\.focus\(\); return;/);
    }
  });

  it('gives Singing Sight Reading offline alert and warm-up live status readable text-rose-300 in dark mode (1.4.3)', () => {
    const src = readFileSync('stem_lab/stem_tool_singing.js', 'utf8');
    expect(src).not.toContain("'text-sm font-bold text-rose-700 m-0'");
    expect(src).toContain("t('stem.singing.vs_osmd_failed'");
    expect(src).toContain("className: 'text-sm font-bold m-0 ' + (dark ? 'text-rose-300' : 'text-rose-700')");
  });
});

describe('WCAG 2.2 AA Nov 15, 2026 audit remediations (Wave 3: Sweep 1 hub & modal contrast, reflow, focus-trap, target-size)', () => {
  it('enforces opaque dark amber/emerald/violet/sky surfaces, HC slate overrides, and pale gradient flattening in app styles (1.4.3)', () => {
    for (const file of ['app_styles_source.jsx', 'app_styles_module.js']) {
      const css = readFileSync(file, 'utf8');
      expect(css, file).toContain('.theme-dark .bg-amber-50');
      expect(css, file).toContain('#451a03');
      expect(css, file).toContain('.theme-contrast [class*="text-slate-"]:not(button):not(button *):not([data-stem-tool-surface] *)');
      expect(css, file).toContain('color: #ffff00 !important;');
      expect(css, file).toContain('.theme-contrast button[class*="text-slate-"]:not([data-stem-tool-surface] *):not(:hover) { color: #00ff00 !important; }');
      expect(css, file).toContain('from-sky-50');
    }
  });

  it('gives ml-shots.html a document title (2.4.2) and repairs Batch 1 contrast regressions across studio/stage/analytics modals (1.4.3)', () => {
    if (existsSync('ml-shots.html')) {
      expect(readFileSync('ml-shots.html', 'utf8')).toContain('<title>AlloFlow 3D Shots Renderer</title>');
    }
    expect(readFileSync('video_studio_module.js', 'utf8')).toMatch(/id:\s*['"]video-studio-description['"],\s*className:\s*['"]text-xs text-slate-600['"]/);
    expect(readFileSync('video_studio_module.js', 'utf8')).not.toMatch(/video-studio-description['"],\s*className:\s*['"]text-xs text-slate-500['"]/);
    expect(readFileSync('studio_module.js', 'utf8')).toContain("color: '#cbd5e1'");
    expect(readFileSync('student_analytics_module.js', 'utf8')).toContain('text-indigo-700');
    expect(readFileSync('story_stage_module.js', 'utf8')).toContain('.theme-contrast .litlab-dialog');
  });

  it('fixes Batch 2 reflow/truncation, scrollability, target sizes, focus traps, stacking order, and 2.5.3 accessible names', () => {
    const sf = readFileSync('story_forge_module.js', 'utf8');
    expect(sf).toContain('text-indigo-700');
    expect(sf).not.toContain('max-w-[58vw] truncate');

    // The transcript log is still keyboard-scrollable; aria-live attributes now sit between role and tabIndex.
    expect(readFileSync('view_misc_modals_module.js', 'utf8')).toMatch(/role:\s*["']log["'],(?:\s*["'][a-z-]+["']:\s*["'][a-z]+["'],){0,4}\s*tabIndex:\s*0/);
    expect(readFileSync('view_export_preview_module.js', 'utf8')).toContain('min-w-6 min-h-6 h-7');
    expect(readFileSync('timeline_studio_module.js', 'utf8')).toContain('min-w-11 min-h-11 p-2 shrink-0 rounded-lg text-slate-600');
    expect(readFileSync('accessibility_lab_module.js', 'utf8')).toContain('fixed inset-0 z-[300]');
    expect(readFileSync('accessibility_lab_module.js', 'utf8')).toContain('min-w-11 min-h-11 shrink-0 px-3 py-1.5');
    expect(readFileSync('lingua_practice_module.js', 'utf8')).toContain("flex flex-wrap md:flex-col gap-1 max-w-full min-w-0");
    expect(readFileSync('lingua_practice_module.js', 'utf8')).not.toContain("className:'text-xs text-slate-600 truncate'");

    const sw = readFileSync('sensitive_workspace_module.js', 'utf8');
    expect(sw).toContain("maxWidth: 'min(760px, 100%)'");
    expect(sw).toContain("boxSizing: 'border-box'");

    const lw = readFileSync('learning_web_explorer_module.js', 'utf8');
    expect(lw).toContain("'data-learning-web-diagram-scroll': 'true', tabIndex: 0, role: 'region'");
    expect(lw).toContain("flexShrink: 0, minWidth: 44, minHeight: 44");

    const rh = readFileSync('research_hub_module.js', 'utf8');
    expect(rh).toContain('#312e81 0%, #5b21b6 100%');
    expect(rh).toContain('zIndex: 300');
    expect(rh).toMatch(/scrollMarginBlock:\s*['"]96px['"]/);
    expect(rh).toContain('.theme-contrast [data-help-key="research_hub"]');

    const og = readFileSync('music_studio/open_groove_module.js', 'utf8');
    expect(og).toContain('Loop On — turn loop mode off');
    expect(og).toContain('Reset — demo pattern');
    expect(og).toContain("display: 'inline-flex', alignItems: 'center', justifyContent: 'center'");

    const sl = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(sl).not.toContain('"text-xs text-white/70"');
    expect(sl).toContain("totalStemXP + ' XP — View XP Progress'");

    const sh = readFileSync('sel_hub/sel_hub_module.js', 'utf8');
    expect(sh).toContain('#4338ca 0%, #3730a3 100%');
    expect(sh).toContain("minWidth: 44, minHeight: 44");

    const ah = readFileSync('allohaven_module.js', 'utf8');
    expect(ah).toContain("accent: '#93c5fd'");
    expect(ah).toContain("ev.key === 'Escape'");

    const pt = readFileSync('poet_tree_module.js', 'utf8');
    expect(pt).toContain('Save as Assignment — PoetTree setup in My Resources');
    expect(pt).toContain('.theme-contrast .pt-tool');
  });
});
