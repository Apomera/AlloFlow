import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function countButtonsMissingType(src) {
  let missing = 0;
  const re = /\bh\('button'\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const braceStart = m.index + m[0].length - 1;
    let depth = 0, inStr = null, esc = false, braceEnd = -1;
    for (let j = braceStart; j < src.length; j++) {
      const ch = src[j];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { braceEnd = j; break; }
      }
    }
    if (braceEnd === -1) continue;
    const body = src.slice(braceStart + 1, braceEnd);
    let hasType = false, d2 = 0, s2 = null, e2 = false;
    for (let k = 0; k < body.length; k++) {
      const ch = body[k];
      if (s2) {
        if (e2) { e2 = false; continue; }
        if (ch === '\\') { e2 = true; continue; }
        if (ch === s2) s2 = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { s2 = ch; continue; }
      if (ch === '{' || ch === '[' || ch === '(') d2++;
      else if (ch === '}' || ch === ']' || ch === ')') d2--;
      else if (d2 === 0 && (k === 0 || /[\s,{]/.test(body[k - 1])) && /^(?:'type'|"type"|type)\s*:/.test(body.slice(k))) {
        hasType = true;
        break;
      }
    }
    if (!hasType) missing++;
  }
  return missing;
}

describe('Wave 20 — Pass 1: 6 SEL Hub Tools', () => {
  it('sel_tool_landplace.js scans entries for crisis, uses functional updaters, and labels inputs', () => {
    const src = read('sel_hub/sel_tool_landplace.js');
    expect(src).toMatch(/scanForCrisis/);
    expect(src).toMatch(/setLabToolData\s*\(\s*function\s*\(\s*prev/);
    expect(src).toMatch(/role:\s*'tabpanel'/);
  });

  it('sel_tool_disabilityvoices.js removes sub-12px font sizes and hardens Light/HC card contrast', () => {
    const src = read('sel_hub/sel_tool_disabilityvoices.js');
    expect(src).not.toMatch(/fontSize:\s*(?:9|10|11)\b/);
    expect(src).toMatch(/isContrast/);
  });

  it('sel_tool_circlesofsupport.js uses functional updaters and accessible SVG/print chrome', () => {
    const src = read('sel_hub/sel_tool_circlesofsupport.js');
    expect(src).toMatch(/setLabToolData\s*\(\s*function\s*\(\s*prev/);
    expect(src).toContain("id: 'cos-svg-title'");
  });

  it('sel_tool_viastrengths.js has clean UTF-8 tab icons with zero mojibake sequences', () => {
    const src = read('sel_hub/sel_tool_viastrengths.js');
    expect(src).not.toContain('âœ');
    expect(src).not.toContain('ðŸ');
    expect(src).not.toContain('ï¸');
  });

  it('sel_tool_sfbt.js wires crisis scanning across all 8 reflection textareas', () => {
    const src = read('sel_hub/sel_tool_sfbt.js');
    expect(src).toContain('scanForCrisis');
    const calls = src.match(/scanSfbtText\s*\(\s*e\.target\.value\s*\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(8);
  });

  it('sel_tool_thoughtrecord.js restores Distortion Check heading, emotion1 crisis scan, and htmlFor labels', () => {
    const src = read('sel_hub/sel_tool_thoughtrecord.js');
    expect(src).toMatch(/Distortion Check/i);
    expect(src).toContain("htmlFor: 'tr-emotion1-rating'");
    expect(src).toContain("htmlFor: 'tr-emotion2-rating'");
    expect(src).toMatch(/scanForCrisis/);
  });
});

describe('Wave 20 — Pass 2: 6 Core, Safety, Auth, Hub & Pack Modules', () => {
  it('identifier_redaction_module.js performs single-pass target replacement, ISO/dotted ID scrubbing, and Mx/2-letter surname detection', () => {
    const src = read('identifier_redaction_module.js');
    const mod = { exports: {} };
    const ctx = {
      window: null,
      document: undefined,
      module: mod,
      exports: mod.exports,
      console,
    };
    ctx.window = ctx;
    vm.runInNewContext(src, ctx);
    const api = mod.exports;

    // Single-pass alternation: a target containing "Student" or "REMOVED" must not corrupt earlier replacements
    const prep = api.prepareSensitivePrompt('Student Removed Jordan Reyes met REMOVED on 2014-05-12.', {
      studentName: 'Jordan Reyes',
      extraTargets: ['Removed', 'REMOVED', 'Student'],
    });
    expect(prep.text).not.toContain('Jordan');
    expect(prep.text).not.toContain('[[REMOVED]]');
    expect(prep.text).not.toContain('[REMOVED][REMOVED]');

    // ISO date of birth & dotted IDs
    const scrubbed = api.scrubIdentifiers('Date of birth: 2014-05-12, student id 88.231.9, DOB 05.12.2014');
    expect(scrubbed).not.toContain('2014-05-12');
    expect(scrubbed).not.toContain('88.231.9');
    expect(scrubbed).not.toContain('05.12.2014');

    // Mx + 2-letter surname & leading quotes stripped
    const analyzed = api.analyzeRedaction('Mx. Li met with "Jordan" today.', { studentName: '"Jordan" Li' });
    expect(analyzed.unlistedTitledNames.length + (analyzed.hasStudentName ? 1 : 0)).toBeGreaterThan(0);
    const parts = api.nameRedactionParts('"Jordan" Li');
    expect(parts.safe).toContain('Jordan');
    expect(parts.safe).toContain('Li');
  });

  it('device_access_code_module.js caps backoff, survives throwing storages, fast-rejects >512-char codes, and clears stale apiKeyDestination', async () => {
    const src = read('device_access_code_module.js');
    const throwingStorage = {
      getItem() { throw new Error('quota'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('quota'); },
    };
    const sandbox = {
      window: null,
      localStorage: throwingStorage,
      sessionStorage: throwingStorage,
      crypto: globalThis.crypto,
      URL,
      TextEncoder,
      TextDecoder,
      Uint8Array,
      console,
      setTimeout,
      clearTimeout,
      Date,
      Math,
    };
    sandbox.window = sandbox;
    vm.runInNewContext(src, sandbox);
    const dac = sandbox.AlloModules.DeviceAccessCode;

    // Fast-reject overly long codes (>512 chars)
    const longRes = await dac.verify('a'.repeat(600));
    expect(longRes.ok).toBe(false);

    // splitAiSecretsForSave strips apiKey and stale apiKeyDestination on destination mismatch
    const cleaned = dac.splitAiSecretsForSave({
      apiKey: 'secret-key',
      backend: 'gemini',
      apiKeyDestination: 'openai:https://api.openai.com',
      theme: 'dark',
    });
    expect(cleaned.apiKey).toBeUndefined();
    expect(cleaned.apiKeyDestination).toBeUndefined();
    expect(cleaned.theme).toBe('dark');
  });

  it('error_reporter_module.js survives SSR load without window, scrubs expanded tokens, and stays idempotent on [redacted] URLs', () => {
    const src = read('error_reporter_module.js');
    expect(() => vm.runInNewContext(src, { console })).not.toThrow();
    expect(src).toContain("if (typeof window === 'undefined') return;");
    expect(src).toContain('GOCSPX-');
    expect(src).toContain('hf_');
    expect(src).toContain('ASIA');
    expect(src).toContain('!/\\[redacted\\]$/i.test(trimmed)');
    expect(src).toContain('Object.prototype.hasOwnProperty.call(window.AlloModules');
  });

  it('view_learning_hub_modal_module.js and source enforce SSR guard, isOpen default, sync remember, and shared scroll-lock', () => {
    const src = read('view_learning_hub_modal_source.jsx');
    const built = read('view_learning_hub_modal_module.js');
    expect(() => vm.runInNewContext(built, { console })).not.toThrow();
    expect(src).toContain('showLearningHub = true');
    expect(src).toContain('__alloScrollLockState');
    expect(src).toContain('button === 0');
    expect(built).toContain('__alloScrollLockState');
  });

  it('agent_core_pack_media_module.js enforces native URL checks, hasOwn metadata guards, DAG budget, and JPEG frame rules', () => {
    const src = read('agent_core_pack_media_module.js');
    const sandbox = { window: null, console, Uint8Array, ArrayBuffer, DataView, URL };
    sandbox.window = sandbox;
    vm.runInNewContext(src, sandbox);
    const media = sandbox.AlloModules.AgentCorePackMedia;

    // 1) Native profile must still block external image URLs in annotations.imageOverrides and frames
    const nativeWithUrl = {
      annotations: { imageOverrides: { p1: 'https://evil.example/track.png' } },
      frames: [{ imageUrl: 'https://evil.example/frame.png' }],
    };
    const res1 = media.validatePackMedia(nativeWithUrl, { profile: 'native' });
    expect(res1.ok).toBe(false);

    // 2) Non-object panel entry must fail cleanly (not crash)
    const res2 = media.validatePackMedia({ panels: [null, 'bad'] }, { profile: 'illustrated' });
    expect(res2.ok).toBe(false);

    // 3) Inherited Object.prototype.decorative / alt must not bypass validation
    const inheritedPanel = Object.create({ decorative: true, alt: 'inherited' });
    inheritedPanel.id = 'p1';
    inheritedPanel.imageKey = 'img1';
    const res3 = media.validatePackMedia({ panels: [inheritedPanel] }, { profile: 'illustrated' });
    expect(res3.ok).toBe(false);

    // 4) getImageSlots treats empty string as missing
    const slots = media.getImageSlots({ panels: [{ id: 'p1', imageKey: '' }] });
    expect(slots).toEqual([]);
  });

  it('agent_core_pack_native_module.js fails closed on deep payloads, blocks unsafe URLs/keys, and preserves static SVG policy', () => {
    const src = read('agent_core_pack_native_module.js');
    expect(src).toContain('__ALLO_STATIC_SVG_POLICY_BEGIN__');
    expect(src).toContain('__ALLO_STATIC_SVG_POLICY_END__');

    const sandbox = { window: null, console, URL };
    sandbox.window = sandbox;
    vm.runInNewContext(src, sandbox);
    const native = sandbox.AlloModules.AgentCorePackNative;

    // Deeply nested alignment payload (> 24 levels) must fail closed with payload-too-deep
    let deep = { text: 'leaf' };
    for (let i = 0; i < 30; i++) deep = { child: deep };
    const deepErrors = [];
    native.validateResource({ type: 'alignment-report', data: { comprehensive: deep } }, 'res', deepErrors, []);
    expect(deepErrors.some((e) => /payload-too-deep|depth/i.test(String(e.code || e.message || e)))).toBe(true);

    // Protocol-relative URL must be rejected
    const urlErrors = [];
    native.validateResource({
      type: 'analysis',
      data: { title: 'T', sourceUrl: '//evil.example/x', sections: [] },
    }, 'res', urlErrors, []);
    expect(urlErrors.length).toBeGreaterThan(0);

    // Unsafe prototype key in sourceTranslations must be rejected
    const keyErrors = [];
    const badKeyObj = JSON.parse('{"title":"T","sourceTranslations":{"__proto__":{"title":"x"}}}');
    native.validateResource({ type: 'analysis', data: badKeyObj }, 'res', keyErrors, []);
    expect(keyErrors.length).toBeGreaterThan(0);
  });
});

describe('Wave 20 — Pass 3: 6 STEM Lab Tools', () => {
  it('stem_tool_simshelf.js has SSR guard, popup rehydration, ref-based message handler, safety check, and HC chips', () => {
    const src = read('stem_lab/stem_tool_simshelf.js');
    expect(() => vm.runInNewContext(src, { console })).not.toThrow();
    expect(src).toContain("typeof window === 'undefined'");
    expect(src).toContain('_onMsgRef');
    expect(src).toContain('safeRehearseCheck');
    expect(src).toContain('#00ff00');
  });

  it('stem_tool_timeline.js has SSR guard, safe bumpSlice, mount/timer cleanup, fencing, button types, and status roles', () => {
    const src = read('stem_lab/stem_tool_timeline.js');
    expect(() => vm.runInNewContext(src, { console })).not.toThrow();
    expect(src).toContain("typeof window === 'undefined'");
    expect(src).toContain('mountedRef');
    expect(src).toContain('sendTimerRef');
    expect(src).toContain('safeRehearseCheck');
    expect(countButtonsMissingType(src)).toBe(0);
  });

  it('stem_tool_worldbuilder.js fixes moveToRoom targetWorld crash, guards AI/portrait/file I/O, and types all buttons', () => {
    const src = read('stem_lab/stem_tool_worldbuilder.js');
    const sandbox = { window: null, console };
    sandbox.window = sandbox;
    expect(() => vm.runInNewContext(src, sandbox)).not.toThrow();
    expect(sandbox.StemLab.isRegistered('worldBuilder')).toBe(true);
    expect(src).toMatch(/moveToRoom\s*=\s*function\s*\(\s*roomId\s*,\s*targetWorld\s*\)/);
    expect(src).toContain('aiText = function');
    expect(src).toContain('wbSafetyGate');
    expect(src).toContain('reader.onerror');
    expect(src).toContain("'aria-valuemin': 0");
    expect(countButtonsMissingType(src)).toBe(0);
  });

  it('stem_tool_echotrainer.js fixes stale click/win closures, scopes 2D keys, disconnects audio, respects reduced motion, and types all buttons', () => {
    const src = read('stem_lab/stem_tool_echotrainer.js');
    const sandbox = { window: null, console };
    sandbox.window = sandbox;
    expect(() => vm.runInNewContext(src, sandbox)).not.toThrow();
    expect(sandbox.StemLab.isRegistered('echoTrainer')).toBe(true);
    expect(src).toContain('dataRef.current');
    expect(src).toContain('goalFoundRef.current');
    expect(src).toContain('prefers-reduced-motion: reduce');
    expect(src).not.toMatch(/h\('details'[^)]*open:\s*false/);
    expect(countButtonsMissingType(src)).toBe(0);
  });

  it('stem_tool_bakingscience.js guards SSR/AI/timers/scaler/modifiers, wires tabpanel ARIA, removes HC black-ink buttons, and types all buttons', () => {
    const src = read('stem_lab/stem_tool_bakingscience.js');
    expect(() => vm.runInNewContext(src, { console })).not.toThrow();
    expect(src).toContain("if (typeof window === 'undefined') return;");
    expect(src).toContain('_aiUsable');
    expect(src).toContain('_leavTimer');
    expect(src).toContain('if (e.ctrlKey || e.metaKey || e.altKey) return;');
    expect(src).toContain("role: 'tabpanel'");
    expect(src).toContain("id: 'baking-tab-' + st.id");
    expect(countButtonsMissingType(src)).toBe(0);

    // Verify no <button> carries HC black ink (#000000) which disappears on host black HC buttons
    const lines = src.split(/\r?\n/);
    const badButtons = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.includes("color: isContrast ? '#000000'") && !l.includes("color: '#000000'")) continue;
      let tag = '?';
      for (let j = i; j >= Math.max(0, i - 14); j--) {
        const m = lines[j].match(/\bh\('(\w+)'/);
        if (m) { tag = m[1]; break; }
      }
      if (tag === 'button') badButtons.push(i + 1);
    }
    expect(badButtons).toEqual([]);
  });

  it('stem_tool_oratory.js fixes blob/timer teardown, mediaDevices guard, volume timer updater, finite duration, rAF loop, tabs, and button types', () => {
    const src = read('stem_lab/stem_tool_oratory.js');
    expect(src).toContain("if (typeof document === 'undefined' || !document.head) return;");
    expect(src).toContain('savedRecordingsRef');
    expect(src).toContain('saveTimerRef');
    expect(src).toContain('multiTimerRef');
    expect(src).toContain('copiedTimerRef');
    expect(src).toContain('volRemainingRef');
    expect(src).toContain('recordPhraseCompletionRef');
    expect(src).toContain("!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function'");
    expect(src).toContain('Number.isFinite(audio.duration)');
    expect(src).toContain('Object.assign({}, cachedExercises || {})');
    expect(src).toContain("id: 'oratory-tab-' + tab.id");
    expect(src).toContain("'aria-labelledby': 'oratory-tab-' + activeTab");
    expect(countButtonsMissingType(src)).toBe(0);
  });
});
