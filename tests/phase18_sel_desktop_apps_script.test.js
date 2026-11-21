import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function loadAppsScriptInVm(relPath, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const ctx = vm.createContext({
    console: { log: () => {}, warn: () => {}, error: () => {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (txt) => ({
        _text: txt,
        setMimeType() { return this; },
        getContent() { return this._text; },
      }),
    },
    HtmlService: {
      createHtmlOutputFromFile: (name) => ({ getContent: () => `<html>${name}</html>` }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_alg, str) => Array.from(crypto.createHash('sha256').update(String(str)).digest()),
      getUuid: () => '00000000-0000-4000-8000-000000000001',
    },
    ...extraGlobals,
  });
  vm.runInContext(code, ctx, { filename: relPath });
  return ctx;
}

describe('Phase 18: SEL Secrets-Lock, Core Fetch, Desktop Electron/MCP & Apps Script Backends', () => {
  it('SEL Hub: all 27 AI-gated tools enforce __alloAiSecretsLocked !== true and sel_tool_emotions bounds manifest fetch', () => {
    const selFiles = [
      'sel_hub/sel_tool_advocacy.js', 'sel_hub/sel_tool_civicaction.js', 'sel_hub/sel_tool_community.js',
      'sel_hub/sel_tool_compassion.js', 'sel_hub/sel_tool_conflict.js', 'sel_hub/sel_tool_coping.js',
      'sel_hub/sel_tool_cultureexplorer.js', 'sel_hub/sel_tool_decisions.js', 'sel_hub/sel_tool_digitalwellbeing.js',
      'sel_hub/sel_tool_emotions.js', 'sel_hub/sel_tool_ethicalreasoning.js', 'sel_hub/sel_tool_execfunction.js',
      'sel_hub/sel_tool_friendship.js', 'sel_hub/sel_tool_goals.js', 'sel_hub/sel_tool_growthmindset.js',
      'sel_hub/sel_tool_journal.js', 'sel_hub/sel_tool_peersupport.js', 'sel_hub/sel_tool_perspective.js',
      'sel_hub/sel_tool_restorativecircle.js', 'sel_hub/sel_tool_selfadvocacy.js', 'sel_hub/sel_tool_social.js',
      'sel_hub/sel_tool_sociallab.js', 'sel_hub/sel_tool_strengths.js', 'sel_hub/sel_tool_teamwork.js',
      'sel_hub/sel_tool_transitions.js', 'sel_hub/sel_tool_upstander.js', 'sel_hub/sel_tool_zones.js',
    ];
    for (const rel of selFiles) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing __alloAiSecretsLocked`).toContain('__alloAiSecretsLocked !== true');
    }
    const emoSrc = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_tool_emotions.js'), 'utf8');
    expect(emoSrc).toContain('new AbortController()');
    expect(emoSrc).toContain('Object.prototype.hasOwnProperty.call(_emoImages, kind)');
  });

  it('Core runtime fetch hardening: gemini_api, export_handlers, and packets-make attach AbortController timeouts & prototype guards', () => {
    const gemSrc = fs.readFileSync(path.join(ROOT, 'gemini_api_module.js'), 'utf8');
    expect(gemSrc).toContain('listCtrl.signal');
    expect(gemSrc).toContain('probeCtrl.signal');

    const expSrc = fs.readFileSync(path.join(ROOT, 'export_handlers_module.js'), 'utf8');
    expect(expSrc).toContain('Object.prototype.hasOwnProperty.call(map, code)');
    expect(expSrc).toContain('!/^(?:blob|data):/i.test(audioUrl)');

    const pktSrc = fs.readFileSync(path.join(ROOT, 'packets-make.js'), 'utf8');
    expect(pktSrc).toContain('function fetchBounded(');
    expect(pktSrc).toContain("k === '__proto__' || k === 'constructor' || k === 'prototype'");
  });

  it('Desktop Electron main.cjs: allows #app-frame bundled origin on non-main-frame IPC, blocks dangling symlinks, and catches openExternal', () => {
    const mainSrc = fs.readFileSync(path.join(ROOT, 'desktop/electron/main.cjs'), 'utf8');
    expect(mainSrc).toContain('isSameOrigin(senderUrl, getBundledAppOrigin())');
    expect(mainSrc).toContain('const isSymlinkPath = (p) =>');
    expect(mainSrc).toContain('fs.constants.O_NOFOLLOW');
    expect(mainSrc).toContain('Promise.resolve(shell.openExternal(url)).catch(');
  });

  it('Desktop MCP, LAN adapter & Command Center: prototype-safe tool dispatch, claimOutputPath containment, fail-closed verifier, bounded fetches, and resetAppBridge fix', () => {
    const mcpSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(mcpSrc).toContain('Object.prototype.hasOwnProperty.call(TOOL_HANDLERS, name)');
    expect(mcpSrc).toContain('Output filename must be a single file name without path separators');
    expect(mcpSrc).toContain('if (res.writableEnded || res.destroyed) return;');

    const drvSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
    expect(drvSrc).toContain('const fileStem = title.replace(');
    expect(drvSrc).toContain("fileName: fileStem + '.brf'");

    const verSrc = fs.readFileSync(path.join(ROOT, 'desktop/mcp/verify_mcpb_artifact.cjs'), 'utf8');
    expect(verSrc).toContain('Could not inspect MCPB archive entries before extraction.');
    expect(verSrc).toContain('Artifact server entry point escapes extraction directory:');

    const lanSrc = fs.readFileSync(path.join(ROOT, 'desktop/app-adapter/lan_session_adapter.snippet.js'), 'utf8');
    expect(lanSrc).toContain('setTimeout(cancel, 20000)');

    const ccSrc = fs.readFileSync(path.join(ROOT, 'desktop/command-center/command-center.js'), 'utf8');
    const resetIdx = ccSrc.indexOf('function resetAppBridge()');
    const resetSlice = ccSrc.slice(resetIdx, resetIdx + 550);
    expect(resetSlice.indexOf('delete frame.dataset.bridgeReady')).toBeLessThan(resetSlice.indexOf('for (const pending of appBridgePending.values())'));
    expect(ccSrc).toContain('setTimeout(cancel, 30000)');
  });

  it('apps_script/school_rewards/Code.gs: cart_ keeps "__proto__" as own entry (never returns empty) and email schedule runs locked_', () => {
    const ctx = loadAppsScriptInVm('apps_script/school_rewards/Code.gs');
    const cart = ctx.cart_([{ catalogId: '__proto__', quantity: 2 }, { catalogId: 'constructor', quantity: 1 }]);
    expect(cart).toEqual([
      { catalogId: '__proto__', quantity: 2 },
      { catalogId: 'constructor', quantity: 1 },
    ]);
    const src = fs.readFileSync(path.join(ROOT, 'apps_script/school_rewards/Code.gs'), 'utf8');
    const schedIdx = src.indexOf('function configureSchoolRewardsEmailSchedule(');
    const schedBody = src.slice(schedIdx, schedIdx + 950);
    expect(schedBody).toContain('return locked_(function()');
  });

  it('apps_script/session_mailbox/Code.gs: blocks prototype-key DoS in sign-ups, availability, word cloud, and deliverDocument', () => {
    const ctx = loadAppsScriptInVm('apps_script/session_mailbox/Code.gs');
    expect(ctx.VERSION).toBe(32);

    const claims = ctx.normalizeSignupClaims(['toString', 'constructor', '__proto__', 'slot1'], {
      options: [{ id: 'slot1', label: 'Slot 1', capacity: 2 }],
      maxPerPerson: 2,
    });
    expect(Array.from(claims)).toEqual(['slot1']);

    const picks = ctx.normalizeAvailabilityPicks({ toString: 'yes', constructor: 'yes' }, {
      options: [{ id: 'opt1', label: 'Monday' }],
      allowMaybe: true,
      multiSelect: true,
    });
    expect(picks).toBeNull();

    const summary = ctx.buildAssignmentActivityPublicSummary({
      kind: 'word_cloud',
      config: { minParticipants: 1 },
      responses: {
        u1: { status: 'approved', text: 'constructor' },
        u2: { status: 'approved', text: 'toString' },
      },
    });
    expect(summary.terms.map((t) => t.value).sort()).toEqual(['constructor', 'tostring']);

    const badMime = JSON.parse(ctx.deliverDocument({ mime: 'constructor', convert: 'constructor' }).getContent());
    expect(badMime).toEqual({ ok: false, e: 'bad-mime' });
  });

  it('apps_script/educator_evaluation/Code.gs & educator_evaluation_share/Code.gs: block prototype-key bypasses', () => {
    const eeCtx = loadAppsScriptInVm('apps_script/educator_evaluation/Code.gs');
    for (const bad of ['toString', 'constructor', '__proto__', '../Secret']) {
      expect(() => eeCtx.include(bad)).toThrow(/Template include denied/);
    }
    expect(eeCtx.include('Portal')).toBe('<html>Portal</html>');
    const ids = eeCtx.accessibleTeacherIds_({ role: 'admin' }, { teachers: [{ id: 't1' }] });
    expect(Object.getPrototypeOf(ids)).toBeNull();
    expect(ids.toString).toBeUndefined();
    expect(ids.t1).toBe(true);

    const eeSrc = fs.readFileSync(path.join(ROOT, 'apps_script/educator_evaluation/Code.gs'), 'utf8');
    expect(eeSrc).toContain("assertUniqueIds_(result.comments, 'comment');");

    const shareSrc = fs.readFileSync(path.join(ROOT, 'apps_script/educator_evaluation_share/Code.gs'), 'utf8');
    expect(shareSrc).toContain('walkthrough: Object.create(null)');
    expect(shareSrc).toContain('Object.prototype.hasOwnProperty.call(EE_SHARE_ROLES, requestedRole)');
  });

  it('apps_script/walkthrough_records & leadership_hub_backup: handle JSON "null"/array cleanly and lock folder creation', () => {
    const wrCtx = loadAppsScriptInVm('apps_script/walkthrough_records/Code.gs');
    const wrNull = JSON.parse(wrCtx.doPost({ postData: { contents: 'null' } }).getContent());
    expect(wrNull.ok).toBe(false);
    expect(wrNull.code).toBe('bad_request');
    const wrArr = JSON.parse(wrCtx.doPost({ postData: { contents: '[]' } }).getContent());
    expect(wrArr.ok).toBe(false);
    expect(wrArr.code).toBe('bad_request');

    const lhbCtx = loadAppsScriptInVm('apps_script/leadership_hub_backup/Code.gs');
    const lhbNull = JSON.parse(lhbCtx.doPost({ postData: { contents: 'null' } }).getContent());
    expect(lhbNull).toEqual({ ok: false, error: 'bad-json' });
    const lhbArr = JSON.parse(lhbCtx.doPost({ postData: { contents: '[]' } }).getContent());
    expect(lhbArr).toEqual({ ok: false, error: 'bad-json' });

    expect(fs.readFileSync(path.join(ROOT, 'apps_script/walkthrough_records/Code.gs'), 'utf8')).toContain('lock.releaseLock()');
    expect(fs.readFileSync(path.join(ROOT, 'apps_script/leadership_hub_backup/Code.gs'), 'utf8')).toContain('lock.releaseLock()');
  });

  it('4-way mirror byte parity, 3-host manifest SRI/releaseId parity, and mailbox v31 metadata alignment', () => {
    const manifestMod = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));
    const hostPaths = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
    const hostTexts = hostPaths.map((p) => fs.readFileSync(path.join(ROOT, p), 'utf8'));
    const manifests = hostTexts.map((t) => manifestMod.readEmbeddedManifest(t));
    expect(manifests[0].releaseId).toBe(manifests[1].releaseId);
    expect(manifests[1].releaseId).toBe(manifests[2].releaseId);

    const mbGs = fs.readFileSync(path.join(ROOT, 'apps_script/session_mailbox/Code.gs'));
    const mbSha = crypto.createHash('sha256').update(mbGs).digest('hex');
    for (let i = 0; i < hostTexts.length; i++) {
      expect(hostTexts[i], `${hostPaths[i]} mailbox version`).toContain('const ALLO_MB_SCRIPT_VERSION = 32;');
      expect(hostTexts[i], `${hostPaths[i]} mailbox sha256`).toContain(`const ALLO_MB_SCRIPT_SHA256 = '${mbSha}';`);
    }

    const deliverables = [
      'gemini_api_module.js', 'export_handlers_module.js', 'view_share_session_surfaces_module.js',
      'mailbox_script_source_module.js', 'sel_hub/sel_tool_emotions.js', 'sel_hub/sel_tool_social.js',
      'apps_script/school_rewards/Code.gs', 'apps_script/session_mailbox/Code.gs',
      'apps_script/educator_evaluation/Code.gs', 'apps_script/educator_evaluation_share/Code.gs',
      'apps_script/walkthrough_records/Code.gs', 'apps_script/leadership_hub_backup/Code.gs',
    ];
    const mirrorRoots = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of deliverables) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      for (const mr of mirrorRoots) {
        const dest = path.join(ROOT, mr, rel);
        if (fs.existsSync(dest)) {
          expect(fs.readFileSync(dest).equals(rootBuf), `${mr}/${rel} mismatch`).toBe(true);
        }
      }
      if (manifests[0].assets[rel]) {
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        for (let i = 0; i < manifests.length; i++) {
          expect(manifests[i].assets[rel].integrity).toBe(expectedSri);
          expect(manifests[i].assets[rel].bytes).toBe(rootBuf.length);
        }
      }
    }
  });
});
