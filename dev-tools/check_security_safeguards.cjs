#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const YAML = require('./security/node_modules/yaml');
const ROOT = path.resolve(__dirname, '..');
// MCP workflows and dependencies are being maintained independently.
const WORKFLOWS = ['desktop-release.yml', 'verify.yml', 'indexnow.yml', 'physics.yml', 'trailer-render.yml', 'security-safeguards.yml'];

function inspectWorkflow(source, name) {
  const errors = [];
  let workflow;
  try { workflow = YAML.parse(source, { maxAliasCount: 30 }); }
  catch (error) { return ['Invalid workflow YAML: ' + error.message]; }
  if (!workflow || typeof workflow !== 'object') return ['Workflow must be a YAML mapping'];
  if (workflow.permissions?.contents !== 'read') errors.push('Default token permissions must explicitly use contents: read');
  if (Object.values(workflow.permissions || {}).some((value) => value === 'write') || workflow.permissions === 'write-all') errors.push('Workflow-wide write permissions are forbidden');
  const triggers = typeof workflow.on === 'string' ? [workflow.on] : Array.isArray(workflow.on) ? workflow.on : Object.keys(workflow.on || {});
  if (triggers.includes('pull_request_target')) errors.push('Privileged pull_request_target requires a separate security review');
  const inspectAction = (step) => {
    const action = step.uses;
    if (action && !action.startsWith('./') && !/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/.test(action)) errors.push('Action must use a complete commit SHA: ' + action);
    if (action?.startsWith('actions/checkout@') && ![false, 'false'].includes(step.with?.['persist-credentials'])) errors.push('Checkout must not persist repository credentials');
  };
  for (const [job, config] of Object.entries(workflow.jobs || {})) {
    if (config.permissions === 'write-all') errors.push('Unexpected job write permission: ' + job);
    for (const [scope, access] of Object.entries(config.permissions || {})) {
      if (access === 'write' && !(name === 'desktop-release.yml' && job === 'draft-release' && scope === 'contents')) errors.push('Unexpected job write permission: ' + job);
    }
    inspectAction(config);
    for (const step of config.steps || []) inspectAction(step);
    if (name === 'desktop-release.yml' && [workflow.env, config.env].some((env) => Object.keys(env || {}).some((key) => /^(CSC_|APPLE_|GH_TOKEN$)/.test(key)))) errors.push('Release credentials must be scoped to the steps that need them');
  }
  return errors;
}

function auditPlan(changed, manual = false) {
  return [
    { directory: 'dev-tools/security', level: 'high' },
    { directory: 'desktop', level: 'high' },
    // Legacy web build tooling still has high findings tracked in RELEASE.md.
    // Keep the existing full audit; this additional gate prevents critical findings.
    { directory: 'desktop/web-app', level: 'critical' },
  ].filter(({ directory }) => manual || changed.some((file) => file === directory + '/package.json' || file === directory + '/package-lock.json'));
}

function changedFiles() {
  const base = process.env.SECURITY_BASE_SHA;
  if (!base || /^0+$/.test(base)) return [];
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('Invalid base commit');
  try { execFileSync('git', ['cat-file', '-e', base + '^{commit}'], { cwd: ROOT, stdio: 'pipe' }); }
  catch { execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', base], { cwd: ROOT, stdio: 'inherit' }); }
  return execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}

function main() {
  for (const name of WORKFLOWS) {
    const errors = inspectWorkflow(fs.readFileSync(path.join(ROOT, '.github/workflows', name), 'utf8'), name);
    if (errors.length) throw new Error(name + ':\n' + errors.join('\n'));
  }
  const plan = auditPlan(changedFiles(), process.env.GITHUB_EVENT_NAME === 'workflow_dispatch');
  for (const { directory, level } of plan) {
    const args = ['audit', '--package-lock-only', '--ignore-scripts', '--audit-level=' + level];
    const windows = process.platform === 'win32';
    const result = spawnSync(windows ? 'npm.cmd ' + args.join(' ') : 'npm', windows ? [] : args, {
      cwd: path.join(ROOT, directory), stdio: 'inherit', shell: windows, windowsHide: true, timeout: 120000,
    });
    if (result.error || result.status !== 0) throw new Error(directory + ': dependency security gate failed or did not complete');
  }
  console.log('Security safeguards passed (' + WORKFLOWS.length + ' non-MCP workflows; ' + plan.length + ' changed dependency scopes audited).');
}

module.exports = { inspectWorkflow, auditPlan };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
