import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const cleanups = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

async function runAxe(container) {
  let target = container;
  let tempHost = null;
  if (container && container.ownerDocument !== document) {
    tempHost = document.createElement('div');
    tempHost.innerHTML = container.innerHTML;
    document.body.appendChild(tempHost);
    target = tempHost;
  }
  try {
    const result = await axe.run(target, {
      iframes: false,
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  } finally {
    if (tempHost) tempHost.remove();
  }
}

function loadLifeSkillsDom(htmlFile) {
  const raw = readRepoFile(htmlFile);
  const html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + htmlFile,
    runScripts: 'dangerously',
    beforeParse(win) {
      win.AFRAME = { registerComponent: vi.fn() };
      win.matchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      win.scrollTo = vi.fn();
      win.HTMLElement.prototype.scrollIntoView = vi.fn();
      win.requestAnimationFrame = () => 1;
      win.cancelAnimationFrame = () => {};
    },
  });
  cleanups.push(() => { dom.window.close(); });
  return { raw, dom, win: dom.window, doc: dom.window.document };
}

afterEach(() => {
  while (cleanups.length) {
    const fn = cleanups.pop();
    fn();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const LAB_COMPANIONS = [
  {
    name: 'Kitchen & Food Safety Lab',
    file: 'life_skills_kitchen/life_skills_kitchen.html',
    prefix: 'kitchen',
    h1Icon: null,
  },
  {
    name: 'Laundry & Clothing Care Lab',
    file: 'life_skills_laundry/life_skills_laundry.html',
    prefix: 'laundry',
    h1Icon: null,
  },
  {
    name: 'Home Repair & Systems Lab',
    file: 'life_skills_repair/life_skills_repair.html',
    prefix: 'repair',
    h1Icon: '🔧',
  },
  {
    name: 'Home Safety Walkthrough',
    file: 'life_skills_safety/life_skills_safety.html',
    prefix: 'safety',
    h1Icon: '🛡️',
  },
  {
    name: 'Transit & Street Safety Lab',
    file: 'life_skills_transit/life_skills_transit.html',
    prefix: 'transit',
    h1Icon: null,
  },
];

describe('Other resources polish wave 33 (Life Skills 3D companion simulations)', () => {
  it('polishes life_skills_capstone/life_skills_capstone.html across mirrors with 44px targets, light-theme contrast, STEM lens ARIA, IME-safe Ctrl+Enter save, and 0 axe violations', async () => {
    const file = 'life_skills_capstone/life_skills_capstone.html';
    const src = assertMirrorsMatch(file);

    expect(src).toMatch(/\.step\s*\{[^}]*min-height:44px/);
    expect(src).toMatch(/\.choice,\s*\.tool,\s*\.view\s*\{[^}]*min-height:44px/);
    expect(src).toMatch(/\.hint\s*\{[^}]*min-height:44px/);
    expect(src).toMatch(/\.skip-link:focus\s*\{[^}]*min-height:\s*44px/);
    expect(src).toContain('button:focus-visible, textarea:focus-visible, select:focus-visible, a:focus-visible, main:focus-visible');
    expect(src).toContain(':root[data-theme="light"] .feedback.good');
    expect(src).toContain(':root[data-theme="light"] .feedback.error');
    expect(src).toContain(':root[data-theme="light"] .procedure-stage.current');
    expect(src).toContain(':root[data-theme="light"] .teachback::placeholder { color: #475569; opacity: 1; }');
    expect(src).toContain('.teachback::placeholder { color:#cbd5e1; opacity:1; }');

    const { win, doc } = loadLifeSkillsDom(file);

    const stemBtn = doc.getElementById('stemLensButton');
    const stemText = doc.getElementById('stemLensText');
    expect(stemBtn.getAttribute('aria-pressed')).toBe('false');
    expect(stemBtn.getAttribute('aria-expanded')).toBe('false');
    expect(stemBtn.getAttribute('aria-controls')).toBe('stemLensText');
    expect(stemBtn.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    expect(stemText.hidden).toBe(true);

    stemBtn.click();
    expect(stemBtn.getAttribute('aria-pressed')).toBe('true');
    expect(stemBtn.getAttribute('aria-expanded')).toBe('true');
    expect(stemBtn.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    expect(stemBtn.textContent).toContain('3D STEM Lens: On');
    expect(stemText.hidden).toBe(false);

    // Complete all 5 capstone stations to unlock debrief & teach-back input
    for (let i = 0; i < 5; i += 1) {
      const safeChoice = doc.querySelector('#choices .choice.safe');
      expect(safeChoice).not.toBeNull();
      safeChoice.click();
    }
    expect(doc.getElementById('debrief').hidden).toBe(false);

    const teachBackInput = doc.getElementById('teachBackInput');
    const teachBackFeedback = doc.getElementById('teachBackFeedback');
    teachBackInput.value = 'Turn off the burner first, then call for help.';
    teachBackInput.dispatchEvent(new win.Event('input', { bubbles: true }));

    // IME composition Ctrl+Enter must NOT submit prematurely
    const imeEv = new win.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
    Object.defineProperty(imeEv, 'isComposing', { value: true });
    teachBackInput.dispatchEvent(imeEv);
    expect(teachBackFeedback.textContent).not.toBe('Teach-back saved.');

    // Real Ctrl+Enter saves teach-back
    const saveEv = new win.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
    teachBackInput.dispatchEvent(saveEv);
    expect(teachBackFeedback.textContent).toBe('Teach-back saved.');

    await runAxe(doc.body);
  });

  for (const lab of LAB_COMPANIONS) {
    it(`polishes ${lab.file} across mirrors with 44px targets, complete :focus-visible, themed placeholder contrast, IME-safe Ctrl+Enter save, and 0 axe violations`, async () => {
      const src = assertMirrorsMatch(lab.file);

      expect(src).toContain(`button:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible, main:focus-visible { outline: 3px solid var(--${lab.prefix}-warn); outline-offset: 2px; }`);
      expect(src).toContain(`.reflection-input::placeholder { color: var(--${lab.prefix}-muted); opacity: 1; }`);
      expect(src).toContain(`.reflection-input:focus-visible { outline: 3px solid var(--${lab.prefix}-warn); outline-offset: 2px; }`);
      expect(src).not.toContain('.reflection-input:focus { outline: 2px');
      expect(src).toMatch(/\.mode-wrap select\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.view-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.stem-lens-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.scenario-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.scenario-hint\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.scenario-next\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.task-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.reset-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.help-pause-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.why-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.reflection-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.confidence-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.next-step-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.replay-button\s*\{[^}]*min-height:\s*44px/);
      expect(src).toMatch(/\.skip-link:focus\s*\{[^}]*min-height:\s*44px/);

      const { win, doc } = loadLifeSkillsDom(lab.file);

      if (lab.h1Icon) {
        const h1Icon = doc.querySelector('h1 span[aria-hidden="true"]');
        expect(h1Icon).not.toBeNull();
        expect(h1Icon.textContent).toBe(lab.h1Icon);
      }

      const stemBtn = doc.getElementById('stemLensButton');
      const stemText = doc.getElementById('stemLensText');
      expect(stemBtn.getAttribute('aria-controls')).toBe('stemLensText');
      expect(stemBtn.querySelector('span[aria-hidden="true"]')).not.toBeNull();
      stemBtn.click();
      expect(stemBtn.getAttribute('aria-pressed')).toBe('true');
      expect(stemBtn.getAttribute('aria-expanded')).toBe('true');
      expect(stemText.hidden).toBe(false);

      // Complete all 6 checklist tasks in guided order to reveal reflection panel
      for (let i = 0; i < 6; i += 1) {
        const currentBtn = doc.querySelector('#taskList .task-button.current');
        expect(currentBtn).not.toBeNull();
        currentBtn.click();
      }
      expect(doc.getElementById('reflectionPanel').hidden).toBe(false);

      const reflectionInput = doc.getElementById('reflectionInput');
      const reflectionFeedback = doc.getElementById('reflectionFeedback');
      reflectionInput.value = 'Pause, check for hazards, and ask a trusted person for help.';
      reflectionInput.dispatchEvent(new win.Event('input', { bubbles: true }));

      // IME composition Ctrl+Enter must NOT submit prematurely
      const imeEv = new win.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
      Object.defineProperty(imeEv, 'isComposing', { value: true });
      reflectionInput.dispatchEvent(imeEv);
      expect(reflectionFeedback.textContent).not.toBe('Reflection saved.');

      // Real Ctrl+Enter saves reflection
      const saveEv = new win.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });
      reflectionInput.dispatchEvent(saveEv);
      expect(reflectionFeedback.textContent).toBe('Reflection saved.');

      await runAxe(doc.body);
    });
  }
});
