#!/usr/bin/env node
/**
 * Drive a local stdio MCP server without an MCP client.
 *
 * Answers "is the connector actually working?" on any machine, and is the
 * fastest way to reproduce a tool failure outside Claude Code.
 *
 * Usage (from the repo root):
 *   node mcp-testing/tools/mcp_call.cjs list   <server.cjs>
 *   node mcp-testing/tools/mcp_call.cjs schema <server.cjs> <tool> [tool...]
 *   node mcp-testing/tools/mcp_call.cjs call   <server.cjs> <tool> [argsFile.json] [--timeout ms] [--stderr]
 *
 * Examples:
 *   node mcp-testing/tools/mcp_call.cjs list desktop/mcp/alloflow-remediation-mcp-stdio.cjs
 *   node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs remediation_selftest
 *   node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs pdf_audit args.json --stderr
 *
 * `--stderr` echoes the server's telemetry, which is where the pipeline reports
 * throttling and auth failures. Exit code is non-zero when the tool reports an
 * error, so this is usable as a smoke gate in CI.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const mode = argv[0];
const server = argv[1];

if (!mode || !server || !['list', 'schema', 'call'].includes(mode)) {
  console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1].trim());
  process.exit(2);
}
if (!fs.existsSync(server)) {
  console.error(`Server script not found: ${path.resolve(server)}`);
  console.error('Run this from the repo root, or pass an absolute path.');
  process.exit(2);
}

const rest = argv.slice(2).filter(a => !a.startsWith('--'));
const flag = (name) => argv.includes(`--${name}`);
const flagValue = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const timeoutMs = Number(flagValue('timeout', 1800000));
const showStderr = flag('stderr');

const child = spawn(process.execPath, [server], { stdio: ['pipe', 'pipe', 'pipe'] });
let stdoutBuf = '';
let stderrBuf = '';

const send = (msg) => child.stdin.write(JSON.stringify(msg) + '\n');
const dumpStderr = () => {
  if (showStderr && stderrBuf) console.error('\n----- server stderr -----\n' + stderrBuf.trimEnd());
};
const finish = (code) => { dumpStderr(); child.kill(); process.exit(code); };

child.stderr.on('data', (d) => { stderrBuf += d.toString(); });

child.stdout.on('data', (d) => {
  stdoutBuf += d.toString();
  let nl;
  while ((nl = stdoutBuf.indexOf('\n')) >= 0) {
    const line = stdoutBuf.slice(0, nl);
    stdoutBuf = stdoutBuf.slice(nl + 1);
    if (!line.trim()) continue;

    let msg;
    try { msg = JSON.parse(line); } catch { continue; }

    if (msg.id === 1) {
      const info = (msg.result && msg.result.serverInfo) || {};
      console.error(`connected: ${info.name || 'unknown'} v${info.version || '?'}`);
      if (mode === 'call') {
        const argsFile = rest[1];
        let toolArgs = {};
        if (argsFile) {
          try { toolArgs = JSON.parse(fs.readFileSync(argsFile, 'utf8')); }
          catch (e) { console.error(`Cannot read args file ${argsFile}: ${e.message}`); finish(2); }
        }
        send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: rest[0], arguments: toolArgs } });
      } else {
        send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
      }
      continue;
    }

    if (msg.id !== 2) continue;

    if (msg.error) {
      console.log(JSON.stringify(msg.error, null, 2));
      finish(1);
    }

    if (mode === 'list') {
      const tools = (msg.result && msg.result.tools) || [];
      console.log(`${tools.length} tools`);
      for (const t of tools) console.log('  ' + t.name);
      finish(0);
    }

    if (mode === 'schema') {
      const tools = (msg.result && msg.result.tools) || [];
      const wanted = rest.length ? tools.filter(t => rest.includes(t.name)) : tools;
      for (const t of wanted) {
        console.log(`### ${t.name}\n${t.description || ''}\n`);
        console.log(JSON.stringify(t.inputSchema, null, 2) + '\n');
      }
      finish(0);
    }

    // mode === 'call'
    const result = msg.result || {};
    const payload = result.structuredContent
      || (result.content && result.content[0] && result.content[0].text)
      || result;
    console.log(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    finish(result.isError ? 1 : 0);
  }
});

child.on('error', (e) => { console.error(`Failed to start server: ${e.message}`); process.exit(2); });
child.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited early with code ${code}`);
    dumpStderr();
    process.exit(code);
  }
});

send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'alloflow-mcp-testing', version: '1.0.0' },
  },
});

setTimeout(() => { console.error(`Timed out after ${timeoutMs}ms`); finish(1); }, timeoutMs).unref?.();
