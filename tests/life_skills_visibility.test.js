import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_lifeskills.js';
const PUBLIC_FILE = 'prismflow-deploy/public/stem_lab/stem_tool_lifeskills.js';
const PUBLIC_ROOT_FILE = 'prismflow-deploy/public/stem_tool_lifeskills.js';
const MODULE_FILES = [
  'stem_lab/stem_lab_module.js',
  'prismflow-deploy/public/stem_lab/stem_lab_module.js',
  'prismflow-deploy/public/stem_lab_module.js',
];
const BUILD_FILE = 'build.js';
const TOOL_ID = 'lifeSkills';

function read(path) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function loadLifeSkills() {
  resetStemLab();
  return loadTool(FILE, TOOL_ID);
}

function renderLifeSkills(state) {
  loadLifeSkills();
  return renderTool(TOOL_ID, state || { lifeSkills: {} });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Life Skills Lab visibility', () => {
  it('keeps source and public copies aligned', () => {
    const source = read(FILE);

    expect(read(PUBLIC_FILE)).toBe(source);
    expect(read(PUBLIC_ROOT_FILE)).toBe(source);
  });

  it('is present in the STEM Lab tool picker and plugin fallback list', () => {
    for (const moduleFile of MODULE_FILES) {
      const source = read(moduleFile);

      expect(source).toContain("id: 'lifeSkills'");
      expect(source).toContain("label: 'Life Skills Lab'");
      expect(source).toContain('lifeSkills: true');
      expect(source).toContain('/* lifeSkills: removed -- see stem_tool_lifeskills.js */');
    }
  });

  it('is included in the deploy plugin file manifest', () => {
    expect(read(BUILD_FILE)).toContain("'stem_lab/stem_tool_lifeskills.js'");
  });

  it('registers and renders the user-facing lab workspace', () => {
    const cfg = loadLifeSkills();
    expect(cfg.title).toBe('Life Skills Lab');
    expect(cfg.category).toBe('Life Skills');
    expect(cfg.ready).toBe(true);

    const html = renderLifeSkills();
    expect(html).toContain('Life Skills Lab');
    expect(html).toContain('Start Here');
    expect(html).toContain('Paycheck');
    expect(html).toContain('Insurance');
    expect(html).toContain('Dental Care');
    expect(html).toContain('Body Care');
    expect(html).toContain('Sleep &amp; Energy');
    expect(html).toContain('Laundry Lab');
  });

  it('renders the Start Here dashboard as the default landing view', () => {
    const html = renderLifeSkills();

    expect(html).toContain('data-lifeskills-overview="true"');
    expect(html).toContain('What do you want to practice today?');
    expect(html).toContain('Money basics');
    expect(html).toContain('Health routines');
    expect(html).toContain('Home confidence');
    expect(html).toContain('10-minute money check');
    expect(html).toContain('Body comfort reset');
    expect(html).toContain('Sleep wind-down');
    expect(html).toContain('Daily care reset');
    expect(html).toContain('data-lifeskills-action-plan="true"');
    expect(html).toContain('My Life Skills Plan');
    expect(html).toContain('Pick one focus and one next step');
  });

  it('renders the dental care Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'dental' } });

    expect(html).toContain('data-lifeskills-dental-care="true"');
    expect(html).toContain('Dental Care Lab');
    expect(html).toContain('Daily routine builder');
    expect(html).toContain('Tooth trouble decisions');
    expect(html).toContain('Dental plan math');
    expect(html).toContain('Snack and drink risk check');
    expect(html).toContain('professional dental guidance');
  });

  it('renders the body care and ergonomics Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'bodycare' } });

    expect(html).toContain('data-lifeskills-body-care="true"');
    expect(html).toContain('Body Care &amp; Ergonomics Lab');
    expect(html).toContain('Comfort check');
    expect(html).toContain('Setup builder');
    expect(html).toContain('Body-care decisions');
    expect(html).toContain('Reset routine cards');
    expect(html).toContain('Educational practice only');
  });

  it('renders the sleep and energy Life Skills addition', () => {
    const html = renderLifeSkills({ lifeSkills: { tab: 'sleep' } });

    expect(html).toContain('data-lifeskills-sleep-energy="true"');
    expect(html).toContain('Sleep &amp; Energy Lab');
    expect(html).toContain('Wind-down routine builder');
    expect(html).toContain('Bedtime calculator');
    expect(html).toContain('Sleep and energy decisions');
    expect(html).toContain('Daytime energy supports');
    expect(html).toContain('Educational practice only');
  });
});
