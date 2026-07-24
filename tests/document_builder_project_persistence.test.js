import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let MiscHandlers;

class TestFileReader {
  readAsText(file) {
    this.onload({ target: { result: file.contents } });
  }
}

const makeLoadDeps = (overrides = {}) => ({
  setStudentProjectSettings: vi.fn(),
  setHistory: vi.fn(),
  hydrateHistory: (items) => items.map((item) => ({ ...item, hydrated: true })),
  restoreBuilderDraft: vi.fn(),
  setGeneratedContent: vi.fn(),
  setActiveView: vi.fn(),
  setIsMapLocked: vi.fn(),
  setStickers: vi.fn(),
  projectFileInputRef: { current: { value: 'selected' } },
  addToast: vi.fn(),
  warnLog: vi.fn(),
  t: (key) => key,
  ...overrides
});

beforeAll(() => {
  loadAlloModule('misc_handlers_module.js');
  MiscHandlers = window.AlloModules.MiscHandlers;
});

beforeEach(() => {
  vi.stubGlobal('FileReader', TestFileReader);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Document Builder project draft loading', () => {
  it('hands the saved draft and hydrated resources to the host validator', async () => {
    const builderDraft = {
      version: 1,
      source: 'history',
      historySignature: '123:abc',
      html: '<!doctype html><html><body><h1>Edited</h1></body></html>'
    };
    const deps = makeLoadDeps();
    const contents = JSON.stringify({
      mode: 'teacher',
      history: [{ id: 'lesson-1', type: 'lesson-plan', data: {} }],
      builderDraft
    });

    MiscHandlers.handleLoadProject({ target: { files: [{ contents }] } }, deps);

    expect(deps.setHistory).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'lesson-1', hydrated: true })
    ]);
    expect(deps.restoreBuilderDraft).toHaveBeenCalledWith(builderDraft, [
      expect.objectContaining({ id: 'lesson-1', hydrated: true })
    ], expect.objectContaining({
      signal: expect.any(AbortSignal),
      isCurrent: expect.any(Function),
    }));
    await vi.waitFor(() => {
      expect(deps.projectFileInputRef.current.value).toBe('');
    });
  });

  it('still calls the validator for older files so prior-project drafts are cleared', () => {
    const deps = makeLoadDeps();
    const contents = JSON.stringify({ mode: 'teacher', history: [] });

    MiscHandlers.handleLoadProject({ target: { files: [{ contents }] } }, deps);

    expect(deps.restoreBuilderDraft).toHaveBeenCalledWith(undefined, [], expect.objectContaining({
      signal: expect.any(AbortSignal),
      isCurrent: expect.any(Function),
    }));
  });

  it('brackets a valid import with a successful recovery lifecycle', async () => {
    const onProjectLoadStart = vi.fn();
    const onProjectLoadComplete = vi.fn();
    const deps = makeLoadDeps({ onProjectLoadStart, onProjectLoadComplete });
    const contents = JSON.stringify({
      mode: 'teacher',
      history: [{ id: 'lesson-2', type: 'quiz', data: {} }]
    });

    MiscHandlers.handleLoadProject({ target: { files: [{ contents }] } }, deps);

    expect(onProjectLoadStart).toHaveBeenCalledWith(expect.objectContaining({
      history: [expect.objectContaining({ id: 'lesson-2' })]
    }));
    await vi.waitFor(() => {
      expect(onProjectLoadComplete).toHaveBeenCalledWith({ success: true });
    });
  });

  it('reports a failed lifecycle when hydration fails after validation', async () => {
    const onProjectLoadStart = vi.fn();
    const onProjectLoadComplete = vi.fn();
    const deps = makeLoadDeps({
      onProjectLoadStart,
      onProjectLoadComplete,
      hydrateHistory: () => { throw new Error('hydrate failed'); }
    });
    const contents = JSON.stringify({
      mode: 'teacher',
      history: [{ id: 'broken', type: 'quiz', data: {} }]
    });

    MiscHandlers.handleLoadProject({ target: { files: [{ contents }] } }, deps);

    await vi.waitFor(() => {
      expect(onProjectLoadComplete).toHaveBeenCalledWith({ success: false });
    });
    expect(deps.warnLog).toHaveBeenCalled();
  });

  it('keeps the host-side import boundary versioned, size-limited, and active-content safe', () => {
    const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

    expect(source).toContain('const BUILDER_PROJECT_DRAFT_MAX_BYTES = 32 * 1024 * 1024');
    expect(source).toContain("if (candidate.version === 1) return typeof candidate.html === 'string' ? candidate.html : null;");
    expect(source).toContain('if (candidate.version !== 2) return null;');
    expect(source).toContain("encoding: 'deflate-raw-base64'");
    expect(source).toContain('candidate.historySignature !== historySignature');
    expect(source).toContain("querySelectorAll('script,iframe,frame,frameset,object,embed,base,link,meta[http-equiv]')");
    expect(source).toContain("name.startsWith('on') || name === 'srcdoc'");
    expect(source).toContain("builderDraft: saveType === 'teacher' ? _getBuilderDraftForProject() : null");
  });
});
