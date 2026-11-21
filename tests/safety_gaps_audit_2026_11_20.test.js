// Safety gaps found by the 2026-11-20 feature-inventory audit (FEATURE_INVENTORY.md §5.9.1):
//
// 1. AI Literacy Lab sent student free text to the AI unchecked from two surfaces (Prompt Craft
//    live workshop `runLive`, When-to-Use-AI coach `runMyCoach`); the temperature playground was
//    checked for the critical tier only and fired no flag. All three now go through one
//    render-scoped `aiSafetyGate` (shared SEL gate when loaded, else the same regex checker).
// 2. Anxiety Toolkit's check-in asks directly about suicidal thoughts; a "yes" showed a hardcoded
//    card but fired no flag and the answer stayed in saved tool data. A "yes" now fires the
//    on-device onSafetyFlag pipeline once, renders the shared crisis block (without nesting a
//    second role="alert"), and the answer is cleared when the student leaves the check-in.
// 3. Coordinate Grid's AI tutor (askAITutor) now gates the question the same way as (1).
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const LLM = 'stem_lab/stem_tool_llm_literacy.js';
const ANX = 'sel_hub/sel_tool_anxietytoolkit.js';

// ------------------------------------------------------------------ AI Literacy Lab
describe('AI Literacy Lab: every student-text AI surface is safety-gated', () => {
    const src = read(LLM);

    function extractGate() {
        const start = src.indexOf('function aiSafetyGate(');
        const end = src.indexOf('var AI_SAFETY_PAUSE_TEXT', start);
        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThan(start);
        // eslint-disable-next-line no-new-func
        return (ctx, win) => new Function('ctx', 'window', src.slice(start, end) + '\nreturn aiSafetyGate;')(ctx, win);
    }
    const checkerReturning = (flags) => ({ __alloShared: { SafetyContentChecker: { check: () => flags } } });

    it('blocks critical, nudges high, continues otherwise, and fires onSafetyFlag (fallback checker)', () => {
        const make = extractGate();
        const onSafetyFlag = vi.fn();
        const crit = make({ onSafetyFlag }, checkerReturning([{ severity: 'high' }, { severity: 'critical', category: 'self_harm' }]));
        expect(crit('anything', 'prompt_craft_live')).toEqual({ action: 'block', severity: 'critical' });
        expect(onSafetyFlag).toHaveBeenCalledTimes(1);
        expect(onSafetyFlag.mock.calls[0][0]).toMatchObject({ severity: 'critical', source: 'stem_llmLiteracy_prompt_craft_live', aiGenerated: false });
        expect(make({}, checkerReturning([{ severity: 'high' }]))('x', 's')).toEqual({ action: 'nudge', severity: 'high' });
        expect(make({}, checkerReturning([]))('x', 's').action).toBe('continue');
        expect(make({}, {})('x', 's').action).toBe('continue');
    });

    it('prefers the shared SEL Hub gate when it is loaded', () => {
        const make = extractGate();
        const safeRehearseCheck = vi.fn(() => ({ action: 'block', severity: 'critical' }));
        const onSafetyFlag = () => {};
        const gate = make({ onSafetyFlag }, { SelHub: { safeRehearseCheck } });
        expect(gate('hi', 'udl_coach')).toEqual({ action: 'block', severity: 'critical' });
        expect(safeRehearseCheck).toHaveBeenCalledWith('hi', { toolId: 'llmLiteracy_udl_coach', onSafetyFlag });
    });

    const section = (from, to) => {
        const a = src.indexOf(from);
        const b = src.indexOf(to, a);
        expect(a).toBeGreaterThan(0);
        expect(b).toBeGreaterThan(a);
        return src.slice(a, b);
    };

    it('gates the temperature playground, Prompt Craft live run and When-to-Use-AI coach before calling the AI', () => {
        const play = section('var runPlayTemp = useCallback', 'callGemini(playPrompt');
        expect(play).toContain("aiSafetyGate(playPrompt, 'temperature_playground')");
        expect(play).toContain("_gate.action === 'block'");
        const live = section('var runLive = useCallback', 'callGemini(userPrompt');
        expect(live).toContain("aiSafetyGate(userPrompt, 'prompt_craft_live')");
        expect(live).toContain("gate.action === 'block'");
        const coach = section('function runMyCoach()', 'callGemini(meta');
        expect(coach).toContain("aiSafetyGate(mySit.trim() + '\\n' + mySkill.trim(), 'udl_coach')");
        expect(coach).toContain("gate.action === 'block'");
    });

    it('has no AI call this suite has not reviewed (a new one needs a safety decision)', () => {
        // Preset-only prompts: tempDemo.prompt, g.question (hallucination gallery), pair.weak/strong.
        // Student text: playPrompt, userPrompt, meta (interpolates mySit/mySkill) — all gated above.
        const firstArgs = Array.from(src.matchAll(/callGemini\(\s*([A-Za-z_.]+)\s*,/g), (m) => m[1]);
        expect(new Set(firstArgs)).toEqual(new Set(['tempDemo.prompt', 'playPrompt', 'g.question', 'pair.weak', 'pair.strong', 'userPrompt', 'meta']));
    });

    it('keeps the deployed copies identical to the source', () => {
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, LLM))).toBe(src);
        }
    });
});

// ------------------------------------------------------------------ Coordinate Grid
// 3. Coordinate Grid's AI tutor put the student's free-text question into the prompt unchecked.
describe('Coordinate Grid: the AI tutor question is safety-gated', () => {
    const CG = 'stem_lab/stem_tool_coordgrid.js';
    const src = read(CG);

    function extractGate() {
        const start = src.indexOf('var tutorSafetyGate = function(text) {');
        const end = src.indexOf('var askAITutor = function()', start);
        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThan(start);
        // eslint-disable-next-line no-new-func
        return (ctx, win) => new Function('ctx', 'window', src.slice(start, end) + '\nreturn tutorSafetyGate;')(ctx, win);
    }
    const checkerReturning = (flags) => ({ __alloShared: { SafetyContentChecker: { check: () => flags } } });

    it('maps severities and fires onSafetyFlag', () => {
        const make = extractGate();
        const onSafetyFlag = vi.fn();
        expect(make({ onSafetyFlag }, checkerReturning([{ severity: 'critical' }]))('x')).toBe('block');
        expect(onSafetyFlag.mock.calls[0][0]).toMatchObject({ source: 'stem_coordgrid_ai_tutor', aiGenerated: false });
        expect(make({}, checkerReturning([{ severity: 'high' }]))('x')).toBe('nudge');
        expect(make({}, checkerReturning([]))('x')).toBe('continue');
        const safeRehearseCheck = vi.fn(() => ({ action: 'block' }));
        expect(make({}, { SelHub: { safeRehearseCheck } })('x')).toBe('block');
        expect(safeRehearseCheck.mock.calls[0][1]).toMatchObject({ toolId: 'coordgrid_ai_tutor' });
    });

    it('checks the question before calling the AI and keeps deployed copies identical', () => {
        const a = src.indexOf('var askAITutor = function()');
        const b = src.indexOf('ctx.callGemini(prompt', a);
        expect(src.slice(a, b)).toContain('tutorSafetyGate(aiQuestion)');
        expect(src.slice(a, b)).toContain("gate === 'block'");
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, CG))).toBe(src);
        }
    });
});

// ------------------------------------------------------------------ Anxiety Toolkit
let R = null;
try {
    const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
    R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }

describe('Anxiety Toolkit: a "yes" in the check-in is flagged and not retained', () => {
    const nodeRequire = createRequire(import.meta.url);
    const load = (rel) => new Function('require', read(rel))(nodeRequire);

    beforeAll(() => {
        if (!R) return;
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        window.React = R.React;
        window.SelHub = undefined;
        load('sel_hub/sel_safety_layer.js');
        load(ANX);
    });

    function mount() {
        const { React, RDC, act } = R;
        const tool = window.SelHub._registry.anxietyToolkit;
        const onSafetyFlag = vi.fn();
        const setSelHubTool = vi.fn();
        let latest = {};
        function Host() {
            const [toolData, setToolData] = React.useState({});
            latest = toolData;
            return tool.render({
                React, toolData, setToolData, setSelHubTool, onSafetyFlag,
                addToast: () => {}, announceToSR: () => {}, gradeBand: 'high', theme: {},
            });
        }
        const el = document.createElement('div');
        document.body.appendChild(el);
        const root = RDC.createRoot(el);
        act(() => { root.render(React.createElement(Host)); });
        const click = (node) => act(() => { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
        return { el, root, onSafetyFlag, setSelHubTool, click, data: () => latest.anxietyToolkit || {} };
    }

    it.skipIf(!R)('fires one critical on-device flag, shows the shared crisis block once, and clears the answer on leaving', () => {
        const m = mount();
        const q1Yes = m.el.querySelector('[role="group"][aria-labelledby="triage-q1"] button[aria-label="Yes"]');
        expect(q1Yes).toBeTruthy();
        m.click(q1Yes);
        expect(m.onSafetyFlag).toHaveBeenCalledTimes(1);
        expect(m.onSafetyFlag.mock.calls[0][0]).toMatchObject({ category: 'self_harm', severity: 'critical', source: 'sel_anxietyToolkit_triage', aiGenerated: false });
        // Picking "yes" again does not flag twice.
        m.click(m.el.querySelector('[role="group"][aria-labelledby="triage-q1"] button[aria-label="Yes"]'));
        expect(m.onSafetyFlag).toHaveBeenCalledTimes(1);

        expect(m.el.textContent).toContain('You matter. Help is available.');
        expect(m.el.textContent).toContain('988');
        expect(m.el.textContent).toContain('741741');
        expect(m.el.querySelectorAll('[role="alert"]').length).toBe(1);
        expect(m.data().triageSuicidal).toBe('yes');

        m.click(m.el.querySelector('button[aria-label="Open Crisis Companion tool"]'));
        expect(m.setSelHubTool).toHaveBeenCalledWith('crisiscompanion');
        expect(m.data().triageSuicidal).toBeNull();
        R.act(() => m.root.unmount());
    });

    it.skipIf(!R)('does not flag "No" or "Prefer not to say"', () => {
        const m = mount();
        const q1 = () => m.el.querySelector('[role="group"][aria-labelledby="triage-q1"]');
        m.click(q1().querySelector('button[aria-label="No"]'));
        m.click(q1().querySelector('button[aria-label="Prefer not to say"]'));
        expect(m.onSafetyFlag).not.toHaveBeenCalled();
        R.act(() => m.root.unmount());
    });

    it('keeps the deployed copies identical to the source', () => {
        const src = read(ANX);
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, ANX))).toBe(src);
        }
    });
});

// ------------------------------------------------------------------ SEL expansion free-text scanning (12 tools)
// 4. All 12 remaining untouched SEL expansion tools with textarea free-text fields now scan
//    student text via safeRehearseCheck (with scanForCrisis fallback) on blur, fire onSafetyFlag,
//    and render the shared crisis resources banner at the top level when triggered.
describe('SEL expansion tools: free-text crisis scanning (12 tools)', () => {
    const TOOLS = [
        'griefloss', 'thoughtrecord', 'bodystory', 'genogram', 'ecomap', 'careconstellations',
        'quietquestions', 'sensoryregulation', 'motivationalinterviewing', 'viastrengths',
        'wheeloflife', 'landplace',
    ];

    it('wires safeRehearseCheck, onSafetyFlag, onBlur, and renderCrisisResources in all 12 tools and keeps deploy copies identical', () => {
        for (const id of TOOLS) {
            const rel = `sel_hub/sel_tool_${id}.js`;
            const src = read(rel);
            expect(src, rel).toContain('safeRehearseCheck');
            expect(src, rel).toContain('onSafetyFlag');
            expect(src, rel).toContain('renderCrisisResources');
            expect(src, rel).toContain('onBlur');
            expect(src, rel).toContain('_crisisTier');
            for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
                expect(read(join(dir, rel)), `${dir}/${rel}`).toBe(src);
            }
        }
    });

    it.skipIf(!R)('Thought Record flags critical text on blur and renders the shared crisis resources banner', () => {
        const nodeRequire = createRequire(import.meta.url);
        const load = (rel) => new Function('require', read(rel))(nodeRequire);
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        window.React = R.React;
        const origChecker = window.__alloShared && window.__alloShared.SafetyContentChecker;
        window.__alloShared = Object.assign({}, window.__alloShared, {
            SafetyContentChecker: {
                check: (msg) => /hurt myself/i.test(msg)
                    ? [{ category: 'self_harm', severity: 'critical', match: 'hurt myself' }]
                    : [],
            },
        });
        const origModal = window.SelHub && window.SelHub.showCrisisModal;
        load('sel_hub/sel_tool_thoughtrecord.js');
        const showCrisisModal = vi.fn();
        window.SelHub.showCrisisModal = showCrisisModal;

        const { React, RDC, act } = R;
        const tool = window.SelHub._registry.thoughtRecord;
        const onSafetyFlag = vi.fn();
        function Host() {
            const [toolData, setToolData] = React.useState({});
            return tool.render({
                React, toolData, setToolData, setSelHubTool: () => {}, onSafetyFlag,
                addToast: () => {}, announceToSR: () => {}, gradeBand: 'high', theme: {},
            });
        }
        const el = document.createElement('div');
        document.body.appendChild(el);
        const root = RDC.createRoot(el);
        try {
            act(() => { root.render(React.createElement(Host)); });
            const ta = el.querySelector('#tr-thought');
            expect(ta).toBeTruthy();
            expect(el.textContent).not.toContain('You matter. Help is available.');

            // Simulate typing and blurring with critical text (React maps onBlur to focusout)
            act(() => {
                ta.focus();
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, 'I want to hurt myself');
                ta.dispatchEvent(new window.Event('input', { bubbles: true }));
                ta.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }));
            });

            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
            expect(onSafetyFlag.mock.calls[0][0]).toMatchObject({ severity: 'critical', source: 'sel_rehearse_thoughtRecord' });
            expect(showCrisisModal).toHaveBeenCalledTimes(1);
            expect(el.textContent).toContain('You matter. Help is available.');
            expect(el.textContent).toContain('988');
        } finally {
            act(() => root.unmount());
            el.remove();
            if (origModal !== undefined) window.SelHub.showCrisisModal = origModal;
            if (origChecker !== undefined) window.__alloShared.SafetyContentChecker = origChecker;
        }
    });

    it('wires crisis scanning into the generated Practice Journeys and Field Journeys bundles and keeps deploy copies identical', () => {
        for (const rel of ['sel_hub/sel_tool_practicejourneys.js', 'stem_lab/stem_tool_fieldjourneys.js']) {
            const src = read(rel);
            expect(src, rel).toContain('safeRehearseCheck');
            expect(src, rel).toContain('onFreeText');
            expect(src, rel).toContain('renderCrisisResources');
            for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
                expect(read(join(dir, rel)), `${dir}/${rel}`).toBe(src);
            }
        }
    });

    it('wires crisis scanning into the 4 text-input SEL expansion tools and keeps deploy copies identical', () => {
        for (const id of ['circlesofsupport', 'crewprotocols', 'onepageprofile', 'valuescommittedaction']) {
            const rel = `sel_hub/sel_tool_${id}.js`;
            const src = read(rel);
            expect(src, rel).toContain('safeRehearseCheck');
            expect(src, rel).toContain('onSafetyFlag');
            expect(src, rel).toContain('renderCrisisResources');
            expect(src, rel).toContain('onBlur');
            for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
                expect(read(join(dir, rel)), `${dir}/${rel}`).toBe(src);
            }
        }
    });
});

// ------------------------------------------------------------------ STEM Lab onSafetyFlag host plumbing
describe('STEM Lab host passes onSafetyFlag end-to-end into tool ctx', () => {
    it('passes handleAiSafetyFlag from AlloFlowANTI.txt and App.jsx through stem_lab_module.js', () => {
        for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
            const src = read(host);
            expect(src, host).toContain('onOpenAiSetup: () => { try { setShowAIBackendModal(true); } catch (_) {} },\n                  onSafetyFlag: handleAiSafetyFlag,');
        }
        const mod = read('stem_lab/stem_lab_module.js');
        expect(mod).toContain('onSafetyFlag: typeof onSafetyFlag === \'function\' ? onSafetyFlag : null');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'stem_lab/stem_lab_module.js')), `${dir}/stem_lab/stem_lab_module.js`).toBe(mod);
        }
    });
});

// ------------------------------------------------------------------ World Builder student-writing AI safety
describe('World Builder: all 5 student-writing AI surfaces are safety-gated', () => {
    const WB = 'stem_lab/stem_tool_worldbuilder.js';
    const src = read(WB);

    function extractGate() {
        const start = src.indexOf('var wbSafetyGate = function(');
        const end = src.indexOf('var _wbAiOn', start);
        expect(start).toBeGreaterThan(0);
        // find the closing `};` of wbSafetyGate
        const close = src.indexOf('return blocked;\n      };', start);
        expect(close).toBeGreaterThan(start);
        const fnSrc = src.slice(start, close + 'return blocked;\n      };'.length);
        // eslint-disable-next-line no-new-func
        return (ctx, upd, addToast, win) => new Function('ctx', 'upd', 'addToast', 'window', fnSrc + '\nreturn wbSafetyGate;')(ctx, upd, addToast, win);
    }

    it('blocks self-harm across all surfaces, allows RPG battle verbs in combat, and fires onSafetyFlag', () => {
        const make = extractGate();
        const upd = vi.fn();
        const onSafetyFlag = vi.fn();
        const checker = (flags) => ({ __alloShared: { SafetyContentChecker: { check: () => flags } } });

        // Self-harm blocked in RPG battle & NPC chat
        const gateCrit = make({ onSafetyFlag }, upd, () => {}, checker([{ category: 'self_harm', severity: 'critical', match: 'hurt myself' }]));
        expect(gateCrit('I want to hurt myself', 'battle_action', true)).toBe(true);
        expect(onSafetyFlag).toHaveBeenCalledTimes(1);
        expect(upd).toHaveBeenCalledWith('_safetyPause', true);

        // Generic fantasy battle verb ("attack") allowed in RPG action
        const gateRpg = make({ onSafetyFlag }, vi.fn(), () => {}, checker([{ category: 'harm_to_others', severity: 'critical', match: 'attack' }]));
        expect(gateRpg('I attack the shadow dragon', 'battle_action', true)).toBe(false);

        // Non-combat SEL NPC chat uses safeRehearseCheck
        const safeRehearseCheck = vi.fn(() => ({ action: 'block', flag: { severity: 'critical' } }));
        const gateNpc = make({ onSafetyFlag }, vi.fn(), () => {}, { SelHub: { safeRehearseCheck } });
        expect(gateNpc('something heavy', 'npc_dialogue', false)).toBe(true);
        expect(safeRehearseCheck).toHaveBeenCalledWith('something heavy', { toolId: 'worldBuilder_npc_dialogue', onSafetyFlag });
    });

    it('gates all 5 student-writing handlers and keeps deploy copies identical', () => {
        for (const call of [
            "wbSafetyGate(description, 'craft_item', true)",
            "wbSafetyGate(actionText, 'npc_dialogue', false)",
            "wbSafetyGate(description, 'build_structure', true)",
            "wbSafetyGate(actionText, 'battle_action', true)",
            "wbSafetyGate(actionText, 'world_action', true)",
        ]) {
            expect(src).toContain(call);
        }
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, WB))).toBe(src);
        }
    });
});
