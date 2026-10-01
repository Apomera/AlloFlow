// PD `branching` activity — deterministic choose-your-path case study.
//
// The adventure-style PD format without the game engine: a module-authored
// decision tree, digest-bound and offline, no AI. Design pins:
//  - Validators reject dangling links, unreachable nodes, graphs with no
//    reachable ending, and ending nodes with choices — an authored graph can
//    never strand a learner.
//  - Completion requires a REAL path: raw.path must start at content.start,
//    follow actual choice edges, and land on an ending. A fabricated raw
//    cannot shortcut it.
//  - branching never gates (score gates stay quiz-only everywhere).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const PdCore = require(resolve(process.cwd(), 'pd_core_module.js'));
const Pipeline = require(resolve(process.cwd(), 'dev-tools/lib/pd_publish_pipeline.cjs'));
const worker = (await import(resolve(process.cwd(), 'catalog/cloudflare-worker/src/index.js').replace(/\\/g, '/'))).default;

function branchingActivity() {
  return {
    id: 'branching-1', type: 'branching', title: 'Head down mid-lesson', gate: { kind: 'none' },
    content: {
      intro: 'Walk this one decision at a time.',
      start: 'n1',
      nodes: {
        n1: {
          text: 'A student puts their head down mid-lesson.',
          choices: [
            { label: 'Quietly check in at their desk', to: 'n2', feedback: 'Connection first.' },
            { label: 'Redirect in front of the class', to: 'n3' },
          ],
        },
        n2: { text: 'They whisper that they did not sleep.', choices: [{ label: 'Offer a reset and a modified task', to: 'end_good' }] },
        n3: { text: 'They shut down further.', choices: [{ label: 'Step back and go private', to: 'n2', feedback: 'Repair is always available.' }] },
        end_good: { text: 'The student re-engages.', ending: true },
      },
    },
  };
}

function moduleWith(activity) {
  return {
    schema_version: 'pd-1.0', kind: 'pd_module',
    metadata: { id: 'branching-demo', version: '1.0.0', language: 'en-US', title: 'Branching demo', topic: 'Behavior', estMinutes: 10, audience: 'educator', license: 'CC-BY-SA-4.0' },
    sections: [{ title: 'Decide', activities: [activity] }],
  };
}

describe('graph validation', () => {
  it('accepts a well-formed decision tree', () => {
    expect(PdCore.validatePdModule(moduleWith(branchingActivity())).ok).toBe(true);
  });

  it('rejects dangling links, unreachable nodes, no-ending graphs, and endings with choices', () => {
    const dangling = branchingActivity();
    dangling.content.nodes.n2.choices[0].to = 'nowhere';
    expect(PdCore.validatePdModule(moduleWith(dangling)).error).toMatch(/existing node/);

    const unreachable = branchingActivity();
    unreachable.content.nodes.island = { text: 'No path leads here.', ending: true };
    expect(PdCore.validatePdModule(moduleWith(unreachable)).error).toMatch(/unreachable/);

    const noEnding = branchingActivity();
    noEnding.content.nodes.end_good = { text: 'Loop back.', choices: [{ label: 'Again', to: 'n1' }] };
    const res = PdCore.validatePdModule(moduleWith(noEnding));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ending/);

    const endingWithChoices = branchingActivity();
    endingWithChoices.content.nodes.end_good = { text: 'Done.', ending: true, choices: [{ label: 'x', to: 'n1' }] };
    expect(PdCore.validatePdModule(moduleWith(endingWithChoices)).error).toMatch(/must not have choices/);

    const badStart = branchingActivity();
    badStart.content.start = 'missing';
    expect(PdCore.validatePdModule(moduleWith(badStart)).error).toMatch(/start/);
  });

  it('rejects a score gate', () => {
    const gated = branchingActivity();
    gated.gate = { kind: 'score', threshold: 0.8 };
    expect(PdCore.validatePdModule(moduleWith(gated)).error).toMatch(/produces no score/);
  });
});

describe('completion: only a real walked path to an ending completes', () => {
  const act = branchingActivity();

  it('start, mid-path, and non-path states are incomplete', () => {
    expect(PdCore.normalizeResult(act, {}).completed).toBe(false);
    expect(PdCore.normalizeResult(act, { path: ['n1'] }).completed).toBe(false);
    expect(PdCore.normalizeResult(act, { path: ['n1', 'n2'] }).completed).toBe(false);
  });

  it('a legal walk to the ending completes (both routes)', () => {
    expect(PdCore.normalizeResult(act, { path: ['n1', 'n2', 'end_good'] }).completed).toBe(true);
    expect(PdCore.normalizeResult(act, { path: ['n1', 'n3', 'n2', 'end_good'] }).completed).toBe(true);
  });

  it('fabricated shortcuts are rejected', () => {
    // Jumping straight to the ending without following edges:
    expect(PdCore.normalizeResult(act, { path: ['end_good'] }).completed).toBe(false);
    // Starting somewhere other than start:
    expect(PdCore.normalizeResult(act, { path: ['n2', 'end_good'] }).completed).toBe(false);
    // An edge that does not exist (n1 -> end_good is not a choice):
    expect(PdCore.normalizeResult(act, { path: ['n1', 'end_good'] }).completed).toBe(false);
    expect(PdCore.normalizeResult(act, { path: ['n1', 'n2', 'end_good'] }).score).toBe(null);
  });
});

describe('worker + pipeline parity', () => {
  function post(body) {
    const store = {};
    return worker.fetch(new Request('https://worker.test/submitPd', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), { PD_SUBMISSIONS: { async put(k, v, o) { store[k] = v; }, async get(k) { return store[k] ?? null; } } });
  }
  function submission(activity) {
    return { pd_module: moduleWith(activity), credit: null, affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true } };
  }

  it('worker accepts a branching module and rejects an unreachable node', async () => {
    expect((await (await post(submission(branchingActivity()))).json()).ok).toBe(true);
    const bad = branchingActivity();
    bad.content.nodes.island = { text: 'Unreachable.', ending: true };
    const res = await (await post(submission(bad))).json();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unreachable/i);
  });

  it('pipeline inventory knows the type and its states', () => {
    expect(Pipeline.PD_STATE_INVENTORY.activityTypes).toContain('branching');
    expect(Pipeline.PD_STATE_INVENTORY.activityStates.branching).toEqual(['start', 'mid-path', 'ending']);
  });
});
