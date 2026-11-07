// "Check the facts" on a topic- or word-list-made resource (2026-11-03). The handler and its
// results panel live in AlloFlowANTI.txt; this compiles exactly that text and runs it against
// a fake AI. ALLO_ANTI_CANDIDATE points at a mutated copy for mutation checks.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { transformSync } from '@babel/core';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { sliceBetween, expectAnchorCount } from './helpers/anchored_slice.js';

const FILE = process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt';
const ANTI = readFileSync(FILE, 'utf8');
const START = '  const [seedFactCheckId, setSeedFactCheckId] = useState(null);';
const END = '  const toFocusText = (text) => {';

function harness() {
  expectAnchorCount(ANTI, START, 1, { file: FILE });
  const block = sliceBetween(ANTI, START, END, { file: FILE });
  const code = transformSync(
    'function makeHarness(React, deps) { return function Harness({ item }) {\n'
    + 'const useState = React.useState;\n'
    + 'const { gradeLevel, getSavedResourceLanguage, leveledTextLanguage, callGemini, cleanJson, safeJsonParse, setHistory, addToast, t, isProcessing } = deps;\n'
    + 'const [generatedContent, setGeneratedContent] = React.useState(item);\n'
    + block
    + '\ndeps.check = handleCheckSeedFacts; deps.current = generatedContent; deps.edit = setGeneratedContent;\n'
    + 'return renderSeedFactCheck(generatedContent); }; }',
    { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  return new Function(code + '\nreturn makeHarness;')();
}

const mounted = [];
afterEach(() => { mounted.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); });

function setup(reply, item = { id: 'r1', type: 'anchor-chart', data: { title: 'Volcanoes', points: ['Lava is molten rock.'] }, lessonPath: { seed: { kind: 'topic', text: 'Volcanoes' } } }) {
  const deps = {
    gradeLevel: '5th Grade', getSavedResourceLanguage: () => 'English', leveledTextLanguage: 'English',
    callGemini: vi.fn(async () => (typeof reply === 'function' ? reply() : reply)),
    cleanJson: text => String(text || '').replace(/^```json\s*|\s*```$/g, '').trim(),
    safeJsonParse: text => { try { return JSON.parse(text); } catch (_) { return null; } },
    setHistory: vi.fn(), addToast: vi.fn(), t: () => undefined, isProcessing: false,
  };
  const Harness = harness()(React, deps);
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Harness, { item })));
  mounted.push({ root, host });
  return { host, deps };
}
const run = async deps => { await act(async () => { await deps.check(); }); };
const groups = host => [...host.querySelectorAll('[data-seed-check-group]')].map(node => node.getAttribute('data-seed-check-group'));

describe('Check the facts', () => {
  it('groups the claims (likely wrong first), carries the Asimov line, and keeps the result on the resource', async () => {
    const reply = JSON.stringify({ claims: [
      { claim: 'Lava is molten rock.', verdict: 'supported', note: 'Well established.' },
      { claim: 'Every volcano erupts yearly.', verdict: 'incorrect', note: 'Most erupt rarely.' },
      { claim: 'The tallest volcano is 30 km high.', verdict: 'uncertain', note: 'Depends on how it is measured.' },
    ] });
    const { host, deps } = setup(reply);
    expect(host.querySelector('[data-seed-check-run]').textContent).toBe('Check the facts');
    await run(deps);
    expect(deps.callGemini).toHaveBeenCalledWith(expect.stringContaining('the topic "Volcanoes"'), true);
    expect(groups(host)).toEqual(['incorrect', 'uncertain', 'supported']);
    const uncertain = host.querySelector('[data-seed-check-group="uncertain"]');
    expect(uncertain.textContent).toContain('There is as yet insufficient data for a meaningful answer.');
    expect(uncertain.textContent).toContain('Isaac Asimov');
    expect(host.querySelector('[data-seed-check-group="supported"]').textContent).not.toContain('Asimov');
    expect(host.querySelector('[data-seed-check-results]').textContent).toContain('not a source');
    expect(deps.current.lessonPath.factCheck.claims).toHaveLength(3);
    expect(deps.current.lessonPath.seed).toEqual({ kind: 'topic', text: 'Volcanoes' });
    expect(deps.setHistory).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-seed-check-run]').textContent).toBe('Check the facts again');
  });

  it('never upgrades an unclear verdict: anything unknown counts as "can\'t verify"', async () => {
    const { host, deps } = setup(JSON.stringify({ claims: [{ claim: 'Magma cools into rock.', verdict: 'probably fine' }, { claim: '', verdict: 'supported' }] }));
    await run(deps);
    expect(groups(host)).toEqual(['uncertain']);
    expect(deps.current.lessonPath.factCheck.claims).toEqual([{ claim: 'Magma cools into rock.', verdict: 'uncertain', note: '' }]);
  });

  it('says so when the resource is edited after the check', async () => {
    const { host, deps } = setup(JSON.stringify({ claims: [{ claim: 'Lava is molten rock.', verdict: 'supported', note: '' }] }));
    await run(deps);
    expect(host.querySelector('[data-seed-check-stale]')).toBeNull();
    act(() => deps.edit(item => ({ ...item, data: { ...item.data, points: ['Lava is cold.'] } })));
    expect(host.querySelector('[data-seed-check-stale]')).toBeTruthy();
  });

  it('a failed or empty check changes nothing and tells the teacher', async () => {
    for (const reply of ['not json', JSON.stringify({ claims: [] }), () => { throw new Error('offline'); }]) {
      const { host, deps } = setup(reply);
      await run(deps);
      expect(deps.current.lessonPath.factCheck).toBeUndefined();
      expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('did not finish'), 'error');
      expect(host.querySelector('[data-seed-check-results]')).toBeNull();
      expect(host.querySelector('[data-seed-check-run]').disabled).toBe(false);
    }
  });

  it('sends the words, not pictures or links, so an image cannot crowd the text out of the prompt', async () => {
    const picture = 'data:image/png;base64,' + 'A'.repeat(20000);
    const item = { id: 'g', type: 'glossary', lessonPath: { seed: { kind: 'word-list', terms: ['delta'], termLanguage: 'English' } },
      data: [{ term: 'delta', def: 'Land where a river meets the sea.', image: picture, imageUrl: 'https://example.org/delta.png', audio: 'blob:x' }] };
    const { deps } = setup(JSON.stringify({ claims: [{ claim: 'A delta forms where a river meets the sea.', verdict: 'supported', note: '' }] }), item);
    await run(deps);
    const prompt = deps.callGemini.mock.calls[0][0];
    expect(prompt).toContain('Land where a river meets the sea.');
    expect(prompt).toContain('a word list');
    expect(prompt).not.toContain('base64');
    expect(prompt).not.toContain('example.org');
    expect(prompt.length).toBeLessThan(3000);
  });

  it('only runs for topic and word-list starts', async () => {
    const { deps } = setup('{}', { id: 'b', type: 'quiz', data: {}, lessonPath: { seed: { kind: 'blank' } } });
    await run(deps);
    expect(deps.callGemini).not.toHaveBeenCalled();
  });

  it('sits in both seed notes, after the path-less-traveled tag', () => {
    for (const kind of ['topic', 'word-list']) {
      const note = sliceBetween(ANTI, `generatedContent.lessonPath?.seed?.kind === '${kind}' && (`, `data-seed-next="${kind}"`, { file: FILE, label: kind });
      expect(note.indexOf('{renderSeedFactCheck(generatedContent)}'), kind).toBeGreaterThan(note.indexOf("t('sidebar.path_fork_badge')"));
    }
  });
});
