// STEM Lab tool render goldens.
//
// WHY: the 111 STEM tools had ONLY crash-smoke coverage (check_stem_render.cjs /
// stem_widgets_smoke) — "does it throw?" — and ZERO behaviour pinning. So a
// refactor (e.g. the deferred aquaculture / optics monolith decompositions) or a
// drive-by edit could silently change a tool's render with nothing to catch it.
//
// This pins a deterministic render DIGEST (length + element counts + a content
// hash) for a curated set: the tools changed in the 2026-06-08 refinement pass,
// the new Cellular Automaton Lab, and the two deferred refactor targets
// (aquaculture, optics) so they have a baseline to refactor against. Plus a
// targeted INVARIANT locking the worldbuilder penmanship overclaim fix.
//
// Determinism: Date + Math.random are frozen so the digest is stable run-to-run
// (this is exactly why the sibling smoke harness skipped snapshots). Re-baseline
// an INTENTIONAL render change with `npx vitest -u tests/stem_tool_golden.test.js`.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOLS = [
  // new tool (2026-06-08)
  { file: 'stem_lab/stem_tool_cellular.js', id: 'cellularLab' },
  // new tool (2026-07-02): learner accessibility camera kit
  { file: 'stem_lab/stem_tool_accesslens.js', id: 'accessLens' },
  // changed in the 2026-06-08 refinement pass
  { file: 'stem_lab/stem_tool_music.js', id: 'musicSynth' },
  { file: 'stem_lab/stem_tool_worldbuilder.js', id: 'worldBuilder' },
  { file: 'stem_lab/stem_tool_ecosystem.js', id: 'ecosystem' },
  { file: 'stem_lab/stem_tool_evolab.js', id: 'evoLab' },
  { file: 'stem_lab/stem_tool_geometryworld.js', id: 'geometryWorld' },
  { file: 'stem_lab/stem_tool_geologyexplorer.js', id: 'geologyExplorer' },
  { file: 'stem_lab/stem_tool_spacecolony.js', id: 'spaceColony' },
  { file: 'stem_lab/stem_tool_climateExplorer.js', id: 'climateExplorer' },
  { file: 'stem_lab/stem_tool_behaviorlab.js', id: 'behaviorLab' },
  { file: 'stem_lab/stem_tool_aquarium.js', id: 'aquarium' },
  // deferred refactor targets — golden baseline so a future decomposition can be
  // verified behaviour-preserving
  { file: 'stem_lab/stem_tool_aquaculture.js', id: 'aquacultureLab' },
  { file: 'stem_lab/stem_tool_optics.js', id: 'opticsLab' },
];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    // bucket the length so a 1-char copy tweak doesn't churn, but a structural
    // change (lost panel / doubled tree) does.
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
    sha: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => resetStemLab());

describe('STEM tool render goldens (default state)', () => {
  for (const tool of TOOLS) {
    it('renders + pins a digest for ' + tool.id, () => {
      loadTool(tool.file, tool.id);
      const html = renderTool(tool.id, {});
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(digest(html)).toMatchSnapshot();
    });
  }

  it('digest is deterministic (same render twice → identical sha)', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cellular.js', 'cellularLab');
    const a = digest(renderTool('cellularLab', {}));
    resetStemLab();
    loadTool('stem_lab/stem_tool_cellular.js', 'cellularLab');
    const b = digest(renderTool('cellularLab', {}));
    expect(a.sha).toBe(b.sha);
  });

  it('renders the active Kepler onboarding forecast and science council', () => {
    loadTool('stem_lab/stem_tool_spacecolony.js', 'spaceColony');
    const settlers = Array.from({ length: 6 }, (_, index) => ({ name: 'Settler ' + index, role: 'Scientist', morale: 80, health: 100 }));
    const html = renderTool('spaceColony', {
      colonyPhase: 'playing',
      colony: { name: 'Aurora', planet: 'Kepler-442b', protocol: 'Living Ark' },
      colonyName: 'Aurora',
      colonyMissionProfile: 'ecology',
      colonyMap: { tiles: [], colonyPos: { x: 6, y: 6 } },
      colonyTurn: 1,
      turnPhase: 'dawn',
      dawnData: { turn: 1, income: {}, isFirst: true },
      colonySettlers: settlers,
      colonyStats: { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0, tilesExplored: 6 },
      showCouncil: true,
      showDossier: true,
      showEvidenceBoard: true,
      showFounderForge: true,
      showPolicy: true,
      colonyPolicy: 'scientific',
      colonyPolicyChangedTurn: 0,
      colonyCharterClaim: 'Publish resource allocations and reserve public review time.',
      colonyCharterReasoning: 'Transparency may improve equity, but maintaining the ledger costs materials; revise it if resource pauses become frequent.',
      colonyCharterResponse: 'If material reserves fall below 10, pause the compact and revise toward a cheaper audit.',
      colonyCharterProposal: {
        name: 'Open Ledger Compact',
        principle: 'Publish resource allocations and reserve a science dividend for public review.',
        rule: { trigger: 'always', benefitResource: 'science', benefitAmount: 1, costResource: 'materials', costAmount: 1, socialAxis: 'equity', socialDelta: 1, duration: 4 },
        explanation: 'A transparent ledger benefits public oversight while imposing a visible material and administrative cost.',
        revision: { fromName: 'Public Ledger Trial', reliability: 'resource-constrained', changed: 'lowered the operating burden after repeated affordability pauses.', before: '+1 science / -2 materials / 4 sols', after: '+1 science / -1 materials / 4 sols' },
      },
      colonyCharterReviewId: 'charter-old',
      colonyCharterConclusion: 'The public ledger helped some oversight, but the repeated material pauses made the rule too brittle for this phase.',
      colonyCharterVerdict: 'revise',
      colonyCharterHistory: [{
        id: 'charter-old', name: 'Public Ledger Trial', principle: 'Publish resource allocations for civic review.', enactedTurn: 2, retiredTurn: 6,
        studentClaim: 'Publish every allocation so residents can challenge hidden priorities.',
        reasoning: 'Transparency may raise equity, but it should be revised if resource pauses keep blocking the promised oversight.',
        rule: { trigger: 'always', benefitResource: 'science', benefitAmount: 1, costResource: 'materials', costAmount: 2, socialAxis: 'equity', socialDelta: 1, duration: 4 },
        stats: { turnsObserved: 4, triggerMet: 4, appliedTurns: 1, resourceBlocked: 3, benefitTotal: 1, costTotal: 2, socialTotal: 1 },
      }],
      colonyForgeBrief: 'A light-catching ecological observatory.',
      colonyForgeReasoning: 'The colony needs science, but water should remain an explicit operating cost.',
      colonyForgeSite: { x: 2, y: 3, type: 'ice', name: 'Frost Basin' },
      colonySelTile: { x: 2, y: 3, tile: { type: 'ice', name: 'Frost Basin', explored: true } },
      colonyForgeParentArtifactId: 'artifact-old',
      colonyArtifactReviewId: 'artifact-old',
      colonyArtifactConclusion: 'The site-fit discount worked, but the activation record suggests we should retest during a water shortage.',
      colonyArtifactVerdict: 'revise',
      colonyArtifactArchive: [{
        id: 'artifact-old', name: 'First Ice Lens', kind: 'research', siteAffinity: 'ice', iteration: 1, retiredTurn: 5,
        site: { x: 2, y: 3, type: 'ice', name: 'Frost Basin' },
        reasoning: 'We expected an ice placement to make repeated signal observations affordable.',
        recipe: { name: 'First Ice Lens', parts: [{ shape: 'cylinder', size: [0.7, 1, 0.7], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#67e8f9' }] },
        rule: { title: 'Ice signal baseline', condition: 'always', benefitResource: 'science', benefitAmount: 2, costResource: 'water', costAmount: 1, duration: 4 },
        trialStats: { turnsObserved: 4, conditionMet: 3, conditionMissed: 1, resourceBlocked: 1, appliedTurns: 2, benefitTotal: 6, costTotal: 0, siteFitTurns: 3 },
      }],
      colonyArtifactProposal: {
        name: 'Ice-Lens Habitat', kind: 'research', siteAffinity: 'ice',
        recipe: { name: 'Ice-Lens Habitat', scale: 1, rotY: 0, tint: null, parts: [{ shape: 'cylinder', size: [0.8, 1.1, 0.8], position: [0, 0.6, 0], rotation: [0, 0, 0], color: '#67e8f9' }] },
        rule: { title: 'Cryogenic signal watch', condition: 'always', benefitResource: 'science', benefitAmount: 2, costResource: 'water', costAmount: 1, duration: 4 },
        explanation: 'Place the lens on exposed ice so the colony can compare its signal model against a repeatable field baseline.',
        foundCost: { materials: 8, science: 5 },
      },
      colonyArtifacts: [{
        id: 'artifact-test', name: 'Seed-Loop Observatory', kind: 'ecology', siteAffinity: 'ice', turnsLeft: 3,
        site: { x: 2, y: 3, type: 'ice', name: 'Frost Basin' },
        reasoning: 'We accept a water cost to test the biosphere model with repeatable measurements.',
        recipe: { name: 'Seed-Loop Observatory', parts: [{ shape: 'sphere', size: [0.7, 0.7, 0.7], position: [0, 0.8, 0], rotation: [0, 0, 0], color: '#22c55e' }, { shape: 'torus', size: [0.9, 0.12, 0.12], position: [0, 0.8, 0], rotation: [90, 0, 0], color: '#67e8f9' }] },
        rule: { title: 'Closed-loop observation cycle', condition: 'always', benefitResource: 'science', benefitAmount: 2, costResource: 'water', costAmount: 1, duration: 4 },
      }],
      colonyWorkingHypothesis: 'biosphere',
      colonyFieldEvidence: [
        { id: 'ice-1', turn: 2, source: 'Anomaly at Frost Basin', title: 'The Layered Pulse', observation: 'Ice layers combine periodic climate bands with possible metabolic chemistry.', supports: ['geologic', 'biosphere'] },
        { id: 'sea-1', turn: 3, source: 'Deep Sea Survey', title: 'The Tidal Chorus', observation: 'Underwater pulses travel against prevailing currents between mineral vents.', supports: ['biosphere', 'geologic'] },
      ],
      activeDilemma: {
        id: 'uncataloguedMicrobe',
        source: 'Planetary Council',
        emoji: '\uD83E\uDDA0',
        title: 'The Uncatalogued Microbe',
        description: 'A living sample creates a difficult tradeoff.',
        lesson: 'Controlled tests reduce uncertainty before irreversible action.',
        choices: [{ text: 'Quarantine and test.', values: { ecology: 5 }, equity: 1, happiness: -2, effects: { water: -5, science: 8 }, outcome: 'The colony gains a trustworthy baseline.' }],
      },
    });
    expect(html).toContain('First-sol flight plan');
    expect(html).toContain('Prediction before weather + fate');
    expect(html).toContain('Science Council');
    expect(html).toContain('Three lenses. One planet.');
    expect(html).toContain('Living Ark doctrine');
    expect(html).toContain('Begin day');
    expect(html).toContain('Aurora field campaign');
    expect(html).toContain('Planetary Dossier');
    expect(html).toContain('Survey the basin');
    expect(html).toContain('Claim finding');
    expect(html).toContain('Planetary Decision: The Uncatalogued Microbe');
    expect(html).toContain('Competing goods');
    expect(html).toContain('morale-2');
    expect(html).toContain('water-5');
    expect(html).toContain('science+8');
    expect(html).toContain('Evidence Board: The Kepler Pattern');
    expect(html).toContain('Research question: what process produces repeating signals');
    expect(html).toContain('Distributed biosphere');
    expect(html).toContain('Current working model');
    expect(html).toContain('The Layered Pulse');
    expect(html).toContain('The Tidal Chorus');
    expect(html).toContain('consistent with Planetary resonance');
    expect(html).toContain('Founder Forge');
    expect(html).toContain('Generator permissions');
    expect(html).toContain('Seed-Loop Observatory generated low-poly base design');
    expect(html).toContain('Closed-loop observation cycle');
    expect(html).toContain('+2 science / -0 water');
    expect(html).toContain('Site fit: operating cost reduced by 1');
    expect(html).toContain('Remix validated sculpture');
    expect(html).toContain('Rotate 45°');
    expect(html).toContain('Recolor');
    expect(html).toContain('Affinity: ice');
    expect(html).toContain('Placement: Frost Basin');
    expect(html).toContain('Use selected: Frost Basin');
    expect(html).toContain('Field-test archive');
    expect(html).toContain('Applied 2/4 sols');
    expect(html).toContain('Condition ready 3');
    expect(html).toContain('Resource pauses 1');
    expect(html).toContain('What did the First Ice Lens trial show?');
    expect(html).toContain('Supports working model');
    expect(html).toContain('Revise and retest');
    expect(html).toContain('Publish finding');
    expect(html).toContain('Evidence-led revision');
    expect(html).toContain('Why is that tradeoff justified in this run?');
    expect(html).toContain('Load no-AI prototype');
    expect(html).toContain('Standing Platform');
    expect(html).toContain('Change available in 9 sols');
    expect(html).toContain('+1 science/turn from protected research time.');
    expect(html).toContain('Charter Lab');
    expect(html).toContain('AI permissions:');
    expect(html).toContain('Public amendment draft');
    expect(html).toContain('Open Ledger Compact');
    expect(html).toContain('+1 equity per activation');
    expect(html).toContain('Evidence-linked revision');
    expect(html).toContain('From Public Ledger Trial');
    expect(html).toContain('Before: +1 science / -2 materials / 4 sols');
    expect(html).toContain('After: +1 science / -1 materials / 4 sols');
    expect(html).toContain('Council deliberation');
    expect(html).toContain('Systems desk');
    expect(html).toContain('Commons assembly');
    expect(html).toContain('Evidence council');
    expect(html).toContain('Respond to one council concern before enactment');
    expect(html).toContain('Deliberation cost: 3 science');
    expect(html).toContain('Enact trial rule');
    expect(html).toContain('Completed civic trials');
    expect(html).toContain('Public Ledger Trial');
    expect(html).toContain('Needs review');
    expect(html).toContain('Read: resource-constrained');
    expect(html).toContain('Civic review hearing');
    expect(html).toContain('Was the civic goal worth a rule that the colony could not reliably afford?');
    expect(html).toContain('Supports principle');
    expect(html).toContain('Publish civic finding');
    expect(html).toContain('Draft revision');
  });
});

// ── Targeted invariant: worldbuilder penmanship is qualitative, NOT a score ──
// Locks the 2026-06-08 credibility fix: a Gemini Vision guess must NOT be
// presented as a precise /100 + four /25 measurement. The card lives in a sub-
// view that a single SSR render can't easily reach, so this pins the source of
// the Penmanship Feedback card directly (same source-content pattern the
// behavior_lens golden uses for its template-literal checks).
describe('Kepler Founder Forge bounded generative contract', () => {
  it('clamps sculpture recipes and generated rule parameters before game state', () => {
    loadTool('stem_lab/stem_tool_spacecolony.js', 'spaceColony');
    const forge = window.StemLab.spaceColonyArtifactPure;
    const parts = Array.from({ length: 30 }, (_, index) => ({
      shape: index === 0 ? 'malicious-script' : 'box',
      size: [999, -4, 1], position: [999, -999, 0], rotation: [900, -900, 0], color: index === 1 ? 'javascript:red' : '#ABCDEF',
    }));
    const normalized = forge.normalizeProposal({
      name: 'Overpowered Base', kind: 'unknown-kind', recipe: { parts },
      rule: { condition: 'executeCode', benefitResource: 'science', benefitAmount: 99, costResource: 'science', costAmount: -9, duration: 99 },
      explanation: 'x'.repeat(900),
    });
    expect(normalized.recipe.parts).toHaveLength(23);
    expect(normalized.recipe.parts[0].size).toEqual([4, 0.02, 1]);
    expect(normalized.recipe.parts[0].position).toEqual([4, -4, 0]);
    expect(normalized.recipe.parts[0].color).toBe('#818cf8');
    expect(normalized.kind).toBe('research');
    expect(normalized.siteAffinity).toBe('colony');
    expect(normalized.rule).toMatchObject({ condition: 'always', benefitAmount: 3, costResource: 'energy', costAmount: 0, duration: 6 });
    const rotated = forge.remixProposal(normalized, 'rotate');
    expect(rotated.recipe.rotY).toBe(45);
    let enlarged = normalized;
    for (let i = 0; i < 20; i += 1) enlarged = forge.remixProposal(enlarged, 'bigger');
    expect(enlarged.recipe.scale).toBe(1.5);
    const recolored = forge.remixProposal(normalized, 'recolor');
    expect(recolored.recipe.tint).toMatch(/^#[0-9a-f]{6}$/i);
    expect(normalized.explanation).toHaveLength(500);
    expect(forge.parseProposal('not JSON')).toBeNull();
    expect(forge.buildPrompt('a habitat', 'because evidence matters', 'Sol 4')).toContain('No scripts, formulas, new keys, or executable behavior');
    const run = forge.evaluateRules([
      { name: 'Active Loop', siteAffinity: 'ice', site: { type: 'ice', name: 'Frost Basin' }, turnsLeft: 1, rule: { condition: 'always', benefitResource: 'science', benefitAmount: 2, costResource: 'energy', costAmount: 1 } },
      { name: 'Future Canopy', turnsLeft: 2, rule: { condition: 'terraformAbove25', benefitResource: 'food', benefitAmount: 3, costResource: 'water', costAmount: 2 } },
    ], { science: 10, energy: 5, food: 8, water: 4 }, { terraform: 10, morale: 70, turn: 5 });
    expect(run.resources).toMatchObject({ science: 12, energy: 5, food: 8, water: 4 });
    expect(run.effects.map((effect) => effect.applied)).toEqual([true, false]);
    expect(run.effects[0]).toMatchObject({ siteMatched: true, siteName: 'Frost Basin', baseCostAmount: 1, costAmount: 0 });
    expect(run.effects[0].trialStats).toMatchObject({ turnsObserved: 1, conditionMet: 1, appliedTurns: 1, benefitTotal: 2, costTotal: 0, siteFitTurns: 1 });
    expect(run.active).toHaveLength(1);
    expect(run.active[0]).toMatchObject({ name: 'Future Canopy', turnsLeft: 1, trialStats: { turnsObserved: 1, conditionMet: 0, conditionMissed: 1, resourceBlocked: 0, appliedTurns: 0, benefitTotal: 0, costTotal: 0, siteFitTurns: 0 } });
    expect(run.expired[0]).toMatchObject({ name: 'Active Loop', turnsLeft: 0, retiredTurn: 5 });
    const blocked = forge.evaluateRules([
      { name: 'Dry Reactor', turnsLeft: 1, rule: { condition: 'always', benefitResource: 'science', benefitAmount: 3, costResource: 'water', costAmount: 2 } },
    ], { science: 4, water: 1 }, { turn: 6 });
    expect(blocked.resources).toMatchObject({ science: 4, water: 1 });
    expect(blocked.effects[0]).toMatchObject({ applied: false, conditionMet: true, affordable: false });
    expect(blocked.expired[0].trialStats).toMatchObject({ turnsObserved: 1, conditionMet: 1, resourceBlocked: 1, appliedTurns: 0, benefitTotal: 0, costTotal: 0 });
  });
});
describe('Kepler Charter Lab bounded social-engineering contract', () => {
  it('clamps generated civic rules and evaluates only public parameters', () => {
    loadTool('stem_lab/stem_tool_spacecolony.js', 'spaceColony');
    const charter = window.StemLab.spaceColonyCharterPure;
    const normalized = charter.normalize({
      name: 'Unlimited Executive Power',
      principle: 'x'.repeat(500),
      rule: { trigger: 'executeCode', benefitResource: 'science', benefitAmount: 99, costResource: 'science', costAmount: -9, socialAxis: 'obedience', socialDelta: 0, duration: 99 },
      explanation: 'y'.repeat(900),
    });
    expect(normalized.name).toBe('Unlimited Executive Power');
    expect(normalized.principle).toHaveLength(320);
    expect(normalized.explanation).toHaveLength(500);
    expect(normalized.rule).toMatchObject({ trigger: 'always', benefitResource: 'science', benefitAmount: 2, costResource: 'energy', costAmount: 1, socialAxis: 'equity', socialDelta: -1, duration: 6 });
    expect(normalized.enactCostScience).toBe(4);
    const normalizedRevision = charter.normalize({ name: 'Draft', rule: {}, revision: { fromName: 'x'.repeat(120), reliability: 'resource-constrained', changed: 'z'.repeat(400), before: 'old'.repeat(80), after: 'new'.repeat(80) } });
    expect(normalizedRevision.revision.fromName).toHaveLength(80);
    expect(normalizedRevision.revision.changed).toHaveLength(220);
    expect(normalizedRevision.revision.before).toHaveLength(160);
    expect(charter.parse('not json')).toBeNull();
    expect(charter.buildPrompt('share reserves', 'because public evidence matters', 'Sol 8')).toContain('No scripts, formulas, new triggers, arbitrary state keys, permanent effects, or hidden mechanics');
    const voices = charter.stakeholders(normalized, { resources: { energy: 9, science: 14 }, equity: 55, morale: 68 });
    expect(voices).toHaveLength(3);
    expect(voices.map((voice) => voice.name)).toEqual(['Systems desk', 'Commons assembly', 'Evidence council']);
    expect(voices[0].stance).toContain('reserves are thin');
    expect(voices[2].asks).toContain('fair test');

    const run = charter.evaluate({
      id: 'charter-test', name: 'Equity Reserve', principle: 'Share research gains during inequity.', turnsLeft: 2,
      rule: { trigger: 'equityBelow60', benefitResource: 'science', benefitAmount: 2, costResource: 'materials', costAmount: 1, socialAxis: 'equity', socialDelta: 1, duration: 4 },
    }, { science: 5, materials: 2 }, { equity: 59, morale: 70, terraform: 10, turn: 9 });
    expect(run.resources).toMatchObject({ science: 7, materials: 1 });
    expect(run.equity).toBe(60);
    expect(run.morale).toBe(70);
    expect(run.effect).toMatchObject({ applied: true, triggerMet: true, affordable: true, turnsLeft: 1 });
    expect(run.active).toMatchObject({ id: 'charter-test', turnsLeft: 1, stats: { turnsObserved: 1, triggerMet: 1, appliedTurns: 1, resourceBlocked: 0, benefitTotal: 2, costTotal: 1, socialTotal: 1 } });

    const blocked = charter.evaluate({
      id: 'charter-blocked', name: 'Water Hearings', principle: 'Hold public hearings.', turnsLeft: 1,
      rule: { trigger: 'always', benefitResource: 'science', benefitAmount: 2, costResource: 'water', costAmount: 2, socialAxis: 'morale', socialDelta: -1, duration: 3 },
    }, { science: 4, water: 1 }, { equity: 70, morale: 80, turn: 10 });
    expect(blocked.resources).toMatchObject({ science: 4, water: 1 });
    expect(blocked.morale).toBe(80);
    expect(blocked.effect).toMatchObject({ applied: false, triggerMet: true, affordable: false });
    expect(blocked.active).toBeNull();
    expect(blocked.expired).toMatchObject({ id: 'charter-blocked', retiredTurn: 10, stats: { turnsObserved: 1, triggerMet: 1, appliedTurns: 0, resourceBlocked: 1, benefitTotal: 0, costTotal: 0, socialTotal: 0 } });

    const summary = charter.summarize(Object.assign({}, blocked.expired, { reasoning: 'Revise if hearings repeatedly pause because water is scarce.' }));
    expect(summary).toMatchObject({ name: 'Water Hearings', reliability: 'resource-constrained', triggerMet: 1, resourceBlocked: 1, benefitTotal: 0, socialTotal: 0 });
    expect(summary.question).toContain('could not reliably afford');
    expect(summary.reasoning).toContain('Revise if hearings');
    const revised = charter.revise(Object.assign({}, blocked.expired, { conclusion: 'Water pauses made hearings unreliable.' }));
    expect(revised.name).toBe('Revised Water Hearings');
    expect(revised.rule).toMatchObject({ costResource: 'water', costAmount: 1, benefitResource: 'science' });
    expect(revised.explanation).toContain('affordability pauses');
    expect(revised.revision).toMatchObject({ fromName: 'Water Hearings', reliability: 'resource-constrained', before: '+2 science / -2 water / 3 sols', after: '+2 science / -1 water / 3 sols' });
  });
});
import { readFileSync as _readFileSync } from 'node:fs';
import { resolve as _resolve } from 'node:path';

describe('STEM invariant · worldbuilder penmanship is not an overclaimed score', () => {
  // Extract the Penmanship Feedback card block from the source.
  const src = _readFileSync(_resolve(process.cwd(), 'stem_lab/stem_tool_worldbuilder.js'), 'utf8');
  const start = src.indexOf('// ── Penmanship Feedback Card ──');
  // Bound the block precisely: the card ends at the close button that clears hwResult.
  const end = start !== -1 ? src.indexOf("upd('hwResult', null)", start) : -1;
  const block = (start !== -1 && end !== -1) ? src.slice(start, end) : '';

  it('the Penmanship Feedback card block exists', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('Penmanship Feedback');
  });

  it('shows an "AI estimate" disclaimer and qualitative bands, not /100 or /25', () => {
    expect(block).toMatch(/AI estimate/i);
    expect(block).toMatch(/Legible|Very legible|Developing|Keep practicing/);
    expect(block).toMatch(/Strong|Solid|Growing/);
    // The card must not RENDER a precise validated score — check the string
    // literals that would be emitted (quoted), so an explanatory comment that
    // merely mentions /25 doesn't trip it.
    expect(block).not.toContain("'/100'");
    expect(block).not.toContain("'/25'");
  });

  it('softens the toast/SR announcement (no "score: N out of 100")', () => {
    expect(src).not.toMatch(/Penmanship score: '?\s*\+/);
    expect(src).toContain('Penmanship tips ready');
  });
});

// ── Invariant: the 2026-06-08 AI-gating sweep stays in force ──
// The dominant refinement finding was ungated/auto-fired callGemini (privacy +
// cost for the K-12 pilot). These source-content checks ensure a future edit
// can't silently re-introduce auto-fired AI on a turn loop / timer / render.
function readTool(name) {
  return _readFileSync(_resolve(process.cwd(), 'stem_lab/stem_tool_' + name + '.js'), 'utf8');
}
describe('STEM invariant · AI-gating sweep stays in force', () => {
  it('spacecolony captures aiHintsEnabled and gates its auto-fired turn generators', () => {
    const s = readTool('spacecolony');
    expect(s).toMatch(/var aiHintsEnabled = !!\(ctx && ctx\.aiHintsEnabled\)/);
    // the 5 auto-fired generators each require the gate (planet event + the 4 fanout)
    expect((s.match(/aiHintsEnabled && callGemini/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it('spacecolony preserves its generated opening state and exposes distinct mission profiles', () => {
    const s = readTool('spacecolony');
    expect(s).toContain("turnPhase: 'dawn'");
    expect(s).toContain('mapPickups: initPickups');
    expect(s).toContain('colonyRes: Object.assign({}, missionProfile.start)');
    expect(s).not.toContain("upd('turnPhase', null); upd('actionPoints', 3); upd('fateRoll', null); upd('dawnData', null); upd('mapPickups', {});");
    expect(s).toContain("name: 'Continuity Mission'");
    expect(s).toContain("name: 'Living Ark'");
    expect(s).toContain("name: 'Frontier Foundry'");
    expect(s).toContain("'data-spacecolony-first-sol': 'true'");
    expect(s).toContain("'data-spacecolony-council': 'true'");
    expect(s).toContain('baselineForecast');
    expect(s).toContain('missionProfile.perTurn');
    expect(s).toContain("track: 'Living Systems'");
    expect(s).toContain("requires: ['xenobiology', 'gravimetrics']");
    expect(s).toContain('prereqReady');
    expect(s).toContain("'data-spacecolony-dossier': 'true'");
    expect(s).toContain('campaignChapters');
    expect(s).toContain('colonyCampaignClaims');
    expect(s).toContain('planetaryDecisionDeck');
    expect(s).toContain('colonyDecisionHistory');
    expect(s).toContain('localDecisionTriggered');
    expect(s).toContain("source: 'Planetary Council'");
    expect(s).toContain('choiceEffects');
    expect(s).toContain('authored outcome and lesson remain complete offline');
    expect(s).toContain('anomalyDiscoveryCatalog');
    expect(s).toContain('expeditionOutcomeCatalog');
    expect(s).toContain('colonyFieldEvidence');
    expect(s).toContain('colonyWorkingHypothesis');
    expect(s).toContain("'data-spacecolony-evidence': 'true'");
    expect(s).toContain("'data-spacecolony-founder-forge': 'true'");
    expect(s).toContain('spaceColonyArtifactPure');
    expect(s).toContain('buildColonyArtifactPrompt');
    expect(s).toContain('Founder Forge run mutations');
    expect(s).toContain('evaluateColonyArtifactRules');
    expect(s).toContain('COLONY_ARTIFACT_TERRAINS');
    expect(s).toContain('remixColonyArtifactProposal');
    expect(s).toContain('siteMatched');
    expect(s).toContain('resourceBlocked');
    expect(s).toContain("'data-spacecolony-forge-archive': 'true'");
    expect(s).toContain('colonyForgeParentArtifactId');
    expect(s).toContain('Founder Forge field trial');
    expect(s).toContain('spaceColonyCharterPure');
    expect(s).toContain('evaluateColonyCharterAmendment');
    expect(s).toContain('summarizeColonyCharterTrial');
    expect(s).toContain('buildColonyCharterStakeholders');
    expect(s).toContain('reviseColonyCharterFromTrial');
    expect(s).toContain('Evidence-linked revision');
    expect(s).toContain('proposalRevision.before');
    expect(s).toContain('colonyCharterResponse');
    expect(s).toContain("source: 'Charter Lab civic trial'");
    expect(s).toContain("'data-spacecolony-charter-lab': 'true'");
    expect(s).toContain('charterEffect: charterEffect');
    expect(s).toContain('colonyPolicyChangedTurn');
    expect(s).toContain('artifactEffects: artifactEffects');
    expect(s).not.toContain("callGemini('You are the AI game master for a space colony");
    expect(s).not.toContain("callGemini('You are narrating a space colony expedition");
    expect(s).toContain('newlyExplored2');
    expect(s).toContain("value: d.colonyName || 'New Kepler'");
  });

  it('roadready gates the Coach-Mode 35s loop and the rideshare AI behind aiHintsEnabled', () => {
    const s = readTool('roadready');
    expect(s).toMatch(/var aiHintsEnabled = !!\(ctx && ctx\.aiHintsEnabled\)/);
    expect(s).toMatch(/d\.coachMode && aiHintsEnabled && callGemini/);
    expect(s).toMatch(/aiHintsEnabled && typeof callGemini === 'function'/);
  });

  it('geometryworld NPC translate is gated + explicit (no callGemini auto-fired in render)', () => {
    const s = readTool('geometryworld');
    // the translate button is gated by aiHintsEnabled...
    expect(s).toMatch(/ctx\.aiHintsEnabled && callGemini && el\('button'/);
    // ...and it is invoked from an onClick (doTranslate), not synchronously in render.
    expect(s).toContain('var doTranslate = function');
    expect(s).toMatch(/onClick: doTranslate/);
  });
});

// ── Invariant: music keyboard a11y stays in force ──
describe('STEM invariant · music piano keys remain keyboard-operable', () => {
  const s = _readFileSync(_resolve(process.cwd(), 'stem_lab/stem_tool_music.js'), 'utf8');
  it('piano keys are role=button with tabIndex + Enter/Space key handlers', () => {
    expect(s).toContain("role: 'button', tabIndex: dimmed ? -1 : 0");
    expect(s).toContain('var onKeyDownKey = function');
    expect(s).toMatch(/onKeyDown: onKeyDownKey/);
  });
  it('the XY pad is keyboard-operable (role + arrow-key handler)', () => {
    expect(s).toMatch(/role: 'application', tabIndex: 0/);
    expect(s).toContain("e.key === 'ArrowLeft'");
  });
});
