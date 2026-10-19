import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let React, DOM, act, S, H, View, root, host, child, resource, response, setResource;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const OTHER = 'data:image/png;base64,AAAA';
const data = card => ({ schemaVersion: 2, authorshipMode: 'student-authored', reflectionLevel: 'quick', cards: [card] });
const record = card => ({ id: 'visual-basis', type: 'memory-aid', data: data(card) });
const base = (extra = {}) => H.normalizeMemoryAidCard({ id: 'one', target: 'Matter', type: 'visual-association', mode: 'student-authored', essentialFacts: ['Solids retain their shape.'], factLocked: true, factVerified: true, visualImage: PNG, visualSource: 'uploaded', visualAlt: 'A solid cube on a table.', visualAltSource: 'author', ...extra }, 0);
const shown = () => S.project(resource, response).data.cards[0];
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react')); DOM = require(resolve('desktop/web-app/node_modules/react-dom/client')); act = React.act;
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').transformSync(require('fs').readFileSync('memory_aid_source.jsx','utf8'), {loader:'jsx',format:'esm',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'}).code)"], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const api = new Function('React', compiled + '\nreturn {View:MemoryAidView,exportRules:MEMORY_AID_EXPORT_RULES,H:{normalizeMemoryAidCard,normalizeMemoryAidCards,applyMemoryAidCardPatch,memoryAidPracticeReady,memoryAidCueBlock,buildMemoryAidReadAloudText}};')(React);
  H = api.H; View = api.View; window.AlloModules.MemoryAid = { _testing: H, exportRules: api.exportRules };
  new Function(readFileSync('studio_response_module.js', 'utf8'))(); S = window.AlloModules.StudioResponse;
}, 60000);
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = child = null; localStorage.clear(); sessionStorage.clear(); });
async function mount(card, saved = null, realView = false) {
  resource = record(card); response = saved;
  host = document.createElement('div'); document.body.append(host); root = DOM.createRoot(host);
  function Capture(props) { child = props; return null; }
  function App() {
    const [current, update] = React.useState(resource), [work, save] = React.useState(response);
    resource = current; response = work; setResource = update;
    return React.createElement(S.Boundary, { View: realView ? View : Capture, generatedContent: current, studentResponses: { [current.id]: { studio: work } }, onResponseChange: (id, next) => save(next), isTeacherMode: false, activeProfileId: 'visual-learner', addToast: () => {}, allowRuntimeAi: false });
  }
  await act(async () => root.render(React.createElement(App)));
}
async function patch(patch) { await act(async () => child.handleNoteUpdate('cards', cards => cards.map(card => H.applyMemoryAidCardPatch(card, patch)))); }
async function teacher(patch) { await act(async () => setResource(old => ({ ...old, data: data(H.applyMemoryAidCardPatch(old.data.cards[0], patch)) }))); }
const button = label => [...host.querySelectorAll('button')].find(node => !node.closest('[hidden]') && node.textContent === label);

describe('Memory Aid visual confirmation version integrity', () => {
  it('uses the real learner control to bind a visual-only confirmation, then requires a new confirmation after a fact change', async () => {
    await mount(base({ visualNeedsReview: true }), null, true);
    await act(async () => button('Make it mine').click());
    await act(async () => [...host.querySelectorAll('summary')].find(node => node.textContent.includes('Picture and image options')).click());
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(false);
    await act(async () => button('This picture still fits my cue').click());
    const basis = response.cards[0].visualReviewBasis;
    expect(basis).toMatch(/^memory-visual-review-v1:/); expect(basis.length).toBeLessThan(160);
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(true);
    await teacher({ essentialFacts: ['Liquids take the shape of their container.'] }); await teacher({ factVerified: true });
    expect(shown()).toMatchObject({ visualNeedsReview: true, visualImage: PNG, studentDraft: '' });
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(false);
    await act(async () => button('This picture still fits my cue').click());
    expect(response.cards[0].visualReviewBasis).not.toBe(basis);
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(true);
  });

  it.each([
    ['facts', { essentialFacts: ['Solids have definite volume.'] }],
    ['target', { target: 'Liquid' }],
    ['teacher example', { aiExample: 'A river flowing in a glass.' }],
    ['teacher mapping', { mapping: 'The glass sets the liquid shape.' }],
    ['scaffold', { scaffoldStarter: 'Picture a flowing river...' }],
    ['type', { type: 'keyword-association' }],
  ])('does not reuse a picture approval after changing %s and cannot refresh it with an unrelated save', async (_, change) => {
    await mount(base({ visualNeedsReview: true })); await patch({ visualNeedsReview: false });
    const basis = response.cards[0].visualReviewBasis;
    await teacher(change); await teacher({ factVerified: true });
    expect(shown().visualNeedsReview).toBe(true);
    await patch({ studentReasoning: 'An unrelated reflection.' });
    expect(response.cards[0].visualReviewBasis).toBe(basis);
    expect(shown().visualNeedsReview).toBe(true); expect(shown().visualImage).toBe(PNG);
    await patch({ visualNeedsReview: false });
    expect(shown().visualNeedsReview).toBe(false); expect(response.cards[0].visualReviewBasis).not.toBe(basis);
  });

  it('binds a new learner picture and preserves it while teacher and learner cues change', async () => {
    await mount(base()); await patch({ visualImage: OTHER, visualSource: 'uploaded' });
    expect(shown().visualNeedsReview).toBe(false); expect(response.cards[0].visualReviewBasis).toBeTruthy();
    const basis = response.cards[0].visualReviewBasis;
    await teacher({ aiExample: 'A teacher cue for these facts.' });
    expect(shown()).toMatchObject({ visualImage: OTHER, visualNeedsReview: true });
    await patch({ studentReasoning: 'Keep my image.' });
    expect(response.cards[0].visualReviewBasis).toBe(basis); expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualNeedsReview: false });
    await patch({ studentDraft: 'My different picture cue.' });
    expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualNeedsReview: false }); expect(shown().visualNeedsReview).toBe(false);
  });

  it('requires a one-time check for a legacy owned picture without signing unrelated saves', async () => {
    await mount(base(), { schemaVersion: 1, cards: [{ id: 'one', visualImage: OTHER, visualNeedsReview: false, visualAlt: 'My old picture.', visualAltSource: 'author' }] });
    expect(shown()).toMatchObject({ visualImage: OTHER, visualNeedsReview: true });
    await patch({ studentReasoning: 'A new reflection.' });
    expect(response.cards[0].visualReviewBasis || '').toBe(''); expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualNeedsReview: false });
    expect(shown().visualNeedsReview).toBe(false); expect(shown().visualImage).toBe(OTHER);
  });

  it('does not let an unsigned legacy false override the teacher picture hold', async () => {
    await mount(base({ visualNeedsReview: true }), { schemaVersion: 1, cards: [{ id: 'one', visualNeedsReview: false }] });
    expect(shown().visualNeedsReview).toBe(true);
    await patch({ studentReasoning: 'Still not a review.' });
    expect(shown().visualNeedsReview).toBe(true); expect(response.cards[0].visualReviewBasis || '').toBe('');
  });

  it.each(['generated', 'scaffolded'])('keeps %s pictures teacher-owned while checking a learner confirmation against new teacher context', async mode => {
    await mount(base({ mode, visualNeedsReview: true })); await patch({ visualNeedsReview: false });
    expect(shown().visualNeedsReview).toBe(false);
    await teacher({ aiExample: 'A changed teacher example.' });
    expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualImage: OTHER }); expect(shown().visualImage).toBe(PNG);
    await patch({ visualNeedsReview: false }); expect(shown().visualNeedsReview).toBe(false);
  });

  it('does not reuse approval for a replacement teacher picture that is held for review', async () => {
    await mount(base({ visualNeedsReview: true })); await patch({ visualNeedsReview: false });
    await teacher({ visualImage: OTHER }); await teacher({ visualNeedsReview: true });
    expect(shown()).toMatchObject({ visualImage: OTHER, visualNeedsReview: true });
    await patch({ visualNeedsReview: false }); expect(shown().visualNeedsReview).toBe(false);
  });

  it('binds an edited description without claiming teacher pixels and holds it when those pixels change', async () => {
    await mount(base()); await patch({ visualAlt: 'My green cube on a desk.' });
    const basis = response.cards[0].visualReviewBasis;
    expect(response.cards[0].visualImage).toBeUndefined(); expect(basis).toBeTruthy();
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(true);
    await teacher({ visualImage: OTHER });
    expect(resource.data.cards[0]).toMatchObject({ visualNeedsReview: false, visualAlt: '' });
    expect(shown()).toMatchObject({ visualImage: OTHER, visualAlt: 'My green cube on a desk.', visualNeedsReview: true });
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(false);
    expect(H.memoryAidCueBlock(shown()).visualDescription).toBe('');
    expect(H.buildMemoryAidReadAloudText(shown())).not.toContain('My green cube on a desk.');
    await patch({ studentReasoning: 'This is not a picture review.' });
    expect(response.cards[0].visualReviewBasis).toBe(basis); expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualAlt: 'My revised description of the replacement picture.' });
    expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualNeedsReview: false });
    expect(H.memoryAidPracticeReady(shown()).ok).toBe(true); expect(response.cards[0].visualReviewBasis).not.toBe(basis);
  });

  it('keeps a legacy description editable but cannot silently sign it during an unrelated save', async () => {
    await mount(base(), { schemaVersion: 1, cards: [{ id: 'one', visualAlt: 'An old learner description.', visualAltSource: 'author' }] });
    expect(shown()).toMatchObject({ visualNeedsReview: true, visualAlt: 'An old learner description.' });
    await patch({ studentReasoning: 'A new reflection.' });
    expect(response.cards[0].visualReviewBasis || '').toBe(''); expect(shown().visualNeedsReview).toBe(true);
    await patch({ visualNeedsReview: false }); expect(H.memoryAidPracticeReady(shown()).ok).toBe(true);
  });

  it('retains approval on description/reflection edits and text-backup restoration without exporting picture data', async () => {
    await mount(base()); await patch({ visualImage: OTHER }); await patch({ visualAlt: 'My cube on a table.' });
    const basis = response.cards[0].visualReviewBasis;
    await patch({ studentReasoning: 'It reminds me of solid shape.' });
    expect(response.cards[0].visualReviewBasis).toBe(basis); expect(shown().visualNeedsReview).toBe(false);
    const backup = S.backup(resource, response), restored = S.readBackup(resource, backup, response);
    expect(JSON.stringify(backup)).not.toContain(OTHER); expect(restored.cards[0].visualReviewBasis).toBe(basis);
    expect(S.project(resource, restored).data.cards[0]).toMatchObject({ visualImage: OTHER, visualNeedsReview: false });
    const changed = record(H.applyMemoryAidCardPatch(resource.data.cards[0], { essentialFacts: ['A different fact.'] }));
    expect(S.project(changed, restored).data.cards[0].visualNeedsReview).toBe(true);
  });

  it('preserves a signed stale basis in standalone response writes instead of automatically approving new facts', () => {
    const original = base({ visualNeedsReview: true });
    const work = S.responseFromData('memory-aid', data({ ...original, visualNeedsReview: false }), data(original));
    const revised = H.applyMemoryAidCardPatch(original, { essentialFacts: ['A new fact.'] });
    const projected = S.project(record(revised), work).data.cards[0];
    const saved = S.responseFromData('memory-aid', data({ ...projected, studentReasoning: 'Keep my work.' }), data(revised));
    expect(saved.cards[0].visualReviewBasis).toBe(work.cards[0].visualReviewBasis);
    expect(S.project(record(revised), saved).data.cards[0].visualNeedsReview).toBe(true);
  });
});
