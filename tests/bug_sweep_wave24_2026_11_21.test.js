import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(__dirname, '..');
const MIRROR_DIRS = [
  ROOT,
  path.join(ROOT, 'desktop', 'web-app', 'public'),
  path.join(ROOT, 'desktop', 'web-app', 'build'),
  path.join(ROOT, 'desktop', 'app-build'),
];

const WAVE24_DELIVERABLES = [
  // Pass 1: 6 Core Student Views
  'view_socratic_chat_module.js',
  'view_study_timer_modal_module.js',
  'view_cloze_interaction_panel_module.js',
  'view_outline_module.js',
  'view_sentence_frames_module.js',
  'view_timeline_module.js',
  // Pass 2: 6 Core Modals & Media Views
  'view_xp_modal_module.js',
  'view_video_library_module.js',
  'view_video_ref_player_module.js',
  'view_end_session_preview_module.js',
  'view_faq_module.js',
  'view_educator_hub_modal_module.js',
  // Pass 3: 6 Flagship STEM Lab Studios
  'stem_lab/stem_tool_weldlab.js',
  'stem_lab/stem_tool_printingpress.js',
  'stem_lab/stem_tool_dinolab.js',
  'stem_lab/stem_tool_flightsim.js',
  'stem_lab/stem_tool_dissection.js',
  'stem_lab/stem_tool_cephalopodlab.js',
];

const PASS3_STEM_STUDIOS = [
  'stem_lab/stem_tool_weldlab.js',
  'stem_lab/stem_tool_printingpress.js',
  'stem_lab/stem_tool_dinolab.js',
  'stem_lab/stem_tool_flightsim.js',
  'stem_lab/stem_tool_dissection.js',
  'stem_lab/stem_tool_cephalopodlab.js',
];

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

describe('Wave 24 Bug Sweep — 18 Deliverables Parity, Safety, Security, Mute, A11y & SSR', () => {
  describe('4-way mirror SHA-256 parity for all 18 Wave 24 deliverables', () => {
    for (const rel of WAVE24_DELIVERABLES) {
      it(`keeps ${rel} byte-identical across root and all 3 desktop mirrors`, () => {
        const expected = sha256(path.join(MIRROR_DIRS[0], rel));
        for (const dir of MIRROR_DIRS.slice(1)) {
          const target = path.join(dir, rel);
          expect(fs.existsSync(target), `Missing mirror ${target}`).toBe(true);
          expect(sha256(target)).toBe(expected);
        }
      });
    }
  });

  describe('Real Node VM SSR evaluation (window/document undefined) for Pass 3 STEM studios', () => {
    for (const rel of PASS3_STEM_STUDIOS) {
      it(`evaluates ${rel} without throwing when window and document are undefined`, () => {
        const src = readText(rel);
        expect(() => {
          vm.runInNewContext(src, {
            console,
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            Math,
            Date,
            JSON,
            Object,
            Array,
            Number,
            String,
            Boolean,
            RegExp,
            Error,
            TypeError,
            RangeError,
            Map,
            Set,
            Promise,
            Uint8Array,
            Float32Array,
            Int32Array,
          });
        }).not.toThrow();
      });
    }
  });

  describe('Pass 1 — Core Student Views invariants', () => {
    it('view_socratic_chat_source.jsx screens crisis text synchronously, honors global mute, and avoids RegExp $& injection', () => {
      const src = readText('view_socratic_chat_source.jsx');
      expect(src).toContain('_isSocraticGlobalMuted');
      expect(src).toContain('spokeViaSynthRef');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('SafetyContentChecker');
      expect(src).toContain('role="alert"');
      expect(src).not.toMatch(/new RegExp\(/);
    });

    it('view_study_timer_modal_source.jsx guards finite duration/timeLeft and WCAG AA reset contrast', () => {
      const src = readText('view_study_timer_modal_source.jsx');
      expect(src).toContain('Number.isFinite');
      expect(src).toContain('hover:text-red-700');
      expect(src).toContain('maxLength={120}');
      expect(src).toContain("typeof ConfettiExplosion === 'function'");
    });

    it('view_cloze_interaction_panel_source.jsx enforces global mute, TTS unmount cancel, and own-property translation lookup', () => {
      const src = readText('view_cloze_interaction_panel_source.jsx');
      expect(src).toContain('isGlobalMuted');
      expect(src).toContain('spokeViaSynthRef');
      expect(src).toContain('Object.prototype.hasOwnProperty.call');
      expect(src).toContain('role="region"');
    });

    it('view_outline_source.jsx gates AI doors while keeping Create Diagram keyless and cleans up active speech', () => {
      const src = readText('view_outline_source.jsx');
      expect(src).toContain('_alloQrBlocked');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('__alloAiSecretsLocked');
      expect(src).toContain('speakingOutlineRef');
      expect(src).toContain('outlineMountedRef');
      expect(src).toMatch(/onClick=\{handleInitializeMap\}[\s\S]{0,160}disabled=\{isProcessing\}/);
    });

    it('view_sentence_frames_source.jsx closes student scaffold-editor role leak, screens drafts for crisis, and avoids $& injection', () => {
      const src = readText('view_sentence_frames_source.jsx');
      const effIdx = src.indexOf('const effectiveEditingScaffolds = Boolean(isTeacherMode && isEditingScaffolds);');
      const usableIdx = src.indexOf('const isUsableItem');
      expect(effIdx).toBeGreaterThan(-1);
      expect(usableIdx).toBeGreaterThan(effIdx);
      expect(src).toContain('checkDraftCrisis');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('() => ans');
      expect(src).toContain('_alloQrBlocked');
    });

    it('view_timeline_source.jsx blocks stored SVG XSS on timeline uploads/images and guards async FileReader races', () => {
      const src = readText('view_timeline_source.jsx');
      expect(src).toContain('_safeTimelineImageSrc');
      expect(src).toContain('image/png,image/jpeg,image/gif,image/webp,image/avif');
      expect(src).toContain('timelineMountedRef');
      expect(src).toContain('startResourceId');
      expect(src).toContain('_alloQrBlocked');
      expect(src).toContain('window.__alloAiSecretsLocked !== true');
    });
  });

  describe('Pass 2 — Core Modals & Media Views invariants', () => {
    it('view_xp_modal_source.jsx avoids focus-stealing re-runs, guards drag-out backdrop close, and uses scroll-lock interop', () => {
      const src = readText('view_xp_modal_source.jsx');
      expect(src).toContain('closeHandlerRef');
      expect(src).toContain('backdropMouseDownRef');
      expect(src).toContain('event.defaultPrevented');
      expect(src).toContain('.prev');
    });

    it('view_video_library_source.jsx enforces global mute on transcript speech and video playback and places dialog role on focused panel', () => {
      const src = readText('view_video_library_source.jsx');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('isGlobalMuted');
      expect(src).toContain('role="presentation"');
      expect(src).toContain('role="dialog"');
    });

    it('view_video_ref_player_source.jsx validates thumbnails against SVG XSS / remote beacons, validates hosted URLs, and honors global mute', () => {
      const src = readText('view_video_ref_player_source.jsx');
      expect(src).toContain('function VideoRefPlayerOverlay({ item, onClose, addToast, t }) {');
      expect(src).toContain('safeThumb');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('helperPollTimerRef');
      expect(src).toContain('video[controls]');
    });

    it('view_end_session_preview_source.jsx uses null-prototype roster map, guards callbacks, and stops Escape propagation', () => {
      const src = readText('view_end_session_preview_source.jsx');
      expect(src).toContain('Object.create(null)');
      expect(src).toContain('event.stopPropagation()');
      expect(src).toContain('min-h-11');
    });

    it('view_faq_source.jsx screens self-check recall text for crisis, gates audio AI doors, and resets marks across resourceId changes', () => {
      const src = readText('view_faq_source.jsx');
      expect(src).toContain('scanFaqRecall');
      expect(src).toContain('isFaqAudioAiBlocked');
      expect(src).toContain('[studyStorageKey]');
      expect(src).toContain('faqMountedRef');
      expect(src).toContain('copyTimerRef');
    });

    it('view_educator_hub_modal_source.jsx fixes WCAG contrast on edited badge, gates sheet bridge on isOpen, and sanitizes usage counts', () => {
      const src = readText('view_educator_hub_modal_source.jsx');
      expect(src).not.toContain('opacity-70');
      expect(src).toContain('if (!isOpen) return;');
      expect(src).toContain('Object.prototype.hasOwnProperty.call');
    });
  });

  describe('Pass 3 — Flagship STEM Lab Studios invariants', () => {
    it('stem_tool_weldlab.js pauses RAF loops when hidden, cleans webglcontextlost, and guards IME/modifier keys', () => {
      const src = readText('stem_lab/stem_tool_weldlab.js');
      expect(src).toContain('visibilitychange');
      expect(src).toContain('onContextLost');
      expect(src).toContain('defectCelebTimerRef');
      expect(src).toContain('keyCode === 229');
    });

    it('stem_tool_printingpress.js gates AI doors, screens Ask the Printer for crisis + fences prompt, and honors global mute', () => {
      const src = readText('stem_lab/stem_tool_printingpress.js');
      expect(src).toContain('_alloQrBlocked');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
      expect(src).toContain('_ppIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
    });

    it('stem_tool_dinolab.js guards IME and modifier shortcuts across keyboard handlers', () => {
      const src = readText('stem_lab/stem_tool_dinolab.js');
      expect(src).toContain('keyCode === 229');
      expect(src).toMatch(/altKey\s*\|\|\s*\w+\.ctrlKey\s*\|\|\s*\w+\.metaKey/);
    });

    it('stem_tool_flightsim.js honors global mute, pauses RAF on document.hidden, cleans webglcontextlost, and dismisses non-crash review on Escape', () => {
      const src = readText('stem_lab/stem_tool_flightsim.js');
      expect(src).toContain('_fsIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('silenceFlightAudio');
      expect(src).toContain('_fsCleanupContextLost');
      expect(src).toContain('visibilitychange');
    });

    it('stem_tool_dissection.js guards hostile prev state, canvas divide-by-zero, global mute, and AI doors', () => {
      const src = readText('stem_lab/stem_tool_dissection.js');
      expect(src).toContain('safeDissectionPrev');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('_alloQrBlocked');
      expect(src).toContain('__alloStudentAiDisabled');
    });

    it('stem_tool_cephalopodlab.js honors global mute, suspends RAF on hidden, cleans webglcontextlost, guards Raycaster div-by-zero, and preserves soundscape pins', () => {
      const src = readText('stem_lab/stem_tool_cephalopodlab.js');
      expect(src).toContain('_clIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('_clOnContextLost');
      expect(src).toContain('if(!rect||!rect.width||!rect.height)return;');
      expect(src).toContain('keyCode === 229');
    });
  });
});
