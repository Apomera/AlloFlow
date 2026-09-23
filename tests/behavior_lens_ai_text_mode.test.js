// Behavior Lens AI requests that want prose.
//
// WHY: until 2026-09-23, 22 features that ask the model for prose (the data-quality
// report, home notes and their translations, the intervention plan, progress
// narratives, the IEP prep packet, AlloBot replies, the case-study debrief, the
// student self-check reflection and more) called callGemini(prompt, true). The second
// argument asks the API for application/json, and returns the literal "{}" when no key
// is set, so teachers and students were shown raw JSON or "{}". AlloBot was also sent
// the saved AI analysis as String(object): "[object Object]". The data-quality check
// called every behavior name under 15 characters "very brief", so the tool's own
// defined target behaviors ("Elopement") were flagged.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});

// The same rule the fix used: a JSON-mode call must parse its result as JSON nearby.
function unparsedJsonModeCalls(src) {
  const lines = src.split('\n');
  const out = [];
  lines.forEach((line, i) => {
    if (!/callGemini[A-Za-z]*\([^;]*,\s*true\s*\)/.test(line)) return;
    if (!/JSON\.parse|parseJsonBlobFromText|parseJsonBlob|safeJsonParse|parseAiJson/.test(lines.slice(i, i + 14).join('\n'))) out.push((i + 1) + ': ' + line.trim());
  });
  return out;
}

describe('the source', () => {
  it('every JSON-mode AI call parses JSON; prose is asked for as text', () => {
    expect(unparsedJsonModeCalls(readFileSync('behavior_lens_module.js', 'utf8'))).toEqual([]);
  });
  it('the check can see one (it is not vacuous)', () => {
    expect(unparsedJsonModeCalls("const r = await callGemini(prompt, true);\nsetNote(r);")).toHaveLength(1);
    expect(unparsedJsonModeCalls("const r = await callGemini(prompt, true);\nconst o = JSON.parse(r);")).toHaveLength(0);
  });
});

describe('the data quality checker', () => {
  const entry = behavior => runtime.normalizeAbcEntry({ antecedent: 'Math worksheet handed out', behavior, consequence: 'Teacher redirected to seat', occurredAt: '2026-09-22T14:00:00Z', intensity: 3 }).entry;
  it('asks for its report as text', async () => {
    let mode = 'unset';
    const q = componentHarness('DataQualityChecker', { abcEntries: [entry('Elopement')], observationSessions: [], targetBehaviors: [], callGemini: async (p, jsonMode) => { mode = jsonMode; return 'QUALITY: fine'; }, t: () => undefined, addToast: () => {} });
    await q.all(n => n.type === 'button' && n.props.className && n.props.className.includes('bg-emerald-700'))[0].props.onClick();
    expect(mode).toBe(false);                                                   // old: true (JSON mode)
  });
  it('a defined target behavior with a short name is not "very brief"', () => {
    const targets = [{ id: 'elope', label: 'Elopement', definition: 'Leaves the assigned area without permission for 5 s or more.', aliases: [] }];
    const q = componentHarness('DataQualityChecker', { abcEntries: [entry('Elopement'), entry('Elopement'), entry('hit')], observationSessions: [], targetBehaviors: targets, callGemini: null, t: () => undefined, addToast: () => {} });
    expect(q.text()).toContain('1 records describe the behavior in a few words and do not match a defined target behavior');   // old: 3 "very brief"
  });
});
