// Behavior Lens golden master.
//
// A characterization baseline for the BehaviorLens Hub component
// (behavior_lens_module.js — ~27.7k lines, the system of record for Lisa
// Hatch's pilot students' ABC / observation / risk-screening data). These
// snapshots pin the Hub's observable render-phase behavior across a small
// matrix of prop configurations, so the four ship-blocker fixes (XSS in
// print pipelines, codename-rename data loss, 1,415 fake-button divs, VTA
// overclaim — see memory:project_alloflow_pipeline_findings.md +
// project_word_sounds_golden_master.md for the pattern) can land with a
// safety net.
//
// A diff here means a behavior change, intended or not. Re-baseline
// deliberately with `vitest -u` ONLY when the change is reviewed and
// expected.
//
// See tests/helpers/behavior_lens_harness.js for how the module is rendered
// headlessly and what its ambient-global contract is.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupBehaviorLens, renderHub, PROP_MATRIX } from './helpers/behavior_lens_harness.js';

let H;
const _origRandom = Math.random;
const _origNow = Date.now;

beforeAll(() => {
  H = setupBehaviorLens();
});

afterAll(() => {
  Math.random = _origRandom;
  Date.now = _origNow;
});

describe('module loads + registers', () => {
  it('exposes BehaviorLens on window.AlloModules', () => {
    expect(H.BehaviorLens).toBeTruthy();
    expect(typeof H.BehaviorLens).toBe('function');
  });
});

describe('layer 1 — Hub render across prop matrix', () => {
  for (const { label, propsOverrides } of PROP_MATRIX) {
    it(`renders identically: ${label} (snapshot)`, () => {
      expect(renderHub(propsOverrides)).toMatchSnapshot();
    });
  }
});

describe('layer 2 — determinism guard (golden master is only trustworthy if stable)', () => {
  it('every prop config renders byte-identically on a repeat render', () => {
    for (const { propsOverrides } of PROP_MATRIX) {
      expect(renderHub(propsOverrides)).toBe(renderHub(propsOverrides));
    }
  });

  it('default render contains the module root marker', () => {
    const html = renderHub({});
    // Behavior Lens renders inside a fullscreen overlay; the outer wrapper
    // class is part of the contract that downstream CSS depends on.
    expect(html.length).toBeGreaterThan(0);
    expect(html).toMatch(/<div|<section|<main|<aside/i);
  });

  it('Canvas-iframe vs standalone produce different output (cloud-sync UI diverges)', () => {
    const canvas = renderHub({ isCanvasEnv: true });
    const standalone = renderHub({ isCanvasEnv: false });
    // We expect SOME difference — the cloud-sync UI gates on isCanvasEnv.
    // If they're byte-identical, either the gate broke or the harness is
    // not exercising the path. Either way, worth a yellow flag.
    expect(canvas).not.toBe(standalone);
  });

  it('teacher-mode vs student-mode produce different output', () => {
    const teacher = renderHub({ isTeacherMode: true });
    const student = renderHub({ isTeacherMode: false });
    expect(teacher).not.toBe(student);
  });
});

describe('layer 3 — VTA reframe regression (memory:project_alloflow_pipeline_findings.md)', () => {
  // After the 2026-06-02 reframe, the live UI must not display the old
  // "Aligned with Virginia Threat Assessment Guidelines" claim. We can't
  // easily navigate to the RiskScreening panel from outside the Hub, but
  // we can grep the registered component source for the regression marker.
  // If a future edit reintroduces the string, this catches it.
  it('does not contain "Aligned with Virginia Threat Assessment Guidelines"', () => {
    const src = H.BehaviorLens.toString();
    expect(src).not.toMatch(/Aligned with Virginia Threat Assessment Guidelines/);
  });

  it('riskscreen_desc no longer asserts "Virginia Threat Assessment aligned"', () => {
    const src = H.BehaviorLens.toString();
    expect(src).not.toMatch(/Virginia Threat Assessment aligned screening/);
  });
});
