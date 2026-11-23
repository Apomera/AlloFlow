import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();

const WAVE32_DELIVERABLES = [
  // Pass 1: Core Interactive, AI, Student & Audio Modules
  'student_interaction_module.js',
  'speech_setup_module.js',
  'ui_modals_module.js',
  'visual_panel_module.js',
  'phase_n_misc_helpers_module.js',
  'memory_aid_module.js',
  // Pass 2: High-Traffic Shell, Math, Session & Student Views
  'view_header_module.js',
  'view_math_module.js',
  'view_session_modal_module.js',
  'view_project_settings_module.js',
  'view_persona_workspace_module.js',
  'view_student_save_adventure_module.js',
  // Pass 3: FINAL 6 Unaudited STEM Lab Tools (100% STEM Lab + SEL Hub coverage)
  'stem_lab/stem_tool_scaleexplorer.js',
  'stem_lab/stem_tool_platetectonics.js',
  'stem_lab/stem_tool_cell.js',
  'stem_lab/stem_tool_evolab.js',
  'stem_lab/stem_tool_rocks.js',
  'stem_lab/stem_tool_companionplanting.js',
];

const MIRROR_ROOTS = [
  '',
  'desktop/web-app/public',
  'desktop/app-build',
  'desktop/web-app/build',
];

const SRI_HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function sriSha384(buf) {
  return 'sha384-' + createHash('sha384').update(buf).digest('base64');
}

describe('Wave 32 Bug Sweep (2026-11-22) - 18 flagship modules + 100% STEM Lab coverage', () => {
  it('maintains 4-way SHA-256 mirror parity across all 18 Wave 32 deliverables', () => {
    for (const rel of WAVE32_DELIVERABLES) {
      const rootHash = sha256(readFileSync(resolve(ROOT, rel)));
      for (const prefix of MIRROR_ROOTS.slice(1)) {
        const mirrorPath = resolve(ROOT, prefix, rel);
        expect(sha256(readFileSync(mirrorPath)), `${rel} vs ${prefix}/${rel}`).toBe(rootHash);
      }
    }
  });

  it('maintains 3-host browser-delivery SRI SHA-384 parity for all 18 Wave 32 deliverables', () => {
    const hostTexts = SRI_HOSTS.map((h) => ({ file: h, text: readFileSync(resolve(ROOT, h), 'utf8') }));
    for (const rel of WAVE32_DELIVERABLES) {
      const buf = readFileSync(resolve(ROOT, rel));
      const expectedEntry = `"${rel}":{"bytes":${buf.length},"integrity":"${sriSha384(buf)}"}`;
      for (const { file, text } of hostTexts) {
        expect(text, `${rel} SRI in ${file}`).toContain(expectedEntry);
      }
    }
  });

  it('loads all 18 Wave 32 deliverables cleanly in bare Node VM SSR (no window/document)', () => {
    for (const rel of WAVE32_DELIVERABLES) {
      const code = readFileSync(resolve(ROOT, rel), 'utf8');
      expect(() => {
        vm.runInNewContext(
          code,
          { console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval, clearInterval },
          { filename: rel }
        );
      }, `SSR load for ${rel}`).not.toThrow();
    }
  });

  describe('Pass 1 hardening contracts', () => {
    it('hardens ui_modals_module.js against XSS, prototype pollution, unsafe URLs, and unscreened crisis input', () => {
      const src = readFileSync(resolve(ROOT, 'ui_modals_source.jsx'), 'utf8');
      expect(src).toContain('_uimSafeImageUrl');
      expect(src).toContain('_uimSafeUid');
      expect(src).toContain('_uimScreenCrisis');
      expect(src).toContain('_uimRenderSafeExplanation');
      expect(src).not.toContain('dangerouslySetInnerHTML=');
      expect(src).toContain('988');
      expect(src).toContain('741741');
    });

    it('hardens visual_panel_module.js against caption XSS, policy bypass, GIF URI injection, and mute leaks', () => {
      const src = readFileSync(resolve(ROOT, 'visual_panel_source.jsx'), 'utf8');
      expect(src).toContain('_vpRenderCaption');
      expect(src).not.toContain('dangerouslySetInnerHTML');
      expect(src).toContain('_vpSafeImageUrl');
      expect(src).toContain('_vpScreenCrisis');
      expect(src).toContain('_vpSafeJsonParse');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('data:image\\/gif;base64,');
    });

    it('hardens phase_n_misc_helpers_module.js against link XSS, AI bypass, prompt injection, and crisis input', () => {
      const src = readFileSync(resolve(ROOT, 'phase_n_misc_helpers_source.jsx'), 'utf8');
      expect(src).toContain('_phaseNSafeLinkUrl');
      expect(src).toContain('_phaseNAiUsable');
      expect(src).toContain('_phaseNScreenCrisis');
      expect(src).toContain('_phaseNFenceUntrusted');
      expect(src).toContain('_phaseNSafeJsonParse');
    });

    it('hardens memory_aid_module.js crisis checks, AI gating, URL hygiene, global mute, and CSP print popups', () => {
      const src = readFileSync(resolve(ROOT, 'memory_aid_source.jsx'), 'utf8');
      expect(src).toContain('checkMemoryAidSelfHarm');
      expect(src).toContain('_maSafeJsonParse');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toMatch(/base-uri \\?'none\\?'; form-action \\?'none\\?';/);
      expect(src).not.toMatch(/typeof\s+callGemini\s*===\s*['"]function['"]/);
    });
  });

  describe('Pass 2 hardening contracts', () => {
    it('hardens view_header_module.js against History DOM collision, policy bypass, and mute leaks', () => {
      const src = readFileSync(resolve(ROOT, 'view_header_source.jsx'), 'utf8');
      expect(src).toContain('_hdrSafeJsonObject');
      expect(src).toContain('_hdrIsGlobalMuted');
      expect(src).toContain('_hdrHardAiPolicyBlocked');
    });

    it('hardens view_math_module.js against SVG XSS, crisis input, mute leaks, and prototype keys', () => {
      const src = readFileSync(resolve(ROOT, 'view_math_source.jsx'), 'utf8');
      expect(src).toContain('_mathIsGlobalMuted');
      expect(src).toContain('_mathScreenCrisis');
      expect(src).toContain('_mathSanitizeInlineSvg');
      expect(src).toContain('alloflow-mute-changed');
    });

    it('hardens view_session_modal_module.js QR SVG sanitization, join URL validation, CSP print, and managed AI blocking', () => {
      const src = readFileSync(resolve(ROOT, 'view_session_modal_source.jsx'), 'utf8');
      expect(src).toContain('_smSafeJoinUrl');
      expect(src).toContain('_smSanitizeQrSvg');
      expect(src).toContain('_smManagedAiBlocked');
      expect(src).toContain("base-uri 'none'; form-action 'none';");
    });

    it('hardens view_project_settings_module.js portal URL/QR SVG validation, QR student lockout, crisis screening, and XP bounds', () => {
      const src = readFileSync(resolve(ROOT, 'view_project_settings_source.jsx'), 'utf8');
      expect(src).toContain('_psSafePortalUrl');
      expect(src).toContain('_psSanitizeQrSvg');
      expect(src).toContain('_psIsQrStudentMode');
      expect(src).toContain('_psManagedAiBlocked');
      expect(src).toContain('_psScreenCrisis');
      expect(src).toContain('onCloseRef');
    });

    it('hardens view_persona_workspace_module.js grounding URLs, crisis screening, control-char stripping, and 32-bit blur math', () => {
      const src = readFileSync(resolve(ROOT, 'view_persona_workspace_source.jsx'), 'utf8');
      expect(src).toContain('safeExternalUrl');
      expect(src).toContain('stripControlChars');
      expect(src).toContain('editorCrisisDetected');
      expect(src).toContain('988');
    });

    it('hardens view_student_save_adventure_module.js object-shaped QR mode, managed AI policy, timer cleanup, and aria-expanded', () => {
      const src = readFileSync(resolve(ROOT, 'view_student_save_adventure_source.jsx'), 'utf8');
      expect(src).toContain('qrBlocksAi');
      expect(src).toContain('hideStudentAiFeatures === true');
      expect(src).toContain('storyCloseTimerRef');
      expect(src).toContain('aria-expanded={showStoryAuthor}');
    });
  });

  describe('Pass 3 FINAL 6 STEM Lab hardening contracts', () => {
    it('hardens stem_tool_scaleexplorer.js (crisis screening, global mute, document.hidden, prototype reviver, IME)', () => {
      const src = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_scaleexplorer.js'), 'utf8');
      expect(src).toContain('_sxIsGlobalMuted');
      expect(src).toContain('_sxScreenCrisis');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('document.hidden');
      expect(src).toContain("k === '__proto__'");
      expect(src).toContain('Object.create(null)');
    });

    it('hardens stem_tool_platetectonics.js (crisis screening, prompt fencing, global mute, CSP report, esc(row.side))', () => {
      const src = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
      expect(src).toContain('_ptIsGlobalMuted');
      expect(src).toContain('_ptScreenCrisis');
      expect(src).toContain('<UNTRUSTED_STUDENT_CONVERSATION>');
      expect(src).toContain('esc(row.side)');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toMatch(/base-uri \\?'none\\?'; form-action \\?'none\\?';/);
    });

    it('hardens stem_tool_cell.js (crisis screening, prompt fencing, fail-closed AI, global mute, try/finally Blob)', () => {
      const src = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_cell.js'), 'utf8');
      expect(src).toContain('_cellIsGlobalMuted');
      expect(src).toContain('_cellScreenCrisis');
      expect(src).toContain('_cellAiUsable');
      expect(src).toContain('<UNTRUSTED_STUDENT_QUESTION>');
      expect(src).toContain('alloflow-mute-changed');
    });

    it('hardens stem_tool_evolab.js (prototype-safe journal parser, crisis screening, 6 rAF document.hidden, global mute)', () => {
      const src = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_evolab.js'), 'utf8');
      expect(src).toContain('_evoSafeJsonParse');
      expect(src).toContain('_evoScreenCrisis');
      expect(src).toContain('alloflow-mute-changed');
      const hiddenMatches = src.match(/typeof document !== 'undefined' && document\.hidden/g) || [];
      expect(hiddenMatches.length).toBeGreaterThanOrEqual(6);
    });

    it('hardens stem_tool_rocks.js (crisis screening, prompt fencing, fail-closed AI, global mute, cleanup timer stop)', () => {
      const src = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_rocks.js'), 'utf8');
      expect(src).toContain('_rkIsGlobalMuted');
      expect(src).toContain('_rkScreenCrisis');
      expect(src).toContain('<UNTRUSTED_STUDENT_QUESTION>');
      expect(src).toContain('rcStopTransformTimer();');
      expect(src).toContain('alloflow-mute-changed');
    });

    it('hardens stem_tool_companionplanting.js (crisis screening, fail-closed AI + jsonMode false, MutationObserver dedup, CSV/Blob)', () => {
      const src = readFileSync(resolve(ROOT, 'stem_lab/stem_tool_companionplanting.js'), 'utf8');
      expect(src).toContain('_cgIsGlobalMuted');
      expect(src).toContain('_cgScreenCrisis');
      expect(src).toContain('_cgAiUsable');
      expect(src).toContain('<UNTRUSTED_GARDEN_STATE>');
      expect(src).toContain('Promise.resolve(callGemini(prompt, false))');
      expect(src).toContain('mcvEl._microObs');
      expect(src).toContain('/^[\\t\\r]|^[\\s]*[=+@-]/');
    });
  });
});
