import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { restorePostureStudy, POSTURE_BASELINE } from './helpers/weldlab_posture_restore.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'safetyHealth', sh_sect: 'ergonomics' };
const CASES = [
  { id: 'overhead', pos: 'Overhead welding (4G plate, 5G pipe)', risk: 'Cervical spine compression + shoulder rotator cuff damage. Neck looks up for sustained periods. Spatter falls down hood + collar.', mitigate: 'Take breaks every 15-20 min. Use shoulder brace if you do a lot of overhead. Adjust workpiece to come to you when possible (use turning gear, positioners).' },
  { id: 'vertical', pos: 'Vertical-up welding (3G, 6G pipe)', risk: 'Lower back strain from awkward stance. Shoulder fatigue from sustained gun position.', mitigate: 'Welder seat for sit-down vertical work. Knee pad if kneeling. Keep gun balanced — proper grip prevents wrist strain.' },
  { id: 'pipe', pos: 'Pipe welding 5G/6G fixed position', risk: 'Working AROUND the pipe — body twists into uncomfortable shapes. The 6G position (pipe at 45°) is considered the hardest qualification because it puts you through every angle.', mitigate: 'Use pipe stands at proper height. Rotate pipe rather than your body when possible. Pipe positioner ($1500-15000) for repeat work pays for itself in saved bodies.' },
  { id: 'confined', pos: 'Confined space welding (tanks, hulls)', risk: 'Cramped position + heat + fume + ventilation issues. Compound stressor.', mitigate: 'Confined-space entry permit + atmosphere monitoring + ventilation + rescue plan. NEVER weld in confined space alone. Lots of breaks.' },
  { id: 'flat', pos: 'Long flat welds (production)', risk: 'Repetitive strain on dominant wrist + forearm. Welder elbow (similar to tennis elbow).', mitigate: 'Switch hands periodically if you can. Anti-vibration gloves. Proper gun balance. Stretching breaks.' }
];
const AUDIT = ['lev', 'stainless_ev', 'papr', 'screens', 'helmet', 'safety_glasses', 'hp_available', 'hp_required', 'hp_double', 'cables_inspected', 'dry_gloves', 'work_clamp', 'fire_ext', 'hot_work_watch', 'cylinder_secured', 'positioner', 'mat', 'breaks'];
let root, host;
const board = (node = host) => node.querySelector('[data-posture-study]');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ isContrast: contrast, toolData: data, setToolData: setData, update: (tool, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function pick(value) { await React.act(() => Simulate.change(board().querySelector('[data-posture-select]'), { target: { value: String(value) } })); }

describe('Safety and Health posture study', () => {
  it('starts on the overhead arrangement and reuses all five complete original titles in the native choice', () => {
    const section = board(render()); expect(section.dataset.postureStudy).toBe('overhead'); expect(section.dataset.index).toBe('0');
    expect([...section.querySelectorAll('option')].map(node => node.textContent)).toEqual(CASES.map((row, i) => (i + 1) + '. ' + row.pos));
    expect(section.querySelector('[data-posture-prev]').disabled).toBe(true); expect(section.querySelector('[data-posture-next]').disabled).toBe(false);
  });

  it('maps every manual selection to its distinct geometry and full unchanged lesson passages', async () => {
    await mount(); const geometries = [];
    for (let i = 0; i < CASES.length; i++) {
      const row = CASES[i]; await pick(i); const section = board(), svg = section.querySelector('svg');
      expect(section.dataset).toMatchObject({ postureStudy: row.id, index: String(i) });
      expect(section.querySelector('[data-posture-name]').textContent).toBe(row.pos); expect(section.querySelector('[data-posture-risk]').textContent).toBe(row.risk); expect(section.querySelector('[data-posture-mitigate]').textContent).toBe(row.mitigate);
      for (const suffix of ['diagram', 'worker', 'workpiece', 'torch', 'reading']) expect(section.querySelector('[data-posture-' + suffix + ']').getAttribute('data-posture-' + suffix)).toBe(row.id);
      expect(svg.getAttribute('aria-label')).toContain(row.pos); geometries.push(svg.querySelector('[data-posture-limbs]').getAttribute('d'));
      expect(svg.querySelector('[data-posture-enclosure]') !== null).toBe(row.id === 'confined'); expect(svg.querySelector('[data-posture-bench]') !== null).toBe(row.id === 'flat');
      expect(svg.querySelectorAll('[data-posture-stock]')).toHaveLength(row.id === 'pipe' ? 0 : 1);
    }
    expect(new Set(geometries).size).toBe(5); expect(board().querySelector('[data-posture-next]').disabled).toBe(true);
  });

  it('keeps the five original cards and habits byte-for-byte unchanged through all selections', async () => {
    await mount(); const cards = board().nextElementSibling.nextElementSibling, habits = cards.nextElementSibling;
    const originalCards = cards.outerHTML, originalHabits = habits.outerHTML;
    expect([...cards.children].map(node => [node.children[0].textContent, node.children[1].textContent, node.children[2].textContent])).toEqual(CASES.map(row => [row.pos, 'Risk: ' + row.risk, 'Mitigate: ' + row.mitigate]));
    expect(habits.querySelectorAll('li')).toHaveLength(7); expect(habits.textContent).toContain('If something hurts repeatedly: see a doctor BEFORE it becomes a chronic issue.');
    for (let i = 0; i < CASES.length; i++) { await pick(i); expect(cards.outerHTML).toBe(originalCards); expect(habits.outerHTML).toBe(originalHabits); }
  });

  it('supports previous/next without wraparound and keeps the native selection synchronized', async () => {
    await mount(); for (let i = 1; i < CASES.length; i++) { await click(board().querySelector('[data-posture-next]')); expect(board().dataset.index).toBe(String(i)); expect(board().querySelector('select').value).toBe(String(i)); }
    await click(board().querySelector('[data-posture-next]')); expect(board().dataset.index).toBe('4');
    for (let i = CASES.length - 2; i >= 0; i--) { await click(board().querySelector('[data-posture-prev]')); expect(board().dataset.index).toBe(String(i)); }
    await click(board().querySelector('[data-posture-prev]')); expect(board().dataset.index).toBe('0');
  });

  it('ignores empty/nonfinite input and clamps finite selections to the five authored cases', async () => {
    await mount(); await pick(2); for (const bad of ['', 'NaN', 'Infinity', '__proto__']) { await pick(bad); expect(board().dataset.index).toBe('2'); }
    await pick(-3); expect(board().dataset.index).toBe('0'); await pick(20); expect(board().dataset.index).toBe('4'); await pick(1.6); expect(board().dataset.index).toBe('2');
    expect(board().outerHTML).not.toContain('NaN'); expect(board().outerHTML).not.toContain('[object Object]');
  });

  it('writes no saved answers, noise tasks, gas settings, hierarchy choices, PPE or other module work', async () => {
    const extra = { sh_audit: { lev: 'no', positioner: 'yes' }, sh_shop_station: 'electrical', safe2_noise: [{ db: 85, h: 6 }], safe2_hoc: { eng1: 2 }, safe2_gas: 'helium', safe2_level: 'top', ps_view: 'gear', pipe2_stack: ['root', 'hot'] };
    const app = await mount(extra), saved = JSON.stringify(app.latest()); for (let i = 0; i < CASES.length; i++) await pick(i);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
  });

  it('preserves unanswered-audit gating and N/A-excluded scoring after posture exploration', async () => {
    const answers = Object.fromEntries(AUDIT.slice(0, -1).map(id => [id, id === 'work_clamp' ? 'no' : id === 'papr' ? 'na' : 'yes']));
    const app = await mount({ sh_audit: answers }); await pick(4); await click(button('🛡 How safe is your shop?'));
    expect(board()).toBeNull(); expect(host.textContent).not.toContain('📊 Your shop score:'); expect(host.querySelector('[data-shop-checklist-item="breaks"]').textContent).not.toContain('Fix:');
    await click(host.querySelector('[data-audit-answer="breaks:yes"]')); expect(app.latest().sh_audit).toEqual({ ...answers, breaks: 'yes' }); expect(host.textContent).toContain('📊 Your shop score: 94%'); expect(host.querySelector('[data-shop-checklist-item="work_clamp"]').textContent).toContain('Fix:');
  });

  it('appears only in the ergonomics browse topic and ignores pseudo saved posture values', () => {
    for (const sh_sect of ['overview', 'fume', 'eyes', 'noise', 'burns', 'electrical', 'controls', 'mental', 'bad']) expect(board(render({ sh_sect }))).toBeNull();
    expect(board(render({ sh_mode: 'audit' }))).toBeNull(); expect(board(render({ safe10_posture: 4, safe10_pose: 'flat' })).dataset.index).toBe('0');
  });

  it.each([false, true])('provides readable HTML, native44px controls and explicit contrast/focus without animated or measured geometry, contrast=%s', async contrast => {
    await mount({}, contrast); const section = board(), edge = contrast ? '#ffff00' : '#6b21a8';
    expect(section.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)'); expect(section.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(250, 245, 255)');
    for (const node of section.querySelectorAll('button,select')) { expect(node.style.minHeight).toBe('44px'); expect(node.getAttribute('aria-controls')).toBe('safe10-posture-reading'); }
    expect(section.querySelector('label[for="safe10-posture-select"]')).toBeTruthy(); for (const node of section.querySelectorAll('button')) expect(node.type).toBe('button');
    section.querySelector('select').focus(); expect(document.activeElement).toBe(section.querySelector('select')); expect(section.dataset.index).toBe('0');
    const reading = section.querySelector('[data-posture-reading]'); expect(reading.getAttribute('aria-live')).toBe('polite'); expect(reading.getAttribute('aria-atomic')).toBe('true'); for (const node of reading.querySelectorAll('p')) expect(node.className).toContain('text-base');
    const svg = section.querySelector('svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 640 360'); expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet'); expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto');
    expect(section.querySelector('style').textContent).toContain('outline:3px solid ' + edge + '!important'); expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    expect(section.querySelector('svg text,input,canvas,animate,animateTransform,animateMotion,[data-angle],[data-strain],[data-exposure],[data-safe-duration]')).toBeNull(); expect(section.querySelector('[data-posture-scope]').textContent).toContain('do not measure joint angles, strain, exposure or safe working duration');
  });

  it('recovers the complete original SafetyHealth region after restoring only the five-record extraction and removing the local board', () => {
    const source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8')); const region = source.slice(source.indexOf('      function SafetyHealthDeepDive() {'), source.indexOf('      function MathBlueprintLab() {'));
    expect(createHash('sha256').update(restorePostureStudy(region)).digest('hex')).toBe(POSTURE_BASELINE.originalSafetySha256);
    expect(POSTURE_BASELINE.originalArray.match(/\{ pos:/g)).toHaveLength(5); expect(restorePostureStudy(restorePostureStudy(region))).toBe(restorePostureStudy(region));
  });
});
