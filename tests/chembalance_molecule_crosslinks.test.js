// chemBalance -> Molecule Lab cross-links.
//
// WHY THIS FILE EXISTS
// Nine chemistry topics exist in BOTH tools. In chemBalance they are reference
// tables; in molecule, four of them are things a student can actually drive (the
// Le Chatelier simulator, the PV=nRT sandbox, the kinetics model, the enthalpy
// explorer). Nothing pointed across, so a student reading chemBalance's static
// Equilibrium table had no way to discover the simulator about the same topic.
//
// Two things can silently break here and neither shows up in a render gate:
//   1. the link appearing on a topic whose destination is ALSO static - a promise
//      the destination cannot keep;
//   2. the deep link not actually landing, because the target section id is wrong
//      or the tab bar is left collapsed, dropping the student on a dead panel.
// Both are asserted below.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  newStore,
  makeCtx,
  React,
  ReactDOMServer,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';
const MOLECULE = 'stem_lab/stem_tool_molecule.js';

// The four topics that earn a link, and where each must land.
const LINKED = {
  equilibrium: 'equilibrium',
  gas_laws: 'gaslaws',
  kinetics: 'kinetics',
  thermo: 'thermo',
};

// Duplicated topics whose molecule section is ALSO a static card-list.
//
// redox, nuclear and solutions have since gained their OWN live panels inside
// chemBalance (the cell builder, the decay curve, the dilution bench). That is a
// reason to keep them unlinked, not to link them: molecule's versions of these
// three are still static tables, so sending a student there would take them from
// a working model to a card-list.
const NOT_LINKED = ['organic', 'redox', 'nuclear', 'solutions', 'acids_bases'];

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function chem(subtool) {
  return frag(renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true },
  }));
}

describe('chemBalance — links out only where molecule is genuinely live', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('offers the live link on each of the four interactive topics', () => {
    for (const subtool of Object.keys(LINKED)) {
      const el = chem(subtool);
      expect(el.textContent, `${subtool} should link out`).toContain('Try it live');
    }
  });

  it('does NOT link out where the destination is another static table', () => {
    // The measured difference: these sections add no sliders, no SVG and a
    // single button beyond the shell in molecule. Linking would oversell them.
    for (const subtool of NOT_LINKED) {
      const el = chem(subtool);
      expect(el.textContent, `${subtool} must not link out`).not.toContain('Try it live');
    }
  });

  it('names the destination rather than saying "click here"', () => {
    // The label has to survive being read out of context by a screen reader.
    const labels = {
      equilibrium: 'Le Chatelier simulator',
      gas_laws: 'PV = nRT sandbox',
      kinetics: 'rate + collision model',
      // thermo has since gained its OWN live Gibbs explorer in chemBalance, so
      // this link stopped meaning "go where it is interactive" and now means
      // "see the same topic from the bond-energy side". The label says so -
      // otherwise it reads as if this section had nothing live in it.
      thermo: 'bond-energy view in Molecule Lab',
    };
    for (const [subtool, label] of Object.entries(labels)) {
      expect(chem(subtool).textContent).toContain(label);
    }
  });

  it('the link is a real button, reachable by keyboard', () => {
    const el = chem('equilibrium');
    const button = [...el.querySelectorAll('button')]
      .find((b) => b.textContent.includes('Try it live'));
    expect(button).toBeTruthy();
    expect(button.getAttribute('type')).toBe('button');
    // 40px minimum target, the convention the rest of this footer follows.
    expect(button.className).toMatch(/min-h-\[40px\]/);
  });
});

describe('chemBalance — the deep link actually lands', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStemLab();
  });

  // Renders chemBalance against a live store, clicks the cross-link, and returns
  // the molecule slice the click wrote. setStemLabTool is a noop in this harness,
  // but the STATE WRITE is the half that silently breaks, and it is real here.
  function clickCrossLink(subtool) {
    loadTool(CHEMBALANCE, 'chemBalance');
    const store = newStore({ chemBalance: { subtool, _everPicked: true } });
    const cfg = window.StemLab._registry.chemBalance;

    let clicked = false;
    for (let pass = 0; pass < 6 && !clicked; pass += 1) {
      const ctx = makeCtx({ toolData: store.toolData }, store);
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(() => cfg.render(ctx))
      );
      // Find the handler by re-rendering into a container we can query, then
      // invoke the same onClick React would.
      const el = frag(html);
      const button = [...el.querySelectorAll('button')]
        .find((b) => b.textContent.includes('Try it live'));
      expect(button, `no cross-link button on ${subtool}`).toBeTruthy();

      // Re-render through a tree we can walk for the handler.
      const tree = cfg.render(ctx);
      const handler = findCrossLinkHandler(tree);
      expect(handler, `no onClick found for ${subtool}`).toBeTypeOf('function');
      handler();
      clicked = true;
    }
    return store.toolData.molecule || {};
  }

  // Walks the element tree for the cross-link button's onClick.
  function findCrossLinkHandler(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findCrossLinkHandler(child);
        if (found) return found;
      }
      return null;
    }
    const props = node.props || {};
    const text = JSON.stringify(props.children || '');
    if (node.type === 'button' && typeof props.onClick === 'function'
      && text.includes('Try it live')) {
      return props.onClick;
    }
    return findCrossLinkHandler(props.children);
  }

  for (const [subtool, section] of Object.entries(LINKED)) {
    it(`${subtool} lands on molecule's "${section}" with the tab bar open`, () => {
      const mol = clickCrossLink(subtool);
      expect(mol.expSection).toBe(section);
      // Without this the student arrives with the section rendered but the tab
      // bar collapsed, unable to move to a neighbouring topic.
      expect(mol.referenceLibraryOpen).toBe(true);
    });
  }

  it('every target section really exists in molecule', () => {
    // A typo'd section id would render molecule's collapsed default and look
    // like nothing happened.
    const source = readFileSync(MOLECULE, 'utf8');
    for (const section of Object.values(LINKED)) {
      expect(
        source.includes(`expSection === '${section}'`),
        `molecule has no section '${section}'`
      ).toBe(true);
    }
  });

  it('landing on the target renders that section for real', () => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    const collapsed = frag(renderTool('molecule', { molecule: { expSection: null } }))
      .textContent.trim().length;

    for (const section of Object.values(LINKED)) {
      const landed = frag(renderTool('molecule', {
        molecule: { expSection: section, referenceLibraryOpen: true },
      })).textContent.trim().length;
      expect(landed - collapsed, `${section} rendered nothing`).toBeGreaterThan(300);
    }
  });
});
