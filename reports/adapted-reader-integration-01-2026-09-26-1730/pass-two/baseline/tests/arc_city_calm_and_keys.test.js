// Arc City — the UDL knobs: calm board, the full keyboard grammar, district grouping,
// and a mojibake guard.
//
// Calm board is §8.3's "reduced clutter", specified and never built — and this pass
// has been adding marks to the board, so the load-bearing assertion here is that calm
// removes DECORATION ONLY. Anything that carries information (guides, gap
// measurements, the beam, the celebration) must survive it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, click } from './helpers/arc_harness.js';

const base = (extra) => Object.assign({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [], introSeen: true }, extra || {});

function press(state, key, target) {
  const r = render(state);
  expect(typeof r.tree.props.onKeyDown, 'shortcuts are bound in play view').toBe('function');
  const before = r.reducers.length;
  r.tree.props.onKeyDown({ key, target: target || {}, preventDefault() { } });
  const queued = r.reducers.slice(before);
  if (!queued.length) return { state: null, sr: r.sr };
  let s = { _arccity: state };
  for (const fn of queued) s = fn(s) || s;
  return { state: s._arccity, sr: r.sr };
}

describe('Arc City — calm board strips decoration, never information', () => {
  const lit = { levelId: 'L3', byLevel: { L3: { params: { a: -0.5, h: 5, k: 5 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [], introSeen: true };

  it('drops the sky wash and every glow halo', () => {
    const loud = render(base());
    expect(loud.find('backdrop')).not.toBeNull();
    const quiet = render(base({ calm: true }));
    expect(quiet.find('backdrop')).toBeNull();
    // no element still asks for a filter
    const withFilter = [];
    (function w(n) {
      if (n == null || n === false) return;
      if (Array.isArray(n)) { n.forEach(w); return; }
      if (typeof n === 'object') { if (n.props && n.props.filter) withFilter.push(n.props.key); if (n.children) n.children.forEach(w); }
    })(quiet.tree);
    expect(withFilter).toEqual([]);
  });

  it('stops the idle animations via the root class, not by deleting the elements', () => {
    const quiet = render(base({ calm: true }));
    expect(quiet.tree.props.className).toMatch(/arc-calm/);
    expect(render(base()).tree.props.className).not.toMatch(/arc-calm/);
    expect(quiet.find('node-off'), 'the node itself is still there').not.toBeNull();
  });

  it('KEEPS everything that tells the player something', () => {
    const quiet = render(base({ calm: true }));
    expect(quiet.find('axis-sym'), 'structure guides are content').not.toBeNull();
    expect(quiet.find('gateSlot0off'), 'the aperture is content').not.toBeNull();
    expect(quiet.find('legend')).not.toBeNull();
    expect(quiet.find('preview')).not.toBeNull();
    const quietWin = render(Object.assign({}, lit, { calm: true }));
    expect(quietWin.find('shock-1'), 'the celebration is feedback, not clutter').not.toBeNull();
    expect(quietWin.text).toMatch(/FIRST TRY!/);
  });

  it('toggles from the board button and from C, and says what it did', () => {
    expect(click(base(), 'calm').calm).toBe(true);
    expect(click(base({ calm: true }), 'calm').calm).toBe(false);
    const viaKey = press(base(), 'c');
    expect(viaKey.state.calm).toBe(true);
    expect(viaKey.sr).toMatch(/Nothing that carries information is hidden/);
  });

  it('reports its state to assistive tech rather than by icon alone', () => {
    expect(render(base()).find('calm').props['aria-pressed']).toBe('false');
    expect(render(base({ calm: true })).find('calm').props['aria-pressed']).toBe('true');
    expect(render(base({ calm: true })).find('calm').props['aria-label']).toMatch(/Calm board is on/);
  });
});

describe('Arc City — the full §8.1 keyboard grammar', () => {
  it('H opens the tip once it is due, and explains itself when it is not', () => {
    const notYet = press(base({ byLevel: { L3: { params: { a: 0, h: 5, k: 1 }, shots: 1, misses: 1 } }, fired: true }), 'h');
    expect(notYet.state).toBeNull();
    expect(notYet.sr).toMatch(/No tip yet/);
    const due = press(base({ byLevel: { L3: { params: { a: 0, h: 5, k: 1 }, shots: 3, misses: 3 } }, fired: true }), 'h');
    expect(due.state.byLevel.L3.hintOpen).toBe(true);
  });

  it('B reads the board out again without changing anything', () => {
    const r = press(base(), 'b');
    expect(r.state).toBeNull();
    expect(r.sr).toMatch(/The dark node to light is at/);
  });

  it('1 / 2 / 3 pick the authoring tier', () => {
    expect(press(base(), '2').state.tier).toBe('guided');
    expect(press(base(), '3').state.tier).toBe('independent');
  });

  it('refuses to override the Gauntlet tier lock, and says why', () => {
    const solved = { L1: { solved: true }, L3: { solved: true }, L4: { solved: true }, L5: { solved: true } };
    const r = press(base({ levelId: 'L10', byLevel: solved, tier: 'independent' }), '1');
    expect(r.state).toBeNull();
    expect(r.sr).toMatch(/The Gauntlet locks the tier/);
  });

  it('? opens a list of every shortcut, and the list matches the handler', () => {
    expect(render(base()).find('keyspanel')).toBeNull();
    const opened = press(base(), '?');
    expect(opened.state.keysOpen).toBe(true);
    const r = render(base({ keysOpen: true }));
    expect(r.find('keyspanel')).not.toBeNull();
    for (const k of ['F', 'R', 'H', 'B', '1 2 3', 'C', '?']) {
      expect(r.find('sc-' + k), 'listed: ' + k).not.toBeNull();
    }
    expect(r.find('keys-toggle').props['aria-expanded']).toBe('true');
  });

  it('still yields every one of them to a text field', () => {
    for (const k of ['f', 'r', 'c', 'h', 'b', '1', '?']) {
      expect(press(base(), k, { tagName: 'INPUT' }).state, k + ' fired inside an input').toBeNull();
    }
  });
});

describe('Arc City — the level strip reads as a route', () => {
  it('groups the fourteen chips into the districts the design names', () => {
    const r = render(base());
    for (const d of ['line', 'curves', 'reach', 'capstone', 'retarget']) {
      expect(r.find('district-' + d), d).not.toBeNull();
    }
    expect(r.text).toMatch(/Reach — high-school preview/);
  });

  it('does not renumber or re-order anything — the unlock chain is positional', () => {
    const r = render(base());
    for (const id of ['L1', 'L2', 'L3', 'L9', 'L10', 'L11', 'L13']) {
      expect(r.find('lvl-' + id), id + ' still in the strip').not.toBeNull();
    }
    expect(r.find('lvl-L2').props.disabled, 'L2 still locked behind L1').toBe(true);
  });
});

describe('Arc City — source text is not mojibake', () => {
  // One line of the Circuit Clash replay panel carried a UTF-8 em dash that had been
  // decoded as CP1252. It rendered as garbage AND was announced as garbage, because
  // the frame it sits in is role=status aria-live. Guard the whole module.
  it('carries no CP1252-decoded UTF-8 anywhere in the module', () => {
    const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js'), 'utf8');
    const needles = [
      ['â€”', 'em dash'],
      ['â€“', 'en dash'],
      ['â€™', 'right single quote'],
      ['â€œ', 'left double quote'],
      ['â€¦', 'ellipsis'],
      ['ï¿½', 'replacement char'],
      ['�', 'U+FFFD']
    ];
    const found = needles.filter(([n]) => src.indexOf(n) >= 0).map(([, label]) => label);
    expect(found).toEqual([]);
  });
});
