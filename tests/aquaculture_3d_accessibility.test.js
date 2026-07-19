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
    expect(source).toContain("s3.completedMissions['mission-1'] = { completedAt: Date.now() }");
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
});
