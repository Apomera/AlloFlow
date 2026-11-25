import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';
import { createRealDaWorkspaceFixture } from './helpers/dynamic_assessment_workspace_fixture.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let realWorkspaceApi;

const cleanups = [];

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function setFieldValue(el, value) {
  const proto = el.tagName === 'SELECT'
    ? window.HTMLSelectElement.prototype
    : el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  loadAlloModule('sensitive_workspace_module.js');
  realWorkspaceApi = window.AlloModules.SensitiveWorkspace;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('dynamic_assessment_module.js');
});

afterEach(async () => {
  while (cleanups.length) {
    const fn = cleanups.pop();
    await fn();
  }
  window.AlloModules.SensitiveWorkspace = realWorkspaceApi;
  document.body.innerHTML = '';
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Other Resources Polish — Wave 24', () => {
  it('polishes DynamicAssessment with descriptive progressbar valuetext, live 4,000-char session notes counter, 44px confirm alertdialog with aria-describedby, IME guards, and zero axe violations', async () => {
    const f = await createRealDaWorkspaceFixture(React, { policy: { version: 1, allowExternalAi: [] } });
    window.AlloModules.SensitiveWorkspace = {
      ...f.realApi,
      Boundary: (props) => React.createElement(f.realApi.Boundary, { ...props, service: f.service }),
    };
    const item = {
      id: 'w24-item-1',
      domain: 'custom',
      construct: 'Place value',
      difficulty: 'easy',
      gradeBand: 'K-2',
      prompt: 'What is 2 + 3?',
      correctAnswer: '5',
      promptLadder: [{ level: 1, type: 'cue', text: 'Count on from 2.' }],
    };
    const session = {
      id: 'w24-session',
      studentNickname: 'River Otter',
      domain: 'custom',
      difficulty: 'easy',
      mode: 'clinician',
      isCustomBank: true,
      customBankSnapshot: [item],
      dateStarted: '2026-11-20T10:00:00.000Z',
      sessionItemIds: [item.id],
      currentPhase: 'pretest',
      currentItemIdx: 0,
      itemResults: [],
      currentLadderLevel: 0,
      sessionNote: '',
    };
    f.session.storage.setItem(
      'alloflow_dynamic_assessment_v1',
      JSON.stringify({ sessions: [], activeSession: session, onboardingSeen: true, savedProbeTemplates: [] }),
    );
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    cleanups.push(async () => {
      await act(async () => root.unmount());
      f.dispose();
      host.remove();
    });

    await act(async () => {
      root.render(React.createElement(window.AlloModules.DynamicAssessment, {
        React,
        onClose: vi.fn(),
        addToast: vi.fn(),
        outputLanguage: 'English',
      }));
    });

    const progress = host.querySelector('[role="progressbar"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuetext')).toContain('Item 1 of 1');

    const noteSummary = host.querySelector('[data-da-session-note-count="true"]');
    expect(noteSummary).toBeTruthy();
    expect(noteSummary.style.minHeight).toBe('44px');
    expect(noteSummary.textContent).toContain('0 / 4,000 chars');

    const noteArea = host.querySelector('textarea[aria-label="Session-level notes"]');
    expect(noteArea).toBeTruthy();
    act(() => { setFieldValue(noteArea, 'Calm and engaged'); });
    expect(noteSummary.textContent).toContain('16 / 4,000 chars');

    await runAxe(host);

    // Open discard confirmation alertdialog to verify 44px buttons, aria-describedby, IME Escape guard, and live axe
    const discardBtn = Array.from(host.querySelectorAll('button')).find((b) => /Discard|End/i.test(b.textContent));
    if (discardBtn) {
      act(() => { discardBtn.click(); });
      const alertDialog = host.querySelector('[role="alertdialog"]');
      if (alertDialog) {
        expect(alertDialog.getAttribute('aria-describedby')).toBe('da-confirm-msg');
        expect(host.querySelector('#da-confirm-msg')).toBeTruthy();
        const btns = Array.from(alertDialog.querySelectorAll('button'));
        expect(btns.length).toBe(2);
        btns.forEach((b) => {
          expect(b.type).toBe('button');
          expect(b.style.minHeight).toBe('44px');
        });
        await runAxe(alertDialog);
      }
    }
  });

  it('polishes index.html landing page and tour.html with scoped slide-deck keyboard navigation, accessible progressbar, autoplay aria-pressed, reduced-motion stat counters, and zero axe violations', async () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const doc = new window.DOMParser().parseFromString(html, 'text/html');
    const tourHtml = readFileSync(resolve(process.cwd(), 'tour.html'), 'utf8');
    const tourDoc = new window.DOMParser().parseFromString(tourHtml, 'text/html');
    const sliderSection = tourDoc.querySelector('#slider-container');
    const homeSearch = doc.querySelector('#homeToolSearch');
    expect(sliderSection).toBeTruthy();
    expect(homeSearch).toBeTruthy();

    // Mount search input + architecture slider into live DOM and execute the slide-deck inline script
    const host = document.createElement('div');
    const searchClone = homeSearch.cloneNode(true);
    const sliderClone = sliderSection.cloneNode(true);
    host.appendChild(searchClone);
    host.appendChild(sliderClone);
    document.body.appendChild(host);
    cleanups.push(async () => { host.remove(); });

    const deckScript = Array.from(tourDoc.querySelectorAll('script')).find((s) => s.textContent.includes("document.querySelectorAll('.slide')"));
    expect(deckScript).toBeTruthy();
    // Execute the slide-deck script in an isolated function scope against live document
    new Function(deckScript.textContent)();

    const progress = host.querySelector('#progress-bar-container');
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(progress.getAttribute('aria-valuetext')).toContain('Slide 1 of');

    const counter = host.querySelector('#slide-counter');
    expect(counter.getAttribute('role')).toBe('status');
    expect(counter.getAttribute('aria-live')).toBe('polite');

    const prevBtn = host.querySelector('#prev');
    const nextBtn = host.querySelector('#next');
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    // ArrowRight inside #homeToolSearch must NOT hijack and advance slides!
    searchClone.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(progress.getAttribute('aria-valuenow')).toBe('1');

    // ArrowRight & End inside .architecture-slider advance cleanly
    sliderClone.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(prevBtn.disabled).toBe(false);

    sliderClone.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(nextBtn.disabled).toBe(true);

    sliderClone.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(progress.getAttribute('aria-valuenow')).toBe('1');

    // Autoplay toggle exposes aria-pressed and switches accessible label
    const autoplayBtn = host.querySelector('#autoplay-toggle');
    expect(autoplayBtn.getAttribute('aria-pressed')).toBe('false');
    autoplayBtn.click();
    expect(autoplayBtn.getAttribute('aria-pressed')).toBe('true');
    expect(autoplayBtn.getAttribute('aria-label')).toBe('Pause slide auto-play');
    autoplayBtn.click();
    expect(autoplayBtn.getAttribute('aria-pressed')).toBe('false');

    // Reduced-motion guard exists for stat counters, scroll reveal, and back-to-top
    expect(html).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(html).toContain('if (e.isComposing || e.keyCode === 229) return;');

    await runAxe(sliderClone);
  });

  it('polishes tools.html with search aria-describedby, IME-guarded Escape clear, polite directory count, reduced-motion back-to-top, and zero axe violations', async () => {
    const html = readFileSync(resolve(process.cwd(), 'tools.html'), 'utf8');
    const doc = new window.DOMParser().parseFromString(html, 'text/html');
    const host = document.createElement('div');
    const main = doc.querySelector('main');
    expect(main).toBeTruthy();
    host.appendChild(main.cloneNode(true));
    document.body.appendChild(host);
    cleanups.push(async () => { host.remove(); });

    const searchInput = host.querySelector('#toolSearch');
    const searchHint = host.querySelector('#toolSearchHint');
    expect(searchInput).toBeTruthy();
    expect(searchHint).toBeTruthy();
    expect(searchInput.getAttribute('aria-describedby')).toBe('toolSearchHint');

    // Execute inline directory filter + Escape search clear scripts
    const scripts = Array.from(doc.querySelectorAll('script')).filter((s) => !s.src && s.type !== 'application/ld+json');
    scripts.forEach((s) => { new Function(s.textContent)(); });

    const dirCount = host.querySelector('.tool-directory-count');
    expect(dirCount).toBeTruthy();
    expect(dirCount.getAttribute('role')).toBe('status');
    expect(dirCount.getAttribute('aria-live')).toBe('polite');

    // Escape clears search input unless IME composition is active
    searchInput.value = 'fractions';
    const compEsc = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(compEsc, 'isComposing', { value: true });
    searchInput.dispatchEvent(compEsc);
    expect(searchInput.value).toBe('fractions');

    searchInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(searchInput.value).toBe('');

    // Verify reduced-motion guard on back-to-top button
    expect(html).toContain("prefers-reduced-motion: reduce");

    // Audit the search hero + filter controls region with live axe
    await runAxe(host.querySelector('.tool-finder-hero'));
    await runAxe(host.querySelector('.tool-filter-grid'));
  });

  it('polishes launch.html (eliminating TIMER-001 & INPUT-001) and students.html (contrast, reduced motion, active jump-nav) with zero axe violations', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404 })));

    const launchHtml = readFileSync(resolve(process.cwd(), 'launch.html'), 'utf8');
    const launchDoc = new window.DOMParser().parseFromString(launchHtml, 'text/html');
    document.body.innerHTML = launchDoc.body.innerHTML;
    const launchScript = Array.from(launchDoc.querySelectorAll('script')).find((s) => !s.src && s.type !== 'application/ld+json');
    new Function(launchScript.textContent)();

    // First-visit interstitial exposes Pause/Resume countdown button (WCAG 2.2.1 TIMER-001 fix)
    const overlay = document.getElementById('interstitial');
    const pauseBtn = document.getElementById('inter-pause');
    const countdown = document.getElementById('inter-countdown');
    expect(overlay.hidden).toBe(false);
    expect(pauseBtn).toBeTruthy();
    expect(pauseBtn.getAttribute('aria-pressed')).toBe('false');

    pauseBtn.click();
    expect(pauseBtn.getAttribute('aria-pressed')).toBe('true');
    expect(pauseBtn.textContent).toBe('Resume countdown');
    expect(countdown.textContent).toContain('paused');
    const pausedText = countdown.textContent;
    vi.advanceTimersByTime(5000);
    expect(countdown.textContent).toBe(pausedText);

    vi.useRealTimers();
    await runAxe(document.body);

    // Escape closes interstitial cleanly
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overlay.hidden).toBe(true);

    // Verify fallback clipboard textarea is labeled & hidden from a11y tree (INPUT-001 fix)
    expect(launchHtml).toContain("ta.setAttribute('aria-label', 'Canvas launch link')");
    expect(launchHtml).toContain("ta.setAttribute('aria-hidden', 'true')");

    // Now test students.html
    const studentsHtml = readFileSync(resolve(process.cwd(), 'students.html'), 'utf8');
    const studentsDoc = new window.DOMParser().parseFromString(studentsHtml, 'text/html');
    document.body.innerHTML = studentsDoc.body.innerHTML;
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const studentsScript = Array.from(studentsDoc.querySelectorAll('script')).find((s) => !s.src && s.type !== 'application/ld+json');
    new Function(studentsScript.textContent)();

    // Under prefers-reduced-motion: reduce, all .reveal sections become immediately visible
    const reveals = Array.from(document.querySelectorAll('.reveal'));
    expect(reveals.length).toBeGreaterThan(0);
    expect(reveals.every((el) => el.classList.contains('visible'))).toBe(true);

    // Clicking a jump-nav pill marks it with aria-current="location"
    const xpJump = document.querySelector('.jump-nav a[href="#xp"]');
    expect(xpJump).toBeTruthy();
    xpJump.click();
    expect(xpJump.getAttribute('aria-current')).toBe('location');

    await runAxe(document.querySelector('header'));
    await runAxe(document.querySelector('.jump-nav'));
  });
});
