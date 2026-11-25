// Coaster Lab 2026-11-23 pass: header pill, phone layout, lap-rail labels.
// COASTER_LAYOUT_SRC points at another copy (mutation check against start.js).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.COASTER_LAYOUT_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
// loadTool reads repo-relative paths; an outside copy goes through a temp file
function toolPath() {
  if (!process.env.COASTER_LAYOUT_SRC) return FILE;
  const dir = mkdtempSync(join(tmpdir(), 'clab-'));
  const out = join(dir, 'stem_tool_coasterlab.js');
  writeFileSync(out, SRC);
  return out;
}

describe('Coaster Lab header mission pill', () => {
  beforeEach(() => resetStemLab());

  it('counts against the missions the tab lists, not the quest threshold', () => {
    loadTool(toolPath(), 'coasterLab');
    const html = renderTool('coasterLab', { coasterLab: { missionCount: 9, runs: 4 } });
    const missionsBlock = sliceBetween(SRC, 'const MISSIONS = [', '\n];', { file: FILE });
    const listed = (missionsBlock.match(/\{ id: '/g) || []).length;
    expect(listed).toBe(15);
    expect(html).toContain('Missions: 9/' + listed);
    expect(html).not.toContain('9/6');
  });
});

describe('Coaster Lab phone layout keeps the 3-D stage usable', () => {
  it('a run marks the app, and the phone CSS folds the build panel away while it runs', () => {
    const start = sliceBetween(SRC, 'function startRun(cert){', '\nfunction stopRun(){', { file: FILE });
    const stop = sliceBetween(SRC, 'function stopRun(){', '\nfunction finishRun(', { file: FILE });
    expect(start).toContain("setAttribute('data-running', 'true')");
    expect(stop).toContain("removeAttribute('data-running')");
    const css = sliceBetween(SRC, '/* @clab-phone-layout-start */', '/* @clab-phone-layout-end */', { file: FILE });
    const phone = css.slice(css.indexOf('@media (max-width:760px)'));
    expect(phone).toContain('#clab-app[data-running] #clab-side{display:none}');
    // view buttons move to one row along the top, out of the HUD's way
    expect(phone).toMatch(/#clab-viewTools\{top:8px;bottom:auto/);
    // the lab gets a whole phone screen instead of 78vh under the header
    expect(phone).toContain('height:max(600px,calc(100svh - 16px))!important');
  });
});

describe('Coaster Lab lap rail names only the ticks that have room', () => {
  function ticksFor(milestones, L) {
    const body = sliceBetween(SRC, 'function syncLapMilestones(){', '\nlet lastLapSection', { file: FILE });
    const el = document.createElement('div');
    const fn = new Function('__clabGet', 'track', 'analysis', 'lapMilestones', body + '\nreturn syncLapMilestones;')(
      () => el, { L }, {}, () => milestones);
    fn();
    return [...el.querySelectorAll('b')].map((b) => [b.style.left, b.dataset.label]);
  }
  it('two close ticks keep both marks but print one label', () => {
    // the starter coaster: Drop at 58%, Banked turn at 63% printed on top of each other
    const out = ticksFor([['Lift', 50], ['Drop', 290], ['Banked turn', 315], ['Brakes', 480]], 500);
    expect(out.length).toBe(4);
    const labels = out.map((t) => t[1]).filter(Boolean);
    expect(labels).toEqual(['Lift', 'Drop', 'Brakes']);
  });
  it('well-spaced ticks are all named', () => {
    const out = ticksFor([['Lift', 50], ['Drop', 200], ['Inversion', 330], ['Brakes', 480]], 500);
    expect(out.map((t) => t[1])).toEqual(['Lift', 'Drop', 'Inversion', 'Brakes']);
  });
});
