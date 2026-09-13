#!/usr/bin/env node
'use strict';

// Opt-in live verification using only the synthetic lesson below.
// Never reads app/browser profiles or credential files and never supplies a canned AI response.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const REPORT_ROOT = path.join(ROOT, 'reports', 'lesson-plan-followups-2026-09-12');
const BACKENDS = new Set(['gemini', 'openai', 'claude', 'alloflow-local', 'lmstudio', 'ollama', 'localai', 'custom']);
const HELP = [
  'Usage: node dev-tools/check_lesson_teaching_script_live.cjs MODE [options]',
  '  --research-only                 Retrieve actual allowlisted research; no AI request.',
  '  --prepare-browser               Write prompt.txt and exact captured bundle.json for browser AI.',
  '  --browser-response=FILE --bundle=FILE  Validate browser output using captured evidence; no network.',
  '  --live --backend=BACKEND --model=MODEL [--base-url=URL]  Run the actual AIProvider.',
  'Options: --research=on|off (default on), --timeout-ms=180000 (1000..180000), --help',
  'Cloud keys: GEMINI_API_KEY (or GOOGLE_API_KEY), OPENAI_API_KEY, ANTHROPIC_API_KEY.',
  'Optional ALLOFLOW_LIVE_API_KEY is used for a custom/local authenticated endpoint.',
  'No credential arguments or credential-file lookup. Artifacts contain synthetic lesson content only.',
  'A browser-response result verifies host/core save, edit, reopen, and text exports; it does not',
  'claim the app provider connection, browser controls, or native clipboard were tested.'
].join('\n');

function parseArgs(args) {
  const out = {};
  const flags = new Set(['research-only', 'prepare-browser', 'live', 'help']);
  const values = new Set(['browser-response', 'bundle', 'backend', 'model', 'base-url', 'research', 'timeout-ms']);
  for (const arg of args) {
    if (!arg.startsWith('--')) throw new Error('Only documented named options are accepted.');
    const offset = arg.indexOf('=');
    const key = arg.slice(2, offset < 0 ? undefined : offset);
    if (Object.hasOwn(out, key)) throw new Error('Duplicate option.');
    if (flags.has(key) && offset < 0) out[key] = true;
    else if (values.has(key) && offset >= 0 && arg.slice(offset + 1)) out[key] = arg.slice(offset + 1);
    else throw new Error('Unknown or invalid option. Do not pass credentials on the command line.');
  }
  if (out.help) return out;
  const modes = ['research-only', 'prepare-browser', 'live', 'browser-response'].filter(key => out[key]);
  if (modes.length !== 1) throw new Error('Choose exactly one explicit mode.');
  out.mode = modes[0];
  out.timeoutMs = Number(out['timeout-ms'] || 180000);
  if (!Number.isInteger(out.timeoutMs) || out.timeoutMs < 1000 || out.timeoutMs > 180000) throw new Error('Timeout must be 1000..180000 milliseconds.');
  if (out.research && !['on', 'off'].includes(out.research)) throw new Error('Research must be on or off.');
  if (out.live && (!BACKENDS.has(out.backend) || !out.model)) throw new Error('Live mode needs a supported backend and an explicit model ID.');
  if (out['browser-response'] && (!out.bundle || out.research)) throw new Error('Browser-response mode needs its prepared bundle and uses that bundle research choice.');
  if (out['base-url']) {
    const url = new URL(out['base-url']);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Base URL must be HTTP(S), without credentials, query, or fragment.');
  }
  return out;
}

function syntheticFixture(researchEnabled = true) {
  const sourceId = 'live-script-synthetic-source';
  return {
    plan: {
      id: 'live-script-synthetic-plan', type: 'lesson-plan', title: 'Synthetic check: equivalent fractions on a number line', sourceArtifactId: sourceId,
      config: { gradeLevel: '4th Grade', language: 'English' },
      data: {
        objectives: ['Represent one half and two fourths at the same point on a number line.'],
        essentialQuestion: 'How can different fractions name the same length?', materialsNeeded: ['Paper strips', 'Pencils', 'A zero-to-one number line'],
        hook: 'Compare a strip folded into halves with an equal-length strip folded into fourths.',
        directInstruction: 'Mark zero and one as one whole. Partition equal-length intervals into two and four equal parts. Show that one half and two fourths end at the same point.',
        guidedPractice: 'Partners partition the same whole into fourths and explain where two fourths belongs.',
        independentPractice: 'Draw one number line with halves and fourths, label one half and two fourths, and explain the equal length.',
        closure: 'Explain why the whole must stay the same when comparing one half and two fourths.'
      }
    },
    materials: [{ id: sourceId, type: 'source', title: 'Synthetic fraction number-line passage', data: 'A number line from zero to one represents one whole. Dividing that interval into two equal lengths makes halves. Dividing the same interval into four equal lengths makes fourths. One half and two fourths are at the same point, halfway between zero and one. Count intervals, not tick marks.' }],
    settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Equivalent fractions on a number line', scope: 'segment', durationMinutes: 15, goal: 'Explain why one half and two fourths occupy the same point on a number line.', priorKnowledge: 'Learners can partition an equal whole into equal parts.', language: 'English', standard: '', researchEnabled, materialIds: [sourceId] }
  };
}

function safeMessage(value, secrets) {
  let text = value instanceof Error ? value.message : String(value || '');
  for (const secret of secrets) if (secret) text = text.split(secret).join('[redacted]');
  return text.replace(/([?&](?:key|api_key|token)=)[^\s&]+/gi, '$1[redacted]').replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]').slice(0, 2500);
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8'); }
function bundleFingerprint(bundle, fingerprint) {
  return fingerprint({ plan: bundle.plan, materials: bundle.materials, settings: bundle.settings, snapshot: bundle.snapshot, evidence: bundle.evidence, prompt: bundle.prompt });
}

async function exportSavedPlan(plan, outputDir) {
  let copied = '';
  const context = { window: { AlloModules: {} }, navigator: { clipboard: { writeText: async text => { copied = text; } } }, console: { log() {}, warn() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'export_handlers_module.js'), 'utf8'), context, { filename: 'export_handlers_module.js' });
  const api = context.window.AlloModules.ExportHandlers;
  const copiedOk = await api.handleCopyToClipboard({ generatedContent: plan, t: key => key, addToast() {}, warnLog() {}, isParentMode: false, isIndependentMode: false });
  assert.equal(copiedOk, true, 'Saved lesson text export failed.');
  for (const field of ['essentialQuestion', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure']) assert.ok(copied.includes(plan.data[field]), 'Plan export omitted ' + field);
  assert.ok(copied.includes(plan.title) && copied.includes('4th Grade'), 'Plan export lost saved metadata.');
  fs.writeFileSync(path.join(outputDir, 'lesson-plan.txt'), copied, 'utf8');
  return copied.length;
}

async function run(options) {
  const core = require('../lesson_teaching_script_module.js');
  const host = require('../lesson_teaching_script_host_module.js');
  const research = require('../lesson_teaching_research_module.js');
  const { fingerprint } = require('../resource_content_fingerprint_module.js');
  const started = new Date();
  const outputDir = path.join(REPORT_ROOT, 'live-' + started.toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
  fs.mkdirSync(outputDir, { recursive: true });
  const summary = { mode: options.mode, startedAt: started.toISOString(), status: 'running', providerCalls: 0, validationRequests: 0, checks: {}, limitations: ['Headless synthetic fixture; actual app navigation, browser controls, and operating-system clipboard are not exercised.'], artifacts: {} };
  const runController = new AbortController();
  let controller, evidence, provider;
  let fixture = syntheticFixture(options.research !== 'off');
  let bundle;
  const secrets = [];
  const statuses = [];
  const timer = setTimeout(() => runController.abort(new Error('Live verification exceeded its wall-clock timeout.')), options.timeoutMs);
  runController.signal.addEventListener('abort', () => controller?.cancel(fixture.plan.id), { once: true });
  const writeArtifact = (name, value) => { const file = path.join(outputDir, name); writeJson(file, value); summary.artifacts[name] = file; return file; };
  try {
    if (options.mode === 'browser-response') {
      bundle = JSON.parse(fs.readFileSync(path.resolve(options.bundle), 'utf8'));
      assert.equal(bundle.schemaVersion, 'lesson-script-live-bundle/v1', 'Unsupported prepared bundle.');
      assert.equal(bundle.fingerprint, bundleFingerprint(bundle, fingerprint), 'The prepared bundle changed.');
      fixture = syntheticFixture(bundle.settings?.researchEnabled === true);
      assert.deepEqual(bundle.plan, fixture.plan, 'Bundle is not this harness synthetic lesson.');
      assert.deepEqual(bundle.materials, fixture.materials, 'Bundle has unexpected materials.');
      assert.deepEqual(bundle.settings, fixture.settings, 'Bundle settings differ from the synthetic fixture.');
      assert.deepEqual(bundle.snapshot, core.captureInputs(fixture.plan, fixture.settings, fixture.materials), 'Runtime inputs changed since browser preparation.');
      evidence = bundle.evidence;
      assert.equal(bundle.prompt, core.buildScriptPrompt(bundle.snapshot, evidence), 'Runtime prompt changed since browser preparation.');
      summary.generationPath = 'browser-produced response validated through actual host/core';
      summary.researchOrigin = 'exact evidence captured in prepared bundle';
      summary.directProviderIntegration = 'not-tested';
    } else {
      summary.generationPath = options.live ? 'actual AIProvider adapter' : 'not-run';
      if (options.live) {
        const keyName = { gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY', claude: 'ANTHROPIC_API_KEY' }[options.backend];
        const apiKey = keyName ? process.env[keyName] || (options.backend === 'gemini' ? process.env.GOOGLE_API_KEY : '') || '' : process.env.ALLOFLOW_LIVE_API_KEY || '';
        if (apiKey) secrets.push(apiKey);
        summary.backend = options.backend; summary.model = options.model; summary.credentialPresent = Boolean(apiKey);
        if (keyName && !apiKey) throw new Error('No credential is available in the required provider environment variable. No AI request was made.');
        const { AIProvider } = require('../ai_backend_module.js');
        provider = new AIProvider({ backend: options.backend, apiKey, baseUrl: options['base-url'], models: { default: options.model, flash: options.model, fallback: options.model }, debugLog() {}, warnLog() {} });
      }
      evidence = { status: 'disabled', sources: [], warnings: ['Research support was explicitly disabled for this synthetic check.'] };
      if (fixture.settings.researchEnabled || options['research-only']) {
        console.log('Reading actual allowlisted teaching guidance...');
        evidence = await research.collect({ ...fixture.settings, signal: runController.signal }, { read: research.readPublicGuidance });
        if (runController.signal.aborted) throw runController.signal.reason;
      }
      summary.researchOrigin = fixture.settings.researchEnabled || options['research-only'] ? 'actual public guidance reader, matched catalog directly' : 'explicitly disabled';
    }
    writeArtifact('research.json', evidence);
    summary.research = { status: evidence.status, sources: evidence.sources.length, recommendationCount: evidence.sources.reduce((sum, source) => sum + source.recommendations.length, 0), warnings: evidence.warnings };
    if (fixture.settings.researchEnabled && evidence.status !== 'retrieved') throw new Error('Applicable research could not be retrieved and verified. No researched generation was claimed.');
    if (options['research-only']) { summary.status = evidence.status === 'retrieved' ? 'passed' : 'unavailable'; summary.checks.research = evidence.status === 'retrieved'; return summary; }
    const snapshot = core.captureInputs(fixture.plan, fixture.settings, fixture.materials);
    const prompt = core.buildScriptPrompt(snapshot, evidence);
    if (options['prepare-browser']) {
      bundle = { schemaVersion: 'lesson-script-live-bundle/v1', createdAt: new Date().toISOString(), ...fixture, snapshot, evidence, prompt };
      bundle.fingerprint = bundleFingerprint(bundle, fingerprint);
      writeArtifact('bundle.json', bundle);
      const promptFile = path.join(outputDir, 'prompt.txt'); fs.writeFileSync(promptFile, prompt, 'utf8'); summary.artifacts['prompt.txt'] = promptFile;
      summary.status = 'prepared'; summary.checks.promptPrepared = true; summary.directProviderIntegration = 'not-tested';
      return summary;
    }
    let responseText = options['browser-response'] ? fs.readFileSync(path.resolve(options['browser-response']), 'utf8') : null;
    const originalPlan = JSON.stringify(fixture.plan.data);
    let state = { history: [fixture.plan, ...fixture.materials], generatedContent: fixture.plan, isTeacherMode: true, isParentMode: false, isIndependentMode: false, actorKey: 'synthetic-live-teacher', canGenerate: true };
    const savedPlanFile = path.join(outputDir, 'saved-plan.json');
    controller = host.createController({
      core, research: { collect: async () => evidence }, read: research.readPublicGuidance,
      getState: () => state,
      onStatus: status => { statuses.push({ stage: status.stage, busy: status.busy, error: safeMessage(status.error, secrets) }); if (status.stage) console.log('Script stage: ' + status.stage); },
      callText: async (requestPrompt, signal) => {
        summary.validationRequests += 1;
        if (runController.signal.aborted) throw runController.signal.reason;
        if (options['browser-response']) {
          if (responseText !== null) { const result = responseText; responseText = null; return result; }
          const repairFile = path.join(outputDir, 'repair-prompt.txt'); fs.writeFileSync(repairFile, requestPrompt, 'utf8'); summary.artifacts['repair-prompt.txt'] = repairFile;
          throw new Error('The browser response needs repair. Send repair-prompt.txt to the browser AI and rerun with its corrected response and the same bundle.');
        }
        summary.providerCalls += 1;
        return provider.generateText(requestPrompt, { json: true, search: false, signal, maxTokens: 12000 });
      },
      updateResource: (id, updater) => {
        const index = state.history.findIndex(resource => String(resource.id) === String(id));
        if (index < 0) return false;
        const next = updater(state.history[index]);
        if (!next || next === state.history[index]) return false;
        writeJson(savedPlanFile, next);
        state = { ...state, history: state.history.map((item, offset) => offset === index ? next : item), generatedContent: next };
        return true;
      }
    });
    const result = await controller.generate(fixture.plan.id, fixture.settings);
    if (!result.ok) throw new Error(result.error || 'Script generation failed.');
    summary.checks.generatedAndSaved = true;
    const saved = state.history.find(item => item.id === fixture.plan.id);
    const baseline = JSON.parse(JSON.stringify(saved.data.teachingScripts.at(-1).steps));
    const edited = JSON.parse(JSON.stringify(baseline));
    const editMarker = 'Teacher check: pause here and ask learners to point to the same whole.';
    edited[0].teacherSays += ' ' + editMarker;
    const editResult = controller.saveEdits(saved.id, result.version.id, edited, baseline);
    assert.equal(editResult.ok, true, editResult.error || 'Save edit failed.');
    summary.checks.editSavedWithExpectedBaseline = true;
    const reopened = JSON.parse(fs.readFileSync(savedPlanFile, 'utf8'));
    const reopenedVersion = reopened.data.teachingScripts.find(item => item.id === result.version.id);
    assert.ok(reopenedVersion?.steps[0]?.teacherSays.includes(editMarker), 'Saved edit did not survive serialization and reopen.');
    const unchangedData = { ...reopened.data }; delete unchangedData.teachingScripts;
    assert.equal(JSON.stringify(unchangedData), originalPlan, 'Script workflow changed the original lesson plan.');
    summary.checks.reopenedAndOriginalPlanPreserved = true;
    const scriptText = core.toPlainText(reopenedVersion);
    assert.ok(scriptText.includes(editMarker) && scriptText.includes(fixture.settings.goal), 'Script text export omitted saved wording or goal.');
    const scriptFile = path.join(outputDir, 'script.txt'); fs.writeFileSync(scriptFile, scriptText, 'utf8');
    summary.artifacts['saved-plan.json'] = savedPlanFile; summary.artifacts['script.txt'] = scriptFile;
    summary.checks.scriptTextExport = true;
    summary.lessonExportCharacters = await exportSavedPlan(reopened, outputDir);
    summary.artifacts['lesson-plan.txt'] = path.join(outputDir, 'lesson-plan.txt');
    summary.checks.savedLessonTextExport = true;
    summary.status = 'passed';
    if (options.live) summary.directProviderIntegration = 'passed';
    return summary;
  } catch (error) {
    summary.status = runController.signal.aborted ? 'timed-out' : 'failed';
    summary.error = safeMessage(error, secrets);
    if (!summary.providerCalls && options.live) summary.directProviderIntegration = 'not-completed';
    return summary;
  } finally {
    clearTimeout(timer); controller?.dispose();
    summary.finishedAt = new Date().toISOString(); summary.elapsedMs = Date.now() - started.getTime();
    summary.statuses = statuses;
    writeJson(path.join(outputDir, 'summary.json'), summary);
    console.log(JSON.stringify({ status: summary.status, mode: summary.mode, providerCalls: summary.providerCalls, error: summary.error || null, artifacts: { ...summary.artifacts, 'summary.json': path.join(outputDir, 'summary.json') } }, null, 2));
  }
}

if (require.main === module) {
  let options;
  try { options = parseArgs(process.argv.slice(2)); } catch (error) { console.error(error.message + '\n\n' + HELP); process.exitCode = 2; }
  if (options?.help) console.log(HELP);
  else if (options) run(options).then(summary => { if (!['passed', 'prepared'].includes(summary.status)) process.exitCode = 1; }).catch(error => { console.error('Harness failed before a result could be recorded: ' + safeMessage(error, [])); process.exitCode = 1; });
}
module.exports = { parseArgs, syntheticFixture, run };