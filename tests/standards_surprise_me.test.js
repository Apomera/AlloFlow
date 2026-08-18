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

  it('the prerequisite line renders PROVIDER data, once, below the comparison', () => {
    // hood.prerequisites (provider data via hood={surpriseHood}), never
    // direction.prerequisites — the model cannot invent an edge that then
    // renders as if it were source data.
    expect(source).toContain('hood.prerequisites.map');
    expect(source).toContain('hood={surpriseHood}');
    expect(source).not.toContain('direction.prerequisites');
    expect(source).toContain('Prerequisites (from source data)');
  });

  it('three directions render as a comparison with pin-to-edit (open question 6)', () => {
    // Aligned dimensions, pin one, edit the brief — and the TEACHER'S edit
    // wins over the model proposal when the direction is used.
    expect(source).toContain('function SurpriseMeCompare(props)');
    expect(source).toContain('Pin to edit & use');
    expect(source).toContain('aria-pressed={isPinned}');
    // directionBrief now takes an optional translator as its 2nd argument (the
    // engine is module scope and has no `t` of its own). The teacher's edit
    // still wins over the generated brief, which is what this pins.
    expect(source).toMatch(/editedBrief\.trim\(\)\) \? editedBrief : SurpriseMeEngine\.directionBrief\(direction, t\)/);
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
    expect(source).toContain('fallbackDirections');
    expect(source).toContain('AI directions were unavailable, so AlloFlow prepared three editable starters.');
  });

  it('"Use this direction" attaches the RESOLVED standard context', () => {
    // the existing handleUseResolvedStandard path — same as the manual button,
    // so downstream generation sees an identical, attributed standardsContext
    expect(source).toMatch(/useSurpriseDirection[\s\S]{0,200}handleUseResolvedStandard\(localResolution\)/);
  });

  it('seeds the topic directly when the host passes setSourceTopic', () => {
    // ANTI passes setSourceTopic to the panel; the direction brief lands in
    // sourceTopic with no paste step. The clipboard path survives as fallback
    // for a host that has not been updated.
    expect(source).toMatch(/typeof setSourceTopic === 'function'[\s\S]{0,200}setSourceTopic\(brief\)/);
    expect(source).toContain('topic seeded with this direction');
    expect(source).toContain('navigator.clipboard');
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const srcMirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');
    for (const [name, text] of [['ANTI', anti], ['ANTI src mirror', srcMirror]]) {
      expect(text, `${name} must pass setSourceTopic + callGemini to UniversalSettingsPanel`)
        .toMatch(/useEmojis,[\s\S]{0,240}setSourceTopic, callGemini,/);
    }
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
