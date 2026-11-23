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

    it('passes handleAiSafetyFlag from AlloFlowANTI.txt and App.jsx to AlloHaven, QuizView, and all 11 gated studios, with offline self-harm shim', () => {
        for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
            const src = read(host);
            // STEM Lab + SEL Hub + AlloHaven + QuizView + 11 studios = at least 15 `onSafetyFlag: handleAiSafetyFlag` bindings
            const count = (src.match(/onSafetyFlag:\s*handleAiSafetyFlag/g) || []).length;
            expect(count, host).toBeGreaterThanOrEqual(15);
            expect(src, host).toContain('t, user, isTeacherMode, isParentMode, isIndependentMode, studentProjectSettings,\n                    onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onClose: () => setIsAlloHavenOpen(false),\n                    onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onClose: () => setShowStoryForge(false),\n                    onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onClose: () => setIsLinguaPracticeOpen(false),\n                callGemini: (studentAiFeaturesHidden ? null : callGemini),\n                onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onClose: () => setShowLitLab(false),\n                    onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onClose: () => setShowPoetTree(false),\n                    onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onCallGemini: studentAiFeaturesHidden ? null : callGemini,\n                onSafetyFlag: handleAiSafetyFlag,');
            expect(src, host).toContain('onClose: () => setIsSymbolStudioOpen(false),\n                    onSafetyFlag: handleAiSafetyFlag,\n                    onCallImagen: (studentAiFeaturesHidden ? null : callImagen),\n                    onCallGeminiImageEdit: (studentAiFeaturesHidden ? null : callGeminiImageEdit),\n                    onCallGemini: (studentAiFeaturesHidden ? null : callGemini),');
            expect(src, host).toContain('callGeminiAudio: (studentAiFeaturesHidden ? null : callGeminiAudio),\n                onSafetyFlag: handleAiSafetyFlag,');
            // Pre-CDN / offline inline SafetyContentChecker shim still catches self-harm
            expect(src, host).toContain("category: 'self_harm', match: m[0], severity: 'critical'");
            // Centralized addToast scrubs API keys / JWTs / Bearer tokens / mailbox URL secrets before rendering or logging to toast history
            expect(src, host).toContain(".replace(/\\bAIza[A-Za-z0-9_-]{10,}\\b/g, '[redacted]')");
            expect(src, host).toContain(".replace(/\\bsk-[A-Za-z0-9_-]{10,}\\b/g, '[redacted]')");
            expect(src, host).toContain("allo_mbp?|allo_pack");
            // AI-setup toasts offer one-click Open AI settings recovery for non-student roles
            expect(src, host).toContain("label: 'Open AI settings', onClick: () => { try { setShowAIBackendModal(true); } catch (_) {} }");
            // FERPA / educator-only leadership & SpEd panels cannot render outside Teacher mode
            for (const gate of [
                'isOpen={isAdminHubOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isEducatorEvaluationOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isDiagnosisEligibilityOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isMtssTriageOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isFamilyAnnouncementsOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isSpedTimelinesOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isMeetingDocsOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isDisproAnalyzerOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isCommunicationsStudioOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isWalkthroughCopilotOpen && isTeacherMode && !isIndependentMode}',
                'isOpen={isSchoolRewardsOpen && isTeacherMode && !isIndependentMode}',
                '{isSubmissionInboxOpen && isTeacherMode && !isIndependentMode && (',
                'isOpen={showReportWriter && isTeacherMode && !isIndependentMode}',
                'isOpen={showCinematicStudio && isTeacherMode && !isIndependentMode}',
                'isOpen={showBrandProfileEditor && isTeacherMode && !isIndependentMode}',
                'isOpen={isAuditRemediatorOpen && isTeacherMode && !isIndependentMode}',
            ]) {
                expect(src, `${host} missing role gate ${gate}`).toContain(gate);
            }
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

// ------------------------------------------------------------------ Additional STEM free-text AI surfaces (4 tools)
describe('DataLab, Algebra CAS, Game Studio, and App Lab gate student free text before calling AI', () => {
    it('gates DataLab Socratic tutor, Algebra CAS tutor, Game Studio map prompt, and App Lab prompt and keeps deploy copies identical', () => {
        const checks = [
            ['stem_lab/stem_tool_datalab.js', 'dataLab_socratic_tutor', '988'],
            ['stem_lab/stem_tool_algebracas.js', 'algebraCAS_tutor', 'casSafetyGate(question)'],
            ['stem_lab/stem_tool_gamestudio.js', 'stem_gameStudio_map_prompt', '988'],
            ['stem_lab/stem_tool_applab.js', 'appLab_prompt', 'showCrisisModal'],
        ];
        for (const [rel, marker1, marker2] of checks) {
            const src = read(rel);
            expect(src, rel).toContain(marker1);
            expect(src, rel).toContain(marker2);
            expect(src, rel).toContain('SafetyContentChecker');
            for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
                expect(read(join(dir, rel)), `${dir}/${rel}`).toBe(src);
            }
        }
    });
});

// ------------------------------------------------------------------ AlloBot UDL Chat learner safety gate
describe('AlloBot UDL Chat: learner messages are safety-gated while teacher planning is not blocked', () => {
    it('blocks critical self-harm in Independent mode, fires onSafetyFlag, and allows teachers to plan sensitive lessons', async () => {
        const modRel = 'udl_chat_module.js';
        const modSrc = read(modRel);
        expect(modSrc).toContain("type: 'safety-pause'");
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, modRel)), `${dir}/${modRel}`).toBe(modSrc);
        }

        const origSelHub = window.SelHub;
        const origShared = window.__alloShared;
        const origModules = window.AlloModules;
        try {
            window.AlloModules = Object.assign({}, origModules);
            window.SelHub = undefined;
            window.__alloShared = Object.assign({}, origShared, {
                SafetyContentChecker: {
                    check: (msg) => /hurt myself/i.test(msg)
                        ? [{ category: 'self_harm', severity: 'critical', match: 'hurt myself' }]
                        : [],
                },
            });
            const nodeRequire = createRequire(import.meta.url);
            new Function('require', modSrc)(nodeRequire);
            const chat = window.AlloModules.UdlChat;
            expect(typeof chat?.generateStandardChatResponse).toBe('function');

            // 1. Independent learner: blocked before callGemini
            const messages = [];
            const callGemini = vi.fn(async () => 'should not be called');
            const onSafetyFlag = vi.fn();
            const resLearner = await chat.generateStandardChatResponse('I want to hurt myself', {
                isIndependentMode: true,
                isTeacherMode: false,
                isParentMode: false,
                callGemini,
                onSafetyFlag,
                setUdlMessages: (fn) => { const next = fn(messages); messages.splice(0, messages.length, ...next); },
                t: (_k, fb) => fb,
            });
            expect(resLearner).toMatchObject({ ok: false, safetyBlocked: true });
            expect(callGemini).not.toHaveBeenCalled();
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
            expect(messages[0]?.type).toBe('safety-pause');
            expect(messages[0]?.text).toContain('988');
            expect(messages[0]?.text).toContain('741741');

            // 2. Teacher planning a lesson: NOT blocked by learner safety gate
            const teacherMsgs = [];
            const teacherGemini = vi.fn(async () => 'Here is a UDL strategy for teaching mental health literacy.');
            window.AlloFlowChatPrivacy = { consume: () => 'none', context: () => '' };
            const resTeacher = await chat.generateStandardChatResponse('How do I adapt a lesson about students who hurt myself/self-harm prevention?', {
                isIndependentMode: false,
                isTeacherMode: true,
                isParentMode: false,
                currentUiLanguage: 'English',
                callGemini: teacherGemini,
                setUdlMessages: (fn) => { const next = fn(teacherMsgs); teacherMsgs.splice(0, teacherMsgs.length, ...next); },
                t: (_k, fb) => fb,
            });
            expect(resTeacher).toMatchObject({ ok: true });
            expect(teacherGemini).toHaveBeenCalled();
        } finally {
            window.SelHub = origSelHub;
            window.__alloShared = origShared;
            window.AlloModules = origModules;
        }
    });
});

// ------------------------------------------------------------------ Note-Taking & DBQ student-writing self-harm gates
describe('Note-Taking Templates and DBQ Writing Coach gate student self-harm before calling AI', () => {
    it('gates note-taking feedback and DBQ doc/corroboration/essay feedback on student text only and keeps deploy copies identical', () => {
        const nt = read('note_taking_templates_module.js');
        expect(nt).toContain('_studentNoteText');
        expect(nt).toMatch(/f\.category\s*===\s*['"]self_harm['"]/);
        expect(nt).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'note_taking_templates_module.js')), `${dir}/note_taking_templates_module.js`).toBe(nt);
        }

        const dbq = read('view_dbq_module.js');
        expect(dbq).toContain('dbqCheckStudentSelfHarm');
        expect(dbq).toMatch(/['"]doc_analysis['"]/);
        expect(dbq).toMatch(/['"]corroboration['"]/);
        expect(dbq).toMatch(/['"]synthesis_essay['"]/);
        expect(dbq).toContain('DBQ_SAFETY_PAUSE_MSG');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'view_dbq_module.js')), `${dir}/view_dbq_module.js`).toBe(dbq);
        }
    });

    it('gates Applied Challenge and Memory Aid AI coaching on student text only and keeps deploy copies identical', () => {
        const ac = read('applied_challenge_module.js');
        expect(ac).toContain('checkAppliedChallengeSelfHarm');
        expect(ac).toMatch(/['"]stress-test['"]/);
        expect(ac).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'applied_challenge_module.js')), `${dir}/applied_challenge_module.js`).toBe(ac);
        }

        const ma = read('memory_aid_module.js');
        expect(ma).toContain('checkMemoryAidSelfHarm');
        expect(ma).toMatch(/['"]fact-check['"]/);
        expect(ma).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'memory_aid_module.js')), `${dir}/memory_aid_module.js`).toBe(ma);
        }
    });

    it('gates 3D Concept Space and Memory Palace art/refine prompts and keeps deploy copies identical', () => {
        const vr = read('view_renderers_module.js');
        expect(vr).toContain('_vrCheckStudentPromptSafety');
        expect(vr).toMatch(/['"]concept_space_art['"],\s*addToast,\s*onSafetyFlag/);
        expect(vr).toMatch(/['"]concept_space_refine['"],\s*addToast,\s*onSafetyFlag/);
        expect(vr).toMatch(/['"]memory_palace_art['"],\s*addToast,\s*onSafetyFlag/);
        expect(vr).toMatch(/['"]memory_palace_refine['"],\s*addToast,\s*onSafetyFlag/);
        expect(vr).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'view_renderers_module.js')), `${dir}/view_renderers_module.js`).toBe(vr);
        }
    });

    it('gates StoryForge and PoetTree AI calls for self-harm and keeps deploy copies identical', () => {
        const sf = read('story_forge_module.js');
        expect(sf).toMatch(/['"]story_forge_ai['"]/);
        expect(sf).toMatch(/['"]safety-paused['"]/);
        expect(sf).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'story_forge_module.js')), `${dir}/story_forge_module.js`).toBe(sf);
        }

        const pt = read('poet_tree_module.js');
        expect(pt).toMatch(/['"]poet_tree_ai['"]/);
        expect(pt).toMatch(/['"]safety-paused['"]/);
        expect(pt).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'poet_tree_module.js')), `${dir}/poet_tree_module.js`).toBe(pt);
        }
    });

    it('gates LitLab (StoryStage) and Lingua Practice AI surfaces and keeps deploy copies identical', () => {
        const ss = read('story_stage_module.js');
        expect(ss).toMatch(/['"]story_stage_ai['"]/);
        expect(ss).toMatch(/['"]safety-paused['"]/);
        expect(ss).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'story_stage_module.js')), `${dir}/story_stage_module.js`).toBe(ss);
        }

        const lp = read('lingua_practice_module.js');
        expect(lp).toMatch(/['"]lingua_practice_chat['"]/);
        expect(lp).toContain('safeRehearseCheck');
        expect(lp).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'lingua_practice_module.js')), `${dir}/lingua_practice_module.js`).toBe(lp);
        }
    });

    it('gates Research Hub, Symbol Studio, and Test Prep Hub AI surfaces and keeps deploy copies identical', () => {
        const rh = read('research_hub_module.js');
        expect(rh).toMatch(/['"]safety_self_harm['"]/);
        expect(rh).toMatch(/['"]research_hub_['"]/);
        expect(rh).toContain('Array.isArray(_rhFlags)');
        expect(rh).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'research_hub_module.js')), `${dir}/research_hub_module.js`).toBe(rh);
        }

        const sym = read('symbol_studio_module.js');
        expect(sym).toContain('_ssCheckSelfHarm');
        expect(sym).toMatch(/['"]symbol_studio_['"]/);
        expect(sym).toContain('Array.isArray(_sfFlags)');
        expect(sym).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'symbol_studio_module.js')), `${dir}/symbol_studio_module.js`).toBe(sym);
        }

        const tp = read('test_prep_hub_module.js');
        expect(tp).toMatch(/['"]test_prep_hub_clarification['"]/);
        expect(tp).toContain('safeRehearseCheck');
        expect(tp).toContain('Array.isArray(_tpFlags)');
        expect(tp).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'test_prep_hub_module.js')), `${dir}/test_prep_hub_module.js`).toBe(tp);
        }
    });

    it('runtime behavior: ResearchHub blocks self-harm with real SafetyContentChecker, fires onSafetyFlag + showCrisisModal, and allows war/genocide research', async () => {
        const origChecker = window.SafetyContentChecker;
        const origAlloModules = window.AlloModules;
        const origRH = window.ResearchHub;
        const origSelHub = window.SelHub;
        const origReact = window.React;
        try {
            window.React = React;
            window.AlloModules = {};
            delete window.SafetyContentChecker;
            delete window.ResearchHub;
            // Load the real SafetyContentChecker and ResearchHub modules.
            new Function(read('safety_checker_module.js'))();
            window.SafetyContentChecker = window.AlloModules.SafetyChecker;
            new Function(read('research_hub_module.js'))();

            const makeAsk = window.ResearchHub?.helpers?.makeAskResearchCoach;
            expect(typeof makeAsk).toBe('function');

            const showCrisisModal = vi.fn();
            window.SelHub = { showCrisisModal };
            const onSafetyFlag = vi.fn();
            const onCallGemini = vi.fn(async () => JSON.stringify({ ok: true, notes: ['Great question'] }));
            let journal = { aiCallCount: 0, aiHistory: [] };
            const setJournal = (fn) => { journal = typeof fn === 'function' ? fn(journal) : fn; };
            const ask = makeAsk({ onCallGemini, onSafetyFlag, addToast: vi.fn() }, journal, setJournal);

            // 1. Self-harm disclosure is blocked BEFORE calling Gemini
            const blocked = await ask({
                id: 'wonder_sorter',
                buildPrompt: () => 'Student research question: I want to end my life and cannot go on.',
            }, {});
            expect(blocked).toMatchObject({ ok: false, blocked: true, blockedReason: 'safety_self_harm' });
            expect(blocked.detail).toContain('988');
            expect(blocked.detail).toContain('741741');
            expect(onCallGemini).not.toHaveBeenCalled();
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
            expect(onSafetyFlag.mock.calls[0][0]).toMatchObject({
                tool: 'research_hub_wonder_sorter',
                severity: 'critical',
                category: 'self_harm',
            });
            expect(showCrisisModal).toHaveBeenCalledTimes(1);

            // 2. Academic war/genocide/atomic bomb research is NOT blocked
            const allowed = await ask({
                id: 'wonder_sorter',
                buildPrompt: () => 'Compare the causes of genocide and the atomic bomb after the attack on Pearl Harbor in World War II.',
            }, {});
            expect(allowed.blockedReason).not.toBe('safety_self_harm');
            expect(onCallGemini).toHaveBeenCalledTimes(1);
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
        } finally {
            window.SafetyContentChecker = origChecker;
            window.AlloModules = origAlloModules;
            window.ResearchHub = origRH;
            window.SelHub = origSelHub;
            window.React = origReact;
        }
    });

    it('runtime behavior: safeRehearseCheck + real SafetyContentChecker blocks expanded self-harm and allows war/history/clinical phrases', () => {
        const origChecker = window.SafetyContentChecker;
        const origAlloModules = window.AlloModules;
        const origShared = window.__alloShared;
        const origSelHub = window.SelHub;
        try {
            window.AlloModules = {};
            delete window.SafetyContentChecker;
            delete window.SelHub;
            new Function(read('safety_checker_module.js'))();
            window.SafetyContentChecker = window.AlloModules.SafetyChecker;
            window.__alloShared = { SafetyContentChecker: window.SafetyContentChecker };
            new Function(read('sel_hub/sel_safety_layer.js'))();

            const onSafetyFlag = vi.fn();
            const hit = window.SelHub.safeRehearseCheck('I wish I were dead and have no reason to live', {
                toolId: 'audit_check',
                onSafetyFlag,
            });
            expect(hit.action).toBe('block');
            expect(hit.severity).toBe('critical');
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);

            for (const safe of [
                'We studied the attack on Pearl Harbor and the atomic bomb in history class.',
                'The lesson covers genocide prevention and human rights.',
                'I had a panic attack before my math test.',
            ]) {
                const res = window.SelHub.safeRehearseCheck(safe, { toolId: 'audit_check', onSafetyFlag });
                expect(res.action, safe).toBe('continue');
            }
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
        } finally {
            window.SafetyContentChecker = origChecker;
            window.AlloModules = origAlloModules;
            window.__alloShared = origShared;
            window.SelHub = origSelHub;
        }
    });

    it('runtime behavior: QuizAIHelpers pauses grading on student self-harm, allows war/genocide answers, and keeps deploy copies identical', async () => {
        const qahSrc = read('quiz_ai_helpers.js');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'quiz_ai_helpers.js')), `${dir}/quiz_ai_helpers.js`).toBe(qahSrc);
        }
        const vqSrc = read('view_quiz_module.js');
        expect(vqSrc).toContain('onSafetyFlag: p.onSafetyFlag');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'view_quiz_module.js')), `${dir}/view_quiz_module.js`).toBe(vqSrc);
        }

        const origChecker = window.SafetyContentChecker;
        const origAlloModules = window.AlloModules;
        const origShared = window.__alloShared;
        const origSelHub = window.SelHub;
        try {
            window.AlloModules = {};
            delete window.SafetyContentChecker;
            new Function(read('safety_checker_module.js'))();
            window.SafetyContentChecker = window.AlloModules.SafetyChecker;
            window.__alloShared = { SafetyContentChecker: window.SafetyContentChecker };
            new Function(qahSrc)();

            const helpers = window.AlloModules.QuizAIHelpers;
            const showCrisisModal = vi.fn();
            window.SelHub = { showCrisisModal };
            const onSafetyFlag = vi.fn();
            const callGemini = vi.fn(async () => JSON.stringify({ status: 'correct', feedback: 'Accurate summary.', score: 95, criteriaFeedback: [] }));

            // 1. Freeform self-harm disclosure is paused before Gemini
            const r1 = await helpers.gradeFreeformAnswer({
                question: 'Explain the causes of World War I.',
                expectedAnswer: 'Militarism, alliances, imperialism, nationalism.',
                studentResponse: 'I want to end my life and cannot do this anymore.',
                callGemini,
                onSafetyFlag,
            });
            expect(r1).toMatchObject({ status: 'submitted', needsReview: true, safetyPaused: true, code: 'safety-paused' });
            expect(r1.feedback).toContain('988');
            expect(r1.feedback).toContain('741741');
            expect(callGemini).not.toHaveBeenCalled();
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
            expect(showCrisisModal).toHaveBeenCalledTimes(1);

            // 2. Calibrated freeform self-harm disclosure is also paused with score: 0
            const r2 = await helpers.gradeFreeformAnswerWithCalibration({
                rubric: 'Explain the causes of World War II.',
                studentResponse: 'I wish I were dead.',
                callGemini,
                onSafetyFlag,
            });
            expect(r2).toMatchObject({ status: 'submitted', needsReview: true, safetyPaused: true, score: 0 });
            expect(callGemini).not.toHaveBeenCalled();

            // 3. Fill-in-the-blank self-harm disclosure is also paused
            const r3 = await helpers.gradeFillBlank({
                contextSentence: 'The ___ ended World War II.',
                expectedFill: 'atomic bomb',
                studentFill: 'I want to kill myself',
                callGemini,
                onSafetyFlag,
            });
            expect(r3).toMatchObject({ status: 'submitted', needsReview: true, safetyPaused: true });
            expect(callGemini).not.toHaveBeenCalled();

            // 4. Legitimate academic answer about genocide/war/atomic bomb IS graded normally
            const r4 = await helpers.gradeFreeformAnswer({
                question: 'Describe major events of World War II.',
                expectedAnswer: 'Pearl Harbor, Holocaust genocide, atomic bomb.',
                studentResponse: 'After the attack on Pearl Harbor, the war included genocide and ended after the atomic bomb.',
                callGemini,
                onSafetyFlag,
            });
            expect(r4.status).toBe('correct');
            expect(callGemini).toHaveBeenCalledTimes(1);
        } finally {
            window.SafetyContentChecker = origChecker;
            window.AlloModules = origAlloModules;
            window.__alloShared = origShared;
            window.SelHub = origSelHub;
        }
    });

    it('synchronously gates Interactive Adventure custom text submits for self-harm and keeps core safety deliverables SRI-synced across all 3 hosts', async () => {
        const adv = read('adventure_handlers_module.js');
        expect(adv).toMatch(/['"]adventure_text_submit['"]/);
        expect(adv).toContain('Array.isArray(_advFlags)');
        expect(adv).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'adventure_handlers_module.js')), `${dir}/adventure_handlers_module.js`).toBe(adv);
        }

        const crypto = await import('node:crypto');
        const req = createRequire(import.meta.url);
        const manifestMod = req('../dev-tools/build_browser_delivery_manifest.cjs');
        const coreSafetyFiles = [
            'safety_checker_module.js',
            'sel_hub/sel_safety_layer.js',
            'quiz_ai_helpers.js',
            'view_quiz_module.js',
            'adventure_handlers_module.js',
            'phase_k_helpers_module.js',
            'personas_module.js',
            'research_hub_module.js',
            'symbol_studio_module.js',
            'test_prep_hub_module.js',
            'applied_challenge_module.js',
            'memory_aid_module.js',
            'stem_lab/stem_tool_llm_literacy.js',
            'stem_lab/stem_tool_gamestudio.js',
            'stem_lab/stem_tool_coordgrid.js',
            'stem_lab/stem_tool_algebracas.js',
        ];
        for (const host of manifestMod.HOST_FILES) {
            const embedded = manifestMod.readEmbeddedManifest(read(host));
            for (const rel of coreSafetyFiles) {
                if (!embedded.assets[rel]) continue;
                const buf = readFileSync(join(ROOT, rel));
                const sri = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
                expect(embedded.assets[rel].bytes, `${host} bytes for ${rel}`).toBe(buf.length);
                expect(embedded.assets[rel].integrity, `${host} SRI for ${rel}`).toBe(sri);
            }
        }
    });

    it('synchronously pauses Socratic Tutor and Persona Chat on self-harm, allows war/history questions, and keeps deploy copies identical', async () => {
        const pk = read('phase_k_helpers_module.js');
        expect(pk).toMatch(/['"]socratic_tutor['"]/);
        expect(pk).toMatch(/['"]persona_reflection['"]/);
        expect(pk).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'phase_k_helpers_module.js')), `${dir}/phase_k_helpers_module.js`).toBe(pk);
        }

        const per = read('personas_module.js');
        expect(per).toContain('PERSONA_CRISIS_PAUSE_TEXT');
        expect(per).toContain('hasSelfHarm');
        expect(per).toContain('988');
        for (const dir of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
            expect(read(join(dir, 'personas_module.js')), `${dir}/personas_module.js`).toBe(per);
        }

        // Runtime behavioral check of handleSocraticSubmit with real SafetyContentChecker
        const origChecker = window.SafetyContentChecker;
        const origAlloModules = window.AlloModules;
        const origShared = window.__alloShared;
        const origSelHub = window.SelHub;
        try {
            window.AlloModules = {};
            delete window.SafetyContentChecker;
            delete window.SelHub;
            new Function(read('safety_checker_module.js'))();
            window.SafetyContentChecker = window.AlloModules.SafetyChecker;
            window.__alloShared = { SafetyContentChecker: window.SafetyContentChecker };
            new Function(pk)();

            const showCrisisModal = vi.fn();
            window.SelHub = { showCrisisModal };
            const onSafetyFlag = vi.fn();
            const callGemini = vi.fn(async () => 'Great history question!');
            const messages = [];
            const setSocraticMessages = (fn) => { const next = fn(messages); messages.splice(0, messages.length, ...next); };

            await window.AlloModules.PhaseKHelpers.handleSocraticSubmit('I want to end my life right now', {
                socraticMessages: messages,
                socraticInput: '',
                isSocraticThinking: false,
                setSocraticMessages,
                setSocraticInput: vi.fn(),
                setIsSocraticThinking: vi.fn(),
                callGemini,
                SafetyContentChecker: window.SafetyContentChecker,
                handleAiSafetyFlag: onSafetyFlag,
                t: (_k, fb) => fb,
            });
            expect(callGemini).not.toHaveBeenCalled();
            expect(onSafetyFlag).toHaveBeenCalledTimes(1);
            expect(showCrisisModal).toHaveBeenCalledTimes(1);
            expect(messages[messages.length - 1]?.safetyPaused).toBe(true);
            expect(messages[messages.length - 1]?.text).toContain('988');
            expect(messages[messages.length - 1]?.text).toContain('741741');

            // Runtime behavioral check of AdventureHandlers.handleAdventureTextSubmit with real SafetyContentChecker
            new Function(read('adventure_handlers_module.js'))();
            const advCallGemini = vi.fn(async () => '{}');
            const advFlag = vi.fn();
            const advToast = vi.fn();
            const advSetState = vi.fn();
            await window.AlloModules.AdventureHandlers.handleAdventureTextSubmit('I want to end my life', {
                adventureState: { isLoading: false, turnCount: 1, history: [], currentScene: { text: 'Forest' } },
                adventureTextInput: '',
                isTeacherMode: false,
                activeSessionCode: null,
                callGemini: advCallGemini,
                SafetyContentChecker: window.SafetyContentChecker,
                handleAiSafetyFlag: advFlag,
                addToast: advToast,
                setAdventureState: advSetState,
                lastTurnSnapshot: { current: null },
                stopPlayback: vi.fn(),
                t: (_k, fb) => fb,
            });
            expect(advCallGemini).not.toHaveBeenCalled();
            expect(advSetState).not.toHaveBeenCalled();
            expect(advFlag).toHaveBeenCalledTimes(1);
            expect(advFlag.mock.calls[0][0]).toMatchObject({ tool: 'adventure_text_submit', severity: 'critical', category: 'self_harm' });
            expect(advToast).toHaveBeenCalledTimes(1);
            expect(advToast.mock.calls[0][0]).toContain('988');
            expect(showCrisisModal).toHaveBeenCalledTimes(2);
        } finally {
            window.SafetyContentChecker = origChecker;
            window.AlloModules = origAlloModules;
            window.__alloShared = origShared;
            window.SelHub = origSelHub;
        }
    });
});
