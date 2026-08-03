import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import JSZip from 'jszip';

const ROOT = process.cwd();
const SKILL_NAME = 'alloflow-portable-remediation';
const CANONICAL = resolve(ROOT, 'agent_skills', SKILL_NAME);
const OPENAI_PLUGIN = resolve(ROOT, 'plugins/alloflow-pdf-remediation');
const CLAUDE_PLUGIN = resolve(ROOT, 'platform_packages/claude-alloflow');
let checkReceipt;
const requireCjs = createRequire(import.meta.url);
const { packageBuffers } = requireCjs(resolve(ROOT, 'dev-tools/build_alloflow_portable_packages.cjs'));
const PYTHON = process.env.ALLOFLOW_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
// The single source of truth for the portable version is the engine; the
// builder enforces that both plugin manifests match it, so the contract test
// derives the expectation instead of pinning a copy that drifts.
const ENGINE_VERSION = readFileSync(join(CANONICAL, 'scripts/alloflow_portable.py'), 'utf8')
  .match(/^VERSION = "([^"]+)"/m)[1];
const scratchDirectories = [];

async function extractZip(buffer, destination) {
  const archive = await JSZip.loadAsync(buffer);
  const root = resolve(destination);
  for (const [name, entry] of Object.entries(archive.files)) {
    if (entry.dir) continue;
    const target = resolve(destination, ...name.split('/'));
    const rel = relative(root, target);
    if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
      throw new Error('ZIP entry escaped the clean-install directory: ' + name);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, await entry.async('nodebuffer'));
  }
}

function files(directory, base = directory) {
  return readdirSync(directory)
    .sort()
    .flatMap((name) => {
      const absolute = join(directory, name);
      return statSync(absolute).isDirectory()
        ? files(absolute, base)
        : [relative(base, absolute).replaceAll('\\', '/')];
    });
}

function expectTreeEqual(source, generated) {
  const sourceFiles = files(source);
  expect(files(generated)).toEqual(sourceFiles);
  for (const name of sourceFiles) {
    expect(readFileSync(join(generated, name))).toEqual(readFileSync(join(source, name)));
  }
}

beforeAll(() => {
  const stdout = execFileSync(
    process.execPath,
    ['dev-tools/build_alloflow_portable_packages.cjs', '--check'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  checkReceipt = JSON.parse(stdout);
});

afterEach(() => {
  while (scratchDirectories.length) rmSync(scratchDirectories.pop(), { recursive: true, force: true });
});

describe('AlloFlow portable skill distribution contract', () => {
  it('uses one canonical skill in both platform wrappers', () => {
    expectTreeEqual(CANONICAL, join(OPENAI_PLUGIN, 'skills', SKILL_NAME));
    expectTreeEqual(CANONICAL, join(CLAUDE_PLUGIN, 'skills', SKILL_NAME));
  });

  it('keeps the public default local, review-scoped, and one-prompt usable', () => {
    const skill = readFileSync(join(CANONICAL, 'SKILL.md'), 'utf8');
    expect(skill).toMatch(/Do not call\s+an AlloFlow server, remote MCP, Gemini, web service/i);
    expect(skill).toMatch(/one-prompt workflow/i);
    expect(skill).toMatch(/Never say "WCAG compliant," "PDF\/UA compliant," "Section 508 compliant,"/i);
    expect(skill).toMatch(/Remote fallback is explicit opt-in/i);
    expect(skill).toContain('alloflow_portable.py" remediate');
  });

  it('has valid host manifests and a non-mutating deterministic check receipt', () => {
    const openai = JSON.parse(readFileSync(join(OPENAI_PLUGIN, '.codex-plugin/plugin.json'), 'utf8'));
    expect(openai).toMatchObject({
      name: 'alloflow-pdf-remediation',
      version: ENGINE_VERSION,
      skills: './skills/',
    });
    expect(openai.description).toMatch(/active file sandbox/i);
    expect(openai.interface.capabilities).toEqual(['Interactive', 'Read', 'Write']);
    expect(openai.interface.defaultPrompt).toEqual(expect.any(Array));
    expect(openai.interface.privacyPolicyURL).toMatch(/^https:\/\//);

    const claude = JSON.parse(readFileSync(join(CLAUDE_PLUGIN, '.claude-plugin/plugin.json'), 'utf8'));
    expect(claude).toMatchObject({
      name: 'alloflow',
      version: ENGINE_VERSION,
    });
    expect(claude.description).toMatch(/no AlloFlow document service/i);

    expect(checkReceipt).toMatchObject({
      mode: 'check',
      wroteFiles: false,
      bundledVeraPdf: false,
      version: ENGINE_VERSION,
    });
    expect(checkReceipt.packages).toHaveLength(3);
    for (const item of checkReceipt.packages) {
      expect(item.bytes).toBeGreaterThan(500);
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.file).toContain(`v${ENGINE_VERSION}.zip`);
    }
  });

  it('runs from an extracted clean-install ZIP with no account or model key', async () => {
    const build = packageBuffers(checkReceipt.version).find((item) => item.kind === 'agent-skill');
    const cleanRoot = mkdtempSync(join(tmpdir(), 'alloflow-portable-clean-install-'));
    scratchDirectories.push(cleanRoot);
    await extractZip(build.buffer, cleanRoot);

    const skillRoot = join(cleanRoot, SKILL_NAME);
    const engine = join(skillRoot, 'scripts', 'alloflow_portable.py');
    const env = { ...process.env };
    for (const name of [
      'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
      'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID',
    ]) delete env[name];

    const output = execFileSync(PYTHON, [engine, 'capabilities', '--json'], {
      cwd: cleanRoot,
      env,
      encoding: 'utf8',
    });
    const capabilities = JSON.parse(output);
    expect(capabilities).toMatchObject({
      alloflowServiceUsed: false,
      modelApiKeyRequired: false,
      networkPolicy: 'deny',
      semanticHtml: true,
      staticHtmlAudit: true,
    });
    expect(readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')).toMatch(/no paid Worker/i);
    expect(existsSync(join(skillRoot, 'LICENSE'))).toBe(true);
  });});
