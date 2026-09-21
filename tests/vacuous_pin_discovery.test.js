// Source DISCOVERY in dev-tools/find_vacuous_pins.cjs.
//
// The tool can only check a suite whose source files it can find, and it names
// what it cannot as "skipped" -- a word that reads as benign but actually means
// "this suite got no vacuity coverage at all". Three shapes were invisible:
//
//   1. readFileSync(resolve(process.cwd(), 'a.jsx'))  -- the repo's MOST COMMON
//      idiom. The old pattern skipped resolve()'s leading args with `[^)]*?`,
//      and that character class cannot cross the ')' in `process.cwd()`.
//   2. const TOOL = resolve(...); readFileSync(TOOL)  -- path hoisted to a const.
//   3. a suite that reads nothing itself and loads the code under test through
//      tests/helpers/*.js. All 25 Arc City suites were invisible this way, and
//      1,112 test files import a local helper.
//
// Measured against the real tool over all 4,031 suites: discovery went from 609
// to 1,254. Six suites moved from "planned" to "refusing to mutate dirty
// file(s)" -- not a loss: the new discovery finds MORE of their real sources and
// the safety rule then correctly declines. qr_student_shell is the clearest
// case: the old version would have gutted index.html, ai_backend_module.js and
// package.json while MISSING AlloFlowANTI.txt, the file the suite actually pins.
// It was gutting the wrong files and would have reported a false "ok".
//
// These fixtures are written into a temp folder under the repo (the tool
// resolves relative to ROOT) and removed afterwards, so nothing real is touched.
// --dry is used throughout: discovery is what is under test, not mutation.

import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const TOOL = path.join(ROOT, 'dev-tools', 'find_vacuous_pins.cjs');

const STAMP = `discovery_fixture_${Date.now()}`;
const DIR = path.join(ROOT, 'tests', STAMP);
const SRC_REL = `tests/${STAMP}/fixture_source.js`;
const HELPER_REL = `tests/${STAMP}/fixture_helper.js`;

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(ROOT, SRC_REL), 'export const MARKER = 1;\n');
// A helper that reads the source on a suite's behalf -- the harness shape.
fs.writeFileSync(path.join(ROOT, HELPER_REL), [
  "import { readFileSync } from 'node:fs';",
  "import { resolve } from 'node:path';",
  `export const load = () => readFileSync(resolve(process.cwd(), '${SRC_REL}'), 'utf8');`,
  '',
].join('\n'));

afterAll(() => { fs.rmSync(DIR, { recursive: true, force: true }); });

function writeSuite(name, body) {
  const rel = `tests/${STAMP}/${name}`;
  fs.writeFileSync(path.join(ROOT, rel), body);
  return rel;
}

function dryRun(rel) {
  try {
    return execFileSync(process.execPath, [TOOL, '--dry', rel], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    return String(e.stdout || '') + String(e.stderr || '');
  }
}

// Explicit timeouts below: every test here shells out to the tool, which
// walks ~4,300 test files. On vitest's 5 s default they pass alone and fail
// when another suite that also scans tests/ runs in parallel — an
// intermittent red that reads as a logic bug and is not one.
describe('find_vacuous_pins - source discovery', () => {
  it('finds a bare literal (the shape that always worked)', () => {
    const rel = writeSuite('bare.test.js', [
      "import { readFileSync } from 'node:fs';",
      `const s = readFileSync('${SRC_REL}', 'utf8');`,
      "it('x', () => { expect(s).toContain('MARKER'); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toContain(SRC_REL);
  }, 120000);

  it('finds resolve(process.cwd(), ...) - the repo\'s most common idiom', () => {
    const rel = writeSuite('cwd.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { resolve } from 'node:path';",
      `const s = readFileSync(resolve(process.cwd(), '${SRC_REL}'), 'utf8');`,
      "it('x', () => { expect(s).toContain('MARKER'); });",
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out, 'resolve(process.cwd(), ...) must be discovered').toContain(SRC_REL);
    expect(out).not.toMatch(/reads no source file directly/);
  }, 120000);

  it('finds a path hoisted into a const', () => {
    const rel = writeSuite('const.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { resolve } from 'node:path';",
      `const TARGET = resolve(process.cwd(), '${SRC_REL}');`,
      "const s = readFileSync(TARGET, 'utf8');",
      "it('x', () => { expect(s).toContain('MARKER'); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toContain(SRC_REL);
  }, 120000);

  it('follows a local helper that does the reading (the harness shape)', () => {
    const rel = writeSuite('harness.test.js', [
      "import { load } from './fixture_helper.js';",
      "it('x', () => { expect(load()).toContain('MARKER'); });",
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out, 'a suite reading only through a helper must still be discovered').toContain(SRC_REL);
    expect(out).not.toMatch(/reads no source file directly/);
  }, 120000);

  it('keeps root-level sources, which have no slash in the path', () => {
    // Requiring a '/' separator dropped 317 suites that name a root file
    // directly (adventure_source.jsx, ui_strings.js). Existence on disk is the
    // filter, not the shape of the string.
    const rel = writeSuite('rootfile.test.js', [
      "import { readFileSync } from 'node:fs';",
      "const s = readFileSync('package.json', 'utf8');",
      "it('x', () => { expect(s).toContain('name'); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toMatch(/package\.json/);
  }, 120000);

  it('finds a call packed onto a line with other statements', () => {
    // A `[^;]` argument bound stops at the first semicolon INSIDE the call, so
    // vm.runInContext(readFileSync(...) + ';...') lost its only source.
    const rel = writeSuite('packed.test.js', [
      "import { readFileSync } from 'node:fs';",
      `const a = 1; const s = readFileSync('${SRC_REL}', 'utf8') + ';const x=1;'; const b = 2;`,
      "it('x', () => { expect(s).toContain('MARKER'); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toContain(SRC_REL);
  }, 120000);

  it('still skips a suite whose paths are genuinely dynamic', () => {
    // Over-reaching would be worse than skipping: the tool WRITES to whatever it
    // discovers, so a guessed path is a file it may gut for no reason.
    const rel = writeSuite('dynamic.test.js', [
      "import { readFileSync } from 'node:fs';",
      "const pick = (n) => `tests/${n}`;",
      "it('x', () => { expect(() => readFileSync(pick('nope.js'), 'utf8')).toThrow(); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toMatch(/reads no source file directly/);
  }, 120000);

  it('never invents a path that is not a real file', () => {
    const rel = writeSuite('notafile.test.js', [
      "import { readFileSync } from 'node:fs';",
      "it('x', () => { expect(() => readFileSync('definitely/not/here.js', 'utf8')).toThrow(); });",
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out).not.toMatch(/definitely\/not\/here\.js/);
    expect(out).toMatch(/reads no source file directly/);
  }, 120000);
});

// ── Files passed through a parameterised block ──
//
// it.each(['a.txt','b.txt'])('...', (file) => readFileSync(resolve(cwd(), file)))
// names its paths as a LOOP VARIABLE, so no literal sits inside the call. All
// three files in allobot_conversation_first_intake went undiscovered, and that
// had a second-order cost: the only file the tool DID find was one the suite
// reads for a single `not.toMatch`, which an empty file satisfies for free -- so
// a healthy 28-test suite was reported VACUOUS. Discovering the real pinned
// files is what makes that verdict right.
describe('find_vacuous_pins - parameterised source lists', () => {
  it('finds paths listed in an it.each array', () => {
    const rel = writeSuite('each.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { resolve } from 'node:path';",
      `it.each(['${SRC_REL}'])('%s', (file) => {`,
      "  const s = readFileSync(resolve(process.cwd(), file), 'utf8');",
      "  expect(s).toContain('MARKER');",
      '});',
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out, 'it.each source lists must be discovered').toContain(SRC_REL);
    expect(out).not.toMatch(/reads no source file directly/);
  });

  it('does not invent paths from an unrelated each list', () => {
    const rel = writeSuite('each_nonpath.test.js', [
      "it.each(['alpha', 'beta'])('%s', (name) => { expect(name.length).toBeGreaterThan(0); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toMatch(/reads no source file directly/);
  });

  // The four-mirror shape this repo uses everywhere:
  //
  //   const PATHS = ['stem_lab/x.js', 'desktop/web-app/public/stem_lab/x.js'];
  //   PATHS.forEach((filePath) => { readFileSync(filePath, 'utf8') });
  //
  // No literal is inside the readFileSync call, and the const is not read
  // directly by it either, so neither the inline rule nor the hoisted-const
  // rule saw these. 218 suites were reported "skipped: reads no source file
  // directly" — which reads as benign rather than as "no vacuity coverage".
  it('finds paths in an array the suite iterates with forEach', () => {
    const rel = writeSuite('array_foreach.test.js', [
      "import { readFileSync } from 'node:fs';",
      `const PATHS = ['${SRC_REL}'];`,
      "PATHS.forEach((filePath) => {",
      "  it('pins ' + filePath, () => {",
      "    expect(readFileSync(filePath, 'utf8')).toContain('MARKER');",
      '  });',
      '});',
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out, 'a forEach-iterated path array must be discovered').toContain(SRC_REL);
    expect(out).not.toMatch(/reads no source file directly/);
  });

  it('finds paths in an array driving describe.each', () => {
    const rel = writeSuite('array_describe_each.test.js', [
      "import { readFileSync } from 'node:fs';",
      `const MIRRORS = ['${SRC_REL}'];`,
      "describe.each(MIRRORS)('%s', (filePath) => {",
      "  it('pins', () => { expect(readFileSync(filePath, 'utf8')).toContain('MARKER'); });",
      '});',
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out).toContain(SRC_REL);
  });

  it('finds paths in an array walked by for...of', () => {
    const rel = writeSuite('array_forof.test.js', [
      "import { readFileSync } from 'node:fs';",
      `const FILES = ['${SRC_REL}'];`,
      'for (const filePath of FILES) {',
      "  it('pins ' + filePath, () => {",
      "    expect(readFileSync(filePath, 'utf8')).toContain('MARKER');",
      '  });',
      '}',
      '',
    ].join('\n'));
    expect(dryRun(rel)).toContain(SRC_REL);
  });

  it('ignores an array of non-path strings even when the suite reads files', () => {
    // The array rule must not turn ids, keys or fixture text into mutation
    // targets just because readFileSync appears somewhere in the file.
    const rel = writeSuite('array_ids.test.js', [
      "import { readFileSync } from 'node:fs';",
      "const IDS = ['alpha', 'beta', 'gamma'];",
      `const s = readFileSync('${SRC_REL}', 'utf8');`,
      "IDS.forEach((id) => { it(id, () => { expect(s).toContain('MARKER'); }); });",
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out).toContain(SRC_REL);
    expect(out, 'plain ids must never become mutation targets').not.toMatch(/alpha|beta|gamma/);
  });
});

// ── "partial" is not "vacuous" ──
//
// A suite reading several files usually pins only some of them: the others are
// read for a negated assertion (`not.toContain`, satisfied for free by an empty
// file) or belong to a built artifact the behaviour actually loads from. Calling
// that VACUOUS sends someone to re-anchor a healthy suite, and a tool that cries
// wolf is one people stop running. Only "every file it reads can be destroyed
// without it noticing" means the suite pins nothing.
describe('find_vacuous_pins - partial verdict', () => {
  it('reports a suite that pins one of two files as partial, not vacuous', () => {
    const pinnedRel = `tests/${STAMP}/pinned_source.js`;
    const ignoredRel = `tests/${STAMP}/ignored_source.js`;
    fs.writeFileSync(path.join(ROOT, pinnedRel), 'export const PINNED = 1;\n');
    fs.writeFileSync(path.join(ROOT, ignoredRel), 'export const IGNORED = 2;\n');
    const rel = writeSuite('two_files.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { describe, it, expect } from 'vitest';",
      `const a = readFileSync('${pinnedRel}', 'utf8');`,
      `const b = readFileSync('${ignoredRel}', 'utf8');`,
      "describe('x', () => { it('pins the first only', () => {",
      "  expect(a).toContain('PINNED');",
      "  expect(b).not.toContain('NEVER_PRESENT');",
      '}); });',
      '',
    ].join('\n'));
    let out;
    try {
      out = execFileSync(process.execPath, [TOOL, rel], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      out = String(e.stdout || '') + String(e.stderr || '');
    }
    expect(out, 'a partly-pinned suite must not be called vacuous').toMatch(/^partial /m);
    expect(out).toMatch(/1 partial/);
    expect(out).not.toMatch(/^VACUOUS /m);
    // The tag must render, not print "undefined".
    expect(out).not.toMatch(/^undefined /m);
    // And it must name the file that is NOT pinned, so the reader can judge.
    expect(out).toContain('ignored_source.js');
  }, 180000);
});

// ── Multi-segment path.join must name ONE file ──
//
// path.join(ROOT, 'apps_script', 'session_mailbox', 'README.md') spells a single
// path across several literals. Collecting them loosely grabbed the last segment
// on its own -- and 'README.md' exists at the repo ROOT -- so the tool gutted the
// root readme for two suites that read apps_script/<x>/README.md, then reported
// them VACUOUS for not noticing. Destroying an unrelated file is worse than a
// wrong verdict: only the finally-block restore kept it harmless. Both suites are
// healthy; with the segments joined they read "ok", and two more real sources
// (Code.gs, appsscript.json) became visible at the same time.
describe('find_vacuous_pins - multi-segment paths', () => {
  it('joins path.join segments instead of taking the last one', () => {
    const sub = path.join(DIR, 'nested');
    fs.mkdirSync(sub, { recursive: true });
    // Same basename as a real root-level file, to recreate the exact trap.
    fs.writeFileSync(path.join(sub, 'README.md'), 'NESTED MARKER\n');
    const rel = writeSuite('joined.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import path from 'node:path';",
      "const ROOT = process.cwd();",
      `const s = readFileSync(path.join(ROOT, 'tests', '${STAMP}', 'nested', 'README.md'), 'utf8');`,
      "it('x', () => { expect(s).toContain('NESTED MARKER'); });",
      '',
    ].join('\n'));
    const out = dryRun(rel);
    expect(out, 'the joined path must be discovered').toContain(`tests/${STAMP}/nested/README.md`);
    // The root file of the same name must NOT be picked up.
    expect(out).not.toMatch(/would mutate:.*(^|[ ,])README\.md/m);
  });

  it('still finds a single-literal path (no regression from the join handling)', () => {
    const rel = writeSuite('single_after_join.test.js', [
      "import { readFileSync } from 'node:fs';",
      `const s = readFileSync('${SRC_REL}', 'utf8');`,
      "it('x', () => { expect(s).toContain('MARKER'); });",
      '',
    ].join('\n'));
    expect(dryRun(rel)).toContain(SRC_REL);
  });
});

// ── --scope: catching a WIDENED region, which plain gutting cannot ──
//
// Gutting proves a suite pins SOMETHING; it cannot prove the suite pins the
// RIGHT region. dashboard_close_routing sliced a "teacher branch", its END
// anchor went stale, the region became the whole file, and the assertion passed
// against an unrelated component for weeks. Destroy that file and the suite DOES
// fail -- the text is gone -- so plain gutting reports "ok", correctly and
// uselessly. --scope keeps the regions a suite names and guts only what lies
// outside them: a correctly-scoped suite survives, a widened one loses the
// far-away text it was really matching.
describe('find_vacuous_pins - --scope finds widened regions', () => {
  const padded = (name) => {
    const dir = path.join(DIR, name);
    fs.mkdirSync(dir, { recursive: true });
    const lines = [
      "export function teacherBranch() {",
      "  return 'onClose=handleTeacherClose';",
      '}',
    ];
    // Real source files are big; the out-of-scope window only bites past it.
    for (let i = 1; i <= 400; i++) lines.push(`export const filler${i} = 'padding line ${i}';`);
    lines.push("export function studentBranch() {", "  return 'onClose=handleStudentClose';", '}', '');
    fs.writeFileSync(path.join(dir, 'src.js'), lines.join('\n'));
    return `tests/${STAMP}/${name}/src.js`;
  };

  const scopeRun = (rel) => {
    try {
      return execFileSync(process.execPath, [TOOL, '--scope', rel], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      return String(e.stdout || '') + String(e.stderr || '');
    }
  };

  it('flags a suite matching code outside its own anchors', () => {
    const srcRel = padded('widened');
    const rel = writeSuite('widened.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { describe, it, expect } from 'vitest';",
      `const src = readFileSync('${srcRel}', 'utf8');`,
      "describe('w', () => { it('claims TEACHER, matches STUDENT', () => {",
      "  const region = src.slice(src.indexOf('export function teacherBranch'), src.indexOf('MOVED_ANCHOR'));",
      "  expect(region).toContain('handleStudentClose');",
      '}); });',
      '',
    ].join('\n'));
    const out = scopeRun(rel);
    expect(out, 'a widened region must be reported').toMatch(/^WIDENED /m);
    expect(out).toMatch(/1 widened/);
  }, 240000);

  it('leaves a correctly-scoped suite alone', () => {
    const srcRel = padded('healthy');
    const rel = writeSuite('healthy_scope.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { describe, it, expect } from 'vitest';",
      `const src = readFileSync('${srcRel}', 'utf8');`,
      "describe('h', () => { it('pins TEACHER and matches it', () => {",
      "  const region = src.slice(src.indexOf('export function teacherBranch'), src.indexOf('export const filler1 '));",
      "  expect(region).toContain('handleTeacherClose');",
      '}); });',
      '',
    ].join('\n'));
    const out = scopeRun(rel);
    expect(out, 'a correctly scoped suite must not be flagged').not.toMatch(/^WIDENED /m);
    expect(out).toMatch(/^ok /m);
  }, 240000);
});

// ── --scope must not fire where the mutation is meaningless ──
//
// The first --scope sweep flagged 18 of 40 suites WIDENED. All were false
// positives, from two shapes where gutting outside the anchors breaks the suite
// for reasons that have nothing to do with a widened region:
//
//   1. the suite also asserts against the WHOLE source (`expect(src).toContain`)
//      beside its slice -- gutting legitimately removes text it checks
//      (brainatlas_data_colors line 50);
//   2. the suite EXTRACTS AND EXECUTES source (`new Function(span(...))`) --
//      gutting removes data and helpers the extracted code needs, so it dies on
//      a broken fixture (autorepair_quiz_position_bias splices four spans).
//
// A 45% false-positive rate would bury any real finding, so --scope now skips
// both shapes rather than reporting them.
describe('find_vacuous_pins - --scope suppresses meaningless mutations', () => {
  const bigSource = (name) => {
    const dir = path.join(DIR, name);
    fs.mkdirSync(dir, { recursive: true });
    const lines = ["export function alpha() {", "  return 'ALPHA_MARKER';", '}'];
    for (let i = 1; i <= 400; i++) lines.push(`export const filler${i} = 'padding ${i}';`);
    lines.push("export function omega() {", "  return 'OMEGA_MARKER';", '}', '');
    fs.writeFileSync(path.join(dir, 'src.js'), lines.join('\n'));
    return `tests/${STAMP}/${name}/src.js`;
  };
  const scopeRun = (rel) => {
    try {
      return execFileSync(process.execPath, [TOOL, '--scope', rel], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      return String(e.stdout || '') + String(e.stderr || '');
    }
  };

  it('does not flag a suite that also asserts on the whole source', () => {
    const srcRel = bigSource('wholesrc');
    const rel = writeSuite('whole_source.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { describe, it, expect } from 'vitest';",
      `const src = readFileSync('${srcRel}', 'utf8');`,
      "describe('w', () => { it('slices AND checks the whole file', () => {",
      "  const region = src.slice(src.indexOf('export function alpha'), src.indexOf('MOVED_ANCHOR'));",
      "  expect(region).toContain('OMEGA_MARKER');",
      "  expect(src).toContain('filler7 ');",  // whole-source assertion
      '}); });',
      '',
    ].join('\n'));
    const out = scopeRun(rel);
    expect(out, 'a whole-source assertion makes the scope mutation meaningless').not.toMatch(/^WIDENED /m);
  }, 240000);

  it('does not flag a suite that extracts and executes source', () => {
    const srcRel = bigSource('executes');
    const rel = writeSuite('executes_source.test.js', [
      "import { readFileSync } from 'node:fs';",
      "import { describe, it, expect } from 'vitest';",
      `const src = readFileSync('${srcRel}', 'utf8');`,
      "const span = (a, b) => { const i = src.indexOf(a); const e = src.indexOf(b, i); return src.slice(i, e + b.length); };",
      "describe('e', () => { it('runs extracted code', () => {",
      "  const fn = new Function(span('export function alpha', '}').replace('export ', '') + ' return alpha();');",
      "  expect(fn()).toBe('ALPHA_MARKER');",
      '}); });',
      '',
    ].join('\n'));
    const out = scopeRun(rel);
    expect(out, 'executing extracted source makes the scope mutation meaningless').not.toMatch(/^WIDENED /m);
  }, 240000);
});

// ── The restore must survive a transient filesystem failure ──
//
// This tool holds real source hostage between gutting it and putting it back, so
// the restore is the one write that MUST succeed. A real sweep died here with
// `UNKNOWN: unknown error, open ...doc_pipeline_source.jsx` (errno -4094) -- a
// transient Windows/OneDrive lock -- thrown from inside the `finally`, which
// escaped and killed the process mid-run. That time the write failed BEFORE
// truncating and the file survived: luck, not design. restoreOrDie now retries
// with a backoff and verifies the bytes before giving up.
describe('find_vacuous_pins - restore survives a flaky write', () => {
  const toolSrc = fs.readFileSync(path.join(ROOT, 'dev-tools/find_vacuous_pins.cjs'), 'utf8');

  it('retries instead of dying on the first failure', () => {
    const body = toolSrc.slice(toolSrc.indexOf('function restoreOrDie'), toolSrc.indexOf('function main()'));
    expect(body, 'restoreOrDie moved or was renamed').toContain('restoreOrDie');
    let calls = 0;
    const fakeFs = {
      writeFileSync() { if (++calls < 3) { const e = new Error('UNKNOWN'); e.code = 'UNKNOWN'; throw e; } },
      readFileSync() { return Buffer.from('X'); },
    };
    const exits = [];
    // eslint-disable-next-line no-new-func
    const restore = new Function('fs', 'process', 'console', `return ${body}`)(
      fakeFs,
      { exit: (c) => { exits.push(c); throw new Error(`exited ${c}`); } },
      { error() {} },
    );
    restore('/tmp/x', 'x', Buffer.from('X'));
    expect(calls, 'it gave up before the write could succeed').toBe(3);
    expect(exits, 'it should not have exited').toHaveLength(0);
  });

  it('both mutation paths route through it, not a bare writeFileSync', () => {
    // A `finally` that calls writeFileSync directly is the shape that crashed.
    const finallies = toolSrc.match(/\}\s*finally\s*\{[\s\S]{0,200}?\}/g) || [];
    expect(finallies.length, 'no finally blocks found -- vacuous').toBeGreaterThan(0);
    finallies.forEach((block) => {
      expect(block, `a finally still writes directly:\n${block}`).not.toMatch(/fs\.writeFileSync/);
    });
  });
});
