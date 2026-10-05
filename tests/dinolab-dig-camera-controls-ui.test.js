import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, label) {
  const a = text.indexOf('// DINO_VOXEL_CAMERA_' + label + '_START'), b = text.indexOf('// DINO_VOXEL_CAMERA_' + label + '_END', a);
  if (a < 0 || b <= a || text.indexOf('// DINO_VOXEL_CAMERA_' + label + '_START', a + 1) >= 0) throw Error('Missing or ambiguous voxel camera seam');
  return text.slice(a,b);
}
const helperSource = bounded(source,'UI');
const render = new Function(helperSource + '\nreturn renderDinoVoxelCameraControls;')();
const summary = new Function(bounded(source,'MODEL') + '\nreturn digVoxelCameraSummary;')();
const english = JSON.parse(readFileSync('ui_strings.js','utf8')).stem.dinolab;
const mirrorEnglish = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js','utf8')).stem.dinolab;
const React = { createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(value => value !== undefined && value !== null && value !== false) }; } };
const T = { panel:'#fff',deeper:'#eee7db',text:'#181511',soft:'#595044',border:'#b9ad9b' };
function nodes(tree) { return tree && typeof tree === 'object' ? [tree,...tree.children.flatMap(nodes)] : []; }
function id(tree,key) { return nodes(tree).find(node => node.props.id === key); }
function text(tree) { return tree == null || tree === false ? '' : typeof tree !== 'object' ? String(tree) : tree.type === 'style' || tree.props['aria-hidden'] === 'true' ? '' : tree.children.map(text).join(' ').replace(/\s+/g,' ').trim(); }
function translate(key,fallback) {
  expect(key.startsWith('stem.dinolab.camera_control_')).toBe(true);
  expect(english[key.slice('stem.dinolab.'.length)],key).toBe(fallback);
  return english[key.slice('stem.dinolab.'.length)];
}
function panel(extra = {}) { return render(React,{ summary:summary({pitch:.7,zoom:1},'full'),status:'ready',onCommand() {},T,translate,...extra }); }
function assertReferences(tree) {
  const all = nodes(tree), ids = all.filter(node => node.props.id).map(node => node.props.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const node of all) for (const attribute of ['aria-labelledby','aria-describedby']) if (node.props[attribute]) for (const key of node.props[attribute].split(' ')) expect(ids,'Missing '+attribute+': '+key).toContain(key);
  expect(text(tree)).not.toMatch(/\{[a-zA-Z_]+\}|\\u(?:\{[a-f0-9]+\}|[a-f0-9]{4})/i);
}
function buttons(tree) { return nodes(tree).filter(node => node.type === 'button'); }

describe('native actual-pose voxel camera controls', () => {
  it('ships the same UI seam and registers all16 additive English phrases in both actual registries', () => {
    expect(bounded(mirrorSource,'UI')).toBe(helperSource);
    const calls = [...helperSource.matchAll(/ct\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    const keys = [...new Set(calls.map(match => 'camera_control_'+match[1]))];
    expect(keys).toHaveLength(16);
    for (const [,suffix,literal] of calls) {
      const key = 'camera_control_'+suffix, fallback = new Function('return '+literal+';')();
      expect(english[key],key).toBe(fallback); expect(mirrorEnglish[key],key).toBe(fallback);
    }
  });

  it('offers exactly three native momentary commands with keyboard defaults and valid descriptions', () => {
    const calls = [], tree = panel({onCommand(action) { calls.push(action); }});
    expect(buttons(tree).map(node => node.props['data-dig-camera-command'])).toEqual(['zoom-in','zoom-out','reset']);
    for (const button of buttons(tree)) { expect(button.props.type).toBe('button'); expect(button.props['aria-pressed']).toBeUndefined(); expect(button.props.tabIndex).toBeUndefined(); button.props.onClick(); }
    expect(calls).toEqual(['zoom-in','zoom-out','reset']); assertReferences(tree);
    expect(id(tree,'dino-voxel-camera-reset').props['aria-label']).toContain('current view or selected site preset');
  });

  it('describes every actual view and orientation with relative viewing zoom and no live announcement churn', () => {
    for (const view of ['full','section','find']) for (const [pitch,orientation] of [[.24,'low'],[.7,'oblique'],[1.53,'overhead']]) {
      const tree = panel({summary:summary({pitch,zoom:1.23},view)}), readout = id(tree,'dino-voxel-camera-summary');
      expect(readout.props['aria-live']).toBe('off');
      expect(readout.props['data-dig-camera-view']).toBe(view); expect(readout.props['data-dig-camera-orientation']).toBe(orientation); expect(readout.props['data-dig-camera-zoom']).toBe(123);
      expect(text(readout)).toContain('viewing zoom 123%'); assertReferences(tree);
    }
  });

  it('disables all commands while loading, failed, lost or unavailable and guards direct handler invocation', () => {
    for (const status of ['loading','failed','error','lost','idle',undefined,null]) {
      const calls = [], tree = panel({status,onCommand(action) { calls.push(action); }});
      for (const button of buttons(tree)) { expect(button.props.disabled).toBe(true); button.props.onClick(); }
      expect(calls).toEqual([]); expect(text(tree)).toContain('available when the 3D view is ready');
      expect(id(tree,'dino-voxel-camera-controls').props['data-dig-camera-available']).toBe('false');
    }
  });

  it('disables only the relevant zoom action at the renderer limits while preserving reset framing', () => {
    for (const [zoom,disabledAction,allowed] of [[.65,'zoom-out',['zoom-in','reset']],[1.8,'zoom-in',['zoom-out','reset']]]) {
      const calls = [], tree = panel({summary:summary({pitch:.7,zoom}),onCommand(action) { calls.push(action); }});
      for (const button of buttons(tree)) { expect(button.props.disabled).toBe(button.props['data-dig-camera-command'] === disabledAction); button.props.onClick(); }
      expect(calls).toEqual(allowed);
    }
  });

  it('keeps ordinary renderer harnesses unchanged when theme or command bridge is unavailable', () => {
    expect(panel({T:null})).toBeNull();
    const tree = panel({onCommand:null});
    expect(buttons(tree).every(button => button.props.disabled)).toBe(true);
    for (const button of buttons(tree)) expect(() => button.props.onClick()).not.toThrow();
  });

  it('does not display arbitrary malformed summary payloads or enable their commands', () => {
    const bad = [null,[],{}, {view:'<script>',orientation:'overhead',zoomPercent:100,canZoomIn:true,canZoomOut:true}, {view:'find',orientation:'fake',zoomPercent:100,canZoomIn:true,canZoomOut:true}, {view:'find',orientation:'low',zoomPercent:900,canZoomIn:true,canZoomOut:true}, {view:'find',orientation:'low',zoomPercent:'100',canZoomIn:true,canZoomOut:true}];
    for (const value of bad) {
      const tree = panel({summary:value}); expect(buttons(tree).every(button => button.props.disabled)).toBe(true);
      expect(text(tree)).not.toMatch(/<script>|fake|900/); expect(id(tree,'dino-voxel-camera-summary').props['data-dig-camera-view']).toBe('full'); assertReferences(tree);
    }
  });

  it('provides explicit one-finger orbit/two-finger pinch guidance and distinguishes framing from measured size', () => {
    const tree = panel();
    expect(text(id(tree,'dino-voxel-camera-touch-hint'))).toContain('One finger: drag to orbit. Two fingers: pinch to zoom.');
    expect(text(id(tree,'dino-voxel-camera-scale-hint'))).toContain('100% uses fitted framing');
    expect(text(id(tree,'dino-voxel-camera-scale-hint'))).toContain('not measured fossil size or excavation depth');
    expect(helperSource).not.toContain('dino-voxel-controls-hint');
  });

  it('keeps controls at44px with a compact responsive layout that wraps long labels', () => {
    expect(helperSource).toContain('min-height:44px'); expect(helperSource).toContain('@media(max-width:520px)');
    expect(helperSource).toContain('flex-wrap:wrap'); expect(helperSource).toContain('overflow-wrap:anywhere');
    expect(helperSource).not.toContain('position:absolute');
    expect(helperSource).not.toContain('onKeyDown');
  });

  it('supports long and right-to-left translated strings without unresolved values or broken references', () => {
    const tree = panel({summary:summary({pitch:1.53,zoom:1.8},'find'),translate(key,fallback) { return 'עברית '+fallback+' · '+('Long translated camera words '.repeat(4)); }});
    assertReferences(tree); expect(text(id(tree,'dino-voxel-camera-summary'))).toContain('180%');
    expect(id(tree,'dino-voxel-camera-zoom-in').props.disabled).toBe(true);
  });
});
