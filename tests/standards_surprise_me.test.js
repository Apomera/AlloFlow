// Surprise Me v1: graph-grounded lesson directions in the resolver.
//
// Division of labor is the design's spine, and these pins hold each seam:
// the GRAPH supplies what is true (source edges from the reviewed snapshots),
// the MODEL proposes what might be worthwhile inside that space, the TEACHER
// chooses. The model must never be the source of graph facts.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let source, module_;

beforeAll(() => {
  source = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
  module_ = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_module.js'), 'utf8');
});

describe('grounding discipline', () => {
  it('the prompt confines the model to the supplied graph context', () => {
    expect(source).toContain('do not claim prerequisite relationships beyond those listed');
    expect(source).toContain('the only relationships you may reference');
  });

  it('the neighborhood comes from provider calls, not model output', () => {
    for (const fn of ['getPrerequisites', 'getRelatedStandards', 'getLearningComponents']) {
      expect(source, `neighborhood must query ${fn}`).toContain(fn);
    }
  });

  it('the prerequisite line on each card renders PROVIDER data', () => {
    // surpriseHood.prerequisites, never direction.prerequisites — the model
    // cannot invent an edge that then renders as if it were source data.
    expect(source).toContain('surpriseHood.prerequisites.map');
    expect(source).not.toContain('direction.prerequisites');
    expect(source).toContain('Prerequisites (from source data)');
  });

  it('directions carry the judgment framing, not certification', () => {
    expect(source).toContain('for educator judgment — not certification');
  });
});

describe('robustness', () => {
  it('uses the CDN-module AI fallback so no host prop change is needed', () => {
    expect(source).toContain("props.callGemini || (typeof window !== 'undefined' ? window.callGemini : null)");
  });

  it('renders nothing when no AI backend is reachable', () => {
    expect(source).toMatch(/localResolution\.match && surpriseAi && \(/);
  });

  it('model output is clamped and validated, and failure is a toast not a crash', () => {
    expect(source).toContain('.slice(0, 3)');
    expect(source).toContain("throw new Error('no usable directions')");
    expect(source).toContain('Could not propose lesson directions');
  });

  it('"Use this direction" attaches the RESOLVED standard context', () => {
    // the existing handleUseResolvedStandard path — same as the manual button,
    // so downstream generation sees an identical, attributed standardsContext
    expect(source).toMatch(/useSurpriseDirection[\s\S]{0,200}handleUseResolvedStandard\(localResolution\)/);
  });
});

describe('the built module ships it', () => {
  it('carries the feature (source was rebuilt, not just edited)', () => {
    for (const needle of ['Surprise me: lessons in this learning space', 'Propose 3 directions']) {
      expect(module_, `module missing: ${needle}`).toContain(needle);
    }
    // esbuild emits the em dash as — in built output — accept either form
    expect(module_).toMatch(/for educator judgment (—|\\u2014) not certification/);
  });
});
