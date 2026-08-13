// Surprise Me resilience: both entry points use the same JSON-capable engine
// and degrade to useful, graph-grounded starter directions when AI output is
// malformed or unavailable. These tests execute the SHIPPED engine so an edit
// to the JSX source without rebuilding the CDN module cannot pass.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

let engine;
let sidebarSource;
let miscSource;

function loadShippedEngine() {
  const moduleText = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_module.js'), 'utf8');
  const noop = () => {};
  const React = {
    createElement: () => null,
    createContext: () => ({ Provider: noop, Consumer: noop }),
    Fragment: Symbol('Fragment'),
    useCallback: noop,
    useContext: noop,
    useEffect: noop,
    useMemo: noop,
    useRef: noop,
    useState: noop,
  };
  const window = { AlloIcons: {}, AlloModules: {}, React, ReactDOM: {} };
  vm.runInNewContext(moduleText, {
    console: { log: noop, warn: noop },
    document: {},
    navigator: {},
    React,
    window,
  }, { filename: 'view_sidebar_panels_module.js' });
  return window.AlloModules.SurpriseMeEngine;
}

function direction(number) {
  return {
    title: `Direction ${number}`,
    phenomenon: `A familiar phenomenon ${number}`,
    essentialQuestion: `What explains pattern ${number}?`,
    activity: `Students model and compare example ${number}.`,
    evidence: `An evidence-based explanation ${number}.`,
    udlSupports: ['Offer a visual model', 'Allow spoken or written responses'],
    tone: 'Informative',
    vocabulary: ['pattern', 'model', 'evidence'],
  };
}

function between(text, start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  expect(from, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(to, `missing end marker: ${end}`).toBeGreaterThan(from);
  return text.slice(from, to);
}

beforeAll(() => {
  sidebarSource = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
  miscSource = readFileSync(resolve(process.cwd(), 'view_misc_panels_source.jsx'), 'utf8');
  engine = loadShippedEngine();
});

describe('the shipped shared parser accepts structured JSON responses', () => {
  it('accepts the preferred { directions: [...] } envelope', () => {
    const parsed = engine.parseDirections(JSON.stringify({
      directions: [direction(1), direction(2), direction(3)],
    }));
    expect(parsed).toHaveLength(3);
    expect(parsed.map((item) => item.title)).toEqual(['Direction 1', 'Direction 2', 'Direction 3']);
  });

  it('keeps accepting the legacy top-level array', () => {
    const parsed = engine.parseDirections(JSON.stringify([direction(1), direction(2), direction(3)]));
    expect(parsed).toHaveLength(3);
  });

  it('accepts a fenced object response', () => {
    const raw = '```json\n' + JSON.stringify({ directions: [direction(1), direction(2), direction(3)] }) + '\n```';
    const parsed = engine.parseDirections(raw);
    expect(parsed).toHaveLength(3);
  });
});

describe('deterministic starter directions', () => {
  it('returns three complete, valid directions for the same standard every time', () => {
    const match = {
      id: 'ccss.math.3.nf.a.3',
      code: '3.NF.A.3',
      label: 'Explain equivalence of fractions and compare fractions.',
    };
    const hood = {
      prerequisites: [{ code: '2.G.A.3', label: 'Partition shapes into equal shares.' }],
      leadsTo: [{ code: '4.NF.A.1', label: 'Explain fraction equivalence.' }],
      related: [],
      components: [],
      dataset: { provider: 'Common Core' },
    };

    const first = engine.fallbackDirections(match, hood);
    const second = engine.fallbackDirections(match, hood);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(new Set(first.map((item) => item.title)).size).toBe(3);
    for (const item of first) {
      for (const field of ['title', 'phenomenon', 'essentialQuestion', 'activity', 'evidence']) {
        expect(item[field], `${field} must be present`).toEqual(expect.any(String));
        expect(item[field].trim(), `${field} must not be empty`).not.toBe('');
      }
      expect(item.udlSupports.length).toBeGreaterThanOrEqual(2);
      expect(item.udlSupports.length).toBeLessThanOrEqual(3);
      expect(engine.TONES).toContain(item.tone);
      expect(item.vocabulary.length).toBeGreaterThanOrEqual(3);
      expect(item.vocabulary.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('both proposal entry points use JSON mode and recover without a dead end', () => {
  it('the Universal Settings resolver requests JSON and catches to fallback + ready + info', () => {
    const handler = between(sidebarSource, 'const runSurpriseMe = async () => {', 'const useSurpriseDirection');
    expect(handler).toMatch(/await\s+surpriseAi\([\s\S]*?,\s*true,\s*false,\s*0\.8\)/);
    const recovery = handler.slice(handler.lastIndexOf('catch (error)'));
    expect(recovery).toContain('SurpriseMeEngine.fallbackDirections(');
    expect(recovery).toContain("setSurpriseState('ready')");
    expect(recovery).toMatch(/addToast\([\s\S]*?,\s*'info'\)/);
    expect(recovery).not.toContain("setSurpriseState('error')");
  });

  it('the topic launcher requests JSON and catches to the same fallback + ready + info contract', () => {
    const handler = between(miscSource, 'const proposeFor = async (match) => {', '// A surprise the teacher');
    expect(handler).toMatch(/await\s+surpriseAi\([\s\S]*?,\s*true,\s*false,\s*0\.8\)/);
    const recovery = handler.slice(handler.lastIndexOf('catch (error)'));
    expect(recovery).toContain('engine.fallbackDirections(');
    expect(recovery).toContain("setSurpriseState('ready')");
    expect(recovery).toMatch(/addToast\([\s\S]*?,\s*'info'\)/);
    expect(recovery).not.toContain("setSurpriseState('error')");
  });
});

describe('the launcher follows the visible target-level control', () => {
  it('SourceGenPanel passes sourceLevel, not the unrelated global grade level', () => {
    const panelStart = miscSource.indexOf('function SourceGenPanel(props) {');
    expect(panelStart).toBeGreaterThanOrEqual(0);
    const panel = miscSource.slice(panelStart);
    expect(panel).toMatch(/<SurpriseTopicLauncher[^>]*gradeLevel=\{sourceLevel\}/);
    expect(panel).not.toMatch(/<SurpriseTopicLauncher[^>]*gradeLevel=\{gradeLevel\}/);
  });
});
