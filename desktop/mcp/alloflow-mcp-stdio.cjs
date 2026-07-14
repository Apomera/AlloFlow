#!/usr/bin/env node
/**
 * AlloFlow Agent Core — local stdio MCP server (proof of concept).
 * Task 4 of docs/CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md.
 *
 * Deliberately SDK-free: the MCP stdio transport is newline-delimited
 * JSON-RPC 2.0, and hand-rolling it keeps the boundary visible while the
 * contracts are young (an SDK can replace this file without touching the
 * Agent Core). Exposes ONLY the read-only first slice:
 *
 *   capabilities        — validated CapabilityManifest for this deployment
 *   blueprint_validate  — contract-validate a Blueprint (normalized result)
 *   artifact_validate   — contract-validate an Artifact envelope
 *
 * Safety properties:
 *   - stdio only; no network listener of any kind.
 *   - stdout carries ONLY protocol messages; all logging goes to stderr.
 *   - All tool inputs are schema-checked and re-validated by the Agent Core
 *     contracts (fail closed); tool names/annotations come from the same
 *     classification table the Connectors Directory requires.
 *   - No secrets: the manifest is contract-validated, and secret-like fields
 *     anywhere in inputs are rejected by the contract layer.
 *   - No write tools in this slice, so no audit log yet; the audit hook
 *     lands with the first draft-writing tool.
 *
 * Manifest: honest-by-default (no capabilities advertised). Set
 * ALLOFLOW_MCP_MANIFEST_PATH to a JSON CapabilityManifest to advertise real
 * local providers; an invalid file falls back to the empty manifest.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const Contracts = require(path.join(__dirname, '..', '..', 'agent_core_contracts_module.js'));

const SERVER_INFO = { name: 'alloflow-agent-core', title: 'AlloFlow Agent Core (local)', version: '0.1.0' };
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_LINE_CHARS = 4000000;

function log(msg) {
  process.stderr.write('[alloflow-mcp] ' + msg + '\n');
}

// ── capability manifest ────────────────────────────────────────────────────

function emptyManifest() {
  return {
    schemaVersion: Contracts.SCHEMA_VERSION,
    deploymentMode: 'desktop-local',
    text: { available: false, providers: [] },
    vision: { available: false, providers: [] },
    imageGeneration: { available: false, providers: [] },
    imageEditing: { available: false, providers: [] },
    speech: { tts: false, asr: false },
    webSearch: { available: false },
    catalog: { read: false, stage: false },
    permissions: ['artifact:read', 'artifact:draft']
  };
}

function loadManifest() {
  const fallback = Contracts.validateCapabilityManifest(emptyManifest()).value;
  const p = process.env.ALLOFLOW_MCP_MANIFEST_PATH;
  if (!p) return fallback;
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const report = Contracts.validateCapabilityManifest(parsed);
    if (report.ok) { log('manifest loaded from ' + path.basename(p)); return report.value; }
    log('manifest at ALLOFLOW_MCP_MANIFEST_PATH failed validation (' + report.errors.map((e) => e.code).join(', ') + '); using empty manifest');
  } catch (e) {
    log('manifest unreadable (' + e.message + '); using empty manifest');
  }
  return fallback;
}

const MANIFEST = loadManifest();

// ── tool registry (first slice only) ───────────────────────────────────────

function toolEntry(name, description, inputSchema) {
  const annotations = Contracts.getMcpAnnotations(name);
  if (!annotations) throw new Error('Tool "' + name + '" missing from the classification table');
  return { name, title: annotations.title, description, inputSchema, annotations };
}

const TOOLS = [
  toolEntry(
    'capabilities',
    'Report which AI modalities, permissions, and catalog operations this AlloFlow deployment provides. Call this first to learn what the workspace can do. Read-only; never returns secrets.',
    { type: 'object', properties: {}, additionalProperties: false }
  ),
  toolEntry(
    'blueprint_validate',
    'Validate a lesson Blueprint against the versioned AlloFlow contract. Returns ok/errors/warnings, the normalized Blueprint (analysis-first/lesson-plan-last ordering), and the capabilities the plan requires. Read-only; performs no generation.',
    {
      type: 'object',
      properties: { blueprint: { type: 'object', description: 'A schemaVersion 1.0 Blueprint object.' } },
      required: ['blueprint'],
      additionalProperties: false
    }
  ),
  toolEntry(
    'artifact_validate',
    'Validate an AlloFlow artifact envelope (a generated resource or an AlloPack) against the versioned contract. Read-only.',
    {
      type: 'object',
      properties: { artifact: { type: 'object', description: 'A schemaVersion 1.0 Artifact envelope.' } },
      required: ['artifact'],
      additionalProperties: false
    }
  )
];

function reportPayload(report) {
  return {
    ok: report.ok,
    errors: report.errors || [],
    warnings: report.warnings || [],
    value: report.ok ? report.value : null
  };
}

const TOOL_HANDLERS = {
  capabilities() {
    return MANIFEST;
  },
  blueprint_validate(args) {
    if (!args || typeof args.blueprint !== 'object' || args.blueprint === null || Array.isArray(args.blueprint)) {
      throw invalidParams('arguments.blueprint must be an object');
    }
    const payload = reportPayload(Contracts.validateBlueprint(args.blueprint));
    if (payload.ok) payload.requiredCapabilities = payload.value.requiredCapabilities;
    return payload;
  },
  artifact_validate(args) {
    if (!args || typeof args.artifact !== 'object' || args.artifact === null || Array.isArray(args.artifact)) {
      throw invalidParams('arguments.artifact must be an object');
    }
    return reportPayload(Contracts.validateArtifact(args.artifact));
  }
};

// ── JSON-RPC plumbing ──────────────────────────────────────────────────────

function invalidParams(message) {
  const e = new Error(message);
  e.rpcCode = -32602;
  return e;
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

let initialized = false;

function handleRequest(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize': {
      const requested = params && params.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.indexOf(requested) !== -1 ? requested : SUPPORTED_PROTOCOL_VERSIONS[0];
      initialized = true;
      sendResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'AlloFlow Agent Core, read-only first slice. Call `capabilities` to discover what this deployment provides, then use `blueprint_validate` / `artifact_validate` to check work against the versioned contracts. Nothing here generates content or spends quota.'
      });
      return;
    }
    case 'ping':
      sendResult(id, {});
      return;
    case 'tools/list':
      sendResult(id, { tools: TOOLS });
      return;
    case 'tools/call': {
      const name = params && params.name;
      const handler = TOOL_HANDLERS[name];
      if (!handler) { sendError(id, -32602, 'Unknown tool: ' + String(name)); return; }
      try {
        const structured = handler((params && params.arguments) || {});
        sendResult(id, {
          content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
          isError: false
        });
      } catch (e) {
        if (e && e.rpcCode) { sendError(id, e.rpcCode, e.message); return; }
        // Tool execution failure — reported in-band per MCP so the model can react.
        sendResult(id, {
          content: [{ type: 'text', text: 'Tool failed: ' + (e && e.message ? e.message : 'unknown error') }],
          isError: true
        });
      }
      return;
    }
    default:
      sendError(id, -32601, 'Method not found: ' + String(method));
  }
}

function handleMessage(line) {
  if (!line.trim()) return;
  if (line.length > MAX_LINE_CHARS) { sendError(null, -32600, 'Message too large'); return; }
  let msg;
  try { msg = JSON.parse(line); }
  catch (_) { sendError(null, -32700, 'Parse error'); return; }
  if (!msg || msg.jsonrpc !== '2.0') { sendError(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid request'); return; }
  if (msg.id === undefined || msg.id === null) {
    // Notification — never respond. notifications/initialized and
    // notifications/cancelled are expected; others are ignored.
    return;
  }
  handleRequest(msg);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  try { handleMessage(line); }
  catch (e) { log('unexpected error: ' + e.message); }
});
rl.on('close', () => { log('stdin closed; exiting'); process.exit(0); });

log('ready (stdio only, first-slice read-only tools: ' + TOOLS.map((t) => t.name).join(', ') + ')');
