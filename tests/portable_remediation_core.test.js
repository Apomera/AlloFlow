import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const ENGINE = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py');
const RENDERER = resolve(ROOT, 'agent_skills/alloflow-portable-remediation/scripts/render_tagged_pdf.cjs');
const PLAN = resolve(ROOT, 'tests/fixtures/alloflow-portable-plan.json');
const SOURCE = resolve(ROOT, 'test-assets/multi-column-scrambled.pdf');
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

let scratch;
let capabilityPromise;
const activeProcesses = new Set();

// These are local subprocess integration tests. Never block Vitest's event
// loop with spawnSync: its timeout cannot interrupt a synchronous child wait.
function runPortable(args, extraEnv = {}) {
  const timeoutMs = args[0] === 'capabilities' ? 45_000
    : args[0] === 'validate-pdf' ? 90_000
      : args.includes('required') ? 180_000 : 30_000;
  const entry = {};
  entry.settled = new Promise(resolveResult => {
    const child = spawn(PYTHON, [ENGINE, ...args], {
      cwd: ROOT, windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '', error;
    let timer, cleanupTimer, finished = false, stopping = false;
    const finish = (status, signal = null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
      activeProcesses.delete(entry);
      let json = null;
      try { json = JSON.parse(stdout); } catch (_) {}
      if (error) stderr += '\n' + error.message;
      resolveResult({ status, signal, stdout, stderr, error, json });
    };
    entry.stop = () => {
      if (finished || stopping) return;
      stopping = true;
      error ||= new Error('Portable subprocess cancelled before completion: ' + args[0]);
      // Python can own Node/Chromium/Java descendants. Stop only this test's
      // process tree so a timeout cannot strand work in a deleted fixture dir.
      if (process.platform === 'win32' && child.pid) {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        killer.on('error', () => child.kill('SIGKILL'));
        cleanupTimer = setTimeout(() => { killer.kill(); child.kill('SIGKILL'); finish(null, 'SIGKILL'); }, 5_000);
      } else {
        child.kill('SIGKILL');
        cleanupTimer = setTimeout(() => finish(null, 'SIGKILL'), 5_000);
      }
    };
    timer = setTimeout(() => {
      error = new Error('Portable ' + args[0] + ' subprocess exceeded ' + timeoutMs + 'ms');
      entry.stop();
    }, timeoutMs);
    activeProcesses.add(entry);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const collect = (kind, chunk) => {
      if (kind === 'stdout') stdout += chunk; else stderr += chunk;
      if (stdout.length + stderr.length > 4 * 1024 * 1024) {
        error = new Error('Portable subprocess exceeded the 4 MiB test-output limit');
        entry.stop();
      }
    };
    child.stdout.on('data', chunk => collect('stdout', chunk));
    child.stderr.on('data', chunk => collect('stderr', chunk));
    child.on('error', value => { error = value; finish(null); });
    child.on('close', finish);
  });
  return entry.settled;
}

function getCapabilities() {
  // Capability discovery launches Node and Java. The environment is constant
  // across this suite; probe once instead of adding that startup to every PDF.
  return capabilityPromise ||= runPortable(['capabilities', '--json']);
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'alloflow-portable-test-'));
});

afterEach(async () => {
  const pending = [...activeProcesses];
  for (const entry of pending) entry.stop();
  await Promise.all(pending.map(entry => entry.settled));
  rmSync(scratch, { recursive: true, force: true });
}, 10_000);

describe('AlloFlow portable remediation core', { timeout: 100_000 }, () => {
  it('reports a no-service, deny-network capability contract', async (context) => {
    const result = await getCapabilities();
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.json).toMatchObject({
      semanticHtml: true,
      staticHtmlAudit: true,
      networkPolicy: 'deny',
      alloflowServiceUsed: false,
      modelApiKeyRequired: false,
    });
  });

  it('binds every repair plan to the exact source PDF', async (context) => {
    const sourceInfo = await runPortable(['source-info', '--source', SOURCE]);
    expect(sourceInfo.status, sourceInfo.stderr).toBe(0);
    expect(sourceInfo.json).toMatchObject({
      basename: 'multi-column-scrambled.pdf',
      sha256: 'c8a68f4feb2e9e5fe5bbd5e978bedbbf4ed7855080dfe4a20bcc541ea4cc8751',
    });
    expect(sourceInfo.stdout).not.toContain(dirname(SOURCE));

    const mismatched = JSON.parse(readFileSync(PLAN, 'utf8'));
    mismatched.document.source_sha256 = '0'.repeat(64);
    const mismatchedPlan = join(scratch, 'mismatched-plan.json');
    writeFileSync(mismatchedPlan, JSON.stringify(mismatched), 'utf8');
    const rejected = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', mismatchedPlan,
      '--out-dir', join(scratch, 'mismatched-output'),
      '--pdf', 'never',
      '--verapdf', 'never',
    ]);
    expect(rejected.status).toBe(3);
    expect(rejected.json?.error).toMatch(/source mismatch/i);
    expect(existsSync(join(scratch, 'mismatched-output'))).toBe(false);
  });

  it('creates escaped semantic HTML, a scoped report, and a privacy receipt', async (context) => {
    const output = join(scratch, 'output');
    const result = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'never',
      '--verapdf', 'never',
    ]);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.json).toMatchObject({
      ok: true,
      verdict: 'html_only_review_required',
      taggedPdfGeneration: 'not_run',
      humanReviewRequired: true,
      outputPathRedacted: true,
    });

    const htmlPath = join(output, 'multi-column-scrambled-accessible.html');
    const reportPath = join(output, 'multi-column-scrambled-accessibility-report.json');
    const receiptPath = join(output, 'multi-column-scrambled-privacy-receipt.json');
    expect(existsSync(htmlPath)).toBe(true);
    expect(existsSync(reportPath)).toBe(true);
    expect(existsSync(receiptPath)).toBe(true);

    const html = readFileSync(htmlPath, 'utf8');
    expect(html).toContain('<main id="main-content">');
    expect(html).toContain('<ol data-source-page="1">');
    expect(html).toContain('<li>Evaporation: the sun heats water into invisible vapor.</li>');
    expect(html).toContain('<li>Human impact: cities and dams change how water moves.</li>');
    expect(html).not.toMatch(/<script\b/i);

    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(report.complianceClaim).toBe(false);
    expect(report.source.basename).toBe('multi-column-scrambled.pdf');
    expect(report.checks.repairPlan.sourceBinding).toMatchObject({
      algorithm: 'sha256',
      matched: true,
    });
    expect(report.checks.repairPlan.metrics.plan_internal_token_recall).toBe(1);
    expect(report.checks.repairPlan.metrics).not.toHaveProperty('source_token_recall');
    expect(report.checks.staticHtmlAudit).toMatchObject({ status: 'completed', ok: true });
    expect(report.checks.humanSourceComparison.status).toBe('required');
    expect(report.manualReview.join(' ')).toMatch(/cannot verify meaning/i);

    const receiptText = readFileSync(receiptPath, 'utf8');
    const receipt = JSON.parse(receiptText);
    expect(receipt).toMatchObject({
      documentNetworkPolicy: 'deny',
      systemWideNetworkUseVerified: false,
      alloflowServiceInvokedByScripts: false,
      remoteMcpInvokedByScripts: false,
      modelApiCalledByScripts: false,
      documentTextLoggedByScripts: false,
    });
    expect(receipt.assuranceScope).toMatch(/excludes the host AI provider/i);
    expect(receiptText).not.toContain(dirname(SOURCE));
    expect(receiptText).not.toContain('literal <script>');
  });

  it('escapes untrusted plan text before HTML rendering', async (context) => {
    const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
    plan.blocks.splice(1, 0, {
      type: 'paragraph',
      text: 'A literal <script>alert("not executable")</script> stays text.',
      source_page: 1,
    });
    plan.source_pages[0].text += ' A literal script alert not executable stays text.';
    const planPath = join(scratch, 'escaping-plan.json');
    writeFileSync(planPath, JSON.stringify(plan), 'utf8');
    const output = join(scratch, 'escaping-output');
    const result = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', planPath,
      '--out-dir', output,
      '--pdf', 'never',
      '--verapdf', 'never',
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);

    const html = readFileSync(join(output, 'multi-column-scrambled-accessible.html'), 'utf8');
    expect(html).toContain(
      'A literal &lt;script&gt;alert(&quot;not executable&quot;)&lt;/script&gt; stays text.',
    );
    expect(html).not.toMatch(/<script\b/i);
  });

  it('refuses overwrite and rejects unsafe or out-of-sandbox plans', async (context) => {
    const output = join(scratch, 'output');
    const first = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'never',
      '--verapdf', 'never',
    ]);
    expect(first.status).toBe(0);
    const collision = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'never',
      '--verapdf', 'never',
    ]);
    expect(collision.status).not.toBe(0);
    expect(collision.json?.error).toMatch(/Refusing to overwrite/);

    const invalid = JSON.parse(readFileSync(PLAN, 'utf8'));
    invalid.blocks.push({
      type: 'link',
      text: 'Unsafe',
      url: 'javascript:alert(1)',
      source_page: 1,
    });
    invalid.blocks.push({
      type: 'image',
      alt: 'A private file',
      decorative: false,
      path: '../../outside.png',
      source_page: 1,
    });
    const invalidPlan = join(scratch, 'invalid-plan.json');
    writeFileSync(invalidPlan, JSON.stringify(invalid), 'utf8');
    const rejected = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', invalidPlan,
      '--out-dir', join(scratch, 'rejected'),
      '--pdf', 'never',
      '--verapdf', 'never',
    ]);
    expect(rejected.status).toBe(3);
    expect(rejected.json?.error).toMatch(/unsafe or unsupported scheme/i);
    expect(rejected.json?.error).toMatch(/escapes the repair plan directory/i);
  });

  it('uses local Chromium for a tagged PDF when that optional capability exists', async (context) => {
    const capability = await getCapabilities();
    expect(capability.status, capability.stderr).toBe(0);
    if (!capability.json?.taggedPdfGeneration) { context.skip(); return; }

    const output = join(scratch, 'output');
    const result = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'required',
      '--verapdf', 'never',
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.json?.taggedPdfGeneration).toBe('completed');
    expect(result.json?.verdict).toBe('pdf_generated_unverified_review_required');

    const pdfPath = join(output, 'multi-column-scrambled-alloflow-accessible.pdf');
    const bytes = readFileSync(pdfPath).toString('latin1');
    expect(bytes).toContain('/StructTreeRoot');
    expect(bytes).toContain('/MarkInfo');
    expect(bytes).toMatch(/\/Marked\s+true\b/);
  }, 190_000);

  it('fails known PDF/UA violations with a nonzero automation result', async (context) => {
    const capability = await getCapabilities();
    expect(capability.status, capability.stderr).toBe(0);
    if (!capability.json?.pdfUaValidation) { context.skip(); return; }

    const result = await runPortable([
      'validate-pdf',
      '--pdf', resolve(ROOT, 'test-assets/manual-remediation/active-content-actions.pdf'),
    ]);
    expect(result.status).not.toBe(0);
    expect(result.json).toMatchObject({
      ok: false,
      status: 'completed',
      compliant: false,
    });
    expect(result.json?.failedRuleCount).toBeGreaterThan(0);
    expect(result.stdout).not.toContain(dirname(SOURCE));
  }, 190_000);

  it('keeps the artifacts and report when strict PDF/UA mode fails', async (context) => {
    const capability = await getCapabilities();
    expect(capability.status, capability.stderr).toBe(0);
    if (!capability.json?.taggedPdfGeneration || !capability.json?.pdfUaValidation) { context.skip(); return; }

    // The finalizer now repairs Chromium's UA-1 defects, so a normal run
    // passes validation. Disable it to exercise the strict-mode contract
    // against a PDF that genuinely fails PDF/UA-1.
    const output = join(scratch, 'strict-output');
    const result = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'required',
      '--verapdf', 'required',
    ], { ALLOFLOW_PORTABLE_DISABLE_UA_FINALIZE: '1' });
    expect(result.status).not.toBe(0);
    expect(result.json).toMatchObject({ ok: false, code: 6 });
    // The gate fails the RUN, not the diagnosis: the artifacts and the
    // accessibility report survive so the failure can be inspected from the
    // run that produced it. (The old contract deleted the staging dir, which
    // left the output empty and forced every diagnosis to re-run with
    // --verapdf auto.)
    const published = readdirSync(output).sort();
    expect(published).toContain('multi-column-scrambled-accessibility-report.json');
    expect(published).toContain('multi-column-scrambled-accessible.html');
    const report = JSON.parse(
      readFileSync(join(output, 'multi-column-scrambled-accessibility-report.json'), 'utf8'),
    );
    expect(report.checks?.pdfUaValidation?.compliant).toBe(false);
    expect(report.checks?.pdfUaValidation?.failedRules?.length).toBeGreaterThan(0);
  }, 190_000);

  it('passes strict PDF/UA mode when the finalizer runs', async (context) => {
    const capability = await getCapabilities();
    expect(capability.status, capability.stderr).toBe(0);
    if (!capability.json?.taggedPdfGeneration || !capability.json?.pdfUaValidation) { context.skip(); return; }

    const output = join(scratch, 'strict-pass-output');
    const result = await runPortable([
      'remediate',
      '--source', SOURCE,
      '--plan', PLAN,
      '--out-dir', output,
      '--pdf', 'required',
      '--verapdf', 'required',
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.json?.verdict).toBe('pdf_generated_validation_passed_review_required');
    expect(result.json?.pdfUaCompliant).toBe(true);
  }, 190_000);

  it('rejects meta refresh in standalone lint mode', async (context) => {
    const unsafe = join(scratch, 'meta-refresh.html');
    writeFileSync(
      unsafe,
      '<!doctype html><html lang="en"><head><title>x</title><meta http-equiv="refresh" content="0;url=data:text/html,bad"></head><body><main><h1>x</h1></main></body></html>',
      'utf8',
    );
    const result = await runPortable(['lint', '--html', unsafe]);
    expect(result.status).not.toBe(0);
    expect(result.json?.errors.join(' ')).toMatch(/Meta refresh/i);
  });

  it('keeps the deterministic scripts free of network clients and remote service calls', async (context) => {
    const python = readFileSync(ENGINE, 'utf8');
    const renderer = readFileSync(RENDERER, 'utf8');
    expect(python).not.toMatch(/^\s*(?:from|import)\s+(?:requests|socket|http\.client|urllib\.request)\b/m);
    expect(`${python}\n${renderer}`).not.toMatch(/generativelanguage\.googleapis\.com|api\.anthropic\.com|api\.openai\.com/i);
    expect(`${python}\n${renderer}`).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
  });
});
