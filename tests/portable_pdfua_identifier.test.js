// Fast policy integration: real portable plan/HTML/report publication with
// scripted renderer and validator boundaries. Native PDF tests cover producers.
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { runFixtureProcess } = require('../dev-tools/fixture_subprocess.cjs');
const ROOT = process.cwd();
const ENGINE = resolve('agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
let scratch;
afterEach(() => { if (scratch) rmSync(scratch, { recursive: true, force: true }); scratch = null; });

async function runCase(scenario, validation = 'auto', pdf = 'required') {
  scratch = mkdtempSync(join(tmpdir(), 'pdfua-id-'));
  const entry = join(scratch, 'entry.py'), ledger = join(scratch, 'ledger.json'), output = join(scratch, 'output');
  writeFileSync(entry, [
    'import importlib.util, json, sys',
    'from pathlib import Path',
    'sys.dont_write_bytecode = True',
    'spec = importlib.util.spec_from_file_location("portable_under_test", ' + JSON.stringify(ENGINE) + ')',
    'engine = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(engine)',
    'scenario = ' + JSON.stringify(scenario),
    'calls = {"renders": [], "validations": []}',
    'def save():',
    '    Path(__file__).with_name("ledger.json").write_text(json.dumps(calls), encoding="utf-8")',
    'def render(html_path, pdf_path, pdfua_id="none"):',
    '    calls["renders"].append(pdfua_id)',
    '    claimed = pdfua_id == "1" or (scenario == "never-initial-claim" and len(calls["renders"]) == 1) or scenario == "cannot-withhold"',
    '    if scenario == "rebuild-fails" and len(calls["renders"]) > 1:',
    '        save()',
    '        return {"status": "failed", "reason": "Identifier-free rebuild failed."}',
    '    payload = b"%PDF-1.4\\n/StructTreeRoot /MarkInfo /Marked true\\n" + (b"<pdfuaid:part>1</pdfuaid:part>" if claimed else b"<metadata>no identification</metadata>")',
    '    pdf_path.write_bytes(payload)',
    '    save()',
    '    return {"status": "completed", "bytes": len(payload), "pdfUaIdentifierClaimed": claimed, "blockedNetworkRequests": 0}',
    'def validate(pdf_path):',
    '    claimed = b"<pdfuaid:part>" in pdf_path.read_bytes()',
    '    calls["validations"].append(claimed)',
    '    save()',
    '    if scenario.startswith("never"):',
    '        raise AssertionError("Validation was disabled.")',
    '    if scenario == "passed":',
    '        return {"status": "completed", "compliant": True, "failedRuleCount": 0, "failedRules": []}',
    '    if scenario == "not-run":',
    '        return {"status": "not_run", "reason": "Local validator unavailable."}',
    '    if scenario == "unavailable":',
    '        return {"status": "unavailable", "reason": "Local validator unavailable."}',
    '    if scenario in ("failed", "cannot-withhold", "rebuild-fails"):',
    '        return {"status": "failed", "reason": "Validator timed out."}',
    '    return {"status": "completed", "compliant": False, "failedRuleCount": 1, "failedRules": [{"clause": "7.1", "description": "Original defect" if claimed else "Intentional missing identification"}]}',
    'engine.render_pdf = render',
    'engine.validate_pdf_ua = validate',
    'raise SystemExit(engine.main())',
  ].join('\n'));
  let stdout, code = 0;
  try {
    ({ stdout } = await runFixtureProcess(PYTHON, [entry, 'remediate', '--source', resolve('test-assets/multi-column-scrambled.pdf'),
      '--plan', resolve('tests/fixtures/alloflow-portable-plan.json'), '--out-dir', output, '--pdf', pdf, '--verapdf', validation], {
      cwd: ROOT, label: 'PDF/UA identifier policy', timeout: 30000,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' },
    }));
  } catch (error) { if (!error.stdout) throw error; stdout = error.stdout; code = error.exitCode; }
  const reportPath = join(output, 'multi-column-scrambled-accessibility-report.json');
  const pdfPath = join(output, 'multi-column-scrambled-alloflow-accessible.pdf');
  return { code, result: JSON.parse(stdout), calls: JSON.parse(readFileSync(ledger, 'utf8')),
    report: existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : null,
    pdf: existsSync(pdfPath) ? readFileSync(pdfPath, 'latin1') : null };
}

describe('portable PDF/UA identification requires completed passing validation', () => {
  it.each(['never', 'never-initial-claim'])('withholds identification for %s without running a validator', async scenario => {
    const r = await runCase(scenario, 'never');
    expect(r.code, JSON.stringify(r.result)).toBe(0);
    expect(r.calls.validations).toEqual([]);
    expect(r.calls.renders.at(-1)).toBe('none');
    expect(r.pdf).not.toContain('<pdfuaid:part>');
    expect(r.result.verdict).toBe('pdf_generated_unverified_review_required');
    expect(r.report.checks.pdfUaValidation).toMatchObject({ status: 'not_run', identifierWithheld: true });
    expect(r.report.checks.taggedPdfGeneration.pdfUaIdentifierClaimed).toBe(false);
  });
  it.each([['not-run', 'not_run'], ['unavailable', 'unavailable'], ['failed', 'failed']])('withholds identification after %s and preserves unverified status', async (scenario, status) => {
    const r = await runCase(scenario);
    expect(r.code, JSON.stringify(r.result)).toBe(0);
    expect(r.calls.renders).toEqual(['1', 'none']);
    expect(r.calls.validations).toEqual([true]);
    expect(r.pdf).not.toContain('<pdfuaid:part>');
    expect(r.result.verdict).toBe('pdf_generated_unverified_review_required');
    expect(r.report.checks.pdfUaValidation).toMatchObject({ status, identifierWithheld: true });
    expect(r.report.checks.pdfUaValidation).not.toHaveProperty('compliant');
    expect(r.report.checks.taggedPdfGeneration.pdfUaIdentifierClaimed).toBe(false);
    expect(r.report.manualReview.join(' ')).not.toContain('validation found unresolved rules');
  });
  it('retains the identifier and passing evidence when validation completes and passes', async () => {
    const r = await runCase('passed', 'required');
    expect(r.code).toBe(0);
    expect(r.calls.renders).toEqual(['1']);
    expect(r.calls.validations).toEqual([true]);
    expect(r.pdf).toContain('<pdfuaid:part>1</pdfuaid:part>');
    expect(r.report.checks.pdfUaValidation).toMatchObject({ compliant: true, identifierWithheld: false });
    expect(r.report.checks.taggedPdfGeneration.pdfUaIdentifierClaimed).toBe(true);
  });
  it('validates the actual identifier-free final bytes after completed noncompliance', async () => {
    const r = await runCase('noncompliant', 'required');
    expect(r.code).toBe(6);
    expect(r.calls.renders).toEqual(['1', 'none']);
    expect(r.calls.validations).toEqual([true, false]);
    expect(r.pdf).not.toContain('<pdfuaid:part>');
    expect(r.report.verdict).toBe('pdf_generated_with_known_issues');
    expect(r.report.checks.pdfUaValidation).toMatchObject({ compliant: false, identifierWithheld: true });
    expect(r.report.checks.pdfUaValidation.failedRules[0].description).toBe('Intentional missing identification');
  });
  it('retains an honest report and identifier-free artifact when required validation was unavailable', async () => {
    const r = await runCase('failed', 'required');
    expect(r.code).toBe(5);
    expect(r.pdf).not.toContain('<pdfuaid:part>');
    expect(r.report.verdict).toBe('pdf_generated_unverified_review_required');
    expect(r.report.checks.pdfUaValidation).toMatchObject({ status: 'failed', identifierWithheld: true });
  });
  it.each(['cannot-withhold', 'rebuild-fails'])('does not publish an unverified claimed PDF when %s', async scenario => {
    const r = await runCase(scenario, 'auto', 'auto');
    expect(r.pdf).toBeNull();
    expect(r.report.artifacts.taggedPdf).toBeNull();
    expect(r.report.verdict).toBe('html_only_review_required');
    expect(r.report.checks.taggedPdfGeneration.status).toBe('failed');
  });
  it('fails required PDF delivery and retains diagnosis when identification cannot be withheld', async () => {
    const r = await runCase('cannot-withhold');
    expect(r.code).toBe(4);
    expect(r.pdf).toBeNull();
    expect(r.report.artifacts.taggedPdf).toBeNull();
    expect(r.report.checks.taggedPdfGeneration.status).toBe('failed');
  });
});
