// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(modulesDir, 'react'));
const { createRoot } = require2(resolve(modulesDir, 'react-dom/client'));
const act = React.act;

function loadModule(fileName) {
  window.React = React;
  global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), fileName), 'utf8'))();
}

describe('Round 6 Wave 21 — P0 Crashes, Security/FERPA & Interactive Classroom Tools', () => {
  beforeEach(() => {
    window.__alloStudentAiDisabled = false;
    window.__alloAiSecretsLocked = false;
    window.__alloQrStudentMode = false;
    window.__alloOfflineOnly = false;
    window._isDesktopBundledApp = false;
    delete window.__alloAiUsable;
    delete window.callGemini;
    delete window.callImagen;
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('concept_quest_teacher keeps all hooks above conditional return and separates role="status" / double inputs', () => {
    const src = readFileSync(resolve(process.cwd(), 'concept_quest_teacher_source.jsx'), 'utf8');
    const earlyReturnIdx = src.indexOf('if (!quest || !engine || escapeState?.isActive === false) return null;');
    const mountedRefIdx = src.indexOf('const mountedRef = React.useRef(true);');
    expect(earlyReturnIdx).toBeGreaterThan(0);
    expect(mountedRefIdx).toBeGreaterThan(0);
    expect(mountedRefIdx).toBeLessThan(earlyReturnIdx);
    // No <label> wrapping two <input>s in GM draft choices
    expect(src).not.toMatch(/<label[^>]*><input type="radio"[^>]*\/><input/);
    // Interactive encounter-changed button outside role="status"
    expect(src).toContain('<p role="status">{tr(\'draft_context_changed\'');
  });

  it('concept_quest_solo, gm, and question sanitize image URLs, guard null rooms/responses, and reject object-shaped option spoilers', () => {
    loadModule('concept_quest_solo_module.js');
    const soloSrc = readFileSync(resolve(process.cwd(), 'concept_quest_solo_source.jsx'), 'utf8');
    const gmSrc = readFileSync(resolve(process.cwd(), 'concept_quest_solo_gm_source.jsx'), 'utf8');
    const qSrc = readFileSync(resolve(process.cwd(), 'concept_quest_solo_question_source.jsx'), 'utf8');

    expect(soloSrc).toContain('alloflow:student-ai-config-changed');
    expect(soloSrc).toContain('alloflow:ai-key-lock-changed');
    expect(soloSrc).toContain('window.__alloStudentAiDisabled === true');
    expect(soloSrc).toContain('enemyMax > 0 ?');
    expect(soloSrc).toContain('onToggle={event => setMapOpen(event.currentTarget.open)}');
    expect(gmSrc).toContain('option.text || option.label');
    expect(gmSrc).toContain('<p role="status">{tr(\'solo_gm_failed\'');
    expect(qSrc).toContain('_safeQuestQuestionImageUrl');
    expect(qSrc).toContain('maxLength={2000}');

    // Runtime check: GM spoiler filter catches object-shaped options & principleOptions
    const helpers = window.AlloModules.ConceptQuestSoloGMHelpers;
    expect(helpers).toBeTruthy();
    const ctx = {
      attempted: false,
      source: 'Photosynthesis produces glucose and oxygen.',
      quest: { phase: 'battle' },
      room: {
        challenge: {
          options: [{ text: 'Chloroplasts' }, { label: 'Mitochondria' }],
          principleOptions: ['Energy conservation'],
        },
      },
    };
    const spoilerPayload = JSON.stringify({
      narrative: 'Look closely at Chloroplasts in the leaf cells.',
      choices: [{ intent: 'investigate', label: 'Look', prompt: 'Look closer' }],
    });
    expect(() => helpers.parseResponse(spoilerPayload, ctx)).toThrow('answer-reveal');
  });

  it('walkthrough_copilot clears realNotes & sendTo on clearAll, hides Compare in real mode, and blocks 0-suggestion Analyze', () => {
    const src = readFileSync(resolve(process.cwd(), 'walkthrough_copilot_source.jsx'), 'utf8');
    expect(src).toContain("setRealNotes('');");
    expect(src).toContain("setSendTo('');");
    expect(src).toContain('setSendResult(null);');
    expect(src).toContain('draft.suggestions.length > 0 && draft.suggestions.every');
    expect(src).toContain('disabled: total === 0 || settled !== total');
    expect(src).toContain("scenario ? React.createElement('button'");
    expect(src).toContain('backdropDownRef.current = e.target === e.currentTarget');
  });

  it('persona_ui fails closed when AI is unavailable/QR-blocked and avoids mutating blueprint items in place', () => {
    const src = readFileSync(resolve(process.cwd(), 'persona_ui_source.jsx'), 'utf8');
    expect(src).not.toContain('window._alloQrBlocked');
    expect(src).toContain('window.__alloQrStudentMode === true');
    expect(src).toContain('const newItems = items.map((item, i) => i !== index ? item : {');
    expect(src).toContain('onToggle={(e) => setFocusDetailsOpen(e.currentTarget.open)}');
    expect(src).toContain('onToggle={(e) => setPlanDetailsOpen(e.currentTarget.open)}');
    expect(src).toContain('key={q.id || i}');
    expect(src).toContain('min-h-0 overflow-y-auto');
  });

  it('view_visual_supports_modal keeps PausableImage hooks unconditional, honors explicit activeStudentProfileId, and sanitizes image URLs', () => {
    const src = readFileSync(resolve(process.cwd(), 'view_visual_supports_modal_source.jsx'), 'utf8');
    const hookIdx = src.indexOf('const [crossOriginRetry, setCrossOriginRetry] = React.useState(false);');
    const earlyRetIdx = src.indexOf('if (!isAnimated) {');
    expect(hookIdx).toBeGreaterThan(0);
    expect(earlyRetIdx).toBeGreaterThan(hookIdx);
    expect(src).toContain('safeVisualSupportImageUrl');
    expect(src).toContain('backdropDownRef');
    expect(src).toContain('data-vs-schedule-reset-confirm="true"');

    // Runtime check: explicit activeStudentProfileId reads the matching student's boards & filters unsafe SVG scripts
    localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'stu-a' }, { id: 'stu-b' }]));
    localStorage.setItem('alloActiveProfileId', JSON.stringify('stu-a'));
    localStorage.setItem('alloSymbolBoards__stu-a', JSON.stringify([{ id: 'b-a', title: 'Student A Board', words: [] }]));
    localStorage.setItem('alloSymbolBoards__stu-b', JSON.stringify([
      {
        id: 'b-b',
        title: 'Student B Board',
        words: [
          { id: 'w1', label: 'Bad SVG', image: 'data:image/svg+xml,<svg><script>alert(1)</script></svg>' },
          { id: 'w2', label: 'Good PNG', image: 'data:image/png;base64,iVBORw0KGgo=' },
        ],
      },
    ]));
    loadModule('view_visual_supports_modal_module.js');
    const Modal = window.AlloModules.VisualSupportsModal.VisualSupportsModal;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        React.createElement(Modal, {
          showVisualSupports: true,
          setShowVisualSupports: () => {},
          vsTab: 'boards',
          setVsTab: () => {},
          activeStudentProfileId: 'stu-b',
          t: (k) => k,
        })
      );
    });
    expect(host.textContent).toContain('Student B Board');
    expect(host.textContent).not.toContain('Student A Board');
    const imgs = Array.from(host.querySelectorAll('img')).map((el) => el.getAttribute('src'));
    expect(imgs).toContain('data:image/png;base64,iVBORw0KGgo=');
    expect(imgs.some((u) => /<script/i.test(u || ''))).toBe(false);
    act(() => { root.unmount(); });
  });

  it('seating_chart blocks prototype pollution and activeLayoutId:"toString" crash in normalizeSeating', () => {
    loadModule('seating_chart_module.js');
    const { normalizeSeating, scoreAssignment } = window.AlloModules.SeatingChart._testing;
    const malicious = JSON.parse('{"activeLayoutId":"toString","layouts":{"__proto__":{"id":"__proto__","name":"evil","seats":[]},"room1":{"id":"room1","name":"Room 1","seats":[{"id":"s1","x":10,"y":10}],"furniture":[],"assignments":{"s1":"Ada"}}}}');
    const normalized = normalizeSeating(malicious, ['Ada']);
    expect(normalized.activeLayoutId).toBe('room1');
    expect(Object.prototype.hasOwnProperty.call(normalized.layouts, '__proto__')).toBe(false);
    expect(typeof normalized.layouts[normalized.activeLayoutId]).toBe('object');
    // scoreAssignment handles Object.prototype names safely
    const scored = scoreAssignment(normalized.layouts.room1, { s1: 'toString' }, [{ id: 'c1', type: 'front_row', students: ['constructor'] }]);
    expect(typeof scored.score).toBe('number');
  });
});
