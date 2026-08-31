// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (video-studio-host-bridge).
function VideoStudioHostBridgeView(props) {
  const { CDNModuleGate, GUIDED_STEPS, GUIDED_TOUR_MAP, _alloCmdCtx, _alloCmdCtxRef, _officialTutorialSnapshotRef, _planRunRef, activeView, addToast, callGemini, expandedTools, generatedContent, gradeLevel, guidedModeConfigReady, history, inputText, isVideoStudioOpen, setActiveSidebarTab, setActiveView, setExpandedTools, setGeneratedContent, setGradeLevel, setHistory, setInputText, setIsVideoStudioOpen, setShowCinematicStudio, setSourceTopic, sourceTopic, t } = props;
  return (
<CDNModuleGate moduleKey="VideoStudio" isOpen={isVideoStudioOpen} onClose={() => setIsVideoStudioOpen(false)} icon="🎥" displayName="Video Studio" t={t}>
            {(VideoStudio) => React.createElement(VideoStudio, {
                onClose: () => setIsVideoStudioOpen(false),
                addToast,
                t,
                callGemini: callGemini,
                history: history,
                sourceTopic: sourceTopic,
                onSendTranscriptToFlow: (resource) => {
                    const transcript = String(resource?.text || resource?.content || resource?.data?.transcript || '').trim();
                    if (!transcript) throw new Error('Transcript is empty.');
                    const titleBase = String(resource?.data?.title || resource?.title || 'Video transcript').replace(/\s+transcript$/i, '').trim().slice(0, 120) || 'Video transcript';
                    const captionCount = Array.isArray(resource?.data?.cues) ? resource.data.cues.length : 0;
                    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    const item = {
                        id: newId,
                        type: 'video-transcript',
                        title: `${titleBase} transcript`,
                        text: transcript,
                        content: transcript,
                        data: {
                            ...(resource?.data || {}),
                            title: titleBase,
                            transcript
                        },
                        meta: captionCount ? `${captionCount} caption line${captionCount === 1 ? '' : 's'} from Video Studio` : 'Video Studio transcript',
                        timestamp: new Date(),
                        config: {},
                        source: 'video_studio'
                    };
                    setHistory(prev => [...prev, item]);
                    setInputText(transcript);
                    setSourceTopic(titleBase);
                    setGeneratedContent(item);
                    setActiveSidebarTab('create');
                    setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev]);
                    setActiveView('input');
                    addToast('Transcript sent to Source. Use the existing quiz and support tools from there.', 'success');
                    return { id: newId };
                },
                onSendVideoRefToFlow: (ref) => {
                    // Save the pack-safe video reference (metadata + thumbnail +
                    // optional hosted link — never bytes) as a 'video-ref' card.
                    if (!ref || ref.type !== 'videoRef') throw new Error('Not a video reference.');
                    const refTitle = String(ref.title || 'Teacher video').slice(0, 120);
                    const newRefId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    const refItem = {
                        id: newRefId,
                        type: 'video-ref',
                        title: refTitle,
                        text: `${refTitle} — video (${Math.floor((ref.durationSec || 0) / 60)}:${String((ref.durationSec || 0) % 60).padStart(2, '0')})${ref.hostedUrl ? ` — ${ref.hostedUrl}` : ''}`,
                        content: '',
                        data: { ...ref },
                        meta: ref.hostedUrl ? 'Video Studio card · hosted link attached' : 'Video Studio card · re-attach the downloaded file to play',
                        timestamp: new Date(),
                        config: {},
                        source: 'video_studio'
                    };
                    setHistory(prev => [...prev, refItem]);
                    return { id: newRefId };
                },
                onGetOfficialTutorial: async (tutorialId) => {
                    if (tutorialId !== 'text-adaptation') throw new Error('Unknown official tutorial.');
                    try { if (window.__alloLazyVideoStudio) window.__alloLazyVideoStudio(); } catch (_) {}
                    let TC = window.AlloModules && window.AlloModules.TutorialCompiler;
                    for (let waited = 0; !TC && waited < 8000; waited += 100) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        TC = window.AlloModules && window.AlloModules.TutorialCompiler;
                    }
                    if (!TC || typeof TC.buildTutorialManifest !== 'function') throw new Error('The tutorial compiler is still loading - wait a moment and try again.');
                    if (!guidedModeConfigReady) throw new Error('Guided Mode setup is still loading - retry the failed module and try again.');
                    const manifest = TC.buildTutorialManifest(GUIDED_STEPS, GUIDED_TOUR_MAP, t, { only: ['source-input', 'simplified'], wpm: 150 });
                    return { generatedFrom: manifest.generatedFrom, steps: manifest.steps };
                },
                onRunOfficialTutorial: async (tutorialId, steps, hooks) => {
                    if (tutorialId !== 'text-adaptation') throw new Error('Unknown official tutorial.');
                    if (_planRunRef.current && _planRunRef.current.running) throw new Error('AlloBot is already running a plan - stop it first.');
                    const list = (Array.isArray(steps) ? steps : []).filter(step => step && (step.id === 'source-input' || step.id === 'simplified')).slice(0, 2);
                    if (list.length !== 2) throw new Error('The Text Adaptation tutorial manifest is incomplete.');
                    const stopWanted = () => !!(_planRunRef.current.stop || (hooks && hooks.shouldStop && hooks.shouldStop()));
                    _officialTutorialSnapshotRef.current = _officialTutorialSnapshotRef.current || {
                        inputText, generatedContent, activeView, gradeLevel, expandedTools: expandedTools.slice()
                    };
                    _planRunRef.current = { running: true, stop: false };
                    const fixtureSource = 'Plants use sunlight, water, and carbon dioxide to make sugar through photosynthesis. Chlorophyll captures light energy in the leaves. The plant stores some sugar and releases oxygen into the air.';
                    const fixtureAdapted = '## Photosynthesis\n\nPlants make their own food. Leaves capture energy from sunlight. Roots bring in water, and leaves take in carbon dioxide from the air. The plant uses these materials to make sugar for energy. Oxygen is released back into the air.';
                    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
                    const spotlight = async anchorId => {
                        let el = null;
                        for (let attempt = 0; !el && attempt < 20; attempt++) { el = document.getElementById(anchorId); if (!el) await wait(100); }
                        if (!el) throw new Error('Tutorial target is not visible: ' + anchorId);
                        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
                        const priorOutline = el.style.outline;
                        const priorOffset = el.style.outlineOffset;
                        let cursorMarker = null;
                        el.style.outline = '4px solid #f59e0b';
                        el.style.outlineOffset = '5px';
                        if (!hooks || hooks.cursorEmphasis !== false) {
                            const rect = el.getBoundingClientRect();
                            cursorMarker = document.createElement('div');
                            cursorMarker.setAttribute('aria-hidden', 'true');
                            cursorMarker.style.cssText = 'position:fixed;z-index:2147483000;pointer-events:none;width:34px;height:34px;border:4px solid #f59e0b;border-radius:999px;left:' + Math.max(4, Math.min(window.innerWidth - 38, rect.left + rect.width / 2 - 17)) + 'px;top:' + Math.max(4, Math.min(window.innerHeight - 38, rect.top + rect.height / 2 - 17)) + 'px;box-shadow:0 0 0 8px rgba(245,158,11,.24),0 4px 16px rgba(15,23,42,.35);background:rgba(255,255,255,.2);transition:transform .25s ease,opacity .25s ease';
                            document.body.appendChild(cursorMarker);
                            requestAnimationFrame(() => { if (cursorMarker) cursorMarker.style.transform = 'scale(.72)'; });
                        }
                        await wait(650);
                        if (cursorMarker) cursorMarker.remove();
                        el.style.outline = priorOutline;
                        el.style.outlineOffset = priorOffset;
                    };
                    try {
                        for (let waited = 0; document.visibilityState !== 'visible' && waited < 15000 && !stopWanted(); waited += 250) await wait(250);
                        if (document.visibilityState !== 'visible') return { ok: false, completed: 0, reason: 'The AlloFlow tab never became visible.' };
                        let completed = 0;
                        for (let i = 0; i < list.length; i++) {
                            if (stopWanted()) return { ok: false, stopped: true, completed, reason: 'Stopped by the teacher.' };
                            const step = list[i];
                            const actionBeat = (step.beats || []).find(beat => beat.kind === 'action');
                            const successBeat = (step.beats || []).find(beat => beat.kind === 'success');
                            if (hooks && hooks.onStep) hooks.onStep(i, 'start', step.label, (actionBeat && actionBeat.text) || step.label);
                            if (step.id === 'source-input') {
                                setActiveView('input');
                                setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev]);
                                setInputText(fixtureSource);
                            } else {
                                setGradeLevel('5th Grade');
                                setExpandedTools(prev => prev.includes('simplified') ? prev : [...prev, 'simplified']);
                                setGeneratedContent({ id: 'official-text-adaptation-fixture', type: 'simplified', title: 'Photosynthesis - Grade 5 adaptation', data: fixtureAdapted, timestamp: new Date(), config: { gradeLevel: '5th Grade' }, source: 'official-tutorial' });
                                setActiveView('simplified');
                            }
                            await wait(900);
                            await spotlight(step.anchorId);
                            await wait(900);
                            const resultHoldMs = Math.round(Math.max(0.5, Math.min(8, Number(step.pauseAfter) || 2.2)) * 1000);
                            for (let held = 0; held < resultHoldMs && !stopWanted(); held += 100) await wait(Math.min(100, resultHoldMs - held));
                            if (hooks && hooks.onStep) hooks.onStep(i, 'done', step.label, (successBeat && successBeat.text) || (step.label + ' ready.'));
                            completed++;
                            if (stopWanted()) return { ok: false, stopped: true, completed, reason: 'Stopped by the teacher.' };
                        }
                        addToast('Official Text Adaptation tutorial finished. Video Studio is wrapping up the recording.', 'success');
                        return { ok: true, completed };
                    } finally {
                        _planRunRef.current = { running: false, stop: false };
                    }
                },
                onCleanupOfficialTutorial: () => {
                    const snapshot = _officialTutorialSnapshotRef.current;
                    if (!snapshot) return false;
                    _officialTutorialSnapshotRef.current = null;
                    setInputText(snapshot.inputText);
                    setGeneratedContent(snapshot.generatedContent);
                    setActiveView(snapshot.activeView);
                    setGradeLevel(snapshot.gradeLevel);
                    setExpandedTools(snapshot.expandedTools);
                    return true;
                },                onPlanDemo: async (goal, options = {}) => {
                    // Demo Autopilot planning: reuses AlloBot's planUtterance over
                    // the live command registry (goal TEXT only goes to Gemini).
                    const AC = window.AlloModules && window.AlloModules.AlloCommands;
                    if (!AC || typeof AC.planUtterance !== 'function' || typeof AC.buildAlloCommands !== 'function' || typeof AC.validatePlan !== 'function') {
                        // AlloCommands loads eagerly at app boot — if it's absent the
                        // script is still arriving (or the CDN failed), so waiting is
                        // the honest remedy.
                        throw new Error('The command planner is still loading — wait a moment and try again.');
                    }
                    const cleanGoal = String(goal || '').slice(0, 300);
                    let steps = await AC.planUtterance(_alloCmdCtx(), cleanGoal, { demoSafeOnly: true, comprehensiveDemo: true, maxSteps: 16, signal: options.signal || null });
                    if ((!steps || !steps.length) && typeof AC.routeUtterance === 'function') {
                        // Single-action demos are legitimate ("show how to open the
                        // reading library") but planUtterance requires 2+ steps — an
                        // AlloBot rule we shouldn't loosen globally. Fall back to the
                        // single-command router and wrap its match as a 1-step plan.
                        try {
                            const m = await AC.routeUtterance(_alloCmdCtx(), cleanGoal, { allowAi: true, preview: true, signal: options.signal || null });
                            if (m && m.commandId) {
                                const candidate = [{ commandId: m.commandId, params: m.params || {}, why: '' }];
                                const report = AC.validatePlan(_alloCmdCtx(), candidate, { demoSafeOnly: true });
                                if (report && report.ok) steps = candidate;
                            }
                        } catch (error) { if (error && error.name === 'AbortError') throw error; }
                    }
                    if (!steps || !steps.length) return { steps: [] };
                    const cmds = AC.buildAlloCommands(_alloCmdCtx(), { includeGated: true });
                    return { steps: steps.map(s => {
                        const c = cmds.find(x => x.id === s.commandId);
                        return { commandId: s.commandId, params: s.params || {}, paramNames: typeof AC.getCommandContract === 'function' ? AC.getCommandContract(c || s.commandId).params : [], why: s.why || '', label: (c && c.label) || s.commandId };
                    }) };
                },
                onValidateDemoPlan: async (steps) => {
                    const AC = window.AlloModules && window.AlloModules.AlloCommands;
                    if (!AC || typeof AC.validatePlan !== 'function') throw new Error('The command readiness checker has not loaded.');
                    return AC.validatePlan(_alloCmdCtx(), steps, { demoSafeOnly: true });
                },
                onRunDemoPlan: async (steps, hooks, options) => {
                    // Demo Autopilot execution: one guarded runPlan call PER STEP so
                    // the demo breathes between steps (runPlan rechecks when-guards
                    // and never auto-runs destructive commands). Shares AlloBot's
                    // single-flight guard so a bot plan and a demo can't interleave.
                    const AC = window.AlloModules && window.AlloModules.AlloCommands;
                    const rehearsal = !!(options && options.rehearsal);
                    if (!AC || typeof AC.runPlan !== 'function' || typeof AC.validatePlan !== 'function') throw new Error('The command runner has not loaded.');
                    const readiness = AC.validatePlan(_alloCmdCtx(), steps, { demoSafeOnly: true });
                    if (!readiness || !readiness.ok) {
                        const blocked = readiness && readiness.items && readiness.items.find(item => item.status === 'block');
                        return { ok: false, completed: 0, reason: (blocked && ((blocked.label || blocked.commandId) + ': ' + blocked.detail)) || 'This demo plan is not ready to run.' };
                    }
                    if (_planRunRef.current && _planRunRef.current.running) throw new Error('AlloBot is already running a plan — stop it first.');
                    _planRunRef.current = { running: true, stop: false };
                    const stopWanted = () => (_planRunRef.current.stop || !!(hooks && hooks.shouldStop && hooks.shouldStop()));
                    const cursorMarkers = new Set();
                    const emphasizeCursorTarget = (cmd, label) => {
                        if (!options || options.cursorEmphasis === false) return;
                        const needle = String(label || (cmd && cmd.label) || '').trim().toLowerCase();
                        let target = null;
                        const directId = cmd && (cmd.anchorId || cmd.targetId);
                        if (directId) target = document.getElementById(String(directId));
                        if (!target && needle) {
                            const nodes = Array.from(document.querySelectorAll('button,[role="button"],a,input,textarea,select,[data-tutorial-anchor]')).slice(0, 300);
                            target = nodes.find(node => {
                                const r = node.getBoundingClientRect();
                                if (!r.width || !r.height || r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) return false;
                                const text = String(node.getAttribute('aria-label') || node.textContent || node.value || '').trim().toLowerCase();
                                return text && (text === needle || text.includes(needle) || needle.includes(text));
                            }) || null;
                        }
                        if (!target && document.activeElement && document.activeElement !== document.body) target = document.activeElement;
                        const rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { left: window.innerWidth / 2 - 1, top: window.innerHeight / 2 - 1, width: 2, height: 2 };
                        const marker = document.createElement('div');
                        marker.setAttribute('aria-hidden', 'true');
                        marker.style.cssText = 'position:fixed;z-index:2147483000;pointer-events:none;width:32px;height:32px;border:4px solid #f59e0b;border-radius:999px;left:' + Math.max(4, Math.min(window.innerWidth - 36, rect.left + rect.width / 2 - 16)) + 'px;top:' + Math.max(4, Math.min(window.innerHeight - 36, rect.top + rect.height / 2 - 16)) + 'px;box-shadow:0 0 0 8px rgba(245,158,11,.24),0 4px 16px rgba(15,23,42,.35);background:rgba(255,255,255,.18);transform:scale(1.2);transition:transform .3s ease,opacity .3s ease';
                        document.body.appendChild(marker);
                        cursorMarkers.add(marker);
                        requestAnimationFrame(() => { marker.style.transform = 'scale(.7)'; });
                        setTimeout(() => { marker.style.opacity = '0'; setTimeout(() => { cursorMarkers.delete(marker); marker.remove(); }, 320); }, 700);
                    };
                    try {
                        if (rehearsal) {
                            const previewList = (Array.isArray(steps) ? steps : []).slice(0, 8);
                            let previewCompleted = 0;
                            for (let i = 0; i < previewList.length; i++) {
                                if (stopWanted()) return { ok: false, stopped: true, completed: previewCompleted, reason: 'Rehearsal stopped by the teacher.' };
                                const readyItem = readiness.items[i] || {};
                                const previewLabel = readyItem.label || previewList[i].commandId;
                                try { if (hooks && hooks.onStep) hooks.onStep(i, 'start', previewLabel, 'Checking: ' + previewLabel + '.'); } catch (_) {}
                                await new Promise(resolve => setTimeout(resolve, 220));
                                if (stopWanted()) return { ok: false, stopped: true, completed: previewCompleted, reason: 'Rehearsal stopped by the teacher.' };
                                try { if (hooks && hooks.onStep) hooks.onStep(i, 'done', previewLabel, readyItem.detail || 'Command and prerequisites are ready.'); } catch (_) {}
                                previewCompleted++;
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                            return { ok: true, completed: previewCompleted, rehearsal: true };
                        }
                        // The teacher just picked the tab in the share dialog — wait
                        // until this tab is actually visible before driving it.
                        for (let waited = 0; document.visibilityState !== 'visible' && waited < 15000 && !stopWanted(); waited += 250) {
                            await new Promise(r => setTimeout(r, 250));
                        }
                        if (stopWanted()) return { ok: false, stopped: true, completed: 0, reason: 'Stopped before the demo began.' };
                        if (document.visibilityState !== 'visible') {
                            return { ok: false, completed: 0, reason: 'The AlloFlow tab never became visible, so no automatic actions were run.' };
                        }
                        addToast('🎬 Demo Autopilot is driving AlloFlow — Video Studio is recording.', 'info');
                        const list = (Array.isArray(steps) ? steps : []).slice(0, 8);
                        let completed = 0;
                        // Post-run objective audit reads these flags: only primitives,
                        // capped, from the LIVE ctx (the ref tracks renders). Booleans
                        // like contentLoaded are exactly the evidence "did the goal
                        // land" needs, and nothing student-authored fits in 60 chars
                        // of whitelisted primitive — long strings are dropped.
                        const stateSummaryForAudit = () => {
                            try {
                                const liveCtx = _alloCmdCtxRef.current || _alloCmdCtx();
                                const summary = {};
                                let kept = 0;
                                for (const key of Object.keys(liveCtx)) {
                                    const value = liveCtx[key];
                                    if (typeof value === 'boolean' || typeof value === 'number' || (typeof value === 'string' && value.length <= 60)) {
                                        summary[key] = value;
                                        if (++kept >= 60) break;
                                    }
                                }
                                return summary;
                            } catch (_) { return null; }
                        };
                        for (let i = 0; i < list.length; i++) {
                            if (stopWanted()) return { ok: false, stopped: true, completed, reason: 'Stopped by the teacher.' };
                            let completionEvent = null;
                            // Read the ctx through the REF, like the voice loop does.
                            // _alloCmdCtx is a plain render-body closure over state
                            // (generatedContent, inputText, hasSourceOrAnalysis...), and
                            // this async loop holds the closure from the render that was
                            // current when Record was pressed. Every step after the first
                            // therefore saw pre-demo app state, so a plan whose later step
                            // is unlocked by an earlier one ("make a glossary, then open
                            // flashcards") passed preflight and then failed mid-recording:
                            // runPlan rebuilds the menu from ctx and drops commands whose
                            // when-guard still reads false. The palette re-invokes
                            // _alloCmdCtx() every render and that assigns _alloCmdCtxRef,
                            // so the ref tracks live state.
                            const r = await AC.runPlan(() => (_alloCmdCtxRef.current || _alloCmdCtx()), [list[i]], {
                                shouldStop: stopWanted,
                                // Recording runs can afford patience: the default 3-minute
                                // completion ceiling killed demos whose generation step was
                                // slow-but-honest (image gen, throttle retries). The popup's
                                // bridge waits 30 minutes and its continuation flow handles
                                // genuine timeouts, so give steps 5 minutes here.
                                timeoutMs: 300000,
                                signal: options && options.signal,
                                onStep: (j, phase, cmd, narr) => {
                                    const label = (cmd && cmd.label) || list[i].commandId;
                                    if (phase === 'done') completionEvent = { label, narration: narr || '' };
                                    else {
                                        emphasizeCursorTarget(cmd, label);
                                        try { if (hooks && hooks.onStep) hooks.onStep(i, phase, label, narr || ''); } catch (_) {}
                                    }
                                }
                            });
                            if (!r || !r.ok) {
                                const failReason = (r && r.reason) || ('Step ' + (i + 1) + ' did not finish.');
                                const stoppedByTeacher = !!(r && r.stopped);
                                // Steering juncture: a failed step no longer hard-ends the
                                // run. The popup pauses the recording (so the pause never
                                // reaches the video) and asks the teacher retry / skip /
                                // stop. Bounded: silence for 4 minutes, a stop request, or
                                // a rejected hook all collapse to the old stop behavior.
                                if (!stoppedByTeacher && hooks && typeof hooks.onDecision === 'function') {
                                    const choice = await new Promise(resolve => {
                                        let done = false;
                                        let guard = null;
                                        const finish = v => { if (!done) { done = true; clearInterval(guard); resolve(v === 'retry' || v === 'skip' ? v : 'stop'); } };
                                        const startedWaiting = Date.now();
                                        guard = setInterval(() => { if (stopWanted() || Date.now() - startedWaiting > 240000) finish('stop'); }, 250);
                                        Promise.resolve(hooks.onDecision({ index: i, label: list[i].commandId, reason: failReason, timedOut: !!(r && r.timedOut) })).then(finish, () => finish('stop'));
                                    });
                                    if (choice === 'retry') { i--; continue; }
                                    if (choice === 'skip') continue;
                                    return { ok: false, completed, stopped: true, timedOut: !!(r && r.timedOut), reason: failReason, stateSummary: stateSummaryForAudit() };
                                }
                                return { ok: false, completed, stopped: stoppedByTeacher, timedOut: !!(r && r.timedOut), reason: failReason, stateSummary: stateSummaryForAudit() };
                            }
                            const resultHoldMs = Math.round(Math.max(0.5, Math.min(8, Number(list[i].pauseAfter) || 2.2)) * 1000);
                            for (let held = 0; held < resultHoldMs && !stopWanted(); held += 100) await new Promise(resolve => setTimeout(resolve, Math.min(100, resultHoldMs - held)));
                            const done = completionEvent || { label: list[i].commandId, narration: 'Step complete.' };
                            try { if (hooks && hooks.onStep) hooks.onStep(i, 'done', done.label, done.narration); } catch (_) {}
                            completed++;
                            if (stopWanted()) return { ok: false, stopped: true, completed, reason: 'Stopped by the teacher.' };
                        }
                        addToast('🎉 Demo finished — Video Studio is wrapping up the recording.', 'success');
                        return { ok: true, completed, stateSummary: stateSummaryForAudit() };
                    } finally {
                        cursorMarkers.forEach(marker => { try { marker.remove(); } catch (_) {} });
                        cursorMarkers.clear();
                        _planRunRef.current = { running: false, stop: false };
                    }
                },
                onOpenCinematicStudio: () => { setIsVideoStudioOpen(false); setShowCinematicStudio(true); }
            })}
        </CDNModuleGate>
  );
}
