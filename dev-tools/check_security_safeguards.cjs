#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const YAML = require('./security/node_modules/yaml');
const ROOT = path.resolve(__dirname, '..');
function selectWorkflows(names) {
  return names.filter((name) => /\.ya?ml$/.test(name)).sort();
}

const MCP_TAG_GUARD = "github.event_name == 'push' && github.repository == 'Apomera/AlloFlow' && startsWith(github.ref, 'refs/tags/mcpb-v')";
const REGISTRY_GUARD = "github.event_name == 'workflow_dispatch' && github.repository == 'Apomera/AlloFlow' && github.ref == 'refs/heads/main'";
const conditionIs = (value, expected) => typeof value === 'string'
  && value.trim().replace(/^\$\{\{\s*([\s\S]*?)\s*\}\}$/, '$1').replace(/\s/g, '') === expected.replace(/\s/g, '');
const needsAre = (job, expected) => JSON.stringify((Array.isArray(job.needs) ? job.needs : [job.needs]).slice().sort()) === JSON.stringify(expected.slice().sort());

function reviewedWriteScopes(workflow, name, job, config, triggers) {
  // These are reviewed publisher boundaries, not filename-based exemptions.
  // PR builds and ordinary/manual validation never receive elevated tokens.
  if (config['runs-on'] !== 'ubuntu-latest' || config.uses || config.container || config.services) return [];
  const on = workflow.on;
  const tagged = (pattern, allowed) => on && typeof on === 'object' && !Array.isArray(on)
    && triggers.every(trigger => allowed.includes(trigger))
    && JSON.stringify(on.push?.tags) === JSON.stringify([pattern]) && !on.push?.branches;
  if (name === 'desktop-release.yml' && job === 'draft-release'
      && tagged('desktop-v*', ['push', 'workflow_dispatch'])
      && conditionIs(config.if, "startsWith(github.ref, 'refs/tags/desktop-v')")
      && needsAre(config, ['windows', 'mac']) && workflow.jobs.windows && workflow.jobs.mac) return ['contents'];
  if (name === 'mcpb-release.yml' && tagged('mcpb-v*', ['push', 'pull_request', 'workflow_dispatch'])
      && conditionIs(config.if, MCP_TAG_GUARD) && workflow.jobs.build) {
    if (job === 'attest' && needsAre(config, ['build'])) return ['id-token', 'attestations'];
    if (job === 'release' && needsAre(config, ['build', 'attest']) && workflow.jobs.attest) return ['contents'];
  }
  if (name === 'mcp-registry-publish.yml' && job === 'publish'
      && triggers.length === 1 && triggers[0] === 'workflow_dispatch'
      && conditionIs(config.if, REGISTRY_GUARD) && needsAre(config, ['verify']) && workflow.jobs.verify
      && on.workflow_dispatch?.inputs?.release_tag?.required === true
      && on.workflow_dispatch?.inputs?.confirmation?.required === true) return ['id-token'];
  return [];
}

function auditsAllScopes(event) {
  return event === 'workflow_dispatch' || event === 'schedule';
}

function isStaticNumericMatrix(expression, config) {
  // Existing shard numbers are safe to interpolate. Dynamic matrices, string
  // values and include overrides must use environment variables like inputs.
  const match = /^\s*matrix\.([a-zA-Z_][\w-]*)\s*$/.exec(expression);
  const matrix = config.strategy?.matrix;
  if (!match || !matrix || typeof matrix !== 'object') return false;
  const values = matrix[match[1]];
  return Array.isArray(values) && values.length > 0 && values.every(Number.isSafeInteger)
    && (!Object.hasOwn(matrix, 'include') || (Array.isArray(matrix.include)
      && matrix.include.every((row) => row && typeof row === 'object'
        && (!Object.hasOwn(row, match[1]) || Number.isSafeInteger(row[match[1]])))));
}

function inspectWorkflow(source, name) {
  const errors = [];
  let workflow;
  try { workflow = YAML.parse(source, { maxAliasCount: 30 }); }
  catch (error) { return ['Invalid workflow YAML: ' + error.message]; }
  if (!workflow || typeof workflow !== 'object') return ['Workflow must be a YAML mapping'];
  if (workflow.permissions?.contents !== 'read') errors.push('Default token permissions must explicitly use contents: read');
  if (Object.values(workflow.permissions || {}).some((value) => !['read', 'none'].includes(value)) || typeof workflow.permissions === 'string') errors.push('Workflow-wide write permissions are forbidden');
  const triggers = typeof workflow.on === 'string' ? [workflow.on] : Array.isArray(workflow.on) ? workflow.on : Object.keys(workflow.on || {});
  if (triggers.includes('pull_request_target')) errors.push('Privileged pull_request_target requires a separate security review');
  const inspectAction = (step) => {
    const action = step.uses;
    if (action && !action.startsWith('./') && !/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/.test(action)) errors.push('Action must use a complete commit SHA: ' + action);
    if (action?.startsWith('actions/checkout@') && ![false, 'false'].includes(step.with?.['persist-credentials'])) errors.push('Checkout must not persist repository credentials');
  };
  for (const [job, config] of Object.entries(workflow.jobs || {})) {
    const reviewed = reviewedWriteScopes(workflow, name, job, config, triggers);
    if (typeof config.permissions === 'string') errors.push('Unexpected job write permission: ' + job);
    for (const [scope, access] of Object.entries(config.permissions || {})) {
      if (!['read', 'none'].includes(access) && !(access === 'write' && reviewed.includes(scope))) errors.push('Unexpected job write permission: ' + job + '/' + scope);
    }
    inspectAction(config);
    for (const step of config.steps || []) {
      inspectAction(step);
      const scripts = [step.run];
      if (step.uses?.startsWith('actions/github-script@')) scripts.push(step.with?.script);
      for (const script of scripts) {
        if (typeof script !== 'string') continue;
        for (const [, expression] of script.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
          if (!isStaticNumericMatrix(expression, config)) {
            errors.push('Pass expressions through environment variables instead of inline script interpolation: ' + job + '/' + (step.name || 'unnamed step'));
          }
        }
      }
    }
    if ([workflow.env, config.env].some((env) => Object.keys(env || {}).some((key) => /^(CSC_|APPLE_|GH_TOKEN$|GITHUB_TOKEN$|NODE_AUTH_TOKEN$|NPM_TOKEN$)/.test(key)))) errors.push('Release credentials must be scoped to the steps that need them');
    if (name === 'mcp-registry-publish.yml' && job === 'publish') {
      if (workflow.defaults || config.defaults) errors.push('Registry OIDC publishing must use the reviewed default working directory and shell');
      for (const step of config.steps || []) {
        if (step.uses && !/^actions\/download-artifact@[a-f0-9]{40}$/.test(step.uses)) errors.push('Registry OIDC publishing must not check out or execute selected repository code');
        if (step['working-directory'] || (step.shell && step.shell !== 'bash')) errors.push('Registry OIDC publishing must use the reviewed default working directory and shell');
        if (typeof step.run === 'string' && /\b(?:node|npm|npx|python[0-9]*|pwsh|powershell|(?:ba|da|z|k|c|tc|fi)?sh|perl|ruby|deno|bun|source|eval|exec)\b|(?:^|[\n;|&])\s*\.\s|\.\/(?!mcp-publisher\b)[\w.-]+/m.test(step.run)) errors.push('Registry OIDC publishing must not execute selected repository code');
      }
    }
    if (name === 'mcpb-release.yml' && job === 'attest') {
      for (const step of config.steps || []) if (step.run || !/^actions\/(?:download-artifact|attest)@[a-f0-9]{40}$/.test(step.uses || '')) errors.push('MCP attestation job may only download and attest already-built artifacts');
    }
  }
  return errors;
}

function auditPlan(changed, full = false) {
  return [
    { directory: 'dev-tools/security', level: 'high' },
    { directory: 'desktop', level: 'high' },
    { directory: 'trailer', level: 'high' },
    { directory: 'desktop/web-app', level: 'low' },
    { directory: 'a11y-audit', level: 'low' },
    { directory: '.', level: 'low' },
    { directory: 'desktop/web-app/functions', level: 'low' },
  ].filter(({ directory }) => {
    const prefix = directory === '.' ? '' : directory + '/';
    return full || changed.some((file) => file === prefix + 'package.json' || file === prefix + 'package-lock.json');
  });
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
  const workflows = selectWorkflows(fs.readdirSync(path.join(ROOT, '.github/workflows')));
  if (!workflows.length) throw new Error('No workflows were found to inspect');
  for (const name of workflows) {
    const errors = inspectWorkflow(fs.readFileSync(path.join(ROOT, '.github/workflows', name), 'utf8'), name);
    if (errors.length) throw new Error(name + ':\n' + errors.join('\n'));
  }
  const full = auditsAllScopes(process.env.GITHUB_EVENT_NAME);
  const plan = auditPlan(full ? [] : changedFiles(), full);
  const failures = [];
  for (const { directory, level } of plan) {
    const args = ['audit', '--package-lock-only', '--ignore-scripts', '--audit-level=' + level];
    const windows = process.platform === 'win32';
    const result = spawnSync(windows ? 'npm.cmd ' + args.join(' ') : 'npm', windows ? [] : args, {
      cwd: path.join(ROOT, directory), stdio: 'inherit', shell: windows, windowsHide: true, timeout: 120000,
    });
    if (result.error || result.status !== 0) failures.push(directory + ': dependency security gate failed or did not complete');
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('Security safeguards passed (' + workflows.length + ' workflows; ' + plan.length + ' dependency scopes audited' + (full ? ' in full-audit mode' : '') + ').');
}

module.exports = { inspectWorkflow, auditPlan, selectWorkflows, auditsAllScopes, MCP_TAG_GUARD, REGISTRY_GUARD };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
