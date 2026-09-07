'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const source = fs.readFileSync(path.join(root, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
const startAt = source.indexOf('function startAgentRun(');
const endAt = source.indexOf('\nfunction requireJob(', startAt);
const respondAt = source.indexOf('  remediation_agent_respond(args) {');
const respondEnd = source.indexOf('\n  async remediation_agent_cancel(', respondAt);
let documentVersion = 1;
const context = vm.createContext({
  crypto, path, AbortController, Date, console,
  busyWith: null, Driver: {},
  persistAgentRun() {}, log() {}, flushAgentWaiters() {},
  sha256File: async () => 'a'.repeat(64),
  checkpointOptionsDigest: () => 'b'.repeat(64),
  checkpointEngineDigest: () => 'c'.repeat(64),
  findValidCompletionManifest: async () => null,
  assertAllowedKeys() {}, invalidParams: message => new Error(message),
  requireAgentRun: args => {
    assert.equal(args.run_id, context.currentRun.runId);
    return context.currentRun;
  },
  remediateOneFile: async (_file, _outDir, options) => {
    const text = await options.modelBridge({ kind: 'audit', prompt: 'Document version ' + documentVersion, parts: [] });
    return { acceptedReply: text };
  },
});
vm.runInContext(source.slice(startAt, endAt) + '\nthis.startAgentRun = startAgentRun;', context);
vm.runInContext('this.handlers = {' + source.slice(respondAt, respondEnd) + '};', context);
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const first = context.startAgentRun('first.pdf', 'out', {}, { skipExisting: false });
  while (!first.pending.size) await tick();
  const staleRequest = [...first.pending.values()][0];
  const staleReply = { run_id: first.runId, request_id: staleRequest.requestId, text: 'Answer for document version 1' };
  first.abortController.abort(new Error('Simulated disconnect/cancel'));
  await first.settled;
  documentVersion = 2;
  const resumed = context.startAgentRun('first.pdf', 'out', {}, { skipExisting: false, resumeId: first.runId });
  context.currentRun = resumed;
  while (!resumed.pending.size) await tick();
  const currentRequest = [...resumed.pending.values()][0];
  const response = context.handlers.remediation_agent_respond(staleReply);
  await resumed.settled;
  assert.equal(staleRequest.requestId, currentRequest.requestId);
  assert.notEqual(staleRequest.prompt, currentRequest.prompt);
  assert.equal(response.ok, true);
  assert.equal(resumed.result.acceptedReply, staleReply.text);
  console.log(JSON.stringify({
    demonstrated: 'Stale reply from an earlier attempt is accepted after resume',
    runId: resumed.runId,
    previousRequest: { id: staleRequest.requestId, prompt: staleRequest.prompt },
    resumedRequest: { id: currentRequest.requestId, prompt: currentRequest.prompt },
    accepted: response.ok,
    finalAcceptedReply: resumed.result.acceptedReply,
    note: 'Executes current startAgentRun and remediation_agent_respond source with a stubbed model-dependent pipeline; no files, browser, model or network are used.'
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
