// 2026-09-14, three student-facing fixes Aaron asked for:
//  1. The live-session strip that sat over the top of the page for the whole
//     session is now a header button with a popover (code, codename, AI
//     status, connection, retry, leave). Strips remain only for join errors.
//  2. The service worker's activate purge no longer deletes caches it does not
//     own, so the 88 MB Kokoro model in 'transformers-cache' survives deploys.
//  3. The quiz navigation row keeps clearance for the Student Tools launcher
//     on phones so Next / Review & submit are never under it.
// Source pins, the way the other header tests are written (mounting HeaderBar
// needs ~100 host props).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const header = read('view_header_source.jsx');
const headerModule = read('view_header_module.js');
const headerMirror = read('desktop/web-app/public/view_header_module.js');
const anti = read('AlloFlowANTI.txt');
const antiMirror = read('desktop/web-app/src/AlloFlowANTI.txt');

describe('student live-session status lives in the header', () => {
  it('replaces the desktop-only status pill with a button at every width', () => {
    expect(header).not.toContain('hidden md:inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-emerald-300/60');
    expect(header).toContain('data-live-status-trigger=""');
    expect(header).toContain('aria-expanded={isLiveStatusOpen}');
    expect(header).toContain('aria-haspopup="dialog"');
    expect(header).toContain('liveStatus, notebookEntryCount');
  });

  it('opens a modal, named, focus-trapped popover with the four facts and three actions', () => {
    expect(header).toContain('_headerUseFocusTrap(_liveStatusRef, isLiveStatusOpen, handleCloseLiveStatus)');
    expect(header).toContain('aria-labelledby="header-live-status-title"');
    const start = header.indexOf('data-live-status-dialog=""');
    const end = header.indexOf('<div aria-hidden="true" className="fixed inset-0 z-[90]" onClick={handleCloseLiveStatus}>', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const dialog = header.slice(start, end);
    for (const label of ['Codename', 'Connection', '_liveAiLabel', '_liveConnectionLabel']) expect(dialog).toContain(label);
    expect(dialog).toContain("liveStatus.nickname ? 'Change codename' : 'Set codename'");
    expect(dialog).toContain('!_liveConnected && liveStatus && typeof liveStatus.retryConnection === \'function\'');
    expect(dialog).toContain('liveStatus.leave()');
  });

  it('colours the button by connection state, stale host first', () => {
    // (fills darkened to 700/800 for contrast, and the contrast theme overrides them: see below)
    expect(header).toContain("_liveHostStale ? 'bg-rose-700 border-rose-300/60' : _liveConnected ? 'bg-emerald-700 border-emerald-300/60' : 'bg-amber-800 border-amber-300/60'");
    expect(header).toContain("const _liveConnected = !_liveHostStale && (_liveConnectionStatus === 'connected' || _liveConnectionStatus === 'idle')");
  });

  it('calls only registered header.* keys for the new labels', () => {
    for (const key of ['live_status_tooltip', 'live_status_title', 'codename', 'change_codename', 'set_codename', 'ai_tools_off']) {
      expect(header).not.toContain(`t('header.${key}')`);
    }
  });

  it('ships in the built module and its desktop mirror', () => {
    expect(headerModule).toContain('data-live-status-trigger');
    expect(headerMirror).toBe(headerModule);
  });

  it('is fed by the host with nickname, AI status, connection, host state, and the three actions', () => {
    const site = anti.indexOf('liveStatus={!isTeacherMode && !activeSessionCode &&');
    expect(site).toBeGreaterThan(0);
    const props = anti.slice(site, anti.indexOf('} : null}', site));
    for (const field of ['nickname: studentNickname', 'aiConfigured: studentAiConfigured', 'aiSetupAllowed: studentAiSetupAllowed', 'connection: liveSessionConnectionState.status', 'hostState: liveHostConnectionState', 'retryConnection: retryLiveSessionConnection', 'leave: leaveLiveSession', 'changeCodename: () => setShowStudentWelcome(true)']) {
      expect(props).toContain(field);
    }
  });

  it('keeps the top strips only for joins that are in progress or failed', () => {
    expect(anti).toContain("window.__alloQrStudentMode?.type === 'live' && (liveJoinError || (liveJoinStatus && !activeSessionCode)) && (");
    expect(anti).toContain("window.__alloQrStudentMode?.type === 'mailbox-live' && (mbJoinError || (mbJoinStatus && !activeSessionCode)) && (");
    expect(anti).not.toContain("(liveJoinStatus || activeSessionCode) && (");
    expect(anti).not.toContain("(mbJoinStatus || activeSessionCode) && (");
    // Codename lives in the header popover now; the strips no longer carry it.
    // ...and since the homework strip moved too, no strip carries it any more.
    expect(anti.match(/studentNickname \? 'Change codename' : 'Set codename'/g)).toBeNull();
    expect(antiMirror).toBe(anti);
  });
});

describe('service worker purge spares caches it does not own', () => {
  it('deletes only previous AlloFlow shell caches in the source worker', () => {
    const sw = read('desktop/web-app/public/sw.js');
    expect(sw).toContain("keys.filter(k => k.startsWith('alloflow-v') && k !== CACHE_NAME)");
    expect(sw).not.toContain('keys.filter(k => k !== CACHE_NAME)');
    expect(sw).toContain('transformers-cache');
  });

  it('build.js anchors on the scoped filter and narrows it for the student shell', () => {
    const build = read('build.js');
    expect(build).toContain(`sw.includes("keys.filter(k => k.startsWith('alloflow-v') && k !== CACHE_NAME)")`);
    expect(build).toContain(`.replace("keys.filter(k => k.startsWith('alloflow-v') && k !== CACHE_NAME)", "keys.filter(k => k.startsWith('alloflow-student-shell-v') && k !== CACHE_NAME)")`);
    expect(build).not.toContain(`sw.includes("keys.filter(k => k !== CACHE_NAME)")`);
  });

  it('the published student shell worker is already prefix-scoped', () => {
    expect(read('app/sw.js')).toContain("keys.filter(k => k.startsWith('alloflow-student-shell-v') && k !== CACHE_NAME)");
  });
});

describe('quiz navigation clears the Student Tools launcher on phones', () => {
  it('pads the navigation row on the launcher side below the md breakpoint', () => {
    const quiz = read('view_quiz_source.jsx');
    const row = quiz.indexOf("'flex items-center gap-2 flex-wrap pr-20 md:pr-0 '");
    expect(row).toBeGreaterThan(0);
    const rowMarkup = quiz.slice(row, quiz.indexOf('Review &amp; submit', row));
    expect(rowMarkup).toContain("goToAssessmentQuestion(currentQuestionIdx + 1)");
    expect(read('view_quiz_module.js')).toContain('flex items-center gap-2 flex-wrap pr-20 md:pr-0 ');
    // The launcher this clears: pinned bottom-right, 12px in, on small screens.
    const fab = read('view_fab_stack_source.jsx');
    expect(fab).toContain('right: calc(12px + env(safe-area-inset-right, 0px)) !important;');
  });
});

describe('AI-only affordances stay hidden when student AI is off', () => {
  it('the glossary health check runs and renders for teachers only', () => {
    const effect = anti.slice(anti.indexOf('const glossaryHealthCheckIdRef ='), anti.indexOf('const resilientJsonParse ='));
    expect(effect).toContain("if (activeView !== 'glossary') return;\n      // Teacher-only (2026-09-14)");
    expect(effect).toContain('if (!isTeacherMode) return;');
    expect(effect).toContain('}, [activeView, isTeacherMode, generatedContent?.id, glossaryHealthSignature, runGlossaryHealthCheck]);');
    const glossary = read('view_glossary_source.jsx');
    expect(glossary).toContain("{isTeacherMode && (glossaryHealthCheck || isRunningHealthCheck) && activeView === 'glossary' && <div");
    expect(read('view_glossary_module.js')).toBe(read('desktop/web-app/public/view_glossary_module.js'));
  });

  it('every quiz explainer affordance needs a callable AI function, not just the mode flag', () => {
    const quiz = read('view_quiz_source.jsx');
    expect(quiz.match(/var aiExplainerEnabled = !!\(modeStrat && modeStrat\.render && modeStrat\.render\.aiExplainerOnFail\) && typeof p\.callGemini === 'function';/g)?.length).toBe(4);
    expect(quiz).toContain("var _aiExplainerEnabled = !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail) && typeof props.callGemini === 'function';");
    expect(quiz).not.toContain("var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail);\n");
    expect(read('view_quiz_module.js')).toBe(read('desktop/web-app/public/view_quiz_module.js'));
  });
});

describe('teacher signals live in the header popover (2026-09-14)', () => {
  const anti = read('AlloFlowANTI.txt');
  const header = read('view_header_source.jsx');
  it('the host feeds signal options, the current signal, send, clear and the privacy note through liveStatus', () => {
    const site = anti.indexOf('liveStatus={!isTeacherMode && !activeSessionCode &&');
    const props = anti.slice(site, anti.indexOf("})() : null } : null}", site));
    for (const s of ['signals: (user && user.uid) ? (() => {', 'LIVE_SIGNAL_FRESH_MS', "options: LIVE_SIGNAL_OPTIONS.map(", 'send: (id) => {', 'clear: () => {', "privacyNote: t('live_signals.privacy_note')"]) expect(props).toContain(s);
    // Enum-only: send refuses ids outside LIVE_SIGNAL_OPTIONS.
    expect(props).toContain('if (!LIVE_SIGNAL_OPTIONS.some((opt) => opt.id === id)) return false;');
  });
  it('the floating bottom-right Signal button is gone', () => {
    expect(anti).not.toContain('setShowStudentSignals(v => !v)');
    expect(anti).not.toContain("t('live_signals.button') || '✋ Signal'");
    expect(read('desktop/web-app/src/AlloFlowANTI.txt')).toBe(anti);
  });
  it('the popover lists the signals, marks the sent one, offers clear, and the pill shows the sent emoji', () => {
    expect(header).toContain('data-live-signals=""');
    expect(header).toContain("aria-pressed={_liveSignalCurrent ? _liveSignalCurrent.id === opt.id : false}");
    expect(header).toContain("{_liveSignalCurrent && <span aria-hidden=\"true\" title={_liveSignalCurrent.label}>{_liveSignalCurrent.emoji}</span>}");
    expect(header).toContain("onClick={() => liveStatus.signals.clear()}");
    expect(read('view_header_module.js')).toContain('data-live-signals');
    expect(read('desktop/web-app/public/view_header_module.js')).toBe(read('view_header_module.js'));
  });
});

describe('homework-mode students get the same header status control (2026-09-14)', () => {
  const anti = read('AlloFlowANTI.txt');
  const header = read('view_header_source.jsx');
  it('the fixed homework strip is gone and liveStatus carries mode: homework for the assignment entry types', () => {
    expect(anti).not.toContain("t('mailbox.homework_ready') || 'Homework ready ·'");
    expect(anti).toContain("liveStatus={!isTeacherMode && !activeSessionCode && ['assignment', 'assignment-pack', 'assignment-pack-hosted'].includes(window.__alloQrStudentMode?.type) ? { mode: 'homework', nickname: studentNickname, aiConfigured: studentAiConfigured, aiSetupAllowed: studentAiSetupAllowed, changeCodename: () => setShowStudentWelcome(true) } : !isTeacherMode && activeSessionCode ? {");
    expect(anti.match(/studentNickname \? 'Change codename' : 'Set codename'/g)).toBeNull();
    expect(read('desktop/web-app/src/AlloFlowANTI.txt')).toBe(anti);
  });
  it('the header shows a violet Homework pill whose popover has codename and AI but no code, connection, signals or leave', () => {
    expect(header).toContain("const _isHomeworkStatus = !!(liveStatus && liveStatus.mode === 'homework');");
    expect(header).toContain("{!isTeacherMode && (activeSessionCode || _isHomeworkStatus) && (");
    expect(header).toContain("data-live-status-mode={_isHomeworkStatus ? 'homework' : 'live'}");
    expect(header).toContain("bg-violet-700 border-violet-300/60");
    // (the row labels moved to the themed _liveLabel token, 2026-09-15)
    expect(header).toContain("{!_isHomeworkStatus && <div className=\"flex items-baseline justify-between gap-3\"><span className={`font-bold ${_liveLabel}`}>{t('session.code') || 'Class code'}</span>");
    expect(header).toContain("{!_isHomeworkStatus && <div className=\"flex items-baseline justify-between gap-3\"><span className={`font-bold ${_liveLabel}`}>{'Connection'}</span>");
    expect(read('desktop/web-app/public/view_header_module.js')).toBe(read('view_header_module.js'));
  });
});

describe('the status pill and popover follow the app theme (2026-09-15)', () => {
  const header = read('view_header_source.jsx');
  it('the popover takes its colours from _headerPanelSkin in dark and contrast', () => {
    expect(header).toContain("const _liveDark = theme === 'dark' || theme === 'contrast';");
    expect(header).toContain("const _livePanel = _liveDark ? _skin.panel : 'bg-white border-slate-200 text-slate-800';");
    // No hard-coded light surface left on the dialog itself.
    const start = header.indexOf('data-live-status-dialog=""');
    const dialog = header.slice(start, header.indexOf('<div aria-hidden="true" className="fixed inset-0 z-[90]" onClick={handleCloseLiveStatus}>', start));
    expect(dialog).not.toMatch(/className="[^"]*\bbg-white\b/);
    expect(dialog).not.toMatch(/className="[^"]*\btext-slate-800\b/);
    expect(dialog).toContain('${_livePanel}');
    expect(dialog).toContain('${_liveLabel}');
    expect(dialog).toContain('${_liveSurface}');
  });

  it('uses the contrast palette for the pill and puts the state in the label there', () => {
    expect(header).toContain("const _liveTone = theme === 'contrast'\n    ? 'bg-black border-yellow-400 !text-yellow-400'");
    expect(header).toContain("theme === 'contrast' ? 'bg-black border-yellow-400 !text-yellow-400' : 'bg-violet-700 border-violet-300/60'");
    expect(header).toContain("{theme === 'contrast' && !_isHomeworkStatus && <span className=\"font-bold\">· {_liveConnectionLabel}</span>}");
  });

  it('fills the pill at 700/800 weight so white text clears 4.5:1 (measured in Chromium)', () => {
    for (const cls of ['bg-rose-700', 'bg-emerald-700', 'bg-amber-800', 'bg-violet-700']) expect(header).toContain(cls);
    for (const cls of ['bg-rose-600 border-rose-300/60', 'bg-emerald-600 border-emerald-300/60', 'bg-amber-600 border-amber-300/60', 'bg-violet-600 border-violet-300/60']) expect(header).not.toContain(cls);
    expect(read('desktop/web-app/public/view_header_module.js')).toBe(read('view_header_module.js'));
  });
});

describe('header controls with a coloured fill clear 4.5:1 on white text (2026-09-15)', () => {
  const header = read('view_header_source.jsx');
  // Measured in Chromium against the Tailwind palette: indigo-500 4.47,
  // emerald-600 3.77, violet-500 4.23, sky-500 2.77, teal-600 3.74, green-600
  // 3.30, amber-600 3.19 — all below AA for white text. Their 600/700/800
  // counterparts pass (indigo-600 6.29, emerald-700 5.48, violet-600 5.70).
  const FAILING = ['bg-indigo-500', 'bg-emerald-500', 'bg-emerald-600', 'bg-violet-500', 'bg-sky-500', 'bg-sky-600', 'bg-teal-600', 'bg-green-600', 'bg-amber-600'];
  it('no fill that fails with white text is paired with text-white', () => {
    for (const cls of FAILING) {
      const hits = header.split('\n').filter((line) => line.includes(cls) && /text-white/.test(line));
      expect(hits, `${cls} is used with text-white: ${hits[0]?.trim().slice(0, 120)}`).toEqual([]);
    }
  });
  it('the five controls that used them now use the darker shade', () => {
    expect(header).toContain("focusMode ? 'bg-indigo-600 text-white' : _skin.chip");          // focus-mode chip
    expect(header).toContain("isBotVisible ? 'bg-indigo-600 text-white shadow-md'");          // bot toggle
    expect(header).toContain("'bg-violet-600 text-white shadow-lg shadow-violet-500/50'");    // teacher AI backend
    expect(header.match(/bg-emerald-700 text-white border-emerald-300/g)?.length).toBe(2);    // session + personal AI
    expect(read('desktop/web-app/public/view_header_module.js')).toBe(read('view_header_module.js'));
  });
});
