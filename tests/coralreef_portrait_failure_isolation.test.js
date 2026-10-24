import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
function portraitFunction() {
  const source = fs.readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8');
  let found;
  function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'SpeciesPortrait') { found = node; return; }
    Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(walk) : value && typeof value === 'object' && walk(value));
  }
  walk(acorn.parse(source, { ecmaVersion: 'latest' }));
  if (!found) throw new Error('SpeciesPortrait not found');
  const thumbs = Object.create(null), pending = [];
  const renderThumbs = vi.fn((ids, done) => new Promise(resolve => pending.push({ ids, done, resolve })));
  const Component = vm.runInNewContext('(' + source.slice(found.start, found.end) + ')', {
    THUMBS: thumbs, renderThumbs, companionUrl: path => '/stem_lab/' + path,
    speciesMeta: () => ({ group: 'fish' }), groupIconKind: group => group,
    reefIcon: h => h('svg', { 'data-fallback-icon': 'true', 'aria-hidden': 'true' })
  });
  return { Component, thumbs, pending, renderThumbs };
}
async function mount(noDraw = true) {
  const fixture = portraitFunction(), host = document.createElement('div'); document.body.appendChild(host);
  const reactRoot = ReactDOMClient.createRoot(host);
  const t = { ...fixture, host, root: reactRoot, async show(id, alt = id) {
    await React.act(async () => reactRoot.render(React.createElement(fixture.Component, { env: { React, h: React.createElement }, id, noDraw, alt })));
  } };
  mounted.push(t); await t.show('clownfish', 'Clownfish'); return t;
}
async function fail(t) {
  const image = t.host.querySelector('img'); expect(image).toBeTruthy();
  await React.act(async () => image.dispatchEvent(new Event('error')));
}
afterEach(async () => {
  while (mounted.length) {
    const t = mounted.pop(); await React.act(async () => t.root.unmount());
    t.pending.forEach(p => p.resolve()); await Promise.resolve(); t.host.remove();
  }
});
describe('species portrait failure isolation', () => {
  it('tries the next species image in a reused dive portrait without starting another renderer', async () => {
    const t = await mount(); await fail(t);
    expect(t.host.querySelector('[role="img"]').getAttribute('aria-label')).toBe('Clownfish');
    expect(t.host.querySelector('img')).toBeNull();
    await t.show('blue_tang', 'Blue tang');
    const next = t.host.querySelector('img'); expect(next).toBeTruthy();
    expect(next.getAttribute('src')).toBe('/stem_lab/assets/coralreef/species/blue_tang.webp');
    expect(next.alt).toBe('Blue tang'); expect(t.renderThumbs).not.toHaveBeenCalled();
  });
  it('keeps each newly failed species accessible while ordinary rerenders do not retry its missing image', async () => {
    const t = await mount(); await fail(t); await t.show('blue_tang', 'Blue tang'); await fail(t);
    await t.show('blue_tang', 'Updated description');
    expect(t.host.querySelector('img')).toBeNull();
    expect(t.host.querySelector('[role="img"]').getAttribute('aria-label')).toBe('Updated description');
    await t.show('green_turtle', 'Green turtle');
    expect(t.host.querySelector('img').alt).toBe('Green turtle');
    expect(t.renderThumbs).not.toHaveBeenCalled();
  });
  it('retains cached drawn fallback and ignores the old render completion after changing species', async () => {
    const t = await mount(false); await fail(t);
    expect(t.renderThumbs).toHaveBeenCalledTimes(1); expect(t.pending[0].ids).toEqual(['clownfish']);
    await t.show('blue_tang', 'Blue tang');
    expect(t.host.querySelector('img')?.getAttribute('src')).toBe('/stem_lab/assets/coralreef/species/blue_tang.webp');
    await React.act(async () => { t.thumbs.clownfish = 'data:image/webp;base64,cached'; t.pending[0].done('clownfish'); t.pending[0].resolve(); await Promise.resolve(); });
    expect(t.host.querySelector('img')?.alt).toBe('Blue tang');
    await t.show('clownfish', 'Clownfish again');
    expect(t.host.querySelector('img').getAttribute('src')).toBe('data:image/webp;base64,cached');
    expect(t.renderThumbs).toHaveBeenCalledTimes(1);
  });
});
