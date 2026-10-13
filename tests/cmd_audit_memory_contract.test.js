import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as filesystem from 'node:fs';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const HAND_TOOL = 'audit_cmd_hand_sources.cjs';
const MERGE_TOOL = 'merge_cmd_ui_translations.cjs';
const temporaryRoots = [];
const HAND_FILES = [
  'cmd_delta_hand_20260801_part1.cjs',
  'cmd_delta_hand_20260801_part2.cjs',
  'cmd_delta_hand_20260801_part3.cjs',
  'cmd_cancelled_hand_20260801.cjs',
  'cmd_delta_hand_20260802.cjs',
  'palette_delta_hand_20260802.cjs',
  'cmd_delta_hand_20260816_part1.cjs',
  'cmd_delta_hand_20260816_part2.cjs',
  'cmd_delta_hand_20260816_part3.cjs',
  'cmd_delta_hand_20260817_part1.cjs',
  'cmd_delta_hand_20260817_part2.cjs',
  'cmd_delta_hand_20260817_part3.cjs',
  'cmd_delta_hand_20260817b.cjs',
];
const ARRAY_KEYS = [
  'cmd.apply_lesson_template',
  'cmd.apply_lesson_template_done',
  'cmd.apply_lesson_template_hint',
  'cmd.apply_lesson_template_missing',
  'cmd.apply_lesson_template_which',
  'cmd.rebuild_lesson_step',
  'cmd.rebuild_lesson_step_hint',
  'cmd.rebuild_lesson_step_missing',
  'cmd.rebuild_lesson_step_none',
  'cmd.rebuild_lesson_step_which',
  'cmd.run_lesson_blueprint',
  'cmd.run_lesson_blueprint_hint',
];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, 'utf8');
}

function writeJson(file, value) {
  write(file, JSON.stringify(value, null, 2) + '\n');
}

function fixture(tool) {
  const root = mkdtempSync(join(tmpdir(), 'cmd-audit-contract-'));
  temporaryRoots.push(root);
  const tools = join(root, 'dev-tools', 'i18n');
  const lang = join(root, 'lang');
  const mirror = join(root, 'desktop', 'web-app', 'public', 'lang');
  for (const directory of [tools, lang, mirror]) mkdirSync(directory, { recursive: true });
  const script = join(tools, tool);
  copyFileSync(resolve(ROOT, 'dev-tools', 'i18n', tool), script);
  return { root, tools, lang, mirror, script };
}

function packPaths(target, slug = 'alpha') {
  return [join(target.lang, `${slug}.js`), join(target.mirror, `${slug}.js`)];
}

function writePair(target, pack, slug = 'alpha') {
  for (const file of packPaths(target, slug)) writeJson(file, pack);
}

function snapshot(target, slugs = ['alpha']) {
  return slugs.flatMap((slug) => packPaths(target, slug))
    .map((file) => [file, readFileSync(file, 'utf8')]);
}

function expectUnchanged(before) {
  for (const [file, text] of before) expect(readFileSync(file, 'utf8'), file).toBe(text);
}

function run(target, args = []) {
  const reviewArgs = target.reviewFile ? [`--review-file=${target.reviewFile}`] : [];
  const result = spawnSync(process.execPath, [target.script, ...args, ...reviewArgs], {
    cwd: target.root,
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  });
  expect(result.error, result.stderr).toBeUndefined();
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runWithFilesystem(target, overrides) {
  const localRequire = createRequire(target.script);
  const stdout = [];
  const stderr = [];
  let status = 0;
  const exit = {};
  const context = vm.createContext({
    __dirname: dirname(target.script),
    require: (name) => name === 'node:fs' ? { ...filesystem, ...overrides } : localRequire(name),
    process: {
      argv: [process.execPath, target.script, '--apply', '--json', ...(target.reviewFile ? [`--review-file=${target.reviewFile}`] : [])],
      pid: process.pid,
      exit(code) { status = code; throw exit; },
    },
    console: {
      log: (...values) => stdout.push(values.join(' ')),
      error: (...values) => stderr.push(values.join(' ')),
    },
  });
  try {
    vm.runInContext(readFileSync(target.script, 'utf8'), context, { filename: target.script, timeout: 5000 });
  } catch (error) {
    if (error !== exit) throw error;
  }
  return { status, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}

function handFixture(mixed = false) {
  const target = fixture(HAND_TOOL);
  for (const file of HAND_FILES) write(join(target.tools, file), 'module.exports = {};\n');
  const english = Object.fromEntries(ARRAY_KEYS.map((key, index) => [key, `English ${index}`]));
  Object.assign(english, {
    'cmd.cancelled': 'Cancelled',
    'cmd.cancel': 'Cancel',
    'cmd.retry': 'Retry',
    'palette.unavailable': 'Unavailable',
  });
  const row = ARRAY_KEYS.map((_, index) => `Translated ${index}`);
  const pack = {
    cmd: Object.fromEntries(ARRAY_KEYS.map((key, index) => [key.slice('cmd.'.length), row[index]])),
    palette: { unavailable: 'Translated unavailable' },
    unrelated: { nested: { preserve: 'Unreviewed value' }, array: ['Keep', 4] },
  };
  Object.assign(pack.cmd, { cancelled: 'Translated cancelled', cancel: 'Translated cancel', retry: 'Translated retry' });
  if (mixed) {
    pack.cmd.apply_lesson_template = english[ARRAY_KEYS[0]];
    pack.cmd.apply_lesson_template_done = 'Newer translation';
    row[2] = '';
    row[3] = english[ARRAY_KEYS[3]];
    pack.cmd.apply_lesson_template_missing = row[3];
    english[ARRAY_KEYS[4]] = 'Choose {name}';
    row[4] = 'Translated without a token';
    delete pack.cmd.rebuild_lesson_step;
    delete english[ARRAY_KEYS[6]];
  }
  writeJson(join(target.tools, 'cmd_keys_en.json'), english);
  write(join(target.tools, HAND_FILES[0]), `module.exports = ${JSON.stringify({ alpha: row })};\n`);
  write(join(target.tools, 'cmd_cancelled_hand_20260801.cjs'), 'module.exports = { alpha: "Translated cancelled" };\n');
  write(join(target.tools, 'cmd_delta_hand_20260802.cjs'), 'module.exports = { alpha: { cancel: "Translated cancel", retry: "Translated retry" } };\n');
  write(join(target.tools, 'palette_delta_hand_20260802.cjs'), 'module.exports = { alpha: { unavailable: "Translated unavailable" } };\n');
  writePair(target, pack);
  writePair(target, { unrelated: { value: 'No reviewed records in this language' } }, 'unused');
  return target;
}

function mergeFixture() {
  const target = fixture(MERGE_TOOL);
  const english = {
    'cmd.unique': 'Save',
    'cmd.ambiguous': 'Open',
    'cmd.read_this_page_of': 'Read this page of',
    'cmd.allowed_key': 'Help',
    'cmd.allowed_value': 'OK',
    'palette.ctx.menu': 'Context menu',
    'cmd.bad_placeholder': 'Count {count}',
    'cmd.good_placeholder': '<b>Count {count}</b>',
    'cmd.keep': 'Keep',
    'cmd.whitespace': 'Space',
    'cmd.no_candidate': 'Unknown',
    'cmd.english_candidate': 'English only',
    'cmd.invalid_candidate': 'Invalid',
    'cmd.number': 10,
    'cmd.blank': '',
  };
  const ui = {
    common: { save: 'Save', open: 'Open', help: 'Help', ok: 'OK', count: 'Count {count}' },
    other: { save: 'Save', open: 'Open' },
    read: { page: 'Read this page of' },
    markup: { count: '<b>Count {count}</b>' },
    spacing: { label: ' Space' },
    untouched: { keep: 'Keep', english: 'English only', invalid: 'Invalid', array: ['Save'] },
  };
  const pack = {
    cmd: Object.fromEntries(Object.entries(english).filter(([key]) => key.startsWith('cmd.'))
      .map(([key, value]) => [key.slice('cmd.'.length), value])),
    palette: { ctx: { menu: 'Context menu' } },
    common: { save: 'Translated save', open: 'Translated open A', help: 'Translated help', ok: 'Translated OK', count: 'Translated count' },
    other: { save: 'Translated save', open: 'Translated open B' },
    read: { page: 'Translated read this page of' },
    markup: { count: '<b>Translated {count}</b>' },
    spacing: { label: 'Translated space' },
    untouched: { keep: 'Newer keep translation', english: 'English only', invalid: { not: 'a string' }, array: ['Do not index arrays'] },
    extra: { nested: { keep: 'Preserve this value' }, number: 7, nullable: null },
  };
  pack.cmd.keep = 'Existing command translation';
  writeJson(join(target.root, 'ui_strings.js'), ui);
  writeJson(join(target.tools, 'cmd_keys_en.json'), english);
  writeJson(join(target.tools, 'cmd_value_identical_allowlist.json'), { keys: ['cmd.allowed_key'], values: ['OK'] });
  writePair(target, pack);
  return { ...target, pack };
}

function approvals(slug = 'alpha') {
  return [
    { slug, targetKey: 'cmd.unique', sourceKey: 'common.save', english: 'Save', translation: 'Translated save' },
    { slug, targetKey: 'cmd.good_placeholder', sourceKey: 'markup.count', english: '<b>Count {count}</b>', translation: '<b>Translated {count}</b>' },
  ];
}

function setReview(target, entries = approvals()) {
  target.reviewFile = join(target.root, 'reuse-review.json');
  writeJson(target.reviewFile, { version: 1, approvals: entries });
  return target;
}

function reviewedFixture() {
  return setReview(mergeFixture());
}

function expectRejectedReview(target) {
  const before = snapshot(target);
  const result = run(target, ['--apply', '--gate', '--json']);
  expect(result.status, result.stderr).toBe(1);
  expect(JSON.parse(result.stdout).errors.length).toBeGreaterThan(0);
  expectUnchanged(before);
  expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
}

describe('reviewed hand audit retains category and read-only contracts', () => {
  it('reports every category in source order and fails the gate without changing packs', () => {
    const target = handFixture(true);
    const before = snapshot(target, ['alpha', 'unused']);
    const result = run(target, ['--gate', '--json']);
    expect(result.status, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ sourceCount: 7, languageCount: 2, expectedLanguageCount: 63, sourceRecords: 16 });
    expect(report.summary).toEqual({
      errors: 0, missingPacks: 1, invalidSource: 2, englishPayload: 1,
      placeholderMismatch: 1, duplicateConflicts: 0, recoverable: 1, superseded: 1,
    });
    expect(report.invalidSource.map(({ key, reason }) => [key, reason])).toEqual([
      [ARRAY_KEYS[2], 'blank or non-string'],
      [ARRAY_KEYS[6], 'key missing from cmd_keys_en.json'],
    ]);
    expect(report.recoverable[0]).toMatchObject({ source: 'cmd-delta-20260801', slug: 'alpha', key: ARRAY_KEYS[0], value: 'Translated 0', english: 'English 0' });
    expect(report.superseded[0]).toMatchObject({ key: ARRAY_KEYS[1], current: 'Newer translation' });
    expect(report.missingPacks.map(({ key }) => key)).toEqual([ARRAY_KEYS[5]]);
    expect(report.englishPayload.map(({ key }) => key)).toEqual([ARRAY_KEYS[3]]);
    expect(report.placeholderMismatch.map(({ key }) => key)).toEqual([ARRAY_KEYS[4]]);
    expect(report.sourceStats['cmd-delta-20260801']).toMatchObject({ languageCount: 1, records: 12 });
    expect(report.sourceStats['cmd-delta-20260802']).toMatchObject({ languageCount: 1, records: 2 });
    expect(JSON.parse(readFileSync(join(target.tools, 'cmd_hand_source_audit', '_summary.json'), 'utf8'))).toEqual(report);
    expectUnchanged(before);
  });

  it('passes a clean gate and keeps superseded translations informational', () => {
    const target = handFixture();
    const [file] = packPaths(target);
    const pack = JSON.parse(readFileSync(file, 'utf8'));
    pack.cmd.cancel = 'A newer reviewed translation';
    writePair(target, pack);
    const before = snapshot(target, ['alpha', 'unused']);
    const result = run(target, ['--gate', '--json']);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.summary).toEqual({
      errors: 0, missingPacks: 0, invalidSource: 0, englishPayload: 0,
      placeholderMismatch: 0, duplicateConflicts: 0, recoverable: 0, superseded: 1,
    });
    expect(report.superseded[0]).toMatchObject({ source: 'cmd-delta-20260802', key: 'cmd.cancel', current: 'A newer reviewed translation' });
    expectUnchanged(before);
  });

  it('still parses and rejects a malformed pack that has no reviewed source records', () => {
    const target = handFixture();
    write(join(target.lang, 'unused.js'), '{ malformed json');
    const result = run(target, ['--gate', '--json']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/SyntaxError|JSON/);
    expect(existsSync(join(target.tools, 'cmd_hand_source_audit', '_summary.json'))).toBe(false);
  });

  it('refuses unknown source languages and malformed positional source arrays', () => {
    const target = handFixture();
    write(join(target.tools, HAND_FILES[0]), 'module.exports = { alpha: ["short"], unknown: [] };\n');
    const result = run(target, ['--gate', '--json']);
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.errors).toEqual([
      'cmd-delta-20260801/alpha: expected 12 array slots',
      'cmd-delta-20260801: unknown language slug unknown',
    ]);
    expect(report.sourceRecords).toBe(4);
  });
});

describe('command UI reuse remains conservative and bounded by pack', () => {
  it('reports only unique exact, placeholder-safe candidates and leaves source bytes unchanged', () => {
    const target = mergeFixture();
    const before = snapshot(target);
    const result = run(target, ['--gate', '--json']);
    expect(result.status, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      apply: false, languageCount: 1, canonicalKeyCount: 15,
      selectedKeyCount: 15, scope: { fullAudit: true, language: null, keys: null },
      totalIdentities: 9, totalRecoverable: 2, totalAmbiguous: 1,
      totalApproved: 0, totalUnreviewed: 2,
      totalContextSkipped: 1, totalWritten: 0,
      contextSensitiveKeys: ['cmd.read_this_page_of'],
    });
    expect(report.perPack.alpha).toEqual({
      recoverable: 2, approved: 0, unreviewed: 2, ambiguous: 1, contextSkipped: 1,
      recoverableKeys: ['cmd.unique', 'cmd.good_placeholder'],
      recoverableEntries: [
        { key: 'cmd.unique', english: 'Save', value: 'Translated save', sourceKeys: ['common.save', 'other.save'], approved: false },
        { key: 'cmd.good_placeholder', english: '<b>Count {count}</b>', value: '<b>Translated {count}</b>', sourceKeys: ['markup.count'], approved: false },
      ],
      ambiguousKeys: [{ key: 'cmd.ambiguous', candidates: ['Translated open A', 'Translated open B'] }],
    });
    expect(JSON.parse(readFileSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'), 'utf8'))).toEqual(report);
    expectUnchanged(before);
  });

  it('applies just those recoveries, preserving unrelated and existing translated values in both mirrors', () => {
    const target = reviewedFixture();
    const result = run(target, ['--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ apply: true, totalRecoverable: 2, totalApproved: 2, totalUnreviewed: 0, totalWritten: 2 });
    expect(report.perPack.alpha.recoverableEntries.every(({ approved }) => approved)).toBe(true);
    const expected = structuredClone(target.pack);
    expected.cmd.unique = 'Translated save';
    expected.cmd.good_placeholder = '<b>Translated {count}</b>';
    const [root, mirror] = packPaths(target);
    expect(JSON.parse(readFileSync(root, 'utf8'))).toEqual(expected);
    expect(readFileSync(root, 'utf8')).toBe(readFileSync(mirror, 'utf8'));
    const after = snapshot(target);
    const second = run(target, ['--apply', '--gate', '--json']);
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout)).toMatchObject({ totalRecoverable: 0, totalWritten: 0 });
    expectUnchanged(after);
  });

  it('refuses mirror drift in a later pack before applying an earlier pack', () => {
    const target = reviewedFixture();
    writePair(target, target.pack, 'zeta');
    writeJson(join(target.mirror, 'zeta.js'), { ...target.pack, extra: 'Concurrent content' });
    const before = snapshot(target, ['alpha', 'zeta']);
    const result = run(target, ['--apply', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ errors: ['zeta: root/public mirror drift; refusing to overwrite it'] });
    expectUnchanged(before);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
  });

  it('refuses a missing deployed pack before applying any recovery', () => {
    const target = reviewedFixture();
    writeJson(join(target.lang, 'zeta.js'), target.pack);
    const before = snapshot(target);
    const result = run(target, ['--apply', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ errors: ['zeta: root or deployed pack is missing'] });
    expectUnchanged(before);
    expect(existsSync(join(target.mirror, 'zeta.js'))).toBe(false);
  });

  it('keeps selected-language scope and validates unknown slugs', () => {
    const target = reviewedFixture();
    writePair(target, target.pack, 'zeta');
    const zetaBefore = snapshot(target, ['zeta']);
    const selected = run(target, ['--apply', '--lang=alpha', '--json']);
    expect(selected.status).toBe(0);
    expect(JSON.parse(selected.stdout)).toMatchObject({
      languageCount: 1, selectedKeyCount: 15, totalWritten: 2,
      scope: { fullAudit: false, language: 'alpha', keys: null },
    });
    expect(JSON.parse(readFileSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'), 'utf8')))
      .toEqual(JSON.parse(selected.stdout));
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
    expectUnchanged(zetaBefore);
    const unknown = run(target, ['--lang=missing', '--apply']);
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toContain('Unknown language slug: missing');
    expectUnchanged(zetaBefore);
  });

  it('rejects byte-level mirror drift even when both packs parse to the same object', () => {
    const target = reviewedFixture();
    write(join(target.mirror, 'alpha.js'), JSON.stringify(target.pack));
    const before = snapshot(target);
    const result = run(target, ['--apply', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).errors).toEqual(['alpha: root/public mirror drift; refusing to overwrite it']);
    expectUnchanged(before);
  });

  it('preserves edits made after planning even when root and public remain identical', () => {
    const target = reviewedFixture();
    const [root, mirror] = packPaths(target);
    let rootReads = 0;
    const concurrent = structuredClone(target.pack);
    concurrent.extra.nested.keep = 'Edited after planning';
    const result = runWithFilesystem(target, {
      readFileSync(file, ...args) {
        if (file === root && ++rootReads === 2) writePair(target, concurrent);
        return readFileSync(file, ...args);
      },
    });
    expect(rootReads).toBe(2);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ errors: ['alpha: pack changed after planning; refusing to overwrite it'] });
    expect(JSON.parse(readFileSync(root, 'utf8'))).toEqual(concurrent);
    expect(readFileSync(root, 'utf8')).toBe(readFileSync(mirror, 'utf8'));
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
  });

  it('stops before overwriting a later concurrent edit and reports the earlier completed writes', () => {
    const target = reviewedFixture();
    writePair(target, target.pack, 'zeta');
    setReview(target, [...approvals(), ...approvals('zeta')]);
    const [alphaRoot, alphaMirror] = packPaths(target);
    const [zetaRoot, zetaMirror] = packPaths(target, 'zeta');
    const concurrent = structuredClone(target.pack);
    concurrent.extra.nested.keep = 'Edited while the first pack was written';
    let changed = false;
    const result = runWithFilesystem(target, {
      renameSync(from, to) {
        filesystem.renameSync(from, to);
        if (to === alphaMirror) {
          changed = true;
          writePair(target, concurrent, 'zeta');
        }
      },
    });
    expect(changed).toBe(true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('zeta: pack changed before writing; stopped after 2 value(s) written.');
    const applied = structuredClone(target.pack);
    applied.cmd.unique = 'Translated save';
    applied.cmd.good_placeholder = '<b>Translated {count}</b>';
    expect(JSON.parse(readFileSync(alphaRoot, 'utf8'))).toEqual(applied);
    expect(readFileSync(alphaRoot, 'utf8')).toBe(readFileSync(alphaMirror, 'utf8'));
    expect(JSON.parse(readFileSync(zetaRoot, 'utf8'))).toEqual(concurrent);
    expect(readFileSync(zetaRoot, 'utf8')).toBe(readFileSync(zetaMirror, 'utf8'));
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
  });
});

describe('command UI reuse supports exact, explicit key review batches', () => {
  it('reports a narrow read-only scope without overwriting the full audit report', () => {
    const target = mergeFixture();
    const before = snapshot(target);
    const full = run(target, ['--gate', '--json']);
    expect(full.status).toBe(1);
    const fullReport = join(target.tools, 'cmd_ui_reuse', '_summary.json');
    const fullText = readFileSync(fullReport, 'utf8');
    const result = run(target, ['--key=cmd.unique', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      canonicalKeyCount: 15, selectedKeyCount: 1, languageCount: 1,
      scope: { fullAudit: false, language: null, keys: ['cmd.unique'] },
      totalIdentities: 1, totalRecoverable: 1, totalApproved: 0,
      totalUnreviewed: 1, totalAmbiguous: 0, totalContextSkipped: 0, totalWritten: 0,
    });
    expect(report.perPack.alpha.recoverableKeys).toEqual(['cmd.unique']);
    expect(JSON.parse(readFileSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'), 'utf8'))).toEqual(report);
    expect(readFileSync(fullReport, 'utf8')).toBe(fullText);
    expectUnchanged(before);
  });

  it('applies only the selected reviewed key and keeps the subsequent full gate red', () => {
    const target = reviewedFixture();
    expect(run(target, ['--gate', '--json']).status).toBe(1);
    const fullReport = join(target.tools, 'cmd_ui_reuse', '_summary.json');
    const fullText = readFileSync(fullReport, 'utf8');
    const result = run(target, ['--key=cmd.unique', '--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      selectedKeyCount: 1, totalRecoverable: 1, totalApproved: 1, totalUnreviewed: 0, totalWritten: 1,
      scope: { fullAudit: false, language: null, keys: ['cmd.unique'] },
    });
    const expected = structuredClone(target.pack);
    expected.cmd.unique = 'Translated save';
    const [root, mirror] = packPaths(target);
    expect(JSON.parse(readFileSync(root, 'utf8'))).toEqual(expected);
    expect(readFileSync(root, 'utf8')).toBe(readFileSync(mirror, 'utf8'));
    expect(readFileSync(fullReport, 'utf8')).toBe(fullText);
    const after = snapshot(target);
    const full = run(target, ['--gate', '--json']);
    expect(full.status, full.stderr).toBe(1);
    expect(JSON.parse(full.stdout)).toMatchObject({
      selectedKeyCount: 15, totalRecoverable: 1, totalWritten: 0,
      scope: { fullAudit: true, language: null, keys: null },
    });
    expect(JSON.parse(full.stdout).perPack.alpha.recoverableKeys).toEqual(['cmd.good_placeholder']);
    expectUnchanged(after);
  });

  it('deduplicates repeated keys and uses canonical order rather than argument order', () => {
    const target = mergeFixture();
    const before = snapshot(target);
    const result = run(target, [
      '--key=cmd.good_placeholder', '--key=cmd.unique', '--key=cmd.good_placeholder', '--json',
    ]);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      selectedKeyCount: 2, totalRecoverable: 2,
      scope: { fullAudit: false, language: null, keys: ['cmd.unique', 'cmd.good_placeholder'] },
    });
    expect(report.perPack.alpha.recoverableKeys).toEqual(['cmd.unique', 'cmd.good_placeholder']);
    expectUnchanged(before);
  });

  it('combines exact keys and a language without touching other languages or the full report', () => {
    const target = reviewedFixture();
    writePair(target, target.pack, 'zeta');
    setReview(target, [...approvals(), ...approvals('zeta')]);
    expect(run(target, ['--gate', '--json']).status).toBe(1);
    const fullReport = join(target.tools, 'cmd_ui_reuse', '_summary.json');
    const fullText = readFileSync(fullReport, 'utf8');
    const zetaBefore = snapshot(target, ['zeta']);
    const result = run(target, ['--lang=alpha', '--key=cmd.unique', '--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      languageCount: 1, selectedKeyCount: 1, totalWritten: 1,
      scope: { fullAudit: false, language: 'alpha', keys: ['cmd.unique'] },
    });
    expect(Object.keys(report.perPack)).toEqual(['alpha']);
    expect(JSON.parse(readFileSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'), 'utf8'))).toEqual(report);
    expect(readFileSync(fullReport, 'utf8')).toBe(fullText);
    expectUnchanged(zetaBefore);
  });

  it.each([
    ['empty', ['--key=']],
    ['blank', ['--key=   ']],
    ['unknown', ['--key=cmd.unknown']],
    ['partial', ['--key=cmd.uni']],
    ['wildcard', ['--key=cmd.*']],
    ['padded', ['--key= cmd.unique']],
    ['mixed valid and unknown', ['--key=cmd.unique', '--key=cmd.unknown']],
  ])('rejects %s key selection before any pack or report writes', (_, args) => {
    const target = reviewedFixture();
    const before = snapshot(target);
    const result = run(target, [...args, '--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toMatch(/key/i);
    expectUnchanged(before);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'))).toBe(false);
  });

  it.each(['', '   '])('rejects a blank language selection instead of silently selecting every pack', (value) => {
    const target = reviewedFixture();
    const before = snapshot(target);
    const result = run(target, [`--lang=${value}`, '--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toMatch(/language|slug/i);
    expectUnchanged(before);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'))).toBe(false);
  });

  it('does not validate unrelated pack values when a valid review batch selects another key', () => {
    const target = reviewedFixture();
    const pack = structuredClone(target.pack);
    pack.cmd.good_placeholder = '<b>A newer command translation {count}</b>';
    pack.markup.count = '<b>A newer source translation {count}</b>';
    writePair(target, pack);
    const result = run(target, ['--key=cmd.unique', '--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ totalApproved: 1, totalWritten: 1 });
    const expected = structuredClone(pack);
    expected.cmd.unique = 'Translated save';
    const [root, mirror] = packPaths(target);
    expect(JSON.parse(readFileSync(root, 'utf8'))).toEqual(expected);
    expect(readFileSync(root, 'utf8')).toBe(readFileSync(mirror, 'utf8'));
  });

  it.each([
    ['English', (entries) => { entries[1].english = 'Changed English'; }],
    ['schema', (entries) => { delete entries[1].translation; }],
  ])('keeps %s approval validation global even for an unselected key', (_, change) => {
    const target = mergeFixture();
    const entries = approvals();
    change(entries);
    setReview(target, entries);
    const before = snapshot(target);
    const result = run(target, ['--key=cmd.unique', '--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(1);
    expect(JSON.parse(result.stdout).errors.length).toBeGreaterThan(0);
    expectUnchanged(before);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'))).toBe(false);
  });
});

describe('command UI reuse requires current, explicit approvals', () => {
  it('refuses apply without a review file rather than treating exact English as approval', () => {
    expectRejectedReview(mergeFixture());
  });

  it('applies only an approved subset and keeps the gate red for unreviewed recoveries', () => {
    const target = setReview(mergeFixture(), approvals().slice(0, 1));
    const result = run(target, ['--apply', '--gate', '--json']);
    expect(result.status, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ totalRecoverable: 2, totalApproved: 1, totalUnreviewed: 1, totalWritten: 1 });
    expect(report.perPack.alpha).toMatchObject({ approved: 1, unreviewed: 1 });
    expect(report.perPack.alpha.recoverableEntries.map(({ key, approved }) => [key, approved])).toEqual([
      ['cmd.unique', true], ['cmd.good_placeholder', false],
    ]);
    const expected = structuredClone(target.pack);
    expected.cmd.unique = 'Translated save';
    const [root, mirror] = packPaths(target);
    expect(JSON.parse(readFileSync(root, 'utf8'))).toEqual(expected);
    expect(readFileSync(root, 'utf8')).toBe(readFileSync(mirror, 'utf8'));
    const after = snapshot(target);
    const second = run(target, ['--apply', '--gate', '--json']);
    expect(second.status).toBe(1);
    expect(JSON.parse(second.stdout)).toMatchObject({ totalRecoverable: 1, totalApproved: 0, totalUnreviewed: 1, totalWritten: 0 });
    expectUnchanged(after);
  });

  it('reports an empty review as unapproved, without writing any pack or passing the gate', () => {
    const target = setReview(mergeFixture(), []);
    const before = snapshot(target);
    const result = run(target, ['--apply', '--gate', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ totalApproved: 0, totalUnreviewed: 2, totalWritten: 0 });
    expectUnchanged(before);
  });

  it('does not write approved candidates unless apply is explicitly requested', () => {
    const target = reviewedFixture();
    const before = snapshot(target);
    const result = run(target, ['--gate', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ totalApproved: 2, totalUnreviewed: 0, totalWritten: 0 });
    expectUnchanged(before);
  });

  it('does not let approvals override ambiguity or context-sensitive exclusions', () => {
    const target = setReview(mergeFixture(), [
      { slug: 'alpha', targetKey: 'cmd.ambiguous', sourceKey: 'common.open', english: 'Open', translation: 'Translated open A' },
      { slug: 'alpha', targetKey: 'cmd.read_this_page_of', sourceKey: 'read.page', english: 'Read this page of', translation: 'Translated read this page of' },
    ]);
    const before = snapshot(target);
    const result = run(target, ['--apply', '--gate', '--json']);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ totalApproved: 0, totalUnreviewed: 2, totalAmbiguous: 1, totalContextSkipped: 1, totalWritten: 0 });
    expectUnchanged(before);
  });

  it.each([
    ['source English', (target) => {
      const file = join(target.root, 'ui_strings.js');
      const ui = JSON.parse(readFileSync(file, 'utf8'));
      ui.common.save = 'Store';
      writeJson(file, ui);
    }],
    ['command English', (target) => {
      const file = join(target.tools, 'cmd_keys_en.json');
      const english = JSON.parse(readFileSync(file, 'utf8'));
      english['cmd.unique'] = 'Store';
      writeJson(file, english);
    }],
    ['source translation', (target) => {
      const pack = structuredClone(target.pack);
      pack.common.save = 'A newer source translation';
      writePair(target, pack);
    }],
    ['reviewed translation', (target) => {
      const entries = approvals();
      entries[0].translation = 'An older approved translation';
      setReview(target, entries);
    }],
    ['current command translation', (target) => {
      const pack = structuredClone(target.pack);
      pack.cmd.unique = 'An independently improved command translation';
      writePair(target, pack);
    }],
    ['exact English whitespace', (target) => {
      const entries = approvals();
      entries[0].english += ' ';
      setReview(target, entries);
    }],
  ])('refuses stale %s approvals before applying another valid recovery', (_, change) => {
    const target = reviewedFixture();
    change(target);
    expectRejectedReview(target);
  });

  it.each([
    ['language', { slug: 'unknown' }],
    ['target key', { targetKey: 'cmd.unknown' }],
    ['source key', { sourceKey: 'common.unknown' }],
  ])('refuses an unknown %s in an approval', (_, changes) => {
    const entries = approvals();
    Object.assign(entries[0], changes);
    expectRejectedReview(setReview(mergeFixture(), entries));
  });

  it('refuses duplicate language/target pairs even when they choose equivalent source keys', () => {
    const entries = approvals();
    entries.push({ ...entries[0], sourceKey: 'other.save' });
    expectRejectedReview(setReview(mergeFixture(), entries));
  });

  it.each([
    ['wrong version', { version: 2, approvals: [] }],
    ['missing version', { approvals: [] }],
    ['missing approvals', { version: 1 }],
    ['non-array approvals', { version: 1, approvals: {} }],
    ['null approval', { version: 1, approvals: [null] }],
    ['array approval', { version: 1, approvals: [[]] }],
    ['missing field', { version: 1, approvals: [{ slug: 'alpha', targetKey: 'cmd.unique', sourceKey: 'common.save', english: 'Save' }] }],
    ['non-string field', { version: 1, approvals: [{ ...approvals()[0], translation: 7 }] }],
    ['blank field', { version: 1, approvals: [{ ...approvals()[0], english: '   ' }] }],
  ])('rejects a malformed review document with %s', (_, document) => {
    const target = reviewedFixture();
    writeJson(target.reviewFile, document);
    expectRejectedReview(target);
  });

  it('rejects malformed review JSON and a missing review file before writes', () => {
    const malformed = reviewedFixture();
    write(malformed.reviewFile, '{ malformed review');
    expectRejectedReview(malformed);
    const missing = mergeFixture();
    missing.reviewFile = join(missing.root, 'missing-review.json');
    expectRejectedReview(missing);
  });

  it('rejects an approved source with an unsafe placeholder contract', () => {
    const target = setReview(mergeFixture(), [
      ...approvals(),
      { slug: 'alpha', targetKey: 'cmd.bad_placeholder', sourceKey: 'common.count', english: 'Count {count}', translation: 'Translated count' },
    ]);
    expectRejectedReview(target);
  });

  it('rejects an English passthrough source instead of accepting it as a translation', () => {
    const target = setReview(mergeFixture(), [
      ...approvals(),
      { slug: 'alpha', targetKey: 'cmd.english_candidate', sourceKey: 'untouched.english', english: 'English only', translation: 'English only' },
    ]);
    expectRejectedReview(target);
  });

  it('excludes whitespace-padded English from translation candidates', () => {
    const target = mergeFixture();
    const pack = structuredClone(target.pack);
    pack.common.save = ' Save ';
    pack.other.save = ' Save ';
    writePair(target, pack);
    const before = snapshot(target);
    const result = run(target, ['--gate', '--json']);
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ totalIdentities: 9, totalRecoverable: 1, totalApproved: 0, totalUnreviewed: 1 });
    expect(report.perPack.alpha.recoverableKeys).toEqual(['cmd.good_placeholder']);
    expectUnchanged(before);
  });

  it('rejects an approval for whitespace-padded English before writing another valid recovery', () => {
    const entries = approvals();
    entries[0].translation = ' Save ';
    const target = setReview(mergeFixture(), entries);
    const pack = structuredClone(target.pack);
    pack.common.save = ' Save ';
    pack.other.save = ' Save ';
    writePair(target, pack);
    expectRejectedReview(target);
  });

  it.each(['English catalog', 'UI source', 'allowlist', 'review document'])('refuses a changed %s input before the first write', (input) => {
    const target = reviewedFixture();
    const files = {
      'English catalog': join(target.tools, 'cmd_keys_en.json'),
      'UI source': join(target.root, 'ui_strings.js'),
      allowlist: join(target.tools, 'cmd_value_identical_allowlist.json'),
      'review document': target.reviewFile,
    };
    const file = files[input];
    let reads = 0;
    const before = snapshot(target);
    const result = runWithFilesystem(target, {
      readFileSync(candidate, ...args) {
        if (candidate === file && ++reads === 2) write(file, readFileSync(file, 'utf8') + '\n');
        return readFileSync(candidate, ...args);
      },
    });
    expect(reads).toBe(2);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).errors.some((error) => error.includes('review input changed after planning'))).toBe(true);
    expectUnchanged(before);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
  });

  it.each(['English catalog', 'UI source', 'allowlist', 'review document'])('stops before a later pack if the %s changes while an earlier pack is written', (input) => {
    const target = reviewedFixture();
    writePair(target, target.pack, 'zeta');
    setReview(target, [...approvals(), ...approvals('zeta')]);
    const files = {
      'English catalog': join(target.tools, 'cmd_keys_en.json'),
      'UI source': join(target.root, 'ui_strings.js'),
      allowlist: join(target.tools, 'cmd_value_identical_allowlist.json'),
      'review document': target.reviewFile,
    };
    const file = files[input];
    const [alphaRoot, alphaMirror] = packPaths(target);
    const zetaBefore = snapshot(target, ['zeta']);
    let changed = false;
    const result = runWithFilesystem(target, {
      renameSync(from, to) {
        filesystem.renameSync(from, to);
        if (to === alphaMirror) {
          changed = true;
          write(file, readFileSync(file, 'utf8') + '\n');
        }
      },
    });
    expect(changed).toBe(true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('review input changed');
    expect(result.stderr).toContain('stopped after 2 value(s) written.');
    const expected = structuredClone(target.pack);
    expected.cmd.unique = 'Translated save';
    expected.cmd.good_placeholder = '<b>Translated {count}</b>';
    expect(JSON.parse(readFileSync(alphaRoot, 'utf8'))).toEqual(expected);
    expect(readFileSync(alphaRoot, 'utf8')).toBe(readFileSync(alphaMirror, 'utf8'));
    expectUnchanged(zetaBefore);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.json'))).toBe(false);
    expect(existsSync(join(target.tools, 'cmd_ui_reuse', '_summary.scoped.json'))).toBe(false);
  });
});
