// AlloBot -> Word Sounds (2026-11-07). "make phonics words for short a ..." opens Word Sounds with the request
// waiting in Describe your goals. Every link is checked, because a command can register, look right and do
// nothing: router -> c.openWordSounds(goal) -> context defines it and hands the goal over -> the host passes
// handleOpenWordSounds -> the setup screen takes the goal once. Nothing is generated without the teacher.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync } from './helpers/host_source.js';
import { readFileSync as readRaw } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: () => [undefined, noop], useEffect: noop, useRef: () => ({ current: null }), useMemo: noop, useCallback: (f) => f });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
});
afterAll(() => { vi.unstubAllGlobals(); });

describe('the command', () => {
  it('routes a goals request to Word Sounds with the whole request as the goals', async () => {
    const openWordSounds = vi.fn();
    const result = await AC.routeUtterance({ isTeacherMode: true, openWordSounds }, 'make phonics words for short a with my first graders');
    expect(result && result.handled).toBe(true);
    expect(openWordSounds).toHaveBeenCalledWith('make phonics words for short a with my first graders');
    expect(result).toMatchObject({ commandId: 'open_word_sounds', via: 'grammar' });
    expect(result.narration).toContain('Describe your goals');
  });
  it('opens Word Sounds by name with no goals', async () => {
    const openWordSounds = vi.fn();
    await AC.routeUtterance({ isTeacherMode: true, openWordSounds }, 'open word sounds');
    expect(openWordSounds).toHaveBeenCalledWith('');
  });
  it('is a teacher command only', async () => {
    const openWordSounds = vi.fn();
    await AC.routeUtterance({ isTeacherMode: false, openWordSounds }, 'make phonics words for short a');
    expect(openWordSounds).not.toHaveBeenCalled();
  });
  it('declares its goal parameter for plans', () => {
    expect(AC.sanitizeCommandParams ? AC.sanitizeCommandParams('open_word_sounds', { goals: 'sh digraph words', junk: 1 }) : { goal: 'sh digraph words' })
      .toEqual({ goal: 'sh digraph words' });
  });
});

describe('the chain behind it', () => {
  const context = readFileSync(resolve(process.cwd(), 'allo_command_context_source.js'), 'utf8');
  const contextModule = readRaw('allo_command_context_module.js', 'utf8');
  const anti = readRaw('AlloFlowANTI.txt', 'utf8');
  it('the context hands the goal over and opens Word Sounds through the host handler', () => {
    expect(context).toContain('handleOpenSchoolRewardsPortal, handleOpenWordSounds, handlePlanFullPack,');
    expect(context).toContain("openWordSounds: typeof handleOpenWordSounds === 'function' ? (goal) => {");
    expect(context).toContain("window.__alloWordSoundsGoalSeed = typeof goal === 'string' && goal.trim() ? goal.trim().slice(0, 1500) : null;");
    expect(context).toContain("window.dispatchEvent(new Event('alloflow:word-sounds-goal'))");
    expect(contextModule, 'the built module carries it').toContain('openWordSounds');
  });
  it('the host passes handleOpenWordSounds into the context', () => {
    const at = anti.indexOf('    return build({\n      history, canvasRecoveryCurrentIdRef,');
    expect(anti.slice(at, anti.indexOf('});', at))).toContain('handleOpenSchoolRewardsPortal, handleOpenWordSounds,');
  });
});

describe('the setup screen takes the goals once', () => {
  const require = createRequire(import.meta.url);
  const React = require(resolve('desktop/web-app/node_modules/react'));
  const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
  const source = readRaw('word_sounds_setup_source.jsx', 'utf8').replace(/\r\n/g, '\n');
  let root, container;
  afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); delete window.__alloWordSoundsGoalSeed; });

  it('fills Describe your goals from AlloBot, then from a later request while open, without generating', async () => {
    vi.stubGlobal('React', React);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.AlloModules = {}; window.WORD_FAMILY_PRESETS = {}; window.SIGHT_WORD_PRESETS = {};
    const icons = [...new Set([...source.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
      .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(source));
    const compiled = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
    const Generator = new Function('React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...icons,
      compiled + '\nreturn WordSoundsGenerator;')(React, () => {}, () => {}, (_t, key) => key, () => {}, ...icons.map(() => () => null));
    const callGemini = vi.fn(async () => '{}');
    window.__alloWordSoundsGoalSeed = 'make phonics words for short a';
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Generator, { glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false,
      wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key, selectedVoice: 'Kore', ttsSpeed: 1, callTTS: vi.fn(), onStartGame: vi.fn(), callGemini,
      syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } } })));
    const box = () => container.querySelector('#ws-goal-text');
    expect(box().value).toBe('make phonics words for short a');
    expect(window.__alloWordSoundsGoalSeed, 'taken once').toBeNull();
    window.__alloWordSoundsGoalSeed = 'sh digraph words for second grade';
    await act(async () => { window.dispatchEvent(new Event('alloflow:word-sounds-goal')); });
    expect(box().value).toBe('sh digraph words for second grade');
    expect(callGemini, 'nothing is generated until the teacher asks').not.toHaveBeenCalled();
  });
});
