import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Aquaculture Lab 3D farm accessibility contract', () => {
  it('keeps the canonical tool and desktop deployment mirror byte-identical', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(mirror).toBe(source);
  });

  it('provides a focusable, described simulator and protects form input from shortcuts', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D aquaculture farm simulator'");
    expect(source).toContain("'aria-keyshortcuts': 'W A S D ArrowUp ArrowDown ArrowLeft ArrowRight F P C Escape'");
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain("event.currentTarget.style.outline = '3px solid #5eead4'");
    expect(source).toContain("target.matches('input, textarea, select, button, [contenteditable=\"true\"]')");
    expect(source).toContain("window.addEventListener('keydown', onKeyDown)");
    expect(source).toContain('if (target !== canvas) return');
    expect(source).toContain("if (e.repeat && (key === 'f' || key === 'p' || key === 'c')) return");
    expect(source).toContain("canvas.addEventListener('blur', clearKeys)");
    expect(source).toContain("canvas.removeEventListener('blur', clearKeys)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown)");
    expect(source).toContain('WASD or arrow keys to pilot');
    expect(source).toContain('P for a surface sample');
    expect(source).toContain('C for a crop-depth sample');
  });

  it('renders the active canvas before deferred initialization and focuses it on launch', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('setSim({ active: true, threeLoaded: true, threeError: false, loading: false })');
    expect(source).toContain('initTimerRef.current = setTimeout(function()');
    expect(source).toContain('var c = canvasRef.current');
    expect(source).toContain('try { c.focus(); }');
  });

  it('throttles HUD updates and preserves accurate farm mission state', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('var lastHudUpdate = -Infinity');
    expect(source).toContain('if (now - lastHudUpdate >= 200)');
    expect(source).toContain('setProbes(function(prev)');
    expect(source).toContain('(prev || []).concat([ev.reading]).slice(-50)');
    expect(source).toContain("typeof ev.count === 'number' ? ev.count : c + 1");
    expect(source).toContain('boatState.passedRedNun && boatState.droppersDeployed >= 5');
    expect(source).toContain('boatState.surfaceSampled && boatState.cropDepthSampled');
    expect(source).toContain('boatState.surfaceSampled && boatState.cropDepthSampled && boatState.decisionId');
    expect(source).toContain("takeProbeReading('surface')");
    expect(source).toContain("takeProbeReading('crop')");
    expect(source).toContain('initialDroppers: 0');
    expect(source).not.toContain('initialDroppers: loadState().droppersDeployed');
    expect(source).toContain("s3.completedMissions['mission-1'] = { completedAt: Date.now(), mode: '3d', summary: missionSummary }");
    expect(source).toContain('missionProgress: (boatState.passedRedNun ? 1 : 0)');
    expect(source).toContain('(boatState.decisionId ? 1 : 0) + (boatState.returnedHome ? 1 : 0)');
    expect(source).toContain('setMissionDebrief(missionSummary)');
  });

  it('provides touch and assistive-technology controls with safe release cleanup', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('setControl: function(key, active)');
    expect(source).toContain("'aria-label': 'On-screen vessel controls'");
    expect(source).toContain('props.onPointerDown = function(event)');
    expect(source).toContain('props.onLostPointerCapture = function()');
    expect(source).toContain("event.key === 'Enter' || event.key === ' '");
    expect(source).toContain('clearFarmControlPulses()');
    expect(source).toContain("{ key: 'p', label: 'Surface sample', hold: false, stage: 'sample' }");
    expect(source).toContain("{ key: 'c', label: 'Crop-depth sample', hold: false, stage: 'sample' }");
    expect(source).toContain("disabled: actionUnavailable");
    expect(source).toContain("'aria-describedby': c.stage ? 'aq-3d-objective-text' : undefined");
  });

  it('aligns the visual bow, inbound buoy lanes, and chart with red-right-returning', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain("boat.rotation.y = Math.PI; // model bow is +z");
    expect(source).toContain('boat.rotation.y = boatState.heading + Math.PI');
    expect(source).toContain("addBuoy(4, -5, 'red-nun')");
    expect(source).toContain("addBuoy(-4, -5, 'green-can')");
    expect(source).not.toContain("addBuoy(-4, -5, 'red-nun')");
    expect(source).toContain('var inbound = Math.cos(boatState.heading) > 0.35 && boatState.speed > 0.5');
    expect(source).toContain('!bb.userData.wrongSideWarned');
    expect(source).toContain('boatState.buoyViolations += 1');
    expect(source).toContain("[{ x: 350, y: 125 }, { x: 350, y: 190 }, { x: 350, y: 255 }]");
    expect(source).toContain('Inbound / returning');
  });

  it('adds reliable one-shot actions, a live route map, and an evidence debrief', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('var actionRequests = {}');
    expect(source).toContain("actionRequests['f'] = false");
    expect(source).toContain('Deploy all five droppers before comparing depth samples.');
    expect(source).toContain('var missionWaterProfile = {');
    expect(source).toContain("type: 'comparison', text: describeDepthComparison");
    expect(source).toContain("className: 'aq-3d-route-map'");
    expect(source).toContain("'aria-label': '3D mission progress'");
    expect(source).toContain("className: 'aq-3d-debrief'");
    expect(source).toContain('function save3DMissionNote()');
    expect(source).toContain('var activeMissionProbes =');
    expect(source).toContain("openMissionEvidenceAtHealth('crop', missionDebrief)");
    expect(source).toContain('function loadMissionEvidenceAtDepth(depth, summaryOverride)');
    expect(source).toContain("className: 'aq-mussel-mission-evidence'");
    expect(source).toContain("className: 'aq-mussel-mission-profile'");
    expect(source).toContain("className: 'aq-mussel-mission-evidence-table'");
    expect(source).toContain("'aria-pressed': selected");
    expect(source).toContain("evidenceSource: 'mission-' + sampleDepth");
    expect(source).toContain("route: 'musseldeep', label: 'Interpret your paired samples'");
    expect(source).toContain('.aq-3d-mission-hud,.aq-3d-probe-hud');
  });

  it('turns field conditions into replayable 3D and guided evidence', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    const scenarioRegistry = source.slice(
      source.indexOf('var AQ_FIELD_MISSION_SCENARIOS = ['),
      source.indexOf('function aqFieldMissionScenario')
    );
    expect(source).toContain('var AQ_FIELD_MISSION_SCENARIOS = [');
    expect(scenarioRegistry.match(/id: '(?:training|freshet|heat-slack)'/g) || []).toHaveLength(3);
    expect(source).toContain("className: 'aq-content-card aq-field-mission-briefing'");
    expect(source).toContain("'aria-labelledby': 'aq-field-scenario-legend'");
    expect(source).toContain("className: 'aq-field-condition-figure'");
    expect(source).toContain('missionScenario.scene.sky');
    expect(source).toContain('missionScenario.scene.water');
    expect(source).toContain('currentVector: { x: 0, z: -.05 }');
    expect(source).toContain('currentVector: { x: .03, z: .09 }');
    expect(source).toContain('currentVector: { x: .003, z: .008 }');
    expect(source).toContain('function aqDescribeMissionCurrent(scenarioId)');
    expect(source).toContain('function aqMissionCurrentDisplacement(scenarioId, seconds)');
    expect(source).toContain('var currentSet = aqMissionCurrentDisplacement(missionScenario.id, dt)');
    expect(source).toContain('boatState.pos.x += currentSet.x');
    expect(source).toContain('boatState.pos.z += currentSet.z');
    expect(source).toContain("className: 'aq-field-current-key'");
    expect(source).toContain("'aria-label': 'Landing'");
    expect(source).toContain("'aria-label': 'Mussel lease'");
    expect(source).toContain("className: 'aq-3d-current-arrow'");
    expect(source).not.toContain('boatState.pos.z += currentDrift');
    expect(source).toContain('missionScenario.waveScale');
    expect(source).toContain('missionScenarioId: missionScenarioId');
    expect(source).toContain('aqMissionScenarioProbeReading(scenario.id');
    expect(source).toContain('scenarioId: guidedMission.scenarioId');
    expect(source).toContain('scenarioId: missionScenario.id');
    expect(source).toContain('debriefScenario.badge');
    expect(source).toContain('missionDepthComparison.summary.scenarioName');
    expect(source).toContain('.aq-field-condition-layout{grid-template-columns:minmax(0,1fr)!important}');
  });

  it('requires the shared evidence decision checkpoint before either mission can return', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    const scenarioRegistry = source.slice(
      source.indexOf('var AQ_FIELD_MISSION_SCENARIOS = ['),
      source.indexOf('function aqFieldMissionScenario')
    );

    expect(scenarioRegistry.match(/decision:\s*\{/g) || []).toHaveLength(3);
    expect(scenarioRegistry.match(/\{ id: '(?:repeat-baseline|declare-harvest|average-depths|resample-after-mixing|use-crop-only|declare-closure|pause-verify-do|add-droppers|leave-unlogged)'/g) || []).toHaveLength(9);
    expect(source).toContain('function aqRecommendedMissionDecisionId(');
    expect(source).toContain('function aqEvaluateMissionDecision(');
    expect(source).toContain("decisionId: missionDecision ? missionDecision.id : ''");
    expect(source).toContain('decisionRecommended: !!(missionDecision && missionDecision.recommended)');

    expect(source).toContain('function openMissionDecisionCheckpoint()');
    expect(source).toContain('function submitMissionDecision(choiceId)');
    expect(source).toContain('setDecision: function(choiceId)');
    expect(source).toContain('reviseDecision: function()');
    expect(source).toContain('boatState.surfaceSampled && boatState.cropDepthSampled && boatState.decisionId');
    expect(source).toContain('decisionId: boatState.decisionId');
    expect(source).toContain("missing.push('choose the best next verification')");

    expect(source).toContain("className: 'aq-mission-decision-panel '");
    expect(source).toContain("h('fieldset',");
    expect(source).toContain("type: 'radio', name: prefix + '-choice'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite'");
    expect(source).toContain('The return leg remains locked until the evidence-aligned response is recorded.');
    expect(source).toContain("className: 'aq-guided-decision-panel'");
    expect(source).toContain("className: 'aq-3d-decision-panel'");

    expect(source).toContain("var steps = ['Leave the town landing', 'Pass the red nun correctly', 'Follow the marked channel to the lease', 'Deploy five seeded droppers', 'Compare surface and crop-depth samples', 'Choose the best next verification', 'Return to the landing'];");
    expect(source).toContain('var complete = guidedMission.step >= 7');
    expect(source).toContain('guidedMission.step !== 7');
    expect(source).toContain("(guidedMission.step + 1) + ' of 7'");
    expect(source).toContain("else if (guidedMission.step === 5) actions = missionDecisionPanel({");
    expect(source).toContain("else if (guidedMission.step === 6) actions = h('div', { className: 'aq-guided-decision-result'");
  });

  it('reports all six 3D milestones, including the verification decision', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('var missionProgressCount = Math.max(0, Math.min(6, Number(hud.missionProgress) || 0))');
    expect(source).toContain("'aria-valuemax': 6");
    expect(source).toContain("missionProgressCount + ' of 6 mission milestones complete'");
    expect(source).toContain('(missionProgressCount / 6 * 100)');
    expect(source).toContain("missionProgressCount + '/6 complete'");
  });

  it('suspends hidden simulations and provides a direct Escape exit path', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('var suspended = !!document.hidden');
    expect(source).toContain("if (key === 'escape')");
    expect(source).toMatch(/if \(!alive\) return;\s+var now = performance\.now\(\);\s+if \(suspended\)/);
    expect(source).toContain('onExit: stopSim');
    expect(source).toContain('if (suspended)');
    expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
  });

  it('keeps the topic library compact, searchable, and responsive', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain("var navSearchHook = useState('')");
    expect(source).toContain("type: 'search', value: navSearch");
    expect(source).toContain("'aria-describedby': 'aq-topic-search-help'");
    expect(source).toContain("'aria-keyshortcuts': 'Escape'");
    expect(source).toContain("'aria-label': 'Clear topic search'");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain("searchMatches.slice(0, 30)");
    expect(source).toContain("currentArea ? ' · Current area' : ''");
    expect(source).toContain("className: 'aq-primary-nav'");
    expect(source).toContain('@media(max-width:620px)');
  });

  it('supports persistent comfortable reading and sequential topic flow', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('var comfortableReadingHook = useState(!!stateInit.comfortableReading)');
    expect(source).toContain('s.comfortableReading = comfortableReading');
    expect(source).toContain("'aria-pressed': comfortableReading");
    expect(source).toContain("comfortableReading ? ' aq-comfortable-reading' : ''");
    expect(source).toContain('var topicSequence = []');
    expect(source).toContain("'aria-label': previousTopic ? 'Previous topic: '");
    expect(source).toContain("'aria-label': nextTopic ? 'Next topic: '");
    expect(source).toContain("h('details', { open: libraryOpen");
    expect(source).toContain('onToggle: function(event) { setLibraryOpen(event.currentTarget.open); }');
    expect(source).toContain('setLibraryOpen(false)');
    expect(source).toContain('.aq-topic-pager{grid-template-columns:1fr!important}');
  });

  it('provides semantic lesson focus and keyboard-first topic search', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('var topicSearchRef = useRef(null)');
    expect(source).toContain("if (event.key === '/' && !isTyping)");
    expect(source).toContain("target.matches('input, textarea, select, [contenteditable=\"true\"]')");
    expect(source).toContain("document.addEventListener('keydown', onLabNavigationKeyDown)");
    expect(source).toContain("document.removeEventListener('keydown', onLabNavigationKeyDown)");
    expect(source).toContain('topicSearchRef.current.focus()');
    expect(source).toContain('content.focus({ preventScroll: true })');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain("content.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth'");
    expect(source).toContain("href: '#aq-topic-content', className: 'aq-skip-link'");
    expect(source).toContain("h('main', { id: 'aq-topic-content'");
    expect(source).toContain("'aria-labelledby': 'aq-topic-heading'");
    expect(source).toContain("h('h1', { id: 'aq-topic-heading'");
  });
  it('keeps every registered aquaculture topic mapped to exactly one renderer', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    const registryStart = source.indexOf('var TAB_GROUPS = [');
    const registryEnd = source.indexOf('function getTopicLocation', registryStart);
    const registry = source.slice(registryStart, registryEnd);
    const topicIds = [...registry.matchAll(/\{ id: '([^']+)', label: '[^']+' \}/g)].map((match) => match[1]);
    const routerStart = source.indexOf("tab === 'home' ? homeTab()");
    const routerEnd = source.indexOf("h('div', null, 'Unknown tab')));", routerStart);
    const router = source.slice(routerStart, routerEnd);
    const routeIds = [...router.matchAll(/tab === '([^']+)'/g)].map((match) => match[1]);
    expect(topicIds).toHaveLength(142);
    expect(new Set(topicIds).size).toBe(topicIds.length);
    expect(new Set(routeIds).size).toBe(routeIds.length);
    expect([...new Set(routeIds)].sort()).toEqual([...new Set(topicIds)].sort());
    expect((source.match(/function hatcheryTab\(\)/g) || [])).toHaveLength(1);
    expect((source.match(/function hatcheryDeepTab\(\)/g) || [])).toHaveLength(1);
    expect((source.match(/function kelpIndustryTab\(\)/g) || [])).toHaveLength(1);
    expect((source.match(/function kelpDeepTab\(\)/g) || [])).toHaveLength(1);
  });

  it('resumes valid topics, deep-links navigation, and exposes honest interactive mission modes', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain("lastTopic: 'home'");
    expect(source).toContain('lastContentTopic: null');
    expect(source).toContain("useState(typeof stateInit.lastTopic === 'string' ? stateInit.lastTopic : 'home')");
    expect(source).toContain("url.searchParams.set('aqTopic', topicId)");
    expect(source).toContain("window.addEventListener('popstate', restoreTopicFromAddress)");
    expect(source).toContain("window.removeEventListener('popstate', restoreTopicFromAddress)");
    expect(source).toContain("else if (event && event.type === 'popstate') setTab('home')");
    expect(source).toContain("if (tab !== 'home') {");
    expect(source).toContain('savedNavigation.lastContentTopic = tab');
    expect(source).toContain("'Continue learning'");
    expect(source).toContain("{ id: 'mission-1', interactive: true");
    expect(source).toContain('var MISSION_SCENARIOS = {');
    expect(source.match(/'mission-(?:[2-9]|1[0-3])': {/g) || []).toHaveLength(12);
    expect(source).toContain("done ? 'Evidence saved' : (is3D ? '3D or guided 2D' : 'Decision scenario')");
    expect(source).toContain('Missions 2–13 are decision scenarios');
  });

  it('extends comfortable reading to small interface text and higher-contrast muted copy', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('.aq-comfortable-reading summary,.aq-comfortable-reading button');
    expect(source).toContain('[style*="font-size: 10px"]');
    expect(source).toContain('[style*="font-size: 13px"]{font-size:14px!important;line-height:1.65!important;}');
    expect(source).toContain('[style*="color: #94a3b8"]');
    expect(source).toContain('{color:#cbd5e1!important;}');
  });
  it('adds persistent guided journeys, recent topics, and accessible bookmarks without new tabs', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('visitedTopics: {}');
    expect(source).toContain('recentTopics: []');
    expect(source).toContain('bookmarkedTopics: []');
    expect(source).toContain('var learningProgressHook = useState({');
    expect(source).toContain('var LEARNING_JOURNEYS = [');
    expect(source).toContain("{ id: 'first-shift'");
    expect(source).toContain("{ id: 'healthy-stock'");
    expect(source).toContain("{ id: 'farm-plan'");
    expect(source).toContain("{ id: 'careers-classroom'");
    expect(source).toContain('nextVisited[tab] = Date.now()');
    expect(source).toContain('nextRecent = [tab].concat');
    expect(source).toContain('.slice(0, 8)');
    expect(source).toContain('function toggleTopicBookmark(topicId)');
    expect(source).toContain("'Saved topics'");
    expect(source).toContain("'Recent topics'");
    expect(source).toContain("'Guided learning journeys'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-pressed': currentTopicBookmarked");
    expect(source).toContain("currentTopicBookmarked ? '\u2605 Saved' : '\u2606 Save topic'");
  });
  it('provides device-local reflections and an honest My Learning summary', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('topicNotes: {}');
    expect(source).toContain("var noteDraftHook = useState('')");
    expect(source).toContain('function updateTopicNote(value)');
    expect(source).toContain("String(value || '').slice(0, 600)");
    expect(source).toContain('delete nextNotes[tab]');
    expect(source).toContain('{ topicNotes: nextNotes }');
    expect(source).toContain('var notedTopicIds = Object.keys(learningProgress.topicNotes || {})');
    expect(source).toContain("'Reflections'");
    expect(source).toContain("id: 'aq-my-learning-heading'");
    expect(source).toContain("'My learning'");
    expect(source).toContain("'Topics visited'");
    expect(source).toContain("'Paths completed'");
    expect(source).toContain("'Recommended next: '");
    expect(source).toContain('Visiting shows exploration; marking a lesson complete records intentional progress.');
    expect(source).toContain("'aria-valuetext': summary.completed + ' of ' + journey.topics.length + ' lessons completed'");
    expect(source).toContain("className: 'aq-topic-reflection'");
    expect(source).toContain("id: 'aq-topic-note', value: noteDraft, maxLength: 600");
    expect(source).toContain("'aria-describedby': 'aq-topic-note-help aq-topic-note-status'");
    expect(source).not.toContain("{ id: 'aq-topic-note-status', 'aria-live':");
  });

  it('applies a cohesive responsive visual system with motion safeguards', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain("radial-gradient(circle at 8% 0%, rgba(45,212,191,0.15), transparent 30%)");
    expect(source).toContain("className: 'aq-home-card aq-learning-card'");
    expect(source).toContain("className: 'aq-home-card aq-journeys-card'");
    expect(source).toContain("className: 'aq-home-card aq-operations-card'");
    expect(source).toContain("className: 'aq-metric-card'");
    expect(source).toContain("className: 'aq-journey-card'");
    expect(source).toContain("className: 'aq-btn aq-operation-tile'");
    expect(source).toContain("className: 'aq-lesson-header'");
    expect(source).toContain('.aq-home-card:before');
    expect(source).toContain('.aq-btn:not(:disabled):hover');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('.aq-primary-nav{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source.match(/className: 'aq-section-kicker'/g) || []).toHaveLength(291);
    expect(source).toContain("className: 'aq-topic-group'");
    expect(source).toContain("className: 'aq-topic-group-summary'");
    expect(source).toContain('.aq-section-kicker:after');
    expect(source).toContain('.aq-topic-content tbody tr:hover');
    expect(source).toContain('.aq-topic-content input[type="range"]{accent-color:#2dd4bf');
    expect(source).toContain('.aq-topic-content table{display:block;overflow-x:auto}');
  });
  it('adds evidence-based completion, saved decision missions, and seven quiz checkpoints', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('completedTopics: {}');
    expect(source).toContain('function toggleTopicCompletion(topicId)');
    expect(source).toContain("className: 'aq-btn aq-complete-topic'");
    expect(source).toContain('function completeScenarioMission(missionId)');
    expect(source).toContain('reflection.length < 20');
    expect(source).toContain("mode: 'decision-scenario'");
    expect(source).toContain('<section><h2>Mission evidence</h2>');
    expect(source).toContain('var QUIZ_CHECKPOINTS = [');
    expect(source.match(/id: 'checkpoint-[1-7]'/g) || []).toHaveLength(7);
    expect(source).toContain('QUIZ_QUESTIONS.slice(checkpoint.start, checkpoint.start + 10)');
    expect(source).toContain('function saveQuizCheckpointResult(checkpointId, score, total)');
    expect(source).toContain('Skip for now');
    expect(source).toContain('pathsCompleted');
  });
});
