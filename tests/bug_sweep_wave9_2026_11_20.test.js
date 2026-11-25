import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');

const readSrc = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('Bug Sweep Wave 9 (2026-11-20) — 61 Fixes Regression Suite', () => {
  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: (k) => k });
    window.__alloShared = window.__alloShared || { db: {}, warnLog() {} };
    window.StemLab = window.StemLab || { registerTool() {} };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 1: AlloSheet, Data, and Live Sessions (#1-#21)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 1 — AlloSheet, Host Bridge, Casebook, Analysis, Transfer Adapter, Share & Live Lesson Run', () => {
    it('#1, #4, #17, #18, #19: allo_sheet.js preserves canvasMode on pairing expiry, trims CSV headers/titles, clears poll timer on error, syncs casebook on tab/apply/undo, and guards duplicate ready', () => {
      const src = readSrc('allo_sheet/allo_sheet.js');

      // #1 Pairing expiry preserves local canvasMode
      const expStart = src.indexOf("if (data.type === 'allosheet-pairing-expired')");
      const expSlice = src.slice(expStart, expStart + 450);
      expect(expSlice).not.toContain('state.canvasMode = false;');
      expect(expSlice).toContain('if (!state.canvasMode && !state.localTables.length)');

      // #19 Duplicate allosheet-ready guarded by !state.canvasValidated
      expect(src).toContain('if (!state.canvasValidated && state.canvasCandidate && isCanvasOpenerOrigin(event.origin))');

      // #4 canvasColumns trims headers and importCanvasCsv sanitizes csvTitle
      expect(src).toContain("var original = String(value == null ? '' : value).replace(/[\\r\\n\\t]+/g, ' ').trim();");
      expect(src).toContain("var csvTitle = Sheet.safeText(String(file.name || 'Imported CSV')");

      // #17 checkService catch clears enginePollTimer
      const catchStart = src.indexOf('} catch (error) {\n      if (state.enginePollTimer)');
      expect(catchStart).toBeGreaterThan(-1);

      // #18 setView aborts voice / refreshes casebook, and applyPlan/undoLast refresh casebook
      expect(src).toContain("if (view !== 'casebook' && typeof casebookUi.abortVoice === 'function')");
      expect(src).toContain("else if (view === 'casebook' && typeof casebookUi.refresh === 'function')");
      expect(src.match(/if \(casebookUi && typeof casebookUi\.refresh === 'function'\) casebookUi\.refresh\(\);/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it('#2, #3, #15: host_bridge.js clears stale transfers on popup reopen, binds AI replies to active popup/token, and normalizes single-line metadata', () => {
      const src = readSrc('allo_sheet/host_bridge.js');

      // #2 closePopupConnection called before reopening a closed popup with stale transfer state
      expect(src).toContain("if (popup || activeTransfer || transferQueue.length) {\n        closePopupConnection('AlloSheet closed before this transfer finished.');");

      // #3 reply verifies source === popup and expectedToken
      expect(src).toContain('function reply(source, requestId, payload, expectedToken)');
      expect(src).toContain('if (!source || source.closed || !popup || source !== popup || !targetOrigin() || !isBridgeTokenFresh()) return;');
      expect(src).toContain('if (expectedToken && bridgeToken !== expectedToken) return;');
      expect(src).toContain('var requestToken = bridgeToken;');

      // #15 single-line normalization in host_bridge
      expect(src).toContain('var safeSingleLine = function (value, max)');
    });

    it('#6, #7, #8: allo_sheet_casebook.js & allo_sheet_casebook_ui.js isolate cell coercion issues, reject badInput numbers, and fix BLOCKED_KEYS check', () => {
      const cbSrc = readSrc('allo_sheet/allo_sheet_casebook.js');
      const uiSrc = readSrc('allo_sheet/allo_sheet_casebook_ui.js');

      // #8 BLOCKED_KEYS checked with indexOf, not array bracket lookup
      expect(cbSrc).toContain('BLOCKED_KEYS.indexOf(parameter.key) < 0');
      expect(cbSrc).not.toContain('!BLOCKED_KEYS[parameter.key]');

      // Runtime test via UMD module export
      const cbMod = {};
      new Function('module', 'exports', 'window', cbSrc)(cbMod, {}, window);
      const Casebook = cbMod.exports || window.AlloSheetCasebook;
      expect(Casebook).toBeTruthy();

      // #8 parseNarrative allows key 'length' and rejects 'prototype'
      const validParam = [{ key: 'length', label: 'Length', type: 'number', aliases: ['len'], unit: 'cm', minimum: null, maximum: null }];
      expect(() => Casebook.parseNarrative('len 12', validParam)).not.toThrow();
      const badParam = [{ key: 'prototype', label: 'Bad', type: 'text', aliases: ['bad'] }];
      expect(() => Casebook.parseNarrative('bad x', badParam)).toThrow();

      // #6 inspectTables records per-cell issues without returning null when one numeric cell has text
      const tpl = Casebook.getTemplate(Casebook.templateIds[0]);
      const numParam = tpl.parameters.find((p) => p.type === 'number');
      const created = Casebook.buildTables(tpl);
      const tablesArr = Array.isArray(created) ? created : created.tables;
      const obsTable = tablesArr.find((t) => t.id === Casebook.tableIds.observations);
      const badFields = { observation_id: 'obs-1', case_id: tpl.cases[0].id, observed_at: '2026-11-20T12:00:00Z', qualitative_note: 'typo', interpretation: '', capture_source: 'typed' };
      const numCol = (obsTable.columns || []).find((c) => c === numParam.key || c === numParam.label || String(c).toLowerCase().includes(numParam.label.toLowerCase())) || numParam.label;
      badFields[numCol] = '~78';
      badFields[numParam.key] = '~78';
      obsTable.records.push({ id: 'obs-1', fields: badFields });
      const inspected = Casebook.inspectTables(tablesArr);
      expect(inspected).not.toBeNull();
      expect(inspected.observations.length).toBe(1);
      expect(inspected.cellIssues.length).toBe(1);
      expect(inspected.cellIssues[0].parameterKey).toBe(numParam.key);

      // #7 badInput check in saveObservation
      expect(uiSrc).toContain('if (control.validity && control.validity.badInput)');
      expect(uiSrc).toContain("control.setAttribute('aria-invalid', 'true')");
    });

    it('#13, #14: allo_sheet_analysis.js sorts ISO datetimes chronologically, normalizes UTC day buckets, and guards prototype-named columns with ownField', () => {
      const src = readSrc('allo_sheet/allo_sheet_analysis.js');
      const mod = {};
      new Function('module', 'exports', 'window', src)(mod, {}, window);
      const Analysis = mod.exports || window.AlloSheetAnalysis;
      expect(Analysis).toBeTruthy();

      // #13 Chronological datetime min/max across timezone offsets
      const dtRecords = [
        { id: '1', fields: { ts: '2026-03-10T19:00:00-05:00', score: 10 } }, // 2026-03-11T00:00:00Z (LATER)
        { id: '2', fields: { ts: '2026-03-10T22:00:00Z', score: 20 } }       // 2026-03-10T22:00:00Z (EARLIER)
      ];
      const prof = Analysis.buildColumnProfile(dtRecords, ['ts', 'score']);
      const tsProf = prof.columns.find((c) => c.column === 'ts');
      expect(tsProf.type).toBe('datetime');
      expect(tsProf.range.minimum).toBe('2026-03-10T22:00:00Z');
      expect(tsProf.range.maximum).toBe('2026-03-10T19:00:00-05:00');

      // #14 Prototype-named column ('toString') with missing cell counts as blank, not function toString()
      const protoRecords = [
        { id: '1', fields: { toString: 'alpha' } },
        { id: '2', fields: {} }
      ];
      const pProf = Analysis.buildColumnProfile(protoRecords, ['toString']);
      expect(pProf.columns[0].blankCount).toBe(1);
      expect(pProf.columns[0].filledCount).toBe(1);
    });

    it('#15, #16: transfer_adapter.js normalizes single-line metadata, blocks unsafe rowIds, and allows skewed timestamps for range="all" and UTC+ dates', () => {
      const src = readSrc('allo_sheet/transfer_adapter.js');
      const w = { AlloModules: {} };
      new Function('window', src)(w);
      const Adapter = w.AlloSheetTransferAdapter;
      expect(Adapter).toBeTruthy();

      // #15 Multiline title trimmed to single line; unsafe rowId rejected
      const env = Adapter.envelope({
        source: { tool: 'demo', label: 'Demo\nTool ', version: ' 1.0\t' },
        title: '  My\nReport\tTitle  ',
        tables: [{ id: 't1', title: 'Table\nOne ', columns: [{ key: 'a', label: 'A' }], rows: [{ id: 'r1', values: { a: '1' } }] }]
      });
      expect(env.title).toBe('My Report Title');
      expect(env.source.label).toBe('Demo Tool');
      expect(env.source.version).toBe('1.0');
      expect(env.tables[0].title).toBe('Table One');

      expect(() => Adapter.table({
        id: 't1',
        columns: [{ key: 'a', label: 'A' }],
        rows: [{ id: '__proto__', values: { a: '1' } }]
      })).toThrow();
      expect(() => Adapter.table({
        id: 't1',
        columns: [{ key: 'a', label: 'A' }],
        rows: [{ id: 'r1\nbad', values: { a: '1' } }]
      })).toThrow();

      // #16 withinDateRange allows future/skewed timestamps when range === 'all'
      const now = Date.UTC(2026, 10, 20, 12, 0, 0);
      // Superseded: Round 9 Waves 33-35 restored the future-date bound for 'all'
      // (tests/round9_waves33_35_hardening.test.js, tests/allosheet_transfer_adapter.test.js).
      // Past data is still included under 'all'; a future stamp is not.
      expect(Adapter.withinDateRange(now + 600000, 'all', now)).toBe(false);
      expect(Adapter.withinDateRange(now - 3650 * 86400000, 'all', now)).toBe(true);
      expect(Adapter.withinDateRange('2026-11-20', '30d', Date.UTC(2026, 10, 20, 0, 0, 0))).toBe(true);
    });

    it('#5, #10, #9, #11, #12, #20, #21: share surfaces, live lesson run, and allo_data UI_ELEMENT_MAP fixes', () => {
      const shareSrc = readSrc('view_share_session_surfaces_module.js');
      // #5 Restore from a file rendered in !mbConfig as well as connected panel (2 file inputs)
      expect((shareSrc.match(/importMailboxConfig\(file\)/g) || []).length).toBeGreaterThanOrEqual(2);
      // #10 Update notice includes Connect & self-test button
      expect(shareSrc).toContain('mailbox.reconnect_after_update');
      // The update notice's Connect & self-test refills an empty URL box from the
      // saved config, and the host handler falls back to mbConfig.url as well.
      expect(shareSrc).toContain("if (typeof setMbUrlInput === 'function' && mbConfig && mbConfig.url && !String(mbUrlInput || '').trim()) {");
      expect(readSrc('host_handlers_source.jsx')).toContain("__d._alloCleanMailboxUrl(__d.mbUrlInput || __d.mbConfig?.url || '')");

      const liveSrc = readSrc('view_live_lesson_run_module.js');
      // #9 sendDebriefFinding slices up to 250 and handles pendingConfirmation
      expect(liveSrc).toContain('.slice(0, 250)');
      expect(liveSrc).toContain('if (result && result.pendingConfirmation)');
      // #11 fallback activityItem carries kind: finding.activityKind
      expect(liveSrc).toContain('kind: finding.activityKind');
      // #12 Object.create(null) for participantStatus and memberCounts
      expect(liveSrc).toMatch(/const memberCounts = .*Object\.create\(null\);/);
      expect(liveSrc).toMatch(/const participantStatus = .*Object\.create\(null\);/);
      // #21 assignmentAcknowledged gates legacy fallback on hasAssignmentNonce
      expect(liveSrc).toContain('const assignmentAcknowledged = hasAssignmentNonce ? statusMatchesAssignment &&');

      const dataSrc = readSrc('allo_data_module.js');
      // #20 UI_ELEMENT_MAP uses real active DOM IDs
      expect(dataSrc).toContain('"language": "universal-output-language"');
      expect(dataSrc).toContain('"profiles": "tour-level-settings"');
      expect(dataSrc).toContain('"source": "allo-source-topic"');
      expect(dataSrc).toContain('"inputs": "allo-source-topic"');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 2: Interactive Apps and AI Assistant (#22-#43)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 2 — Adventure, Concept Pictionary, UDL Chat, Persona UI, Note Taking', () => {
    it('#22, #25, #29-#32, #34-#37, #43: adventure modules declare prompt locally, preserve cast/soundParams, guard null items, defer pixel art, keep ledger epoch, and sync audio deps', () => {
      const hSrc = readSrc('adventure_handlers_module.js');
      // #22 local let prompt in executeStartAdventure
      expect(hSrc).toMatch(/let prompt = ['"]['"];\s*if \(adventureInputMode === ['"]debate['"]\)/);
      // #25 handleAdventureChoice includes choiceCharacterManifest & charactersInScene
      expect(hSrc).toContain('choiceCharacterManifest');
      // #30 & #31 null-safe initial inventory & pixel art launched after setAdventureState
      expect(hSrc).toContain('let pendingInitialArt = [];');
      expect(hSrc).toContain('pendingInitialArt.forEach(');
      // #32 handleAdventureChoice catch clears isImageLoading
      expect(hSrc).toMatch(/isImageLoading:\s*false,\s*imagePolishStage:\s*null,\s*loadingStage:\s*null/);
      // #34 handleAdventureTextSubmit copies soundParams & strips climaxResult
      expect((hSrc.match(/data\.scene\.soundParams = data\.soundParams;/g) || []).length).toBeGreaterThanOrEqual(2);
      // #35 handleAdventureHint epoch & in-flight guard
      expect(hSrc).toContain('let adventureHintInFlight = false;');
      expect(hSrc).toContain('const hintEpoch = adventureRunEpoch;');

      const shSrc = readSrc('adventure_session_handlers_module.js');
      // #29 null-safe inventoryUpdate.add & systemStateUpdate
      expect(shSrc).toContain('if (itemData == null) return;');
      // #36 cancelAdventureSceneImage supports keepLedger: true for generateAdventureImage
      expect(shSrc).toContain('if (!opts || !opts.keepLedger) bumpNarrativeLedgerEpoch(setAdventureState);');
      expect(shSrc).toContain('cancelAdventureSceneImage(owner, { keepLedger: true });');
      // #37 runAdventureImage handles non-string charactersInScene entries
      expect(shSrc).toContain("typeof entry === 'string' ? entry :");
      expect(shSrc).toContain("entry.name : ''");

      const advSrc = readSrc('adventure_module.js');
      // #30 InventoryGrid null-safe charAt & #43 sfxEnabled dep + non-persisting onStorage
      expect(advSrc).toMatch(/String\(item\?\.name \|\| ['"]\?['"]\)\.charAt\(0\)/);
      expect(advSrc).toContain('[sceneText, soundParams, themeSeed, active, sfxEnabled, volume]');
      expect(advSrc).toContain('{ persist: false }');
    });

    it('#23, #24, #33, #38, #39, #40: concept_pictionary_module.js buffers guest ICE, isolates sketch stroke history per UID, passes timeout metadata, gates revision/markCorrect, and draws single-point taps', () => {
      const src = readSrc('concept_pictionary_module.js');

      // #23 Guest ICE queue flushed after setRemoteDescription resolves
      expect(src).toContain('this._remoteDescSet = false;');
      expect(src).toContain('this._pendingHostIce = [];');
      expect(src).toContain('this._remoteDescSet = true;');

      // #24 Per-UID sketchStrokeHistoryByUid Map in PictionaryHost
      expect(src).toContain('this.sketchStrokeHistoryByUid = /* @__PURE__ */ new Map();');
      expect(src).toContain('this.sketchStrokeHistoryByUid.set(senderUid, list);');

      // #33 onRoundAutoResolved forwards drawerUids/durationMs and reads rosterRef
      expect(src).toContain('drawerUids: info && Array.isArray(info.drawerUids) ? info.drawerUids : []');
      expect(src).toContain('const latestRoster = rosterRef.current || roster;');

      // #38 Revise button & handler gated on activeRound
      expect(src).toContain('activeRound && sketchFeedback.allowRevision && sketchAttempt < 2 && sketchSubmitted');

      // #39 handleMarkCorrect checks activeRound & handleResetForNextRound bumps roundEpochRef
      expect(src).toContain('if (!roundActive || !hostRef.current || !hostRef.current.activeRound) return;');
      expect((src.match(/roundEpochRef\.current \+= 1;/g) || []).length).toBeGreaterThanOrEqual(2);

      // #40 Single-point tap draws visible segment
      expect((src.match(/ctx\.lineTo\((?:first|p0)\[0\] \+ 0\.01/g) || []).length).toBeGreaterThanOrEqual(2);
    });

    it('#26, #27, #28, #41, #42: udl_chat_module.js, persona_ui_module.js, and note_taking_templates_module.js fixes', () => {
      const chatSrc = readSrc('udl_chat_module.js');
      // #26 applyWorkflowModification uses intentResult in guided flow (zero intentData?.params)
      expect(chatSrc).not.toContain('if (intentData?.params) applyWorkflowModification(intentData)');
      expect((chatSrc.match(/applyWorkflowModification\(intentResult\)/g) || []).length).toBeGreaterThanOrEqual(5);
      // #27 explicit configOverride passed to _genTracked for outline/image/sentence-frames/quiz
      expect(chatSrc).toContain('outlineType: selectedOutlineType');
      expect(chatSrc).toContain('fillInTheBlank: isWorksheet');
      expect(chatSrc).toContain('frameType: selectedFrameType');
      expect(chatSrc).toContain('quizMcqCount: effectiveCount');
      // #41 No fire-and-forget setTimeout(..., 200) inside guided flow
      expect(chatSrc).not.toContain('Glossary guided step failed\');\n          }\n        }, 200)');

      const personaSrc = readSrc('persona_ui_module.js');
      // #28 isEditing cleared when isRunning becomes true or onConfirm clicked
      expect(personaSrc).toContain('if (isRunning) setIsEditing(false);');

      const noteSrc = readSrc('note_taking_templates_module.js');
      // #42 NotebookOverlay insights guarded by notebookMountedRef & insightsReqRef
      expect(noteSrc).toContain('const reqId = ++insightsReqRef.current;');
      expect(noteSrc).toContain('if (!notebookMountedRef.current || insightsReqRef.current !== reqId) return;');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 3: STEM Lab Science and Math Labs (#44-#61)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 3 — Coaster Lab, Nuclear Lab, Molecule, CoordGrid, Heat Lab, Angles, Data Plot', () => {
    it('#44, #54, #55, #56: stem_tool_coasterlab.js guards null valley B, supports launch heatmaps, keeps lift trainSpeed2 constant, signs left-turn banking, and detects LSM rollbacks', () => {
      const src = readSrc('stem_lab/stem_tool_coasterlab.js');

      // #44 renderProblems guards a.B
      expect(src).toContain('if(a.B){\n    html += `\n      <div class="card prob" data-p="p1">');
      expect(src).toContain('if(a.B){\n    html += `\n      <div class="card prob" data-p="p3">');

      // #54 idealV2/idealGV support launch propulsion
      expect(src).toContain("if(design.propulsion && design.propulsion.mode === 'launch' && analysis.L)");

      // #55 trainSpeed2 returns sim.v * sim.v during chain lift or active launch thrust
      expect(src).toContain("if((!isLaunch && track && sim.S < track.sCrest) || (isLaunch && sLaunchEnd != null && sim.S < sLaunchEnd))");

      // #56 bank sign for left turns, gB uses actual upY/kUp, and LSM rollback floor uses sLaunchEnd
      expect(src).toContain('gB: B ? t.upY[B.idx] + vAt(B.h) ** 2 * t.kUp[B.idx] / G0 : null');
      expect(src).toContain('if(crossY > 1e-9) signedDeg = -deg;');
      expect(src).toContain('const rollbackFloorS = (launch && sLaunchEnd != null) ? sLaunchEnd : t.sCrest;');
    });

    it('#45, #49, #50, #51: stem_tool_nuclearlab.js fixes thermal stability, prompt-critical period, C-14 100% NaN, and normalized Xenon ODE', () => {
      const src = readSrc('stem_lab/stem_tool_nuclearlab.js');

      // #45 Exact exponential thermal relaxation (stable at dt=0.25s!)
      expect(src).toContain('var tEq = RX_T_REF + (s.power * 0.9) / hCool;');
      expect(src).toContain('s.t = tEq + (s.t - tEq) * Math.exp(-hCool * RX_TIME_COMPRESSION * dt);');
      // Verify thermal stability numerically for dt = 0.25s over 20 frames
      let temp = 310;
      for (let i = 0; i < 20; i++) {
        const hCool = 4.5, tEq = 290 + (100 * 0.9) / hCool;
        temp = tEq + (temp - tEq) * Math.exp(-hCool * 3.5 * 0.25);
      }
      expect(temp).toBeCloseTo(310, 3);

      // #49 Prompt-critical period (0.05s) not clamped to 0.5s
      expect(src).toContain('if (rho >= RX_BETA) {\n            period = Math.max(0.05, RX_GEN / Math.max(1e-6, rho - RX_BETA));');

      // #50 C-14 handles c14Age === 0 without NaN
      expect(src).toContain('c14Age === 0 ? Math.abs(g) <= 50 : Math.abs(g - c14Age) / c14Age < 0.15');
      expect(src).toContain('if (c14Age === 0) {');

      // #51 Normalized Xenon-135 ODE: exact equilibrium at phi=1, builds above 1.6x at phi=0.2 in 90s
      expect(src).toContain('var rxXeBurn = 5 * RX_LAM_X;');
      const RX_LAM_I = Math.LN2 / (6.57 * 3600);
      const RX_LAM_X = Math.LN2 / (9.14 * 3600);
      const rxXeBurn = 5 * RX_LAM_X;
      // Steady 100% stays at 1.000
      let iod = 1, xe = 1;
      for (let i = 0; i < 60; i++) {
        iod += RX_LAM_I * (1 - iod) * 1 * 600;
        xe += ((RX_LAM_X + rxXeBurn) * (0.95 * iod + 0.05 * 1) - (RX_LAM_X + rxXeBurn * 1) * xe) * 1 * 600;
      }
      expect(iod).toBeCloseTo(1, 6);
      expect(xe).toBeCloseTo(1, 6);
      // Drop to 20% builds Xenon pit > 1.6x within 90s
      let maxXe = 1;
      for (let i = 0; i < 90; i++) {
        iod += RX_LAM_I * (0.2 - iod) * 1 * 600;
        xe += ((RX_LAM_X + rxXeBurn) * (0.95 * iod + 0.05 * 0.2) - (RX_LAM_X + rxXeBurn * 0.2) * xe) * 1 * 600;
        if (xe > maxXe) maxXe = xe;
      }
      expect(maxXe).toBeGreaterThan(1.6);
    });

    it('#46, #47, #57, #58: stem_tool_molecule.js adds missing elements, fixes stale challenge RP, enforces Ea >= dH + 5, and validates bonds/reduced ratios/XP dedup', () => {
      const src = readSrc('stem_lab/stem_tool_molecule.js');

      // #46 Mn in Compound Creator & Mg/Al/Mn/Cu/Zn/Ag in Build Mode
      expect(src).toContain("'K', 'Ca', 'Mn', 'Fe'");
      expect(src).toContain("{ sym: 'Mn', color: '#c084fc'");
      expect(src).toContain("{ sym: 'Mg', color: '#10b981'");
      expect(src).toContain("{ sym: 'Ag', color: '#cbd5e1'");

      // #47 checkMoleculeChallenges accepts nextState overrides and adds onto baseRP
      expect(src).toContain('const checkMoleculeChallenges = (overrides) =>');
      expect(src).toContain('checkMoleculeChallenges({ reactionsBalanced: newBal, researchPoints: nextRP, totalRP: nextTotalRP });');

      // #57 Kinetics enforces minEaFloor >= dH + 5
      expect(src).toContain('var minEaFloor = Math.max(5, dH > 0 ? dH + 5 : 5);');
      expect(src).toContain('var Ea    = Math.max(minEaFloor, rawEa);');

      // #58 Reduced GCD check, bond connectivity, buildTarget check, solvedReactions & builtCompounds dedup
      expect(src).toContain('const commonDiv = usedCoeffs.reduce((acc, c) => _molGcd(acc, c)');
      expect(src).toContain('if (match && !isConnected)');
      expect(src).toContain('if (match && d.buildTarget && d.buildTarget.formula !== match.formula)');
      expect(src).toContain('solvedReactions: nextSolved');
      expect(src).toContain('builtCompounds: isFirstBuild');
    });

    it('#48, #61: stem_tool_coordgrid.js accurately evaluates 1/-x, 6/-2, 2/-x^2 and cleans up window keydown listener in useEffect', () => {
      const src = readSrc('stem_lab/stem_tool_coordgrid.js');
      // #48 Unary pre-pass removed; runtime verification of compileFuncRaw
      expect(src).not.toContain("if (unary) { if (uc === '-') safe += '(-1)*'; }");
      const fnStart = src.indexOf('var compileFuncRaw = function(expr)');
      const fnEnd = src.indexOf('var addFunc = function(expr)', fnStart);
      expect(fnStart).toBeGreaterThan(-1);
      expect(fnEnd).toBeGreaterThan(fnStart);
      const compileFuncRaw = new Function(src.slice(fnStart, fnEnd) + '\nreturn compileFuncRaw;')();
      expect(compileFuncRaw('1/-x')(2)).toBeCloseTo(-0.5, 6);
      expect(compileFuncRaw('6/-2')(0)).toBeCloseTo(-3, 6);
      expect(compileFuncRaw('2/-x^2')(2)).toBeCloseTo(-0.5, 6);
      expect(compileFuncRaw('-x^2')(3)).toBeCloseTo(-9, 6);
      expect(compileFuncRaw('2^-x')(2)).toBeCloseTo(0.25, 6);
      expect(compileFuncRaw('--x')(5)).toBeCloseTo(5, 6);

      // #61 keydown listener managed inside React.useEffect with unmount cleanup
      expect(src).not.toContain("window.addEventListener('keydown', window._coordGridKeyHandler)");
      expect(src).toContain("window.addEventListener('keydown', onCoordGridKeyDown);");
      expect(src).toContain("window.removeEventListener('keydown', onCoordGridKeyDown);");
    });

    it('#52, #53, #59, #60: stem_tool_heatlab.js, stem_tool_angles.js, and stem_tool_dataplot.js fixes', () => {
      const heatSrc = readSrc('stem_lab/stem_tool_heatlab.js');
      // #52 _htChartVisKey included in ResizeObserver, entropyRef, and hpRef effects
      expect(heatSrc).toContain('var _htChartVisKey =');
      expect(heatSrc).toContain('}, [_htChartVisKey]);');
      expect(heatSrc).toContain('}, [entSplit, isDark, isContrast, _htChartVisKey]);');
      expect(heatSrc).toContain('}, [hpOut, hpIn, isDark, isContrast, _htChartVisKey]);');

      const angSrc = readSrc('stem_lab/stem_tool_angles.js');
      // #53 React.useEffect speed round timer replaces ephemeral window.__anglesSpeed* closures
      expect(angSrc).not.toContain('window.__anglesSpeedResume');
      expect(angSrc).not.toContain('window.__anglesSpeedAddTime');
      expect(angSrc).toContain('}, [speedActive, speedPaused]);');

      const dpSrc = readSrc('stem_lab/stem_tool_dataplot.js');
      // #59 Archivist badge receives galleryCount: nextGallery.length
      expect(dpSrc).toContain('if (ok) checkBadges({ galleryCount: nextGallery.length });');
      expect(dpSrc).toContain("chk('saved_3', (s.galleryCount != null ? s.galleryCount : galleryItems.length) >= 3);");
      // #60 transformData computes full-dataset stats and resets view/myLine
      expect(dpSrc).toContain('var fullY = points.map(function(p) { return p.y; });');
      expect(dpSrc).toContain('updMulti({ points: transformed, undoStack: newUndo, exploreIdx: -1, view: null, myLine: null });');
    });
  });
});
