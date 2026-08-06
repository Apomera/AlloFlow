// Surprise Me, second entry point: the topic field in SourceGenPanel.
//
// The design rule this file protects: ONE engine, multiple surfaces. The
// grounded prompt and the parser live in AlloModules.SurpriseMeEngine
// (view_sidebar_panels); the topic-field launcher (view_misc_panels) consumes
// it. If either surface grew its own prompt, the grounding discipline could
// drift between them without any test noticing.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let sidebarSource, sidebarModule, miscSource, miscModule;

beforeAll(() => {
  sidebarSource = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
  sidebarModule = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_module.js'), 'utf8');
  miscSource = readFileSync(resolve(process.cwd(), 'view_misc_panels_source.jsx'), 'utf8');
  miscModule = readFileSync(resolve(process.cwd(), 'view_misc_panels_module.js'), 'utf8');
});

describe('one shared engine', () => {
  it('the engine is module-scope in view_sidebar_panels and registered on AlloModules', () => {
    expect(sidebarSource).toContain('const SurpriseMeEngine = {');
    expect(sidebarModule).toContain('window.AlloModules.SurpriseMeEngine');
  });

  it('the resolver panel delegates to the engine instead of inlining the logic', () => {
    for (const call of ['SurpriseMeEngine.buildHood', 'SurpriseMeEngine.buildPrompt', 'SurpriseMeEngine.parseDirections', 'SurpriseMeEngine.directionBrief']) {
      expect(sidebarSource).toContain(call);
    }
  });

  it('the launcher consumes the shared engine — it defines no prompt of its own', () => {
    expect(miscSource).toContain('window.AlloModules.SurpriseMeEngine');
    for (const fn of ['engine.buildHood', 'engine.buildPrompt', 'engine.parseDirections', 'engine.directionBrief']) {
      expect(miscSource).toContain(fn);
    }
    // the grounding prompt exists ONLY in the engine's home file
    expect(miscSource).not.toContain('do not claim prerequisite relationships');
    expect(sidebarSource).toContain('do not claim prerequisite relationships beyond those listed');
  });
});

describe('launcher grounding and honesty', () => {
  it('renders nothing without engine, provider, and AI backend', () => {
    expect(miscSource).toMatch(/if \(!engine \|\| !provider \|\| !surpriseAi\) return null;/);
  });

  it('resolution goes through the provider, with ambiguous/not-found/error surfaced, never auto-picked', () => {
    expect(miscSource).toContain('provider.resolveStandard(query)');
    expect(miscSource).toContain("resolution.status === 'ambiguous'");
    expect(miscSource).toContain("resolution.status === 'not-found'");
    expect(miscSource).toContain('Multiple exact matches');
  });

  it('directions render through the SHARED comparison component, and the judgment framing is present', () => {
    // No launcher-local card markup: the comparison (and its provider-data
    // prerequisite line) lives in SurpriseMeCompare, in the engine home file.
    expect(miscSource).toContain('window.AlloModules.SurpriseMeCompare');
    expect(miscSource).not.toContain('direction.prerequisites');
    expect(miscSource).toMatch(/for educator judgment — not certification/);
  });

  it('"Use this direction" seeds the teacher-edited brief and prefills — never silently attaches — the standard', () => {
    expect(miscSource).toMatch(/editedBrief\.trim\(\)\) \? editedBrief : engine\.directionBrief\(direction\)/);
    expect(miscSource).toContain('setSourceTopic(brief)');
    expect(miscSource).toContain('setStandardInputValue');
    expect(miscSource).toContain('never attaches silently');
  });

  it('uses the CDN-module AI fallback pattern', () => {
    expect(miscSource).toContain("props.callGemini || (typeof window !== 'undefined' ? window.callGemini : null)");
  });
});

describe('the built modules ship it', () => {
  it('launcher is rendered inside SourceGenPanel in the built misc module', () => {
    // The heading dropped "from a standard" when the launcher started
    // accepting a skill or a learning goal as well as a code. Assert the
    // launcher SHIPS rather than pinning the wording, which is copy.
    expect(miscModule).toContain('Surprise me');
    expect(miscModule).toContain('SurpriseTopicLauncher');
  });

  it('the built launcher takes any seed, not only a code', () => {
    // resolveStandard already fell back to a ranked search and returned its
    // matches under status 'not-found'; the panel rendered a dead-end message
    // and discarded them. These pin the widened door so it cannot narrow again.
    expect(miscModule).toContain('a skill, or a goal');
    expect(miscModule).toContain('Closest standards in the loaded snapshots');
  });

  it('the built launcher fills the engine\'s interests slot', () => {
    // buildPrompt has always emitted "Student interests to consider:", and the
    // sidebar surface always passed them. This one did not, so the same engine
    // produced a thinner prompt here — exactly the drift the shared module
    // exists to prevent.
    expect(miscModule).toContain('{ gradeLevel, studentInterests }');
  });

  it('the sidebar module still ships the resolver entry (both surfaces live)', () => {
    expect(sidebarModule).toContain('Surprise me: lessons in this learning space');
    expect(sidebarModule).toMatch(/window\.AlloModules\.SurpriseMeEngine = \(typeof SurpriseMeEngine/);
  });

  it('the comparison component is registered and carried by the built module', () => {
    expect(sidebarModule).toMatch(/window\.AlloModules\.SurpriseMeCompare = \(typeof SurpriseMeCompare/);
    expect(sidebarModule).toContain('Pin to edit & use');
  });
});
