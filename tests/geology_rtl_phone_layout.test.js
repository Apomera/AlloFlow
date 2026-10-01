// Geology Explorer in a right-to-left language and on a phone (checked in a real browser, Arabic and
// English, 1280px and 390px; these pins keep the fixes in place):
//  - the 2D diagrams place labels at fixed x with text-anchor start/end, and an RTL page flips
//    what "start" means, so the labels grew off the left edge ("ال" was all that showed);
//  - the camera view buttons are disabled in walk mode, and on a phone the tool selector sat on them;
//  - the scene-comparison header row had a fixed 442px grid OUTSIDE its scroll box, so the whole
//    Assess view scrolled sideways by 148px on a 390px phone;
//  - the 3D layer callout showed the rock type in English whatever the language.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const source = fs.readFileSync(process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js'), 'utf8');

describe('Geology Explorer in right-to-left languages and on phones', () => {
  it('the 2D diagrams keep their label anchors on an RTL page, and their labels translate', () => {
    expect(source).toContain("style: { flex: '0 0 auto', direction: 'ltr' } },");                                   // cross-section column
    expect(source).toContain("style: { display: 'block', width: '100%', height: H, background: bg, borderRadius: '0.5rem', direction: 'ltr' }");   // scene schematics
    expect(source).toMatch(/function textNode\(label, x, y, anchor\) \{\s*return h\('text', \{[^\n]*\}, geoTT\(label\)\);/);
  });

  it('the disabled camera view buttons are not drawn in walk mode', () => {
    expect(source).toContain("fpOn ? null : h('div', { 'data-geology-view-buttons': 'true', className: 'absolute top-2 left-2 z-10 flex flex-col gap-1 sm:flex-row' },");
  });

  // The real cause of the 148px: below lg the panel grid had NO column template, so its one implicit
  // column grew to the widest content (the comparison table's 500px minimum), pushing every panel
  // wider than the phone. grid-cols-1 is minmax(0, 1fr): the column fits the screen and the table
  // scrolls inside its own box.
  it('the panel grid fits a phone: one shrinkable column below lg', () => {
    expect(source).toContain("className: 'grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'");
  });

  it('the comparison header row scrolls with its table instead of widening the page', () => {
    const panel = source.slice(source.indexOf('function sceneComparisonPanel('), source.indexOf('function datingPanel('));
    const table = panel.indexOf("h('div', { key: 'table', className: 'mt-1 overflow-x-auto");
    const inner = panel.indexOf("h('div', { className: 'min-w-[500px]', role: 'table'", table);
    const headers = panel.indexOf("h('div', { key: 'headers'");
    expect(table).toBeGreaterThan(0);
    expect(inner).toBeGreaterThan(table);
    expect(headers).toBeGreaterThan(inner);                 // inside the scrolling, min-width box
    expect(panel.split("key: 'headers'").length - 1).toBe(1);
  });

  // The callout follows the selected layer and could land on the numbered stage buttons at the
  // right edge (covering "3" at 1280px and at 390px); its right edge now stops short of them.
  it('the 3D layer callout keeps clear of the stage buttons', () => {
    const body = source.slice(source.indexOf('function updateLayerCallout3d('), source.indexOf('var hoverCardKey3d'));
    expect(body).toContain("beacons = hudNode3d('[data-geology-beacon-overlay]')");
    expect(body).toMatch(/placeOverlayNode3d\(node, projectToOverlay3d\([^;]*, 4, limit\);/);
    expect(source).toContain('var right = maxRight != null ? Math.min(w, maxRight) : w;');
    expect(source).toContain('Math.min(right - bw - 4, at.x + dx)');
  });

  it('the 3D layer callout names the rock type in the student\'s language', () => {
    const callout = source.slice(source.indexOf("'data-geology-layer-callout': selected.key"), source.indexOf("'💡 ' + geoTT(calloutBust)"));
    expect(callout).toContain('rockTypeText(selected.R.type, t)');
    expect(callout).not.toContain('}, selected.R.type)');
  });
});
