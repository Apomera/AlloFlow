import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('function visibleSectionLabels('), source.indexOf('/* @clab-label-layout-end */'));
const visible = new Function(block + '; return visibleSectionLabels;')();
const point = (x, y, depth = 100) => ({ x, y, depth });
describe('Coaster readable section labels', () => {
  it('retains separate labels and suppresses collisions in stable feature order', () => {
    const labels = [point(150, 100), point(180, 110), point(450, 100), point(450, 180)];
    expect(visible(labels, 800, 600)).toEqual([true, false, true, true]);
    expect(visible(labels, 800, 600)).toEqual(visible(labels, 800, 600));
  });
  it('keeps a readable gap between adjacent labels', () => {
    expect(visible([point(150, 100), point(267, 100), point(268, 100)], 800, 600)).toEqual([true, false, true]);
  });
  it('hides labels crossing any viewport edge', () => {
    expect(visible([point(40, 100), point(780, 100), point(150, 20), point(150, 599)], 800, 600)).toEqual([false, false, false, false]);
  });
  it.each([-1, 0, NaN, Infinity])('hides labels behind the camera or with invalid depth %j', depth => {
    expect(visible([point(150, 100, depth), point(150, 100)], 800, 600)).toEqual([false, true]);
  });
  it('handles a tiny viewport and invalid projected coordinates', () => {
    expect(visible([point(50, 50)], 90, 80)).toEqual([false]);
    expect(visible([point(NaN, 100), point(100, Infinity)], 800, 600)).toEqual([false, false]);
  });
});
it('disposes inactive style materials once, including materials also attached to meshes', () => {
  const cleanup = source.slice(source.indexOf('function __clabDisposeScene('), source.indexOf('function __clabDestroy('));
  const dispose = new Function(cleanup + '; return __clabDisposeScene;')();
  const active = { dispose: vi.fn() }, inactive = { dispose: vi.fn() };
  dispose({ userData: { clabExtraMaterials: [active, inactive, inactive] }, traverse: visit => visit({ material: active }) });
  expect(active.dispose).toHaveBeenCalledTimes(1); expect(inactive.dispose).toHaveBeenCalledTimes(1);
});
