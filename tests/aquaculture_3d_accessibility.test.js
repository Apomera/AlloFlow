import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Aquaculture Lab 3D farm accessibility contract', () => {
  it('provides a focusable, described simulator and protects form input from shortcuts', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain("tabIndex: 0, role: 'application'");
    expect(source).toContain("'aria-roledescription': 'Interactive 3D aquaculture farm simulator'");
    expect(source).toContain("'aria-keyshortcuts': 'W A S D ArrowUp ArrowDown ArrowLeft ArrowRight F P Escape'");
    expect(source).toContain('event.currentTarget.focus()');
    expect(source).toContain("event.currentTarget.style.outline = '3px solid #5eead4'");
    expect(source).toContain("target.matches('input, textarea, select, button, [contenteditable=\"true\"]')");
    expect(source).toContain("window.addEventListener('keydown', onKeyDown)");
    expect(source).toContain('if (target !== canvas) return');
    expect(source).toContain("if (e.repeat && (key === 'f' || key === 'p')) return");
    expect(source).toContain("canvas.addEventListener('blur', clearKeys)");
    expect(source).toContain("canvas.removeEventListener('blur', clearKeys)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown)");
    expect(source).toContain('WASD or arrow keys to pilot');
    expect(source).toContain('P to take a water-quality probe reading');
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
    expect(source).toContain("s3.completedMissions['mission-1'] = { completedAt: Date.now(), mode: '3d' }");
  });

  it('provides touch and assistive-technology controls with safe release cleanup', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquaculture.js'), 'utf8');
    expect(source).toContain('setControl: function(key, active)');
    expect(source).toContain("'aria-label': 'On-screen vessel controls'");
    expect(source).toContain('props.onPointerDown = function(event)');
    expect(source).toContain('props.onLostPointerCapture = function()');
    expect(source).toContain("event.key === 'Enter' || event.key === ' '");
    expect(source).toContain('clearFarmControlPulses()');
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
    expect(topicIds).toHaveLength(140);
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
    expect(source).toContain("done ? 'Evidence saved' : (is3D ? '3D mission' : 'Decision scenario')");
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
    expect(source.match(/className: 'aq-content-card'/g) || []).toHaveLength(289);
    expect(source.match(/className: 'aq-section-kicker'/g) || []).toHaveLength(289);
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
