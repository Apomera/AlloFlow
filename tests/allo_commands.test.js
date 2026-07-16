// Unit tests for window.AlloModules.AlloCommands (allo_commands_module.js) -
// the natural-language / voice command router that maps a teacher/student
// utterance to an app action. Misrouting (or running a DESTRUCTIVE command
// without confirmation) is a real correctness/safety issue, so the scoring,
// role filtering, and the destructive-confirmation gate are worth pinning.
//
// The module hard-returns without window.React (it also builds a React command
// palette), so we stub React in beforeAll. The functions under test
// (scoreCommand / buildAlloCommands / routeUtterance) never touch React.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});
afterAll(() => { vi.unstubAllGlobals(); });

describe('AlloCommandPalette accessibility', () => {
  it('connects combobox selection and live search feedback for assistive technology', () => {
    const source = readFileSync(resolve(process.cwd(), 'allo_commands_source.jsx'), 'utf-8');
    expect(source).toContain('aria-autocomplete="list"');
    expect(source).toContain('aria-describedby="allo-palette-status"');
    expect(source).toContain('id="allo-palette-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain("count + ' matching command'");
    expect(source).toContain("selectedCommand.label + ' selected.'");
    expect(source).toContain("document.getElementById('allo-cmd-' + selectedCommandId)");
    expect(source).toContain("scrollIntoView({ block: 'nearest' })");
    expect(source).toContain("const COMMAND_RECENTS_KEY = 'allo_command_recents_v1'");
    expect(source).toContain("t('palette.group.recent', 'Recent')");
    expect(source).toContain('rememberCommand(cmd.id)');
  });
});

describe('command coverage drift guards', () => {
  const readRoot = (name) => readFileSync(resolve(process.cwd(), name), 'utf-8');

  it('keeps host launchers reachable from the command registry', () => {
    const app = readRoot('AlloFlowANTI.txt');
    const source = readRoot('allo_commands_source.jsx');
    const block = app.match(/Nested-tool launchers[\s\S]*?spotlightUiLanguage:/);
    expect(block).toBeTruthy();
    const launcherNames = [...new Set([...block[0].matchAll(/\b(open[A-Z][A-Za-z0-9]+):\s*\([^)]*\)\s*=>/g)].map((m) => m[1]))];
    expect(launcherNames).toEqual(expect.arrayContaining(['openVideoStudio', 'openTimelineStudio', 'openTestPrepHub']));
    const missing = launcherNames.filter((name) => !source.includes(`c.${name}(`));
    expect(missing).toEqual([]);
  });

  it('keeps command opensPanel ids backed by closeOtherPanels closers', () => {
    const app = readRoot('AlloFlowANTI.txt');
    const source = readRoot('allo_commands_source.jsx');
    const panels = [...new Set([...source.matchAll(/opensPanel:\s*'([^']+)'/g)].map((m) => m[1]))];
    expect(panels).toEqual(expect.arrayContaining(['videoStudio', 'timelineStudio', 'testPrepHub']));
    const closeBlock = app.match(/closeOtherPanels:\s*\(keep\)\s*=>\s*\{[\s\S]*?Object\.keys\(closers\)/);
    expect(closeBlock).toBeTruthy();
    const closers = new Set([...closeBlock[0].matchAll(/\b([A-Za-z][A-Za-z0-9]+):\s*\(\)\s*=>/g)].map((m) => m[1]));
    const allowedWithoutCloser = new Set(['dashboard']);
    const missing = panels.filter((panel) => !closers.has(panel) && !allowedWithoutCloser.has(panel));
    expect(missing).toEqual([]);
  });

  it('keeps every registry command explicitly grouped for palette browsing', () => {
    const source = readRoot('allo_commands_source.jsx');
    const registry = source.match(/const cmds = \[([\s\S]*?)\r?\n\s*\];\r?\n\s*const isStudentish/);
    const groupBlock = source.match(/const CMD_GROUP = \{([\s\S]*?)\n\};/);
    expect(registry).toBeTruthy();
    expect(groupBlock).toBeTruthy();
    const commandIds = [...new Set([...registry[1].matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1]))];
    const missing = commandIds.filter((id) => !new RegExp('\\b' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(groupBlock[1]));
    expect(missing).toEqual([]);
  });

  it('keeps command context tags backed by active-state flags and labels', () => {
    const source = readRoot('allo_commands_source.jsx');
    const contextBlock = source.match(/const CMD_CONTEXT = \{([\s\S]*?)\n\};/);
    const flagBlock = source.match(/const CTX_FLAG = \{([^\n]+)\};/);
    const labelBlock = source.match(/const CONTEXT_LABEL_FALLBACK = \{([^\n]+)\};/);
    expect(contextBlock).toBeTruthy();
    expect(flagBlock).toBeTruthy();
    expect(labelBlock).toBeTruthy();
    const contexts = [...new Set([...contextBlock[1].matchAll(/\[([^\]]+)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])))];
    const missingFlags = contexts.filter((name) => !new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(flagBlock[1]));
    const missingLabels = contexts.filter((name) => !new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(labelBlock[1]));
    expect(missingFlags).toEqual([]);
    expect(missingLabels).toEqual([]);
  });

  it('keeps every command handler dependency exposed by the host context', () => {
    const app = readRoot('AlloFlowANTI.txt');
    const source = readRoot('allo_commands_source.jsx');
    const ctxBlock = app.match(/const ctx = \{([\s\S]*?)\r?\n\s*\};\r?\n\s*_alloCmdCtxRef\.current = ctx/);
    expect(ctxBlock).toBeTruthy();
    const ctxSource = ctxBlock[1].replace(/\/\/.*$/gm, '');
    const explicitKeys = [...ctxSource.matchAll(/(?:^|[,{]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm)].map((m) => m[1]);
    const shorthandKeys = [...ctxSource.matchAll(/(?:^|[,{]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=,)/gm)].map((m) => m[1]);
    const provided = new Set([...explicitKeys, ...shorthandKeys]);
    const deps = [...new Set([...source.matchAll(/\bc\.([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)].map((m) => m[1]))];
    const notCtxDeps = new Set(['when']);
    const missing = deps.filter((name) => !provided.has(name) && !notCtxDeps.has(name));
    expect(missing).toEqual([]);
  });
});

describe('scoreCommand', () => {
  const cmd = { label: 'Open the educator hub', aliases: ['hub'] };
  it('scores an exact label/alias match 100', () => {
    expect(AC.scoreCommand(cmd, 'hub')).toBe(100);
    expect(AC.scoreCommand(cmd, 'open the educator hub')).toBe(100);
  });
  it('scores prefix 80, word-prefix 60, substring 40', () => {
    expect(AC.scoreCommand(cmd, 'open')).toBe(80);
    expect(AC.scoreCommand(cmd, 'educa')).toBe(60);
    expect(AC.scoreCommand({ label: 'translate' }, 'ansl')).toBe(40);
  });
  it('falls back to the hint (30), then 0', () => {
    expect(AC.scoreCommand({ label: 'X', hint: 'make text bigger' }, 'bigger')).toBe(30);
    expect(AC.scoreCommand({ label: 'X' }, 'zzz')).toBe(0);
  });
  it('returns 1 for an empty query', () => {
    expect(AC.scoreCommand(cmd, '')).toBe(1);
  });
});

describe('buildAlloCommands (role + when filtering)', () => {
  const ids = (ctx) => AC.buildAlloCommands(ctx).map((c) => c.id);
  it('includes teacher + all-role commands for a default teacher ctx', () => {
    const got = ids({});
    expect(got).toContain('open_educator_hub'); // roles: 'teacher'
    expect(got).toContain('open_learning_hub'); // roles: 'all'
  });
  it('excludes teacher-only commands in independent/student mode', () => {
    const got = ids({ isIndependentMode: true });
    expect(got).not.toContain('open_educator_hub');
    expect(got).toContain('open_learning_hub');
  });
  it('applies when() predicates (a gated command appears only when its condition holds)', () => {
    expect(ids({})).not.toContain('pipeline_new_doc'); // when: pipelineOpen
    expect(ids({ pipelineOpen: true })).toContain('pipeline_new_doc');
  });
  it('covers newer studio and practice launchers with the right role visibility', () => {
    const teacher = ids({});
    expect(teacher).toEqual(expect.arrayContaining([
      'open_video_studio', 'open_cinematic_studio', 'open_allo_studio',
      'open_open_groove', 'open_timeline_studio', 'open_lingua_practice', 'open_test_prep_hub',
    ]));
    const student = ids({ isIndependentMode: true });
    expect(student).not.toContain('open_video_studio');
    expect(student).not.toContain('open_cinematic_studio');
    expect(student).not.toContain('open_allo_studio');
    expect(student).toEqual(expect.arrayContaining(['open_open_groove', 'open_timeline_studio', 'open_lingua_practice', 'open_test_prep_hub']));
  });
});

describe('routeUtterance', () => {
  it('returns null for empty or over-long input', async () => {
    expect(await AC.routeUtterance({}, '')).toBeNull();
    expect(await AC.routeUtterance({}, 'x'.repeat(201))).toBeNull();
  });

  it('routes a "where is X" utterance to ctx.whereIs', async () => {
    const ctx = { whereIs: (q) => 'It is in the sidebar: ' + q };
    const r = await AC.routeUtterance(ctx, 'where is the glossary');
    expect(r).toMatchObject({ handled: true, commandId: 'where_is', via: 'where-is' });
    expect(r.narration).toContain('glossary');
  });

  it('dispatches a matched command deterministically and runs it', async () => {
    const setShowEducatorHub = vi.fn();
    const r = await AC.routeUtterance({ setShowEducatorHub }, 'open the educator hub');
    expect(r).toMatchObject({ handled: true, commandId: 'open_educator_hub', via: 'deterministic' });
    expect(setShowEducatorHub).toHaveBeenCalledWith(true);
  });

  it('gates a destructive command behind confirmation', async () => {
    const startNewPdfAudit = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    const r1 = await AC.routeUtterance(ctx, 'start over with a new document');
    expect(r1.commandId).toBe('pipeline_new_doc');
    expect(startNewPdfAudit).not.toHaveBeenCalled(); // not confirmed -> not run
    await AC.routeUtterance(ctx, 'start over with a new document', { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled(); // confirmed -> run
  });
});

// The bot CHAT routes every message through the router first. If it EXECUTES on a
// match, a stray "bot"/"hi" opener runs toggle_bot -> the bot hides and the chat
// closes. Preview mode must MATCH-without-running so the chat can confirm first.
describe('routeUtterance preview mode (bot chat safety)', () => {
  it('excludes chatSkip commands (toggle_bot) from chat proposals', async () => {
    // Hiding the bot from inside its own chat is pointless (there is an X), so
    // "bot"/"assistant" must not even raise a confirm chip in the chat.
    const handleToggleIsBotVisible = vi.fn();
    const r = await AC.routeUtterance({ handleToggleIsBotVisible }, 'bot', { preview: true, allowAi: false });
    expect(r).toBeNull();
    expect(handleToggleIsBotVisible).not.toHaveBeenCalled();
  });

  it('but toggle_bot STILL runs via Ctrl+K / voice (non-preview)', async () => {
    const handleToggleIsBotVisible = vi.fn();
    const r = await AC.routeUtterance({ handleToggleIsBotVisible }, 'bot', {});
    expect(r).toMatchObject({ handled: true, commandId: 'toggle_bot' });
    expect(handleToggleIsBotVisible).toHaveBeenCalled();
  });

  it('previews a real multi-word command without side effects', async () => {
    const setShowEducatorHub = vi.fn();
    const r = await AC.routeUtterance({ setShowEducatorHub }, 'open the educator hub', { preview: true });
    expect(r).toMatchObject({ preview: true, commandId: 'open_educator_hub' });
    expect(setShowEducatorHub).not.toHaveBeenCalled();
  });

  it('does NOT match a short opener like "hi" (would only be noise)', async () => {
    // 'hi' scores 80 via "hide bot".startsWith("hi") but is < 3 chars -> rejected in
    // preview. allowAi:false so it cannot fall through to the AI classifier.
    const handleToggleIsBotVisible = vi.fn();
    const r = await AC.routeUtterance({ handleToggleIsBotVisible }, 'hi', { preview: true, allowAi: false });
    expect(r).toBeNull();
    expect(handleToggleIsBotVisible).not.toHaveBeenCalled();
  });

  it('does not spotlight on a "where is X" utterance in preview mode', async () => {
    const whereIs = vi.fn(() => 'in the sidebar');
    const r = await AC.routeUtterance({ whereIs }, 'where is the glossary', { preview: true, allowAi: false });
    expect(whereIs).not.toHaveBeenCalled();
    expect(r).toBeNull();
  });
});

describe('reading librarian command', () => {
  const miniCatalog = {
    books: [
      {
        slug: 'climate-frontiers',
        title: 'Climate Change and Coral Reefs',
        description: 'A science article about warming oceans, coral reefs, and climate change.',
        language: 'English',
        langCode: 'en',
        level: '5',
        sourceId: 'frontiers',
        contentType: 'article',
        subjects: ['climate', 'ocean', 'science'],
        source: { name: 'Frontiers for Young Minds' },
        file: 'books/climate-frontiers.json',
      },
      {
        slug: 'dance-story',
        title: 'Gappu Can Dance',
        description: 'A joyful early-reader story about dancing and opposites.',
        language: 'English',
        langCode: 'en',
        level: '1',
        sourceId: 'storyweaver',
        contentType: 'story',
        subjects: ['dance'],
        source: { name: 'StoryWeaver, Pratham Books' },
        file: 'books/dance-story.json',
      },
      {
        slug: 'clima-es',
        title: 'El clima y los oceanos',
        description: 'Una lectura sobre el clima y el oceano.',
        language: 'Spanish',
        langCode: 'es',
        level: '4',
        sourceId: 'storyweaver',
        contentType: 'story',
        subjects: ['climate', 'ocean'],
        source: { name: 'StoryWeaver, Pratham Books' },
        file: 'books/clima-es.json',
      },
    ],
  };

  it('normalizes topic, grade, language, and source hints', () => {
    const req = AC.normalizeReadingRequest({ topic: 'climate change in Spanish from StoryWeaver for grade 5' });
    expect(req).toMatchObject({ topic: 'climate change', grade: '5', language: 'Spanish', source: 'storyweaver' });
  });

  it('ranks catalog matches by topic, format, grade, and language', () => {
    const article = AC.findReadingMatches(miniCatalog, { topic: 'climate change', grade: '6', format: 'article' }, { limit: 2 });
    expect(article[0].book.slug).toBe('climate-frontiers');
    expect(article[0].why).toEqual(expect.arrayContaining(['matches "climate change"', 'near grade 6', 'student science article']));
    expect(AC.readingMatchWhyText(article[0], { topic: 'climate change', grade: '6', format: 'article' })).toContain('near grade 6');

    const spanish = AC.findReadingMatches(miniCatalog, { topic: 'climate ocean', language: 'Spanish' }, { limit: 2 });
    expect(spanish[0].book.slug).toBe('clima-es');
    expect(spanish[0].why).toContain('Spanish');
  });

  it('includes a short why-this-book note when the command searches the catalog directly', () => {
    const openReadingBook = vi.fn();
    const run = AC.runCommandById(
      { readingLibraryIndex: miniCatalog, openReadingBook },
      'find_reading',
      { topic: 'climate change', grade: '6', format: 'article' },
      { confirmed: true }
    );
    expect(run.narration).toContain('Why this fits:');
    expect(run.narration).toContain('near grade 6');
    expect(run.narration).toContain('student science article');
    expect(openReadingBook).toHaveBeenCalledWith('climate-frontiers');
  });

  it('previews a book-finding request, then runs only after confirmation', async () => {
    const findReadingBooks = vi.fn(() => 'Opened a climate book.');
    const r = await AC.routeUtterance({ findReadingBooks }, 'find books about climate change for grade 6', { preview: true, allowAi: false });
    expect(r).toMatchObject({ preview: true, commandId: 'find_reading' });
    expect(r.params).toMatchObject({ topic: 'climate change', grade: '6' });
    expect(findReadingBooks).not.toHaveBeenCalled();

    const run = AC.runCommandById({ findReadingBooks }, 'find_reading', r.params, { confirmed: true });
    expect(run).toMatchObject({ handled: true, commandId: 'find_reading' });
    expect(run.narration).toContain('climate');
    expect(findReadingBooks).toHaveBeenCalledWith(expect.objectContaining({ topic: 'climate change', grade: '6' }));
  });
});

describe('runCommandById (executes a confirmed, previewed command)', () => {
  it('runs the command by id', () => {
    const handleToggleIsBotVisible = vi.fn();
    const r = AC.runCommandById({ handleToggleIsBotVisible }, 'toggle_bot', {});
    expect(r).toMatchObject({ handled: true, commandId: 'toggle_bot' });
    expect(handleToggleIsBotVisible).toHaveBeenCalled();
  });

  it('returns null for an unknown id', () => {
    expect(AC.runCommandById({}, 'no_such_command')).toBeNull();
  });
  it('opens newer studio launchers through one host handler and closes peer panels', () => {
    const closeOtherPanels = vi.fn();
    const openTimelineStudio = vi.fn();
    const r = AC.runCommandById({ closeOtherPanels, openTimelineStudio }, 'open_timeline_studio', {});
    expect(r).toMatchObject({ handled: true, commandId: 'open_timeline_studio' });
    expect(closeOtherPanels).toHaveBeenCalledWith('timelineStudio');
    expect(openTimelineStudio).toHaveBeenCalledTimes(1);
  });

  it('still gates a destructive command until confirmed:true', () => {
    const startNewPdfAudit = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    AC.runCommandById(ctx, 'pipeline_new_doc', {}); // no confirmed flag
    expect(startNewPdfAudit).not.toHaveBeenCalled();
    AC.runCommandById(ctx, 'pipeline_new_doc', {}, { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled();
  });
});
