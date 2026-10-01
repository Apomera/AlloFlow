import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });
const cfg = { version: 1, mode: 'generated', seed: 'PORTRAIT-09', choices: [{ priority: 'offspring', route: 'mixed' }, { priority: 'roots', route: 'mixed' }] };

describe('Grove 3D portrait state', () => {
  it('uses the selected campaign individual and completed-year conditions without mutating the run', () => {
    const grove = E.groveRestore(cfg), saved = JSON.stringify(grove);
    const portrait = E.groveSceneState(grove, 0, 'oak-parent');
    expect(portrait.node).toBe(grove.trees.find(n => n.id === 'oak-parent'));
    expect(portrait.env).toEqual(E.groveEnvironment(grove, 0, grove.receipts.at(-1).event));
    expect(portrait.env).not.toEqual(E.groveEnvironment(grove, 0, E.groveEvent(cfg, 3)));
    expect(portrait.visual).toEqual(E.deriveTreeVisualState(portrait.node.tree, portrait.species, portrait.env, 'summer'));
    expect(JSON.stringify(grove)).toBe(saved);
  });
  it('handles empty patches, stale selected IDs, and an explicitly selected dead tree', () => {
    const grove = E.groveStart(cfg);
    expect(E.groveSceneState(grove, 2, 'oak-parent')).toBeNull();
    expect(E.groveSceneState(grove, 4, 'oak-parent').node.id).toBe('aspen-parent');
    grove.trees[0].tree.alive = false;
    expect(E.groveSceneState(grove, 0, 'oak-parent').node.tree.alive).toBe(false);
  });
  it('renders discoverable view controls and keeps the habitat map available by default', () => {
    const html = renderTool('treeLab', { treeLab: { view: 'grove', groveRun: cfg } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelectorAll('.grove-map button')).toHaveLength(9);
    expect(host.querySelector('.grove-view-switch').textContent).toContain('3D close-up');
    expect(host.querySelector('.grove-closeup-canvas')).toBeNull();
  });
  it('keeps map navigation and measurements available when the 3D host fails', () => {
    window.StemLab.makeBayViewer = () => ({ sync() {}, status() { return 'failed'; } });
    const html = renderTool('treeLab', { treeLab: { view: 'grove', groveView: '3d', groveRun: cfg } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.textContent).toContain('3D is unavailable on this device');
    expect(host.querySelector('.grove-closeup-heading').textContent).toContain('m tall');
    expect(host.querySelector('.grove-view-switch button').disabled).toBe(false);
    expect([...host.querySelectorAll('.grove-camera-controls button')].every(b => b.disabled)).toBe(true);
  });

});
