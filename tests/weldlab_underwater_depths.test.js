import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshTool, renderState, mountState, unmountState, node, click, button, SRC } from './helpers/weldlab_interaction_mount.js';
import { stripUnderwaterDepths } from './helpers/weldlab_underwater_depth_restore.js';

const BASE = { view: 'underwater', uw_view: 'decide', uw_depth: 173, uw_tech: 'dry', uw_probe_time: 7.25, tech2_uw_pred: 'same', tech2_uw_pred_from: 15, weldBadges: {}, defectCatalog: {}, speedBest: {}, pipe2_stack: ['root', 'hot'] };
const COMPLETE = { 0: 0, 1: 1, 2: 2, 3: 3 };
const DEPTHS = [8, 300, 40, 50];
const query = (hook, root = node()) => root.querySelector(`[data-uw-depth-${hook}]`);
const number = (element, attribute) => Number(element.getAttribute(attribute));
const review = (root = node()) => query('review', root);
const pick = index => node().querySelector(`[data-uw-depth-pick="${index}"]`);
const group = index => node().querySelector(`[role="radiogroup"][aria-label="Choices for job ${index + 1}"]`);
const card = index => group(index).parentElement;
const render = (extra = {}, contrast = false) => renderState({ ...BASE, tech2_uw_dec: COMPLETE, ...extra }, contrast);
const mount = (extra = {}, contrast = false) => mountState({ ...BASE, tech2_uw_dec: COMPLETE, ...extra }, contrast);
async function tab(index) { await click([...node().querySelectorAll('[role="tab"]')].find(control => control.textContent.startsWith(index + '.'))); }

beforeEach(freshTool);
afterEach(unmountState);

describe('Underwater completed-job depth review', () => {
  it('reveals no review until all four existing answers normalize to valid choices', () => {
    for (const raw of [undefined, null, 'junk', [0, 1, 2, 3], {}, { 0: 0 }, { 0: 0, 1: 1, 2: 2 }, { 0: 0, 1: 1, 2: 2, 3: 99, 9: 3 }, { 0: 0, 1: 1, 2: 2, 3: { pick: 3 } }]) {
      const root = render({ tech2_uw_dec: raw });
      expect(review(root)).toBeNull();
      expect(root.querySelector('[data-uw-depth-pick], [data-uw-depth-plot], [data-uw-depth-reading]')).toBeNull();
      expect(root.textContent).not.toContain('Compare the four job depths');
    }
    for (const answers of [COMPLETE, { 0: 1, 1: 0, 2: 3, 3: 2 }, { 0: '0', 1: '1', 2: '2', 3: '3' }]) {
      const root = render({ tech2_uw_dec: answers });
      expect(review(root)).toBeTruthy();
      expect(query('details', root).hasAttribute('open')).toBe(false);
    }
    for (const uw_view of ['intro', 'pressure', 'safety', 'career', 'bad']) expect(review(render({ uw_view }))).toBeNull();
  });

  it('uses the exact authored depths on one honest fixed scale with surface zero', () => {
    const root = render(), plot = query('plot', root);
    expect(plot.getAttribute('viewBox')).toBe('0 0 360 405');
    expect(number(plot, 'data-min-depth-ft')).toBe(0);
    expect(number(plot, 'data-max-depth-ft')).toBe(300);
    expect([...plot.querySelectorAll('[data-uw-depth-tick]')].map(tick => number(tick, 'data-uw-depth-tick'))).toEqual([0, 100, 200, 300]);
    expect(plot.textContent).toContain('Surface · 0 ft');
    for (const [index, depth] of DEPTHS.entries()) {
      const marker = plot.querySelector(`[data-uw-depth-marker="${index}"]`), lane = plot.querySelector(`[data-uw-depth-lane="${index}"]`);
      expect(number(marker, 'data-depth-ft')).toBe(depth);
      expect(number(marker, 'cx')).toBe(95 + 70 * index);
      expect(number(marker, 'cy')).toBe(48 + depth);
      expect(number(lane, 'y1')).toBe(48);
      expect(number(lane, 'y2') - number(lane, 'y1')).toBe(depth);
      expect(root.querySelector(`[data-uw-depth-pick="${index}"]`).textContent).toContain(depth + ' ft');
    }
    expect(query('selected', root).textContent).toBe('Case depth: 8 ft below the surface (0 ft).');
    expect(plot.querySelectorAll('[data-uw-depth-selected-ring]')).toHaveLength(1);
  });

  it('selects each authored scenario and explanation without writing any saved work', async () => {
    const app = await mount({ tech2_uw_dec: { 0: 1, 1: 0, 2: 3, 3: 2 } });
    expect(node().textContent).toContain('Score 0 / 4');
    const saved = JSON.stringify(app.latest()), writes = app.writes.length, details = query('details');
    await click(details.querySelector('summary'));
    expect(details.open).toBe(true);
    for (const [index, depth] of DEPTHS.entries()) {
      const originalScenario = card(index).querySelector('p').textContent;
      const paragraphs = [...card(index).querySelector('[data-uw-decision-feedback]').querySelectorAll('p')];
      const originalWhy = paragraphs.at(-1).textContent.replace(/^Why: /, '');
      await click(pick(index));
      expect(query('details')).toBe(details);
      expect(details.open).toBe(true);
      expect(number(query('reading'), 'data-uw-depth-reading')).toBe(index);
      expect(number(query('selected'), 'data-depth-ft')).toBe(depth);
      expect(query('selected').textContent).toBe(`Case depth: ${depth} ft below the surface (0 ft).`);
      expect(query('scenario').textContent).toBe(originalScenario);
      expect(query('explanation').textContent).toBe(originalWhy);
      expect(query('job-title').textContent).toBe(pick(index).textContent);
      expect(pick(index).getAttribute('aria-pressed')).toBe('true');
      expect(review().querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
      const marker = query('plot').querySelector(`[data-uw-depth-marker="${index}"]`);
      expect(marker.getAttribute('data-selected')).toBe('true');
      expect(number(marker, 'cy')).toBe(48 + depth);
      expect(query('plot').getAttribute('aria-label')).toContain(`job ${index + 1}, ${depth} ft`);
    }
    await click(details.querySelector('summary'));
    expect(details.open).toBe(false);
    expect(JSON.stringify(app.latest())).toBe(saved);
    expect(app.writes).toHaveLength(writes);
  });

  it('keeps original first-pick scoring, feedback focus, locks and reset through the review gate', async () => {
    const app = await mount({ tech2_uw_dec: {} });
    expect(node().textContent).toContain('Score 0 / 0');
    expect(node().textContent).not.toContain('Why:');
    expect(review()).toBeNull();
    const choices = [1, 1, 2, 3];
    for (let index = 0; index < 4; index++) {
      await click(group(index).querySelectorAll('button')[choices[index]]);
      expect([...group(index).querySelectorAll('button')].every(control => control.disabled)).toBe(true);
      expect(document.activeElement).toBe(card(index).querySelector('[data-uw-decision-feedback]'));
      if (index < 3) expect(review()).toBeNull();
    }
    expect(app.latest().tech2_uw_dec).toEqual({ 0: 1, 1: 1, 2: 2, 3: 3 });
    expect(node().textContent).toContain('Score 3 / 4');
    expect(review()).toBeTruthy();
    expect(query('details').open).toBe(false);
    await click(query('details').querySelector('summary'));
    await click(pick(1));
    const answers = JSON.stringify(app.latest().tech2_uw_dec);
    await click(group(0).querySelectorAll('button')[0]);
    expect(JSON.stringify(app.latest().tech2_uw_dec)).toBe(answers);
    expect(node().textContent).toContain('Why not B:');
    await click(button('↺ Reset decisions'));
    expect(app.latest().tech2_uw_dec).toEqual({});
    expect(review()).toBeNull();
    expect(node().textContent).toContain('Score 0 / 0');
    expect(node().textContent).not.toContain('Why:');
    expect(app.latest()).toMatchObject({ uw_depth: 173, uw_tech: 'dry', uw_probe_time: 7.25, tech2_uw_pred: 'same', tech2_uw_pred_from: 15, pipe2_stack: ['root', 'hot'] });
  });

  it('keeps selection local across section navigation and restores the native disclosure closed', async () => {
    const app = await mount();
    await click(query('details').querySelector('summary'));
    await click(pick(3));
    await tab(4);
    expect(review()).toBeNull();
    await tab(3);
    expect(number(query('reading'), 'data-uw-depth-reading')).toBe(3);
    expect(query('details').open).toBe(false);
    expect(app.writes.map(([key]) => key)).toEqual(['uw_view', 'uw_view']);
    expect(app.latest()).toMatchObject({ uw_depth: 173, uw_tech: 'dry', uw_probe_time: 7.25, tech2_uw_pred: 'same', tech2_uw_pred_from: 15, tech2_uw_dec: COMPLETE });
  });

  it.each([false, true])('provides a native disclosure, 44px controls and equivalent HTML labels without motion (contrast=%s)', async contrast => {
    await mount({}, contrast);
    const section = review(), details = query('details'), plot = query('plot');
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.querySelector('summary').style.minHeight).toBe('44px');
    expect(section.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(section.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of section.querySelectorAll('button')) {
      expect(control.type).toBe('button');
      expect(control.style.minHeight).toBe('44px');
      expect(control.style.width).toBe('100%');
      expect(section.querySelector('#' + control.getAttribute('aria-controls'))).toBeTruthy();
    }
    expect(plot.getAttribute('role')).toBe('img');
    expect(section.querySelector('#' + plot.getAttribute('aria-describedby'))).toBeTruthy();
    expect(plot.style.width).toBe('100%');
    expect(plot.style.height).toBe('auto');
    expect(plot.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(15, 23, 42)');
    expect(query('reading').getAttribute('aria-live')).toBe('polite');
    expect(query('reading').getAttribute('aria-atomic')).toBe('true');
    expect(section.querySelector('animate, animateTransform, canvas, input')).toBeNull();
    expect(section.querySelector('style').textContent).toContain('animation: none !important');
    expect(section.querySelector('style').textContent).toContain(':focus-visible');
  });

  it('recovers every original Underwater byte after stripping only the three additive blocks', () => {
    const bytes = readFileSync(SRC), source = bytes.toString('utf8');
    const restored = stripUnderwaterDepths(stripWeldlabWcagFixes(source)), start = restored.indexOf('      function UnderwaterLab() {');
    const end = restored.indexOf('      function ProcessSleuth() {', start);
    expect(createHash('sha256').update(restored.slice(start, end)).digest('hex')).toBe('5ed49401cf21b69cc9905d92b3dbba93056a062bb02820a7c729273af86e0a5c');
    expect(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(true);
    expect(source.replace(/\r\n/g, '\n')).not.toContain('\r');
    expect(source).toContain('if (uwDecAnswered !== uwDecisions.length) return null;');
    expect(source).toContain('var jobDepths = [8, 300, 40, 50];');
    expect(restored).not.toContain('uw13:');
    expect(restored).not.toContain('uwDepthJobState');
  });
});
