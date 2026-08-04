import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

// Independent-verification and deterministic-recall layer of the portable
// skill: verify-init/verify-check plus extract-text ground truth.

const ROOT = process.cwd();
const ENGINE = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const PLAN = resolve(ROOT, 'tests/fixtures/alloflow-portable-plan.json');
const SOURCE = resolve(ROOT, 'test-assets/multi-column-scrambled.pdf');
const BORN_DIGITAL = resolve(ROOT, 'test-assets/multi-column-sample.pdf');
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
// Real digest of SOURCE: a placeholder would fail the plan/source binding check
// first, so a validation test would pass for the wrong reason.
const SOURCE_SHA256 = createHash('sha256').update(readFileSync(SOURCE)).digest('hex');

const scratch = mkdtempSync(join(tmpdir(), 'alloflow-portable-verify-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function runPortable(args) {
  const result = spawnSync(PYTHON, [ENGINE, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 240_000,
    env: { ...process.env },
  });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    json = undefined;
  }
  return { status: result.status, json, stderr: result.stderr, stdout: result.stdout };
}

function rebuiltHtml() {
  const output = join(scratch, 'html-only');
  const result = runPortable([
    'remediate',
    '--source', SOURCE,
    '--plan', PLAN,
    '--out-dir', output,
    '--pdf', 'never',
  ]);
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return join(output, 'multi-column-scrambled-accessible.html');
}

describe('deterministic text extraction', () => {
  it('recovers tokens from a born-digital PDF', () => {
    const result = runPortable(['extract-text', '--source', BORN_DIGITAL, '--include-text']);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.json.tokens).toBeGreaterThan(200);
    expect(result.json.text.toLowerCase()).toContain('water cycle');
  });

  it('reports recall channels inside the remediation report', () => {
    const output = join(scratch, 'recall-run');
    const result = runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'never',
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const report = JSON.parse(
      readFileSync(join(output, 'multi-column-scrambled-accessibility-report.json'), 'utf8'),
    );
    expect(report.checks.sourceTextRecall).toBeDefined();
    expect(report.checks.outputTextRecall.status).toBe('not_run'); // no PDF generated
    expect(report.checks.independentVerification.status).toBe('not_run');
  });
});

describe('independent verification', () => {
  const html = rebuiltHtml();
  const worksheetPath = join(scratch, 'worksheet.json');
  const checkArgs = [
    'verify-check',
    '--worksheet', worksheetPath,
    '--plan', PLAN,
    '--source', SOURCE,
    '--html', html,
  ];

  it('derives a bound worksheet from the plan', () => {
    const result = runPortable([
      'verify-init',
      '--plan', PLAN,
      '--source', SOURCE,
      '--html', html,
      '--out', worksheetPath,
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const worksheet = JSON.parse(readFileSync(worksheetPath, 'utf8'));
    expect(worksheet.items.length).toBeGreaterThan(3);
    expect(worksheet.binding.plan_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(worksheet.items.every((item) => item.status === null)).toBe(true);
  });

  it('refuses an unfilled worksheet and a non-isolated verifier', () => {
    const unfilled = runPortable(checkArgs);
    expect(unfilled.status).toBe(3);

    const worksheet = JSON.parse(readFileSync(worksheetPath, 'utf8'));
    for (const item of worksheet.items) item.status = 'verified';
    worksheet.verifier = {
      model: 'test-model',
      context_isolation: 'same-context', // not allowed
      read_source_directly: true,
      statement: 'I read the source and the rebuild directly and compared every worksheet item.',
    };
    writeFileSync(worksheetPath, JSON.stringify(worksheet, null, 2));
    const nonIsolated = runPortable(checkArgs);
    expect(nonIsolated.status).toBe(3);
    expect(nonIsolated.json.error).toMatch(/fresh-context/);
  });

  it('stamps a verified report for a complete attested worksheet', () => {
    const worksheet = JSON.parse(readFileSync(worksheetPath, 'utf8'));
    for (const item of worksheet.items) item.status = 'verified';
    worksheet.verifier = {
      model: 'test-model',
      context_isolation: 'fresh-context',
      read_source_directly: true,
      statement: 'I read the source and the rebuild directly and compared every worksheet item.',
    };
    writeFileSync(worksheetPath, JSON.stringify(worksheet, null, 2));
    const result = runPortable(checkArgs);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.json.result).toBe('verified');
    expect(result.json.counts.discrepancies).toBe(0);
  });

  it('surfaces discrepancies with exit code 9', () => {
    const worksheet = JSON.parse(readFileSync(worksheetPath, 'utf8'));
    worksheet.items[0].status = 'discrepancy';
    worksheet.items[0].note = 'Source column two paragraph order differs from the rebuild.';
    writeFileSync(worksheetPath, JSON.stringify(worksheet, null, 2));
    const result = runPortable(checkArgs);
    expect(result.status).toBe(9);
    expect(result.json.result).toBe('discrepancies-found');
    expect(result.json.discrepancies).toHaveLength(1);
  });
});

describe('inline styling (runs)', () => {
  const planWith = (blocks) => {
    const plan = {
      schema_version: '1.0',
      document: {
        title: 'Runs fixture',
        language: 'en',
        source_page_count: 1,
        source_sha256: SOURCE_SHA256,
        document_type: 'report',
      },
      blocks: [{ type: 'heading', level: 1, text: 'H', source_page: 1 }, ...blocks],
      review_notes: ['fixture'],
    };
    const file = join(scratch, `runs-${Math.abs(JSON.stringify(blocks).length)}-${blocks[0].type}.json`);
    writeFileSync(file, JSON.stringify(plan));
    return file;
  };
  const lint = (planFile) => {
    // remediate --pdf never exercises full plan validation without a browser.
    const out = join(scratch, `runs-out-${Math.random().toString(36).slice(2, 10)}`);
    return runPortable(['remediate', '--source', SOURCE, '--plan', planFile, '--out-dir', out, '--pdf', 'never']);
  };

  it('rejects runs that do not reproduce the block text', () => {
    const file = planWith([{
      type: 'paragraph',
      text: 'Hello brave world',
      runs: [{ text: 'Hello ', style: 'normal' }, { text: 'BRAVE', style: 'emphasis' }],
      source_page: 1,
    }]);
    const result = lint(file);
    expect(result.status).not.toBe(0);
    expect(result.json?.error).toMatch(/reproduce the block's text exactly/i);
  });

  it('rejects an unknown run style and a mismatched item_runs length', () => {
    const badStyle = lint(planWith([{
      type: 'paragraph', text: 'ab', runs: [{ text: 'ab', style: 'shouty' }], source_page: 1,
    }]));
    expect(badStyle.status).not.toBe(0);
    expect(badStyle.json?.error).toMatch(/style must be one of/i);

    const badLength = lint(planWith([{
      type: 'list', ordered: false, items: ['a', 'b'],
      item_runs: [[{ text: 'a', style: 'emphasis' }]], source_page: 1,
    }]));
    expect(badLength.status).not.toBe(0);
    expect(badLength.json?.error).toMatch(/one entry per item/i);
  });


  it('renders linked runs and rejects unsafe href schemes', () => {
    const output = join(scratch, 'runs-links');
    const good = planWith([{
      type: 'paragraph',
      text: 'See the site now',
      runs: [
        { text: 'See ', style: 'normal' },
        { text: 'the site', style: 'normal', href: 'https://example.org/x' },
        { text: ' now', style: 'normal' },
      ],
      source_page: 1,
    }]);
    const result = runPortable(['remediate', '--source', SOURCE, '--plan', good, '--out-dir', output, '--pdf', 'never']);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const html = readFileSync(join(output, 'multi-column-scrambled-accessible.html'), 'utf8');
    expect(html).toContain('<a href="https://example.org/x">the site</a>');

    const bad = lint(planWith([{
      type: 'paragraph', text: 'x y', runs: [{ text: 'x y', href: 'javascript:alert(1)' }], source_page: 1,
    }]));
    expect(bad.status).not.toBe(0);
    expect(bad.json?.error).toMatch(/safe scheme/i);
  });

  it('renders emphasis and strong, and leaves unstyled plans unchanged', () => {
    const output = join(scratch, 'runs-render');
    const file = planWith([{
      type: 'paragraph',
      text: 'plain then loud',
      runs: [{ text: 'plain then ', style: 'normal' }, { text: 'loud', style: 'strong' }],
      source_page: 1,
    }, {
      type: 'list', ordered: false, items: ['a) opt'],
      item_runs: [[{ text: 'a) ', style: 'strong' }, { text: 'opt', style: 'emphasis' }]],
      source_page: 1,
    }]);
    const result = runPortable(['remediate', '--source', SOURCE, '--plan', file, '--out-dir', output, '--pdf', 'never']);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const html = readFileSync(join(output, 'multi-column-scrambled-accessible.html'), 'utf8');
    expect(html).toContain('plain then <strong>loud</strong>');
    expect(html).toContain('<li><strong>a) </strong><em>opt</em></li>');
  });
});
