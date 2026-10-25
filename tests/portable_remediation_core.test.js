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
function runPortable(args, extraEnv = {}, enginePath = ENGINE) {
  const timeoutMs = args[0] === 'capabilities' ? 90_000
    : args[0] === 'validate-pdf' ? 90_000
      : args.includes('required') ? 180_000 : 30_000;
  const entry = {};
  entry.settled = new Promise(resolveResult => {
    const child = spawn(PYTHON, [enginePath, ...args], {
      cwd: ROOT, windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...extraEnv, PYTHONDONTWRITEBYTECODE: '1' },
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

function optionalCapabilities(capability, names, context) {
  const missing = names.filter(name => capability.json?.[name] !== true);
  // Release verification can require installed optional runtimes explicitly;
  // a failed capability probe must then retain its diagnostic rather than skip.
  if (process.env.ALLOFLOW_TEST_REQUIRE_PORTABLE_CAPABILITIES === '1') {
    expect(missing, capability.stdout || capability.stderr).toEqual([]);
  }
  if (missing.length) { context.skip(); return false; }
  return true;
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
  it('allows bounded renderer startup and cleanup beyond twenty seconds while retaining timeout failures', async () => {
    const entry = join(scratch, 'capability-budget.py');
    writeFileSync(entry, [
      'import importlib.util, subprocess, sys, types',
      'sys.dont_write_bytecode = True',
      'spec = importlib.util.spec_from_file_location("portable_under_test", ' + JSON.stringify(ENGINE) + ')',
      'engine = importlib.util.module_from_spec(spec)',
      'spec.loader.exec_module(engine)',
      'budgets = []',
      'def delayed_success(command, **options):',
      '    budgets.append(options["timeout"])',
      '    if options["timeout"] < 40:',
      '        raise subprocess.TimeoutExpired(command, options["timeout"])',
      '    return types.SimpleNamespace(returncode=0, stdout=\'{"available":true}\', stderr="")',
      'engine.subprocess.run = delayed_success',
      'available = engine.renderer_capability()',
      'def timed_out(command, **options):',
      '    budgets.append(options["timeout"])',
      '    raise subprocess.TimeoutExpired(command, options["timeout"])',
      'engine.subprocess.run = timed_out',
      'unavailable = engine.renderer_capability()',
      'engine.emit_json({"available": available, "unavailable": unavailable, "budgets": budgets})',
    ].join('\n'));
    const result = await runPortable(['capabilities'], {}, entry);
    expect(result.status, result.stdout || result.stderr).toBe(0);
    expect(result.json.available).toMatchObject({ available: true });
    expect(result.json.unavailable).toMatchObject({ available: false });
    expect(result.json.unavailable.reason).toContain('timed out');
    expect(result.json.budgets).toEqual([40, 40]);
  });
  it.each(['required', 'auto'])('attempts the real render boundary despite unavailable preflight and reports its %s-mode failure honestly', async mode => {
    const entry = join(scratch, 'render-entry.py'), marker = join(scratch, 'render-attempt.json');
    writeFileSync(entry, [
      'import importlib.util, json, sys',
      'sys.dont_write_bytecode = True',
      'from pathlib import Path',
      'spec = importlib.util.spec_from_file_location("portable_under_test", ' + JSON.stringify(ENGINE) + ')',
      'engine = importlib.util.module_from_spec(spec)',
      'spec.loader.exec_module(engine)',
      'engine.renderer_capability = lambda: {"available": False, "reason": "stale capability probe"}',
      'def render_failure(html_path, pdf_path, pdfua_id="none"):',
      '    Path(__file__).with_name("render-attempt.json").write_text(json.dumps({"sourceHtmlExists": html_path.is_file(), "sourceHasHeading": "<h1" in html_path.read_text(encoding="utf-8"), "pdfuaId": pdfua_id}), encoding="utf-8")',
      '    return {"status": "failed", "reason": "native renderer attempted and failed"}',
      'engine.render_pdf = render_failure',
      'raise SystemExit(engine.main())',
    ].join('\n'));
    const output = join(scratch, 'output');
    const result = await runPortable([
      'remediate', '--source', SOURCE, '--plan', PLAN, '--out-dir', output,
      '--pdf', mode, '--verapdf', 'never',
    ], {}, entry);
    expect(existsSync(marker), result.stdout || result.stderr).toBe(true);
    expect(JSON.parse(readFileSync(marker, 'utf8'))).toEqual({ sourceHtmlExists: true, sourceHasHeading: true, pdfuaId: 'none' });
    expect(existsSync(join(output, 'multi-column-scrambled-alloflow-accessible.pdf'))).toBe(false);
    if (mode === 'required') {
      expect(result.status).not.toBe(0);
      expect(result.json).toMatchObject({ ok: false, code: 4 });
      expect(result.json.error).toContain('native renderer attempted and failed');
      expect(readdirSync(output)).toEqual([]);
    } else {
      expect(result.status, result.stdout || result.stderr).toBe(0);
      expect(result.json).toMatchObject({ taggedPdfGeneration: 'failed', humanReviewRequired: true, verdict: 'html_only_review_required' });
      const report = JSON.parse(readFileSync(join(output, 'multi-column-scrambled-accessibility-report.json'), 'utf8'));
      expect(report.artifacts.taggedPdf).toBeNull();
      expect(report.checks.taggedPdfGeneration).toMatchObject({ status: 'failed', reason: 'native renderer attempted and failed' });
    }
  });
  it('publishes full document filenames when a private staging path would exceed the Windows path limit', async () => {
    const reportName = 'multi-column-scrambled-accessibility-report.json';
    // Public artifact paths remain below 260 characters; repeating the source
    // stem beneath a random staging directory would put the private path over it.
    const outputLength = 245 - reportName.length - 1;
    const output = join(scratch, 'n'.repeat(Math.max(1, outputLength - scratch.length - 1)));
    const result = await runPortable([
      'remediate', '--source', SOURCE, '--plan', PLAN, '--out-dir', output,
      '--pdf', 'never', '--verapdf', 'never',
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(existsSync(join(output, reportName))).toBe(true);
    expect(existsSync(join(output, 'multi-column-scrambled-accessible.html'))).toBe(true);
    const report = JSON.parse(readFileSync(join(output, reportName), 'utf8'));
    expect(report.artifacts.accessibilityReport).toBe(reportName);
    expect(readdirSync(output).some(name => name.startsWith('.alloflow-portable-'))).toBe(false);
  });
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
    if (!optionalCapabilities(capability, ['taggedPdfGeneration'], context)) return;

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
    expect(bytes).not.toContain('<pdfuaid:part>');
    const report = JSON.parse(readFileSync(join(output, 'multi-column-scrambled-accessibility-report.json'), 'utf8'));
    expect(report.checks.pdfUaValidation).toMatchObject({ status: 'not_run', identifierWithheld: true });
    expect(report.checks.taggedPdfGeneration.pdfUaIdentifierClaimed).toBe(false);
  }, 190_000);

  it('fails known PDF/UA violations with a nonzero automation result', async (context) => {
    const capability = await getCapabilities();
    expect(capability.status, capability.stderr).toBe(0);
    if (!optionalCapabilities(capability, ['pdfUaValidation'], context)) return;

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
    if (!optionalCapabilities(capability, ['taggedPdfGeneration', 'pdfUaValidation'], context)) return;

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
    if (!optionalCapabilities(capability, ['taggedPdfGeneration', 'pdfUaValidation'], context)) return;

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
