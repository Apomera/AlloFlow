import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const MIRROR_DIRS = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const WAVE23_SEL = [
  'sel_hub/sel_tool_zones.js',
  'sel_hub/sel_tool_coping.js',
  'sel_hub/sel_tool_mindfulness.js',
  'sel_hub/sel_tool_emotions.js',
  'sel_hub/sel_tool_advocacy.js',
  'sel_hub/sel_tool_howl.js',
  'sel_hub/sel_tool_somaticreset.js',
];

const WAVE23_CORE_MODULES = [
  'view_visual_supports_modal_module.js',
  'view_assignment_center_module.js',
  'view_directions_composer_module.js',
  'view_image_module.js',
  'view_concept_sort_module.js',
  'view_directions_result_module.js',
];

const WAVE23_STEM = [
  'stem_lab/stem_tool_raptorhunt.js',
  'stem_lab/stem_tool_birdlab.js',
  'stem_lab/stem_tool_beehive.js',
  'stem_lab/stem_tool_solarsystem.js',
  'stem_lab/stem_tool_watercycle.js',
  'stem_lab/stem_tool_roadready.js',
];

const ALL_DELIVERABLES = [...WAVE23_SEL, ...WAVE23_CORE_MODULES, ...WAVE23_STEM];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Wave 23 Bug Sweep (2026-11-21) - 19 targets', () => {
  describe('4-way deliverable mirror parity', () => {
    for (const rel of ALL_DELIVERABLES) {
      it(`${rel} is byte-identical across all 4 browser deliverable roots`, () => {
        const baseline = read(rel);
        for (const dir of MIRROR_DIRS.slice(1)) {
          const mirrorPath = path.join(ROOT, dir, rel);
          expect(fs.existsSync(mirrorPath), `${dir}/${rel} exists`).toBe(true);
          expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(baseline);
        }
      });
    }

    it('view_visual_supports_modal_source.jsx matches desktop/web-app/src copy', () => {
      expect(read('desktop/web-app/src/view_visual_supports_modal_source.jsx')).toBe(
        read('view_visual_supports_modal_source.jsx')
      );
    });
  });

  describe('SSR safety (window undefined) across all 13 SEL + STEM files', () => {
    for (const rel of [...WAVE23_SEL, ...WAVE23_STEM]) {
      it(`${rel} evaluates without throwing when window and document are undefined`, () => {
        const code = read(rel);
        const sandbox = {
          console,
          Math,
          Date,
          JSON,
          Object,
          Array,
          String,
          Number,
          Boolean,
          RegExp,
          Error,
          TypeError,
          Promise,
          Map,
          Set,
          WeakMap,
          WeakSet,
          Symbol,
          URL,
          Uint8Array,
          Int32Array,
          Float32Array,
          Float64Array,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          encodeURIComponent,
          decodeURIComponent,
          setTimeout,
          clearTimeout,
          setInterval,
          clearInterval,
        };
        expect(() => vm.runInNewContext(code, sandbox, { filename: rel })).not.toThrow();
      });
    }
  });

  describe('Pass 1 SEL Hub fixes (7 tools)', () => {
    it('sel_tool_zones.js: global mute, cancellable breathing loop, crisis scans, no broken _zoFg codemods', () => {
      const src = read('sel_hub/sel_tool_zones.js');
      expect(src).toContain('function _znIsMuted()');
      expect(src).toContain('function _stopZnBreathTimer()');
      expect(src).toContain('cleanup: function() { _stopZnBreathTimer(); }');
      expect(src).toContain("toolId: 'zones_checkin'");
      expect(src).toContain("toolId: 'zones_pulse'");
      expect(src).not.toContain('_zoFg(typeColors)');
      expect(src).not.toContain('_zoFg(ZONE_COLORS)');
      expect(src).not.toContain('_zoFg(ZONE_PALETTE)');
      expect(src).not.toContain('_zoFg(scenarioStreak)');
      expect(src).not.toContain('_zoFg(scenarioFeedback)');
      expect(src).not.toContain("'aria-label': 'My Check-In History'");
    });

    it('sel_tool_coping.js: global mute, cleanup hook, I-Statement crisis scan, Matcher fencing, fixed aria-labels', () => {
      const src = read('sel_hub/sel_tool_coping.js');
      expect(src).toContain('function _copIsMuted()');
      expect(src).toContain('cleanup: function() { stopBreathTimer(); stopMoveTimer(); }');
      expect(src).toContain("toolId: 'coping_istatement'");
      expect(src).toContain('_copFence(matcherFeeling)');
      expect(src).not.toContain("'aria-label': 'Select strategy'");
      expect(src).not.toContain('warningsSigns:');
    });

    it('sel_tool_mindfulness.js: AI gating, global mute, crisis scan on gratitude save, fixed _minFg & [object Object], preserves mantrasContent', () => {
      const src = read('sel_hub/sel_tool_mindfulness.js');
      expect(src).toContain('function _minIsMuted()');
      expect(src).toContain('_minAiOn && callGemini && gratDraft.trim().length > 10');
      expect(src).toContain('var gSaveSafety =');
      expect(src).not.toContain('_minFg(weekDays)');
      expect(src).not.toContain('_minFg(meditationFavs)');
      expect(src).not.toContain('_minFg(isDone)');
      expect(src).not.toContain('_minFg(meStep)');
      expect(src).not.toContain('_minFg(baAfterMood)');
      expect(src).not.toContain('_minFg(baAfterStress)');
      expect(src).not.toContain('_minFg(line.type)');
      expect(src).not.toContain("p.name + ' ' + h('span'");
      expect(src).toContain('var mantrasContent = null;');
      expect(src).toContain('cleanup: function() { stopBreathTimer(); stopScanTimer(); stopBoxTimer(); }');
    });

    it('sel_tool_emotions.js: both AI bypasses closed, global mute, crisis scans, _emoLoadImages in useEffect', () => {
      const src = read('sel_hub/sel_tool_emotions.js');
      expect(src).toContain('function _emoIsMuted()');
      expect(src).toContain('_emoAiOn && callGemini');
      expect(src).toContain('!_emoAiOn && !mixAiCustom');
    });

    it('sel_tool_advocacy.js: global mute, bingo seed in useEffect, pre-flight safeRehearseCheck, fixed _advFg & script aria-label', () => {
      const src = read('sel_hub/sel_tool_advocacy.js');
      expect(src).toContain('function _advIsMuted()');
      expect(src).not.toContain('_advFg(styleColors)');
    });

    it('sel_tool_howl.js: HowlMediaCapture hoisted, weeklyCheckins radar fallback, no global * reduced-motion CSS', () => {
      const src = read('sel_hub/sel_tool_howl.js');
      const hoistIdx = src.indexOf('function HowlMediaCapture(');
      const regIdx = src.indexOf('window.SelHub.registerTool(');
      expect(hoistIdx).toBeGreaterThan(-1);
      expect(regIdx).toBeGreaterThan(hoistIdx);
      expect(src).toContain('weeklyCheckins');
    });

    it('sel_tool_somaticreset.js: global mute helper & preserves callTTS line', () => {
      const src = read('sel_hub/sel_tool_somaticreset.js');
      expect(src).toContain('function _srIsMuted()');
      expect(src).toContain('ctx.callTTS(guidanceText(selectedProtocol), ctx.selectedVoice, 0.9)');
    });
  });

  describe('Pass 2 Core UI Modules fixes (6 modules)', () => {
    it('view_visual_supports_modal_source.jsx: SVG XSS guard, null-proto progress, global mute', () => {
      const src = read('view_visual_supports_modal_source.jsx');
      expect(src).toContain('Object.create(null)');
      expect(src).toContain('window.__alloMuted === true');
      expect(src).toContain('tabFocusTimerRef');
    });

    it('view_assignment_center_source.jsx: focus trap containment, removeFocusTimerRef, no callGemini reference', () => {
      const src = read('view_assignment_center_source.jsx');
      expect(src).toContain('top.root.contains(dialog)');
      expect(src).toContain('removeFocusTimerRef');
      expect(src).not.toMatch(/\bcallGemini\b/);
    });

    it('view_directions_composer_source.jsx: full AI door hardening, scroll lock ref-count, snippetTimerRef cleanup', () => {
      const src = read('view_directions_composer_source.jsx');
      expect(src).toContain('__alloAiSecretsLocked');
      expect(src).toContain('__alloScrollLockState');
      expect(src).toContain('snippetTimerRef');
    });

    it('view_image_source.jsx: dark contrast fix, _imgSafeImageUrl, _alloQrBlocked, pinned Refine disabled prop', () => {
      const src = read('view_image_source.jsx');
      expect(src).toContain('_imgSafeImageUrl');
      expect(src).toContain('disabled={!imageRefinementInput.trim() || isProcessing || !!imageEditDoor?.disabled}');
      expect(src).toContain('imageViewMountedRef');
    });

    it('view_concept_sort_source.jsx: _csSafeImageUrl, csAiHardBlocked, editFocusRafRef, speech cleanup', () => {
      const src = read('view_concept_sort_source.jsx');
      expect(src).toContain('_csSafeImageUrl');
      expect(src).toContain('csAiHardBlocked');
      expect(src).toContain('editFocusRafRef');
    });

    it('view_directions_result_source.jsx: DOMParser replaces unsanitized innerHTML XSS, full global mute, preserves Enter/Space handler', () => {
      const src = read('view_directions_result_source.jsx');
      expect(src).not.toContain('scratch.innerHTML = rawHtml');
      expect(src).toContain('new DOMParser()');
      expect(src).toContain("if (event.key === 'Enter' || event.key === ' ') {");
    });
  });

  describe('Pass 3 Flagship STEM Lab Studios fixes (6 studios)', () => {
    it('stem_tool_raptorhunt.js: global mute, alloflow-mute-changed & webglcontextlost cleanup, Escape on flight result', () => {
      const src = read('stem_lab/stem_tool_raptorhunt.js');
      expect(src).toContain('function _rhIsGlobalMuted()');
      expect(src).toContain("window.removeEventListener('alloflow-mute-changed', onGlobalMuteChanged)");
      expect(src).toContain("canvasEl.removeEventListener('webglcontextlost', onContextLost)");
      expect(src).toContain("if (event.key === 'Escape')");
    });

    it('stem_tool_birdlab.js: global mute across engines, vision AI gating, preserves BIRDLAB_MODULE_BASE', () => {
      const src = read('stem_lab/stem_tool_birdlab.js');
      expect(src).toContain('function _birdIsGlobalMuted()');
      expect(src).toContain("window.__alloAiUsable('vision', fn)");
      expect(src).toContain('var BIRDLAB_MODULE_BASE =');
    });

    it('stem_tool_beehive.js: global mute, _beeAiOn gating, rect.height divide-by-zero guard', () => {
      const src = read('stem_lab/stem_tool_beehive.js');
      expect(src).toContain('function _beeIsGlobalMuted()');
      expect(src).toContain('var _beeAiOn =');
      expect(src).toContain('if (!rect.width || !rect.height) return;');
    });

    it('stem_tool_solarsystem.js: safeRehearseCheck on askSpaceTutor, global mute, useEffect key handler with DOM guard, no bogus Read aloud on quick-ask', () => {
      const src = read('stem_lab/stem_tool_solarsystem.js');
      expect(src).toContain('function _solarIsGlobalMuted()');
      expect(src).toContain("toolId: 'solarSystem'");
      expect(src).toContain("document.querySelector('[data-solarsystem-tool]')");
      expect(src).not.toContain(`"aria-label": __alloT('stem.solarsystem.read_aloud', "Read aloud"), key: qi`);
    });

    it('stem_tool_watercycle.js: global mute, safeRehearseCheck on askHydrologist, preserves exports', () => {
      const src = read('stem_lab/stem_tool_watercycle.js');
      expect(src).toContain('function _wcIsGlobalMuted()');
      expect(src).toContain("toolId: 'waterCycle'");
      expect(src).toContain('var WC_PILOT_UNIT_M =');
      expect(src).toContain('window.WaterCyclePrecipitationKernel');
      expect(src).toContain('window.WaterCycleAirProfile');
    });

    it('stem_tool_roadready.js: hydration in useEffect, _rrIsGlobalMuted gating SFX, webglcontextlost cleanup', () => {
      const src = read('stem_lab/stem_tool_roadready.js');
      expect(src).toContain('var _rrIsGlobalMuted = function()');
      expect(src).toContain('useEffect(function() {\n        if (_hydratedRef.current) return;');
      expect(src).toContain("rrDomEl.removeEventListener('webglcontextlost', rrDomEl._rrContextLostHandler)");
    });
  });
});
