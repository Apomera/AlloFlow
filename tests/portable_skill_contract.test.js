import { beforeAll, describe, expect, it } from 'vitest';
import {
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SKILL_NAME = 'alloflow-portable-remediation';
const CANONICAL = resolve(ROOT, 'agent_skills', SKILL_NAME);
const OPENAI_PLUGIN = resolve(ROOT, 'plugins/alloflow-pdf-remediation');
const CLAUDE_PLUGIN = resolve(ROOT, 'platform_packages/claude-alloflow');
let checkReceipt;

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
      version: '0.1.0',
      skills: './skills/',
    });
    expect(openai.description).toMatch(/active file sandbox/i);
    expect(openai.interface.capabilities).toEqual(['Interactive', 'Read', 'Write']);
    expect(openai.interface.defaultPrompt).toEqual(expect.any(Array));
    expect(openai.interface.privacyPolicyURL).toMatch(/^https:\/\//);

    const claude = JSON.parse(readFileSync(join(CLAUDE_PLUGIN, '.claude-plugin/plugin.json'), 'utf8'));
    expect(claude).toMatchObject({
      name: 'alloflow',
      version: '0.1.0',
    });
    expect(claude.description).toMatch(/no AlloFlow document service/i);

    expect(checkReceipt).toMatchObject({
      mode: 'check',
      wroteFiles: false,
      bundledVeraPdf: false,
      version: '0.1.0',
    });
    expect(checkReceipt.packages).toHaveLength(3);
    for (const item of checkReceipt.packages) {
      expect(item.bytes).toBeGreaterThan(500);
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.file).toContain('v0.1.0.zip');
    }
  });
});
