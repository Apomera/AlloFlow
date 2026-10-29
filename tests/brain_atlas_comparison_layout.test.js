import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');
const profileBlock = source.split('// BEGIN BRAIN ATLAS STRUCTURE PROFILES')[1].split('// END BRAIN ATLAS STRUCTURE PROFILES')[0];
const { profiles, references } = Function(profileBlock + ';return {profiles:BRAIN_ATLAS_STRUCTURE_PROFILES,references:BRAIN_ATLAS_PROFILE_SOURCES};')();
const structures = ['Allen_body_of_hippocampus_L', 'Allen_amygdaloid_complex_L'];
const fields = ['functionText', 'connectionsText', 'clinicalText'];
const canonical = key => key.replace(/_[LR]$/i, '');
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

function setup(keys = structures) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', atlasDisplayMode: '3d', brain3DCompareActive: true, brain3DCompareStructures: keys } });
  const nodes = () => flatten(tool.render(makeCtx({}, store)));
  const panel = () => {
    const element = nodes().find(node => node.props?.['data-brainatlas-3d-compare'] === 'true');
    const host = document.createElement('div');
    host.innerHTML = ReactDOMServer.renderToStaticMarkup(element);
    return host.firstElementChild;
  };
  return { store, nodes, panel };
}

beforeEach(resetStemLab);

describe('Brain Atlas comparison reading order', () => {
  it('pairs the complete A/B explanations inside each category, with names beside every value', () => {
    const { panel } = setup();
    const comparison = panel();
    const identities = [...comparison.querySelectorAll('.brainatlas-3d-compare-identities h4')].map(node => node.textContent);
    expect(identities).toHaveLength(2);
    expect(identities[0]).toMatch(/hippocampus.*left/i);
    expect(identities[1]).toMatch(/amygdaloid.*left/i);
    const rows = [...comparison.querySelectorAll('[data-brainatlas-compare-category]')];
    expect(rows.map(row => row.dataset.brainatlasCompareCategory)).toEqual(fields);
    rows.forEach((row, fieldIndex) => {
      expect(row.querySelector('h4').id).toBe(row.getAttribute('aria-labelledby'));
      const values = [...row.querySelectorAll('article')];
      expect(values).toHaveLength(2);
      values.forEach((value, index) => {
        expect(value.dataset.tone).toBe(index ? 'b' : 'a');
        expect(value.dataset.brainatlasProfile).toBe(canonical(structures[index]));
        expect(value.querySelector('h5').textContent).toContain(identities[index]);
        expect(value.querySelector('h5').id).toBe(value.getAttribute('aria-labelledby'));
        expect(value.querySelector('[data-brainatlas-profile-field]').textContent).toBe(profiles[canonical(structures[index])][fields[fieldIndex]]);
      });
    });
  });

  it('keeps every reference in a final row named for its corresponding structure', () => {
    const comparison = setup().panel();
    const referenceRow = comparison.lastElementChild;
    expect(referenceRow.classList.contains('brainatlas-3d-compare-references')).toBe(true);
    const identities = [...comparison.querySelectorAll('.brainatlas-3d-compare-identities h4')].map(node => node.textContent);
    const cells = [...referenceRow.querySelectorAll('article')];
    expect(cells).toHaveLength(2);
    cells.forEach((cell, index) => {
      expect(cell.querySelector('h4').textContent).toContain(identities[index]);
      expect(cell.querySelector('h4').id).toBe(cell.getAttribute('aria-labelledby'));
      expect(cell.querySelector('[data-brainatlas-profile-sources]').dataset.brainatlasProfileSources).toBe(canonical(structures[index]));
      const expected = profiles[canonical(structures[index])].sourceIds.map(id => references[id]);
      const links = [...cell.querySelectorAll('a')];
      expect(links.map(link => link.href)).toEqual(expected.map(reference => reference.url));
      expect(links.map(link => link.textContent)).toEqual(expected.map(reference => reference.title));
      links.forEach(link => expect(link.rel).toContain('noopener'));
    });
  });

  it('retains complete one-selection content and the remove/close actions', () => {
    const s = setup();
    const remove = s.nodes().find(node => node.props?.className === 'brainatlas-3d-compare-remove');
    remove.props.onClick();
    expect(s.store.toolData.brainAtlas.brain3DCompareStructures).toEqual([structures[1]]);
    const comparison = s.panel();
    expect(comparison.textContent).toContain('Choose one more structure');
    expect(comparison.querySelectorAll('.brainatlas-3d-compare-identities article')).toHaveLength(1);
    fields.forEach(field => {
      const row = comparison.querySelector('[data-brainatlas-compare-category="' + field + '"]');
      expect(row.querySelectorAll('article')).toHaveLength(1);
      expect(row.querySelector('.brainatlas-3d-compare-grid').dataset.count).toBe('1');
      expect(row.querySelector('[data-brainatlas-profile-field]').textContent).toBe(profiles[canonical(structures[1])][field]);
    });
    expect(comparison.querySelectorAll('[data-brainatlas-profile-sources]')).toHaveLength(1);
    s.nodes().find(node => node.props?.className === 'brainatlas-3d-compare-close').props.onClick();
    expect(s.store.toolData.brainAtlas.brain3DCompareActive).toBe(false);
    expect(s.nodes().some(node => node.props?.['data-brainatlas-3d-compare'])).toBe(false);
  });
});
