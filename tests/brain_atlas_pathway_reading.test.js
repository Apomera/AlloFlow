import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], strings) || fallback || key;
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
const routes = [
  ['papez', 'Hippocampus'],
  ['visual', 'Optic tract'],
  ['motor', 'Precentral gyrus'],
  ['language', 'Inferior frontal opercular cortex']
];

function setup(route) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', brain3DPathway: route } });
  const announce = vi.fn();
  let nodes;
  const render = () => { nodes = flatten(tool.render(makeCtx({ t: translate, announceToSR: announce }, store))); };
  render();
  return {
    store, render, announce,
    buttons: () => nodes.filter(node => node.props?.className === 'brainatlas-3d-pathway-step'),
    card: () => nodes.find(node => node.props?.['data-brainatlas-pathway-reading'] === 'true')
  };
}

function expectReadingMatchesButton(s, index) {
  const button = s.buttons()[index];
  expect(button.props['aria-current']).toBe('step');
  const label = flatten(button).find(node => node.type === 'strong').props.children;
  const card = s.card();
  expect(card).toBeDefined();
  const cardNodes = flatten(card);
  expect(cardNodes.find(node => node.props?.className === 'brainatlas-3d-pathway-reading-number').props.children).toBe(index + 1);
  expect(cardNodes.find(node => node.type === 'strong').props.children).toBe(label);
  const description = cardNodes.find(node => node.type === 'p').props.children;
  expect(description).toBe(button.props.title);
  expect(description.length).toBeGreaterThan(20);
  expect(description).not.toContain('\u2026');
  // The existing pathway announcer owns speech. Reading the on-screen card
  // should not create a second live announcement as the highlighted step changes.
  for (const node of cardNodes) expect(node.props?.['aria-live']).toBeUndefined();
  return label;
}

beforeEach(() => {
  resetStemLab(); vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Brain Atlas visible pathway reading card', () => {
  it.each(routes)('shows the full initial %s explanation without a live announcement', (route, firstLabel) => {
    const s = setup(route);
    expect(expectReadingMatchesButton(s, 0)).toBe(firstLabel);
    expect(s.announce).not.toHaveBeenCalled();
  });

  it.each(routes)('follows actual %s step-button navigation and retains each full explanation', route => {
    const s = setup(route);
    const count = s.buttons().length;
    expect(count).toBeGreaterThan(1);
    // Include a return to the start after visiting every step, so a stale
    // initial card cannot accidentally satisfy the navigation assertions.
    for (const index of [...Array.from({ length: count - 1 }, (_, i) => i + 1), 0]) {
      s.buttons()[index].props.onClick();
      expect(s.store.toolData.brainAtlas.brain3DPathwayStep).toBe(index);
      s.render();
      expectReadingMatchesButton(s, index);
      expect(s.buttons().filter(button => button.props['aria-current'] === 'step')).toHaveLength(1);
    }
  });
});
