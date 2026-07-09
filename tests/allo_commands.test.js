// Unit tests for window.AlloModules.AlloCommands (allo_commands_module.js) —
// the natural-language / voice command router that maps a teacher/student
// utterance to an app action. Misrouting (or running a DESTRUCTIVE command
// without confirmation) is a real correctness/safety issue, so the scoring,
// role filtering, and the destructive-confirmation gate are worth pinning.
//
// The module hard-returns without window.React (it also builds a React command
// palette), so we stub React in beforeAll. The functions under test
// (scoreCommand / buildAlloCommands / routeUtterance) never touch React.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
    expect(startNewPdfAudit).not.toHaveBeenCalled(); // not confirmed → not run
    await AC.routeUtterance(ctx, 'start over with a new document', { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled(); // confirmed → run
  });
});

// The bot CHAT routes every message through the router first. If it EXECUTES on a
// match, a stray "bot"/"hi" opener runs toggle_bot → the bot hides and the chat
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
    // 'hi' scores 80 via "hide bot".startsWith("hi") but is < 3 chars → rejected in
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

  it('still gates a destructive command until confirmed:true', () => {
    const startNewPdfAudit = vi.fn();
    const ctx = { pipelineOpen: true, startNewPdfAudit };
    AC.runCommandById(ctx, 'pipeline_new_doc', {}); // no confirmed flag
    expect(startNewPdfAudit).not.toHaveBeenCalled();
    AC.runCommandById(ctx, 'pipeline_new_doc', {}, { confirmed: true });
    expect(startNewPdfAudit).toHaveBeenCalled();
  });
});
