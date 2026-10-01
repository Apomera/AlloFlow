import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });

// A translator that marks everything it is asked for. Any visible text without the marks
// reached the page without passing through the translation pipeline, which is exactly the
// fault: every other view in this tool is translated into 62 languages and the grove was not.
const MARK = (k, fb) => '⟦' + fb + '⟧';
const run = (choices) => ({ version: 1, mode: 'deck', seed: 'GROVE-01', choices });
const choice = (priority = 'offspring', route = 'mixed') => ({ priority, route });

// Strip everything that was translated, then units and codes, and see whether any words
// are left over. Units ("kg C", "°C") and a grove code the learner typed ("GROVE-01") carry
// no language and are not the pipeline's business.
function leftoverWords(text) {
  const rest = text
    .replace(/⟦[^⟦⟧]*⟧/g, ' ')
    .replace(/\bkg C\b/g, ' ')
    .replace(/°C/g, ' ')
    .replace(/\b[A-Z]+-\d+\b/g, ' ')
    .replace(/[^A-Za-z]+/g, ' ')
    .trim();
  return /[A-Za-z]{2,}/.test(rest);
}

function bareText(data, overrides = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('treeLab', { treeLab: Object.assign({ view: 'grove' }, data) }, Object.assign({ t: MARK }, overrides));
  const root = host.querySelector('.allo-tree-grove');
  expect(root, 'grove did not render').not.toBeNull();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const bare = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement && /^(STYLE|SCRIPT)$/.test(node.parentElement.tagName)) continue;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (!text || !/[A-Za-z]{2,}/.test(text)) continue;
    if (leftoverWords(text)) bare.push(text.slice(0, 120));
  }
  // Labels a screen reader speaks are text as well.
  for (const el of root.querySelectorAll('[aria-label],[title]')) {
    for (const attr of ['aria-label', 'title']) {
      const v = el.getAttribute(attr);
      if (!v || !/[A-Za-z]{2,}/.test(v)) continue;
      if (leftoverWords(v)) bare.push(attr + '=' + v.slice(0, 100));
    }
  }
  return [...new Set(bare)];
}

describe('Grove Journey reaches the translation pipeline', () => {
  it('derives stable, distinct keys from the English', () => {
    const a = E.groveKey('A dry year. Little water.');
    expect(a).toBe(E.groveKey('A dry year. Little water.'));
    expect(a).toMatch(/^[a-z0-9_]+_[a-z0-9]{1,4}$/);
    // Two strings that begin alike must not collide.
    expect(E.groveKey('Keep food for hard years.')).not.toBe(E.groveKey('Keep food for the winter.'));
    expect(E.groveKey('Grow roots')).toMatch(/^grow_roots_/);
  });

  it('sends every visible string in the setup screen through the translator', () => {
    expect(bareText({})).toEqual([]);
  });

  it('sends every visible string of a run in progress through the translator', () => {
    expect(bareText({ groveRun: run([choice('offspring', 'mixed'), choice('roots', 'seed')]) })).toEqual([]);
  });

  it('sends every visible string of a finished run, with a prediction and a ledger, through the translator', () => {
    const finished = run(Array(8).fill(choice('offspring', 'mixed')));
    expect(bareText({
      groveRun: finished,
      grovePredictions: [{ year: 3, claim: 'more' }],
      groveLedger: [{ key: 'GROVE-01', priorities: ['offspring'], living: 3, established: 1, year: 8 }],
      groveShare: { kind: 'summary', status: 'copied', text: 'x' }
    })).toEqual([]);
  });

  it('holds in the K-2 wording, which is a second copy of every string', () => {
    expect(bareText({ groveRun: run([choice('reserve', 'seed')]), bandOverride: 'k2' })).toEqual([]);
    expect(bareText({ bandOverride: 'k2' })).toEqual([]);
  });

  it('changes nothing for English when no pack has the key', () => {
    const host = document.createElement('div');
    host.innerHTML = renderTool('treeLab', { treeLab: { view: 'grove', groveRun: run([choice()]) } });
    const text = host.querySelector('.allo-tree-grove').textContent;
    expect(text).toContain('Leave a living legacy.');
    expect(text).toContain('Year 1');
    expect(text).not.toContain('stem.treelab.grove.');
  });
});

// The pack tooling works from docs/i18n/tree-life-lab-grove-keys.json. Every key the grove
// asks the translator for at runtime must be in that file, or a pack would be built without
// it and the string would silently stay English in that language.
import { readFileSync } from 'fs';
describe('Grove Journey key list for the pack tooling', () => {
  it('lists every key the grove asks for at runtime', () => {
    const listed = JSON.parse(readFileSync('docs/i18n/tree-life-lab-grove-keys.json', 'utf8'));
    const asked = new Map();
    const record = (k, fb) => { if (k.startsWith('stem.treelab.grove.')) asked.set(k, fb); return fb; };
    const states = [
      {}, { bandOverride: 'k2' },
      { groveRun: run([choice('offspring', 'mixed'), choice('roots', 'seed'), choice('reserve', 'mixed')]) },
      { groveRun: run(Array(8).fill(choice('offspring', 'mixed'))), grovePredictions: [{ year: 3, claim: 'more' }],
        groveLedger: [{ key: 'GROVE-01', priorities: ['offspring'], living: 3, established: 1, year: 8 }] },
      { groveRun: run(Array(8).fill(choice('offspring', 'seed'))), bandOverride: 'k2' }
    ];
    for (const data of states) renderTool('treeLab', { treeLab: Object.assign({ view: 'grove' }, data) }, { t: record });
    expect(asked.size).toBeGreaterThan(150);
    const missing = [...asked].filter(([k]) => !(k in listed)).map(([k, fb]) => k + ' = ' + fb);
    expect(missing, 'keys asked for at runtime but absent from the key list').toEqual([]);
    // And the file says the same English the tool falls back to.
    const wrong = [...asked].filter(([k, fb]) => listed[k] !== fb).map(([k, fb]) => k + ': file "' + listed[k] + '" vs tool "' + fb + '"');
    expect(wrong).toEqual([]);
  });
});
