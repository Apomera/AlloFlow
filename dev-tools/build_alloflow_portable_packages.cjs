'use strict';

/**
 * Build or non-destructively verify the sandbox-local AlloFlow Agent Skill.
 *
 * The canonical source lives in agent_skills/alloflow-portable-remediation.
 * Every platform wrapper receives an exact copy. Release ZIP inputs are
 * allowlisted so an unexpected credential, cache, or debug file fails closed.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { makeZip } = require('../desktop/mcp/zip_writer.cjs');

const ROOT = path.resolve(__dirname, '..');
const SKILL_NAME = 'alloflow-portable-remediation';
const SOURCE_SKILL = path.join(ROOT, 'agent_skills', SKILL_NAME);
const OPENAI_PLUGIN = path.join(ROOT, 'plugins', 'alloflow-pdf-remediation');
const CLAUDE_CODE_PLUGIN = path.join(ROOT, 'platform_packages', 'claude-alloflow');
const OPENAI_SKILL = path.join(OPENAI_PLUGIN, 'skills', SKILL_NAME);
const CLAUDE_CODE_SKILL = path.join(CLAUDE_CODE_PLUGIN, 'skills', SKILL_NAME);
const DIST = path.join(ROOT, 'dist', 'portable-remediation');
const ROOT_LICENSE = path.join(ROOT, 'LICENSE');

const SKILL_FILES = [
  'PRIVACY.md',
  'SKILL.md',
  'agents/openai.yaml',
  'references/privacy-and-verification.md',
  'references/repair-plan.schema.json',
  'scripts/alloflow_portable.py',
  'scripts/render_tagged_pdf.cjs',
].sort(ordinalCompare);

const WRAPPERS = [
  {
    kind: 'openai-plugin',
    root: OPENAI_PLUGIN,
    skill: OPENAI_SKILL,
    manifest: '.codex-plugin/plugin.json',
  },
  {
    kind: 'claude-code-plugin',
    root: CLAUDE_CODE_PLUGIN,
    skill: CLAUDE_CODE_SKILL,
    manifest: '.claude-plugin/plugin.json',
  },
];

const GENERATED_TARGETS = new Set(
  [OPENAI_SKILL, CLAUDE_CODE_SKILL, DIST].map((value) => path.resolve(value).toLowerCase()),
);

function ordinalCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(message) {
  throw new Error(`AlloFlow portable package build: ${message}`);
}

function portablePath(value) {
  return value.split(path.sep).join('/');
}

function relativeToRoot(value) {
  return portablePath(path.relative(ROOT, value));
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`${label} is missing: ${relativeToRoot(filePath)}`);
  }
}

function listFiles(directory, base = directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = [];
  const items = fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => ordinalCompare(a.name, b.name));
  for (const item of items) {
    const absolute = path.join(directory, item.name);
    if (item.isSymbolicLink()) {
      fail(`symbolic links are not packaged: ${relativeToRoot(absolute)}`);
    }
    if (item.isDirectory()) {
      entries.push(...listFiles(absolute, base));
    } else if (item.isFile()) {
      entries.push({
        absolute,
        relative: portablePath(path.relative(base, absolute)),
      });
    } else {
      fail(`unsupported filesystem entry: ${relativeToRoot(absolute)}`);
    }
  }
  return entries.sort((a, b) => ordinalCompare(a.relative, b.relative));
}

function assertFileSet(directory, expected, label, { allowMissing = false } = {}) {
  const actual = listFiles(directory).map((item) => item.relative);
  const expectedSorted = [...expected].sort(ordinalCompare);
  const unexpected = actual.filter((name) => !expectedSorted.includes(name));
  const missing = expectedSorted.filter((name) => !actual.includes(name));
  if (unexpected.length) {
    fail(`${label} contains unexpected release input(s): ${unexpected.join(', ')}`);
  }
  if (!allowMissing && missing.length) {
    fail(`${label} is missing release input(s): ${missing.join(', ')}`);
  }
  return { actual, missing, unexpected };
}

function expectedWrapperFiles(wrapper) {
  return [
    wrapper.manifest,
    'LICENSE',
    'PRIVACY.md',
    ...SKILL_FILES.map((name) => `skills/${SKILL_NAME}/${name}`),
  ].sort(ordinalCompare);
}

function assertGeneratedTarget(target) {
  const resolved = path.resolve(target);
  if (!GENERATED_TARGETS.has(resolved.toLowerCase())) {
    fail(`refusing to replace an undeclared generated directory: ${resolved}`);
  }
  if (!resolved.toLowerCase().startsWith(`${ROOT.toLowerCase()}${path.sep}`)) {
    fail(`generated directory escapes the repository: ${resolved}`);
  }
}

function resetGeneratedDirectory(target) {
  assertGeneratedTarget(target);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

function copyFileChecked(source, destination) {
  assertFile(source, 'Release input');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyCanonicalSkill(target) {
  resetGeneratedDirectory(target);
  for (const name of SKILL_FILES) {
    copyFileChecked(path.join(SOURCE_SKILL, ...name.split('/')), path.join(target, ...name.split('/')));
  }
}

function synchronizeWrappers() {
  for (const wrapper of WRAPPERS) {
    assertFileSet(wrapper.root, expectedWrapperFiles(wrapper), `${wrapper.kind} wrapper`, {
      allowMissing: true,
    });
    copyCanonicalSkill(wrapper.skill);
    copyFileChecked(ROOT_LICENSE, path.join(wrapper.root, 'LICENSE'));
    copyFileChecked(path.join(SOURCE_SKILL, 'PRIVACY.md'), path.join(wrapper.root, 'PRIVACY.md'));
  }
}

function compareFiles(left, right, label) {
  assertFile(left, `${label} source`);
  assertFile(right, `${label} generated copy`);
  if (!fs.readFileSync(left).equals(fs.readFileSync(right))) {
    fail(`${label} differs: ${relativeToRoot(right)}`);
  }
}

function readJson(filePath, label) {
  assertFile(filePath, label);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateSharedVersion() {
  const openai = readJson(path.join(OPENAI_PLUGIN, '.codex-plugin', 'plugin.json'), 'OpenAI manifest');
  const claude = readJson(path.join(CLAUDE_CODE_PLUGIN, '.claude-plugin', 'plugin.json'), 'Claude Code manifest');
  const source = fs.readFileSync(path.join(SOURCE_SKILL, 'scripts', 'alloflow_portable.py'), 'utf8');
  const match = source.match(/^VERSION\s*=\s*"([^"]+)"/m);
  if (!match) fail('portable engine VERSION is missing');
  const versions = [openai.version, claude.version, match[1]];
  if (versions.some((value) => typeof value !== 'string' || value !== versions[0])) {
    fail(`version drift across manifests and engine: ${versions.join(', ')}`);
  }
  return versions[0];
}

function validateTrees() {
  assertFile(ROOT_LICENSE, 'Repository license');
  assertFileSet(SOURCE_SKILL, SKILL_FILES, 'Canonical Skill');
  for (const wrapper of WRAPPERS) {
    assertFileSet(wrapper.root, expectedWrapperFiles(wrapper), `${wrapper.kind} wrapper`);
    for (const name of SKILL_FILES) {
      compareFiles(
        path.join(SOURCE_SKILL, ...name.split('/')),
        path.join(wrapper.skill, ...name.split('/')),
        `${wrapper.kind} Skill ${name}`,
      );
    }
    compareFiles(ROOT_LICENSE, path.join(wrapper.root, 'LICENSE'), `${wrapper.kind} license`);
    compareFiles(
      path.join(SOURCE_SKILL, 'PRIVACY.md'),
      path.join(wrapper.root, 'PRIVACY.md'),
      `${wrapper.kind} privacy notice`,
    );
  }
  return validateSharedVersion();
}

function entriesFromFiles(root, names, prefix = '') {
  return [...names].sort(ordinalCompare).map((name) => ({
    name: `${prefix}${portablePath(name)}`,
    data: fs.readFileSync(path.join(root, ...name.split('/'))),
  }));
}

function packageBuffers(version) {
  const skillEntries = entriesFromFiles(SOURCE_SKILL, SKILL_FILES, `${SKILL_NAME}/`);
  skillEntries.push({
    name: `${SKILL_NAME}/LICENSE`,
    data: fs.readFileSync(ROOT_LICENSE),
  });
  skillEntries.sort((a, b) => ordinalCompare(a.name, b.name));

  const openaiFiles = expectedWrapperFiles(WRAPPERS[0]);
  const claudeFiles = expectedWrapperFiles(WRAPPERS[1]);
  return [
    {
      kind: 'agent-skill',
      file: `alloflow-portable-remediation-agent-skill-v${version}.zip`,
      buffer: makeZip(skillEntries),
    },
    {
      kind: 'openai-plugin',
      file: `alloflow-pdf-remediation-openai-plugin-v${version}.zip`,
      buffer: makeZip(entriesFromFiles(OPENAI_PLUGIN, openaiFiles)),
    },
    {
      kind: 'claude-code-plugin',
      file: `alloflow-pdf-remediation-claude-code-plugin-v${version}.zip`,
      buffer: makeZip(entriesFromFiles(CLAUDE_CODE_PLUGIN, claudeFiles)),
    },
  ];
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function packageManifest(version, packages, mode) {
  return {
    schemaVersion: '1.0',
    version,
    mode,
    wroteFiles: mode === 'build',
    canonicalSkill: relativeToRoot(SOURCE_SKILL),
    generatedSkillCopies: [relativeToRoot(OPENAI_SKILL), relativeToRoot(CLAUDE_CODE_SKILL)],
    packages: packages.map(({ kind, file, buffer }) => ({
      kind,
      file,
      bytes: buffer.length,
      sha256: sha256(buffer),
    })),
    bundledVeraPdf: false,
    note: 'The portable core does not implement an AlloFlow document-service client.',
  };
}

function buildTwiceAndAssertDeterministic(version) {
  const first = packageBuffers(version);
  const second = packageBuffers(version);
  for (let index = 0; index < first.length; index += 1) {
    if (first[index].file !== second[index].file || !first[index].buffer.equals(second[index].buffer)) {
      fail(`package output is not deterministic: ${first[index].file}`);
    }
  }
  return first;
}

function run({ check = false } = {}) {
  assertFileSet(SOURCE_SKILL, SKILL_FILES, 'Canonical Skill');
  assertFile(ROOT_LICENSE, 'Repository license');
  for (const wrapper of WRAPPERS) {
    assertFile(path.join(wrapper.root, ...wrapper.manifest.split('/')), `${wrapper.kind} manifest`);
  }

  if (!check) synchronizeWrappers();
  const version = validateTrees();
  const packages = buildTwiceAndAssertDeterministic(version);
  const manifest = packageManifest(version, packages, check ? 'check' : 'build');

  if (!check) {
    resetGeneratedDirectory(DIST);
    for (const item of packages) {
      fs.writeFileSync(path.join(DIST, item.file), item.buffer, { flag: 'wx' });
    }
    fs.writeFileSync(
      path.join(DIST, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { flag: 'wx' },
    );
  }
  return manifest;
}

if (require.main === module) {
  try {
    const manifest = run({ check: process.argv.includes('--check') });
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  SKILL_FILES,
  expectedWrapperFiles,
  packageBuffers,
  run,
};
