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

  it('prerequisite lines on cards render PROVIDER data, and the judgment framing is present', () => {
    expect(miscSource).toContain('hood.prerequisites.map');
    expect(miscSource).not.toContain('direction.prerequisites');
    expect(miscSource).toContain('Prerequisites (from source data)');
    expect(miscSource).toMatch(/for educator judgment — not certification/);
  });

  it('"Use this direction" seeds the topic and prefills — never silently attaches — the standard', () => {
    expect(miscSource).toMatch(/setSourceTopic\(engine\.directionBrief\(direction\)\)/);
    expect(miscSource).toContain('setStandardInputValue');
    expect(miscSource).toContain('never attaches silently');
  });

  it('uses the CDN-module AI fallback pattern', () => {
    expect(miscSource).toContain("props.callGemini || (typeof window !== 'undefined' ? window.callGemini : null)");
  });
});

describe('the built modules ship it', () => {
  it('launcher is rendered inside SourceGenPanel in the built misc module', () => {
    expect(miscModule).toContain('Surprise me from a standard');
    expect(miscModule).toContain('SurpriseTopicLauncher');
  });

  it('the sidebar module still ships the resolver entry (both surfaces live)', () => {
    expect(sidebarModule).toContain('Surprise me: lessons in this learning space');
    expect(sidebarModule).toMatch(/window\.AlloModules\.SurpriseMeEngine = \(typeof SurpriseMeEngine/);
  });
});
