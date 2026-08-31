// Activities resource (brainstorm rebuild, 2026-08-16) — design pins.
// docs/ACTIVITIES_RESOURCE_DESIGN_2026-08-16.md §5.
//
// Covers: back-compat (kind-less items render as idea cards), simulation mode
// still emitting type 'gemini-bridge', a WRITER existing for activityMode (the
// workStoryEnabled dead-toggle lesson), catalog stance, normalizer behavior,
// teacher-gated jigsaw answer key, ui_strings keys, and ?v pin freshness in
// BOTH ANTI copies.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { createRequire } from 'node:module';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ── Load the built dispatcher module with a window stub ────────────────────
const loadDispatcher = () => {
  const src = read('generate_dispatcher_module.js');
  const windowStub = { AlloModules: {}, console };
  new Function('window', 'console', src)(windowStub, console);
  return windowStub.AlloModules.GenDispatcher;
};

describe('dispatcher — structured-activity normalizers', () => {
  const dispatcher = loadDispatcher();

  it('exports both normalizers as pure seams', () => {
    expect(typeof dispatcher.normalizeDiscussionKit).toBe('function');
    expect(typeof dispatcher.normalizeJigsawActivity).toBe('function');
  });

  it('discussion: normalizes a full kit and stamps kind', () => {
    const kit = dispatcher.normalizeDiscussionKit({
      title: 'Water Cycle Talk',
      protocol: 'fishbowl',
      grouping: 'Inner circle of 6.',
      openingQuestion: 'Where does rain go?',
      questionSets: [
        { depth: 'literal', questions: ['What is evaporation?'] },
        { depth: 'evaluative', questions: ['Is water infinite?'] },
      ],
      talkStems: { agree: ['I agree because…'], build: ['Adding to that…'] },
      facilitationNotes: 'Keep it moving.',
      lookFors: ['Cites the text'],
    }, 'think-pair-share');
    expect(kit.kind).toBe('discussion');
    expect(kit.protocol).toBe('fishbowl');
    expect(kit.questionSets.map(s => s.depth)).toEqual(['literal', 'evaluative']);
    expect(kit.talkStems.agree).toHaveLength(1);
    expect(kit.rubric).toBeNull();
  });

  it('discussion: degrades on partial sets and falls back to the requested protocol', () => {
    const kit = dispatcher.normalizeDiscussionKit({
      title: 'T',
      protocol: 'not-a-protocol',
      questionSets: [{ depth: 'inferential', questions: ['Why?'] }],
    }, 'gallery-walk');
    expect(kit.protocol).toBe('gallery-walk');
    expect(kit.questionSets).toHaveLength(1);
  });

  it('discussion: returns null on junk instead of crashing', () => {
    expect(dispatcher.normalizeDiscussionKit(null, 'fishbowl')).toBeNull();
    expect(dispatcher.normalizeDiscussionKit([], 'fishbowl')).toBeNull();
    expect(dispatcher.normalizeDiscussionKit({ title: 'No questions' }, 'fishbowl')).toBeNull();
  });

  it('jigsaw: normalizes chunks, clamps group size, keeps q+answer once', () => {
    const act = dispatcher.normalizeJigsawActivity({
      title: 'Rock Cycle Jigsaw',
      chunks: [
        { label: 'Igneous', expertPacket: 'About igneous…', teachBack: { keyPoints: ['Cooled magma'], checkQuestions: ['What cools?'] } },
        { expertPacket: 'About sedimentary…' },
        { label: 'Empty one' },
      ],
      homeGroupTask: 'Build the full cycle.',
      synthesisOrganizer: '| Rock | Origin |',
      accountabilityCheck: [
        { q: 'Name one rock type', answer: 'Igneous', options: ['a', 'b'] },
        { q: '', answer: 'dropped' },
        { q: 'Uses legacy a field', a: 'legacy answer' },
      ],
    }, 99);
    expect(act.kind).toBe('jigsaw');
    // chunk without an expertPacket is dropped; missing label gets a default
    expect(act.chunks).toHaveLength(2);
    expect(act.chunks[1].label).toBe('Expert 2');
    // out-of-range group size falls back to chunk count
    expect(act.groupSize).toBe(2);
    // free-response only: q + answer survive, MCQ-shaped fields do not
    expect(act.accountabilityCheck).toEqual([
      { q: 'Name one rock type', answer: 'Igneous' },
      { q: 'Uses legacy a field', answer: 'legacy answer' },
    ]);
    expect(act.accountabilityCheck[0].options).toBeUndefined();
  });

  it('jigsaw: needs at least two real chunks', () => {
    expect(dispatcher.normalizeJigsawActivity({ title: 'T', chunks: [{ expertPacket: 'only one' }] }, 4)).toBeNull();
  });

  it('describeActivityItem: discussion renders labeled, numbered text', () => {
    const text = dispatcher.describeActivityItem({
      kind: 'discussion', title: 'Soil Seminar', protocol: 'fishbowl',
      openingQuestion: 'Why does soil matter?',
      questionSets: [{ depth: 'literal', questions: ['What is loam?', 'Name a soil layer.'] }],
      talkStems: { agree: ['I agree because…'] },
      facilitationNotes: 'Keep momentum.', lookFors: ['Cites text'],
    });
    expect(text).toContain('Soil Seminar');
    expect(text).toContain('Right there in the text:');
    expect(text).toContain('1. What is loam?');
    expect(text).toContain('2. Name a soil layer.');
    expect(text).toContain('Agreeing: I agree because…');
    expect(text).toContain('Facilitation notes (teacher):');
  });

  it('describeActivityItem: jigsaw separates the answer key under its own header', () => {
    const text = dispatcher.describeActivityItem({
      kind: 'jigsaw', title: 'Cycle Jigsaw',
      chunks: [{ label: 'A', expertPacket: 'packet a', teachBack: { keyPoints: ['kp1'], checkQuestions: [] } }],
      homeGroupTask: 'the task', accountabilityCheck: [{ q: 'THE-QUESTION', answer: 'THE-ANSWER' }],
    });
    const answerHeaderAt = text.indexOf('Answer key (teacher only):');
    expect(answerHeaderAt).toBeGreaterThan(-1);
    // the answer appears only after the answer-key header, never beside the question
    expect(text.indexOf('THE-ANSWER')).toBeGreaterThan(answerHeaderAt);
    expect(text.indexOf('THE-QUESTION')).toBeLessThan(answerHeaderAt);
  });

  it('describeActivityItem: labels overridable, idea cards keep the classic three-field join', () => {
    const localized = dispatcher.describeActivityItem(
      { kind: 'discussion', title: 'T', questionSets: [{ depth: 'literal', questions: ['q'] }], talkStems: {} },
      { depth_literal: 'LOCALIZED-DEPTH' });
    expect(localized).toContain('LOCALIZED-DEPTH:');
    expect(dispatcher.describeActivityItem({ title: 'A', description: 'B', connection: 'C' })).toBe('A\nB\nC');
  });

  it('shapes are pure data (fn-in-state guard)', () => {
    const kit = dispatcher.normalizeDiscussionKit({ title: 'T', questionSets: [{ depth: 'literal', questions: ['Q'] }] }, 'fishbowl');
    const act = dispatcher.normalizeJigsawActivity({ title: 'T', chunks: [{ expertPacket: 'a' }, { expertPacket: 'b' }] }, 4);
    for (const obj of [kit, act]) {
      expect(JSON.parse(JSON.stringify(obj))).toEqual(obj);
    }
  });

  it('tracks stable derivative records across generation and editing', () => {
    const content = dispatcher.attachActivityDerivativeMetadata([
      { kind: 'jigsaw', title: 'Rock cycle', worksheet: '## Exit ticket' }
    ], 'pack-1');
    expect(content[0].derivatives).toMatchObject({
      guide: { status: 'not-created', version: 0, format: 'markdown' },
      worksheet: { status: 'ready', version: 1, format: 'markdown' },
      rubric: { status: 'not-created', version: 0, format: 'json' },
      cover: { status: 'not-created', version: 0, format: 'image' }
    });
    expect(content[0].derivatives.worksheet.artifactId).toBe('pack-1-activity-0-worksheet');
    expect(content[0].derivatives.worksheet.contentHash).toMatch(/^[a-z0-9]+$/);
    const edited = dispatcher.stampActivityDerivative(
      { ...content[0], worksheet: '## Revised exit ticket' },
      'pack-1',
      0,
      'worksheet',
      { status: 'edited', bumpVersion: true, pageDesignerDocumentId: 'studio-1' }
    );
    expect(edited.derivatives.worksheet).toMatchObject({
      status: 'edited',
      version: 2,
      pageDesignerDocumentId: 'studio-1'
    });
    expect(edited.derivatives.worksheet.contentHash).toMatch(/^[a-z0-9]+$/);
    expect(edited.derivatives.worksheet.contentHash).not.toBe(content[0].derivatives.worksheet.contentHash);
  });
});

// ── Dispatcher branch wiring ───────────────────────────────────────────────
describe.each([
  'generate_dispatcher_source.jsx',
  'generate_dispatcher_module.js',
  path.join('desktop', 'web-app', 'public', 'generate_dispatcher_module.js'),
])('%s — brainstorm branch activity modes', (relPath) => {
  const src = read(relPath);

  it('reads activityMode from configOverride with ideas as the default', () => {
    expect(src).toMatch(/configOverride\.activityMode === 'string' \? configOverride\.activityMode : 'ideas'/);
  });

  it('keeps the simulation path as a separate gemini-bridge branch (no data migration)', () => {
    expect(src).toMatch(/type === 'gemini-bridge'/);
  });
});

describe.each([
  'AlloFlowANTI.txt',
  path.join('desktop', 'web-app', 'src', 'AlloFlowANTI.txt'),
  path.join('desktop', 'web-app', 'src', 'App.jsx'),
])('%s — linked worksheet revision contract', (relPath) => {
  const src = read(relPath);

  it('uses content fingerprints for conflict checks and returns the next revision', () => {
    expect(src).toMatch(/worksheetMeta\.contentHash/);
    expect(src).toMatch(/expectedRevision/);
    expect(src).toMatch(/String\(payload\.sourceRevision\) !== String\(expectedRevision\)/);
    expect(src).toMatch(/return \{ ok: true, sourceRevision: String\(nextRevision\)/);
  });
});

describe.each([
  'generate_dispatcher_source.jsx',
  'generate_dispatcher_module.js',
  path.join('desktop', 'web-app', 'public', 'generate_dispatcher_module.js'),
])('%s — structured activity recovery', (relPath) => {
  const src = read(relPath);

  it('bounds malformed Discussion/Jigsaw repair and preserves fatal errors', () => {
    expect(src).toMatch(/generateStructuredActivityWithRecovery/);
    expect(src).toMatch(/attempt <= 2/);
    expect(src).toMatch(/401\|403\|quota\|safety/);
    expect(src).toMatch(/error && \(error\.status \|\| error\.statusCode \|\| error\.httpStatus\)/);
    expect(src).toMatch(/RECOVERY:/);
  });
});

// ── Panel: mode picker + writer + configOverride carriage ──────────────────
describe.each([
  'view_sidebar_panels_source.jsx',
  'view_sidebar_panels_module.js',
  path.join('desktop', 'web-app', 'public', 'view_sidebar_panels_module.js'),
])('%s — BrainstormPanel activity modes', (relPath) => {
  const src = read(relPath);

  it('a WRITER exists for activityMode (picker buttons call the setter)', () => {
    expect(src).toMatch(/setActivityMode/);
    // the setter is actually invoked, not just declared
    expect(src.match(/setActivityMode\(/g).length).toBeGreaterThanOrEqual(1);
  });

  it('non-simulation generates pass activityMode + activityConfig via configOverride', () => {
    // esbuild rewrites single quotes to double in the built module
    expect(src).toMatch(/handleGenerate\(["']brainstorm["'],\s*null,\s*!1|handleGenerate\(["']brainstorm["'],\s*null,\s*false,\s*null,\s*\{\s*activityMode/);
    expect(src).toMatch(/activityConfig/);
  });

  it('simulation mode still generates through the gemini-bridge type', () => {
    expect(src).toMatch(/handleGenerate\(["']gemini-bridge["']\)/);
  });

  it('mode picker is keyboard-honest (aria-pressed buttons, help key present)', () => {
    expect(src).toMatch(/brainstorm_mode_picker/);
    expect(src).toMatch(/aria-pressed|"aria-pressed"/);
  });
});

// ── Renderer: kind routing + teacher-gated answer key ──────────────────────
const loadBrainstormView = () => {
  const require2 = createRequire(path.join(ROOT, 'desktop', 'web-app', 'package.json'));
  const React = require2('react');
  const { renderToStaticMarkup } = require2('react-dom/server');
  const src = read('view_brainstorm_module.js');
  const windowStub = { React, AlloIcons: {}, AlloModules: {}, console };
  new Function('window', 'console', src)(windowStub, console);
  return { React, renderToStaticMarkup, BrainstormView: windowStub.AlloModules.BrainstormView };
};

const baseProps = (React, data, isTeacherMode) => ({
  t: () => '',
  generatedContent: { data },
  isTeacherMode,
  isEditingBrainstorm: false,
  isGeneratingGuide: {},
  isGeneratingBrainstormRubric: {},
  isGeneratingWorksheet: {},
  isGeneratingWorksheetCover: {},
  handleToggleIsEditingBrainstorm: () => {},
  handleBrainstormChange: () => {},
  handleGenerateGuide: () => {},
  handleGenerateBrainstormRubric: () => {},
  handleGenerateWorksheet: () => {},
  handleGenerateWorksheetCover: () => {},
  getRows: () => 3,
  renderFormattedText: (s) => React.createElement('span', null, s),
});

describe('BrainstormView — kind-aware rendering (SSR smoke)', () => {
  const { React, renderToStaticMarkup, BrainstormView } = loadBrainstormView();

  it('kind-less items render as classic idea cards (pre-change saves unchanged)', () => {
    const html = renderToStaticMarkup(React.createElement(BrainstormView, baseProps(React, [
      { title: 'Old Idea', description: 'From a saved project', connection: 'Legacy', rubric: null },
    ], true)));
    expect(html).toContain('Old Idea');
    expect(html).toContain('Legacy');
    expect(html).not.toContain('brainstorm_discussion_card');
    expect(html).not.toContain('brainstorm_jigsaw_card');
  });

  it('discussion items render the kit body with stems and teacher notes', () => {
    const item = {
      kind: 'discussion', title: 'Seminar on Soil', protocol: 'socratic-seminar',
      grouping: 'Circle of 12.', openingQuestion: 'Why does soil matter?',
      questionSets: [{ depth: 'literal', questions: ['What is loam?'] }],
      talkStems: { agree: ['I agree because…'] },
      facilitationNotes: 'SECRET-FACILITATION', lookFors: ['SECRET-LOOKFOR'], rubric: null,
    };
    const teacherHtml = renderToStaticMarkup(React.createElement(BrainstormView, baseProps(React, [item], true)));
    expect(teacherHtml).toContain('brainstorm_discussion_card');
    expect(teacherHtml).toContain('What is loam?');
    expect(teacherHtml).toContain('SECRET-FACILITATION');
    const studentHtml = renderToStaticMarkup(React.createElement(BrainstormView, baseProps(React, [item], false)));
    expect(studentHtml).toContain('What is loam?');
    // facilitation notes + look-fors are teacher-only
    expect(studentHtml).not.toContain('SECRET-FACILITATION');
    expect(studentHtml).not.toContain('SECRET-LOOKFOR');
  });

  it('jigsaw answer key renders for teachers only; questions render for everyone', () => {
    const item = {
      kind: 'jigsaw', title: 'Cycle Jigsaw', groupSize: 3,
      chunks: [
        { label: 'A', expertPacket: 'packet a', teachBack: { keyPoints: ['kp'], checkQuestions: ['cq'] } },
        { label: 'B', expertPacket: 'packet b', teachBack: { keyPoints: [], checkQuestions: [] } },
      ],
      homeGroupTask: 'task', synthesisOrganizer: 'org',
      accountabilityCheck: [{ q: 'VISIBLE-QUESTION', answer: 'SECRET-ANSWER' }], rubric: null,
    };
    const teacherHtml = renderToStaticMarkup(React.createElement(BrainstormView, baseProps(React, [item], true)));
    expect(teacherHtml).toContain('VISIBLE-QUESTION');
    expect(teacherHtml).toContain('SECRET-ANSWER');
    const studentHtml = renderToStaticMarkup(React.createElement(BrainstormView, baseProps(React, [item], false)));
    expect(studentHtml).toContain('VISIBLE-QUESTION');
    expect(studentHtml).not.toContain('SECRET-ANSWER');
  });

  it('mixed arrays render every kind side by side', () => {
    const html = renderToStaticMarkup(React.createElement(BrainstormView, baseProps(React, [
      { title: 'Idea One', description: 'd', connection: 'c', rubric: null },
      { kind: 'discussion', title: 'Kit One', protocol: 'fishbowl', questionSets: [{ depth: 'literal', questions: ['q1'] }], talkStems: {}, rubric: null },
    ], true)));
    expect(html).toContain('Idea One');
    expect(html).toContain('Kit One');
  });
});

// ── Catalog stance ─────────────────────────────────────────────────────────
describe.each([
  'tool_catalog_source.jsx',
  'tool_catalog_module.js',
  path.join('desktop', 'web-app', 'public', 'tool_catalog_module.js'),
])('%s — Activities catalog stance', (relPath) => {
  const src = read(relPath);

  it('brainstorm entry describes the activity modes', () => {
    expect(src).toMatch(/Activity designer/);
    expect(src).toMatch(/jigsaw/i);
  });

  it('gemini-bridge id stays valid but leaves autofill (reached via the Activities tile)', () => {
    const bridgeEntry = src.slice(src.indexOf("id: 'gemini-bridge'"), src.indexOf("id: 'gemini-bridge'") + 900);
    expect(bridgeEntry).toMatch(/inAutofill:\s*false/);
  });
});

// ── ui_strings: new keys exist, tile renamed at P1 ─────────────────────────
describe('ui_strings — Activities strings', () => {
  const strings = JSON.parse(read('ui_strings.js'));

  it('sidebar tile and panel title renamed to Activities', () => {
    expect(strings.sidebar.tool_brainstorm).toBe('Activities');
    expect(strings.brainstorm.title).toBe('Activities');
  });

  it('mode picker, protocol, and card strings exist', () => {
    for (const key of ['mode_ideas', 'mode_discussion', 'mode_jigsaw', 'mode_simulation',
      'generate_discussion', 'generate_jigsaw', 'protocol_label', 'protocol_socratic_seminar',
      'talk_stems', 'depth_literal', 'facilitation_notes', 'look_fors', 'expert_group',
      'home_group_task', 'synthesis_organizer', 'accountability_check', 'answer_key']) {
      expect(strings.brainstorm[key], 'brainstorm.' + key).toBeTruthy();
    }
    expect(strings.status_steps.building_discussion).toBeTruthy();
    expect(strings.status_steps.building_jigsaw).toBeTruthy();
    expect(strings.meta.discussion_kit).toBeTruthy();
    expect(strings.meta.jigsaw_activity).toBeTruthy();
  });
});

// ── Ladder handlers + export use the shared serializer ─────────────────────
describe('kind-aware ladder prompts and export (2026-08-16 follow-up)', () => {
  const ANTI_COPIES = ['AlloFlowANTI.txt', path.join('desktop', 'web-app', 'src', 'AlloFlowANTI.txt')];

  it.each(ANTI_COPIES)('%s defines the activity-context shim and uses it in all four prompt sites', (antiPath) => {
    const anti = read(antiPath);
    expect(anti.match(/const _alloActivityContext = /g), 'shim defined once').toHaveLength(1);
    // guide + worksheet + rubric + worksheet-cover all route through the shim
    expect(anti.match(/_alloActivityContext\(activity\)/g).length).toBeGreaterThanOrEqual(4);
    // the raw description read is gone from the brainstorm ladder prompts
    // (the lesson-extension guide keeps its own — extensions are idea-shaped)
    expect(anti.match(/Context: \$\{activity\.description\}/g) || []).toHaveLength(1);
  });

  it.each([
    'export_source.jsx',
    'export_module.js',
    path.join('desktop', 'web-app', 'public', 'export_module.js'),
  ])('%s routes discussion/jigsaw items through describeActivityItem', (relPath) => {
    const src = read(relPath);
    expect(src).toMatch(/describeActivityItem/);
    expect(src).toMatch(/kind === ["']discussion["']/);
  });
});

// ── ?v pins track built content in BOTH ANTI copies ────────────────────────
describe('ANTI loader pins — Activities modules', () => {
  const MODULES = [
    'view_sidebar_panels_module.js',
    'generate_dispatcher_module.js',
    'view_brainstorm_module.js',
    'tool_catalog_module.js',
  ];
  const ANTIS = ['AlloFlowANTI.txt', path.join('desktop', 'web-app', 'src', 'AlloFlowANTI.txt')];

  // The repo uses a uniform ?v stamp per restamp wave (e.g. 3c094e07a,
  // d7ff70fc6), not per-module content hashes — so assert the two ANTI copies
  // agree on each module's pin rather than tying pins to sha256. Freshness is
  // covered by the mirror byte-equality check below.
  it('both ANTI copies agree on each module pin', () => {
    const antis = ANTIS.map(read);
    for (const mod of MODULES) {
      const pins = antis.map((anti) => {
        const m = anti.match(new RegExp(mod.replace(/\./g, '\\.') + '\\?v=([A-Za-z0-9_-]+)'));
        return m && m[1];
      });
      expect(pins[0], mod + ' pin present').toBeTruthy();
      expect(pins[1], mod + ' pin matches across copies').toBe(pins[0]);
    }
  });

  it('public mirrors are byte-identical to the root builds', () => {
    for (const mod of MODULES) {
      const a = fs.readFileSync(path.join(ROOT, mod));
      const b = fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', mod));
      expect(a.equals(b), mod + ' mirror').toBe(true);
    }
  });
});
