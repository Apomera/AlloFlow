import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_decomposer.js', 'desktop/web-app/public/stem_lab/stem_tool_decomposer.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const disposers = [];
let frames;

// These are the learner-facing criteria, checked against rendered DOM rather
// than source tokens. Viewing a goal must not itself award or remove credit.
const challenges = [
  ['first_decompose', 'First Decomposition', 'Decompose a compound into its constituent elements', 25],
  ['explore_materials', 'Material Explorer', 'Explore 5 different materials', 20],
  ['quiz_pass', 'Quiz Scholar', 'Answer 3 quiz questions correctly', 15],
  ['mix_reactants', 'Reaction Chemist', 'Discover 3 different chemical reactions', 30],
  ['hunt_compounds', 'Compound Hunter', 'Find 5 hidden compounds in the Hunt scene', 20],
  ['vocab_studied', 'Word Power', 'Study 3 vocabulary concept cards', 15],
];
const badges = [
  ['firstDecompose', 'First Decomposition', 'Decompose your first molecule'],
  ['fiveMaterials', 'Material Explorer', 'Explore 5 different materials'],
  ['allMaterials', 'Material Master', 'Explore all 15 materials'],
  ['quizWhiz', 'Quiz Whiz', 'Answer 5 quiz questions correctly'],
  ['chemScholar', 'Chemistry Scholar', 'Answer 15 quiz questions correctly'],
  ['streak3', 'On Fire', 'Get a 3-question streak'],
  ['streak7', 'Unstoppable', 'Get a 7-question streak'],
  ['comparePro', 'Comparison Pro', 'Compare 3 different molecule pairs'],
  ['atomCounter', 'Atom Counter', 'View 100+ total atoms across materials'],
  ['bondExpert', 'Bond Expert', 'Explore all 3 bond types'],
  ['molArtist', 'Molecular Artist', 'View 5 molecules in the visualizer'],
  ['aiCurious', 'Curious Mind', 'Ask the AI tutor 3 questions'],
  ['sceneExplorer', 'Scene Explorer', 'Discover 5 objects in scenes'],
  ['kitchenChef', 'Kitchen Chemist', 'Find all objects in the Kitchen'],
  ['sceneHunter', 'Material Hunter', 'Discover 15 objects across scenes'],
  ['allScenes', 'World Explorer', 'Visit all 5 scenes'],
  ['sceneChamp', 'Scene Champion', 'Find every object in every scene'],
];

function mountGoals(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current;
  function Host() {
    const [data, setData] = React.useState({ decomposer: { tab: 'explore', selected: 'Water', materialsExplored: ['Water'], completedChallenges: [], badges: [], ...seed } });
    current = data.decomposer;
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, state: () => current,
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}
function disclosure(view, kind, summaryText) {
  const details = view.one('[data-decomposer-goals="' + kind + '"]');
  expect(details?.tagName).toBe('DETAILS');
  const summary = details.querySelector(':scope > summary');
  expect(summary).not.toBeNull(); expect(summary.textContent.trim()).toBe(summaryText);
  // Keep native summary semantics; the browser suite owns Enter/Space behavior.
  expect(summary.hasAttribute('role')).toBe(false);
  expect(summary.hasAttribute('tabindex') && summary.tabIndex < 0).toBe(false);
  return { details, summary };
}
function setOpen(details, open) {
  const summary = details.querySelector(':scope > summary'); summary.focus();
  act(() => { details.open = open; details.dispatchEvent(new Event('toggle')); });
  expect(document.activeElement).toBe(summary);
}
function rowFor(details, selector, label) {
  const rows = [...details.querySelectorAll(selector)];
  const row = rows.find(element => element.textContent.includes(label));
  expect(row, label + ' readable criterion').toBeDefined();
  expect(row.tagName).toBe('LI'); expect(row.parentElement.tagName).toBe('UL');
  expect(row.closest('[aria-hidden="true"],[hidden]')).toBeNull();
  return row;
}
function expectProgressText(row, earned, positive, negative) {
  // Block elements contribute reading boundaries, but textContent concatenates
  // them. Inspect semantic leaf text so a preceding description cannot erase
  // the boundary before the explicit completion/earned status.
  const leaves = [...row.querySelectorAll('*')].filter(element => element.children.length === 0)
    .map(element => element.textContent.trim().toLowerCase());
  const matches = (text, label) => text === label.toLowerCase() || text.startsWith(label.toLowerCase() + ' ');
  expect(leaves.some(text => matches(text, earned ? positive : negative))).toBe(true);
  if (earned) expect(leaves.some(text => matches(text, negative))).toBe(false);
}
function expectStaticCriteria(details) {
  // The two summaries supply disclosure navigation; each criterion is readable
  // static content, so the new lists must not create 23 extra tab stops.
  expect(details.querySelectorAll('li button,li a[href],li input,li select,li textarea,li [tabindex]')).toHaveLength(0);
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});
afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Decomposer readable goals: %s', path => {
  it('provides all six challenge goals, descriptions, RP and explicit incomplete states in native details', () => {
    const view = mountGoals(path);
    const { details } = disclosure(view, 'challenges', 'View challenge goals');
    setOpen(details, true);
    expect(details.querySelectorAll('[data-decomposer-goal]')).toHaveLength(6);
    for (const [, label, description, rp] of challenges) {
      const row = rowFor(details, '[data-decomposer-goal]', label);
      expect(row.textContent).toContain(description);
      expect(row.textContent).toContain(String(rp)); expect(row.textContent).toMatch(/RP/);
      expectProgressText(row, false, 'Complete', 'Not complete');
    }
    expectStaticCriteria(details);
    expect(view.state().completedChallenges).toEqual([]);
  });

  it('reflects saved challenge completion without granting or removing credit when expanded', () => {
    const completedChallenges = ['first_decompose', 'mix_reactants', 'vocab_studied'];
    const view = mountGoals(path, { completedChallenges, researchPoints: 70 });
    const { details } = disclosure(view, 'challenges', 'View challenge goals');
    setOpen(details, true);
    for (const [id, label] of challenges) expectProgressText(rowFor(details, '[data-decomposer-goal]', label), completedChallenges.includes(id), 'Complete', 'Not complete');
    setOpen(details, false); setOpen(details, true);
    expect(view.state().completedChallenges).toEqual(completedChallenges);
    expect(view.state().researchPoints).toBe(70);
  });

  it('makes all seventeen badge criteria readable without relying on card titles or individual tab stops', () => {
    const view = mountGoals(path);
    const { details } = disclosure(view, 'badges', 'How to earn badges');
    setOpen(details, true);
    expect(details.querySelectorAll('[data-decomposer-badge-criterion]')).toHaveLength(17);
    for (const [, label, description] of badges) {
      const row = rowFor(details, '[data-decomposer-badge-criterion]', label);
      expect(row.textContent).toContain(description);
      expectProgressText(row, false, 'Earned', 'Not earned');
      expect([...view.host.querySelectorAll('div')].some(element => !element.closest('[data-decomposer-goals]') && element.textContent.trim() === label)).toBe(true);
    }
    expectStaticCriteria(details);
    expect(view.state().badges).toEqual([]);
  });

  it('uses the saved badge list to expose earned and unearned states without changing it', () => {
    const earned = ['firstDecompose', 'comparePro', 'sceneChamp'];
    const view = mountGoals(path, { badges: earned, researchPoints: 70 });
    const { details } = disclosure(view, 'badges', 'How to earn badges');
    setOpen(details, true);
    for (const [id, label] of badges) expectProgressText(rowFor(details, '[data-decomposer-badge-criterion]', label), earned.includes(id), 'Earned', 'Not earned');
    expect(view.state().badges).toEqual(earned); expect(view.state().researchPoints).toBe(70);
  });

  it('preserves independently opened disclosures through a real material-selection rerender', () => {
    const completedChallenges = ['first_decompose'], earned = ['firstDecompose'];
    const view = mountGoals(path, { completedChallenges, badges: earned, researchPoints: 25 });
    const goals = disclosure(view, 'challenges', 'View challenge goals');
    const criteria = disclosure(view, 'badges', 'How to earn badges');
    setOpen(goals.details, true); expect(criteria.details.open).toBe(false);
    setOpen(criteria.details, true); expect(goals.details.open).toBe(true);
    const material = view.one('[data-decomposer-material="Table Salt"]');
    expect(material).not.toBeNull(); material.focus(); act(() => material.click());
    expect(view.state().selected).toBe('Table Salt'); expect(document.activeElement).toBe(material);
    expect(view.one('[data-decomposer-goals="challenges"]')).toBe(goals.details);
    expect(view.one('[data-decomposer-goals="badges"]')).toBe(criteria.details);
    expect(goals.details.open).toBe(true); expect(criteria.details.open).toBe(true);
    setOpen(goals.details, false); expect(criteria.details.open).toBe(true);
    expect(view.state().completedChallenges).toEqual(completedChallenges);
    expect(view.state().badges).toEqual(earned); expect(view.state().researchPoints).toBe(25);
  });
});