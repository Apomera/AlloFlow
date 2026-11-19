import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// Break it Down in a student's file, in the app's look (2026-11-18, owner: a first-time player got stuck on how to
// answer). One round colored tile per sound (its letters, or a speaker when letters are off), side by side; tap a tile to
// hear it and hold it (it lifts, the empty boxes light up), then tap a box, or drag the tile there; a filled box takes its
// tile's color; what each move did is shown under the boxes as well as said. Choices: Easy shows the word's sounds and
// one more. The grading is unchanged (tests/packets_answer_audit_2026_11_13.test.js).
const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const toWav = async () => 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=';
const build = (extra = {}) => builder.buildPacket({ words: ['cat', 'sun', 'map'], activities: ['segmentation'], seed: 1, title: 'Break it Down', core, dictionary, banks: BANKS, loader, wordlist, toWav, ...extra });

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function start(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/b.html', beforeParse(w) {
    w.Audio = class { play() { const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 1); return Promise.resolve(); } pause() {} };
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  d.getElementById('learner-name').value = 'Ana';
  [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start').click();
  for (let i = 0; i < 50 && !d.querySelector('.slots'); i++) await wait(10);
  const tiles = () => [...d.querySelectorAll('[data-seg-tray] > li')].filter((li) => !li.hidden).map((li) => li.querySelector('button'));
  const boxes = () => [...d.querySelectorAll('ol.slots button')];
  const said = () => d.querySelector('[data-seg-say]').textContent;
  const button = (text) => [...d.querySelectorAll('#app button')].find((b) => b.textContent === text);
  return { w, d, tiles, boxes, said, button };
}

describe('Break it Down in the app\'s look', () => {
  it('one tile per sound, a speaker on each with letters off, no Listen beside it; boxes show where a sound goes', async () => {
    const p = await start((await build()).html);
    const tiles = p.tiles();
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    for (const [i, tile] of tiles.entries()) {
      expect(tile.parentNode.querySelectorAll('button').length).toBe(1);
      expect(tile.getAttribute('aria-label')).toBe('Pick up Sound ' + (i + 1));
      expect(tile.querySelector('[data-seg-icon="sound"][aria-hidden="true"]')).not.toBeNull();
      expect(tile.style.borderRadius).toBe('50%');
    }
    // Every tile follows the active Reading Tools theme via CSS variables (no hardcoded hex/rgb fill or ink).
    for (const tile of tiles) {
      expect(tile.style.background).toBe('var(--soft)');
      expect(tile.style.color).toBe('var(--ink)');
      expect(tile.style.borderColor).toBe('var(--accent)');
    }
    for (const [i, box] of p.boxes().entries()) {
      expect(box.getAttribute('aria-label')).toBe('Box ' + (i + 1) + ', empty');
      expect(box.querySelector('[data-seg-icon="drop"][aria-hidden="true"]')).not.toBeNull();
    }
    // The tiles come right after the boxes and the line that says what happened; Check comes after the tiles.
    const order = [...p.d.querySelectorAll('ol.slots, [data-seg-say], [data-seg-tray], button')].map((n) => (n.matches('ol.slots') ? 'boxes' : n.hasAttribute('data-seg-say') ? 'say' : n.hasAttribute('data-seg-tray') ? 'tiles' : n.textContent === 'Check' ? 'check' : null)).filter(Boolean);
    expect(order).toEqual(['boxes', 'say', 'tiles', 'check']);
  });

  it('with letters on, a tile shows its sound', async () => {
    const p = await start((await build({ showLetters: true })).html);
    expect(p.tiles().every((t) => /^\/\w+\/$|\(/.test(t.textContent))).toBe(true);
  });

  it('each tap says on screen what it did; a held tile lifts and the empty boxes light up', async () => {
    const p = await start((await build()).html);
    p.button('Check').click();
    expect(p.said()).toBe('Put a sound in every box first.');
    p.boxes()[0].click();
    expect(p.said()).toBe('Tap a sound to pick it up, then tap a box to put it there. Tap a filled box to take its sound out.');
    const first = p.tiles()[0];
    first.click();
    expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(first.style.transform).toContain('translateY(-6px)');
    expect(p.said()).toBe('Sound 1 picked up. Now choose a box.');
    expect(p.boxes().every((b) => /var\(--accent\)/.test(b.style.boxShadow))).toBe(true);
    p.boxes()[1].click();
    expect(p.said()).toBe('Sound 1 is in box 2.');
    expect(p.boxes()[1].getAttribute('aria-label')).toBe('Box 2: Sound 1');
    // The box takes the tile's color; the tile leaves the row; the other boxes stop lighting up.
    expect(p.boxes()[1].style.backgroundColor).toBe(first.style.backgroundColor);
    expect(first.parentNode.hidden).toBe(true);
    expect(p.boxes().some((b) => /var\(--accent\)/.test(b.style.boxShadow))).toBe(false);
    // Tap the filled box: its sound goes back.
    p.boxes()[1].click();
    expect(p.said()).toBe('Sound 1 taken out of box 2.');
    expect(first.parentNode.hidden).toBe(false);
  });

  it('a tile can be dragged into a box, and a box\'s sound to another box or back to the tiles', async () => {
    const p = await start((await build()).html);
    const drag = (from, to) => {
      const ev = (type, x, y) => from.dispatchEvent(new p.w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      p.d.elementFromPoint = () => to;
      ev('pointerdown', 10, 10); ev('pointermove', 40, 40); ev('pointerup', 40, 40);
      from.dispatchEvent(new p.w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })); // the click a drag ends with does nothing
    };
    const tile = p.tiles()[2];
    drag(tile, p.boxes()[0]);
    expect(p.boxes()[0].getAttribute('aria-label')).toBe('Box 1: Sound 3');
    expect(p.said()).toBe('Sound 3 is in box 1.');
    expect(p.d.querySelectorAll('body > [aria-hidden="true"][style*="position:fixed"]').length).toBe(0);
    await wait(450);
    drag(p.boxes()[0], p.boxes()[2]);
    expect(p.boxes()[2].getAttribute('aria-label')).toBe('Box 3: Sound 3');
    expect(p.boxes()[0].getAttribute('aria-label')).toBe('Box 1, empty');
    await wait(450);
    drag(p.boxes()[2], p.d.querySelector('[data-seg-tray]'));
    expect(p.boxes()[2].getAttribute('aria-label')).toBe('Box 3, empty');
    expect(p.said()).toBe('Sound 3 taken out of box 3.');
    // A short move is a tap.
    await wait(450);
    const other = p.tiles()[0];
    other.dispatchEvent(new p.w.MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
    other.dispatchEvent(new p.w.MouseEvent('pointermove', { bubbles: true, clientX: 13, clientY: 12, button: 0 }));
    other.dispatchEvent(new p.w.MouseEvent('pointerup', { bubbles: true, clientX: 13, clientY: 12, button: 0 }));
    other.click();
    expect(other.getAttribute('aria-pressed')).toBe('true');
  });

  it('Choices: Easy shows the word\'s sounds and one more; Medium and All as before', async () => {
    const chips = async (choices) => (await build({ choices })).lesson.blocks[0].items.map((it) => ({ sounds: it.sounds.length, chips: it.chips.length }));
    const all = await chips('all'), medium = await chips('medium'), easy = await chips('easy');
    expect(medium).toEqual(all);
    for (const [i, row] of easy.entries()) {
      expect(row.chips, 'easy ' + i).toBe(Math.min(row.sounds + 1, all[i].chips));
      expect(all[i].chips).toBeGreaterThan(row.sounds + 1);
    }
  });

  it('the file holds no web address and no element that could load anything (the icons are characters)', async () => {
    const { html } = await build();
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video|svg)\b/i);
  });

  it('chips and boxes follow every Reading Tools theme with no hardcoded colors and pass AA contrast in all 8 palettes', async () => {
    const built = await build({ showLetters: true });
    const p = await start(built.html);
    const tile = p.tiles()[0];
    // Idle tray tile uses --soft / --ink / --accent.
    expect([tile.style.background, tile.style.color, tile.style.borderColor]).toEqual(['var(--soft)', 'var(--ink)', 'var(--accent)']);
    // Picked tray tile flips to --accent / --accent-ink; empty boxes highlight with --soft / --accent.
    tile.click();
    expect([tile.style.background, tile.style.color, tile.style.borderColor]).toEqual(['var(--accent)', 'var(--accent-ink)', 'var(--accent)']);
    expect([p.boxes()[0].style.background, p.boxes()[0].style.color, p.boxes()[0].style.borderColor]).toEqual(['var(--soft)', 'var(--accent)', 'var(--accent)']);
    // Placed box adopts --soft / --ink / --accent.
    p.boxes()[0].click();
    expect([p.boxes()[0].style.background, p.boxes()[0].style.color, p.boxes()[0].style.borderColor]).toEqual(['var(--soft)', 'var(--ink)', 'var(--accent)']);
    // Submit a deliberately wrong arrangement to verify retry ("bad") box uses --warn-bg / --warn (not dark #1d2433 on dark themes).
    const remaining = p.tiles();
    p.boxes()[1].click(); // empty -> no-op
    remaining[remaining.length - 1].click(); p.boxes()[1].click();
    const rem2 = p.tiles();
    rem2[rem2.length - 1].click(); p.boxes()[2].click();
    p.button('Check').click();
    const checkedBoxes = p.boxes();
    const badBoxes = checkedBoxes.filter((b) => b.getAttribute('aria-label').includes('check this one'));
    if (badBoxes.length) {
      for (const b of badBoxes) {
        expect([b.style.background, b.style.color, b.style.borderColor]).toEqual(['var(--warn-bg)', 'var(--warn)', 'var(--warn)']);
      }
      // Second wrong attempt triggers reveal(), which must set --ok-bg / --ok / --ok on every box.
      p.button('Check').click();
    }
    for (const b of p.boxes()) {
      expect([b.style.background, b.style.color, b.style.borderColor]).toEqual(['var(--ok-bg)', 'var(--ok)', 'var(--ok)']);
    }
    // Verify the embedded CSS defines all 8 theme palettes (default light, OS dark, colors 1..6) with >= 4.5:1 AA contrast for every state pair.
    const css = p.d.querySelector('style').textContent;
    const parseVars = (block) => Object.fromEntries([...block.matchAll(/(--[a-z-]+):([^;}\s]+)/g)].map((m) => [m[1], m[2]]));
    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    };
    const lum = (hex) => {
      const [r, g, b] = hexToRgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
    const themes = [
      ['default-light', /:root\{([^}]+)\}/.exec(css)[1]],
      ['os-dark', /prefers-color-scheme:dark\)\{:root\{([^}]+)\}/.exec(css)[1]],
      ...[1, 2, 3, 4, 5, 6].map((n) => ['colors-' + n, new RegExp('\\[data-lt-colors="' + n + '"\\]\\{([^}]+)\\}').exec(css)[1]]),
    ];
    for (const [label, block] of themes) {
      const v = parseVars(block);
      expect(ratio(v['--ink'], v['--soft']), label + ' idle chip ink/soft').toBeGreaterThanOrEqual(4.5);
      expect(ratio(v['--accent-ink'], v['--accent']), label + ' held chip accent-ink/accent').toBeGreaterThanOrEqual(4.5);
      expect(ratio(v['--accent'], v['--soft']), label + ' holding empty box accent/soft').toBeGreaterThanOrEqual(4.5);
      expect(ratio(v['--muted'], v['--card']), label + ' empty box muted/card').toBeGreaterThanOrEqual(4.5);
      expect(ratio(v['--warn'], v['--warn-bg']), label + ' retry box warn/warn-bg').toBeGreaterThanOrEqual(4.5);
      expect(ratio(v['--ok'], v['--ok-bg']), label + ' reveal box ok/ok-bg').toBeGreaterThanOrEqual(4.5);
    }
    // Adapter source itself must contain zero hardcoded hex/rgb fills or ink.
    const src = require('node:fs').readFileSync('word_sounds_take_home/adapters/segmentation.js', 'utf8');
    const codeLines = src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(codeLines).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });
});
