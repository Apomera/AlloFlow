'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');
const runtime = path.resolve(process.env.SECURITY_MCP_RUNTIME || path.join(root, 'desktop/mcp/runtime'));
const server = path.resolve(process.env.SECURITY_MCP_SERVER || path.join(root, 'desktop/mcp'));
const runtimeRequire = createRequire(path.join(runtime, 'package.json'));
const runtimeRoot = fs.realpathSync(runtime);
function assertInstalled(file, specifier) {
  const relative = path.relative(runtimeRoot, fs.realpathSync(file));
  assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative),
    'Runtime dependency must be installed inside the selected artifact: ' + specifier);
  return file;
}
function resolveInstalled(specifier) { return assertInstalled(runtimeRequire.resolve(specifier), specifier); }
const dependencies = specifier => runtimeRequire(resolveInstalled(specifier));
dependencies.resolve = resolveInstalled;
const { makeZip } = require(path.join(server, 'zip_writer.cjs'));
const validation = require(path.join(server, 'remediation_epub_validation.cjs'));
const temporaryRoot = path.join(root, 'tmp/mcp-runtime-compatibility');
fs.mkdirSync(temporaryRoot, { recursive: true });

function scratch(t) {
  const dir = fs.mkdtempSync(path.join(temporaryRoot, 'run-'));
  t.after(() => {
    if (process.env.SECURITY_MCP_KEEP_FIXTURES === '1') { t.diagnostic('Synthetic runtime fixture retained at ' + dir); return; }
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(temporaryRoot));
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });
  return dir;
}

function containedFile(file, boundary, label) {
  const real = fs.realpathSync(file), base = fs.realpathSync(boundary), relative = path.relative(base, real);
  assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative),
    label + ' must come from the selected artifact');
  assert.ok(fs.statSync(real).isFile(), label + ' must be a regular file');
  return real;
}

function javaEnvironment(dir) {
  const env = { ...process.env, XDG_CONFIG_HOME: path.join(dir, 'config'), APPDATA: path.join(dir, 'config'),
    LOCALAPPDATA: path.join(dir, 'local'), TMPDIR: dir, TMP: dir, TEMP: dir, ALLOFLOW_MCP_NO_KEY_FILES: '1' };
  for (const name of Object.keys(env)) if (/(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(name)) delete env[name];
  for (const name of ['NODE_PATH', 'NODE_OPTIONS', '_JAVA_OPTIONS', 'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS',
    'ALLOFLOW_MCP_EPUBCHECK_JAR', 'ALLOFLOW_MCP_VERAPDF_CLI']) delete env[name];
  return env;
}

test('Ace configuration keeps schema defaults, persistence, formats and invalid-value rejection', t => {
  const ConfigStore = dependencies('@daisy/ace-config/lib/config-store.js');
  const dir = scratch(t);
  const options = { cwd: dir, configName: 'fixture', schema: {
    limit: { type: 'integer', minimum: 1, default: 4 },
    title: { type: 'string', default: 'Classroom' },
    source: { type: 'string', format: 'uri' },
  } };
  const config = new ConfigStore(options);
  assert.equal(config.get('limit'), 4);
  config.set('limit', 2);
  config.set('source', 'https://example.invalid/lesson');
  assert.throws(() => config.set('limit', 0), /minimum|>= 1/);
  assert.throws(() => config.set('source', 'not a URI'), /format/);
  assert.equal(new ConfigStore(options).get('limit'), 2);
  assert.equal(new ConfigStore(options).get('source'), 'https://example.invalid/lesson');
});

test('the installed ZIP fallback is an explicit fail-closed first-party replacement', async t => {
  const dir = scratch(t);
  const extract = dependencies('extract-zip');
  const metadata = dependencies('extract-zip/package.json');
  assert.equal(metadata.name, '@alloflow/disabled-extract-zip');
  const packageDir = path.dirname(dependencies.resolve('extract-zip/package.json'));
  assert.equal(fs.lstatSync(packageDir).isSymbolicLink(), false);
  await assert.rejects(extract(path.join(dir, 'untrusted.zip'), { dir }), { code: 'ALLOFLOW_ZIP_EXTRACTION_DISABLED' });
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('the Ace browser runner can load and operate through its pinned Puppeteer upgrade', { timeout: 90000 }, async t => {
  const runner = createRequire(dependencies.resolve('@daisy/ace-axe-runner-puppeteer'));
  const puppeteer = runner(assertInstalled(runner.resolve('puppeteer'), 'runner Puppeteer'));
  const browser = await puppeteer.launch({
    executablePath: dependencies('playwright').chromium.executablePath(),
    headless: true, pipe: true, timeout: 60000,
  });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html lang="en"><title>Runtime test</title><body><h1>Classroom</h1><p>Readable text.</p></body></html>');
  assert.equal(await page.title(), 'Runtime test');
  assert.equal(await page.$eval('h1', element => element.textContent), 'Classroom');
  assert.ok(!browser.process().spawnargs.some(arg => /^--(?:no-sandbox|disable-setuid-sandbox)(?:=|$)/.test(arg)));
});

function writeEpubFixture(file) {
  fs.writeFileSync(file, makeZip([
    { name: 'mimetype', data: 'application/epub+zip', store: true },
    { name: 'META-INF/container.xml', data: '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>' },
    { name: 'EPUB/package.opf', data: '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id" xml:lang="en" prefix="schema: http://schema.org/"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:alloflow:security-test</dc:identifier><dc:title>Classroom</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-10-24T00:00:00Z</meta><meta property="schema:accessMode">textual</meta><meta property="schema:accessModeSufficient">textual</meta><meta property="schema:accessibilityFeature">structuralNavigation</meta><meta property="schema:accessibilityFeature">tableOfContents</meta><meta property="schema:accessibilityFeature">readingOrder</meta><meta property="schema:accessibilityHazard">none</meta><meta property="schema:accessibilitySummary">A short text lesson with headings and navigation.</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>' },
    { name: 'EPUB/nav.xhtml', data: '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><title>Contents</title></head><body><nav epub:type="toc" role="doc-toc"><h1>Contents</h1><ol><li><a href="chapter.xhtml">Classroom</a></li></ol></nav></body></html>' },
    { name: 'EPUB/chapter.xhtml', data: '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"><head><title>Classroom</title></head><body><main><h1>Classroom</h1><p>Read this original lesson.</p></main></body></html>' },
  ]));
}

test('the real bundled EPUBCheck Java validator accepts the supported EPUB with zero errors or fatals', { timeout: 120000 }, async t => {
  const dir = scratch(t), file = path.join(dir, 'classroom.epub'), reportPath = path.join(dir, 'epubcheck.json');
  writeEpubFixture(file);
  const jar = containedFile(path.join(server, 'vendor/epubcheck/epubcheck.jar'), server, 'EPUBCheck JAR');
  const java = validation.javaRuntime(process.env.ALLOFLOW_MCP_JAVA_BIN || null, { timeoutMs: 15000 });
  assert.equal(java.present, true, 'A real Java runtime is required for the bundled EPUBCheck smoke test');
  const result = await validation.run(java.java, ['-Xmx256m', '-jar', jar, '--json', reportPath, file],
    { env: javaEnvironment(dir), cwd: dir, timeoutMs: 90000 });
  assert.equal(result.code, 0, result.output.slice(-2000));
  const parsed = validation.parseEpubcheck(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
  assert.equal(parsed.errors, 0); assert.equal(parsed.fatals, 0);
  assert.equal(parsed.status, 'passed', JSON.stringify(parsed));
});

test('the real bundled veraPDF Java validator completes and binds noncompliant PDF/UA evidence', { timeout: 150000 }, async t => {
  const dir = scratch(t), file = path.join(dir, 'synthetic-noncompliant.pdf');
  const assets = process.env.SECURITY_MCP_SERVER ? path.resolve(server, '../assets') : root;
  const jar = containedFile(path.join(assets, 'verapdf/verapdf-cli.jar'), assets, 'veraPDF JAR');
  const driver = containedFile(path.join(server, 'remediation_headless_driver.cjs'), server, 'MCP driver');
  const env = javaEnvironment(dir);
  env.ALLOFLOW_MCP_ASSETS_DIR = fs.realpathSync(assets);
  env.JAVA_TOOL_OPTIONS = '-Xmx256m -Djava.awt.headless=true';
  const script = [
    "'use strict';const fs=require('node:fs'),path=require('node:path');",
    "const moduleFile=process.argv[1],file=process.argv[2],assets=process.argv[3],jar=process.argv[4];",
    "const mod=require(moduleFile);if(fs.realpathSync(mod.ASSETS_ROOT)!==assets||fs.realpathSync(path.join(mod.ASSETS_ROOT,'verapdf/verapdf-cli.jar'))!==jar)throw Error('Validator escaped selected artifact');",
    "(async()=>{const driver=mod.createDriver({log(){}});try{fs.writeFileSync(file,driver._buildSelfTestPdf());",
    "const evidence=await driver.validatePdfUaCli({filePath:file,timeoutMs:120000});process.stdout.write(JSON.stringify(evidence));",
    "}finally{await driver.close();}})().catch(error=>{process.stderr.write(String(error.message));process.exitCode=1;});",
  ].join('');
  const result = await validation.run(process.execPath, ['-e', script, driver, file, env.ALLOFLOW_MCP_ASSETS_DIR, jar],
    { env, cwd: dir, timeoutMs: 135000 });
  assert.equal(result.code, 0, result.output.slice(-2000));
  const evidence = JSON.parse(result.output), pdf = fs.readFileSync(file);
  // The existing driver parser rejects partial jobs, missing counts and bad
  // exits before returning this bound evidence. This fixture is deliberately
  // not PDF/UA compliant; a clean/pass result would be a regression.
  assert.equal(evidence.validator, 'veraPDF'); assert.equal(evidence.profile, 'ua1');
  assert.equal(evidence.status, 'noncompliant');
  for (const name of ['failedRules', 'failedChecks', 'passedRules', 'passedChecks']) assert.ok(Number.isSafeInteger(evidence[name]) && evidence[name] >= 0);
  assert.ok(evidence.failedRules > 0 && evidence.failedChecks > 0);
  assert.ok(evidence.passedRules + evidence.failedRules > 0 && evidence.passedChecks + evidence.failedChecks > 0);
  assert.ok(evidence.failedRuleSummaries.length > 0);
  assert.equal(evidence.inputBytes, pdf.length);
  assert.equal(evidence.inputSha256, crypto.createHash('sha256').update(pdf).digest('hex'));
  assert.ok(Number.isFinite(Date.parse(evidence.validatedAt)) && evidence.validationDurationMs >= 0);
});

test('the real Ace CLI audits a bounded EPUB through the supported worker without its ZIP fallback', { timeout: 180000 }, async t => {
  const dir = scratch(t);
  const file = path.join(dir, 'classroom.epub');
  writeEpubFixture(file);
  const reportDir = path.join(dir, 'report');
  const env = { ...process.env, PUPPETEER_EXECUTABLE_PATH: dependencies('playwright').chromium.executablePath(),
    PUPPETEER_SKIP_DOWNLOAD: 'true', ACE_TIMEOUT_INITIAL: '60000', XDG_CONFIG_HOME: path.join(dir, 'config'),
    APPDATA: path.join(dir, 'config'), LOCALAPPDATA: path.join(dir, 'local') };
  for (const name of Object.keys(env)) if (/(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(name)) delete env[name];
  const result = await validation.run(process.execPath, [path.join(server, 'remediation_ace_worker.cjs'),
    dependencies.resolve('@daisy/ace-cli/bin/ace.js'), '--silent', '--doNotReportMedia', '--exiterror2',
    '--outdir', reportDir, '--tempdir', path.join(dir, 'ace-work'), file],
  { env, cwd: dir, timeoutMs: 150000, ipc: true });
  assert.ok([0, 2].includes(result.code), result.output.slice(-3000));
  const report = JSON.parse(fs.readFileSync(path.join(reportDir, 'report.json'), 'utf8'));
  const parsed = validation.parseAce(report);
  assert.ok(parsed.assertions > 0);
  assert.equal(parsed.failures, 0, JSON.stringify({ parsed, assertions: report.assertions }).slice(0, 12000));
  assert.ok(['passed', 'failed', 'review-required'].includes(parsed.status));
  assert.ok(!result.output.includes('ALLOFLOW_ZIP_EXTRACTION_DISABLED'));
});
