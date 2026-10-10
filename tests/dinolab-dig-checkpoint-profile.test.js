import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.DINOLAB_CHECKPOINT_PROFILE_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function block(name) {
  const start = '// DINO_VOXEL_' + name + '_START', end = '// DINO_VOXEL_' + name + '_END';
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a || source.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous checkpoint profile seam: ' + name);
  return source.slice(a, b);
}
const helperSource = block('CHECKPOINT_MODEL') + block('CHECKPOINT_PROFILE_MODEL') + block('CHECKPOINT_PROFILE_UI');
const H = new Function(helperSource + '\nreturn { record:digVoxelCheckpointRecord, compare:digVoxelCheckpoint, profile:digVoxelCheckpointProfile, render:renderDinoDigCheckpointProfile };')();
function english(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return parsed.stem ? parsed.stem.dinolab : parsed;
}
const registries = [
  english(process.env.DINOLAB_CHECKPOINT_PROFILE_ENGLISH || 'ui_strings.js'),
  english(process.env.DINOLAB_CHECKPOINT_PROFILE_ENGLISH_MIRROR || 'desktop/web-app/public/ui_strings.js')
];
const T = { text:'#142132', soft:'#475467', border:'#98a2b3', panel:'#ffffff', deeper:'#eef2f6' };
const statusWords = { covered:'Covered', partial:'Partly excavated', contact:'Contact recorded', exposed:'Fragment exposed', cleared:'Cleared' };
const React = { createElement(type, props, ...children) { return { type, props:props || {}, children:children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) }; } };
function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : []; }
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function visibleText(tree) {
  return tree == null || tree === false ? '' : typeof tree !== 'object' ? String(tree)
    : tree.type === 'style' || tree.props.hidden || tree.props['aria-hidden'] === 'true' ? ''
      : tree.children.map(visibleText).join(' ').replace(/\s+/g, ' ').trim();
}
function survey(patches = {}, focus = 7, seed = 42) {
  const columns = Array.from({ length:24 }, (_, index) => {
    const [removed, status] = patches[index] || [0,'covered'];
    return { index, row:Math.floor(index / 6), col:index % 6, coord:String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining:4 - removed, status };
  });
  return { seed, focus, selected:columns[focus], columns };
}
function pair(before = {}, after = { 7:[2,'contact'] }, focus = 7) {
  const current = survey(after, focus), baseline = H.record(survey(before, focus));
  return { current, baseline, comparison:H.compare(current, baseline) };
}
function render(p = pair(), extra = {}) {
  return H.render(React, { survey:p.current, checkpoint:p.comparison, T, statusWords, ...extra });
}
function sides(tree) {
  return Object.fromEntries(nodes(tree).filter(node => ['saved','current'].includes(node.props['data-dig-profile-side'])).map(node => [node.props['data-dig-profile-side'], node]));
}
function levels(side) { return nodes(side).filter(node => node.type === 'rect' && node.props['data-dig-profile-level'] !== undefined); }
function assertReadable(tree) {
  expect(visibleText(tree)).not.toMatch(/\{[a-zA-Z_]+\}|\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
  const ids = nodes(tree).filter(node => node.props.id).map(node => node.props.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const node of nodes(tree)) for (const attr of ['aria-labelledby','aria-describedby']) {
    if (node.props[attr]) for (const id of node.props[attr].split(' ')) expect(ids, 'Missing profile description: ' + id).toContain(id);
  }
}

describe('selected-coordinate temporal excavation comparison', () => {
  it('projects the selected coordinate rather than site totals or a different changed coordinate', () => {
    const p = pair({ 7:[1,'partial'] }, { 0:[4,'cleared'], 7:[3,'contact'], 23:[2,'partial'] });
    expect(H.profile(p.current, p.comparison)).toEqual({ seed:42, focus:7, coord:'B2', beforeRemoved:1, removed:3, beforeRemaining:3, remaining:1, delta:2, beforeStatus:'partial', status:'contact', changed:true, kind:'removed' });
    expect(p.comparison.layersRemoved).toBe(8);
  });

  it('keeps the four-level reference and exact removal interval across every legal depth pair', () => {
    for (let beforeRemoved = 0; beforeRemoved <= 4; beforeRemoved++) for (let removed = beforeRemoved; removed <= 4; removed++) {
      const status = depth => depth === 0 ? 'covered' : depth === 4 ? 'cleared' : 'partial';
      const p = pair({ 23:[beforeRemoved,status(beforeRemoved)] }, { 23:[removed,status(removed)] }, 23);
      const profile = H.profile(p.current, p.comparison);
      expect(profile).toMatchObject({ coord:'F4', focus:23, beforeRemoved, removed, delta:removed - beforeRemoved, beforeRemaining:4 - beforeRemoved, remaining:4 - removed });
      expect(profile.beforeRemoved + profile.beforeRemaining).toBe(4);
      expect(profile.removed + profile.remaining).toBe(4);
      expect(profile.beforeRemaining - profile.remaining).toBe(profile.delta);
      expect(profile.kind).toBe(removed === beforeRemoved ? 'unchanged' : 'removed');
    }
  });

  it('distinguishes a legal equal-depth contact observation from cover removal and rejects equal-depth exposure after contact', () => {
    const p = pair({ 7:[2,'partial'] }, { 7:[2,'contact'] });
    expect(H.profile(p.current, p.comparison)).toMatchObject({ kind:'status', changed:true, delta:0, beforeRemoved:2, removed:2, beforeStatus:'partial', status:'contact' });
    const incompatible = pair({ 7:[2,'contact'] }, { 7:[2,'exposed'] });
    expect(incompatible.comparison.kind).toBe('ahead');
    expect(H.profile(incompatible.current,incompatible.comparison)).toBeNull();
  });

  it('retains unchanged selected coordinates as controls while other coordinates change', () => {
    const p = pair({ 7:[2,'contact'] }, { 0:[4,'cleared'], 7:[2,'contact'] });
    expect(p.comparison.changedColumns.map(column => column.index)).toEqual([0]);
    expect(H.profile(p.current, p.comparison)).toMatchObject({ focus:7, kind:'unchanged', delta:0, changed:false, beforeStatus:'contact', status:'contact' });
  });

  it('tracks all 24 public coordinate selections without changing the saved comparison or excavation', () => {
    const before = {}, after = Object.fromEntries(Array.from({ length:24 }, (_, index) => [index,[index % 5,index % 5 === 0 ? 'covered' : index % 5 === 4 ? 'cleared' : 'partial']]));
    const p = pair(before, after), checkpointBefore = JSON.stringify(p.comparison), surfaceBefore = JSON.stringify(p.current.columns);
    for (let focus = 0; focus < 24; focus++) {
      const selected = { ...p.current, focus, selected:p.current.columns[focus] };
      expect(H.profile(selected, p.comparison)).toMatchObject({ focus, coord:selected.selected.coord, removed:focus % 5, delta:focus % 5 });
    }
    expect(JSON.stringify(p.comparison)).toBe(checkpointBefore);
    expect(JSON.stringify(p.current.columns)).toBe(surfaceBefore);
  });

  it('recomputes trusted records and ignores forged supplied columns or aggregate counters', () => {
    const p = pair(), supplied = { ...p.comparison, layersRemoved:999, newContacts:999, newExposed:999, columns:[{ index:7, coord:'B2', removed:4, status:'exposed', shape:'hidden anatomy' }] };
    expect(H.profile(p.current, supplied)).toEqual(H.profile(p.current, p.comparison));
  });

  it('rejects unavailable, stale, forged or incompatible comparison identities', () => {
    const p = pair();
    for (const supplied of [null, {}, { ...p.comparison, kind:'missing' }, { ...p.comparison, kind:'ahead' }, { ...p.comparison, key:'forged' }, { ...p.comparison, baselineKey:'forged' }, { ...p.comparison, seed:43 }, { ...p.comparison, baseline:H.record(survey({},7,43)) }]) expect(H.profile(p.current, supplied)).toBeNull();
    expect(H.profile(survey({ 7:[2,'contact'] },7,43),p.comparison)).toBeNull();
  });

  it('hides the temporal comparison after Undo moves behind its saved observations', () => {
    const forward = pair({ 7:[2,'contact'] }, { 7:[3,'contact'] });
    expect(H.profile(forward.current,forward.comparison).delta).toBe(1);
    expect(H.profile(survey({ 7:[1,'partial'] }),forward.comparison)).toBeNull();
    const statusForward = pair({ 7:[2,'exposed'] }, { 7:[2,'exposed'] });
    expect(H.profile(survey({ 7:[2,'contact'] }),statusForward.comparison)).toBeNull();
  });

  it('normalizes shuffled records but rejects missing, duplicated or inconsistent selected observations', () => {
    const p = pair(), shuffled = { ...p.current, columns:[...p.current.columns].reverse() };
    expect(H.profile(shuffled,p.comparison)).toEqual(H.profile(p.current,p.comparison));
    for (const mutate of [s => s.columns.pop(), s => s.columns[1] = s.columns[0], s => s.selected = { ...s.selected, remaining:0 }, s => s.focus = 24, s => s.columns[7].coord = 'A1', s => s.columns[7].removed = 5]) {
      const invalid = survey({ 7:[2,'contact'] }); mutate(invalid);
      expect(H.profile(invalid,p.comparison)).toBeNull();
    }
  });

  it('reads no hidden find fields and returns an independent public projection from frozen inputs', () => {
    const p = pair({ 7:[1,'partial'] }, { 7:[3,'contact'] });
    const objects = [p.current, p.comparison, p.baseline, p.comparison.baseline, ...p.current.columns, ...p.baseline.columns, ...p.comparison.baseline.columns];
    for (const object of objects) {
      for (const key of ['burial','shape','species','hasBone','anatomy','hiddenFind']) Object.defineProperty(object,key,{ get() { throw Error('Read hidden ' + key); } });
      Object.freeze(object);
    }
    Object.freeze(p.current.columns); Object.freeze(p.baseline.columns); Object.freeze(p.comparison.baseline.columns);
    const result = H.profile(p.current,p.comparison);
    expect(result).toMatchObject({ delta:2, kind:'removed' });
    expect(Object.keys(result).sort()).toEqual(['seed','focus','coord','beforeRemoved','removed','beforeRemaining','remaining','delta','beforeStatus','status','changed','kind'].sort());
    result.removed = 4; result.beforeRemoved = 0;
    expect(p.current.selected.removed).toBe(3); expect(p.baseline.columns[7].removed).toBe(1);
  });
});

describe('read-only checkpoint change profile', () => {
  it('opens through a closed native disclosure and names the exact selected coordinate counts and statuses', () => {
    const tree = render(pair({ 7:[1,'partial'] },{ 7:[3,'contact'] })), root = byId(tree,'dino-checkpoint-profile');
    expect(root.props).toMatchObject({ 'data-dig-profile-kind':'removed', 'data-dig-profile-delta':2, 'data-dig-profile-focus':7 });
    const details = byId(tree,'dino-checkpoint-profile-details'); expect(details.type).toBe('details'); expect(details.props.open).toBeUndefined();
    expect(nodes(details).filter(node => node.type === 'summary')).toHaveLength(1);
    const mapKey = byId(tree,'dino-checkpoint-profile-map-key'); expect(mapKey).toBeDefined();
    expect(nodes(details).map(node => node.props.id)).not.toContain('dino-checkpoint-profile-map-key');
    expect(visibleText(mapKey)).toMatch(/outline/i);
    expect(visibleText(mapKey)).toMatch(/(?:border|changed)/i);
    expect(mapKey.props.hidden).toBeUndefined(); expect(mapKey.props['aria-hidden']).not.toBe('true');
    const images = nodes(tree).filter(node => node.type === 'svg' && node.props.role === 'img'); expect(images).toHaveLength(1);
    const description = images[0].props['aria-label'];
    expect(description).toContain('B2'); expect(description).toContain('1'); expect(description).toContain('3'); expect(description).toContain('2');
    expect(description).toContain(statusWords.partial); expect(description).toContain(statusWords.contact);
    assertReadable(tree);
  });

  it('draws four ordered levels per side on an identical depth scale', () => {
    for (const [beforeRemoved,removed] of [[0,0],[0,4],[1,3],[3,4],[4,4]]) {
      const status = depth => depth === 0 ? 'covered' : depth === 4 ? 'cleared' : 'partial';
      const tree = render(pair({ 7:[beforeRemoved,status(beforeRemoved)] },{ 7:[removed,status(removed)] }));
      const groups = sides(tree); expect(Object.keys(groups).sort()).toEqual(['current','saved']);
      const saved = levels(groups.saved), current = levels(groups.current);
      expect(saved.map(node => node.props['data-dig-profile-level'])).toEqual([1,2,3,4]);
      expect(current.map(node => node.props['data-dig-profile-level'])).toEqual([1,2,3,4]);
      saved.forEach((level,index) => {
        expect(Number(level.props.height)).toBeGreaterThan(0);
        expect(Number(level.props.y)).toBe(Number(current[index].props.y));
        expect(Number(level.props.height)).toBe(Number(current[index].props.height));
        if (index > 0) expect(Number(level.props.y)).toBeGreaterThan(Number(saved[index - 1].props.y));
      });
      const surfaces = Object.fromEntries(nodes(tree).filter(node => node.props['data-dig-profile-surface']).map(node => [node.props['data-dig-profile-surface'],node]));
      expect(Object.keys(surfaces).sort()).toEqual(['current','saved']);
      const step = Number(saved[1].props.y) - Number(saved[0].props.y), origin = Number(saved[0].props.y);
      expect(Number(surfaces.saved.props.y1)).toBe(origin + beforeRemoved * step);
      expect(Number(surfaces.current.props.y1)).toBe(origin + removed * step);
      expect(surfaces.saved.props.y1).toBe(surfaces.saved.props.y2);
      expect(surfaces.current.props.y1).toBe(surfaces.current.props.y2);
      expect(surfaces.saved.props.strokeDasharray).toBeTruthy(); expect(surfaces.current.props.strokeDasharray).toBeUndefined();
    }
  });

  it('highlights only current levels newly removed after the baseline, excluding earlier excavation', () => {
    for (let beforeRemoved = 0; beforeRemoved <= 4; beforeRemoved++) for (let removed = beforeRemoved; removed <= 4; removed++) {
      const status = depth => depth === 0 ? 'covered' : depth === 4 ? 'cleared' : 'partial';
      const groups = sides(render(pair({ 7:[beforeRemoved,status(beforeRemoved)] },{ 7:[removed,status(removed)] })));
      expect(levels(groups.saved).filter(node => node.props['data-dig-profile-additional'] === 'true')).toHaveLength(0);
      const highlighted = levels(groups.current).filter(node => node.props['data-dig-profile-additional'] === 'true').map(node => node.props['data-dig-profile-level']);
      expect(highlighted).toEqual(Array.from({ length:removed - beforeRemoved },(_,i) => beforeRemoved + i + 1));
    }
  });

  it('represents a status-only contact observation without inventing additional removed layers', () => {
    const tree = render(pair({ 7:[2,'partial'] },{ 7:[2,'contact'] }));
    expect(byId(tree,'dino-checkpoint-profile').props).toMatchObject({ 'data-dig-profile-kind':'status', 'data-dig-profile-delta':0 });
    expect(nodes(tree).filter(node => node.props['data-dig-profile-additional'] === 'true')).toHaveLength(0);
    expect(visibleText(tree)).toContain(statusWords.partial); expect(visibleText(tree)).toContain(statusWords.contact);
    expect(visibleText(tree)).toMatch(/(?:no|0|zero) additional/i);
    assertReadable(tree);
  });

  it('keeps an unchanged selected coordinate visible even when other coordinates have changed', () => {
    const tree = render(pair({ 7:[1,'partial'] },{ 0:[4,'cleared'],7:[1,'partial'] }));
    expect(byId(tree,'dino-checkpoint-profile').props).toMatchObject({ 'data-dig-profile-kind':'unchanged', 'data-dig-profile-delta':0 });
    expect(nodes(tree).filter(node => node.props['data-dig-profile-additional'] === 'true')).toHaveLength(0);
    expect(visibleText(tree)).toMatch(/match|unchanged/i);
  });

  it('omits invalid historical profiles and Find mode without offering an input or mutation callback', () => {
    const p = pair(), stateBefore = JSON.stringify(p);
    expect(render(p,{ findMode:true })).toBeNull(); expect(render(p,{ T:null })).toBeNull();
    expect(render(p,{ checkpoint:{ ...p.comparison, key:'forged' } })).toBeNull();
    expect(render(p,{ survey:null })).toBeNull();
    const tree = render(p,{ onSelect() { throw Error('Unexpected selection'); }, onNote() { throw Error('Unexpected note mutation'); }, onChange() { throw Error('Unexpected state mutation'); } });
    expect(nodes(tree).filter(node => ['button','input','textarea','select'].includes(node.type))).toHaveLength(0);
    expect(nodes(tree).some(node => Object.keys(node.props).some(key => /^on[A-Z]/.test(key)))).toBe(false);
    expect(JSON.stringify(p)).toBe(stateBefore);
  });

  it('registers its readable phrases in both English registries and keeps observation separate from interpretation', () => {
    const calls = new Map();
    function translate(key,fallback) {
      expect(key.startsWith('stem.dinolab.change_profile_')).toBe(true);
      const short = key.slice('stem.dinolab.'.length); calls.set(short,fallback);
      for (const registry of registries) expect(registry[short],key).toBe(fallback);
      return fallback;
    }
    for (const p of [pair(),pair({ 7:[2,'partial'] },{ 7:[2,'contact'] }),pair({ 7:[1,'partial'] },{ 7:[1,'partial'] })]) {
      const tree = render(p,{ translate }); assertReadable(tree);
      expect(visibleText(tree)).not.toMatch(/Tyrannosaurus|buried bone|hidden anatomy/);
    }
    expect(calls.size).toBe(17);
    const wording = [...calls.values()].join(' ');
    expect(wording).toMatch(/model/); expect(wording).toMatch(/(?:recorded status|removed count)/i);
    expect(wording).toMatch(/(?:species|geological age|measured depth|same animal)/i);
  });
});
