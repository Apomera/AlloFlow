#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');

const DEFAULT_BUNDLE = path.resolve(__dirname, '..', 'dist', 'mcpb', 'alloflow-remediation.mcpb');

function extractArchive(bundle, destination) {
  const attempts = process.platform === 'win32'
    ? [
        ['tar.exe', ['-xf', bundle, '-C', destination]],
        ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          'Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force', bundle, destination]],
      ]
    : [['unzip', ['-q', bundle, '-d', destination]], ['tar', ['-xf', bundle, '-C', destination]]];
  const failures = [];
  for (const [command, args] of attempts) {
    const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
    if (!result.error && result.status === 0) return;
    failures.push(command + ': ' + (result.error ? result.error.message : (result.stderr || 'exit ' + result.status).trim()));
  }
  throw new Error('Could not extract MCPB archive. ' + failures.join(' | '));
}

function rpcClient(proc) {
  let buffer = '';
  let stderr = '';
  const pending = new Map();
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => { stderr += chunk; });
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch (_) { continue; }
      const reply = pending.get(message.id);
      if (reply) { pending.delete(message.id); reply(message); }
    }
  });
  return (id, method, params) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Extracted MCPB timed out on ' + method + ': ' + stderr.slice(-1000)));
    }, 20000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(method + ' failed: ' + JSON.stringify(message.error)));
      else resolve(message.result);
    });
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function verifyArtifact(bundlePath = DEFAULT_BUNDLE, options = {}) {
  const bundle = path.resolve(bundlePath);
  if (!fs.existsSync(bundle)) throw new Error('MCPB artifact not found: ' + bundle);
  const extraction = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-mcpb-artifact-'));
  let proc;
  try {
    extractArchive(bundle, extraction);
    const manifest = JSON.parse(fs.readFileSync(path.join(extraction, 'manifest.json'), 'utf8'));
    if (manifest.manifest_version !== '0.4') throw new Error('Unexpected manifest version: ' + manifest.manifest_version);
    if (!Array.isArray(manifest.tools) || manifest.tools.length !== 28) throw new Error('Artifact manifest must advertise exactly 28 tools');
    const entry = path.join(extraction, manifest.server.entry_point);
    if (!fs.existsSync(entry)) throw new Error('Artifact server entry point is missing: ' + manifest.server.entry_point);
    const env = {
      ...process.env,
      ALLOFLOW_MCP_ASSETS_DIR: path.join(extraction, 'assets'),
      ALLOFLOW_MCP_SKILLS_DIR: path.join(extraction, 'skills'),
      ALLOFLOW_MCP_STATE_DIR: path.join(extraction, '.verification-state'),
      ALLOFLOW_MCP_NO_KEY_FILES: '1',
    };
    delete env.GEMINI_API_KEY;
    delete env.NODE_PATH;
    proc = spawn(process.execPath, [entry], { cwd: extraction, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const rpc = rpcClient(proc);
    const initialized = await rpc(1, 'initialize', {
      protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'mcpb-artifact-verifier', version: '1' },
    });
    if (initialized.serverInfo.name !== 'alloflow-remediation') throw new Error('Extracted artifact started the wrong MCP server');
    if (!initialized.capabilities || !initialized.capabilities.extensions || !initialized.capabilities.extensions['io.modelcontextprotocol/skills']) throw new Error('Extracted artifact did not advertise its bundled skill');
    if (!initialized.capabilities.prompts || initialized.capabilities.prompts.listChanged !== false) throw new Error('Extracted artifact did not advertise its stable prompt registry');
    const skillUri = 'skill://alloflow-remediation/alloflow-pdf-remediation/SKILL.md';
    const skillList = await rpc(2, 'skills/list', {});
    if (!skillList.skills || skillList.skills.length !== 1 || skillList.skills[0].uri !== skillUri) throw new Error('Extracted artifact did not list exactly the canonical remediation skill');
    const skillRead = await rpc(3, 'resources/read', { uri: skillUri });
    const skillText = skillRead && skillRead.contents && skillRead.contents[0] && skillRead.contents[0].text;
    if (!skillText || !skillText.includes('## Inspect capabilities before choosing a path')) throw new Error('Extracted artifact returned stale or missing skill content');
    const digest = 'sha256:' + crypto.createHash('sha256').update(Buffer.from(skillText, 'utf8')).digest('hex');
    if (skillList.skills[0].resources[0].digest !== digest) throw new Error('Extracted artifact skill digest does not match its bytes');
    const promptList = await rpc(4, 'prompts/list', {});
    if (!promptList.prompts || promptList.prompts.length !== 1 || promptList.prompts[0].name !== 'remediate_document') throw new Error('Extracted artifact did not list exactly the remediation prompt');
    const prompt = await rpc(5, 'prompts/get', { name: 'remediate_document', arguments: { document: 'the user-attached PDF', goal: 'full accessibility remediation' } });
    const promptText = prompt && prompt.messages && prompt.messages[0] && prompt.messages[0].content && prompt.messages[0].content.text;
    if (!promptText || !promptText.includes('## Inspect capabilities before choosing a path') || !promptText.includes('Document reference: the user-attached PDF')) throw new Error('Extracted artifact prompt is not backed by the canonical skill');
    const listed = await rpc(6, 'tools/list', {});
    if (!listed.tools || listed.tools.length !== 28) throw new Error('Extracted server must serve exactly 28 tools');
    const manifestNames = manifest.tools.map((tool) => tool.name).sort();
    const servedNames = listed.tools.map((tool) => tool.name).sort();
    if (JSON.stringify(manifestNames) !== JSON.stringify(servedNames)) throw new Error('Artifact manifest and extracted server tool registries differ');
    const called = await rpc(7, 'tools/call', { name: 'remediation_capabilities', arguments: {} });
    const capabilities = called.structuredContent;
    if (!capabilities || !capabilities.vendorAssets || !capabilities.vendorAssets.hashVerified) throw new Error('Extracted artifact vendor hashes did not verify');
    if (!Object.values(capabilities.pipelineModulesPresent || {}).every(Boolean)) throw new Error('Extracted artifact is missing remediation pipeline modules');
    if (!capabilities.keylessModeAvailable) throw new Error('Extracted artifact did not expose keyless mode');
    if (options.requirePlaywright && !capabilities.playwrightAvailable) throw new Error('Distribution artifact does not contain a resolvable Playwright runtime');
    return {
      bundle,
      bytes: fs.statSync(bundle).size,
      tools: servedNames.length,
      skills: skillList.skills.length,
      prompts: promptList.prompts.length,
      vendorFiles: capabilities.vendorAssets.files,
      playwrightAvailable: capabilities.playwrightAvailable,
      chromiumInstalled: capabilities.chromiumInstalled,
    };
  } finally {
    if (proc && proc.exitCode === null && proc.signalCode === null) {
      await new Promise((resolveExit) => {
        const timer = setTimeout(resolveExit, 5000);
        proc.once('exit', () => { clearTimeout(timer); resolveExit(); });
        proc.stdin.end();
        proc.kill();
      });
    }
    fs.rmSync(extraction, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const requirePlaywright = args.includes('--require-playwright');
  const bundle = args.find((arg) => arg !== '--require-playwright') || DEFAULT_BUNDLE;
  const result = await verifyArtifact(bundle, { requirePlaywright });
  process.stdout.write('MCPB ARTIFACT: PASS (' + result.tools + ' tools, ' + result.skills + ' skill, ' + result.prompts + ' prompt, ' + result.vendorFiles + ' hashed vendor files, ' + result.bytes + ' bytes)\n');
}

module.exports = { extractArchive, verifyArtifact, DEFAULT_BUNDLE };
if (require.main === module) main().catch((error) => { console.error('[verify-mcpb] ERROR: ' + error.stack); process.exitCode = 1; });
