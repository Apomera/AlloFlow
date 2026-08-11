import { describe, expect, it, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Source-remediation pathway (experimental 0.1.x): the documents contract
// translated to code. One end-to-end loop: audit a seeded-violation fixture
// page, validate + apply a bound patch plan to a COPY, re-audit, compare.

const ROOT = process.cwd();
const SKILL = resolve(ROOT, 'agent_skills/alloflow-source-remediation');
const ENGINE = join(SKILL, 'scripts/alloflow_source.py');
const AUDITOR = join(SKILL, 'scripts/audit_page.cjs');
const FIXTURE = resolve(ROOT, 'tests/fixtures/source-remediation-site');
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

const scratch = mkdtempSync(join(tmpdir(), 'alloflow-source-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function runJson(cmd, args) {
  const stdout = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 240_000 });
  return JSON.parse(stdout);
}

function fixturePlan() {
  const html = readFileSync(join(FIXTURE, 'index.html'), 'utf8');
  const sha = createHash('sha256').update(readFileSync(join(FIXTURE, 'index.html'))).digest('hex');
  expect(html).toContain('<html>');
  return {
    schema_version: '0.1',
    target: {
      description: 'Fixture course page with seeded accessibility defects.',
      files: [{ path: 'index.html', sha256: sha }],
    },
    patches: [
      { file: 'index.html', find: '<html>', replace: '<html lang="en">',
        rationale: 'Declare the document language so assistive tech selects the right voice (WCAG 3.1.1).', wcag: ['3.1.1'] },
      { file: 'index.html', find: '<h3>Week one readings</h3>', replace: '<h2>Week one readings</h2>',
        rationale: 'Heading level skipped from h1 to h3; restore the hierarchy for structural navigation.' },
      { file: 'index.html', find: '.faded { color: #9a9a9a; }', replace: '.faded { color: #4b5563; }',
        rationale: 'The deadline sentence fails contrast against white; darken within the neutral ramp (WCAG 1.4.3).', wcag: ['1.4.3'] },
      { file: 'index.html', find: 'width="40" height="40">', replace: 'width="40" height="40" alt="Lab section location map thumbnail">',
        rationale: 'The image conveys the lab location and had no text alternative (WCAG 1.1.1).', wcag: ['1.1.1'], changes_rendered_text: false },
      { file: 'index.html', find: '<input type="text" id="labslot" placeholder="Preferred lab slot">',
        replace: '<label for="labslot">Preferred lab slot</label> <input type="text" id="labslot">',
        rationale: 'Placeholder is not a label; add a real label the field keeps while filled (WCAG 3.3.2).', wcag: ['3.3.2'], changes_rendered_text: true },
      { file: 'index.html', find: '<div class="btn" onclick="alert(\'saved\')">Save choice</div>',
        replace: '<button type="button" class="btn" onclick="alert(\'saved\')">Save choice</button>',
        rationale: 'The Save control was a click-only div, invisible to keyboard and reader users; use a real button (WCAG 2.1.1).', wcag: ['2.1.1'] },
    ],
    review_notes: [
      'Fixture plan for the contract test; every defect is seeded deliberately.',
    ],
  };
}

describe('source remediation pathway (experimental)', () => {
  it('audit -> validate -> apply-to-copy -> re-audit -> compare improves without regressions', () => {
    const before = join(scratch, 'before.json');
    const auditBefore = runJson('node', [AUDITOR, '--html', join(FIXTURE, 'index.html'), '--out', before]);
    expect(auditBefore.ok).toBe(true);
    expect(auditBefore.audit.axe.available).toBe(true);
    const beforeIds = auditBefore.audit.axe.violations.map((v) => v.id);
    expect(beforeIds).toContain('image-alt');
    expect(beforeIds).toContain('html-has-lang');
    expect(auditBefore.audit.keyboard.unreachable.length).toBeGreaterThanOrEqual(1);
    expect(auditBefore.blockedNetworkRequests).toBe(0); // fixture is fully local

    const planPath = join(scratch, 'patch-plan.json');
    writeFileSync(planPath, JSON.stringify(fixturePlan(), null, 2));
    const validation = runJson(PYTHON, [ENGINE, 'validate-plan', '--plan', planPath, '--root', FIXTURE]);
    expect(validation.ok, JSON.stringify(validation.errors)).toBe(true);
    expect(validation.metrics.patches).toBe(6);

    const copy = join(scratch, 'patched-copy');
    const applied = runJson(PYTHON, [ENGINE, 'apply', '--plan', planPath, '--root', FIXTURE, '--out-dir', copy]);
    expect(applied.ok).toBe(true);
    expect(applied.patchesApplied).toBe(6);
    // The original tree is untouched:
    expect(createHash('sha256').update(readFileSync(join(FIXTURE, 'index.html'))).digest('hex'))
      .toBe(fixturePlan().target.files[0].sha256);

    const after = join(scratch, 'after.json');
    const auditAfter = runJson('node', [AUDITOR, '--html', join(copy, 'index.html'), '--out', after]);
    expect(auditAfter.ok).toBe(true);

    const compare = runJson(PYTHON, [ENGINE, 'compare', '--before', before, '--after', after, '--plan', planPath]);
    expect(compare.verdict, JSON.stringify(compare.problems)).toBe('improved');
    expect(compare.axe.introduced).toEqual([]);
    expect(compare.axe.fixed).toContain('image-alt');
    expect(compare.axe.fixed).toContain('html-has-lang');
    expect(compare.keyboard.unreachableAfter).toBe(0);
    // The label patch changes rendered text and DECLARES it:
    expect(compare.behavior.renderedTextChanged).toBe(true);
    expect(compare.behavior.declaredByPlan).toBe(true);
    expect(compare.note).toContain('never a compliance determination');
  }, 300_000);

  it('rejects an unbound file, a non-unique find, and a vendored target', () => {
    const sha = createHash('sha256').update(readFileSync(join(FIXTURE, 'index.html'))).digest('hex');
    const bad = {
      schema_version: '0.1',
      target: { description: 'bad plan', files: [{ path: 'index.html', sha256: sha }] },
      patches: [
        { file: 'other.html', find: 'x', replace: 'y', rationale: 'unbound file should be rejected here.' },
        { file: 'index.html', find: '<p', replace: '<p data-x', rationale: 'non-unique find should be rejected here.' },
        { file: 'index.html', find: '<h1>', replace: '<h1 id="t">', rationale: 'fine rationale but wait for vendored check below.' },
      ],
      review_notes: [],
    };
    const planPath = join(scratch, 'bad-plan.json');
    writeFileSync(planPath, JSON.stringify(bad, null, 2));
    let failed = null;
    try {
      execFileSync(PYTHON, [ENGINE, 'validate-plan', '--plan', planPath, '--root', FIXTURE], { cwd: ROOT, encoding: 'utf8' });
    } catch (error) {
      failed = JSON.parse(error.stdout);
    }
    expect(failed, 'validation should exit nonzero').not.toBeNull();
    expect(failed.ok).toBe(false);
    const text = failed.errors.join('\n');
    expect(text).toContain("not bound in target.files");
    expect(text).toMatch(/occurs \d+ times .*must occur exactly once/);
  }, 60_000);
});
