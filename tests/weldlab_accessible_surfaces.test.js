import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { freshTool, renderState, unmountState, SRC } from './helpers/weldlab_interaction_mount.js';
import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';

beforeEach(freshTool);
afterEach(unmountState);
describe('Weld Lab accessible surfaces and data relationships', () => {
  it.each([false, true])('gives footer and catalog text explicit readable surfaces in contrast=%s', contrast => {
    const root=renderState({view:'menu'},contrast), footer=root.querySelector('[data-weld-menu-footer]');
    expect(footer.style.background).toBe(contrast?'rgb(0, 0, 0)':'rgb(248, 250, 252)');
    expect(footer.style.color).toBe(contrast?'rgb(255, 255, 255)':'rgb(51, 65, 85)');
    if(contrast){
      const tile=[...root.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith("Open Welder's Defect Catalog"));
      expect([...tile.querySelectorAll('[style]')].filter(n=>n.style.color==='rgb(255, 255, 255)')).toHaveLength(4);
    }
  });
  it('keeps the microstructure probe key readable on its own high-contrast ground', () => {
    const root=renderState({view:'metallurgy',met_sect:'haz',met2_hazPred:2},true);
    const key=root.querySelector('[data-weld-microstructure-key]');expect(key).toBeTruthy();
    expect(key.style.background).toBe('rgb(0, 0, 0)');expect(key.style.color).toBe('rgb(255, 255, 0)');
  });
  it('keeps each career reading term and value in a direct description-list group', () => {
    const root=renderState({view:'careerPaths',cp_view:'earnings',car2_pred:{a25:'apprentice',a35:'college',shown:true}});
    const lists=[...root.querySelectorAll('[data-car2-age-route] > dl')]; expect(lists).toHaveLength(3);
    for(const list of lists){expect(list.children).toHaveLength(4);for(const row of list.children){expect([...row.children].map(n=>n.tagName)).toEqual(['DT','DD']);}}
  });
  it('provides opaque programmatic focus and forced-colors fallback without changing other tools', () => {
    const css=document.getElementById('weldlab-focus-css').textContent;
    expect(css).toContain('[data-weld-view] [tabindex="-1"]:focus');
    expect(css).toContain('outline:3px solid #0f172a!important');expect(css).toContain('box-shadow:0 0 0 3px #ffffff!important');
    expect(css).toContain('@media(forced-colors:active)');expect(css).toContain('outline-color:Highlight!important');
  });
  it('can reverse the recorded accessibility fixes without affecting the lesson model code', () => {
    const source=readFileSync(SRC,'utf8'), restored=stripWeldlabWcagFixes(source);
    expect(restored).not.toContain('data-weld-tabset');expect(restored).not.toContain('data-weld-scene-orbit');
    expect(stripWeldlabWcagFixes(restored)).toBe(restored);expect(restored).toContain('function dhPaintSection');
  });
});
