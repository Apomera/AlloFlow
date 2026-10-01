import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import * as EM from '../stem_lab/stem_lumen_evidence.js';
import * as SM from '../stem_lab/stem_lumen_study.js';
const E = EM.default || EM, Study = SM.default || SM;
const require = createRequire(import.meta.url), dir = resolve('desktop/web-app/node_modules');
const React = require(resolve(dir, 'react')), { createRoot } = require(resolve(dir, 'react-dom/client')), { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 30000 });
const passage = 'The fox rests beneath the tree. The tree provides shade during the hot afternoon.';
const selection = (extra = {}) => ({ text: passage, title: 'Forest reading · page 1', language: 'English', anchor: { kind: 'library', slug: 'forest', resourceId: 'forest', section: 0, page: 0 }, ...extra });
const projectFor = extra => E.connectReadingSource(E.makeProject({}), selection(extra));
let host, root, values, ctx;
async function settle() { for (let i = 0; i < 8; i++) await act(async () => { await Promise.resolve(); }); }
async function mount(extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  ctx = { React, update() {}, isTeacherMode: false, studentNickname: 'Reader', activeProfileId: 'reader-a', readingSource: selection(), onReturnToReading: vi.fn(),
    storageDB: { get: async key => values.get(key), set: async (key, value) => { values.set(key, structuredClone(value)); return true; } }, ...extra };
  await act(async () => root.render(Study.render(ctx))); await settle();
}
function button(name) { const found = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === name); if (!found) throw Error('Missing button: ' + name); return found; }
async function click(name) { await act(async () => button(name).click()); await settle(); }
function field(label) { const el = [...host.querySelectorAll('label')].find(l => l.textContent.startsWith(label)); if (!el) throw Error('Missing field: ' + label); return el.querySelector('textarea,input,select') || document.getElementById(el.htmlFor); }
async function set(label, value) {
  const el = field(label), proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); await settle();
}
beforeEach(() => { localStorage.clear(); values = new Map(); window.AlloSpeechPlayer = { speak: vi.fn(() => Promise.resolve()), stop: vi.fn() }; });
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; if (host) host.remove(); });

describe('reading evidence identity and preservation', () => {
  it('waits for queued saves before a new instance reloads the same profile', async () => {
    let release; const gate = new Promise(resolve => { release = resolve; }); let stored, writes = 0;
    const storageDB = { get: async () => stored, set: async (key, value) => { if (++writes === 1) await gate; stored = value; return true; } };
    const first = E.createProjectStore({ scope: 'delayed-reader', storageDB }), second = E.createProjectStore({ scope: 'delayed-reader', storageDB });
    let p = projectFor(); const one = first.save(p); p = E.saveReadingEntry(p, { evidenceId: p.evidenceNodes[0].id, body: 'The final edit' }); const two = first.save(p);
    let loaded = false; const read = second.load().then(value => { loaded = true; return value; });
    await Promise.resolve(); expect(loaded).toBe(false); release(); await Promise.all([one,two]); expect((await read).artifacts[0].body).toBe('The final edit');
  });
  it('separates nicknames even when learners share an active profile', () => {
    expect(E.readingScope({ isTeacherMode: false, activeProfileId: 'shared', studentNickname: 'A' })).not.toBe(E.readingScope({ isTeacherMode: false, activeProfileId: 'shared', studentNickname: 'B' }));
  });
  it('keeps resources, languages, sections and revisions distinct', () => {
    let p = projectFor(); const first = p.sources[0], node = p.evidenceNodes[0];
    p = E.saveReadingEntry(p, { evidenceId: node.id, body: 'Shade helps the fox.', quote: 'The tree provides shade', understanding: 'reread' });
    p = E.connectReadingSource(p, selection({ text: 'A changed page about the fox.' }));
    expect(p.sources[0].version).toBe(2); expect(p.artifacts[0].stale).toBe(true); expect(p.artifacts[0].citations[0].passage).toBe(passage);
    p = E.connectReadingSource(p, selection({ language: 'Thai', text: 'ต้นไม้ให้ร่มเงา' }));
    p = E.connectReadingSource(p, selection({ anchor: { ...selection().anchor, section: 1, page: 1 } }));
    expect(p.sources).toHaveLength(3); expect(first.id).not.toBe(p.sources[1].id);
  });
  it('rejects invented supporting quotations without altering the project', () => {
    const p = projectFor(); expect(() => E.saveReadingEntry(p, { evidenceId: p.evidenceNodes[0].id, quote: 'An invented quotation' })).toThrow('exact excerpt'); expect(p.artifacts).toHaveLength(0);
  });
  it('retains older grounded-note evidence before removing a source', () => {
    let p = projectFor(); const n = p.evidenceNodes[0];
    p.claims.push({ id: 'claim', evidenceIds: [n.id] }); p.artifacts.push({ id: 'old', type: 'grounded-note', title: 'Old note', body: 'The tree gives shade.', sourceIds: [n.sourceId], claimIds: ['claim'] });
    p = E.removeSource(p, n.sourceId); expect(p.artifacts[0].stale).toBe(true); expect(E.noteCitations(p,p.artifacts[0])[0].passage).toBe(passage);
    p = E.editSavedNote(p, 'old', { title: 'My note', annotation: 'Check this later.' }); expect(p.artifacts[0].body).toBe('The tree gives shade.'); expect(p.artifacts[0].annotation).toBe('Check this later.');
  });
  it('does not replace a revised page with an older saved word snapshot', () => {
    const oldWord = { ...selection(), type: 'vocabulary', word: 'shade', definition: 'Away from direct sunlight.' };
    const p = projectFor({ text: 'This is the newly revised forest page.', entries: [oldWord] });
    expect(p.sources.find(s => s.id === E.readingSourceSpec(selection()).id).content).toBe('This is the newly revised forest page.');
    expect(p.artifacts[0].stale).toBe(true); expect(p.artifacts[0].citations[0].passage).toBe(passage);
  });
  it('does not loosen AI restrictions on a repeated handoff', () => {
    const p = E.connectReadingSource(projectFor({ allowAI: false }), selection()); expect(p.sources[0].allowAI).toBe(false);
  });
  it('imports older notes without overwriting current sources or legacy data', () => {
    let legacy = projectFor(); legacy = E.saveReadingEntry(legacy, { evidenceId: legacy.evidenceNodes[0].id, body: 'My old gist' });
    const copy = JSON.stringify(legacy); const p = E.importSavedProject(projectFor({ text: 'A revised source.' }), legacy);
    expect(p.artifacts[0].body).toBe('My old gist'); expect(p.artifacts[0].stale).toBe(true); expect(JSON.stringify(legacy)).toBe(copy);
    expect(E.importSavedProject(p,legacy).artifacts).toHaveLength(1);
  });
});

describe('reading workspace interactions', () => {
  it('saves, reopens and annotates reflections with passage return links after reload', async () => {
    await mount(); await set('Gist', 'The tree helps keep the fox cool.'); await set('Supporting evidence', 'The tree provides shade'); await set('How is my understanding?', 'reread'); await click('Save reflection');
    await click('Listen–try–reread'); await click('Reflect'); expect(field('Gist').value).toContain('fox cool');
    await click('Read & reflect · Forest reading · page 1'); await set('My annotation', 'Ask about other animals.');
    const note = host.querySelector('[aria-label="Opened study note"]'); expect(note.textContent).toContain('The tree provides shade');
    await act(async () => root.unmount()); root = null; host.remove(); await mount();
    await click('Read & reflect · Forest reading · page 1'); expect(field('My annotation').value).toBe('Ask about other animals.');
    await click('Return to passage'); expect(ctx.onReturnToReading).toHaveBeenCalledWith(expect.objectContaining({ passage, anchor: expect.objectContaining({ page: 0 }) }));
  });
  it('supports unrecorded practice, stops the model on step changes, and saves the step', async () => {
    await mount(); await click('Listen–try–reread'); await click('Listen to model'); expect(window.AlloSpeechPlayer.speak).toHaveBeenCalledWith(passage,{ language: 'English' });
    await click('2. try'); expect(window.AlloSpeechPlayer.stop).toHaveBeenCalled(); expect(host.textContent).toContain('on your own or with a partner');
    await set('My practice reflection', 'I paused at the full stop.'); await click('Save practice');
    expect([...values.values()][0].artifacts.find(a => a.type === 'practice').practiceStage).toBe('try');
    await click('Listen to model'); const stop = window.AlloSpeechPlayer.stop; await act(async () => root.unmount()); root = null; expect(stop).toHaveBeenCalledTimes(2);
  });
  it('saves words and bookmarks locally and filters passages to revisit', async () => {
    await mount(); await click('Bookmark passage'); await click('My words'); await set('Word or phrase','shade'); await set('Meaning in this passage','Away from direct sun.'); await set('How is my understanding?', 'reread'); await click('Save word');
    await set('Show saved entries','revisit'); expect(host.textContent).toContain('shade · Forest reading'); expect([...values.values()][0].artifacts).toHaveLength(2);
  });
  it('keeps reading profiles separate and persists the last edit on immediate close', async () => {
    await mount(); await set('Gist','Only reader A'); await click('Save reflection'); await act(async () => root.unmount()); root = null; host.remove();
    await mount({ activeProfileId: 'reader-b' }); expect(field('Gist').value).toBe(''); expect([...values.keys()]).toHaveLength(2);
  });
  it('keeps restricted passages local when a grounded answer is requested', async () => {
    const ai = vi.fn(); await mount({ readingSource: selection({ allowAI: false }), callGemini: ai });
    await set('What do you want to understand?', 'Why does the fox rest under the tree?'); await click('Find grounded answer');
    expect(ai).not.toHaveBeenCalled(); expect(host.textContent).toContain('does not permit this AI handoff');
  });
  it('offers keyboard-labelled controls with no automated accessibility violations', async () => {
    await mount(); const results = await axe.run(host, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } }); expect(results.violations).toEqual([]);
  });
});
