import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

/**
 * Optics Lab authored content that had no route to it.
 *
 * Eight tables were declared and referenced nowhere: four long-form deep dives
 * written in the same schema as the eight already on the Deep Dives panel but
 * missing from its topic list, and four reference tables (EM spectrum bands,
 * animal vision, famous experiments, optics in Maine) with no sub-view.
 *
 * Nothing else catches this: the tool renders, every gate passes, and the
 * content simply never appears.
 */

const SOURCE = 'stem_lab/stem_tool_optics.js';
const source = readFileSync(SOURCE, 'utf8');

function render(overrides) {
  resetStemLab();
  loadTool(SOURCE, 'opticsLab');
  return renderTool('opticsLab', { opticsLab: { mode: 'home', ...overrides } });
}

describe('Optics Lab content wiring', () => {
  it('leaves no authored table unreferenced', () => {
    const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', locations: true });
    const declared = new Map();
    const used = new Map();
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier'
          && n.init && n.init.type === 'ArrayExpression'
          && /^[A-Z][A-Z0-9_]{3,}$/.test(n.id.name)
          && n.init.elements.length >= 3) {
        declared.set(n.id.name, n.init.elements.length);
      }
      if (n.type === 'Identifier') used.set(n.name, (used.get(n.name) || 0) + 1);
      for (const k of Object.keys(n)) { if (k !== 'loc') walk(n[k]); }
    })(ast);

    expect(declared.size, 'expected to find the content tables').toBeGreaterThan(10);
    const orphans = [...declared.entries()]
      .filter(([name]) => (used.get(name) || 0) <= 1)
      .map(([name, n]) => `${name} (${n} entries)`);
    expect(orphans, 'authored tables that no code reads').toEqual([]);
  });

  it('lists all twelve deep-dive topics, not just the original eight', () => {
    for (const name of ['QUANTUM_OPTICS_DEEP', 'COMPUTATIONAL_PHOTO_DEEP', 'BIOPHOTONICS_DEEP', 'AR_VR_DEEP']) {
      expect(source, `${name} should be in the deep-dive topic list`).toContain(`data: ${name} }`);
    }
  });

  it('renders each newly wired reference sub-view', () => {
    const cases = [
      ['spectrum', 'EM spectrum'],
      ['animalVision', 'Animal vision'],
      ['experiments', 'Famous experiments'],
      ['maine', 'Optics in Maine']
    ];
    for (const [subView, label] of cases) {
      const html = render({ mode: 'reference', refSubView: subView });
      expect(html, `${subView} sub-view should render`).toContain(label);
    }
  });

  it('renders the newly wired deep-dive topics', () => {
    for (const [topic, label] of [['quantum', 'Quantum optics'], ['biophotonics', 'Biophotonics']]) {
      const html = render({ mode: 'deep', deepDiveTopic: topic });
      expect(html, `${topic} deep dive should render`).toContain(label);
    }
  });
});
