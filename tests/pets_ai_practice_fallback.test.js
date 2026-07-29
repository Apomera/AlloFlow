// Pets Lab — AI Practice, and specifically its OFFLINE path.
//
// Three defects fixed 2026-07-28. All three only bite when there is no AI,
// which in a school is not the rare case.
//
//  1. THE OFFLINE CHECK TICKED CRITERIA THE STUDENT DID NOT MEET. It counted
//     every 4+ character word in a rubric line — including "about", "they",
//     "have", "should" — and called a criterion satisfied at 2 hits, flat,
//     regardless of how many words the line had. Measured over all 30 rubric
//     lines: content-free filler prose earned 3 checkmarks, and a good answer
//     to one scenario earned a checkmark on 4 of the 5 OTHER scenarios.
//
//  2. THE AI-FAILURE PATH DEAD-ENDED. On a rejected callGemini it toasted
//     "AI unavailable - try the local check" while offering no such control:
//     when callGemini EXISTS the only button reads "Get AI critique". The
//     advice pointed at a button that was not on the screen.
//
//  3. pets_ai_designer WAS UNREACHABLE OFFLINE. The badge was awarded only
//     inside the callGemini .then(), so a student on an offline deployment
//     could never earn it, and the badge counter on the command bar sat one
//     short with nothing explaining why.
//
// These mount and CLICK rather than reading source, because the scoring lives
// in an onClick handler and the whole point is what commits.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

function extractArray(name) {
  const i = SRC.indexOf('var ' + name + ' = [');
  const o = SRC.indexOf('[', i);
  let d = 0, j = o;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '[') d++;
    else if (SRC[j] === ']') { d--; if (!d) { j++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(o, j) + ')');
}
const AI_SCENARIOS = extractArray('AI_SCENARIOS');

let mounted = null;

function mountPets(seed, ctxExtra) {
  const cfg = window.StemLab._registry[ID];
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const log = { xp: [], toasts: [], announces: [] };
  const peek = {};
  function Harness() {
    const [toolData, setToolData] = React.useState({ [ID]: Object.assign({}, seed) });
    peek.state = toolData[ID];
    const ctx = Object.assign({
      React,
      toolData,
      setToolData,
      update: (toolId, key, val) => setToolData((prev) => {
        const copy = Object.assign({}, prev);
        copy[toolId] = Object.assign({}, copy[toolId] || {});
        copy[toolId][key] = val;
        return copy;
      }),
      addToast: (m) => log.toasts.push(String(m)),
      announceToSR: (m) => log.announces.push(String(m)),
      awardXP: (a, p, r) => log.xp.push({ a, p, r }),
      callGemini: null,
      aiHintsEnabled: false,
      gradeLevel: '7th Grade',
      t: (k, f) => (f != null ? f : k),
    }, ctxExtra || {});
    return cfg.render(ctx);
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return {
    host, log, peek,
    html: () => host.innerHTML,
    text: () => host.textContent,
    click: (re) => {
      const btn = [...host.querySelectorAll('button')].find((b) => re.test(b.textContent));
      expect(btn, 'no button matching ' + re).toBeTruthy();
      act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    },
  };
}

const FILLER =
  'I would really want to help them think about this whole thing. I think they should ' +
  'have a good talk about what they would like to do, because there are some things ' +
  'that they have to consider before they make their choice. It would be best if they ' +
  'take their time and do what is right for them, and I would tell them that.';

const GOOD_CAT =
  "First I'd tell them to take the cat to the vet right away, because a sudden change " +
  'like peeing outside the box is medical until proven otherwise - a UTI, crystals, or ' +
  'FLUTD. Once the vet clears her, look at stress and environment: did the litter brand ' +
  'change, is the box dirty, did a new pet arrive, did the schedule change? The rule is ' +
  'one box per cat plus one, scooped daily, uncovered and low-sided for older cats, in a ' +
  "quiet location. Don't punish or yell, it increases stress and makes elimination " +
  'problems worse. And rehoming for litter problems is a common and tragic shelter ' +
  'intake reason even though it is almost always solvable with vet care and management.';

const seedFor = (aiScenarioId, aiResponse) => ({ view: 'aiPractice', aiScenarioId, aiResponse });

const countTag = (txt, tag) => (txt.split(tag).length - 1);

beforeEach(() => {
  // The tool warm-caches badges/visits/mastery to BOTH window.__alloflowPetsLab
  // and localStorage['petsLab.state.v1'], and hydrates from the window slot
  // FIRST on mount. jsdom shares window and localStorage across every test in a
  // file, so without clearing both, a badge earned by an earlier test is
  // already present at the next mount and awardBadge correctly refuses to
  // re-award it — which reads as "the badge is broken" when the tool is
  // behaving exactly as designed. Clearing only localStorage is not enough;
  // the window slot wins the read priority.
  try { delete window.__alloflowPetsLab; } catch (_) { window.__alloflowPetsLab = null; }
  try { localStorage.clear(); } catch (_) { /* no storage in this env */ }
  resetStemLab();
  loadTool(FILE, ID);
});
afterEach(() => {
  if (mounted) {
    try { act(() => mounted.root.unmount()); } catch (_) { /* already gone */ }
    mounted.host.remove();
    mounted = null;
  }
});

describe('the offline check does not credit work that was not done', () => {
  it('gives content-free filler zero "likely covered" on every scenario', () => {
    for (const s of AI_SCENARIOS) {
      const m = mountPets(seedFor(s.id, FILLER));
      m.click(/rubric check/i);
      const txt = m.text();
      expect(countTag(txt, '[likely covered]'), s.id + ' credited filler').toBe(0);
      act(() => mounted.root.unmount());
      mounted.host.remove();
      mounted = null;
    }
  });

  it('still credits a genuinely good answer on its own scenario', () => {
    // Suppressing false positives is only worth anything if true positives
    // survive; an offline check that credits nothing is equally useless.
    const m = mountPets(seedFor('cat-litter', GOOD_CAT));
    m.click(/rubric check/i);
    expect(countTag(m.text(), '[likely covered]')).toBe(5);
  });

  it('does not credit that same good answer on unrelated scenarios', () => {
    for (const s of AI_SCENARIOS) {
      if (s.id === 'cat-litter') continue;
      const m = mountPets(seedFor(s.id, GOOD_CAT));
      m.click(/rubric check/i);
      expect(countTag(m.text(), '[likely covered]'), s.id + ' credited an off-topic answer').toBe(0);
      act(() => mounted.root.unmount());
      mounted.host.remove();
      mounted = null;
    }
  });

  it('reports partial overlap instead of rounding it to a checkmark', () => {
    const m = mountPets(seedFor('cat-litter', FILLER));
    m.click(/rubric check/i);
    const txt = m.text();
    expect(countTag(txt, '[likely covered]')).toBe(0);
    // Every criterion must be accounted for as one of the three states.
    const total = countTag(txt, '[likely covered]') + countTag(txt, '[partly covered]') + countTag(txt, '[not covered]');
    expect(total).toBe(5);
  });

  it('shows its own hit counts so the crudeness is visible', () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT));
    m.click(/rubric check/i);
    expect(m.text()).toMatch(/\(\d+ of \d+ key words\)/);
  });

  it('says plainly that it matched words, not reasoning', () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT));
    m.click(/rubric check/i);
    const txt = m.text();
    expect(txt).toMatch(/word matching, not understanding/i);
    expect(txt).toMatch(/NOT that you got it right/);
    expect(txt).toMatch(/did not read your reasoning, only your vocabulary/i);
  });
});

describe('a failed AI call falls back instead of dead-ending', () => {
  const rejecting = () => Promise.reject(new Error('network down'));

  it('runs the offline check when callGemini rejects', async () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT), { callGemini: rejecting });
    m.click(/AI critique/i);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(m.text(), 'no critique appeared after the AI failed').toMatch(/OFFLINE RUBRIC CHECK/);
    expect(countTag(m.text(), '[likely covered]')).toBe(5);
  });

  it('no longer points at a control that is not on screen', async () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT), { callGemini: rejecting });
    m.click(/AI critique/i);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const joined = m.log.toasts.join(' | ');
    expect(joined).not.toMatch(/try the local check/i);
    expect(joined).toMatch(/ran the offline check instead/i);
  });

  it('clears the busy state so the button is usable again', async () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT), { callGemini: rejecting });
    m.click(/AI critique/i);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(m.peek.state.aiLoadingCritique).toBeFalsy();
    expect(m.html()).not.toMatch(/aria-busy="true"/);
  });
});

describe('the AI Practice badge is reachable without a network', () => {
  it('awards pets_ai_designer on the offline path', () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT));
    expect(m.peek.state.badges || {}).not.toHaveProperty('pets_ai_designer');
    m.click(/rubric check/i);
    expect(m.peek.state.badges, 'offline students can never earn this badge').toHaveProperty('pets_ai_designer');
  });

  it('pays its XP through the host', () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT));
    m.click(/rubric check/i);
    const paid = m.log.xp.filter((x) => /AI Practice/i.test(x.r || ''));
    expect(paid.length, 'xp=' + JSON.stringify(m.log.xp)).toBe(1);
    expect(paid[0].a).toBe(ID);
    expect(paid[0].p).toBeGreaterThan(0);
  });

  it('does not award twice for a second check', () => {
    const m = mountPets(seedFor('cat-litter', GOOD_CAT));
    m.click(/rubric check/i);
    m.click(/rubric check/i);
    expect(m.log.xp.filter((x) => /AI Practice/i.test(x.r || '')).length).toBe(1);
  });
});

describe('the AI ground-truth list agrees with the rendered lab', () => {
  it('does not feed the AI the unhedged Maine Lyme superlative', () => {
    // Missed in the zoonoses pass: the same claim lives in AI_GROUND_TRUTH,
    // which is prompt data rather than rendered prose, so a test that scraped
    // the zoonoses view could not see it. Fixing a claim means fixing every
    // surface that ASSERTS it, including the ones only a model reads.
    const gt = SRC.slice(SRC.indexOf('var AI_GROUND_TRUTH = ['), SRC.indexOf('];', SRC.indexOf('var AI_GROUND_TRUTH = [')));
    expect(gt, 'the AI is still being told Maine is a flat national #1').not.toMatch(/density highest in US/i);
    expect(gt).toMatch(/among the top few US states/i);
    expect(gt).toMatch(/Vermont and New Hampshire/);
  });

  it('keeps the safety constraints that bound the AI', () => {
    const gt = SRC.slice(SRC.indexOf('var AI_GROUND_TRUTH = ['), SRC.indexOf('];', SRC.indexOf('var AI_GROUND_TRUTH = [')));
    expect(gt).toMatch(/NEVER recommend specific medications, dosages, or procedures/);
    expect(gt).toMatch(/NEVER suggest rehoming a pet without first ruling out/);
  });

  it('keeps the medication guard in the prompt itself', () => {
    expect(SRC).toMatch(/never recommend specific medications, dosages, or veterinary procedures/i);
    expect(SRC).toMatch(/Educational only — for medical decisions see your veterinarian/);
  });
});
