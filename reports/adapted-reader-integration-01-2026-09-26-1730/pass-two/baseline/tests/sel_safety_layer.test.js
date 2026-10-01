// Unit contracts for the SEL safety layer (sel_hub/sel_safety_layer.js) —
// the highest-stakes code in the SEL Hub. Pins the 2026-06-09 honesty fixes:
//
//  1. OUTAGE HONESTY: an AI outage is reported as unassessed:true ("couldn't
//     check"), never scored as TIER_0 ("checked: safe"). safeCoach then tells
//     the student the check-in didn't run (with resources), and a local
//     regex-critical hit still gets the full Tier-3 crisis response — even
//     with the AI completely absent (callGemini null).
//  2. VERDICT-LINE PARSING: tier tokens / FALSE_ALARM are trusted only on the
//     response's first line, so a rationale like "nothing critical here" or
//     "not a false alarm" can no longer flip the tier.
//  3. HONEST PROMISES: the consent screen and safety disclosure state only
//     what each mode actually does — solo/Canvas copy never claims an adult
//     will be notified (no code path delivers that); live copy promises an
//     alert (a flag), never the student's words.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { React, ReactDOMServer } from './helpers/sel_tool_harness.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const h = React.createElement;
const render = (vnode) => ReactDOMServer.renderToStaticMarkup(vnode);

beforeAll(() => {
  // Load the REAL safety layer IIFE against the jsdom window.
  new Function(readFileSync(resolve(process.cwd(), 'sel_hub/sel_safety_layer.js'), 'utf8'))();
});

beforeEach(() => {
  delete window.__alloShared;
});

// callGemini stub: route by prompt marker. assessSafety's three prompts carry
// distinct markers; anything else is the coach prompt.
function geminiStub({ assessor1, assessor2, confirmation, coach }) {
  return (prompt) => {
    if (/clinical risk assessor/.test(prompt)) return assessor1();
    if (/duty-to-protect/.test(prompt)) return assessor2();
    if (/flagged as potentially concerning/.test(prompt)) return (confirmation || (() => Promise.resolve('FALSE_ALARM\nn/a')))();
    return (coach || (() => Promise.resolve('Here for you.')))();
  };
}

describe('assessSafety — outage honesty (unassessed, never fake-safe)', () => {
  it('both assessors unreachable → unassessed:true, not a TIER_0 verdict', async () => {
    const cg = geminiStub({ assessor1: () => Promise.reject(new Error('down')), assessor2: () => Promise.reject(new Error('down')) });
    const r = await window.SelHub.assessSafety('I feel sad today', 'middle', 'journal', cg);
    expect(r.unassessed).toBe(true);
    expect(r.tier).toBe(0);
    expect(r.rationale).toMatch(/unavailable/i);
  });

  it('one assessor down, the other answers → assessed (not unassessed)', async () => {
    const cg = geminiStub({ assessor1: () => Promise.reject(new Error('down')), assessor2: () => Promise.resolve('SAFE\nNormal emotional processing.') });
    const r = await window.SelHub.assessSafety('I feel sad today', 'middle', 'journal', cg);
    expect(r.unassessed).toBeUndefined();
    expect(r.tier).toBe(0);
  });
});

describe('assessSafety — verdict-line parsing (rationale words cannot flip the tier)', () => {
  it("a TIER_0 verdict whose rationale contains 'critical' stays tier 0", async () => {
    const cg = geminiStub({
      assessor1: () => Promise.resolve('TIER_0\nNothing critical here, normal processing.'),
      assessor2: () => Promise.resolve('SAFE\nNo concern at all.'),
    });
    const r = await window.SelHub.assessSafety('my test went badly', 'middle', 'journal', cg);
    expect(r.tier).toBe(0); // pre-fix: whole-text /CRITICAL/ scored this 3
  });

  it("a confirmation whose rationale contains 'false alarm' does NOT clear a real flag", async () => {
    const cg = geminiStub({
      assessor1: () => Promise.resolve('TIER_2\nOngoing bullying described.'),
      assessor2: () => Promise.resolve('CONCERN\nBeing harmed by peers.'),
      confirmation: () => Promise.resolve('YES_TIER_2\nThis is not a false alarm.'),
    });
    const r = await window.SelHub.assessSafety('they keep shoving me every day', 'middle', 'journal', cg);
    expect(r.tier).toBe(2); // pre-fix: whole-text /FALSE_ALARM/ cleared it to 1
  });

  it('a first-line FALSE_ALARM verdict still clears a tier-2 flag', async () => {
    const cg = geminiStub({
      assessor1: () => Promise.resolve('TIER_2\nPossible concern.'),
      assessor2: () => Promise.resolve('MONITOR\nLow distress.'),
      confirmation: () => Promise.resolve('FALSE_ALARM\nNormal emotional processing.'),
    });
    const r = await window.SelHub.assessSafety('I was nervous about the recital', 'middle', 'journal', cg);
    expect(r.tier).toBe(1);
  });
});

describe('safeCoach — no AI at all (callGemini null)', () => {
  it('regex-critical message still gets the full crisis response + flag', async () => {
    window.__alloShared = { SafetyContentChecker: { check: (m) => (/hurt myself/.test(m) ? [{ severity: 'critical', category: 'self_harm', match: 'hurt myself' }] : []) } };
    const flags = [];
    const r = await window.SelHub.safeCoach({ studentMessage: 'I want to hurt myself', callGemini: null, band: 'middle', toolId: 'journal', onSafetyFlag: (f) => flags.push(f) });
    expect(r.showCrisis).toBe(true);
    expect(r.tier).toBe(3);
    expect(r.response).toContain('988');           // crisis resources, not a cheery dead-end
    expect(flags.length).toBeGreaterThan(0);       // the local regex flag still fired
  });

  it('benign message without AI → plain unable-to-connect, no crisis framing', async () => {
    window.__alloShared = { SafetyContentChecker: { check: () => [] } };
    const r = await window.SelHub.safeCoach({ studentMessage: 'what is a good study plan', callGemini: null, band: 'middle', toolId: 'journal' });
    expect(r.tier).toBe(0);
    expect(r.showCrisis).toBe(false);
    expect(r.response).not.toContain('988');
  });
});

describe('safeCoach — AI present but safety assessment unreachable', () => {
  it('tells the student the check-in did not run, with resources (middle band)', async () => {
    window.__alloShared = { SafetyContentChecker: { check: () => [] } };
    const cg = geminiStub({ assessor1: () => Promise.reject(new Error('down')), assessor2: () => Promise.reject(new Error('down')), coach: () => Promise.resolve('That sounds hard.') });
    const r = await window.SelHub.safeCoach({ studentMessage: 'rough day', coachPrompt: 'You are a kind coach', callGemini: cg, band: 'middle', toolId: 'journal' });
    expect(r.response).toMatch(/check-in could not run/i);
    expect(r.response).toContain('988');
    expect(r.showCrisis).toBe(false);
  });

  it('elementary variant gives the trusted-adult line without a hotline number', async () => {
    window.__alloShared = { SafetyContentChecker: { check: () => [] } };
    const cg = geminiStub({ assessor1: () => Promise.reject(new Error('down')), assessor2: () => Promise.reject(new Error('down')), coach: () => Promise.resolve('That sounds hard.') });
    const r = await window.SelHub.safeCoach({ studentMessage: 'rough day', coachPrompt: 'You are a kind coach', callGemini: cg, band: 'elementary', toolId: 'journal' });
    expect(r.response).toMatch(/check-in could not run/i);
    expect(r.response).toMatch(/trusted adult/i);
  });

  it('unassessed + regex-critical escalates to the full Tier-3 crisis response', async () => {
    window.__alloShared = { SafetyContentChecker: { check: (m) => (/hurt myself/.test(m) ? [{ severity: 'critical', category: 'self_harm', match: 'hurt myself' }] : []) } };
    const cg = geminiStub({ assessor1: () => Promise.reject(new Error('down')), assessor2: () => Promise.reject(new Error('down')), coach: () => Promise.resolve('I hear you.') });
    const r = await window.SelHub.safeCoach({ studentMessage: 'I want to hurt myself', coachPrompt: 'You are a kind coach', callGemini: cg, band: 'middle', toolId: 'journal' });
    expect(r.tier).toBe(3);
    expect(r.showCrisis).toBe(true);
    expect(r.response).toContain('988');
  });
});

describe('consent screen — promises match the mode (the CRISIS-1 fix)', () => {
  it('solo/Canvas: never claims an adult will be told; says no adult is auto-notified', () => {
    const html = render(window.SelHub.renderConsentScreen(h, 'middle', () => {}));
    expect(html).not.toMatch(/will be told|will be notified/i);
    expect(html).toMatch(/no adult is automatically notified/i);
    expect(html).toMatch(/cannot notify an adult/i);
    expect(html).toContain('988');
  });

  it('solo elementary: tell-a-trusted-adult framing, no false rescue promise', () => {
    const html = render(window.SelHub.renderConsentScreen(h, 'elementary', () => {}));
    expect(html).not.toMatch(/will be told|will be notified/i);
    expect(html).toMatch(/cannot tell an adult for you/i);
    expect(html).toMatch(/tell a trusted adult right away/i);
  });

  it('live session: promises an alert (a flag), explicitly not the words', () => {
    const html = render(window.SelHub.renderConsentScreen(h, 'middle', () => {}, 'ABC123'));
    expect(html).toMatch(/alert/i);
    expect(html).toMatch(/not your words/i);
    expect(html).not.toMatch(/will be told|will be notified/i);
  });
});

describe('safety disclosure — honest in both modes (the SEL-PRIV-3 fix)', () => {
  it('solo: no longer claims the conversation stays on the device; discloses the AI service', () => {
    const html = render(window.SelHub.renderSafetyDisclosure(h, 'middle', null));
    expect(html).not.toMatch(/stays on your device/i);
    expect(html).toMatch(/sent to the AI service/i);
    expect(html).toMatch(/No adult is notified automatically/i);
  });

  it('live: discloses teacher visibility, the alert (not words), and the AI service', () => {
    const html = render(window.SelHub.renderSafetyDisclosure(h, 'middle', 'ABC123'));
    expect(html).toMatch(/live session/i);
    expect(html).toMatch(/alert, not your words/i);
    expect(html).toMatch(/sent to the AI service/i);
  });
});

describe('crisis resources — regression pins', () => {
  it('renderCrisisResources still carries 988 + Crisis Text Line', () => {
    const html = render(window.SelHub.renderCrisisResources(h, 'middle'));
    expect(html).toContain('988');
    expect(html).toContain('741741');
  });
});
