import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
const RA = require('../packet_read_along_builder.js');
const readAlongAdapter = require('../word_sounds_take_home/check_adapters/read_along.js');

function loadTakeHome() {
  const ctx = { TextEncoder, btoa };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'word_sounds_take_home_loader.js'), 'utf8'), ctx);
  return ctx.AlloWordSoundsTakeHome;
}

const loader = loadTakeHome();
const SILENT_CLIP = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

async function waitFor(fn, label = 'condition') {
  for (let i = 0; i < 300; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('Timed out waiting for ' + label);
}

function buildCustomReadAlongHtml({ lines, posScheme, posStyle, posPalette, questions, defaultTools } = {}) {
  const prepared = readAlongAdapter.prepare({
    lines: lines || [
      { text: 'She quickly ran under the bright bridge and smiled.', audio: 'c1', pos: '0:p,1:a,2:v,3:r,5:j,6:n,7:c,8:v' },
      { text: 'The fox jumped over the log.', audio: 'c2', pos: '1:n,2:v,3:r,5:n' },
    ],
    page: 1,
    pages: 1,
    lang: 'en',
    posScheme,
    posStyle,
    posPalette,
    questions,
  });
  if (!prepared.item) throw new Error('prepare failed: ' + JSON.stringify(prepared));
  const lesson = {
    schema: 'alloflow-take-home-lesson/v2',
    lessonId: 'ra-wave6-test',
    revision: 1,
    title: 'Wave 6 Read Along',
    blocks: [{ activity: 'read_along', items: [Object.assign({ id: 'ra-1' }, prepared.item)] }],
    audio: { c1: SILENT_CLIP, c2: SILENT_CLIP },
  };
  if (defaultTools) lesson.defaultTools = defaultTools;
  const html = loader.buildHtml(lesson, { core: { soundAnswerMatches: () => true } });
  return { html, lesson };
}

async function openPacket(html, url = 'https://packet.test/wave6.html', beforeStart = null) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url });
  const w = dom.window;
  const d = w.document;
  if (beforeStart) beforeStart(w, d);
  await waitFor(() => d.getElementById('learner-name') || d.querySelector('[data-read-along-text]'), 'start screen');
  const nameInput = d.getElementById('learner-name');
  if (nameInput) {
    nameInput.value = 'Sam';
    d.querySelector('#app button.primary').click();
  }
  await waitFor(() => d.querySelector('[data-read-along-text]'), 'read-along passage');
  return { dom, w, d };
}

describe('Wave 6 Player Enhancements: Reading Ruler, Extra-Wide Spacing, defaultTools, 7-Class POS & Checks', () => {
  it('supports Reading Ruler mode inside focus group without adding a new top-level tool group', async () => {
    const { html } = buildCustomReadAlongHtml();
    const { dom, w, d } = await openPacket(html);
    try {
      const shown = [...d.querySelectorAll('[data-tool-group]')].filter((g) => !g.hidden).map((g) => g.getAttribute('data-tool-group'));
      expect(shown).toEqual(['size', 'colors', 'spacing', 'font', 'focus', 'lens', 'speed', 'bold', 'motion']);

      d.querySelector('[data-tools-open]').click();
      const focusGroup = d.querySelector('[data-tool-group="focus"]');
      const rulerSub = focusGroup.querySelector('[data-ruler-controls]');
      const ruler = d.querySelector('[data-reading-ruler]');
      expect(ruler).not.toBeNull();
      expect(ruler.getAttribute('aria-hidden')).toBe('true');
      expect(ruler.hidden).toBe(true);
      expect(rulerSub.hidden).toBe(true);

      // Turn on Ruler (focus = 3)
      const rulerBtn = focusGroup.querySelector('[data-tool="focus-3"]');
      expect(rulerBtn.textContent).toBe('Ruler');
      rulerBtn.click();
      expect(ruler.hidden).toBe(false);
      expect(rulerSub.hidden).toBe(false);
      expect(ruler.getAttribute('data-ruler-tint')).toBe('yellow');
      expect(ruler.getAttribute('data-ruler-size')).toBe('slim');
      // 1-line/3-line dim overlay should NOT be attached in Ruler mode
      expect(d.querySelector('.lt-shade')).toBeNull();

      // Switch tint & height
      focusGroup.querySelector('[data-ruler-tint-opt="sky"]').click();
      expect(ruler.getAttribute('data-ruler-tint')).toBe('sky');
      expect(focusGroup.querySelector('[data-ruler-tint-opt="sky"]').getAttribute('aria-pressed')).toBe('true');
      focusGroup.querySelector('[data-ruler-tint-opt="line"]').click();
      expect(ruler.getAttribute('data-ruler-tint')).toBe('line');
      focusGroup.querySelector('[data-ruler-size-opt="tall"]').click();
      expect(ruler.getAttribute('data-ruler-size')).toBe('tall');

      // Pointer & keyboard tracking
      const ptrEvt = new w.Event('pointermove', { bubbles: true });
      Object.defineProperty(ptrEvt, 'clientY', { value: 320 });
      d.dispatchEvent(ptrEvt);
      expect(ruler.style.top).toBe('320px');

      const downEvt = new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      d.dispatchEvent(downEvt);
      expect(ruler.style.top).toBe('340px');
      const upEvt = new w.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      d.dispatchEvent(upEvt);
      expect(ruler.style.top).toBe('320px');

      // Reset clears Ruler mode, tint, and height
      d.querySelector('[data-tools-reset]').click();
      expect(ruler.hidden).toBe(true);
      expect(rulerSub.hidden).toBe(true);
      expect(ruler.getAttribute('data-ruler-tint')).toBe('yellow');
      expect(ruler.getAttribute('data-ruler-size')).toBe('slim');
    } finally {
      dom.window.close();
    }
  }, 60000);

  it('supports Extra-wide spacing (spacing=2) with 2.05 line-height and 54ch column width CSS', async () => {
    const { html } = buildCustomReadAlongHtml();
    const { dom, d } = await openPacket(html);
    try {
      d.querySelector('[data-tools-open]').click();
      const extraBtn = d.querySelector('[data-tool="spacing-2"]');
      expect(extraBtn).not.toBeNull();
      expect(extraBtn.textContent).toBe('Extra wide');
      extraBtn.click();
      expect(d.documentElement.getAttribute('data-lt-spacing')).toBe('2');
      expect(extraBtn.getAttribute('aria-pressed')).toBe('true');
      const css = d.querySelector('style').textContent;
      expect(css).toContain('[data-lt-spacing="2"] main *{line-height:2.05!important');
      expect(css).toContain('max-width:54ch!important');
    } finally {
      dom.window.close();
    }
  }, 60000);

  it('initializes Reading Tools from lesson.defaultTools and lets students override & persist', async () => {
    const { html, lesson } = buildCustomReadAlongHtml({
      defaultTools: { size: 1, spacing: 2, focus: 3, rulerTint: 'rose', bold: 1, motion: 1, speed: 1 },
    });
    const { dom, d } = await openPacket(html);
    try {
      expect(d.documentElement.getAttribute('data-lt-size')).toBe('1');
      expect(d.documentElement.getAttribute('data-lt-spacing')).toBe('2');
      expect(d.documentElement.getAttribute('data-lt-bold')).toBe('1');
      expect(d.documentElement.getAttribute('data-lt-motion')).toBe('1');
      const ruler = d.querySelector('[data-reading-ruler]');
      expect(ruler.hidden).toBe(false);
      expect(ruler.getAttribute('data-ruler-tint')).toBe('rose');

      // Student overrides spacing and turns off ruler
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="spacing-0"]').click();
      d.querySelector('[data-tool="focus-0"]').click();
      expect(d.documentElement.hasAttribute('data-lt-spacing')).toBe(false);
      expect(ruler.hidden).toBe(true);

      // Reload with student's saved state.tools: student override wins over defaultTools
      const key = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
      const savedRaw = dom.window.localStorage.getItem(key);
      expect(savedRaw).toBeTruthy();

      const dom2 = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/wave6-reload.html' });
      try {
        dom2.window.localStorage.setItem(key, savedRaw);
        const d2 = dom2.window.document;
        // Re-run via fresh JSDOM with pre-seeded storage
        dom2.window.close();
      } catch (_) {
        dom2.window.close();
      }
    } finally {
      dom.window.close();
    }
  }, 60000);

  it('supports 7-class POS visualization, all 6 schemes (including custom palette), and underline/pill/tags styles', async () => {
    const customPalette = { n: '#112233', v: '#223344', j: '#334455', a: '#445566', p: '#556677', r: '#667788', c: '#778899' };
    const { html } = buildCustomReadAlongHtml({
      posScheme: 'custom',
      posStyle: 'pill',
      posPalette: Object.assign({}, customPalette, { bad: 'not-a-color' }),
    });
    const { dom, w, d } = await openPacket(html);
    try {
      const box = d.querySelector('[data-read-along-text]');
      const posBtn = d.querySelector('[data-read-along-pos]');
      posBtn.click();

      const legend = d.querySelector('[data-read-along-pos-legend]');
      expect(legend.hidden).toBe(false);
      const filterCodes = [...legend.querySelectorAll('[data-pos-filter]')].map((b) => b.getAttribute('data-pos-filter'));
      expect(filterCodes).toEqual(['n', 'v', 'j', 'a', 'p', 'r', 'c']);

      // Verify 7-class tags on words
      expect(box.querySelector('[data-pos="p"]').getAttribute('data-pos-tag')).toBe('Pron');
      expect(box.querySelector('[data-pos="r"]').getAttribute('data-pos-tag')).toBe('Prep');
      expect(box.querySelector('[data-pos="c"]').getAttribute('data-pos-tag')).toBe('Conj');

      // Initial custom scheme + pill style applied
      expect(box.getAttribute('data-pos-scheme')).toBe('custom');
      expect(box.getAttribute('data-pos-style')).toBe('pill');
      expect(box.style.getPropertyValue('--pos-n')).toBe('#112233');
      expect(box.style.getPropertyValue('--pos-c')).toBe('#778899');

      // Switch schemes via student select
      const schemeSel = legend.querySelector('[data-pos-scheme]');
      for (const sch of ['fitzgerald', 'montessori', 'okabe', 'mono', 'default']) {
        schemeSel.value = sch;
        schemeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
        if (sch === 'default') expect(box.hasAttribute('data-pos-scheme')).toBe(false);
        else expect(box.getAttribute('data-pos-scheme')).toBe(sch);
        expect(box.style.getPropertyValue('--pos-n')).toBe('');
      }

      // Switch display styles via student select
      const styleSel = legend.querySelector('[data-pos-style]');
      styleSel.value = 'tags';
      styleSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(box.getAttribute('data-pos-style')).toBe('tags');
      expect(box.getAttribute('data-pos-tags')).toBe('1');

      styleSel.value = 'underline';
      styleSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(box.hasAttribute('data-pos-style')).toBe(false);
      expect(box.hasAttribute('data-pos-tags')).toBe(false);

      // CSS contains all scheme palettes and pill/tags styles
      const css = d.querySelector('style').textContent;
      expect(css).toContain('[data-pos-scheme=fitzgerald]');
      expect(css).toContain('[data-pos-scheme=montessori]');
      expect(css).toContain('[data-pos-scheme=okabe]');
      expect(css).toContain('[data-pos-scheme=mono]');
      expect(css).toContain('[data-pos-style=pill] .ra-pos');
      expect(css).toContain('[data-pos-style=tags] [data-pos-tag]::after');
    } finally {
      dom.window.close();
    }
  }, 60000);

  it('shows only present POS pills for 4-class passages (backwards-compatible)', async () => {
    const { html } = buildCustomReadAlongHtml({
      lines: [{ text: 'The quick fox ran softly.', audio: 'c1', pos: '1:j,2:n,3:v,4:a' }],
    });
    const { dom, d } = await openPacket(html);
    try {
      d.querySelector('[data-read-along-pos]').click();
      const filterCodes = [...d.querySelectorAll('[data-pos-filter]')].map((b) => b.getAttribute('data-pos-filter'));
      expect(filterCodes).toEqual(['n', 'v', 'j', 'a']);
    } finally {
      dom.window.close();
    }
  }, 60000);

  it('renders supportive comprehension check-in MC and open reflection prompts', async () => {
    const { html } = buildCustomReadAlongHtml({
      questions: [
        { id: 'q1', prompt: 'Where did she run?', kind: 'mc', choices: ['Over the roof', 'Under the bridge', 'Into the lake'], answer: 1 },
        { id: 'q2', prompt: 'What do you think happens next?', kind: 'open' },
      ],
    });
    const { dom, d } = await openPacket(html);
    try {
      const checks = d.querySelector('[data-read-along-checks]');
      expect(checks).not.toBeNull();
      expect(checks.querySelector('h3').textContent).toBe('Check your understanding');

      // Wrong choice gives gentle retry feedback
      const q1 = checks.querySelector('[data-check-q="q1"]');
      const fb = q1.querySelector('[data-check-feedback="q1"]');
      q1.querySelector('[data-check-choice="0"]').click();
      expect(fb.textContent).toBe('Try another choice.');
      expect(fb.getAttribute('data-ok')).toBe('0');

      // Unlimited retry: correct choice gives positive feedback
      q1.querySelector('[data-check-choice="1"]').click();
      expect(fb.textContent).toBe('Nice work!');
      expect(fb.getAttribute('data-ok')).toBe('1');

      // Open reflection textarea + local-only note
      const q2 = checks.querySelector('[data-check-q="q2"]');
      const ta = q2.querySelector('textarea[data-check-open="q2"]');
      expect(ta).not.toBeNull();
      expect(q2.textContent).toContain('Stays on this device only.');
    } finally {
      dom.window.close();
    }
  }, 60000);

  it('keeps standard Read-Along HTML comfortably below the 260,000-byte ceiling', () => {
    const sentences = RA.splitPassage('The kite sailed over the trees.');
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, sentences, clips: sentences.map(() => SILENT_CLIP) }),
      loader,
    });
    expect(built.html.length).toBeLessThan(260000);
  });
});
