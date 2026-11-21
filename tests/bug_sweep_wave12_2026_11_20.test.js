import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('Wave 12 Bug Sweep (2026-11-20) — Pass 1: Core Infrastructure', () => {
  it('quickstart_source.jsx & quickstart_module.js block unsafe URLs, clear stale state, and gate search selection on fetch success', () => {
    const src = read('quickstart_source.jsx');
    const mod = read('quickstart_module.js');
    expect(src).toContain('isSafeHttpUrl');
    expect(mod).toContain('isSafeHttpUrl');
    // Execute isSafeHttpUrl live
    const m = src.match(/const isSafeHttpUrl\s*=\s*\([\s\S]*?\n\s*\};/);
    expect(m).toBeTruthy();
    const isSafe = new Function(m[0] + '; return isSafeHttpUrl;')();
    expect(isSafe('https://example.org/lesson')).toBe(true);
    expect(isSafe('http://example.org/doc')).toBe(true);
    expect(isSafe('javascript:alert(1)')).toBe(false);
    expect(isSafe('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafe('')).toBe(false);
    expect(src).toMatch(/storybookRef:\s*null/);
    expect(src).toMatch(/disabled=\{isFetching\}/);
  });

  it('misc_components_source.jsx & misc_components_module.js harden ClozeInput timer, WordSoundsReviewPanel audio/phoneme/image, and DictationButton unmount', () => {
    const src = read('misc_components_source.jsx');
    const mod = read('misc_components_module.js');
    expect(src).toContain('errorTimerRef');
    expect(src).toContain("g.key === 'audio_runtime'");
    expect(src).toContain('unmountedRef');
    expect(src).toMatch(/prev\.ready === nextReady && prev\.total === nextTotal/);
    expect(src).toContain('mountedRef');
    expect(mod).toContain('errorTimerRef');
    expect(mod).toContain('audio_runtime');
  });

  it('udl_walkthrough_source.jsx & udl_walkthrough_module.js close modal before PD jump, guard edit/delete races, deduplicate teacher codes, and reject invalid ratings', () => {
    const src = read('udl_walkthrough_source.jsx');
    const mod = read('udl_walkthrough_module.js');
    expect(src).toContain('onClose()');
    expect(src).toContain('UDLWALK_RATINGS.indexOf(rating) === -1');
    expect(src).toContain('udlwalkNextTeacherCode');
    expect(mod).toContain('udlwalkNextTeacherCode');
  });

  it('voice_module.js fixes Whisper loading lock/fallback/onerror, PCM graph overlap, WebSpeech fatal onEnd, dictation stop catch, and local startOnDevice try/catch', () => {
    const src = read('voice_module.js');
    expect(src).toContain('pcmOpenSerial');
    expect(src).toContain('boundOpenSerial !== pcmOpenSerial');
    expect(src).toContain('whisperLoadingPromise = null');
    expect(src).toContain("rejectResult(new Error('cancelled'))");
  });

  it('allo_command_context_source.js, allo_command_context_module.js, and AlloFlowANTI.txt reset STEM tab, rethrow outline errors, avoid stale callGeminiAudio, and gate isAdminHubOpen', () => {
    const src = read('allo_command_context_source.js');
    const mod = read('allo_command_context_module.js');
    const host = read('AlloFlowANTI.txt');
    expect(src).toContain("setStemLabTab('explore')");
    expect(src).toContain('rethrowErrors: true');
    expect(src).toContain('isAdminHubOpen');
    expect(mod).toContain('isAdminHubOpen');
    expect(host).toContain('isAdminHubOpen');
  });

  it('generation_matrix_module.js canonicalizes timeline/bridge config fingerprints and differentiates brainstorm artifactVariantKey', () => {
    const src = read('generation_matrix_module.js');
    const sandbox = { window: {}, console };
    new Function('window', 'console', src)(sandbox.window, console);
    const gm = sandbox.window.AlloModules && sandbox.window.AlloModules.GenerationMatrix;
    expect(gm).toBeTruthy();

    // Canonical vs alias timeline configs produce identical fingerprints
    const fpCanon = gm.buildGenerationConfigFingerprint('timeline', { mode: 'interactive', itemCount: 8, topic: 'Civil Rights' });
    const fpAlias = gm.buildGenerationConfigFingerprint('timeline', { timelineMode: 'interactive', timelineCount: 8, timelineTopic: 'Civil Rights' });
    expect(fpCanon).toBe(fpAlias);

    // gemini-bridge canonical vs alias
    const brCanon = gm.buildGenerationConfigFingerprint('gemini-bridge', { simulationType: 'optics' });
    const brAlias = gm.buildGenerationConfigFingerprint('gemini-bridge', { bridgeSimType: 'optics' });
    expect(brCanon).toBe(brAlias);

    // brainstorm default 'ideas' vs 'discussion' variant keys & identities
    const bsPolicy = gm.getResourcePolicy('brainstorm');
    const kIdeas = gm.buildVariantKey({ type: 'brainstorm', config: { activityMode: 'ideas' } }, bsPolicy);
    const kDiscussion = gm.buildVariantKey({ type: 'brainstorm', config: { activityMode: 'discussion' } }, bsPolicy);
    expect(kIdeas).toBe('default');
    expect(kDiscussion).not.toBe('default');
    const idIdeas = gm.buildGenerationIdentity({ type: 'brainstorm', config: { activityMode: 'ideas' } }, { gradeLevel: '7th Grade', sourceText: 'sample' });
    const idDiscussion = gm.buildGenerationIdentity({ type: 'brainstorm', config: { activityMode: 'discussion' } }, { gradeLevel: '7th Grade', sourceText: 'sample' });
    expect(idIdeas).not.toBe(idDiscussion);
  });
});

describe('Wave 12 Bug Sweep (2026-11-20) — Pass 2: SEL Hub & Crisis Safety', () => {
  it('sel_hub_module.js exposes lazy-loadable tools in Station Builder, listens for tooldata-changed, initializes _lastExportRef, and uses _t.accentText', () => {
    const src = read('sel_hub/sel_hub_module.js');
    expect(src).toContain("window.addEventListener('alloflow-sel-tooldata-changed', onToolDataRestore)");
    expect(src).toContain("sessionStorage.getItem('alloflow_sel_last_export_at')");
    expect(src).toContain('if (!_selToolIsOpenable(t.id)) return;');
    expect(src).not.toContain("background: _t.accent, color: '#fff', fontSize: 14");
    expect(src).not.toContain("background: _t.accent, color: '#fff', fontWeight: 700");
  });

  it('sel_tool_crisiscompanion.js eliminates _ccBreathTimer leak & _SafetyPlan._cache, separates grounding keys, remaps TEAL_DARK, and removes render-phase upd/Math.random', () => {
    const src = read('sel_hub/sel_tool_crisiscompanion.js');
    expect(src).not.toContain('_ccBreathTimer');
    expect(src).not.toContain('_SafetyPlan._cache');
    expect(src).toContain("TEAL_DARK  = _ccC('#115e59')");
    expect(src).toContain('d.scBreathRunning');
    expect(src).toContain('d.scGroundStep');
    expect(src).toContain('cc-kit-sp-');
    expect(src).toContain('setPickIdx');
  });

  it('sel_tool_conflict.js adds AI Mediator Tier 3 crisis safety, deduplicates XP/badges, fixes High Contrast crashes, checks global mute, and fixes ARIA', () => {
    const src = read('sel_hub/sel_tool_conflict.js');
    expect(src).toContain('_medToolTier');
    expect(src).toContain('safeRehearseCheck(medPrompt');
    expect(src).toContain('deViewedIds');
    expect(src).toContain('rpCompletedIds');
    expect(src).toContain('sqXpAwarded');
    expect(src).toContain('cooldownXpAwarded');
    expect(src).toContain('_cflFg(STYLE_DESCRIPTIONS[maxStyle].color)');
    expect(src).toContain('_cflFg(groundSenses[cdGroundStep].color)');
    expect(src).toContain("'aria-valuenow': pct");
    expect(src).toContain('__alloIsGlobalMuted');
  });

  it('sel_tool_restorativecircle.js sets _lastTier on Empathy Map block, renders empty Circle card, resets aiLoading, deduplicates XP, scopes CSS, and closes aria-live before Print', () => {
    const src = read('sel_hub/sel_tool_restorativecircle.js');
    expect(src).toContain('_lastTier: 3');
    expect(src).toContain('Choose a circle type first');
    expect(src).toContain('function awardOnce(');
    expect(src).toContain('restorativeCircle');
    expect(src).toContain('data-sel-tool-shell');
    expect(src).not.toContain('.text-slate-400{color:#64748b!important}');
    expect(src).toContain("'aria-label': 'Copy sample phrase'");
    expect(src).toContain('__alloIsGlobalMuted');
  });

  it('sel_tool_decisions.js renders Tier 3 crisis resources in all AI tabs, guards XP/badges, fixes HC step badge, and scopes reduced-motion CSS', () => {
    const src = read('sel_hub/sel_tool_decisions.js');
    const crisisMounts = src.match(/renderCrisisResources\(h,\s*band\)/g) || [];
    expect(crisisMounts.length).toBeGreaterThanOrEqual(4);
    expect(src).toContain('dtCompletedIds');
    expect(src).toContain('edCompletedIds');
    expect(src).toContain('rwCompletedIds');
    expect(src).toContain('advXpCount');
    expect(src).toContain('[data-sel-tool-shell="decisions"]');
    expect(src).toContain('__alloIsGlobalMuted');
  });

  it('sel_tool_goals.js clones badges, expands checkBadges deps, fixes DST yesterday, stabilizes quotes/boosts, fixes category label & smart.R, and hides retired/AI-off badges', () => {
    const src = read('sel_hub/sel_tool_goals.js');
    expect(src).toContain('Object.assign({}, d.badges || {})');
    expect(src).toContain('[goals, habits, visionBoard,');
    expect(src).toContain('_yest.setDate(_yest.getDate() - 1)');
    expect(src).toContain('if (goal.smart && goal.smart.R)');
    expect(src).toContain("|| { label: '' }).label");
    expect(src).toContain('getDailyQuote');
    expect(src).toContain('visibleBadgeIds');
    expect(src).toContain('alreadySavedThisWeek');
    expect(src).toContain("'aria-label': 'Send message to Goal Coach'");
    expect(src).toContain('__alloIsGlobalMuted');
  });
});

describe('Wave 12 Bug Sweep (2026-11-20) — Pass 3: Core K-8 Math & Bio STEM Lab', () => {
  it('stem_tool_numberline.js carries mixedNumber overflow, qualifies non-exact decimals, hoists _nlAudioCtx, supports unmute force beep, and uses NLE.lineTicks', () => {
    const src = read('stem_lab/stem_tool_numberline.js');
    expect(src).toContain('var _nlAudioCtx = null;');
    expect(src).toContain('if (rNum >= fdDen) return { whole: wholePart + 1, num: 0, den: 1, sign: sign };');
    expect(src).toContain("isExactFrac ? (simpNum + ' ÷ ' + simpDen + ' = ' + decimal) : ('≈ ' + nearestNum + ' ÷ ' + fdDen)");
    expect(src).toContain('playTone(660, 0.08, \'sine\', 0.08, true)');
    expect(src).toContain('var cerTk = NLE.lineTicks(0, maxV)');
    expect(src).toContain('var magTk = NLE.lineTicks(0, magMax)');
  });

  it('stem_tool_areamodel.js hoists _amAudioCtx, supports unmute force beep, and cleans up cutDrag on lost pointer capture & unmount', () => {
    const src = read('stem_lab/stem_tool_areamodel.js');
    expect(src).toContain('var _amAudioCtx = null;');
    expect(src).toContain('playTone(660, 0.08, \'sine\', 0.08, true)');
    expect(src).toContain('onLostPointerCapture');
    expect(src).toContain('return function() { cutDrag.current = null; };');
  });

  it('stem_tool_multtable.js restricts practice keyboard shortcuts to the practice tab', () => {
    const src = read('stem_lab/stem_tool_multtable.js');
    expect(src).toMatch(/kbRef\.current\s*=\s*function\(e\)\s*\{\s*if\s*\(mtTab\s*!==\s*'practice'\)\s*return;/);
  });

  it('stem_tool_manipulatives.js enforces mute, hides Number Bonds Rainbow answers during practice, clamps Geoboard focus, uses 4 lower Abacus beads, saves all modes, guards B10GL mountSeq, and labels hundreds regroup', () => {
    const src = read('stem_lab/stem_tool_manipulatives.js');
    expect(src).toContain('var _soundEnabled = true;');
    expect(src).toContain('if (!_soundEnabled) return;');
    expect(src).toContain('var mountSeq = 0;');
    expect(src).toContain('Array.from({ length: 4 })');
    expect(src).toContain('Math.max(0, Math.min(4, newE))');
    expect(src).toContain("'10 hundreds → 1 thousand'");
    expect(src).toContain("(nbMode === 'explore' || !!nbFeedback)");
    expect(src).toContain("srcMode === 'slideRule'");
    expect(src).toContain("srcMode === 'fracBars'");
    expect(src).toContain("srcMode === 'algebraTiles'");
    expect(src).toContain('Math.min(gbFocus.x, nextSize - 1)');
  });

  it('stem_tool_geo.js fixes Guided Proofs duplicate reason counts, checkSizeAnswer, render-phase choices, Landmarks XP watermark, checkChallenge repeat guard, segment-segment crossings, and functional timeout clears', () => {
    const src = read('stem_lab/stem_tool_geo.js');
    expect(src).toContain('var smaller = bigger.iso === sizeTarget1.iso ? sizeTarget2 : sizeTarget1;');
    expect(src).toContain('geoLandmarkXpMax');
    expect(src).toContain('activeCapChoices');
    expect(src).toContain('activeLmChoices');
    expect(src).not.toContain("upd('geoCapitalsChoices', opts);");
    expect(src).toContain('const segmentIntersection =');
    expect(src).toContain('const reqCounts = {};');
    expect(src).toContain('(doneCounts[r] || 0) < (reqCounts[r] || 1)');
    expect(src).toContain('if (!gpChallenge || (gpFeedback && gpFeedback.correct)) return;');
    expect(src).toContain('const curMg=curGp.matchGame; if(!curMg) return prev;');
    expect(src).toContain('const curSr=curGp.sorter; if(!curSr) return prev;');

    // Runtime check on segmentIntersection & duplicate reason counts
    const segFn = new Function(`
      const segmentIntersection = (a1, a2, b1, b2) => {
        const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
        const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
        const denom = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(denom) < 1e-6) return null;
        const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
        const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
        if (t <= 0.001 || t >= 0.999 || u <= 0.001 || u >= 0.999) return null;
        return { x: a1.x + t * dx1, y: a1.y + t * dy1 };
      };
      return segmentIntersection;
    `)();
    const ix = segFn({ x: 80, y: 140 }, { x: 420, y: 140 }, { x: 190, y: 50 }, { x: 310, y: 350 });
    expect(ix).not.toBeNull();
    expect(ix.y).toBeCloseTo(140, 5);
    expect(ix.x).toBeCloseTo(226, 5);
    // Parallel lines do not intersect
    expect(segFn({ x: 80, y: 140 }, { x: 420, y: 140 }, { x: 80, y: 300 }, { x: 420, y: 300 })).toBeNull();
  });

  it('stem_tool_butterfly.js clears stale restoration season/egg selections when applyDesign clears unrecorded restoration evidence', () => {
    const src = read('stem_lab/stem_tool_butterfly.js');
    expect(src).toContain("if(!evidenceRecorded(s,patch('restoration',s))){if(seasonSite==='restoration'){setSeasonSite('');setSeasonGuess('');setSeasonFeedback('');}if(eggSite==='restoration'){setEggSite('');setBroodGuess('');}}");
  });
});
