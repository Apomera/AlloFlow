// Load Project · an AlloPack opens on its directions, not its last resource.
//
// Found 2026-09-22 in Chromium: a teacher who loaded any Crew Launch pack landed on resource 10 of 10
// (the challenge), because Load Project always showed the LAST history item. Every AlloPack puts its
// directions (the run sheet, goals and quest map) first. Saved projects without an `allopack` block
// keep today's behavior: they reopen where the work left off.
//
// Drives the real handleLoadProject from misc_handlers_source.jsx (as project_load_async_ownership
// does) with a real Crew pack file. MISC_SOURCE_PATH points it at a copy for mutation runs.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(process.env.MISC_SOURCE_PATH ? resolve(process.env.MISC_SOURCE_PATH) : resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
const runtimeStart = source.indexOf('function _createProjectLoadOperationManager');
const runtimeEnd = source.indexOf('const detectClimaxArchetype', runtimeStart);
if (runtimeStart < 0 || runtimeEnd < 0) throw new Error('Project-load runtime markers missing');
const crewPack = readFileSync(resolve(process.cwd(), 'allopacks/crew_norms_grade6_8.allopack.json'), 'utf8');

function makeRuntime() {
  class ImmediateFileReader {
    readAsText(file) { this.onload({ target: { result: file.contents } }); }
    abort() {}
  }
  return new Function('window', 'FileReader', 'AbortController', 'localStorage', 'CustomEvent',
    source.slice(runtimeStart, runtimeEnd) + '\nreturn { handleLoadProject };',
  )(window, ImmediateFileReader, AbortController, localStorage, CustomEvent);
}

async function load(contents) {
  const { handleLoadProject } = makeRuntime();
  const state = {};
  const done = [];
  const deps = {
    setStudentProjectSettings: vi.fn(), setStickers: vi.fn(), warnLog: vi.fn(),
    setHistory: (history) => { state.history = history; },
    hydrateHistory: (history) => history.map((item) => ({ ...item })),
    restoreBuilderDraft: async () => true,
    setGeneratedContent: (value) => { state.generatedContent = value; },
    setActiveView: (value) => { state.activeView = value; },
    setIsMapLocked: (value) => { state.mapLocked = value; },
    projectFileInputRef: { current: { value: 'x' } },
    addToast: () => {}, t: (key) => key,
    onProjectLoadStart: () => {}, onProjectLoadComplete: (p) => done.push(p),
  };
  handleLoadProject({ target: { files: [{ contents }] } }, deps);
  await vi.waitFor(() => expect(done.length).toBe(1));
  return state;
}

describe('Load Project opens an AlloPack on its directions', () => {
  it('a Crew pack opens on the directions, not the challenge at the end', async () => {
    const pack = JSON.parse(crewPack);
    expect(pack.history[0].type).toBe('directions');
    expect(pack.history[pack.history.length - 1].type).toBe('applied-challenge');
    const state = await load(crewPack);
    expect(state.history).toHaveLength(pack.history.length);
    expect(state.activeView).toBe('directions');
    expect(state.generatedContent.type).toBe('directions');
    expect(state.generatedContent.title).toBe(pack.history[0].title);
  });

  it('a saved project without an allopack block still reopens where the work left off', async () => {
    const state = await load(JSON.stringify({
      mode: 'teacher',
      history: [{ id: 'd', type: 'directions', data: { body: 'x', objectives: [] } }, { id: 'q', type: 'quiz', data: { questions: [] } }],
    }));
    expect(state.activeView).toBe('quiz');
    expect(state.generatedContent.id).toBe('q');
  });

  it('an AlloPack with no directions item falls back to the last resource', async () => {
    const pack = JSON.parse(crewPack);
    pack.history = pack.history.filter((r) => r.type !== 'directions');
    const state = await load(JSON.stringify(pack));
    expect(state.activeView).toBe('applied-challenge');
  });
});
