// ═══════════════════════════════════════════
// stem_tool_wave.js — Wave Simulator Plugin
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 1.4.3 high contrast & dark-remap -900/-950 ink parity (stem-tool-shell-contrast sets #1e293b on .bg-*-50)
  (function() {
    if (typeof document === 'undefined' || !document.head) return;
    if (!document.getElementById('allo-wave-hc-css')) {
      var st = document.createElement('style');
      st.id = 'allo-wave-hc-css';
      st.textContent = ".theme-contrast [data-stem-tool-shell=\"wave\"] button[class*=\"bg-gradient\"]{background-image:none!important}";
      document.head.appendChild(st);
    }
    if (!document.getElementById('allo-wave-dark-remap-css')) {
      var stDark = document.createElement('style');
      stDark.id = 'allo-wave-dark-remap-css';
      stDark.textContent =
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-amber-900,.text-amber-950){color:#fef3c7!important}" +
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-cyan-900,.text-cyan-950){color:#cffafe!important}" +
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-sky-900,.text-sky-950){color:#e0f2fe!important}" +
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-indigo-900,.text-indigo-950){color:#e0e7ff!important}" +
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-fuchsia-900,.text-fuchsia-950){color:#fae8ff!important}" +
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-emerald-900,.text-emerald-950,.text-teal-900,.text-teal-950){color:#d1fae5!important}" +
        ".theme-dark [data-stem-tool-shell=\"wave\"] :is(.text-rose-900,.text-rose-950,.text-pink-900,.text-red-900){color:#ffe4e6!important}";
      document.head.appendChild(stDark);
    }
    if (!document.getElementById('allo-wave-polish-css')) {
      var stPol = document.createElement('style');
      stPol.id = 'allo-wave-polish-css';
      stPol.textContent = [
        '.wav-hero-deck{position:relative;overflow:hidden;border-radius:18px;padding:16px 18px;margin-bottom:14px;background:linear-gradient(135deg,#071324 0%,#0b2942 54%,#0d3b46 100%);border:1px solid rgba(56,189,248,.4);box-shadow:0 16px 34px rgba(7,19,36,.26);color:#f0f9ff}',
        '.wav-hero-deck h3{color:#ffffff!important;background:transparent!important;margin:0}',
        '.wav-hero-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;background:rgba(56,189,248,.18);border:1px solid rgba(103,232,249,.45);color:#a5f3fc}',
        '.wav-hero-back{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;border-radius:10px;background:rgba(255,255,255,.1);border:1px solid rgba(148,163,184,.34);color:#ffffff;cursor:pointer}',
        '.wav-hero-back:hover{background:rgba(255,255,255,.2)}',
        '.wav-telemetry-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(7,19,36,.64);border:1px solid rgba(103,232,249,.32);color:#e0f2fe;white-space:nowrap}',
        '.wav-telemetry-pill strong{color:#67e8f9;font-weight:900}',
        '.wav-mini-scope{display:flex;align-items:center;gap:10px;padding:7px 11px;border-radius:13px;background:rgba(4,12,24,.66);border:1px solid rgba(56,189,248,.34)}',
        '.wav-preset-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(103,232,249,.22)}',
        '.wav-preset-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(255,255,255,.1);border:1px solid rgba(103,232,249,.38);color:#f0f9ff;cursor:pointer;min-height:36px;transition:background-color .15s,border-color .15s}',
        '.wav-preset-chip:hover{background:rgba(56,189,248,.24);border-color:#67e8f9;color:#ffffff}',
        '.theme-contrast .wav-hero-deck{background:#000000!important;border:2px solid #00ff00!important;box-shadow:none!important;color:#ffff00!important}',
        '.theme-contrast .wav-hero-deck h3,.theme-contrast .wav-hero-deck p{color:#ffff00!important}',
        '.theme-contrast .wav-hero-badge,.theme-contrast .wav-telemetry-pill,.theme-contrast .wav-mini-scope{background:#000000!important;border:1px solid #ffff00!important;color:#ffff00!important}',
        '.theme-contrast .wav-telemetry-pill strong{color:#00ff00!important}',
        '.theme-contrast .wav-hero-back,.theme-contrast .wav-preset-chip{background:#000000!important;border:2px solid #00ff00!important;color:#ffff00!important}',
        '.theme-contrast .wav-hero-deck button:focus-visible{outline:3px solid #ffff00!important;outline-offset:2px!important}'
      ].join('');
      document.head.appendChild(stPol);
    }
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-wave')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-wave';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // "Play Sound" oscillator lives at module scope — NOT in toolData, where the
  // live AudioContext would get captured by Snapshot's Object.assign({}, d).
  var _waveAudio = { ctx: null, osc: null, gain: null, osc2: null, gain2: null, dopplerFlyby: null };
  function _waveAudioStop() {
    try { if (_waveAudio.dopplerFlyby && _waveAudio.dopplerFlyby.timer) clearTimeout(_waveAudio.dopplerFlyby.timer); } catch (e) {}
    try { if (_waveAudio.ctx) _waveAudio.ctx.close(); } catch (e) {}
    _waveAudio.ctx = null;
    _waveAudio.osc = null;
    _waveAudio.gain = null;
    _waveAudio.osc2 = null;
    _waveAudio.gain2 = null;
    _waveAudio.dopplerFlyby = null;
  }

  // ═════════════════════════════════════════════════════════════════════
  // Pure Wave Physics, Probe & Mastery Helpers (exposed via StemLab._wave)
  // ═════════════════════════════════════════════════════════════════════
  var WAVE_MEDIA_PRESETS = [
    { id: 'air20', icon: '🌬️', labelKey: 'stem.wave.medium_air20', label: 'Air (20°C)', speed: 343 },
    { id: 'helium', icon: '🎈', labelKey: 'stem.wave.medium_helium', label: 'Helium', speed: 1007 },
    { id: 'water', icon: '💧', labelKey: 'stem.wave.medium_water', label: 'Water', speed: 1482 },
    { id: 'seawater', icon: '🌊', labelKey: 'stem.wave.medium_seawater', label: 'Seawater', speed: 1500 },
    { id: 'string', icon: '🎸', labelKey: 'stem.wave.medium_string', label: 'Guitar String', speed: 71 },
    { id: 'shallow', icon: '🫧', labelKey: 'stem.wave.medium_shallow', label: 'Ripple Tank', speed: 120 }
  ];

  var WAVE_STRING_PRESETS = [
    { id: 'nylon_e4', icon: '\uD83C\uDFB8', labelKey: 'stem.wave.str_nylon', label: 'Nylon Guitar E4', tensionN: 70, tension: 70, densityGm: 0.6 },
    { id: 'steel_g3', icon: '\uD83E\uDE95', labelKey: 'stem.wave.str_steel', label: 'Steel Acoustic G3', tensionN: 135, tension: 135, densityGm: 1.5 },
    { id: 'violin_a4', icon: '\uD83C\uDFBB', labelKey: 'stem.wave.str_violin', label: 'Violin A4', tensionN: 60, tension: 60, densityGm: 1.5 },
    { id: 'bass_e1', icon: '\uD83C\uDFB5', labelKey: 'stem.wave.str_bass', label: 'Bass Wound E1', tensionN: 180, tension: 180, densityGm: 18.0 }
  ];

  var WAVE_MISSIONS = [
    {
      id: 'mission_cancel', icon: '🔇', reward: 20,
      titleKey: 'stem.wave.m_cancel_title', title: 'Noise-Canceling Headphone Lab',
      descKey: 'stem.wave.m_cancel_desc', desc: 'Cancel out Wave 1 completely using destructive interference with equal frequency, equal amplitude, and half-cycle phase shift (φ₂ ≈ 1.0π rad).',
      goalKey: 'stem.wave.m_cancel_goal', goal: 'Free Wave · Second Wave ON · f₂ = f₁ · A₂ = A₁ · φ₂ ≈ π (3.1 rad)',
      setup: { waveMode: 'free', waveType: 'sine', showSecond: true, frequency: 3, amplitude: 50, frequency2: 3, amplitude2: 50, phase2: 0 }
    },
    {
      id: 'mission_beats', icon: '🥁', reward: 20,
      titleKey: 'stem.wave.m_beats_title', title: 'Piano Tuner’s Acoustic Beats',
      descKey: 'stem.wave.m_beats_desc', desc: 'Tune two waves in Free Wave or Spectrum mode so they create a slow 0.5 Hz beat envelope (|f₁ − f₂| = 0.5 Hz).',
      goalKey: 'stem.wave.m_beats_goal', goal: 'Free/Spectrum · Second Wave ON · |f₁ − f₂| = 0.5 Hz · A₁, A₂ ≥ 20',
      setup: { waveMode: 'free', waveType: 'sine', showSecond: true, frequency: 4, amplitude: 45, frequency2: 5, amplitude2: 45, phase2: 0 }
    },
    {
      id: 'mission_harmonic3', icon: '🎸', reward: 15,
      titleKey: 'stem.wave.m_harm3_title', title: 'Guitar 3rd Harmonic Overtones',
      descKey: 'stem.wave.m_harm3_desc', desc: 'Switch to Standing mode, select Harmonic #3, and set fundamental frequency f₁ = 2.0 Hz to reach a 6.0 Hz standing resonance with 4 nodes.',
      goalKey: 'stem.wave.m_harm3_goal', goal: 'Standing Mode · Harmonic #3 · n·f₁ = 6.0 Hz',
      setup: { waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 1, frequency: 2, amplitude: 50 }
    },
    {
      id: 'mission_closed_pipe', icon: '🎷', reward: 20,
      titleKey: 'stem.wave.m_cpipe_title', title: 'Clarinet Odd-Harmonic Pipe',
      descKey: 'stem.wave.m_cpipe_desc', desc: 'Switch to Standing mode, select Closed–Open Pipe (Fixed–Free), choose Mode #2 (the 3rd odd harmonic, λ = 4L/3), and set f₁ = 2.0 Hz.',
      goalKey: 'stem.wave.m_cpipe_goal', goal: 'Standing Mode · Closed–Open Pipe · Mode #2 (3rd odd harmonic) · f₁ = 2.0 Hz',
      setup: { waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 1, frequency: 2, amplitude: 50 }
    },
    {
      id: 'mission_nodal_probe', icon: '📍', reward: 25,
      titleKey: 'stem.wave.m_nodal_title', title: 'Ripple Tank Nodal Line Hunter',
      descKey: 'stem.wave.m_nodal_desc', desc: 'In Ripple Tank mode, enable the Wave Probe and place it right on a dark destructive nodal line where path difference Δr ≈ (m + ½)λ.',
      goalKey: 'stem.wave.m_nodal_goal', goal: 'Ripple Tank · Wave Probe ON · Δr = (m + 0.5)λ (±0.12λ)',
      setup: { waveMode: 'ripple', rippleBarrier: 'none', probeEnabled: true, rippleSeparation: 80, frequency: 2, waveSpeed: 343, probeX: 0.5, probeY: 0.5, rippleSrc1: null, rippleSrc2: null }
    },
    {
      id: 'mission_refraction', icon: '🪞', reward: 20,
      titleKey: 'stem.wave.m_refract_title', title: 'Shoaling & Two-Medium Transmission',
      descKey: 'stem.wave.m_refract_desc', desc: 'In Reflection & Refraction mode, allow energy through the boundary (reflectivity ≤ 0.65) into a slower Medium 2 (v₂/v₁ ≤ 0.65) so wavelength compresses.',
      goalKey: 'stem.wave.m_refract_goal', goal: 'Reflection Mode · Reflectivity ≤ 0.65 · v₂/v₁ ≤ 0.65',
      setup: { waveMode: 'reflection', reflectivity: 0.9, medium2Ratio: 1.0, reflectionEnd: 'fixed', incidentAngleDeg: 0 }
    },
    {
      id: 'mission_tir', icon: '🔒', reward: 25,
      titleKey: 'stem.wave.m_tir_title', title: 'Fiber-Optic Total Internal Reflection',
      descKey: 'stem.wave.m_tir_desc', desc: 'In Reflection & Refraction mode, make Medium 2 faster than Medium 1 (v₂/v₁ ≥ 1.35) and tilt Incident Angle θ₁ above the critical angle θ_c so 100% of wave energy reflects internally!',
      goalKey: 'stem.wave.m_tir_goal', goal: 'Reflection Mode · v₂/v₁ ≥ 1.35 · θ₁ > θ_c (Total Internal Reflection)',
      setup: { waveMode: 'reflection', medium2Ratio: 1.5, incidentAngleDeg: 25, reflectivity: 0.4, wallFrac: 0.55 }
    },
    {
      id: 'mission_mach_cone', icon: '✈️', reward: 20,
      titleKey: 'stem.wave.m_mach_title', title: 'Breaking the Sound Barrier',
      descKey: 'stem.wave.m_mach_desc', desc: 'In Doppler mode, push the moving source speed to Mach 1.0 (100%) or higher to form a supersonic shock cone.',
      goalKey: 'stem.wave.m_mach_goal', goal: 'Doppler Mode · Source Speed ≥ 1.00 Mach (100%+)',
      setup: { waveMode: 'doppler', sourceSpeed: 0.5, frequency: 2 }
    },
    {
      id: 'mission_dispersion', icon: '🌊', reward: 20,
      titleKey: 'stem.wave.m_disp_title', title: 'Deep-Ocean Wave Packet',
      descKey: 'stem.wave.m_disp_desc', desc: 'In Free Wave mode, switch to Wave Packet and set Group/Phase ratio vg/vp ≤ 0.60 so fast carrier crests overtake the slow energy packet like deep-water ocean swells.',
      goalKey: 'stem.wave.m_disp_goal', goal: 'Free Wave · Wave Packet ON · vg/vp ≤ 0.60',
      setup: { waveMode: 'free', packetMode: 'packet', dispersionRatio: 1.0, frequency: 4, amplitude: 55, showSecond: false }
    },
    {
      id: 'mission_kundt_tube', icon: '🧪', reward: 25,
      titleKey: 'stem.wave.m_kundt_title', title: 'Kundt’s Acoustic Standing Tube',
      descKey: 'stem.wave.m_kundt_desc', desc: 'In Longitudinal mode, switch to Kundt Standing Tube, turn ON the Δx & ΔP Curve Overlay to see the 90° phase shift, and excite Harmonic #2 or higher.',
      goalKey: 'stem.wave.m_kundt_goal', goal: 'Longitudinal Mode · Standing Tube · Overlay Δx & ΔP ON · Harmonic ≥ #2',
      setup: { waveMode: 'longitudinal', longitudinalMode: 'traveling', showDisplacementCurve: false, harmonic: 1, frequency: 2, amplitude: 60 }
    },
    {
      id: 'mission_phased_array', icon: '🛰️', reward: 25,
      titleKey: 'stem.wave.m_phased_title', title: 'Phased-Array Electronic Beam Steering',
      descKey: 'stem.wave.m_phased_desc', desc: 'In 2D Ripple Tank mode with Open Water (no barrier), set Source Phase Offset (Δφ) to ≥ +90° or ≤ −90° and turn ON the I(y) Screen to steer the central m = 0 beam electronically without moving the sources.',
      goalKey: 'stem.wave.m_phased_goal', goal: 'Ripple Mode · Open Water · |Δφ| ≥ 90° · I(y) Screen ON',
      setup: { waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: 0, showIntensityScreen: true, rippleSeparation: 80, frequency: 3, amplitude: 60 }
    },
    {
      id: 'mission_antireflection', icon: '👓', reward: 25,
      titleKey: 'stem.wave.m_ar_title', title: 'Quarter-Wave Anti-Reflection Coating',
      descKey: 'stem.wave.m_ar_desc', desc: 'In Reflection mode at normal incidence (θ₁ = 0°) with Acoustic/Optical Impedance Lock ON and Medium 2 Speed Ratio ≤ 0.70, toggle ON the λ/4 Anti-Reflection Coating to eliminate the reflected echo (R ≈ 0%).',
      goalKey: 'stem.wave.m_ar_goal', goal: 'Reflection Mode · Impedance Lock ON · λ/4 Coating ON · θ₁ = 0° · c₂/c₁ ≤ 0.70',
      setup: { waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: false, medium2Ratio: 0.5, incidentAngleDeg: 0, frequency: 2, amplitude: 60 }
    }
  ];

  var WAVE_FOURIER_PRESETS = [
    { id: 'flute', icon: '🪈', labelKey: 'stem.wave.fp_flute', label: 'Pure Flute', weights: [1, 0, 0, 0, 0, 0] },
    { id: 'clarinet', icon: '🎷', labelKey: 'stem.wave.fp_clarinet', label: 'Clarinet (Odd)', weights: [1, 0, 0.75, 0, 0.45, 0] },
    { id: 'organ', icon: '🎹', labelKey: 'stem.wave.fp_organ', label: 'Warm Organ', weights: [1, 0.8, 0.6, 0.4, 0, 0.2] },
    { id: 'strings', icon: '🎻', labelKey: 'stem.wave.fp_strings', label: 'Bright Strings', weights: [1, 0.5, 0.33, 0.25, 0.2, 0.17] }
  ];

  var WAVE_CER_PROMPTS = [
    {
      id: 'freq_wavelength',
      titleKey: 'stem.wave.cer_p1_title',
      title: 'How do frequency and medium speed control wavelength?',
      starterKey: 'stem.wave.cer_p1_starter',
      starter: 'Claim: When medium wave speed stays constant and frequency doubles, wavelength ___. Evidence: In my trials at ___ Hz and ___ Hz... Reasoning: Because v = f·λ...'
    },
    {
      id: 'interference_energy',
      titleKey: 'stem.wave.cer_p2_title',
      title: 'Why do dark nodal lines in a ripple tank NOT destroy wave energy?',
      starterKey: 'stem.wave.cer_p2_starter',
      starter: 'Claim: Dark nodal lines cancel local displacement while total energy is ___. Evidence: Using the Wave Probe, Δr = ___ λ gives ___... Reasoning: Energy redistributes to antinodal lines where Δr = mλ.'
    },
    {
      id: 'boundary_transmission',
      titleKey: 'stem.wave.cer_p3_title',
      title: 'What changes and what stays constant when a wave enters a slower medium?',
      starterKey: 'stem.wave.cer_p3_starter',
      starter: 'Claim: Crossing into a slower medium (v₂ < v₁) causes wavelength λ₂ to ___ while frequency stays ___. Evidence: At v₂/v₁ = ___... Reasoning: Source oscillations drive the boundary at fixed f, so λ₂ = v₂/f.'
    },
    {
      id: 'dispersion_group_phase',
      titleKey: 'stem.wave.cer_p4_title',
      title: 'Why do individual deep-ocean wave crests travel twice as fast as the wave group?',
      starterKey: 'stem.wave.cer_p4_starter',
      starter: 'Claim: In a normally dispersive medium (vg/vp = ___), individual crests move ___ than the packet energy envelope. Evidence: At ___ ratio in Wave Packet mode... Reasoning: Energy travels at the group velocity vg = dω/dk while crests travel at phase velocity vp = ω/k.'
    },
    {
      id: 'phased_array_coatings',
      titleKey: 'stem.wave.cer_p5_title',
      title: 'How do phase offsets steer beams and quarter-wave coatings eliminate reflections?',
      starterKey: 'stem.wave.cer_p5_starter',
      starter: 'Claim: Shifting Source 2 by Δφ = ___ steers the zero-order beam to ___°, while a λ/4 AR coating reduces reflectivity from ___% to ___%. Evidence: Using the Phased-Array slider and Impedance Lock in the simulator... Reasoning: Destructive interference cancels backward reflections when path difference equals λ/2.'
    }
  ];

  var WAVE_MASTERY_IDS = [
    'mission_cancel', 'mission_beats', 'mission_harmonic3', 'mission_closed_pipe', 'mission_nodal_probe', 'mission_refraction', 'mission_tir', 'mission_mach_cone', 'mission_dispersion', 'mission_kundt_tube', 'mission_phased_array', 'mission_antireflection',
    'matched_wave', 'discovered_law', 'standing_hunt_logged', 'logged_3_trials', 'cer_completed',
    'explored_modes', 'quiz_1', 'quiz_3', 'quiz_5', 'quiz_7'
  ];

  var WAVE_VALID_MODES = { free: 1, standing: 1, ripple: 1, reflection: 1, longitudinal: 1, doppler: 1, spectrum: 1 };
  var WAVE_VALID_TYPES = { sine: 1, square: 1, triangle: 1, sawtooth: 1, custom: 1 };
  var WAVE_VALID_TABS = { explore: 1, missions: 1, analyze: 1, notebook: 1, library: 1, all: 1 };
  var WAVE_VALID_BANDS = { '3-5': 1, '6-8': 1, '9-12': 1 };
  var WAVE_VALID_BOUNDARIES = { bothFixed: 1, openOpen: 1, fixedFree: 1 };
  var WAVE_VALID_RIPPLE_BARRIERS = { none: 1, singleSlit: 1, doubleSlit: 1, obstacle: 1, grating: 1 };
  var WAVE_VALID_PACKET_MODES = { continuous: 1, packet: 1, collide: 1 };
  var WAVE_VALID_COLLIDE_POLARITIES = { same: 1, opposite: 1 };
  var WAVE_VALID_FILTERS = { none: 1, lowpass: 1, highpass: 1, oddOnly: 1 };
  var WAVE_VALID_LONGITUDINAL_MODES = { traveling: 1, standing: 1 };
  var WAVE_VALID_PROBE_SCOPES = { time: 1, lissajous: 1 };
  var WAVE_VALID_POLARIZATIONS = { s: 1, p: 1 };
  var WAVE_VALID_DOPPLER_REGIMES = { acoustic: 1, relativistic: 1 };
  var WAVE_VALID_DS_PLOTS = { freqWavelength: 1, ampEnergy: 1, dopplerMach: 1, snellAngles: 1, phasedBeam: 1, mersenneTension: 1, fresnelBrewster: 1, airTempSpeed: 1, resonanceCurve: 1, ftirTunneling: 1, inverseSquareDb: 1, youngFringeSpacing: 1, adcBitSqnr: 1, dopplerOffsetAngle: 1 };
  var WAVE_INTERVAL_PRESETS = {
    '1:1': { ratio: 1.0, label: 'Unison (1:1)', consonance: 'pure' },
    '5:4': { ratio: 1.25, label: 'Major 3rd (5:4)', consonance: 'consonant' },
    '4:3': { ratio: 4 / 3, label: 'Fourth (4:3)', consonance: 'consonant' },
    '3:2': { ratio: 1.5, label: 'Fifth (3:2)', consonance: 'consonant' },
    '2:1': { ratio: 2.0, label: 'Octave (2:1)', consonance: 'pure' }
  };
  var WAVE_VALID_INTERVAL_LOCKS = { none: 1, '1:1': 1, '5:4': 1, '4:3': 1, '3:2': 1, '2:1': 1 };
  var WAVE_VALID_SPREADING_LAWS = { spherical: 1, cylindrical: 1 };

  function waveHasOwn(map, key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key);
  }

  function waveClampNum(v, lo, hi, fb) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return fb;
    var n = Number(v);
    if (!isFinite(n)) return fb;
    if (n < lo) return lo;
    if (n > hi) return hi;
    return n;
  }

  function waveNormalizeSlitWidth(v) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return 0.08;
    var n = Number(v);
    if (!isFinite(n)) return 0.08;
    // Convert legacy pixel inputs (20..120 px on a 400 px tank height) cleanly into [0.03, 0.25]
    if (n > 1) n = n / 400;
    if (n < 0.03) return 0.03;
    if (n > 0.25) return 0.25;
    return Math.round(n * 1000) / 1000;
  }

  function waveInferBand(gradeLevel) {
    var g = String(gradeLevel || '').toLowerCase();
    if (/3rd|4th|5th|grade\s*[3-5]|elem/.test(g)) return '3-5';
    if (/9th|10th|11th|12th|high|ap\b|college/.test(g)) return '9-12';
    return '6-8';
  }

  function waveNormalizeWeights(rawWeights) {
    var out = [1, 0, 0, 0, 0, 0];
    if (!Array.isArray(rawWeights)) return out;
    for (var i = 0; i < 6; i++) {
      out[i] = waveClampNum(rawWeights[i], 0, 1, i === 0 ? 1 : 0);
    }
    return out;
  }

  function waveStandingEnvelope(u, harmonic, boundary) {
    var uc = Math.max(0, Math.min(1, Number(u) || 0));
    var m = Math.max(1, Math.min(6, Math.round(Number(harmonic) || 1)));
    if (boundary === 'openOpen') return Math.cos(m * Math.PI * uc);
    if (boundary === 'fixedFree') return Math.sin((2 * m - 1) * 0.5 * Math.PI * uc);
    return Math.sin(m * Math.PI * uc);
  }

  function waveStandingGeometry(harmonic, boundary) {
    var m = Math.max(1, Math.min(6, Math.round(Number(harmonic) || 1)));
    var nodePositions = [];
    var antinodePositions = [];
    if (boundary === 'openOpen') {
      for (var ok = 0; ok < m; ok++) nodePositions.push((ok + 0.5) / m);
      for (var oa = 0; oa <= m; oa++) antinodePositions.push(oa / m);
      return {
        boundary: 'openOpen',
        modeIndex: m,
        effectiveHarmonic: m,
        freqMultiplier: m,
        wavelengthFormula: '2L/' + m,
        nodePositions: nodePositions,
        antinodePositions: antinodePositions
      };
    }
    if (boundary === 'fixedFree') {
      var oddN = 2 * m - 1;
      for (var fk = 0; fk < m; fk++) {
        nodePositions.push((2 * fk) / oddN);
        antinodePositions.push((2 * fk + 1) / oddN);
      }
      return {
        boundary: 'fixedFree',
        modeIndex: m,
        effectiveHarmonic: oddN,
        freqMultiplier: oddN * 0.5,
        wavelengthFormula: '4L/' + oddN,
        nodePositions: nodePositions,
        antinodePositions: antinodePositions
      };
    }
    for (var bk = 0; bk <= m; bk++) nodePositions.push(bk / m);
    for (var ba = 0; ba < m; ba++) antinodePositions.push((ba + 0.5) / m);
    return {
      boundary: 'bothFixed',
      modeIndex: m,
      effectiveHarmonic: m,
      freqMultiplier: m,
      wavelengthFormula: '2L/' + m,
      nodePositions: nodePositions,
      antinodePositions: antinodePositions
    };
  }

  var _waveCustomPeakCache = { key: '1,0,0,0,0,0', peak: 1 };
  function waveValPure(t, type, weightsOpt) {
    if (type === 'sine') return Math.sin(t);
    if (type === 'square') return Math.sign(Math.sin(t));
    if (type === 'triangle') return Math.asin(Math.sin(t)) * 2 / Math.PI;
    if (type === 'custom') {
      var ws = waveNormalizeWeights(weightsOpt);
      var key = ws.join(',');
      var peak = 1;
      if (_waveCustomPeakCache.key === key) {
        peak = _waveCustomPeakCache.peak;
      } else {
        peak = 0;
        for (var s = 0; s < 64; s++) {
          var ph = (2 * Math.PI * s) / 64;
          var ps = 0;
          for (var hw = 0; hw < 6; hw++) {
            if (ws[hw] > 0) ps += ws[hw] * Math.sin((hw + 1) * ph);
          }
          if (Math.abs(ps) > peak) peak = Math.abs(ps);
        }
        _waveCustomPeakCache = { key: key, peak: peak };
      }
      if (peak <= 1e-6) return 0;
      var sum = 0;
      for (var k = 0; k < 6; k++) {
        if (ws[k] > 0) sum += ws[k] * Math.sin((k + 1) * t);
      }
      return sum / peak;
    }
    var twopi = Math.PI * 2;
    var norm = ((t % twopi) + twopi) % twopi;
    return (norm / Math.PI) - 1;
  }

  function waveComputeStringSpeed(tensionN, densityGm) {
    var T = waveClampNum(tensionN, 10, 400, 120);
    var muGm = waveClampNum(densityGm, 0.5, 20, 3.0);
    var rawV = Math.sqrt(T / (muGm / 1000));
    return waveClampNum(Math.round(rawV * 10) / 10, 50, 1500, 200);
  }

  function waveComputeBrewsterAngle(medium2Ratio) {
    var r = waveClampNum(medium2Ratio, 0.25, 2.0, 0.6);
    var deg = Math.atan(1 / r) * 180 / Math.PI;
    return Math.round(deg * 100) / 100;
  }

  function waveWavelengthNmToHex(nm) {
    var w = isFinite(nm) ? nm : 656.3;
    if (w < 380) return '#a78bfa';
    if (w < 440) return '#818cf8';
    if (w < 490) return '#38bdf8';
    if (w < 530) return '#34d399';
    if (w < 580) return '#a3e635';
    if (w < 610) return '#facc15';
    if (w < 645) return '#fb923c';
    if (w <= 750) return '#ef4444';
    return '#dc2626';
  }

  function waveComputeRelativisticDoppler(f0, sourceSpeedC, observerSpeedC) {
    var baseF = waveClampNum(f0, 0.2, 2000, 2);
    var betaS = Math.min(0.95, Math.max(0, isFinite(sourceSpeedC) ? sourceSpeedC : 0.3));
    var betaO = waveClampNum(observerSpeedC, -0.8, 0.8, 0);
    var gamma = 1 / Math.sqrt(Math.max(1e-6, 1 - betaS * betaS));
    var betaApp = Math.max(-0.99, Math.min(0.99, (betaS + betaO) / Math.max(1e-6, 1 + betaS * betaO)));
    var betaRec = Math.max(-0.99, Math.min(0.99, (betaS + betaO) / Math.max(1e-6, 1 + betaS * betaO)));
    var dopApp = Math.sqrt((1 + betaApp) / Math.max(1e-6, 1 - betaApp));
    var dopRec = Math.sqrt((1 - betaRec) / Math.max(1e-6, 1 + betaRec));
    var fApp = baseF * dopApp;
    var fRec = baseF * dopRec;
    var zApp = (1 / Math.max(1e-6, dopApp)) - 1;
    var zRec = (1 / Math.max(1e-6, dopRec)) - 1;
    var hAlpha0 = 656.3;
    var hAlphaAppNm = hAlpha0 * (1 + zApp);
    var hAlphaRecNm = hAlpha0 * (1 + zRec);
    return {
      betaS: betaS,
      betaO: betaO,
      gamma: gamma,
      approachingFreq: fApp,
      recedingFreq: fRec,
      redshiftApp: zApp,
      redshiftRec: zRec,
      hAlphaAppNm: hAlphaAppNm,
      hAlphaRecNm: hAlphaRecNm
    };
  }

  function waveComputePluckWeights(pluckPos) {
    var xp = waveClampNum(pluckPos, 0.05, 0.95, 0.5);
    var raw = [];
    var maxW = 0;
    for (var n = 1; n <= 5; n++) {
      var val = Math.abs(Math.sin(n * Math.PI * xp)) / (n * n);
      if (val < 1e-3) val = 0;
      raw.push(val);
      if (val > maxW) maxW = val;
    }
    if (maxW <= 1e-6) return [1, 0, 0, 0, 0];
    var out = [];
    for (var i = 0; i < 5; i++) {
      var scaled = Math.round((raw[i] / maxW) * 100) / 100;
      out.push(waveClampNum(scaled, 0, 1, 0));
    }
    return out;
  }

  function waveComputeAirSoundSpeed(tempC) {
    var tc = waveClampNum(tempC, -30, 60, 20);
    var rawV = 331.3 * Math.sqrt(Math.max(0.1, 1 + tc / 273.15));
    return waveClampNum(Math.round(rawV * 10) / 10, 50, 1500, 343.2);
  }

  function waveComputeResonatorResponse(driveFreqRatio, resonatorQ, boundary, baseFreqOpt) {
    var r = waveClampNum(driveFreqRatio, 0.25, 6.5, 1.0);
    var Q = Math.round(waveClampNum(resonatorQ, 5, 80, 20));
    var f1 = waveClampNum(baseFreqOpt, 0.5, 10, 2);
    var bMode = waveHasOwn(WAVE_VALID_BOUNDARIES, boundary) ? boundary : 'bothFixed';
    var nearestMode = 1;
    var bestDist = Infinity;
    var bestModeGain = -1;
    var sumSq = 0;
    for (var m = 1; m <= 6; m++) {
      var rm = waveStandingGeometry(m, bMode).freqMultiplier;
      var um = r / rm;
      var gm = 1 / Math.sqrt(Q * Q * Math.pow(1 - um * um, 2) + um * um);
      sumSq += gm * gm;
      var dist = Math.abs(r - rm);
      if (dist < bestDist - 1e-6 || (Math.abs(dist - bestDist) <= 1e-6 && gm > bestModeGain)) {
        bestDist = dist;
        bestModeGain = gm;
        nearestMode = m;
      }
    }
    var gainNorm = Math.min(1, Math.sqrt(sumSq));
    var rNearest = waveStandingGeometry(nearestMode, bMode).freqMultiplier;
    var uNear = r / rNearest;
    var phaseLagRad = Math.atan2(uNear / Q, 1 - uNear * uNear);
    var phaseLagDeg = Math.round((phaseLagRad * 180 / Math.PI) * 10) / 10;
    var fwhmHz = Math.round(((rNearest * f1) / Q) * 1000) / 1000;
    var driveFreqHz = Math.round((r * f1) * 100) / 100;
    var resonantFreqHz = Math.round((rNearest * f1) * 100) / 100;
    return {
      driveFreqRatio: r,
      resonatorQ: Q,
      nearestMode: nearestMode,
      nearestModeRatio: rNearest,
      gainNorm: Math.round(gainNorm * 10000) / 10000,
      gainPct: Math.round(gainNorm * 1000) / 10,
      amplificationFactor: Math.round(gainNorm * Q * 100) / 100,
      phaseLagRad: phaseLagRad,
      phaseLagDeg: phaseLagDeg,
      fwhmHz: fwhmHz,
      driveFreqHz: driveFreqHz,
      resonantFreqHz: resonantFreqHz,
      isAtResonance: gainNorm >= 0.707
    };
  }

  function waveComputeEvanescentTunneling(wavelength1, medium2Ratio, incidentAngleDeg, ftirEnabled, ftirGapLambda) {
    var lam1 = Math.max(0.01, Number(wavelength1) || 171.5);
    var r = waveClampNum(medium2Ratio, 0.25, 2.0, 0.6);
    var th1Deg = waveClampNum(incidentAngleDeg, 0, 85, 0);
    var gapLam = waveClampNum(ftirGapLambda, 0.05, 1.5, 0.25);
    var sinTh1 = Math.sin(th1Deg * Math.PI / 180);
    var invRSq = 1 / (r * r);
    var isTIR = r > 1 && (r * sinTh1) > 1.000001;
    var gapMeters = Math.round(gapLam * lam1 * 100) / 100;
    if (!isTIR) {
      return {
        isTIR: false,
        penetrationLambda: null,
        penetrationMeters: null,
        barrierOpacityEta: 0,
        tunnelTransmission: 0,
        tunnelTransmissionPct: 0,
        potentialTunnelPct: 0,
        ftirReflectivity: 1,
        gapMeters: gapMeters
      };
    }
    var radicand = Math.max(1e-6, sinTh1 * sinTh1 - invRSq);
    var penetrationLambda = Math.min(20, 1 / (2 * Math.PI * Math.sqrt(radicand)));
    var penetrationMeters = penetrationLambda * lam1;
    var eta = gapLam / Math.max(1e-6, penetrationLambda);
    var coshEta = Math.cosh(Math.min(20, eta));
    var tunnelRaw = 1 / (coshEta * coshEta);
    var tunnelTransmission = ftirEnabled ? Math.max(0, Math.min(1, tunnelRaw)) : 0;
    var ftirReflectivity = Math.sqrt(Math.max(0, 1 - tunnelTransmission));
    return {
      isTIR: true,
      penetrationLambda: Math.round(penetrationLambda * 1000) / 1000,
      penetrationMeters: Math.round(penetrationMeters * 100) / 100,
      barrierOpacityEta: Math.round(eta * 1000) / 1000,
      tunnelTransmission: Math.round(tunnelTransmission * 10000) / 10000,
      tunnelTransmissionPct: Math.round(tunnelTransmission * 1000) / 10,
      potentialTunnelPct: Math.round(tunnelRaw * 1000) / 10,
      ftirReflectivity: Math.round(ftirReflectivity * 10000) / 10000,
      gapMeters: gapMeters
    };
  }

  function waveComputeOceanDispersion(waterDepthRatio) {
    var hOverLam = waveClampNum(waterDepthRatio, 0.02, 1.0, 0.5);
    var kh = 2 * Math.PI * hOverLam;
    var twoKh = 2 * kh;
    var ratioTerm = twoKh > 40 ? 0 : (twoKh / Math.max(1e-9, Math.sinh(twoKh)));
    var vgOverVp = Math.max(0.5, Math.min(1.0, 0.5 * (1 + ratioTerm)));
    var regime = hOverLam < 0.05 ? 'shallow' : (hOverLam <= 0.5 ? 'intermediate' : 'deep');
    var phaseFactor = Math.round(Math.sqrt(Math.tanh(kh)) * 1000) / 1000;
    return {
      depthRatio: hOverLam,
      kh: Math.round(kh * 1000) / 1000,
      vgOverVp: Math.round(vgOverVp * 1000) / 1000,
      phaseFactor: phaseFactor,
      regime: regime
    };
  }

  function waveComputeBeatConsonance(f1, f2, a1, a2, phase2Rad) {
    var freq1 = Math.max(0.1, isFinite(Number(f1)) ? Number(f1) : 2);
    var freq2 = Math.max(0.1, isFinite(Number(f2)) ? Number(f2) : 3);
    var amp1 = Math.max(0, isFinite(Number(a1)) ? Number(a1) : 50);
    var amp2 = Math.max(0, isFinite(Number(a2)) ? Number(a2) : 30);
    var ph2 = isFinite(Number(phase2Rad)) ? Number(phase2Rad) : 0;
    var beatFreqHz = Math.round(Math.abs(freq1 - freq2) * 100) / 100;
    var beatPeriodS = beatFreqHz > 0.01 ? Math.round((1 / beatFreqHz) * 100) / 100 : null;
    var carrierFreqHz = Math.round(((freq1 + freq2) / 2) * 100) / 100;
    var sumAmp = amp1 + amp2;
    var modDepth = sumAmp > 0 ? Math.round((2 * Math.min(amp1, amp2) / sumAmp) * 1000) / 1000 : 0;
    var modDepthPct = Math.round(modDepth * 1000) / 10;
    var peakAmp = Math.round(sumAmp * 10) / 10;
    var troughAmp = Math.round(Math.abs(amp1 - amp2) * 10) / 10;
    var ratio = Math.round((freq2 / freq1) * 1000) / 1000;
    var matchedInterval = null;
    var minRatioErr = Infinity;
    Object.keys(WAVE_INTERVAL_PRESETS).forEach(function(k) {
      var preset = WAVE_INTERVAL_PRESETS[k];
      var err = Math.abs(ratio - preset.ratio);
      if (err <= 0.018 && err < minRatioErr) {
        minRatioErr = err;
        matchedInterval = k;
      }
    });
    var centsOff = null;
    if (matchedInterval) {
      centsOff = Math.round(1200 * (Math.log(ratio / WAVE_INTERVAL_PRESETS[matchedInterval].ratio) / Math.LN2) * 10) / 10;
    }
    var classification = 'rough';
    if (matchedInterval === '1:1' || matchedInterval === '2:1') {
      if (matchedInterval === '1:1' && Math.abs(Math.cos(ph2) + 1) < 0.08 && Math.abs(amp1 - amp2) <= 5) {
        classification = 'destructive';
      } else {
        classification = 'pure';
      }
    } else if (matchedInterval) {
      classification = 'consonant';
    } else if (beatFreqHz > 0.01 && beatFreqHz <= 2.5) {
      classification = 'slow-beat';
    } else if (beatFreqHz > 2.5 && beatFreqHz <= 8.0) {
      classification = 'rough';
    } else {
      classification = 'complex';
    }
    return {
      beatFreqHz: beatFreqHz,
      beatPeriodS: beatPeriodS,
      carrierFreqHz: carrierFreqHz,
      modDepth: modDepth,
      modDepthPct: modDepthPct,
      peakAmp: peakAmp,
      troughAmp: troughAmp,
      ratio: ratio,
      matchedInterval: matchedInterval,
      centsOff: centsOff,
      classification: classification
    };
  }

  function waveComputeAcousticAttenuation(sourceDb, sourceAmp, listenerDistMeters, spreadingLaw) {
    var srcDb = isFinite(Number(sourceDb)) ? Number(sourceDb) : 64.0;
    var amp0 = Math.max(1, isFinite(Number(sourceAmp)) ? Number(sourceAmp) : 50);
    var r = waveClampNum(listenerDistMeters, 1, 20, 4);
    var law = waveHasOwn(WAVE_VALID_SPREADING_LAWS, spreadingLaw) ? spreadingLaw : 'spherical';
    var exponent = law === 'cylindrical' ? 1 : 2;
    var intensityRatio = Math.pow(1 / r, exponent);
    var amplitudeFactor = Math.sqrt(intensityRatio);
    var dropDb = Math.round((10 * exponent * (Math.log(r) / Math.LN10)) * 10) / 10;
    var listenerDb = Math.round((srcDb - dropDb) * 10) / 10;
    var localAmp = Math.round((amp0 * amplitudeFactor) * 100) / 100;
    return {
      listenerDistMeters: r,
      spreadingLaw: law,
      exponent: exponent,
      intensityRatio: Math.round(intensityRatio * 10000) / 10000,
      intensityPct: Math.round(intensityRatio * 1000) / 10,
      amplitudeFactor: Math.round(amplitudeFactor * 10000) / 10000,
      dropDb: dropDb,
      dbPerDoubling: law === 'cylindrical' ? 3.01 : 6.02,
      listenerDb: listenerDb,
      localAmp: localAmp
    };
  }

  function waveComputeRippleInterferenceGeometry(rawState) {
    var s = waveNormalizeState(rawState);
    var refW = 400;
    var refH = 210;
    var lambdaPx = refW / Math.max(0.5, s.frequency * 2);
    var barX = refW * 0.36;
    var screenDistPx = refW - barX;
    var dSepPx;
    var effSources = 2;
    if (s.rippleBarrier === 'doubleSlit') {
      dSepPx = 2 * Math.min(refH * 0.34, Math.max(s.rippleSeparation * 0.5, s.slitWidth * refH * 0.5 + 16));
      effSources = 2;
    } else if (s.rippleBarrier === 'grating') {
      dSepPx = Math.min((refH * 0.68) / Math.max(1, s.gratingSlits - 1), Math.max(s.slitWidth * refH + 10, s.rippleSeparation * 0.48));
      effSources = s.gratingSlits;
      screenDistPx = refW - barX;
    } else if (s.rippleBarrier === 'singleSlit' || s.rippleBarrier === 'obstacle') {
      dSepPx = Math.max(8, s.slitWidth * refH);
      effSources = 1;
    } else {
      var p1x = s.rippleSrc1 ? s.rippleSrc1.x * refW : (refW / 2 - s.rippleSeparation / 2);
      var p1y = s.rippleSrc1 ? s.rippleSrc1.y * refH : (refH / 2);
      var p2x = s.rippleSrc2 ? s.rippleSrc2.x * refW : (refW / 2 + s.rippleSeparation / 2);
      var p2y = s.rippleSrc2 ? s.rippleSrc2.y * refH : (refH / 2);
      dSepPx = Math.max(4, Math.hypot(p2x - p1x, p2y - p1y));
      screenDistPx = Math.max(60, refW * 0.45);
    }
    var fringeSpacingPx = Math.round(((lambdaPx * screenDistPx) / Math.max(4, dSepPx)) * 100) / 100;
    var nodalPathShiftPx = Math.round((lambdaPx * 0.5) * 100) / 100;
    var maxNodalOrder = Math.max(0, Math.floor((dSepPx / lambdaPx) - 0.5));
    var nodalAnglesDeg = [];
    if (effSources >= 2) {
      for (var ord = 0; ord <= maxNodalOrder; ord++) {
        var sVal = ((ord + 0.5) * lambdaPx) / Math.max(4, dSepPx);
        if (sVal < 1) {
          var deg = Math.round((Math.asin(sVal) * 180 / Math.PI) * 10) / 10;
          nodalAnglesDeg.push(deg);
        }
      }
    }
    var nodalCount = effSources >= 2 ? (nodalAnglesDeg.length * 2) : 0;
    var firstMinimumDeg = nodalAnglesDeg.length > 0 ? nodalAnglesDeg[0] : Math.round((Math.asin(Math.min(1, lambdaPx / Math.max(4, dSepPx))) * 180 / Math.PI) * 10) / 10;
    return {
      lambdaPx: Math.round(lambdaPx * 100) / 100,
      dSepPx: Math.round(dSepPx * 100) / 100,
      screenDistPx: Math.round(screenDistPx * 10) / 10,
      fringeSpacingPx: fringeSpacingPx,
      nodalPathShiftPx: nodalPathShiftPx,
      nodalLineCount: nodalCount,
      nodalAnglesDeg: nodalAnglesDeg,
      firstMinimumDeg: firstMinimumDeg
    };
  }

  function waveQuantizeAdcSample(normVal, adcBitDepth) {
    var bits = Math.round(waveClampNum(adcBitDepth, 2, 16, 8));
    var levels = Math.pow(2, bits);
    var v = Math.max(-1, Math.min(0.999999, Number(normVal) || 0));
    var idx = Math.max(0, Math.min(levels - 1, Math.floor(((v + 1) * 0.5) * levels)));
    return Math.round((-1 + (idx + 0.5) * (2 / levels)) * 100000) / 100000;
  }

  function waveComputeDigitalSampling(f1Hz, sampleRateRatio, adcBitDepth) {
    var f1 = waveClampNum(f1Hz, 0.5, 10, 2);
    var ratio = waveClampNum(sampleRateRatio, 1.2, 16, 8);
    var bits = Math.round(waveClampNum(adcBitDepth, 2, 16, 8));
    var sampleRateHz = Math.round(f1 * ratio * 100) / 100;
    var nyquistFreqHz = Math.round(sampleRateHz * 0.5 * 100) / 100;
    var quantizationLevels = Math.pow(2, bits);
    var lsbStepNorm = Math.round((2 / quantizationLevels) * 100000) / 100000;
    var sqnrDb = Math.round((6.0206 * bits + 1.7609) * 10) / 10;
    var isFundamentalAliased = ratio < 2;
    var foldMultiple = Math.round(f1 / Math.max(1e-6, sampleRateHz));
    var aliasFreqHz = Math.round(Math.abs(f1 - foldMultiple * sampleRateHz) * 100) / 100;
    var maxUnaliasedHarmonic = Math.max(0, Math.floor(ratio * 0.5 - 1e-9));
    return {
      sampleRateRatio: ratio,
      sampleRateHz: sampleRateHz,
      nyquistFreqHz: nyquistFreqHz,
      adcBitDepth: bits,
      quantizationLevels: quantizationLevels,
      lsbStepNorm: lsbStepNorm,
      sqnrDb: sqnrDb,
      isFundamentalAliased: isFundamentalAliased,
      aliasFreqHz: aliasFreqHz,
      maxUnaliasedHarmonic: maxUnaliasedHarmonic
    };
  }

  function waveComputeStandingDecomposition(uFrac, phaseRad, harmonic, boundary) {
    var u = waveClampNum(uFrac, 0, 1, 0.5);
    var h = Math.max(1, Math.min(6, Math.round(Number(harmonic) || 1)));
    var phi = isFinite(Number(phaseRad)) ? Number(phaseRad) : 0;
    var bnd = waveHasOwn(WAVE_VALID_BOUNDARIES, boundary) ? boundary : 'bothFixed';
    var kL;
    var yForward;
    var yBackward;
    if (bnd === 'openOpen') {
      kL = h * Math.PI;
      yForward = 0.5 * Math.cos(kL * u - phi);
      yBackward = 0.5 * Math.cos(kL * u + phi);
    } else if (bnd === 'fixedFree') {
      kL = (2 * h - 1) * Math.PI * 0.5;
      yForward = 0.5 * Math.sin(kL * u - phi);
      yBackward = 0.5 * Math.sin(kL * u + phi);
    } else {
      kL = h * Math.PI;
      yForward = 0.5 * Math.sin(kL * u - phi);
      yBackward = 0.5 * Math.sin(kL * u + phi);
    }
    var yStanding = yForward + yBackward;
    var potentialFrac = Math.cos(phi) * Math.cos(phi);
    var kineticFrac = Math.sin(phi) * Math.sin(phi);
    return {
      u: u,
      phaseRad: phi,
      kL: kL,
      yForward: yForward,
      yBackward: yBackward,
      yStanding: yStanding,
      potentialFrac: potentialFrac,
      kineticFrac: kineticFrac,
      totalEnergyNorm: potentialFrac + kineticFrac
    };
  }

  function waveComputeOffAxisDoppler(f0Hz, sourceSpeedMach, observerAngleDeg, dopplerRegime) {
    var f0 = waveClampNum(f0Hz, 0.5, 10, 2);
    var srcM = waveClampNum(sourceSpeedMach, 0, 1.5, 0.3);
    var thetaDeg = waveClampNum(observerAngleDeg, 0, 90, 0);
    var isRel = dopplerRegime === 'relativistic';
    var thetaRad = (thetaDeg * Math.PI) / 180;
    var cosTheta = Math.cos(thetaRad);
    var effSpeed = isRel ? Math.min(0.95, srcM) : srcM;
    var radialMach = Math.round(effSpeed * cosTheta * 10000) / 10000;
    var radarCosinePct = Math.round(cosTheta * 1000) / 10;
    var gamma = isRel ? (1 / Math.sqrt(Math.max(1e-6, 1 - effSpeed * effSpeed))) : 1;
    var transverseFreqHz = Math.round((f0 / gamma) * 1000) / 1000;
    var observedFreqHz;
    if (isRel) {
      observedFreqHz = Math.round((f0 / (gamma * Math.max(1e-6, 1 - effSpeed * cosTheta))) * 1000) / 1000;
    } else {
      var denom = 1 - effSpeed * cosTheta;
      observedFreqHz = denom > 0.05 ? (Math.round((f0 / denom) * 1000) / 1000) : Infinity;
    }
    return {
      observerAngleDeg: thetaDeg,
      cosTheta: cosTheta,
      radarCosinePct: radarCosinePct,
      radialMach: radialMach,
      observedFreqHz: observedFreqHz,
      transverseFreqHz: transverseFreqHz,
      gamma: gamma,
      isTransverseRedshift: isRel && thetaDeg >= 85 && effSpeed > 0.02
    };
  }

  function waveGratingIntensityFactor(sinTheta, dOverLambda, nSlits, phaseDiffRad) {
    var N = Math.max(2, Math.min(6, Math.round(Number(nSlits) || 4)));
    var sTh = Math.max(-1, Math.min(1, Number(sinTheta) || 0));
    var dLam = Math.max(0.1, Number(dOverLambda) || 1);
    var dPhi = isFinite(Number(phaseDiffRad)) ? Number(phaseDiffRad) : 0;
    var beta = Math.PI * dLam * sTh + 0.5 * dPhi;
    var sinBeta = Math.sin(beta);
    if (Math.abs(sinBeta) < 1e-6) return 1;
    var ratio = Math.sin(N * beta) / (N * sinBeta);
    return Math.max(0, Math.min(1, ratio * ratio));
  }

  function waveFilterHarmonicGain(order, filterMode, cutoffHarmonic) {
    var h = Math.max(1, Math.round(Number(order) || 1));
    var hc = Math.max(1, Math.min(12, Math.round(Number(cutoffHarmonic) || 3)));
    if (filterMode === 'lowpass') return h <= hc ? 1 : 0;
    if (filterMode === 'highpass') return h >= hc ? 1 : 0;
    if (filterMode === 'oddOnly') return (h % 2 === 1) ? 1 : 0;
    return 1;
  }

  function waveEvalPulseCollision(u, phaseFrac, polarity) {
    var uc = waveClampNum(u, 0, 1, 0.5);
    var pfRaw = Number(phaseFrac);
    var pf = isFinite(pfRaw) ? (((pfRaw % 1) + 1) % 1) : 0;
    var sign2 = polarity === 'same' ? 1 : -1;
    var c1 = 0.12 + 0.76 * pf;
    var c2 = 0.88 - 0.76 * pf;
    var sigma = 0.065;
    var y1 = Math.exp(-((uc - c1) * (uc - c1)) / (2 * sigma * sigma));
    var y2 = sign2 * Math.exp(-((uc - c2) * (uc - c2)) / (2 * sigma * sigma));
    return { c1: c1, c2: c2, y1: y1, y2: y2, yNet: y1 + y2 };
  }

  function waveCompareSnapshot(currentRaw, snapEntry) {
    var cur = waveNormalizeState(currentRaw);
    var curMet = waveComputeMetrics(cur);
    var snapPatch = (snapEntry && typeof snapEntry === 'object')
      ? ((snapEntry.statePatch && typeof snapEntry.statePatch === 'object') ? snapEntry.statePatch : snapEntry)
      : {};
    var snapNorm = waveNormalizeState(snapPatch);
    var snapMet = waveComputeMetrics(snapNorm);
    return {
      deltaFreq: Math.round((cur.frequency - snapNorm.frequency) * 100) / 100,
      deltaWavelength: Math.round((curMet.wavelength - snapMet.wavelength) * 100) / 100,
      deltaSpeed: Math.round((cur.waveSpeed - snapNorm.waveSpeed) * 10) / 10,
      energyRatio: Math.round((curMet.energy / Math.max(1, snapMet.energy)) * 100) / 100
    };
  }

  function waveReadPersistedMastery() {
    var merged = {};
    try {
      if (typeof window !== 'undefined' && window.__alloflowWave && typeof window.__alloflowWave === 'object' && window.__alloflowWave.waveMastery && typeof window.__alloflowWave.waveMastery === 'object') {
        WAVE_MASTERY_IDS.forEach(function(id) {
          if (window.__alloflowWave.waveMastery[id] === true) merged[id] = true;
        });
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        var raw = window.localStorage.getItem('wave.state.v1');
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && parsed.waveMastery && typeof parsed.waveMastery === 'object') {
            WAVE_MASTERY_IDS.forEach(function(id) {
              if (parsed.waveMastery[id] === true) merged[id] = true;
            });
          }
        }
      }
    } catch (e) {}
    return merged;
  }

  function waveSyncMasterySlot(masteryMap) {
    var clean = {};
    if (masteryMap && typeof masteryMap === 'object') {
      WAVE_MASTERY_IDS.forEach(function(id) {
        if (masteryMap[id] === true) clean[id] = true;
      });
    }
    try {
      if (typeof window !== 'undefined') {
        window.__alloflowWave = { waveMastery: clean };
        if (window.localStorage) {
          window.localStorage.setItem('wave.state.v1', JSON.stringify({ waveMastery: clean }));
        }
      }
    } catch (e) {}
    return clean;
  }

  function waveComputeMastery(state) {
    var s = state && typeof state === 'object' ? state : {};
    var m = {};
    var existing = waveReadPersistedMastery();
    WAVE_MASTERY_IDS.forEach(function(id) {
      if ((s.waveMastery && s.waveMastery[id] === true) || existing[id] === true) m[id] = true;
    });
    var done = s.missionsDone && typeof s.missionsDone === 'object' ? s.missionsDone : {};
    WAVE_MISSIONS.forEach(function(def) {
      if (done[def.id] === true) m[def.id] = true;
    });
    if (s.matchedOnce || s.matchXpClaimed) m.matched_wave = true;
    if (s.discoverWave && s.discoverWave.discovered) m.discovered_law = true;
    if (s.standingHunt && (s.standingHunt.understood || (Array.isArray(s.standingHunt.observationsLogged) && s.standingHunt.observationsLogged.length >= 3))) {
      m.standing_hunt_logged = true;
    }
    if (Array.isArray(s.experimentLog) && s.experimentLog.length >= 3) m.logged_3_trials = true;
    if (String(s.cerClaim || '').trim().length >= 10 && String(s.cerEvidence || '').trim().length >= 10 && String(s.cerReasoning || '').trim().length >= 10) {
      m.cer_completed = true;
    }
    var visitedCount = s.modesVisited && typeof s.modesVisited === 'object'
      ? Object.keys(s.modesVisited).filter(function(k) { return !!WAVE_VALID_MODES[k] && !!s.modesVisited[k]; }).length
      : 0;
    if (visitedCount >= 4) m.explored_modes = true;
    var bestQuiz = Math.max(
      waveClampNum(s.quizBestScore, 0, 50, 0),
      (s.quiz && typeof s.quiz === 'object' && !Array.isArray(s.quiz)) ? waveClampNum(s.quiz.score, 0, 50, 0) : 0
    );
    if (bestQuiz >= 1) m.quiz_1 = true;
    if (bestQuiz >= 3) m.quiz_3 = true;
    if (bestQuiz >= 5) m.quiz_5 = true;
    if (bestQuiz >= 7) m.quiz_7 = true;
    return m;
  }

  function waveNormalizeState(raw, gradeLevelOpt) {
    var src = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    var mode = waveHasOwn(WAVE_VALID_MODES, src.waveMode) ? src.waveMode : (waveHasOwn(WAVE_VALID_MODES, src.mode) ? src.mode : 'free');
    var wType = waveHasOwn(WAVE_VALID_TYPES, src.waveType) ? src.waveType : 'sine';
    var wsTab = waveHasOwn(WAVE_VALID_TABS, src.workspaceTab) ? src.workspaceTab : (waveHasOwn(WAVE_VALID_TABS, src.tab) ? src.tab : 'explore');
    var lBand = waveHasOwn(WAVE_VALID_BANDS, src.learnerBand) ? src.learnerBand : waveInferBand(gradeLevelOpt);
    var sBoundary = waveHasOwn(WAVE_VALID_BOUNDARIES, src.standingBoundary) ? src.standingBoundary : 'bothFixed';
    var rBarrier = waveHasOwn(WAVE_VALID_RIPPLE_BARRIERS, src.rippleBarrier) ? src.rippleBarrier : 'none';
    var pMode = waveHasOwn(WAVE_VALID_PACKET_MODES, src.packetMode) ? src.packetMode : 'continuous';
    var colPol = waveHasOwn(WAVE_VALID_COLLIDE_POLARITIES, src.collidePolarity) ? src.collidePolarity : 'opposite';
    var sFilter = waveHasOwn(WAVE_VALID_FILTERS, src.spectrumFilter) ? src.spectrumFilter : 'none';
    var lMode = waveHasOwn(WAVE_VALID_LONGITUDINAL_MODES, src.longitudinalMode) ? src.longitudinalMode : 'traveling';
    var pScope = waveHasOwn(WAVE_VALID_PROBE_SCOPES, src.probeScopeMode) ? src.probeScopeMode : 'time';
    var fPol = waveHasOwn(WAVE_VALID_POLARIZATIONS, src.fresnelPolarization) ? src.fresnelPolarization : 's';
    var dRegime = waveHasOwn(WAVE_VALID_DOPPLER_REGIMES, src.dopplerRegime) ? src.dopplerRegime : 'acoustic';
    var dsPlot = waveHasOwn(WAVE_VALID_DS_PLOTS, src.dataStudioPlot) ? src.dataStudioPlot : 'freqWavelength';
    var iLock = waveHasOwn(WAVE_VALID_INTERVAL_LOCKS, src.intervalLock) ? src.intervalLock : 'none';
    var spreadLaw = waveHasOwn(WAVE_VALID_SPREADING_LAWS, src.spreadingLaw) ? src.spreadingLaw : 'spherical';
    var hWeights = waveNormalizeWeights(src.harmonicWeights);
    var strMech = !!src.stringMechanics;
    var strTension = waveClampNum(src.stringTension, 10, 400, 120);
    var strDensity = waveClampNum(src.stringDensityGm, 0.5, 20, 3.0);

    var rSrc1 = (src.rippleSrc1 && typeof src.rippleSrc1 === 'object' && isFinite(Number(src.rippleSrc1.x)) && isFinite(Number(src.rippleSrc1.y)))
      ? { x: waveClampNum(src.rippleSrc1.x, 0.05, 0.95, 0.4), y: waveClampNum(src.rippleSrc1.y, 0.05, 0.95, 0.5) }
      : null;
    var rSrc2 = (src.rippleSrc2 && typeof src.rippleSrc2 === 'object' && isFinite(Number(src.rippleSrc2.x)) && isFinite(Number(src.rippleSrc2.y)))
      ? { x: waveClampNum(src.rippleSrc2.x, 0.05, 0.95, 0.6), y: waveClampNum(src.rippleSrc2.y, 0.05, 0.95, 0.5) }
      : null;
    var wallFrac = (src.wallFrac != null && src.wallFrac !== '' && isFinite(Number(src.wallFrac)))
      ? waveClampNum(src.wallFrac, 0.2, 0.95, 0.75)
      : null;

    var matchTarget = null;
    if (src.matchTarget && typeof src.matchTarget === 'object' && !Array.isArray(src.matchTarget)) {
      var ta = waveClampNum(src.matchTarget.amp, 5, 100, 0);
      var tf = waveClampNum(src.matchTarget.freq, 0.5, 10, 0);
      if (ta > 0 && tf > 0) matchTarget = { amp: ta, freq: tf, isEquation: !!src.matchTarget.isEquation };
    }

    var quizObj = null;
    if (src.quiz && typeof src.quiz === 'object' && !Array.isArray(src.quiz) && Array.isArray(src.quiz.opts)) {
      quizObj = Object.assign({}, src.quiz, {
        q: String(src.quiz.q || ''),
        a: String(src.quiz.a || ''),
        opts: src.quiz.opts.map(function(o) { return String(o); }),
        answered: !!src.quiz.answered,
        chosen: src.quiz.chosen != null ? String(src.quiz.chosen) : undefined,
        fb: src.quiz.fb != null ? String(src.quiz.fb) : '',
        score: waveClampNum(src.quiz.score, 0, 999, 0),
        attempted: waveClampNum(src.quiz.attempted, 0, 999, 0)
      });
    }

    var dwRaw = (src.discoverWave && typeof src.discoverWave === 'object' && !Array.isArray(src.discoverWave)) ? src.discoverWave : {};
    var discoverWave = {
      freq: waveClampNum(dwRaw.freq, 1, 20, 4),
      tension: Math.round(waveClampNum(dwRaw.tension, 10, 200, 50)),
      observationsLogged: Array.isArray(dwRaw.observationsLogged) ? dwRaw.observationsLogged.slice(-6).filter(function(o) { return o && typeof o === 'object'; }) : [],
      discovered: !!dwRaw.discovered
    };

    var shRaw = (src.standingHunt && typeof src.standingHunt === 'object' && !Array.isArray(src.standingHunt)) ? src.standingHunt : {};
    var standingHunt = {
      tension: waveClampNum(shRaw.tension, 10, 200, 50),
      freq: waveClampNum(shRaw.freq, 1, 30, 4),
      hypothesis: typeof shRaw.hypothesis === 'string' ? shRaw.hypothesis : '',
      stuckRevealed: !!shRaw.stuckRevealed,
      understood: !!shRaw.understood,
      explanation: typeof shRaw.explanation === 'string' ? shRaw.explanation : '',
      observationsLogged: Array.isArray(shRaw.observationsLogged) ? shRaw.observationsLogged.slice(-8).filter(function(o) { return o && typeof o === 'object'; }) : []
    };

    var missionsDone = {};
    if (src.missionsDone && typeof src.missionsDone === 'object' && !Array.isArray(src.missionsDone)) {
      WAVE_MISSIONS.forEach(function(def) {
        if (src.missionsDone[def.id] === true) missionsDone[def.id] = true;
      });
    }

    var modesVisited = {};
    if (src.modesVisited && typeof src.modesVisited === 'object' && !Array.isArray(src.modesVisited)) {
      Object.keys(WAVE_VALID_MODES).forEach(function(mk) {
        if (src.modesVisited[mk]) modesVisited[mk] = true;
      });
    }
    modesVisited[mode] = true;

    var experimentLog = Array.isArray(src.experimentLog)
      ? src.experimentLog.slice(-25).filter(function(r) { return r && typeof r === 'object'; }).map(function(r, idx) {
          var fVal = waveClampNum(r.frequency, 0.5, 10, 2);
          var vsVal = waveClampNum(r.waveSpeed, 50, 1500, 343);
          var aVal = waveClampNum(r.amplitude, 5, 100, 50);
          var srcSpd = waveClampNum(r.sourceSpeed, 0, 1.5, 0.3);
          var obsSpd = waveClampNum(r.observerSpeed, -0.8, 0.8, 0);
          var m2R = waveClampNum(r.medium2Ratio, 0.25, 2.0, 0.6);
          var th1 = waveClampNum(r.incidentAngleDeg, 0, 85, 0);
          var dReg = waveHasOwn(WAVE_VALID_DOPPLER_REGIMES, r.dopplerRegime) ? r.dopplerRegime : 'acoustic';
          var fPolRow = waveHasOwn(WAVE_VALID_POLARIZATIONS, r.fresnelPolarization) ? r.fresnelPolarization : 's';
          var airT = waveClampNum(r.airTempC, -30, 60, 20);
          var appDef = dReg === 'relativistic'
            ? waveComputeRelativisticDoppler(fVal, srcSpd, obsSpd).approachingFreq
            : (srcSpd < 0.99 ? (fVal * (1 + obsSpd) / Math.max(0.05, 1 - srcSpd)) : null);
          var sT2 = m2R * Math.sin((th1 * Math.PI) / 180);
          var refDef = (m2R > 1 && sT2 > 1.000001) ? null : (Math.asin(Math.max(-1, Math.min(1, sT2))) * 180 / Math.PI);
          return {
            id: typeof r.id === 'string' ? r.id : ('row-' + idx),
            n: waveClampNum(r.n, 1, 9999, idx + 1),
            mode: waveHasOwn(WAVE_VALID_MODES, r.mode) ? r.mode : 'free',
            waveType: waveHasOwn(WAVE_VALID_TYPES, r.waveType) ? r.waveType : 'sine',
            frequency: fVal,
            amplitude: aVal,
            waveSpeed: vsVal,
            wavelength: waveClampNum(r.wavelength, 0.01, 5000, vsVal / fVal),
            period: waveClampNum(r.period, 0.01, 100, 1 / fVal),
            energy: waveClampNum(r.energy, 1, 20000, aVal * aVal),
            sourceSpeed: srcSpd,
            observerSpeed: obsSpd,
            dopplerRegime: dReg,
            fresnelPolarization: fPolRow,
            reflectedEnergyPct: waveClampNum(r.reflectedEnergyPct, 0, 100, 0),
            redshiftRec: (typeof r.redshiftRec === 'number' && isFinite(r.redshiftRec)) ? r.redshiftRec : 0,
            airTempC: airT,
            pluckPosition: waveClampNum(r.pluckPosition, 0.05, 0.95, 0.5),
            approachingFreq: (typeof r.approachingFreq === 'number' && isFinite(r.approachingFreq)) ? r.approachingFreq : appDef,
            incidentAngleDeg: th1,
            refractedAngleDeg: (typeof r.refractedAngleDeg === 'number' && isFinite(r.refractedAngleDeg)) ? r.refractedAngleDeg : refDef,
            medium2Ratio: m2R,
            soundLevelDb: waveClampNum(r.soundLevelDb, 20, 140, Math.round((50 + 20 * (Math.log(Math.max(1, aVal) / 10) / Math.LN10)) * 10) / 10),
            groupVelocity: waveClampNum(r.groupVelocity, 10, 4000, vsVal),
            ripplePhaseDiff: waveClampNum(r.ripplePhaseDiff, -3.1416, 3.1416, 0),
            beamSteerAngleDeg: (typeof r.beamSteerAngleDeg === 'number' && isFinite(r.beamSteerAngleDeg)) ? waveClampNum(r.beamSteerAngleDeg, -90, 90, 0) : 0,
            stringTension: waveClampNum(r.stringTension, 10, 400, 120),
            stringDensityGm: waveClampNum(r.stringDensityGm, 0.5, 20, 3.0),
            driveFreqRatio: waveClampNum(r.driveFreqRatio, 0.25, 6.5, 1.0),
            resonatorQ: Math.round(waveClampNum(r.resonatorQ, 5, 80, 20)),
            resonatorGainPct: waveClampNum(r.resonatorGainPct, 0, 100, 100),
            ftirGapLambda: waveClampNum(r.ftirGapLambda, 0.05, 1.5, 0.25),
            transmittedEnergyPct: waveClampNum(r.transmittedEnergyPct, 0, 100, 100 - waveClampNum(r.reflectedEnergyPct, 0, 100, 0)),
            waterDepthRatio: waveClampNum(r.waterDepthRatio, 0.02, 1.0, 0.5),
            listenerDistMeters: waveClampNum(r.listenerDistMeters, 1, 20, 4),
            attenuatedDb: r.attenuatedDb != null && isFinite(Number(r.attenuatedDb)) ? Number(r.attenuatedDb) : null,
            rippleFringeSpacingPx: r.rippleFringeSpacingPx != null && isFinite(Number(r.rippleFringeSpacingPx)) ? Number(r.rippleFringeSpacingPx) : null,
            adcBitDepth: Math.round(waveClampNum(r.adcBitDepth, 2, 16, 8)),
            adcSqnrDb: r.adcSqnrDb != null && isFinite(Number(r.adcSqnrDb)) ? Number(r.adcSqnrDb) : null,
            dopplerOffsetAngleDeg: waveClampNum(r.dopplerOffsetAngleDeg, 0, 90, 0),
            offAxisObsFreq: r.offAxisObsFreq != null && isFinite(Number(r.offAxisObsFreq)) ? Number(r.offAxisObsFreq) : null,
            note: typeof r.note === 'string' ? r.note.slice(0, 140) : ''
          };
        })
      : [];

    var savedSnapshots = Array.isArray(src.savedSnapshots)
      ? src.savedSnapshots.slice(-8).filter(function(sn) { return sn && typeof sn === 'object'; }).map(function(sn, idx) {
          var sp = (sn.statePatch && typeof sn.statePatch === 'object') ? sn.statePatch : sn;
          return {
            id: typeof sn.id === 'string' ? sn.id.slice(0, 64) : ('snap-' + idx),
            label: typeof sn.label === 'string' ? sn.label.slice(0, 120) : ('Snapshot #' + (idx + 1)),
            timestamp: waveClampNum(sn.timestamp, 0, 9999999999999, 0),
            statePatch: {
              waveMode: waveHasOwn(WAVE_VALID_MODES, sp.waveMode) ? sp.waveMode : 'free',
              waveType: waveHasOwn(WAVE_VALID_TYPES, sp.waveType) ? sp.waveType : 'sine',
              frequency: waveClampNum(sp.frequency, 0.5, 10, 2),
              amplitude: waveClampNum(sp.amplitude, 5, 100, 50),
              waveSpeed: waveClampNum(sp.waveSpeed, 50, 1500, 343),
              harmonic: Math.round(waveClampNum(sp.harmonic, 1, 6, 1)),
              standingBoundary: waveHasOwn(WAVE_VALID_BOUNDARIES, sp.standingBoundary) ? sp.standingBoundary : 'bothFixed',
              stringMechanics: !!sp.stringMechanics,
              stringTension: waveClampNum(sp.stringTension, 10, 400, 120),
              stringDensityGm: waveClampNum(sp.stringDensityGm, 0.5, 20, 3.0),
              resonatorDriven: !!sp.resonatorDriven,
              driveFreqRatio: waveClampNum(sp.driveFreqRatio, 0.25, 6.5, 1.0),
              resonatorQ: Math.round(waveClampNum(sp.resonatorQ, 5, 80, 20)),
              rippleBarrier: waveHasOwn(WAVE_VALID_RIPPLE_BARRIERS, sp.rippleBarrier) ? sp.rippleBarrier : 'none',
              gratingSlits: Math.round(waveClampNum(sp.gratingSlits, 2, 6, 4)),
              ripplePhaseDiff: waveClampNum(sp.ripplePhaseDiff, -3.1416, 3.1416, 0),
              medium2Ratio: waveClampNum(sp.medium2Ratio, 0.25, 2.0, 0.6),
              incidentAngleDeg: waveClampNum(sp.incidentAngleDeg, 0, 85, 0),
              reflectivity: waveClampNum(sp.reflectivity, 0, 1, 0.9),
              impedanceCoupled: !!sp.impedanceCoupled,
              antiReflectionCoating: !!sp.antiReflectionCoating,
              fresnelPolarization: waveHasOwn(WAVE_VALID_POLARIZATIONS, sp.fresnelPolarization) ? sp.fresnelPolarization : 's',
              ftirEnabled: !!sp.ftirEnabled,
              ftirGapLambda: waveClampNum(sp.ftirGapLambda, 0.05, 1.5, 0.25),
              sourceSpeed: waveClampNum(sp.sourceSpeed, 0, 1.5, 0.3),
              observerSpeed: waveClampNum(sp.observerSpeed, -0.8, 0.8, 0),
              dopplerRegime: waveHasOwn(WAVE_VALID_DOPPLER_REGIMES, sp.dopplerRegime) ? sp.dopplerRegime : 'acoustic',
              packetMode: waveHasOwn(WAVE_VALID_PACKET_MODES, sp.packetMode) ? sp.packetMode : 'continuous',
              dispersionRatio: waveClampNum(sp.dispersionRatio, 0.5, 1.5, 1.0),
              oceanDepthCoupled: !!sp.oceanDepthCoupled,
              waterDepthRatio: waveClampNum(sp.waterDepthRatio, 0.02, 1.0, 0.5),
              collidePolarity: waveHasOwn(WAVE_VALID_COLLIDE_POLARITIES, sp.collidePolarity) ? sp.collidePolarity : 'opposite',
              longitudinalMode: waveHasOwn(WAVE_VALID_LONGITUDINAL_MODES, sp.longitudinalMode) ? sp.longitudinalMode : 'traveling',
              airTempCoupled: !!sp.airTempCoupled,
              airTempC: waveClampNum(sp.airTempC, -30, 60, 20),
              spectrumFilter: waveHasOwn(WAVE_VALID_FILTERS, sp.spectrumFilter) ? sp.spectrumFilter : 'none',
              filterCutoffHarmonic: Math.round(waveClampNum(sp.filterCutoffHarmonic, 1, 12, 3)),
              pluckPosition: waveClampNum(sp.pluckPosition, 0.05, 0.95, 0.5),
              showSecond: !!sp.showSecond,
              amplitude2: waveClampNum(sp.amplitude2, 10, 80, 30),
              frequency2: waveClampNum(sp.frequency2, 0.5, 10, 3),
              phase2: waveClampNum(sp.phase2, 0, 6.2832, 0),
              intervalLock: waveHasOwn(WAVE_VALID_INTERVAL_LOCKS, sp.intervalLock) ? sp.intervalLock : 'none',
              showBeatEnvelope: !!sp.showBeatEnvelope,
              distanceAttenuation: !!sp.distanceAttenuation,
              listenerDistMeters: waveClampNum(sp.listenerDistMeters, 1, 20, 4),
              spreadingLaw: waveHasOwn(WAVE_VALID_SPREADING_LAWS, sp.spreadingLaw) ? sp.spreadingLaw : 'spherical',
              showNodalLines: !!sp.showNodalLines,
              digitalSampling: !!sp.digitalSampling,
              sampleRateRatio: waveClampNum(sp.sampleRateRatio, 1.2, 16, 8),
              adcBitDepth: Math.round(waveClampNum(sp.adcBitDepth, 2, 16, 8)),
              showTravelingComponents: !!sp.showTravelingComponents,
              dopplerOffsetAngleDeg: waveClampNum(sp.dopplerOffsetAngleDeg, 0, 90, 0)
            }
          };
        })
      : [];

    var missionFeedback = (src.missionFeedback && typeof src.missionFeedback === 'object' && typeof src.missionFeedback.msg === 'string')
      ? { id: String(src.missionFeedback.id || ''), ok: !!src.missionFeedback.ok, msg: src.missionFeedback.msg }
      : null;

    var defaultPaused = false;
    try {
      defaultPaused = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var normalized = {
      frequency: waveClampNum(src.frequency, 0.5, 10, 2),
      amplitude: waveClampNum(src.amplitude, 5, 100, 50),
      waveType: wType,
      waveMode: mode,
      waveSpeed: waveClampNum(src.waveSpeed, 50, 1500, 343),
      speed: waveClampNum(src.speed, 0.1, 5, 1),
      showSecond: !!src.showSecond,
      amplitude2: waveClampNum(src.amplitude2, 10, 80, 30),
      frequency2: waveClampNum(src.frequency2, 0.5, 10, 3),
      phase2: waveClampNum(src.phase2, 0, 6.2832, 0),
      intervalLock: iLock,
      showBeatEnvelope: !!src.showBeatEnvelope,
      harmonic: Math.round(waveClampNum(src.harmonic, 1, 6, 1)),
      standingBoundary: sBoundary,
      showTravelingComponents: !!src.showTravelingComponents,
      stringMechanics: strMech,
      stringTension: strTension,
      stringDensityGm: strDensity,
      resonatorDriven: !!src.resonatorDriven,
      driveFreqRatio: waveClampNum(src.driveFreqRatio, 0.25, 6.5, 1.0),
      resonatorQ: Math.round(waveClampNum(src.resonatorQ, 5, 80, 20)),
      packetMode: pMode,
      dispersionRatio: waveClampNum(src.dispersionRatio, 0.5, 1.5, 1.0),
      oceanDepthCoupled: !!src.oceanDepthCoupled,
      waterDepthRatio: waveClampNum(src.waterDepthRatio, 0.02, 1.0, 0.5),
      collidePolarity: colPol,
      longitudinalMode: lMode,
      showDisplacementCurve: !!src.showDisplacementCurve,
      distanceAttenuation: !!src.distanceAttenuation,
      listenerDistMeters: waveClampNum(src.listenerDistMeters, 1, 20, 4),
      spreadingLaw: spreadLaw,
      airTempCoupled: !!src.airTempCoupled,
      airTempC: waveClampNum(src.airTempC, -30, 60, 20),
      damping: !!src.damping,
      dampingAlpha: waveClampNum(src.dampingAlpha, 0.1, 2.0, 0.5),
      sourceSpeed: waveClampNum(src.sourceSpeed, 0, 1.5, 0.3),
      observerSpeed: waveClampNum(src.observerSpeed, -0.8, 0.8, 0),
      dopplerRegime: dRegime,
      dopplerOffsetAngleDeg: waveClampNum(src.dopplerOffsetAngleDeg, 0, 90, 0),
      rippleSeparation: waveClampNum(src.rippleSeparation, 20, 200, 80),
      ripplePhaseDiff: waveClampNum(src.ripplePhaseDiff, -3.1416, 3.1416, 0),
      rippleBarrier: rBarrier,
      gratingSlits: Math.round(waveClampNum(src.gratingSlits, 2, 6, 4)),
      slitWidth: waveNormalizeSlitWidth(src.slitWidth),
      showIntensityScreen: !!src.showIntensityScreen,
      showNodalLines: !!src.showNodalLines,
      harmonicWeights: hWeights,
      spectrumFilter: sFilter,
      filterCutoffHarmonic: Math.round(waveClampNum(src.filterCutoffHarmonic, 1, 12, 3)),
      pluckPosition: waveClampNum(src.pluckPosition, 0.05, 0.95, 0.5),
      digitalSampling: !!src.digitalSampling,
      sampleRateRatio: waveClampNum(src.sampleRateRatio, 1.2, 16, 8),
      adcBitDepth: Math.round(waveClampNum(src.adcBitDepth, 2, 16, 8)),
      dampingCoeff: waveClampNum(src.dampingCoeff, 0, 0.01, 0.002),
      reflectionEnd: src.reflectionEnd === 'free' ? 'free' : 'fixed',
      reflectivity: waveClampNum(src.reflectivity, 0, 1, 0.9),
      impedanceCoupled: !!src.impedanceCoupled,
      antiReflectionCoating: !!src.antiReflectionCoating,
      fresnelPolarization: fPol,
      ftirEnabled: !!src.ftirEnabled,
      ftirGapLambda: waveClampNum(src.ftirGapLambda, 0.05, 1.5, 0.25),
      medium2Ratio: waveClampNum(src.medium2Ratio, 0.25, 2.0, 0.6),
      incidentAngleDeg: waveClampNum(src.incidentAngleDeg, 0, 85, 0),
      wallFrac: wallFrac,
      rippleSrc1: rSrc1,
      rippleSrc2: rSrc2,
      probeEnabled: !!src.probeEnabled,
      probeX: waveClampNum(src.probeX, 0.0, 1.0, 0.62),
      probeY: waveClampNum(src.probeY, 0.05, 0.95, 0.32),
      probeScopeMode: pScope,
      showRuler: !!src.showRuler,
      rulerX1: waveClampNum(src.rulerX1, 0.04, 0.96, 0.25),
      rulerX2: waveClampNum(src.rulerX2, 0.04, 0.96, 0.75),
      workspaceTab: wsTab,
      dataStudioPlot: dsPlot,
      learnerBand: lBand,
      activeMissionId: (WAVE_MISSIONS.some(function(m) { return m.id === src.activeMissionId; })) ? src.activeMissionId : WAVE_MISSIONS[0].id,
      missionFeedback: missionFeedback,
      missionsDone: missionsDone,
      modesVisited: modesVisited,
      matchedOnce: !!(src.matchedOnce || src.matchXpClaimed),
      experimentLog: experimentLog,
      savedSnapshots: savedSnapshots,
      cerPromptId: typeof src.cerPromptId === 'string' && WAVE_CER_PROMPTS.some(function(p) { return p.id === src.cerPromptId; }) ? src.cerPromptId : WAVE_CER_PROMPTS[0].id,
      cerClaim: typeof src.cerClaim === 'string' ? src.cerClaim.slice(0, 1500) : '',
      cerEvidence: typeof src.cerEvidence === 'string' ? src.cerEvidence.slice(0, 1500) : '',
      cerReasoning: typeof src.cerReasoning === 'string' ? src.cerReasoning.slice(0, 1500) : '',
      paused: src.paused !== undefined ? !!src.paused : defaultPaused,
      soundPlaying: !!src.soundPlaying,
      matchTarget: matchTarget,
      matchXpClaimed: !!src.matchXpClaimed,
      quiz: quizObj,
      quizUsed: Array.isArray(src.quizUsed) ? src.quizUsed.filter(function(idx) { return Number.isInteger(idx) && idx >= 0; }) : [],
      quizBestScore: Math.max(waveClampNum(src.quizBestScore, 0, 999, 0), quizObj ? quizObj.score : 0),
      mythsOpen: !!src.mythsOpen,
      tourStep: src.tourStep,
      aiLevel: (src.aiLevel === 'plain' || src.aiLevel === 'grade5' || src.aiLevel === 'hs') ? src.aiLevel : 'grade5',
      aiExplain: typeof src.aiExplain === 'string' ? src.aiExplain : '',
      aiLoading: !!src.aiLoading,
      aiError: typeof src.aiError === 'string' ? src.aiError : '',
      expSection: typeof src.expSection === 'string' ? src.expSection : null,
      expGroup: typeof src.expGroup === 'string' || src.expGroup === null ? src.expGroup : undefined,
      discoverWave: discoverWave,
      standingHunt: standingHunt,
      waveMastery: (src.waveMastery && typeof src.waveMastery === 'object' && !Array.isArray(src.waveMastery)) ? src.waveMastery : {}
    };
    if (normalized.stringMechanics && normalized.waveMode === 'standing' && normalized.standingBoundary === 'bothFixed') {
      normalized.waveSpeed = waveComputeStringSpeed(normalized.stringTension, normalized.stringDensityGm);
    } else if (normalized.airTempCoupled && normalized.waveMode === 'longitudinal') {
      normalized.waveSpeed = waveComputeAirSoundSpeed(normalized.airTempC);
    }
    if (normalized.oceanDepthCoupled && normalized.waveMode === 'free' && normalized.packetMode === 'packet') {
      normalized.dispersionRatio = Math.round(waveComputeOceanDispersion(normalized.waterDepthRatio).vgOverVp * 100) / 100;
    }
    if (normalized.intervalLock !== 'none' && WAVE_INTERVAL_PRESETS[normalized.intervalLock]) {
      normalized.frequency2 = waveClampNum(Math.round(normalized.frequency * WAVE_INTERVAL_PRESETS[normalized.intervalLock].ratio * 100) / 100, 0.5, 10, normalized.frequency2);
    }
    normalized.waveMastery = waveComputeMastery(normalized);
    return normalized;
  }

  function waveComputeMetrics(rawState) {
    var s = waveNormalizeState(rawState);
    var wavelength = s.waveSpeed / s.frequency;
    var period = 1 / s.frequency;
    var wavenumber = (2 * Math.PI) / wavelength;
    var angularFreq = 2 * Math.PI * s.frequency;

    // Standing resonator geometry (fixed-fixed, open-open, closed-open)
    var standGeom = waveStandingGeometry(s.harmonic, s.standingBoundary);

    // Snell's Law, Fresnel TE(s)/TM(p) Impedance Coupling, Brewster's Angle, Quarter-Wave Coating & TIR
    var theta1Rad = (s.incidentAngleDeg * Math.PI) / 180;
    var sinTheta2 = s.medium2Ratio * Math.sin(theta1Rad);
    var criticalAngleDeg = s.medium2Ratio > 1 ? (Math.asin(Math.min(1, 1 / s.medium2Ratio)) * 180 / Math.PI) : null;
    var brewsterAngleDeg = waveComputeBrewsterAngle(s.medium2Ratio);
    var isTM = s.fresnelPolarization === 'p';
    var isTotalInternalReflection = s.medium2Ratio > 1 && sinTheta2 > 1.000001;
    var isBrewsterMatch = s.impedanceCoupled && isTM && !s.antiReflectionCoating && !isTotalInternalReflection && Math.abs(s.incidentAngleDeg - brewsterAngleDeg) <= 1.25;
    var refractedAngleDeg = isTotalInternalReflection ? null : (Math.asin(Math.max(-1, Math.min(1, sinTheta2))) * 180 / Math.PI);
    var effectiveReflectivity = isTotalInternalReflection ? 1 : s.reflectivity;
    var effectivePhaseFlip = s.reflectionEnd === 'free' ? 1 : -1;
    var coatingSpeed = s.waveSpeed * Math.sqrt(s.medium2Ratio);
    var quarterWaveThickness = (coatingSpeed / s.frequency) / 4;

    if (!isTotalInternalReflection) {
      var cosTheta1 = Math.cos(theta1Rad);
      if (s.impedanceCoupled) {
        var sinTheta2Clamped = Math.max(-1, Math.min(1, sinTheta2));
        var cosTheta2 = Math.sqrt(Math.max(0, 1 - sinTheta2Clamped * sinTheta2Clamped));
        if (s.antiReflectionCoating) {
          var coatRatio = Math.sqrt(s.medium2Ratio);
          var sinThetaC = coatRatio * Math.sin(theta1Rad);
          if (sinThetaC > 1.000001) {
            effectiveReflectivity = 1;
            effectivePhaseFlip = 1;
          } else {
            var cosThetaC = Math.sqrt(Math.max(0, 1 - sinThetaC * sinThetaC));
            var r1 = isTM
              ? (coatRatio * cosThetaC - cosTheta1) / Math.max(1e-9, coatRatio * cosThetaC + cosTheta1)
              : (coatRatio * cosTheta1 - cosThetaC) / Math.max(1e-9, coatRatio * cosTheta1 + cosThetaC);
            var r2 = isTM
              ? (coatRatio * cosTheta2 - cosThetaC) / Math.max(1e-9, coatRatio * cosTheta2 + cosThetaC)
              : (coatRatio * cosThetaC - cosTheta2) / Math.max(1e-9, coatRatio * cosThetaC + cosTheta2);
            var deltaFilm = Math.PI * cosThetaC;
            var rNumSq = r1 * r1 + r2 * r2 + 2 * r1 * r2 * Math.cos(deltaFilm);
            var rDenSq = 1 + r1 * r1 * r2 * r2 + 2 * r1 * r2 * Math.cos(deltaFilm);
            effectiveReflectivity = Math.sqrt(Math.max(0, Math.min(1, rNumSq / Math.max(1e-9, rDenSq))));
            effectivePhaseFlip = (r1 + r2 * Math.cos(deltaFilm)) < 0 ? -1 : 1;
          }
        } else {
          var fresDen = isTM ? (s.medium2Ratio * cosTheta2 + cosTheta1) : (s.medium2Ratio * cosTheta1 + cosTheta2);
          var rFresnel = fresDen > 1e-9 ? ((isTM ? (s.medium2Ratio * cosTheta2 - cosTheta1) : (s.medium2Ratio * cosTheta1 - cosTheta2)) / fresDen) : 0;
          effectiveReflectivity = Math.min(1, Math.abs(rFresnel));
          if (Math.abs(rFresnel) > 1e-6) effectivePhaseFlip = rFresnel < 0 ? -1 : 1;
          else effectivePhaseFlip = 1;
        }
      } else if (s.antiReflectionCoating) {
        effectiveReflectivity = s.reflectivity * Math.abs(Math.cos((Math.PI / 2) * cosTheta1));
      }
    } else if (s.impedanceCoupled) {
      effectivePhaseFlip = 1;
    }
    var evan = waveComputeEvanescentTunneling(wavelength, s.medium2Ratio, s.incidentAngleDeg, s.ftirEnabled, s.ftirGapLambda);
    if (isTotalInternalReflection && s.ftirEnabled) {
      effectiveReflectivity = evan.ftirReflectivity;
    }
    var standingWaveRatio = effectiveReflectivity >= 0.999 ? Infinity : (1 + effectiveReflectivity) / Math.max(1e-6, 1 - effectiveReflectivity);

    var transmittedAmpRatio = Math.sqrt(Math.max(0, 1 - effectiveReflectivity * effectiveReflectivity));
    var transmittedEnergyPct = Math.round((1 - effectiveReflectivity * effectiveReflectivity) * 100);
    var medium2Speed = s.waveSpeed * s.medium2Ratio;
    var medium2Wavelength = medium2Speed / s.frequency;
    var isRelativistic = s.dopplerRegime === 'relativistic';
    var machNumber = s.sourceSpeed;
    var relKinematics = isRelativistic ? waveComputeRelativisticDoppler(s.frequency, s.sourceSpeed, s.observerSpeed) : null;
    var approachingFreq = relKinematics
      ? relKinematics.approachingFreq
      : (machNumber < 0.99 ? (s.frequency * (1 + s.observerSpeed) / Math.max(0.05, 1 - machNumber)) : Infinity);
    var recedingFreq = relKinematics
      ? relKinematics.recedingFreq
      : (s.frequency * Math.max(0.1, 1 - s.observerSpeed) / (1 + machNumber));
    var isSupersonic = !isRelativistic && machNumber >= 1;
    var machAngleDeg = isSupersonic ? (Math.asin(Math.min(1, 1 / machNumber)) * 180 / Math.PI) : null;
    var relativisticGamma = relKinematics ? relKinematics.gamma : 1;
    var redshiftApp = relKinematics ? relKinematics.redshiftApp : 0;
    var redshiftRec = relKinematics ? relKinematics.redshiftRec : 0;
    var hAlphaAppNm = relKinematics ? relKinematics.hAlphaAppNm : 656.3;
    var hAlphaRecNm = relKinematics ? relKinematics.hAlphaRecNm : 656.3;
    var airTempSpeed = waveComputeAirSoundSpeed(s.airTempC);
    var kundtTubeResonantHz = Math.round(((s.harmonic * s.waveSpeed) / 2) * 10) / 10;
    var resResp = waveComputeResonatorResponse(s.driveFreqRatio, s.resonatorQ, s.standingBoundary, s.frequency);
    var oceanDisp = waveComputeOceanDispersion(s.waterDepthRatio);
    var dampingLossDb = Math.round(((60 * s.dampingAlpha) / Math.LN10) * 10) / 10;
    var dampingDecayFrac = Math.round((1 / (3 * s.dampingAlpha)) * 1000) / 1000;
    var dampingHalfEnergyMeters = Math.round(((s.waveSpeed * Math.LN2) / (6 * s.dampingAlpha)) * 10) / 10;

    // Dispersion & wave packet kinematics
    var phaseVelocity = s.waveSpeed;
    var groupVelocity = s.waveSpeed * s.dispersionRatio;
    var dispersionRegime = s.dispersionRatio < 0.95 ? 'normal' : (s.dispersionRatio > 1.05 ? 'anomalous' : 'nondispersive');

    // Acoustic intensity level estimate (relative dB scale anchored at 50 dB for A = 10)
    var soundLevelDb = Math.round((50 + 20 * (Math.log(Math.max(1, s.amplitude) / 10) / Math.LN10)) * 10) / 10;
    var acousticAtten = waveComputeAcousticAttenuation(soundLevelDb, s.amplitude, s.listenerDistMeters, s.spreadingLaw);
    var beatConsonance = waveComputeBeatConsonance(s.frequency, s.frequency2, s.amplitude, s.amplitude2, s.phase2);
    var rippleGeom = waveComputeRippleInterferenceGeometry(s);
    var digSamp = waveComputeDigitalSampling(s.frequency, s.sampleRateRatio, s.adcBitDepth);
    var offAxisDop = waveComputeOffAxisDoppler(s.frequency, s.sourceSpeed, s.dopplerOffsetAngleDeg, s.dopplerRegime);

    // Mersenne's laws & Sonar round-trip echo kinematics
    var stringDerivedSpeed = waveComputeStringSpeed(s.stringTension, s.stringDensityGm);
    var mersenneFundamental1m = Math.round((stringDerivedSpeed / 2) * 10) / 10;
    var sonarWallFrac = s.wallFrac != null ? s.wallFrac : 0.75;
    var sonarRangeMeters = Math.round((sonarWallFrac * 100) * 10) / 10;
    var sonarEchoMs = Math.round(((2 * sonarRangeMeters) / Math.max(1, s.waveSpeed)) * 1000 * 10) / 10;

    // Ripple diffraction estimate, N-slit grating resolving power & phased-array beam steering angle
    var rippleLambdaPx = 600 / (s.frequency * 2);
    var rippleSlitPx = s.slitWidth * 360;
    var diffractionSinTheta1 = Math.min(1, rippleLambdaPx / Math.max(4, rippleSlitPx));
    var diffractionAngleDeg = Math.asin(diffractionSinTheta1) * 180 / Math.PI;
    var refLambda = 400 / (s.frequency * 2);
    var gPitchRef = Math.min((210 * 0.68) / Math.max(1, s.gratingSlits - 1), Math.max(s.slitWidth * 210 + 10, s.rippleSeparation * 0.48));
    var gratingFirstOrderDeg = Math.asin(Math.min(1, refLambda / Math.max(4, gPitchRef))) * 180 / Math.PI;
    var effSepRef;
    if (s.rippleBarrier === 'doubleSlit') {
      effSepRef = 2 * Math.min(210 * 0.34, Math.max(s.rippleSeparation * 0.5, s.slitWidth * 210 * 0.5 + 16));
    } else if (s.rippleBarrier === 'grating') {
      effSepRef = gPitchRef;
    } else {
      var p1x = s.rippleSrc1 ? s.rippleSrc1.x * 400 : (200 - s.rippleSeparation / 2);
      var p1y = s.rippleSrc1 ? s.rippleSrc1.y * 210 : 105;
      var p2x = s.rippleSrc2 ? s.rippleSrc2.x * 400 : (200 + s.rippleSeparation / 2);
      var p2y = s.rippleSrc2 ? s.rippleSrc2.y * 210 : 105;
      effSepRef = Math.max(4, Math.hypot(p2x - p1x, p2y - p1y));
    }
    var steerSinTheta = (s.ripplePhaseDiff / (2 * Math.PI)) * (refLambda / effSepRef);
    var beamSteerAngleDeg = Math.asin(Math.max(-1, Math.min(1, steerSinTheta))) * 180 / Math.PI;

    return {
      wavelength: wavelength,
      period: period,
      wavenumber: wavenumber,
      angularFreq: angularFreq,
      energy: s.amplitude * s.amplitude,
      packetMode: s.packetMode,
      dispersionRatio: s.dispersionRatio,
      phaseVelocity: phaseVelocity,
      groupVelocity: groupVelocity,
      dispersionRegime: dispersionRegime,
      longitudinalMode: s.longitudinalMode,
      soundLevelDb: soundLevelDb,
      stringMechanics: s.stringMechanics,
      stringTension: s.stringTension,
      stringDensityGm: s.stringDensityGm,
      stringDerivedSpeed: stringDerivedSpeed,
      mersenneFundamental1m: mersenneFundamental1m,
      sonarRangeMeters: sonarRangeMeters,
      sonarEchoMs: sonarEchoMs,
      gratingSlits: s.gratingSlits,
      gratingResolvingPower: s.gratingSlits,
      gratingFirstOrderDeg: gratingFirstOrderDeg,
      standingBoundary: s.standingBoundary,
      effectiveHarmonic: standGeom.effectiveHarmonic,
      harmonicFreq: standGeom.freqMultiplier * s.frequency,
      nodesCount: standGeom.nodePositions.length,
      antinodesCount: standGeom.antinodePositions.length,
      standingWavelengthFormula: standGeom.wavelengthFormula,
      incidentAngleDeg: s.incidentAngleDeg,
      criticalAngleDeg: criticalAngleDeg,
      brewsterAngleDeg: brewsterAngleDeg,
      fresnelPolarization: s.fresnelPolarization,
      isBrewsterMatch: isBrewsterMatch,
      refractedAngleDeg: refractedAngleDeg,
      isTotalInternalReflection: isTotalInternalReflection,
      impedanceCoupled: s.impedanceCoupled,
      antiReflectionCoating: s.antiReflectionCoating,
      effectiveReflectivity: effectiveReflectivity,
      effectivePhaseFlip: effectivePhaseFlip,
      standingWaveRatio: standingWaveRatio,
      coatingSpeed: coatingSpeed,
      quarterWaveThickness: quarterWaveThickness,
      transmittedAmpRatio: transmittedAmpRatio,
      transmittedEnergyPct: transmittedEnergyPct,
      reflectedEnergyPct: 100 - transmittedEnergyPct,
      medium2Speed: medium2Speed,
      medium2Wavelength: medium2Wavelength,
      dopplerRegime: s.dopplerRegime,
      isSupersonic: isSupersonic,
      machNumber: machNumber,
      observerSpeed: s.observerSpeed,
      approachingFreq: approachingFreq,
      recedingFreq: recedingFreq,
      machAngleDeg: machAngleDeg,
      relativisticGamma: relativisticGamma,
      redshiftApp: redshiftApp,
      redshiftRec: redshiftRec,
      hAlphaAppNm: hAlphaAppNm,
      hAlphaRecNm: hAlphaRecNm,
      airTempCoupled: s.airTempCoupled,
      airTempC: s.airTempC,
      airTempSpeed: airTempSpeed,
      kundtTubeResonantHz: kundtTubeResonantHz,
      resonatorDriven: s.resonatorDriven,
      driveFreqRatio: s.driveFreqRatio,
      resonatorQ: s.resonatorQ,
      resonatorGainNorm: resResp.gainNorm,
      resonatorGainPct: resResp.gainPct,
      resonatorPhaseDeg: resResp.phaseLagDeg,
      resonatorFwhmHz: resResp.fwhmHz,
      resonatorDriveHz: resResp.driveFreqHz,
      resonatorIsPeak: resResp.isAtResonance,
      resonatorNearestMode: resResp.nearestMode,
      ftirEnabled: s.ftirEnabled,
      ftirGapLambda: s.ftirGapLambda,
      evanescentPenetrationLambda: evan.penetrationLambda,
      evanescentPenetrationMeters: evan.penetrationMeters,
      tunnelTransmissionPct: evan.tunnelTransmissionPct,
      potentialTunnelPct: evan.potentialTunnelPct,
      oceanDepthCoupled: s.oceanDepthCoupled,
      waterDepthRatio: s.waterDepthRatio,
      oceanRegime: oceanDisp.regime,
      oceanVgOverVp: oceanDisp.vgOverVp,
      dampingLossDb: dampingLossDb,
      dampingDecayFrac: dampingDecayFrac,
      dampingHalfEnergyMeters: dampingHalfEnergyMeters,
      pluckPosition: s.pluckPosition,
      diffractionAngleDeg: diffractionAngleDeg,
      ripplePhaseDiff: s.ripplePhaseDiff,
      beamSteerAngleDeg: beamSteerAngleDeg,
      beatFreq: s.showSecond ? beatConsonance.beatFreqHz : 0,
      intervalLock: s.intervalLock,
      showBeatEnvelope: s.showBeatEnvelope,
      beatModDepthPct: beatConsonance.modDepthPct,
      beatPeriodS: beatConsonance.beatPeriodS,
      intervalRatio: beatConsonance.ratio,
      matchedInterval: beatConsonance.matchedInterval,
      consonanceClass: beatConsonance.classification,
      carrierFreqHz: beatConsonance.carrierFreqHz,
      beatPeakAmp: beatConsonance.peakAmp,
      beatTroughAmp: beatConsonance.troughAmp,
      distanceAttenuation: s.distanceAttenuation,
      listenerDistMeters: acousticAtten.listenerDistMeters,
      spreadingLaw: acousticAtten.spreadingLaw,
      attenuatedDb: acousticAtten.listenerDb,
      attenuationDropDb: acousticAtten.dropDb,
      intensityPctAtListener: acousticAtten.intensityPct,
      dbPerDoubling: acousticAtten.dbPerDoubling,
      listenerAmplitudeFactor: acousticAtten.amplitudeFactor,
      showNodalLines: s.showNodalLines,
      rippleFringeSpacingPx: rippleGeom.fringeSpacingPx,
      rippleNodalCount: rippleGeom.nodalLineCount,
      rippleFirstMinDeg: rippleGeom.firstMinimumDeg,
      rippleLambdaPx: rippleGeom.lambdaPx,
      rippleEffSepPx: rippleGeom.dSepPx,
      digitalSampling: s.digitalSampling,
      sampleRateRatio: digSamp.sampleRateRatio,
      sampleRateHz: digSamp.sampleRateHz,
      nyquistFreqHz: digSamp.nyquistFreqHz,
      adcBitDepth: digSamp.adcBitDepth,
      adcQuantizationLevels: digSamp.quantizationLevels,
      adcSqnrDb: digSamp.sqnrDb,
      isFundamentalAliased: digSamp.isFundamentalAliased,
      aliasFreqHz: digSamp.aliasFreqHz,
      maxUnaliasedHarmonic: digSamp.maxUnaliasedHarmonic,
      showTravelingComponents: s.showTravelingComponents,
      dopplerOffsetAngleDeg: offAxisDop.observerAngleDeg,
      offAxisCosTheta: offAxisDop.cosTheta,
      offAxisRadarPct: offAxisDop.radarCosinePct,
      offAxisRadialMach: offAxisDop.radialMach,
      offAxisObsFreq: offAxisDop.observedFreqHz,
      transverseRelFreq: offAxisDop.transverseFreqHz
    };
  }

  function waveComputeProbeReadout(rawState, cWOpt, cHOpt) {
    var s = waveNormalizeState(rawState);
    var metrics = waveComputeMetrics(s);
    var cW = Math.max(200, Number(cWOpt) || 800);
    var cH = Math.max(160, Number(cHOpt) || 420);
    var px = s.probeX * cW;
    var py = s.probeY * cH;
    var wavelength = s.waveSpeed / s.frequency;
    var cyclesFromLeft = s.probeX * s.frequency;
    var positionMeters = cyclesFromLeft * wavelength;

    // Ripple tank geometry (supports two-source interference & double-slit barrier)
    var dprScale = cW / 400;
    var sepPx = s.rippleSeparation * dprScale;
    var s1, s2;
    if (s.rippleBarrier === 'doubleSlit') {
      s1 = { x: cW * 0.30, y: cH / 2 - sepPx / 2 };
      s2 = { x: cW * 0.30, y: cH / 2 + sepPx / 2 };
    } else {
      s1 = s.rippleSrc1 ? { x: s.rippleSrc1.x * cW, y: s.rippleSrc1.y * cH } : { x: cW / 2 - sepPx / 2, y: cH / 2 };
      s2 = s.rippleSrc2 ? { x: s.rippleSrc2.x * cW, y: s.rippleSrc2.y * cH } : { x: cW / 2 + sepPx / 2, y: cH / 2 };
    }
    var rippleWL = Math.max(20, cW / (s.frequency * 2));
    var d1Px = Math.hypot(px - s1.x, py - s1.y);
    var d2Px = Math.hypot(px - s2.x, py - s2.y);
    var d1Lambda = d1Px / rippleWL;
    var d2Lambda = d2Px / rippleWL;
    var deltaRLambda = Math.abs(d1Lambda - d2Lambda);
    var deltaRMeters = deltaRLambda * wavelength;
    var netCycleDiff = Math.abs((d2Lambda - d1Lambda) + (s.ripplePhaseDiff / (2 * Math.PI)));
    var fracMod = netCycleDiff - Math.floor(netCycleDiff);
    var distToInt = Math.min(fracMod, 1 - fracMod);
    var distToHalf = Math.abs(fracMod - 0.5);
    var interferenceClass = distToHalf <= 0.12 ? 'destructive' : (distToInt <= 0.12 ? 'constructive' : 'partial');
    var gratingIntensityNorm = null;
    if (s.rippleBarrier === 'grating') {
      var dxBar = px - cW * 0.30;
      var dyBar = py - cH * 0.5;
      var sinThProbe = dxBar > 2 ? (dyBar / Math.hypot(dxBar, dyBar)) : 0;
      var gPitchProbe = Math.min((cH * 0.68) / Math.max(1, s.gratingSlits - 1), Math.max(s.slitWidth * cH + 10 * dprScale, sepPx * 0.48));
      gratingIntensityNorm = Math.round(waveGratingIntensityFactor(sinThProbe, gPitchProbe / rippleWL, s.gratingSlits, s.ripplePhaseDiff) * 1000) / 1000;
      interferenceClass = gratingIntensityNorm >= 0.65 ? 'constructive' : (gratingIntensityNorm <= 0.08 ? 'destructive' : 'partial');
    }

    // Standing wave node/antinode geometry across all 3 boundary modes (and closed acoustic tube)
    var envelopeFrac = Math.abs(waveStandingEnvelope(s.probeX, s.harmonic, s.standingBoundary));
    var dispEnvelope = (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing')
      ? Math.abs(Math.sin(s.harmonic * Math.PI * s.probeX))
      : envelopeFrac;
    var standingClass = dispEnvelope <= 0.14 ? 'node' : (dispEnvelope >= 0.86 ? 'antinode' : 'intermediate');

    // Reflection / refraction medium geometry
    var wallFrac = s.wallFrac != null ? s.wallFrac : 0.75;
    var region = s.probeX <= wallFrac ? 'medium1' : 'medium2';
    var localSpeed = region === 'medium1' ? s.waveSpeed : s.waveSpeed * s.medium2Ratio;
    var localWavelength = localSpeed / s.frequency;
    var localAmplitude = region === 'medium1' ? s.amplitude : ((metrics.isTotalInternalReflection && !s.ftirEnabled) ? 0 : s.amplitude * Math.sqrt(Math.max(0, 1 - metrics.effectiveReflectivity * metrics.effectiveReflectivity)));

    // Longitudinal pressure phase at snapshot t = 0 (supports traveling + Kundt standing tube)
    var pressurePhase = (s.longitudinalMode === 'standing')
      ? (-Math.cos(s.harmonic * Math.PI * s.probeX))
      : (-Math.cos(2 * Math.PI * s.probeX * s.frequency));
    var pressureState = pressurePhase > 0.25 ? 'compression' : (pressurePhase < -0.25 ? 'rarefaction' : 'equilibrium');
    var pressureEnvelopeFrac = Math.abs(Math.cos(s.harmonic * Math.PI * s.probeX));
    var pressureNodeClass = pressureEnvelopeFrac >= 0.86 ? 'pressureAntinode' : (pressureEnvelopeFrac <= 0.14 ? 'pressureNode' : 'intermediate');

    // Particle SHM kinematics & deterministic 48-sample oscilloscope y(t) trace
    var angularFreq = 2 * Math.PI * s.frequency;
    var resGainScale = s.resonatorDriven ? metrics.resonatorGainNorm : 1;
    var longDistScale = (s.waveMode === 'longitudinal' && s.longitudinalMode === 'traveling' && s.distanceAttenuation)
      ? waveComputeAcousticAttenuation(metrics.soundLevelDb, s.amplitude, 1 + s.probeX * 19, s.spreadingLaw).amplitudeFactor
      : 1;
    var effAmp = s.waveMode === 'standing'
      ? s.amplitude * envelopeFrac * resGainScale
      : s.waveMode === 'reflection'
        ? localAmplitude
        : (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing')
          ? s.amplitude * dispEnvelope
          : (s.waveMode === 'longitudinal' && s.distanceAttenuation)
            ? s.amplitude * longDistScale
            : s.waveMode === 'free' && s.damping
              ? s.amplitude * Math.exp(-s.dampingAlpha * s.probeX * 3)
              : s.amplitude;
    var maxVelocity = angularFreq * effAmp;
    var maxAcceleration = angularFreq * angularFreq * effAmp;

    var oscilloscopeTrace = [];
    for (var ti = 0; ti < 48; ti++) {
      var uTime = ti / 48;
      var ySample;
      if (s.waveMode === 'standing') {
        ySample = waveStandingEnvelope(s.probeX, s.harmonic, s.standingBoundary) * resGainScale * Math.cos(4 * Math.PI * uTime);
      } else if (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing') {
        ySample = Math.sin(s.harmonic * Math.PI * s.probeX) * Math.cos(4 * Math.PI * uTime);
      } else if ((s.waveMode === 'free' || s.waveMode === 'spectrum') && s.showSecond) {
        var ph1 = 2 * Math.PI * s.probeX * s.frequency - 4 * Math.PI * uTime;
        var ph2 = 2 * Math.PI * s.probeX * s.frequency2 - 4 * Math.PI * (s.frequency2 / Math.max(0.5, s.frequency)) * uTime + s.phase2;
        var y1t = waveValPure(ph1, s.waveType, s.harmonicWeights) * s.amplitude * (s.damping ? Math.exp(-s.dampingAlpha * s.probeX * 3) : 1);
        var y2t = Math.sin(ph2) * s.amplitude2 * (s.damping ? Math.exp(-s.dampingAlpha * s.probeX * 3) : 1);
        ySample = (y1t + y2t) / Math.max(1, s.amplitude + s.amplitude2);
      } else {
        var phBase = 2 * Math.PI * s.probeX * s.frequency - 4 * Math.PI * uTime;
        var ampRatio = s.amplitude > 0 ? (effAmp / s.amplitude) : 0;
        ySample = waveValPure(phBase, s.waveType, s.harmonicWeights) * ampRatio;
      }
      oscilloscopeTrace.push(Math.round(Math.max(-1, Math.min(1, ySample)) * 1000) / 1000);
    }

    // 64-point XY Lissajous / Phase-Space trace:
    //  - Two-wave superposition: (y1(t), y2(t)) harmonic knot (f1:f2, phase2)
    //  - Ripple tank: (y1_src(t), y2_src(t)) mutual phase portrait
    //  - Single wave / standing / reflection: (y(t), vy(t)/(omega*A)) phase portrait
    var lissajousTrace = [];
    var lissajousAxes;
    if ((s.waveMode === 'free' || s.waveMode === 'spectrum') && s.showSecond) {
      lissajousAxes = { xLabel: 'y1(t)', yLabel: 'y2(t)', kind: 'superposition' };
    } else if (s.waveMode === 'ripple') {
      lissajousAxes = { xLabel: 'Src 1', yLabel: 'Src 2', kind: 'ripplePhase' };
    } else {
      lissajousAxes = { xLabel: 'y(t)', yLabel: 'v(t)/w', kind: 'phaseSpace' };
    }
    var epsDt = 0.01;
    for (var li = 0; li < 64; li++) {
      var uLis = li / 64;
      var lxVal = 0, lyVal = 0;
      if (lissajousAxes.kind === 'superposition') {
        var phL1 = 2 * Math.PI * s.probeX * s.frequency - 4 * Math.PI * uLis;
        var phL2 = 2 * Math.PI * s.probeX * s.frequency2 - 4 * Math.PI * (s.frequency2 / Math.max(0.5, s.frequency)) * uLis + s.phase2;
        var dampFac = s.waveMode === 'free' && s.damping ? Math.exp(-s.dampingAlpha * s.probeX * 3) : 1;
        lxVal = waveValPure(phL1, s.waveType, s.harmonicWeights) * dampFac;
        lyVal = Math.sin(phL2) * (s.amplitude2 / Math.max(1, s.amplitude)) * dampFac;
      } else if (lissajousAxes.kind === 'ripplePhase') {
        lxVal = Math.sin(2 * Math.PI * d1Lambda - 4 * Math.PI * uLis);
        lyVal = Math.sin(2 * Math.PI * d2Lambda - 4 * Math.PI * uLis + s.ripplePhaseDiff);
      } else {
        var ampScale = s.amplitude > 0 ? (effAmp / s.amplitude) : 0;
        if (s.waveMode === 'standing') {
          var sEnvL = waveStandingEnvelope(s.probeX, s.harmonic, s.standingBoundary) * resGainScale;
          lxVal = sEnvL * Math.cos(4 * Math.PI * uLis);
          lyVal = -sEnvL * Math.sin(4 * Math.PI * uLis);
        } else if (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing') {
          var dEnvL = Math.sin(s.harmonic * Math.PI * s.probeX);
          lxVal = dEnvL * Math.cos(4 * Math.PI * uLis);
          lyVal = -dEnvL * Math.sin(4 * Math.PI * uLis);
        } else {
          var phL0 = 2 * Math.PI * s.probeX * s.frequency - 4 * Math.PI * uLis;
          var y0L = waveValPure(phL0, s.waveType, s.harmonicWeights) * ampScale;
          var yNextL = waveValPure(phL0 - epsDt, s.waveType, s.harmonicWeights) * ampScale;
          lxVal = y0L;
          lyVal = (yNextL - y0L) / epsDt;
        }
      }
      lissajousTrace.push({
        x: Math.round(Math.max(-1, Math.min(1, lxVal)) * 1000) / 1000,
        y: Math.round(Math.max(-1, Math.min(1, lyVal)) * 1000) / 1000
      });
    }

    return {
      probeX: s.probeX,
      probeY: s.probeY,
      cyclesFromLeft: cyclesFromLeft,
      positionMeters: positionMeters,
      d1Lambda: d1Lambda,
      d2Lambda: d2Lambda,
      deltaRLambda: deltaRLambda,
      netCycleDiff: netCycleDiff,
      deltaRMeters: deltaRMeters,
      interferenceClass: interferenceClass,
      gratingIntensityNorm: gratingIntensityNorm,
      envelopeFrac: envelopeFrac,
      standingClass: standingClass,
      region: region,
      localSpeed: localSpeed,
      localWavelength: localWavelength,
      localAmplitude: localAmplitude,
      pressurePhase: pressurePhase,
      pressureState: pressureState,
      pressureEnvelopeFrac: pressureEnvelopeFrac,
      pressureNodeClass: pressureNodeClass,
      angularFreq: angularFreq,
      maxVelocity: maxVelocity,
      maxAcceleration: maxAcceleration,
      oscilloscopeTrace: oscilloscopeTrace,
      lissajousTrace: lissajousTrace,
      lissajousAxes: lissajousAxes
    };
  }

  function waveBuildSweepRows(rawState, plotAxisOpt, startNumOpt) {
    var base = waveNormalizeState(rawState);
    var axis = waveHasOwn(WAVE_VALID_DS_PLOTS, plotAxisOpt) ? plotAxisOpt : base.dataStudioPlot;
    var startNum = Math.max(1, Math.round(Number(startNumOpt) || 1));
    var stamp = Date.now();
    var sweepPoints;
    if (axis === 'ampEnergy') sweepPoints = [20, 40, 60, 80, 100];
    else if (axis === 'dopplerMach') sweepPoints = [0, 0.2, 0.4, 0.6, 0.8];
    else if (axis === 'snellAngles') sweepPoints = [10, 20, 30, 40, 50];
    else if (axis === 'phasedBeam') sweepPoints = [-3.1416, -1.5708, 0, 1.5708, 3.1416];
    else if (axis === 'mersenneTension') sweepPoints = [25, 50, 100, 200, 400];
    else if (axis === 'fresnelBrewster') sweepPoints = [0, 20, 40, waveComputeBrewsterAngle(base.medium2Ratio), 75];
    else if (axis === 'airTempSpeed') sweepPoints = [-20, 0, 20, 40, 60];
    else if (axis === 'resonanceCurve') {
      var r0Peak = waveStandingGeometry(base.harmonic, base.standingBoundary).freqMultiplier;
      sweepPoints = [
        Math.max(0.25, Math.round((r0Peak - 0.30) * 100) / 100),
        Math.max(0.25, Math.round((r0Peak - 0.10) * 100) / 100),
        r0Peak,
        Math.min(6.5, Math.round((r0Peak + 0.10) * 100) / 100),
        Math.min(6.5, Math.round((r0Peak + 0.30) * 100) / 100)
      ];
    } else if (axis === 'ftirTunneling') {
      sweepPoints = [0.05, 0.20, 0.40, 0.75, 1.20];
    } else if (axis === 'inverseSquareDb') {
      sweepPoints = [1, 2, 4, 8, 16];
    } else if (axis === 'youngFringeSpacing') {
      sweepPoints = [40, 80, 120, 160, 200];
    } else if (axis === 'adcBitSqnr') {
      sweepPoints = [2, 4, 8, 12, 16];
    } else if (axis === 'dopplerOffsetAngle') {
      sweepPoints = [0, 30, 45, 60, 90];
    } else sweepPoints = [1, 2, 4, 6, 8];

    return sweepPoints.map(function(val, idx) {
      var patch = {};
      if (axis === 'ampEnergy') patch = { amplitude: val };
      else if (axis === 'dopplerMach') patch = { waveMode: 'doppler', sourceSpeed: val };
      else if (axis === 'snellAngles') patch = { waveMode: 'reflection', incidentAngleDeg: val };
      else if (axis === 'phasedBeam') patch = { waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: val };
      else if (axis === 'mersenneTension') patch = { waveMode: 'standing', standingBoundary: 'bothFixed', stringMechanics: true, stringTension: val, waveSpeed: waveComputeStringSpeed(val, base.stringDensityGm) };
      else if (axis === 'fresnelBrewster') patch = { waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: false, fresnelPolarization: 'p', incidentAngleDeg: val };
      else if (axis === 'airTempSpeed') patch = { waveMode: 'longitudinal', airTempCoupled: true, airTempC: val };
      else if (axis === 'resonanceCurve') patch = { waveMode: 'standing', resonatorDriven: true, driveFreqRatio: val };
      else if (axis === 'ftirTunneling') patch = { waveMode: 'reflection', medium2Ratio: Math.max(1.5, base.medium2Ratio > 1.05 ? base.medium2Ratio : 1.5), incidentAngleDeg: Math.max(55, base.incidentAngleDeg), ftirEnabled: true, ftirGapLambda: val };
      else if (axis === 'inverseSquareDb') patch = { waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, listenerDistMeters: val };
      else if (axis === 'youngFringeSpacing') patch = { waveMode: 'ripple', rippleBarrier: 'doubleSlit', showNodalLines: true, rippleSeparation: val };
      else if (axis === 'adcBitSqnr') patch = { waveMode: 'spectrum', digitalSampling: true, adcBitDepth: val };
      else if (axis === 'dopplerOffsetAngle') patch = { waveMode: 'doppler', dopplerOffsetAngleDeg: val };
      else patch = { frequency: val };
      var st = waveNormalizeState(Object.assign({}, base, patch));
      var met = waveComputeMetrics(st);
      return {
        id: 'sweep-' + axis + '-' + stamp + '-' + idx,
        n: startNum + idx,
        mode: st.waveMode,
        waveType: st.waveType,
        frequency: st.frequency,
        amplitude: st.amplitude,
        waveSpeed: st.waveSpeed,
        wavelength: Math.round(met.wavelength * 100) / 100,
        period: Math.round(met.period * 1000) / 1000,
        energy: Math.round(met.energy),
        sourceSpeed: st.sourceSpeed,
        observerSpeed: st.observerSpeed,
        dopplerRegime: st.dopplerRegime,
        fresnelPolarization: st.fresnelPolarization,
        reflectedEnergyPct: met.reflectedEnergyPct,
        transmittedEnergyPct: met.transmittedEnergyPct,
        redshiftRec: Math.round(met.redshiftRec * 1000) / 1000,
        airTempC: st.airTempC,
        pluckPosition: st.pluckPosition,
        approachingFreq: isFinite(met.approachingFreq) ? Math.round(met.approachingFreq * 100) / 100 : null,
        incidentAngleDeg: st.incidentAngleDeg,
        refractedAngleDeg: (typeof met.refractedAngleDeg === 'number' && isFinite(met.refractedAngleDeg)) ? Math.round(met.refractedAngleDeg * 10) / 10 : null,
        medium2Ratio: st.medium2Ratio,
        soundLevelDb: met.soundLevelDb,
        groupVelocity: Math.round(met.groupVelocity * 10) / 10,
        ripplePhaseDiff: st.ripplePhaseDiff,
        beamSteerAngleDeg: Math.round(met.beamSteerAngleDeg * 10) / 10,
        stringTension: st.stringTension,
        stringDensityGm: st.stringDensityGm,
        driveFreqRatio: st.driveFreqRatio,
        resonatorQ: st.resonatorQ,
        resonatorGainPct: met.resonatorGainPct,
        ftirGapLambda: st.ftirGapLambda,
        waterDepthRatio: st.waterDepthRatio,
        listenerDistMeters: st.listenerDistMeters,
        attenuatedDb: met.attenuatedDb,
        rippleFringeSpacingPx: met.rippleFringeSpacingPx,
        adcBitDepth: st.adcBitDepth,
        adcSqnrDb: met.adcSqnrDb,
        dopplerOffsetAngleDeg: st.dopplerOffsetAngleDeg,
        offAxisObsFreq: isFinite(met.offAxisObsFreq) ? met.offAxisObsFreq : null,
        note: 'sweep:' + axis
      };
    });
  }

  function waveComputeSpectrum(rawState, maxHarmOpt) {
    var s = waveNormalizeState(rawState);
    var maxHarm = Math.max(4, Math.min(24, Math.round(Number(maxHarmOpt) || 12)));
    var NSAMP = 256;
    var harmonics = [];
    var magSum = 0;
    var weightedFreqSum = 0;
    var higherPowerSum = 0;
    var rawPowerSum = 0;
    var filteredPowerSum = 0;
    for (var hh = 1; hh <= maxHarm; hh++) {
      var dre = 0, dim = 0;
      for (var kk = 0; kk < NSAMP; kk++) {
        var ph = (2 * Math.PI * kk) / NSAMP;
        var yk = waveValPure(ph, s.waveType, s.harmonicWeights);
        dre += yk * Math.cos(hh * ph);
        dim += yk * Math.sin(hh * ph);
      }
      var cosCoeff = (2 * dre) / NSAMP;
      var sinCoeff = (2 * dim) / NSAMP;
      var rawMag = (2 * Math.sqrt(dre * dre + dim * dim)) / NSAMP;
      var gain = waveFilterHarmonicGain(hh, s.spectrumFilter, s.filterCutoffHarmonic);
      var mag = rawMag * gain;
      var hFreq = hh * s.frequency;
      magSum += mag;
      weightedFreqSum += hFreq * mag;
      rawPowerSum += rawMag * rawMag;
      filteredPowerSum += mag * mag;
      if (hh >= 2) higherPowerSum += mag * mag;
      harmonics.push({ order: hh, freq: hFreq, rawMag: rawMag, gain: gain, mag: mag, cosCoeff: cosCoeff, sinCoeff: sinCoeff });
    }
    var fundMag = harmonics.length > 0 ? Math.abs(harmonics[0].mag) : 0;
    var spectralCentroidHz = magSum > 1e-6 ? Math.round((weightedFreqSum / magSum) * 100) / 100 : s.frequency;
    var thdPct = fundMag > 1e-6 ? Math.round((Math.sqrt(higherPowerSum) / fundMag) * 1000) / 10 : 0;
    var retainedEnergyPct = rawPowerSum > 1e-9 ? Math.round((filteredPowerSum / rawPowerSum) * 1000) / 10 : 100;
    var secondComponent = s.showSecond ? { freq: s.frequency2, relAmp: s.amplitude2 / Math.max(1, s.amplitude) } : null;
    return {
      harmonics: harmonics,
      secondComponent: secondComponent,
      spectralCentroidHz: spectralCentroidHz,
      thdPct: thdPct,
      retainedEnergyPct: retainedEnergyPct,
      spectrumFilter: s.spectrumFilter,
      filterCutoffHarmonic: s.filterCutoffHarmonic
    };
  }

  function waveGoverningEquation(rawState) {
    var s = waveNormalizeState(rawState);
    var m = waveComputeMetrics(s);
    var formula = 'y(x,t) = A sin(2πft − kx)';
    var detail = 'A = ' + s.amplitude + ', f = ' + s.frequency + ' Hz, λ = ' + m.wavelength.toFixed(1) + ' m, T = ' + m.period.toFixed(3) + ' s';
    var modeLabel = s.waveMode;

    if (s.waveMode === 'standing') {
      if (s.resonatorDriven) {
        formula = 'G(r) = 1 / √[Q²(1 − r²)² + r²],   Δf = fₙ / Q   [Lorentzian Driven Resonator]';
        detail = 'f_d/f₁ = ' + s.driveFreqRatio.toFixed(2) + ', Q = ' + s.resonatorQ + ', Gain = ' + m.resonatorGainPct.toFixed(1) + '%, φ = ' + m.resonatorPhaseDeg.toFixed(1) + '°, Δf = ' + m.resonatorFwhmHz.toFixed(3) + ' Hz';
      } else if (s.standingBoundary === 'bothFixed' && s.stringMechanics) {
        formula = 'fₙ = (n / 2L) √(T / μ),   v = √(T / μ)   [Mersenne\'s Laws]';
        detail = 'T = ' + s.stringTension + ' N, μ = ' + s.stringDensityGm.toFixed(2) + ' g/m → v = ' + m.stringDerivedSpeed.toFixed(1) + ' m/s, n = ' + s.harmonic + ', f = ' + m.harmonicFreq.toFixed(1) + ' Hz';
      } else if (s.showTravelingComponents) {
        formula = 'y(x,t) = ½ y₊(x − vt) + ½ y₋(x + vt),   PE/E = cos²(ωt), KE/E = sin²(ωt)   [Counter-Propagating Superposition]';
        detail = 'v = ±' + s.waveSpeed + ' m/s, n_eff = ' + m.effectiveHarmonic + ', f = ' + m.harmonicFreq.toFixed(1) + ' Hz, Nodes = ' + m.nodesCount + ', Antinodes = ' + m.antinodesCount;
      } else {
        if (s.standingBoundary === 'bothFixed') {
          formula = 'y(x,t) = A sin(nπx/L) cos(ωt)   [λₙ = 2L/n]';
        } else if (s.standingBoundary === 'openOpen') {
          formula = 'y(x,t) = A cos(nπx/L) cos(ωt)   [λₙ = 2L/n]';
        } else {
          formula = 'y(x,t) = A sin((2k−1)πx/(2L)) cos(ωt)   [λₖ = 4L/(2k−1)]';
        }
        detail = 'n_eff = ' + m.effectiveHarmonic + ', f = ' + m.harmonicFreq.toFixed(1) + ' Hz, Nodes = ' + m.nodesCount + ', Antinodes = ' + m.antinodesCount + ' (' + m.standingWavelengthFormula + ')';
      }
    } else if (s.waveMode === 'ripple') {
      if (s.rippleBarrier === 'grating') {
        formula = 'd sin θₘ = mλ,   R = mN   [N-Slit Diffraction Grating]';
        detail = 'N = ' + s.gratingSlits + ' slits, R₁ = ' + m.gratingResolvingPower + ', θ₁ = ' + m.gratingFirstOrderDeg.toFixed(1) + '°, Δφ = ' + Math.round(s.ripplePhaseDiff * 180 / Math.PI) + '°';
      } else if (s.rippleBarrier === 'singleSlit' || s.rippleBarrier === 'obstacle') {
        formula = 'a sin θ₁ = λ   [Diffraction First Minimum]';
        detail = 'θ₁ = ' + m.diffractionAngleDeg.toFixed(1) + '°, λ = ' + m.wavelength.toFixed(1) + ' m, slit = ' + Math.round(s.slitWidth * 100) + '%';
      } else if (Math.abs(s.ripplePhaseDiff) > 0.05) {
        formula = 'sin θ₀ = (Δφ / 2π) · (λ / d)   [Phased-Array Steering]';
        detail = 'Δφ = ' + Math.round(s.ripplePhaseDiff * 180 / Math.PI) + '°, Beam θ₀ = ' + (m.beamSteerAngleDeg >= 0 ? '+' : '') + m.beamSteerAngleDeg.toFixed(1) + '°, d = ' + s.rippleSeparation + ' px';
      } else if (s.showNodalLines) {
        formula = '|r₁ − r₂| = (n + ½)λ,   Δy ≈ λL / d   [Destructive Nodal Hyperbolas]';
        detail = 'Δy = ' + m.rippleFringeSpacingPx.toFixed(1) + ' px, Nodal lines = ' + m.rippleNodalCount + ', θ_min,1 = ' + m.rippleFirstMinDeg.toFixed(1) + '°, d = ' + m.rippleEffSepPx.toFixed(0) + ' px';
      } else {
        formula = 'Δr = |r₁ − r₂| = mλ   [Two-Source Interference]';
        detail = 'd = ' + s.rippleSeparation + ' px, Δφ = 0°, θ₀ = 0.0°, λ = ' + m.wavelength.toFixed(1) + ' m';
      }
    } else if (s.waveMode === 'reflection') {
      var swrTxt = isFinite(m.standingWaveRatio) ? m.standingWaveRatio.toFixed(2) : '∞';
      if (m.isTotalInternalReflection && s.ftirEnabled) {
        formula = 'T = sech²(g / dₚ),   dₚ = λ₁ / (2π √(sin²θ₁ − (v₁/v₂)²))   [FTIR Evanescent Tunneling]';
        detail = 'dₚ = ' + (m.evanescentPenetrationLambda != null ? m.evanescentPenetrationLambda.toFixed(2) : '—') + 'λ₁, Gap g = ' + s.ftirGapLambda.toFixed(2) + 'λ₁, Tunnel T = ' + m.tunnelTransmissionPct.toFixed(1) + '%, Reflected R = ' + m.reflectedEnergyPct + '%';
      } else if (m.isTotalInternalReflection) {
        formula = 'θ₁ > θ_c = arcsin(v₁ / v₂),   dₚ = λ₁ / (2π √(sin²θ₁ − (v₁/v₂)²))   [TIR Evanescent]';
        detail = 'θ₁ = ' + s.incidentAngleDeg + '° > θ_c = ' + (m.criticalAngleDeg != null ? m.criticalAngleDeg.toFixed(1) + '°' : '—') + ', dₚ = ' + (m.evanescentPenetrationLambda != null ? m.evanescentPenetrationLambda.toFixed(2) : '—') + 'λ₁, R = 100%, SWR = ∞';
      } else if (s.antiReflectionCoating) {
        formula = 'd = λ_c/4,  v_c = √(v₁v₂)   [λ/4 Anti-Reflection Coating]';
        detail = 'v_c = ' + Math.round(m.coatingSpeed) + ' m/s, d = ' + m.quarterWaveThickness.toFixed(1) + ' m, R = ' + m.reflectedEnergyPct + '%, SWR = ' + swrTxt;
      } else if (s.impedanceCoupled) {
        if (s.fresnelPolarization === 'p') {
          formula = 'rₚ = (v₂ cos θ₂ − v₁ cos θ₁) / (v₂ cos θ₂ + v₁ cos θ₁)   [Brewster TM, θ_B = arctan(v₁/v₂)]';
          detail = 'θ₁ = ' + s.incidentAngleDeg + '°, θ_B = ' + m.brewsterAngleDeg.toFixed(1) + '°, |rₚ| = ' + m.effectiveReflectivity.toFixed(3) + ', R = ' + m.reflectedEnergyPct + '%';
        } else {
          formula = 'rₛ = (v₂ cos θ₁ − v₁ cos θ₂) / (v₂ cos θ₁ + v₁ cos θ₂)   [Fresnel TE]';
          detail = 'v₂/v₁ = ' + s.medium2Ratio.toFixed(2) + ', |rₛ| = ' + m.effectiveReflectivity.toFixed(2) + ', R = ' + m.reflectedEnergyPct + '%, SWR = ' + swrTxt;
        }
      } else {
        formula = 'sin θ₂ / sin θ₁ = v₂ / v₁,   SWR = (1 + |r|) / (1 − |r|)';
        detail = 'θ₁ = ' + s.incidentAngleDeg + '°, θ₂ = ' + (m.refractedAngleDeg != null ? m.refractedAngleDeg.toFixed(1) + '°' : 'TIR') + ', R = ' + m.reflectedEnergyPct + '%, SWR = ' + swrTxt;
      }
    } else if (s.waveMode === 'longitudinal') {
      if (s.longitudinalMode === 'standing') {
        formula = 'Δx = A sin(nπx/L)cos(ωt),  ΔP ∝ −cos(nπx/L)   [Kundt 90° Shift]';
        detail = 'Harmonic #' + s.harmonic + ', f_n(1m) = ' + m.kundtTubeResonantHz.toFixed(1) + ' Hz, Nodes = ' + (s.harmonic + 1) + (s.airTempCoupled ? (', T = ' + s.airTempC + '°C, v = ' + s.waveSpeed + ' m/s') : (', λ = ' + m.wavelength.toFixed(1) + ' m'));
      } else if (s.distanceAttenuation) {
        formula = s.spreadingLaw === 'cylindrical'
          ? 'I(r) = I₀(r₀/r),   ΔL = −10 log₁₀(r/r₀)   [Cylindrical −3 dB/doubling]'
          : 'I(r) = I₀(r₀/r)²,   ΔL = −20 log₁₀(r/r₀)   [Inverse-Square −6 dB/doubling]';
        detail = 'r = ' + m.listenerDistMeters.toFixed(1) + ' m, L(r) = ' + m.attenuatedDb.toFixed(1) + ' dB (−' + m.attenuationDropDb.toFixed(1) + ' dB), I/I₀ = ' + m.intensityPctAtListener.toFixed(1) + '%';
      } else if (s.airTempCoupled) {
        formula = 'v(T) = 331.3 √(1 + T_C / 273.15) m/s   [Thermal Speed of Sound]';
        detail = 'T = ' + s.airTempC + ' °C, v_air = ' + s.waveSpeed + ' m/s, f = ' + s.frequency + ' Hz, λ = ' + m.wavelength.toFixed(1) + ' m';
      } else {
        formula = 'Δx(x,t) = A sin(kx − ωt),  ΔP(x,t) = −BAk cos(kx − ωt)';
        detail = 'A = ' + s.amplitude + ', f = ' + s.frequency + ' Hz, v = ' + s.waveSpeed + ' m/s, λ = ' + m.wavelength.toFixed(1) + ' m';
      }
    } else if (s.waveMode === 'doppler') {
      if (s.dopplerOffsetAngleDeg > 0) {
        if (s.dopplerRegime === 'relativistic') {
          formula = "f'(θ) = f₀ / [γ(1 − β cos θ)],   f'(90°) = f₀ / γ   [Off-Axis & Transverse Relativistic Doppler]";
          detail = 'θ = ' + s.dopplerOffsetAngleDeg.toFixed(0) + '°, cos θ = ' + m.offAxisCosTheta.toFixed(2) + ', γ = ' + m.relativisticGamma.toFixed(2) + ', f\'(θ) = ' + m.offAxisObsFreq.toFixed(2) + ' Hz, f\'(90°) = ' + m.transverseRelFreq.toFixed(2) + ' Hz';
        } else {
          formula = "f'(θ) = f₀ / (1 − M cos θ),   v_rad = vₛ cos θ   [Off-Axis Radar Cosine Doppler]";
          detail = 'θ = ' + s.dopplerOffsetAngleDeg.toFixed(0) + '°, cos θ = ' + m.offAxisRadarPct.toFixed(0) + '%, M_rad = ' + m.offAxisRadialMach.toFixed(2) + ', f\'(θ) = ' + (isFinite(m.offAxisObsFreq) ? (m.offAxisObsFreq.toFixed(2) + ' Hz') : 'Shock');
        }
      } else if (s.dopplerRegime === 'relativistic') {
        formula = "f' = f · √((1 ± β) / (1 ∓ β)),   1 + z = √((1 + β) / (1 − β))   [Relativistic Light]";
        detail = 'β_s = ' + Math.min(0.95, s.sourceSpeed).toFixed(2) + 'c, γ = ' + m.relativisticGamma.toFixed(2) + ', z_rec = +' + m.redshiftRec.toFixed(3) + ', Hα_rec = ' + m.hAlphaRecNm.toFixed(1) + ' nm';
      } else if (s.sourceSpeed >= 1) {
        formula = 'sin μ = c / vₛ = 1 / M   [Mach Shock Cone]';
        detail = 'Mach M = ' + m.machNumber.toFixed(2) + ', Half-Angle μ = ' + (m.machAngleDeg != null ? m.machAngleDeg.toFixed(1) + '°' : '90.0°') + ', v_o = ' + s.observerSpeed.toFixed(2) + 'c';
      } else {
        formula = "f' = f · (c + vₒ) / (c ∓ vₛ)   [Doppler Shift]";
        detail = 'f₀ = ' + s.frequency.toFixed(1) + ' Hz, M = ' + m.machNumber.toFixed(2) + ', f_app = ' + m.approachingFreq.toFixed(2) + ' Hz, f_rec = ' + m.recedingFreq.toFixed(2) + ' Hz';
      }
    } else if (s.waveMode === 'spectrum') {
      var specInfo = waveComputeSpectrum(s, 12);
      if (s.digitalSampling) {
        formula = 'f_Nyq = fₛ / 2,   f_alias = |f − k·fₛ|,   SQNR ≈ 6.02b + 1.76 dB   [Nyquist–Shannon & ADC]';
        detail = 'fₛ = ' + m.sampleRateHz.toFixed(1) + ' Hz, f_Nyq = ' + m.nyquistFreqHz.toFixed(1) + ' Hz, ' + m.adcBitDepth + '-bit (' + m.adcQuantizationLevels + ' lvls, SQNR=' + m.adcSqnrDb.toFixed(1) + ' dB)' + (m.isFundamentalAliased ? (', ALIAS f=' + m.aliasFreqHz.toFixed(2) + ' Hz') : '');
      } else if (s.spectrumFilter !== 'none') {
        formula = 'y_filt(t) = Σₕ H(h) aₕ sin(hωt)   [Harmonic Filter]';
        detail = 'Filter=' + s.spectrumFilter + (s.spectrumFilter === 'lowpass' || s.spectrumFilter === 'highpass' ? (' (Hc=' + s.filterCutoffHarmonic + ')') : '') + ', Retained=' + specInfo.retainedEnergyPct.toFixed(1) + '%, Centroid=' + specInfo.spectralCentroidHz.toFixed(2) + ' Hz, THD=' + specInfo.thdPct.toFixed(1) + '%';
      } else {
        formula = 'y(t) = Σₕ aₕ sin(hωt)   [Fourier Harmonic Synthesis]';
        detail = 'f₁ = ' + s.frequency.toFixed(1) + ' Hz, Centroid = ' + specInfo.spectralCentroidHz.toFixed(2) + ' Hz, THD = ' + specInfo.thdPct.toFixed(1) + '%';
      }
    } else if (s.packetMode === 'collide') {
      formula = 'y(x,t) = f₊(x − vt) ' + (s.collidePolarity === 'same' ? '+ f₋(x + vt)' : '− f₋(x + vt)') + '   [Pulse Superposition]';
      detail = (s.collidePolarity === 'same' ? 'Crest + Crest (2A peak at overlap)' : 'Crest + Trough (0 net at overlap)') + ' — pulses pass through unchanged';
    } else if (s.packetMode === 'packet' && s.oceanDepthCoupled) {
      formula = 'ω² = gk tanh(kh),   v_g/v_p = ½[1 + 2kh / sinh(2kh)]   [Airy Ocean Dispersion]';
      detail = 'h/λ = ' + s.waterDepthRatio.toFixed(2) + ' (' + m.oceanRegime + '), v_g/v_p = ' + s.dispersionRatio.toFixed(2) + ', v_g = ' + Math.round(m.groupVelocity) + ' m/s, v_p = ' + Math.round(m.phaseVelocity) + ' m/s';
    } else if (s.packetMode === 'packet') {
      formula = 'y(x,t) = A exp[−(x − v_g t)²/(2σ²)] · sin(kx − ωt)';
      detail = 'v_g / v_p = ' + s.dispersionRatio.toFixed(2) + ' (' + m.dispersionRegime + '), v_g = ' + Math.round(m.groupVelocity) + ' m/s, v_p = ' + Math.round(m.phaseVelocity) + ' m/s';
    } else if (s.showSecond) {
      formula = s.showBeatEnvelope
        ? 'A_env(x,t) = √(A₁² + A₂² + 2A₁A₂ cos(Δkx − Δωt − φ₂)),   f_beat = |f₁ − f₂|'
        : 'y(x,t) = y₁(x,t) + A₂ sin(k₂x − ω₂t + φ₂)   [Superposition]';
      detail = 'f₁ = ' + s.frequency + ' Hz, f₂ = ' + s.frequency2 + ' Hz' + (s.intervalLock !== 'none' ? (' (' + s.intervalLock + ')') : '') + ', f_beat = ' + m.beatFreq.toFixed(2) + ' Hz, Mod = ' + m.beatModDepthPct.toFixed(0) + '%';
    } else if (s.damping) {
      formula = 'y(x,t) = A exp(−αx) · sin(2πft − kx)   [Damped Traveling Wave]';
      detail = 'α = ' + s.dampingAlpha.toFixed(2) + ', Loss = −' + m.dampingLossDb.toFixed(1) + ' dB, x₁/₂ = ' + m.dampingHalfEnergyMeters.toFixed(1) + ' m, λ = ' + m.wavelength.toFixed(1) + ' m';
    }
    return { formula: formula, detail: detail, modeLabel: modeLabel };
  }

  function waveEvaluateMission(rawState, missionIdOpt, __tFn) {
    var tt = typeof __tFn === 'function' ? __tFn : function(k, fb) { return fb != null ? fb : k; };
    var s = waveNormalizeState(rawState);
    var mId = missionIdOpt || s.activeMissionId || 'mission_cancel';
    var def = WAVE_MISSIONS.find(function(x) { return x.id === mId; }) || WAVE_MISSIONS[0];
    var ok = false;
    var msg = '';

    if (mId === 'mission_cancel') {
      var phNorm = ((s.phase2 % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (s.waveMode !== 'free') msg = tt('stem.wave.mv_need_free', 'Switch to Free Wave mode first.');
      else if (!s.showSecond) msg = tt('stem.wave.mv_need_second', 'Enable Show Second Wave to test superposition.');
      else if (Math.abs(s.frequency - s.frequency2) > 0.05) msg = tt('stem.wave.mv_match_freq', 'Match the frequencies: Wave 1 = ') + s.frequency + ' Hz, Wave 2 = ' + s.frequency2 + ' Hz.';
      else if (Math.abs(s.amplitude - s.amplitude2) > 3) msg = tt('stem.wave.mv_match_amp', 'Match the amplitudes within 3 units (currently ') + s.amplitude + ' vs ' + s.amplitude2 + ').';
      else if (Math.abs(phNorm - Math.PI) > 0.35) msg = tt('stem.wave.mv_need_pi', 'Shift Phase 2 near π (≈3.1 rad) so peaks meet troughs. Currently ') + (phNorm / Math.PI).toFixed(2) + 'π.';
      else { ok = true; msg = tt('stem.wave.mv_cancel_ok', 'Zero net wave! Complete destructive interference achieved.'); }
    } else if (mId === 'mission_beats') {
      var fDiff = Math.abs(s.frequency - s.frequency2);
      if (s.waveMode !== 'free' && s.waveMode !== 'spectrum') msg = tt('stem.wave.mv_need_free_spec', 'Switch to Free Wave or Spectrum mode.');
      else if (!s.showSecond) msg = tt('stem.wave.mv_need_second', 'Enable Show Second Wave to test superposition.');
      else if (s.amplitude < 20 || s.amplitude2 < 20) msg = tt('stem.wave.mv_need_amp20', 'Keep both amplitudes at least 20 so the beat envelope is clear.');
      else if (Math.abs(fDiff - 0.5) > 0.05) msg = tt('stem.wave.mv_need_05hz', 'Tune |f₁ − f₂| to 0.5 Hz (currently ') + fDiff.toFixed(1) + ' Hz).';
      else { ok = true; msg = tt('stem.wave.mv_beats_ok', '0.5 Hz beat envelope locked! Watch and hear the slow pulse.'); }
    } else if (mId === 'mission_harmonic3') {
      var resF = s.harmonic * s.frequency;
      if (s.waveMode !== 'standing') msg = tt('stem.wave.mv_need_standing', 'Switch to Standing Wave mode.');
      else if (s.harmonic !== 3) msg = tt('stem.wave.mv_need_harm3', 'Select Harmonic #3 (4 nodes, 3 antinodes).');
      else if (Math.abs(resF - 6.0) > 0.1) msg = tt('stem.wave.mv_need_res6', 'Adjust Frequency f₁ to 2.0 Hz so 3 × f₁ = 6.0 Hz (currently ') + resF.toFixed(1) + ' Hz).';
      else { ok = true; msg = tt('stem.wave.mv_harm3_ok', '3rd harmonic resonance at 6.0 Hz verified (4 nodes, 3 antinodes)!'); }
    } else if (mId === 'mission_closed_pipe') {
      if (s.waveMode !== 'standing') msg = tt('stem.wave.mv_need_standing', 'Switch to Standing Wave mode.');
      else if (s.standingBoundary !== 'fixedFree') msg = tt('stem.wave.mv_need_cpipe', 'Select Closed–Open Pipe (Fixed–Free) boundary mode.');
      else if (s.harmonic !== 2) msg = tt('stem.wave.mv_need_cpipe_m2', 'Select Mode #2 (the 3rd odd harmonic, λ = 4L/3).');
      else if (Math.abs(s.frequency - 2.0) > 0.05) msg = tt('stem.wave.mv_need_f2', 'Set fundamental f₁ = 2.0 Hz (currently ') + s.frequency.toFixed(1) + ' Hz).';
      else { ok = true; msg = tt('stem.wave.mv_cpipe_ok', 'Closed–open pipe 3rd odd harmonic locked (2 nodes, 2 antinodes, λ = 4L/3)!'); }
    } else if (mId === 'mission_nodal_probe') {
      var pr = waveComputeProbeReadout(s);
      if (s.waveMode !== 'ripple') msg = tt('stem.wave.mv_need_ripple', 'Switch to Ripple Tank mode.');
      else if (!s.probeEnabled) msg = tt('stem.wave.mv_need_probe', 'Turn ON the Wave Probe to measure path-length difference Δr.');
      else if (pr.interferenceClass !== 'destructive') msg = tt('stem.wave.mv_need_nodal', 'Move Wave Probe onto a dark nodal line where Δr ≈ (m + 0.5)λ. Currently Δr = ') + pr.deltaRLambda.toFixed(2) + 'λ (' + pr.interferenceClass + ').';
      else { ok = true; msg = tt('stem.wave.mv_nodal_ok', 'Nodal line confirmed at Δr = ') + pr.deltaRLambda.toFixed(2) + 'λ — destructive interference!'; }
    } else if (mId === 'mission_refraction') {
      if (s.waveMode !== 'reflection') msg = tt('stem.wave.mv_need_refl', 'Switch to Reflection & Refraction mode.');
      else if (s.reflectivity > 0.65) msg = tt('stem.wave.mv_lower_refl', 'Lower Reflectivity to ≤ 0.65 so enough energy transmits across the boundary.');
      else if (s.medium2Ratio > 0.65) msg = tt('stem.wave.mv_slow_m2', 'Lower Medium 2 Speed Ratio (v₂/v₁) to ≤ 0.65 to observe wavelength compression.');
      else { ok = true; msg = tt('stem.wave.mv_refract_ok', 'Two-medium transmission verified! λ₂ slowed to ') + Math.round(s.medium2Ratio * 100) + tt('stem.wave.mv_refract_ok2', '% of λ₁ while f stayed constant.'); }
    } else if (mId === 'mission_tir') {
      var tirMetrics = waveComputeMetrics(s);
      if (s.waveMode !== 'reflection') msg = tt('stem.wave.mv_need_refl', 'Switch to Reflection & Refraction mode.');
      else if (s.medium2Ratio < 1.35) msg = tt('stem.wave.mv_need_fast_m2', 'Make Medium 2 faster than Medium 1 (v₂/v₁ ≥ 1.35) so a critical angle θ_c exists.');
      else if (!tirMetrics.isTotalInternalReflection) msg = tt('stem.wave.mv_need_tir_angle', 'Increase Incident Angle θ₁ above critical angle ') + (tirMetrics.criticalAngleDeg != null ? tirMetrics.criticalAngleDeg.toFixed(1) + '°' : '') + ' for Total Internal Reflection.';
      else { ok = true; msg = tt('stem.wave.mv_tir_ok', 'Total Internal Reflection achieved! 100% energy trapped inside Medium 1 (evanescent decay in Medium 2).'); }
    } else if (mId === 'mission_mach_cone') {
      if (s.waveMode !== 'doppler') msg = tt('stem.wave.mv_need_doppler', 'Switch to Doppler mode.');
      else if (s.sourceSpeed < 1.0) msg = tt('stem.wave.mv_need_mach1', 'Push Source Speed to 100% (Mach 1.00) or higher to break the sound barrier.');
      else { ok = true; msg = tt('stem.wave.mv_mach_ok', 'Mach ') + s.sourceSpeed.toFixed(2) + tt('stem.wave.mv_mach_ok2', ' shock cone verified! Wavefronts pile into a Mach cone.'); }
    } else if (mId === 'mission_dispersion') {
      if (s.waveMode !== 'free') msg = tt('stem.wave.mv_need_free', 'Switch to Free Wave mode first.');
      else if (s.packetMode !== 'packet') msg = tt('stem.wave.mv_need_packet', 'Enable Wave Packet mode to see group vs. phase velocity.');
      else if (s.dispersionRatio > 0.60) msg = tt('stem.wave.mv_need_vg_low', 'Lower Group/Phase ratio vg/vp to ≤ 0.60 (currently ') + s.dispersionRatio.toFixed(2) + ') like deep-water gravity waves.';
      else { ok = true; msg = tt('stem.wave.mv_disp_ok', 'Deep-ocean dispersion locked! Wave crests overtake the slow vg = ') + s.dispersionRatio.toFixed(2) + '·vp energy packet.'; }
    } else if (mId === 'mission_kundt_tube') {
      if (s.waveMode !== 'longitudinal') msg = tt('stem.wave.mv_need_long', 'Switch to Longitudinal mode.');
      else if (s.longitudinalMode !== 'standing') msg = tt('stem.wave.mv_need_kundt', 'Select Kundt Standing Tube mode inside Longitudinal controls.');
      else if (!s.showDisplacementCurve) msg = tt('stem.wave.mv_need_dx_overlay', 'Turn ON the Δx(x) & ΔP(x) Overlay to compare displacement and pressure.');
      else if (s.harmonic < 2) msg = tt('stem.wave.mv_need_long_h2', 'Select Harmonic #2 or higher inside the acoustic tube.');
      else { ok = true; msg = tt('stem.wave.mv_kundt_ok', 'Kundt standing tube verified! Rigid closed walls act as displacement nodes and pressure antinodes (90° shift).'); }
    } else if (mId === 'mission_phased_array') {
      if (s.waveMode !== 'ripple') msg = tt('stem.wave.mv_need_ripple', 'Switch to Ripple Tank mode.');
      else if (s.rippleBarrier !== 'none') msg = tt('stem.wave.mv_need_open_water', 'Select Open Water (Two Sources) barrier mode for phased-array steering.');
      else if (!s.showIntensityScreen) msg = tt('stem.wave.mv_need_iscreen', 'Turn ON the I(y) Screen to observe the steered intensity lobe.');
      else if (Math.abs(s.ripplePhaseDiff) < (Math.PI / 2 - 0.05)) msg = tt('stem.wave.mv_need_phase90', 'Shift Source Phase Offset (Δφ) to ≥ +90° or ≤ −90° (currently ') + Math.round(s.ripplePhaseDiff * 180 / Math.PI) + '°).';
      else {
        ok = true;
        var mPA = waveComputeMetrics(s);
        msg = tt('stem.wave.mv_phased_ok', 'Phased-array beam steered to ') + mPA.beamSteerAngleDeg.toFixed(1) + tt('stem.wave.mv_phased_ok2', '° via Δφ phase shift alone!');
      }
    } else if (mId === 'mission_antireflection') {
      var mAR = waveComputeMetrics(s);
      if (s.waveMode !== 'reflection') msg = tt('stem.wave.mv_need_refl', 'Switch to Reflection & Refraction mode.');
      else if (!s.impedanceCoupled) msg = tt('stem.wave.mv_need_implock', 'Enable Acoustic/Optical Impedance Lock so reflections follow Fresnel physics.');
      else if (!s.antiReflectionCoating) msg = tt('stem.wave.mv_need_ar', 'Enable the λ/4 Anti-Reflection Coating toggle.');
      else if (s.medium2Ratio > 0.70) msg = tt('stem.wave.mv_need_m2_070', 'Keep Medium 2 Speed Ratio ≤ 0.70 so normal mismatch is clear before coating.');
      else if (s.incidentAngleDeg > 2) msg = tt('stem.wave.mv_need_normal_inc', 'Set Incident Angle θ₁ to 0° (normal incidence) for exact λ/4 destructive cancellation.');
      else {
        ok = true;
        msg = tt('stem.wave.mv_ar_ok', 'Quarter-wave AR coating matched! Reflected energy dropped to ') + mAR.reflectedEnergyPct + tt('stem.wave.mv_ar_ok2', '% (SWR = ') + (isFinite(mAR.standingWaveRatio) ? mAR.standingWaveRatio.toFixed(2) : '∞') + ').';
      }
    }

    return { ok: ok, id: def.id, msg: msg, reward: def.reward };
  }

  function waveComputeRulerReadout(rawState) {
    var s = waveNormalizeState(rawState);
    var met = waveComputeMetrics(s);
    var x1 = waveClampNum(s.rulerX1, 0.04, 0.96, 0.25);
    var x2 = waveClampNum(s.rulerX2, 0.04, 0.96, 0.75);
    var lo = Math.min(x1, x2);
    var hi = Math.max(x1, x2);
    var spanFrac = Math.round((hi - lo) * 1000) / 1000;
    var baseWl = met.wavelength;
    var spanCycles = 0;
    var spanMeters = 0;
    var modeWavelength = baseWl;

    if (s.waveMode === 'standing') {
      var standGeom = waveStandingGeometry(s.harmonic, s.standingBoundary);
      spanCycles = spanFrac * (standGeom.freqMultiplier * 0.5);
      spanMeters = spanCycles * baseWl;
    } else if (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing') {
      spanCycles = spanFrac * (Math.max(1, s.harmonic) * 0.5);
      spanMeters = spanCycles * baseWl;
    } else if (s.waveMode === 'ripple') {
      spanCycles = spanFrac * (s.frequency * 2);
      spanMeters = spanFrac * s.waveSpeed;
    } else if (s.waveMode === 'reflection') {
      var wf = s.wallFrac != null ? s.wallFrac : 0.75;
      var f1 = Math.max(0, Math.min(hi, wf) - lo);
      var f2 = Math.max(0, hi - Math.max(lo, wf));
      var ratio = Math.max(0.15, s.medium2Ratio);
      spanCycles = (f1 * s.frequency) + ((f2 * s.frequency) / ratio);
      spanMeters = (f1 * s.waveSpeed) + (f2 * s.waveSpeed * ratio);
      if (f2 > f1 && f1 <= 0.02) modeWavelength = baseWl * ratio;
    } else {
      spanCycles = spanFrac * s.frequency;
      spanMeters = spanFrac * s.waveSpeed;
    }
    var fracMod = spanCycles - Math.floor(spanCycles);
    var distToHalf = Math.abs(fracMod - 0.5);
    var distToInt = Math.min(fracMod, 1 - fracMod);
    return {
      x1: Math.round(x1 * 1000) / 1000,
      x2: Math.round(x2 * 1000) / 1000,
      lo: Math.round(lo * 1000) / 1000,
      hi: Math.round(hi * 1000) / 1000,
      spanFrac: spanFrac,
      spanCycles: Math.round(spanCycles * 100) / 100,
      spanMeters: Math.round(spanMeters * 100) / 100,
      wavelength: Math.round(modeWavelength * 100) / 100,
      impliedSpeed: Math.round((s.frequency * modeWavelength) * 10) / 10,
      isHalfMultiple: spanCycles >= 0.25 && distToHalf <= 0.08,
      isWholeMultiple: spanCycles >= 0.5 && distToInt <= 0.08
    };
  }

  function waveSnapRulerSpan(rawState, targetCycles) {
    var s = waveNormalizeState(rawState);
    var reqCycles = Math.max(0.25, Math.min(4, Number(targetCycles) || 1));
    var lo = Math.min(s.rulerX1, s.rulerX2);
    var cyclesPerWidth = s.frequency;
    if (s.waveMode === 'standing') {
      cyclesPerWidth = waveStandingGeometry(s.harmonic, s.standingBoundary).freqMultiplier * 0.5;
    } else if (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing') {
      cyclesPerWidth = Math.max(1, s.harmonic) * 0.5;
    } else if (s.waveMode === 'ripple') {
      cyclesPerWidth = s.frequency * 2;
    } else if (s.waveMode === 'reflection') {
      var wf = s.wallFrac != null ? s.wallFrac : 0.75;
      if (lo >= wf) cyclesPerWidth = s.frequency / Math.max(0.15, s.medium2Ratio);
    }
    var spanFrac = Math.min(0.92, Math.max(0.05, reqCycles / Math.max(0.25, cyclesPerWidth)));
    var nx1 = Math.max(0.04, Math.min(0.96 - spanFrac, lo));
    var nx2 = Math.min(0.96, nx1 + spanFrac);
    return {
      rulerX1: Math.round(nx1 * 1000) / 1000,
      rulerX2: Math.round(nx2 * 1000) / 1000
    };
  }

  function waveComputeAudioParams(rawState) {
    var s = waveNormalizeState(rawState);
    var met = waveComputeMetrics(s);
    var pr = waveComputeProbeReadout(s);
    var rawF1 = s.frequency;
    if (s.waveMode === 'standing') {
      rawF1 = s.resonatorDriven ? met.resonatorDriveHz : met.harmonicFreq;
    } else if (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing') {
      rawF1 = Math.max(1, s.harmonic) * s.frequency;
    } else if (s.waveMode === 'doppler') {
      rawF1 = met.isSupersonic ? s.frequency : met.approachingFreq;
    }
    var f1Hz = Math.max(50, Math.min(4000, Math.round((rawF1 * 100) * 10) / 10));
    var hasOsc2 = !!(s.showSecond && (s.waveMode === 'free' || s.waveMode === 'spectrum'));
    var ampNorm = waveClampNum(s.amplitude, 5, 100, 50) / 100;
    var maxGain = hasOsc2 ? 0.14 : 0.24;
    var probeScale = 1;
    if (s.probeEnabled) {
      if (s.waveMode === 'standing') probeScale = pr.envelopeFrac;
      else if (s.waveMode === 'longitudinal' && s.longitudinalMode === 'standing') probeScale = pr.dispEnvelope;
      else if (s.waveMode === 'reflection') {
        var wf = s.wallFrac != null ? s.wallFrac : 0.75;
        probeScale = s.probeX > wf ? (pr.localAmplitude / Math.max(1, s.amplitude)) : 1;
      } else if (s.waveMode === 'free' && s.damping) {
        probeScale = Math.exp(-s.dampingAlpha * s.probeX * 3);
      }
    }
    var resonatorGainScale = (s.waveMode === 'standing' && s.resonatorDriven) ? Math.max(0.08, met.resonatorGainNorm) : 1;
    var filterGainScale = 1;
    if ((s.waveMode === 'spectrum' || s.waveMode === 'free') && s.spectrumFilter !== 'none') {
      var filtSpec = waveComputeSpectrum(s, 12);
      filterGainScale = Math.max(0.05, Math.sqrt((filtSpec.retainedEnergyPct || 0) / 100));
    }
    var distAudioScale = (s.waveMode === 'longitudinal' && s.longitudinalMode === 'traveling' && s.distanceAttenuation)
      ? Math.max(0.08, met.listenerAmplitudeFactor)
      : 1;
    var gain1 = Math.max(0.002, Math.min(0.24, Math.round((ampNorm * maxGain * Math.max(0.01, probeScale) * filterGainScale * resonatorGainScale * distAudioScale) * 10000) / 10000));
    var f2Hz = hasOsc2 ? Math.max(50, Math.min(4000, Math.round((s.frequency2 * 100) * 10) / 10)) : 0;
    var amp2Norm = waveClampNum(s.amplitude2, 10, 80, 30) / 100;
    var probeScale2 = (s.probeEnabled && s.waveMode === 'free' && s.damping) ? Math.exp(-s.dampingAlpha * s.probeX * 3) : 1;
    var gain2 = hasOsc2 ? Math.max(0.002, Math.min(0.14, Math.round((amp2Norm * 0.14 * probeScale2) * 10000) / 10000)) : 0;
    return {
      f1Hz: f1Hz,
      gain1: gain1,
      hasOsc2: hasOsc2,
      f2Hz: f2Hz,
      gain2: gain2,
      probeScale: Math.round(probeScale * 1000) / 1000
    };
  }

  function waveBuildCerEvidence(rawState) {
    var s = waveNormalizeState(rawState);
    var met = waveComputeMetrics(s);
    var mode = s.waveMode || 'free';
    var parts = [
      '[' + mode + '] f=' + s.frequency + 'Hz, A=' + s.amplitude + ', v=' + s.waveSpeed + 'm/s, \u03BB=' + met.wavelength.toFixed(1) + 'm'
    ];
    if (mode === 'standing') {
      parts.push('boundary=' + s.standingBoundary + ', n=' + s.harmonic + ', \u03BB_n=' + met.standingWavelengthFormula + ', f_n=' + met.harmonicFreq.toFixed(1) + ' Hz, nodes=' + met.nodesCount + ', antinodes=' + met.antinodesCount + (s.showTravelingComponents ? ', decomp=y+(x-vt)+y-(x+vt)' : '') + (s.stringMechanics ? (', T=' + s.stringTension + 'N, \u03BC=' + s.stringDensityGm.toFixed(2) + 'g/m') : '') + (s.resonatorDriven ? (', fd/f1=' + s.driveFreqRatio.toFixed(2) + ', Q=' + s.resonatorQ + ', Gain=' + met.resonatorGainPct.toFixed(1) + '%') : ''));
    } else if (mode === 'doppler') {
      if (s.dopplerRegime === 'relativistic') {
        parts.push('regime=relativistic, \u03B2_s=' + Math.min(0.95, s.sourceSpeed).toFixed(2) + 'c, \u03B3=' + met.relativisticGamma.toFixed(2) + ', z_rec=' + met.redshiftRec.toFixed(3) + ', H\u03B1_app=' + met.hAlphaAppNm.toFixed(1) + 'nm, H\u03B1_rec=' + met.hAlphaRecNm.toFixed(1) + 'nm' + (s.dopplerOffsetAngleDeg > 0 ? (', \u03B8=' + s.dopplerOffsetAngleDeg + '\u00B0, f(\u03B8)=' + met.offAxisObsFreq.toFixed(2) + 'Hz') : ''));
      } else {
        parts.push('M=' + s.sourceSpeed.toFixed(2) + ', v_o=' + s.observerSpeed.toFixed(2) + ', f\'_app=' + (met.isSupersonic ? 'supersonic' : met.approachingFreq.toFixed(2) + ' Hz') + ', f\'_rec=' + met.recedingFreq.toFixed(2) + ' Hz' + (met.machAngleDeg != null ? (', Mach \u03BC=' + met.machAngleDeg.toFixed(1) + '\u00B0') : '') + (s.dopplerOffsetAngleDeg > 0 ? (', \u03B8=' + s.dopplerOffsetAngleDeg + '\u00B0(cos=' + met.offAxisRadarPct.toFixed(0) + '%), f(\u03B8)=' + (isFinite(met.offAxisObsFreq) ? met.offAxisObsFreq.toFixed(2) + 'Hz' : 'shock')) : ''));
      }
    } else if (mode === 'reflection') {
      parts.push('v2/v1=' + s.medium2Ratio.toFixed(2) + ', \u03B81=' + s.incidentAngleDeg + '\u00B0, \u03B82=' + (met.refractedAngleDeg != null ? met.refractedAngleDeg.toFixed(1) + '\u00B0' : 'TIR') + (met.evanescentPenetrationLambda != null ? (', dp=' + met.evanescentPenetrationLambda.toFixed(2) + '\u03BB1') : '') + (s.ftirEnabled ? (', FTIR gap=' + s.ftirGapLambda.toFixed(2) + '\u03BB1, T=' + met.tunnelTransmissionPct.toFixed(1) + '%') : '') + (s.impedanceCoupled ? (', pol=' + s.fresnelPolarization.toUpperCase() + ', \u03B8B=' + met.brewsterAngleDeg.toFixed(1) + '\u00B0') : '') + ', |r|=' + met.effectiveReflectivity.toFixed(2) + ', R=' + met.reflectedEnergyPct + '%, T_E=' + met.transmittedEnergyPct + '%, SWR=' + (isFinite(met.standingWaveRatio) ? met.standingWaveRatio.toFixed(2) : '\u221E') + ', echo=' + met.sonarEchoMs.toFixed(1) + 'ms');
    } else if (mode === 'ripple') {
      parts.push('barrier=' + s.rippleBarrier + (s.rippleBarrier === 'grating' ? ('(' + s.gratingSlits + ' slits, R1=' + met.gratingResolvingPower + ')') : '') + (s.showNodalLines ? (', \u0394y=' + met.rippleFringeSpacingPx.toFixed(1) + 'px, nodal=' + met.rippleNodalCount) : '') + ', \u03B8_diff=' + met.diffractionAngleDeg.toFixed(1) + '\u00B0, \u0394\u03C6=' + Math.round((s.ripplePhaseDiff || 0) * 180 / Math.PI) + '\u00B0, \u03B8_steer=' + met.beamSteerAngleDeg.toFixed(1) + '\u00B0');
    } else if (mode === 'longitudinal') {
      parts.push('submode=' + s.longitudinalMode + ', SPL=' + met.soundLevelDb.toFixed(1) + ' dB' + (s.longitudinalMode === 'traveling' && s.distanceAttenuation ? (', r=' + met.listenerDistMeters.toFixed(1) + 'm(' + s.spreadingLaw + ')=' + met.attenuatedDb.toFixed(1) + 'dB') : '') + (s.airTempCoupled ? (', T=' + s.airTempC + '\u00B0C') : '') + (s.longitudinalMode === 'standing' ? (', pipe n=' + s.harmonic + ', f_n=' + met.kundtTubeResonantHz.toFixed(1) + 'Hz') : ''));
    } else if (mode === 'spectrum') {
      var spec = waveComputeSpectrum(s);
      parts.push((s.spectrumFilter !== 'none' ? ('filter=' + s.spectrumFilter + '(Hc=' + s.filterCutoffHarmonic + '), retained=' + spec.retainedEnergyPct.toFixed(1) + '%, ') : '') + (s.digitalSampling ? ('ADC fs=' + met.sampleRateHz.toFixed(1) + 'Hz(fNyq=' + met.nyquistFreqHz.toFixed(1) + 'Hz,' + met.adcBitDepth + 'b SQNR=' + met.adcSqnrDb.toFixed(1) + 'dB' + (met.isFundamentalAliased ? ',ALIAS=' + met.aliasFreqHz.toFixed(2) + 'Hz' : '') + '), ') : '') + (s.waveType === 'custom' ? ('pluck=' + Math.round(s.pluckPosition * 100) + '%, ') : '') + 'centroid=' + spec.spectralCentroidHz.toFixed(2) + ' Hz, THD=' + spec.thdPct.toFixed(1) + '%');
    } else if (s.showSecond) {
      parts.push('wave2(A2=' + s.amplitude2 + ', f2=' + s.frequency2 + ' Hz' + (s.intervalLock !== 'none' ? (', lock=' + s.intervalLock) : '') + ', \u0394f=' + met.beatFreq.toFixed(2) + ' Hz, mod=' + met.beatModDepthPct.toFixed(0) + '%, \u03C62=' + (s.phase2 / Math.PI).toFixed(2) + '\u03C0)');
    } else if (s.packetMode === 'packet') {
      parts.push('packet vg/vp=' + s.dispersionRatio.toFixed(2) + ' (' + met.dispersionRegime + ', vg=' + met.groupVelocity.toFixed(1) + ' m/s' + (s.oceanDepthCoupled ? (', ocean h/\u03BB=' + s.waterDepthRatio.toFixed(2) + ' ' + met.oceanRegime) : '') + ')');
    } else if (s.packetMode === 'collide') {
      parts.push('pulse collision (' + s.collidePolarity + ')');
    }
    if (mode === 'free' && s.damping) {
      parts.push('damping \u03B1=' + s.dampingAlpha.toFixed(1) + ' (-' + met.dampingLossDb.toFixed(1) + ' dB, x1/2=' + met.dampingHalfEnergyMeters.toFixed(1) + 'm)');
    }
    if (s.probeEnabled) {
      var pr = waveComputeProbeReadout(s);
      parts.push('probe x=' + Math.round(s.probeX * 100) + '% (' + pr.cyclesFromLeft.toFixed(2) + '\u03BB' + (mode === 'ripple' ? (', \u0394r=' + pr.deltaRLambda.toFixed(2) + '\u03BB ' + pr.interferenceClass) : mode === 'standing' ? (', ' + pr.standingClass + ' ' + Math.round(pr.envelopeFrac * 100) + '%A') : '') + ')');
    }
    if (s.showRuler) {
      var rr = waveComputeRulerReadout(s);
      parts.push('ruler \u0394x=' + rr.spanCycles.toFixed(2) + '\u03BB (' + rr.spanMeters.toFixed(1) + ' m)');
    }
    return parts.join(' | ');
  }

  window.StemLab._wave = {
    MEDIA_PRESETS: WAVE_MEDIA_PRESETS,
    STRING_PRESETS: WAVE_STRING_PRESETS,
    FOURIER_PRESETS: WAVE_FOURIER_PRESETS,
    MISSIONS: WAVE_MISSIONS,
    CER_PROMPTS: WAVE_CER_PROMPTS,
    MASTERY_IDS: WAVE_MASTERY_IDS,
    MASTERY_TOTAL: WAVE_MASTERY_IDS.length,
    QUIZ_COUNT: 14,
    MYTHS_COUNT: 7,
    waveVal: waveValPure,
    computeStringSpeed: waveComputeStringSpeed,
    computeBrewsterAngle: waveComputeBrewsterAngle,
    wavelengthNmToHex: waveWavelengthNmToHex,
    computeRelativisticDoppler: waveComputeRelativisticDoppler,
    computePluckWeights: waveComputePluckWeights,
    computeAirSoundSpeed: waveComputeAirSoundSpeed,
    computeResonatorResponse: waveComputeResonatorResponse,
    computeEvanescentTunneling: waveComputeEvanescentTunneling,
    computeOceanDispersion: waveComputeOceanDispersion,
    computeBeatConsonance: waveComputeBeatConsonance,
    computeAcousticAttenuation: waveComputeAcousticAttenuation,
    computeRippleInterferenceGeometry: waveComputeRippleInterferenceGeometry,
    quantizeAdcSample: waveQuantizeAdcSample,
    computeDigitalSampling: waveComputeDigitalSampling,
    computeStandingDecomposition: waveComputeStandingDecomposition,
    computeOffAxisDoppler: waveComputeOffAxisDoppler,
    gratingIntensityFactor: waveGratingIntensityFactor,
    filterHarmonicGain: waveFilterHarmonicGain,
    evalPulseCollision: waveEvalPulseCollision,
    compareSnapshot: waveCompareSnapshot,
    standingEnvelope: waveStandingEnvelope,
    standingGeometry: waveStandingGeometry,
    normalizeState: waveNormalizeState,
    computeWaveMetrics: waveComputeMetrics,
    computeProbeReadout: waveComputeProbeReadout,
    computeRulerReadout: waveComputeRulerReadout,
    snapRulerSpan: waveSnapRulerSpan,
    computeAudioParams: waveComputeAudioParams,
    buildCerEvidence: waveBuildCerEvidence,
    computeSpectrum: waveComputeSpectrum,
    governingEquation: waveGoverningEquation,
    buildSweepRows: waveBuildSweepRows,
    evaluateMission: waveEvaluateMission,
    computeMastery: waveComputeMastery,
    syncMasterySlot: waveSyncMasterySlot
  };

  function WaveRestoreBridge(bridgeProps) {
    var ReactRef = bridgeProps.ReactRef;
    var setLabToolData = bridgeProps.setLabToolData;
    var rawWaveMastery = bridgeProps.rawWaveMastery;
    if (!ReactRef || typeof ReactRef.useEffect !== 'function') return null;

    ReactRef.useEffect(function() {
      var persisted = waveReadPersistedMastery();
      if (Object.keys(persisted).length > 0) {
        var needsMerge = Object.keys(persisted).some(function(k) { return !(rawWaveMastery && rawWaveMastery[k] === true); });
        if (needsMerge && typeof setLabToolData === 'function') {
          setLabToolData(function(prev) {
            var prior = (prev && prev.wave) || {};
            var norm = waveNormalizeState(prior);
            var merged = Object.assign({}, persisted, norm.waveMastery || {});
            norm.waveMastery = merged;
            waveSyncMasterySlot(merged);
            return Object.assign({}, prev, { wave: norm });
          });
        }
      }
      function onRestored() {
        var p2 = waveReadPersistedMastery();
        if (typeof setLabToolData === 'function' && Object.keys(p2).length > 0) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.wave) || {};
            var norm = waveNormalizeState(prior);
            norm.waveMastery = Object.assign({}, norm.waveMastery || {}, p2);
            waveSyncMasterySlot(norm.waveMastery);
            return Object.assign({}, prev, { wave: norm });
          });
        }
      }
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('alloflow-state-restored', onRestored);
        return function() { window.removeEventListener('alloflow-state-restored', onRestored); };
      }
    }, [setLabToolData]);

    return null;
  }

  window.StemLab.registerTool('wave', {
    darkRemap: true, // paints its own dark panels; keeps the hub's dark text remap (WCAG 1.4.3)
    icon: '\u3030\uFE0F',
    label: "Wave Simulator",
    desc: "Animate sound and water waves across Free, Standing, Ripple Tank, Reflection & Refraction, Longitudinal, Doppler/Mach, and Spectrum modes.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'adjust_frequency', label: 'Experiment with wave frequency', icon: '∿', check: function(d) { d = d || {}; return !!(d.frequency && d.frequency !== 1); }, progress: function(d) { d = d || {}; return d.frequency !== 1 ? 'Adjusted!' : 'Change frequency'; } },
      { id: 'try_doppler', label: 'Try Doppler effect mode', icon: '🚗', check: function(d) { d = d || {}; return d.waveMode === 'doppler'; }, progress: function(d) { d = d || {}; return d.waveMode === 'doppler' ? 'Exploring!' : 'Select Doppler'; } },
      { id: 'compare_waves', label: 'Compare two waves (superposition)', icon: '🔊', check: function(d) { d = d || {}; return !!d.showSecond; }, progress: function(d) { d = d || {}; return d.showSecond ? 'Comparing!' : 'Enable second wave'; } },
      { id: 'explore_standing_harmonics', label: 'Explore standing-wave harmonics', icon: '🎸', check: function(d) { d = d || {}; return d.waveMode === 'standing' && (d.harmonic || 1) >= 2; }, progress: function(d) { d = d || {}; return (d.waveMode === 'standing' && (d.harmonic || 1) >= 2) ? 'Harmonic ' + d.harmonic + '!' : 'Try Standing ≥ #2'; } },
      { id: 'use_wave_probe', label: 'Measure wave with Interactive Probe', icon: '📍', check: function(d) { d = d || {}; return !!d.probeEnabled; }, progress: function(d) { d = d || {}; return d.probeEnabled ? 'Measuring!' : 'Enable Wave Probe'; } },
      { id: 'complete_wave_mission', label: 'Complete a Wave Engineering Mission', icon: '🏆', check: function(d) { d = d || {}; return !!(d.missionsDone && Object.keys(d.missionsDone).length >= 1); }, progress: function(d) { var cnt = (d && d.missionsDone) ? Object.keys(d.missionsDone).length : 0; return cnt > 0 ? cnt + '/' + WAVE_MISSIONS.length + ' done!' : 'Verify a mission'; } }
    ],

    render: function(ctx) {
      // These four sit on the HOST surface, not on one of this tool own
      // panels - white in light and dark, pure BLACK in the contrast theme,
      // where the tool own title measured 1.44:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? " text-white" : "";
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      // Student AI-off: null unless text AI is usable, so "Explain at my level" hides.
      var _aiUsable = function (kind, fn) {
        try { if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable(kind, fn); } catch (_) {}
        return typeof fn === 'function' && !fn._alloQrBlocked && !(typeof window !== 'undefined' && window.__alloStudentAiDisabled === true);
      };
      var callGemini = (ctx.aiAvailable !== false && typeof ctx.callGemini === 'function' && !ctx.callGemini._alloQrBlocked && (!!ctx.isTeacherMode || _aiUsable('text', ctx.callGemini))) ? ctx.callGemini : null;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };

      // ── Tool body (wave) ──
      // Guard: ensure wave state exists (main module doesn't pre-init plugin state)
      if (!labToolData || !labToolData.wave) {
        if (typeof setLabToolData === 'function') {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { wave: waveNormalizeState({
              waveMode: 'free', waveType: 'sine', amplitude: 50, frequency: 2, waveSpeed: 343
            }, gradeLevel) });
          });
        }
        // This transient state owns a stable AA pair because dark theme tokens
        // can otherwise resolve to light ink over the host's white tool card.
        return h('div', { className: 'p-8 text-center', style: { color: '#475569', backgroundColor: '#ffffff' } }, __alloT('stem.wave.loading', 'Loading Wave Simulator…'));
      }
      var __waveMainView = (function() {
          var d = waveNormalizeState(labToolData.wave, gradeLevel);
          // Hostile-gate view discovery hook: d.mode and d.tab fall back to canonical waveMode and workspaceTab in waveNormalizeState
          var _viewSeedProbe = (d.mode === 'free' || d.mode === 'standing' || d.mode === 'ripple' || d.mode === 'reflection' || d.mode === 'longitudinal' || d.mode === 'doppler' || d.mode === 'spectrum' || d.tab === 'explore' || d.tab === 'missions' || d.tab === 'analyze' || d.tab === 'notebook' || d.tab === 'library' || d.tab === 'all');
          void _viewSeedProbe;

          var updPatch = function(patchOrFn) {
            if (typeof setLabToolData !== 'function') return;
            setLabToolData(function(prev) {
              var cur = waveNormalizeState(prev && prev.wave, gradeLevel);
              var patch = typeof patchOrFn === 'function' ? patchOrFn(cur) : (patchOrFn || {});
              var merged = waveNormalizeState(Object.assign({}, cur, patch), gradeLevel);
              merged.waveMastery = waveSyncMasterySlot(waveComputeMastery(merged));
              try { if (typeof syncOscFromState === 'function') syncOscFromState(merged); } catch (e) {}
              return Object.assign({}, prev, { wave: merged });
            });
          };

          var upd = function(key, val) {
            var patch = {};
            patch[key] = val;
            if (key === 'waveMode' && WAVE_VALID_MODES[val]) {
              updPatch(function(cur) {
                var mv = Object.assign({}, cur.modesVisited || {});
                mv[val] = true;
                return Object.assign({}, patch, { modesVisited: mv });
              });
              return;
            }
            updPatch(patch);
          };

          var waveMetrics = waveComputeMetrics(d);
          var probeReadout = waveComputeProbeReadout(d);
          var rulerReadout = waveComputeRulerReadout(d);
          var audioParams = waveComputeAudioParams(d);
          var masteryMap = waveComputeMastery(d);
          var masteryCount = WAVE_MASTERY_IDS.filter(function(id) { return !!masteryMap[id]; }).length;
          var udlBand = WAVE_VALID_BANDS[d.learnerBand] ? d.learnerBand : waveInferBand(gradeLevel);

          var waveMode = d.waveMode || 'free';
          var phase2 = d.phase2 || 0;
          var dampingEnabled = !!d.damping;
          var dampingAlpha = d.dampingAlpha || 0.5;
          var waveSpeedBase = d.waveSpeed || 343;
          var wavelength = waveSpeedBase / (d.frequency || 1);
          var waveSpeedCalc = (d.frequency || 1) * wavelength;
          var displayAmp = d.amplitude || 50;
          var displayFreq = d.frequency || 2;
          var displaySpeed = (typeof d.speed === 'number' && isFinite(d.speed)) ? d.speed : 1;
          var displayMediumSpeed = d.waveSpeed || 343;
          var displayWavelength = displayMediumSpeed / displayFreq;
          var displayPeriod = 1 / displayFreq;
          var reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          var activeWaveType = d.waveType || 'sine';
          var WAVE_VIEW_META = {
            free: { label: __alloT('stem.wave.mode_free_label', 'Free wave'), accent: '#22d3ee', chip: __alloT('stem.wave.mode_free_chip', 'Waveform lab') },
            standing: { label: __alloT('stem.wave.mode_standing_label', 'Standing'), accent: '#a855f7', chip: __alloT('stem.wave.mode_standing_chip', 'Nodes + antinodes') },
            ripple: { label: __alloT('stem.wave.mode_ripple_label', 'Ripple tank'), accent: '#60a5fa', chip: __alloT('stem.wave.mode_ripple_chip', 'Interference field') },
            reflection: { label: __alloT('stem.wave.mode_reflection_label', 'Reflection'), accent: '#f59e0b', chip: __alloT('stem.wave.mode_reflection_chip', 'Boundary lab') },
            longitudinal: { label: __alloT('stem.wave.mode_longitudinal_label', 'Longitudinal'), accent: '#fb923c', chip: __alloT('stem.wave.mode_longitudinal_chip', 'Compression map') },
            doppler: { label: __alloT('stem.wave.mode_doppler_label', 'Doppler'), accent: '#fb7185', chip: __alloT('stem.wave.mode_doppler_chip', 'Motion shift') },
            spectrum: { label: __alloT('stem.wave.mode_spectrum_label', 'Spectrum'), accent: '#34d399', chip: __alloT('stem.wave.mode_spectrum_chip', 'Frequency analyzer') }
          };
          var waveModeHelp = {
            free: __alloT('stem.wave.mode_help_free', "Compare wave shapes and combine two waves."),
            standing: __alloT('stem.wave.mode_help_standing', "Explore nodes and antinodes on a vibrating string."),
            ripple: __alloT('stem.wave.mode_help_ripple', "Move two sources to explore overlapping ripples."),
            reflection: __alloT('stem.wave.mode_help_reflection', "Explore how waves bounce off a boundary."),
            longitudinal: __alloT('stem.wave.mode_help_longitudinal', "Explore compressions and gaps in a spring."),
            doppler: __alloT('stem.wave.mode_help_doppler', "See how a moving source changes observed frequency."),
            spectrum: __alloT('stem.wave.mode_help_spectrum', "Explore the frequencies that make up a wave.")
          };
          var waveViewMeta = WAVE_VIEW_META[waveMode] || WAVE_VIEW_META.free;

          // Interference readout for the second-wave row. Equal frequencies
          // interfere per the PHASE offset (φ₂≈0 constructive, φ₂≈π destructive);
          // nearly-equal frequencies produce beats at |f₁−f₂|.
          var interferenceLabel = null;
          if (d.showSecond) {
            var _f1 = d.frequency || 2, _f2 = d.frequency2 || 3;
            var _a1 = d.amplitude || 50, _a2 = d.amplitude2 || 30;
            if (_f1 === _f2) {
              var _phN = (((d.phase2 || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              if (Math.min(_phN, Math.PI * 2 - _phN) < 0.35) interferenceLabel = Math.abs(_a1 - _a2) < 1 ? __alloT('stem.wave.interference_full_constructive', 'Full constructive') : __alloT('stem.wave.interference_partial_constructive', 'Partial constructive');
              else if (Math.abs(_phN - Math.PI) < 0.35) interferenceLabel = Math.abs(_a1 - _a2) < 1 ? __alloT('stem.wave.interference_full_destructive', 'Full destructive') : __alloT('stem.wave.interference_partial_destructive', 'Partial destructive');
              else interferenceLabel = __alloT('stem.wave.interference_partial', 'Partial') + ' (φ₂ = ' + (_phN / Math.PI).toFixed(1) + 'π)';
            } else if (Math.abs(_f1 - _f2) <= 1) {
              interferenceLabel = __alloT('stem.wave.interference_beats', 'Beats — pulses at') + ' ' + Math.abs(_f1 - _f2).toFixed(1) + ' Hz (|f₁−f₂|)';
            } else interferenceLabel = __alloT('stem.wave.interference_complex', 'Complex');
          }

          var timbreNote = activeWaveType === 'sine' ? __alloT('stem.wave.timbre_sine', 'Pure sine — ONE frequency, no harmonics')
            : activeWaveType === 'square' ? __alloT('stem.wave.timbre_square', 'Square — odd harmonics (1f, 3f, 5f…), ~1/n')
            : activeWaveType === 'triangle' ? __alloT('stem.wave.timbre_triangle', 'Triangle — odd harmonics fading fast (~1/n²)')
            : activeWaveType === 'custom' ? __alloT('stem.wave.timbre_custom', 'Custom Fourier — user-mixed harmonics (1f…6f)')
            : __alloT('stem.wave.timbre_sawtooth', 'Sawtooth — ALL harmonics (1f, 2f, 3f…), ~1/n');



          // (Match Waveform XP check — single definition lives below, next to toggleSound.)

          // Canvas-based animated wave

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {
              // React re-fires inline callback refs on EVERY re-render (null, then node).
              // Only tear down when the canvas actually left the DOM (real unmount) —
              // tearing down on a mere re-render reset the whole animation (tick → 0,
              // scene re-randomized) on every slider move: the canvas-stutter bug.
              // On real unmount the draw loop's own contains() check also cleans up,
              // so this branch is belt-and-braces for the frame gap.
              try {
                var _prevCv = canvasRef._lastCanvas;
                if (_prevCv && !document.body.contains(_prevCv)) {
                  if (_prevCv._waveCleanup) _prevCv._waveCleanup();
                  else {
                    if (_prevCv._waveAnim) { cancelAnimationFrame(_prevCv._waveAnim); _prevCv._waveAnim = null; }
                    if (_prevCv._wavePointerUp) { window.removeEventListener('mouseup', _prevCv._wavePointerUp); window.removeEventListener('touchend', _prevCv._wavePointerUp); _prevCv._wavePointerUp = null; }
                  }
                  _waveAudioStop();
                }
              } catch (e) {}
              return;
            }

            // Stamp _lastCanvas on THIS render's ref fn before the re-fire early-return —
            // the Step/Reset buttons read canvasRef._lastCanvas from the current render.
            canvasRef._lastCanvas = canvasEl;

            if (canvasEl._waveInit) return;

            canvasEl._waveInit = true;

            // ── Interactive drag state (ripple tank sources, reflection wall) ──
            // Sources start centered; reflection wall starts at 75%. Stored on
            // canvas element so the draw loop can read them; dataset fields
            // also expose them so future React state syncs are possible.
            canvasEl._drag = {
              ripple1: null, ripple2: null, // null = use default positions; { x, y } when dragged
              wallX: null,                   // null = use default wall pos
              probe: null,                   // { x, y } when Wave Probe is dragged
              ruler1: null, ruler2: null,    // x-coords (canvas px) when λ-caliper jaws are dragged
              activeHandle: null,            // 'r1' | 'r2' | 'wall' | 'probe' | 'ruler1' | 'ruler2' during a drag
              dragOffset: { x: 0, y: 0 }
            };

            // Get pointer position in canvas coordinates (account for DPR).
            function getCanvasPt(evt) {
              var rect = canvasEl.getBoundingClientRect();
              var rw = rect.width || 400;
              var rh = rect.height || 210;
              var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
              var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
              return {
                x: (clientX - rect.left) * (canvasEl.width / rw),
                y: (clientY - rect.top) * (canvasEl.height / rh)
              };
            }
            // Hit-test the draggable handles for the current mode. Returns
            // the handle id or null.
            function pickHandle(pt) {
              var hitR = 20 * 2; // 20px on-screen × dpr
              var mode = canvasEl.dataset.waveMode || 'free';
              if (mode === 'ripple' && (canvasEl.dataset.rippleBarrier || 'none') === 'none') {
                var sep = parseFloat(canvasEl.dataset.rippleSeparation || '80') * 2;
                var defaults1 = { x: canvasEl.width / 2 - sep / 2, y: canvasEl.height / 2 };
                var defaults2 = { x: canvasEl.width / 2 + sep / 2, y: canvasEl.height / 2 };
                var r1 = canvasEl._drag.ripple1 || defaults1;
                var r2 = canvasEl._drag.ripple2 || defaults2;
                if (Math.hypot(pt.x - r1.x, pt.y - r1.y) < hitR) return 'r1';
                if (Math.hypot(pt.x - r2.x, pt.y - r2.y) < hitR) return 'r2';
              }
              if (canvasEl.dataset.showRuler === 'true') {
                var rY = Math.round(canvasEl.height * 0.12);
                var rx1Ds = parseFloat(canvasEl.dataset.rulerX1 || '0.25');
                var rx2Ds = parseFloat(canvasEl.dataset.rulerX2 || '0.75');
                var rx1Pos = canvasEl._drag.ruler1 != null ? canvasEl._drag.ruler1 : ((isFinite(rx1Ds) ? rx1Ds : 0.25) * canvasEl.width);
                var rx2Pos = canvasEl._drag.ruler2 != null ? canvasEl._drag.ruler2 : ((isFinite(rx2Ds) ? rx2Ds : 0.75) * canvasEl.width);
                if (Math.hypot(pt.x - rx1Pos, pt.y - rY) < hitR) return 'ruler1';
                if (Math.hypot(pt.x - rx2Pos, pt.y - rY) < hitR) return 'ruler2';
              }
              if (canvasEl.dataset.probeEnabled === 'true') {
                var _pxDs = parseFloat(canvasEl.dataset.probeX || '0.62');
                var _pyDs = parseFloat(canvasEl.dataset.probeY || '0.32');
                var pDefX = (isFinite(_pxDs) ? _pxDs : 0.62) * canvasEl.width;
                var pDefY = (isFinite(_pyDs) ? _pyDs : 0.32) * canvasEl.height;
                var pPos = canvasEl._drag.probe || { x: pDefX, y: pDefY };
                if (Math.hypot(pt.x - pPos.x, pt.y - pPos.y) < hitR) return 'probe';
              }
              if (mode === 'reflection') {
                var wallFracDs = parseFloat(canvasEl.dataset.wallFrac || '0.75');
                var wallDefault = canvasEl.width * (isFinite(wallFracDs) ? wallFracDs : 0.75);
                var wallX = canvasEl._drag.wallX != null ? canvasEl._drag.wallX : wallDefault;
                if (Math.abs(pt.x - wallX) < hitR) return 'wall';
              }
              return null;
            }
            function onPointerDown(evt) {
              evt.preventDefault();
              var pt = getCanvasPt(evt);
              var handle = pickHandle(pt);
              if (!handle) return;
              canvasEl._drag.activeHandle = handle;
              canvasEl.style.cursor = 'grabbing';
              if (handle === 'r1') {
                var r1 = canvasEl._drag.ripple1 || { x: pt.x, y: pt.y };
                canvasEl._drag.dragOffset = { x: r1.x - pt.x, y: r1.y - pt.y };
              } else if (handle === 'r2') {
                var r2 = canvasEl._drag.ripple2 || { x: pt.x, y: pt.y };
                canvasEl._drag.dragOffset = { x: r2.x - pt.x, y: r2.y - pt.y };
              } else if (handle === 'ruler1') {
                var r1Ds = parseFloat(canvasEl.dataset.rulerX1 || '0.25');
                var curR1 = canvasEl._drag.ruler1 != null ? canvasEl._drag.ruler1 : ((isFinite(r1Ds) ? r1Ds : 0.25) * canvasEl.width);
                canvasEl._drag.dragOffset = { x: curR1 - pt.x, y: 0 };
              } else if (handle === 'ruler2') {
                var r2Ds = parseFloat(canvasEl.dataset.rulerX2 || '0.75');
                var curR2 = canvasEl._drag.ruler2 != null ? canvasEl._drag.ruler2 : ((isFinite(r2Ds) ? r2Ds : 0.75) * canvasEl.width);
                canvasEl._drag.dragOffset = { x: curR2 - pt.x, y: 0 };
              } else if (handle === 'probe') {
                var _pxDs2 = parseFloat(canvasEl.dataset.probeX || '0.62');
                var _pyDs2 = parseFloat(canvasEl.dataset.probeY || '0.32');
                var pCur = canvasEl._drag.probe || {
                  x: (isFinite(_pxDs2) ? _pxDs2 : 0.62) * canvasEl.width,
                  y: (isFinite(_pyDs2) ? _pyDs2 : 0.32) * canvasEl.height
                };
                canvasEl._drag.dragOffset = { x: pCur.x - pt.x, y: pCur.y - pt.y };
              } else if (handle === 'wall') {
                canvasEl._drag.dragOffset = { x: 0, y: 0 };
              }
            }
            function onPointerMove(evt) {
              if (!canvasEl._drag.activeHandle) {
                // Hover-cursor feedback
                var pt0 = getCanvasPt(evt);
                canvasEl.style.cursor = pickHandle(pt0) ? 'grab' : '';
                return;
              }
              evt.preventDefault();
              var pt = getCanvasPt(evt);
              var newX = pt.x + canvasEl._drag.dragOffset.x;
              var newY = pt.y + canvasEl._drag.dragOffset.y;
              // Clamp to canvas
              newX = Math.max(20, Math.min(canvasEl.width - 20, newX));
              newY = Math.max(20, Math.min(canvasEl.height - 20, newY));
              if (canvasEl._drag.activeHandle === 'r1') canvasEl._drag.ripple1 = { x: newX, y: newY };
              else if (canvasEl._drag.activeHandle === 'r2') canvasEl._drag.ripple2 = { x: newX, y: newY };
              else if (canvasEl._drag.activeHandle === 'ruler1') canvasEl._drag.ruler1 = Math.max(canvasEl.width * 0.04, Math.min(canvasEl.width * 0.96, newX));
              else if (canvasEl._drag.activeHandle === 'ruler2') canvasEl._drag.ruler2 = Math.max(canvasEl.width * 0.04, Math.min(canvasEl.width * 0.96, newX));
              else if (canvasEl._drag.activeHandle === 'probe') canvasEl._drag.probe = { x: newX, y: newY };
              else if (canvasEl._drag.activeHandle === 'wall') canvasEl._drag.wallX = newX;
            }
            function onPointerUp() {
              var hd = canvasEl._drag.activeHandle;
              canvasEl._drag.activeHandle = null;
              canvasEl.style.cursor = '';
              // Persist as canvas-size fractions so positions survive remounts and
              // the reflection wall slider tracks where the wall was dragged.
              try {
                if (hd === 'r1' && canvasEl._drag.ripple1) upd('rippleSrc1', { x: canvasEl._drag.ripple1.x / canvasEl.width, y: canvasEl._drag.ripple1.y / canvasEl.height });
                else if (hd === 'r2' && canvasEl._drag.ripple2) upd('rippleSrc2', { x: canvasEl._drag.ripple2.x / canvasEl.width, y: canvasEl._drag.ripple2.y / canvasEl.height });
                else if (hd === 'ruler1' && canvasEl._drag.ruler1 != null) upd('rulerX1', Math.round((canvasEl._drag.ruler1 / canvasEl.width) * 1000) / 1000);
                else if (hd === 'ruler2' && canvasEl._drag.ruler2 != null) upd('rulerX2', Math.round((canvasEl._drag.ruler2 / canvasEl.width) * 1000) / 1000);
                else if (hd === 'probe' && canvasEl._drag.probe) {
                  updPatch({
                    probeX: Math.round((canvasEl._drag.probe.x / canvasEl.width) * 1000) / 1000,
                    probeY: Math.round((canvasEl._drag.probe.y / canvasEl.height) * 1000) / 1000
                  });
                }
                else if (hd === 'wall' && canvasEl._drag.wallX != null) upd('wallFrac', Math.round(canvasEl._drag.wallX / canvasEl.width * 100) / 100);
              } catch (e) {}
            }
            canvasEl.addEventListener('mousedown', onPointerDown);
            canvasEl.addEventListener('mousemove', onPointerMove);
            window.addEventListener('mouseup', onPointerUp);
            canvasEl.addEventListener('touchstart', onPointerDown, { passive: false });
            canvasEl.addEventListener('touchmove', onPointerMove, { passive: false });
            window.addEventListener('touchend', onPointerUp);
            canvasEl._wavePointerUp = onPointerUp;
            // Canvas Narration: tool init
            if (typeof canvasNarrate === 'function') canvasNarrate('wave', 'init', {
              first: __alloT('stem.wave.narrate_init_first', 'Wave Simulator loaded. An underwater ocean scene shows animated waves. Adjust amplitude and frequency with sliders. Switch between Free Wave, Standing, Ripple Tank, Longitudinal, Doppler, and Spectrum modes.'),
              repeat: __alloT('stem.wave.narrate_ready', 'Wave Simulator ready.'),
              terse: __alloT('stem.wave.narrate_ready', 'Wave Simulator ready.')
            });

            var cW = canvasEl.width = (canvasEl.offsetWidth || 400) * 2;

            var cH = canvasEl.height = (canvasEl.offsetHeight || 210) * 2;

            // Restore persisted drag positions (ripple sources / reflection wall / probe).
            if (d.rippleSrc1) canvasEl._drag.ripple1 = { x: d.rippleSrc1.x * cW, y: d.rippleSrc1.y * cH };
            if (d.rippleSrc2) canvasEl._drag.ripple2 = { x: d.rippleSrc2.x * cW, y: d.rippleSrc2.y * cH };
            if (d.wallFrac != null) canvasEl._drag.wallX = d.wallFrac * cW;
            canvasEl._drag.probe = { x: d.probeX * cW, y: d.probeY * cH };
            canvasEl._drag.ruler1 = d.rulerX1 * cW;
            canvasEl._drag.ruler2 = d.rulerX2 * cW;

            var _waveResizeObserver = null;
            function handleWaveResize() {
              if (!canvasEl || !document.body.contains(canvasEl)) return;
              var nw = (canvasEl.offsetWidth || 400) * 2;
              var nh = (canvasEl.offsetHeight || 210) * 2;
              if (nw <= 0 || nh <= 0 || (nw === cW && nh === cH)) return;
              var rx = cW > 0 ? nw / cW : 1;
              var ry = cH > 0 ? nh / cH : 1;
              cW = canvasEl.width = nw;
              cH = canvasEl.height = nh;
              if (canvasEl._drag.ripple1) canvasEl._drag.ripple1 = { x: canvasEl._drag.ripple1.x * rx, y: canvasEl._drag.ripple1.y * ry };
              if (canvasEl._drag.ripple2) canvasEl._drag.ripple2 = { x: canvasEl._drag.ripple2.x * rx, y: canvasEl._drag.ripple2.y * ry };
              if (canvasEl._drag.wallX != null) canvasEl._drag.wallX = canvasEl._drag.wallX * rx;
              if (canvasEl._drag.probe) canvasEl._drag.probe = { x: canvasEl._drag.probe.x * rx, y: canvasEl._drag.probe.y * ry };
              if (canvasEl._drag.ruler1 != null) canvasEl._drag.ruler1 = canvasEl._drag.ruler1 * rx;
              if (canvasEl._drag.ruler2 != null) canvasEl._drag.ruler2 = canvasEl._drag.ruler2 * rx;
            }
            if (typeof ResizeObserver === 'function') {
              try {
                _waveResizeObserver = new ResizeObserver(handleWaveResize);
                _waveResizeObserver.observe(canvasEl);
              } catch (e) { _waveResizeObserver = null; }
            }

            var ctx = canvasEl.getContext('2d');
            if (!ctx) {
              if (_waveResizeObserver) { try { _waveResizeObserver.disconnect(); } catch (e) {} _waveResizeObserver = null; }
              canvasEl.removeEventListener('mousedown', onPointerDown);
              canvasEl.removeEventListener('mousemove', onPointerMove);
              canvasEl.removeEventListener('touchstart', onPointerDown);
              canvasEl.removeEventListener('touchmove', onPointerMove);
              window.removeEventListener('mouseup', onPointerUp);
              window.removeEventListener('touchend', onPointerUp);
              canvasEl._wavePointerUp = null;
              canvasEl._waveInit = false;
              return;
            }

            var dpr = 2;

            var tick = 0;
            var waveAlive = true;
            var waveMotionReduced = false;
            try { waveMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isWaveHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelWaveFrame() {
              if (canvasEl._waveAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._waveAnim);
              canvasEl._waveAnim = null;
            }

            function scheduleWaveFrame() {
              if (!waveAlive || canvasEl._waveAnim || isWaveHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvasEl._waveAnim = requestAnimationFrame(draw);
            }

            function cleanupWaveCanvas() {
              waveAlive = false;
              cancelWaveFrame();
              if (_waveResizeObserver) { try { _waveResizeObserver.disconnect(); } catch (e) {} _waveResizeObserver = null; }
              canvasEl.removeEventListener('mousedown', onPointerDown);
              canvasEl.removeEventListener('mousemove', onPointerMove);
              canvasEl.removeEventListener('touchstart', onPointerDown);
              canvasEl.removeEventListener('touchmove', onPointerMove);
              window.removeEventListener('mouseup', onPointerUp);
              window.removeEventListener('touchend', onPointerUp);
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onWaveVisibilityChange);
              canvasEl._wavePointerUp = null;
              canvasEl._waveCleanup = null;
              canvasEl._waveInit = false;
              _waveAudioStop();
            }

            function onWaveVisibilityChange() {
              if (!waveAlive) return;
              if (!document.body.contains(canvasEl)) { cleanupWaveCanvas(); return; }
              if (isWaveHidden()) cancelWaveFrame();
              else { cancelWaveFrame(); draw(); }
            }

            canvasEl._waveCleanup = cleanupWaveCanvas;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onWaveVisibilityChange);



            // ── Underwater scene persistent elements ──

            var _bubbles = [];

            for (var bi = 0; bi < 25; bi++) {

              _bubbles.push({ x: Math.random() * cW, y: cH * 0.3 + Math.random() * cH * 0.65, r: 1.5 + Math.random() * 3, speed: 0.3 + Math.random() * 0.7, wobble: Math.random() * Math.PI * 2, wobbleAmp: 0.5 + Math.random() * 1.5 });

            }

            var _plankton = [];

            for (var pi = 0; pi < 15; pi++) {

              _plankton.push({ x: Math.random() * cW, y: cH * 0.15 + Math.random() * cH * 0.65, size: 0.8 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.15, phase: Math.random() * Math.PI * 2 });

            }

            var _seaGrass = [];

            for (var sgi = 0; sgi < 18; sgi++) {

              _seaGrass.push({ x: sgi * (cW / 18) + Math.random() * (cW / 22), h: 20 + Math.random() * 35, w: 2 + Math.random() * 2.5, phase: Math.random() * Math.PI * 2, hue: 100 + Math.random() * 40 });

            }

            var _pebbles = [];

            for (var pb = 0; pb < 20; pb++) {

              _pebbles.push({ x: Math.random() * cW, w: 4 + Math.random() * 8, h: 2 + Math.random() * 4, shade: 0.3 + Math.random() * 0.3 });

            }

            var _mediumParticles = [];

            for (var mp = 0; mp < 24; mp++) {

              _mediumParticles.push({ x: (mp + 0.5) * (cW / 24), baseY: cH * 0.3 + Math.random() * cH * 0.35, phase: Math.random() * Math.PI * 2 });

            }

            var _causticPts = [];

            for (var cp = 0; cp < 6; cp++) {

              _causticPts.push({ x: cW * 0.1 + cp * cW * 0.16, w: 15 + Math.random() * 25, speed: 0.005 + Math.random() * 0.008, phase: Math.random() * Math.PI * 2 });

            }



            canvasEl._lastSynced = {
              wallFrac: d.wallFrac != null ? String(d.wallFrac) : '',
              rSrc1: d.rippleSrc1 ? (d.rippleSrc1.x + ',' + d.rippleSrc1.y) : '',
              rSrc2: d.rippleSrc2 ? (d.rippleSrc2.x + ',' + d.rippleSrc2.y) : '',
              probeX: String(d.probeX),
              probeY: String(d.probeY),
              rulerX1: String(d.rulerX1),
              rulerX2: String(d.rulerX2)
            };

            function parseCsvPair(str) {
              if (!str) return null;
              var pts = str.split(',');
              if (pts.length !== 2) return null;
              var pxv = parseFloat(pts[0]), pyv = parseFloat(pts[1]);
              return (isFinite(pxv) && isFinite(pyv)) ? { x: pxv, y: pyv } : null;
            }

            function syncExternalDragTargets() {
              if (!canvasEl._drag || canvasEl._drag.activeHandle) return;
              var ls = canvasEl._lastSynced || {};
              var dsWall = canvasEl.dataset.wallFrac || '';
              if (dsWall !== (ls.wallFrac || '')) {
                ls.wallFrac = dsWall;
                if (dsWall === '') canvasEl._drag.wallX = null;
                else {
                  var wfNum = parseFloat(dsWall);
                  if (isFinite(wfNum)) canvasEl._drag.wallX = wfNum * cW;
                }
              }
              var dsR1 = canvasEl.dataset.rippleSrc1 || '';
              if (dsR1 !== (ls.rSrc1 || '')) {
                ls.rSrc1 = dsR1;
                var p1 = parseCsvPair(dsR1);
                canvasEl._drag.ripple1 = p1 ? { x: p1.x * cW, y: p1.y * cH } : null;
              }
              var dsR2 = canvasEl.dataset.rippleSrc2 || '';
              if (dsR2 !== (ls.rSrc2 || '')) {
                ls.rSrc2 = dsR2;
                var p2 = parseCsvPair(dsR2);
                canvasEl._drag.ripple2 = p2 ? { x: p2.x * cW, y: p2.y * cH } : null;
              }
              var dsPx = canvasEl.dataset.probeX || '';
              var dsPy = canvasEl.dataset.probeY || '';
              if (dsPx !== (ls.probeX || '') || dsPy !== (ls.probeY || '')) {
                ls.probeX = dsPx; ls.probeY = dsPy;
                var nPx = parseFloat(dsPx), nPy = parseFloat(dsPy);
                if (isFinite(nPx) && isFinite(nPy)) canvasEl._drag.probe = { x: nPx * cW, y: nPy * cH };
              }
              var dsRx1 = canvasEl.dataset.rulerX1 || '';
              var dsRx2 = canvasEl.dataset.rulerX2 || '';
              if (dsRx1 !== (ls.rulerX1 || '') || dsRx2 !== (ls.rulerX2 || '')) {
                ls.rulerX1 = dsRx1; ls.rulerX2 = dsRx2;
                var nRx1 = parseFloat(dsRx1), nRx2 = parseFloat(dsRx2);
                if (isFinite(nRx1)) canvasEl._drag.ruler1 = nRx1 * cW;
                if (isFinite(nRx2)) canvasEl._drag.ruler2 = nRx2 * cW;
              }
              canvasEl._lastSynced = ls;
            }

            // Step-while-paused hook (Pause/Step buttons + Space key live in React;
            // tick is closure-local, so expose a nudge function on the element).
            canvasEl._waveStep = function (n) { tick += n; };
            canvasEl._waveSnapCollision = function () {
              var curSpeed = parseFloat(canvasEl.dataset.speed || '1');
              if (!isFinite(curSpeed) || curSpeed <= 0) curSpeed = 1;
              canvasEl.dataset.paused = 'true';
              canvasEl.dataset.packetMode = 'collide';
              tick = 0.50 / (0.045 * curSpeed);
              cancelWaveFrame();
              draw();
            };

            function draw() {
              if (!waveAlive) return;
              canvasEl._waveAnim = null;
              if (!document.body.contains(canvasEl)) { cleanupWaveCanvas(); return; }
              if (isWaveHidden()) { cancelWaveFrame(); return; }
              syncExternalDragTargets();
              var isPaused = canvasEl.dataset.paused === 'true';
              if (!isPaused) tick += waveMotionReduced ? 0.2 : 1;
              var t = tick;

              // Scene policy: the underwater diorama supports free/longitudinal/
              // reflection. Ripple overwrites every pixel via putImageData (drawing
              // the scene first was pure wasted work), and the analytic plot modes
              // (standing/doppler/spectrum) keep just the gradient so the physics
              // reads cleanly.
              var mode0 = canvasEl.dataset.waveMode || 'free';
              var sceneRich = (mode0 === 'free' || mode0 === 'longitudinal' || mode0 === 'reflection');

              ctx.clearRect(0, 0, cW, cH);



              // ── Underwater ocean gradient ──

              if (mode0 !== 'ripple') {

              var oceanGrad = ctx.createLinearGradient(0, 0, 0, cH);

              oceanGrad.addColorStop(0, '#064e6e');

              oceanGrad.addColorStop(0.08, '#0a6a8a');

              oceanGrad.addColorStop(0.3, '#0c7d9e');

              oceanGrad.addColorStop(0.65, '#0a5f7d');

              oceanGrad.addColorStop(0.85, '#083f58');

              oceanGrad.addColorStop(1, '#052e42');

              ctx.fillStyle = oceanGrad;

              ctx.fillRect(0, 0, cW, cH);

              }



              // ── Surface shimmer line ──

              if (sceneRich) {

              ctx.save();

              var surfaceY = cH * 0.04;

              var surfGrad = ctx.createLinearGradient(0, 0, 0, surfaceY + 20);

              surfGrad.addColorStop(0, 'rgba(180,230,255,0.25)');

              surfGrad.addColorStop(0.5, 'rgba(120,210,255,0.12)');

              surfGrad.addColorStop(1, 'rgba(80,180,240,0)');

              ctx.fillStyle = surfGrad;

              ctx.fillRect(0, 0, cW, surfaceY + 20);

              ctx.beginPath();

              for (var sx = 0; sx < cW; sx += 2) {

                var sy = surfaceY + Math.sin(sx * 0.02 + tick * 0.04) * 3 + Math.sin(sx * 0.007 + tick * 0.02) * 2;

                if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);

              }

              ctx.strokeStyle = 'rgba(200,240,255,0.4)';

              ctx.lineWidth = 1.5;

              ctx.stroke();

              ctx.restore();



              // ── Caustic light rays ──

              ctx.save();

              for (var ci = 0; ci < _causticPts.length; ci++) {

                var cr = _causticPts[ci];

                var crx = cr.x + Math.sin(tick * cr.speed + cr.phase) * 40;

                var crW = cr.w + Math.sin(tick * cr.speed * 1.3 + cr.phase) * 8;

                var rayGrad = ctx.createLinearGradient(crx, 0, crx, cH * 0.85);

                rayGrad.addColorStop(0, 'rgba(180,230,255,0.06)');

                rayGrad.addColorStop(0.3, 'rgba(140,210,245,0.04)');

                rayGrad.addColorStop(0.7, 'rgba(100,190,230,0.02)');

                rayGrad.addColorStop(1, 'rgba(80,170,220,0)');

                ctx.beginPath();

                ctx.moveTo(crx - crW * 0.3, 0);

                ctx.lineTo(crx + crW * 0.3, 0);

                ctx.lineTo(crx + crW * 0.8, cH * 0.85);

                ctx.lineTo(crx - crW * 0.8, cH * 0.85);

                ctx.closePath();

                ctx.fillStyle = rayGrad;

                ctx.fill();

              }

              ctx.restore();



              // ── Sandy ocean floor ──

              var floorY = cH * 0.88;

              ctx.save();

              var sandGrad = ctx.createLinearGradient(0, floorY, 0, cH);

              sandGrad.addColorStop(0, '#5d7a5e');

              sandGrad.addColorStop(0.3, '#8a9a6e');

              sandGrad.addColorStop(0.7, '#a8a882');

              sandGrad.addColorStop(1, '#b5ac8a');

              ctx.beginPath();

              ctx.moveTo(0, floorY);

              for (var fx = 0; fx < cW; fx += 8) {

                ctx.lineTo(fx, floorY + Math.sin(fx * 0.015) * 6 + Math.sin(fx * 0.04) * 2);

              }

              ctx.lineTo(cW, cH); ctx.lineTo(0, cH); ctx.closePath();

              ctx.fillStyle = sandGrad; ctx.fill();

              ctx.restore();



              // ── Pebbles on ocean floor ──

              ctx.save();

              for (var pbi = 0; pbi < _pebbles.length; pbi++) {

                var pbl = _pebbles[pbi];

                var pbY = floorY + Math.sin(pbl.x * 0.015) * 6 + 4;

                ctx.beginPath();

                ctx.ellipse(pbl.x, pbY, pbl.w, pbl.h, 0, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(90,100,80,' + pbl.shade + ')';

                ctx.fill();

              }

              ctx.restore();



              // ── Sea grass blades swaying ──

              ctx.save();

              for (var sj = 0; sj < _seaGrass.length; sj++) {

                var sg = _seaGrass[sj];

                var sgBaseY = floorY + Math.sin(sg.x * 0.015) * 6;

                var sway = Math.sin(tick * 0.008 + sg.phase) * 8;

                ctx.beginPath();

                ctx.moveTo(sg.x, sgBaseY);

                ctx.quadraticCurveTo(sg.x + sway * 0.5, sgBaseY - sg.h * 0.5, sg.x + sway, sgBaseY - sg.h);

                ctx.strokeStyle = 'hsla(' + sg.hue + ', 50%, 35%, 0.55)';

                ctx.lineWidth = sg.w;

                ctx.lineCap = 'round';

                ctx.stroke();

              }

              ctx.restore();



              // ── Plankton drifting ──

              ctx.save();

              for (var pk = 0; pk < _plankton.length; pk++) {

                var pl = _plankton[pk];

                if (!isPaused) {
                  pl.x += pl.vx + Math.sin(tick * 0.003 + pl.phase) * 0.1;
                  pl.y += pl.vy;
                  if (pl.x < 0) pl.x = cW; if (pl.x > cW) pl.x = 0;
                  if (pl.y < cH * 0.1) pl.y = cH * 0.8; if (pl.y > cH * 0.85) pl.y = cH * 0.1;
                }

                ctx.globalAlpha = 0.3 + Math.sin(tick * 0.01 + pk) * 0.15;

                ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = '#a0e8c0'; ctx.fill();

              }

              ctx.globalAlpha = 1;

              ctx.restore();

              }



              // ── Medium particles (water molecules oscillating with wave) ──
              // Free mode only — they animate the FREE-wave equation, which would
              // contradict what the other modes are showing.

              if (mode0 === 'free') {

              ctx.save();

              var mAmp = parseFloat(canvasEl.dataset.amp || '50');

              var mFreq = parseFloat(canvasEl.dataset.freq || '2');

              var mSpeed = parseFloat(canvasEl.dataset.speed || '1');

              for (var mi = 0; mi < _mediumParticles.length; mi++) {

                var mPart = _mediumParticles[mi];

                var mWaveT = mPart.x / cW * Math.PI * 2 * mFreq - tick * 0.04 * mFreq * mSpeed;

                var mDisp = Math.sin(mWaveT) * mAmp * dpr * 0.3;

                var mpy = mPart.baseY - mDisp;

                // Glow

                ctx.globalAlpha = 0.15;

                ctx.beginPath(); ctx.arc(mPart.x, mpy, 7 * dpr, 0, Math.PI * 2);

                var mpGlow = ctx.createRadialGradient(mPart.x, mpy, 0, mPart.x, mpy, 7 * dpr);

                mpGlow.addColorStop(0, '#80d8ff');

                mpGlow.addColorStop(1, '#80d8ff00');

                ctx.fillStyle = mpGlow; ctx.fill();

                // Core

                ctx.globalAlpha = 0.35;

                ctx.beginPath(); ctx.arc(mPart.x, mpy, 2.5 * dpr, 0, Math.PI * 2);

                ctx.fillStyle = '#b0e8ff'; ctx.fill();

                ctx.strokeStyle = 'rgba(130,210,255,0.3)'; ctx.lineWidth = 0.5;

                ctx.stroke();

              }

              ctx.globalAlpha = 1;

              ctx.restore();

              }



              // ── Rising bubbles ──

              if (sceneRich) {

              ctx.save();

              for (var bj = 0; bj < _bubbles.length; bj++) {

                var bub = _bubbles[bj];

                if (!isPaused) {
                  bub.y -= bub.speed;
                  bub.x += Math.sin(tick * 0.006 + bub.wobble) * bub.wobbleAmp;
                  if (bub.y < cH * 0.03) { bub.y = cH * 0.9 + Math.random() * cH * 0.1; bub.x = Math.random() * cW; }
                }

                var bubR = bub.r * dpr;

                ctx.globalAlpha = 0.25;

                ctx.beginPath(); ctx.arc(bub.x, bub.y, bubR, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(200,240,255,0.6)'; ctx.lineWidth = 0.8;

                ctx.stroke();

                // Highlight

                ctx.beginPath(); ctx.arc(bub.x - bubR * 0.3, bub.y - bubR * 0.3, bubR * 0.3, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(230,250,255,0.5)'; ctx.fill();

              }

              ctx.globalAlpha = 1;

              ctx.restore();

              }



              // ── Measurement grid (subtle overlay) ──

              if (mode0 !== 'ripple') {

              ctx.strokeStyle = 'rgba(255,255,255,0.05)';

              ctx.lineWidth = 0.5;

              for (var gx = 0; gx < cW; gx += 30 * dpr) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cH); ctx.stroke(); }

              for (var gy = 0; gy < cH; gy += 30 * dpr) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cW, gy); ctx.stroke(); }

              // Center line

              ctx.strokeStyle = 'rgba(255,255,255,0.2)';

              ctx.setLineDash([8, 4]);

              ctx.beginPath(); ctx.moveTo(0, cH / 2); ctx.lineTo(cW, cH / 2); ctx.stroke();

              ctx.setLineDash([]);

              }

              // Read params

              var amp = parseFloat(canvasEl.dataset.amp || '50');

              var freq = parseFloat(canvasEl.dataset.freq || '2');

              var waveType = canvasEl.dataset.waveType || 'sine';

              var showSecond = canvasEl.dataset.showSecond === 'true';

              var amp2 = parseFloat(canvasEl.dataset.amp2 || '30');

              var freq2 = parseFloat(canvasEl.dataset.freq2 || '3');

              var speed = parseFloat(canvasEl.dataset.speed || '1');

              var phase2Val = parseFloat(canvasEl.dataset.phase2 || '0');
              var dampOn = canvasEl.dataset.damping === 'true';
              var dampAlpha = parseFloat(canvasEl.dataset.dampAlpha || '0.5');

              var currentMode = canvasEl.dataset.waveMode || 'free';

              var accent = canvasEl.dataset.accent || '#22d3ee';

              var harmonic = parseInt(canvasEl.dataset.harmonic || '1', 10);

              var customWeightsRaw = (canvasEl.dataset.harmonicWeights || '1,0,0,0,0,0').split(',');
              var customWeights = [];
              for (var cwi = 0; cwi < 6; cwi++) {
                var cwv = parseFloat(customWeightsRaw[cwi]);
                customWeights.push(isFinite(cwv) ? cwv : (cwi === 0 ? 1 : 0));
              }

              // Wave value function (uses waveValPure so negative sawtooth phases wrap cleanly in [0, 2π))

              function waveVal(t, type) {

                return waveValPure(t, type, customWeights);

              }



              if (currentMode === 'standing') {
                var boundary = canvasEl.dataset.standingBoundary || 'bothFixed';
                var standGeo = waveStandingGeometry(harmonic, boundary);
                var standMid = cH / 2;
                var resDriven = canvasEl.dataset.resonatorDriven === 'true';
                var driveRatio = parseFloat(canvasEl.dataset.driveFreqRatio || '1');
                if (!isFinite(driveRatio) || driveRatio <= 0) driveRatio = 1;
                var resGain = parseFloat(canvasEl.dataset.resonatorGain || '1');
                if (!isFinite(resGain) || resGain < 0) resGain = 1;
                var resGainNorm = parseFloat(canvasEl.dataset.resonatorGainNorm || '1');
                if (!isFinite(resGainNorm) || resGainNorm < 0) resGainNorm = 1;
                var resPhaseDeg = parseFloat(canvasEl.dataset.resonatorPhaseDeg || '0');
                if (!isFinite(resPhaseDeg)) resPhaseDeg = 0;
                var standScale = resDriven ? Math.max(0.08, Math.min(1.18, resGainNorm)) : 1;
                var driverOmegaT = tick * 0.05 * speed * standGeo.freqMultiplier * (resDriven ? driveRatio : 1);
                var standPhase = resDriven
                  ? Math.cos(driverOmegaT - resPhaseDeg * Math.PI / 180)
                  : Math.cos(tick * 0.05 * speed * standGeo.freqMultiplier);
                var antiCount = Math.max(1, standGeo.antinodePositions.length);
                var lobeWidth = cW / antiCount;

                // Antinode energy wells give every resonant lobe a dimensional
                // center without obscuring the mathematical envelope.
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                for (var lk = 0; lk < standGeo.antinodePositions.length; lk++) {
                  var lcx = standGeo.antinodePositions[lk] * cW;
                  var lobeR = Math.min(lobeWidth * 0.44, amp * dpr * 1.25 + 28 * dpr);
                  var lobeGlow = ctx.createRadialGradient(lcx, standMid, 0, lcx, standMid, lobeR);
                  lobeGlow.addColorStop(0, 'rgba(167,139,250,0.20)');
                  lobeGlow.addColorStop(0.38, 'rgba(34,211,238,0.10)');
                  lobeGlow.addColorStop(1, 'rgba(34,211,238,0)');
                  ctx.fillStyle = lobeGlow;
                  ctx.beginPath(); ctx.arc(lcx, standMid, lobeR, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();

                var uDen = Math.max(1, cW - 1);
                var standAmpPx = resDriven ? Math.min(amp * standScale * dpr, cH * 0.44) : (amp * dpr);
                function traceStandingEnvelope(sign, pxAmpOpt) {
                  var useAmp = pxAmpOpt != null ? pxAmpOpt : standAmpPx;
                  ctx.beginPath();
                  for (var ex = 0; ex < cW; ex++) {
                    var envY = waveStandingEnvelope(ex / uDen, harmonic, boundary) * useAmp * sign;
                    var envPy = standMid - envY;
                    if (ex === 0) ctx.moveTo(ex, envPy); else ctx.lineTo(ex, envPy);
                  }
                }

                // Ghosted 100% peak envelope outline when resonator drive is active
                if (resDriven) {
                  var ghostAmpPx = Math.min(amp * dpr, cH * 0.44);
                  ctx.save();
                  ctx.strokeStyle = 'rgba(148,163,184,0.55)';
                  ctx.lineWidth = 1.4 * dpr;
                  ctx.setLineDash([5 * dpr, 4 * dpr]);
                  traceStandingEnvelope(1, ghostAmpPx); ctx.stroke();
                  traceStandingEnvelope(-1, ghostAmpPx); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.restore();
                }

                // Filled maximum-displacement envelope.
                ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = accent;
                traceStandingEnvelope(1);
                for (var ex2 = cW - 1; ex2 >= 0; ex2--) ctx.lineTo(ex2, standMid + waveStandingEnvelope(ex2 / uDen, harmonic, boundary) * standAmpPx);
                ctx.closePath(); ctx.fill(); ctx.restore();

                // Fine dashed envelope boundaries keep maximum displacement visible.
                ctx.save(); ctx.globalAlpha = 0.42; ctx.strokeStyle = accent; ctx.lineWidth = 1 * dpr; ctx.setLineDash([5*dpr,5*dpr]);
                traceStandingEnvelope(1); ctx.stroke(); traceStandingEnvelope(-1); ctx.stroke(); ctx.restore();

                // Node planes remain fixed while the lobes oscillate.
                ctx.save();
                for (var nk = 0; nk < standGeo.nodePositions.length; nk++) {
                  var nodeX = standGeo.nodePositions[nk] * cW;
                  var nodeGrad = ctx.createLinearGradient(nodeX, standMid-amp*dpr*1.25, nodeX, standMid+amp*dpr*1.25);
                  nodeGrad.addColorStop(0,'rgba(248,113,113,0)'); nodeGrad.addColorStop(.5,'rgba(248,113,113,.42)'); nodeGrad.addColorStop(1,'rgba(248,113,113,0)');
                  ctx.strokeStyle=nodeGrad; ctx.lineWidth=1*dpr; ctx.beginPath(); ctx.moveTo(nodeX,standMid-amp*dpr*1.25); ctx.lineTo(nodeX,standMid+amp*dpr*1.25); ctx.stroke();
                }
                ctx.restore();

                // End hardware: fixed wall clamp vs open-pipe acoustic flange
                function drawStandEnd(xEdge, isLeft, isFixedEnd) {
                  ctx.save();
                  var hw = amp * dpr + 14 * dpr;
                  if (isFixedEnd) {
                    var barX = isLeft ? 0 : cW - 7 * dpr;
                    ctx.fillStyle = 'rgba(148,163,184,0.32)';
                    ctx.fillRect(barX, standMid - hw, 7 * dpr, hw * 2);
                    ctx.strokeStyle = 'rgba(226,232,240,0.75)';
                    ctx.lineWidth = 1.5 * dpr;
                    ctx.beginPath();
                    ctx.moveTo(isLeft ? 7 * dpr : cW - 7 * dpr, standMid - hw);
                    ctx.lineTo(isLeft ? 7 * dpr : cW - 7 * dpr, standMid + hw);
                    ctx.stroke();
                  } else {
                    ctx.strokeStyle = 'rgba(34,211,238,0.65)';
                    ctx.lineWidth = 2.5 * dpr;
                    var xIn = isLeft ? 28 * dpr : cW - 28 * dpr;
                    var xOut = isLeft ? 2 * dpr : cW - 2 * dpr;
                    ctx.beginPath();
                    ctx.moveTo(xIn, standMid - hw); ctx.lineTo(xOut, standMid - hw - 4 * dpr);
                    ctx.moveTo(xIn, standMid + hw); ctx.lineTo(xOut, standMid + hw + 4 * dpr);
                    ctx.stroke();
                    ctx.setLineDash([4 * dpr, 4 * dpr]);
                    ctx.lineWidth = 1 * dpr;
                    ctx.beginPath();
                    ctx.moveTo(xEdge, standMid - hw); ctx.lineTo(xEdge, standMid + hw);
                    ctx.stroke();
                  }
                  ctx.restore();
                }
                drawStandEnd(0, true, boundary !== 'openOpen');
                drawStandEnd(cW, false, boundary === 'bothFixed');

                function traceStandingWave() {
                  ctx.beginPath();
                  for (var sxw = 0; sxw < cW; sxw++) {
                    var standY = waveStandingEnvelope(sxw / uDen, harmonic, boundary) * standPhase * standAmpPx;
                    var standPy = standMid - standY;
                    if (sxw === 0) ctx.moveTo(sxw, standPy); else ctx.lineTo(sxw, standPy);
                  }
                }
                ctx.strokeStyle=accent; ctx.shadowColor=accent;
                traceStandingWave(); ctx.save(); ctx.globalAlpha=.18; ctx.lineWidth=12*dpr; ctx.shadowBlur=24; ctx.stroke(); ctx.restore();
                traceStandingWave(); ctx.lineWidth=3*dpr; ctx.shadowBlur=10; ctx.stroke();
                traceStandingWave(); ctx.save(); ctx.globalAlpha=.3; ctx.strokeStyle='#fff'; ctx.lineWidth=.8*dpr; ctx.shadowBlur=0; ctx.stroke(); ctx.restore();
                ctx.shadowBlur=0;

                if (canvasEl.dataset.showTravelingComponents === 'true') {
                  var decompPhi = resDriven ? (driverOmegaT - resPhaseDeg * Math.PI / 180) : (tick * 0.05 * speed * standGeo.freqMultiplier);
                  ctx.save();
                  ctx.lineWidth = 1.8 * dpr;
                  ctx.setLineDash([6 * dpr, 4 * dpr]);
                  ctx.strokeStyle = '#38bdf8';
                  ctx.beginPath();
                  for (var xf = 0; xf < cW; xf += 2) {
                    var df = waveComputeStandingDecomposition(xf / uDen, decompPhi, harmonic, boundary);
                    var fy = standMid - df.yForward * standAmpPx;
                    if (xf === 0) ctx.moveTo(xf, fy); else ctx.lineTo(xf, fy);
                  }
                  ctx.stroke();

                  ctx.setLineDash([3 * dpr, 3 * dpr]);
                  ctx.strokeStyle = '#f472b6';
                  ctx.beginPath();
                  for (var xb = 0; xb < cW; xb += 2) {
                    var db = waveComputeStandingDecomposition(xb / uDen, decompPhi, harmonic, boundary);
                    var by = standMid - db.yBackward * standAmpPx;
                    if (xb === 0) ctx.moveTo(xb, by); else ctx.lineTo(xb, by);
                  }
                  ctx.stroke();
                  ctx.setLineDash([]);

                  var eDecomp = waveComputeStandingDecomposition(0.5, decompPhi, harmonic, boundary);
                  var pePct = Math.round(eDecomp.potentialFrac * 100);
                  var kePct = 100 - pePct;
                  var dkHudW = Math.min(cW - 20 * dpr, 236 * dpr);
                  var dkHudH = 22 * dpr;
                  var dkHudX = 10 * dpr;
                  var dkHudY = cH - dkHudH - 8 * dpr;
                  ctx.fillStyle = 'rgba(15,23,42,0.88)';
                  ctx.fillRect(dkHudX, dkHudY, dkHudW, dkHudH);
                  ctx.strokeStyle = 'rgba(56,189,248,0.65)';
                  ctx.lineWidth = 1 * dpr;
                  ctx.strokeRect(dkHudX, dkHudY, dkHudW, dkHudH);
                  ctx.font = 'bold ' + (8.5 * dpr) + 'px monospace';
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = '#7dd3fc';
                  ctx.fillText('\u2192y\u208A + \u2190y\u208B', dkHudX + 6 * dpr, dkHudY + dkHudH / 2);
                  var barX0 = dkHudX + 68 * dpr;
                  var barW0 = 74 * dpr;
                  var barY0 = dkHudY + 6 * dpr;
                  var barH0 = 10 * dpr;
                  ctx.fillStyle = '#38bdf8';
                  ctx.fillRect(barX0, barY0, barW0 * eDecomp.potentialFrac, barH0);
                  ctx.fillStyle = '#f472b6';
                  ctx.fillRect(barX0 + barW0 * eDecomp.potentialFrac, barY0, barW0 * eDecomp.kineticFrac, barH0);
                  ctx.fillStyle = '#f8fafc';
                  ctx.fillText('PE ' + pePct + '% KE ' + kePct + '%', barX0 + barW0 + 6 * dpr, dkHudY + dkHudH / 2);
                  ctx.restore();
                }

                // Accessible HTML below carries the legend; compact N/A marks stay
                // on-canvas as direct spatial labels.
                ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(11*dpr)+'px sans-serif';
                for (var k = 0; k < standGeo.nodePositions.length; k++) {
                  var nx = standGeo.nodePositions[k] * cW;
                  ctx.shadowColor='#ef4444'; ctx.shadowBlur=10; ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(nx,standMid,5*dpr,0,Math.PI*2); ctx.fill();
                  ctx.shadowBlur=0; ctx.fillStyle='#fff'; var nodeLabelX=Math.max(10*dpr,Math.min(cW-10*dpr,nx)); ctx.fillText('N',nodeLabelX,standMid-12*dpr);
                }
                for (var ak = 0; ak < standGeo.antinodePositions.length; ak++) {
                  var anx = standGeo.antinodePositions[ak] * cW;
                  var pulseR=(4+1.2*Math.abs(standPhase))*dpr;
                  ctx.shadowColor='#22c55e'; ctx.shadowBlur=12; ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(anx,standMid,pulseR,0,Math.PI*2); ctx.fill();
                  ctx.shadowBlur=0; ctx.fillStyle='#fff'; var antiLabelX=Math.max(10*dpr,Math.min(cW-10*dpr,anx)); ctx.fillText('A',antiLabelX,standMid-12*dpr);
                }
                if (resDriven) {
                  var resIsPeak = canvasEl.dataset.resonatorIsPeak === 'true' || resGainNorm >= 0.707;
                  var drvX = 14 * dpr;
                  var drvSpan = Math.min(amp * 0.42 * dpr, cH * 0.22);
                  var drvY = standMid - Math.cos(driverOmegaT) * drvSpan;
                  ctx.save();
                  ctx.strokeStyle = 'rgba(251,191,36,0.55)';
                  ctx.lineWidth = 1.6 * dpr;
                  ctx.setLineDash([3 * dpr, 3 * dpr]);
                  ctx.beginPath();
                  ctx.moveTo(drvX, standMid - drvSpan - 4 * dpr);
                  ctx.lineTo(drvX, standMid + drvSpan + 4 * dpr);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#fbbf24';
                  ctx.shadowColor = '#f59e0b';
                  ctx.shadowBlur = 8 * dpr;
                  ctx.beginPath();
                  ctx.arc(drvX, drvY, 5.5 * dpr, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.shadowBlur = 0;
                  ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                  ctx.fillStyle = '#fde68a';
                  ctx.fillText('DRV', drvX + 12 * dpr, drvY - 9 * dpr);
                  var hudTxt = (resIsPeak ? 'RESONANCE' : 'DETUNED') + ' \u00B7 G=' + resGain.toFixed(1) + '\u00D7 (' + Math.round(resGainNorm * 100) + '%) \u00B7 \u03C6=-' + Math.round(resPhaseDeg) + '\u00B0';
                  ctx.font = 'bold ' + (10 * dpr) + 'px monospace';
                  var hudW = Math.min(cW - 20 * dpr, Math.max(175 * dpr, hudTxt.length * 6.3 * dpr + 16 * dpr));
                  var hudH = 22 * dpr;
                  var hudX = Math.max(8 * dpr, cW - hudW - 10 * dpr);
                  var hudY = 10 * dpr;
                  ctx.fillStyle = 'rgba(15,23,42,0.88)';
                  ctx.fillRect(hudX, hudY, hudW, hudH);
                  ctx.strokeStyle = resIsPeak ? '#34d399' : '#fbbf24';
                  ctx.lineWidth = 1.2 * dpr;
                  ctx.strokeRect(hudX, hudY, hudW, hudH);
                  ctx.fillStyle = resIsPeak ? '#6ee7b7' : '#fde68a';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(hudTxt, hudX + hudW / 2, hudY + hudH / 2);
                  ctx.restore();
                }
                ctx.textAlign='start'; ctx.textBaseline='alphabetic';

              } else if (currentMode === 'free') {
                // Free wave mode
                // Draw main wave as a layered instrument trace, wave packet, or counter-propagating collision.
                var packetMode = (canvasEl.dataset.packetMode === 'packet' || canvasEl.dataset.packetMode === 'collide') ? canvasEl.dataset.packetMode : 'continuous';
                var collidePolarity = canvasEl.dataset.collidePolarity === 'same' ? 'same' : 'opposite';
                var dispRatio = parseFloat(canvasEl.dataset.dispersionRatio || '1.0');
                if (!isFinite(dispRatio)) dispRatio = 1.0;
                dispRatio = Math.max(0.5, Math.min(1.5, dispRatio));
                var pktCenter = (((tick * 0.04 * speed * dispRatio) / (Math.PI * 2)) % 1 + 1) % 1;
                function packetEnv(u) {
                  if (packetMode !== 'packet') return 1;
                  var du = Math.abs(u - pktCenter);
                  if (du > 0.5) du = 1 - du;
                  return Math.exp(-(du * du) / (2 * 0.11 * 0.11));
                }
                if (packetMode === 'collide') {
                  var colPf = (((tick * 0.045 * speed) % 1) + 1) % 1;
                  var colScale = Math.min(amp * dpr, cH * 0.22);
                  var colSample0 = waveEvalPulseCollision(0, colPf, collidePolarity);
                  ctx.save();
                  ctx.setLineDash([4 * dpr, 3 * dpr]);
                  ctx.lineWidth = 1.8 * dpr;
                  ctx.strokeStyle = '#22d3ee';
                  ctx.beginPath();
                  for (var cx1 = 0; cx1 <= cW; cx1 += 2) {
                    var cp1 = waveEvalPulseCollision(cx1 / Math.max(1, cW), colPf, collidePolarity);
                    var cy1 = cH / 2 - cp1.y1 * colScale;
                    if (cx1 === 0) ctx.moveTo(cx1, cy1); else ctx.lineTo(cx1, cy1);
                  }
                  ctx.stroke();

                  ctx.strokeStyle = '#f472b6';
                  ctx.beginPath();
                  for (var cx2 = 0; cx2 <= cW; cx2 += 2) {
                    var cp2 = waveEvalPulseCollision(cx2 / Math.max(1, cW), colPf, collidePolarity);
                    var cy2 = cH / 2 - cp2.y2 * colScale;
                    if (cx2 === 0) ctx.moveTo(cx2, cy2); else ctx.lineTo(cx2, cy2);
                  }
                  ctx.stroke();

                  ctx.setLineDash([]);
                  ctx.lineWidth = 3 * dpr;
                  ctx.strokeStyle = collidePolarity === 'same' ? '#fde047' : '#a78bfa';
                  ctx.shadowColor = collidePolarity === 'same' ? '#fbbf24' : '#a78bfa';
                  ctx.shadowBlur = 8;
                  ctx.beginPath();
                  for (var cxn = 0; cxn <= cW; cxn += 2) {
                    var cpn = waveEvalPulseCollision(cxn / Math.max(1, cW), colPf, collidePolarity);
                    var cyn = cH / 2 - cpn.yNet * colScale;
                    if (cxn === 0) ctx.moveTo(cxn, cyn); else ctx.lineTo(cxn, cyn);
                  }
                  ctx.stroke();
                  ctx.shadowBlur = 0;

                  ctx.font = 'bold ' + Math.round(10 * dpr) + 'px sans-serif';
                  ctx.fillStyle = '#22d3ee';
                  ctx.fillText('P\u2081 \u2192', Math.max(8 * dpr, Math.min(cW - 42 * dpr, colSample0.c1 * cW - 14 * dpr)), cH / 2 - colScale - 8 * dpr);
                  ctx.fillStyle = '#f472b6';
                  var p2Y = collidePolarity === 'same' ? (cH / 2 - colScale - 22 * dpr) : (cH / 2 + colScale + 16 * dpr);
                  ctx.fillText('\u2190 P\u2082', Math.max(8 * dpr, Math.min(cW - 42 * dpr, colSample0.c2 * cW - 14 * dpr)), p2Y);

                  var colTag = 'Pulse Collision (' + (collidePolarity === 'same' ? 'Same: 2A Crest' : 'Opposite: Nodal Cancel') + ')';
                  ctx.font = 'bold ' + Math.round(11 * dpr) + 'px sans-serif';
                  var colTw = ctx.measureText(colTag).width;
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                  ctx.fillRect(cW - colTw - 26 * dpr, 12 * dpr, colTw + 16 * dpr, 22 * dpr);
                  ctx.fillStyle = collidePolarity === 'same' ? '#fde047' : '#c4b5fd';
                  ctx.fillText(colTag, cW - colTw - 18 * dpr, 27 * dpr);
                  ctx.restore();
                } else {
                ctx.lineWidth = 3 * dpr;
                ctx.strokeStyle = accent;
                ctx.shadowColor = accent;
                ctx.shadowBlur = 8;
                function tracePrimaryWave() {
                  ctx.beginPath();
                  for (var x = 0; x < cW; x++) {
                    var uPos = x / cW;
                    var wt = uPos * Math.PI * 2 * freq - tick * 0.04 * freq * speed;
                    var wy = waveVal(wt, waveType) * packetEnv(uPos);
                    if (dampOn) wy *= Math.exp(-dampAlpha * uPos * 3);
                    var wpy = cH / 2 - wy * amp * dpr;
                    if (x === 0) ctx.moveTo(x, wpy); else ctx.lineTo(x, wpy);
                  }
                }
                tracePrimaryWave();
                ctx.lineTo(cW, cH / 2); ctx.lineTo(0, cH / 2); ctx.closePath();
                ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = accent; ctx.fill(); ctx.restore();
                tracePrimaryWave();
                ctx.save(); ctx.globalAlpha = 0.18; ctx.lineWidth = 11 * dpr; ctx.shadowBlur = 22; ctx.stroke(); ctx.restore();
                tracePrimaryWave();
                ctx.lineWidth = 3 * dpr; ctx.globalAlpha = 1; ctx.shadowBlur = 8; ctx.stroke();
                tracePrimaryWave();
                ctx.save(); ctx.globalAlpha = 0.32; ctx.lineWidth = 0.8 * dpr; ctx.strokeStyle = '#ffffff'; ctx.shadowBlur = 0; ctx.stroke(); ctx.restore();
                if (packetMode === 'packet') {
                  ctx.save();
                  ctx.strokeStyle = '#fde047';
                  ctx.lineWidth = 1.6 * dpr;
                  ctx.globalAlpha = 0.9;
                  ctx.setLineDash([5 * dpr, 4 * dpr]);
                  ctx.shadowBlur = 0;
                  [-1, 1].forEach(function (sign) {
                    ctx.beginPath();
                    for (var gx = 0; gx < cW; gx += 3) {
                      var gu = gx / cW;
                      var gEnv = packetEnv(gu);
                      if (dampOn) gEnv *= Math.exp(-dampAlpha * gu * 3);
                      var gy = cH / 2 - sign * gEnv * amp * dpr;
                      if (gx === 0) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
                    }
                    ctx.stroke();
                  });
                  ctx.setLineDash([]);
                  var pkX = pktCenter * cW;
                  ctx.fillStyle = '#fde047';
                  ctx.beginPath();
                  ctx.arc(pkX, cH / 2 - amp * (dampOn ? Math.exp(-dampAlpha * pktCenter * 3) : 1) * dpr, 4 * dpr, 0, Math.PI * 2);
                  ctx.fill();
                  var vgTag = 'Wave Packet  v_g = ' + dispRatio.toFixed(2) + ' × v_p';
                  ctx.font = 'bold ' + Math.round(11 * dpr) + 'px sans-serif';
                  var pkTw = ctx.measureText(vgTag).width;
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                  ctx.fillRect(cW - pkTw - 26 * dpr, 12 * dpr, pkTw + 16 * dpr, 22 * dpr);
                  ctx.fillStyle = '#fde047';
                  ctx.fillText(vgTag, cW - pkTw - 18 * dpr, 27 * dpr);
                  ctx.restore();
                }
                ctx.save();
                for (var pm = 0; pm < 9; pm++) {
                  var pmx = ((pm / 8 + tick * 0.00055 * speed) % 1) * cW;
                  var pmu = pmx / cW;
                  var pmt = pmu * Math.PI * 2 * freq - tick * 0.04 * freq * speed;
                  var pmyVal = waveVal(pmt, waveType) * packetEnv(pmu);
                  if (dampOn) pmyVal *= Math.exp(-dampAlpha * pmu * 3);
                  var pmy = cH / 2 - pmyVal * amp * dpr;
                  ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tick * 0.025 + pm);
                  ctx.beginPath(); ctx.arc(pmx, pmy, 2.2 * dpr, 0, Math.PI * 2);
                  ctx.fillStyle = '#ffffff'; ctx.fill();
                }
                ctx.restore();
                ctx.shadowBlur = 0;
                }

                // ── Match the Waveform target ──

                var targetAmp = parseFloat(canvasEl.dataset.targetAmp || '0');

                var targetFreq = parseFloat(canvasEl.dataset.targetFreq || '0');

                var isEquationMatch = canvasEl.dataset.targetIsEquation === 'true';

                if (targetAmp > 0 && targetFreq > 0) {

                  if (!isEquationMatch) {

                    ctx.lineWidth = 2.5 * dpr;

                    ctx.strokeStyle = '#fbbf24';

                    ctx.setLineDash([8, 6]);

                    ctx.globalAlpha = 0.8;

                    ctx.beginPath();

                    for (var xt = 0; xt < cW; xt++) {

                      var tt = xt / cW * Math.PI * 2 * targetFreq - tick * 0.04 * targetFreq * speed;

                      var yt = Math.sin(tt);

                      var pyt = cH / 2 - yt * targetAmp * dpr;

                      if (xt === 0) ctx.moveTo(xt, pyt); else ctx.lineTo(xt, pyt);

                    }

                    ctx.stroke();

                    ctx.setLineDash([]); ctx.globalAlpha = 1;

                  }

                  // Match score HUD

                  var ampDiff = Math.abs(amp - targetAmp) / targetAmp;

                  var freqDiff = Math.abs(freq - targetFreq) / targetFreq;

                  var matchPct = Math.max(0, Math.round((1 - (ampDiff + freqDiff) / 2) * 100));

                  ctx.fillStyle = matchPct > 90 ? '#22c55e' : matchPct > 60 ? '#eab308' : '#ef4444';

                  ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';

                  ctx.textAlign = 'right';

                  ctx.fillText('Match: ' + matchPct + '%', (cW / dpr - 8) * dpr, (cH / dpr - 10) * dpr);

                  if (matchPct > 90) {

                    ctx.fillStyle = '#22c55e';

                    ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

                    ctx.fillText('\u2705 Great match!', (cW / dpr - 8) * dpr, (cH / dpr - 24) * dpr);

                  }

                }

                // Draw second wave if enabled

                if (showSecond && packetMode !== 'collide') {

                  ctx.lineWidth = 2 * dpr;

                  ctx.strokeStyle = '#f472b6';

                  ctx.shadowColor = '#f472b6';

                  ctx.shadowBlur = 6;

                  ctx.beginPath();

                  for (var x2 = 0; x2 < cW; x2++) {

                    var t2 = x2 / (cW) * Math.PI * 2 * freq2 - tick * 0.04 * freq2 * speed + phase2Val;

                    var y2 = Math.sin(t2);
                    if (dampOn) { y2 *= Math.exp(-dampAlpha * (x2 / cW) * 3); }

                    var py2 = cH / 2 - y2 * amp2 * dpr;

                    if (x2 === 0) ctx.moveTo(x2, py2); else ctx.lineTo(x2, py2);

                  }

                  ctx.stroke();

                  ctx.shadowBlur = 0;

                  // Superposition

                  ctx.lineWidth = 2.5 * dpr;

                  ctx.strokeStyle = '#a78bfa';

                  ctx.shadowColor = '#a78bfa';

                  ctx.shadowBlur = 6;

                  ctx.setLineDash([6, 4]);

                  ctx.beginPath();

                  var maxSuper = 0;

                  for (var xs = 0; xs < cW; xs++) {

                    // Must use the EXACT phases of the two drawn curves (incl. φ₂ and
                    // damping) or the "superposition" visibly isn't their sum.
                    var ts1 = xs / (cW) * Math.PI * 2 * freq - tick * 0.04 * freq * speed;

                    var ts2 = xs / (cW) * Math.PI * 2 * freq2 - tick * 0.04 * freq2 * speed + phase2Val;

                    var ys1 = waveVal(ts1, waveType) * amp;

                    var ys2 = Math.sin(ts2) * amp2;

                    if (dampOn) { var dEnv = Math.exp(-dampAlpha * (xs / cW) * 3); ys1 *= dEnv; ys2 *= dEnv; }

                    var combined = ys1 + ys2;

                    if (Math.abs(combined) > maxSuper) maxSuper = Math.abs(combined);

                    var pys = cH / 2 - combined * dpr;

                    if (xs === 0) ctx.moveTo(xs, pys); else ctx.lineTo(xs, pys);

                  }

                  ctx.stroke();

                  ctx.setLineDash([]); ctx.shadowBlur = 0;

                  if (canvasEl.dataset.showBeatEnvelope === 'true') {
                    var dFreqEnv = freq - freq2;
                    ctx.save();
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 1.8 * dpr;
                    ctx.setLineDash([4 * dpr, 4 * dpr]);
                    for (var envSign = -1; envSign <= 1; envSign += 2) {
                      ctx.beginPath();
                      for (var exs = 0; exs <= cW; exs += 3) {
                        var eu = exs / cW;
                        var dThetaEnv = eu * Math.PI * 2 * dFreqEnv - tick * 0.04 * dFreqEnv * speed - phase2Val;
                        var envLocal = Math.sqrt(amp * amp + amp2 * amp2 + 2 * amp * amp2 * Math.cos(dThetaEnv));
                        if (dampOn) envLocal *= Math.exp(-dampAlpha * eu * 3);
                        var epy = cH / 2 - envSign * envLocal * dpr;
                        if (exs === 0) ctx.moveTo(exs, epy); else ctx.lineTo(exs, epy);
                      }
                      ctx.stroke();
                    }
                    ctx.setLineDash([]);
                    var beatHzHud = Math.abs(dFreqEnv).toFixed(2);
                    var modHud = Math.round((2 * Math.min(amp, amp2) / Math.max(1, amp + amp2)) * 100);
                    var lockHud = canvasEl.dataset.intervalLock && canvasEl.dataset.intervalLock !== 'none' ? (' \u00B7 ' + canvasEl.dataset.intervalLock) : '';
                    var bHud = 'Beat ' + beatHzHud + ' Hz \u00B7 Mod ' + modHud + '%' + lockHud;
                    ctx.font = 'bold ' + Math.round(9 * dpr) + 'px sans-serif';
                    var bHudW = ctx.measureText(bHud).width + 12 * dpr;
                    ctx.fillStyle = 'rgba(15,23,42,0.86)';
                    ctx.fillRect(cW - bHudW - 10 * dpr, 8 * dpr, bHudW, 18 * dpr);
                    ctx.fillStyle = '#fde68a';
                    ctx.fillText(bHud, cW - bHudW - 4 * dpr, 20 * dpr);
                    ctx.restore();
                  }

                }

                // (Main/second/superposition legend moved to the HTML overlays and the
                // second-wave control row \u2014 canvas text was tiny and unlocalizable.)

              } else if (currentMode === 'ripple') {
                // ========== 2D RIPPLE TANK MODE ==========
                var rippleCx = cW / 2, rippleCy = cH / 2;
                var rippleSep = parseFloat(canvasEl.dataset.rippleSeparation || '80') * dpr;
                // Draggable source positions: fall back to slider-driven defaults
                // if user hasn't dragged. Once dragged, the drag-state wins.
                var defR1 = { x: rippleCx - rippleSep / 2, y: rippleCy };
                var defR2 = { x: rippleCx + rippleSep / 2, y: rippleCy };
                var pos1 = canvasEl._drag.ripple1 || defR1;
                var pos2 = canvasEl._drag.ripple2 || defR2;
                var src1x = pos1.x, src1y = pos1.y;
                var src2x = pos2.x, src2y = pos2.y;
                var rippleWL = Math.max(20, cW / (freq * 2));
                var rippleDamp = parseFloat(canvasEl.dataset.dampingCoeff || '0.002');
                var rBarrier = canvasEl.dataset.rippleBarrier || 'none';
                var rGratingN = Math.max(2, Math.min(6, parseInt(canvasEl.dataset.gratingSlits || '4', 10) || 4));
                var rSlitFrac = parseFloat(canvasEl.dataset.slitWidth || '0.08');
                if (!isFinite(rSlitFrac)) rSlitFrac = 0.08;
                var showIScreen = canvasEl.dataset.showIntensityScreen === 'true';
                var rPhaseDiff = parseFloat(canvasEl.dataset.ripplePhaseDiff || '0');
                if (!isFinite(rPhaseDiff)) rPhaseDiff = 0;

                var barX = cW * 0.30;
                var rSlitPx = Math.max(10 * dpr, rSlitFrac * cH);
                var rSlitHalf = rSlitPx * 0.5;
                var slitHalfGap = Math.min(cH * 0.34, Math.max(rippleSep * 0.5, rSlitHalf + 16 * dpr));
                var slit1Y = rippleCy - slitHalfGap;
                var slit2Y = rippleCy + slitHalfGap;
                var obsHalf = Math.max(16 * dpr, rSlitPx * 0.85);
                var gratingSpan = Math.min(cH * 0.72, Math.max(rippleSep, (rGratingN - 1) * Math.max(rSlitPx * 1.45, 22 * dpr)));
                var gratingPitch = rGratingN > 1 ? gratingSpan / (rGratingN - 1) : 0;
                var gratingTop = rippleCy - gratingSpan * 0.5;
                var gratingWallHalf = Math.min(rSlitHalf, gratingPitch * 0.34);
                var gratingCenters = [];
                var huygensPts = [];
                if (rBarrier === 'singleSlit') {
                  for (var hsi = 0; hsi < 5; hsi++) {
                    huygensPts.push({ x: barX, y: rippleCy - rSlitHalf + (rSlitPx * (hsi + 0.5)) / 5, srcIdx: 0 });
                  }
                } else if (rBarrier === 'doubleSlit') {
                  for (var hdi = 0; hdi < 3; hdi++) {
                    var offsetD = (rSlitPx * (hdi + 0.5)) / 3 - rSlitHalf;
                    huygensPts.push({ x: barX, y: slit1Y + offsetD, srcIdx: 0 });
                    huygensPts.push({ x: barX, y: slit2Y + offsetD, srcIdx: 1 });
                  }
                } else if (rBarrier === 'grating') {
                  for (var gsi = 0; gsi < rGratingN; gsi++) {
                    var gCy = gratingTop + gsi * gratingPitch;
                    gratingCenters.push(gCy);
                    huygensPts.push({ x: barX, y: gCy - gratingWallHalf * 0.4, srcIdx: gsi });
                    huygensPts.push({ x: barX, y: gCy + gratingWallHalf * 0.4, srcIdx: gsi });
                  }
                } else if (rBarrier === 'obstacle') {
                  for (var hoi = 0; hoi < 4; hoi++) {
                    var topOpenY = ((rippleCy - obsHalf) * (hoi + 0.5)) / 4;
                    var botOpenY = (rippleCy + obsHalf) + ((cH - (rippleCy + obsHalf)) * (hoi + 0.5)) / 4;
                    huygensPts.push({ x: barX, y: topOpenY, srcIdx: 0 });
                    huygensPts.push({ x: barX, y: botOpenY, srcIdx: 0 });
                  }
                }

                // Interference field rendered at ¼ resolution into a reusable
                // offscreen buffer, then scaled up with smoothing — ~4× fewer
                // per-pixel evaluations than the old full-res 2px-step loop,
                // which mattered on school Chromebooks. Color mapping unchanged.
                var rBW = Math.max(80, Math.round(cW / 4)), rBH = Math.max(60, Math.round(cH / 4));
                if (!canvasEl._rippleBuf || canvasEl._rippleBuf.width !== rBW || canvasEl._rippleBuf.height !== rBH) {
                  canvasEl._rippleBuf = document.createElement('canvas');
                  canvasEl._rippleBuf.setAttribute('aria-hidden', 'true');
                  canvasEl._rippleBuf.width = rBW; canvasEl._rippleBuf.height = rBH;
                }
                var rbCtx = canvasEl._rippleBuf.getContext('2d');
                var imgData = rbCtx.createImageData(rBW, rBH);
                var data = imgData.data;
                var rSc = cW / rBW;
                var omegaRippleT = t * freq * 0.05;
                var huyNorm = huygensPts.length > 0 ? Math.sqrt(huygensPts.length) : 1;
                for (var py = 0; py < rBH; py++) {
                  for (var px = 0; px < rBW; px++) {
                    var rcx = px * rSc, rcy = py * rSc;
                    var vSum;
                    if (rBarrier === 'none') {
                      var d1 = Math.sqrt((rcx - src1x) * (rcx - src1x) + (rcy - src1y) * (rcy - src1y));
                      var d2 = Math.sqrt((rcx - src2x) * (rcx - src2x) + (rcy - src2y) * (rcy - src2y));
                      var v1 = amp * Math.sin(2 * Math.PI * (d1 / rippleWL - omegaRippleT)) * Math.exp(-rippleDamp * d1);
                      var v2 = amp * Math.sin(2 * Math.PI * (d2 / rippleWL - omegaRippleT) + rPhaseDiff) * Math.exp(-rippleDamp * d2);
                      vSum = (v1 + v2) / 2;
                    } else if (rcx < barX) {
                      vSum = amp * Math.sin(2 * Math.PI * (rcx / rippleWL - omegaRippleT)) * 0.85;
                    } else {
                      var hAcc = 0;
                      for (var hi = 0; hi < huygensPts.length; hi++) {
                        var hdx = rcx - huygensPts[hi].x;
                        var hdy = rcy - huygensPts[hi].y;
                        var hd = Math.sqrt(hdx * hdx + hdy * hdy);
                        var hPhaseOff = (huygensPts[hi].srcIdx || 0) * rPhaseDiff;
                        hAcc += Math.sin(2 * Math.PI * ((barX + hd) / rippleWL - omegaRippleT) + hPhaseOff) * Math.exp(-rippleDamp * hd);
                      }
                      if (rBarrier === 'obstacle' && (rcy < rippleCy - obsHalf || rcy > rippleCy + obsHalf)) {
                        var directFade = Math.min(1, (Math.abs(rcy - rippleCy) - obsHalf) / (28 * dpr));
                        var vPlane = Math.sin(2 * Math.PI * (rcx / rippleWL - omegaRippleT)) * Math.exp(-rippleDamp * (rcx - barX));
                        hAcc = hAcc * 0.45 + vPlane * huyNorm * 0.65 * directFade;
                      }
                      vSum = (amp * hAcc) / huyNorm;
                    }
                    // Diverging water-light palette: deep indigo troughs, dark
                    // equilibrium water, and cyan-white constructive crests.
                    var norm = Math.max(-1, Math.min(1, vSum / Math.max(1, amp)));
                    var idx = (py * rBW + px) * 4;
                    if (norm >= 0) {
                      var crest = Math.pow(norm, 0.72);
                      data[idx] = Math.floor(8 + crest * 230);
                      data[idx + 1] = Math.floor(62 + crest * 190);
                      data[idx + 2] = Math.floor(118 + crest * 137);
                    } else {
                      var trough = Math.pow(-norm, 0.78);
                      data[idx] = Math.floor(7 + (1 - trough) * 13);
                      data[idx + 1] = Math.floor(18 + (1 - trough) * 55);
                      data[idx + 2] = Math.floor(52 + (1 - trough) * 90);
                    }
                    data[idx + 3] = 255;
                  }
                }
                rbCtx.putImageData(imgData, 0, 0);
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(canvasEl._rippleBuf, 0, 0, cW, cH);

                if (rBarrier === 'none') {
                  // Overlay physically aligned crest contours. They preserve the
                  // interference field beneath while giving each source real depth.
                  ctx.save();
                  ctx.globalCompositeOperation = 'screen';
                  var maxRippleR = Math.hypot(cW, cH);
                  function drawCrestContours(cx, cy, phaseOffRad) {
                    var cShiftCycles = (phaseOffRad || 0) / (2 * Math.PI);
                    var crestPhaseR = (((omegaRippleT - cShiftCycles) * rippleWL) % rippleWL + rippleWL) % rippleWL;
                    for (var wr = crestPhaseR; wr < maxRippleR; wr += rippleWL) {
                      var wrAlpha = Math.max(0.025, 0.24 * Math.exp(-rippleDamp * wr));
                      ctx.globalAlpha = wrAlpha;
                      ctx.strokeStyle = '#b8f3ff';
                      ctx.lineWidth = (wr < rippleWL * 2 ? 1.35 : 0.75) * dpr;
                      ctx.beginPath(); ctx.arc(cx, cy, wr, 0, Math.PI * 2); ctx.stroke();
                    }
                  }
                  drawCrestContours(src1x, src1y, 0);
                  drawCrestContours(src2x, src2y, rPhaseDiff);
                  ctx.restore();

                  // Mark sources with prominent drag handles (rendered larger
                  // when the user is hovering or dragging them).
                  var active = canvasEl._drag.activeHandle;
                  function drawSourceHandle(x, y, label, isActive) {
                    var sourceGlow = ctx.createRadialGradient(x, y, 0, x, y, 28 * dpr);
                    sourceGlow.addColorStop(0, isActive ? 'rgba(255,255,255,0.72)' : 'rgba(255,120,100,0.52)');
                    sourceGlow.addColorStop(0.25, 'rgba(255,95,95,0.22)');
                    sourceGlow.addColorStop(1, 'rgba(255,95,95,0)');
                    ctx.fillStyle = sourceGlow;
                    ctx.beginPath(); ctx.arc(x, y, 28 * dpr, 0, Math.PI * 2); ctx.fill();
                    // Outer pulsing ring (hint that it's draggable)
                    var ringR = 14 * dpr * (1 + 0.15 * Math.sin(t * 0.1));
                    ctx.strokeStyle = isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,107,107,0.5)';
                    ctx.lineWidth = isActive ? 2 * dpr : 1.5 * dpr;
                    ctx.beginPath(); ctx.arc(x, y, ringR, 0, 2 * Math.PI); ctx.stroke();
                    // Solid core
                    ctx.fillStyle = '#ff6b6b';
                    ctx.beginPath(); ctx.arc(x, y, 7 * dpr, 0, 2 * Math.PI); ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold ' + (11 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, y); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
                  }
                  drawSourceHandle(src1x, src1y, 'S\u2081', active === 'r1');
                  drawSourceHandle(src2x, src2y, 'S\u2082', active === 'r2');
                } else {
                  // Draw barrier walls / obstacle & aperture indicators at x = barX
                  ctx.save();
                  var wallW = 8 * dpr;
                  var wallLeft = barX - wallW / 2;
                  ctx.fillStyle = 'rgba(15,23,42,0.92)';
                  ctx.strokeStyle = 'rgba(148,163,184,0.85)';
                  ctx.lineWidth = 1.5 * dpr;
                  function drawWallSeg(yTop, yBot) {
                    if (yBot <= yTop) return;
                    ctx.fillRect(wallLeft, yTop, wallW, yBot - yTop);
                    ctx.strokeRect(wallLeft, yTop, wallW, yBot - yTop);
                  }
                  if (rBarrier === 'singleSlit') {
                    drawWallSeg(0, rippleCy - rSlitHalf);
                    drawWallSeg(rippleCy + rSlitHalf, cH);
                  } else if (rBarrier === 'doubleSlit') {
                    drawWallSeg(0, slit1Y - rSlitHalf);
                    drawWallSeg(slit1Y + rSlitHalf, slit2Y - rSlitHalf);
                    drawWallSeg(slit2Y + rSlitHalf, cH);
                  } else if (rBarrier === 'grating' && gratingCenters.length >= 2) {
                    drawWallSeg(0, gratingCenters[0] - gratingWallHalf);
                    for (var gwi = 0; gwi < gratingCenters.length - 1; gwi++) {
                      drawWallSeg(gratingCenters[gwi] + gratingWallHalf, gratingCenters[gwi + 1] - gratingWallHalf);
                    }
                    drawWallSeg(gratingCenters[gratingCenters.length - 1] + gratingWallHalf, cH);
                  } else {
                    drawWallSeg(rippleCy - obsHalf, rippleCy + obsHalf);
                  }
                  ctx.fillStyle = 'rgba(226,232,240,0.9)';
                  ctx.font = 'bold ' + (10 * dpr) + 'px sans-serif';
                  var barLabel = rBarrier === 'singleSlit' ? 'Single Slit' : rBarrier === 'doubleSlit' ? 'Double Slit' : rBarrier === 'grating' ? ('Grating (' + rGratingN + ' Slits)') : 'Obstacle';
                  ctx.fillText(barLabel, barX + 10 * dpr, 18 * dpr);
                  ctx.restore();
                }

                // Analytical destructive nodal-hyperbola overlay & fringe geometry HUD when showNodalLines is active
                if (canvasEl.dataset.showNodalLines === 'true' && (rBarrier === 'none' || rBarrier === 'doubleSlit' || (rBarrier === 'grating' && gratingCenters.length >= 2))) {
                  var nP1 = rBarrier === 'doubleSlit'
                    ? { x: barX, y: slit1Y }
                    : (rBarrier === 'grating' ? { x: barX, y: gratingCenters[0] } : { x: src1x, y: src1y });
                  var nP2 = rBarrier === 'doubleSlit'
                    ? { x: barX, y: slit2Y }
                    : (rBarrier === 'grating' ? { x: barX, y: gratingCenters[1] } : { x: src2x, y: src2y });
                  var nDx = nP2.x - nP1.x;
                  var nDy = nP2.y - nP1.y;
                  var nSep = Math.hypot(nDx, nDy);
                  if (nSep > rippleWL * 0.52) {
                    var ux = nDx / nSep, uy = nDy / nSep;
                    var vx = -uy, vy = ux;
                    var midNx = (nP1.x + nP2.x) * 0.5;
                    var midNy = (nP1.y + nP2.y) * 0.5;
                    var halfC = nSep * 0.5;
                    var maxOrderN = Math.min(8, Math.ceil(nSep / Math.max(4, rippleWL)) + 1);
                    var nDrawn = 0;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(251,191,36,0.78)';
                    ctx.lineWidth = 1.4 * dpr;
                    ctx.setLineDash([4 * dpr, 4 * dpr]);
                    for (var ordIdx = -maxOrderN; ordIdx <= maxOrderN; ordIdx++) {
                      var mHalf = ordIdx + 0.5;
                      var deltaN = (mHalf - rPhaseDiff / (2 * Math.PI)) * rippleWL;
                      if (Math.abs(deltaN) >= nSep - 1 || Math.abs(deltaN) < 1e-4) continue;
                      var hypA = Math.abs(deltaN) * 0.5;
                      var hypB = Math.sqrt(Math.max(0.5, halfC * halfC - hypA * hypA));
                      var sgnN = deltaN >= 0 ? 1 : -1;
                      var prevStarted = false;
                      ctx.beginPath();
                      for (var ti = -30; ti <= 30; ti++) {
                        var tau = ti * 0.1;
                        var ePos = Math.exp(tau), eNeg = Math.exp(-tau);
                        var coshT = 0.5 * (ePos + eNeg);
                        var sinhT = 0.5 * (ePos - eNeg);
                        var hx = midNx + sgnN * hypA * coshT * ux + hypB * sinhT * vx;
                        var hy = midNy + sgnN * hypA * coshT * uy + hypB * sinhT * vy;
                        if (rBarrier !== 'none' && hx < barX + 1) {
                          prevStarted = false;
                          continue;
                        }
                        if (!prevStarted) { ctx.moveTo(hx, hy); prevStarted = true; }
                        else ctx.lineTo(hx, hy);
                      }
                      ctx.stroke();
                      nDrawn++;
                    }
                    ctx.setLineDash([]);
                    var dyHud = canvasEl.dataset.rippleFringeSpacing || '';
                    var nodalHudTxt = 'Nodal |r\u2081\u2212r\u2082|=(n+\u00BD)\u03BB \u00B7 ' + nDrawn + ' lines' + (dyHud ? (' \u00B7 \u0394y=' + dyHud + 'px') : '');
                    ctx.font = 'bold ' + Math.round(9 * dpr) + 'px sans-serif';
                    var nHudW = ctx.measureText(nodalHudTxt).width + 12 * dpr;
                    ctx.fillStyle = 'rgba(15,23,42,0.86)';
                    ctx.fillRect(10 * dpr, 8 * dpr, nHudW, 18 * dpr);
                    ctx.fillStyle = '#fde68a';
                    ctx.fillText(nodalHudTxt, 16 * dpr, 20 * dpr);
                    ctx.restore();
                  }
                }

                // Phased-array main-lobe beam steering vector when |Δφ| > 0.05
                if (Math.abs(rPhaseDiff) > 0.05 && (rBarrier === 'none' || rBarrier === 'doubleSlit' || (rBarrier === 'grating' && gratingCenters.length >= 2))) {
                  var b1Pt = rBarrier === 'doubleSlit'
                    ? { x: barX, y: slit1Y }
                    : (rBarrier === 'grating' ? { x: barX, y: gratingCenters[0] } : { x: src1x, y: src1y });
                  var b2Pt = rBarrier === 'doubleSlit'
                    ? { x: barX, y: slit2Y }
                    : (rBarrier === 'grating' ? { x: barX, y: gratingCenters[1] } : { x: src2x, y: src2y });
                  var bDx = b2Pt.x - b1Pt.x;
                  var bDy = b2Pt.y - b1Pt.y;
                  var bLen = Math.hypot(bDx, bDy);
                  if (bLen > 4) {
                    var midBx = rBarrier === 'grating' ? barX : (b1Pt.x + b2Pt.x) * 0.5;
                    var midBy = rBarrier === 'grating' ? rippleCy : (b1Pt.y + b2Pt.y) * 0.5;
                    var bxHat = bDx / bLen;
                    var byHat = bDy / bLen;
                    var sinBeam = Math.max(-1, Math.min(1, (rPhaseDiff / (2 * Math.PI)) * (rippleWL / bLen)));
                    var cosBeam = Math.sqrt(Math.max(0, 1 - sinBeam * sinBeam));
                    var steerDegC = Math.asin(sinBeam) * 180 / Math.PI;
                    var nxHat = byHat;
                    var nyHat = -bxHat;
                    var beamUx = nxHat * cosBeam + bxHat * sinBeam;
                    var beamUy = nyHat * cosBeam + byHat * sinBeam;
                    var beamLen = Math.min(cW, cH) * 0.42;
                    ctx.save();
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2.2 * dpr;
                    ctx.setLineDash([6 * dpr, 4 * dpr]);
                    ctx.beginPath();
                    ctx.moveTo(midBx, midBy);
                    ctx.lineTo(midBx + beamUx * beamLen, midBy + beamUy * beamLen);
                    ctx.stroke();
                    if (rBarrier === 'none') {
                      var symUx = -nxHat * cosBeam + bxHat * sinBeam;
                      var symUy = -nyHat * cosBeam + byHat * sinBeam;
                      ctx.globalAlpha = 0.55;
                      ctx.beginPath();
                      ctx.moveTo(midBx, midBy);
                      ctx.lineTo(midBx + symUx * beamLen, midBy + symUy * beamLen);
                      ctx.stroke();
                      ctx.globalAlpha = 1;
                    }
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#fde68a';
                    ctx.font = 'bold ' + (9.5 * dpr) + 'px sans-serif';
                    var tipX = Math.max(8 * dpr, Math.min(cW - 110 * dpr, midBx + beamUx * beamLen * 0.72));
                    var tipY = Math.max(16 * dpr, Math.min(cH - 12 * dpr, midBy + beamUy * beamLen * 0.72));
                    ctx.fillText('Beam \u03B8\u2080=' + (steerDegC >= 0 ? '+' : '') + steerDegC.toFixed(1) + '\u00B0', tipX, tipY);
                    ctx.restore();
                  }
                }

                // Right-edge detector screen showing normalized time-averaged intensity I(y)
                if (showIScreen) {
                  ctx.save();
                  var panelW = 58 * dpr;
                  var panelX = cW - panelW;
                  ctx.fillStyle = 'rgba(9,13,26,0.82)';
                  ctx.fillRect(panelX, 0, panelW, cH);
                  ctx.strokeStyle = 'rgba(56,189,248,0.45)';
                  ctx.lineWidth = 1 * dpr;
                  ctx.beginPath(); ctx.moveTo(panelX, 0); ctx.lineTo(panelX, cH); ctx.stroke();

                  var screenPts = rBarrier === 'none'
                    ? [{ x: src1x, y: src1y, phaseOff: 0 }, { x: src2x, y: src2y, phaseOff: rPhaseDiff }]
                    : (rBarrier === 'doubleSlit'
                      ? [{ x: barX, y: slit1Y, phaseOff: 0 }, { x: barX, y: slit2Y, phaseOff: rPhaseDiff }]
                      : (rBarrier === 'grating'
                        ? gratingCenters.map(function (gcy, gi) { return { x: barX, y: gcy, phaseOff: gi * rPhaseDiff }; })
                        : huygensPts));
                  var iSamples = 64;
                  var iVals = [];
                  var maxI = 0.0001;
                  var detX = panelX;
                  for (var iy = 0; iy < iSamples; iy++) {
                    var sy = (iy / (iSamples - 1)) * cH;
                    var pRe = 0, pIm = 0;
                    for (var si = 0; si < screenPts.length; si++) {
                      var sdx = detX - screenPts[si].x;
                      var sdy = sy - screenPts[si].y;
                      var sd = Math.sqrt(sdx * sdx + sdy * sdy);
                      var sp = 2 * Math.PI * (sd / rippleWL) + (screenPts[si].phaseOff || 0);
                      var sAtt = Math.exp(-rippleDamp * sd);
                      pRe += Math.cos(sp) * sAtt;
                      pIm += Math.sin(sp) * sAtt;
                    }
                    var iSq = pRe * pRe + pIm * pIm;
                    iVals.push(iSq);
                    if (iSq > maxI) maxI = iSq;
                  }
                  var barStepH = cH / iSamples;
                  for (var bi = 0; bi < iSamples; bi++) {
                    var iNorm = iVals[bi] / maxI;
                    ctx.fillStyle = 'rgba(34,211,238,' + (0.08 + iNorm * 0.72).toFixed(3) + ')';
                    ctx.fillRect(panelX + 2 * dpr, bi * barStepH, 8 * dpr, barStepH + 1);
                  }
                  ctx.strokeStyle = '#fbbf24';
                  ctx.lineWidth = 2 * dpr;
                  ctx.beginPath();
                  for (var ci = 0; ci < iSamples; ci++) {
                    var iFrac = iVals[ci] / maxI;
                    var gx = panelX + 12 * dpr + iFrac * (panelW - 18 * dpr);
                    var gy = (ci / (iSamples - 1)) * cH;
                    if (ci === 0) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
                  }
                  ctx.stroke();
                  ctx.fillStyle = '#fef08a';
                  ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                  ctx.fillText('I(y)', panelX + 14 * dpr, 15 * dpr);
                  ctx.restore();
                }

                // (Legend moved to the ripple controls row below the canvas.)

              } else if (currentMode === 'longitudinal') {
                // ========== LONGITUDINAL WAVE MODE ==========
                var numParticles = 60;
                var particleSpacing = cW / (numParticles + 1);
                // Max displacement = 1/k so particle paths never cross (matter can't
                // pass through itself); A slider maps 0–100 → 0–100% of that limit.
                // (Old amp*15*dpr gave ~1500px swings — pure visual noise.)
                var longMode = canvasEl.dataset.longitudinalMode === 'standing' ? 'standing' : 'traveling';
                var showDispCurve = canvasEl.dataset.showDisplacementCurve === 'true';
                var distAttenOn = canvasEl.dataset.distanceAttenuation === 'true' && longMode === 'traveling';
                var distMetersHud = Math.max(1, Math.min(20, parseFloat(canvasEl.dataset.listenerDistMeters || '4') || 4));
                var spreadLawHud = canvasEl.dataset.spreadingLaw === 'cylindrical' ? 'cylindrical' : 'spherical';
                var distExpHud = spreadLawHud === 'cylindrical' ? 0.5 : 1;
                function longSpatialScale(uPos) {
                  if (!distAttenOn) return 1;
                  var rHere = 1 + Math.max(0, Math.min(1, uPos)) * 19;
                  return Math.pow(1 / rHere, distExpHud);
                }
                var longHarmonic = Math.max(1, Math.min(8, parseInt(canvasEl.dataset.harmonic || '2', 10) || 2));
                var waveScaleK = longMode === 'standing' ? (Math.PI * longHarmonic) : (2 * Math.PI * freq);
                var longAmp = (amp / 100) * cW / Math.max(0.5, waveScaleK);
                var midY = cH / 2;
                var tStandFactor = Math.cos(t * 2 * Math.PI * freq * 0.05);
                function longDispFrac(uPos) {
                  if (longMode === 'standing') {
                    return Math.sin(longHarmonic * Math.PI * uPos) * tStandFactor;
                  }
                  return Math.sin(2 * Math.PI * (uPos * freq - t * freq * 0.05)) * longSpatialScale(uPos);
                }
                function longPressureFrac(uPos) {
                  if (longMode === 'standing') {
                    return -Math.cos(longHarmonic * Math.PI * uPos) * tStandFactor;
                  }
                  return -Math.cos(2 * Math.PI * (uPos * freq - t * freq * 0.05)) * longSpatialScale(uPos);
                }

                // Moving or standing pressure field behind the particles: warm bands are
                // compressions, cool bands are rarefactions.
                ctx.save();
                var tubeTop=midY-40*dpr, tubeHeight=80*dpr, pressureBands=96, bandW=cW/pressureBands;
                for(var bi=0;bi<pressureBands;bi++){
                  var bx=bi*bandW, bp=longPressureFrac(bx/cW);
                  var bandAlpha=.035+.13*Math.abs(bp);
                  ctx.fillStyle=bp>0?'rgba(251,113,133,'+bandAlpha.toFixed(3)+')':'rgba(59,130,246,'+bandAlpha.toFixed(3)+')';
                  ctx.fillRect(bx,tubeTop,bandW+1,tubeHeight);
                }
                var glassGrad=ctx.createLinearGradient(0,tubeTop,0,tubeTop+tubeHeight);
                glassGrad.addColorStop(0,'rgba(255,255,255,.15)');glassGrad.addColorStop(.18,'rgba(255,255,255,.02)');glassGrad.addColorStop(.82,'rgba(0,15,35,.04)');glassGrad.addColorStop(1,'rgba(0,8,24,.22)');
                ctx.fillStyle=glassGrad;ctx.fillRect(10,tubeTop,cW-20,tubeHeight);
                ctx.restore();
                // Draw tube outline (+ closed end plates & node markers in Kundt standing mode)
                ctx.strokeStyle = 'rgba(100,200,255,0.22)';
                ctx.lineWidth = 1;
                ctx.strokeRect(10, midY - 40 * dpr, cW - 20, 80 * dpr);
                if (longMode === 'standing') {
                  ctx.save();
                  ctx.fillStyle = 'rgba(148,163,184,0.45)';
                  ctx.fillRect(4 * dpr, tubeTop, 6 * dpr, tubeHeight);
                  ctx.fillRect(cW - 10 * dpr, tubeTop, 6 * dpr, tubeHeight);
                  ctx.font = 'bold ' + Math.round(9 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  for (var pn = 0; pn <= longHarmonic; pn++) {
                    var paX = Math.max(20 * dpr, Math.min(cW - 20 * dpr, (pn / longHarmonic) * cW));
                    ctx.fillStyle = '#fda4af';
                    ctx.fillText('P-A', paX, tubeTop - 5 * dpr);
                  }
                  for (var pm_n = 0; pm_n < longHarmonic; pm_n++) {
                    var pnX = ((pm_n + 0.5) / longHarmonic) * cW;
                    ctx.strokeStyle = 'rgba(34,211,238,0.45)';
                    ctx.setLineDash([3 * dpr, 3 * dpr]);
                    ctx.beginPath(); ctx.moveTo(pnX, tubeTop); ctx.lineTo(pnX, tubeTop + tubeHeight); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#67e8f9';
                    ctx.fillText('P-N', pnX, tubeTop + tubeHeight + 12 * dpr);
                  }
                  ctx.textAlign = 'start';
                  ctx.restore();
                }

                // Pressure graph (top, scaled cleanly above tube)
                var traceAmpPx = (amp / 100) * 26 * dpr;
                var traceBaseY = midY - 72 * dpr;
                function tracePressureGraph(){
                  ctx.beginPath();
                  for(var lx=0;lx<cW;lx+=2){var pressure=longPressureFrac(lx/cW);var py_p=traceBaseY-pressure*traceAmpPx;if(lx===0)ctx.moveTo(lx,py_p);else ctx.lineTo(lx,py_p);}
                }
                ctx.setLineDash([]);ctx.strokeStyle='#f472b6';ctx.shadowColor='#f472b6';
                tracePressureGraph();ctx.save();ctx.globalAlpha=.16;ctx.lineWidth=10*dpr;ctx.shadowBlur=20;ctx.stroke();ctx.restore();
                tracePressureGraph();ctx.lineWidth=2*dpr;ctx.shadowBlur=8;ctx.stroke();
                tracePressureGraph();ctx.save();ctx.globalAlpha=.3;ctx.strokeStyle='#fff';ctx.lineWidth=.7*dpr;ctx.shadowBlur=0;ctx.stroke();ctx.restore();ctx.shadowBlur=0;

                if (showDispCurve) {
                  ctx.save();
                  ctx.strokeStyle = '#22d3ee';
                  ctx.lineWidth = 2 * dpr;
                  ctx.setLineDash([5 * dpr, 3 * dpr]);
                  ctx.beginPath();
                  for (var dx_i = 0; dx_i < cW; dx_i += 2) {
                    var dispYVal = longDispFrac(dx_i / cW) * traceAmpPx;
                    var dispPy = traceBaseY - dispYVal;
                    if (dx_i === 0) ctx.moveTo(dx_i, dispPy); else ctx.lineTo(dx_i, dispPy);
                  }
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.font = 'bold ' + Math.round(10 * dpr) + 'px sans-serif';
                  var legText = '\u2014 \u0394P Pressure   --- \u0394x Displacement';
                  var legW = ctx.measureText(legText).width;
                  ctx.fillStyle = 'rgba(15,23,42,0.88)';
                  ctx.fillRect(10 * dpr, 8 * dpr, legW + 16 * dpr, 20 * dpr);
                  ctx.fillStyle = '#f9a8d4';
                  ctx.fillText('\u2014 \u0394P Pressure', 18 * dpr, 22 * dpr);
                  var dpW = ctx.measureText('\u2014 \u0394P Pressure   ').width;
                  ctx.fillStyle = '#67e8f9';
                  ctx.fillText('--- \u0394x Displacement', 18 * dpr + dpW, 22 * dpr);
                  ctx.restore();
                }

                // Draw particles as vertical lines (density visualization)
                for (var pi = 0; pi < numParticles; pi++) {
                  var baseX = (pi + 1) * particleSpacing;
                  var displacement = longAmp * longDispFrac(baseX / cW);
                  var drawX = baseX + displacement;
                  // Color by density: compressed = bright, rarefied = dim
                  var nextDisp = pi < numParticles - 1 ? longAmp * longDispFrac((baseX + particleSpacing) / cW) : 0;
                  var localDensity = 1 - (nextDisp - displacement) / (particleSpacing * 0.8);
                  localDensity = Math.max(0.1, Math.min(2, localDensity));
                  var alpha = Math.min(1, localDensity * 0.7);
                  var particleRGB = localDensity > 1.08 ? '251,113,133' : '96,165,250';
                  ctx.strokeStyle = 'rgba(' + particleRGB + ',' + alpha.toFixed(2) + ')';
                  ctx.shadowColor = localDensity > 1.08 ? '#fb7185' : '#60a5fa';
                  ctx.shadowBlur = Math.max(2, localDensity * 5 * dpr);
                  ctx.lineWidth = Math.max(1, localDensity * 3 * dpr);
                  ctx.beginPath(); ctx.moveTo(drawX, midY - 30 * dpr); ctx.lineTo(drawX, midY + 30 * dpr); ctx.stroke();
                  ctx.shadowBlur = 0; ctx.globalAlpha = Math.min(1, .25 + localDensity * .35);
                  ctx.fillStyle = localDensity > 1.08 ? '#fecdd3' : '#bfdbfe';
                  ctx.beginPath(); ctx.arc(drawX, midY, Math.max(1.8, localDensity * 1.8) * dpr, 0, Math.PI * 2); ctx.fill();
                  ctx.globalAlpha = 1;
                }

                // The pressure pattern travels right even though each material
                // particle only oscillates around its own equilibrium position.
                if (longMode !== 'standing') {
                  ctx.save();ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=1.3*dpr;ctx.lineCap='round';
                  var longArrowOffset=(tick*.9*speed)%(100*dpr);
                  for(var la=25*dpr+longArrowOffset;la<cW-20*dpr;la+=100*dpr){ctx.beginPath();ctx.moveTo(la-8*dpr,midY+34*dpr);ctx.lineTo(la+8*dpr,midY+34*dpr);ctx.lineTo(la+3*dpr,midY+30*dpr);ctx.moveTo(la+8*dpr,midY+34*dpr);ctx.lineTo(la+3*dpr,midY+38*dpr);ctx.stroke();}
                  ctx.restore();
                }
                if (distAttenOn) {
                  ctx.save();
                  var micX = 14 * dpr + ((distMetersHud - 1) / 19) * (cW - 28 * dpr);
                  ctx.strokeStyle = 'rgba(251,191,36,0.88)';
                  ctx.lineWidth = 1.6 * dpr;
                  ctx.setLineDash([4 * dpr, 3 * dpr]);
                  ctx.beginPath(); ctx.moveTo(micX, tubeTop - 10 * dpr); ctx.lineTo(micX, tubeTop + tubeHeight + 12 * dpr); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath(); ctx.arc(micX, midY, 4.5 * dpr, 0, Math.PI * 2); ctx.fill();
                  var attenDbHud = canvasEl.dataset.attenuatedDb || '';
                  var micHudTxt = 'MIC r=' + distMetersHud.toFixed(1) + 'm \u00B7 ' + (attenDbHud ? (attenDbHud + ' dB') : '') + ' (' + (spreadLawHud === 'cylindrical' ? '1/r' : '1/r\u00B2') + ')';
                  ctx.font = 'bold ' + Math.round(9 * dpr) + 'px sans-serif';
                  var micHudW = ctx.measureText(micHudTxt).width + 12 * dpr;
                  ctx.fillStyle = 'rgba(15,23,42,0.86)';
                  ctx.fillRect(cW - micHudW - 10 * dpr, 8 * dpr, micHudW, 18 * dpr);
                  ctx.fillStyle = '#fde68a';
                  ctx.fillText(micHudTxt, cW - micHudW - 4 * dpr, 20 * dpr);
                  ctx.restore();
                }
                // Misconception-buster: highlight ONE tracer particle (gold) against a dashed
                // marker at its equilibrium (rest) position, so students SEE it only jiggles
                // back and forth in place \u2014 the wave travels right, but matter does not move with it.
                var _trIndex = longMode === 'standing' ? Math.max(1, Math.floor(numParticles / (2 * longHarmonic))) : Math.floor(numParticles / 2);
                var _trBaseX = (_trIndex + 1) * particleSpacing;
                var _trDisp = longAmp * longDispFrac(_trBaseX / cW);
                var _trX = _trBaseX + _trDisp;
                ctx.setLineDash([3 * dpr, 3 * dpr]);
                ctx.strokeStyle = 'rgba(251,191,36,0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(_trBaseX, midY - 38 * dpr); ctx.lineTo(_trBaseX, midY + 38 * dpr); ctx.stroke();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4 * dpr;
                ctx.beginPath(); ctx.moveTo(_trX, midY - 32 * dpr); ctx.lineTo(_trX, midY + 32 * dpr); ctx.stroke();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(_trX, midY, 4 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.save();
                ctx.strokeStyle='rgba(251,191,36,.72)';ctx.lineWidth=1.5*dpr;
                ctx.beginPath();ctx.moveTo(_trBaseX,midY);ctx.lineTo(_trX,midY);ctx.stroke();
                var tracerDir=_trX>=_trBaseX?1:-1;
                ctx.beginPath();ctx.moveTo(_trX,midY);ctx.lineTo(_trX-tracerDir*5*dpr,midY-3*dpr);ctx.moveTo(_trX,midY);ctx.lineTo(_trX-tracerDir*5*dpr,midY+3*dpr);ctx.stroke();
                ctx.restore();

                // (Legend + gold-tracer note moved to HTML overlay chips.)

              } else if (currentMode === 'doppler') {
                // ========== DOPPLER EFFECT & MACH CONE MODE ==========
                var sourceSpeed = parseFloat(canvasEl.dataset.sourceSpeed || '0.3');
                if (!isFinite(sourceSpeed) || sourceSpeed < 0) sourceSpeed = 0.3;
                var dopplerRegime = canvasEl.dataset.dopplerRegime === 'relativistic' ? 'relativistic' : 'acoustic';
                var isRelLight = dopplerRegime === 'relativistic';
                var effSrcMach = isRelLight ? Math.min(0.95, sourceSpeed) : sourceSpeed;
                var obsSpeed = parseFloat(canvasEl.dataset.observerSpeed || '0');
                if (!isFinite(obsSpeed)) obsSpeed = 0;
                obsSpeed = Math.max(-0.8, Math.min(0.8, obsSpeed));
                var midY_d = cH / 2;
                var waveSpeedPx = 3 * dpr;
                var sourceSpeedPx = effSrcMach * waveSpeedPx;
                // Keep stationary source visible at left-center; moving source sweeps & wraps cleanly
                var sourceX = effSrcMach < 0.01 ? (cW * 0.35) : (((t * sourceSpeedPx) % (cW + 140 * dpr)) - 70 * dpr);

                // Draw expanding wavefronts emitted from source's true past positions
                ctx.lineWidth = 1.4 * dpr;
                var numFronts = 22;
                for (var wf = 0; wf < numFronts; wf++) {
                  var age = wf * 7;
                  var emitX = sourceX - age * sourceSpeedPx;
                  var radius = age * waveSpeedPx;
                  if (radius > 0 && radius < cW * 1.4) {
                    var frontAlpha = Math.max(0.06, 0.95 - age / (numFronts * 7));
                    if (isRelLight && effSrcMach > 0.02) {
                      ctx.strokeStyle = 'rgba(56,189,248,' + frontAlpha.toFixed(2) + ')';
                      ctx.beginPath();
                      ctx.arc(emitX, midY_d, radius, -Math.PI * 0.5, Math.PI * 0.5);
                      ctx.stroke();
                      ctx.strokeStyle = 'rgba(248,113,113,' + frontAlpha.toFixed(2) + ')';
                      ctx.beginPath();
                      ctx.arc(emitX, midY_d, radius, Math.PI * 0.5, Math.PI * 1.5);
                      ctx.stroke();
                    } else {
                      ctx.strokeStyle = (!isRelLight && effSrcMach >= 1.0)
                        ? 'rgba(251,191,36,' + (frontAlpha * 0.78).toFixed(2) + ')'
                        : 'rgba(96,165,250,' + frontAlpha.toFixed(2) + ')';
                      ctx.beginPath();
                      ctx.arc(emitX, midY_d, radius, 0, 2 * Math.PI);
                      ctx.stroke();
                    }
                  }
                }

                // Supersonic Mach shock cone (sin μ = 1/M) when acoustic & M >= 1.0
                if (!isRelLight && sourceSpeed >= 1.0) {
                  var sinMu = Math.min(1, 1 / sourceSpeed);
                  var cosMu = Math.sqrt(Math.max(0, 1 - sinMu * sinMu));
                  var coneLen = cW * 0.85;
                  ctx.save();
                  ctx.fillStyle = 'rgba(251,191,36,0.08)';
                  ctx.beginPath();
                  ctx.moveTo(sourceX, midY_d);
                  ctx.lineTo(sourceX - cosMu * coneLen, midY_d - sinMu * coneLen);
                  ctx.lineTo(sourceX - cosMu * coneLen, midY_d + sinMu * coneLen);
                  ctx.closePath();
                  ctx.fill();

                  ctx.strokeStyle = 'rgba(251,191,36,0.95)';
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 10;
                  ctx.lineWidth = 2.5 * dpr;
                  ctx.beginPath();
                  ctx.moveTo(sourceX, midY_d);
                  ctx.lineTo(sourceX - cosMu * coneLen, midY_d - sinMu * coneLen);
                  ctx.moveTo(sourceX, midY_d);
                  ctx.lineTo(sourceX - cosMu * coneLen, midY_d + sinMu * coneLen);
                  ctx.stroke();
                  ctx.shadowBlur = 0;

                  ctx.fillStyle = '#fde68a';
                  ctx.font = 'bold ' + (10 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('MACH ' + sourceSpeed.toFixed(2), Math.max(55 * dpr, Math.min(cW - 55 * dpr, sourceX)), 24 * dpr);
                  ctx.textAlign = 'start';
                  ctx.restore();
                } else if (isRelLight) {
                  var relGCanvas = 1 / Math.sqrt(Math.max(1e-6, 1 - effSrcMach * effSrcMach));
                  ctx.save();
                  ctx.fillStyle = '#c4b5fd';
                  ctx.font = 'bold ' + (9.5 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('RELATIVISTIC \u03B3=' + relGCanvas.toFixed(2) + ' (\u03B2=' + effSrcMach.toFixed(2) + 'c)', Math.max(95 * dpr, Math.min(cW - 95 * dpr, sourceX)), 24 * dpr);
                  ctx.textAlign = 'start';
                  ctx.restore();
                }

                // Draw moving source
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(sourceX, midY_d, 9 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('S', sourceX, midY_d);

                // Dual Observers: O1 (left / receding) & O2 (right / approaching)
                var obs1X = 34 * dpr;
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath(); ctx.arc(obs1X, midY_d, 9 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#082f49';
                ctx.fillText('O\u2081', obs1X, midY_d);

                var obs2X = cW - 34 * dpr;
                ctx.fillStyle = '#22c55e';
                ctx.beginPath(); ctx.arc(obs2X, midY_d, 9 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText('O\u2082', obs2X, midY_d);
                ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';

                // Observer O2 velocity indicator & quantitative f_obs badge
                if (Math.abs(obsSpeed) >= 0.01) {
                  ctx.save();
                  var obsArrowLen = Math.max(12 * dpr, Math.abs(obsSpeed) * 38 * dpr);
                  var obsArrowDir = obsSpeed > 0 ? -1 : 1; // +obsSpeed moves toward source (left)
                  var obsAx1 = obs2X;
                  var obsAy = midY_d - 18 * dpr;
                  var obsAx2 = obsAx1 + obsArrowDir * obsArrowLen;
                  ctx.strokeStyle = '#86efac';
                  ctx.fillStyle = '#86efac';
                  ctx.lineWidth = 2 * dpr;
                  ctx.beginPath(); ctx.moveTo(obsAx1, obsAy); ctx.lineTo(obsAx2, obsAy); ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(obsAx2, obsAy);
                  ctx.lineTo(obsAx2 - obsArrowDir * 5 * dpr, obsAy - 3.5 * dpr);
                  ctx.lineTo(obsAx2 - obsArrowDir * 5 * dpr, obsAy + 3.5 * dpr);
                  ctx.closePath(); ctx.fill();
                  ctx.font = 'bold ' + Math.round(9 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('v\u2092=' + (obsSpeed >= 0 ? '+' : '') + obsSpeed.toFixed(2) + 'c', obs2X - 8 * dpr, obsAy - 6 * dpr);
                  ctx.textAlign = 'start';
                  ctx.restore();
                }

                // Off-axis observer station O_theta, radar cos(theta) radial vector & transverse relativistic readout
                var offsetAngDeg = parseFloat(canvasEl.dataset.dopplerOffsetAngle || '0') || 0;
                var obsThetaX = obs2X;
                var obsThetaY = midY_d;
                if (offsetAngDeg > 0) {
                  var thetaR = (offsetAngDeg * Math.PI) / 180;
                  var rSight = Math.min(cW * 0.28, cH * 0.36);
                  var refAnchorX = cW * 0.52;
                  obsThetaX = refAnchorX + Math.cos(thetaR) * rSight;
                  obsThetaY = midY_d - Math.sin(thetaR) * rSight;
                  var offRes = waveComputeOffAxisDoppler(freq, sourceSpeed, offsetAngDeg, dopplerRegime);
                  ctx.save();
                  ctx.strokeStyle = 'rgba(251,191,36,0.75)';
                  ctx.lineWidth = 1.6 * dpr;
                  ctx.setLineDash([4 * dpr, 3 * dpr]);
                  ctx.beginPath();
                  ctx.moveTo(sourceX, midY_d);
                  ctx.lineTo(obsThetaX, obsThetaY);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.strokeStyle = 'rgba(167,139,250,0.65)';
                  ctx.lineWidth = 1.4 * dpr;
                  ctx.beginPath();
                  ctx.arc(refAnchorX, midY_d, 26 * dpr, -thetaR, 0);
                  ctx.stroke();
                  ctx.fillStyle = isRelLight ? '#a78bfa' : '#f59e0b';
                  ctx.beginPath(); ctx.arc(obsThetaX, obsThetaY, 8 * dpr, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4 * dpr; ctx.stroke();
                  ctx.fillStyle = '#0f172a';
                  ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                  ctx.fillText('O\u03B8', obsThetaX, obsThetaY);

                  var offTag = '\u03B8=' + offsetAngDeg.toFixed(0) + '\u00B0 \u00B7 cos\u03B8=' + offRes.radarCosinePct.toFixed(0) + '% \u00B7 f\'(\u03B8)=' + (isFinite(offRes.observedFreqHz) ? (offRes.observedFreqHz.toFixed(2) + 'Hz') : 'Shock') + (offRes.isTransverseRedshift ? ' \u00B7 90\u00B0 \u03B3-Redshift' : '');
                  ctx.font = 'bold ' + (9.5 * dpr) + 'px monospace';
                  var offW = Math.min(cW - 20 * dpr, offTag.length * 6.0 * dpr + 16 * dpr);
                  var offH = 20 * dpr;
                  ctx.fillStyle = 'rgba(15,23,42,0.88)';
                  ctx.fillRect(10 * dpr, 10 * dpr, offW, offH);
                  ctx.strokeStyle = isRelLight ? '#a78bfa' : '#f59e0b';
                  ctx.lineWidth = 1.2 * dpr;
                  ctx.strokeRect(10 * dpr, 10 * dpr, offW, offH);
                  ctx.fillStyle = isRelLight ? '#ddd6fe' : '#fde68a';
                  ctx.fillText(offTag, 10 * dpr + offW / 2, 10 * dpr + offH / 2);
                  ctx.restore();
                }

                // Audible Doppler synced to right-hand observer O2 or off-axis station O_theta
                if (_waveAudio.osc && _waveAudio.ctx) {
                  var _dShift;
                  if (offsetAngDeg > 0) {
                    var losDx = obsThetaX - sourceX;
                    var losDy = obsThetaY - midY_d;
                    var losDist = Math.max(1, Math.hypot(losDx, losDy));
                    var instCos = losDx / losDist;
                    if (isRelLight) {
                      var _gOff = 1 / Math.sqrt(Math.max(1e-6, 1 - effSrcMach * effSrcMach));
                      _dShift = Math.max(0.25, freq / (_gOff * Math.max(0.15, 1 - effSrcMach * instCos)));
                    } else {
                      _dShift = Math.max(0.25, freq / Math.max(0.15, 1 - effSrcMach * instCos));
                    }
                  } else if (isRelLight) {
                    var _relD = waveComputeRelativisticDoppler(freq, sourceSpeed, obsSpeed);
                    _dShift = Math.max(0.25, sourceX < obs2X ? _relD.approachingFreq : _relD.recedingFreq);
                  } else {
                    var _dNum = sourceX < obs2X ? Math.max(0.15, 1 + obsSpeed) : Math.max(0.15, 1 - obsSpeed);
                    var _dDen = sourceX < obs2X ? (1 - Math.min(sourceSpeed, 0.95)) : (1 + sourceSpeed);
                    _dShift = Math.max(0.25, freq * (_dNum / _dDen));
                  }
                  var _dHz = Math.max(50, Math.min(4000, _dShift * 100));
                  try { _waveAudio.osc.frequency.setTargetAtTime(_dHz, _waveAudio.ctx.currentTime, 0.08); } catch (e) {}
                }

              } else if (currentMode === 'spectrum') {
                // ========== FFT / SPECTRUM MODE + HARMONIC FILTER BENCH ==========
                var midY_s = cH / 2;
                var specFilter = WAVE_VALID_FILTERS[canvasEl.dataset.spectrumFilter] ? canvasEl.dataset.spectrumFilter : 'none';
                var specCutoff = Math.max(1, Math.min(12, parseInt(canvasEl.dataset.filterCutoff || '3', 10) || 3));
                var digOn = canvasEl.dataset.digitalSampling === 'true';
                var srRatio = Math.max(0.5, Math.min(20, parseFloat(canvasEl.dataset.sampleRateRatio || '8') || 8));
                var adcBits = Math.max(1, Math.min(16, parseInt(canvasEl.dataset.adcBitDepth || '8', 10) || 8));
                var digMeta = digOn ? waveComputeDigitalSampling(freq, srRatio, adcBits) : null;

                // Compute 12-harmonic DFT first so both time-domain and spectrum share coefficients & filter gains
                var NSAMP = 256, maxHarm = 12;
                var harmCos = [], harmSin = [], harmRawMag = [], harmGain = [], harmFiltMag = [];
                var maxRawMag = 1e-6;
                for (var hh = 1; hh <= maxHarm; hh++) {
                  var dre = 0, dim = 0;
                  for (var kk = 0; kk < NSAMP; kk++) {
                    var ph = 2 * Math.PI * kk / NSAMP;
                    var yk = waveVal(ph, waveType);
                    dre += yk * Math.cos(hh * ph);
                    dim += yk * Math.sin(hh * ph);
                  }
                  var hCos = 2 * dre / NSAMP;
                  var hSin = 2 * dim / NSAMP;
                  var hRaw = Math.sqrt(hCos * hCos + hSin * hSin);
                  var hGn = waveFilterHarmonicGain(hh, specFilter, specCutoff);
                  var hFilt = hRaw * hGn;
                  harmCos.push(hCos);
                  harmSin.push(hSin);
                  harmRawMag.push(hRaw);
                  harmGain.push(hGn);
                  harmFiltMag.push(hFilt);
                  if (hRaw > maxRawMag) maxRawMag = hRaw;
                }

                var evalSpecY = function (sxVal) {
                  var phVal = 2 * Math.PI * (sxVal / cW * freq - t * freq * 0.05);
                  var outV = 0;
                  if (specFilter === 'none') {
                    outV = amp * waveVal(phVal, waveType);
                  } else {
                    var fS = 0;
                    for (var fhI = 0; fhI < maxHarm; fhI++) {
                      if (harmGain[fhI] > 0) {
                        var hOrd = fhI + 1;
                        fS += harmGain[fhI] * (harmCos[fhI] * Math.cos(hOrd * phVal) + harmSin[fhI] * Math.sin(hOrd * phVal));
                      }
                    }
                    outV = amp * fS;
                  }
                  if (showSecond) outV += amp2 * Math.sin(2 * Math.PI * (sxVal / cW * freq2 - t * freq2 * 0.05) + phase2Val);
                  return outV;
                };

                // Time-domain waveform (top half) — shows ghosted original + filtered reconstruction when filter active
                var normDenom = Math.max(100, amp + (showSecond ? amp2 : 0));
                if (specFilter !== 'none') {
                  ctx.save();
                  ctx.strokeStyle = 'rgba(148,163,184,0.45)';
                  ctx.lineWidth = 1.5 * dpr;
                  ctx.setLineDash([4 * dpr, 4 * dpr]);
                  ctx.beginPath();
                  for (var rx = 0; rx < cW; rx += 2) {
                    var rv = amp * waveVal(2 * Math.PI * (rx / cW * freq - t * freq * 0.05), waveType);
                    if (showSecond) rv += amp2 * Math.sin(2 * Math.PI * (rx / cW * freq2 - t * freq2 * 0.05) + phase2Val);
                    var rsy = midY_s * 0.5 + (rv / normDenom) * (midY_s * 0.38);
                    if (rx === 0) ctx.moveTo(rx, rsy); else ctx.lineTo(rx, rsy);
                  }
                  ctx.stroke();
                  ctx.restore();
                }

                ctx.strokeStyle = specFilter !== 'none' ? '#34d399' : '#60a5fa';
                ctx.lineWidth = 2 * dpr;
                ctx.shadowColor = specFilter !== 'none' ? '#34d399' : '#60a5fa';
                ctx.shadowBlur = 8;
                ctx.setLineDash([]);
                ctx.beginPath();
                for (var sx = 0; sx < cW; sx += 2) {
                  var sv = evalSpecY(sx);
                  var sy = midY_s * 0.5 + (sv / normDenom) * (midY_s * 0.38);
                  if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Nyquist-Shannon Digital Sampling & ADC Quantization Overlay (top half)
                if (digOn && digMeta) {
                  ctx.save();
                  // Faint quantization grid ticks when bit depth <= 4
                  if (adcBits <= 4) {
                    var nGridLvls = Math.pow(2, adcBits);
                    ctx.strokeStyle = 'rgba(251,191,36,0.16)';
                    ctx.lineWidth = 1;
                    for (var ql = 1; ql < nGridLvls; ql++) {
                      var qFrac = (2 * ql / nGridLvls) - 1;
                      var qGridY = midY_s * 0.5 + qFrac * (midY_s * 0.38);
                      ctx.beginPath();
                      ctx.moveTo(0, qGridY);
                      ctx.lineTo(cW, qGridY);
                      ctx.stroke();
                    }
                  }
                  // Zero-order hold staircase + quantized sample dots
                  var totalCycles = Math.max(0.25, freq * srRatio);
                  var dtSampPx = cW / totalCycles;
                  var nSampsPlot = Math.min(260, Math.floor(totalCycles) + 1);
                  var dotStep = Math.max(1, Math.ceil(nSampsPlot / 90));
                  var prevSampleY = null;
                  ctx.strokeStyle = '#f59e0b';
                  ctx.lineWidth = 2 * dpr;
                  ctx.setLineDash([]);
                  ctx.beginPath();
                  for (var spI = 0; spI <= nSampsPlot; spI++) {
                    var sxSamp = spI * dtSampPx;
                    if (sxSamp > cW) break;
                    var rawNorm = Math.max(-1, Math.min(1, evalSpecY(sxSamp) / normDenom));
                    var qNormVal = waveQuantizeAdcSample(rawNorm, adcBits);
                    var qSy = midY_s * 0.5 + qNormVal * (midY_s * 0.38);
                    if (spI === 0) {
                      ctx.moveTo(sxSamp, qSy);
                    } else {
                      ctx.lineTo(sxSamp, prevSampleY);
                      ctx.lineTo(sxSamp, qSy);
                    }
                    prevSampleY = qSy;
                  }
                  if (prevSampleY !== null) {
                    ctx.lineTo(cW, prevSampleY);
                  }
                  ctx.stroke();
                  // Sample marker dots
                  for (var spDot = 0; spDot <= nSampsPlot; spDot += dotStep) {
                    var dxSamp = spDot * dtSampPx;
                    if (dxSamp > cW) break;
                    var dRawNorm = Math.max(-1, Math.min(1, evalSpecY(dxSamp) / normDenom));
                    var dQNorm = waveQuantizeAdcSample(dRawNorm, adcBits);
                    var dQy = midY_s * 0.5 + dQNorm * (midY_s * 0.38);
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(dxSamp, dQy, 3 * dpr, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fef3c7';
                    ctx.lineWidth = 1 * dpr;
                    ctx.stroke();
                  }
                  // Reconstructed wagon-wheel alias sinusoid when fundamental violates Nyquist (srRatio < 2)
                  if (digMeta.isFundamentalAliased) {
                    var mAliasFold = Math.round(freq / digMeta.sampleRateHz);
                    var signedAliasFreq = freq - mAliasFold * digMeta.sampleRateHz;
                    ctx.strokeStyle = '#fb7185';
                    ctx.lineWidth = 2 * dpr;
                    ctx.setLineDash([6 * dpr, 4 * dpr]);
                    ctx.beginPath();
                    for (var ax = 0; ax < cW; ax += 2) {
                      var aPh = 2 * Math.PI * (ax / cW * signedAliasFreq - t * freq * 0.05);
                      var av = amp * waveVal(aPh, waveType);
                      var asy = midY_s * 0.5 + (av / normDenom) * (midY_s * 0.38);
                      if (ax === 0) ctx.moveTo(ax, asy); else ctx.lineTo(ax, asy);
                    }
                    ctx.stroke();
                  }
                  ctx.restore();
                }

                // Divider line
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, midY_s); ctx.lineTo(cW, midY_s); ctx.stroke();

                // Frequency domain (bottom half)
                var wave2Mag = showSecond ? (amp2 / Math.max(1, amp)) * Math.max(0.5, harmRawMag[0]) : 0;
                var normMaxMag = Math.max(maxRawMag, wave2Mag);
                var maxFreqDisp = Math.max((maxHarm + 1) * freq, showSecond ? freq2 * 1.15 : 0);
                var plotBottom = cH - 14 * dpr, plotTop = midY_s + 14 * dpr;

                // Nyquist boundary & alias zone in bottom frequency plot
                if (digOn && digMeta) {
                  ctx.save();
                  var nyqX = 20 * dpr + Math.min(1, digMeta.nyquistFreqHz / maxFreqDisp) * (cW - 40 * dpr);
                  if (digMeta.nyquistFreqHz < maxFreqDisp) {
                    ctx.fillStyle = 'rgba(244,63,94,0.09)';
                    ctx.fillRect(nyqX, plotTop - 4 * dpr, (cW - 20 * dpr) - nyqX, plotBottom - plotTop + 4 * dpr);
                    ctx.strokeStyle = '#f43f5e';
                    ctx.lineWidth = 1.6 * dpr;
                    ctx.setLineDash([4 * dpr, 3 * dpr]);
                    ctx.beginPath();
                    ctx.moveTo(nyqX, plotTop - 4 * dpr);
                    ctx.lineTo(nyqX, plotBottom);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#fda4af';
                    ctx.font = 'bold ' + (7.5 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Nyquist f\u209B/2', Math.max(46 * dpr, Math.min(cW - 46 * dpr, nyqX)), plotTop + 6 * dpr);
                  }
                  ctx.restore();
                }

                for (var hb = 1; hb <= maxHarm; hb++) {
                  var rawRel = harmRawMag[hb - 1] / normMaxMag;
                  var filtRel = harmFiltMag[hb - 1] / normMaxMag;
                  if (rawRel < 0.012 && filtRel < 0.012) continue;
                  var hx = 20 * dpr + (hb * freq / maxFreqDisp) * (cW - 40 * dpr);
                  if (specFilter !== 'none' && harmGain[hb - 1] < 0.5 && rawRel >= 0.012) {
                    var gBarH = rawRel * (plotBottom - plotTop);
                    ctx.save();
                    ctx.fillStyle = 'rgba(148,163,184,0.16)';
                    ctx.strokeStyle = 'rgba(148,163,184,0.45)';
                    ctx.setLineDash([3 * dpr, 2 * dpr]);
                    ctx.lineWidth = 1 * dpr;
                    ctx.fillRect(hx - 3 * dpr, plotBottom - gBarH, 6 * dpr, gBarH);
                    ctx.strokeRect(hx - 3 * dpr, plotBottom - gBarH, 6 * dpr, gBarH);
                    ctx.restore();
                  }
                  if (filtRel < 0.012) continue;
                  var hBarH = filtRel * (plotBottom - plotTop);
                  var hue = ((hb - 1) / maxHarm) * 270;
                  ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.9)';
                  ctx.fillRect(hx - 3 * dpr, plotBottom - hBarH, 6 * dpr, hBarH);
                  ctx.fillStyle = 'hsla(' + hue + ', 90%, 80%, 0.95)';
                  ctx.fillRect(hx - 3 * dpr, plotBottom - hBarH, 6 * dpr, 3 * dpr);
                  // Draw folded alias spectral bar inside [0, f_s/2] when harmonic exceeds Nyquist
                  if (digOn && digMeta && (hb * freq) > digMeta.nyquistFreqHz + 1e-6) {
                    var fFolded = Math.abs(hb * freq - Math.round((hb * freq) / digMeta.sampleRateHz) * digMeta.sampleRateHz);
                    var foldX = 20 * dpr + (fFolded / maxFreqDisp) * (cW - 40 * dpr);
                    ctx.save();
                    ctx.fillStyle = 'rgba(251,113,133,0.34)';
                    ctx.strokeStyle = '#fb7185';
                    ctx.setLineDash([2 * dpr, 2 * dpr]);
                    ctx.lineWidth = 1.2 * dpr;
                    ctx.fillRect(foldX - 2.5 * dpr, plotBottom - hBarH, 5 * dpr, hBarH);
                    ctx.strokeRect(foldX - 2.5 * dpr, plotBottom - hBarH, 5 * dpr, hBarH);
                    ctx.restore();
                  }
                  if (filtRel > 0.08) {
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.font = (5.5 * dpr) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(hb + 'f\u2081', hx, plotBottom - hBarH - 4 * dpr);
                    ctx.textAlign = 'left';
                  }
                }

                // Cutoff frequency marker line for lowpass / highpass filters
                if (specFilter === 'lowpass' || specFilter === 'highpass') {
                  var cutHarmPos = specFilter === 'lowpass' ? (specCutoff + 0.5) : Math.max(0.5, specCutoff - 0.5);
                  var cutX = 20 * dpr + (cutHarmPos * freq / maxFreqDisp) * (cW - 40 * dpr);
                  ctx.save();
                  ctx.strokeStyle = '#fbbf24';
                  ctx.lineWidth = 1.6 * dpr;
                  ctx.setLineDash([5 * dpr, 3 * dpr]);
                  ctx.beginPath();
                  ctx.moveTo(cutX, plotTop - 4 * dpr);
                  ctx.lineTo(cutX, plotBottom);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.fillStyle = '#fde68a';
                  ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText((specFilter === 'lowpass' ? 'LP Hc=' : 'HP Hc=') + specCutoff, Math.max(36 * dpr, Math.min(cW - 36 * dpr, cutX)), plotTop + 6 * dpr);
                  ctx.restore();
                }

                // Top-right Nyquist & ADC HUD pill when digital sampling is active
                if (digOn && digMeta) {
                  ctx.save();
                  var hudSpecTxt = 'ADC ' + adcBits + '-bit | f\u209B=' + digMeta.sampleRateHz.toFixed(1) + 'Hz | SQNR ' + digMeta.sqnrDb.toFixed(1) + 'dB' + (digMeta.isFundamentalAliased ? (' | ALIAS ' + digMeta.aliasFreqHz.toFixed(1) + 'Hz') : '');
                  ctx.font = 'bold ' + (7.5 * dpr) + 'px sans-serif';
                  var hudSpecW = ctx.measureText(hudSpecTxt).width + 14 * dpr;
                  var hudSpecX = Math.max(8 * dpr, cW - hudSpecW - 8 * dpr);
                  var hudSpecY = 6 * dpr;
                  ctx.fillStyle = digMeta.isFundamentalAliased ? 'rgba(136,19,55,0.86)' : 'rgba(15,23,42,0.86)';
                  ctx.strokeStyle = digMeta.isFundamentalAliased ? 'rgba(251,113,133,0.75)' : 'rgba(251,191,36,0.65)';
                  ctx.lineWidth = 1 * dpr;
                  ctx.fillRect(hudSpecX, hudSpecY, hudSpecW, 18 * dpr);
                  ctx.strokeRect(hudSpecX, hudSpecY, hudSpecW, 18 * dpr);
                  ctx.fillStyle = digMeta.isFundamentalAliased ? '#fecdd3' : '#fde68a';
                  ctx.textAlign = 'left';
                  ctx.fillText(hudSpecTxt, hudSpecX + 7 * dpr, hudSpecY + 12 * dpr);
                  ctx.restore();
                }

                // Render Wave 2 spectral line when Show Second Wave is enabled
                if (showSecond) {
                  var rel2 = Math.min(1, wave2Mag / normMaxMag);
                  var hx2 = 20 * dpr + (freq2 / maxFreqDisp) * (cW - 40 * dpr);
                  var h2BarH = Math.max(6 * dpr, rel2 * (plotBottom - plotTop));
                  ctx.save();
                  ctx.fillStyle = 'rgba(244,114,182,0.92)';
                  ctx.fillRect(hx2 - 3.5 * dpr, plotBottom - h2BarH, 7 * dpr, h2BarH);
                  ctx.fillStyle = '#fbcfe8';
                  ctx.fillRect(hx2 - 3.5 * dpr, plotBottom - h2BarH, 7 * dpr, 3 * dpr);
                  ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('f\u2082 (' + freq2 + ' Hz)', hx2, Math.max(plotTop + 4 * dpr, plotBottom - h2BarH - 4 * dpr));
                  ctx.restore();
                }

                // Frequency axis labels
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = (5 * dpr) + 'px sans-serif';
                for (var fl = 0; fl < 5; fl++) {
                  var fLabel = (fl * maxFreqDisp / 4).toFixed(1).replace(/\.0$/, '');
                  ctx.fillText(fLabel + ' Hz', 20 * dpr + fl * (cW - 40 * dpr) / 4, cH - 3 * dpr);
                }

              } else if (currentMode === 'reflection') {
                // ========== REFLECTION & TWO-MEDIUM REFRACTION MODE ==========
                // A traveling wave moves right and hits a boundary wall/interface.
                // Fixed-end reflection inverts phase; free-end preserves phase.
                // When reflectivity < 1.0, remaining wave energy (1 - R^2) transmits
                // into Medium 2 with speed v2 = medium2Ratio * v1 (and k2 = k / medium2Ratio).
                var midY_r = cH / 2;
                var wallFracFallback = parseFloat(canvasEl.dataset.wallFrac || '0.75');
                var defWall = cW * (isFinite(wallFracFallback) ? wallFracFallback : 0.75);
                var wallX = canvasEl._drag.wallX != null ? canvasEl._drag.wallX : defWall;
                var endType = canvasEl.dataset.reflectionEnd || 'fixed'; // 'fixed' | 'free'
                var phaseFlip = endType === 'fixed' ? -1 : 1; // fixed-end inverts
                var refReflectivity = parseFloat(canvasEl.dataset.reflectivity || '0.9');
                var impCoupled = canvasEl.dataset.impedanceCoupled === 'true';
                var arCoatingActive = canvasEl.dataset.antiReflectionCoating === 'true';
                var fresPol = canvasEl.dataset.fresnelPolarization === 'p' ? 'p' : 's';
                var brewsterMatch = canvasEl.dataset.brewsterMatch === 'true';
                var medium2Ratio = parseFloat(canvasEl.dataset.medium2Ratio || '0.6');
                if (!isFinite(medium2Ratio) || medium2Ratio <= 0) medium2Ratio = 0.6;
                var incDeg = parseFloat(canvasEl.dataset.incidentAngle || '0');
                if (!isFinite(incDeg) || incDeg < 0) incDeg = 0;
                if (incDeg > 85) incDeg = 85;
                var sinTheta1 = Math.sin(incDeg * Math.PI / 180);
                var sinTheta2 = medium2Ratio * sinTheta1;
                var isTIR = medium2Ratio > 1 && sinTheta2 > 1.000001;
                var ftirOn = isTIR && canvasEl.dataset.ftirEnabled === 'true';
                var ftirGapLam = parseFloat(canvasEl.dataset.ftirGapLambda || '0.25');
                if (!isFinite(ftirGapLam) || ftirGapLam <= 0) ftirGapLam = 0.25;
                var dpLambda = parseFloat(canvasEl.dataset.penetrationDepthLambda || '');
                var tunnelPct = parseFloat(canvasEl.dataset.tunnelTransmissionPct || '0');
                if (!isFinite(tunnelPct) || tunnelPct < 0) tunnelPct = 0;
                var dsEffRef = parseFloat(canvasEl.dataset.effectiveReflectivity || '');
                var effReflectivity = (isTIR && !(ftirOn && isFinite(dsEffRef)))
                  ? 1.0
                  : (isFinite(dsEffRef) ? Math.max(0, Math.min(1, dsEffRef)) : refReflectivity);
                if (canvasEl.dataset.effectivePhaseFlip === '1' || canvasEl.dataset.effectivePhaseFlip === '-1') {
                  phaseFlip = parseInt(canvasEl.dataset.effectivePhaseFlip, 10);
                }
                var transAmp = (isTIR && !ftirOn) ? 0 : Math.sqrt(Math.max(0, 1 - effReflectivity * effReflectivity));
                var tirRoom = Math.max(30 * dpr, cW - wallX - 24 * dpr);
                var visLambdaPx = ftirOn
                  ? Math.min(Math.max(34 * dpr, cW / Math.max(1, freq)), tirRoom / 1.15)
                  : Math.max(40 * dpr, cW / Math.max(1, freq));
                var dpValLam = (isFinite(dpLambda) && dpLambda > 0) ? dpLambda : 0.28;
                var dpPx = Math.max(7 * dpr, dpValLam * visLambdaPx);
                var wall2X = ftirOn
                  ? Math.min(cW - 18 * dpr, wallX + Math.max(8 * dpr, ftirGapLam * visLambdaPx))
                  : cW;
                var refAmp = amp * dpr;
                var k = 2 * Math.PI * freq / cW;
                var k2 = k / medium2Ratio;
                var omega = freq * 0.05 * speed;

                // Directional energy fields separate incoming, returning, and transmitted media
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                var incidentField = ctx.createLinearGradient(0, 0, wallX, 0);
                incidentField.addColorStop(0, 'rgba(59,130,246,0.04)');
                incidentField.addColorStop(1, 'rgba(59,130,246,0.17)');
                ctx.fillStyle = incidentField; ctx.fillRect(0, 0, wallX, cH);
                var reflectedField = ctx.createLinearGradient(wallX, 0, 0, 0);
                reflectedField.addColorStop(0, 'rgba(244,114,182,' + (0.16 * effReflectivity).toFixed(3) + ')');
                reflectedField.addColorStop(1, 'rgba(244,114,182,0.02)');
                ctx.fillStyle = reflectedField; ctx.fillRect(0, 0, wallX, cH);
                if (isTIR && wallX < cW - 10) {
                  var evanEndX = ftirOn ? wall2X : cW;
                  var evanField = ctx.createLinearGradient(wallX, 0, Math.min(evanEndX, wallX + Math.max(36 * dpr, dpPx * 2.2)), 0);
                  evanField.addColorStop(0, 'rgba(251,191,36,0.24)');
                  evanField.addColorStop(1, ftirOn ? 'rgba(251,191,36,0.05)' : 'rgba(251,191,36,0)');
                  ctx.fillStyle = evanField; ctx.fillRect(wallX, 0, Math.max(0, evanEndX - wallX), cH);
                  if (ftirOn && wall2X < cW - 10) {
                    var ftirField = ctx.createLinearGradient(wall2X, 0, cW, 0);
                    ftirField.addColorStop(0, 'rgba(52,211,153,' + (0.20 * transAmp).toFixed(3) + ')');
                    ftirField.addColorStop(1, 'rgba(52,211,153,0.04)');
                    ctx.fillStyle = ftirField; ctx.fillRect(wall2X, 0, cW - wall2X, cH);
                  }
                } else if (effReflectivity < 0.999 && wallX < cW - 10) {
                  var transField = ctx.createLinearGradient(wallX, 0, cW, 0);
                  transField.addColorStop(0, 'rgba(52,211,153,' + (0.18 * transAmp).toFixed(3) + ')');
                  transField.addColorStop(1, 'rgba(52,211,153,0.03)');
                  ctx.fillStyle = transField; ctx.fillRect(wallX, 0, cW - wallX, cH);
                }
                ctx.restore();

                // Build incident + reflected superposed curve in Medium 1 (x < wallX)
                function traceCombinedReflection() {
                  ctx.beginPath();
                  var started = false;
                  for (var rx = 0; rx < wallX; rx += 2) {
                    var phaseIn = k * rx - omega * t;
                    var phaseRe = k * (2 * wallX - rx) - omega * t;
                    var yi = Math.sin(phaseIn);
                    var yre = phaseFlip * effReflectivity * Math.sin(phaseRe);
                    var ry = midY_r - (yi + yre) * refAmp;
                    if (!started) { ctx.moveTo(rx, ry); started = true; } else ctx.lineTo(rx, ry);
                  }
                }
                ctx.strokeStyle=accent; ctx.shadowColor=accent;
                traceCombinedReflection(); ctx.save(); ctx.globalAlpha=.18; ctx.lineWidth=12*dpr; ctx.shadowBlur=24; ctx.stroke(); ctx.restore();
                traceCombinedReflection(); ctx.lineWidth=3*dpr; ctx.globalAlpha=1; ctx.shadowBlur=8; ctx.stroke();
                traceCombinedReflection(); ctx.save(); ctx.globalAlpha=.3; ctx.strokeStyle='#fff'; ctx.lineWidth=.8*dpr; ctx.shadowBlur=0; ctx.stroke(); ctx.restore();
                ctx.shadowBlur=0;

                // Faintly show incident component alone up to the wall (dashed blue)
                ctx.strokeStyle = 'rgba(96,165,250,0.45)';
                ctx.lineWidth = 1.5 * dpr;
                ctx.setLineDash([6, 5]);
                ctx.beginPath();
                for (var rx2 = 0; rx2 <= wallX; rx2 += 2) {
                  var yi2 = Math.sin(k * rx2 - omega * t);
                  var ry2 = midY_r - yi2 * refAmp;
                  if (rx2 === 0) ctx.moveTo(rx2, ry2); else ctx.lineTo(rx2, ry2);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // Faintly show reflected component alone (dashed magenta)
                ctx.strokeStyle = 'rgba(244,114,182,0.45)';
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                for (var rx3 = 0; rx3 < wallX; rx3 += 2) {
                  var yre3 = phaseFlip * effReflectivity * Math.sin(k * (2 * wallX - rx3) - omega * t);
                  var ry3 = midY_r - yre3 * refAmp;
                  if (rx3 === 0) ctx.moveTo(rx3, ry3); else ctx.lineTo(rx3, ry3);
                }
                ctx.stroke();
                ctx.setLineDash([]);

                // Transmitted wave OR Evanescent decay in Medium 2 (x >= wallX)
                if (isTIR && wallX < cW - 4) {
                  ctx.save();
                  ctx.strokeStyle = '#fbbf24';
                  ctx.lineWidth = 2.2 * dpr;
                  ctx.setLineDash([4 * dpr, 3 * dpr]);
                  var evanStopX = ftirOn ? wall2X : cW;
                  ctx.beginPath();
                  for (var ex = wallX; ex <= evanStopX; ex += 2) {
                    var evDecay = Math.exp(-(ex - wallX) / dpPx);
                    var ey = midY_r - 0.65 * refAmp * evDecay * Math.sin(k * wallX - omega * t);
                    if (ex === wallX) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
                  }
                  ctx.stroke();
                  ctx.setLineDash([]);
                  var dpTickX = wallX + dpPx;
                  if (dpTickX < (ftirOn ? wall2X : cW - 14 * dpr)) {
                    ctx.strokeStyle = 'rgba(251,191,36,0.55)';
                    ctx.lineWidth = 1.2 * dpr;
                    ctx.setLineDash([3 * dpr, 3 * dpr]);
                    ctx.beginPath();
                    ctx.moveTo(dpTickX, midY_r - refAmp * 0.55);
                    ctx.lineTo(dpTickX, midY_r + refAmp * 0.55);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#fde68a';
                    ctx.font = 'bold ' + (8.5 * dpr) + 'px sans-serif';
                    ctx.fillText('d\u209A=' + dpValLam.toFixed(2) + '\u03BB', dpTickX + 4 * dpr, midY_r - refAmp * 0.55 - 3 * dpr);
                  }
                  ctx.restore();
                  if (ftirOn && wall2X < cW - 8 * dpr) {
                    ctx.save();
                    ctx.strokeStyle = '#22d3ee';
                    ctx.lineWidth = 2 * dpr;
                    ctx.setLineDash([5 * dpr, 3 * dpr]);
                    ctx.beginPath();
                    ctx.moveTo(wall2X, 18 * dpr);
                    ctx.lineTo(wall2X, cH - 18 * dpr);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    if (transAmp > 0.02) {
                      ctx.strokeStyle = '#34d399';
                      ctx.shadowColor = '#34d399';
                      ctx.shadowBlur = 10;
                      ctx.lineWidth = 2.6 * dpr;
                      ctx.beginPath();
                      for (var ftx = wall2X; ftx <= cW; ftx += 2) {
                        var ftPhase = k * wallX + k * (ftx - wall2X) - omega * t;
                        var fty = midY_r - transAmp * refAmp * Math.sin(ftPhase);
                        if (ftx === wall2X) ctx.moveTo(ftx, fty); else ctx.lineTo(ftx, fty);
                      }
                      ctx.stroke();
                    }
                    ctx.restore();
                  }
                } else if (effReflectivity < 0.999 && wallX < cW - 4) {
                  ctx.save();
                  ctx.strokeStyle = '#34d399';
                  ctx.shadowColor = '#34d399';
                  ctx.shadowBlur = 10;
                  ctx.lineWidth = 2.6 * dpr;
                  ctx.beginPath();
                  for (var tx = wallX; tx <= cW; tx += 2) {
                    var phaseTr = k * wallX + k2 * (tx - wallX) - omega * t;
                    var ty = midY_r - transAmp * refAmp * Math.sin(phaseTr);
                    if (tx === wallX) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
                  }
                  ctx.stroke();
                  ctx.restore();
                }

                // Animated energy-direction chevrons make travel direction explicit
                ctx.save();
                function drawEnergyArrow(ax, ay, dir, color, alpha) {
                  ctx.globalAlpha=alpha; ctx.strokeStyle=color; ctx.lineWidth=1.6*dpr; ctx.lineCap='round';
                  ctx.beginPath(); ctx.moveTo(ax-dir*8*dpr,ay); ctx.lineTo(ax+dir*8*dpr,ay); ctx.lineTo(ax+dir*3*dpr,ay-4*dpr); ctx.moveTo(ax+dir*8*dpr,ay); ctx.lineTo(ax+dir*3*dpr,ay+4*dpr); ctx.stroke();
                }
                var arrowOffset=(tick*1.2*speed)%(90*dpr);
                for(var ia=35*dpr+arrowOffset;ia<wallX-20*dpr;ia+=90*dpr)drawEnergyArrow(ia,54*dpr,1,'#60a5fa',.72);
                for(var ra=wallX-35*dpr-arrowOffset;ra>20*dpr;ra-=90*dpr)drawEnergyArrow(ra,72*dpr,-1,'#f472b6',.42+.3*effReflectivity);
                if ((ftirOn && transAmp > 0.03) || (!isTIR && effReflectivity < 0.999)) {
                  var transStartArrow = ftirOn ? (wall2X + 16 * dpr) : (wallX + 24 * dpr);
                  var transArrowSpeed = ftirOn ? 1 : medium2Ratio;
                  var transArrowOffset = (tick * 1.2 * speed * transArrowSpeed) % (90 * dpr);
                  for (var ta = transStartArrow + transArrowOffset; ta < cW - 18 * dpr; ta += 90 * dpr) {
                    drawEnergyArrow(ta, 54 * dpr, 1, '#34d399', Math.max(0.25, 0.8 * transAmp));
                  }
                }
                ctx.restore();

                // Snell's Law ray inset when oblique incidence is set (incDeg > 0)
                if (incDeg > 0) {
                  ctx.save();
                  var rayCy = cH - 36 * dpr;
                  var rayLen = 30 * dpr;
                  var th1 = incDeg * Math.PI / 180;
                  // Interface normal dashed line
                  ctx.strokeStyle = 'rgba(226,232,240,0.5)';
                  ctx.lineWidth = 1 * dpr;
                  ctx.setLineDash([3 * dpr, 3 * dpr]);
                  ctx.beginPath();
                  ctx.moveTo(wallX - rayLen, rayCy);
                  ctx.lineTo(wallX + rayLen, rayCy);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  // Incident ray
                  ctx.strokeStyle = '#60a5fa';
                  ctx.lineWidth = 2 * dpr;
                  ctx.beginPath();
                  ctx.moveTo(wallX - Math.cos(th1) * rayLen, rayCy - Math.sin(th1) * rayLen);
                  ctx.lineTo(wallX, rayCy);
                  ctx.stroke();
                  // Reflected ray (dims toward 0 at Brewster's angle in TM p-polarization)
                  ctx.save();
                  ctx.globalAlpha = Math.max(0.12, effReflectivity);
                  if (effReflectivity < 0.03) ctx.setLineDash([2 * dpr, 3 * dpr]);
                  ctx.strokeStyle = '#f472b6';
                  ctx.beginPath();
                  ctx.moveTo(wallX, rayCy);
                  ctx.lineTo(wallX - Math.cos(th1) * rayLen, rayCy + Math.sin(th1) * rayLen);
                  ctx.stroke();
                  ctx.restore();
                  if (!isTIR && effReflectivity < 0.999) {
                    var th2 = Math.asin(Math.max(-1, Math.min(1, sinTheta2)));
                    ctx.strokeStyle = '#34d399';
                    ctx.beginPath();
                    ctx.moveTo(wallX, rayCy);
                    ctx.lineTo(wallX + Math.cos(th2) * rayLen, rayCy + Math.sin(th2) * rayLen);
                    ctx.stroke();
                  }
                  if (impCoupled) {
                    ctx.fillStyle = brewsterMatch ? '#38bdf8' : 'rgba(226,232,240,0.85)';
                    ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                    ctx.fillText(brewsterMatch ? '90\u00B0 BREWSTER R=0%' : (fresPol === 'p' ? 'TM (p-pol)' : 'TE (s-pol)'), Math.max(8 * dpr, wallX - rayLen - 34 * dpr), rayCy - rayLen * 0.45);
                  }
                  ctx.restore();
                }

                // Boundary-impact glow tracks the instantaneous arriving amplitude
                var impactStrength=.25+.55*Math.abs(Math.sin(k*wallX-omega*t));
                var impactGlow=ctx.createRadialGradient(wallX,midY_r,0,wallX,midY_r,55*dpr);
                impactGlow.addColorStop(0,'rgba(251,191,36,'+impactStrength.toFixed(3)+')');
                impactGlow.addColorStop(.25,'rgba(251,113,133,'+(impactStrength*.28).toFixed(3)+')');
                impactGlow.addColorStop(1,'rgba(251,191,36,0)');
                ctx.fillStyle=impactGlow;ctx.beginPath();ctx.arc(wallX,midY_r,55*dpr,0,Math.PI*2);ctx.fill();
                // Draw the boundary wall / interface (draggable handle)
                var wallActive = canvasEl._drag.activeHandle === 'wall';
                ctx.fillStyle = effReflectivity < 0.999
                  ? (wallActive ? 'rgba(251,191,36,0.92)' : 'rgba(251,191,36,0.68)')
                  : (wallActive ? 'rgba(251,191,36,0.95)' : 'rgba(251,191,36,0.75)');
                ctx.fillRect(wallX - 2.5 * dpr, 30 * dpr, 5 * dpr, cH - 60 * dpr);
                if (effReflectivity >= 0.999 && !isTIR) {
                  ctx.strokeStyle = wallActive ? '#fff' : 'rgba(0,0,0,0.5)';
                  ctx.lineWidth = 1;
                  for (var wh = 30 * dpr; wh < cH - 30 * dpr; wh += 8 * dpr) {
                    ctx.beginPath();
                    ctx.moveTo(wallX + 3 * dpr, wh);
                    ctx.lineTo(wallX + 12 * dpr, wh + 6 * dpr);
                    ctx.stroke();
                  }
                }
                // Wall drag handle indicator
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(wallX, midY_r, 10 * dpr, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold ' + (11 * dpr) + 'px sans-serif';
                ctx.fillText('⇔', wallX - 6 * dpr, midY_r + 3 * dpr);

                // Quarter-wave Anti-Reflection Coating thin film on incident face
                if (arCoatingActive && !isTIR && wallX > 16 * dpr && wallX < cW - 10 * dpr) {
                  var filmW = 10 * dpr;
                  var filmX = wallX - filmW - 2.5 * dpr;
                  ctx.save();
                  ctx.fillStyle = 'rgba(34,211,238,0.28)';
                  ctx.strokeStyle = 'rgba(103,232,249,0.9)';
                  ctx.lineWidth = 1.4 * dpr;
                  ctx.fillRect(filmX, 30 * dpr, filmW, cH - 60 * dpr);
                  ctx.strokeRect(filmX, 30 * dpr, filmW, cH - 60 * dpr);
                  ctx.fillStyle = '#a5f3fc';
                  ctx.font = 'bold ' + (8.5 * dpr) + 'px sans-serif';
                  ctx.fillText('\u03BB/4 AR COATING', Math.max(8 * dpr, filmX - 58 * dpr), 42 * dpr);
                  ctx.restore();
                }

                // Medium & end-type labels
                if (impCoupled) {
                  ctx.fillStyle = brewsterMatch ? '#38bdf8' : (arCoatingActive ? '#22d3ee' : (phaseFlip < 0 ? '#f472b6' : '#34d399'));
                  ctx.font = 'bold ' + (10 * dpr) + 'px sans-serif';
                  ctx.fillText('IMPEDANCE LOCK', Math.max(12 * dpr, wallX - 46 * dpr), 18 * dpr);
                  ctx.fillStyle = 'rgba(255,255,255,0.72)';
                  ctx.font = (9 * dpr) + 'px sans-serif';
                  var lockSub = brewsterMatch
                    ? '(TM p-pol: Brewster R=0%)'
                    : (arCoatingActive
                      ? '(\u03BB/4 AR: |r|=' + effReflectivity.toFixed(2) + ')'
                      : (fresPol.toUpperCase() + '-pol ' + (phaseFlip < 0 ? '(\u03C0 flip)' : '(upright)')));
                  ctx.fillText(lockSub, Math.max(12 * dpr, wallX - 46 * dpr), 29 * dpr);
                } else {
                  ctx.fillStyle = endType === 'fixed' ? '#ef4444' : '#22c55e';
                  ctx.font = 'bold ' + (10 * dpr) + 'px sans-serif';
                  ctx.fillText(endType === 'fixed' ? 'FIXED END' : 'FREE END', Math.max(12 * dpr, wallX - 30 * dpr), 18 * dpr);
                  ctx.fillStyle = 'rgba(255,255,255,0.65)';
                  ctx.font = (9 * dpr) + 'px sans-serif';
                  ctx.fillText(endType === 'fixed' ? '(phase inverts)' : '(phase preserved)', Math.max(12 * dpr, wallX - 36 * dpr), 29 * dpr);
                }
                if ((isTIR || effReflectivity < 0.999) && wallX < cW - 115 * dpr) {
                  if (ftirOn) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                    ctx.fillText('FTIR GAP d=' + ftirGapLam.toFixed(2) + '\u03BB', wallX + 10 * dpr, 18 * dpr);
                    ctx.fillStyle = '#34d399';
                    ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                    var m3X = Math.min(cW - 115 * dpr, Math.max(wallX + 10 * dpr, wall2X + 8 * dpr));
                    ctx.fillText('M3 PRISM \u00B7 T=' + tunnelPct.toFixed(1) + '%', m3X, 30 * dpr);
                  } else {
                    ctx.fillStyle = 'rgba(110,231,183,0.9)';
                    ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                    ctx.fillText('MEDIUM 2 (v\u2082=' + medium2Ratio.toFixed(2) + 'v\u2081)', wallX + 14 * dpr, 18 * dpr);
                    if (isTIR) {
                      ctx.fillStyle = '#fbbf24';
                      ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
                      ctx.fillText('TIR \u2014 Evanescent d\u209A=' + dpValLam.toFixed(2) + '\u03BB', wallX + 14 * dpr, 30 * dpr);
                    }
                  }
                }
              }

              // Wavelength annotation

              if (currentMode === 'free') {

                var wavelengthPx = cW / freq;

                if (wavelengthPx > 40) {

                  var arrowY = cH - 20 * dpr;

                  ctx.strokeStyle = '#fbbf24';

                  ctx.lineWidth = 2;

                  ctx.setLineDash([]);

                  ctx.beginPath(); ctx.moveTo(10, arrowY); ctx.lineTo(10 + wavelengthPx, arrowY); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(10, arrowY - 5 * dpr); ctx.lineTo(10, arrowY + 5 * dpr); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(10 + wavelengthPx, arrowY - 5 * dpr); ctx.lineTo(10 + wavelengthPx, arrowY + 5 * dpr); ctx.stroke();

                  ctx.fillStyle = '#fbbf24';

                  ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

                  var canvasWL = parseFloat(canvasEl.dataset.waveSpeed || '343') / freq; ctx.fillText('\u03BB = ' + canvasWL.toFixed(1) + ' m', 10 + wavelengthPx / 2 - 20 * dpr, arrowY - 5 * dpr);

                }

              }

              // Interactive Wave Probe crosshair reticle overlay
              if (canvasEl.dataset.probeEnabled === 'true') {
                var pxRaw = parseFloat(canvasEl.dataset.probeX);
                var pyRaw = parseFloat(canvasEl.dataset.probeY);
                var pRet = canvasEl._drag.probe || {
                  x: (isFinite(pxRaw) ? pxRaw : 0.62) * cW,
                  y: (isFinite(pyRaw) ? pyRaw : 0.32) * cH
                };
                var ppx = Math.max(12, Math.min(cW - 12, pRet.x));
                var ppy = Math.max(12, Math.min(cH - 12, pRet.y));
                ctx.save();
                if (currentMode === 'ripple') {
                  var pBar = canvasEl.dataset.rippleBarrier || 'none';
                  var rSep = parseFloat(canvasEl.dataset.rippleSeparation || '80') * dpr;
                  var pr1, pr2;
                  if (pBar === 'doubleSlit') {
                    var pBarX = cW * 0.30;
                    var pSlitF = parseFloat(canvasEl.dataset.slitWidth || '0.08');
                    var pSlitHalf = Math.max(10 * dpr, (isFinite(pSlitF) ? pSlitF : 0.08) * cH) * 0.5;
                    var pGap = Math.min(cH * 0.34, Math.max(rSep * 0.5, pSlitHalf + 16 * dpr));
                    pr1 = { x: pBarX, y: cH / 2 - pGap };
                    pr2 = { x: pBarX, y: cH / 2 + pGap };
                  } else if (pBar !== 'none') {
                    pr1 = { x: cW * 0.30, y: cH / 2 };
                    pr2 = null;
                  } else {
                    pr1 = canvasEl._drag.ripple1 || { x: cW / 2 - rSep / 2, y: cH / 2 };
                    pr2 = canvasEl._drag.ripple2 || { x: cW / 2 + rSep / 2, y: cH / 2 };
                  }
                  ctx.strokeStyle = 'rgba(103,232,249,0.72)';
                  ctx.lineWidth = 1.4 * dpr;
                  ctx.setLineDash([4 * dpr, 4 * dpr]);
                  ctx.beginPath(); ctx.moveTo(pr1.x, pr1.y); ctx.lineTo(ppx, ppy); ctx.stroke();
                  if (pr2) {
                    ctx.beginPath(); ctx.moveTo(pr2.x, pr2.y); ctx.lineTo(ppx, ppy); ctx.stroke();
                  }
                  ctx.setLineDash([]);
                }
                var prActive = canvasEl._drag.activeHandle === 'probe';
                ctx.strokeStyle = prActive ? '#ffffff' : '#fbbf24';
                ctx.lineWidth = 2 * dpr;
                ctx.beginPath(); ctx.arc(ppx, ppy, 11 * dpr, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(ppx - 16 * dpr, ppy); ctx.lineTo(ppx - 5 * dpr, ppy);
                ctx.moveTo(ppx + 5 * dpr, ppy); ctx.lineTo(ppx + 16 * dpr, ppy);
                ctx.moveTo(ppx, ppy - 16 * dpr); ctx.lineTo(ppx, ppy - 5 * dpr);
                ctx.moveTo(ppx, ppy + 5 * dpr); ctx.lineTo(ppx, ppy + 16 * dpr);
                ctx.stroke();
                ctx.fillStyle = '#22d3ee';
                ctx.beginPath(); ctx.arc(ppx, ppy, 3 * dpr, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fde68a';
                ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                ctx.fillText('PROBE', ppx + 14 * dpr < cW - 42 * dpr ? ppx + 14 * dpr : ppx - 44 * dpr, ppy - 8 * dpr > 14 * dpr ? ppy - 8 * dpr : ppy + 14 * dpr);
                ctx.restore();
              }

              // Interactive Wavelength Caliper Ruler overlay
              if (canvasEl.dataset.showRuler === 'true') {
                var rx1Ds = parseFloat(canvasEl.dataset.rulerX1 || '0.25');
                var rx2Ds = parseFloat(canvasEl.dataset.rulerX2 || '0.75');
                var rX1Px = canvasEl._drag.ruler1 != null ? canvasEl._drag.ruler1 : ((isFinite(rx1Ds) ? rx1Ds : 0.25) * cW);
                var rX2Px = canvasEl._drag.ruler2 != null ? canvasEl._drag.ruler2 : ((isFinite(rx2Ds) ? rx2Ds : 0.75) * cW);
                rX1Px = Math.max(cW * 0.04, Math.min(cW * 0.96, rX1Px));
                rX2Px = Math.max(cW * 0.04, Math.min(cW * 0.96, rX2Px));
                var loPx = Math.min(rX1Px, rX2Px);
                var hiPx = Math.max(rX1Px, rX2Px);
                var rY = Math.round(cH * 0.12);
                var rrDraw = waveComputeRulerReadout({
                  waveMode: currentMode,
                  frequency: freq,
                  waveSpeed: parseFloat(canvasEl.dataset.waveSpeed || '343') || 343,
                  harmonic: parseInt(canvasEl.dataset.harmonic || '1', 10) || 1,
                  standingBoundary: canvasEl.dataset.standingBoundary || 'bothFixed',
                  longitudinalMode: canvasEl.dataset.longitudinalMode || 'traveling',
                  medium2Ratio: parseFloat(canvasEl.dataset.medium2Ratio || '0.6') || 0.6,
                  wallFrac: (canvasEl.dataset.wallFrac !== '' && canvasEl.dataset.wallFrac != null) ? parseFloat(canvasEl.dataset.wallFrac) : null,
                  rulerX1: rX1Px / cW,
                  rulerX2: rX2Px / cW
                });
                ctx.save();
                ctx.fillStyle = 'rgba(34,211,238,0.08)';
                ctx.fillRect(loPx, rY, Math.max(2, hiPx - loPx), Math.max(10, cH * 0.78 - rY));
                ctx.strokeStyle = 'rgba(103,232,249,0.75)';
                ctx.lineWidth = 1.4 * dpr;
                ctx.setLineDash([4 * dpr, 4 * dpr]);
                ctx.beginPath();
                ctx.moveTo(rX1Px, rY); ctx.lineTo(rX1Px, cH * 0.80);
                ctx.moveTo(rX2Px, rY); ctx.lineTo(rX2Px, cH * 0.80);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.strokeStyle = rrDraw.isWholeMultiple ? '#34d399' : (rrDraw.isHalfMultiple ? '#fbbf24' : '#67e8f9');
                ctx.lineWidth = 2.4 * dpr;
                ctx.beginPath(); ctx.moveTo(loPx, rY); ctx.lineTo(hiPx, rY); ctx.stroke();
                [
                  { x: rX1Px, active: canvasEl._drag.activeHandle === 'ruler1' },
                  { x: rX2Px, active: canvasEl._drag.activeHandle === 'ruler2' }
                ].forEach(function (jaw) {
                  ctx.fillStyle = jaw.active ? '#ffffff' : '#22d3ee';
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = 1.5 * dpr;
                  ctx.beginPath(); ctx.arc(jaw.x, rY, 6 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                });
                var rBadge = '\u0394x = ' + rrDraw.spanCycles.toFixed(2) + '\u03BB (' + rrDraw.spanMeters.toFixed(1) + ' m)';
                ctx.font = 'bold ' + Math.round(9.5 * dpr) + 'px monospace';
                var rbW = ctx.measureText(rBadge).width + 14 * dpr;
                var rbX = Math.max(8 * dpr, Math.min(cW - rbW - 8 * dpr, (loPx + hiPx) / 2 - rbW / 2));
                var rbY = Math.max(4 * dpr, rY - 22 * dpr);
                ctx.fillStyle = 'rgba(15,23,42,0.88)';
                ctx.fillRect(rbX, rbY, rbW, 17 * dpr);
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 1 * dpr;
                ctx.strokeRect(rbX, rbY, rbW, 17 * dpr);
                ctx.fillStyle = rrDraw.isWholeMultiple ? '#6ee7b7' : '#e0f2fe';
                ctx.fillText(rBadge, rbX + 7 * dpr, rbY + 12 * dpr);
                ctx.restore();
              }

              scheduleWaveFrame();

            }

            scheduleWaveFrame();

          };



          // Sound playback — oscillators track the sliders live (see syncOsc).
          // With the second wave shown, a second oscillator plays f2 so
          // superposition (and beats, when f1≈f2) is audible, not just visible.

          var applyOscWaveform = function (actx, osc, wType, weightsOpt, filterOpt, cutoffOpt) {
            if (!osc) return;
            var fMode = WAVE_VALID_FILTERS[filterOpt] ? filterOpt : 'none';
            if (fMode !== 'none' && actx && typeof actx.createPeriodicWave === 'function') {
              var fSpec = waveComputeSpectrum({
                waveType: wType || 'sine',
                harmonicWeights: weightsOpt,
                spectrumFilter: fMode,
                filterCutoffHarmonic: cutoffOpt || 3
              }, 12);
              var fReal = new Float32Array(13);
              var fImag = new Float32Array(13);
              for (var fi = 0; fi < fSpec.harmonics.length && fi < 12; fi++) {
                var fh = fSpec.harmonics[fi];
                fReal[fh.order] = fh.cosCoeff * fh.gain;
                fImag[fh.order] = fh.sinCoeff * fh.gain;
              }
              osc.setPeriodicWave(actx.createPeriodicWave(fReal, fImag));
            } else if (wType === 'custom' && actx && typeof actx.createPeriodicWave === 'function') {
              var wArr = waveNormalizeWeights(weightsOpt);
              var real = new Float32Array(7);
              var imag = new Float32Array(7);
              for (var hi = 0; hi < 6; hi++) imag[hi + 1] = wArr[hi] || 0;
              osc.setPeriodicWave(actx.createPeriodicWave(real, imag));
            } else {
              osc.type = wType === 'custom' ? 'sine' : (wType || 'sine');
            }
          };

          var setAudioParamSmooth = function (param, targetVal, actx) {
            if (!param || !isFinite(targetVal)) return;
            try {
              if (actx && typeof param.setTargetAtTime === 'function') {
                param.setTargetAtTime(targetVal, actx.currentTime || 0, 0.025);
              } else {
                param.value = targetVal;
              }
            } catch (e) {
              try { param.value = targetVal; } catch (_) {}
            }
          };

          var syncOscFromState = function (st) {
            if (!_waveAudio.ctx || !_waveAudio.osc) return;
            try {
              var actx = _waveAudio.ctx;
              var ap = waveComputeAudioParams(st);
              setAudioParamSmooth(_waveAudio.osc.frequency, ap.f1Hz, actx);
              setAudioParamSmooth(_waveAudio.gain, ap.gain1, actx);
              var desiredType = st.waveType || 'sine';
              if (st.waveMode === 'standing' || st.waveMode === 'longitudinal' || st.waveMode === 'doppler') desiredType = 'sine';
              var activeFilter = (st.waveMode === 'spectrum' || st.waveMode === 'free') ? (st.spectrumFilter || 'none') : 'none';
              applyOscWaveform(actx, _waveAudio.osc, desiredType, st.harmonicWeights, activeFilter, st.filterCutoffHarmonic);

              if (ap.hasOsc2) {
                if (!_waveAudio.osc2) {
                  var o2 = actx.createOscillator();
                  var g2 = actx.createGain();
                  o2.type = 'sine';
                  o2.frequency.value = ap.f2Hz;
                  g2.gain.value = ap.gain2;
                  o2.connect(g2);
                  g2.connect(actx.destination);
                  o2.start();
                  _waveAudio.osc2 = o2;
                  _waveAudio.gain2 = g2;
                } else {
                  setAudioParamSmooth(_waveAudio.osc2.frequency, ap.f2Hz, actx);
                  setAudioParamSmooth(_waveAudio.gain2, ap.gain2, actx);
                }
              } else if (_waveAudio.osc2) {
                try { _waveAudio.osc2.stop(); _waveAudio.osc2.disconnect(); } catch (e) {}
                try { if (_waveAudio.gain2) _waveAudio.gain2.disconnect(); } catch (e) {}
                _waveAudio.osc2 = null;
                _waveAudio.gain2 = null;
              }
            } catch (e) {}
          };

          var toggleSound = function () {

            if (_waveAudio.ctx) {
              _waveAudioStop();
              upd('soundPlaying', false);
              return;
            }

            try {

              var actx = new (window.AudioContext || window.webkitAudioContext)();
              if (actx.state === 'suspended' && typeof actx.resume === 'function') actx.resume();
              var ap = waveComputeAudioParams(d);
              var osc = actx.createOscillator();
              var gain = actx.createGain();
              var initType = (waveMode === 'standing' || waveMode === 'longitudinal' || waveMode === 'doppler') ? 'sine' : (d.waveType || 'sine');
              var initFilter = (waveMode === 'spectrum' || waveMode === 'free') ? (d.spectrumFilter || 'none') : 'none';
              applyOscWaveform(actx, osc, initType, d.harmonicWeights, initFilter, d.filterCutoffHarmonic);
              osc.frequency.value = ap.f1Hz;
              gain.gain.value = ap.gain1;
              osc.connect(gain);
              gain.connect(actx.destination);
              osc.start();
              _waveAudio.ctx = actx;
              _waveAudio.osc = osc;
              _waveAudio.gain = gain;
              if (ap.hasOsc2) {
                var osc2 = actx.createOscillator();
                var gain2 = actx.createGain();
                osc2.type = 'sine';
                osc2.frequency.value = ap.f2Hz;
                gain2.gain.value = ap.gain2;
                osc2.connect(gain2);
                gain2.connect(actx.destination);
                osc2.start();
                _waveAudio.osc2 = osc2;
                _waveAudio.gain2 = gain2;
              }
              upd('soundPlaying', true);

            } catch (e) {

              addToast(t('stem.wave.u26a0_audio_not_supported_in', '⚠ Audio not supported in this browser'), 'error');

            }

          };

          // Keep a playing tone in sync with the controls (frequency sliders,
          // waveform buttons, equation inputs, canvas arrow keys).
          var syncOsc = function (opts) {
            if (!_waveAudio.osc) return;
            try {
              var nextSt = Object.assign({}, d);
              if (opts && opts.freq != null) nextSt.frequency = opts.freq;
              if (opts && opts.freq2 != null) nextSt.frequency2 = opts.freq2;
              if (opts && opts.type) nextSt.waveType = opts.type;
              if (opts && opts.weights) nextSt.harmonicWeights = opts.weights;
              if (opts && opts.spectrumFilter != null) nextSt.spectrumFilter = opts.spectrumFilter;
              if (opts && opts.filterCutoffHarmonic != null) nextSt.filterCutoffHarmonic = opts.filterCutoffHarmonic;
              syncOscFromState(nextSt);
              if (opts && opts.dopplerFreq != null) {
                setAudioParamSmooth(_waveAudio.osc.frequency, Math.max(50, Math.min(4000, opts.dopplerFreq * 100)), _waveAudio.ctx);
              }
            } catch (e) {}
          };

          var playDopplerFlyby = function () {
            try {
              var f0Hz = Math.max(60, Math.min(3000, d.frequency * 100));
              var fHiHz = (!waveMetrics.isSupersonic && isFinite(waveMetrics.approachingFreq))
                ? Math.max(60, Math.min(3500, waveMetrics.approachingFreq * 100))
                : Math.max(80, Math.min(3500, f0Hz * 2.2));
              var fLoHz = Math.max(50, Math.min(2500, (waveMetrics.recedingFreq || d.frequency * 0.7) * 100));
              if (_waveAudio.dopplerFlyby) {
                try { if (_waveAudio.dopplerFlyby.timer) clearTimeout(_waveAudio.dopplerFlyby.timer); } catch (e) {}
                try { if (_waveAudio.dopplerFlyby.osc) { _waveAudio.dopplerFlyby.osc.stop(); _waveAudio.dopplerFlyby.osc.disconnect(); } } catch (e) {}
                try { if (_waveAudio.dopplerFlyby.gain) _waveAudio.dopplerFlyby.gain.disconnect(); } catch (e) {}
                try { if (_waveAudio.dopplerFlyby.ctx && typeof _waveAudio.dopplerFlyby.ctx.close === 'function') _waveAudio.dopplerFlyby.ctx.close(); } catch (e) {}
                _waveAudio.dopplerFlyby = null;
              }
              var sharedCtx = _waveAudio.ctx || (window.StemLab && typeof window.StemLab.audioContext === 'function' ? window.StemLab.audioContext() : null);
              var ownCtx = !sharedCtx;
              var actx = sharedCtx || new (window.AudioContext || window.webkitAudioContext)();
              if (actx.state === 'suspended' && typeof actx.resume === 'function') actx.resume();
              var oscF = actx.createOscillator();
              var gainF = actx.createGain();
              var now = actx.currentTime || 0;
              oscF.type = 'sawtooth';
              oscF.frequency.setValueAtTime(fHiHz, now);
              oscF.frequency.exponentialRampToValueAtTime(Math.max(50, f0Hz), now + 0.85);
              oscF.frequency.exponentialRampToValueAtTime(Math.max(50, fLoHz), now + 1.65);
              gainF.gain.setValueAtTime(0.01, now);
              gainF.gain.exponentialRampToValueAtTime(0.18, now + 0.85);
              gainF.gain.exponentialRampToValueAtTime(0.008, now + 1.75);
              oscF.connect(gainF);
              gainF.connect(actx.destination);
              oscF.start(now);
              oscF.stop(now + 1.8);
              var timer = setTimeout(function () {
                try { oscF.disconnect(); gainF.disconnect(); } catch (e) {}
                if (ownCtx) { try { actx.close(); } catch (e) {} }
                if (_waveAudio.dopplerFlyby && _waveAudio.dopplerFlyby.timer === timer) _waveAudio.dopplerFlyby = null;
              }, 1900);
              _waveAudio.dopplerFlyby = { timer: timer, osc: oscF, gain: gainF, ctx: ownCtx ? actx : null };
              if (typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_flyby', 'Doppler fly-by sweep: ') + Math.round(fHiHz) + ' Hz down to ' + Math.round(fLoHz) + ' Hz.');
            } catch (e) {
              if (typeof addToast === 'function') addToast(t('stem.wave.u26a0_audio_not_supported_in', '⚠ Audio not supported in this browser'), 'error');
            }
          };



          var checkWaveMatch = function(a, f) {

            if (!d.matchTarget) return;

            var pct = Math.max(0, Math.round((1 - (Math.abs(a - d.matchTarget.amp) / d.matchTarget.amp + Math.abs(f - d.matchTarget.freq) / d.matchTarget.freq) / 2) * 100));

            if (pct > 90 && !d.matchXpClaimed) {

              awardStemXP('wave-match', 15, __alloT('stem.wave.xp_matched_wave', 'Matched a wave exactly!'));

              updPatch({ matchXpClaimed: true, matchedOnce: true });

              addToast('\u2705 Excellent match! Equation mastered! +15 XP', 'success');

            }

          };



          // Helper to render math equations with highlighted inputs

          var renderEq = function(a, f, isTarget, isInteractive) {

             var baseHc = isTarget ? "bg-purple-800/80 text-purple-100 px-1.5 py-0.5 rounded-md mx-0.5 border border-purple-500/50 shadow-sm" : "bg-cyan-800/80 text-cyan-100 px-1.5 py-0.5 rounded-md mx-0.5 border border-cyan-500/50 shadow-sm";

             var tc = isTarget ? "text-purple-400" : "text-cyan-300";

             

             var wrapA = isInteractive ? 

                 React.createElement("input", {

                     type: "number", value: a,

                     'aria-label': __alloT('stem.wave.aria_wave_amplitude', 'Wave amplitude'),
                     'aria-valuetext': a + ' — ' + __alloT('stem.wave.aria_amp_valuetext', 'amplitude sets the wave height (loudness and energy)'),

                     onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) { upd('amplitude', v); try { if (typeof checkWaveMatch !== 'undefined') checkWaveMatch(v, f); } catch(ex){} } },

                     className: "bg-slate-900 border border-cyan-500 text-cyan-300 rounded px-1.5 py-0.5 mx-0.5 text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 w-16 font-mono shadow-sm",

                     min: 10, max: 100, step: 1

                 }) : React.createElement("span", {className: baseHc}, a);



             var wrapF = isInteractive ? 

                 React.createElement("input", {

                     type: "number", value: f,

                     'aria-label': __alloT('stem.wave.aria_wave_frequency', 'Wave frequency'),
                     'aria-valuetext': f + __alloT('stem.wave.aria_freq_vt_a', ' hertz, period ') + (f ? (1 / f).toFixed(2) : '∞') + __alloT('stem.wave.aria_freq_vt_b', ' seconds — frequency sets the pitch'),

                     onChange: function(e) { var v = parseFloat(e.target.value); if (!isNaN(v)) { upd('frequency', v); syncOsc({ freq: v }); try { if (typeof checkWaveMatch !== 'undefined') checkWaveMatch(a, v); } catch(ex){} } },

                     className: "bg-slate-900 border border-cyan-500 text-cyan-300 rounded px-1.5 py-0.5 mx-0.5 text-center focus:outline-none focus:ring-1 focus:ring-cyan-400 w-16 font-mono shadow-sm",

                     min: 0.5, max: 10, step: 0.5

                 }) : React.createElement("span", {className: baseHc}, f);



             if (waveMode === 'standing') {

               var sbGeo = waveStandingGeometry(d.harmonic || 1, d.standingBoundary);
               var nMode = sbGeo.modeIndex;
               var omegaStr = (sbGeo.freqMultiplier * f * 2 * Math.PI).toFixed(1);
               var spaceExpr = sbGeo.boundary === 'openOpen'
                 ? "cos(" + nMode + "\u03C0x/L)"
                 : sbGeo.boundary === 'fixedFree'
                   ? "sin(" + (2 * nMode - 1) + "\u03C0x/2L)"
                   : "sin(" + nMode + "\u03C0x/L)";

               return React.createElement("span", {className: tc + " inline-flex items-center justify-center flex-wrap gap-y-1 align-middle whitespace-nowrap"}, 

                 "y(x,t) =", wrapA, spaceExpr + " cos(", React.createElement("span", {className: baseHc}, omegaStr), "t)"

               );

             } else {

               var kStr = (2 * Math.PI * f).toFixed(1);

               return React.createElement("span", {className: tc + " inline-flex items-center justify-center flex-wrap gap-y-1 align-middle whitespace-nowrap"}, 

                 "y(x,t) =", wrapA, "sin(2\u03C0\u00B7", wrapF, "t \u2212 " + kStr + "x)"

               );

             }

          };



          // Quiz bank

          // Quiz bank \u2014 each distractor carries corrective feedback that names the
          // specific mix-up and, where possible, points at the sim mode that shows it.
          var WAVE_QUIZ = [

            { q: __alloT('stem.wave.quiz1_q', 'What happens to pitch when frequency increases?'), a: 'Goes up', opts: ['Goes up', 'Goes down', 'Stays same', 'Disappears'],
              demo: { waveMode: 'free' },
              wrongFeedback: {
                'Goes down': __alloT('stem.wave.quiz1_fb_goes_down', 'Backwards \u2014 MORE vibrations per second means HIGHER pitch. Slide frequency up with Play Sound on and listen to it climb.'),
                'Stays same': __alloT('stem.wave.quiz1_fb_stays_same', 'Pitch IS your ear\u2019s perception of frequency \u2014 change one and you have changed the other.'),
                'Disappears': __alloT('stem.wave.quiz1_fb_disappears', 'Sound only disappears when AMPLITUDE reaches zero. Frequency changes the pitch, not whether it exists.')
              } },

            { q: __alloT('stem.wave.quiz2_q', 'What does amplitude control?'), a: 'Loudness / height', opts: ['Speed', 'Loudness / height', 'Color', 'Direction'],
              demo: { waveMode: 'free' },
              wrongFeedback: {
                'Speed': __alloT('stem.wave.quiz2_fb_speed', 'Wave speed is set by the MEDIUM (air, water, string tension) \u2014 a louder shout does not arrive any sooner.'),
                'Color': __alloT('stem.wave.quiz2_fb_color', 'For light, FREQUENCY sets the color. Amplitude sets brightness \u2014 and for sound, loudness.'),
                'Direction': __alloT('stem.wave.quiz2_fb_direction', 'Direction comes from the source and reflections. Amplitude is the wave\u2019s height \u2014 how much energy it carries.')
              } },

            { q: __alloT('stem.wave.quiz3_q', 'What is superposition?'), a: 'Waves combining', opts: ['Waves combining', 'Waves canceling', 'Waves reflecting', 'Waves stopping'],
              demo: { waveMode: 'free', showSecond: true },
              wrongFeedback: {
                'Waves canceling': __alloT('stem.wave.quiz3_fb_canceling', 'Canceling is only ONE special case (destructive). Superposition is the general rule: overlapping waves ADD their displacements \u2014 sometimes bigger, sometimes smaller.'),
                'Waves reflecting': __alloT('stem.wave.quiz3_fb_reflecting', 'Reflection is a wave bouncing off a boundary. Superposition is what happens when two waves OVERLAP \u2014 try the Ripple Tank.'),
                'Waves stopping': __alloT('stem.wave.quiz3_fb_stopping', 'Waves pass straight through each other and continue unchanged \u2014 they never stop each other.')
              } },

            { q: __alloT('stem.wave.quiz4_q', 'Destructive interference occurs when...'), a: 'Peaks meet troughs', opts: ['Peaks meet peaks', 'Peaks meet troughs', 'Waves stop', 'Amplitude doubles'],
              demo: { waveMode: 'free', showSecond: true, frequency: 3, frequency2: 3, amplitude: 45, amplitude2: 45, phase2: Math.PI },
              wrongFeedback: {
                'Peaks meet peaks': __alloT('stem.wave.quiz4_fb_peaks', 'Peak-on-peak is CONSTRUCTIVE interference \u2014 the wave gets bigger. Destruction needs opposites: peak + trough = flat.'),
                'Waves stop': __alloT('stem.wave.quiz4_fb_stop', 'The waves keep traveling \u2014 they only cancel at the spots where they overlap out of phase. Watch the dark bands in the Ripple Tank.'),
                'Amplitude doubles': __alloT('stem.wave.quiz4_fb_doubles', 'Doubling is constructive interference. Destructive SUBTRACTS \u2014 a peak fills a trough.')
              } },

            { q: __alloT('stem.wave.quiz5_q', 'Sound is what type of wave?'), a: 'Longitudinal', opts: ['Transverse', 'Longitudinal', 'Circular', 'Standing'],
              demo: { waveMode: 'longitudinal' },
              wrongFeedback: {
                'Transverse': __alloT('stem.wave.quiz5_fb_transverse', 'Transverse waves wiggle PERPENDICULAR to travel (light, a guitar string). Air molecules push and pull ALONG the direction of travel \u2014 switch to Longitudinal mode and watch the compressions.'),
                'Circular': __alloT('stem.wave.quiz5_fb_circular', 'Water ripples spread in circles, but that describes the pattern on the surface, not the wave type.'),
                'Standing': __alloT('stem.wave.quiz5_fb_standing', 'Standing waves are trapped between boundaries. Traveling sound is free \u2014 it only forms standing waves inside pipes and rooms.')
              } },

            { q: __alloT('stem.wave.quiz6_q', 'At a node of a standing wave, the displacement is:'), a: 'Always zero', opts: ['Maximum', 'Always zero', 'Half maximum', 'Random'],
              demo: { waveMode: 'standing', harmonic: 3 },
              wrongFeedback: {
                'Maximum': __alloT('stem.wave.quiz6_fb_maximum', 'Maximum displacement is the ANTInode. Nodes are the still points \u2014 in Standing mode, watch the spots where the string never moves.'),
                'Half maximum': __alloT('stem.wave.quiz6_fb_half', 'Nodes are perfectly still \u2014 zero, not half. Points BETWEEN node and antinode oscillate at partial amplitude.'),
                'Random': __alloT('stem.wave.quiz6_fb_random', 'Standing waves are perfectly ordered \u2014 the nodes stay locked in place. That is exactly why they are called STANDING.')
              } },

            { q: __alloT('stem.wave.quiz7_q', 'The speed of a wave equals:'), a: 'Frequency \u00D7 Wavelength', opts: ['Amplitude \u00D7 Frequency', 'Frequency \u00D7 Wavelength', 'Period \u00D7 Amplitude', 'None of these'],
              demo: { waveMode: 'free', frequency: 2, waveSpeed: 343, expSection: 'discoverWave' },
              wrongFeedback: {
                'Amplitude \u00D7 Frequency': __alloT('stem.wave.quiz7_fb_amp_freq', 'Amplitude carries ENERGY, not speed. v = f \u00D7 \u03BB: waves per second \u00D7 length of each wave = distance per second.'),
                'Period \u00D7 Amplitude': __alloT('stem.wave.quiz7_fb_period_amp', 'Period is just 1/frequency and amplitude is height \u2014 multiplying them gives nothing physical. v = f \u00D7 \u03BB.'),
                'None of these': __alloT('stem.wave.quiz7_fb_none', 'One of them IS right: v = f \u00D7 \u03BB \u2014 how many waves pass per second times how long each one is.')
              } },

            { q: __alloT('stem.wave.quiz8_q', 'Compared to a string fixed at both ends, what is the fundamental wavelength of a pipe with one end closed and one end free?'), a: '\u03BB = 4L (quarter-wave)', opts: ['\u03BB = 4L (quarter-wave)', '\u03BB = 2L (half-wave)', 'No nodes form', 'All even harmonics fit'],
              demo: { waveMode: 'standing', standingBoundary: 'fixedFree', harmonic: 1 },
              wrongFeedback: {
                '\u03BB = 2L (half-wave)': __alloT('stem.wave.quiz8_fb_half', 'Both ends fixed fits one half-wave (\u03BB = 2L). One closed end forces a node at the bottom and an antinode at the opening \u2014 a quarter-wave (\u03BB = 4L).'),
                'No nodes form': __alloT('stem.wave.quiz8_fb_nonodes', 'The fixed/closed end is always a displacement node with zero motion.'),
                'All even harmonics fit': __alloT('stem.wave.quiz8_fb_even', 'Fixed-free boundary conditions only allow ODD harmonics (1f, 3f, 5f...).')
              } },

            { q: __alloT('stem.wave.quiz9_q', 'Two waves at 3.0 Hz and 3.5 Hz overlap. What beat frequency will you hear?'), a: '0.5 Hz', opts: ['0.5 Hz', '3.25 Hz', '6.5 Hz', '1.05 Hz'],
              demo: { waveMode: 'free', showSecond: true, frequency: 3, frequency2: 3.5, amplitude: 50, amplitude2: 50 },
              wrongFeedback: {
                '3.25 Hz': __alloT('stem.wave.quiz9_fb_avg', '3.25 Hz is the average pitch you hear inside each pulse; the loudness pulses at the DIFFERENCE f_beat = |f\u2081 \u2212 f\u2082| = 0.5 Hz.'),
                '6.5 Hz': __alloT('stem.wave.quiz9_fb_sum', 'Beats depend on how often the two waves drift in and out of phase: |f\u2081 \u2212 f\u2082|, not f\u2081 + f\u2082.'),
                '1.05 Hz': __alloT('stem.wave.quiz9_fb_mul', 'Subtract the two frequencies rather than dividing or scaling them: |3.5 \u2212 3.0| = 0.5 Hz.')
              } },

            { q: __alloT('stem.wave.quiz10_q', 'When a sound source moves faster than the speed of sound (Mach > 1), what forms behind it?'), a: 'A conical shock wave', opts: ['A conical shock wave', 'All sound disappears completely', 'Pitch freezes at f\u2080', 'Waves bounce backward'],
              demo: { waveMode: 'doppler', sourceSpeed: 1.5 },
              wrongFeedback: {
                'All sound disappears completely': __alloT('stem.wave.quiz10_fb_disappear', 'Sound still radiates from every point along the path \u2014 the circular wavefronts pile up together into a sharp sonic boom cone.'),
                'Pitch freezes at f\u2080': __alloT('stem.wave.quiz10_fb_freeze', 'When M > 1, the source outruns its own wavefronts; observers only hear them all arrive together along the Mach cone.'),
                'Waves bounce backward': __alloT('stem.wave.quiz10_fb_back', 'Waves still expand outward spherically at v_sound; the source simply outruns the forward edge.')
              } },

            { q: __alloT('stem.wave.quiz11_q', 'When a wave enters a slower medium (v\u2082 < v\u2081), which property stays constant across the boundary?'), a: 'Frequency f', opts: ['Frequency f', 'Wavelength \u03BB', 'Wave speed v', 'Refracted angle'],
              demo: { waveMode: 'reflection', medium2Ratio: 0.5, reflectivity: 0.5, impedanceCoupled: true },
              wrongFeedback: {
                'Wavelength \u03BB': __alloT('stem.wave.quiz11_fb_lambda', 'Because v = f\u03BB and v drops while f stays fixed, wavelength \u03BB MUST shrink proportionally in Medium 2.'),
                'Wave speed v': __alloT('stem.wave.quiz11_fb_speed', 'Wave speed v changes at the interface because the two media have different physical stiffness/density or index.'),
                'Refracted angle': __alloT('stem.wave.quiz11_fb_angle', 'Snell\u2019s law bends the ray toward the normal when entering a slower medium.')
              } },

            { q: __alloT('stem.wave.quiz12_q', 'An anti-reflection coating cancels boundary reflections best when its optical thickness equals:'), a: '\u03BB/4 inside the coating', opts: ['\u03BB/4 inside the coating', '1\u03BB inside the coating', '2\u03BB inside the coating', 'Any thickness works'],
              demo: { waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: true, incidentAngleDeg: 0, medium2Ratio: 0.5 },
              wrongFeedback: {
                '1\u03BB inside the coating': __alloT('stem.wave.quiz12_fb_1l', 'A round-trip through 1\u03BB adds 2\u03BB path delay, putting both reflected waves BACK in phase (constructive)! \u03BB/4 makes the round-trip \u03BB/2 so they cancel.'),
                '2\u03BB inside the coating': __alloT('stem.wave.quiz12_fb_2l', 'An integer wavelength round-trip reinforces the reflection instead of canceling it. You want a \u03BB/2 round-trip = \u03BB/4 thickness.'),
                'Any thickness works': __alloT('stem.wave.quiz12_fb_any', 'Exact destructive interference requires a half-wavelength round-trip path difference: d = \u03BB_coating / 4.')
              } },

            { q: __alloT('stem.wave.quiz13_q', 'In a two-source ripple phased array, how can you steer the main interference beam without moving the sources?'), a: 'Shift relative phase \u0394\u03C6', opts: ['Shift relative phase \u0394\u03C6', 'Double both amplitudes equally', 'Pause the simulation', 'Change background theme'],
              demo: { waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: Math.PI / 2 },
              wrongFeedback: {
                'Double both amplitudes equally': __alloT('stem.wave.quiz13_fb_amp', 'Scaling both sources equally makes the pattern stronger everywhere without tilting its direction.'),
                'Pause the simulation': __alloT('stem.wave.quiz13_fb_pause', 'Pausing freezes motion in time; tilting the beam direction comes from advancing one source\u2019s phase relative to the other.'),
                'Change background theme': __alloT('stem.wave.quiz13_fb_theme', 'Try dragging the Source Phase Offset (\u0394\u03C6) slider in Ripple Tank mode to tilt the constructive beam.')
              } },

            { q: __alloT('stem.wave.quiz14_q', 'In a dispersive wave packet with group velocity slower than phase velocity (v_g < v_p), what do individual crests appear to do?'), a: 'Roll forward through the packet', opts: ['Roll forward through the packet', 'Remain frozen inside the packet', 'Disappear before the left edge', 'Move backward slower than the packet'],
              demo: { waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.6 },
              wrongFeedback: {
                'Remain frozen inside the packet': __alloT('stem.wave.quiz14_fb_frozen', 'Crests stay locked to the envelope only in a NON-dispersive medium where v_g = v_p.'),
                'Disappear before the left edge': __alloT('stem.wave.quiz14_fb_left', 'When v_p > v_g (normal dispersion, like deep water waves), crests originate at the trailing tail and race forward through the packet.'),
                'Move backward slower than the packet': __alloT('stem.wave.quiz14_fb_back', 'In normal dispersion (0 < v_g < v_p), crests still travel forward faster than the envelope moves.')
              } },

          ];

          // ── Wave Lab helper actions (Log, CSV, Data Studio, Read-Aloud TTS, UDL Coach) ──
          var wsTab = WAVE_VALID_TABS[d.workspaceTab] ? d.workspaceTab : 'explore';
          var logWaveTrial = function() {
            var nextNum = d.experimentLog.length + 1;
            var newRow = {
              id: 'wave-' + Date.now() + '-' + nextNum,
              n: nextNum,
              mode: waveMode,
              waveType: activeWaveType,
              frequency: d.frequency,
              amplitude: d.amplitude,
              waveSpeed: d.waveSpeed,
              wavelength: Math.round(waveMetrics.wavelength * 100) / 100,
              period: Math.round(waveMetrics.period * 1000) / 1000,
              energy: Math.round(waveMetrics.energy),
              sourceSpeed: d.sourceSpeed,
              observerSpeed: d.observerSpeed,
              dopplerRegime: d.dopplerRegime || 'acoustic',
              fresnelPolarization: d.fresnelPolarization || 's',
              reflectedEnergyPct: waveMetrics.reflectedEnergyPct,
              redshiftRec: Math.round(waveMetrics.redshiftRec * 1000) / 1000,
              airTempC: d.airTempC,
              pluckPosition: d.pluckPosition,
              approachingFreq: isFinite(waveMetrics.approachingFreq) ? Math.round(waveMetrics.approachingFreq * 100) / 100 : null,
              incidentAngleDeg: d.incidentAngleDeg,
              refractedAngleDeg: (typeof waveMetrics.refractedAngleDeg === 'number' && isFinite(waveMetrics.refractedAngleDeg)) ? Math.round(waveMetrics.refractedAngleDeg * 10) / 10 : null,
              medium2Ratio: d.medium2Ratio,
              soundLevelDb: waveMetrics.soundLevelDb,
              groupVelocity: Math.round(waveMetrics.groupVelocity * 10) / 10,
              ripplePhaseDiff: d.ripplePhaseDiff || 0,
              beamSteerAngleDeg: Math.round(waveMetrics.beamSteerAngleDeg * 10) / 10,
              stringTension: d.stringTension,
              stringDensityGm: d.stringDensityGm,
              driveFreqRatio: d.driveFreqRatio,
              resonatorQ: d.resonatorQ,
              resonatorGainPct: waveMetrics.resonatorGainPct,
              ftirGapLambda: d.ftirGapLambda,
              tunnelTransmissionPct: waveMetrics.tunnelTransmissionPct,
              waterDepthRatio: d.waterDepthRatio,
              listenerDistMeters: d.listenerDistMeters,
              attenuatedDb: waveMetrics.attenuatedDb,
              rippleFringeSpacingPx: waveMetrics.rippleFringeSpacingPx,
              adcBitDepth: d.adcBitDepth,
              adcSqnrDb: waveMetrics.adcSqnrDb,
              dopplerOffsetAngleDeg: d.dopplerOffsetAngleDeg,
              offAxisObsFreq: isFinite(waveMetrics.offAxisObsFreq) ? waveMetrics.offAxisObsFreq : null,
              note: waveMode === 'doppler'
                ? (d.dopplerRegime === 'relativistic'
                  ? ('Rel \u03B2=' + Math.min(0.95, d.sourceSpeed).toFixed(2) + 'c, z=+' + waveMetrics.redshiftRec.toFixed(3) + (d.dopplerOffsetAngleDeg > 0 ? ', \u03B8=' + d.dopplerOffsetAngleDeg + '\u00B0' : ''))
                  : ('M=' + d.sourceSpeed.toFixed(2) + (Math.abs(d.observerSpeed || 0) > 0.01 ? ', vo=' + d.observerSpeed.toFixed(2) : '') + (d.dopplerOffsetAngleDeg > 0 ? ', \u03B8=' + d.dopplerOffsetAngleDeg + '\u00B0' : '')))
                : waveMode === 'reflection'
                  ? ((d.impedanceCoupled ? (d.fresnelPolarization || 's').toUpperCase() + '-pol ' : '') + 'R=' + waveMetrics.reflectedEnergyPct + '%, v2/v1=' + d.medium2Ratio.toFixed(2) + ((d.incidentAngleDeg || 0) > 0 ? ', \u03B81=' + d.incidentAngleDeg + '\u00B0' : '') + (d.antiReflectionCoating ? ', \u03BB/4 AR' : '') + (d.ftirEnabled ? ', FTIR d=' + d.ftirGapLambda.toFixed(2) + '\u03BB' : ''))
                  : waveMode === 'standing'
                    ? ((d.standingBoundary || 'bothFixed') + ', n=' + (d.harmonic || 1) + (d.showTravelingComponents ? ', decomp' : '') + (d.resonatorDriven ? (', drv=' + d.driveFreqRatio.toFixed(2) + ' Q=' + d.resonatorQ) : '') + ((d.stringMechanics && (d.standingBoundary || 'bothFixed') === 'bothFixed') ? (', T=' + d.stringTension + 'N, \u03BC=' + d.stringDensityGm.toFixed(1) + 'g/m') : ''))
                    : waveMode === 'longitudinal'
                      ? ((d.airTempCoupled ? ('Air ' + d.airTempC + '\u00B0C ') : '') + (d.longitudinalMode === 'standing' ? ('Kundt n=' + (d.harmonic || 2)) : activeWaveType))
                      : waveMode === 'ripple'
                        ? ((d.rippleBarrier || 'none') + (d.rippleBarrier === 'grating' ? (' N=' + (d.gratingSlits || 4)) : '') + (Math.abs(d.ripplePhaseDiff || 0) > 0.05 ? (', \u0394\u03C6=' + Math.round((d.ripplePhaseDiff || 0) * 180 / Math.PI) + '\u00B0') : ''))
                        : (waveMode === 'spectrum' && d.digitalSampling
                          ? ('ADC fs=' + waveMetrics.sampleRateHz.toFixed(1) + 'Hz,' + d.adcBitDepth + 'b')
                          : (waveMode === 'spectrum' && activeWaveType === 'custom'
                            ? ('pluck=' + Math.round(d.pluckPosition * 100) + '%')
                            : (d.packetMode === 'collide' ? ('collide:' + (d.collidePolarity || 'opposite')) : (d.packetMode === 'packet' ? (d.oceanDepthCoupled ? ('ocean h/\u03BB=' + d.waterDepthRatio.toFixed(2)) : ('packet vg/vp=' + d.dispersionRatio.toFixed(2))) : activeWaveType))))
            };
            updPatch(function(cur) {
              var nextLog = cur.experimentLog.concat([newRow]).slice(-25);
              return { experimentLog: nextLog };
            });
            if (nextNum === 1 && typeof awardStemXP === 'function') awardStemXP('wave-log-1', 5, __alloT('stem.wave.xp_first_trial', 'Logged first wave measurement!'));
            if (nextNum === 3 && typeof awardStemXP === 'function') awardStemXP('wave-log-3', 10, __alloT('stem.wave.xp_three_trials', 'Logged 3 wave trials!'));
            if (typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_trial_logged', 'Logged trial ') + nextNum + ': f=' + d.frequency + ' Hz, wavelength=' + waveMetrics.wavelength.toFixed(1) + ' m.');
            if (typeof addToast === 'function') addToast('📝 ' + __alloT('stem.wave.toast_trial_logged', 'Trial #') + nextNum + __alloT('stem.wave.toast_logged_suffix', ' saved (f=' + d.frequency + ' Hz, λ=' + waveMetrics.wavelength.toFixed(1) + ' m)'), 'success');
          };

          var runWaveSweep = function() {
            var dsAxis = WAVE_VALID_DS_PLOTS[d.dataStudioPlot] ? d.dataStudioPlot : 'freqWavelength';
            var prevCount = d.experimentLog.length;
            var sweepRows = waveBuildSweepRows(d, dsAxis, prevCount + 1);
            updPatch(function(cur) {
              return { experimentLog: cur.experimentLog.concat(sweepRows).slice(-25) };
            });
            if (prevCount === 0 && typeof awardStemXP === 'function') awardStemXP('wave-log-1', 5, __alloT('stem.wave.xp_first_trial', 'Logged first wave measurement!'));
            if (prevCount + sweepRows.length >= 3 && typeof awardStemXP === 'function') awardStemXP('wave-log-3', 10, __alloT('stem.wave.xp_three_trials', 'Logged 3 wave trials!'));
            if (typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_sweep_logged', 'Logged 5-point parametric sweep for Data Studio.'));
            if (typeof addToast === 'function') addToast('⚡ ' + __alloT('stem.wave.toast_sweep_logged', 'Logged 5-point parameter sweep to Experiment Log.'), 'success');
          };

          var getWaveAxisSpec = function(axisId) {
            var DS_AXIS_CONFIG = {
              freqWavelength: {
                title: __alloT('stem.wave.ds_chart_title', 'Wave Simulator: Frequency vs. Wavelength'),
                xLabel: __alloT('stem.wave.ds_x_label', 'Frequency f (Hz)'),
                yLabel: __alloT('stem.wave.ds_y_label', 'Wavelength λ (m)'),
                xShort: 'f (Hz)',
                yShort: '\u03BB (m)',
                extraCols: [],
                mapRow: function(row, idx) {
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (' + row.mode + ', f=' + row.frequency + 'Hz)',
                    x: row.frequency,
                    value: Math.round((row.wavelength || (row.waveSpeed / Math.max(0.1, row.frequency))) * 100) / 100
                  };
                }
              },
              ampEnergy: {
                title: __alloT('stem.wave.ds_amp_title', 'Wave Simulator: Amplitude vs. Relative Energy (A²)'),
                xLabel: __alloT('stem.wave.ds_amp_x', 'Amplitude A'),
                yLabel: __alloT('stem.wave.ds_amp_y', 'Relative Energy (A²)'),
                xShort: 'A',
                yShort: 'A\u00B2',
                extraCols: [
                  { hdr: 'SPL (dB)', render: function(r) { return r.soundLevelDb != null ? r.soundLevelDb.toFixed(1) : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var eVal = row.energy != null ? row.energy : (row.amplitude * row.amplitude);
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (A=' + row.amplitude + ')',
                    x: row.amplitude,
                    value: Math.round(eVal)
                  };
                }
              },
              dopplerMach: {
                title: __alloT('stem.wave.ds_doppler_title', 'Wave Simulator: Source Speed (M) vs. Approaching Frequency'),
                xLabel: __alloT('stem.wave.ds_doppler_x', 'Source Speed (Mach M)'),
                yLabel: __alloT('stem.wave.ds_doppler_y', 'Approaching Frequency f\' (Hz)'),
                xShort: 'Mach M',
                yShort: 'f\u2032 (Hz)',
                extraCols: [
                  { hdr: 'Mach M', render: function(r) { return r.sourceSpeed != null ? Number(r.sourceSpeed).toFixed(2) : '\u2014'; } },
                  { hdr: "f\u2032 (Hz)", render: function(r) { return r.approachingFreq != null ? r.approachingFreq.toFixed(2) : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var ms = row.sourceSpeed != null ? row.sourceSpeed : d.sourceSpeed;
                  var af = row.approachingFreq != null ? row.approachingFreq : (row.frequency / Math.max(0.05, 1 - Math.min(0.95, ms || 0)));
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (M=' + Number(ms).toFixed(2) + ')',
                    x: ms,
                    value: Math.round(af * 100) / 100
                  };
                }
              },
              snellAngles: {
                title: __alloT('stem.wave.ds_snell_title', 'Wave Simulator: Incident Angle θ₁ vs. Refracted Angle θ₂'),
                xLabel: __alloT('stem.wave.ds_snell_x', 'Incident Angle θ₁ (deg)'),
                yLabel: __alloT('stem.wave.ds_snell_y', 'Refracted Angle θ₂ (deg)'),
                xShort: '\u03B8\u2081 (\u00B0)',
                yShort: '\u03B8\u2082 (\u00B0)',
                extraCols: [
                  { hdr: '\u03B8\u2081 (\u00B0)', render: function(r) { return r.incidentAngleDeg != null ? r.incidentAngleDeg : '\u2014'; } },
                  { hdr: '\u03B8\u2082 (\u00B0)', render: function(r) { return r.refractedAngleDeg != null ? r.refractedAngleDeg.toFixed(1) : 'TIR'; } }
                ],
                mapRow: function(row, idx) {
                  var th1 = row.incidentAngleDeg != null ? row.incidentAngleDeg : (d.incidentAngleDeg || 0);
                  var th2 = row.refractedAngleDeg != null ? row.refractedAngleDeg : 90;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (θ1=' + th1 + '°)',
                    x: th1,
                    value: Math.round(th2 * 10) / 10
                  };
                }
              },
              phasedBeam: {
                title: __alloT('stem.wave.ds_phased_title', 'Wave Simulator: Phase Offset Δφ vs. Beam Steer Angle θ₀'),
                xLabel: __alloT('stem.wave.ds_phased_x', 'Phase Offset Δφ (deg)'),
                yLabel: __alloT('stem.wave.ds_phased_y', 'Steered Beam Angle θ₀ (deg)'),
                xShort: '\u0394\u03C6 (\u00B0)',
                yShort: '\u03B8\u2080 (\u00B0)',
                extraCols: [
                  { hdr: '\u0394\u03C6 (\u00B0)', render: function(r) { return Math.round((((r.ripplePhaseDiff != null ? r.ripplePhaseDiff : 0) * 180) / Math.PI)); } },
                  { hdr: '\u03B8\u2080 (\u00B0)', render: function(r) { return r.beamSteerAngleDeg != null ? r.beamSteerAngleDeg.toFixed(1) : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var dpDeg = Math.round((((row.ripplePhaseDiff != null ? row.ripplePhaseDiff : (d.ripplePhaseDiff || 0)) * 180) / Math.PI) * 10) / 10;
                  var bDeg = row.beamSteerAngleDeg != null ? row.beamSteerAngleDeg : 0;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (Δφ=' + dpDeg + '°)',
                    x: dpDeg,
                    value: Math.round(bDeg * 10) / 10
                  };
                }
              },
              mersenneTension: {
                title: __alloT('stem.wave.ds_mersenne_title', 'Wave Simulator: String Tension T vs. Wave Speed v'),
                xLabel: __alloT('stem.wave.ds_mersenne_x', 'String Tension T (N)'),
                yLabel: __alloT('stem.wave.ds_mersenne_y', 'Wave Speed v = \u221A(T/\u03BC) (m/s)'),
                xShort: 'T (N)',
                yShort: 'v (m/s)',
                extraCols: [
                  { hdr: 'T (N)', render: function(r) { return r.stringTension != null ? Number(r.stringTension).toFixed(0) : '\u2014'; } },
                  { hdr: '\u03BC (g/m)', render: function(r) { return r.stringDensityGm != null ? Number(r.stringDensityGm).toFixed(2) : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var tv = row.stringTension != null ? row.stringTension : d.stringTension;
                  var spdV = row.waveSpeed != null ? row.waveSpeed : waveComputeStringSpeed(tv, row.stringDensityGm != null ? row.stringDensityGm : d.stringDensityGm);
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (T=' + Math.round(tv) + 'N)',
                    x: tv,
                    value: Math.round(spdV * 10) / 10
                  };
                }
              },
              fresnelBrewster: {
                title: __alloT('stem.wave.ds_brewster_title', 'Wave Simulator: Incident Angle θ₁ vs. TM Reflectance R (%)'),
                xLabel: __alloT('stem.wave.ds_brewster_x', 'Incident Angle θ₁ (deg)'),
                yLabel: __alloT('stem.wave.ds_brewster_y', 'TM Reflectance R (%)'),
                xShort: '\u03B8\u2081 (\u00B0)',
                yShort: 'R (%)',
                extraCols: [
                  { hdr: 'Pol', render: function(r) { return (r.fresnelPolarization || 's').toUpperCase(); } },
                  { hdr: 'R (%)', render: function(r) { return r.reflectedEnergyPct != null ? r.reflectedEnergyPct + '%' : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var th1b = row.incidentAngleDeg != null ? row.incidentAngleDeg : (d.incidentAngleDeg || 0);
                  var rPct = row.reflectedEnergyPct != null ? row.reflectedEnergyPct : waveMetrics.reflectedEnergyPct;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (θ1=' + Number(th1b).toFixed(1) + '°)',
                    x: th1b,
                    value: Math.round(rPct)
                  };
                }
              },
              airTempSpeed: {
                title: __alloT('stem.wave.ds_airtemp_title', 'Wave Simulator: Air Temperature T vs. Speed of Sound v'),
                xLabel: __alloT('stem.wave.ds_airtemp_x', 'Air Temperature T (°C)'),
                yLabel: __alloT('stem.wave.ds_airtemp_y', 'Speed of Sound v(T) (m/s)'),
                xShort: 'T (\u00B0C)',
                yShort: 'v (m/s)',
                extraCols: [
                  { hdr: 'T (\u00B0C)', render: function(r) { return r.airTempC != null ? r.airTempC : '\u2014'; } },
                  { hdr: 'v (m/s)', render: function(r) { return r.waveSpeed != null ? Number(r.waveSpeed).toFixed(1) : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var tc = row.airTempC != null ? row.airTempC : (d.airTempC != null ? d.airTempC : 20);
                  var vAir = row.waveSpeed != null ? row.waveSpeed : waveComputeAirSoundSpeed(tc);
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (T=' + tc + '°C)',
                    x: tc,
                    value: Math.round(vAir * 10) / 10
                  };
                }
              },
              resonanceCurve: {
                title: __alloT('stem.wave.ds_resonance_title', 'Wave Simulator: Drive Ratio r vs. Resonator Gain (%)'),
                xLabel: __alloT('stem.wave.ds_resonance_x', 'Drive Frequency Ratio (f_drv / f_1)'),
                yLabel: __alloT('stem.wave.ds_resonance_y', 'Normalized Gain |H| (%)'),
                xShort: 'f_drv / f\u2081',
                yShort: 'Gain (%)',
                extraCols: [
                  { hdr: 'Q', render: function(r) { return r.resonatorQ != null ? String(r.resonatorQ) : '\u2014'; } },
                  { hdr: 'Gain %', render: function(r) { return r.resonatorGainPct != null ? Number(r.resonatorGainPct).toFixed(1) + '%' : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var rDrv = row.driveFreqRatio != null ? row.driveFreqRatio : (d.driveFreqRatio || 1);
                  var gPct = row.resonatorGainPct != null
                    ? row.resonatorGainPct
                    : waveComputeResonatorResponse(rDrv, row.resonatorQ != null ? row.resonatorQ : d.resonatorQ, d.standingBoundary, row.frequency || d.frequency).gainPct;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (r=' + Number(rDrv).toFixed(2) + ')',
                    x: Number(rDrv),
                    value: Math.round(Number(gPct) * 10) / 10
                  };
                }
              },
              ftirTunneling: {
                title: __alloT('stem.wave.ds_ftir_title', 'Wave Simulator: Barrier Gap (d / \u03BB\u2081) vs. FTIR Transmission (%)'),
                xLabel: __alloT('stem.wave.ds_ftir_x', 'Normalized Air Gap (d / \u03BB\u2081)'),
                yLabel: __alloT('stem.wave.ds_ftir_y', 'Tunnel Transmission T (%)'),
                xShort: 'd / \u03BB\u2081',
                yShort: 'T (%)',
                extraCols: [
                  { hdr: 'd/\u03BB\u2081', render: function(r) { return r.ftirGapLambda != null ? Number(r.ftirGapLambda).toFixed(2) : '\u2014'; } },
                  { hdr: 'T (%)', render: function(r) { return r.transmittedEnergyPct != null ? r.transmittedEnergyPct + '%' : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var gapL = row.ftirGapLambda != null ? row.ftirGapLambda : (d.ftirGapLambda || 0.25);
                  var tPct = row.tunnelTransmissionPct != null
                    ? row.tunnelTransmissionPct
                    : (row.transmittedEnergyPct != null ? row.transmittedEnergyPct : waveMetrics.tunnelTransmissionPct);
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (d=' + Number(gapL).toFixed(2) + '\u03BB)',
                    x: Number(gapL),
                    value: Math.round(Number(tPct) * 10) / 10
                  };
                }
              },
              inverseSquareDb: {
                title: __alloT('stem.wave.ds_invsq_title', 'Wave Simulator: Distance (r) vs. Sound Level (dB)'),
                xLabel: __alloT('stem.wave.ds_invsq_x', 'Listener Distance r (m)'),
                yLabel: __alloT('stem.wave.ds_invsq_y', 'Sound Level at r (dB)'),
                xShort: 'r (m)',
                yShort: 'L(r) dB',
                extraCols: [
                  { hdr: 'r (m)', render: function(r) { return r.listenerDistMeters != null ? Number(r.listenerDistMeters).toFixed(1) + ' m' : '\u2014'; } },
                  { hdr: 'L(r) dB', render: function(r) { return r.attenuatedDb != null ? Number(r.attenuatedDb).toFixed(1) + ' dB' : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var distM = row.listenerDistMeters != null ? row.listenerDistMeters : (d.listenerDistMeters || 4);
                  var lvlDb = row.attenuatedDb != null ? row.attenuatedDb : waveMetrics.attenuatedDb;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (r=' + Number(distM).toFixed(1) + 'm)',
                    x: Number(distM),
                    value: Math.round(Number(lvlDb) * 10) / 10
                  };
                }
              },
              youngFringeSpacing: {
                title: __alloT('stem.wave.ds_young_title', 'Wave Simulator: Slit Separation (d) vs. Fringe Spacing (\u0394y)'),
                xLabel: __alloT('stem.wave.ds_young_x', 'Source / Slit Separation d (px)'),
                yLabel: __alloT('stem.wave.ds_young_y', 'Fringe Spacing \u0394y (px)'),
                xShort: 'd (px)',
                yShort: '\u0394y (px)',
                extraCols: [
                  { hdr: 'd (px)', render: function(r) { return r.rippleSeparation != null ? r.rippleSeparation + ' px' : '\u2014'; } },
                  { hdr: '\u0394y (px)', render: function(r) { return r.rippleFringeSpacingPx != null ? Number(r.rippleFringeSpacingPx).toFixed(1) + ' px' : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var sepPx = row.rippleSeparation != null ? row.rippleSeparation : (d.rippleSeparation || 80);
                  var dyPx = row.rippleFringeSpacingPx != null ? row.rippleFringeSpacingPx : waveMetrics.rippleFringeSpacingPx;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (d=' + sepPx + 'px)',
                    x: Number(sepPx),
                    value: Math.round(Number(dyPx) * 10) / 10
                  };
                }
              },
              adcBitSqnr: {
                title: __alloT('stem.wave.ds_adc_title', 'Wave Simulator: ADC Bit Depth (b) vs. Quantization SQNR (dB)'),
                xLabel: __alloT('stem.wave.ds_adc_x', 'ADC Bit Depth b (bits)'),
                yLabel: __alloT('stem.wave.ds_adc_y', 'Quantization SQNR (dB)'),
                xShort: 'b (bits)',
                yShort: 'SQNR (dB)',
                extraCols: [
                  { hdr: 'Bits', render: function(r) { return r.adcBitDepth != null ? (r.adcBitDepth + '-bit') : '\u2014'; } },
                  { hdr: 'SQNR (dB)', render: function(r) { return r.adcSqnrDb != null ? Number(r.adcSqnrDb).toFixed(1) + ' dB' : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var bVal = row.adcBitDepth != null ? row.adcBitDepth : (d.adcBitDepth || 8);
                  var sqVal = row.adcSqnrDb != null ? row.adcSqnrDb : waveComputeDigitalSampling(row.frequency || d.frequency, d.sampleRateRatio, bVal).sqnrDb;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (' + bVal + '-bit)',
                    x: Number(bVal),
                    value: Math.round(Number(sqVal) * 10) / 10
                  };
                }
              },
              dopplerOffsetAngle: {
                title: __alloT('stem.wave.ds_dopoff_title', 'Wave Simulator: Observer Angle (\u03B8) vs. Observed Frequency f\u2032(\u03B8)'),
                xLabel: __alloT('stem.wave.ds_dopoff_x', 'Observer Angle \u03B8 (deg)'),
                yLabel: __alloT('stem.wave.ds_dopoff_y', 'Observed Frequency f\u2032(\u03B8) (Hz)'),
                xShort: '\u03B8 (\u00B0)',
                yShort: 'f\u2032(\u03B8) Hz',
                extraCols: [
                  { hdr: '\u03B8 (\u00B0)', render: function(r) { return r.dopplerOffsetAngleDeg != null ? r.dopplerOffsetAngleDeg + '\u00B0' : '\u2014'; } },
                  { hdr: 'f\u2032(\u03B8) Hz', render: function(r) { return r.offAxisObsFreq != null ? Number(r.offAxisObsFreq).toFixed(2) : '\u2014'; } }
                ],
                mapRow: function(row, idx) {
                  var angV = row.dopplerOffsetAngleDeg != null ? row.dopplerOffsetAngleDeg : (d.dopplerOffsetAngleDeg || 0);
                  var fObs = row.offAxisObsFreq != null
                    ? row.offAxisObsFreq
                    : waveComputeOffAxisDoppler(row.frequency || d.frequency, row.sourceSpeed != null ? row.sourceSpeed : d.sourceSpeed, angV, row.dopplerRegime || d.dopplerRegime).observedFreqHz;
                  return {
                    label: '#' + (row.n || (idx + 1)) + ' (\u03B8=' + angV + '\u00B0)',
                    x: Number(angV),
                    value: isFinite(Number(fObs)) ? (Math.round(Number(fObs) * 100) / 100) : 0
                  };
                }
              }
            };
            return DS_AXIS_CONFIG[axisId] || DS_AXIS_CONFIG.freqWavelength;
          };

          var openWaveInDataStudio = function() {
            var dsAxis = WAVE_VALID_DS_PLOTS[d.dataStudioPlot] ? d.dataStudioPlot : 'freqWavelength';
            var rowsSource = d.experimentLog.length > 0 ? d.experimentLog : waveBuildSweepRows(d, dsAxis, 1);
            var cfg = getWaveAxisSpec(dsAxis);
            var dsRows = rowsSource.map(cfg.mapRow);
            if (typeof setLabToolData === 'function') {
              setLabToolData(function(prev) {
                return Object.assign({}, prev, {
                  _dataStudio: Object.assign({}, (prev && prev._dataStudio) || {}, {
                    studioMode: 'graph',
                    chartType: 'scatter',
                    dataSource: 'wave-runlog',
                    chartTitle: cfg.title,
                    xAxisLabel: cfg.xLabel,
                    yAxisLabel: cfg.yLabel,
                    showStats: true,
                    showTrendline: true,
                    dataRows: dsRows
                  })
                });
              });
            }
            if (typeof setStemLabTool === 'function') setStemLabTool('dataStudio');
          };

          var exportWaveCsv = function() {
            var rows = d.experimentLog;
            if (!rows || rows.length === 0) {
              if (typeof addToast === 'function') addToast(__alloT('stem.wave.toast_no_rows_csv', 'Log at least one trial before exporting CSV.'), 'info');
              return;
            }
            var lines = ['Trial,Mode,Waveform,Frequency_Hz,Amplitude,WaveSpeed_mps,Wavelength_m,Period_s,Energy_A2,SourceSpeed_Mach,ObserverSpeed_Mach,DopplerRegime,ApproachingFreq_Hz,IncidentAngle_deg,RefractedAngle_deg,FresnelPol,Reflectance_Pct,Redshift_z,GroupVel_mps,SPL_dB,AirTemp_C,PhaseOffset_rad,BeamSteer_deg,StringTension_N,LinearDensity_gm,PluckPos,DriveRatio_r,Resonator_Q,ResonatorGain_Pct,FTIRGap_Lambda,WaterDepth_Ratio,ListenerDist_m,AttenuatedSPL_dB,FringeSpacing_px,ADC_Bits,ADC_SQNR_dB,DopplerOffset_deg,OffAxisFreq_Hz,Note'];
            rows.forEach(function(r) {
              lines.push([
                r.n, r.mode, r.waveType, r.frequency, r.amplitude, r.waveSpeed, r.wavelength, r.period, r.energy,
                r.sourceSpeed != null ? r.sourceSpeed : '',
                r.observerSpeed != null ? r.observerSpeed : '',
                r.dopplerRegime || '',
                r.approachingFreq != null ? r.approachingFreq : '',
                r.incidentAngleDeg != null ? r.incidentAngleDeg : '',
                r.refractedAngleDeg != null ? r.refractedAngleDeg : '',
                r.fresnelPolarization || '',
                r.reflectedEnergyPct != null ? r.reflectedEnergyPct : '',
                r.redshiftRec != null ? r.redshiftRec : '',
                r.groupVelocity != null ? r.groupVelocity : '',
                r.soundLevelDb != null ? r.soundLevelDb : '',
                r.airTempC != null ? r.airTempC : '',
                r.ripplePhaseDiff != null ? r.ripplePhaseDiff : '',
                r.beamSteerAngleDeg != null ? r.beamSteerAngleDeg : '',
                r.stringTension != null ? r.stringTension : '',
                r.stringDensityGm != null ? r.stringDensityGm : '',
                r.pluckPosition != null ? r.pluckPosition : '',
                r.driveFreqRatio != null ? r.driveFreqRatio : '',
                r.resonatorQ != null ? r.resonatorQ : '',
                r.resonatorGainPct != null ? r.resonatorGainPct : '',
                r.ftirGapLambda != null ? r.ftirGapLambda : '',
                r.waterDepthRatio != null ? r.waterDepthRatio : '',
                r.listenerDistMeters != null ? r.listenerDistMeters : '',
                r.attenuatedDb != null ? r.attenuatedDb : '',
                r.rippleFringeSpacingPx != null ? r.rippleFringeSpacingPx : '',
                r.adcBitDepth != null ? r.adcBitDepth : '',
                r.adcSqnrDb != null ? r.adcSqnrDb : '',
                r.dopplerOffsetAngleDeg != null ? r.dopplerOffsetAngleDeg : '',
                r.offAxisObsFreq != null ? r.offAxisObsFreq : '',
                '"' + String(r.note || '').replace(/"/g, '""') + '"'
              ].join(','));
            });
            var csvText = lines.join('\n');
            try {
              if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof document !== 'undefined') {
                var blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = url;
                link.download = 'wave_simulator_log.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }
            } catch (e) {}
            if (typeof addToast === 'function') addToast('⬇ ' + __alloT('stem.wave.toast_csv_exported', 'Exported ') + rows.length + __alloT('stem.wave.toast_csv_rows', ' wave trials to CSV.'), 'success');
          };

          var getWaveCoachTip = function() {
            if (udlBand === '3-5') {
              if (waveMode === 'standing') return __alloT('stem.wave.coach_k5_standing', 'Imagine shaking a jump rope faster! Nodes stay totally still while antinodes bounce highest.');
              if (waveMode === 'ripple') return __alloT('stem.wave.coach_k5_ripple', 'Two water drops make crossing rings. Bright places are where two wave hills pile up together!');
              if (waveMode === 'reflection') return __alloT('stem.wave.coach_k5_reflection', 'A wave hits the gold wall like an echo! Tied ends flip the bump upside down.');
              if (waveMode === 'doppler') return __alloT('stem.wave.coach_k5_doppler', 'A fast siren squishes waves ahead of it (higher sound) and stretches them behind (lower sound).');
              return __alloT('stem.wave.coach_k5_free', 'Amplitude is how tall the wave is (loudness). Frequency is how many waves pass every second (pitch).');
            }
            if (udlBand === '9-12') {
              if (waveMode === 'standing') return __alloT('stem.wave.coach_hs_standing', 'Standing eigenmodes satisfy λₙ = 2L/n and fₙ = n·v/(2L) with n+1 displacement nodes.');
              if (waveMode === 'ripple') return __alloT('stem.wave.coach_hs_ripple', 'Path difference Δr = |d₁ − d₂| determines phase Δφ = 2πΔr/λ: integers give maxima, half-integers give nodal lines.');
              if (waveMode === 'reflection') return __alloT('stem.wave.coach_hs_reflection', 'At an interface, frequency f is conserved while λ₂/λ₁ = v₂/v₁. Reflected fraction is R², transmitted is 1 − R².');
              if (waveMode === 'doppler') return __alloT('stem.wave.coach_hs_doppler', 'Observer shift f′ = f/(1 ∓ M). At Mach M ≥ 1, Huygens wavelets coalesce along a cone of half-angle μ = arcsin(1/M).');
              return __alloT('stem.wave.coach_hs_free', 'Traveling sinusoid y(x,t) = A sin(kx − ωt) transports power ∝ A² at phase velocity v = ω/k = fλ.');
            }
            if (waveMode === 'standing') return __alloT('stem.wave.coach_ms_standing', 'Harmonic #n fits n half-waves on the string, doubling f₂ or tripling f₃ compared to the fundamental.');
            if (waveMode === 'ripple') return __alloT('stem.wave.coach_ms_ripple', 'Turn on the Wave Probe to measure Δr = |d₁ − d₂|: 0.5λ means crests meet troughs and cancel.');
            if (waveMode === 'reflection') return __alloT('stem.wave.coach_ms_reflection', 'Lower Reflectivity below 1.0 to see part of the wave pass into Medium 2 and change wavelength!');
            if (waveMode === 'doppler') return __alloT('stem.wave.coach_ms_doppler', 'Watch O₂ ahead of the siren hear higher f′, while O₁ behind hears lower f′. Push past 100% for a Mach cone!');
            return __alloT('stem.wave.coach_ms_free', 'Use v = f × λ: in any medium, speeding up frequency shrinks wavelength so v stays constant.');
          };

          var readWaveAloud = function(onDevice) {
            var coachStr = getWaveCoachTip();
            var spoken = __alloT('stem.wave.tts_prefix', 'Wave Simulator, ') + waveViewMeta.label + '. '
              + 'Amplitude ' + displayAmp + ', Frequency ' + displayFreq + ' hertz, Wavelength ' + waveMetrics.wavelength.toFixed(1) + ' meters, Wave speed ' + displayMediumSpeed + ' meters per second. '
              + (d.probeEnabled ? ('Probe at ' + Math.round(d.probeX * 100) + ' percent across, ' + probeReadout.cyclesFromLeft.toFixed(2) + ' wavelengths. ') : '')
              + coachStr;
            var waveQuiet = function() { try { if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true; } catch (e) {} return !!window._alloGlobalMute; };
            if (onDevice !== true) {
              if (typeof announceToSR === 'function') announceToSR(spoken);
              if (typeof callTTS === 'function') {
                // A speak button: force past the header narration switch. The host never throws and resolves
                // null when it played nothing: muted, student AI off (device voice used) or no voice came back.
                var req = null;
                try { req = callTTS(spoken, undefined, undefined, { force: true }); } catch (e) {}
                if (typeof addToast === 'function') addToast('🔊 ' + __alloT('stem.wave.toast_reading_aloud', 'Reading wave summary aloud'), 'info');
                var waveFallBack = function() { if (!waveQuiet() && window.__alloStudentAiDisabled !== true) readWaveAloud(true); };
                Promise.resolve(req).then(function(url) { if (!url) waveFallBack(); }, waveFallBack);
                return;
              }
            }
            if (waveQuiet()) return;
            try {
              if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
                window.speechSynthesis.cancel();
                var utt = new window.SpeechSynthesisUtterance(spoken);
                window.speechSynthesis.speak(utt);
                if (onDevice !== true && typeof addToast === 'function') addToast('🔊 ' + __alloT('stem.wave.toast_reading_aloud', 'Reading wave summary aloud'), 'info');
                return;
              }
            } catch (e) {}
            if (typeof addToast === 'function') addToast('💬 ' + spoken, 'info');
          };

          var completedMissionsCount = WAVE_MISSIONS.filter(function(m) { return !!(d.missionsDone && d.missionsDone[m.id]); }).length;
          var showSimStage = wsTab !== 'library';
          var showWaveEqAndCards = wsTab === 'explore' || wsTab === 'all';
          var showMissionsPanel = wsTab === 'missions' || wsTab === 'all';
          var showAnalyzePanel = wsTab === 'analyze' || wsTab === 'all';
          var showNotebookPanel = wsTab === 'notebook' || wsTab === 'all';



          return React.createElement("div", { className: "max-w-6xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            // First-run 3-step tour (self-contained; localStorage-persisted)
            (function () {
              var TOUR = [
                { icon: '🎚', text: __alloT('stem.wave.tour_step1', 'Welcome! Drag the Amplitude and Frequency sliders to shape your wave — or focus the wave itself and use the arrow keys. Space pauses.') },
                { icon: '🌊', text: __alloT('stem.wave.tour_step2', 'Switch modes above: Standing, Ripple Tank, Reflection, Longitudinal, Doppler, and Spectrum each show a different piece of wave physics.') },
                { icon: '∿', text: __alloT('stem.wave.tour_step3', 'Turn on the Second Wave to see superposition — two waves adding into one. Try the 🎵 Beats preset, then Play Sound to hear it.') }
              ];
              var seen = false;
              try { seen = !!window.localStorage.getItem('allo_wave_tour_done'); } catch (e) {}
              // Indexes the tour steps; -1 means 'tour finished'. A string or
              // object left the lookup undefined and threw on .icon.
              var step = (d.tourStep === undefined) ? (seen ? -1 : 0)
                : (Number.isInteger(d.tourStep) ? d.tourStep : (seen ? -1 : 0));
              if (step == null || step < 0 || step >= TOUR.length) return null;
              var cur = TOUR[step];
              var done = function () { try { window.localStorage.setItem('allo_wave_tour_done', '1'); } catch (e) {} upd('tourStep', -1); };
              return React.createElement("div", { role: "region", "aria-label": __alloT('stem.wave.tour_region_label', 'Getting started tips'), className: "mb-3 p-3 rounded-xl border-2 border-cyan-300 bg-cyan-50 flex items-center gap-3 flex-wrap" },
                React.createElement("span", { className: "text-2xl", "aria-hidden": "true" }, cur.icon),
                React.createElement("p", { className: "text-xs text-cyan-700 font-semibold flex-1 min-w-[200px] m-0" }, cur.text),
                React.createElement("span", { className: "text-[0.625rem] font-bold text-cyan-700" }, (step + 1) + '/' + TOUR.length),
                React.createElement("button", { onClick: function () { if (step + 1 >= TOUR.length) done(); else upd('tourStep', step + 1); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800 active:scale-[0.97]" }, step + 1 >= TOUR.length ? '✓ ' + __alloT('stem.wave.tour_done', 'Done') : __alloT('stem.wave.tour_next', 'Next') + ' →'),
                React.createElement("button", { onClick: done, "aria-label": __alloT('stem.wave.tour_skip_label', 'Skip the tour'), className: "transition-colors px-2 py-1.5 rounded-lg text-xs text-cyan-700 hover:bg-cyan-100 active:scale-[0.97]" }, __alloT('stem.wave.tour_skip', 'Skip'))
              );
            })(),

            (function() {
              var wAmp = Math.max(5, Math.min(100, Number(d.amplitude) || 50));
              var wFreq = Math.max(0.5, Math.min(10, Number(d.frequency) || 2));
              var wSpeed = Math.max(10, Number(d.waveSpeed) || 343);
              var wType = d.waveType || 'sine';
              var wLambda = (wSpeed / Math.max(0.1, wFreq)).toFixed(0);
              var scopePts = [];
              for (var xi = 0; xi <= 28; xi++) {
                var xf = xi / 28;
                var phase = xf * Math.PI * 2 * Math.min(4, Math.max(1, wFreq * 0.65));
                var yVal = wType === 'square' ? (Math.sin(phase) >= 0 ? 1 : -1)
                  : wType === 'triangle' ? (2 / Math.PI) * Math.asin(Math.sin(phase))
                  : wType === 'sawtooth' ? 2 * ((phase / (2 * Math.PI)) - Math.floor(0.5 + phase / (2 * Math.PI)))
                  : Math.sin(phase);
                var px = +(6 + xf * 64).toFixed(1);
                var py = +(24 - yVal * (wAmp / 100) * 15).toFixed(1);
                scopePts.push((xi === 0 ? 'M' : 'L') + px + ' ' + py);
              }
              var wavEmblemSvg = React.createElement("svg", { width: 48, height: 48, viewBox: "0 0 64 64", className: "shrink-0", 'aria-hidden': 'true', focusable: 'false' },
                React.createElement("rect", { x: 2, y: 2, width: 60, height: 60, rx: 14, fill: isContrast ? '#000000' : 'rgba(4,12,24,0.74)', stroke: isContrast ? '#00ff00' : 'rgba(56,189,248,0.55)', strokeWidth: 1.5 }),
                React.createElement("line", { x1: 10, y1: 32, x2: 54, y2: 32, stroke: isContrast ? '#ffffff' : 'rgba(148,163,184,0.45)', strokeWidth: 1.2, strokeDasharray: "3 3" }),
                React.createElement("path", { d: "M10 32 Q21 10 32 32 T54 32", fill: "none", stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 2.8, strokeLinecap: 'round' }),
                React.createElement("path", { d: "M10 32 Q21 54 32 32 T54 32", fill: "none", stroke: isContrast ? '#ffff00' : '#fbbf24', strokeWidth: 1.8, strokeDasharray: "4 3" }),
                React.createElement("circle", { cx: 10, cy: 32, r: 2.5, fill: '#67e8f9' }),
                React.createElement("circle", { cx: 32, cy: 32, r: 2.8, fill: '#fbbf24' }),
                React.createElement("circle", { cx: 54, cy: 32, r: 2.5, fill: '#67e8f9' })
              );
              var wavMiniScopeSvg = React.createElement("svg", { width: 76, height: 48, viewBox: "0 0 76 48", className: "shrink-0", 'aria-hidden': 'true', focusable: 'false' },
                React.createElement("rect", { x: 1, y: 1, width: 74, height: 46, rx: 8, fill: isContrast ? '#000000' : '#020617', stroke: isContrast ? '#ffff00' : 'rgba(56,189,248,0.35)', strokeWidth: 1 }),
                React.createElement("line", { x1: 6, y1: 24, x2: 70, y2: 24, stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1 }),
                React.createElement("path", { d: scopePts.join(' '), fill: "none", stroke: isContrast ? '#00ff00' : '#22d3ee', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' })
              );
              var applyWavePreset = function(patch) {
                updPatch(function(cur) {
                  var mv = Object.assign({}, cur.modesVisited || {});
                  if (patch.waveMode) mv[patch.waveMode] = true;
                  return Object.assign({}, patch, { modesVisited: mv, workspaceTab: cur.workspaceTab === 'library' ? 'explore' : cur.workspaceTab });
                });
              };
              return React.createElement("header", { className: "wav-hero-deck" },
                React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-3" },
                  React.createElement("div", { className: "flex items-start gap-3 min-w-0 flex-1" },
                    React.createElement("button", { type: 'button', onClick: () => setStemLabTool(null), className: "wav-hero-back", 'aria-label': __alloT('stem.wave.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
                    wavEmblemSvg,
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                        React.createElement("span", { className: "wav-hero-badge" }, __alloT('stem.wave.hero_badge', 'Physics · Waves, Optics & Acoustics')),
                        React.createElement("span", { className: "px-2 py-0.5 bg-cyan-900/70 text-cyan-200 border border-cyan-400/40 text-[0.65rem] font-bold rounded-full" }, __alloT('stem.wave.badge_animated', 'ANIMATED'))
                      ),
                      React.createElement("h3", { className: "text-xl font-black tracking-tight mt-1" }, "\uD83C\uDF0A " + __alloT('stem.wave.title', 'Wave Simulator')),
                      React.createElement("p", { className: "text-xs text-sky-100/85 mt-0.5" }, __alloT('stem.wave.hero_sub', 'Explore standing harmonics, superposition beats, ripple-tank interference, Doppler shifts, and spectral analysis.'))
                    )
                  ),
                  React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                    React.createElement("div", { className: "wav-mini-scope" },
                      wavMiniScopeSvg,
                      React.createElement("div", { className: "text-xs leading-snug" },
                        React.createElement("div", { className: "font-black text-cyan-200 uppercase text-[10px] tracking-wider" }, wType),
                        React.createElement("div", { className: "font-bold text-white" }, "f " + wFreq.toFixed(1) + " Hz · A " + Math.round(wAmp)),
                        React.createElement("div", { className: "text-[11px] text-sky-200/80" }, "v " + Math.round(wSpeed) + " m/s · λ " + wLambda + " m")
                      )
                    ),
                    React.createElement("span", {
                      'data-wave-mastery-pill': 'true',
                      className: "px-3 py-1.5 rounded-full text-xs font-black border border-emerald-400/50 bg-emerald-700 text-white shadow-sm"
                    }, '\u2B50 ' + masteryCount + ' / ' + WAVE_MASTERY_IDS.length + ' ' + __alloT('stem.wave.mastered_suffix', 'mastered'))
                  )
                ),
                React.createElement("div", { className: "wav-preset-bar", role: "group", 'aria-label': __alloT('stem.wave.a11y_starter_presets', 'Starter wave presets') },
                  React.createElement("span", { className: "text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 mr-1" }, __alloT('stem.wave.presets_label', 'Bench presets:')),
                  React.createElement("button", { type: "button", className: "wav-preset-chip", onClick: function() { applyWavePreset({ waveMode: 'free', waveType: 'sine', frequency: 2.5, amplitude: 55, showSecondWave: false }); } }, "〰️ " + __alloT('stem.wave.preset_pure_sine', 'Pure Sine')),
                  React.createElement("button", { type: "button", className: "wav-preset-chip", onClick: function() { applyWavePreset({ waveMode: 'standing', harmonicN: 3, amplitude: 50 }); } }, "🎸 " + __alloT('stem.wave.preset_standing', '3rd Harmonic')),
                  React.createElement("button", { type: "button", className: "wav-preset-chip", onClick: function() { applyWavePreset({ waveMode: 'free', showSecondWave: true, frequency: 3, freq2: 3.3, amplitude: 45 }); } }, "🎵 " + __alloT('stem.wave.preset_beats', 'Acoustic Beats')),
                  React.createElement("button", { type: "button", className: "wav-preset-chip", onClick: function() { applyWavePreset({ waveMode: 'doppler', sourceSpeed: 0.45, frequency: 3 }); } }, "🚑 " + __alloT('stem.wave.preset_doppler', 'Doppler Shift')),
                  React.createElement("button", { type: "button", className: "wav-preset-chip", onClick: function() { applyWavePreset({ waveMode: 'ripple', frequency: 3, amplitude: 50 }); } }, "🫧 " + __alloT('stem.wave.preset_ripple', 'Ripple Interference'))
                )
              );
            })(),

            // ── UDL Workspace Bar (Focus Tabs + Grade-Band + Read Aloud) ──
            React.createElement("div", {
              'data-wave-workspace-bar': 'true',
              className: "mb-3 p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2"
            },
              React.createElement("div", { className: "flex flex-wrap items-center gap-2 justify-between" },
                React.createElement("div", {
                  role: 'tablist',
                  'aria-label': __alloT('stem.wave.aria_workspace_tabs', 'Wave lab workspace sections'),
                  className: "flex flex-wrap gap-1.5"
                },
                  [
                    { id: 'explore', label: '\uD83D\uDD2C ' + __alloT('stem.wave.wtab_explore', 'Explore') },
                    { id: 'missions', label: '\uD83C\uDFAF ' + __alloT('stem.wave.wtab_missions', 'Missions') + ' (' + completedMissionsCount + '/' + WAVE_MISSIONS.length + ')' },
                    { id: 'analyze', label: '\uD83D\uDCCA ' + __alloT('stem.wave.wtab_analyze', 'Analyze & Log') + ' (' + d.experimentLog.length + ')' },
                    { id: 'notebook', label: '\uD83D\uDCDD ' + __alloT('stem.wave.wtab_notebook', 'CER & Bridges') },
                    { id: 'library', label: '\uD83D\uDCDA ' + __alloT('stem.wave.wtab_library', 'Library') },
                    { id: 'all', label: '\u2728 ' + __alloT('stem.wave.wtab_all', 'All') }
                  ].map(function(tabItem) {
                    var isSel = wsTab === tabItem.id;
                    return React.createElement("button", {
                      key: tabItem.id,
                      type: 'button',
                      role: 'tab',
                      'aria-selected': isSel,
                      'data-wave-tab': tabItem.id,
                      'aria-label': __alloT('stem.wave.aria_workspace_tab', 'Open workspace section: ') + tabItem.label,
                      style: { minHeight: 44 },
                      onClick: function() { upd('workspaceTab', tabItem.id); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (isSel ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-cyan-50')
                    }, tabItem.label);
                  })
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" },
                  React.createElement("div", {
                    role: 'group',
                    'aria-label': __alloT('stem.wave.aria_grade_band', 'Reading and math complexity level'),
                    className: "flex flex-wrap gap-1"
                  },
                    [
                      { id: '3-5', label: __alloT('stem.wave.band_35', 'Grades 3-5') },
                      { id: '6-8', label: __alloT('stem.wave.band_68', 'Grades 6-8') },
                      { id: '9-12', label: __alloT('stem.wave.band_912', 'Grades 9-12') }
                    ].map(function(bItem) {
                      var bAct = udlBand === bItem.id;
                      return React.createElement("button", {
                        key: bItem.id,
                        type: 'button',
                        'aria-pressed': bAct,
                        'data-wave-band': bItem.id,
                        'aria-label': __alloT('stem.wave.aria_set_band', 'Set coaching level to ') + bItem.label,
                        style: { minHeight: 44 },
                        onClick: function() { upd('learnerBand', bItem.id); },
                        className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (bAct ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-cyan-50')
                      }, bItem.label);
                    })
                  ),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-tts-btn': 'true',
                    'aria-label': __alloT('stem.wave.aria_read_aloud', 'Read current wave summary and guidance aloud'),
                    style: { minHeight: 44 },
                    onClick: readWaveAloud,
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                  }, '\uD83D\uDD0A ' + __alloT('stem.wave.btn_read_aloud', 'Read Aloud'))
                )
              ),
              React.createElement("div", {
                'data-wave-coach-banner': 'true',
                className: "px-3 py-2 rounded-lg border border-cyan-200 bg-cyan-50 text-xs text-slate-800 flex flex-wrap items-center gap-2 justify-between"
              },
                React.createElement("p", { className: "m-0 font-semibold" },
                  React.createElement("strong", { className: "text-cyan-800" }, '\uD83E\uDDED ' + __alloT('stem.wave.udl_coach_prefix', 'Coach (' + udlBand + '): ')),
                  getWaveCoachTip()
                ),
                wsTab === 'explore' && React.createElement("button", {
                  type: 'button',
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_open_missions_shortcut', 'Switch to interactive Wave Engineering Missions'),
                  onClick: function() { upd('workspaceTab', 'missions'); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
                }, '\uD83C\uDFAF ' + __alloT('stem.wave.btn_open_missions', 'Try Wave Missions') + ' (' + completedMissionsCount + '/' + WAVE_MISSIONS.length + ')')
              )
            ),

            // Mode tabs

            showSimStage && React.createElement(React.Fragment, null,

            React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 items-center" },

              React.createElement('div', { role: 'group', 'aria-label': __alloT('stem.wave.choose_experiment', 'Choose a wave experiment'), 'data-wave-mode-picker': true, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8, width: '100%' } },
              [['free', '\uD83C\uDF0A ' + __alloT('stem.wave.tab_free', 'Free Wave')], ['standing', '\uD83C\uDFB8 ' + __alloT('stem.wave.mode_standing_label', 'Standing')], ['ripple', '\uD83D\uDCA7 ' + __alloT('stem.wave.tab_ripple', 'Ripple Tank')], ['reflection', '\uD83E\uDE9E ' + __alloT('stem.wave.mode_reflection_label', 'Reflection')], ['longitudinal', '\u2261 ' + __alloT('stem.wave.mode_longitudinal_label', 'Longitudinal')], ['doppler', '\uD83D\uDE97 ' + __alloT('stem.wave.mode_doppler_label', 'Doppler')], ['spectrum', '\uD83D\uDCCA ' + __alloT('stem.wave.mode_spectrum_label', 'Spectrum')]].map(function (m) {

                return React.createElement("button", { "aria-label": __alloT('stem.wave.aria_switch_to', 'Switch to ') + m[1] + __alloT('stem.wave.aria_mode_suffix', ' mode'), key: m[0], type: 'button', 'data-wave-mode': m[0], 'aria-pressed': waveMode === m[0], 'aria-describedby': 'wave-mode-help-' + m[0], style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'left' }, onClick: function () {
                  upd('waveMode', m[0]);
                  // Canvas Narration: mode switch
                  if (typeof canvasNarrate === 'function') {
                    var modeDescs = { free: __alloT('stem.wave.narrate_free', 'Free wave mode. Observe sine, square, triangle, and sawtooth waveforms.'), standing: __alloT('stem.wave.narrate_standing', 'Standing wave mode. See nodes and antinodes form on a vibrating string.'), ripple: __alloT('stem.wave.narrate_ripple', 'Ripple tank mode. Drag two point sources to explore interference patterns.'), reflection: __alloT('stem.wave.narrate_reflection', 'Reflection and refraction mode. Drag the wall or lower reflectivity to watch two-medium transmission.'), longitudinal: __alloT('stem.wave.narrate_longitudinal', 'Longitudinal wave mode. See compression and rarefaction in a spring.'), doppler: __alloT('stem.wave.narrate_doppler', 'Doppler effect mode. A moving source shifts observed frequency and creates a Mach cone past Mach 1.'), spectrum: __alloT('stem.wave.narrate_spectrum', 'Spectrum analysis mode. See the frequency components of your wave.') };
                    canvasNarrate('wave', 'modeSwitch', {
                      first: __alloT('stem.wave.narrate_switched_to', 'Switched to ') + m[1] + '. ' + (modeDescs[m[0]] || ''),
                      repeat: m[1] + __alloT('stem.wave.narrate_mode_active', ' mode active.'),
                      terse: m[1]
                    });
                  }
                }, className: "px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 " + (waveMode === m[0] ? 'bg-slate-900 text-white shadow-md ring-1 ring-cyan-300/70' : 'transition-colors bg-white text-slate-700 border border-slate-300 hover:border-cyan-400 hover:bg-cyan-50 active:scale-[0.97]') }, React.createElement('span', { className: 'block' }, m[1]), React.createElement('span', { id: 'wave-mode-help-' + m[0], className: 'block mt-1 font-normal' }, waveModeHelp[m[0]]));

              })),

              React.createElement("button", {
                type: 'button',
                style: { minHeight: 44 },
                "aria-label": d.paused ? __alloT('stem.wave.aria_play_animation', 'Play animation') : __alloT('stem.wave.aria_pause_animation', 'Pause animation (or press Space on the wave)'),
                "aria-pressed": !!d.paused,
                onClick: function () { upd('paused', !d.paused); },
                className: "sm:ml-auto px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.paused ? 'bg-cyan-700 text-white shadow-sm' : 'transition-colors bg-white text-slate-700 border border-slate-300 hover:border-cyan-400 hover:bg-cyan-50 active:scale-[0.97]')
              }, d.paused ? '▶ ' + __alloT('stem.wave.btn_play', 'Play') : '⏸ ' + __alloT('stem.wave.btn_pause', 'Pause')),

              d.paused && React.createElement("button", {
                type: 'button',
                style: { minHeight: 44 },
                "aria-label": __alloT('stem.wave.aria_step_frame', 'Step the animation forward one frame'),
                onClick: function () { var c = canvasRef._lastCanvas; if (c && c._waveStep) c._waveStep(8); },
                className: "transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:border-cyan-400 hover:bg-cyan-50 active:scale-[0.97]"
              }, '⏭ ' + __alloT('stem.wave.btn_step', 'Step')),

              React.createElement("button", { type: 'button', style: { minHeight: 44 }, "aria-label": __alloT('stem.wave.aria_toggle_sound', 'Toggle Sound'),

                onClick: toggleSound,

                className: "px-4 py-2 rounded-lg text-xs font-bold transition-all " + ((_waveAudio.ctx && d.soundPlaying) ? ('bg-emerald-700 text-white ' + (reducedMotion ? '' : 'animate-pulse ') + 'shadow-sm') : 'transition-colors bg-white text-slate-700 border border-slate-300 hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.97]')

              }, (_waveAudio.ctx && d.soundPlaying) ? '\uD83D\uDD0A ' + __alloT('stem.wave.btn_stop_sound', 'Stop Sound') : '\uD83D\uDD08 ' + __alloT('stem.wave.btn_play_sound', 'Play Sound') + ' (' + Math.round(audioParams.f1Hz) + 'Hz)')

            ),

            // ── Topic-accent hero band per wave mode ──
            (function() {
              var MODE_META = {
                free:         { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '\uD83C\uDF0A', title: __alloT('stem.wave.hero_free_title', 'Free Wave \u2014 sine, square, triangle, sawtooth'),  hint: __alloT('stem.wave.hero_free_hint', 'Pure sine = single frequency; square / triangle / sawtooth are sine sums (Fourier 1822). Each waveform sounds different at the same pitch \u2014 timbre IS the harmonic content.') },
                standing:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83C\uDFB8', title: __alloT('stem.wave.hero_standing_title', 'Standing \u2014 nodes + antinodes on a string'),     hint: __alloT('stem.wave.hero_standing_hint', 'Two waves traveling opposite directions interfere into a stationary pattern. Guitar / violin strings vibrate at fundamental + integer harmonics. Length, tension, density set the pitch.') },
                ripple:       { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCA7', title: __alloT('stem.wave.hero_ripple_title', 'Ripple Tank \u2014 two sources, interference'),     hint: __alloT('stem.wave.hero_ripple_hint', 'Where crests meet crests \u2192 bright (constructive); crests meet troughs \u2192 dark (destructive). Young\u2019s 1801 double-slit experiment proved light is a wave; same physics here.') },
                reflection:   { accent: '#b45309', soft: 'rgba(180,83,9,0.10)',   icon: '\uD83E\uDE9E', title: __alloT('stem.wave.hero_reflection_title', 'Reflection & Refraction \u2014 boundary & two media'), hint: __alloT('stem.wave.hero_reflection_hint', 'Fixed ends invert phase (\u2212180\u00B0); free ends keep phase upright. Lower reflectivity to watch energy R\u00B2 reflect while 1\u2212R\u00B2 transmits into Medium 2 with speed ratio v\u2082/v\u2081.') },
                longitudinal: { accent: '#b45309', soft: 'rgba(217,119,6,0.10)',  icon: '\u2261',         title: __alloT('stem.wave.hero_longitudinal_title', 'Longitudinal \u2014 compression + rarefaction'),      hint: __alloT('stem.wave.hero_longitudinal_hint', 'Sound is longitudinal: air molecules push and pull along the direction of travel, not perpendicular. P-waves in earthquakes are longitudinal too \u2014 they arrive first, hence the P (primary).') },
                doppler:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDE97', title: __alloT('stem.wave.hero_doppler_title', 'Doppler & Mach Cone \u2014 moving siren & shock wave'), hint: __alloT('stem.wave.hero_doppler_hint', 'Source approaching = compressed wavelengths = higher pitch at O\u2082; receding = stretched wavelengths = lower pitch at O\u2081. Push v\u209B \u2265 1.0c to see a Mach sonic cone!') },
                spectrum:     { accent: '#047857', soft: 'rgba(16,185,129,0.10)', icon: '\uD83D\uDCCA', title: __alloT('stem.wave.hero_spectrum_title', 'Spectrum \u2014 FFT decomposition'),                  hint: __alloT('stem.wave.hero_spectrum_hint', 'Any periodic signal = sum of sines (Fourier transform). Enable Wave 2 to see its independent spectral peak f\u2082 alongside Wave 1 harmonics.') }
              };
              var meta = MODE_META[waveMode] || MODE_META.free;
              return React.createElement('div', {
                'data-wave-hero': waveMode,
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: isContrast ? '#000000' : (isDark ? '#1e293b' : ('linear-gradient(135deg, ' + meta.soft + ' 0%, #ffffff 100%)')),
                  border: isContrast ? '2px solid #ffff00' : ('1px solid ' + meta.accent + '55'),
                  borderLeft: isContrast ? '4px solid #ffff00' : ('4px solid ' + meta.accent),
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: isContrast ? '#ffff00' : (isDark ? '#f8fafc' : meta.accent), fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: isContrast ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155'), fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // Canvas

            React.createElement("div", {
              'data-allo-fs-stage': 'true',
              ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
              className: "relative rounded-lg overflow-hidden border mb-3",
              style: {
                height: "clamp(360px, 52vw, 460px)",
                background: "radial-gradient(circle at 24% 16%, rgba(34,211,238,0.22), transparent 30%), linear-gradient(180deg, #061827 0%, #082f49 52%, #06202f 100%)",
                borderColor: "rgba(14,116,144,0.42)",
                boxShadow: "0 20px 44px rgba(8,47,73,0.24), inset 0 1px 0 rgba(255,255,255,0.18)"
              }
            },

              React.createElement('button', {
                type: 'button',
                'data-allo-fs-btn': 'true',
                'aria-pressed': 'false',
                'aria-label': __alloT('stem.wave.enter_fullscreen', 'View the wave simulator fullscreen'),
                'data-fs-out': __alloT('stem.wave.enter_fullscreen', 'View the wave simulator fullscreen'),
                'data-fs-in': __alloT('stem.wave.exit_fullscreen', 'Exit fullscreen wave simulator (Escape)'),
                style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(34,211,238,0.5)', color: '#cffafe', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
              }, React.createElement('span', { 'aria-hidden': 'true' }, '⛶')),
              React.createElement("canvas", {
                role: "application", "aria-label": __alloT('stem.wave.aria_canvas', 'Wave simulator — arrow up/down adjusts amplitude, arrow left/right adjusts frequency, +/- adjusts animation speed, space pauses or resumes the animation'),
                tabIndex: 0,
                ref: canvasRef,
                className: "focus:outline-none focus:ring-4 focus:ring-cyan-300 focus:ring-inset",
                "data-wave-canvas": "true",

                "data-amp": d.amplitude, "data-freq": d.frequency, "data-wave-type": d.waveType || 'sine',

                "data-show-second": d.showSecond ? 'true' : 'false',

                "data-amp2": d.amplitude2 || 30, "data-freq2": d.frequency2 || 3,

                "data-speed": (typeof d.speed === 'number' && isFinite(d.speed)) ? d.speed : 1,

                "data-wave-mode": waveMode,

                "data-accent": waveViewMeta.accent,

                "data-paused": d.paused ? 'true' : 'false',

                "data-harmonic": d.harmonic || 1,
                "data-phase2": d.phase2 || 0,
                "data-damping": dampingEnabled ? 'true' : 'false',
                "data-damp-alpha": d.dampingAlpha || 0.5,
                "data-wave-speed": d.waveSpeed || 343,
                "data-ripple-separation": d.rippleSeparation,
                "data-damping-coeff": d.dampingCoeff,
                "data-source-speed": d.sourceSpeed,
                "data-medium2-ratio": d.medium2Ratio,
                "data-probe-enabled": d.probeEnabled ? 'true' : 'false',
                "data-probe-x": d.probeX,
                "data-probe-y": d.probeY,
                "data-wall-frac": d.wallFrac != null ? String(d.wallFrac) : '',
                "data-ripple-src1": d.rippleSrc1 ? (d.rippleSrc1.x + ',' + d.rippleSrc1.y) : '',
                "data-ripple-src2": d.rippleSrc2 ? (d.rippleSrc2.x + ',' + d.rippleSrc2.y) : '',

                "data-target-amp": d.matchTarget ? d.matchTarget.amp : 0,

                "data-target-freq": d.matchTarget ? d.matchTarget.freq : 0,

                "data-target-is-equation": (d.matchTarget && d.matchTarget.isEquation) ? 'true' : 'false',
                "data-reflection-end": d.reflectionEnd || 'fixed',
                "data-reflectivity": (typeof d.reflectivity === 'number' && isFinite(d.reflectivity)) ? d.reflectivity : 0.9,
                "data-standing-boundary": d.standingBoundary || 'bothFixed',
                "data-ripple-barrier": d.rippleBarrier || 'none',
                "data-slit-width": (typeof d.slitWidth === 'number' && isFinite(d.slitWidth)) ? d.slitWidth : 0.08,
                "data-show-intensity-screen": d.showIntensityScreen ? 'true' : 'false',
                "data-harmonic-weights": waveNormalizeWeights(d.harmonicWeights).join(','),
                "data-incident-angle": (typeof d.incidentAngleDeg === 'number' && isFinite(d.incidentAngleDeg)) ? d.incidentAngleDeg : 0,
                "data-packet-mode": (d.packetMode === 'packet' || d.packetMode === 'collide') ? d.packetMode : 'continuous',
                "data-collide-polarity": d.collidePolarity === 'same' ? 'same' : 'opposite',
                "data-grating-slits": String(d.gratingSlits || 4),
                "data-spectrum-filter": d.spectrumFilter || 'none',
                "data-filter-cutoff": String(d.filterCutoffHarmonic || 3),
                "data-dispersion-ratio": (typeof d.dispersionRatio === 'number' && isFinite(d.dispersionRatio)) ? d.dispersionRatio : 1.0,
                "data-longitudinal-mode": d.longitudinalMode === 'standing' ? 'standing' : 'traveling',
                "data-show-displacement-curve": d.showDisplacementCurve ? 'true' : 'false',
                "data-observer-speed": (typeof d.observerSpeed === 'number' && isFinite(d.observerSpeed)) ? d.observerSpeed : 0,
                "data-ripple-phase-diff": (typeof d.ripplePhaseDiff === 'number' && isFinite(d.ripplePhaseDiff)) ? d.ripplePhaseDiff : 0,
                "data-impedance-coupled": d.impedanceCoupled ? 'true' : 'false',
                "data-anti-reflection-coating": d.antiReflectionCoating ? 'true' : 'false',
                "data-fresnel-polarization": d.fresnelPolarization || 's',
                "data-brewster-match": waveMetrics.isBrewsterMatch ? 'true' : 'false',
                "data-doppler-regime": d.dopplerRegime || 'acoustic',
                "data-effective-reflectivity": waveMetrics.effectiveReflectivity.toFixed(4),
                "data-effective-phase-flip": String(waveMetrics.effectivePhaseFlip),
                "data-resonator-driven": d.resonatorDriven ? 'true' : 'false',
                "data-drive-freq-ratio": String(d.driveFreqRatio),
                "data-resonator-q": String(d.resonatorQ),
                "data-resonator-gain": String(Math.round(waveMetrics.resonatorGainNorm * d.resonatorQ * 100) / 100),
                "data-resonator-gain-norm": String(waveMetrics.resonatorGainNorm),
                "data-resonator-gain-pct": String(waveMetrics.resonatorGainPct),
                "data-resonator-phase-deg": String(waveMetrics.resonatorPhaseDeg),
                "data-resonator-is-peak": waveMetrics.resonatorIsPeak ? 'true' : 'false',
                "data-ftir-enabled": d.ftirEnabled ? 'true' : 'false',
                "data-ftir-gap-lambda": String(d.ftirGapLambda),
                "data-penetration-depth-lambda": waveMetrics.evanescentPenetrationLambda != null ? String(waveMetrics.evanescentPenetrationLambda) : '',
                "data-tunnel-transmission-pct": String(waveMetrics.tunnelTransmissionPct),
                "data-ocean-depth-coupled": d.oceanDepthCoupled ? 'true' : 'false',
                "data-water-depth-ratio": String(d.waterDepthRatio),
                "data-ocean-regime": String(waveMetrics.oceanRegime || 'deep'),
                "data-interval-lock": String(d.intervalLock || 'none'),
                "data-show-beat-envelope": d.showBeatEnvelope ? 'true' : 'false',
                "data-distance-attenuation": d.distanceAttenuation ? 'true' : 'false',
                "data-listener-dist-meters": String(d.listenerDistMeters),
                "data-spreading-law": String(d.spreadingLaw || 'spherical'),
                "data-attenuated-db": String(waveMetrics.attenuatedDb.toFixed(1)),
                "data-show-nodal-lines": d.showNodalLines ? 'true' : 'false',
                "data-ripple-fringe-spacing": String(waveMetrics.rippleFringeSpacingPx.toFixed(1)),
                "data-show-ruler": d.showRuler ? 'true' : 'false',
                "data-ruler-x1": String(d.rulerX1),
                "data-ruler-x2": String(d.rulerX2),
                "data-show-traveling-components": d.showTravelingComponents ? 'true' : 'false',
                "data-doppler-offset-angle": String(d.dopplerOffsetAngleDeg),
                "data-digital-sampling": d.digitalSampling ? 'true' : 'false',
                "data-sample-rate-ratio": String(d.sampleRateRatio),
                "data-adc-bit-depth": String(d.adcBitDepth),

                onKeyDown: function (e) {
                  var nv;
                  var say = function (id, msg) { if (typeof canvasNarrate === 'function') canvasNarrate('wave', id, msg, { debounce: 600 }); };

                  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                    e.preventDefault();
                    var nextPx = d.probeX;
                    var nextPy = d.probeY;
                    if (e.key === 'ArrowRight') nextPx = Math.min(0.95, Math.round((d.probeX + 0.02) * 100) / 100);
                    else if (e.key === 'ArrowLeft') nextPx = Math.max(0.05, Math.round((d.probeX - 0.02) * 100) / 100);
                    else if (e.key === 'ArrowUp') nextPy = Math.max(0.08, Math.round((d.probeY - 0.02) * 100) / 100);
                    else if (e.key === 'ArrowDown') nextPy = Math.min(0.92, Math.round((d.probeY + 0.02) * 100) / 100);
                    var nextPr = waveComputeProbeReadout(Object.assign({}, d, { probeEnabled: true, probeX: nextPx, probeY: nextPy }));
                    updPatch({ probeEnabled: true, probeX: nextPx, probeY: nextPy });
                    var probeMsg = __alloT('stem.wave.narrate_probe_pos', 'Probe ') + Math.round(nextPx * 100) + '%: ';
                    if (waveMode === 'standing') probeMsg += nextPr.standingClass + ', ' + Math.round(nextPr.envelopeFrac * 100) + '% A';
                    else if (waveMode === 'ripple') probeMsg += '\u0394r=' + nextPr.deltaRLambda.toFixed(2) + '\u03BB, ' + nextPr.interferenceClass;
                    else if (waveMode === 'reflection') probeMsg += nextPr.region + ', \u03BB=' + nextPr.localWavelength.toFixed(1) + ' m';
                    else probeMsg += nextPr.cyclesFromLeft.toFixed(2) + '\u03BB';
                    say('key_probe_move', probeMsg);
                  }

                  else if (e.key === 'ArrowUp') { e.preventDefault(); nv = Math.min(100, (d.amplitude || 50) + 5); upd('amplitude', nv); checkWaveMatch(nv, d.frequency); say('key_amp', __alloT('stem.wave.narrate_amplitude', 'Amplitude') + ' ' + nv); }

                  else if (e.key === 'ArrowDown') { e.preventDefault(); nv = Math.max(5, (d.amplitude || 50) - 5); upd('amplitude', nv); checkWaveMatch(nv, d.frequency); say('key_amp', __alloT('stem.wave.narrate_amplitude', 'Amplitude') + ' ' + nv); }

                  else if (e.key === 'ArrowRight') { e.preventDefault(); nv = Math.min(10, Math.round(((d.frequency || 2) + 0.5) * 10) / 10); upd('frequency', nv); syncOsc({ freq: nv }); checkWaveMatch(d.amplitude, nv); say('key_freq', __alloT('stem.wave.narrate_frequency', 'Frequency') + ' ' + nv + __alloT('stem.wave.narrate_hertz', ' hertz')); }

                  else if (e.key === 'ArrowLeft') { e.preventDefault(); nv = Math.max(0.5, Math.round(((d.frequency || 2) - 0.5) * 10) / 10); upd('frequency', nv); syncOsc({ freq: nv }); checkWaveMatch(d.amplitude, nv); say('key_freq', __alloT('stem.wave.narrate_frequency', 'Frequency') + ' ' + nv + __alloT('stem.wave.narrate_hertz', ' hertz')); }

                  else if (e.key === '.' && d.paused) { e.preventDefault(); var cvStep = canvasRef._lastCanvas; if (cvStep && cvStep._waveStep) cvStep._waveStep(8); say('key_step', __alloT('stem.wave.narrate_step', 'Stepped frame forward')); }

                  else if (e.key === '+' || e.key === '=') { e.preventDefault(); nv = Math.min(3, Math.round((((typeof d.speed === 'number' && isFinite(d.speed)) ? d.speed : 1) + 0.25) * 100) / 100); upd('speed', nv); say('key_speed', __alloT('stem.wave.animation_speed', 'Animation speed') + ' ' + nv + ' x'); }

                  else if (e.key === '-') { e.preventDefault(); nv = Math.max(0.25, Math.round((((typeof d.speed === 'number' && isFinite(d.speed)) ? d.speed : 1) - 0.25) * 100) / 100); upd('speed', nv); say('key_speed', __alloT('stem.wave.animation_speed', 'Animation speed') + ' ' + nv + ' x'); }

                  else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); nv = !d.probeEnabled; upd('probeEnabled', nv); say('key_probe', nv ? __alloT('stem.wave.narrate_probe_on', 'Wave probe enabled') : __alloT('stem.wave.narrate_probe_off', 'Wave probe disabled')); }

                  else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); nv = !d.paused; upd('paused', nv); say('key_pause', nv ? __alloT('stem.wave.narrate_paused', 'Animation paused') : __alloT('stem.wave.narrate_playing', 'Animation playing')); }

                },

                style: { width: "100%", height: "100%", display: "block", background: "transparent", touchAction: (d.probeEnabled || d.showRuler || waveMode === 'ripple' || waveMode === 'reflection') ? 'none' : 'pan-y' }

              }),

              React.createElement("div", {
                "aria-hidden": "true",
                className: "pointer-events-none absolute inset-0",
                style: {
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10), transparent 18%, transparent 78%, rgba(2,6,23,0.28)), radial-gradient(circle at 50% 50%, transparent 58%, rgba(2,6,23,0.32) 100%)"
                }
              }),

              React.createElement("div", {
                className: "pointer-events-none absolute left-3 top-3 rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-white shadow-xl backdrop-blur-md"
              },
                React.createElement("p", { className: "text-[0.6875rem] font-black uppercase tracking-wider text-cyan-100/80" }, __alloT('stem.wave.overlay_live_wave', 'Live wave')),
                React.createElement("p", { className: "text-sm font-black leading-tight" }, waveViewMeta.label),
                React.createElement("p", { className: "mt-1 text-[0.6875rem] text-cyan-50/90" }, "A " + displayAmp + " | f " + displayFreq + " Hz | T " + displayPeriod.toFixed(2) + " s")
              ),

              React.createElement("div", {
                className: "pointer-events-none absolute right-14 top-3 hidden rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-right text-white shadow-xl backdrop-blur-md sm:block"
              },
                React.createElement("p", { className: "text-[0.6875rem] font-black uppercase tracking-wider text-slate-200/80" }, waveViewMeta.chip),
                React.createElement("p", { className: "text-[0.6875rem] text-slate-100/90" }, __alloT('stem.wave.overlay_type', 'Type') + " " + activeWaveType),
                React.createElement("p", { className: "text-[0.6875rem] text-slate-100/90" }, __alloT('stem.wave.overlay_medium', 'Medium') + " " + displayMediumSpeed + " m/s")
              ),

              React.createElement("div", {
                className: "pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-2 text-white"
              },
                [
                  [__alloT('stem.wave.readout_wavelength', 'Wavelength'), displayWavelength.toFixed(1) + ' m'],
                  [__alloT('stem.wave.readout_speed', 'Speed'), displaySpeed.toFixed(1) + 'x'],
                  [__alloT('stem.wave.readout_energy', 'Energy'), (displayAmp * displayAmp).toFixed(0)]
                ].map(function(item) {
                  return React.createElement("div", { key: item[0], className: "rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1.5 shadow-lg backdrop-blur-md" },
                    React.createElement("p", { className: "text-[0.6875rem] font-black uppercase tracking-wider text-cyan-100/75" }, item[0]),
                    React.createElement("p", { className: "text-xs font-black leading-tight" }, item[1])
                  );
                }),

                waveMode === 'spectrum' && React.createElement("div", { className: "rounded-lg border border-emerald-300/40 bg-slate-950/60 px-2.5 py-1.5 shadow-lg backdrop-blur-md" },
                  React.createElement("p", { className: "text-[0.6875rem] font-black uppercase tracking-wider text-emerald-200/80" }, __alloT('stem.wave.overlay_timbre_harmonics', 'Timbre = harmonics')),
                  React.createElement("p", { className: "text-xs font-bold leading-tight" }, timbreNote)
                ),

                waveMode === 'longitudinal' && React.createElement("div", { className: "rounded-lg border border-amber-300/40 bg-slate-950/60 px-2.5 py-1.5 shadow-lg backdrop-blur-md" },
                  React.createElement("p", { className: "text-[0.6875rem] font-black uppercase tracking-wider text-amber-200/80" }, "● " + __alloT('stem.wave.overlay_gold_tracer', 'Gold tracer')),
                  React.createElement("p", { className: "text-xs font-bold leading-tight" }, __alloT('stem.wave.overlay_jiggles', 'Jiggles in place — the wave travels, the matter does not')),
                  React.createElement("p", { className: "mt-1 flex flex-wrap gap-x-2 text-[0.6875rem] font-bold" },
                    React.createElement("span", { className: "text-rose-200" }, __alloT('stem.wave.overlay_warm_compression', 'Warm = compression')),
                    React.createElement("span", { className: "text-blue-200" }, __alloT('stem.wave.overlay_blue_rarefaction', 'Blue = rarefaction')))
                )
              )

            ),

            // Live Summary + Wave Probe / Log Trial quick controls

            React.createElement("div", {
              className: "mb-3 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-slate-50 p-3 shadow-sm",
              "data-wave-live-summary": "true",
              role: "group",
              "aria-label": __alloT('stem.wave.aria_live_measurements', 'Live wave measurements'),
              style: { borderColor: waveViewMeta.accent + '55' }
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("div", null,
                  React.createElement("div", { className: "text-[0.625rem] font-black uppercase tracking-[0.18em] text-slate-600" }, __alloT('stem.wave.live_measurements_label', 'Live measurements')),
                  React.createElement("div", { className: "mt-0.5 text-xs font-black text-slate-900" }, waveViewMeta.label + " • " + waveViewMeta.chip)
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-probe-toggle': 'true',
                    'aria-pressed': !!d.probeEnabled,
                    'aria-label': __alloT('stem.wave.aria_toggle_probe', 'Toggle interactive wave probe reticle'),
                    style: { minHeight: 44 },
                    onClick: function() { upd('probeEnabled', !d.probeEnabled); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.probeEnabled ? 'bg-amber-700 text-white shadow-sm' : 'bg-white text-slate-800 border border-slate-300 hover:bg-amber-50')
                  }, '\uD83D\uDCCD ' + (d.probeEnabled ? __alloT('stem.wave.btn_probe_on', 'Probe ON') : __alloT('stem.wave.btn_probe_off', 'Wave Probe'))),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-ruler-toggle': 'true',
                    'aria-pressed': !!d.showRuler,
                    'aria-label': __alloT('stem.wave.aria_toggle_ruler', 'Toggle on-canvas wavelength caliper ruler'),
                    style: { minHeight: 44 },
                    onClick: function() { upd('showRuler', !d.showRuler); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.showRuler ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-slate-800 border border-slate-300 hover:bg-cyan-50')
                  }, '\uD83D\uDCCF ' + (d.showRuler ? __alloT('stem.wave.btn_ruler_on', 'Caliper ON') : __alloT('stem.wave.btn_ruler_off', '\u03BB Caliper'))),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-log-trial': 'true',
                    'aria-label': __alloT('stem.wave.aria_log_trial', 'Record current wave trial to the experiment log'),
                    style: { minHeight: 44 },
                    onClick: logWaveTrial,
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                  }, '\uD83D\uDCDD ' + __alloT('stem.wave.btn_log_trial', 'Log Trial') + ' (' + d.experimentLog.length + ')'),
                  React.createElement("span", { className: "rounded-full border px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-wide", style: isContrast ? { borderColor: '#ffff00', background: '#000000', color: '#ffff00' } : { borderColor: waveViewMeta.accent + '66', background: waveViewMeta.accent + '15', color: isDark ? waveViewMeta.accent : 'rgb(' + [16, 8, 0].map(function (sh) { return Math.round((parseInt(waveViewMeta.accent.slice(1), 16) >> sh & 255) * 0.5); }).join(',') + ')' } }, d.paused ? __alloT('stem.wave.live_paused', 'Paused') : __alloT('stem.wave.live_running', 'Running'))
                )
              ),
              React.createElement("div", { className: "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" }, [
                [__alloT('stem.wave.live_waveform', 'Waveform'), activeWaveType, 'text-cyan-700'],
                [__alloT('stem.wave.live_amplitude', 'Amplitude'), displayAmp, 'text-sky-700'],
                [__alloT('stem.wave.live_frequency', 'Frequency'), displayFreq + ' Hz', 'text-indigo-700'],
                [__alloT('stem.wave.live_period', 'Period'), displayPeriod.toFixed(2) + ' s', 'text-violet-700'],
                [__alloT('stem.wave.live_wavelength', 'Wavelength'), displayWavelength.toFixed(1) + ' m', 'text-emerald-700'],
                [__alloT('stem.wave.wave_speed', 'Wave speed in medium'), displayMediumSpeed + ' m/s', 'text-amber-700']
              ].map(function (item) {
                return React.createElement("div", { key: item[0], className: "rounded-lg border border-slate-200 bg-white px-2.5 py-2" },
                  React.createElement("div", { className: "text-[0.625rem] font-black uppercase tracking-wide text-slate-600" }, item[0]),
                  React.createElement("div", { className: "mt-0.5 truncate font-mono text-sm font-black " + item[2] }, String(item[1]))
                );
              }))
            ),

            // ── Physical Medium Presets Bar ──
            React.createElement("div", {
              'data-wave-media-presets': 'true',
              className: "mb-3 p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-wrap items-center gap-2"
            },
              React.createElement("span", { className: "text-xs font-black text-slate-700 uppercase tracking-wide mr-1" }, '\uD83C\uDF0D ' + __alloT('stem.wave.medium_presets_label', 'Medium:')),
              WAVE_MEDIA_PRESETS.map(function(mp) {
                var mLabel = mp.labelKey ? __alloT(mp.labelKey, mp.label) : mp.label;
                var mAct = Math.abs(displayMediumSpeed - mp.speed) <= 5;
                return React.createElement("button", {
                  key: mp.id,
                  type: 'button',
                  'aria-pressed': mAct,
                  'data-wave-medium': mp.id,
                  'aria-label': __alloT('stem.wave.aria_select_medium', 'Set medium speed to ') + mLabel + ' (' + mp.speed + ' m/s)',
                  style: { minHeight: 44 },
                  onClick: function() {
                    updPatch({ waveSpeed: mp.speed, stringMechanics: false, airTempCoupled: false });
                    if (typeof addToast === 'function') addToast(mp.icon + ' ' + mLabel + ' (' + mp.speed + ' m/s)', 'info');
                  },
                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (mAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-slate-50 text-slate-800 border border-slate-300 hover:bg-cyan-50')
                }, mp.icon + ' ' + mLabel + ' (' + mp.speed + ')');
              })
            ),

            // ── Interactive Wavelength Caliper Ruler Card ──
            d.showRuler && React.createElement("div", {
              'data-wave-ruler-panel': 'true',
              role: 'region',
              'aria-label': __alloT('stem.wave.aria_ruler_panel', 'Wavelength caliper ruler controls and readout'),
              className: "mb-3 p-3 rounded-xl border-2 border-cyan-400 bg-cyan-50 space-y-2 shadow-sm"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("div", null,
                  React.createElement("h4", { className: "m-0 text-sm font-black text-cyan-900" }, '\uD83D\uDCCF ' + __alloT('stem.wave.ruler_title', 'Wavelength Caliper Ruler (\u03BB)')),
                  React.createElement("p", { className: "m-0 text-xs text-cyan-900" }, __alloT('stem.wave.ruler_hint', 'Drag the cyan caliper jaws on the canvas or snap directly to 0.5\u03BB / 1.0\u03BB.'))
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-ruler-snap': '0.5',
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_snap_half', 'Snap caliper jaws to half a wavelength'),
                    onClick: function() { updPatch(waveSnapRulerSpan(d, 0.5)); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-cyan-900 border border-cyan-400 hover:bg-cyan-100 transition-colors"
                  }, __alloT('stem.wave.btn_snap_half', 'Snap 0.5\u03BB')),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-ruler-snap': '1',
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_snap_one', 'Snap caliper jaws to one full wavelength'),
                    onClick: function() { updPatch(waveSnapRulerSpan(d, 1)); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800 transition-colors"
                  }, __alloT('stem.wave.btn_snap_one', 'Snap 1.0\u03BB'))
                )
              ),
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-cyan-200" },
                  React.createElement("label", { htmlFor: 'wave-ruler-x1-slider', className: "block text-xs font-bold text-slate-800" }, __alloT('stem.wave.ruler_x1_label', 'Left Jaw X\u2081: ') + Math.round(d.rulerX1 * 100) + '%'),
                  React.createElement("input", {
                    id: 'wave-ruler-x1-slider',
                    type: 'range',
                    min: 0.04, max: 0.96, step: 0.01,
                    value: d.rulerX1,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_ruler_x1', 'Wavelength caliper jaw 1 horizontal position'),
                    'aria-valuetext': Math.round(d.rulerX1 * 100) + __alloT('stem.wave.aria_pct_across', '% across canvas'),
                    onChange: function(e) { upd('rulerX1', parseFloat(e.target.value)); },
                    className: "w-full accent-cyan-700"
                  })
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-cyan-200" },
                  React.createElement("label", { htmlFor: 'wave-ruler-x2-slider', className: "block text-xs font-bold text-slate-800" }, __alloT('stem.wave.ruler_x2_label', 'Right Jaw X\u2082: ') + Math.round(d.rulerX2 * 100) + '%'),
                  React.createElement("input", {
                    id: 'wave-ruler-x2-slider',
                    type: 'range',
                    min: 0.04, max: 0.96, step: 0.01,
                    value: d.rulerX2,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_ruler_x2', 'Wavelength caliper jaw 2 horizontal position'),
                    'aria-valuetext': Math.round(d.rulerX2 * 100) + __alloT('stem.wave.aria_pct_across', '% across canvas'),
                    onChange: function(e) { upd('rulerX2', parseFloat(e.target.value)); },
                    className: "w-full accent-cyan-700"
                  })
                )
              ),
              React.createElement("div", { 'data-wave-ruler-readout': 'true', className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" },
                React.createElement("div", { className: "p-2 rounded-lg bg-white border border-cyan-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.ruler_span_cycles', 'Cycles Spanned')),
                  React.createElement("span", { className: "font-mono font-black text-cyan-900" }, rulerReadout.spanCycles.toFixed(2) + '\u03BB')
                ),
                React.createElement("div", { className: "p-2 rounded-lg bg-white border border-cyan-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.ruler_span_meters', 'Span Distance')),
                  React.createElement("span", { className: "font-mono font-black text-slate-900" }, rulerReadout.spanMeters.toFixed(1) + ' m')
                ),
                React.createElement("div", { className: "p-2 rounded-lg bg-white border border-cyan-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.ruler_lambda', 'Local Wavelength')),
                  React.createElement("span", { className: "font-mono font-black text-emerald-800" }, rulerReadout.wavelength.toFixed(1) + ' m')
                ),
                React.createElement("div", { className: "p-2 rounded-lg bg-white border border-cyan-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.ruler_match', 'Cycle Alignment')),
                  React.createElement("span", { className: "font-black " + (rulerReadout.isWholeMultiple ? 'text-emerald-700' : rulerReadout.isHalfMultiple ? 'text-amber-700' : 'text-slate-700') },
                    rulerReadout.isWholeMultiple ? __alloT('stem.wave.ruler_whole', 'Full n\u03BB cycle') : (rulerReadout.isHalfMultiple ? __alloT('stem.wave.ruler_half', 'Half (n+\u00BD)\u03BB') : __alloT('stem.wave.ruler_custom', 'Fraction'))
                  )
                )
              )
            ),

            // ── Interactive Wave Probe Telemetry Card ──
            d.probeEnabled && React.createElement("div", {
              'data-wave-probe-panel': 'true',
              role: 'region',
              'aria-label': __alloT('stem.wave.aria_probe_panel', 'Interactive wave probe measurements'),
              className: "mb-3 p-3 rounded-xl border-2 border-amber-400 bg-amber-50 space-y-2 shadow-sm"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("div", null,
                  React.createElement("h4", { className: "m-0 text-sm font-black text-amber-900" }, '\uD83D\uDCCD ' + __alloT('stem.wave.probe_title', 'Interactive Wave Probe')),
                  React.createElement("p", { className: "m-0 text-xs text-amber-900" }, __alloT('stem.wave.probe_hint', 'Drag the gold reticle directly on the canvas or nudge its coordinates below.'))
                ),
                React.createElement("button", {
                  type: 'button',
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_reset_probe', 'Center wave probe position'),
                  onClick: function() { updPatch({ probeX: 0.5, probeY: 0.5 }); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
                }, '\u21BB ' + __alloT('stem.wave.btn_center_probe', 'Center Probe'))
              ),
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-amber-200" },
                  React.createElement("label", { htmlFor: 'wave-probe-x-slider', className: "block text-xs font-bold text-slate-800" }, __alloT('stem.wave.probe_x_label', 'Probe X Position: ') + Math.round(d.probeX * 100) + '%'),
                  React.createElement("input", {
                    id: 'wave-probe-x-slider',
                    type: 'range',
                    min: 0.05, max: 0.95, step: 0.01,
                    value: d.probeX,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_probe_x', 'Wave probe horizontal position percentage'),
                    'aria-valuetext': Math.round(d.probeX * 100) + __alloT('stem.wave.aria_pct_across', '% across canvas'),
                    onChange: function(e) { upd('probeX', parseFloat(e.target.value)); },
                    className: "w-full accent-amber-600"
                  })
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-amber-200" },
                  React.createElement("label", { htmlFor: 'wave-probe-y-slider', className: "block text-xs font-bold text-slate-800" }, __alloT('stem.wave.probe_y_label', 'Probe Y Position: ') + Math.round(d.probeY * 100) + '%'),
                  React.createElement("input", {
                    id: 'wave-probe-y-slider',
                    type: 'range',
                    min: 0.08, max: 0.92, step: 0.01,
                    value: d.probeY,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_probe_y', 'Wave probe vertical position percentage'),
                    'aria-valuetext': Math.round(d.probeY * 100) + __alloT('stem.wave.aria_pct_down', '% from top'),
                    onChange: function(e) { upd('probeY', parseFloat(e.target.value)); },
                    className: "w-full accent-amber-600"
                  })
                )
              ),
              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" },
                React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_phase_dist', 'Span from Left')),
                  React.createElement("span", { className: "font-mono font-black text-slate-900" }, probeReadout.cyclesFromLeft.toFixed(2) + '\u03BB (' + probeReadout.positionMeters.toFixed(1) + ' m)')
                ),
                waveMode === 'ripple' && React.createElement(React.Fragment, null,
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, 'd\u2081 / d\u2082'),
                    React.createElement("span", { className: "font-mono font-black text-slate-900" }, probeReadout.d1Lambda.toFixed(2) + '\u03BB / ' + probeReadout.d2Lambda.toFixed(2) + '\u03BB')
                  ),
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, '\u0394r = |d\u2081 \u2212 d\u2082|'),
                    React.createElement("span", { className: "font-mono font-black text-cyan-800" }, probeReadout.deltaRLambda.toFixed(2) + '\u03BB (' + probeReadout.deltaRMeters.toFixed(1) + ' m)')
                  ),
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_interference', 'Interference')),
                    React.createElement("span", { className: "font-black " + (probeReadout.interferenceClass === 'constructive' ? 'text-emerald-700' : probeReadout.interferenceClass === 'destructive' ? 'text-rose-700' : 'text-amber-800') }, probeReadout.interferenceClass.toUpperCase() + (d.rippleBarrier === 'grating' ? (' · ' + Math.round((probeReadout.gratingIntensityNorm || 0) * 100) + '% I\u2080') : ''))
                  )
                ),
                waveMode === 'standing' && React.createElement(React.Fragment, null,
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_envelope', 'Envelope')),
                    React.createElement("span", { className: "font-mono font-black text-purple-800" }, Math.round(probeReadout.envelopeFrac * 100) + '% of A')
                  ),
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_standing_spot', 'String Spot')),
                    React.createElement("span", { className: "font-black text-slate-900 uppercase" }, probeReadout.standingClass)
                  )
                ),
                waveMode === 'reflection' && React.createElement(React.Fragment, null,
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_region', 'Region')),
                    React.createElement("span", { className: "font-black text-slate-900" }, probeReadout.region === 'medium1' ? 'Medium 1' : 'Medium 2')
                  ),
                  React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_local_wl', 'Local v / \u03BB')),
                    React.createElement("span", { className: "font-mono font-black text-emerald-800" }, Math.round(probeReadout.localSpeed) + ' m/s · ' + probeReadout.localWavelength.toFixed(1) + ' m')
                  )
                ),
                waveMode === 'longitudinal' && React.createElement("div", { className: "p-2 rounded-lg bg-white border border-amber-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_pressure_zone', 'Pressure Zone')),
                  React.createElement("span", { className: "font-black text-slate-900 uppercase" }, probeReadout.pressureState)
                ),
                waveMode === 'longitudinal' && d.longitudinalMode === 'standing' && React.createElement("div", {
                  'data-wave-probe-kundt-spot': 'true',
                  className: "p-2 rounded-lg bg-white border border-amber-200"
                },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_kundt_spot', 'Kundt Tube Spot')),
                  React.createElement("span", { className: "font-black text-rose-800 uppercase" },
                    probeReadout.pressureNodeClass === 'pressureAntinode'
                      ? __alloT('stem.wave.kundt_pa', 'PRESSURE ANTINODE (\u0394x Node)')
                      : probeReadout.pressureNodeClass === 'pressureNode'
                        ? __alloT('stem.wave.kundt_pn', 'PRESSURE NODE (\u0394x Antinode)')
                        : __alloT('stem.wave.kundt_mid', 'INTERMEDIATE'))
                ),
                React.createElement("div", { 'data-wave-probe-vmax': 'true', className: "p-2 rounded-lg bg-white border border-amber-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_vmax', 'v_max = \u03C9A')),
                  React.createElement("span", { className: "font-mono font-black text-slate-900" }, Math.round(probeReadout.maxVelocity) + ' u/s')
                ),
                React.createElement("div", { 'data-wave-probe-amax': 'true', className: "p-2 rounded-lg bg-white border border-amber-200" },
                  React.createElement("span", { className: "block font-bold text-slate-600 uppercase text-[0.625rem]" }, __alloT('stem.wave.probe_amax', 'a_max = \u03C9\u00B2A')),
                  React.createElement("span", { className: "font-mono font-black text-slate-900" }, Math.round(probeReadout.maxAcceleration) + ' u/s\u00B2')
                )
              ),
              (function() {
                var scopeMode = d.probeScopeMode === 'lissajous' ? 'lissajous' : 'time';
                var oscPts = (probeReadout.oscilloscopeTrace || []).map(function(val, idx, arr) {
                  var ox = 8 + (idx / Math.max(1, arr.length - 1)) * 304;
                  var oy = 42 - val * 30;
                  return ox.toFixed(1) + ',' + oy.toFixed(1);
                }).join(' ');
                var lisPts = (probeReadout.lissajousTrace || []).map(function(pt) {
                  var lx = 160 + (pt.x || 0) * 44;
                  var ly = 50 - (pt.y || 0) * 38;
                  return lx.toFixed(1) + ',' + ly.toFixed(1);
                }).join(' ');
                var lisAxes = probeReadout.lissajousAxes || { xLabel: 'y(t)', yLabel: 'v(t)/w', kind: 'phaseSpace' };
                return React.createElement("div", {
                  'data-wave-probe-oscilloscope-card': 'true',
                  className: "p-2.5 rounded-lg border",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] font-bold mb-1.5" },
                    React.createElement("span", { style: { color: isContrast ? '#ffff00' : '#67e8f9' } },
                      '\uD83D\uDCFA ' + (scopeMode === 'lissajous' ? __alloT('stem.wave.lissajous_title', 'XY Lissajous / Phase Space') : __alloT('stem.wave.oscilloscope_title', 'Oscilloscope y(t) at Probe'))
                    ),
                    React.createElement("div", {
                      role: 'group',
                      'aria-label': __alloT('stem.wave.aria_probe_scope_group', 'Probe oscilloscope display mode'),
                      className: "flex items-center gap-1.5 flex-wrap"
                    },
                      [
                        { id: 'time', label: __alloT('stem.wave.scope_time', 'Time y(t)'), aria: __alloT('stem.wave.aria_scope_time', 'Show time-domain oscilloscope waveform y of t') },
                        { id: 'lissajous', label: __alloT('stem.wave.scope_lissajous', 'XY Lissajous'), aria: __alloT('stem.wave.aria_scope_lissajous', 'Show XY Lissajous and phase-space portrait') }
                      ].map(function(sc) {
                        var scAct = scopeMode === sc.id;
                        var btnStyle = isContrast
                          ? (scAct ? { minHeight: 44, backgroundColor: '#ffff00', color: '#000000', border: '1px solid #ffff00' } : { minHeight: 44, backgroundColor: '#000000', color: '#ffff00', border: '1px solid #ffff00' })
                          : (scAct ? { minHeight: 44, backgroundColor: '#0e7490', color: '#ffffff', border: '1px solid #22d3ee' } : { minHeight: 44, backgroundColor: '#1e293b', color: '#f1f5f9', border: '1px solid #475569' });
                        return React.createElement("button", {
                          key: sc.id,
                          type: 'button',
                          'data-wave-probe-scope': sc.id,
                          'aria-pressed': scAct,
                          'aria-label': sc.aria,
                          style: btnStyle,
                          onClick: function() { upd('probeScopeMode', sc.id); },
                          className: "px-2.5 py-1.5 rounded text-[0.6875rem] font-bold transition-colors"
                        }, sc.label);
                      })
                    ),
                    React.createElement("span", { className: "font-mono", style: { color: isContrast ? '#ffff00' : '#e2e8f0' } },
                      scopeMode === 'lissajous'
                        ? (lisAxes.xLabel + ' vs ' + lisAxes.yLabel)
                        : ('\u03C9 = ' + probeReadout.angularFreq.toFixed(1) + ' rad/s · 2 cycles')
                    )
                  ),
                  scopeMode === 'lissajous'
                    ? React.createElement("svg", {
                        'data-wave-probe-lissajous': 'true',
                        role: 'img',
                        'aria-label': __alloT('stem.wave.aria_probe_lissajous', 'XY Lissajous and phase-space portrait at wave probe'),
                        viewBox: '0 0 320 100',
                        className: 'w-full h-24 rounded block',
                        style: { backgroundColor: isContrast ? '#000000' : '#020617' }
                      },
                        React.createElement("rect", { x: 112, y: 8, width: 96, height: 84, rx: 4, fill: 'none', stroke: isContrast ? '#666600' : '#1e293b', strokeWidth: 1 }),
                        React.createElement("line", { x1: 112, y1: 50, x2: 208, y2: 50, stroke: isContrast ? '#ffff00' : '#475569', strokeDasharray: '3 3', strokeWidth: 1 }),
                        React.createElement("line", { x1: 160, y1: 8, x2: 160, y2: 92, stroke: isContrast ? '#ffff00' : '#475569', strokeDasharray: '3 3', strokeWidth: 1 }),
                        React.createElement("polyline", { fill: 'none', stroke: isContrast ? '#00ff88' : '#22d3ee', strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round', points: lisPts }),
                        React.createElement("text", { x: 214, y: 53, fill: isContrast ? '#ffff00' : '#cbd5e1', fontSize: 9, fontWeight: 'bold' }, lisAxes.xLabel),
                        React.createElement("text", { x: 164, y: 17, fill: isContrast ? '#ffff00' : '#67e8f9', fontSize: 9, fontWeight: 'bold' }, lisAxes.yLabel)
                      )
                    : React.createElement("svg", {
                        'data-wave-probe-oscilloscope': 'true',
                        role: 'img',
                        'aria-label': __alloT('stem.wave.aria_probe_oscilloscope', 'Time-domain oscilloscope trace y of t at wave probe position'),
                        viewBox: '0 0 320 84',
                        className: 'w-full h-20 rounded block',
                        style: { backgroundColor: isContrast ? '#000000' : '#020617' }
                      },
                        React.createElement("line", { x1: 8, y1: 42, x2: 312, y2: 42, stroke: isContrast ? '#ffff00' : '#475569', strokeDasharray: '4 4', strokeWidth: 1 }),
                        React.createElement("line", { x1: 8, y1: 12, x2: 312, y2: 12, stroke: isContrast ? '#666600' : '#1e293b', strokeWidth: 1 }),
                        React.createElement("line", { x1: 8, y1: 72, x2: 312, y2: 72, stroke: isContrast ? '#666600' : '#1e293b', strokeWidth: 1 }),
                        React.createElement("polyline", { fill: 'none', stroke: isContrast ? '#00ff88' : '#22d3ee', strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round', points: oscPts })
                      )
                );
              })()
            ),

            (waveMode === 'free' || waveMode === 'spectrum') && React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },

              ['sine', 'square', 'triangle', 'sawtooth', 'custom'].map(function (wt) {

                var labelText = wt === 'custom' ? '\uD83C\uDF9B ' + __alloT('stem.wave.wt_custom', 'Custom Fourier') : (wt.charAt(0).toUpperCase() + wt.slice(1));
                return React.createElement("button", { key: wt, type: 'button', 'data-wave-type-btn': wt, style: { minHeight: 44 }, 'aria-pressed': (d.waveType || 'sine') === wt, onClick: function () { upd('waveType', wt); syncOsc({ type: wt, weights: d.harmonicWeights }); },

                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.waveType || 'sine') === wt ? 'bg-cyan-700 text-white shadow-md' : 'transition-colors bg-cyan-50 text-cyan-800 border border-cyan-600 hover:bg-cyan-100 active:scale-[0.97]')

                }, labelText);

              })

            ),

            (waveMode === 'free' || waveMode === 'spectrum') && (d.waveType || 'sine') === 'custom' && React.createElement("div", {
              'data-wave-fourier-builder': 'true',
              className: "mb-3 p-3 rounded-lg border border-cyan-200 bg-slate-50 space-y-2.5"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("span", { className: "text-xs font-black text-slate-800" }, '\uD83C\uDF9B ' + __alloT('stem.wave.fourier_title', 'Fourier Additive Synthesizer (H\u2081\u2013H\u2086)')),
                React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                  WAVE_FOURIER_PRESETS.map(function (pr) {
                    return React.createElement("button", {
                      key: pr.id,
                      type: 'button',
                      'data-wave-fourier-preset': pr.id,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_fourier_preset', 'Apply Fourier harmonic preset: ') + pr.label,
                      onClick: function () {
                        var nw = pr.weights.slice();
                        updPatch({ waveType: 'custom', harmonicWeights: nw });
                        syncOsc({ type: 'custom', weights: nw });
                      },
                      className: "px-2.5 py-2 rounded-md text-xs font-bold bg-white text-cyan-800 border border-cyan-400 hover:bg-cyan-50 transition-colors"
                    }, pr.label);
                  })
                )
              ),
              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" },
                waveNormalizeWeights(d.harmonicWeights).map(function (wVal, hi) {
                  return React.createElement("div", { key: 'hw-' + hi, className: "p-2 rounded bg-white border border-slate-200" },
                    React.createElement("div", { className: "flex justify-between text-[0.6875rem] font-bold text-slate-700" },
                      React.createElement("span", null, 'H' + (hi + 1) + ' (' + ((hi + 1) * d.frequency).toFixed(1) + ' Hz)'),
                      React.createElement("span", { className: "font-mono text-cyan-800" }, wVal.toFixed(2))
                    ),
                    React.createElement("input", {
                      type: 'range',
                      min: 0,
                      max: 1,
                      step: 0.05,
                      value: wVal,
                      'data-wave-harmonic-slider': String(hi),
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_harmonic_weight', 'Harmonic weight H') + (hi + 1),
                      onChange: function (e) {
                        var nextWeights = waveNormalizeWeights(d.harmonicWeights).slice();
                        nextWeights[hi] = parseFloat(e.target.value);
                        upd('harmonicWeights', nextWeights);
                        syncOsc({ type: 'custom', weights: nextWeights });
                      },
                      className: "w-full accent-cyan-700"
                    })
                  );
                })
              ),
              React.createElement("div", {
                'data-wave-pluck-sculptor': 'true',
                className: "pt-2.5 border-t border-cyan-200 flex flex-col gap-2"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("label", {
                    htmlFor: 'wave-pluck-position-slider',
                    className: "text-xs font-black text-slate-900"
                  }, '\uD83C\uDFB8 ' + __alloT('stem.wave.pluck_title', 'Young\u2013Helmholtz Pluck x\u209a/L: ') + Math.round((d.pluckPosition || 0.5) * 100) + '% (w\u2099\u221D|sin(n\u03C0x\u209a)|/n\u00B2)'),
                  React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                    [
                      { id: 'bridge', xp: 0.1, label: __alloT('stem.wave.pluck_bridge', '10% Bridge') },
                      { id: 'fifth', xp: 0.2, label: __alloT('stem.wave.pluck_fifth', '20% (H\u2085=0)') },
                      { id: 'third', xp: 0.33, label: __alloT('stem.wave.pluck_third', '33% (H\u2083=0)') },
                      { id: 'center', xp: 0.5, label: __alloT('stem.wave.pluck_center', '50% (H\u2082,H\u2084=0)') }
                    ].map(function (pp) {
                      var pAct = Math.abs((d.pluckPosition || 0.5) - pp.xp) < 0.025;
                      return React.createElement("button", {
                        key: pp.id,
                        type: 'button',
                        'data-wave-pluck-preset': pp.id,
                        'aria-pressed': pAct,
                        'aria-label': __alloT('stem.wave.aria_pluck_preset', 'Pluck string at ') + pp.label,
                        style: { minHeight: 44 },
                        onClick: function () {
                          var pw = waveComputePluckWeights(pp.xp);
                          var nextW = [pw[0], pw[1], pw[2], pw[3], pw[4], 0];
                          updPatch({ waveType: 'custom', pluckPosition: pp.xp, harmonicWeights: nextW });
                          syncOsc({ type: 'custom', weights: nextW });
                        },
                        className: "px-2.5 py-2 rounded-md text-xs font-bold transition-colors " + (pAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-900 border border-cyan-400 hover:bg-cyan-100')
                      }, pp.label);
                    })
                  )
                ),
                React.createElement("input", {
                  id: 'wave-pluck-position-slider',
                  'data-wave-pluck-slider': 'true',
                  type: 'range',
                  min: 0.05, max: 0.95, step: 0.01,
                  value: d.pluckPosition || 0.5,
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_pluck_slider', 'String pluck position as fraction of string length L'),
                  'aria-valuetext': Math.round((d.pluckPosition || 0.5) * 100) + __alloT('stem.wave.vt_pluck_pct', ' percent along string length'),
                  onChange: function (e) {
                    var xpVal = parseFloat(e.target.value);
                    var pw = waveComputePluckWeights(xpVal);
                    var nextW = [pw[0], pw[1], pw[2], pw[3], pw[4], 0];
                    updPatch({ waveType: 'custom', pluckPosition: xpVal, harmonicWeights: nextW });
                    syncOsc({ type: 'custom', weights: nextW });
                  },
                  className: "w-full accent-cyan-700"
                })
              )
            ),

            waveMode === 'spectrum' && (function () {
              var specMeta = waveComputeSpectrum(d, 12);
              return React.createElement("div", {
                'data-wave-filter-bench': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_filter_bench', 'Harmonic spectral filter bench'),
                className: "mb-3 p-3 rounded-lg border border-cyan-300 bg-cyan-50 space-y-2.5"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("span", { className: "text-xs font-black text-cyan-950" }, '\uD83C\uDFDA\uFE0F ' + __alloT('stem.wave.filter_bench_title', 'Harmonic Filter Bench (Timbre & Fourier Sculpture)')),
                  React.createElement("span", {
                    'data-wave-filter-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                  }, 'Retained E: ' + specMeta.retainedEnergyPct.toFixed(1) + '% · Centroid: ' + specMeta.spectralCentroidHz.toFixed(2) + ' Hz · THD: ' + specMeta.thdPct.toFixed(1) + '%')
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                  React.createElement("div", {
                    role: 'group',
                    'aria-label': __alloT('stem.wave.aria_filter_mode_group', 'Harmonic spectral filter modes'),
                    className: "flex flex-wrap gap-1.5"
                  },
                    [
                      { id: 'none', label: __alloT('stem.wave.filter_none', 'Bypass (All)'), aria: __alloT('stem.wave.aria_filter_none', 'Bypass spectral filter and pass all harmonics') },
                      { id: 'lowpass', label: __alloT('stem.wave.filter_lowpass', 'Low-Pass (h \u2264 Hc)'), aria: __alloT('stem.wave.aria_filter_lowpass', 'Low-pass filter keeping harmonics up to cutoff Hc') },
                      { id: 'highpass', label: __alloT('stem.wave.filter_highpass', 'High-Pass (h \u2265 Hc)'), aria: __alloT('stem.wave.aria_filter_highpass', 'High-pass filter keeping harmonics at or above cutoff Hc') },
                      { id: 'oddOnly', label: __alloT('stem.wave.filter_odd', 'Odd Harmonics Only'), aria: __alloT('stem.wave.aria_filter_odd', 'Keep only odd harmonics in the waveform and audio') }
                    ].map(function (fm) {
                      var fAct = (d.spectrumFilter || 'none') === fm.id;
                      return React.createElement("button", {
                        key: fm.id,
                        type: 'button',
                        'data-wave-filter-mode': fm.id,
                        'aria-pressed': fAct,
                        'aria-label': fm.aria,
                        style: { minHeight: 44 },
                        onClick: function () {
                          upd('spectrumFilter', fm.id);
                          syncOsc({ spectrumFilter: fm.id, filterCutoffHarmonic: d.filterCutoffHarmonic });
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (fAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-900 border border-cyan-400 hover:bg-cyan-100')
                      }, fm.label);
                    })
                  ),
                  (d.spectrumFilter === 'lowpass' || d.spectrumFilter === 'highpass') && React.createElement("div", { className: "flex items-center gap-2 ml-auto bg-white px-2.5 py-1 rounded-lg border border-cyan-200" },
                    React.createElement("label", { htmlFor: 'wave-filter-cutoff-slider', className: "text-xs font-bold text-slate-900 whitespace-nowrap" }, __alloT('stem.wave.filter_cutoff_label', 'Cutoff Hc:') + ' ' + (d.filterCutoffHarmonic || 3)),
                    React.createElement("input", {
                      id: 'wave-filter-cutoff-slider',
                      'data-wave-filter-cutoff': 'true',
                      type: 'range',
                      min: 1, max: 12, step: 1,
                      value: d.filterCutoffHarmonic || 3,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_filter_cutoff', 'Cutoff harmonic order Hc'),
                      'aria-valuetext': 'H' + (d.filterCutoffHarmonic || 3) + ' (' + ((d.filterCutoffHarmonic || 3) * d.frequency).toFixed(1) + ' Hz)',
                      onChange: function (e) {
                        var hcV = parseInt(e.target.value, 10) || 3;
                        upd('filterCutoffHarmonic', hcV);
                        syncOsc({ spectrumFilter: d.spectrumFilter, filterCutoffHarmonic: hcV });
                      },
                      className: "w-28 accent-cyan-700"
                    })
                  )
                )
              );
            })(),

            waveMode === 'spectrum' && (function () {
              var digMeta = waveComputeDigitalSampling(d.frequency, d.sampleRateRatio, d.adcBitDepth);
              var nyqAliasTxt = digMeta.isFundamentalAliased
                ? (__alloT('stem.wave.nyquist_alias_tag', 'ALIAS ') + digMeta.aliasFreqHz.toFixed(1) + ' Hz')
                : __alloT('stem.wave.nyquist_clean_tag', 'Nyquist OK');
              return React.createElement("div", {
                'data-wave-nyquist-bench': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_nyquist_bench', 'Nyquist-Shannon sampling, aliasing and ADC quantization bench'),
                className: "mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 space-y-2.5"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("span", { className: "text-xs font-black text-amber-950" }, '\uD83D\uDCE1 ' + __alloT('stem.wave.nyquist_bench_title', 'Nyquist\u2013Shannon Sampling, Aliasing & ADC Quantization Bench')),
                  React.createElement("span", {
                    'data-wave-nyquist-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                  }, 'f\u209B = ' + digMeta.sampleRateHz.toFixed(1) + ' Hz (' + digMeta.sampleRateRatio.toFixed(2) + '\u00D7f\u2081) · f_Nyq = ' + digMeta.nyquistFreqHz.toFixed(1) + ' Hz · ' + digMeta.adcBitDepth + '-bit (' + digMeta.quantizationLevels + ' lvls) · SQNR = ' + digMeta.sqnrDb.toFixed(1) + ' dB · ' + nyqAliasTxt)
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-digital-sampling-toggle': 'true',
                    'aria-pressed': !!d.digitalSampling,
                    'aria-label': __alloT('stem.wave.aria_digital_sampling_toggle', 'Toggle digital ADC sample-and-hold and aliasing overlay'),
                    style: { minHeight: 44 },
                    onClick: function () { upd('digitalSampling', !d.digitalSampling); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.digitalSampling ? 'bg-amber-800 text-white shadow-sm' : 'bg-white text-amber-950 border border-amber-500 hover:bg-amber-100')
                  }, d.digitalSampling ? '\u2713 ' + __alloT('stem.wave.nyquist_toggle_on', 'ADC Overlay On') : __alloT('stem.wave.nyquist_toggle_off', 'Enable ADC & Nyquist Overlay')),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-nyquist-alias-demo': 'true',
                    'aria-label': __alloT('stem.wave.aria_nyquist_alias_demo', 'Set sub-Nyquist 1.25x sampling ratio and 4-bit ADC to demonstrate aliasing'),
                    style: { minHeight: 44 },
                    onClick: function () { updPatch({ digitalSampling: true, sampleRateRatio: 1.25, adcBitDepth: 4 }); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors bg-rose-800 text-white hover:bg-rose-900 shadow-sm"
                  }, '\u26A1 ' + __alloT('stem.wave.nyquist_alias_demo', 'Sub-Nyquist Alias Demo (1.25\u00D7, 4-bit)')),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-nyquist-safe-demo': 'true',
                    'aria-label': __alloT('stem.wave.aria_nyquist_safe_demo', 'Reset ADC sampling bench to oversampled 8x and 8-bit resolution'),
                    style: { minHeight: 44 },
                    onClick: function () { updPatch({ digitalSampling: true, sampleRateRatio: 8, adcBitDepth: 8 }); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors bg-white text-slate-900 border border-slate-400 hover:bg-slate-100"
                  }, __alloT('stem.wave.nyquist_safe_demo', 'Clean 8\u00D7 / 8-bit'))
                ),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2.5" },
                  React.createElement("div", { className: "p-2.5 rounded-lg bg-white border border-amber-200 flex flex-col gap-1" },
                    React.createElement("label", {
                      htmlFor: 'wave-sample-rate-slider',
                      className: "text-xs font-bold text-slate-900"
                    }, __alloT('stem.wave.sample_rate_ratio_label', 'Sampling Ratio (f\u209B/f\u2081):') + ' ' + Number(d.sampleRateRatio || 8).toFixed(2) + '\u00D7 (' + digMeta.sampleRateHz.toFixed(1) + ' Hz)'),
                    React.createElement("input", {
                      id: 'wave-sample-rate-slider',
                      'data-wave-sample-rate-ratio': 'true',
                      type: 'range',
                      min: 1, max: 16, step: 0.25,
                      value: d.sampleRateRatio || 8,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_sample_rate_slider', 'Sampling rate ratio f s over fundamental frequency f 1'),
                      'aria-valuetext': Number(d.sampleRateRatio || 8).toFixed(2) + __alloT('stem.wave.vt_sample_rate_suffix', ' times fundamental frequency'),
                      onChange: function (e) { updPatch({ digitalSampling: true, sampleRateRatio: parseFloat(e.target.value) }); },
                      className: "w-full accent-amber-700"
                    })
                  ),
                  React.createElement("div", { className: "p-2.5 rounded-lg bg-white border border-amber-200 flex flex-col gap-1" },
                    React.createElement("label", {
                      htmlFor: 'wave-adc-bits-slider',
                      className: "text-xs font-bold text-slate-900"
                    }, __alloT('stem.wave.adc_bits_label', 'ADC Bit Depth (N):') + ' ' + (d.adcBitDepth || 8) + __alloT('stem.wave.adc_bits_suffix', '-bit') + ' (' + digMeta.quantizationLevels + ' ' + __alloT('stem.wave.adc_lvls_label', 'levels') + ')'),
                    React.createElement("input", {
                      id: 'wave-adc-bits-slider',
                      'data-wave-adc-bit-depth': 'true',
                      type: 'range',
                      min: 2, max: 16, step: 1,
                      value: d.adcBitDepth || 8,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_adc_bits_slider', 'ADC bit depth quantization resolution'),
                      'aria-valuetext': (d.adcBitDepth || 8) + __alloT('stem.wave.vt_adc_sqnr_mid', ' bit ADC SQNR ') + digMeta.sqnrDb.toFixed(1) + __alloT('stem.wave.vt_db_suffix', ' decibels'),
                      onChange: function (e) { updPatch({ digitalSampling: true, adcBitDepth: parseInt(e.target.value, 10) || 8 }); },
                      className: "w-full accent-amber-700"
                    })
                  )
                )
              );
            })(),

            // Standing resonator boundary selector + Harmonic selector (standing mode only)

            waveMode === 'standing' && React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 items-center rounded-lg p-2", style: { background: 'var(--allo-stem-panel, #f8fafc)' } },

              React.createElement("div", {
                role: 'group',
                'data-wave-standing-boundary-group': 'true',
                'aria-label': __alloT('stem.wave.aria_standing_boundary_group', 'Standing wave resonator boundary conditions'),
                className: "flex flex-wrap items-center gap-1.5 w-full pb-2 mb-1 border-b border-cyan-200/70"
              },
                React.createElement("span", { className: "text-xs font-bold text-cyan-800 mr-1" }, __alloT('stem.wave.standing_boundary_label', 'Boundary:')),
                [
                  { id: 'bothFixed', label: '\uD83D\uDD12 ' + __alloT('stem.wave.sb_both_fixed', 'Both Fixed (String)'), aria: __alloT('stem.wave.aria_sb_both_fixed', 'Both ends fixed string resonator, nodes at both ends') },
                  { id: 'openOpen', label: '\uD83C\uDFBA ' + __alloT('stem.wave.sb_open_open', 'Open-Open Pipe'), aria: __alloT('stem.wave.aria_sb_open_open', 'Open-open acoustic pipe resonator, antinodes at both ends') },
                  { id: 'fixedFree', label: '\uD83C\uDFB7 ' + __alloT('stem.wave.sb_fixed_free', 'Closed Pipe (1 Fixed, 1 Open)'), aria: __alloT('stem.wave.aria_sb_fixed_free', 'Closed pipe resonator with one fixed node end and one open antinode end, odd quarter-wave harmonics') }
                ].map(function (bOpt) {
                  var bAct = (d.standingBoundary || 'bothFixed') === bOpt.id;
                  return React.createElement("button", {
                    key: bOpt.id,
                    type: 'button',
                    'data-wave-standing-boundary': bOpt.id,
                    'aria-pressed': bAct,
                    'aria-label': bOpt.aria,
                    style: { minHeight: 44 },
                    onClick: function () { upd('standingBoundary', bOpt.id); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + (bAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-800 border border-cyan-500 hover:bg-cyan-50')
                  }, bOpt.label);
                })
              ),

              React.createElement("span", { className: "text-xs font-bold text-cyan-800" }, __alloT('stem.wave.standing_harmonic_label', 'Harmonic:')),

              [1, 2, 3, 4, 5, 6].map(function (h) {

                return React.createElement("button", { key: h, type: 'button', 'data-wave-harmonic': String(h), style: { minWidth: 44, minHeight: 44 }, 'aria-pressed': (d.harmonic || 1) === h, onClick: function () { upd('harmonic', h); }, className: "min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-sm font-black transition-all " + ((d.harmonic || 1) === h ? 'bg-cyan-700 text-white shadow-md scale-105' : 'transition-colors bg-cyan-50 text-cyan-800 border border-cyan-600 hover:bg-cyan-100 active:scale-[0.97]') }, h);

              }),

              React.createElement("span", { className: "text-xs text-slate-600 ml-2" }, waveMetrics.nodesCount + " nodes, " + waveMetrics.antinodesCount + " antinode" + (waveMetrics.antinodesCount > 1 ? 's' : ''))

            ),

            // Standing wave info

            waveMode === 'standing' && React.createElement("div", { className: "rounded-lg p-3 border border-cyan-200 mb-3 text-xs text-cyan-800", style: { background: 'var(--allo-stem-panel, #f8fafc)' } },

              React.createElement("p", { className: "font-bold mb-1" }, "\uD83C\uDFB8 " + __alloT('stem.wave.standing_wave_title', 'Standing Wave \u2014 Harmonic #') + (d.harmonic || 1) + ' (' + waveMetrics.standingBoundary + ')'),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_nodes_prefix', 'Nodes (\uD83D\uDD34 N): Points of zero displacement \u2014 ') + waveMetrics.nodesCount + __alloT('stem.wave.standing_nodes_suffix', ' total')),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_antinodes_prefix', 'Antinodes (\uD83D\uDFE2 A): Points of maximum displacement \u2014 ') + waveMetrics.antinodesCount + __alloT('stem.wave.standing_antinodes_suffix', ' total')),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_wavelength_label', 'Wavelength:') + ' ' + waveMetrics.standingWavelengthFormula + __alloT('stem.wave.standing_wavelength_note', ' (L = resonator length)')),

              React.createElement("p", null, "\u2022 " + __alloT('stem.wave.standing_frequency_label', 'Frequency:') + " f = " + waveMetrics.harmonicFreq.toFixed(1) + " Hz (eff. harmonic " + waveMetrics.effectiveHarmonic + ")")

            ),

            waveMode === 'standing' && (function () {
              var decompMid = waveComputeStandingDecomposition(0.5, 0, d.harmonic || 1, d.standingBoundary || 'bothFixed');
              return React.createElement("div", {
                'data-wave-traveling-decomp-bench': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_traveling_decomp_bench', 'Standing wave counter-propagating traveling-wave decomposition bench'),
                className: "mb-3 p-3 rounded-lg border border-fuchsia-300 bg-fuchsia-50 space-y-2"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("span", { className: "text-xs font-black text-fuchsia-950" }, '\u2194\uFE0F ' + __alloT('stem.wave.traveling_decomp_title', 'Counter-Propagating Traveling-Wave Decomposition (y = y\u208A + y\u208B)')),
                  React.createElement("span", {
                    'data-wave-traveling-decomp-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                  }, 'kL = ' + decompMid.kL.toFixed(2) + ' rad \u00B7 y\u208A(x\u2212vt) + y\u208B(x+vt) \u00B7 PE\u2194KE @ 2f = ' + (2 * waveMetrics.harmonicFreq).toFixed(1) + ' Hz')
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-2.5" },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-traveling-decomp-toggle': 'true',
                    'aria-pressed': !!d.showTravelingComponents,
                    'aria-label': __alloT('stem.wave.aria_traveling_decomp_toggle', 'Toggle counter-propagating forward and backward traveling wave components and PE/KE energy bar'),
                    style: { minHeight: 44 },
                    onClick: function () { upd('showTravelingComponents', !d.showTravelingComponents); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.showTravelingComponents ? 'bg-fuchsia-800 text-white shadow-sm' : 'bg-white text-fuchsia-950 border border-fuchsia-500 hover:bg-fuchsia-100')
                  }, d.showTravelingComponents ? '\u2713 ' + __alloT('stem.wave.traveling_decomp_on', 'Traveling Waves y\u208A/y\u208B On') : __alloT('stem.wave.traveling_decomp_off', 'Decompose into y\u208A + y\u208B & PE/KE')),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-800 flex-1 min-w-[220px]" }, __alloT('stem.wave.traveling_decomp_note', 'Shows cyan forward wave y\u208A(x\u2212vt) and rose reflected wave y\u208B(x+vt) summing into stationary nodes, plus live potential (PE) \u2194 kinetic (KE) energy sloshing.'))
                )
              );
            })(),

            waveMode === 'standing' && (d.standingBoundary || 'bothFixed') === 'bothFixed' && React.createElement("div", {
              'data-wave-string-bench': 'true',
              role: 'region',
              'aria-label': __alloT('stem.wave.aria_string_bench', 'Standing string mechanics and Mersenne laws bench'),
              className: "mb-3 p-3 rounded-lg border border-indigo-300 bg-indigo-50 space-y-2.5"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("span", { className: "text-xs font-black text-indigo-950" }, '\uD83C\uDFBB ' + __alloT('stem.wave.string_bench_title', "Mersenne's Laws String Bench: v = \u221A(T/\u03BC)")),
                React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-string-toggle': 'true',
                    'aria-pressed': !!d.stringMechanics,
                    'aria-label': __alloT('stem.wave.aria_string_toggle', 'Couple string wave speed v to tension T and linear density mu'),
                    style: { minHeight: 44 },
                    onClick: function () {
                      if (!d.stringMechanics) {
                        var nextSpd = waveComputeStringSpeed(d.stringTension, d.stringDensityGm);
                        updPatch({ stringMechanics: true, waveSpeed: nextSpd });
                      } else {
                        upd('stringMechanics', false);
                      }
                    },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.stringMechanics ? 'bg-indigo-700 text-white shadow-sm' : 'bg-white text-indigo-900 border border-indigo-400 hover:bg-indigo-100')
                  }, d.stringMechanics ? '\uD83D\uDD17 ' + __alloT('stem.wave.string_coupled_on', 'String Mechanics: ON') : __alloT('stem.wave.string_coupled_off', 'Couple T/\u03BC to Speed v')),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-standing-to-spectrum': 'true',
                    'aria-label': __alloT('stem.wave.aria_standing_to_spectrum', 'Pluck this tuned string and analyze its harmonic spectrum'),
                    style: { minHeight: 44 },
                    onClick: function () {
                      var pw = waveComputePluckWeights(d.pluckPosition);
                      var nextW = [pw[0], pw[1], pw[2], pw[3], pw[4], 0];
                      updPatch({ waveMode: 'spectrum', waveType: 'custom', harmonicWeights: nextW });
                      syncOsc({ type: 'custom', weights: nextW });
                    },
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-400 hover:bg-indigo-100 transition-colors"
                  }, '\uD83D\uDCCA ' + __alloT('stem.wave.btn_pluck_in_spectrum', 'Pluck String in Spectrum')),
                  React.createElement("span", {
                    'data-wave-mersenne-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                  }, 'v = ' + waveMetrics.stringDerivedSpeed.toFixed(1) + ' m/s · f\u2099 = ' + waveMetrics.harmonicFreq.toFixed(1) + ' Hz')
                )
              ),
              React.createElement("div", {
                role: 'group',
                'aria-label': __alloT('stem.wave.aria_string_presets', 'Musical string instrument presets'),
                className: "flex flex-wrap gap-1.5"
              },
                WAVE_STRING_PRESETS.map(function (sp) {
                  var spLabel = sp.labelKey ? __alloT(sp.labelKey, sp.label) : sp.label;
                  var spAct = !!d.stringMechanics && Math.abs(d.stringTension - sp.tensionN) < 1 && Math.abs(d.stringDensityGm - sp.densityGm) < 0.05;
                  return React.createElement("button", {
                    key: sp.id,
                    type: 'button',
                    'data-wave-string-preset': sp.id,
                    'aria-pressed': spAct,
                    'aria-label': __alloT('stem.wave.aria_apply_string_preset', 'Apply string preset: ') + spLabel,
                    style: { minHeight: 44 },
                    onClick: function () {
                      var nv = waveComputeStringSpeed(sp.tensionN, sp.densityGm);
                      updPatch({ stringMechanics: true, stringTension: sp.tensionN, stringDensityGm: sp.densityGm, waveSpeed: nv });
                      if (typeof addToast === 'function') addToast(sp.icon + ' ' + spLabel + ' (v=' + nv.toFixed(1) + ' m/s)', 'info');
                    },
                    className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (spAct ? 'bg-indigo-800 text-white shadow-sm' : 'bg-white text-indigo-900 border border-indigo-400 hover:bg-indigo-100')
                  }, sp.icon + ' ' + spLabel);
                })
              ),
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-indigo-200" },
                  React.createElement("label", { htmlFor: 'wave-string-tension-slider', className: "block text-xs font-bold text-slate-900" }, __alloT('stem.wave.string_tension_label', 'String Tension T: ') + Math.round(d.stringTension) + ' N'),
                  React.createElement("input", {
                    id: 'wave-string-tension-slider',
                    'data-wave-string-tension': 'true',
                    type: 'range',
                    min: 10, max: 400, step: 5,
                    value: d.stringTension,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_string_tension', 'String tension T in newtons'),
                    'aria-valuetext': Math.round(d.stringTension) + ' N — v = ' + waveMetrics.stringDerivedSpeed.toFixed(1) + ' m/s',
                    onChange: function (e) {
                      var nT = parseFloat(e.target.value);
                      var nV = waveComputeStringSpeed(nT, d.stringDensityGm);
                      updPatch({ stringMechanics: true, stringTension: nT, waveSpeed: nV });
                    },
                    className: "w-full accent-indigo-700"
                  })
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-indigo-200" },
                  React.createElement("label", { htmlFor: 'wave-string-density-slider', className: "block text-xs font-bold text-slate-900" }, __alloT('stem.wave.string_density_label', 'Linear Density \u03BC: ') + d.stringDensityGm.toFixed(2) + ' g/m'),
                  React.createElement("input", {
                    id: 'wave-string-density-slider',
                    'data-wave-string-density': 'true',
                    type: 'range',
                    min: 0.5, max: 20, step: 0.1,
                    value: d.stringDensityGm,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_string_density', 'String linear mass density mu in grams per meter'),
                    'aria-valuetext': d.stringDensityGm.toFixed(2) + ' g/m — v = ' + waveMetrics.stringDerivedSpeed.toFixed(1) + ' m/s',
                    onChange: function (e) {
                      var nMu = parseFloat(e.target.value);
                      var nV = waveComputeStringSpeed(d.stringTension, nMu);
                      updPatch({ stringMechanics: true, stringDensityGm: nMu, waveSpeed: nV });
                    },
                    className: "w-full accent-indigo-700"
                  })
                )
              )
            ),

            // Driven Standing-Wave Resonator & Q-Factor Bench (standing mode)
            waveMode === 'standing' && (function () {
              var snapMode = waveStandingGeometry(d.harmonic || 1, d.standingBoundary);
              var svgW = 360, svgH = 116, padL = 28, padR = 12, padT = 14, padB = 22;
              var plotW = svgW - padL - padR, plotH = svgH - padT - padB;
              var rMin = 0.25, rMax = 6.5;
              var toX = function (rv) { return padL + ((rv - rMin) / (rMax - rMin)) * plotW; };
              var toY = function (gn) { return padT + (1 - Math.max(0, Math.min(1, gn))) * plotH; };
              var rSamples = [];
              for (var si = 0; si <= 60; si++) rSamples.push(rMin + (si / 60) * (rMax - rMin));
              var modeMarks = [];
              for (var mi = 1; mi <= 6; mi++) {
                var rmVal = waveStandingGeometry(mi, d.standingBoundary).freqMultiplier;
                if (rmVal >= rMin && rmVal <= rMax) {
                  modeMarks.push({ mode: mi, ratio: rmVal });
                  rSamples.push(rmVal, Math.max(rMin, rmVal - 0.025), Math.min(rMax, rmVal + 0.025), Math.max(rMin, rmVal - 0.08), Math.min(rMax, rmVal + 0.08));
                }
              }
              rSamples.sort(function (a, b) { return a - b; });
              var polyPts = [];
              for (var ri = 0; ri < rSamples.length; ri++) {
                var rVal = rSamples[ri];
                var rRes = waveComputeResonatorResponse(rVal, d.resonatorQ, d.standingBoundary, d.frequency);
                polyPts.push(toX(rVal).toFixed(1) + ',' + toY(rRes.gainNorm).toFixed(1));
              }
              var areaPts = [toX(rMin).toFixed(1) + ',' + (padT + plotH).toFixed(1)].concat(polyPts, [toX(rMax).toFixed(1) + ',' + (padT + plotH).toFixed(1)]).join(' ');
              var curX = toX(d.driveFreqRatio);
              var curY = toY(waveMetrics.resonatorGainNorm);
              var halfPowerY = toY(0.707);
              var bgSvg = isContrast ? '#000000' : '#0f172a';
              var curColor = waveMetrics.resonatorIsPeak ? '#34d399' : '#fbbf24';
              return React.createElement("div", {
                'data-wave-resonator-bench': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_resonator_bench', 'Driven standing wave resonator and quality factor Q bench'),
                className: "mb-3 p-3 rounded-lg border border-sky-300 bg-sky-50 space-y-2.5"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("span", { className: "text-xs font-black text-sky-950" }, '\uD83D\uDD14 ' + __alloT('stem.wave.resonator_bench_title', 'Driven Resonator & Lorentzian Q-Factor Bench')),
                  React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                    React.createElement("button", {
                      type: 'button',
                      'data-wave-resonator-toggle': 'true',
                      'aria-pressed': !!d.resonatorDriven,
                      'aria-label': __alloT('stem.wave.aria_resonator_toggle', 'Toggle driven harmonic resonator response'),
                      style: { minHeight: 44 },
                      onClick: function () { upd('resonatorDriven', !d.resonatorDriven); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.resonatorDriven ? 'bg-sky-800 text-white shadow-sm' : 'bg-white text-sky-900 border border-sky-400 hover:bg-sky-100')
                    }, d.resonatorDriven ? '\uD83D\uDD17 ' + __alloT('stem.wave.resonator_on', 'Resonator Drive: ON') : __alloT('stem.wave.resonator_off', 'Enable Resonator Drive')),
                    React.createElement("button", {
                      type: 'button',
                      'data-wave-resonator-snap': 'true',
                      'aria-label': __alloT('stem.wave.aria_resonator_snap', 'Snap drive frequency ratio to selected standing wave harmonic peak'),
                      style: { minHeight: 44 },
                      onClick: function () {
                        updPatch({ resonatorDriven: true, driveFreqRatio: snapMode.freqMultiplier });
                      },
                      className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-sky-900 border border-sky-400 hover:bg-sky-100 transition-colors"
                    }, '\uD83C\uDFAF ' + __alloT('stem.wave.btn_snap_mode', 'Snap to Mode f') + ' (' + snapMode.freqMultiplier + 'f\u2081)'),
                    React.createElement("span", {
                      'data-wave-resonator-readout': 'true',
                      className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                      style: isContrast
                        ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                        : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                    }, (waveMetrics.resonatorIsPeak ? 'RESONANCE' : 'DETUNED') + ' \u00B7 Gain=' + waveMetrics.resonatorGainPct.toFixed(1) + '% \u00B7 \u03C6=-' + waveMetrics.resonatorPhaseDeg.toFixed(0) + '\u00B0 \u00B7 FWHM=' + waveMetrics.resonatorFwhmHz.toFixed(2) + ' Hz')
                  )
                ),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                  React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-sky-200" },
                    React.createElement("label", { htmlFor: 'wave-drive-ratio-slider', className: "block text-xs font-bold text-slate-900" }, __alloT('stem.wave.drive_ratio_label', 'Drive Freq Ratio (f_drv / f\u2081): ') + d.driveFreqRatio.toFixed(2) + '\u00D7 (' + waveMetrics.resonatorDriveHz.toFixed(2) + ' Hz)'),
                    React.createElement("input", {
                      id: 'wave-drive-ratio-slider',
                      'data-wave-drive-ratio-slider': 'true',
                      type: 'range',
                      min: 0.25, max: 6.5, step: 0.05,
                      value: d.driveFreqRatio,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_drive_ratio', 'Drive frequency ratio f_drv over f_1'),
                      'aria-valuetext': d.driveFreqRatio.toFixed(2) + __alloT('stem.wave.aria_times_f1_gain', ' times f1, gain ') + waveMetrics.resonatorGainPct.toFixed(1) + '%',
                      onChange: function (e) { updPatch({ resonatorDriven: true, driveFreqRatio: parseFloat(e.target.value) }); },
                      className: "w-full accent-sky-700"
                    })
                  ),
                  React.createElement("div", { className: "bg-white rounded-lg p-2.5 border border-sky-200" },
                    React.createElement("label", { htmlFor: 'wave-resonator-q-slider', className: "block text-xs font-bold text-slate-900" }, __alloT('stem.wave.resonator_q_label', 'Quality Factor Q: ') + d.resonatorQ + ' (FWHM ' + waveMetrics.resonatorFwhmHz.toFixed(2) + ' Hz)'),
                    React.createElement("input", {
                      id: 'wave-resonator-q-slider',
                      'data-wave-resonator-q-slider': 'true',
                      type: 'range',
                      min: 5, max: 80, step: 1,
                      value: d.resonatorQ,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_resonator_q', 'Resonator quality factor Q'),
                      'aria-valuetext': 'Q = ' + d.resonatorQ + __alloT('stem.wave.aria_fwhm_eq', ', FWHM = ') + waveMetrics.resonatorFwhmHz.toFixed(2) + ' ' + __alloT('stem.wave.unit_hz', 'Hz'),
                      onChange: function (e) { updPatch({ resonatorDriven: true, resonatorQ: parseInt(e.target.value, 10) }); },
                      className: "w-full accent-sky-700"
                    })
                  )
                ),
                React.createElement("svg", {
                  'data-wave-resonance-curve': 'true',
                  viewBox: '0 0 ' + svgW + ' ' + svgH,
                  role: 'img',
                  'aria-label': __alloT('stem.wave.aria_resonance_curve', 'Lorentzian resonator gain curve versus drive frequency ratio'),
                  className: "w-full max-w-[460px] h-auto rounded-lg border border-slate-700 block",
                  style: { backgroundColor: bgSvg }
                },
                  React.createElement("title", null, __alloT('stem.wave.svg_resonance_title', 'Lorentzian Resonance Gain Curve |H(r)| vs. Drive Ratio')),
                  React.createElement("rect", { x: 0, y: 0, width: svgW, height: svgH, rx: 6, fill: bgSvg }),
                  React.createElement("line", { x1: padL, y1: halfPowerY, x2: svgW - padR, y2: halfPowerY, stroke: '#475569', strokeDasharray: '4 3', strokeWidth: 1 }),
                  React.createElement("text", { x: padL + 3, y: halfPowerY - 3, fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }, '-3 dB (70.7%)'),
                  modeMarks.map(function (mm) {
                    var mx = toX(mm.ratio);
                    return React.createElement("g", { key: 'mode-' + mm.mode },
                      React.createElement("line", { x1: mx, y1: padT, x2: mx, y2: padT + plotH, stroke: 'rgba(148,163,184,0.3)', strokeDasharray: '2 3', strokeWidth: 1 }),
                      React.createElement("text", { x: mx, y: svgH - 6, textAnchor: 'middle', fill: '#94a3b8', fontSize: 8 }, 'm' + mm.mode)
                    );
                  }),
                  React.createElement("polygon", { points: areaPts, fill: 'rgba(56,189,248,0.18)' }),
                  React.createElement("polyline", { points: polyPts.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2 }),
                  React.createElement("line", { x1: curX, y1: padT, x2: curX, y2: padT + plotH, stroke: curColor, strokeWidth: 1.3, strokeDasharray: '3 2' }),
                  React.createElement("circle", { cx: curX, cy: curY, r: 4.5, fill: curColor, stroke: '#0f172a', strokeWidth: 1.5 }),
                  React.createElement("text", { x: Math.min(svgW - 76, Math.max(padL + 4, curX + 6)), y: Math.max(padT + 10, curY - 6), fill: curColor, fontSize: 8.5, fontWeight: 'bold' }, 'r=' + d.driveFreqRatio.toFixed(2) + ' (' + waveMetrics.resonatorGainPct.toFixed(0) + '%)'),
                  React.createElement("text", { x: 4, y: padT + 6, fill: '#cbd5e1', fontSize: 8 }, '100%'),
                  React.createElement("text", { x: 4, y: padT + plotH, fill: '#cbd5e1', fontSize: 8 }, '0%')
                )
              );
            })(),

            // Controls

            React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3" },

              [

                { k: 'amplitude', label: '\uD83D\uDCC8 ' + __alloT('stem.wave.ctrl_amplitude', 'Amplitude'), aria: __alloT('stem.wave.ctrl_amplitude', 'Amplitude'), min: 10, max: 100, step: 1 },

                { k: 'frequency', label: '\uD83C\uDFB5 ' + __alloT('stem.wave.ctrl_frequency', 'Frequency'), aria: __alloT('stem.wave.ctrl_frequency_aria', 'Frequency in hertz'), min: 0.5, max: 10, step: 0.5 },

                { k: 'speed', label: '\u23E9 ' + __alloT('stem.wave.animation_speed', 'Animation speed'), aria: __alloT('stem.wave.ctrl_speed_aria', 'Animation speed multiplier'), min: 0.1, max: 5, step: 0.1, help: __alloT('stem.wave.animation_speed_help', 'Changes playback pace; frequency and wavelength stay the same.') },

                { k: 'waveSpeed', label: '\uD83C\uDF0D ' + __alloT('stem.wave.wave_speed', 'Wave speed in medium'), aria: __alloT('stem.wave.wave_speed_aria', 'Wave speed in medium, in meters per second'), min: 50, max: 1500, step: 10, help: __alloT('stem.wave.wave_speed_help', 'Changes how fast the wave travels. At the same frequency, a faster wave has a longer wavelength.') },

              ].map(s =>

                React.createElement("div", { key: s.k, "data-wave-control": s.k, className: "bg-white rounded-lg p-3 border border-slate-200 shadow-sm", style: { minWidth: 0, overflowWrap: "anywhere" } },

                  React.createElement("label", { htmlFor: "wave-control-" + s.k, className: "text-[0.6875rem] font-black text-slate-600 block uppercase tracking-wide" }, s.label),

                  React.createElement("span", { className: "mt-1 text-lg font-black text-slate-900 block" }, (d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : d[s.k])) + (s.k === 'speed' ? ' ×' : s.k === 'waveSpeed' ? ' m/s' : s.k === 'frequency' ? ' Hz' : '')),

                  s.help && React.createElement('p', { id: 'wave-control-help-' + s.k, className: 'mt-1 text-xs text-slate-600' }, s.help),

                  React.createElement("input", { id: "wave-control-" + s.k, "aria-describedby": s.help ? "wave-control-help-" + s.k : undefined, style: { minHeight: 44 }, type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : 0), 'aria-label': s.aria || s.label,
                  'aria-valuetext': (function () {
                    var val = d[s.k] || (s.k === 'speed' ? 1 : s.k === 'waveSpeed' ? 343 : 0);
                    if (s.k === 'frequency') return val + __alloT('stem.wave.vt_freq_a', ' hertz — wavelength ') + ((d.waveSpeed || 343) / val).toFixed(1) + __alloT('stem.wave.vt_freq_b', ' meters, period ') + (1 / val).toFixed(2) + __alloT('stem.wave.vt_freq_c', ' seconds');
                    if (s.k === 'amplitude') return val + __alloT('stem.wave.vt_amplitude', ' — wave height; energy grows as amplitude squared');
                    if (s.k === 'speed') return val + __alloT('stem.wave.vt_speed', ' times animation speed');
                    return val + __alloT('stem.wave.vt_medium', ' meters per second through the medium');
                  })(), onChange: function (e) {
                    var v = parseFloat(e.target.value);
                    if (s.k === 'waveSpeed') updPatch({ waveSpeed: v, stringMechanics: false, airTempCoupled: false });
                    else if (s.k === 'frequency' && d.intervalLock !== 'none' && WAVE_INTERVAL_PRESETS[d.intervalLock]) {
                      var lockedF2 = waveClampNum(Math.round(v * WAVE_INTERVAL_PRESETS[d.intervalLock].ratio * 100) / 100, 0.5, 10, d.frequency2);
                      updPatch({ frequency: v, frequency2: lockedF2 });
                      syncOsc({ freq: v, freq2: lockedF2 });
                    } else {
                      upd(s.k, v);
                      if (s.k === 'frequency') syncOsc({ freq: v });
                    }
                    if (s.k === 'amplitude' || s.k === 'frequency') { checkWaveMatch(s.k === 'amplitude' ? v : d.amplitude, s.k === 'frequency' ? v : d.frequency); }
                    // Canvas Narration: parameter change
                    if (typeof canvasNarrate === 'function') {
                      var wl = (s.k === 'frequency' || s.k === 'waveSpeed') ? (d.waveSpeed || 343) / (s.k === 'frequency' ? v : d.frequency || 1) : null;
                      var msg = s.label + ': ' + v + (wl ? __alloT('stem.wave.narrate_wavelength_suffix', '. Wavelength: ') + wl.toFixed(1) + ' m' : '');
                      canvasNarrate('wave', 'param_' + s.k, msg, { debounce: 800 });
                    }
                  }, className: "mt-2 w-full accent-cyan-600" })

                )

              )

            ),

            // Second wave (free & spectrum mode)

            (waveMode === 'free' || waveMode === 'spectrum') && React.createElement("div", { "data-wave-second-controls": true, className: "flex flex-wrap items-center gap-3 mb-3 p-3 bg-pink-50 rounded-lg border border-pink-200" },

              React.createElement("label", { style: { minHeight: 44, flexBasis: "100%" }, className: "text-xs font-bold text-pink-800 flex items-center gap-1.5 cursor-pointer" },

                React.createElement("input", { type: "checkbox", checked: !!d.showSecond, 'aria-label': __alloT('stem.wave.aria_show_second', 'Show second wave'), onChange: e => upd('showSecond', e.target.checked), className: "accent-pink-600" }),

                "\u223F " + __alloT('stem.wave.show_second_wave', 'Show Second Wave (Interference)')

              ),

              d.showSecond && React.createElement(React.Fragment, null,

                React.createElement("div", { style: { flex: "1 1 180px", minWidth: 0 }, className: "space-y-1" },

                  React.createElement("label", { htmlFor: "wave-second-amplitude", className: "block text-xs text-pink-800 font-bold" }, __alloT('stem.wave.aria_second_amplitude', 'Second wave amplitude')),

                  React.createElement("input", { id: "wave-second-amplitude", style: { minHeight: 44 }, type: "range", min: 10, max: 80, step: 1, value: d.amplitude2 || 30, 'aria-label': __alloT('stem.wave.aria_second_amplitude', 'Second wave amplitude'), onChange: e => upd('amplitude2', parseFloat(e.target.value)), className: "w-full accent-pink-500" }),

                  React.createElement("span", { className: "text-[0.6875rem] text-pink-800 font-bold" }, d.amplitude2 || 30)

                ),

                React.createElement("div", { style: { flex: "1 1 180px", minWidth: 0 }, className: "space-y-1" },

                  React.createElement("label", { htmlFor: "wave-second-frequency", className: "block text-xs text-pink-800 font-bold" }, __alloT('stem.wave.aria_second_frequency', 'Second wave frequency')),

                  React.createElement("input", { id: "wave-second-frequency", style: { minHeight: 44 }, type: "range", min: 0.5, max: 10, step: 0.05, value: d.frequency2 || 3, 'aria-label': __alloT('stem.wave.aria_second_frequency', 'Second wave frequency'), onChange: e => { var v2 = parseFloat(e.target.value); updPatch({ frequency2: v2, intervalLock: 'none' }); syncOsc({ freq2: v2 }); }, className: "w-full accent-pink-500" }),

                  React.createElement("span", { className: "text-[0.6875rem] text-pink-800 font-bold" }, (d.frequency2 || 3) + " Hz")

                ),

                React.createElement("div", { style: { flex: "1 1 180px", minWidth: 0 }, className: "space-y-1" },

                  React.createElement("label", { htmlFor: "wave-second-phase", className: "block text-xs text-pink-800 font-bold" }, __alloT('stem.wave.aria_second_phase', 'Second wave phase')),

                  React.createElement("input", { id: "wave-second-phase", "aria-describedby": "wave-second-phase-help", "aria-valuetext": ((d.phase2 || 0) / Math.PI).toFixed(1) + __alloT('stem.wave.aria_pi_radians', ' pi radians'), style: { minHeight: 44 }, type: "range", min: 0, max: 6.28, step: 0.1, value: d.phase2 || 0, 'aria-label': __alloT('stem.wave.aria_second_phase', 'Second wave phase'), onChange: e => upd('phase2', parseFloat(e.target.value)), className: "w-full accent-pink-500" }),

                  React.createElement("span", { className: "text-[0.6875rem] text-pink-800 font-bold" }, ((d.phase2 || 0) / Math.PI).toFixed(1) + "\u03C0 rad"),

                  React.createElement("p", { id: "wave-second-phase-help", className: "text-xs text-pink-800" }, __alloT("stem.wave.phase_offset_help", "Shifts the second wave within its cycle. 0 means no phase shift; π is half a cycle."))

                ),

                React.createElement("div", {
                  role: 'group',
                  'data-wave-consonance-bench': 'true',
                  'aria-label': __alloT('stem.wave.aria_consonance_bench', 'Just-intonation interval lock and beat envelope bench'),
                  className: "flex flex-wrap items-center gap-2 pt-2 border-t border-pink-200 w-full"
                },
                  React.createElement("span", { className: "text-xs font-bold text-pink-900" }, __alloT('stem.wave.interval_lock_label', 'Interval Lock f\u2082/f\u2081:')),
                  [
                    { id: 'none', key: 'free', label: __alloT('stem.wave.interval_free', 'Free'), aria: __alloT('stem.wave.aria_interval_free', 'Unlock second wave frequency ratio') },
                    { id: '1:1', key: '1_1', label: '1:1', aria: __alloT('stem.wave.aria_interval_1_1', 'Lock second wave to 1 to 1 unison ratio') },
                    { id: '5:4', key: '5_4', label: '5:4', aria: __alloT('stem.wave.aria_interval_5_4', 'Lock second wave to 5 to 4 major third ratio') },
                    { id: '4:3', key: '4_3', label: '4:3', aria: __alloT('stem.wave.aria_interval_4_3', 'Lock second wave to 4 to 3 perfect fourth ratio') },
                    { id: '3:2', key: '3_2', label: '3:2', aria: __alloT('stem.wave.aria_interval_3_2', 'Lock second wave to 3 to 2 perfect fifth ratio') },
                    { id: '2:1', key: '2_1', label: '2:1', aria: __alloT('stem.wave.aria_interval_2_1', 'Lock second wave to 2 to 1 octave ratio') }
                  ].map(function (iv) {
                    var ivAct = (d.intervalLock || 'none') === iv.id;
                    return React.createElement("button", {
                      key: iv.id,
                      type: 'button',
                      'data-wave-interval-btn': iv.id,
                      'aria-pressed': ivAct,
                      'aria-label': iv.aria,
                      style: { minHeight: 44, minWidth: 44 },
                      onClick: function () {
                        if (iv.id === 'none') {
                          upd('intervalLock', 'none');
                        } else {
                          var fLocked = waveClampNum(Math.round(d.frequency * WAVE_INTERVAL_PRESETS[iv.id].ratio * 100) / 100, 0.5, 10, d.frequency2);
                          updPatch({ showSecond: true, intervalLock: iv.id, frequency2: fLocked });
                          syncOsc({ freq2: fLocked });
                        }
                      },
                      className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (ivAct ? 'bg-pink-800 text-white shadow-sm' : 'bg-white text-pink-900 border border-pink-400 hover:bg-pink-100')
                    }, iv.label);
                  }),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-beat-envelope-toggle': 'true',
                    'aria-pressed': !!d.showBeatEnvelope,
                    'aria-label': __alloT('stem.wave.aria_beat_envelope_toggle', 'Toggle analytical beat modulation envelope overlay'),
                    style: { minHeight: 44 },
                    onClick: function () { upd('showBeatEnvelope', !d.showBeatEnvelope); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.showBeatEnvelope ? 'bg-amber-800 text-white shadow-sm' : 'bg-white text-pink-900 border border-pink-400 hover:bg-pink-100')
                  }, '\u3030 ' + __alloT('stem.wave.btn_beat_envelope', 'Beat Envelope A(x,t)')),
                  React.createElement("span", {
                    'data-wave-consonance-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border ml-auto",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : isDark
                        ? { backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' }
                        : { backgroundColor: '#ffffff', color: '#831843', borderColor: '#f472b6' }
                  }, 'f_beat=' + waveMetrics.beatFreq.toFixed(2) + ' Hz \u00B7 Mod=' + waveMetrics.beatModDepthPct.toFixed(0) + '% \u00B7 ' + (waveMetrics.matchedInterval ? ('Just ' + waveMetrics.matchedInterval) : ('f\u2082/f\u2081=' + waveMetrics.intervalRatio.toFixed(2))) + ' (' + waveMetrics.consonanceClass + ')')
                )

              ),

              React.createElement("button", {
                type: 'button',
                style: { minHeight: 44 },
                onClick: function () {
                  updPatch({ showSecond: true, intervalLock: 'none', showBeatEnvelope: true, frequency: 4, frequency2: 4.5, amplitude: 45, amplitude2: 45, phase2: 0 });
                  syncOsc({ freq: 4, freq2: 4.5 });
                  if (typeof addToast === 'function') addToast('\uD83C\uDFB5 ' + __alloT('stem.wave.toast_beats', 'Beats: 4 Hz + 4.5 Hz \u2014 watch (and hear) the slow 0.5 Hz pulse'), 'info');
                },
                'aria-label': __alloT('stem.wave.aria_beats_preset', 'Beats preset \u2014 two waves at 4 and 4.5 hertz so the beat envelope is visible'),
                className: "transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-pink-700 text-white hover:bg-pink-800 active:scale-[0.97]"
              }, '\uD83C\uDFB5 ' + __alloT('stem.wave.btn_beats', 'Beats')),

              d.showSecond && interferenceLabel && React.createElement("span", {
                role: "status",
                className: "text-[0.6875rem] font-bold text-purple-800 bg-purple-100 border border-purple-300 rounded-full px-2.5 py-1"
              }, '\u2011\u2011\u2011 ' + interferenceLabel)

            ),

            // Wave Packet & Group Dispersion Controls (free mode only)
            waveMode === 'free' && React.createElement("div", {
              'data-wave-packet-controls': 'true',
              className: "flex flex-col gap-2.5 mb-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("div", {
                  role: 'group',
                  'aria-label': __alloT('stem.wave.aria_packet_mode_group', 'Free wave mode: continuous wave or dispersive wave packet'),
                  className: "flex flex-wrap gap-1.5"
                },
                  [
                    { id: 'continuous', label: __alloT('stem.wave.packet_continuous', 'Continuous Wave'), aria: __alloT('stem.wave.aria_packet_continuous', 'Switch to continuous periodic wave') },
                    { id: 'packet', label: '\uD83D\uDCE6 ' + __alloT('stem.wave.packet_burst', 'Wave Packet (Group vs. Phase)'), aria: __alloT('stem.wave.aria_packet_burst', 'Switch to localized Gaussian wave packet with group velocity envelope') },
                    { id: 'collide', label: '\uD83D\uDCA5 ' + __alloT('stem.wave.packet_collide', 'Colliding Pulses'), aria: __alloT('stem.wave.aria_packet_collide', 'Launch two counter-propagating Gaussian wave pulses to inspect superposition') }
                  ].map(function(pm) {
                    var pmAct = (d.packetMode || 'continuous') === pm.id;
                    return React.createElement("button", {
                      key: pm.id,
                      type: 'button',
                      'data-wave-packet-mode': pm.id,
                      'aria-pressed': pmAct,
                      'aria-label': pm.aria,
                      style: { minHeight: 44 },
                      onClick: function() { upd('packetMode', pm.id); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (pmAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-800 border border-cyan-400 hover:bg-cyan-100')
                    }, pm.label);
                  })
                ),
                React.createElement("span", {
                  'data-wave-dispersion-readout': 'true',
                  className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                }, 'v_p = ' + waveMetrics.phaseVelocity.toFixed(0) + ' m/s · v_g = ' + waveMetrics.groupVelocity.toFixed(0) + ' m/s (' + waveMetrics.dispersionRatio.toFixed(2) + '\u00D7)')
              ),
              (d.packetMode || 'continuous') === 'collide' && React.createElement("div", {
                'data-wave-collide-controls': 'true',
                className: "flex flex-wrap items-center gap-2 pt-2 border-t border-cyan-200"
              },
                React.createElement("span", { className: "text-xs font-bold text-cyan-900" }, __alloT('stem.wave.collide_polarity_label', 'Pulse Polarity:')),
                React.createElement("div", {
                  role: 'group',
                  'aria-label': __alloT('stem.wave.aria_collide_polarity_group', 'Counter-propagating pulse polarity'),
                  className: "flex flex-wrap gap-1.5"
                },
                  [
                    { id: 'opposite', label: __alloT('stem.wave.collide_opposite', 'Opposite (Cancel)'), aria: __alloT('stem.wave.aria_collide_opposite', 'Opposite polarity pulses for temporary nodal cancellation at overlap') },
                    { id: 'same', label: __alloT('stem.wave.collide_same', 'Same (2A Crest)'), aria: __alloT('stem.wave.aria_collide_same', 'Same polarity pulses for constructive double-amplitude crest at overlap') }
                  ].map(function (cp) {
                    var cpAct = (d.collidePolarity || 'opposite') === cp.id;
                    return React.createElement("button", {
                      key: cp.id,
                      type: 'button',
                      'data-wave-collide-polarity': cp.id,
                      'aria-pressed': cpAct,
                      'aria-label': cp.aria,
                      style: { minHeight: 44 },
                      onClick: function () { upd('collidePolarity', cp.id); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (cpAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-900 border border-cyan-400 hover:bg-cyan-100')
                    }, cp.label);
                  })
                ),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-collide-snap': 'true',
                  'aria-label': __alloT('stem.wave.aria_collide_snap', 'Pause and snap counter-propagating pulses right at center overlap'),
                  style: { minHeight: 44 },
                  onClick: function () {
                    updPatch({ packetMode: 'collide', paused: true });
                    var c = canvasRef._lastCanvas;
                    if (c && typeof c._waveSnapCollision === 'function') c._waveSnapCollision();
                  },
                  className: "ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                }, '\u23F8 ' + __alloT('stem.wave.btn_collide_snap', 'Pause at Overlap'))
              ),
              (d.packetMode || 'continuous') === 'packet' && React.createElement("div", { className: "flex flex-col gap-2.5 pt-2 border-t border-cyan-200" },
                React.createElement("div", { className: "flex flex-wrap items-center gap-3" },
                  React.createElement("label", { className: "text-xs font-bold text-cyan-900 flex items-center gap-2" },
                    __alloT('stem.wave.dispersion_ratio_label', 'Group/Phase Ratio (v_g / v_p):'),
                    React.createElement("input", {
                      'data-wave-dispersion-slider': 'true',
                      type: 'range',
                      min: 0.5, max: 1.5, step: 0.05,
                      value: d.dispersionRatio,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_dispersion_ratio', 'Group to phase velocity dispersion ratio'),
                      'aria-valuetext': d.dispersionRatio.toFixed(2) + __alloT('stem.wave.aria_times_vp', ' times phase speed'),
                      onChange: function(e) { updPatch({ oceanDepthCoupled: false, dispersionRatio: parseFloat(e.target.value) }); },
                      className: "w-28 accent-cyan-700"
                    }),
                    React.createElement("span", { className: "font-mono font-black w-12 text-right" }, d.dispersionRatio.toFixed(2) + '\u00D7')
                  ),
                  React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                    [
                      { label: __alloT('stem.wave.disp_normal', '0.5\u00D7 Normal (Deep Water)'), val: 0.5 },
                      { label: __alloT('stem.wave.disp_none', '1.0\u00D7 Non-Dispersive'), val: 1.0 },
                      { label: __alloT('stem.wave.disp_anom', '1.5\u00D7 Anomalous (Capillary)'), val: 1.5 }
                    ].map(function(dp) {
                      var dpAct = !d.oceanDepthCoupled && Math.abs(d.dispersionRatio - dp.val) < 0.03;
                      return React.createElement("button", {
                        key: dp.val,
                        type: 'button',
                        'data-wave-disp-preset': String(dp.val),
                        'aria-pressed': dpAct,
                        'aria-label': __alloT('stem.wave.aria_disp_preset', 'Set dispersion ratio to ') + dp.label,
                        style: { minHeight: 44 },
                        onClick: function() { updPatch({ oceanDepthCoupled: false, dispersionRatio: dp.val }); },
                        className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (dpAct ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-800 border border-cyan-400 hover:bg-cyan-100')
                      }, dp.label);
                    })
                  )
                ),
                React.createElement("div", {
                  'data-wave-ocean-bench': 'true',
                  role: 'region',
                  'aria-label': __alloT('stem.wave.aria_ocean_bench', 'Airy ocean water depth dispersion calculator'),
                  className: "flex flex-wrap items-center gap-2.5 p-2.5 rounded-lg bg-teal-50 border border-teal-300"
                },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-ocean-depth-toggle': 'true',
                    'aria-pressed': !!d.oceanDepthCoupled,
                    'aria-label': __alloT('stem.wave.aria_ocean_depth_toggle', 'Couple wave packet dispersion to Airy water depth ratio h over wavelength'),
                    style: { minHeight: 44 },
                    onClick: function () {
                      if (!d.oceanDepthCoupled) {
                        var od = waveComputeOceanDispersion(d.waterDepthRatio);
                        updPatch({ oceanDepthCoupled: true, waterDepthRatio: od.depthRatio, dispersionRatio: od.vgOverVp });
                      } else {
                        upd('oceanDepthCoupled', false);
                      }
                    },
                    className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (d.oceanDepthCoupled ? 'bg-teal-800 text-white shadow-sm' : 'bg-white text-teal-900 border border-teal-400 hover:bg-teal-100')
                  }, d.oceanDepthCoupled ? '\uD83C\uDF0A ' + __alloT('stem.wave.ocean_depth_on', 'Water Depth Lock: ON') : __alloT('stem.wave.ocean_depth_off', 'Lock to Water Depth (h/\u03BB)')),
                  React.createElement("label", { className: "text-xs font-bold text-teal-950 flex items-center gap-2" },
                    __alloT('stem.wave.ocean_depth_label', 'Depth h/\u03BB:'),
                    React.createElement("input", {
                      'data-wave-ocean-depth-slider': 'true',
                      type: 'range',
                      min: 0.02, max: 1.0, step: 0.02,
                      value: d.waterDepthRatio,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_ocean_depth_slider', 'Normalized water depth h divided by wavelength'),
                      'aria-valuetext': __alloT('stem.wave.aria_h_over_lambda_eq', 'h/lambda = ') + d.waterDepthRatio.toFixed(2) + ', ' + waveMetrics.oceanRegime + ' ' + __alloT('stem.wave.aria_regime_vgvp_eq', 'regime, vg/vp = ') + waveMetrics.oceanVgOverVp.toFixed(2),
                      onChange: function (e) {
                        var nextOd = waveComputeOceanDispersion(parseFloat(e.target.value));
                        updPatch({ oceanDepthCoupled: true, waterDepthRatio: nextOd.depthRatio, dispersionRatio: nextOd.vgOverVp });
                      },
                      className: "w-24 accent-teal-700"
                    }),
                    React.createElement("span", { className: "font-mono font-black w-10 text-right" }, d.waterDepthRatio.toFixed(2))
                  ),
                  [
                    { id: 'shallow', label: __alloT('stem.wave.ocean_shallow', 'Shallow Tsunami (0.03)'), val: 0.03 },
                    { id: 'intermediate', label: __alloT('stem.wave.ocean_shelf', 'Coastal Shelf (0.18)'), val: 0.18 },
                    { id: 'deep', label: __alloT('stem.wave.ocean_deep', 'Deep Swell (0.80)'), val: 0.80 }
                  ].map(function (op) {
                    var opAct = !!d.oceanDepthCoupled && Math.abs(d.waterDepthRatio - op.val) < 0.025;
                    return React.createElement("button", {
                      key: op.id,
                      type: 'button',
                      'data-wave-ocean-preset': op.id,
                      'aria-pressed': opAct,
                      'aria-label': __alloT('stem.wave.aria_ocean_preset', 'Apply ocean depth preset: ') + op.label,
                      style: { minHeight: 44 },
                      onClick: function () {
                        var odP = waveComputeOceanDispersion(op.val);
                        updPatch({ packetMode: 'packet', oceanDepthCoupled: true, waterDepthRatio: odP.depthRatio, dispersionRatio: odP.vgOverVp });
                      },
                      className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (opAct ? 'bg-teal-800 text-white' : 'bg-white text-teal-900 border border-teal-400 hover:bg-teal-100')
                    }, op.label);
                  }),
                  React.createElement("span", {
                    'data-wave-ocean-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border ml-auto",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                  }, String(waveMetrics.oceanRegime || 'deep').toUpperCase() + ' \u00B7 h/\u03BB=' + d.waterDepthRatio.toFixed(2) + ' \u00B7 vg/vp=' + waveMetrics.oceanVgOverVp.toFixed(2) + '\u00D7')
                )
              )
            ),

            // Damping toggle (free mode only)

            waveMode === 'free' && React.createElement("div", { className: "flex flex-wrap items-center gap-2.5 mb-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200" },

              React.createElement("label", { style: { minHeight: 44 }, className: "text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer" },

                React.createElement("input", { type: "checkbox", checked: !!d.damping, 'aria-label': __alloT('stem.wave.aria_enable_damping', 'Enable damping'), onChange: e => upd('damping', e.target.checked), className: "accent-amber-600" }),

                "\uD83C\uDF0A " + __alloT('stem.wave.damping_label', 'Damping (Exponential Decay)')

              ),

              d.damping && React.createElement("div", { className: "flex flex-wrap items-center gap-2 flex-1" },

                React.createElement("span", { className: "text-[0.6875rem] text-amber-900 font-bold" }, "\u03B1:"),

                React.createElement("input", { style: { minHeight: 44 }, type: "range", min: 0.1, max: 2.0, step: 0.1, value: d.dampingAlpha || 0.5, 'aria-label': __alloT('stem.wave.aria_damping_coeff', 'Damping coefficient'), onChange: e => upd('dampingAlpha', parseFloat(e.target.value)), className: "w-24 accent-amber-600" }),

                React.createElement("span", { className: "text-[0.6875rem] text-amber-900 font-bold font-mono" }, (d.dampingAlpha || 0.5).toFixed(1)),

                [
                  { id: 'light', label: __alloT('stem.wave.damp_light', 'Light (0.2)'), val: 0.2 },
                  { id: 'moderate', label: __alloT('stem.wave.damp_mod', 'Moderate (0.6)'), val: 0.6 },
                  { id: 'heavy', label: __alloT('stem.wave.damp_heavy', 'Heavy (1.5)'), val: 1.5 }
                ].map(function (da) {
                  var daAct = Math.abs((d.dampingAlpha || 0.5) - da.val) < 0.05;
                  return React.createElement("button", {
                    key: da.id,
                    type: 'button',
                    'data-wave-damping-preset': da.id,
                    'aria-pressed': daAct,
                    'aria-label': __alloT('stem.wave.aria_damping_preset', 'Set damping coefficient alpha to ') + da.label,
                    style: { minHeight: 44 },
                    onClick: function () { updPatch({ damping: true, dampingAlpha: da.val }); },
                    className: "px-2 py-1.5 rounded-lg text-xs font-bold transition-colors " + (daAct ? 'bg-amber-800 text-white' : 'bg-white text-amber-900 border border-amber-400 hover:bg-amber-100')
                  }, da.label);
                }),

                React.createElement("span", {
                  'data-wave-damping-readout': 'true',
                  className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border ml-auto",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                }, '-' + waveMetrics.dampingLossDb.toFixed(1) + ' dB \u00B7 x\u2081/\u2082=' + waveMetrics.dampingHalfEnergyMeters.toFixed(1) + ' m \u00B7 1/e=' + Math.round(waveMetrics.dampingDecayFrac * 100) + '%')

              )

            ),

            // Ripple Tank custom controls

            waveMode === 'ripple' && React.createElement("div", { className: "flex flex-col gap-2.5 mb-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-200" },
              React.createElement("div", { className: "flex items-center flex-wrap gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.wave.ripple_barrier_label', 'Barrier:')),
                React.createElement("div", {
                  role: 'group',
                  'data-wave-ripple-barrier-group': 'true',
                  'aria-label': __alloT('stem.wave.aria_ripple_barrier_group', 'Ripple tank barrier and aperture mode'),
                  className: "flex flex-wrap gap-1.5"
                },
                  [
                    { id: 'none', label: '\uD83D\uDCA7 ' + __alloT('stem.wave.rb_none', 'Two Sources'), aria: __alloT('stem.wave.aria_rb_none', 'Two free coherent point sources with no barrier') },
                    { id: 'singleSlit', label: '\u2551 ' + __alloT('stem.wave.rb_single_slit', 'Single Slit'), aria: __alloT('stem.wave.aria_rb_single_slit', 'Single slit aperture diffraction barrier') },
                    { id: 'doubleSlit', label: '\u2AFC ' + __alloT('stem.wave.rb_double_slit', 'Double Slit'), aria: __alloT('stem.wave.aria_rb_double_slit', 'Double slit Young interference barrier') },
                    { id: 'grating', label: '\u2502\u2502\u2502 ' + __alloT('stem.wave.rb_grating', 'Diffraction Grating'), aria: __alloT('stem.wave.aria_rb_grating', 'Multi-slit diffraction grating with sharp principal maxima') },
                    { id: 'obstacle', label: '\u2B1B ' + __alloT('stem.wave.rb_obstacle', 'Obstacle'), aria: __alloT('stem.wave.aria_rb_obstacle', 'Opaque obstacle showing edge diffraction shadow') }
                  ].map(function (rb) {
                    var rbAct = (d.rippleBarrier || 'none') === rb.id;
                    return React.createElement("button", {
                      key: rb.id,
                      type: 'button',
                      'data-wave-ripple-barrier': rb.id,
                      'aria-pressed': rbAct,
                      'aria-label': rb.aria,
                      style: { minHeight: 44 },
                      onClick: function () { upd('rippleBarrier', rb.id); },
                      className: "px-3 py-2 rounded-md text-xs font-bold transition-colors " + (rbAct ? 'bg-indigo-700 text-white shadow-sm' : 'bg-white text-indigo-800 border border-indigo-400 hover:bg-indigo-100')
                    }, rb.label);
                  })
                ),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-intensity-toggle': 'true',
                  'aria-pressed': !!d.showIntensityScreen,
                  'aria-label': __alloT('stem.wave.aria_intensity_screen', 'Toggle right-edge detector screen showing I(y) interference intensity'),
                  style: { minHeight: 44 },
                  onClick: function () { upd('showIntensityScreen', !d.showIntensityScreen); },
                  className: "ml-auto px-3 py-2 rounded-md text-xs font-bold transition-colors " + (d.showIntensityScreen ? 'bg-amber-800 text-white shadow-sm' : 'bg-white text-indigo-800 border border-indigo-400 hover:bg-indigo-100')
                }, '\uD83D\uDCCA ' + __alloT('stem.wave.btn_intensity_screen', 'I(y) Screen')),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-nodal-overlay-toggle': 'true',
                  'aria-pressed': !!d.showNodalLines,
                  'aria-label': __alloT('stem.wave.aria_nodal_toggle', 'Toggle analytical destructive nodal hyperbola overlay and Young fringe geometry'),
                  style: { minHeight: 44 },
                  onClick: function () { upd('showNodalLines', !d.showNodalLines); },
                  className: "px-3 py-2 rounded-md text-xs font-bold transition-colors " + (d.showNodalLines ? 'bg-amber-800 text-white shadow-sm' : 'bg-white text-indigo-800 border border-indigo-400 hover:bg-indigo-100')
                }, '\uD83D\uDD00 ' + __alloT('stem.wave.btn_nodal_lines', 'Nodal Hyperbolas'))
              ),

              d.rippleBarrier === 'grating' && React.createElement("div", {
                'data-wave-grating-controls': 'true',
                className: "flex items-center flex-wrap gap-2 pt-1.5 pb-1.5 border-y border-indigo-200"
              },
                React.createElement("span", { className: "text-xs font-bold text-indigo-900" }, __alloT('stem.wave.grating_slits_label', 'Grating Slits (N):')),
                React.createElement("div", {
                  role: 'group',
                  'aria-label': __alloT('stem.wave.aria_grating_slits_group', 'Number of diffraction grating slits N'),
                  className: "flex flex-wrap gap-1"
                },
                  [3, 4, 5, 6].map(function (nSlits) {
                    var nAct = (d.gratingSlits || 4) === nSlits;
                    return React.createElement("button", {
                      key: nSlits,
                      type: 'button',
                      'data-wave-grating-slits': String(nSlits),
                      'aria-pressed': nAct,
                      'aria-label': __alloT('stem.wave.aria_grating_slit_count', 'Set diffraction grating slit count to ') + nSlits,
                      style: { minWidth: 44, minHeight: 44 },
                      onClick: function () { upd('gratingSlits', nSlits); },
                      className: "px-2.5 py-2 rounded-md text-xs font-black transition-colors " + (nAct ? 'bg-indigo-800 text-white shadow-sm' : 'bg-white text-indigo-900 border border-indigo-400 hover:bg-indigo-100')
                    }, nSlits + ' Slits');
                  })
                ),
                React.createElement("span", {
                  'data-wave-grating-badge': 'true',
                  className: "px-2.5 py-1 rounded-full bg-white border border-indigo-300 text-xs font-bold text-indigo-900 ml-auto"
                }, (d.gratingSlits || 4) + ' slits · R\u2081 = N = ' + waveMetrics.gratingResolvingPower + ' · \u03B8\u2081 = ' + waveMetrics.gratingFirstOrderDeg.toFixed(1) + '\u00B0')
              ),

              React.createElement("div", { className: "flex items-center flex-wrap gap-4" },

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.wave.ripple_source_separation', 'Source Separation:')),

                React.createElement("input", { style: { minHeight: 44 }, type: "range", min: 20, max: 200, step: 5, value: d.rippleSeparation || 80, 'aria-label': __alloT('stem.wave.aria_slit_separation', 'Slit separation'), onChange: function(e) { var c = canvasRef._lastCanvas; if (c && c._drag) { c._drag.ripple1 = null; c._drag.ripple2 = null; } updPatch({ rippleSeparation: parseFloat(e.target.value), rippleSrc1: null, rippleSrc2: null }); }, className: "w-24 accent-indigo-600" }),

                React.createElement("span", { className: "text-xs text-indigo-800 font-bold w-8" }, d.rippleSeparation || 80)

              ),

              (d.rippleBarrier && d.rippleBarrier !== 'none') && React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.wave.ripple_slit_width', 'Slit/Obstacle Width:')),
                React.createElement("input", {
                  'data-wave-slit-width-slider': 'true',
                  style: { minHeight: 44 },
                  type: 'range',
                  min: 0.03,
                  max: 0.25,
                  step: 0.01,
                  value: (typeof d.slitWidth === 'number' && isFinite(d.slitWidth)) ? d.slitWidth : 0.08,
                  'aria-label': __alloT('stem.wave.aria_slit_width', 'Barrier slit or obstacle width fraction'),
                  onChange: function (e) { upd('slitWidth', parseFloat(e.target.value)); },
                  className: "w-24 accent-indigo-600"
                }),
                React.createElement("span", { className: "text-xs text-indigo-800 font-bold" }, Math.round(((typeof d.slitWidth === 'number' && isFinite(d.slitWidth)) ? d.slitWidth : 0.08) * 100) + '% (\u03B8\u2248' + waveMetrics.diffractionAngleDeg.toFixed(1) + '\u00B0)')
              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.wave.ripple_medium_damping', 'Medium Damping:')),

                React.createElement("input", { style: { minHeight: 44 }, type: "range", min: 0.000, max: 0.010, step: 0.001, value: (typeof d.dampingCoeff === 'number' && isFinite(d.dampingCoeff)) ? d.dampingCoeff : 0.002, 'aria-label': __alloT('stem.wave.aria_damping_interference', 'Damping coefficient for interference'), onChange: e => upd('dampingCoeff', parseFloat(e.target.value)), className: "w-24 accent-indigo-600" }),

                React.createElement("span", { className: "text-xs text-indigo-800 font-bold w-12" }, ((typeof d.dampingCoeff === 'number' && isFinite(d.dampingCoeff)) ? d.dampingCoeff : 0.002).toFixed(3))

              ),

              React.createElement("button", {
                type: 'button',
                style: { minHeight: 44 },
                onClick: function() {
                  var c = canvasRef._lastCanvas;
                  if (c && c._drag) { c._drag.ripple1 = null; c._drag.ripple2 = null; }
                  updPatch({ rippleSrc1: null, rippleSrc2: null, ripplePhaseDiff: 0 });
                  if (typeof addToast === 'function') addToast(__alloT('stem.wave.toast_sources_reset', 'Sources reset to defaults'), 'info');
                },
                className: "transition-colors px-3 py-2 rounded-md text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 active:scale-[0.97]",
                'aria-label': __alloT('stem.wave.aria_reset_sources', 'Reset source positions to defaults')
              }, '↻ ' + __alloT('stem.wave.btn_reset_sources', 'Reset sources')),
              React.createElement("span", { className: "text-[0.6875rem] text-indigo-900 ml-auto" },
                React.createElement("strong", null, __alloT('stem.wave.ripple_bright', 'Bright')), __alloT('stem.wave.ripple_constructive', ' = constructive · '),
                React.createElement("strong", null, __alloT('stem.wave.ripple_dark', 'dark')), __alloT('stem.wave.ripple_destructive_hint', ' = destructive · 💡 drag the red sources'))

              ),

              (!d.rippleBarrier || d.rippleBarrier === 'none' || d.rippleBarrier === 'doubleSlit' || d.rippleBarrier === 'grating') && React.createElement("div", {
                'data-wave-phased-array-controls': 'true',
                className: "flex items-center flex-wrap gap-2.5 pt-2 border-t border-indigo-200"
              },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-900" }, __alloT('stem.wave.ripple_phase_offset', 'Phase Offset \u0394\u03C6:')),
                  React.createElement("input", {
                    'data-wave-ripple-phase-slider': 'true',
                    style: { minHeight: 44 },
                    type: 'range',
                    min: -3.1416,
                    max: 3.1416,
                    step: 0.05,
                    value: (typeof d.ripplePhaseDiff === 'number' && isFinite(d.ripplePhaseDiff)) ? d.ripplePhaseDiff : 0,
                    'aria-label': __alloT('stem.wave.aria_ripple_phase_diff', 'Source 2 phase offset delta phi in radians for phased-array beam steering'),
                    onChange: function(e) { upd('ripplePhaseDiff', parseFloat(e.target.value)); },
                    className: "w-28 accent-indigo-700"
                  })
                ),
                React.createElement("div", {
                  role: 'group',
                  'aria-label': __alloT('stem.wave.aria_phase_presets', 'Phased-array phase offset presets'),
                  className: "flex flex-wrap gap-1.5"
                },
                  [
                    { rad: -1.5708, label: '-90\u00B0' },
                    { rad: 0, label: '0\u00B0 ' + __alloT('stem.wave.phase_broadside', 'Broadside') },
                    { rad: 1.5708, label: '+90\u00B0' },
                    { rad: 3.1416, label: '180\u00B0 ' + __alloT('stem.wave.phase_null', 'Null') }
                  ].map(function(pr) {
                    var prAct = Math.abs(((typeof d.ripplePhaseDiff === 'number' && isFinite(d.ripplePhaseDiff)) ? d.ripplePhaseDiff : 0) - pr.rad) < 0.06;
                    return React.createElement("button", {
                      key: pr.label,
                      type: 'button',
                      'data-wave-phase-preset': String(Math.round(pr.rad * 180 / Math.PI)),
                      'aria-pressed': prAct,
                      'aria-label': __alloT('stem.wave.aria_set_phase_preset', 'Set source phase offset to ') + pr.label,
                      style: { minHeight: 44 },
                      onClick: function() { upd('ripplePhaseDiff', pr.rad); },
                      className: "px-2.5 py-2 rounded-md text-xs font-bold transition-colors " + (prAct ? 'bg-indigo-800 text-white shadow-sm' : 'bg-white text-indigo-900 border border-indigo-400 hover:bg-indigo-100')
                    }, pr.label);
                  })
                ),
                React.createElement("span", {
                  'data-wave-ripple-fringe-readout': 'true',
                  className: "px-2.5 py-1 rounded-full border text-xs font-bold",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : isDark
                      ? { backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' }
                      : { backgroundColor: '#ffffff', color: '#312e81', borderColor: '#a5b4fc' }
                }, '\u0394y = ' + waveMetrics.rippleFringeSpacingPx.toFixed(1) + ' px \u00B7 Nodal: ' + waveMetrics.rippleNodalCount + ' \u00B7 \u03B8\u2081 = ' + waveMetrics.rippleFirstMinDeg.toFixed(1) + '\u00B0'),
                React.createElement("span", {
                  'data-wave-beam-steer-badge': 'true',
                  className: "px-2.5 py-1 rounded-full bg-white border border-indigo-300 text-xs font-bold text-indigo-900 ml-auto"
                }, '\uD83D\uDEF0\uFE0F \u0394\u03C6 = ' + Math.round(((typeof d.ripplePhaseDiff === 'number' && isFinite(d.ripplePhaseDiff)) ? d.ripplePhaseDiff : 0) * 180 / Math.PI) + '\u00B0 · Beam \u03B8\u2080 = ' + (waveMetrics.beamSteerAngleDeg >= 0 ? '+' : '') + waveMetrics.beamSteerAngleDeg.toFixed(1) + '\u00B0')
              )

            ),

            // Reflection & Two-Medium Refraction controls
            waveMode === 'reflection' && React.createElement("div", { 'data-wave-reflection-controls': 'true', className: "flex flex-col gap-3 mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200" },
              React.createElement("div", { className: "flex items-center flex-wrap gap-4" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-900" }, __alloT('stem.wave.refl_end_type', 'End Type:')),
                  React.createElement("div", { className: "flex rounded-md overflow-hidden border border-amber-300" },
                    ['fixed', 'free'].map(function(et) {
                      var active = (d.reflectionEnd || 'fixed') === et;
                      return React.createElement('button', {
                        key: et,
                        type: 'button',
                        style: { minHeight: 44 },
                        onClick: function() { upd('reflectionEnd', et); },
                        className: 'px-3 py-2 text-xs font-bold transition ' + (active ? (et === 'fixed' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white') : 'transition-colors bg-white text-slate-700 hover:bg-amber-100 active:scale-[0.97]'),
                        'aria-pressed': active,
                        'aria-label': et === 'fixed' ? __alloT('stem.wave.aria_fixed_end', 'Fixed end (string tied down — phase inverts on reflection)') : __alloT('stem.wave.aria_free_end', 'Free end (string free to move — phase preserved on reflection)')
                      }, et === 'fixed' ? '🔒 ' + __alloT('stem.wave.btn_fixed', 'Fixed') : '🪁 ' + __alloT('stem.wave.btn_free', 'Free'));
                    })
                  )
                ),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-900" }, __alloT('stem.wave.refl_wall_position', 'Wall Position:')),
                  React.createElement("input", { style: { minHeight: 44 }, type: "range", min: 0.2, max: 0.95, step: 0.01, value: (typeof d.wallFrac === 'number' && isFinite(d.wallFrac)) ? d.wallFrac : 0.75, 'aria-label': __alloT('stem.wave.aria_wall_position', 'Wall position across the tank (keyboard equivalent of dragging the gold wall)'), onChange: function(e) { var wf = parseFloat(e.target.value); upd('wallFrac', wf); var c = canvasRef._lastCanvas; if (c && c._drag) c._drag.wallX = wf * c.width; }, className: "w-24 accent-amber-600" }),
                  React.createElement("span", { className: "text-xs text-amber-900 font-bold w-10" }, Math.round(((typeof d.wallFrac === 'number' && isFinite(d.wallFrac)) ? d.wallFrac : 0.75) * 100) + "%")
                ),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-900" }, __alloT('stem.wave.refl_reflectivity', 'Reflectivity:')),
                  React.createElement("input", { style: { minHeight: 44 }, type: "range", min: 0.0, max: 1.0, step: 0.05, value: (typeof d.reflectivity === 'number' && isFinite(d.reflectivity)) ? d.reflectivity : 0.9, 'aria-label': __alloT('stem.wave.aria_reflectivity', 'Wall reflectivity 0 to 1'), onChange: e => upd('reflectivity', parseFloat(e.target.value)), className: "w-24 accent-amber-600" }),
                  React.createElement("span", { className: "text-xs text-amber-900 font-bold w-10" }, (d.impedanceCoupled || d.antiReflectionCoating ? waveMetrics.effectiveReflectivity : ((typeof d.reflectivity === 'number' && isFinite(d.reflectivity)) ? d.reflectivity : 0.9)).toFixed(2))
                ),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-bold text-emerald-900" }, __alloT('stem.wave.refl_medium2_ratio', 'Medium 2 v\u2082/v\u2081:')),
                  React.createElement("input", { 'data-wave-medium2-slider': 'true', style: { minHeight: 44 }, type: "range", min: 0.25, max: 2.0, step: 0.05, value: d.medium2Ratio, 'aria-label': __alloT('stem.wave.aria_medium2_ratio', 'Medium 2 wave speed ratio relative to Medium 1'), onChange: e => upd('medium2Ratio', parseFloat(e.target.value)), className: "w-24 accent-emerald-600" }),
                  React.createElement("span", { className: "text-xs text-emerald-900 font-bold w-12" }, d.medium2Ratio.toFixed(2) + '×')
                ),
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-900" }, __alloT('stem.wave.refl_incident_angle', 'Incident \u03B8\u2081:')),
                  React.createElement("input", { 'data-wave-incident-angle-slider': 'true', style: { minHeight: 44 }, type: "range", min: 0, max: 85, step: 1, value: d.incidentAngleDeg || 0, 'aria-label': __alloT('stem.wave.aria_incident_angle', 'Incident angle in degrees at the medium boundary'), onChange: function (e) { upd('incidentAngleDeg', parseFloat(e.target.value)); }, className: "w-24 accent-amber-600" }),
                  React.createElement("span", { className: "text-xs text-amber-900 font-bold w-9" }, (d.incidentAngleDeg || 0) + '\u00B0')
                ),
                React.createElement("button", {
                  type: 'button',
                  style: { minHeight: 44 },
                  onClick: function() {
                    var c = canvasRef._lastCanvas;
                    if (c && c._drag) { c._drag.wallX = null; }
                    updPatch({ wallFrac: null, medium2Ratio: 0.6, incidentAngleDeg: 0, impedanceCoupled: false, antiReflectionCoating: false });
                    if (typeof addToast === 'function') addToast(__alloT('stem.wave.toast_wall_reset', 'Wall reset to 75% across'), 'info');
                  },
                  className: "transition-colors px-3 py-2 rounded-md text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 active:scale-[0.97]",
                  'aria-label': __alloT('stem.wave.aria_reset_wall', 'Reset wall position')
                }, '↻ ' + __alloT('stem.wave.btn_reset_wall', 'Reset wall'))
              ),
              React.createElement("div", { className: "flex flex-wrap items-center gap-2 text-xs" },
                React.createElement("button", {
                  type: 'button',
                  'data-wave-impedance-lock': 'true',
                  'aria-pressed': !!d.impedanceCoupled,
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_impedance_lock', 'Toggle Fresnel impedance-coupled reflection coefficients'),
                  onClick: function () { upd('impedanceCoupled', !d.impedanceCoupled); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.impedanceCoupled ? 'bg-indigo-800 text-white hover:bg-indigo-900 shadow-sm' : 'bg-white text-amber-950 border border-amber-400 hover:bg-amber-100')
                }, '\u2696\uFE0F ' + __alloT('stem.wave.btn_impedance_lock', 'Impedance Lock (Fresnel)')),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-ar-coating': 'true',
                  'aria-pressed': !!d.antiReflectionCoating,
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_ar_coating', 'Toggle quarter-wave anti-reflection thin-film coating'),
                  onClick: function () { upd('antiReflectionCoating', !d.antiReflectionCoating); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.antiReflectionCoating ? 'bg-cyan-800 text-white hover:bg-cyan-900 shadow-sm' : 'bg-white text-cyan-900 border border-cyan-500 hover:bg-cyan-50')
                }, '\uD83D\uDC53 ' + __alloT('stem.wave.btn_ar_coating', '\u03BB/4 AR Coating')),
                React.createElement("div", {
                  role: 'group',
                  'data-wave-fresnel-pol-group': 'true',
                  'aria-label': __alloT('stem.wave.aria_fresnel_pol_group', 'Fresnel polarization state: s-polarized TE or p-polarized TM'),
                  className: "flex rounded-lg overflow-hidden border border-indigo-400"
                },
                  [
                    { id: 's', label: __alloT('stem.wave.pol_s_te', 's-Pol (TE)') },
                    { id: 'p', label: __alloT('stem.wave.pol_p_tm', 'p-Pol (TM)') }
                  ].map(function (pol) {
                    var pActive = (d.fresnelPolarization || 's') === pol.id;
                    return React.createElement("button", {
                      key: pol.id,
                      type: 'button',
                      'data-wave-fresnel-pol': pol.id,
                      'aria-pressed': pActive,
                      'aria-label': __alloT('stem.wave.aria_fresnel_pol_btn', 'Select polarization ') + pol.label,
                      style: { minHeight: 44, minWidth: 44 },
                      onClick: function () { updPatch({ impedanceCoupled: true, fresnelPolarization: pol.id }); },
                      className: "px-3 py-2 text-xs font-bold transition-colors " + (pActive ? 'bg-indigo-800 text-white' : 'bg-white text-indigo-950 hover:bg-indigo-50')
                    }, pol.label);
                  })
                ),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-snap-brewster': 'true',
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_snap_brewster', 'Enable TM p-polarization and snap incident angle to Brewster angle for zero glare'),
                  onClick: function () {
                    updPatch({
                      impedanceCoupled: true,
                      antiReflectionCoating: false,
                      fresnelPolarization: 'p',
                      incidentAngleDeg: waveComputeBrewsterAngle(d.medium2Ratio)
                    });
                  },
                  className: "px-3 py-2 rounded-lg text-xs font-bold bg-sky-800 text-white hover:bg-sky-900 transition-colors"
                }, '\uD83D\uDD76\uFE0F ' + __alloT('stem.wave.btn_snap_brewster', 'Snap \u03B8_B (') + waveMetrics.brewsterAngleDeg.toFixed(1) + '\u00B0)'),
                React.createElement("button", {
                  type: 'button',
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_preset_glass', 'Set boundary to slow glass interface (Reflectivity 0.50, v2/v1 = 0.50)'),
                  onClick: function() { updPatch({ reflectivity: 0.5, medium2Ratio: 0.5, wallFrac: 0.55, incidentAngleDeg: 0 }); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                }, '\uD83D\uDD37 ' + __alloT('stem.wave.btn_preset_refract', 'Slower Medium 2 Demo (R=0.5, v\u2082=0.5v\u2081)')),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-tir-preset': 'true',
                  style: { minHeight: 44 },
                  'aria-label': __alloT('stem.wave.aria_preset_tir', 'Set Fiber-Optic Total Internal Reflection demo (v2/v1 = 1.50, incident angle 55 degrees)'),
                  onClick: function () { updPatch({ medium2Ratio: 1.5, incidentAngleDeg: 55, reflectivity: 0.4, wallFrac: 0.55 }); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
                }, '\uD83D\uDCA1 ' + __alloT('stem.wave.btn_preset_tir', 'Fiber-Optic TIR Demo (v\u2082=1.5v\u2081, 55\u00B0)')),
                React.createElement("span", { className: "px-2.5 py-1 rounded-full bg-white border border-amber-300 font-bold text-amber-900" }, __alloT('stem.wave.refl_energy_reflected', 'Reflected E: ') + waveMetrics.reflectedEnergyPct + '%'),
                React.createElement("span", { className: "px-2.5 py-1 rounded-full bg-white border border-emerald-300 font-bold text-emerald-800" }, __alloT('stem.wave.refl_energy_transmitted', 'Transmitted E: ') + waveMetrics.transmittedEnergyPct + '% (\u03BB\u2082 = ' + waveMetrics.medium2Wavelength.toFixed(1) + ' m)'),
                React.createElement("span", {
                  'data-wave-swr-badge': 'true',
                  className: "px-2.5 py-1 rounded-full bg-white border border-indigo-300 font-bold text-indigo-900"
                }, 'SWR: ' + (isFinite(waveMetrics.standingWaveRatio) ? waveMetrics.standingWaveRatio.toFixed(2) : '\u221E') + (d.antiReflectionCoating ? (' · d=' + waveMetrics.quarterWaveThickness.toFixed(1) + 'm') : '')),
                React.createElement("span", {
                  'data-wave-brewster-badge': 'true',
                  className: "px-2.5 py-1 rounded-full bg-white border border-sky-300 font-bold text-sky-900"
                }, '\u03B8_B (TM): ' + waveMetrics.brewsterAngleDeg.toFixed(1) + '\u00B0 (' + (d.fresnelPolarization || 's').toUpperCase() + '-pol)'),
                React.createElement("span", {
                  'data-wave-sonar-badge': 'true',
                  className: "px-2.5 py-1 rounded-full bg-white border border-cyan-300 font-bold text-cyan-900"
                }, '\uD83D\uDD0A ' + __alloT('stem.wave.sonar_range_prefix', 'Range: ') + waveMetrics.sonarRangeMeters.toFixed(1) + ' m · Echo: ' + waveMetrics.sonarEchoMs.toFixed(1) + ' ms'),
                React.createElement("span", { className: "px-2.5 py-1 rounded-full bg-white border border-cyan-300 font-bold text-cyan-800" },
                  '\u03B8c: ' + ((typeof waveMetrics.criticalAngleDeg === 'number' && isFinite(waveMetrics.criticalAngleDeg)) ? waveMetrics.criticalAngleDeg.toFixed(1) + '\u00B0' : 'N/A') + ' · \u03B8\u2082: ' + (waveMetrics.isTotalInternalReflection ? 'TIR (100% R)' : ((typeof waveMetrics.refractedAngleDeg === 'number' && isFinite(waveMetrics.refractedAngleDeg)) ? waveMetrics.refractedAngleDeg.toFixed(1) + '\u00B0' : '0.0\u00B0'))
                ),
                waveMetrics.isTotalInternalReflection && React.createElement("span", {
                  'data-wave-tir-badge': 'true',
                  className: "px-2.5 py-1 rounded-full border font-black",
                  style: (ctx && ctx.isContrast)
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : (ctx && ctx.isDark)
                      ? { backgroundColor: '#78350f', color: '#fef3c7', borderColor: '#f59e0b' }
                      : { backgroundColor: '#fef3c7', color: '#78350f', borderColor: '#d97706' }
                }, '\u26A1 ' + __alloT('stem.wave.badge_tir_active', 'Total Internal Reflection (\u03B8\u2081 > \u03B8c)')),
                waveMetrics.isBrewsterMatch && React.createElement("span", {
                  'data-wave-brewster-match-badge': 'true',
                  className: "px-2.5 py-1 rounded-full border font-black",
                  style: (ctx && ctx.isContrast)
                    ? { backgroundColor: '#000000', color: '#00ff88', borderColor: '#00ff88' }
                    : (ctx && ctx.isDark)
                      ? { backgroundColor: '#0c4a6e', color: '#e0f2fe', borderColor: '#38bdf8' }
                      : { backgroundColor: '#e0f2fe', color: '#0c4a6e', borderColor: '#0284c7' }
                }, '\u2728 ' + __alloT('stem.wave.badge_brewster_match', 'Brewster Glare-Free (R=0%)')),
                React.createElement("span", {
                  className: "text-[0.6875rem] text-amber-900 ml-auto",
                  style: (ctx && ctx.isDark && !(ctx && ctx.isContrast))
                    ? { backgroundColor: '#1e293b', color: '#e2e8f0', padding: '2px 8px', borderRadius: 999, border: '1px solid #475569' }
                    : undefined
                },
                  React.createElement("span", { style: { color: (ctx && ctx.isContrast) ? '#ffff00' : (ctx && ctx.isDark) ? '#fcd34d' : '#92400e', fontWeight: 700 } }, '— ' + __alloT('stem.wave.refl_solid', 'solid')), __alloT('stem.wave.refl_solid_desc', ': M1 net · '),
                  React.createElement("span", { style: { color: (ctx && ctx.isContrast) ? '#00ff88' : (ctx && ctx.isDark) ? '#6ee7b7' : '#047857', fontWeight: 700 } }, '— ' + __alloT('stem.wave.refl_green', 'green')), __alloT('stem.wave.refl_green_desc', ': M2 transmitted · '),
                  React.createElement("span", { style: { color: (ctx && ctx.isContrast) ? '#ff80bf' : (ctx && ctx.isDark) ? '#f9a8d4' : '#be185d', fontWeight: 700 } }, '‑‑ ' + __alloT('stem.wave.refl_dashed', 'dashed')), __alloT('stem.wave.refl_dashed_desc', ': reflected'))
              ),
              (function () {
                var activateFtir = function (gapVal) {
                  var patch = { ftirEnabled: true };
                  if (gapVal != null) patch.ftirGapLambda = gapVal;
                  if (!waveMetrics.isTotalInternalReflection) {
                    var nextR = d.medium2Ratio > 1.05 ? d.medium2Ratio : 1.5;
                    var nextCrit = (Math.asin(1 / nextR) * 180) / Math.PI;
                    patch.impedanceCoupled = true;
                    patch.medium2Ratio = nextR;
                    patch.incidentAngleDeg = Math.max(d.incidentAngleDeg || 0, Math.min(82, Math.ceil(nextCrit + 12)));
                  }
                  updPatch(patch);
                };
                return React.createElement("div", {
                  'data-wave-ftir-bench': 'true',
                  role: 'region',
                  'aria-label': __alloT('stem.wave.aria_ftir_bench', 'Evanescent decay depth and frustrated total internal reflection optical tunneling bench'),
                  className: "w-full mt-1 pt-2.5 border-t border-amber-300/80 flex flex-wrap items-center gap-2.5"
                },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-ftir-toggle': 'true',
                    'aria-pressed': !!d.ftirEnabled,
                    'aria-label': __alloT('stem.wave.aria_ftir_toggle', 'Toggle frustrated total internal reflection second prism barrier tunneling'),
                    style: { minHeight: 44 },
                    onClick: function () {
                      if (!d.ftirEnabled) activateFtir(null);
                      else upd('ftirEnabled', false);
                    },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.ftirEnabled ? 'bg-amber-800 text-white shadow-sm' : 'bg-white text-amber-900 border border-amber-500 hover:bg-amber-100')
                  }, d.ftirEnabled ? '\uD83D\uDD2C ' + __alloT('stem.wave.ftir_on', 'FTIR Prism Gap: ON') : __alloT('stem.wave.ftir_off', 'Enable FTIR Prism Tunneling')),
                  React.createElement("label", { className: "text-xs font-bold text-amber-950 flex items-center gap-2" },
                    __alloT('stem.wave.ftir_gap_label', 'Air Gap d/\u03BB\u2081:'),
                    React.createElement("input", {
                      'data-wave-ftir-gap-slider': 'true',
                      type: 'range',
                      min: 0.05, max: 1.5, step: 0.05,
                      value: d.ftirGapLambda,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_ftir_gap', 'Frustrated TIR prism air gap in multiples of incident wavelength'),
                      'aria-valuetext': d.ftirGapLambda.toFixed(2) + __alloT('stem.wave.aria_wavelengths_trans', ' wavelengths, transmission ') + waveMetrics.tunnelTransmissionPct.toFixed(1) + '%',
                      onChange: function (e) { activateFtir(parseFloat(e.target.value)); },
                      className: "w-24 accent-amber-700"
                    }),
                    React.createElement("span", { className: "font-mono font-black w-12 text-right" }, d.ftirGapLambda.toFixed(2) + '\u03BB')
                  ),
                  [
                    { id: '0.10', label: __alloT('stem.wave.ftir_narrow', '0.10\u03BB Tight'), val: 0.10 },
                    { id: '0.25', label: __alloT('stem.wave.ftir_mid', '0.25\u03BB Coupled'), val: 0.25 },
                    { id: '1.00', label: __alloT('stem.wave.ftir_wide', '1.00\u03BB Decoupled'), val: 1.00 }
                  ].map(function (gp) {
                    var gpAct = !!d.ftirEnabled && Math.abs(d.ftirGapLambda - gp.val) < 0.025;
                    return React.createElement("button", {
                      key: gp.id,
                      type: 'button',
                      'data-wave-ftir-preset': gp.id,
                      'aria-pressed': gpAct,
                      'aria-label': __alloT('stem.wave.aria_ftir_preset', 'Set FTIR barrier gap to ') + gp.label,
                      style: { minHeight: 44 },
                      onClick: function () { activateFtir(gp.val); },
                      className: "px-2 py-1.5 rounded-lg text-xs font-bold transition-colors " + (gpAct ? 'bg-amber-800 text-white' : 'bg-white text-amber-900 border border-amber-400 hover:bg-amber-100')
                    }, gp.label);
                  }),
                  React.createElement("span", {
                    'data-wave-ftir-readout': 'true',
                    className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border ml-auto",
                    style: isContrast
                      ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                      : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                  }, waveMetrics.isTotalInternalReflection
                    ? ('d\u209A=' + (waveMetrics.evanescentPenetrationLambda || 0).toFixed(2) + '\u03BB \u00B7 ' + (d.ftirEnabled
                      ? ('FTIR T=' + waveMetrics.tunnelTransmissionPct.toFixed(1) + '% \u00B7 R=' + waveMetrics.reflectedEnergyPct + '%')
                      : ('TIR R=100% (T@gap=' + waveMetrics.potentialTunnelPct.toFixed(1) + '%)')))
                    : __alloT('stem.wave.ftir_need_tir', 'Raise v\u2082/v\u2081 > 1 & \u03B8\u2081 > \u03B8c for TIR & d\u209A'))
                );
              })()
            ),

            // Longitudinal Kundt's Tube & Sound Pressure Level controls
            waveMode === 'longitudinal' && React.createElement("div", {
              'data-wave-longitudinal-controls': 'true',
              className: "flex flex-col gap-2.5 mb-3 p-3 bg-sky-50 rounded-lg border border-sky-200"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("div", {
                  role: 'group',
                  'aria-label': __alloT('stem.wave.aria_longitudinal_mode_group', 'Longitudinal wave mode: traveling wave or Kundt standing tube'),
                  className: "flex flex-wrap gap-1.5"
                },
                  [
                    { id: 'traveling', label: __alloT('stem.wave.long_traveling', 'Traveling Sound Wave'), aria: __alloT('stem.wave.aria_long_traveling', 'Switch to traveling longitudinal compression wave') },
                    { id: 'standing', label: '\uD83E\uDDEA ' + __alloT('stem.wave.long_standing', 'Kundt\'s Standing Tube'), aria: __alloT('stem.wave.aria_long_standing', 'Switch to closed-closed Kundt acoustic standing wave tube') }
                  ].map(function(lm) {
                    var lmAct = (d.longitudinalMode || 'traveling') === lm.id;
                    return React.createElement("button", {
                      key: lm.id,
                      type: 'button',
                      'data-wave-longitudinal-mode': lm.id,
                      'aria-pressed': lmAct,
                      'aria-label': lm.aria,
                      style: { minHeight: 44 },
                      onClick: function() { upd('longitudinalMode', lm.id); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (lmAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-800 border border-cyan-400 hover:bg-cyan-100')
                    }, lm.label);
                  })
                ),
                React.createElement("span", {
                  'data-wave-spl-badge': 'true',
                  className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                }, '\uD83D\uDD0A ' + __alloT('stem.wave.spl_label', 'Est. Level:') + ' ' + waveMetrics.soundLevelDb.toFixed(1) + ' dB SPL')
              ),
              React.createElement("div", { className: "flex flex-wrap items-center gap-2.5 pt-2 border-t border-sky-200" },
                (d.longitudinalMode || 'traveling') === 'standing' && React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" },
                  React.createElement("span", { className: "text-xs font-bold text-sky-900" }, __alloT('stem.wave.kundt_harmonic_label', 'Tube Harmonic n:')),
                  [1, 2, 3, 4].map(function(n) {
                    var hAct = (d.harmonic || 2) === n;
                    return React.createElement("button", {
                      key: n,
                      type: 'button',
                      'data-wave-kundt-harmonic': String(n),
                      'aria-pressed': hAct,
                      'aria-label': __alloT('stem.wave.aria_kundt_harmonic', 'Set Kundt tube harmonic to ') + n,
                      style: { minHeight: 44, minWidth: 44 },
                      onClick: function() { upd('harmonic', n); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (hAct ? 'bg-indigo-700 text-white shadow-sm' : 'bg-white text-indigo-800 border border-indigo-400 hover:bg-indigo-100')
                    }, String(n));
                  })
                ),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-disp-curve-toggle': 'true',
                  'aria-pressed': !!d.showDisplacementCurve,
                  'aria-label': __alloT('stem.wave.aria_disp_curve_toggle', 'Toggle longitudinal particle displacement curve vs pressure wave'),
                  style: { minHeight: 44 },
                  onClick: function() { upd('showDisplacementCurve', !d.showDisplacementCurve); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.showDisplacementCurve ? 'bg-cyan-700 text-white shadow-sm' : 'bg-white text-cyan-800 border border-cyan-400 hover:bg-cyan-100')
                }, '\u3030 ' + __alloT('stem.wave.disp_curve_btn', 'Overlay \u0394x(x) vs \u0394P(x) (90\u00B0 Quadrature)'))
              ),
              React.createElement("div", {
                'data-wave-air-temp-bench': 'true',
                className: "flex flex-wrap items-center gap-2.5 pt-2 border-t border-sky-200"
              },
                React.createElement("button", {
                  type: 'button',
                  'data-wave-air-temp-toggle': 'true',
                  'aria-pressed': !!d.airTempCoupled,
                  'aria-label': __alloT('stem.wave.aria_air_temp_toggle', 'Couple sound speed in air to air temperature in degrees Celsius'),
                  style: { minHeight: 44 },
                  onClick: function () {
                    if (!d.airTempCoupled) {
                      updPatch({ airTempCoupled: true, waveSpeed: waveComputeAirSoundSpeed(d.airTempC) });
                    } else {
                      upd('airTempCoupled', false);
                    }
                  },
                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.airTempCoupled ? 'bg-sky-800 text-white shadow-sm' : 'bg-white text-sky-900 border border-sky-400 hover:bg-sky-100')
                }, d.airTempCoupled ? '\uD83C\uDF21\uFE0F ' + __alloT('stem.wave.air_temp_on', 'Thermal Air Speed: ON') : '\uD83C\uDF21\uFE0F ' + __alloT('stem.wave.air_temp_off', 'Couple v_air(T)')),
                React.createElement("label", {
                  htmlFor: 'wave-air-temp-slider',
                  className: "text-xs font-bold text-sky-950 flex items-center gap-2"
                },
                  __alloT('stem.wave.air_temp_label', 'Air Temp T:'),
                  React.createElement("input", {
                    id: 'wave-air-temp-slider',
                    'data-wave-air-temp-slider': 'true',
                    type: 'range',
                    min: -30, max: 60, step: 1,
                    value: d.airTempC,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_air_temp_slider', 'Air temperature in degrees Celsius'),
                    'aria-valuetext': d.airTempC + ' \u00B0C \u2014 v = ' + waveMetrics.airTempSpeed.toFixed(1) + ' m/s',
                    onChange: function (e) {
                      var tc = parseFloat(e.target.value);
                      updPatch({ airTempCoupled: true, airTempC: tc, waveSpeed: waveComputeAirSoundSpeed(tc) });
                    },
                    className: "w-28 accent-sky-700"
                  })
                ),
                React.createElement("span", {
                  'data-wave-air-temp-readout': 'true',
                  className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : isDark
                      ? { backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' }
                      : { backgroundColor: '#ffffff', color: '#0c4a6e', borderColor: '#7dd3fc' }
                }, 'T=' + d.airTempC + '\u00B0C · v=' + waveMetrics.airTempSpeed.toFixed(1) + ' m/s' + ((d.longitudinalMode || 'traveling') === 'standing' ? (' · f\u2099(1m)=' + waveMetrics.kundtTubeResonantHz.toFixed(1) + ' Hz') : ''))
              ),
              (d.longitudinalMode || 'traveling') === 'traveling' && React.createElement("div", {
                'data-wave-acoustic-dist-bench': 'true',
                className: "flex flex-wrap items-center gap-2.5 pt-2 border-t border-sky-200 w-full"
              },
                React.createElement("button", {
                  type: 'button',
                  'data-wave-dist-atten-toggle': 'true',
                  'aria-pressed': !!d.distanceAttenuation,
                  'aria-label': __alloT('stem.wave.aria_dist_atten_toggle', 'Toggle inverse-square or cylindrical acoustic distance attenuation'),
                  style: { minHeight: 44 },
                  onClick: function () { upd('distanceAttenuation', !d.distanceAttenuation); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (d.distanceAttenuation ? 'bg-amber-800 text-white shadow-sm' : 'bg-white text-sky-900 border border-sky-400 hover:bg-sky-100')
                }, d.distanceAttenuation ? '\uD83C\uDFA4 ' + __alloT('stem.wave.dist_atten_on', 'Distance Attenuation: ON') : '\uD83C\uDFA4 ' + __alloT('stem.wave.dist_atten_off', 'Enable 1/r\u00B2 Mic Distance')),
                [
                  { id: 'spherical', label: __alloT('stem.wave.law_spherical', '1/r\u00B2 Spherical (-6 dB/2\u00D7)'), aria: __alloT('stem.wave.aria_law_spherical', 'Use 3D spherical inverse-square acoustic spreading') },
                  { id: 'cylindrical', label: __alloT('stem.wave.law_cylindrical', '1/r Waveguide (-3 dB/2\u00D7)'), aria: __alloT('stem.wave.aria_law_cylindrical', 'Use cylindrical waveguide 1 over r spreading') }
                ].map(function (law) {
                  var lAct = (d.spreadingLaw || 'spherical') === law.id;
                  return React.createElement("button", {
                    key: law.id,
                    type: 'button',
                    'data-wave-spreading-law': law.id,
                    'aria-pressed': lAct,
                    'aria-label': law.aria,
                    style: { minHeight: 44, minWidth: 44 },
                    onClick: function () { updPatch({ distanceAttenuation: true, spreadingLaw: law.id }); },
                    className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (lAct ? 'bg-sky-800 text-white shadow-sm' : 'bg-white text-sky-900 border border-sky-400 hover:bg-sky-100')
                  }, law.label);
                }),
                React.createElement("label", {
                  htmlFor: 'wave-listener-dist-slider',
                  className: "text-xs font-bold text-sky-950 flex items-center gap-2"
                },
                  __alloT('stem.wave.listener_dist_label', 'Mic Distance r (m):'),
                  React.createElement("input", {
                    id: 'wave-listener-dist-slider',
                    'data-wave-listener-dist-slider': 'true',
                    type: 'range',
                    min: 1, max: 20, step: 0.5,
                    value: d.listenerDistMeters,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_listener_dist', 'Listener microphone distance in meters'),
                    'aria-valuetext': d.listenerDistMeters.toFixed(1) + ' ' + __alloT('stem.wave.unit_meters_level', 'meters, level ') + waveMetrics.attenuatedDb.toFixed(1) + ' ' + __alloT('stem.wave.unit_db', 'decibels'),
                    onChange: function (e) { updPatch({ distanceAttenuation: true, listenerDistMeters: parseFloat(e.target.value) }); },
                    className: "w-28 accent-sky-700"
                  })
                ),
                React.createElement("span", {
                  'data-wave-dist-atten-readout': 'true',
                  className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                  style: isContrast
                    ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                    : isDark
                      ? { backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' }
                      : { backgroundColor: '#ffffff', color: '#0c4a6e', borderColor: '#7dd3fc' }
                }, 'r=' + waveMetrics.listenerDistMeters.toFixed(1) + 'm \u00B7 L(r)=' + waveMetrics.attenuatedDb.toFixed(1) + ' dB (\u2212' + waveMetrics.attenuationDropDb.toFixed(1) + ' dB) \u00B7 I/I\u2080=' + waveMetrics.intensityPctAtListener.toFixed(1) + '%')
              )
            ),

            // Doppler, Mach Cone & Relativistic Light Spectrograph controls

            waveMode === 'doppler' && React.createElement("div", { 'data-wave-doppler-controls': 'true', className: "flex items-center flex-wrap gap-3 mb-3 p-3 bg-rose-50 rounded-lg border border-rose-200" },

              React.createElement("div", {
                role: 'group',
                'data-wave-doppler-regime-group': 'true',
                'aria-label': __alloT('stem.wave.aria_doppler_regime_group', 'Doppler physics regime: acoustic sound or relativistic electromagnetic light'),
                className: "flex flex-wrap items-center gap-2 w-full pb-2 border-b border-rose-200"
              },
                React.createElement("span", { className: "text-xs font-black text-rose-950 uppercase tracking-wide" }, __alloT('stem.wave.doppler_regime_label', 'Regime:')),
                [
                  { id: 'acoustic', label: '\uD83D\uDD0A ' + __alloT('stem.wave.doppler_regime_acoustic', 'Sound (Mach)') },
                  { id: 'relativistic', label: '\uD83C\uDF20 ' + __alloT('stem.wave.doppler_regime_rel', 'Light / EM (Relativistic c)') }
                ].map(function (reg) {
                  var rAct = (d.dopplerRegime || 'acoustic') === reg.id;
                  return React.createElement("button", {
                    key: reg.id,
                    type: 'button',
                    'data-wave-doppler-regime': reg.id,
                    'aria-pressed': rAct,
                    'aria-label': __alloT('stem.wave.aria_doppler_regime_btn', 'Switch Doppler regime to ') + reg.label,
                    style: { minHeight: 44 },
                    onClick: function () { upd('dopplerRegime', reg.id); },
                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (rAct ? 'bg-rose-800 text-white shadow-sm' : 'bg-white text-rose-900 border border-rose-300 hover:bg-rose-100')
                  }, reg.label);
                })
              ),

              React.createElement("label", { className: "text-xs font-bold text-rose-800 flex items-center gap-2" },

                __alloT('stem.wave.doppler_source_speed', 'Source Speed') + " (v\u209B):",

                React.createElement("input", { 'data-wave-source-speed-slider': 'true', style: { minHeight: 44 }, type: "range", min: 0.0, max: 1.50, step: 0.05, value: (typeof d.sourceSpeed === 'number' && isFinite(d.sourceSpeed)) ? d.sourceSpeed : 0.3, 'aria-label': __alloT('stem.wave.aria_source_speed', 'Source speed as fraction of wave speed'), onChange: e => upd('sourceSpeed', parseFloat(e.target.value)), className: "w-32 accent-rose-600" }),

                React.createElement("span", { className: "inline-block w-24 text-right font-mono" }, (d.dopplerRegime === 'relativistic'
                  ? ('\u03B2 ' + Math.min(0.95, ((typeof d.sourceSpeed === 'number' && isFinite(d.sourceSpeed)) ? d.sourceSpeed : 0.3)).toFixed(2) + 'c')
                  : ('M ' + (((typeof d.sourceSpeed === 'number' && isFinite(d.sourceSpeed)) ? d.sourceSpeed : 0.3)).toFixed(2))))

              ),

              React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                [
                  { label: __alloT('stem.wave.doppler_pre_still', '0.0 Still'), v: 0.0 },
                  { label: __alloT('stem.wave.doppler_pre_sub', '0.5 Subsonic'), v: 0.5 },
                  { label: __alloT('stem.wave.doppler_pre_sonic', '1.0 Sonic'), v: 1.0 },
                  { label: __alloT('stem.wave.doppler_pre_super', '1.3 Mach Cone'), v: 1.3 }
                ].map(function(dp) {
                  var dAct = Math.abs(d.sourceSpeed - dp.v) < 0.03;
                  return React.createElement("button", {
                    key: dp.label,
                    type: 'button',
                    'aria-pressed': dAct,
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_doppler_preset', 'Set source speed to ') + dp.label,
                    onClick: function() { upd('sourceSpeed', dp.v); },
                    className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (dAct ? 'bg-rose-700 text-white' : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100')
                  }, dp.label);
                })
              ),

              React.createElement("div", { className: "flex flex-wrap items-center gap-2.5 w-full pt-2 border-t border-rose-200" },
                React.createElement("label", { className: "text-xs font-bold text-rose-900 flex items-center gap-2" },
                  __alloT('stem.wave.doppler_obs_speed', 'Observer O\u2082 Speed') + " (v\u2092):",
                  React.createElement("input", {
                    'data-wave-observer-speed-slider': 'true',
                    style: { minHeight: 44 },
                    type: "range",
                    min: -0.8, max: 0.8, step: 0.05,
                    value: (typeof d.observerSpeed === 'number' && isFinite(d.observerSpeed)) ? d.observerSpeed : 0,
                    'aria-label': __alloT('stem.wave.aria_observer_speed', 'Observer O2 velocity relative to medium, positive toward source'),
                    'aria-valuetext': (((typeof d.observerSpeed === 'number' && isFinite(d.observerSpeed)) ? d.observerSpeed : 0) >= 0 ? '+' : '') + (((typeof d.observerSpeed === 'number' && isFinite(d.observerSpeed)) ? d.observerSpeed : 0)).toFixed(2) + __alloT('stem.wave.aria_times_v', ' times wave speed'),
                    onChange: function(e) {
                      var nvObs = parseFloat(e.target.value);
                      upd('observerSpeed', nvObs);
                      if (d.dopplerRegime === 'relativistic') {
                        syncOsc({ dopplerFreq: waveComputeRelativisticDoppler(d.frequency || 2, d.sourceSpeed || 0, nvObs).approachingFreq });
                      } else if (!waveMetrics.isSupersonic) {
                        var df = (d.frequency || 2) * Math.max(0.15, 1 + nvObs) / Math.max(0.05, 1 - Math.min(0.95, d.sourceSpeed || 0));
                        syncOsc({ dopplerFreq: df });
                      }
                    },
                    className: "w-28 accent-rose-600"
                  }),
                  React.createElement("span", { className: "inline-block w-16 text-right font-mono font-black" }, (((typeof d.observerSpeed === 'number' && isFinite(d.observerSpeed)) ? d.observerSpeed : 0) >= 0 ? '+' : '') + (((typeof d.observerSpeed === 'number' && isFinite(d.observerSpeed)) ? d.observerSpeed : 0)).toFixed(2) + 'c')
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                  [
                    { label: __alloT('stem.wave.obs_recede', '-0.4 Receding O\u2082'), v: -0.4 },
                    { label: __alloT('stem.wave.obs_still', '0.0 Stationary O\u2082'), v: 0.0 },
                    { label: __alloT('stem.wave.obs_approach', '+0.4 Approaching O\u2082'), v: 0.4 }
                  ].map(function(op) {
                    var oAct = Math.abs((d.observerSpeed || 0) - op.v) < 0.03;
                    return React.createElement("button", {
                      key: op.label,
                      type: 'button',
                      'data-wave-obs-preset': String(op.v),
                      'aria-pressed': oAct,
                      style: { minHeight: 44 },
                      'aria-label': __alloT('stem.wave.aria_obs_preset', 'Set observer O2 speed to ') + op.label,
                      onClick: function() { upd('observerSpeed', op.v); },
                      className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (oAct ? 'bg-rose-700 text-white' : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-100')
                    }, op.label);
                  })
                )
              ),

              (function() {
                var _m = (typeof d.sourceSpeed === 'number' && isFinite(d.sourceSpeed)) ? d.sourceSpeed : 0.3;
                var _isRel = d.dopplerRegime === 'relativistic';
                var _isSup = !_isRel && _m >= 1.0;
                var mapNmToX = function(nm) {
                  var clampedNm = Math.max(380, Math.min(950, nm));
                  return Math.round((20 + ((clampedNm - 380) / (950 - 380)) * 320) * 10) / 10;
                };
                var xRest = mapNmToX(656.3);
                var xApp = mapNmToX(waveMetrics.hAlphaAppNm);
                var xRec = mapNmToX(waveMetrics.hAlphaRecNm);
                return React.createElement(React.Fragment, null,
                  !_isSup && React.createElement("span", { 'data-wave-doppler-approaching': 'true', className: "text-[0.6875rem] font-bold text-red-800 bg-red-100 border border-red-300 rounded-full px-2.5 py-1" }, __alloT('stem.wave.doppler_approaching', 'O\u2082 approaching') + " f\u2032 = " + waveMetrics.approachingFreq.toFixed(_isRel ? 2 : 1) + " Hz"),
                  _isSup && React.createElement("span", { 'data-wave-mach-badge': 'true', className: "text-[0.6875rem] font-bold rounded-full px-2.5 py-1 border", style: isContrast ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' } : isDark ? { backgroundColor: '#78350f', color: '#fef3c7', borderColor: '#f59e0b' } : { backgroundColor: '#fef3c7', color: '#78350f', borderColor: '#d97706' } }, '\u26A1 ' + __alloT('stem.wave.doppler_mach_cone_badge', 'Mach Cone \u03BC = ') + (waveMetrics.machAngleDeg != null ? waveMetrics.machAngleDeg.toFixed(1) : '90.0') + '\u00B0'),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-sky-800 bg-sky-100 border border-sky-300 rounded-full px-2.5 py-1" }, __alloT('stem.wave.doppler_receding', 'O\u2081 receding') + " f\u2032 = " + waveMetrics.recedingFreq.toFixed(_isRel ? 2 : 1) + " Hz"),
                  _isRel && React.createElement("span", {
                    'data-wave-relativistic-badges': 'true',
                    className: "text-[0.6875rem] font-bold rounded-full px-2.5 py-1 border",
                    style: isContrast ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' } : isDark ? { backgroundColor: '#312e81', color: '#e0e7ff', borderColor: '#818cf8' } : { backgroundColor: '#eef2ff', color: '#312e81', borderColor: '#6366f1' }
                  }, '\u03B3 = ' + waveMetrics.relativisticGamma.toFixed(2) + ' · z_rec = ' + (waveMetrics.redshiftRec >= 0 ? '+' : '') + waveMetrics.redshiftRec.toFixed(3)),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-doppler-flyby': 'true',
                    style: { minHeight: 44 },
                    'aria-label': __alloT('stem.wave.aria_doppler_flyby', 'Play 2 second Doppler siren fly-by pitch sweep from approaching to receding frequency'),
                    onClick: playDopplerFlyby,
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 transition-colors shadow-sm"
                  }, '\uD83D\uDE97 ' + __alloT('stem.wave.btn_doppler_flyby', 'Hear Fly-By Sweep')),
                  React.createElement("span", { className: "text-[0.6875rem] text-rose-800 italic" }, (_waveAudio.ctx && d.soundPlaying) ? "\uD83D\uDD0A " + __alloT('stem.wave.doppler_tone_bends', 'the tone bends as the source passes the observer') : "\u25B6 " + __alloT('stem.wave.doppler_press_play', 'press Play Sound to HEAR the shift')),
                  _isRel && React.createElement("div", { className: "w-full pt-2 border-t border-rose-200" },
                    React.createElement("svg", {
                      'data-wave-halpha-spectrograph': 'true',
                      role: 'img',
                      'aria-label': __alloT('stem.wave.aria_halpha_spectrograph', 'Balmer H-alpha optical Doppler emission spectrograph comparing rest, blueshifted approaching, and redshifted receding wavelengths'),
                      viewBox: '0 0 360 66',
                      className: 'w-full h-16 rounded-lg border border-slate-700 block',
                      style: { backgroundColor: isContrast ? '#000000' : '#0f172a' }
                    },
                      React.createElement("line", { x1: 20, y1: 44, x2: 340, y2: 44, stroke: '#475569', strokeWidth: 1 }),
                      React.createElement("line", { x1: xRest, y1: 12, x2: xRest, y2: 44, stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '3 3' }),
                      React.createElement("line", { x1: xApp, y1: 10, x2: xApp, y2: 44, stroke: waveWavelengthNmToHex(waveMetrics.hAlphaAppNm), strokeWidth: 3.5 }),
                      React.createElement("line", { x1: xRec, y1: 10, x2: xRec, y2: 44, stroke: waveWavelengthNmToHex(waveMetrics.hAlphaRecNm), strokeWidth: 3.5 }),
                      React.createElement("text", { x: 180, y: 12, textAnchor: 'middle', fill: '#f8fafc', fontSize: 9.5, fontFamily: 'monospace', fontWeight: 'bold' }, 'H\u03B1\u2080 656.3 nm  |  App: ' + waveMetrics.hAlphaAppNm.toFixed(1) + ' nm  |  Rec: ' + waveMetrics.hAlphaRecNm.toFixed(1) + ' nm'),
                      React.createElement("text", { x: 20, y: 58, textAnchor: 'start', fill: '#cbd5e1', fontSize: 8.5, fontFamily: 'monospace' }, '380 nm (UV/Violet)'),
                      React.createElement("text", { x: xRest, y: 58, textAnchor: 'middle', fill: '#e2e8f0', fontSize: 8.5, fontFamily: 'monospace' }, '656.3'),
                      React.createElement("text", { x: 340, y: 58, textAnchor: 'end', fill: '#cbd5e1', fontSize: 8.5, fontFamily: 'monospace' }, '950 nm (NIR)')
                    )
                  )
                );
              })(),

              (function () {
                var offD = waveComputeOffAxisDoppler(d.frequency || 2, d.sourceSpeed, d.dopplerOffsetAngleDeg, d.dopplerRegime);
                return React.createElement("div", {
                  'data-wave-doppler-offset-bench': 'true',
                  role: 'region',
                  'aria-label': __alloT('stem.wave.aria_doppler_offset_bench', 'Off-axis observer angle, radar cosine effect, and transverse relativistic Doppler bench'),
                  className: "w-full pt-2.5 mt-1 border-t border-rose-200 flex flex-col gap-2"
                },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                    React.createElement("span", { className: "text-xs font-black text-rose-950" }, '\uD83D\uDCD0 ' + __alloT('stem.wave.doppler_offset_title', 'Off-Axis Observer O\u03B8, Radar Cosine & Transverse Shift')),
                    React.createElement("span", {
                      'data-wave-doppler-offset-readout': 'true',
                      className: "text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full border",
                      style: isContrast
                        ? { backgroundColor: '#000000', color: '#ffff00', borderColor: '#ffff00' }
                        : { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                    }, '\u03B8 = ' + Math.round(offD.observerAngleDeg) + '\u00B0 \u00B7 cos\u03B8 = ' + offD.radarCosinePct.toFixed(1) + '% \u00B7 f\u2032(\u03B8) = ' + offD.observedFreqHz.toFixed(2) + ' Hz \u00B7 f\u2032(90\u00B0) = ' + offD.transverseFreqHz.toFixed(2) + ' Hz' + (offD.isTransverseRedshift ? (' (\u03B3=' + offD.gamma.toFixed(2) + ' time-dilation redshift)') : ''))
                  ),
                  React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                    React.createElement("div", {
                      role: 'group',
                      'aria-label': __alloT('stem.wave.aria_doppler_angle_presets', 'Off-axis observer angle presets'),
                      className: "flex flex-wrap gap-1.5"
                    },
                      [0, 30, 60, 90].map(function (ang) {
                        var angAct = Math.abs((d.dopplerOffsetAngleDeg || 0) - ang) < 0.6;
                        return React.createElement("button", {
                          key: ang,
                          type: 'button',
                          'data-wave-doppler-angle-preset': String(ang),
                          'aria-pressed': angAct,
                          'aria-label': __alloT('stem.wave.aria_doppler_angle_preset', 'Set off-axis observer angle theta to ') + ang + __alloT('stem.wave.vt_degrees', ' degrees'),
                          style: { minWidth: 44, minHeight: 44 },
                          onClick: function () { upd('dopplerOffsetAngleDeg', ang); },
                          className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (angAct ? 'bg-rose-800 text-white shadow-sm' : 'bg-white text-rose-900 border border-rose-300 hover:bg-rose-100')
                        }, ang + '\u00B0' + (ang === 0 ? ' ' + __alloT('stem.wave.doppler_ang_headon', 'Head-on') : ang === 90 ? ' ' + __alloT('stem.wave.doppler_ang_transverse', 'Transverse') : ''));
                      })
                    ),
                    React.createElement("div", { className: "flex items-center gap-2 ml-auto bg-white px-2.5 py-1 rounded-lg border border-rose-200 flex-1 min-w-[200px]" },
                      React.createElement("label", {
                        htmlFor: 'wave-doppler-offset-angle',
                        className: "text-xs font-bold text-slate-900 whitespace-nowrap"
                      }, __alloT('stem.wave.doppler_offset_slider_label', 'Angle \u03B8:') + ' ' + Math.round(d.dopplerOffsetAngleDeg || 0) + '\u00B0'),
                      React.createElement("input", {
                        id: 'wave-doppler-offset-angle',
                        'data-wave-doppler-offset-slider': 'true',
                        type: 'range',
                        min: 0, max: 90, step: 1,
                        value: d.dopplerOffsetAngleDeg || 0,
                        style: { minHeight: 44 },
                        'aria-label': __alloT('stem.wave.aria_doppler_offset_slider', 'Off-axis observer angle theta in degrees from 0 head-on to 90 transverse'),
                        'aria-valuetext': Math.round(d.dopplerOffsetAngleDeg || 0) + __alloT('stem.wave.vt_deg_cos_mid', ' degrees cosine ') + offD.radarCosinePct.toFixed(0) + __alloT('stem.wave.vt_pct_radial', ' percent radial'),
                        onChange: function (e) { upd('dopplerOffsetAngleDeg', parseFloat(e.target.value) || 0); },
                        className: "w-full accent-rose-700"
                      })
                    )
                  )
                );
              })()

            ),

            ), // end showSimStage

            // Wave equation display (Explore / All)

            showWaveEqAndCards && React.createElement(React.Fragment, null,

            (function() {
              var govEq = waveGoverningEquation(d);
              return React.createElement("div", { className: "bg-slate-900 rounded-lg p-4 mb-3 text-center border border-slate-700 shadow-lg" },

              React.createElement("p", { className: "text-[0.6875rem] font-bold text-slate-300 uppercase tracking-wider mb-1" }, "\uD83D\uDCDD " + __alloT('stem.wave.wave_equation_heading', 'Wave Equation')),

              

              // General Template Formula

              React.createElement("div", { className: "mb-3 p-1.5 bg-slate-900/50 rounded-lg border border-slate-700/50 inline-block text-center" },

                 React.createElement("p", { className: "text-[0.6875rem] font-bold text-slate-300 uppercase tracking-wider mb-0.5" }, __alloT('stem.wave.general_formula', 'General Formula')),

                 React.createElement("p", { 'data-wave-governing-formula': 'true', className: "text-sm font-mono font-bold text-cyan-200" }, 

                    govEq.formula

                 )

              ),

              React.createElement("br"),



              (d.matchTarget && d.matchTarget.isEquation) && React.createElement("div", { className: "mb-3 p-2 bg-purple-900/50 rounded-lg border border-purple-500/50 inline-block text-left" },

                  React.createElement("p", { className: "text-[0.6875rem] font-bold text-purple-300 uppercase tracking-wider mb-1" }, __alloT('stem.wave.target_equation', 'Target Equation:')),

                  React.createElement("div", { className: "text-lg font-mono font-bold opacity-90 tracking-tight" }, 

                      renderEq(d.matchTarget.amp, d.matchTarget.freq, true, false)

                  )

              ),

              React.createElement("p", { className: "text-[0.6875rem] font-bold text-slate-300 uppercase tracking-wider mb-1 mt-1 flex justify-center items-center h-4" }, 

                  (d.matchTarget && d.matchTarget.isEquation) ? __alloT('stem.wave.your_equation', 'Your Equation:') : __alloT('stem.wave.current_equation', 'Current Equation:'),

                  (function() {

                    if (!d.matchTarget) return null;

                    var pct = Math.max(0, Math.round((1 - (Math.abs(d.amplitude - d.matchTarget.amp) / d.matchTarget.amp + Math.abs(d.frequency - d.matchTarget.freq) / d.matchTarget.freq) / 2) * 100));

                    return pct > 90 

                      ? React.createElement("span", {className: "text-[0.6875rem] font-bold text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded-full ml-2 lowercase tracking-normal"}, "\u2705 " + pct + __alloT('stem.wave.pct_match', '% match'))

                      : React.createElement("span", {className: "text-[0.6875rem] font-bold text-amber-400 bg-amber-900/50 px-1.5 py-0.5 rounded-full ml-2 lowercase tracking-normal"}, pct + __alloT('stem.wave.pct_match', '% match'));
                  })()

              ),

              React.createElement("div", { className: "text-lg font-mono font-bold tracking-tight" },

                  renderEq(d.amplitude, d.frequency, false, true)

              ),

              React.createElement("p", { 'data-wave-governing-detail': 'true', className: "text-[0.6875rem] text-slate-200 mt-2" }, 

                  govEq.detail

              )

            );
            })(),

            // Info cards

            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-center" },

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase" }, __alloT('stem.wave.card_wavelength', 'Wavelength') + " \u03BB"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, wavelength.toFixed(1) + " m")

              ),

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase" }, __alloT('stem.wave.card_period', 'Period') + " T"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, (1 / d.frequency).toFixed(3) + " s")

              ),

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase" }, __alloT('stem.wave.card_wave_speed', 'Wave Speed') + " v"),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, waveSpeedCalc.toFixed(0) + " m/s")

              ),

              React.createElement("div", { className: "p-3 bg-white rounded-lg border border-cyan-100 shadow-sm" },

                React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase" }, __alloT('stem.wave.card_energy', 'Energy')),

                React.createElement("p", { className: "text-sm font-bold text-cyan-800" }, "\u221D A\u00B2 = " + (d.amplitude * d.amplitude).toFixed(0))

              )

            ),

            // ── Investigate — surfaces the two inquiry widgets buried in the library ──

            React.createElement("div", { className: "mb-3 p-3 rounded-xl border-2 border-indigo-200 flex items-center gap-3 flex-wrap", style: { background: 'var(--allo-stem-panel, #f8fafc)' } },
              React.createElement("span", { className: "text-xl", "aria-hidden": "true" }, '🔬'),
              React.createElement("p", { className: "text-xs text-indigo-800 font-semibold flex-1 min-w-[220px] m-0" + onHostInk }, __alloT('stem.wave.investigate_intro', 'Ready to think like a physicist? Two open-ended investigations — no answer dumps, just you and the data.')),
              React.createElement("button", {
                type: 'button',
                'data-wave-investigate': 'discoverWave',
                style: { minHeight: 44 },
                'aria-label': __alloT('stem.wave.aria_investigate_discover', 'Open the Discover v equals f times lambda interactive inquiry lab'),
                onClick: function () {
                  updPatch({ workspaceTab: d.workspaceTab === 'all' ? 'all' : 'library', expGroup: 'basics', expSection: 'discoverWave' });
                  if (typeof addToast === 'function') addToast('🔬 ' + __alloT('stem.wave.toast_opened_below', 'Opened below — scroll down to the Reference Library'), 'info');
                },
                className: "transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 active:scale-[0.97]"
              }, '🔬 ' + __alloT('stem.wave.btn_discover', 'Discover') + ' f·λ = v'),
              React.createElement("button", {
                type: 'button',
                'data-wave-investigate': 'standingHunt',
                style: { minHeight: 44 },
                'aria-label': __alloT('stem.wave.aria_investigate_hunt', 'Open the Standing-wave hunt interactive inquiry lab'),
                onClick: function () {
                  updPatch({ workspaceTab: d.workspaceTab === 'all' ? 'all' : 'library', expGroup: 'basics', expSection: 'standingHunt' });
                  if (typeof addToast === 'function') addToast('🎯 ' + __alloT('stem.wave.toast_opened_below', 'Opened below — scroll down to the Reference Library'), 'info');
                },
                className: "transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 active:scale-[0.97]"
              }, '🎯 ' + __alloT('stem.wave.btn_standing_hunt', 'Standing-wave hunt'))
            ),

            // ── Wave myths — misconception-busters, each with a live sim demo ──

            (function () {
              var MYTHS = [
                { myth: __alloT('stem.wave.myth1_myth', 'Waves carry water (or air) along with them.'), truth: __alloT('stem.wave.myth1_truth', 'Waves carry ENERGY, not matter. Each bit of the medium oscillates around its home spot and hands the motion on to its neighbor.'), btn: __alloT('stem.wave.myth1_btn', 'Watch the gold tracer'), demo: { waveMode: 'longitudinal' } },
                { myth: __alloT('stem.wave.myth2_myth', 'A bigger (louder) wave travels faster.'), truth: __alloT('stem.wave.myth2_truth', 'Speed is set by the MEDIUM — tension, density, temperature. Cranking amplitude adds energy, not speed: the crests arrive no sooner.'), btn: __alloT('stem.wave.myth2_btn', 'Crank amplitude, watch the speed'), demo: { waveMode: 'free', amplitude: 95 } },
                { myth: __alloT('stem.wave.myth3_myth', 'Sound can travel through empty space.'), truth: __alloT('stem.wave.myth3_truth', 'Sound is matter compressing matter. In a vacuum there is nothing to push, so space is silent. Light is different — EM waves need no medium.'), btn: __alloT('stem.wave.myth3_btn', 'See what sound really is'), demo: { waveMode: 'longitudinal' } },
                { myth: __alloT('stem.wave.myth4_myth', 'When waves cancel, their energy is destroyed.'), truth: __alloT('stem.wave.myth4_truth', 'Energy is never destroyed — it redistributes. The dark bands in the ripple tank sit right next to extra-bright ones; the total stays constant.'), btn: __alloT('stem.wave.myth4_btn', 'Find the dark bands'), demo: { waveMode: 'ripple' } },
                { myth: __alloT('stem.wave.myth5_myth', 'Frequency changes when a wave slows down in a denser medium.'), truth: __alloT('stem.wave.myth5_truth', 'The boundary is driven f times every second, so frequency f stays locked across the boundary — wavelength λ shrinks directly with wave speed v.'), btn: __alloT('stem.wave.myth5_btn', 'Watch λ shrink at the wall'), demo: { waveMode: 'reflection', medium2Ratio: 0.45, reflectivity: 0.4, impedanceCoupled: true } },
                { myth: __alloT('stem.wave.myth6_myth', 'Only a moving siren creates the Doppler effect — moving yourself doesn’t shift pitch.'), truth: __alloT('stem.wave.myth6_truth', 'Any relative motion between source and listener changes how many crests arrive per second. Walk toward a stationary horn and the pitch climbs too!'), btn: __alloT('stem.wave.myth6_btn', 'Move observer toward source'), demo: { waveMode: 'doppler', sourceSpeed: 0.5, observerSpeed: 0.25 } },
                { myth: __alloT('stem.wave.myth7_myth', 'Standing waves have no waves traveling inside them.'), truth: __alloT('stem.wave.myth7_truth', 'A standing wave is literally two identical waves racing left and right at equal speeds whose crests and troughs lock into fixed nodes.'), btn: __alloT('stem.wave.myth7_btn', 'Inspect standing harmonic #3'), demo: { waveMode: 'standing', harmonic: 3, standingBoundary: 'bothFixed' } }
              ];
              var mythsOpen = !!d.mythsOpen;
              var mythTheme = isContrast
                ? { surface: '#000000', border: '#ffff00' }
                : isDark
                  ? { surface: '#2b1633', border: '#e879f9' }
                  : { surface: '#fdf4ff', border: '#f5d0fe' };
              return React.createElement("div", { className: "wave-myths-panel mb-3 rounded-xl border-2 border-fuchsia-200 overflow-hidden", style: { backgroundColor: mythTheme.surface, borderColor: mythTheme.border } },
                React.createElement("style", null, '.theme-dark .wave-myths-panel .text-fuchsia-900{color:#fae8ff!important}.theme-dark .wave-myths-panel .text-fuchsia-700{color:#f5d0fe!important}.theme-dark .wave-myths-panel>button:hover{background:#3f1d49!important}'),
                React.createElement("button", {
                  onClick: function () { upd('mythsOpen', !mythsOpen); },
                  "aria-expanded": mythsOpen,
                  className: "transition-colors w-full flex items-center gap-2 p-3 text-left hover:bg-fuchsia-100/60"
                },
                  React.createElement("span", { className: "text-xl", "aria-hidden": "true" }, '🧠'),
                  React.createElement("span", { className: "text-sm font-black text-fuchsia-900 flex-1" + onHostInk }, __alloT('stem.wave.myths_header', 'Wave myths — test your intuition')),
                  React.createElement("span", { className: "text-xs font-bold text-fuchsia-700" }, mythsOpen ? '▲ ' + __alloT('stem.wave.hide', 'Hide') : '▼ ' + __alloT('stem.wave.show', 'Show'))
                ),
                mythsOpen && React.createElement("div", { className: "px-3 pb-3 grid gap-2 grid-cols-1 md:grid-cols-2" },
                  MYTHS.map(function (m, mi) {
                    return React.createElement("div", { key: 'myth' + mi, className: "p-3 rounded-lg bg-white border border-fuchsia-200" },
                      React.createElement("p", { className: "text-xs font-black text-rose-700 m-0" }, '❌ ' + __alloT('stem.wave.myth_prefix', 'Myth: ') + m.myth),
                      React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed mt-1 mb-2" }, '✅ ' + m.truth),
                      React.createElement("button", {
                        type: 'button',
                        style: { minHeight: 44 },
                        onClick: function () {
                          updPatch(m.demo);
                          if (typeof addToast === 'function') addToast('👀 ' + m.btn, 'info');
                        },
                        className: "transition-colors px-3 py-2 rounded-md text-xs font-bold bg-fuchsia-700 text-white hover:bg-fuchsia-800 active:scale-[0.97]"
                      }, '👀 ' + m.btn)
                    );
                  })
                )
              );
            })(),

            // Quiz

            React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-2" },

              React.createElement("button", { type: 'button', style: { minHeight: 44 }, onClick: function () {

                  var used = (d.quizUsed && d.quizUsed.length < WAVE_QUIZ.length) ? d.quizUsed.slice() : [];
                  var pool = [];
                  for (var qi = 0; qi < WAVE_QUIZ.length; qi++) { if (used.indexOf(qi) === -1) pool.push(qi); }
                  var pick = pool[Math.floor(Math.random() * pool.length)];
                  used.push(pick);
                  var q = WAVE_QUIZ[pick];
                  var opts = q.opts.slice();
                  for (var oi = opts.length - 1; oi > 0; oi--) { var oj = Math.floor(Math.random() * (oi + 1)); var tmpO = opts[oi]; opts[oi] = opts[oj]; opts[oj] = tmpO; }

                  updPatch({
                    quizUsed: used,
                    quiz: { q: q.q, a: q.a, opts: opts, wrongFeedback: q.wrongFeedback, demo: q.demo || null, answered: false, score: ((d.quiz && typeof d.quiz === 'object' && !Array.isArray(d.quiz) && Array.isArray(d.quiz.opts)) && d.quiz.score) || 0, attempted: ((d.quiz && typeof d.quiz === 'object' && !Array.isArray(d.quiz) && Array.isArray(d.quiz.opts)) && d.quiz.attempted) || 0 }
                  });

                }, className: "px-3 py-2 rounded-lg text-xs font-bold " + (d.quiz ? 'bg-cyan-100 text-cyan-800 border border-cyan-400' : 'bg-cyan-700 text-white') + " transition-all"

              }, d.quiz ? "\uD83D\uDD04 " + __alloT('stem.wave.btn_next_question', 'Next Question') : "\uD83E\uDDE0 " + __alloT('stem.wave.btn_quiz_mode', 'Quiz Mode')),

              React.createElement("button", { type: 'button', style: { minHeight: 44 }, onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  updPatch({ matchTarget: { amp: ta, freq: tf, isEquation: false }, matchXpClaimed: false });

                  addToast(t('stem.wave.ud83cudfaf_match_the_yellow_dashed', '🎯 Match the yellow dashed wave!'), 'info');

                }, className: "px-3 py-2 rounded-lg text-xs font-bold " + (d.matchTarget && !d.matchTarget.isEquation ? 'bg-amber-100 text-amber-800 border border-amber-400' : 'bg-amber-700 text-white') + " transition-all"

              }, d.matchTarget && !d.matchTarget.isEquation ? "\uD83D\uDD04 " + __alloT('stem.wave.btn_new_target', 'New Target') : "\uD83C\uDFAF " + __alloT('stem.wave.btn_match_waveform', 'Match Waveform')),

              React.createElement("button", { type: 'button', style: { minHeight: 44 }, onClick: function () {

                  var tAmps = [20, 30, 40, 50, 60, 70];

                  var tFreqs = [1, 2, 3, 4, 5, 6];

                  var ta = tAmps[Math.floor(Math.random() * tAmps.length)];

                  var tf = tFreqs[Math.floor(Math.random() * tFreqs.length)];

                  updPatch({ matchTarget: { amp: ta, freq: tf, isEquation: true }, matchXpClaimed: false });

                  addToast(__alloT('stem.wave.toast_match_equation', 'Match the mathematical equation!'), 'info');

                }, className: "px-3 py-2 rounded-lg text-xs font-bold " + (d.matchTarget && d.matchTarget.isEquation ? 'bg-purple-100 text-purple-800 border border-purple-400' : 'bg-purple-700 text-white') + " transition-all"

              }, (d.matchTarget && d.matchTarget.isEquation) ? "\uD83D\uDD04 " + __alloT('stem.wave.btn_new_equation', 'New Equation') : "\uD83D\uDCDD " + __alloT('stem.wave.btn_match_equation', 'Match Equation')),

              d.matchTarget && React.createElement("button", { type: 'button', style: { minHeight: 44 }, "aria-label": __alloT('stem.wave.btn_clear', 'Clear'),

                onClick: function () { updPatch({ matchTarget: null, matchXpClaimed: false }); },

                className: "transition-colors px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-[0.97]"

              }, "\u2715 " + __alloT('stem.wave.btn_clear', 'Clear')),

              (d.quiz && typeof d.quiz === 'object' && !Array.isArray(d.quiz) && Array.isArray(d.quiz.opts)) && d.quiz.score > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, "\u2B50 " + d.quiz.score + (d.quiz.attempted ? "/" + d.quiz.attempted : "") + __alloT('stem.wave.quiz_correct_suffix', ' correct')),

              React.createElement("button", { type: 'button', 'data-wave-reset-controls': 'true', style: { minHeight: 44 }, "aria-label": __alloT('stem.wave.aria_reset_all', 'Reset all wave controls to their defaults'),
                onClick: function () {
                  updPatch({
                    frequency: 2, amplitude: 50, waveType: 'sine', waveSpeed: 343,
                    speed: 1, showSecond: false, amplitude2: 30, frequency2: 3, phase2: 0,
                    intervalLock: 'none', showBeatEnvelope: false,
                    harmonic: 1, standingBoundary: 'bothFixed',
                    stringMechanics: false, stringTension: 120, stringDensityGm: 3.0,
                    resonatorDriven: false, driveFreqRatio: 1.0, resonatorQ: 20,
                    packetMode: 'continuous', dispersionRatio: 1.0, oceanDepthCoupled: false, waterDepthRatio: 0.5, collidePolarity: 'opposite', longitudinalMode: 'traveling',
                    showDisplacementCurve: false, observerSpeed: 0, dopplerRegime: 'acoustic',
                    distanceAttenuation: false, listenerDistMeters: 4, spreadingLaw: 'spherical',
                    airTempCoupled: false, airTempC: 20,
                    rippleBarrier: 'none', gratingSlits: 4, slitWidth: 0.08, showIntensityScreen: false, showNodalLines: false, ripplePhaseDiff: 0,
                    spectrumFilter: 'none', filterCutoffHarmonic: 3, pluckPosition: 0.5,
                    harmonicWeights: [1, 0, 0, 0, 0, 0], incidentAngleDeg: 0,
                    showTravelingComponents: false, dopplerOffsetAngleDeg: 0,
                    digitalSampling: false, sampleRateRatio: 8, adcBitDepth: 8,
                    damping: false, dampingAlpha: 0.5, sourceSpeed: 0.3,
                    rippleSeparation: 80, dampingCoeff: 0.002, reflectionEnd: 'fixed',
                    reflectivity: 0.9, impedanceCoupled: false, antiReflectionCoating: false, fresnelPolarization: 's',
                    ftirEnabled: false, ftirGapLambda: 0.25,
                    medium2Ratio: 0.6, wallFrac: null, rippleSrc1: null, rippleSrc2: null,
                    probeScopeMode: 'time',
                    showRuler: false, rulerX1: 0.25, rulerX2: 0.75,
                    matchTarget: null, matchXpClaimed: false
                  });
                  syncOsc({ freq: 2, type: 'sine', weights: [1, 0, 0, 0, 0, 0], freq2: 3, spectrumFilter: 'none', filterCutoffHarmonic: 3 });
                  var c = canvasRef._lastCanvas; if (c && c._drag) { c._drag.ripple1 = null; c._drag.ripple2 = null; c._drag.wallX = null; c._drag.ruler1 = null; c._drag.ruler2 = null; }
                  if (typeof addToast === 'function') addToast('\u21BB ' + __alloT('stem.wave.toast_controls_reset', 'Controls reset to defaults'), 'info');
                },
                className: "transition-colors ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:border-slate-500 hover:bg-slate-50 active:scale-[0.97]"
              }, '\u21BB ' + __alloT('stem.wave.btn_reset_controls', 'Reset controls'))

            ),

            (d.quiz && typeof d.quiz === 'object' && !Array.isArray(d.quiz) && Array.isArray(d.quiz.opts)) && React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-3" },

              React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, d.quiz.q),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                d.quiz.opts.map(function (opt) {

                  var isCorrect = opt === d.quiz.a;

                  var wasChosen = d.quiz.chosen === opt;

                  var cls = !d.quiz.answered ? 'transition-colors bg-white border-slate-300 text-slate-900 hover:border-cyan-500' : isCorrect ? 'bg-emerald-100 border-emerald-600 text-emerald-900' : wasChosen ? 'bg-red-100 border-red-600 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-700 opacity-75';

                  return React.createElement("button", { type: 'button', style: { minHeight: 44 }, "aria-label": __alloT('stem.wave.aria_select_answer', 'Select answer: ') + opt,

                    key: opt, disabled: d.quiz.answered, onClick: function () {

                      var correct = opt === d.quiz.a;

                      var fb = correct ? '' : ((d.quiz.wrongFeedback && d.quiz.wrongFeedback[opt]) || (__alloT('stem.wave.quiz_answer_is', 'The answer is ') + d.quiz.a + '.'));

                      var newScore = d.quiz.score + (correct ? 1 : 0);
                      updPatch({
                        quizBestScore: Math.max(d.quizBestScore || 0, newScore),
                        quiz: Object.assign({}, d.quiz, { answered: true, chosen: opt, fb: fb, score: newScore, attempted: (d.quiz.attempted || 0) + 1 })
                      });

                      if (correct) { awardStemXP('wave-quiz', 5, __alloT('stem.wave.xp_wave_quiz', 'Wave quiz: ') + d.quiz.q); }

                      if (!correct && typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_not_quite', 'Not quite. ') + fb);

                      addToast(correct ? '\u2705 ' + __alloT('stem.wave.toast_correct', 'Correct!') : '\u274C ' + __alloT('stem.wave.toast_not_quite_below', 'Not quite \u2014 see why below'), correct ? 'success' : 'error');

                    }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                  }, opt);

                })

              ),

              d.quiz.answered && React.createElement("div", { className: "mt-2 p-2.5 rounded-lg text-xs leading-relaxed " + (d.quiz.chosen === d.quiz.a ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'), role: "status" },
                d.quiz.chosen === d.quiz.a
                  ? '\u2705 ' + __alloT('stem.wave.toast_correct', 'Correct!')
                  : React.createElement(React.Fragment, null,
                      React.createElement("span", { className: "font-bold" }, '\u274C ' + __alloT('stem.wave.feedback_answer_prefix', 'Not quite \u2014 the answer is') + ' \u201C' + d.quiz.a + '\u201D. '),
                      d.quiz.fb
                    ),
                d.quiz.demo && React.createElement("button", {
                  type: 'button',
                  style: { minHeight: 44 },
                  onClick: function () {
                    updPatch(Object.assign({ workspaceTab: 'explore' }, d.quiz.demo));
                    if (typeof addToast === 'function') addToast('\uD83D\uDC40 ' + __alloT('stem.wave.toast_sim_setup', 'Sim set up to demonstrate this \u2014 watch the wave'), 'info');
                  },
                  className: "transition-colors ml-2 px-3 py-2 rounded-md text-xs font-bold bg-white border " + (d.quiz.chosen === d.quiz.a ? 'border-emerald-500 text-emerald-800 hover:bg-emerald-100' : 'border-red-500 text-red-800 hover:bg-red-100') + " active:scale-[0.97]"
                }, '\uD83D\uDC40 ' + __alloT('stem.wave.btn_show_in_sim', 'Show me in the sim'))
              )

            ),

            React.createElement("button", {
              type: 'button',
              'data-wave-snapshot-btn': 'true',
              style: { minHeight: 44 },
              "aria-label": __alloT('stem.wave.aria_save_snapshot', 'Save wave snapshot for comparison and restore'),
              onClick: function () {
                var snapLabel = '[' + waveMode + '] f=' + d.frequency + 'Hz, A=' + d.amplitude + ', v=' + d.waveSpeed + 'm/s';
                var snapPatch = {
                  waveMode: waveMode,
                  waveType: d.waveType || 'sine',
                  frequency: d.frequency,
                  amplitude: d.amplitude,
                  waveSpeed: d.waveSpeed,
                  harmonic: d.harmonic,
                  standingBoundary: d.standingBoundary || 'bothFixed',
                  stringMechanics: !!d.stringMechanics,
                  stringTension: d.stringTension,
                  stringDensityGm: d.stringDensityGm,
                  resonatorDriven: !!d.resonatorDriven,
                  driveFreqRatio: d.driveFreqRatio,
                  resonatorQ: d.resonatorQ,
                  rippleBarrier: d.rippleBarrier || 'none',
                  gratingSlits: d.gratingSlits || 4,
                  showNodalLines: !!d.showNodalLines,
                  ripplePhaseDiff: d.ripplePhaseDiff || 0,
                  medium2Ratio: d.medium2Ratio,
                  incidentAngleDeg: d.incidentAngleDeg || 0,
                  reflectivity: d.reflectivity,
                  impedanceCoupled: !!d.impedanceCoupled,
                  antiReflectionCoating: !!d.antiReflectionCoating,
                  fresnelPolarization: d.fresnelPolarization || 's',
                  ftirEnabled: !!d.ftirEnabled,
                  ftirGapLambda: d.ftirGapLambda,
                  sourceSpeed: d.sourceSpeed,
                  observerSpeed: d.observerSpeed || 0,
                  dopplerRegime: d.dopplerRegime || 'acoustic',
                  packetMode: d.packetMode || 'continuous',
                  dispersionRatio: d.dispersionRatio || 1,
                  oceanDepthCoupled: !!d.oceanDepthCoupled,
                  waterDepthRatio: d.waterDepthRatio,
                  damping: !!d.damping,
                  dampingAlpha: d.dampingAlpha,
                  collidePolarity: d.collidePolarity || 'opposite',
                  longitudinalMode: d.longitudinalMode || 'traveling',
                  distanceAttenuation: !!d.distanceAttenuation,
                  listenerDistMeters: d.listenerDistMeters,
                  spreadingLaw: d.spreadingLaw || 'spherical',
                  airTempCoupled: !!d.airTempCoupled,
                  airTempC: d.airTempC,
                  spectrumFilter: d.spectrumFilter || 'none',
                  filterCutoffHarmonic: d.filterCutoffHarmonic || 3,
                  pluckPosition: d.pluckPosition,
                  showSecond: !!d.showSecond,
                  amplitude2: d.amplitude2,
                  frequency2: d.frequency2,
                  phase2: d.phase2 || 0,
                  intervalLock: d.intervalLock || 'none',
                  showBeatEnvelope: !!d.showBeatEnvelope,
                  showTravelingComponents: !!d.showTravelingComponents,
                  dopplerOffsetAngleDeg: d.dopplerOffsetAngleDeg || 0,
                  digitalSampling: !!d.digitalSampling,
                  sampleRateRatio: d.sampleRateRatio || 8,
                  adcBitDepth: d.adcBitDepth || 8
                };
                var snapId = 'wv-' + Date.now() + '-' + (d.savedSnapshots.length + 1);
                var snapEntry = { id: snapId, label: snapLabel, timestamp: Date.now(), statePatch: snapPatch };
                updPatch(function (cur) {
                  var nextSnaps = (Array.isArray(cur.savedSnapshots) ? cur.savedSnapshots : []).concat([snapEntry]).slice(-8);
                  return { savedSnapshots: nextSnaps };
                });
                if (typeof setToolSnapshots === 'function') {
                  setToolSnapshots(function (prev) { return (Array.isArray(prev) ? prev : []).concat([{ id: snapId, tool: 'wave', label: 'A=' + d.amplitude + ' f=' + d.frequency, data: Object.assign({}, snapPatch), timestamp: snapEntry.timestamp }]); });
                }
                if (typeof addToast === 'function') addToast('\uD83D\uDCF8 ' + __alloT('stem.wave.toast_snapshot_saved', 'Snapshot saved!'), 'success');
              },
              className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-full shadow-md hover:shadow-lg transition-all"
            }, "\uD83D\uDCF8 " + __alloT('stem.wave.snapshot', 'Snapshot')),

            d.savedSnapshots && d.savedSnapshots.length > 0 && React.createElement("div", {
              'data-wave-snapshots-tray': 'true',
              role: 'region',
              'aria-label': __alloT('stem.wave.aria_snapshots_tray', 'Saved wave snapshots comparison and restore tray'),
              className: "mt-3 p-3 rounded-xl border-2 border-indigo-200 bg-white space-y-2 shadow-sm"
            },
              React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                React.createElement("h4", { className: "m-0 text-xs font-black text-indigo-900 uppercase tracking-wide" }, '\uD83D\uDCF8 ' + __alloT('stem.wave.snapshots_tray_title', 'Saved Snapshots (Compare & Restore) — ') + d.savedSnapshots.length + '/8'),
                React.createElement("button", {
                  type: 'button',
                  'data-wave-snapshots-clear': 'true',
                  'aria-label': __alloT('stem.wave.aria_snapshots_clear', 'Clear all saved wave snapshots'),
                  style: { minHeight: 44 },
                  onClick: function () { upd('savedSnapshots', []); },
                  className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-rose-800 border border-rose-300 hover:bg-rose-50 transition-colors"
                }, '\uD83D\uDDD1 ' + __alloT('stem.wave.btn_clear_snapshots', 'Clear All'))
              ),
              React.createElement("div", { className: "space-y-1.5" },
                d.savedSnapshots.map(function (snap) {
                  var diff = waveCompareSnapshot(d, snap);
                  return React.createElement("div", {
                    key: snap.id,
                    'data-wave-snapshot-item': snap.id,
                    className: "p-2 rounded-lg border border-indigo-100 bg-indigo-50/70 flex flex-wrap items-center justify-between gap-2 text-xs"
                  },
                    React.createElement("div", { className: "space-y-0.5" },
                      React.createElement("div", { className: "font-bold text-slate-900" }, snap.label),
                      React.createElement("div", { className: "font-mono text-[0.6875rem] text-indigo-900" },
                        '\u0394f=' + (diff.deltaFreq >= 0 ? '+' : '') + diff.deltaFreq.toFixed(1) + 'Hz · \u0394\u03BB=' + (diff.deltaWavelength >= 0 ? '+' : '') + diff.deltaWavelength.toFixed(1) + 'm · \u0394v=' + (diff.deltaSpeed >= 0 ? '+' : '') + diff.deltaSpeed.toFixed(0) + 'm/s · E ratio=' + diff.energyRatio.toFixed(2) + '\u00D7'
                      )
                    ),
                    React.createElement("div", { className: "flex items-center gap-1.5" },
                      React.createElement("button", {
                        type: 'button',
                        'data-wave-snapshot-restore': snap.id,
                        'aria-label': __alloT('stem.wave.aria_snapshot_restore', 'Restore snapshot: ') + snap.label,
                        style: { minHeight: 44 },
                        onClick: function () {
                          updPatch(Object.assign({}, snap.statePatch));
                          syncOsc({
                            freq: snap.statePatch.frequency,
                            freq2: snap.statePatch.frequency2,
                            type: snap.statePatch.waveType,
                            spectrumFilter: snap.statePatch.spectrumFilter,
                            filterCutoffHarmonic: snap.statePatch.filterCutoffHarmonic
                          });
                          if (typeof addToast === 'function') addToast('\u21BB ' + __alloT('stem.wave.toast_snapshot_restored', 'Restored ') + snap.label, 'success');
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                      }, '\u21BB ' + __alloT('stem.wave.btn_restore', 'Restore')),
                      React.createElement("button", {
                        type: 'button',
                        'data-wave-snapshot-delete': snap.id,
                        'aria-label': __alloT('stem.wave.aria_snapshot_delete', 'Delete snapshot: ') + snap.label,
                        style: { minWidth: 44, minHeight: 44 },
                        onClick: function () {
                          updPatch(function (cur) {
                            return { savedSnapshots: (Array.isArray(cur.savedSnapshots) ? cur.savedSnapshots : []).filter(function (item) { return item.id !== snap.id; }) };
                          });
                        },
                        className: "px-2.5 py-2 rounded-lg text-xs font-bold bg-white text-rose-800 border border-rose-300 hover:bg-rose-50 transition-colors"
                      }, '\u2715')
                    )
                  );
                })
              )
            ),

            // ── AI Wave Tutor (reading-level aware) ──
            (function () {
              if (typeof callGemini !== 'function') return null;
              var aiLevel = d.aiLevel || 'grade5';
              var aiText = typeof d.aiExplain === 'string' ? d.aiExplain : '';
              var aiLoading = !!d.aiLoading;
              var aiError = typeof d.aiError === 'string' ? d.aiError : '';
              var LEVELS = [
                { id: 'plain', label: __alloT('stem.wave.ai_level_plain', 'Plain'), hint: 'using simple everyday words and short sentences' },
                { id: 'grade5', label: __alloT('stem.wave.ai_level_grade5', 'Grade 5'), hint: 'for a 5th grade student, brief and friendly' },
                { id: 'hs', label: __alloT('stem.wave.ai_level_hs', 'High School'), hint: 'for a high school physics student, with appropriate equations' }
              ];
              function explain() {
                if (typeof callGemini !== 'function') { updPatch({ aiError: __alloT('stem.wave.ai_not_available', 'AI tutor not available.') }); return; }
                updPatch({ aiLoading: true, aiError: '', aiExplain: '' });
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                var waveModeCur = d.waveMode || 'free';
                var waveTypeCur = d.waveType || 'sine';
                var modeDetails = 'Wave speed: ' + (d.waveSpeed || 343) + ' m/s, wavelength: ' + waveMetrics.wavelength.toFixed(2) + ' m. ';
                if (waveModeCur === 'standing') modeDetails += 'Harmonic n=' + d.harmonic + ' (' + d.standingBoundary + '), f_n=' + waveMetrics.harmonicFreq.toFixed(1) + ' Hz, ' + waveMetrics.nodesCount + ' nodes. ';
                else if (waveModeCur === 'doppler') modeDetails += 'Source speed Mach ' + d.sourceSpeed.toFixed(2) + ', observer speed ' + (d.observerSpeed || 0).toFixed(2) + ', approaching f\'=' + waveMetrics.approachingFreq.toFixed(1) + ' Hz, receding f\'=' + waveMetrics.recedingFreq.toFixed(1) + ' Hz. ';
                else if (waveModeCur === 'reflection') modeDetails += 'Medium 2 speed ratio v2/v1=' + d.medium2Ratio.toFixed(2) + ', incident angle=' + d.incidentAngleDeg + ' deg, reflectivity R=' + waveMetrics.effectiveReflectivity.toFixed(2) + '. ';
                else if (waveModeCur === 'ripple') modeDetails += 'Barrier=' + d.rippleBarrier + ', phase offset=' + Math.round((d.ripplePhaseDiff || 0) * 180 / Math.PI) + ' deg. ';
                else if (waveModeCur === 'longitudinal') modeDetails += 'Submode=' + d.longitudinalMode + ', sound level=' + waveMetrics.soundLevelDb.toFixed(1) + ' dB. ';
                var uiLangName = '';
                try {
                  var langCode = (ctx && ctx.lang) || (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || '';
                  if (langCode && !/^en\b/i.test(String(langCode).trim()) && typeof Intl !== 'undefined' && Intl.DisplayNames) {
                    uiLangName = new Intl.DisplayNames(['en'], { type: 'language' }).of(String(langCode).trim()) || String(langCode).trim();
                  }
                } catch (e) {}
                var prompt = 'Explain this wave setup ' + lv.hint + '. '
                  + 'Wave mode: ' + waveModeCur + '. Wave type: ' + waveTypeCur + '. Frequency: ' + (d.frequency || 2) + ' Hz. Amplitude: ' + (d.amplitude || 50) + '. '
                  + modeDetails
                  + (d.showSecond ? ('Second wave active: f2=' + d.frequency2 + ' Hz, A2=' + d.amplitude2 + ', beat=' + waveMetrics.beatFreq.toFixed(1) + ' Hz. ') : '')
                  + (d.probeEnabled ? ('Probe at ' + Math.round(d.probeX * 100) + '% reads ' + probeReadout.cyclesFromLeft.toFixed(2) + ' wavelengths. ') : '')
                  + 'In 3 short sentences: (1) What the student is seeing on screen. (2) Which property changes the wave the most (and how). (3) One everyday example of this wave behavior. '
                  + 'No markdown, no bullets, no headings. Plain prose.'
                  + (uiLangName ? (' Write your entire response in ' + uiLangName + '.') : '');
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  updPatch({ aiExplain: String(resp || '').trim(), aiLoading: false });
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.wave.announce_explanation_ready', 'Explanation ready.'));
                }).catch(function () {
                  updPatch({ aiLoading: false, aiError: __alloT('stem.wave.ai_unreachable', 'Could not reach AI tutor. Try again in a moment.') });
                });
              }
              function setAiLevel(id) { upd('aiLevel', id); }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200", role: "region", style: { background: 'var(--allo-stem-panel, #f8fafc)' } },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-800" }, "\u2728 " + __alloT('stem.wave.ai_explain_heading', 'Explain at my level')),
                  React.createElement("div", { className: "ml-auto flex flex-wrap gap-1", role: "group", "aria-label": __alloT('stem.wave.aria_reading_level_group', 'Reading level') },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        type: 'button',
                        style: { minHeight: 44 },
                        onClick: function () { setAiLevel(L.id); },
                        "aria-label": __alloT('stem.wave.aria_reading_level', 'Reading level: ') + L.label + (active ? __alloT('stem.wave.aria_selected', ' (selected)') : ""),
                        "aria-pressed": active,
                        className: "px-3 py-2 rounded text-xs font-bold " + (active ? 'bg-purple-700 text-white' : 'transition-colors bg-white text-purple-800 border border-purple-600 hover:bg-purple-100 active:scale-[0.97]')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    type: 'button',
                    style: { minHeight: 44 },
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": __alloT('stem.wave.aria_generate_at', 'Generate AI explanation at ') + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || __alloT('stem.wave.ai_level_grade5', 'Grade 5')) + __alloT('stem.wave.aria_level_suffix', ' level'),
                    className: "transition-colors px-3 py-2 rounded-lg text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50 active:scale-[0.97]"
                  }, aiLoading ? '\u23F3 ' + __alloT('stem.wave.ai_thinking', 'Thinking...') : (aiText ? '\uD83D\uDD04 ' + __alloT('stem.wave.ai_reexplain', 'Re-explain') : '\uD83E\uDDE0 ' + __alloT('stem.wave.ai_explain', 'Explain')))
                ),
                aiError && React.createElement("p", { className: "text-xs text-rose-700", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-800 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-xs italic text-slate-600" + onHostInk }, __alloT('stem.wave.ai_placeholder', 'Click \u201CExplain\u201D for the AI tutor to describe the current wave at your chosen reading level.'))
              );
            })()

            ), // end showWaveEqAndCards

            // ── Wave Engineering Missions (Missions / All) ──
            showMissionsPanel && (function() {
              var activeMission = WAVE_MISSIONS.find(function(m) { return m.id === d.activeMissionId; }) || WAVE_MISSIONS[0];
              var activeMTitle = activeMission.titleKey ? __alloT(activeMission.titleKey, activeMission.title) : activeMission.title;
              var activeMGoal = activeMission.goalKey ? __alloT(activeMission.goalKey, activeMission.goal) : activeMission.goal;
              var activeMDesc = activeMission.descKey ? __alloT(activeMission.descKey, activeMission.desc) : activeMission.desc;
              return React.createElement("div", {
                'data-wave-missions-panel': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_missions_panel', 'Wave engineering missions'),
                className: "mb-4 rounded-xl border-2 border-amber-300 bg-white p-4 shadow-sm space-y-3"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("div", null,
                    React.createElement("h4", { className: "m-0 text-base font-black text-slate-900" }, '\uD83C\uDFAF ' + __alloT('stem.wave.missions_heading', 'Wave Engineering Missions')),
                    React.createElement("p", { className: "m-0 text-xs text-slate-700" }, __alloT('stem.wave.missions_sub', 'Configure the simulator above to solve each physics challenge, then click Verify Mission.'))
                  ),
                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300" }, completedMissionsCount + ' / ' + WAVE_MISSIONS.length + ' ' + __alloT('stem.wave.missions_done_badge', 'completed'))
                ),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" },
                  WAVE_MISSIONS.map(function(m, idx) {
                    var isDone = !!(d.missionsDone && d.missionsDone[m.id]);
                    var isCur = m.id === activeMission.id;
                    var mTitle = m.titleKey ? __alloT(m.titleKey, m.title) : m.title;
                    return React.createElement("button", {
                      key: m.id,
                      type: 'button',
                      'data-wave-mission-select': m.id,
                      'aria-pressed': isCur,
                      'aria-label': __alloT('stem.wave.aria_select_mission', 'Select mission: ') + mTitle + (isDone ? __alloT('stem.wave.aria_completed', ' (completed)') : ''),
                      style: { minHeight: 44, textAlign: 'left' },
                      onClick: function() { updPatch({ activeMissionId: m.id, missionFeedback: null }); },
                      className: "p-3 rounded-lg border-2 text-xs transition-colors " + (isCur ? 'border-slate-900 bg-slate-900 text-white' : (isDone ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-amber-50'))
                    },
                      React.createElement("div", { className: "font-black flex items-center justify-between gap-1" },
                        React.createElement("span", null, (idx + 1) + '. ' + m.icon + ' ' + mTitle),
                        isDone && React.createElement("span", null, '\u2705')
                      ),
                      React.createElement("div", { className: "mt-1 text-[0.6875rem] " + (isCur ? 'text-slate-200' : 'text-slate-700') }, '+' + m.reward + ' XP')
                    );
                  })
                ),
                React.createElement("div", { className: "p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2" },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                    React.createElement("div", null,
                      React.createElement("div", { className: "text-sm font-black text-amber-950" }, activeMission.icon + ' ' + activeMTitle),
                      React.createElement("p", { className: "text-xs text-slate-800 m-0 mt-0.5" }, activeMDesc),
                      React.createElement("p", { className: "text-xs text-amber-900 italic m-0 mt-0.5" }, '\uD83D\uDCA1 ' + activeMGoal)
                    ),
                    React.createElement("div", { className: "flex flex-wrap gap-2" },
                      React.createElement("button", {
                        type: 'button',
                        'data-wave-mission-starter': 'true',
                        'aria-label': __alloT('stem.wave.aria_load_starter', 'Apply recommended starter setup for this mission'),
                        style: { minHeight: 44 },
                        onClick: function() {
                          updPatch(Object.assign({}, activeMission.setup || {}, { activeMissionId: activeMission.id, missionFeedback: null }));
                          if (typeof addToast === 'function') addToast('\uD83D\uDE80 ' + __alloT('stem.wave.toast_starter_applied', 'Starter setup applied: ') + activeMTitle, 'info');
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
                      }, '\u2699\uFE0F ' + __alloT('stem.wave.btn_load_starter', 'Load Setup')),
                      React.createElement("button", {
                        type: 'button',
                        'data-wave-mission-verify': 'true',
                        'aria-label': __alloT('stem.wave.aria_verify_mission', 'Verify whether current simulator state solves this mission'),
                        style: { minHeight: 44 },
                        onClick: function() {
                          var res = waveEvaluateMission(d, activeMission.id, __alloT);
                          var alreadyDone = !!(d.missionsDone && d.missionsDone[activeMission.id]);
                          updPatch(function(cur) {
                            var nextDone = Object.assign({}, cur.missionsDone || {});
                            if (res.ok) nextDone[res.id] = true;
                            return { missionsDone: nextDone, missionFeedback: { id: res.id, ok: res.ok, msg: res.msg } };
                          });
                          if (res.ok && !alreadyDone && typeof awardStemXP === 'function') awardStemXP('wave-mission-' + res.id, res.reward, __alloT('stem.wave.xp_mission_prefix', 'Mission solved: ') + activeMTitle);
                          if (res.ok && typeof stemCelebrate === 'function') stemCelebrate();
                          if (typeof announceToSR === 'function') announceToSR(res.msg);
                          if (typeof addToast === 'function') addToast((res.ok ? '\u2705 ' : '\u26A0\uFE0F ') + res.msg, res.ok ? 'success' : 'info');
                        },
                        className: "px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
                      }, '\u2713 ' + __alloT('stem.wave.btn_verify_mission', 'Verify Mission'))
                    )
                  ),
                  d.missionFeedback && d.missionFeedback.id === activeMission.id && React.createElement("div", {
                    role: 'status',
                    'data-wave-mission-feedback': d.missionFeedback.ok ? 'pass' : 'fail',
                    className: "p-2.5 rounded-lg text-xs font-bold border " + (d.missionFeedback.ok ? 'bg-emerald-100 border-emerald-400 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900')
                  }, (d.missionFeedback.ok ? '\u2705 ' : '\uD83E\uDDED ') + d.missionFeedback.msg)
                )
              );
            })(),

            // ── Analyze & Experiment Log Panel (Analyze / All) ──
            showAnalyzePanel && (function() {
              var specData = waveComputeSpectrum(d, 6);
              return React.createElement("div", {
                'data-wave-analyze-panel': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_analyze_panel', 'Experiment log and spectral analysis'),
                className: "mb-4 rounded-xl border-2 border-cyan-300 bg-white p-4 shadow-sm space-y-4"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("div", null,
                    React.createElement("h4", { className: "m-0 text-base font-black text-slate-900" }, '\uD83D\uDCCA ' + __alloT('stem.wave.analyze_heading', 'Experiment Log & Data Studio Export')),
                    React.createElement("p", { className: "m-0 text-xs text-slate-700" }, __alloT('stem.wave.analyze_sub', 'Record trials at different frequencies and media, export CSV, or scatter-plot f vs. \u03BB in Data Studio.'))
                  ),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    React.createElement("button", {
                      type: 'button',
                      'data-wave-analyze-log-btn': 'true',
                      'aria-label': __alloT('stem.wave.aria_log_trial_analyze', 'Log current wave parameters to experiment table'),
                      style: { minHeight: 44 },
                      onClick: logWaveTrial,
                      className: "px-3 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                    }, '\uD83D\uDCDD ' + __alloT('stem.wave.btn_log_trial', 'Log Trial')),
                    React.createElement("button", {
                      type: 'button',
                      'data-wave-run-sweep': 'true',
                      'aria-label': __alloT('stem.wave.aria_run_sweep', 'Log a 5-point parametric sweep for the selected Data Studio plot axis'),
                      style: { minHeight: 44 },
                      onClick: runWaveSweep,
                      className: "px-3 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                    }, '\u26A1 ' + __alloT('stem.wave.btn_run_sweep', 'Log 5-Point Sweep')),
                    React.createElement("button", {
                      type: 'button',
                      'data-wave-export-csv': 'true',
                      'aria-label': __alloT('stem.wave.aria_export_csv', 'Export wave experiment log as CSV file'),
                      style: { minHeight: 44 },
                      onClick: exportWaveCsv,
                      className: "px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                    }, '\u2B07 ' + __alloT('stem.wave.btn_export_csv', 'Export CSV')),
                    React.createElement("button", {
                      type: 'button',
                      'data-wave-open-datastudio': 'true',
                      'aria-label': __alloT('stem.wave.aria_open_datastudio', 'Open logged trials in Data Studio scatter plotter'),
                      style: { minHeight: 44 },
                      onClick: openWaveInDataStudio,
                      className: "px-3 py-2 rounded-lg text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800 transition-colors"
                    }, '\uD83D\uDCC8 ' + __alloT('stem.wave.btn_open_datastudio', 'Open in Data Studio')),
                    d.experimentLog.length > 0 && React.createElement("button", {
                      type: 'button',
                      'data-wave-clear-log': 'true',
                      'aria-label': __alloT('stem.wave.aria_clear_log', 'Clear experiment log rows'),
                      style: { minHeight: 44 },
                      onClick: function() { upd('experimentLog', []); },
                      className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 transition-colors"
                    }, '\uD83D\uDDD1 ' + __alloT('stem.wave.btn_clear_log', 'Clear Log'))
                  )
                ),
                React.createElement("div", {
                  role: 'group',
                  'data-wave-ds-plot-group': 'true',
                  'aria-label': __alloT('stem.wave.aria_ds_plot_group', 'Choose Data Studio scatter plot axes'),
                  className: "flex flex-wrap items-center gap-1.5 pt-2 border-t border-cyan-100"
                },
                  React.createElement("span", { className: "text-[0.6875rem] font-black uppercase tracking-wider text-slate-700 mr-1" }, __alloT('stem.wave.ds_axis_label', 'Data Studio Axes:')),
                  [
                    { id: 'freqWavelength', label: __alloT('stem.wave.ds_ax_fl', 'f vs. \u03BB') },
                    { id: 'ampEnergy', label: __alloT('stem.wave.ds_ax_ae', 'A vs. Energy (A\u00B2)') },
                    { id: 'dopplerMach', label: __alloT('stem.wave.ds_ax_dm', 'Mach M vs. f\u2032') },
                    { id: 'snellAngles', label: __alloT('stem.wave.ds_ax_snell', 'Snell \u03B8\u2081 vs. \u03B8\u2082') },
                    { id: 'phasedBeam', label: __alloT('stem.wave.ds_ax_phased', 'Phased \u0394\u03C6 vs. \u03B8\u2080') },
                    { id: 'mersenneTension', label: __alloT('stem.wave.ds_ax_mersenne', 'Mersenne T vs. v') },
                    { id: 'fresnelBrewster', label: __alloT('stem.wave.ds_ax_brewster', 'Fresnel \u03B8\u2081 vs. R (%)') },
                    { id: 'airTempSpeed', label: __alloT('stem.wave.ds_ax_airtemp', 'Air T (\u00B0C) vs. v') },
                    { id: 'resonanceCurve', label: __alloT('stem.wave.ds_ax_resonance', 'Resonator r vs. Gain') },
                    { id: 'ftirTunneling', label: __alloT('stem.wave.ds_ax_ftir', 'FTIR d/\u03BB vs. T (%)') },
                    { id: 'inverseSquareDb', label: __alloT('stem.wave.ds_ax_invsq', 'Dist r vs. dB (1/r\u00B2)') },
                    { id: 'youngFringeSpacing', label: __alloT('stem.wave.ds_ax_young', 'Slit d vs. \u0394y (px)') },
                    { id: 'adcBitSqnr', label: __alloT('stem.wave.ds_ax_adc', 'ADC Bits vs. SQNR (dB)') },
                    { id: 'dopplerOffsetAngle', label: __alloT('stem.wave.ds_ax_dopoff', 'Doppler Angle \u03B8 vs. f\u2032') }
                  ].map(function(ax) {
                    var axAct = (d.dataStudioPlot || 'freqWavelength') === ax.id;
                    return React.createElement("button", {
                      key: ax.id,
                      type: 'button',
                      'data-wave-ds-plot': ax.id,
                      'aria-pressed': axAct,
                      'aria-label': __alloT('stem.wave.aria_ds_axis_btn', 'Set Data Studio axes to ') + ax.label,
                      style: { minHeight: 44 },
                      onClick: function() { upd('dataStudioPlot', ax.id); },
                      className: "px-2.5 py-2 rounded-lg text-xs font-bold transition-colors " + (axAct ? 'bg-cyan-700 text-white shadow-sm' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200')
                    }, ax.label);
                  })
                ),
                d.experimentLog.length === 0
                  ? React.createElement("p", { className: "p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 m-0" }, __alloT('stem.wave.analyze_empty', 'No trials logged yet. Adjust frequency or medium speed above and click Log Trial.'))
                  : (function() {
                      var dsAxisId = WAVE_VALID_DS_PLOTS[d.dataStudioPlot] ? d.dataStudioPlot : 'freqWavelength';
                      var axSpec = getWaveAxisSpec(dsAxisId);
                      var rawPts = d.experimentLog.map(function(row, idx) {
                        var mapped = axSpec.mapRow(row, idx);
                        return { x: Number(mapped.x), y: Number(mapped.value), label: mapped.label };
                      }).filter(function(p) { return isFinite(p.x) && isFinite(p.y); });
                      var plotNode = null;
                      if (rawPts.length >= 2) {
                        var minX = rawPts[0].x, maxX = rawPts[0].x, minY = rawPts[0].y, maxY = rawPts[0].y;
                        var sumX = 0, sumY = 0;
                        rawPts.forEach(function(p) {
                          if (p.x < minX) minX = p.x;
                          if (p.x > maxX) maxX = p.x;
                          if (p.y < minY) minY = p.y;
                          if (p.y > maxY) maxY = p.y;
                          sumX += p.x; sumY += p.y;
                        });
                        var meanX = sumX / rawPts.length;
                        var meanY = sumY / rawPts.length;
                        var ssXX = 0, ssYY = 0, ssXY = 0;
                        rawPts.forEach(function(p) {
                          var dx = p.x - meanX, dy = p.y - meanY;
                          ssXX += dx * dx; ssYY += dy * dy; ssXY += dx * dy;
                        });
                        var slope = ssXX > 0 ? (ssXY / ssXX) : 0;
                        var intercept = meanY - slope * meanX;
                        var r2 = (ssXX > 0 && ssYY > 0) ? Math.min(1, Math.max(0, (ssXY * ssXY) / (ssXX * ssYY))) : 1;
                        var spanX = maxX - minX || 1;
                        var spanY = maxY - minY || 1;
                        var padL = 50, padR = 16, padT = 16, padB = 30;
                        var svgW = 420, svgH = 176;
                        var plotW = svgW - padL - padR;
                        var plotH = svgH - padT - padB;
                        var toSvgX = function(xv) { return padL + ((xv - minX) / spanX) * plotW; };
                        var toSvgY = function(yv) { return padT + plotH - ((yv - minY) / spanY) * plotH; };
                        var ty1 = slope * minX + intercept;
                        var ty2 = slope * maxX + intercept;
                        plotNode = React.createElement("div", { className: "p-3 rounded-xl border border-cyan-200 bg-slate-50 space-y-2" },
                          React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 text-xs" },
                            React.createElement("span", { className: "font-black text-slate-800" }, '\uD83D\uDCC8 ' + axSpec.title),
                            React.createElement("span", {
                              'data-wave-inline-r2': 'true',
                              className: "px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 font-mono font-bold"
                            }, 'R\u00B2 = ' + r2.toFixed(3) + ' (n=' + rawPts.length + ')')
                          ),
                          React.createElement("svg", {
                            'data-wave-inline-plot': 'true',
                            role: 'img',
                            'aria-label': __alloT('stem.wave.aria_inline_plot', 'Scatter plot of logged wave trials showing linear trend and R squared fit'),
                            viewBox: '0 0 ' + svgW + ' ' + svgH,
                            className: "w-full h-44 rounded-lg bg-white border border-slate-200"
                          },
                            React.createElement("line", { x1: padL, y1: padT, x2: padL, y2: padT + plotH, stroke: '#64748b', strokeWidth: 1.5 }),
                            React.createElement("line", { x1: padL, y1: padT + plotH, x2: padL + plotW, y2: padT + plotH, stroke: '#64748b', strokeWidth: 1.5 }),
                            ssXX > 0 && React.createElement("line", {
                              x1: toSvgX(minX), y1: Math.max(padT, Math.min(padT + plotH, toSvgY(ty1))),
                              x2: toSvgX(maxX), y2: Math.max(padT, Math.min(padT + plotH, toSvgY(ty2))),
                              stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,4'
                            }),
                            rawPts.map(function(pt, pi) {
                              return React.createElement("circle", {
                                key: 'pt-' + pi,
                                cx: toSvgX(pt.x),
                                cy: toSvgY(pt.y),
                                r: 4.5,
                                fill: '#0e7490',
                                stroke: '#ffffff',
                                strokeWidth: 1.5
                              });
                            }),
                            React.createElement("text", { x: padL + plotW / 2, y: svgH - 6, textAnchor: 'middle', fill: '#334155', fontSize: 10, fontWeight: 'bold' }, axSpec.xLabel),
                            React.createElement("text", { x: 14, y: padT + plotH / 2, textAnchor: 'middle', fill: '#334155', fontSize: 10, fontWeight: 'bold', transform: 'rotate(-90 14 ' + (padT + plotH / 2) + ')' }, axSpec.yShort)
                          )
                        );
                      }
                      var baseHeaders = ['#', __alloT('stem.wave.col_mode', 'Mode'), __alloT('stem.wave.col_type', 'Type'), 'f (Hz)', 'A', 'v (m/s)', '\u03BB (m)', 'T (s)', __alloT('stem.wave.col_energy', 'Energy')];
                      var extraCols = axSpec.extraCols || [];
                      return React.createElement(React.Fragment, null,
                        plotNode,
                        React.createElement("div", {
                          className: "overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600",
                          tabIndex: 0,
                          role: 'region',
                          'aria-label': __alloT('stem.wave.aria_log_table_scroll', 'Scrollable wave experiment log table')
                        },
                          React.createElement("table", { 'data-wave-log-table': 'true', className: "min-w-full text-xs border-collapse border border-slate-200" },
                            React.createElement("thead", null,
                              React.createElement("tr", { className: "bg-slate-100" },
                                baseHeaders.concat(extraCols.map(function(c) { return c.hdr; })).map(function(hdr) {
                                  return React.createElement("th", { key: hdr, scope: 'col', className: "px-2.5 py-2 text-left font-black text-slate-800 border-b border-slate-300" }, hdr);
                                })
                              )
                            ),
                            React.createElement("tbody", null,
                              d.experimentLog.map(function(row, rIdx) {
                                return React.createElement("tr", { key: row.id || rIdx, className: rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono font-bold text-slate-800" }, row.n),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-semibold text-slate-800" }, row.mode),
                                  React.createElement("td", { className: "px-2.5 py-1.5 text-slate-700" }, row.waveType),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono text-cyan-800 font-bold" }, row.frequency),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono text-slate-800" }, row.amplitude),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono text-slate-800" }, row.waveSpeed),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono text-emerald-800 font-bold" }, row.wavelength.toFixed(2)),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono text-slate-800" }, row.period.toFixed(3)),
                                  React.createElement("td", { className: "px-2.5 py-1.5 font-mono text-slate-800" }, Math.round(row.energy)),
                                  extraCols.map(function(c, ci) {
                                    return React.createElement("td", { key: 'ex-' + ci, className: "px-2.5 py-1.5 font-mono text-indigo-800 font-bold" }, c.render(row));
                                  })
                                );
                              })
                            )
                          )
                        )
                      );
                    })(),
                React.createElement("div", { className: "pt-2 border-t border-slate-200" },
                  React.createElement("h5", { className: "text-xs font-black uppercase tracking-wide text-slate-800 mb-2" }, __alloT('stem.wave.spectrum_table_heading', 'Live Harmonic Spectrum Components (') + activeWaveType + ')'),
                  React.createElement("div", { 'data-wave-spectrum-summary': 'true', className: "flex flex-wrap gap-2 mb-2 text-xs" },
                    React.createElement("span", { className: "px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-300 font-bold" },
                      __alloT('stem.wave.spec_centroid', 'Spectral Centroid: ') + specData.spectralCentroidHz.toFixed(2) + ' Hz'
                    ),
                    React.createElement("span", { className: "px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-300 font-bold" },
                      __alloT('stem.wave.spec_thd', 'THD: ') + specData.thdPct.toFixed(1) + '%'
                    )
                  ),
                  React.createElement("div", {
                    className: "overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600",
                    tabIndex: 0,
                    role: 'region',
                    'aria-label': __alloT('stem.wave.aria_spectrum_table_scroll', 'Scrollable harmonic spectrum table')
                  },
                    React.createElement("table", { className: "min-w-full text-xs border-collapse border border-slate-200" },
                      React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-100" },
                          [__alloT('stem.wave.col_harmonic', 'Component'), __alloT('stem.wave.col_freq_hz', 'Frequency (Hz)'), __alloT('stem.wave.col_rel_amp', 'Fourier Amplitude')].map(function(sh) {
                            return React.createElement("th", { key: sh, scope: 'col', className: "px-2.5 py-1.5 text-left font-black text-slate-800 border-b border-slate-300" }, sh);
                          })
                        )
                      ),
                      React.createElement("tbody", null,
                        specData.harmonics.map(function(hm) {
                          return React.createElement("tr", { key: 'hm-' + hm.order, className: hm.order % 2 === 1 ? 'bg-white' : 'bg-slate-50' },
                            React.createElement("td", { className: "px-2.5 py-1 font-bold text-slate-800" }, hm.order + 'f\u2081'),
                            React.createElement("td", { className: "px-2.5 py-1 font-mono text-cyan-800" }, hm.freq.toFixed(1) + ' Hz'),
                            React.createElement("td", { className: "px-2.5 py-1 font-mono text-slate-800" }, hm.mag.toFixed(3))
                          );
                        }),
                        specData.secondComponent && React.createElement("tr", { className: "bg-pink-50" },
                          React.createElement("td", { className: "px-2.5 py-1 font-bold text-pink-900" }, 'Wave 2 (f\u2082)'),
                          React.createElement("td", { className: "px-2.5 py-1 font-mono text-pink-900" }, specData.secondComponent.freq.toFixed(1) + ' Hz'),
                          React.createElement("td", { className: "px-2.5 py-1 font-mono text-pink-900 font-bold" }, specData.secondComponent.relAmp.toFixed(2) + '\u00D7 A\u2081')
                        )
                      )
                    )
                  )
                )
              );
            })(),

            // ── CER Notebook & Cross-Tool Bridges (Notebook / All) ──
            showNotebookPanel && (function() {
              var activeCer = WAVE_CER_PROMPTS.find(function(p) { return p.id === d.cerPromptId; }) || WAVE_CER_PROMPTS[0];
              var activeCerTitle = activeCer.titleKey ? __alloT(activeCer.titleKey, activeCer.title) : activeCer.title;
              var activeCerStarter = activeCer.starterKey ? __alloT(activeCer.starterKey, activeCer.starter) : activeCer.starter;
              return React.createElement("div", {
                'data-wave-notebook-panel': 'true',
                role: 'region',
                'aria-label': __alloT('stem.wave.aria_notebook_panel', 'CER investigation notebook and cross-tool bridges'),
                className: "mb-4 rounded-xl border-2 border-indigo-300 bg-white p-4 shadow-sm space-y-4"
              },
                React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                  React.createElement("div", null,
                    React.createElement("h4", { className: "m-0 text-base font-black text-slate-900" }, '\uD83D\uDCDD ' + __alloT('stem.wave.cer_heading', 'Claim \u2022 Evidence \u2022 Reasoning Notebook')),
                    React.createElement("p", { className: "m-0 text-xs text-slate-700" }, activeCerTitle)
                  ),
                  React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                    WAVE_CER_PROMPTS.map(function(cp) {
                      var cpAct = cp.id === activeCer.id;
                      var cpTitle = cp.titleKey ? __alloT(cp.titleKey, cp.title) : cp.title;
                      return React.createElement("button", {
                        key: cp.id,
                        type: 'button',
                        'aria-pressed': cpAct,
                        'aria-label': __alloT('stem.wave.aria_cer_prompt', 'Select CER prompt: ') + cpTitle,
                        style: { minHeight: 44 },
                        onClick: function() { upd('cerPromptId', cp.id); },
                        className: "px-3 py-2 rounded-lg text-xs font-bold transition-colors " + (cpAct ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-indigo-50')
                      }, cpTitle);
                    })
                  )
                ),
                React.createElement("div", { className: "grid grid-cols-1 gap-3" },
                  [
                    { k: 'cerClaim', label: __alloT('stem.wave.cer_claim_label', 'Claim (one clear scientific statement)'), ph: activeCerStarter },
                    { k: 'cerEvidence', label: __alloT('stem.wave.cer_evidence_label', 'Evidence (exact numbers, probe readings, or trial observations)'), ph: __alloT('stem.wave.cer_evidence_ph', 'Cite frequency, wavelength, path difference, or reflected/transmitted percentages...') },
                    { k: 'cerReasoning', label: __alloT('stem.wave.cer_reasoning_label', 'Reasoning (physics law linking your evidence to your claim)'), ph: __alloT('stem.wave.cer_reasoning_ph', 'Explain WHY your numbers support the claim using v = f\u03BB, superposition, or phase shifts...') }
                  ].map(function(field) {
                    return React.createElement("div", { key: field.k },
                      React.createElement("label", { htmlFor: 'wave-' + field.k, className: "block text-xs font-bold text-slate-800 mb-1" }, field.label),
                      React.createElement("textarea", {
                        id: 'wave-' + field.k,
                        rows: 2,
                        value: d[field.k],
                        placeholder: field.ph,
                        'aria-label': field.label,
                        onChange: function(e) { upd(field.k, e.target.value); },
                        className: "w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300"
                      })
                    );
                  })
                ),
                React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-cer-insert': 'true',
                    'aria-label': __alloT('stem.wave.aria_cer_insert', 'Insert live wave measurements into Evidence box'),
                    style: { minHeight: 44 },
                    onClick: function() {
                      var snippet = waveBuildCerEvidence(d);
                      upd('cerEvidence', (d.cerEvidence ? (d.cerEvidence + '\n') : '') + snippet);
                      if (typeof addToast === 'function') addToast('\uD83D\uDCCB ' + __alloT('stem.wave.toast_inserted_evidence', 'Live telemetry added to Evidence'), 'info');
                    },
                    className: "px-3 py-2 rounded-lg text-xs font-bold bg-white text-indigo-800 border border-indigo-400 hover:bg-indigo-50 transition-colors"
                  }, '\uD83D\uDCCB ' + __alloT('stem.wave.btn_cer_insert', 'Insert Live Data into Evidence')),
                  React.createElement("button", {
                    type: 'button',
                    'data-wave-cer-save': 'true',
                    'aria-label': __alloT('stem.wave.aria_cer_save', 'Check and save CER scientific explanation'),
                    style: { minHeight: 44 },
                    onClick: function() {
                      var okCer = d.cerClaim.trim().length >= 10 && d.cerEvidence.trim().length >= 10 && d.cerReasoning.trim().length >= 10;
                      if (okCer) {
                        updPatch({});
                        if (typeof awardStemXP === 'function') awardStemXP('wave-cer', 15, __alloT('stem.wave.xp_cer_saved', 'Completed CER wave explanation!'));
                        if (typeof addToast === 'function') addToast('\u2705 ' + __alloT('stem.wave.toast_cer_saved', 'CER investigation saved and mastery badge unlocked!'), 'success');
                      } else {
                        if (typeof addToast === 'function') addToast('\u26A0\uFE0F ' + __alloT('stem.wave.toast_cer_short', 'Write at least 10 characters in Claim, Evidence, and Reasoning.'), 'info');
                      }
                    },
                    className: "px-4 py-2 rounded-lg text-xs font-bold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                  }, '\u2713 ' + __alloT('stem.wave.btn_cer_save', 'Save CER Entry'))
                ),
                React.createElement("div", {
                  'data-wave-bridges': 'true',
                  className: "pt-3 border-t border-slate-200 space-y-2"
                },
                  React.createElement("h5", { className: "text-xs font-black uppercase tracking-wide text-slate-800 m-0" }, '\uD83D\uDD17 ' + __alloT('stem.wave.bridges_heading', 'Cross-Tool STEM Bridges')),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    [
                      { id: 'opticsLab', label: '\uD83D\uDD26 ' + __alloT('stem.wave.bridge_optics', 'Optics Lab (Refraction & Lenses)'), fn: function() {
                        var opPatch;
                        if (waveMode === 'reflection') {
                          var n2Opt = Math.max(1.0, Math.min(2.5, Math.round((1.0 / Math.max(0.15, d.medium2Ratio || 0.6)) * 1000) / 1000));
                          opPatch = { mode: 'refraction', refrN1: 1.0, refrN2: n2Opt, refrTheta1: d.incidentAngleDeg > 0 ? Math.round(d.incidentAngleDeg) : 30 };
                        } else if (waveMode === 'ripple' && d.rippleBarrier === 'singleSlit') {
                          opPatch = { mode: 'diffraction', diffMode: 'single', diffSlitWidth: Math.round(Math.max(10, Math.min(80, (d.slitWidth || 0.08) * 400))) };
                        } else {
                          opPatch = { mode: 'interference', intSlitSep: Math.max(0.02, Math.min(0.4, Math.round((0.05 + ((d.rippleSeparation || 80) - 30) * 0.002) * 100) / 100)) };
                        }
                        if (typeof setLabToolData === 'function') {
                          setLabToolData(function(prev) {
                            return Object.assign({}, prev, { opticsLab: Object.assign({}, (prev && prev.opticsLab) || {}, opPatch) });
                          });
                        }
                        if (typeof setStemLabTool === 'function') setStemLabTool('opticsLab');
                      } },
                      { id: 'musicSynth', label: '\uD83C\uDFB9 ' + __alloT('stem.wave.bridge_music', 'Music Synth (Harmonics & Pitch)'), fn: function() {
                        var musicWave = (activeWaveType === 'square' || activeWaveType === 'sawtooth' || activeWaveType === 'triangle') ? activeWaveType : 'sine';
                        if (typeof setLabToolData === 'function') {
                          setLabToolData(function(prev) {
                            return Object.assign({}, prev, { musicSynth: Object.assign({}, (prev && prev.musicSynth) || {}, { synthTab: 'play', synthEngine: (waveMode === 'standing' ? 'plucked' : 'standard'), waveType: musicWave }) });
                          });
                        }
                        if (typeof setStemLabTool === 'function') setStemLabTool('musicSynth');
                      } },
                      { id: 'physics', label: '\uD83C\uDFAF ' + __alloT('stem.wave.bridge_physics', 'Projectile Lab (Motion & Graphs)'), fn: function() { if (typeof setStemLabTool === 'function') setStemLabTool('physics'); } },
                      { id: 'dataStudio', label: '\uD83D\uDCCA ' + __alloT('stem.wave.bridge_datastudio', 'Data Studio (Scatter Plot f vs \u03BB)'), fn: openWaveInDataStudio }
                    ].map(function(br) {
                      return React.createElement("button", {
                        key: br.id,
                        type: 'button',
                        'data-wave-bridge': br.id,
                        'aria-label': __alloT('stem.wave.aria_open_bridge', 'Open connected tool: ') + br.label,
                        style: { minHeight: 44 },
                        onClick: br.fn,
                        className: "px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-900 border border-slate-300 hover:bg-cyan-50 hover:border-cyan-400 transition-colors"
                      }, br.label);
                    })
                  )
                )
              );
            })()

          )
      })();

      // ═══════════════════════════════════════════════════════════════════
      // WAVE EXPANSION SECTIONS — interactive reference library (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      var d2 = waveNormalizeState(labToolData && labToolData.wave, gradeLevel);
      var expSection = d2.expSection || null;
      var showLibrary = d2.workspaceTab === 'explore' || d2.workspaceTab === 'library' || d2.workspaceTab === 'all';
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = waveNormalizeState(prev && prev.wave, gradeLevel);
          var merged = waveNormalizeState(Object.assign({}, prior, patch), gradeLevel);
          merged.waveMastery = waveSyncMasterySlot(waveComputeMastery(merged));
          return Object.assign({}, prev, { wave: merged });
        });
      }

      function renderTryInSimBtn(simId, labelText, patchObj) {
        return React.createElement('button', {
          type: 'button',
          'data-wave-try-sim': simId,
          style: { minHeight: 44 },
          'aria-label': __alloT('stem.wave.aria_try_in_sim', 'Load into live wave simulator: ') + labelText,
          onClick: function () {
            setExp(Object.assign({ workspaceTab: 'explore', paused: false }, patchObj));
            if (typeof addToast === 'function') addToast('\u25B6 ' + labelText, 'info');
          },
          className: 'mt-2 px-3 py-2 rounded-lg text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800 transition-colors inline-flex items-center gap-1.5'
        }, '\u25B6 ' + __alloT('stem.wave.btn_try_in_sim', 'Try in Simulator') + ' \u2014 ' + labelText);
      }

      // ── Reference data ──
      var WAVE_TYPES = [
        { name: __alloT('stem.wave.wt_transverse_name', 'Transverse'), icon: '⤴', desc: __alloT('stem.wave.wt_transverse_desc', 'Particle motion perpendicular to wave direction. Crests + troughs.'), examples: [__alloT('stem.wave.wt_transverse_ex1', 'Light + all EM waves'), __alloT('stem.wave.wt_transverse_ex2', 'String wave'), __alloT('stem.wave.wt_transverse_ex3', 'Surface water waves (mostly)'), __alloT('stem.wave.wt_transverse_ex4', 'S-waves in earthquakes')], speed: __alloT('stem.wave.wt_transverse_speed', 'Varies by medium') },
        { name: __alloT('stem.wave.wt_longitudinal_name', 'Longitudinal (compressional)'), icon: '⤇', desc: __alloT('stem.wave.wt_longitudinal_desc', 'Particle motion parallel to wave direction. Compressions + rarefactions.'), examples: [__alloT('stem.wave.wt_longitudinal_ex1', 'Sound waves in air'), __alloT('stem.wave.wt_longitudinal_ex2', 'Slinky push-pull'), __alloT('stem.wave.wt_longitudinal_ex3', 'P-waves in earthquakes'), __alloT('stem.wave.wt_longitudinal_ex4', 'Ultrasound')], speed: __alloT('stem.wave.wt_longitudinal_speed', '~343 m/s sound in air at 20°C') },
        { name: __alloT('stem.wave.wt_surface_name', 'Surface (Rayleigh)'), icon: '〰', desc: __alloT('stem.wave.wt_surface_desc', 'Particles trace elliptical paths. Combines transverse + longitudinal.'), examples: [__alloT('stem.wave.wt_surface_ex1', 'Ocean surface waves'), __alloT('stem.wave.wt_surface_ex2', 'Rayleigh waves in earthquakes')], speed: __alloT('stem.wave.wt_surface_speed', 'Depends on water depth + λ') },
        { name: __alloT('stem.wave.wt_em_name', 'Electromagnetic'), icon: '⚡', desc: __alloT('stem.wave.wt_em_desc', 'Oscillating electric + magnetic fields. No medium needed (travel through vacuum).'), examples: [__alloT('stem.wave.wt_em_ex1', 'Visible light'), __alloT('stem.wave.wt_em_ex2', 'Radio'), __alloT('stem.wave.wt_em_ex3', 'X-rays'), __alloT('stem.wave.wt_em_ex4', 'Microwaves'), __alloT('stem.wave.wt_em_ex5', 'IR / UV')], speed: __alloT('stem.wave.wt_em_speed', 'c = 3.0 × 10⁸ m/s in vacuum') },
        { name: __alloT('stem.wave.wt_matter_name', 'Matter waves (de Broglie)'), icon: 'λ', desc: __alloT('stem.wave.wt_matter_desc', 'All matter has wave properties. λ = h/p. Observable for electrons + atoms.'), examples: [__alloT('stem.wave.wt_matter_ex1', 'Electron diffraction'), __alloT('stem.wave.wt_matter_ex2', 'Neutron scattering'), __alloT('stem.wave.wt_matter_ex3', 'Atom interferometry')], speed: __alloT('stem.wave.wt_matter_speed', 'Particle velocity (not wave)') },
        { name: __alloT('stem.wave.wt_gravitational_name', 'Gravitational waves'), icon: '⊕', desc: __alloT('stem.wave.wt_gravitational_desc', 'Ripples in spacetime from accelerating masses. First detected 2015 (LIGO).'), examples: [__alloT('stem.wave.wt_gravitational_ex1', 'Black hole + neutron star mergers'), __alloT('stem.wave.wt_gravitational_ex2', 'Predicted by Einstein 1915')], speed: __alloT('stem.wave.wt_gravitational_speed', 'c (speed of light)') }
      ];

      var WAVE_QUANTITIES = [
        { sym: 'λ', name: __alloT('stem.wave.wq_wavelength_name', 'Wavelength'), units: __alloT('stem.wave.wq_wavelength_units', 'm (meters)'), def: __alloT('stem.wave.wq_wavelength_def', 'Distance between two successive crests (or troughs). Crest-to-crest.') },
        { sym: 'f', name: __alloT('stem.wave.wq_frequency_name', 'Frequency'), units: __alloT('stem.wave.wq_frequency_units', 'Hz (1/s)'), def: __alloT('stem.wave.wq_frequency_def', 'Cycles per second. How many wave peaks pass a point per second.') },
        { sym: 'T', name: __alloT('stem.wave.wq_period_name', 'Period'), units: __alloT('stem.wave.wq_period_units', 's (seconds)'), def: __alloT('stem.wave.wq_period_def', 'Time for one complete cycle. T = 1/f.') },
        { sym: 'A', name: __alloT('stem.wave.wq_amplitude_name', 'Amplitude'), units: __alloT('stem.wave.wq_amplitude_units', 'm (or whatever the wave displaces)'), def: __alloT('stem.wave.wq_amplitude_def', 'Maximum displacement from equilibrium. Carries energy; intensity ∝ A².') },
        { sym: 'v', name: __alloT('stem.wave.wq_wavespeed_name', 'Wave speed'), units: 'm/s', def: __alloT('stem.wave.wq_wavespeed_def', 'How fast the wave moves through the medium. v = fλ.') },
        { sym: 'k', name: __alloT('stem.wave.wq_wavenumber_name', 'Wave number'), units: __alloT('stem.wave.wq_wavenumber_units', '1/m (or rad/m)'), def: __alloT('stem.wave.wq_wavenumber_def', 'k = 2π/λ. Spatial frequency. Useful in y = A·sin(kx − ωt).') },
        { sym: 'ω', name: __alloT('stem.wave.wq_angfreq_name', 'Angular frequency'), units: 'rad/s', def: __alloT('stem.wave.wq_angfreq_def', 'ω = 2πf. Used in trigonometric wave equations.') },
        { sym: 'φ', name: __alloT('stem.wave.wq_phase_name', 'Phase'), units: __alloT('stem.wave.wq_phase_units', 'rad (or degrees)'), def: __alloT('stem.wave.wq_phase_def', 'Position within a cycle. Two waves in phase: peaks align (constructive); out of phase by π: peaks meet troughs (destructive).') }
      ];

      var INTERFERENCE_PATTERNS = [
        { type: __alloT('stem.wave.ip_constructive_type', 'Constructive'), icon: '+', condition: 'Δφ = 0, 2π, 4π... (path diff = mλ)', result: __alloT('stem.wave.ip_constructive_result', 'Amplitudes ADD. Bright fringe (light), loud point (sound), large displacement.') },
        { type: __alloT('stem.wave.ip_destructive_type', 'Destructive'), icon: '−', condition: 'Δφ = π, 3π, 5π... (path diff = (m+½)λ)', result: __alloT('stem.wave.ip_destructive_result', 'Amplitudes CANCEL. Dark fringe, quiet point, no displacement.') },
        { type: __alloT('stem.wave.ip_partial_type', 'Partial'), icon: '~', condition: 'Other Δφ values', result: __alloT('stem.wave.ip_partial_result', 'Partial reinforcement or cancellation. Wave appears with intermediate amplitude.') }
      ];

      var DOPPLER_CASES = [
        { case: __alloT('stem.wave.dc_toward_case', 'Source moving toward you'), effect: __alloT('stem.wave.dc_obs_higher', 'f observed > f emitted'), detail: __alloT('stem.wave.dc_toward_detail', 'Wavefronts bunch up in front. Higher pitch (sound) / blueshift (light).') },
        { case: __alloT('stem.wave.dc_away_case', 'Source moving away'), effect: __alloT('stem.wave.dc_obs_lower', 'f observed < f emitted'), detail: __alloT('stem.wave.dc_away_detail', 'Wavefronts spread out behind. Lower pitch / redshift.') },
        { case: __alloT('stem.wave.dc_obs_toward_case', 'Observer moving toward source'), effect: __alloT('stem.wave.dc_obs_higher', 'f observed > f emitted'), detail: __alloT('stem.wave.dc_obs_toward_detail', 'You meet wavefronts faster. Higher apparent frequency.') },
        { case: __alloT('stem.wave.dc_obs_away_case', 'Observer moving away'), effect: __alloT('stem.wave.dc_obs_lower', 'f observed < f emitted'), detail: __alloT('stem.wave.dc_obs_away_detail', 'Wavefronts catch up to you slower.') },
        { case: __alloT('stem.wave.dc_both_case', 'Both moving same direction, same speed'), effect: __alloT('stem.wave.dc_no_shift', 'No Doppler shift'), detail: __alloT('stem.wave.dc_both_detail', 'Relative velocity zero between source + observer.') },
        { case: __alloT('stem.wave.dc_barrier_case', 'Source at sound barrier (v_source ≥ v_sound)'), effect: __alloT('stem.wave.dc_sonic_boom', 'Sonic boom (Mach cone)'), detail: __alloT('stem.wave.dc_barrier_detail', 'Wavefronts stack on top of each other. Cone of compression follows the source.') }
      ];

      var EM_SPECTRUM = [
        { name: __alloT('stem.wave.em_radio_name', 'Radio'), λ: '1 mm – 100 km', f: '3 Hz – 300 GHz', energy: __alloT('stem.wave.em_radio_energy', 'Very low'), uses: __alloT('stem.wave.em_radio_uses', 'Broadcasting, communication, MRI') },
        { name: __alloT('stem.wave.em_microwave_name', 'Microwave'), λ: '1 mm – 1 m', f: '300 MHz – 300 GHz', energy: __alloT('stem.wave.em_microwave_energy', 'Low'), uses: __alloT('stem.wave.em_microwave_uses', 'Cooking (water rotation), radar, WiFi, satellite') },
        { name: __alloT('stem.wave.em_ir_name', 'Infrared (IR)'), λ: '700 nm – 1 mm', f: '300 GHz – 430 THz', energy: __alloT('stem.wave.em_ir_energy', 'Low-mid'), uses: __alloT('stem.wave.em_ir_uses', 'Thermal imaging, TV remotes, fiber optics') },
        { name: __alloT('stem.wave.em_visible_name', 'Visible light'), λ: '380 – 700 nm', f: '430 – 790 THz', energy: __alloT('stem.wave.em_visible_energy', 'Mid'), uses: __alloT('stem.wave.em_visible_uses', 'Vision, photosynthesis, photography') },
        { name: __alloT('stem.wave.em_uv_name', 'Ultraviolet (UV)'), λ: '10 – 380 nm', f: '790 THz – 30 PHz', energy: __alloT('stem.wave.em_uv_energy', 'High'), uses: __alloT('stem.wave.em_uv_uses', 'Sterilization, fluorescence, Vit D synthesis') },
        { name: __alloT('stem.wave.em_xray_name', 'X-ray'), λ: '0.01 – 10 nm', f: '30 PHz – 30 EHz', energy: __alloT('stem.wave.em_xray_energy', 'Very high'), uses: __alloT('stem.wave.em_xray_uses', 'Medical imaging, crystallography, security scanners') },
        { name: __alloT('stem.wave.em_gamma_name', 'Gamma ray'), λ: '< 0.01 nm', f: '> 30 EHz', energy: __alloT('stem.wave.em_gamma_energy', 'Extreme'), uses: __alloT('stem.wave.em_gamma_uses', 'Cancer treatment, sterilization, astronomy (most energetic photons)') }
      ];

      var VISIBLE_COLORS = [
        { color: __alloT('stem.wave.vc_violet', 'Violet'), λnm: '380–450', f: '670–790 THz', hex: '#7c3aed', notes: __alloT('stem.wave.vc_violet_notes', 'Highest-energy visible. Just below UV.') },
        { color: __alloT('stem.wave.vc_blue', 'Blue'), λnm: '450–485', f: '620–670 THz', hex: '#2563eb', notes: __alloT('stem.wave.vc_blue_notes', 'Sky color (Rayleigh scattering favors short λ).') },
        { color: __alloT('stem.wave.vc_cyan', 'Cyan'), λnm: '485–500', f: '600–620 THz', hex: '#0891b2', notes: __alloT('stem.wave.vc_cyan_notes', 'Bright in shallow water.') },
        { color: __alloT('stem.wave.vc_green', 'Green'), λnm: '500–565', f: '530–600 THz', hex: '#16a34a', notes: __alloT('stem.wave.vc_green_notes', 'Peak photopic eye sensitivity (~555 nm).') },
        { color: __alloT('stem.wave.vc_yellow', 'Yellow'), λnm: '565–590', f: '510–530 THz', hex: '#eab308', notes: __alloT('stem.wave.vc_yellow_notes', 'Sodium lamp emission (589 nm doublet).') },
        { color: __alloT('stem.wave.vc_orange', 'Orange'), λnm: '590–625', f: '480–510 THz', hex: '#ea580c', notes: __alloT('stem.wave.vc_orange_notes', 'Sunset enhances reds + oranges via scattering.') },
        { color: __alloT('stem.wave.vc_red', 'Red'), λnm: '625–700', f: '430–480 THz', hex: '#dc2626', notes: __alloT('stem.wave.vc_red_notes', 'Lowest-energy visible. Just above IR.') }
      ];

      var HARMONICS = [
        { mode: __alloT('stem.wave.harm_fundamental_mode', 'Fundamental (1st)'), nodes: '2 (ends)', f: 'f₁', desc: __alloT('stem.wave.harm_fundamental_desc', 'Lowest mode. One antinode in the middle.') },
        { mode: __alloT('stem.wave.harm_2nd_mode', '2nd harmonic'), nodes: '3', f: '2 f₁', desc: __alloT('stem.wave.harm_2nd_desc', 'One full wavelength fits in the string length.') },
        { mode: __alloT('stem.wave.harm_3rd_mode', '3rd harmonic'), nodes: '4', f: '3 f₁', desc: __alloT('stem.wave.harm_3rd_desc', 'Three half-wavelengths fit. Common in plucked strings.') },
        { mode: __alloT('stem.wave.harm_4th_mode', '4th harmonic'), nodes: '5', f: '4 f₁', desc: __alloT('stem.wave.harm_4th_desc', 'Even integer; less common in stringed instruments tuned to fundamental.') },
        { mode: __alloT('stem.wave.harm_nth_mode', 'nth harmonic'), nodes: 'n+1', f: 'n f₁', desc: __alloT('stem.wave.harm_nth_desc', 'General formula. Higher harmonics give timbre / character to a note.') }
      ];

      var WAVE_FORMULAS = [
        { eq: 'v = f · λ', purpose: __alloT('stem.wave.wf_speed', 'Wave speed from frequency + wavelength') },
        { eq: 'T = 1 / f', purpose: __alloT('stem.wave.wf_period', 'Period and frequency are reciprocals') },
        { eq: 'y(x,t) = A · sin(kx − ωt + φ)', purpose: __alloT('stem.wave.wf_sinusoidal', 'Standard sinusoidal traveling wave') },
        { eq: 'k = 2π / λ', purpose: __alloT('stem.wave.wf_wavenumber', 'Wave number ↔ wavelength') },
        { eq: 'ω = 2π f', purpose: __alloT('stem.wave.wf_angfreq', 'Angular frequency ↔ frequency') },
        { eq: 'Intensity ∝ A²', purpose: __alloT('stem.wave.wf_intensity', 'Energy/area carried by wave grows as square of amplitude') },
        { eq: 'n₁ sin θ₁ = n₂ sin θ₂', purpose: __alloT('stem.wave.wf_snell', 'Snell\'s law — refraction at interface') },
        { eq: 'd sin θ = m λ', purpose: __alloT('stem.wave.wf_grating', 'Diffraction grating maxima (m = order)') },
        { eq: 'f\' = f · (v + vₒ) / (v − vₛ)', purpose: __alloT('stem.wave.wf_doppler', 'Doppler shift (general; signs depend on directions)') },
        { eq: 'E = hf = hc / λ', purpose: __alloT('stem.wave.wf_photon', 'Photon energy (h = Planck constant)') }
      ];

      var STANDING_WAVE_INSTRUMENTS = [
        { instrument: __alloT('stem.wave.swi_guitar_name', 'Guitar string'), boundary: __alloT('stem.wave.swi_guitar_boundary', 'Both ends fixed'), harmonics: __alloT('stem.wave.swi_all_integers', 'All integers (1,2,3,4...)'), formula: 'fₙ = n · v/(2L)', note: __alloT('stem.wave.swi_guitar_note', 'Pluck position selects which harmonics dominate. Near center → odd harmonics.') },
        { instrument: __alloT('stem.wave.swi_openpipe_name', 'Open organ pipe'), boundary: __alloT('stem.wave.swi_openpipe_boundary', 'Both ends open (antinodes)'), harmonics: __alloT('stem.wave.swi_all_integers', 'All integers (1,2,3,4...)'), formula: 'fₙ = n · v/(2L)', note: __alloT('stem.wave.swi_openpipe_note', 'Same formula as string. Wave equation symmetric.') },
        { instrument: __alloT('stem.wave.swi_closedpipe_name', 'Closed organ pipe'), boundary: __alloT('stem.wave.swi_closedpipe_boundary', 'One closed end'), harmonics: __alloT('stem.wave.swi_odd_only', 'Odd only (1,3,5,7...)'), formula: 'fₙ = (2n−1) · v/(4L)', note: __alloT('stem.wave.swi_closedpipe_note', 'Only odd harmonics. Octave + 5th, not octave alone.') },
        { instrument: __alloT('stem.wave.swi_drum_name', 'Drum head'), boundary: __alloT('stem.wave.swi_drum_boundary', 'Circular fixed edge'), harmonics: __alloT('stem.wave.swi_drum_harmonics', 'Bessel function modes'), formula: __alloT('stem.wave.swi_drum_formula', 'Complex 2D'), note: __alloT('stem.wave.swi_drum_note', 'Inharmonic — doesn\'t sound like a clear pitch. Tympani tuned to approximate one.') },
        { instrument: __alloT('stem.wave.swi_marimba_name', 'Marimba bar'), boundary: __alloT('stem.wave.swi_marimba_boundary', 'Bar supported at nodes'), harmonics: __alloT('stem.wave.swi_marimba_harmonics', 'Tunable with bar shape'), formula: __alloT('stem.wave.swi_marimba_formula', 'Depends on cross-section'), note: __alloT('stem.wave.swi_marimba_note', 'Undercut shapes the second partial to be a perfect octave above the fundamental.') }
      ];

      var SOUND_INTENSITY = [
        { db: 0, source: __alloT('stem.wave.si_threshold_src', 'Threshold of hearing'), notes: __alloT('stem.wave.si_threshold_notes', 'Reference: 10⁻¹² W/m²') },
        { db: 10, source: __alloT('stem.wave.si_breathing_src', 'Breathing'), notes: __alloT('stem.wave.si_breathing_notes', 'Quietest noticeable sound') },
        { db: 30, source: __alloT('stem.wave.si_whisper_src', 'Whisper'), notes: __alloT('stem.wave.si_whisper_notes', 'Library quiet') },
        { db: 60, source: __alloT('stem.wave.si_conversation_src', 'Conversation'), notes: __alloT('stem.wave.si_conversation_notes', 'Office background') },
        { db: 70, source: __alloT('stem.wave.si_vacuum_src', 'Vacuum cleaner'), notes: __alloT('stem.wave.si_vacuum_notes', 'Annoying at length') },
        { db: 85, source: __alloT('stem.wave.si_traffic_src', 'Heavy traffic'), notes: __alloT('stem.wave.si_traffic_notes', 'Hearing damage above this with extended exposure') },
        { db: 100, source: __alloT('stem.wave.si_motorcycle_src', 'Motorcycle / blender'), notes: __alloT('stem.wave.si_motorcycle_notes', 'Damage in 15 min') },
        { db: 110, source: __alloT('stem.wave.si_concert_src', 'Rock concert'), notes: __alloT('stem.wave.si_concert_notes', 'Damage in seconds to minutes') },
        { db: 120, source: __alloT('stem.wave.si_jet_src', 'Jet engine at 100 m'), notes: __alloT('stem.wave.si_jet_notes', 'Threshold of pain') },
        { db: 140, source: __alloT('stem.wave.si_gunshot_src', 'Gunshot at ear'), notes: __alloT('stem.wave.si_gunshot_notes', 'Instant damage') },
        { db: 194, source: __alloT('stem.wave.si_max_src', 'Theoretical max in air'), notes: __alloT('stem.wave.si_max_notes', 'Pressure variation = atmospheric pressure (can\'t go louder without becoming shock wave)') }
      ];

      var WAVE_GLOSSARY = [
        { term: __alloT('stem.wave.gl_crest_term', 'Crest'), def: __alloT('stem.wave.gl_crest_def', 'Highest point of a transverse wave. Maximum positive displacement.') },
        { term: __alloT('stem.wave.gl_trough_term', 'Trough'), def: __alloT('stem.wave.gl_trough_def', 'Lowest point of a transverse wave. Maximum negative displacement.') },
        { term: __alloT('stem.wave.gl_compression_term', 'Compression'), def: __alloT('stem.wave.gl_compression_def', 'Region of high pressure in a longitudinal wave (sound).') },
        { term: __alloT('stem.wave.gl_rarefaction_term', 'Rarefaction'), def: __alloT('stem.wave.gl_rarefaction_def', 'Region of low pressure in a longitudinal wave.') },
        { term: __alloT('stem.wave.gl_node_term', 'Node'), def: __alloT('stem.wave.gl_node_def', 'Point of zero displacement on a standing wave.') },
        { term: __alloT('stem.wave.gl_antinode_term', 'Antinode'), def: __alloT('stem.wave.gl_antinode_def', 'Point of maximum displacement on a standing wave.') },
        { term: __alloT('stem.wave.gl_reflection_term', 'Reflection'), def: __alloT('stem.wave.gl_reflection_def', 'Wave bouncing off a boundary. Phase flips if going from less to more dense (hard boundary).') },
        { term: __alloT('stem.wave.gl_refraction_term', 'Refraction'), def: __alloT('stem.wave.gl_refraction_def', 'Wave bending as it crosses a boundary where speed changes. Snell\'s law.') },
        { term: __alloT('stem.wave.gl_diffraction_term', 'Diffraction'), def: __alloT('stem.wave.gl_diffraction_def', 'Wave bending around obstacles or through apertures. Effect strong when aperture ~ λ.') },
        { term: __alloT('stem.wave.gl_interference_term', 'Interference'), def: __alloT('stem.wave.gl_interference_def', 'Two waves overlapping. Constructive (in phase) or destructive (out of phase).') },
        { term: __alloT('stem.wave.gl_standingwave_term', 'Standing wave'), def: __alloT('stem.wave.gl_standingwave_def', 'Pattern from two identical waves traveling opposite directions. Nodes + antinodes fixed in space.') },
        { term: __alloT('stem.wave.gl_resonance_term', 'Resonance'), def: __alloT('stem.wave.gl_resonance_def', 'Large amplitude when driving frequency matches natural frequency. Tacoma Narrows bridge collapse classic example (with caveats).') },
        { term: __alloT('stem.wave.gl_damping_term', 'Damping'), def: __alloT('stem.wave.gl_damping_def', 'Loss of amplitude over time due to friction or radiation. Critical damping = fastest decay without overshoot.') },
        { term: __alloT('stem.wave.gl_coherence_term', 'Coherence'), def: __alloT('stem.wave.gl_coherence_def', 'Constant phase relationship between waves. Required for stable interference patterns. Lasers are highly coherent.') },
        { term: __alloT('stem.wave.gl_polarization_term', 'Polarization'), def: __alloT('stem.wave.gl_polarization_def', 'Direction of oscillation in a transverse wave. Light from sun is unpolarized; passing through a polarizer selects one direction.') },
        { term: __alloT('stem.wave.gl_photon_term', 'Photon'), def: __alloT('stem.wave.gl_photon_def', 'Quantum of EM radiation. Energy E = hf. Each photon carries momentum p = h/λ.') }
      ];

      function expHeader() {
        return React.createElement('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-base font-black text-cyan-700' }, '🌊 ' + __alloT('stem.wave.exp_library_title', 'Wave Reference Library')),
            React.createElement('div', { className: 'text-[0.6875rem] text-cyan-700 mt-0.5' }, __alloT('stem.wave.exp_library_subtitle', 'Interactive references — pick a topic below to explore.'))
          ),
          expSection && React.createElement('button', {
            type: 'button',
            style: { minHeight: 44 },
            'aria-label': __alloT('stem.wave.aria_close_section', 'Close current library topic section'),
            onClick: function() { setExp({ expSection: null }); },
            className: 'transition-colors px-3 py-2 rounded-md text-xs font-bold bg-white border border-cyan-400 text-cyan-800 hover:bg-cyan-50 active:scale-[0.97]'
          }, '✕ ' + __alloT('stem.wave.exp_close_section', 'Close section'))
        );
      }

      function expTabBar() {
        // 45 wave/optics sections grouped into 7 cohesive domains. Renamed
        // duplicate id 'instruments' (was used for both Standing waves AND
        // Instrument freqs) — second now 'instrumentfreqs'. All other IDs
        // preserved. Groups: Wave Basics · Sound & Music · Light & Optics ·
        // EM Spectrum · Communications · Natural & Cosmic · Reference.
        var TAB_GROUPS = [
          { id: 'basics', label: __alloT('stem.wave.grp_basics', 'Wave Basics'), color: 'cyan', tabs: [
            { id: 'types', label: __alloT('stem.wave.tab_types', 'Wave types'), icon: '🌊' },
            { id: 'quantities', label: __alloT('stem.wave.tab_quantities', 'Wave quantities'), icon: '📐' },
            { id: 'formulas', label: __alloT('stem.wave.tab_formulas', 'Key formulas'), icon: 'ƒ' },
            { id: 'units2', label: __alloT('stem.wave.tab_units', 'Wave units'), icon: '∑' },
            { id: 'wavespeed', label: __alloT('stem.wave.tab_wavespeeds', 'Wave speeds'), icon: '⏱' },
            { id: 'speeds2', label: __alloT('stem.wave.tab_detailedspeeds', 'Detailed speeds'), icon: '⏲' },
            { id: 'interference', label: __alloT('stem.wave.tab_interference', 'Interference'), icon: '+' },
            { id: 'diffraction', label: __alloT('stem.wave.tab_diffraction', 'Diffraction'), icon: '∿' },
            { id: 'polarization', label: __alloT('stem.wave.tab_polarization', 'Polarization'), icon: '↕' },
            { id: 'doppler', label: __alloT('stem.wave.tab_doppler', 'Doppler effect'), icon: '🚓' },
            { id: 'shockwaves', label: __alloT('stem.wave.tab_shockwaves', 'Shock waves'), icon: '✈' },
            { id: 'standingHunt', label: __alloT('stem.wave.btn_standing_hunt', 'Standing-wave hunt'), icon: '🎯' },
            { id: 'discoverWave', label: __alloT('stem.wave.tab_discover', 'Discover f·λ=v'), icon: '🔬' }
          ] },
          { id: 'sound', label: __alloT('stem.wave.grp_sound', 'Sound & Music'), color: 'amber', tabs: [
            { id: 'harmonics', label: __alloT('stem.wave.tab_harmonics', 'Harmonics'), icon: '🎵' },
            { id: 'instruments', label: __alloT('stem.wave.tab_standingwaves', 'Standing waves'), icon: '🎸' },
            { id: 'instrumentfreqs', label: __alloT('stem.wave.tab_instrumentfreqs', 'Instrument freqs'), icon: '🎻' },
            { id: 'music', label: __alloT('stem.wave.tab_music', 'Music + acoustics'), icon: '🎼' },
            { id: 'decibels', label: __alloT('stem.wave.tab_soundintensity', 'Sound intensity'), icon: '🔊' },
            { id: 'noise', label: __alloT('stem.wave.tab_noise', 'Noise sources'), icon: '📢' },
            { id: 'hearing', label: __alloT('stem.wave.tab_hearing', 'Hearing + ear'), icon: '👂' },
            { id: 'recordings', label: __alloT('stem.wave.tab_audioformats', 'Audio formats'), icon: '🎧' }
          ] },
          { id: 'optics', label: __alloT('stem.wave.grp_optics', 'Light & Optics'), color: 'fuchsia', tabs: [
            { id: 'optics', label: __alloT('stem.wave.tab_optics', 'Optics & lenses'), icon: '🔍' },
            { id: 'refraction', label: __alloT('stem.wave.tab_refraction', 'Refraction index'), icon: '↻' },
            { id: 'colors', label: __alloT('stem.wave.tab_visiblelight', 'Visible light'), icon: '🌈' },
            { id: 'colors2', label: __alloT('stem.wave.tab_colormodels', 'Color models'), icon: '🎨' },
            { id: 'colorhex', label: __alloT('stem.wave.tab_namedcolors', 'Named colors'), icon: '🖌' },
            { id: 'lasers', label: __alloT('stem.wave.tab_lasers', 'Lasers'), icon: '⫸' },
            { id: 'cameras', label: __alloT('stem.wave.tab_cameras', 'Camera lenses'), icon: '📷' },
            { id: 'optical_facts', label: __alloT('stem.wave.tab_perception', 'Perception & illusions'), icon: '👁' }
          ] },
          { id: 'spectrum', label: __alloT('stem.wave.grp_spectrum', 'EM Spectrum'), color: 'violet', tabs: [
            { id: 'spectrum', label: __alloT('stem.wave.tab_emspectrum', 'EM spectrum'), icon: '⚡' },
            { id: 'radio', label: __alloT('stem.wave.tab_radiobands', 'Radio bands'), icon: '📻' },
            { id: 'tvfreq', label: __alloT('stem.wave.tab_tvscreen', 'TV + screen'), icon: '📺' },
            { id: 'quantum', label: __alloT('stem.wave.tab_quantum', 'Quantum waves'), icon: '⚛' }
          ] },
          { id: 'comm', label: __alloT('stem.wave.grp_comm', 'Communications'), color: 'sky', tabs: [
            { id: 'antennas', label: __alloT('stem.wave.tab_antennas', 'Antennas'), icon: '📶' },
            { id: 'radar', label: __alloT('stem.wave.tab_radarsonar', 'Radar/sonar'), icon: '📡' },
            { id: 'protocols', label: __alloT('stem.wave.tab_commprotocols', 'Comm protocols'), icon: '🛜' },
            { id: 'fibers', label: __alloT('stem.wave.tab_fiberoptics', 'Fiber optics'), icon: '〰' },
            { id: 'satellites', label: __alloT('stem.wave.tab_gpssatellites', 'GPS + satellites'), icon: '🛰' },
            { id: 'medical', label: __alloT('stem.wave.tab_medicalimaging', 'Medical imaging'), icon: '🏥' }
          ] },
          { id: 'natural', label: __alloT('stem.wave.grp_natural', 'Natural & Cosmic'), color: 'emerald', tabs: [
            { id: 'ocean', label: __alloT('stem.wave.tab_oceanwaves', 'Ocean waves'), icon: '🏄' },
            { id: 'seismic', label: __alloT('stem.wave.tab_seismicwaves', 'Seismic waves'), icon: '🌋' },
            { id: 'animals', label: __alloT('stem.wave.tab_animalsenses', 'Animal senses'), icon: '🦇' },
            { id: 'stars', label: __alloT('stem.wave.tab_stars', 'Stars + spectra'), icon: '⭐' },
            { id: 'gravitational', label: __alloT('stem.wave.tab_gravwaves', 'Gravitational waves'), icon: '⌇' }
          ] },
          { id: 'reference', label: __alloT('stem.wave.grp_reference', 'Reference'), color: 'slate', tabs: [
            { id: 'careers', label: __alloT('stem.wave.tab_careers', 'Wave careers'), icon: '💼' },
            { id: 'famous', label: __alloT('stem.wave.tab_history', 'History'), icon: '🕰' },
            { id: 'glossary', label: __alloT('stem.wave.tab_glossary', 'Glossary'), icon: '📖' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return React.createElement('button', {
            key: s.id,
            type: 'button',
            style: { minHeight: 44 },
            'aria-pressed': active,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-3 py-2 rounded-md text-xs font-bold border transition-colors active:scale-[0.97] ' + (active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100')
          }, s.icon + ' ' + s.label);
        }
        // Accordion: one group open at a time — 47 chips at once was a wall.
        // Default-open the group that contains the active section, if any.
        var openGroup = d2.expGroup;
        if (openGroup === undefined && expSection) {
          for (var gi = 0; gi < TAB_GROUPS.length; gi++) {
            if ((TAB_GROUPS[gi].tabs || []).some(function(s) { return s.id === expSection; })) { openGroup = TAB_GROUPS[gi].id; break; }
          }
        }
        return React.createElement('div', { className: 'mb-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col overflow-hidden' },
          TAB_GROUPS.map(function(g) {
            var isOpen = openGroup === g.id;
            return React.createElement('div', { key: g.id, className: 'border-b border-slate-200 last:border-b-0' },
              React.createElement('button', {
                type: 'button',
                style: { minHeight: 44 },
                onClick: function() { setExp({ expGroup: isOpen ? null : g.id }); },
                'aria-expanded': isOpen,
                className: 'transition-colors w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-100'
              },
                React.createElement('span', { className: 'text-xs font-extrabold tracking-wider uppercase text-slate-900 flex-1' }, g.label),
                React.createElement('span', { className: 'text-[0.6875rem] text-slate-700 font-bold' }, (g.tabs || []).length + __alloT('stem.wave.count_topics', ' topics ') + (isOpen ? '▲' : '▼'))
              ),
              isOpen && React.createElement('div', { role: 'group', 'aria-label': g.label + __alloT('stem.wave.aria_topics_suffix', ' topics'), className: 'px-3 pb-2 flex items-center gap-1.5 flex-wrap' },
                (g.tabs || []).map(function(s) { return renderBtn(s, g.color); })
              )
            );
          })
        );
      }

      function renderTypesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌊 ' + __alloT('stem.wave.tab_types', 'Wave types')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_types_intro', 'Waves are categorized by particle motion relative to propagation, and by whether they need a medium. All carry energy but no matter from one place to another.')),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            WAVE_TYPES.map(function(w, i) {
              return React.createElement('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-xl text-cyan-600' }, w.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, w.name),
                  React.createElement('span', { className: 'text-[0.625rem] font-bold ml-auto px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800' }, w.speed)
                ),
                React.createElement('div', { className: 'text-[0.75rem] text-slate-700 leading-relaxed mb-1' }, w.desc),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, __alloT('stem.wave.label_examples', 'Examples: '), w.examples.join(', '))
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('types_transverse_vs_longitudinal', __alloT('stem.wave.try_types_long', 'Compare Compression & Displacement Wave'), { waveMode: 'longitudinal', longitudinalMode: 'traveling', showDisplacementCurve: true, frequency: 3 })
          )
        );
      }

      function renderQuantitiesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📐 ' + __alloT('stem.wave.tab_quantities', 'Wave quantities')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_quantities_intro', 'The full vocabulary needed to describe any wave. Most quantities are related — once you know two, you can derive the rest.')),
          React.createElement('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            WAVE_QUANTITIES.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-lg font-black text-cyan-700 font-mono min-w-[24px] tracking-tight' }, q.sym),
                  React.createElement('span', { className: 'text-[0.75rem] font-bold text-slate-800' }, q.name),
                  React.createElement('span', { className: 'text-[0.625rem] text-slate-500 ml-auto' }, q.units)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, q.def)
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('quantities_ruler_probe', __alloT('stem.wave.try_quantities_ruler', 'Measure \u03BB & Probe Kinematics Live'), { waveMode: 'free', showRuler: true, rulerX1: 0.2, rulerX2: 0.7, probeEnabled: true, probeX: 0.45 })
          )
        );
      }

      function renderFormulasSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'ƒ ' + __alloT('stem.wave.sec_formulas_title', 'Key wave equations')),
          React.createElement('div', { className: 'space-y-1.5' },
            WAVE_FORMULAS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'flex items-baseline gap-3 p-2 rounded-md bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-sm font-bold text-indigo-800 font-mono min-w-[200px]' }, f.eq),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700' }, f.purpose)
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('formulas_standing_decomp', __alloT('stem.wave.try_formulas_decomp', 'Standing Superposition y\u208A + y\u208B Live'), { waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 2, showTravelingComponents: true })
          )
        );
      }

      function renderInterferenceSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '+ ' + __alloT('stem.wave.sec_interference_title', 'Interference + superposition')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_interference_intro', 'When two waves meet, their displacements add (principle of superposition). After passing through each other, each wave continues unchanged.')),
          React.createElement('div', { className: 'space-y-2 mb-3' },
            INTERFERENCE_PATTERNS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1' },
                  React.createElement('span', { className: 'text-2xl font-black text-cyan-700 tracking-tight' }, p.icon),
                  React.createElement('span', { className: 'text-sm font-black text-slate-800' }, p.type),
                  React.createElement('span', { className: 'text-[0.625rem] text-slate-500 ml-auto font-mono' }, p.condition)
                ),
                React.createElement('div', { className: 'text-[0.75rem] text-slate-700 leading-relaxed' }, p.result)
              );
            })
          ),
          React.createElement('div', { className: 'p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[0.6875rem] text-amber-700' },
            React.createElement('strong', null, '💡 ' + __alloT('stem.wave.sec_beats_label', 'Beats: ')), __alloT('stem.wave.sec_beats_text', 'Two waves of slightly different frequency interfere alternately constructively + destructively. Beat frequency = |f₁ − f₂|. Musicians use this to tune by ear.')
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-1' },
            renderTryInSimBtn('interference_beats', 'Beats & Superposition', { waveMode: 'free', showSecond: true, frequency: 4, frequency2: 4.5, amplitude: 45, amplitude2: 45, phase2: 0 }),
            renderTryInSimBtn('interference_collide', __alloT('stem.wave.try_pulse_collide', 'Counter-Propagating Pulse Cancellation'), { waveMode: 'free', packetMode: 'collide', collidePolarity: 'opposite', showSecond: false, amplitude: 55 })
          )
        );
      }

      function renderDopplerSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🚓 ' + __alloT('stem.wave.tab_doppler', 'Doppler effect')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_doppler_intro', 'Frequency observed changes when source and/or observer move relative to each other. The ambulance siren that drops pitch as it passes you = sound Doppler. Galaxy redshift = light Doppler.')),
          React.createElement('div', { className: 'space-y-2' },
            DOPPLER_CASES.map(function(c, i) {
              return React.createElement('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-slate-800' }, c.case),
                  React.createElement('span', { className: 'text-[0.6875rem] font-bold ml-auto px-2 py-0.5 rounded bg-cyan-100 text-cyan-800' }, c.effect)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200' },
            React.createElement('div', { className: 'text-[0.6875rem] font-bold text-emerald-800 mb-1' }, '📡 ' + __alloT('stem.wave.sec_applications', 'Applications')),
            React.createElement('div', { className: 'text-[0.6875rem] text-emerald-700 leading-relaxed' },
              '• ' + __alloT('stem.wave.doppler_app_radar', 'Police radar: bounces microwaves off your car; Doppler shift = your speed. '),
              '• ' + __alloT('stem.wave.doppler_app_ultrasound', 'Doppler ultrasound: measures blood flow direction + speed. '),
              '• ' + __alloT('stem.wave.doppler_app_hubble', 'Hubble\'s discovery: distant galaxies are redshifted → universe expanding. '),
              '• ' + __alloT('stem.wave.doppler_app_cmb', 'Cosmic microwave background: small Doppler shifts reveal early-universe structure.')
            )
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-2' },
            renderTryInSimBtn('doppler_moving_pair', 'Moving Source & Observer', { waveMode: 'doppler', dopplerRegime: 'acoustic', sourceSpeed: 0.4, observerSpeed: 0.3, frequency: 3 }),
            renderTryInSimBtn('doppler_relativistic_halpha', __alloT('stem.wave.try_rel_doppler', 'Galaxy Redshift (Relativistic H\u03B1)'), { waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.6, observerSpeed: 0, frequency: 4 })
          )
        );
      }

      function renderSpectrumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ ' + __alloT('stem.wave.sec_spectrum_title', 'Electromagnetic spectrum')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_spectrum_intro', 'All EM waves travel at c in vacuum. The full spectrum spans 18+ orders of magnitude in frequency. We see only a narrow sliver (visible light). Energy per photon: E = hf — higher frequency = more energetic.')),
          React.createElement('div', { className: 'space-y-1.5' },
            EM_SPECTRUM.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-slate-800 min-w-[100px]' }, s.name),
                  React.createElement('span', { className: 'text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 ml-auto' }, s.energy + __alloT('stem.wave.label_energy_suffix', ' energy'))
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mb-0.5 font-mono' }, 'λ: ', s.λ, '  ·  f: ', s.f),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700' }, __alloT('stem.wave.label_uses', 'Uses: '), s.uses)
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('em_spectrum_redshift', __alloT('stem.wave.try_em_transverse', 'Relativistic EM Transverse Redshift (\u03B8=90\u00B0)'), { waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.75, dopplerOffsetAngleDeg: 90, frequency: 4 })
          )
        );
      }

      function renderColorsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌈 ' + __alloT('stem.wave.sec_colors_title', 'Visible light spectrum')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_colors_intro', 'Human vision spans ~380-700 nm. Each color corresponds to a specific range of wavelengths. White light = mix of all visible wavelengths.')),
          React.createElement('div', { className: 'grid gap-2' },
            VISIBLE_COLORS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-2.5 rounded-lg border border-slate-200 flex items-center gap-3', style: { background: c.hex + '15' } },
                React.createElement('div', { className: 'w-8 h-8 rounded shrink-0', style: { background: c.hex, border: '1px solid rgba(0,0,0,0.1)' } }),
                React.createElement('div', { className: 'flex-1' },
                  React.createElement('div', { className: 'text-[0.75rem] font-black text-slate-800' }, c.color, React.createElement('span', { className: 'text-[0.625rem] font-mono text-slate-500 ml-2' }, c.λnm, ' nm  ·  ', c.f)),
                  React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 italic' }, c.notes)
                )
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('colors_grating_dispersion', __alloT('stem.wave.try_colors_grating', '6-Slit Optical Grating Interference Screen'), { waveMode: 'ripple', rippleBarrier: 'grating', gratingSlits: 6, slitWidth: 0.08, showIntensityScreen: true, frequency: 5 })
          )
        );
      }

      function renderHarmonicsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎵 ' + __alloT('stem.wave.sec_harmonics_title', 'Harmonics — modes of vibration')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_harmonics_intro', 'A vibrating string supports an infinite series of modes called harmonics. Each has a specific number of nodes (zero-amplitude points) + antinodes (max-amplitude points). The mix of harmonics = timbre.')),
          React.createElement('div', { className: 'space-y-1.5' },
            HARMONICS.map(function(h, i) {
              return React.createElement('div', { key: 'h' + i, scope: 'col', className: 'flex items-baseline gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'min-w-[140px]' },
                  React.createElement('div', { className: 'text-[0.75rem] font-black text-slate-800' }, h.mode),
                  React.createElement('div', { className: 'text-[0.625rem] text-slate-500 font-mono' }, h.nodes + __alloT('stem.wave.label_nodes_f', ' nodes · f = ') + h.f)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, h.desc)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2.5 rounded-md bg-purple-50 border border-purple-200 text-[0.6875rem] text-purple-700' },
            React.createElement('strong', null, '💡 ' + __alloT('stem.wave.harm_callout_label', 'Why instruments sound different: ')), __alloT('stem.wave.harm_callout_text', 'A note at 440 Hz on a violin and a flute both have fundamental at 440 Hz. The MIX of higher harmonics (the spectrum) is different — that\'s timbre. Pure sine = boring; rich harmonic content = recognizable instrument.')
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-1' },
            renderTryInSimBtn('harmonics_kundt', 'Kundt Standing Tube (n=3)', { waveMode: 'longitudinal', longitudinalMode: 'standing', harmonic: 3, showDisplacementCurve: true }),
            renderTryInSimBtn('harmonics_lowpass', __alloT('stem.wave.try_harmonic_filter', 'Sawtooth Low-Pass Filter (Hc=3)'), { waveMode: 'spectrum', waveType: 'sawtooth', spectrumFilter: 'lowpass', filterCutoffHarmonic: 3, frequency: 3 }),
            renderTryInSimBtn('harmonics_resonator', __alloT('stem.wave.try_driven_resonator', 'Driven Q=30 Standing Resonator (2f\u2081)'), { waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 2, resonatorDriven: true, driveFreqRatio: 2.0, resonatorQ: 30 })
          )
        );
      }

      function renderInstrumentsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎸 ' + __alloT('stem.wave.sec_instruments_title', 'Standing waves in instruments')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_instruments_intro', 'Instruments make tones by setting up standing waves. The boundary conditions (open/closed/fixed ends) determine which harmonics are allowed.')),
          React.createElement('div', { className: 'space-y-2' },
            STANDING_WAVE_INSTRUMENTS.map(function(s, i) {
              var tryNode = i === 0
                ? React.createElement('div', { className: 'flex flex-wrap gap-2' },
                    renderTryInSimBtn('inst_both_fixed', s.instrument, { waveMode: 'standing', standingBoundary: 'bothFixed', harmonic: 2 }),
                    renderTryInSimBtn('inst_mersenne_violin', __alloT('stem.wave.try_mersenne_violin', 'Mersenne Violin A4 String (T=60N, \u03BC=1.5g/m)'), { waveMode: 'standing', standingBoundary: 'bothFixed', stringMechanics: true, stringTension: 60, stringDensityGm: 1.5, harmonic: 1 })
                  )
                : i === 1
                  ? renderTryInSimBtn('inst_open_open', s.instrument, { waveMode: 'standing', standingBoundary: 'openOpen', harmonic: 2 })
                  : i === 2
                    ? renderTryInSimBtn('inst_closed_pipe', s.instrument, { waveMode: 'standing', standingBoundary: 'fixedFree', harmonic: 2 })
                    : null;
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-slate-800' }, s.instrument),
                  React.createElement('span', { className: 'text-[0.625rem] font-bold ml-auto px-2 py-0.5 rounded bg-purple-100 text-purple-800' }, s.harmonics)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mb-1' }, React.createElement('strong', null, __alloT('stem.wave.label_boundary', 'Boundary: ')), s.boundary),
                React.createElement('div', { className: 'text-[0.6875rem] font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded mb-1 inline-block' }, s.formula),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.note),
                tryNode
              );
            })
          )
        );
      }

      function renderDecibelsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔊 ' + __alloT('stem.wave.sec_decibels_title', 'Sound intensity (decibels)')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_decibels_intro', 'Decibels are a logarithmic scale. +10 dB ≈ 10× intensity, perceived as ~2× as loud. dB SPL (sound pressure level) is referenced to threshold of human hearing.')),
          React.createElement('div', { className: 'space-y-1' },
            SOUND_INTENSITY.map(function(s, i) {
              var dangerLevel = s.db >= 120 ? 'red' : s.db >= 85 ? 'amber' : 'emerald';
              var colors = {
                red: 'bg-red-50 border-red-200 text-red-700',
                amber: 'bg-amber-50 border-amber-200 text-amber-700',
                emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700'
              };
              return React.createElement('div', { key: 's'+i, className: 'flex items-center gap-3 p-2 rounded-md border ' + colors[dangerLevel] },
                React.createElement('div', { className: 'text-base font-black font-mono min-w-[44px]' }, s.db + ' dB'),
                React.createElement('div', { className: 'text-[0.75rem] font-bold min-w-[140px]' }, s.source),
                React.createElement('div', { className: 'text-[0.6875rem] italic flex-1' }, s.notes)
              );
            })
          ),
          React.createElement('div', { className: 'mt-3 p-2.5 rounded-md bg-red-50 border border-red-300 text-[0.6875rem] text-red-700' },
            React.createElement('strong', null, '⚠ ' + __alloT('stem.wave.db_callout_label', 'Permanent hearing loss: ')), __alloT('stem.wave.db_callout_text', 'OSHA: 85 dB for 8 hours, 90 dB for 4 hours, etc. (each +5 dB halves safe exposure time). Wear ear protection at concerts, with power tools, at firing ranges.')
          ),
          renderTryInSimBtn('decibels_attenuation', __alloT('stem.wave.try_decibels_attenuation', 'Inverse-Square dB Attenuation (6 dB/doubling)'), { waveMode: 'longitudinal', longitudinalMode: 'traveling', distanceAttenuation: true, listenerDistMeters: 4, spreadingLaw: 'spherical', amplitude: 80 })
        );
      }

      // ── Cycle 2 of the inquiry-learning study: Variable manipulation ──
      // Learner varies frequency + tension; period + wavelength + wave speed update live.
      // The widget asks discovery questions ("what stays constant?") before revealing the law.
      function renderDiscoverWaveSection() {
        var lab = d2.discoverWave || { freq: 4, tension: 50, observationsLogged: [], discovered: false };
        function setLab(patch) {
          setLabToolData(function(prev) {
            var prior = waveNormalizeState(prev && prev.wave, gradeLevel);
            var st = Object.assign({}, prior.discoverWave || lab, patch);
            var nextNorm = waveNormalizeState(Object.assign({}, prior, { discoverWave: st }), gradeLevel);
            nextNorm.waveMastery = waveSyncMasterySlot(waveComputeMastery(nextNorm));
            return Object.assign({}, prev, { wave: nextNorm });
          });
        }
        // Physics: standing wave on a string, v = sqrt(T/μ), with μ fixed at 0.01 kg/m for simplicity.
        // wavelength = v/freq. Period = 1/freq. Both update live as f or T change.
        var MU = 0.01;
        var v = Math.sqrt(lab.tension / MU);
        var period = 1 / lab.freq;
        var wavelength = v / lab.freq;
        var f_lambda = lab.freq * wavelength;
        // SVG snapshot of the standing wave — amplitude 1, length 2 metres for visual
        var stringLength = 2.0;
        var nodes = Math.max(1, Math.round((2 * stringLength) / wavelength)); // half-wavelengths along string
        var pts = [];
        var samples = 60;
        for (var i = 0; i <= samples; i++) {
          var x = i / samples;
          var phase = x * nodes * Math.PI; // standing wave snapshot
          var y = Math.sin(phase);
          pts.push([10 + x * 240, 50 - y * 30]);
        }
        var pathStr = 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
        // Animated phase using time for visual interest (gentle wobble at user freq)
        var discoverReducedMotion = false;
        try { discoverReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
        var anim = discoverReducedMotion ? '' : 'animate-pulse'; // CSS-only; full animation handled by canvas tools elsewhere

        function logObservation() {
          var obs = { f: lab.freq, T: lab.tension, lambda: parseFloat(wavelength.toFixed(3)), v: parseFloat(v.toFixed(2)) };
          var newObs = (lab.observationsLogged || []).concat([obs]).slice(-6);
          setLab({ observationsLogged: newObs });
        }
        function reveal() { setLab({ discovered: true }); }
        function reset() { setLab({ freq: 4, tension: 50, observationsLogged: [], discovered: false }); }

        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-1' },
            h('h4', { className: 'text-sm font-black text-slate-800 m-0' }, '🔬 ' + __alloT('stem.wave.sec_discover_title', 'Discover the wave equation')),
            h('button', {
              type: 'button',
              'data-wave-back-to-sim': 'true',
              style: { minHeight: 44 },
              'aria-label': __alloT('stem.wave.aria_back_to_sim', 'Return to live wave simulator canvas'),
              onClick: function() { setExp({ workspaceTab: d2.workspaceTab === 'all' ? 'all' : 'explore' }); },
              className: 'px-3 py-2 rounded-lg text-xs font-bold bg-cyan-800 text-white hover:bg-cyan-900 transition-colors'
            }, '← ' + __alloT('stem.wave.btn_back_to_sim', 'Back to Live Simulator'))
          ),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
            __alloT('stem.wave.sec_discover_intro', 'A string is fixed at both ends. Wiggle the controls. Watch what changes and what stays the same. Log a few observations, then try to spot the pattern. Hit "I see it" when you think you have the law — no peeking.')),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            // Left: live SVG visualization
            h('div', { className: 'p-3 rounded-lg bg-slate-900 border border-slate-700' },
              h('svg', { viewBox: '0 0 260 100', width: '100%', style: { height: 'auto' }, 'aria-label': __alloT('stem.wave.aria_standing_string', 'Standing wave on a string') },
                h('line', { x1: 10, y1: 50, x2: 250, y2: 50, stroke: '#475569', strokeDasharray: '2,2', strokeWidth: 1 }),
                h('path', { d: pathStr, fill: 'none', stroke: '#22d3ee', strokeWidth: 2.5, opacity: 0.95 }),
                h('circle', { cx: 10, cy: 50, r: 4, fill: '#fbbf24' }),
                h('circle', { cx: 250, cy: 50, r: 4, fill: '#fbbf24' }),
                h('text', { x: 130, y: 92, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 9 }, __alloT('stem.wave.svg_length_2m', 'Length L = 2.0 m (fixed)'))
              ),
              h('div', { className: 'mt-2 grid grid-cols-2 gap-2 text-[0.6875rem]' },
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-cyan-300' },
                  h('div', { className: 'text-[0.5625rem] uppercase text-slate-300 tracking-wider' }, __alloT('stem.wave.card_period', 'Period') + ' T'),
                  h('div', { className: 'font-mono font-bold text-base' }, period.toFixed(3) + ' s')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-cyan-300' },
                  h('div', { className: 'text-[0.5625rem] uppercase text-slate-300 tracking-wider' }, __alloT('stem.wave.card_wavelength', 'Wavelength') + ' λ'),
                  h('div', { className: 'font-mono font-bold text-base' }, wavelength.toFixed(3) + ' m')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-amber-300' },
                  h('div', { className: 'text-[0.5625rem] uppercase text-slate-300 tracking-wider' }, __alloT('stem.wave.label_wavespeed', 'Wave speed') + ' v'),
                  h('div', { className: 'font-mono font-bold text-base' }, v.toFixed(2) + ' m/s')
                ),
                h('div', { className: 'p-1.5 rounded bg-slate-800 text-violet-300' },
                  h('div', { className: 'text-[0.5625rem] uppercase text-slate-300 tracking-wider' }, 'f × λ'),
                  h('div', { className: 'font-mono font-bold text-base' }, f_lambda.toFixed(2))
                )
              )
            ),
            // Right: controls + observation log
            h('div', { className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('label', { htmlFor: 'discFreq', className: 'block text-[0.6875rem] font-bold text-slate-800' }, __alloT('stem.wave.disc_freq_label', 'Frequency f: ') + lab.freq.toFixed(2) + ' Hz'),
              h('input', { id: 'discFreq', type: 'range', style: { minHeight: 44 }, min: 1, max: 20, step: 0.5, value: lab.freq, onChange: function(e) { setLab({ freq: parseFloat(e.target.value) }); }, className: 'w-full', 'aria-label': __alloT('stem.wave.ctrl_frequency_aria', 'Frequency in hertz') }),
              h('label', { htmlFor: 'discTen', className: 'block text-[0.6875rem] font-bold text-slate-800 mt-2' }, __alloT('stem.wave.disc_tension_label', 'String tension T: ') + lab.tension + ' N'),
              h('input', { id: 'discTen', type: 'range', style: { minHeight: 44 }, min: 10, max: 200, step: 5, value: lab.tension, onChange: function(e) { setLab({ tension: parseInt(e.target.value, 10) }); }, className: 'w-full', 'aria-label': __alloT('stem.wave.aria_tension_newtons', 'Tension in newtons') }),
              h('p', { className: 'text-[0.625rem] text-slate-600 italic mt-1' }, __alloT('stem.wave.disc_mu_note', '(string mass density μ fixed at 0.01 kg/m)')),
              h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
                h('button', { type: 'button', style: { minHeight: 44 }, onClick: logObservation, className: 'transition-colors px-3 py-2 rounded text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800 focus:ring-2 focus:ring-cyan-300 focus:outline-none active:scale-[0.97]' }, '📝 ' + __alloT('stem.wave.btn_log_observation', 'Log observation')),
                h('button', { type: 'button', style: { minHeight: 44 }, onClick: reveal, disabled: lab.discovered, className: 'transition-colors px-3 py-2 rounded text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-400 focus:outline-none active:scale-[0.97]' }, lab.discovered ? '✓ ' + __alloT('stem.wave.btn_revealed', 'Revealed') : '💡 ' + __alloT('stem.wave.btn_i_see_it', 'I see it')),
                h('button', { type: 'button', style: { minHeight: 44 }, onClick: reset, className: 'transition-colors px-3 py-2 rounded text-xs font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-2 focus:ring-slate-500 focus:outline-none active:scale-[0.97]' }, '↻ ' + __alloT('stem.wave.btn_reset', 'Reset'))
              ),
              (lab.observationsLogged || []).length > 0 && h('div', { className: 'mt-2' },
                h('div', { className: 'text-[0.625rem] font-bold text-slate-700 uppercase tracking-wider mb-1' }, __alloT('stem.wave.disc_your_observations', 'Your observations')),
                h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'text-[0.625rem] border-collapse w-full' },
                    h('thead', null, h('tr', { className: 'bg-slate-200' },
                      ['f (Hz)', 'T (N)', 'λ (m)', 'v (m/s)', 'f·λ'].map(function(c) { return h('th', { key: c, scope: 'col', className: 'px-1 py-0.5 text-left text-slate-900' }, c); })
                    )),
                    h('tbody', null,
                      lab.observationsLogged.map(function(o, i) {
                        return h('tr', { key: i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.f.toFixed(1)),
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.T),
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.lambda),
                          h('td', { className: 'px-1 py-0.5 font-mono' }, o.v),
                          h('td', { className: 'px-1 py-0.5 font-mono font-bold text-cyan-800' }, (o.f * o.lambda).toFixed(2))
                        );
                      })
                    )
                  )
                )
              )
            )
          ),
          // Discovery prompt — appears regardless, escalates as observations + reveal happen
          (lab.observationsLogged || []).length >= 2 && !lab.discovered && h('div', { className: 'mt-3 p-2 rounded bg-amber-50 border-l-4 border-l-amber-500 text-[0.75rem] text-amber-900' },
            h('strong', null, '🔍 ' + __alloT('stem.wave.disc_hypothesis_label', 'Hypothesis time: ')), __alloT('stem.wave.disc_hypothesis_text', 'Compare your f × λ column. Is it constant for different f values at the same tension? What about when you change tension? Form a hypothesis before clicking "I see it".')),
          lab.discovered && h('div', { className: 'mt-3 p-3 rounded-lg bg-emerald-50 border-l-4 border-l-emerald-500' },
            h('div', { className: 'font-black text-emerald-900 mb-1' }, '✨ ' + __alloT('stem.wave.disc_equation_label', 'The wave equation: ') + 'v = f · λ'),
            h('p', { className: 'text-[0.75rem] text-slate-800 leading-relaxed' },
              __alloT('stem.wave.disc_reveal_text', 'For a wave on a string, the speed v depends ONLY on the string\'s tension and mass density (v = √(T/μ)). The product f·λ always equals v. Change frequency → wavelength compensates so f·λ stays constant. Increase tension → wave speed jumps → f·λ jumps with it. Frequency × wavelength is one of the deepest constancies in physics: it shows up identically for light, sound, water waves, and quantum matter waves.')),
            h('p', { className: 'text-[0.6875rem] text-emerald-900 mt-1 italic' }, __alloT('stem.wave.disc_reveal_hertz', 'You just discovered it the way Hertz did — by watching what stays constant when you change one variable at a time.'))
          )
        );
      }

      // === Cycle-9 open-ended manipulation widget ===
      // Design principles (per Cycle-8 instrument validation): no chip pool, no scoring,
      // no reveal button, no answer dump. Just continuous sliders, live physics, free-text
      // hypothesis input, observable paradox (harmonics-only stability), opt-in OPEN questions.
      function renderStandingHuntSection() {
        var h = React.createElement;
        var lab = d2.standingHunt || { tension: 50, freq: 4, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', observationsLogged: [], visitCount: 0 };
        function setLab(patch) {
          setLabToolData(function(prev) {
            var prior = waveNormalizeState(prev && prev.wave, gradeLevel);
            var st = Object.assign({}, prior.standingHunt || lab, patch);
            var nextNorm = waveNormalizeState(Object.assign({}, prior, { standingHunt: st }), gradeLevel);
            nextNorm.waveMastery = waveSyncMasterySlot(waveComputeMastery(nextNorm));
            return Object.assign({}, prev, { wave: nextNorm });
          });
        }
        var MU = 0.01;          // string mass density kg/m (fixed)
        var L = 2.0;            // string length m (fixed)
        var v = Math.sqrt(lab.tension / MU);
        var wavelength = v / lab.freq;
        // For a string fixed at both ends, resonant harmonics: f_n = n * v / (2L)
        // The CURRENT (T, f) gives an effective harmonic number n = f * 2L / v
        var nEff = lab.freq * 2 * L / v;
        var nNear = Math.round(nEff);
        var nDist = Math.abs(nEff - nNear);
        var isHarmonic = nDist < 0.05 && nNear >= 1; // a resonance lock
        // SVG: when off-harmonic, animation looks "fuzzy" because superposition of incoming/reflected waves doesn't reinforce
        var samples = 80;
        var amp = isHarmonic ? 30 : 30 * Math.max(0.15, 1 - nDist * 2); // off-harmonic = visible chaos
        var pts = [];
        for (var i = 0; i <= samples; i++) {
          var x = i / samples;
          // Forward wave + reflected wave snapshot at t=0
          var y1 = Math.sin(2 * Math.PI * x * nEff);
          var y2 = Math.sin(2 * Math.PI * (1 - x) * nEff + (isHarmonic ? Math.PI : Math.PI * (1 + 0.3 * nDist)));
          var y = (y1 + y2) / 2;
          pts.push([20 + x * 280, 80 - y * amp]);
        }
        var pathStr = 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
        // Mark node positions (where y is always zero) — only meaningful at resonance
        var nodeXs = [];
        if (isHarmonic && nNear >= 1) {
          for (var k = 0; k <= nNear; k++) nodeXs.push(20 + (k / nNear) * 280);
        }
        function logObservation() {
          var obs = { T: lab.tension, f: parseFloat(lab.freq.toFixed(2)), v: parseFloat(v.toFixed(1)), lambda: parseFloat(wavelength.toFixed(3)), n: parseFloat(nEff.toFixed(2)), locked: isHarmonic };
          setLab({ observationsLogged: (lab.observationsLogged || []).concat([obs]).slice(-8) });
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-1' },
            h('h4', { className: 'text-sm font-black text-slate-800 m-0' }, '🎯 ' + __alloT('stem.wave.btn_standing_hunt', 'Standing-wave hunt')),
            h('button', {
              type: 'button',
              'data-wave-back-to-sim': 'true',
              style: { minHeight: 44 },
              'aria-label': __alloT('stem.wave.aria_back_to_sim', 'Return to live wave simulator canvas'),
              onClick: function() { setExp({ workspaceTab: d2.workspaceTab === 'all' ? 'all' : 'explore' }); },
              className: 'px-3 py-2 rounded-lg text-xs font-bold bg-cyan-800 text-white hover:bg-cyan-900 transition-colors'
            }, '← ' + __alloT('stem.wave.btn_back_to_sim', 'Back to Live Simulator'))
          ),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
            __alloT('stem.wave.sec_standinghunt_intro', 'A string fixed at both ends. You control the tension and the driving frequency. There is no "right answer" — and no answer dump. Sweep the sliders. Look for the rare frequencies where the string locks into a clean standing pattern. Type what you discover in your own words.')),
          // Live SVG
          h('div', { className: 'mb-2 rounded border border-slate-200 bg-slate-50 p-2' },
            h('svg', { viewBox: '0 0 320 120', role: 'img', 'aria-label': __alloT('stem.wave.standing_wave_snapshot', 'Standing wave snapshot showing nodes and antinodes for the selected frequency and tension.'), className: 'w-full h-32' },
              // String fixation posts
              h('rect', { x: 18, y: 70, width: 4, height: 30, fill: '#334155' }),
              h('rect', { x: 298, y: 70, width: 4, height: 30, fill: '#334155' }),
              h('path', { d: pathStr, stroke: isHarmonic ? '#047857' : '#64748b', strokeWidth: isHarmonic ? 2.5 : 1.5, fill: 'none' }),
              // Node markers — only show when locked into resonance
              nodeXs.map(function(nx, i) {
                return h('circle', { key: 'n' + i, cx: nx, cy: 80, r: 3.5, fill: '#15803d' });
              }),
              h('text', { x: 160, y: 18, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: isHarmonic ? '#047857' : '#334155' },
                isHarmonic ? ('✓ ' + __alloT('stem.wave.sh_standing_pattern', 'Standing pattern — n = ') + nNear + ' (' + nNear + __alloT('stem.wave.sh_half_wavelengths', ' half-wavelengths)')) : __alloT('stem.wave.sh_off_resonance', 'Off-resonance — pattern unstable')),
              h('text', { x: 160, y: 112, textAnchor: 'middle', fontSize: 9, fill: '#334155' },
                'T = ' + lab.tension.toFixed(0) + ' N  |  f = ' + lab.freq.toFixed(2) + ' Hz  |  v = ' + v.toFixed(1) + ' m/s  |  λ = ' + wavelength.toFixed(2) + ' m  |  n = ' + nEff.toFixed(2))
            )
          ),
          // Sliders — continuous manipulation, no chip pool
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-3' },
            h('div', null,
              h('label', { htmlFor: 'sh-tension', className: 'block text-[0.6875rem] font-bold text-slate-800 mb-1' },
                __alloT('stem.wave.sh_tension_label', 'Tension: '), h('span', { className: 'font-mono text-indigo-800' }, lab.tension.toFixed(0) + ' N')),
              h('input', {
                id: 'sh-tension', type: 'range', style: { minHeight: 44 }, min: 10, max: 200, step: 1, value: lab.tension,
                onChange: function(e) { setLab({ tension: parseFloat(e.target.value) }); },
                className: 'w-full', 'aria-label': __alloT('stem.wave.aria_tension_newtons', 'Tension in newtons')
              }),
              h('div', { className: 'text-[0.625rem] text-slate-700 flex justify-between' },
                h('span', null, '10 N'), h('span', null, '200 N'))
            ),
            h('div', null,
              h('label', { htmlFor: 'sh-freq', className: 'block text-[0.6875rem] font-bold text-slate-800 mb-1' },
                __alloT('stem.wave.sh_frequency_label', 'Frequency: '), h('span', { className: 'font-mono text-indigo-800' }, lab.freq.toFixed(2) + ' Hz')),
              h('input', {
                id: 'sh-freq', type: 'range', style: { minHeight: 44 }, min: 1, max: 30, step: 0.05, value: lab.freq,
                onChange: function(e) { setLab({ freq: parseFloat(e.target.value) }); },
                className: 'w-full', 'aria-label': __alloT('stem.wave.aria_driving_freq', 'Driving frequency in hertz')
              }),
              h('div', { className: 'text-[0.625rem] text-slate-700 flex justify-between' },
                h('span', null, '1 Hz'), h('span', null, '30 Hz'))
            )
          ),
          // Log observation button (optional record-keeping; no scoring)
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-3' },
            h('button', {
              type: 'button',
              style: { minHeight: 44 },
              onClick: logObservation,
              className: 'transition-colors px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-300 active:scale-[0.97]'
            }, '📋 ' + __alloT('stem.wave.sh_log_observation', 'Log this observation')),
            h('button', {
              type: 'button',
              style: { minHeight: 44 },
              onClick: function() { setLab({ tension: 50, freq: 4, observationsLogged: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
              className: 'transition-colors px-3 py-2 rounded bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 active:scale-[0.97]'
            }, '↺ ' + __alloT('stem.wave.btn_reset', 'Reset')),
            (lab.observationsLogged || []).length > 0 && h('span', { className: 'text-[0.6875rem] text-slate-700 italic' }, (lab.observationsLogged || []).length + __alloT('stem.wave.sh_obs_logged', ' observation(s) logged'))
          ),
          // Observation log (auto-tabulated; no commentary required)
          (lab.observationsLogged || []).length > 0 && h('div', { className: 'mb-3 overflow-x-auto' },
            h('table', { className: 'text-[0.625rem] w-full border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100 text-slate-800' },
                  ['T (N)', 'f (Hz)', 'v (m/s)', 'λ (m)', 'n', __alloT('stem.wave.sh_col_locked', 'locked')].map(function(h2, i) {
                    return h('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 border border-slate-200 text-left' }, h2);
                  })
                )
              ),
              h('tbody', null,
                lab.observationsLogged.map(function(o, idx) {
                  return h('tr', { key: 'r' + idx, className: o.locked ? 'bg-emerald-50' : '' },
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.T),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.f),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.v),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.lambda),
                    h('td', { className: 'px-2 py-1 border border-slate-200 font-mono' }, o.n),
                    h('td', { className: 'px-2 py-1 border border-slate-200' }, o.locked ? '✓' : '—')
                  );
                })
              )
            )
          ),
          // Hypothesis textarea — learner-typed, free-form
          h('div', { className: 'mb-3' },
            h('label', { htmlFor: 'sh-hypo', className: 'block text-[0.6875rem] font-bold text-slate-800 mb-1' },
              __alloT('stem.wave.sh_hypothesis_label', 'Your hypothesis (free text — no right answer):')),
            h('textarea', {
              id: 'sh-hypo',
              value: lab.hypothesis || '',
              onChange: function(e) { setLab({ hypothesis: e.target.value }); },
              placeholder: __alloT('stem.wave.sh_hypothesis_placeholder', 'What pattern do you notice in the values where the string locks into a clean standing wave? Type your own theory.'),
              className: 'w-full text-[0.75rem] border border-slate-300 rounded p-2 font-mono leading-snug',
              rows: 3
            })
          ),
          // OPT-IN open questions — only when learner clicks "I'm stuck". No answers given.
          h('div', { className: 'mb-3' },
            !lab.stuckRevealed && h('button', {
              type: 'button',
              style: { minHeight: 44 },
              onClick: function() { setLab({ stuckRevealed: true }); },
              className: 'transition-colors px-3 py-2 rounded bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 border border-amber-400 active:scale-[0.97]'
            }, '🤔 ' + __alloT('stem.wave.sh_stuck_btn', 'I\'m stuck — show me some questions to think about (no answers)')),
            lab.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-300 text-[0.6875rem] text-slate-800 leading-relaxed' },
              h('div', { className: 'font-bold text-amber-900 mb-1' }, __alloT('stem.wave.sh_open_questions', 'Open questions (no answers — investigate by manipulating):')),
              h('ul', { className: 'list-disc pl-5 space-y-1' },
                h('li', null, __alloT('stem.wave.sh_q1', 'Try f = 5 Hz at T = 100 N, then T = 25 N. Does the locked state happen at the same f? Why might that be?')),
                h('li', null, __alloT('stem.wave.sh_q2', 'Sweep frequency slowly from 1 → 20 Hz at fixed T. How many locked states do you find? Are they evenly spaced or pattern-spaced?')),
                h('li', null, __alloT('stem.wave.sh_q3', 'When you triple the tension, does the f of the first locked state triple, or change by some other factor? Predict before you check.')),
                h('li', null, __alloT('stem.wave.sh_q4', 'Log 4-5 locked observations. Look at the n column — what value do they share? Is that a coincidence or a constraint?')),
                h('li', null, __alloT('stem.wave.sh_q5', 'What relationship between f, T, and L would have to be true for an integer number of half-wavelengths to fit on the string?'))
              ),
              h('div', { className: 'text-[0.6875rem] italic text-amber-900 mt-2' }, __alloT('stem.wave.sh_no_answers', 'No answers will be revealed here. The point is to push your thinking, not to hand you a result.'))
            )
          ),
          // "I see it now" self-mark + explanation textarea — no automated scoring
          h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-300' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('input', {
                type: 'checkbox', id: 'sh-understood',
                checked: !!lab.understood,
                onChange: function(e) { setLab({ understood: e.target.checked }); },
                style: { minWidth: 24, minHeight: 24 },
                className: 'w-5 h-5'
              }),
              h('label', { htmlFor: 'sh-understood', className: 'text-[0.75rem] font-bold text-emerald-900 cursor-pointer' },
                __alloT('stem.wave.sh_understood_label', 'I think I understand the pattern now — let me explain it in my own words'))
            ),
            lab.understood && h('textarea', {
              value: lab.explanation || '',
              onChange: function(e) { setLab({ explanation: e.target.value }); },
              'aria-label': __alloT('stem.wave.explanation_input', 'Standing-wave explanation'), placeholder: __alloT('stem.wave.sh_explanation_placeholder', 'Explain in your own words: what determines when a standing wave forms? What role does tension play? What role does frequency play? What is "n"?'),
              className: 'w-full text-[0.75rem] border border-emerald-600 rounded p-2 font-mono leading-snug bg-white',
              rows: 4
            }),
            lab.understood && (lab.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[0.6875rem] italic text-emerald-900' },
              '✓ ' + __alloT('stem.wave.sh_saved_note', 'Saved. Notice — nobody checked your answer. The point of inquiry is the thinking that produced it, not external validation.'))
          ),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[0.6875rem] text-slate-700 italic' },
            __alloT('stem.wave.sh_design_note', 'Design note: this widget has no score, no chips, no reveal button, and no right-answer check. Everything you discover comes from manipulation and observation. That is what "inquiry" looks like when the answer-dump is removed.'))
        );
      }

      function renderGlossarySection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 ' + __alloT('stem.wave.sec_glossary_title', 'Wave glossary')),
          React.createElement('div', { className: 'space-y-1' },
            WAVE_GLOSSARY.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700' }, g.term),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — More wave reference (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var OPTICS_ELEMENTS = [
        { name: __alloT('stem.wave.oel1_name', 'Converging (convex) lens'), behavior: __alloT('stem.wave.oel1_behavior', 'Bends parallel rays toward focal point'), use: __alloT('stem.wave.oel1_use', 'Magnifying glass, eyeglasses for farsightedness, camera lenses, microscope objectives.') },
        { name: __alloT('stem.wave.oel2_name', 'Diverging (concave) lens'), behavior: __alloT('stem.wave.oel2_behavior', 'Spreads parallel rays as if from focal point'), use: __alloT('stem.wave.oel2_use', 'Eyeglasses for nearsightedness, peephole viewers.') },
        { name: __alloT('stem.wave.oel3_name', 'Concave (converging) mirror'), behavior: __alloT('stem.wave.oel3_behavior', 'Reflects parallel rays through focal point'), use: __alloT('stem.wave.oel3_use', 'Reflecting telescopes, satellite dishes, makeup mirrors (magnification).') },
        { name: __alloT('stem.wave.oel4_name', 'Convex (diverging) mirror'), behavior: __alloT('stem.wave.oel4_behavior', 'Reflects parallel rays as if from focal point'), use: __alloT('stem.wave.oel4_use', 'Car side mirrors ("objects in mirror are closer than they appear"), store security mirrors.') },
        { name: __alloT('stem.wave.oel5_name', 'Plane mirror'), behavior: __alloT('stem.wave.oel5_behavior', 'Flat reflection — image distance = object distance'), use: __alloT('stem.wave.oel5_use', 'Everyday mirrors. Image is virtual, upright, same-size, laterally inverted.') },
        { name: __alloT('stem.wave.oel6_name', 'Prism (triangular)'), behavior: __alloT('stem.wave.oel6_behavior', 'Separates white light into spectrum by refraction'), use: __alloT('stem.wave.oel6_use', 'Spectroscopy, rainbow demos. Different wavelengths refract by different amounts (dispersion).') },
        { name: __alloT('stem.wave.oel7_name', 'Diffraction grating'), behavior: __alloT('stem.wave.oel7_behavior', 'Separates light by many parallel slits'), use: __alloT('stem.wave.oel7_use', 'Higher resolution than prism. Used in modern spectrometers.') },
        { name: __alloT('stem.wave.oel8_name', 'Beam splitter'), behavior: __alloT('stem.wave.oel8_behavior', 'Transmits part of beam, reflects rest'), use: __alloT('stem.wave.oel8_use', 'Interferometers, LIGO, projectors, optical instruments.') },
        { name: __alloT('stem.wave.oel9_name', 'Polarizing filter'), behavior: __alloT('stem.wave.oel9_behavior', 'Transmits only one polarization direction'), use: __alloT('stem.wave.oel9_use', 'Sunglasses (cut glare from water/road), LCD displays, photography filters.') },
        { name: __alloT('stem.wave.oel10_name', 'Optical fiber'), behavior: __alloT('stem.wave.oel10_behavior', 'Total internal reflection guides light along the core'), use: __alloT('stem.wave.oel10_use', 'Internet backbone, endoscopes, fiber-optic Christmas trees.') },
        { name: __alloT('stem.wave.oel11_name', 'Half-silvered mirror'), behavior: __alloT('stem.wave.oel11_behavior', '~50% transmitted, ~50% reflected'), use: __alloT('stem.wave.oel11_use', 'One-way windows (only works with brightness asymmetry), Michelson interferometer.') },
        { name: __alloT('stem.wave.oel12_name', 'Retroreflector (corner cube)'), behavior: __alloT('stem.wave.oel12_behavior', 'Returns light to source regardless of angle'), use: __alloT('stem.wave.oel12_use', 'Bike reflectors, road signs, Apollo lunar laser ranging.') }
      ];

      var REFRACTION_INDICES = [
        { material: __alloT('stem.wave.ri_vacuum', 'Vacuum'), n: '1.0000 (defined)', notes: __alloT('stem.wave.ri_vacuum_notes', 'Reference. Light travels at c = 299,792,458 m/s.') },
        { material: __alloT('stem.wave.ri_air', 'Air (STP)'), n: '1.0003', notes: __alloT('stem.wave.ri_air_notes', 'Essentially same as vacuum for most purposes.') },
        { material: __alloT('stem.wave.ri_water', 'Water (20°C)'), n: '1.333', notes: __alloT('stem.wave.ri_water_notes', 'Bends light noticeably. Critical angle (water→air) ≈ 48.6°.') },
        { material: __alloT('stem.wave.ri_ethanol', 'Ethanol'), n: '1.361', notes: __alloT('stem.wave.ri_ethanol_notes', 'Slightly more refractive than water.') },
        { material: __alloT('stem.wave.ri_glycerin', 'Glycerin'), n: '1.473', notes: __alloT('stem.wave.ri_glycerin_notes', 'Submerged glass nearly invisible in glycerin (similar n).') },
        { material: __alloT('stem.wave.ri_quartz', 'Quartz'), n: '1.544', notes: __alloT('stem.wave.ri_quartz_notes', 'Common in optics. Some birefringence.') },
        { material: __alloT('stem.wave.ri_crown', 'Crown glass'), n: '1.52', notes: __alloT('stem.wave.ri_crown_notes', 'Standard eyeglass + lens material.') },
        { material: __alloT('stem.wave.ri_flint', 'Flint glass'), n: '1.65', notes: __alloT('stem.wave.ri_flint_notes', 'Higher dispersion than crown — used in achromatic doublets.') },
        { material: __alloT('stem.wave.ri_sapphire', 'Sapphire'), n: '1.77', notes: __alloT('stem.wave.ri_sapphire_notes', 'Watch crystals, smartphone camera lenses.') },
        { material: __alloT('stem.wave.ri_cz', 'Cubic zirconia'), n: '2.16', notes: __alloT('stem.wave.ri_cz_notes', 'Higher than glass — used as diamond simulant.') },
        { material: __alloT('stem.wave.ri_diamond', 'Diamond'), n: '2.42', notes: __alloT('stem.wave.ri_diamond_notes', 'Very high. Critical angle just 24.4° → "fire" via total internal reflection.') },
        { material: __alloT('stem.wave.ri_silicon', 'Silicon (visible)'), n: '~3.5', notes: __alloT('stem.wave.ri_silicon_notes', 'Opaque to visible but transparent in IR. Used in IR optics.') },
        { material: __alloT('stem.wave.ri_meta', 'Negative-index metamaterials'), n: '< 0 (engineered)', notes: __alloT('stem.wave.ri_meta_notes', 'Engineered structures bend light backward. Cloaking research.') }
      ];

      var DIFFRACTION_FACTS = [
        { fact: __alloT('stem.wave.df_singleslit', 'Single-slit diffraction'), formula: 'a·sin θ = m·λ (dark fringes)', notes: __alloT('stem.wave.df_singleslit_notes', 'a = slit width. Central bright fringe is twice as wide as side fringes.') },
        { fact: __alloT('stem.wave.df_doubleslit', 'Double-slit interference'), formula: 'd·sin θ = m·λ (bright fringes)', notes: __alloT('stem.wave.df_doubleslit_notes', 'd = slit separation. Demonstrates wave nature of light (Young, 1801).') },
        { fact: __alloT('stem.wave.df_grating', 'Diffraction grating'), formula: 'd·sin θ = m·λ', notes: __alloT('stem.wave.df_grating_notes', 'Many slits, very sharp peaks. Resolution improves with more slits.') },
        { fact: __alloT('stem.wave.df_rayleigh', 'Rayleigh criterion'), formula: 'θ_min ≈ 1.22 λ / D', notes: __alloT('stem.wave.df_rayleigh_notes', 'Smallest angle resolvable by circular aperture of diameter D. Limits telescope/microscope resolution.') },
        { fact: __alloT('stem.wave.df_bragg', 'Bragg\'s law (X-ray crystallography)'), formula: '2d·sin θ = n·λ', notes: __alloT('stem.wave.df_bragg_notes', 'X-rays diffract from crystal planes. Used to determine atomic positions.') },
        { fact: __alloT('stem.wave.df_spotsize', 'Diffraction-limited spot size'), formula: '≈ λ/(2·NA)', notes: __alloT('stem.wave.df_spotsize_notes', 'NA = numerical aperture. Visible light limit ~200 nm — why electron microscopes have higher resolution.') }
      ];

      var POLARIZATION_NOTES = [
        { topic: __alloT('stem.wave.pol_whatis', 'What it is'), detail: __alloT('stem.wave.pol_whatis_detail', 'Direction of oscillation of the electric field in EM waves. Sound (longitudinal) cannot be polarized.') },
        { topic: __alloT('stem.wave.pol_linear', 'Linear polarization'), detail: __alloT('stem.wave.pol_linear_detail', 'E-field oscillates in single plane. Most "polarized" light is linear.') },
        { topic: __alloT('stem.wave.pol_circular', 'Circular polarization'), detail: __alloT('stem.wave.pol_circular_detail', 'E-field rotates in circle. Right vs left circular. Used in 3D movies.') },
        { topic: __alloT('stem.wave.pol_malus', 'Malus\'s law'), detail: __alloT('stem.wave.pol_malus_detail', 'I = I₀·cos²θ. Light through two polarizers: angle between them controls intensity.') },
        { topic: __alloT('stem.wave.pol_brewster', 'Brewster\'s angle'), detail: __alloT('stem.wave.pol_brewster_detail', 'tan θ_B = n₂/n₁. Reflected light is fully polarized at this angle of incidence.') },
        { topic: __alloT('stem.wave.pol_birefringence', 'Birefringence'), detail: __alloT('stem.wave.pol_birefringence_detail', 'Some crystals (calcite, quartz) split unpolarized light into two polarized rays.') },
        { topic: __alloT('stem.wave.pol_glare', 'Real-world: glare'), detail: __alloT('stem.wave.pol_glare_detail', 'Reflection off horizontal surfaces (water, road) polarizes horizontally. Polarized sunglasses block this.') },
        { topic: __alloT('stem.wave.pol_lcds', 'Real-world: LCDs'), detail: __alloT('stem.wave.pol_lcds_detail', 'Two crossed polarizers + liquid crystals → controllable transmission per pixel.') },
        { topic: __alloT('stem.wave.pol_stress', 'Real-world: stress analysis'), detail: __alloT('stem.wave.pol_stress_detail', 'Polarized light through plastic models shows stress patterns as color bands.') },
        { topic: __alloT('stem.wave.pol_3d', 'Real-world: 3D movies'), detail: __alloT('stem.wave.pol_3d_detail', 'Circular polarization (RealD) or linear at 45°/135° (older systems) separates left/right images.') }
      ];

      var QUANTUM_WAVES = [
        { topic: __alloT('stem.wave.qw_debroglie', 'de Broglie wavelength'), detail: __alloT('stem.wave.qw_debroglie_detail', 'λ = h/p. Every massive particle has a wave nature. For an electron at 100 eV, λ ≈ 0.12 nm.') },
        { topic: __alloT('stem.wave.qw_duality', 'Wave-particle duality'), detail: __alloT('stem.wave.qw_duality_detail', 'Photons + electrons show both wave + particle behavior. Single-photon double-slit experiments confirm interference even with one photon at a time.') },
        { topic: __alloT('stem.wave.qw_schrodinger', 'Schrödinger equation'), detail: __alloT('stem.wave.qw_schrodinger_detail', 'Wave equation for matter waves. Solutions ψ give probability amplitude. |ψ|² = probability density.') },
        { topic: __alloT('stem.wave.qw_heisenberg', 'Heisenberg uncertainty'), detail: __alloT('stem.wave.qw_heisenberg_detail', 'Δx · Δp ≥ ℏ/2. Position + momentum can\'t both be measured precisely. Fundamental, not measurement error.') },
        { topic: __alloT('stem.wave.qw_quantized', 'Quantized energy'), detail: __alloT('stem.wave.qw_quantized_detail', 'Bound systems (atoms, harmonic oscillators) only allow specific energy levels. Like standing waves on a string.') },
        { topic: __alloT('stem.wave.qw_tunneling', 'Tunneling'), detail: __alloT('stem.wave.qw_tunneling_detail', 'Wave nature lets particles "tunnel" through energy barriers classically forbidden. Basis of STM, alpha decay, flash memory.') },
        { topic: __alloT('stem.wave.qw_photon', 'Photon energy'), detail: __alloT('stem.wave.qw_photon_detail', 'E = hf = hc/λ. Higher frequency → higher-energy photon. UV photons can ionize; IR cannot.') },
        { topic: __alloT('stem.wave.qw_compton', 'Compton scattering'), detail: __alloT('stem.wave.qw_compton_detail', 'Photon-electron collision shifts photon wavelength. Confirms photons carry momentum p = h/λ.') },
        { topic: __alloT('stem.wave.qw_pauli', 'Pauli exclusion'), detail: __alloT('stem.wave.qw_pauli_detail', 'Identical fermions cannot occupy same quantum state. Why electrons fill shells; why matter has structure.') },
        { topic: __alloT('stem.wave.qw_coherence', 'Coherence length'), detail: __alloT('stem.wave.qw_coherence_detail', 'Distance over which wave maintains phase. Laser: kilometers. Sunlight: micrometers. Needed for interference.') }
      ];

      var SEISMIC_WAVES = [
        { name: __alloT('stem.wave.sw_p', 'P-wave (primary)'), type: __alloT('stem.wave.sw_p_type', 'Body wave / longitudinal'), speed: __alloT('stem.wave.sw_p_speed', '~5–8 km/s in crust'), notes: __alloT('stem.wave.sw_p_notes', 'Fastest. Compression/rarefaction along travel direction. Travels through solids AND liquids — passes through Earth\'s outer core.') },
        { name: __alloT('stem.wave.sw_s', 'S-wave (secondary/shear)'), type: __alloT('stem.wave.sw_s_type', 'Body wave / transverse'), speed: __alloT('stem.wave.sw_s_speed', '~3–4.5 km/s in crust'), notes: __alloT('stem.wave.sw_s_notes', 'Slower than P. Side-to-side shaking. Cannot travel through liquids → outer core blocks S-waves (key evidence it\'s liquid).') },
        { name: __alloT('stem.wave.sw_love', 'Love wave'), type: __alloT('stem.wave.sw_surface_type', 'Surface wave'), speed: __alloT('stem.wave.sw_love_speed', '~3–4.5 km/s'), notes: __alloT('stem.wave.sw_love_notes', 'Horizontal transverse motion at surface. More damaging to buildings than P/S.') },
        { name: __alloT('stem.wave.sw_rayleigh', 'Rayleigh wave'), type: __alloT('stem.wave.sw_surface_type', 'Surface wave'), speed: __alloT('stem.wave.sw_rayleigh_speed', '~2–4 km/s'), notes: __alloT('stem.wave.sw_rayleigh_notes', 'Rolling motion (like ocean waves). Largest amplitude. Felt as the rolling shake of an earthquake.') }
      ];

      var SEISMIC_FACTS = [
        { fact: __alloT('stem.wave.sf_richter', 'Richter magnitude'), detail: __alloT('stem.wave.sf_richter_detail', 'Logarithmic. Each +1 magnitude = ~10× amplitude, ~32× energy. M7 releases ~1000× energy of M5.') },
        { fact: __alloT('stem.wave.sf_moment', 'Moment magnitude (Mw)'), detail: __alloT('stem.wave.sf_moment_detail', 'Used for modern measurements, especially large quakes. Replaced Richter for M > ~6.5.') },
        { fact: __alloT('stem.wave.sf_mercalli', 'Mercalli intensity'), detail: __alloT('stem.wave.sf_mercalli_detail', 'Felt-effects scale (I-XII). What people experienced, not energy released. Same quake = different intensity at different distances.') },
        { fact: __alloT('stem.wave.sf_epicenter', 'Locating an epicenter'), detail: __alloT('stem.wave.sf_epicenter_detail', '3 stations measure P-S arrival-time difference → distance to each → triangulate epicenter.') },
        { fact: __alloT('stem.wave.sf_structure', 'Earth\'s structure (from seismology)'), detail: __alloT('stem.wave.sf_structure_detail', 'P/S wave behavior revealed liquid outer core, solid inner core, mantle, crust. Discontinuities mapped.') },
        { fact: __alloT('stem.wave.sf_tsunami', 'Tsunami warning'), detail: __alloT('stem.wave.sf_tsunami_detail', 'Underwater quake → ocean displacement → long-wavelength wave traveling ~700 km/h in deep water. P-wave arrival gives ~minutes warning before tsunami.') },
        { fact: __alloT('stem.wave.sf_largest', 'Largest recorded'), detail: __alloT('stem.wave.sf_largest_detail', 'Chile 1960: M9.5 (~32× energy of biggest US quake — 1964 Alaska M9.2). Tsunami crossed Pacific.') }
      ];

      var OCEAN_WAVES = [
        { type: __alloT('stem.wave.ow_wind', 'Wind wave (sea)'), period: '< 10 s', wavelength: '~10–100 m', notes: __alloT('stem.wave.ow_wind_notes', 'Local wind generated. Variable height + direction.') },
        { type: __alloT('stem.wave.ow_swell', 'Swell'), period: '10–30 s', wavelength: '~100–800 m', notes: __alloT('stem.wave.ow_swell_notes', 'Wind waves that have traveled far. Sorted into regular sets.') },
        { type: __alloT('stem.wave.ow_tsunami', 'Tsunami'), period: '~10 min – 2 hr', wavelength: '~100–500 km', notes: __alloT('stem.wave.ow_tsunami_notes', 'Tiny height in deep ocean (<1 m) but VERY long wavelength. Pile up at shore.') },
        { type: __alloT('stem.wave.ow_tide', 'Tide'), period: '~12 h or 24 h', wavelength: 'half Earth\'s circumference', notes: __alloT('stem.wave.ow_tide_notes', 'Gravitational pull of Moon + Sun. Bulges in ocean rotate as Earth turns.') },
        { type: __alloT('stem.wave.ow_seiche', 'Seiche'), period: 'min to hours', wavelength: 'enclosed basin', notes: __alloT('stem.wave.ow_seiche_notes', 'Standing wave in enclosed/semi-enclosed water (lakes, harbors). Triggered by wind, pressure, quakes.') },
        { type: __alloT('stem.wave.ow_rogue', 'Rogue wave'), period: 'irregular', wavelength: 'irregular', notes: __alloT('stem.wave.ow_rogue_notes', 'Unusually large (>2× average). Once thought myth, now confirmed; constructive interference of swells.') }
      ];

      var OCEAN_FACTS = [
        { fact: __alloT('stem.wave.of_deep', 'Deep water'), detail: __alloT('stem.wave.of_deep_detail', 'Depth > λ/2. Wave speed depends only on λ: v = √(gλ/2π).') },
        { fact: __alloT('stem.wave.of_shallow', 'Shallow water'), detail: __alloT('stem.wave.of_shallow_detail', 'Depth < λ/20. Wave speed depends only on depth: v = √(gd). Tsunamis are always shallow-water waves (huge λ).') },
        { fact: __alloT('stem.wave.of_breaking', 'Wave breaking'), detail: __alloT('stem.wave.of_breaking_detail', 'Waves break when amplitude/wavelength > ~1/7. Crest moves faster than trough → tips over.') },
        { fact: __alloT('stem.wave.of_sigheight', 'Significant wave height'), detail: __alloT('stem.wave.of_sigheight_detail', 'Average height of tallest 1/3 of waves — better matches what a sailor would call "the wave height".') },
        { fact: __alloT('stem.wave.of_tides', 'Spring vs neap tides'), detail: __alloT('stem.wave.of_tides_detail', 'Spring (extreme): Sun + Moon aligned (new/full moon). Neap (mild): Sun + Moon at 90° (quarter moons).') }
      ];

      var ANTENNA_TYPES = [
        { type: __alloT('stem.wave.ant_dipole', 'Dipole'), size: '~λ/2', use: __alloT('stem.wave.ant_dipole_use', 'Simplest resonant antenna. FM radio dipole is ~1.5 m.') },
        { type: __alloT('stem.wave.ant_yagi', 'Yagi-Uda'), size: __alloT('stem.wave.ant_yagi_size', 'multi-element'), use: __alloT('stem.wave.ant_yagi_use', 'Directional. Old rooftop TV antennas, ham radio.') },
        { type: __alloT('stem.wave.ant_dish', 'Parabolic dish'), size: __alloT('stem.wave.ant_dish_size', '> 10λ for efficient gain'), use: __alloT('stem.wave.ant_dish_use', 'Satellite TV, radio astronomy, deep-space comm.') },
        { type: __alloT('stem.wave.ant_patch', 'Patch (microstrip)'), size: '~λ/2', use: __alloT('stem.wave.ant_patch_use', 'GPS, Wi-Fi, phones. Flat, easy to mass-manufacture.') },
        { type: __alloT('stem.wave.ant_helical', 'Helical'), size: __alloT('stem.wave.ant_helical_size', '~λ circumference per turn'), use: __alloT('stem.wave.ant_helical_use', 'Circularly polarized. Satellite uplinks.') },
        { type: __alloT('stem.wave.ant_loop', 'Loop'), size: __alloT('stem.wave.ant_loop_size', 'fraction of λ'), use: __alloT('stem.wave.ant_loop_use', 'AM radio receivers, RFID tags.') },
        { type: __alloT('stem.wave.ant_horn', 'Horn'), size: '~few λ', use: __alloT('stem.wave.ant_horn_use', 'Radar feeds, microwave links. Broadband.') },
        { type: __alloT('stem.wave.ant_phased', 'Phased array'), size: __alloT('stem.wave.ant_phased_size', 'matrix of elements'), use: __alloT('stem.wave.ant_phased_use', 'Steer beam electronically. Modern radar, 5G mmWave, Starlink user terminals.') }
      ];

      var RADAR_SONAR = [
        { system: __alloT('stem.wave.rs_primary', 'Primary radar'), use: __alloT('stem.wave.rs_primary_use', 'Aircraft detection. Pulse sent → echo measured. Range = c·Δt/2.') },
        { system: __alloT('stem.wave.rs_doppler', 'Doppler radar'), use: __alloT('stem.wave.rs_doppler_use', 'Weather (rain motion → wind), police speed guns. Frequency shift → velocity.') },
        { system: __alloT('stem.wave.rs_sar', 'Synthetic aperture radar (SAR)'), use: __alloT('stem.wave.rs_sar_use', 'Moving platform creates effective large aperture. Earth imaging from satellites; works through clouds + at night.') },
        { system: __alloT('stem.wave.rs_phased', 'Phased array radar'), use: __alloT('stem.wave.rs_phased_use', 'Steerable beam without moving the dish. AEGIS, modern fighters.') },
        { system: __alloT('stem.wave.rs_active', 'Active sonar'), use: __alloT('stem.wave.rs_active_use', 'Send pulse, listen for echo. Submarine detection, fish-finding. Limited range due to sound absorption.') },
        { system: __alloT('stem.wave.rs_passive', 'Passive sonar'), use: __alloT('stem.wave.rs_passive_use', 'Listen for sounds from targets. Submarines use this when avoiding detection (no emissions).') },
        { system: __alloT('stem.wave.rs_echo', 'Echolocation (biological)'), use: __alloT('stem.wave.rs_echo_use', 'Bats, dolphins. Frequencies up to ~200 kHz (bats); chirps adapted for prey.') },
        { system: __alloT('stem.wave.rs_ultrasound', 'Ultrasound (medical)'), use: __alloT('stem.wave.rs_ultrasound_use', '1–20 MHz pulses image internal tissues. Doppler mode shows blood flow.') },
        { system: __alloT('stem.wave.rs_lidar', 'LIDAR'), use: __alloT('stem.wave.rs_lidar_use', 'Laser pulses → 3D point clouds. Self-driving cars, archaeology (forest-floor mapping).') }
      ];

      var SHOCKWAVE_FACTS = [
        { fact: __alloT('stem.wave.shk_mach', 'Mach number'), detail: __alloT('stem.wave.shk_mach_detail', 'M = v/v_sound. M<1 subsonic, M=1 transonic, M>1 supersonic, M>5 hypersonic.') },
        { fact: __alloT('stem.wave.shk_boom', 'Sonic boom'), detail: __alloT('stem.wave.shk_boom_detail', 'Cone of compressed air trailing supersonic objects. Heard as boom when cone passes you.') },
        { fact: __alloT('stem.wave.shk_cone', 'Mach cone angle'), detail: __alloT('stem.wave.shk_cone_detail', 'sin α = 1/M. Faster object → narrower cone.') },
        { fact: __alloT('stem.wave.shk_thickness', 'Shock wave thickness'), detail: __alloT('stem.wave.shk_thickness_detail', 'Just a few mean free paths (~micrometers in atmosphere). Steep pressure jump.') },
        { fact: __alloT('stem.wave.shk_speed', 'Sound of speed (air, 20°C)'), detail: __alloT('stem.wave.shk_speed_detail', '343 m/s = 1235 km/h = 767 mph. Increases with temperature: v ≈ 331 + 0.6·T(°C) m/s.') },
        { fact: __alloT('stem.wave.shk_media', 'Other media'), detail: __alloT('stem.wave.shk_media_detail', 'Water: ~1480 m/s. Steel: ~5000 m/s. Hotter, denser, stiffer → faster sound.') },
        { fact: __alloT('stem.wave.shk_whip', 'Bullwhip crack'), detail: __alloT('stem.wave.shk_whip_detail', 'Tip of whip exceeds Mach 1 → mini sonic boom.') },
        { fact: __alloT('stem.wave.shk_explosion', 'Explosion shock wave'), detail: __alloT('stem.wave.shk_explosion_detail', 'Initial pressure jump (overpressure) travels faster than sound, slowing to sound speed with distance.') }
      ];

      var WAVE_HISTORY = [
        { year: '1665', who: 'Robert Hooke', what: __alloT('stem.wave.hist_1665', 'First observed diffraction.') },
        { year: '1690', who: 'Christiaan Huygens', what: __alloT('stem.wave.hist_1690', 'Wave theory of light. Huygens\' principle (every point on wavefront is source of secondary wavelets).') },
        { year: '1801', who: 'Thomas Young', what: __alloT('stem.wave.hist_1801', 'Double-slit experiment. Established wave nature of light through interference.') },
        { year: '1818', who: 'Augustin Fresnel', what: __alloT('stem.wave.hist_1818', 'Mathematical theory of diffraction. Predicted (correctly) the "Poisson spot" — bright dot in center of circular shadow.') },
        { year: '1842', who: 'Christian Doppler', what: __alloT('stem.wave.hist_1842', 'Doppler effect for sound and light.') },
        { year: '1864', who: 'James Clerk Maxwell', what: __alloT('stem.wave.hist_1864', 'Maxwell\'s equations — light is electromagnetic wave. Predicted speed = c.') },
        { year: '1887', who: 'Heinrich Hertz', what: __alloT('stem.wave.hist_1887', 'Produced + detected radio waves in lab. Confirmed Maxwell\'s prediction.') },
        { year: '1900', who: 'Max Planck', what: __alloT('stem.wave.hist_1900', 'E = hf — energy is quantized. Birth of quantum theory.') },
        { year: '1905', who: 'Albert Einstein', what: __alloT('stem.wave.hist_1905', 'Photoelectric effect — light comes in quanta (photons). Nobel 1921.') },
        { year: '1924', who: 'Louis de Broglie', what: __alloT('stem.wave.hist_1924', 'Matter waves: λ = h/p. Even electrons are waves.') },
        { year: '1927', who: 'Davisson + Germer', what: __alloT('stem.wave.hist_1927', 'Confirmed electron diffraction — proved matter waves.') },
        { year: '1960', who: 'Theodore Maiman', what: __alloT('stem.wave.hist_1960', 'First working laser (ruby).') },
        { year: '2015', who: 'LIGO collaboration', what: __alloT('stem.wave.hist_2015', 'First direct detection of gravitational waves (binary black hole merger).') }
      ];

      function renderOpticsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔍 ' + __alloT('stem.wave.sec_optics_title', 'Optics — lenses, mirrors, and elements')),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mb-3' },
            renderTryInSimBtn('optics_ar_coating', __alloT('stem.wave.try_optics_ar', 'Quarter-Wave AR Coating (R \u2248 0%)'), { waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: true, medium2Ratio: 0.5, incidentAngleDeg: 0, wallFrac: 0.55 })
          ),
          React.createElement('div', { className: 'space-y-2' },
            OPTICS_ELEMENTS.map(function(o, i) {
              return React.createElement('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, o.name),
                React.createElement('div', { className: 'text-[0.6875rem] text-cyan-700 font-bold mb-1' }, o.behavior),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, o.use)
              );
            })
          )
        );
      }

      function renderRefractionSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↻ ' + __alloT('stem.wave.sec_refraction_title', 'Refractive indices')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-2 leading-relaxed' }, __alloT('stem.wave.sec_refraction_intro', 'Snell\'s law: n₁ sin θ₁ = n₂ sin θ₂. Light slows by factor n in material; n is wavelength-dependent (dispersion).')),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mb-3' },
            renderTryInSimBtn('refract_slow_glass', __alloT('stem.wave.try_refract_glass', 'Glass Refraction (v\u2082=0.65v\u2081, 35\u00B0)'), { waveMode: 'reflection', medium2Ratio: 0.65, incidentAngleDeg: 35, reflectivity: 0.45, wallFrac: 0.55 }),
            renderTryInSimBtn('refract_tir_diamond', __alloT('stem.wave.try_refract_tir', 'Total Internal Reflection (v\u2082=1.50v\u2081, 55\u00B0)'), { waveMode: 'reflection', medium2Ratio: 1.5, incidentAngleDeg: 55, reflectivity: 0.4, wallFrac: 0.55 })
          ),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_material', 'Material'), 'n', __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                REFRACTION_INDICES.map(function(r, i) {
                  return React.createElement('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, r.material),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, r.n),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, r.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderDiffractionSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∿ ' + __alloT('stem.wave.tab_diffraction', 'Diffraction')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_diffraction_intro', 'Diffraction = bending of waves around obstacles or through openings. Most noticeable when feature size ≈ wavelength.')),
          React.createElement('div', { className: 'space-y-2' },
            DIFFRACTION_FACTS.map(function(d, i) {
              var diffTry = i === 0
                ? renderTryInSimBtn('diff_single_slit', d.fact, { waveMode: 'ripple', rippleBarrier: 'singleSlit', slitWidth: 0.08, showIntensityScreen: true })
                : i === 1
                  ? renderTryInSimBtn('diff_double_slit', d.fact, { waveMode: 'ripple', rippleBarrier: 'doubleSlit', slitWidth: 0.08, showIntensityScreen: true })
                  : i === 2
                    ? renderTryInSimBtn('diff_grating_5slit', d.fact, { waveMode: 'ripple', rippleBarrier: 'grating', gratingSlits: 5, slitWidth: 0.08, showIntensityScreen: true, ripplePhaseDiff: 0 })
                    : null;
              return React.createElement('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, d.fact),
                React.createElement('div', { className: 'text-[0.6875rem] font-mono text-cyan-700 font-bold mb-1' }, d.formula),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, d.notes),
                diffTry
              );
            })
          )
        );
      }

      function renderPolarizationSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↕ ' + __alloT('stem.wave.tab_polarization', 'Polarization')),
          React.createElement('div', { className: 'space-y-2' },
            POLARIZATION_NOTES.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, p.topic),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, p.detail)
              );
            })
          ),
          renderTryInSimBtn('pol_brewster_demo', __alloT('stem.wave.try_brewster_tm', 'Brewster Angle Glare Elimination (TM p-pol)'), { waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: false, fresnelPolarization: 'p', medium2Ratio: 0.6, incidentAngleDeg: 59 })
        );
      }

      function renderQuantumSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚛ ' + __alloT('stem.wave.tab_quantum', 'Quantum waves')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_quantum_intro', 'In quantum mechanics, every particle has wave properties. The "wave function" ψ gives probability amplitude.')),
          React.createElement('div', { className: 'space-y-2' },
            QUANTUM_WAVES.map(function(q, i) {
              return React.createElement('div', { key: 'q'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, q.topic),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, q.detail)
              );
            })
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-2' },
            renderTryInSimBtn('quantum_tunneling', __alloT('stem.wave.try_quantum_tunneling', 'Evanescent Barrier Tunneling (FTIR d=0.25\u03BB)'), { waveMode: 'reflection', medium2Ratio: 1.5, incidentAngleDeg: 55, ftirEnabled: true, ftirGapLambda: 0.25, impedanceCoupled: true }),
            renderTryInSimBtn('quantum_box_packet', __alloT('stem.wave.try_quantum_packet', 'Wave Packet Localization'), { waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.75, frequency: 4 })
          )
        );
      }

      function renderSeismicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌋 ' + __alloT('stem.wave.tab_seismicwaves', 'Seismic waves')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.tab_types', 'Wave types')),
            React.createElement('div', { className: 'space-y-1' },
              SEISMIC_WAVES.map(function(w, i) {
                return React.createElement('div', { key: 'w'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, w.name),
                    React.createElement('span', { className: 'text-[0.625rem] text-cyan-700 ml-auto font-mono' }, w.speed)
                  ),
                  React.createElement('div', { className: 'text-[0.625rem] text-slate-700 italic mb-0.5' }, w.type),
                  React.createElement('div', { className: 'text-[0.625rem] text-slate-700' }, w.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_seismology_essentials', 'Seismology essentials')),
          React.createElement('div', { className: 'space-y-1' },
            SEISMIC_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.6875rem] font-black text-cyan-700 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-2' },
            renderTryInSimBtn('seismic_pwave', __alloT('stem.wave.try_seismic_p', 'Seismic P-Wave (Longitudinal)'), { waveMode: 'longitudinal', longitudinalMode: 'traveling', airTempCoupled: false, waveSpeed: 600, frequency: 2 }),
            renderTryInSimBtn('seismic_refract', __alloT('stem.wave.try_seismic_refract', 'Crust-Mantle Refraction (v\u2082 = 1.6v\u2081)'), { waveMode: 'reflection', medium2Ratio: 1.6, incidentAngleDeg: 30, impedanceCoupled: true, ftirEnabled: false })
          )
        );
      }

      function renderOceanSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏄 ' + __alloT('stem.wave.tab_oceanwaves', 'Ocean waves')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_ocean_wave_types', 'Ocean wave types')),
            React.createElement('div', { className: 'space-y-1' },
              OCEAN_WAVES.map(function(o, i) {
                return React.createElement('div', { key: 'o'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, o.type),
                    React.createElement('span', { className: 'text-[0.625rem] text-cyan-700 font-mono ml-auto' }, 'T: ' + o.period + ' · λ: ' + o.wavelength)
                  ),
                  React.createElement('div', { className: 'text-[0.625rem] text-slate-700' }, o.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_wave_physics_water', 'Wave physics in water')),
          React.createElement('div', { className: 'space-y-1' },
            OCEAN_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.6875rem] font-black text-cyan-700 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-2' },
            renderTryInSimBtn('ocean_deep_packet', 'Deep-Water Wave Packet (vg = 0.5 vp)', { waveMode: 'free', packetMode: 'packet', dispersionRatio: 0.5, oceanDepthCoupled: true, waterDepthRatio: 0.80, frequency: 4, waveSpeed: 1500 }),
            renderTryInSimBtn('ocean_tsunami_shallow', __alloT('stem.wave.try_ocean_tsunami', 'Shallow Tsunami Dispersion (h/\u03BB = 0.03)'), { waveMode: 'free', packetMode: 'packet', oceanDepthCoupled: true, waterDepthRatio: 0.03, frequency: 2, waveSpeed: 200 })
          )
        );
      }

      function renderAntennasSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📶 ' + __alloT('stem.wave.sec_antennas_title', 'Antenna types')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-2 leading-relaxed' }, __alloT('stem.wave.sec_antennas_intro', 'Antenna size typically tied to wavelength. Lower frequency = longer wavelength = bigger antenna.')),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mb-3' },
            renderTryInSimBtn('antennas_phased_beam', __alloT('stem.wave.try_antennas_phased', 'Phased-Array Beam Steering (\u0394\u03C6 = +90\u00B0)'), { waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: 1.5708, showIntensityScreen: true, frequency: 3, rippleSeparation: 80 })
          ),
          React.createElement('div', { className: 'space-y-2' },
            ANTENNA_TYPES.map(function(a, i) {
              return React.createElement('div', { key: 'a'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-slate-800' }, a.type),
                  React.createElement('span', { className: 'text-[0.625rem] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, a.size)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, a.use)
              );
            })
          )
        );
      }

      function renderRadarSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 ' + __alloT('stem.wave.sec_radar_title', 'Radar, sonar, and active ranging')),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mb-3' },
            renderTryInSimBtn('radar_phased_array', __alloT('stem.wave.try_radar_phased', 'Steered Phased-Array Radar Lobe'), { waveMode: 'ripple', rippleBarrier: 'none', ripplePhaseDiff: -1.5708, showIntensityScreen: true, frequency: 3, rippleSeparation: 80 }),
            renderTryInSimBtn('radar_sonar_echo', __alloT('stem.wave.try_sonar_echo', 'Sonar Boundary Echo Ranging (2d/v\u2081)'), { waveMode: 'reflection', waveSpeed: 1482, reflectivity: 0.85, wallFrac: 0.65, incidentAngleDeg: 0 })
          ),
          React.createElement('div', { className: 'space-y-2' },
            RADAR_SONAR.map(function(r, i) {
              return React.createElement('div', { key: 'r'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, r.system),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, r.use)
              );
            })
          )
        );
      }

      function renderShockwavesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '✈ ' + __alloT('stem.wave.tab_shockwaves', 'Shock waves')),
          React.createElement('div', { className: 'space-y-2' },
            SHOCKWAVE_FACTS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, s.fact),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.detail)
              );
            })
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-2 mt-2' },
            renderTryInSimBtn('shockwave_mach15', __alloT('stem.wave.try_mach_cone', 'Mach 1.5 Supersonic Shock Cone'), { waveMode: 'doppler', dopplerRegime: 'acoustic', sourceSpeed: 1.5, observerSpeed: 0 })
          )
        );
      }

      function renderFamousSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 ' + __alloT('stem.wave.sec_history_title', 'History of wave science')),
          React.createElement('div', { className: 'space-y-2' },
            WAVE_HISTORY.map(function(h2, i) {
              return React.createElement('div', { key: 'h' + i, scope: 'col', className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  React.createElement('span', { className: 'text-[0.625rem] font-mono text-cyan-700 font-bold' }, h2.year),
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-cyan-700' }, h2.who)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, h2.what)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'types') return renderTypesSection();
        if (expSection === 'quantities') return renderQuantitiesSection();
        if (expSection === 'formulas') return renderFormulasSection();
        if (expSection === 'interference') return renderInterferenceSection();
        if (expSection === 'doppler') return renderDopplerSection();
        if (expSection === 'spectrum') return renderSpectrumSection();
        if (expSection === 'colors') return renderColorsSection();
        if (expSection === 'harmonics') return renderHarmonicsSection();
        if (expSection === 'instruments') return renderInstrumentsSection();
        if (expSection === 'decibels') return renderDecibelsSection();
        if (expSection === 'optics') return renderOpticsSection();
        if (expSection === 'refraction') return renderRefractionSection();
        if (expSection === 'diffraction') return renderDiffractionSection();
        if (expSection === 'polarization') return renderPolarizationSection();
        if (expSection === 'quantum') return renderQuantumSection();
        if (expSection === 'seismic') return renderSeismicSection();
        if (expSection === 'ocean') return renderOceanSection();
        if (expSection === 'antennas') return renderAntennasSection();
        if (expSection === 'radar') return renderRadarSection();
        if (expSection === 'shockwaves') return renderShockwavesSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'colors2') return renderColors2Section();
        if (expSection === 'lasers') return renderLasersSection();
        if (expSection === 'fibers') return renderFibersSection();
        if (expSection === 'protocols') return renderProtocolsSection();
        if (expSection === 'music') return renderMusicSection();
        if (expSection === 'hearing') return renderHearingSection();
        if (expSection === 'medical') return renderMedicalSection();
        if (expSection === 'satellites') return renderSatellitesSection();
        if (expSection === 'gravitational') return renderGravitationalSection();
        if (expSection === 'units2') return renderUnitsSection();
        if (expSection === 'careers') return renderCareersSection();
        if (expSection === 'animals') return renderAnimalsSection();
        if (expSection === 'instrumentfreqs') return renderInstrumentFreqSection();
        if (expSection === 'radio') return renderRadioSection();
        if (expSection === 'colorhex') return renderColorhexSection();
        if (expSection === 'wavespeed') return renderWaveSpeedSection();
        if (expSection === 'stars') return renderStarsSection();
        if (expSection === 'tvfreq') return renderTvfreqSection();
        if (expSection === 'noise') return renderNoiseSection();
        if (expSection === 'speeds2') return renderSpeeds2Section();
        if (expSection === 'cameras') return renderCamerasSection();
        if (expSection === 'optical_facts') return renderOpticalFactsSection();
        if (expSection === 'recordings') return renderRecordingsSection();
        if (expSection === 'discoverWave') return renderDiscoverWaveSection();
        if (expSection === 'standingHunt') return renderStandingHuntSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var AUDIO_FORMATS = [
        { format: 'WAV (PCM)', extension: '.wav', compression: __alloT('stem.wave.af_comp_none', 'None (lossless)'), notes: __alloT('stem.wave.af_wav_notes', 'Raw uncompressed audio. ~10 MB/min at CD quality. Standard for editing.') },
        { format: 'FLAC', extension: '.flac', compression: __alloT('stem.wave.af_comp_lossless', 'Lossless'), notes: __alloT('stem.wave.af_flac_notes', 'Free Lossless Audio Codec. ~5 MB/min CD quality. Bit-perfect — when decoded, identical to original.') },
        { format: 'ALAC', extension: '.m4a, .alac', compression: __alloT('stem.wave.af_comp_lossless', 'Lossless'), notes: __alloT('stem.wave.af_alac_notes', 'Apple Lossless Audio Codec. Similar to FLAC but Apple-developed.') },
        { format: 'MP3', extension: '.mp3', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_mp3_notes', 'Most common lossy format. 128 kbps = compact but audible artifacts. 320 kbps near-transparent.') },
        { format: 'AAC', extension: '.aac, .m4a', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_aac_notes', 'Better quality than MP3 at same bitrate. iTunes, YouTube use it.') },
        { format: 'OGG Vorbis', extension: '.ogg', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_ogg_notes', 'Open-source alternative to MP3. Often used in games (Minecraft, Spotify).') },
        { format: 'Opus', extension: '.opus', compression: __alloT('stem.wave.af_comp_lossy', 'Lossy'), notes: __alloT('stem.wave.af_opus_notes', 'Modern open codec. Excellent at low bitrates (6-510 kbps). Used in WebRTC, Discord, YouTube.') },
        { format: 'WMA', extension: '.wma', compression: __alloT('stem.wave.af_comp_lossy_or_lossless', 'Lossy or lossless'), notes: __alloT('stem.wave.af_wma_notes', 'Microsoft\'s codec. Largely abandoned.') },
        { format: 'AIFF', extension: '.aiff', compression: __alloT('stem.wave.af_comp_none', 'None (lossless)'), notes: __alloT('stem.wave.af_aiff_notes', 'Apple\'s uncompressed format. Similar to WAV.') },
        { format: 'MIDI', extension: '.mid', compression: __alloT('stem.wave.af_comp_midi', 'Not audio — instructions'), notes: __alloT('stem.wave.af_midi_notes', 'Stores notes + timing, not sound. Player synthesizes. Tiny files.') },
        { format: 'DSD', extension: '.dsf, .dff', compression: __alloT('stem.wave.af_comp_dsd', 'PDM (different from PCM)'), notes: __alloT('stem.wave.af_dsd_notes', 'Used for Super Audio CD. 1-bit, very high sample rate (2.8+ MHz).') }
      ];

      var AUDIO_BITRATES = [
        { quality: __alloT('stem.wave.ab_phone', 'Phone call (G.711)'), bitrate: '64 kbps', notes: __alloT('stem.wave.ab_phone_notes', '8 kHz sample, narrow band.') },
        { quality: __alloT('stem.wave.ab_opus', 'Opus low quality'), bitrate: '24 kbps', notes: __alloT('stem.wave.ab_opus_notes', 'Voice still intelligible.') },
        { quality: __alloT('stem.wave.ab_am', 'AM radio quality'), bitrate: '~30 kbps equiv', notes: __alloT('stem.wave.ab_am_notes', '5 kHz bandwidth approximately.') },
        { quality: __alloT('stem.wave.ab_fm', 'FM radio quality'), bitrate: '~96 kbps equiv', notes: __alloT('stem.wave.ab_fm_notes', '15 kHz bandwidth approximately.') },
        { quality: __alloT('stem.wave.ab_mp3', 'MP3 (web typical)'), bitrate: '128 kbps', notes: __alloT('stem.wave.ab_mp3_notes', 'Acceptable for casual listening. Audible artifacts.') },
        { quality: __alloT('stem.wave.ab_aac', 'AAC (Apple Music)'), bitrate: '256 kbps', notes: __alloT('stem.wave.ab_aac_notes', 'Apple Music standard. Better than 128 kbps MP3.') },
        { quality: __alloT('stem.wave.ab_spotify', 'Spotify (high)'), bitrate: '320 kbps Ogg', notes: __alloT('stem.wave.ab_spotify_notes', 'High-quality lossy. Near-transparent for most.') },
        { quality: __alloT('stem.wave.ab_cd', 'CD quality (16-bit/44.1 kHz PCM)'), bitrate: '1411 kbps', notes: __alloT('stem.wave.ab_cd_notes', 'Lossless. ~10 MB/min stereo.') },
        { quality: __alloT('stem.wave.ab_dvd', 'DVD-Audio (24-bit/96 kHz)'), bitrate: '~4600 kbps', notes: __alloT('stem.wave.ab_dvd_notes', 'High-resolution audio. Debated whether audible improvement.') },
        { quality: __alloT('stem.wave.ab_studio', 'Studio masters (24-bit/192 kHz)'), bitrate: '~9200 kbps', notes: __alloT('stem.wave.ab_studio_notes', 'Recording standard. Down-converted for distribution.') }
      ];

      function renderRecordingsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎧 ' + __alloT('stem.wave.sec_recordings_title', 'Audio formats + quality')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_common_formats', 'Common audio file formats')),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    [__alloT('stem.wave.col_format', 'Format'), __alloT('stem.wave.col_extension', 'Extension'), __alloT('stem.wave.col_compression', 'Compression'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                      return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                React.createElement('tbody', null,
                  AUDIO_FORMATS.map(function(a, i) {
                    return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.format),
                      React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 text-[0.625rem]' }, a.extension),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, a.compression),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, a.notes)
                    );
                  })
                )
              )
            )
          ),
          React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_common_bitrates', 'Common bitrates')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_quality_level', 'Quality level'), __alloT('stem.wave.col_bitrate', 'Bitrate'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                AUDIO_BITRATES.map(function(b, i) {
                  return React.createElement('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, b.quality),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, b.bitrate),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, b.notes)
                  );
                })
              )
            )
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('recordings_nyquist_adc', __alloT('stem.wave.try_recordings_adc', 'PCM Bit-Depth & Nyquist Aliasing Bench'), { waveMode: 'spectrum', waveType: 'sine', digitalSampling: true, sampleRateRatio: 8, adcBitDepth: 4, frequency: 3 })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final wave data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var OPTICAL_ILLUSIONS = [
        { illusion: __alloT('stem.wave.oi1_name', 'Müller-Lyer'), description: __alloT('stem.wave.oi1_desc', 'Two equal lines with arrowheads — one outward, one inward — appear different lengths.'), explanation: __alloT('stem.wave.oi1_expl', 'Brain interprets arrows as depth cues. May be culturally-influenced (less effect in some non-Western cultures).') },
        { illusion: __alloT('stem.wave.oi2_name', 'Necker cube'), description: __alloT('stem.wave.oi2_desc', 'Wireframe cube spontaneously "flips" which face is in front.'), explanation: __alloT('stem.wave.oi2_expl', 'Ambiguous projection — brain alternates interpretations. Bistable perception.') },
        { illusion: __alloT('stem.wave.oi3_name', 'Hermann grid'), description: __alloT('stem.wave.oi3_desc', 'Black squares on white grid show ghostly gray dots at intersections.'), explanation: __alloT('stem.wave.oi3_expl', 'Lateral inhibition in retinal cells. Each cell\'s response depends on neighbors.') },
        { illusion: __alloT('stem.wave.oi4_name', 'Checker shadow'), description: __alloT('stem.wave.oi4_desc', 'Two checkerboard squares appear different shades but are identical.'), explanation: __alloT('stem.wave.oi4_expl', 'Adelson\'s classic. Brain corrects for perceived shadow → "constancy" overrides actual luminance.') },
        { illusion: __alloT('stem.wave.oi5_name', 'Ponzo illusion'), description: __alloT('stem.wave.oi5_desc', 'Two identical lines, one near converging rails, appear different lengths.'), explanation: __alloT('stem.wave.oi5_expl', 'Brain treats converging lines as depth — "farther" object must be bigger to project same size on retina.') },
        { illusion: __alloT('stem.wave.oi6_name', 'Café wall'), description: __alloT('stem.wave.oi6_desc', 'Parallel rows of alternating black/white tiles appear sloped.'), explanation: __alloT('stem.wave.oi6_expl', 'Offset between rows creates perceived tilt. Studied at café walls in Bristol.') },
        { illusion: __alloT('stem.wave.oi7_name', 'Rotating snakes (Kitaoka)'), description: __alloT('stem.wave.oi7_desc', 'Static image of circles appears to rotate.'), explanation: __alloT('stem.wave.oi7_expl', 'Motion-sensitive cells respond differently to varying luminance, creating illusory motion in peripheral vision.') },
        { illusion: __alloT('stem.wave.oi8_name', 'Spinning dancer (silhouette)'), description: __alloT('stem.wave.oi8_desc', 'Dancer appears to spin clockwise or counterclockwise.'), explanation: __alloT('stem.wave.oi8_expl', 'Ambiguous silhouette has no depth cues. Brain locks in an interpretation — can sometimes be switched.') },
        { illusion: __alloT('stem.wave.oi9_name', 'The dress (2015 viral)'), description: __alloT('stem.wave.oi9_desc', 'Photo of dress appeared blue/black to some, white/gold to others.'), explanation: __alloT('stem.wave.oi9_expl', 'Different brains assume different illumination (daylight vs incandescent) → "color constancy" leads to different perceptions.') },
        { illusion: __alloT('stem.wave.oi10_name', 'Mach bands'), description: __alloT('stem.wave.oi10_desc', 'Sharp luminance edges appear to have over/undershoot bands.'), explanation: __alloT('stem.wave.oi10_expl', 'Lateral inhibition in retina enhances edges. Helps with object recognition but creates artifact at edges.') },
        { illusion: __alloT('stem.wave.oi11_name', 'Stroboscopic effect'), description: __alloT('stem.wave.oi11_desc', 'Wheels appear to spin backward in movies.'), explanation: __alloT('stem.wave.oi11_expl', 'Frame rate samples motion — when wheel completes nearly full rotation per frame, looks like slight reverse motion.') },
        { illusion: __alloT('stem.wave.oi12_name', 'Phantom limb'), description: __alloT('stem.wave.oi12_desc', 'Amputees feel sensations from missing limb.'), explanation: __alloT('stem.wave.oi12_expl', 'Brain map of body remains. Mirror therapy (Ramachandran) sometimes helps.') },
        { illusion: __alloT('stem.wave.oi13_name', 'Persistence of vision'), description: __alloT('stem.wave.oi13_desc', 'Why movies (24+ fps) appear as continuous motion.'), explanation: __alloT('stem.wave.oi13_expl', 'Retinal afterimage + brain interpolation. Below ~16 fps flicker is visible.') },
        { illusion: __alloT('stem.wave.oi14_name', 'Color afterimage'), description: __alloT('stem.wave.oi14_desc', 'Stare at red for 30s → look at white → see green afterimage.'), explanation: __alloT('stem.wave.oi14_expl', 'Cone receptors fatigue; complementary color signal dominates briefly when you look away.') },
        { illusion: __alloT('stem.wave.oi15_name', 'Blind spot'), description: __alloT('stem.wave.oi15_desc', 'Each eye has a small region where you don\'t see.'), explanation: __alloT('stem.wave.oi15_expl', 'Where optic nerve leaves retina — no photoreceptors. Brain fills in. Both eyes together compensate.') },
        { illusion: __alloT('stem.wave.oi16_name', 'Anaglyph (red/cyan 3D)'), description: __alloT('stem.wave.oi16_desc', 'Glasses with red + cyan lenses create 3D from flat image.'), explanation: __alloT('stem.wave.oi16_expl', 'Each eye sees different-colored image → brain fuses into 3D.') },
        { illusion: __alloT('stem.wave.oi17_name', 'Magic Eye / autostereogram'), description: __alloT('stem.wave.oi17_desc', 'Cross-eye to see hidden 3D image.'), explanation: __alloT('stem.wave.oi17_expl', 'Repeating pattern, each row offset slightly. Brain matches wrong elements → perceived depth.') },
        { illusion: __alloT('stem.wave.oi18_name', 'Doppler shift in sound'), description: __alloT('stem.wave.oi18_desc', 'Siren of approaching vehicle sounds higher than receding.'), explanation: __alloT('stem.wave.oi18_expl', 'Compressed waves coming, stretched waves going. f\' = f × (v_sound ± v_observer) / (v_sound ∓ v_source).') },
        { illusion: __alloT('stem.wave.oi19_name', 'Sonic boom'), description: __alloT('stem.wave.oi19_desc', 'Loud bang when supersonic object passes.'), explanation: __alloT('stem.wave.oi19_expl', 'Pressure cone of compressed air. Boom not heard until cone reaches you.') },
        { illusion: __alloT('stem.wave.oi20_name', 'Mirage (highway shimmer)'), description: __alloT('stem.wave.oi20_desc', 'Distant road appears wet on hot day.'), explanation: __alloT('stem.wave.oi20_expl', 'Hot air near road has lower n than cooler air above → refracts sky light to your eye. Same physics for desert mirages.') },
        { illusion: __alloT('stem.wave.oi21_name', 'Rainbow'), description: __alloT('stem.wave.oi21_desc', '42° arc from anti-solar point.'), explanation: __alloT('stem.wave.oi21_expl', 'Sunlight refracts entering water droplet, reflects off back, refracts again leaving. Different λ at different angles.') },
        { illusion: __alloT('stem.wave.oi22_name', 'Double rainbow'), description: __alloT('stem.wave.oi22_desc', 'Second, dimmer rainbow with reversed colors at ~51°.'), explanation: __alloT('stem.wave.oi22_expl', 'Two internal reflections in droplets. Less light → dimmer. Reverse order.') },
        { illusion: __alloT('stem.wave.oi23_name', 'Halo around moon/sun'), description: __alloT('stem.wave.oi23_desc', '22° halo around sun or moon.'), explanation: __alloT('stem.wave.oi23_expl', 'Ice crystals in high cirrus refract light. Often precedes weather change.') },
        { illusion: __alloT('stem.wave.oi24_name', 'Green flash at sunset'), description: __alloT('stem.wave.oi24_desc', 'Brief green flash as sun dips below horizon.'), explanation: __alloT('stem.wave.oi24_expl', 'Atmospheric refraction separates colors at moment of sunset. Best seen over ocean.') }
      ];

      function renderOpticalFactsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👁 ' + __alloT('stem.wave.sec_optical_facts_title', 'Optical illusions + perception phenomena')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_optical_facts_intro', 'Visual perception is active — brain interprets, fills in gaps, makes guesses. Illusions reveal the underlying processes.')),
          React.createElement('div', { className: 'space-y-2' },
            OPTICAL_ILLUSIONS.map(function(o, i) {
              return React.createElement('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, o.illusion),
                React.createElement('div', { className: 'text-[0.6875rem] text-cyan-700 italic mb-1' }, o.description),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, o.explanation)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data tables (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var DETAILED_SPEEDS = [
        { thing: __alloT('stem.wave.ds_light_vacuum', 'Speed of light (vacuum)'), speed: '299,792,458 m/s', notes: __alloT('stem.wave.ds_light_vacuum_notes', 'Universal speed limit. Defined exact.') },
        { thing: __alloT('stem.wave.ds_light_air', 'Speed of light (air)'), speed: '~299,700,000 m/s', notes: __alloT('stem.wave.ds_light_air_notes', 'Air refractive index ~1.0003.') },
        { thing: __alloT('stem.wave.ds_light_water', 'Speed of light (water)'), speed: '~225,000,000 m/s', notes: 'n = 1.33.' },
        { thing: __alloT('stem.wave.ds_light_glass', 'Speed of light (glass)'), speed: '~200,000,000 m/s', notes: 'n ~ 1.5.' },
        { thing: __alloT('stem.wave.ds_light_diamond', 'Speed of light (diamond)'), speed: '~124,000,000 m/s', notes: __alloT('stem.wave.ds_light_diamond_notes', 'n = 2.42 — highest of common materials.') },
        { thing: __alloT('stem.wave.ds_cherenkov', 'Cherenkov radiation threshold (water)'), speed: '~225,000 km/s', notes: __alloT('stem.wave.ds_cherenkov_notes', 'Particles faster than light-in-medium emit blue glow (Cherenkov).') },
        { thing: __alloT('stem.wave.ds_sound_air0', 'Sound in air at 0°C'), speed: '331 m/s', notes: __alloT('stem.wave.ds_sound_air0_notes', 'Cold air, dry, sea level.') },
        { thing: __alloT('stem.wave.ds_sound_air20', 'Sound in air at 20°C'), speed: '343 m/s', notes: __alloT('stem.wave.ds_sound_air20_notes', 'Reference room temp.') },
        { thing: __alloT('stem.wave.ds_sound_air40', 'Sound in air at 40°C'), speed: '355 m/s', notes: __alloT('stem.wave.ds_sound_air40_notes', 'Hot day.') },
        { thing: __alloT('stem.wave.ds_sound_helium', 'Sound in helium (RT)'), speed: '~1007 m/s', notes: __alloT('stem.wave.ds_sound_helium_notes', '~3× air → voice an octave higher.') },
        { thing: __alloT('stem.wave.ds_sound_co2', 'Sound in CO₂ (RT)'), speed: '~267 m/s', notes: __alloT('stem.wave.ds_sound_co2_notes', 'Slower than air → voice lower.') },
        { thing: __alloT('stem.wave.ds_sound_water', 'Sound in water (RT)'), speed: '~1482 m/s', notes: __alloT('stem.wave.ds_sound_water_notes', 'Whales use long-distance communication.') },
        { thing: __alloT('stem.wave.ds_sound_seawater', 'Sound in seawater'), speed: '~1500 m/s', notes: __alloT('stem.wave.ds_sound_seawater_notes', 'Slightly different due to salts.') },
        { thing: __alloT('stem.wave.ds_sound_ice', 'Sound in ice'), speed: '~3840 m/s', notes: __alloT('stem.wave.ds_sound_ice_notes', 'Stiff solid.') },
        { thing: __alloT('stem.wave.ds_sound_granite', 'Sound in granite'), speed: '~6000 m/s', notes: __alloT('stem.wave.ds_sound_granite_notes', 'Hard rock.') },
        { thing: __alloT('stem.wave.ds_sound_steel', 'Sound in steel'), speed: '~5960 m/s', notes: __alloT('stem.wave.ds_sound_steel_notes', 'Train tracks carry sound far before train arrives.') },
        { thing: __alloT('stem.wave.ds_sound_aluminum', 'Sound in aluminum'), speed: '~6420 m/s', notes: __alloT('stem.wave.ds_sound_aluminum_notes', 'Light + stiff.') },
        { thing: __alloT('stem.wave.ds_sound_diamond', 'Sound in diamond'), speed: '~12,000 m/s', notes: __alloT('stem.wave.ds_sound_diamond_notes', 'Fastest in common materials.') },
        { thing: __alloT('stem.wave.ds_sound_beryllium', 'Sound in beryllium'), speed: '~12,900 m/s', notes: __alloT('stem.wave.ds_sound_beryllium_notes', 'Fastest in pure elements at standard conditions.') },
        { thing: __alloT('stem.wave.ds_pwave', 'P-wave in upper mantle'), speed: '~8 km/s', notes: __alloT('stem.wave.ds_pwave_notes', 'Earthquake primary waves.') },
        { thing: __alloT('stem.wave.ds_swave', 'S-wave in upper mantle'), speed: '~4.5 km/s', notes: __alloT('stem.wave.ds_swave_notes', 'Earthquake secondary waves.') },
        { thing: __alloT('stem.wave.ds_tsunami_deep', 'Tsunami in deep ocean'), speed: '~700 km/h', notes: __alloT('stem.wave.ds_tsunami_deep_notes', 'Long wavelength shallow-water wave.') },
        { thing: __alloT('stem.wave.ds_tsunami_shore', 'Tsunami in shore approach'), speed: '~50 km/h', notes: __alloT('stem.wave.ds_tsunami_shore_notes', 'Slows + grows as depth decreases.') },
        { thing: __alloT('stem.wave.ds_ripple', 'Surface ripple on water'), speed: __alloT('stem.wave.ds_ripple_speed', 'depends on λ'), notes: __alloT('stem.wave.ds_ripple_notes', 'Short wavelengths controlled by surface tension; long by gravity.') },
        { thing: __alloT('stem.wave.ds_body', 'Sound in human body (avg tissue)'), speed: '~1540 m/s', notes: __alloT('stem.wave.ds_body_notes', 'Used for medical ultrasound timing.') },
        { thing: __alloT('stem.wave.ds_bone', 'Sound in bone'), speed: '~3000-4000 m/s', notes: __alloT('stem.wave.ds_bone_notes', 'Faster than soft tissue.') },
        { thing: __alloT('stem.wave.ds_lung', 'Sound in lung tissue'), speed: '~650 m/s', notes: __alloT('stem.wave.ds_lung_notes', 'Air pockets slow it. Why lungs poorly imaged by ultrasound.') },
        { thing: __alloT('stem.wave.ds_thunder', 'Lightning thunder rule of thumb'), speed: __alloT('stem.wave.ds_thunder_speed', '5 sec per mile / 3 sec per km'), notes: __alloT('stem.wave.ds_thunder_notes', 'Count seconds between flash + thunder.') }
      ];

      var CAMERA_LENSES = [
        { lens: __alloT('stem.wave.cl_8mm', '8mm fisheye'), fov: '~180° diagonal', use: __alloT('stem.wave.cl_8mm_use', 'Hemispheric panoramas, sky time-lapse, security cameras.') },
        { lens: __alloT('stem.wave.cl_14mm', '14mm ultrawide'), fov: '~114° diagonal', use: __alloT('stem.wave.cl_14mm_use', 'Tight indoor architecture, dramatic landscape.') },
        { lens: __alloT('stem.wave.cl_20mm', '20mm ultrawide'), fov: '~94°', use: __alloT('stem.wave.cl_20mm_use', 'Astrophotography, group photos in tight space.') },
        { lens: __alloT('stem.wave.cl_24mm', '24mm wide-angle'), fov: '~84°', use: __alloT('stem.wave.cl_24mm_use', 'Landscape, real estate, environmental portraits.') },
        { lens: __alloT('stem.wave.cl_28mm', '28mm wide'), fov: '~75°', use: __alloT('stem.wave.cl_28mm_use', 'Street photography, photojournalism.') },
        { lens: __alloT('stem.wave.cl_35mm', '35mm wide'), fov: '~63°', use: __alloT('stem.wave.cl_35mm_use', 'Documentary, candid. "Storyteller\'s lens".') },
        { lens: __alloT('stem.wave.cl_50mm', '50mm normal'), fov: '~47°', use: __alloT('stem.wave.cl_50mm_use', 'Closest to human eye perspective. "Nifty fifty". Portraits.') },
        { lens: __alloT('stem.wave.cl_85mm', '85mm short telephoto'), fov: '~28°', use: __alloT('stem.wave.cl_85mm_use', 'Portraits. Pleasing background compression.') },
        { lens: __alloT('stem.wave.cl_105mm', '105mm portrait'), fov: '~23°', use: __alloT('stem.wave.cl_105mm_use', 'Tight portraits. Macro variants for close-up.') },
        { lens: __alloT('stem.wave.cl_135mm', '135mm'), fov: '~18°', use: __alloT('stem.wave.cl_135mm_use', 'Outdoor portraits, candids from distance.') },
        { lens: __alloT('stem.wave.cl_200mm', '200mm telephoto'), fov: '~12°', use: __alloT('stem.wave.cl_200mm_use', 'Sports, wildlife, distant subjects.') },
        { lens: __alloT('stem.wave.cl_300mm', '300mm telephoto'), fov: '~8°', use: __alloT('stem.wave.cl_300mm_use', 'Sports field-side, bird photography.') },
        { lens: __alloT('stem.wave.cl_400mm', '400mm super-tele'), fov: '~6°', use: __alloT('stem.wave.cl_400mm_use', 'Wildlife, sports. Heavy + expensive.') },
        { lens: __alloT('stem.wave.cl_600mm', '600mm super-tele'), fov: '~4°', use: __alloT('stem.wave.cl_600mm_use', 'Distant wildlife, moon. Requires tripod.') },
        { lens: __alloT('stem.wave.cl_800mm', '800mm super-tele'), fov: '~3°', use: __alloT('stem.wave.cl_800mm_use', 'Specialized wildlife + astronomy.') },
        { lens: __alloT('stem.wave.cl_1200mm', '1200mm + teleconverter'), fov: '~2°', use: __alloT('stem.wave.cl_1200mm_use', 'Extreme reach. Solar eclipse details.') },
        { lens: __alloT('stem.wave.cl_macro', 'Macro 100mm'), fov: '~24° at infinity / close at 1:1', use: __alloT('stem.wave.cl_macro_use', 'Insects, flowers, product. 1:1 magnification.') },
        { lens: __alloT('stem.wave.cl_tiltshift', 'Tilt-shift 24mm'), fov: __alloT('stem.wave.cl_tiltshift_fov', '~84° normal, controllable'), use: __alloT('stem.wave.cl_tiltshift_use', 'Architecture (keep verticals straight), miniature faking.') },
        { lens: __alloT('stem.wave.cl_anamorphic', 'Cinema anamorphic 50mm'), fov: __alloT('stem.wave.cl_anamorphic_fov', 'wider horizontally than spherical'), use: __alloT('stem.wave.cl_anamorphic_use', 'Cinematic look. Oval bokeh, lens flares.') }
      ];

      var CAMERA_FACTS = [
        { fact: __alloT('stem.wave.cf_crop', 'Crop factor'), detail: __alloT('stem.wave.cf_crop_detail', 'Smaller sensors crop image. APS-C ~1.5×, Micro 4/3 ~2×, smartphone ~5-7×.') },
        { fact: __alloT('stem.wave.cf_efl', 'Effective focal length'), detail: __alloT('stem.wave.cf_efl_detail', '50mm lens on APS-C looks like 75mm on full frame. Doesn\'t change actual focal length, just FOV.') },
        { fact: __alloT('stem.wave.cf_fstop', 'f-stop'), detail: __alloT('stem.wave.cf_fstop_detail', 'Ratio of focal length to aperture diameter. f/1.4, f/2, f/2.8, f/4, f/5.6, f/8 (each step halves light).') },
        { fact: __alloT('stem.wave.cf_dof', 'Depth of field'), detail: __alloT('stem.wave.cf_dof_detail', 'Wider aperture (smaller f number) → shallower DOF. Why portraits use f/1.8-f/2.8 for soft backgrounds.') },
        { fact: __alloT('stem.wave.cf_shutter', 'Shutter speed for handheld'), detail: __alloT('stem.wave.cf_shutter_detail', 'Rule: at least 1/focal-length sec. 50mm → 1/50 or faster. Stabilization helps.') },
        { fact: __alloT('stem.wave.cf_sensors', 'Sensor sizes'), detail: __alloT('stem.wave.cf_sensors_detail', 'Full frame (36×24mm) > APS-H > APS-C > Micro 4/3 > 1" > phone sensors (~1/2" - 1/3").') },
        { fact: __alloT('stem.wave.cf_megapixels', 'Megapixels'), detail: __alloT('stem.wave.cf_megapixels_detail', 'More pixels = more detail (with good lens). Diminishing returns past ~24-50 MP for most uses.') },
        { fact: __alloT('stem.wave.cf_iso', 'ISO'), detail: __alloT('stem.wave.cf_iso_detail', 'Sensor sensitivity. Higher ISO = brighter image but more noise. Base ISO (lowest noise) typically 100-200.') }
      ];

      function renderSpeeds2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏲ ' + __alloT('stem.wave.sec_speeds2_title', 'Wave speeds in detail')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_wave_medium', 'Wave + medium'), __alloT('stem.wave.col_speed', 'Speed'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                DETAILED_SPEEDS.map(function(s, i) {
                  return React.createElement('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.thing),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, s.speed),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCamerasSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📷 ' + __alloT('stem.wave.sec_cameras_title', 'Camera lenses + photography')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_lens_focal_lengths', 'Lens focal lengths (35mm full-frame)')),
            React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'bg-slate-100' },
                    [__alloT('stem.wave.col_lens', 'Lens'), __alloT('stem.wave.col_fov', 'Field of view'), __alloT('stem.wave.col_use', 'Use')].map(function(hh, i) {
                      return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                React.createElement('tbody', null,
                  CAMERA_LENSES.map(function(L, i) {
                    return React.createElement('tr', { key: 'L'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, L.lens),
                      React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, L.fov),
                      React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem]' }, L.use)
                    );
                  })
                )
              )
            )
          ),
          React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_photography_essentials', 'Photography essentials')),
          React.createElement('div', { className: 'space-y-1' },
            CAMERA_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.6875rem] font-black text-cyan-700 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('cameras_ar_lens_coating', __alloT('stem.wave.try_cameras_ar', 'Quarter-Wave MgF\u2082 Lens AR Coating (R\u22480%)'), { waveMode: 'reflection', impedanceCoupled: true, antiReflectionCoating: true, medium2Ratio: 0.66, incidentAngleDeg: 15 })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Additional dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var STAR_DATA = [
        { star: __alloT('stem.wave.star_sun', 'Sun'), type: __alloT('stem.wave.star_sun_type', 'G2V (yellow dwarf)'), temp: '5,778 K', distance: '1 AU', notes: __alloT('stem.wave.star_sun_notes', 'Our nearest star. Apparent peak ~480 nm (blue-green) but we see it yellow due to atmospheric scattering.') },
        { star: __alloT('stem.wave.star_proxima', 'Proxima Centauri'), type: __alloT('stem.wave.star_proxima_type', 'M5.5 (red dwarf)'), temp: '~3,042 K', distance: '4.24 ly', notes: __alloT('stem.wave.star_proxima_notes', 'Nearest known star. Has planets including Proxima b in habitable zone.') },
        { star: __alloT('stem.wave.star_sirius', 'Sirius A'), type: __alloT('stem.wave.star_sirius_type', 'A1V (white)'), temp: '9,940 K', distance: '8.6 ly', notes: __alloT('stem.wave.star_sirius_notes', 'Brightest in night sky. Binary with white-dwarf Sirius B.') },
        { star: __alloT('stem.wave.star_betelgeuse', 'Betelgeuse'), type: __alloT('stem.wave.star_betelgeuse_type', 'M1-2 (red supergiant)'), temp: '~3,500 K', distance: '~640 ly', notes: __alloT('stem.wave.star_betelgeuse_notes', 'Orion\'s shoulder. Variable. Could go supernova "soon" (anytime in next ~100,000 yr).') },
        { star: __alloT('stem.wave.star_rigel', 'Rigel'), type: __alloT('stem.wave.star_rigel_type', 'B8I (blue supergiant)'), temp: '~12,100 K', distance: '~860 ly', notes: __alloT('stem.wave.star_rigel_notes', 'Orion\'s foot. Triple star system.') },
        { star: __alloT('stem.wave.star_vega', 'Vega'), type: __alloT('stem.wave.star_vega_type', 'A0V (white)'), temp: '9,602 K', distance: '25 ly', notes: __alloT('stem.wave.star_vega_notes', 'Was once "the" North Star. Will be again in ~13,727 CE (precession of equinoxes).') },
        { star: __alloT('stem.wave.star_polaris', 'Polaris'), type: __alloT('stem.wave.star_polaris_type', 'F7Ib (yellow supergiant)'), temp: '6,015 K', distance: '~430 ly', notes: __alloT('stem.wave.star_polaris_notes', 'Current North Star. Within ~0.5° of celestial north.') },
        { star: __alloT('stem.wave.star_aldebaran', 'Aldebaran'), type: __alloT('stem.wave.star_aldebaran_type', 'K5III (orange giant)'), temp: '~3,910 K', distance: '~65 ly', notes: __alloT('stem.wave.star_aldebaran_notes', 'Eye of Taurus. Reddish-orange.') },
        { star: __alloT('stem.wave.star_antares', 'Antares'), type: __alloT('stem.wave.star_antares_type', 'M1.5Iab (red supergiant)'), temp: '~3,660 K', distance: '~550 ly', notes: __alloT('stem.wave.star_antares_notes', 'Heart of Scorpius. Diameter ~700× Sun.') },
        { star: __alloT('stem.wave.star_procyon', 'Procyon'), type: __alloT('stem.wave.star_procyon_type', 'F5IV (yellow-white)'), temp: '6,530 K', distance: '11.5 ly', notes: __alloT('stem.wave.star_procyon_notes', 'Eighth brightest star. Binary.') },
        { star: __alloT('stem.wave.star_capella', 'Capella'), type: __alloT('stem.wave.star_capella_type', 'G3III + G0III (yellow giants)'), temp: '~5,000 K (combined)', distance: '~43 ly', notes: __alloT('stem.wave.star_capella_notes', 'Sixth brightest. Two pairs (4 stars).') },
        { star: __alloT('stem.wave.star_spica', 'Spica'), type: __alloT('stem.wave.star_spica_type', 'B1III-IV (blue giant)'), temp: '~22,400 K', distance: '~250 ly', notes: __alloT('stem.wave.star_spica_notes', 'Brightest in Virgo. Binary.') },
        { star: __alloT('stem.wave.star_eta', 'Eta Carinae'), type: __alloT('stem.wave.star_eta_type', 'LBV (luminous blue variable)'), temp: '~20,000 K', distance: '~7,500 ly', notes: __alloT('stem.wave.star_eta_notes', 'Massive (90 M☉ + companion). Erupted dramatically in 1840s. Likely future supernova/hypernova.') },
        { star: __alloT('stem.wave.star_uy', 'UY Scuti'), type: __alloT('stem.wave.star_uy_type', 'M4Ia (red hypergiant)'), temp: '~3,365 K', distance: '~5,200 ly', notes: __alloT('stem.wave.star_uy_notes', 'Among largest known stars. Diameter ~1700× Sun.') }
      ];

      var SCREEN_TYPES = [
        { type: __alloT('stem.wave.scr_crt', 'CRT (cathode ray tube)'), refresh: '60-100 Hz', notes: __alloT('stem.wave.scr_crt_notes', 'Electron beam scans phosphors. Largely obsolete since ~2010.') },
        { type: __alloT('stem.wave.scr_lcd', 'LCD (liquid crystal display)'), refresh: '60-360 Hz', notes: __alloT('stem.wave.scr_lcd_notes', 'LCs modulate backlight. Energy-efficient. Limited viewing angles.') },
        { type: __alloT('stem.wave.scr_oled', 'OLED (organic LED)'), refresh: '60-240 Hz', notes: __alloT('stem.wave.scr_oled_notes', 'Each pixel emits own light. True blacks. Premium phones, TVs.') },
        { type: __alloT('stem.wave.scr_microled', 'micro-LED'), refresh: '60-240 Hz', notes: __alloT('stem.wave.scr_microled_notes', 'Like OLED but inorganic LEDs. Brighter, longer-lived. Expensive (~2025).') },
        { type: __alloT('stem.wave.scr_plasma', 'Plasma'), refresh: __alloT('stem.wave.scr_plasma_refresh', '60 Hz typical'), notes: __alloT('stem.wave.scr_plasma_notes', 'Excited gas emits UV → phosphors. Discontinued ~2014.') },
        { type: __alloT('stem.wave.scr_eink', 'E-ink'), refresh: __alloT('stem.wave.scr_eink_refresh', 'on update'), notes: __alloT('stem.wave.scr_eink_notes', 'Microcapsules with charged particles. No backlight needed. E-readers.') },
        { type: __alloT('stem.wave.scr_dlp', 'Projector (DLP)'), refresh: __alloT('stem.wave.scr_varies', 'varies'), notes: __alloT('stem.wave.scr_dlp_notes', 'Micromirror array. Color via spinning wheel or 3 chips.') },
        { type: __alloT('stem.wave.scr_lcdproj', 'Projector (LCD)'), refresh: __alloT('stem.wave.scr_varies', 'varies'), notes: __alloT('stem.wave.scr_lcdproj_notes', '3 LCD panels (RGB). Common in classrooms.') },
        { type: __alloT('stem.wave.scr_laser', 'Laser projector'), refresh: __alloT('stem.wave.scr_varies', 'varies'), notes: __alloT('stem.wave.scr_laser_notes', 'RGB lasers, no lamp replacement. Wide color gamut.') }
      ];

      var SCREEN_RESOLUTIONS = [
        { name: '480p (SD)', resolution: '640×480 or 720×480', notes: __alloT('stem.wave.res_480_notes', 'Standard definition.') },
        { name: '720p (HD)', resolution: '1280×720', notes: __alloT('stem.wave.res_720_notes', 'Cable TV, older laptops.') },
        { name: '1080p (Full HD)', resolution: '1920×1080', notes: __alloT('stem.wave.res_1080_notes', 'Most TVs + phones for a decade.') },
        { name: '2K / QHD', resolution: '2560×1440', notes: __alloT('stem.wave.res_2k_notes', 'High-end monitors.') },
        { name: '4K (UHD)', resolution: '3840×2160', notes: __alloT('stem.wave.res_4k_notes', 'Now standard for new TVs.') },
        { name: '5K', resolution: '5120×2880', notes: __alloT('stem.wave.res_5k_notes', 'Apple iMac 5K, pro monitors.') },
        { name: '8K', resolution: '7680×4320', notes: __alloT('stem.wave.res_8k_notes', 'Premium TVs. Limited content.') },
        { name: 'DCI 4K', resolution: '4096×2160', notes: __alloT('stem.wave.res_dci4k_notes', 'Cinema standard.') },
        { name: '16K (experimental)', resolution: '15360×8640', notes: __alloT('stem.wave.res_16k_notes', 'Not commercially available.') }
      ];

      var NOISE_LEVELS = [
        { source: __alloT('stem.wave.nl_threshold', 'Threshold of hearing'), db: '0 dB SPL', notes: __alloT('stem.wave.nl_threshold_notes', 'Quietest sound a young healthy ear can detect.') },
        { source: __alloT('stem.wave.nl_whisper', 'Whisper at 1 m'), db: '~30 dB', notes: __alloT('stem.wave.nl_whisper_notes', 'Library.') },
        { source: __alloT('stem.wave.nl_quiet', 'Quiet room'), db: '~40 dB', notes: __alloT('stem.wave.nl_quiet_notes', 'Empty house at night.') },
        { source: __alloT('stem.wave.nl_conversation', 'Normal conversation'), db: '~60 dB', notes: __alloT('stem.wave.nl_conversation_notes', 'At 1 m.') },
        { source: __alloT('stem.wave.nl_vacuum', 'Vacuum cleaner'), db: '~70 dB', notes: __alloT('stem.wave.nl_vacuum_notes', 'Most household appliances.') },
        { source: __alloT('stem.wave.nl_traffic', 'Heavy traffic'), db: '~80 dB', notes: __alloT('stem.wave.nl_traffic_notes', 'Long exposure can cause hearing damage.') },
        { source: __alloT('stem.wave.nl_mower', 'Lawn mower'), db: '~85-90 dB', notes: __alloT('stem.wave.nl_mower_notes', '85 dB = OSHA action level (hearing conservation required).') },
        { source: __alloT('stem.wave.nl_subway', 'Subway train'), db: '~95-100 dB', notes: __alloT('stem.wave.nl_subway_notes', 'Pain threshold for prolonged exposure.') },
        { source: __alloT('stem.wave.nl_powertools', 'Power tools (chainsaw)'), db: '~110 dB', notes: __alloT('stem.wave.nl_powertools_notes', 'Hearing protection essential.') },
        { source: __alloT('stem.wave.nl_concert', 'Rock concert / club'), db: '~110-120 dB', notes: __alloT('stem.wave.nl_concert_notes', 'Permanent damage in minutes.') },
        { source: __alloT('stem.wave.nl_pain', 'Threshold of pain'), db: '~130 dB', notes: __alloT('stem.wave.nl_pain_notes', 'Physically painful.') },
        { source: __alloT('stem.wave.nl_jet', 'Jet engine at 30 m'), db: '~140 dB', notes: __alloT('stem.wave.nl_jet_notes', 'Instant hearing damage.') },
        { source: __alloT('stem.wave.nl_gunshot', 'Gunshot'), db: '~150-170 dB', notes: __alloT('stem.wave.nl_gunshot_notes', 'Permanent damage possible from single exposure.') },
        { source: __alloT('stem.wave.nl_rocket', 'Rocket launch at 100 m'), db: '~180 dB', notes: __alloT('stem.wave.nl_rocket_notes', 'Causes hearing damage + can damage equipment.') },
        { source: __alloT('stem.wave.nl_krakatoa', 'Krakatoa eruption (1883)'), db: '~310 dB at source', notes: __alloT('stem.wave.nl_krakatoa_notes', 'Possibly loudest sound in modern history. Heard 3000 miles away.') }
      ];

      function renderStarsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⭐ ' + __alloT('stem.wave.sec_stars_title', 'Notable stars (visible spectra)')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_stars_intro', 'Star color reflects surface temperature: red coolest (~3,000 K) → orange → yellow → white → blue hottest (~30,000+ K). Spectral types O-B-A-F-G-K-M.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Star', 'Type', 'Temp', 'Distance', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                STAR_DATA.map(function(s, i) {
                  return React.createElement('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.star),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 text-[0.625rem]' }, s.type),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, s.temp),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, s.distance),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, s.notes)
                  );
                })
              )
            )
          ),
          renderTryInSimBtn('stars_halpha_redshift', __alloT('stem.wave.try_stars_redshift', 'Test H\u03B1 Redshift in Relativistic Doppler'), { waveMode: 'doppler', dopplerRegime: 'relativistic', sourceSpeed: 0.45, observerSpeed: 0, frequency: 4 })
        );
      }

      function renderTvfreqSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📺 ' + __alloT('stem.wave.sec_tvfreq_title', 'Display technologies + resolutions')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_display_types', 'Display types')),
            React.createElement('div', { className: 'space-y-1' },
              SCREEN_TYPES.map(function(s, i) {
                return React.createElement('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, s.type),
                    React.createElement('span', { className: 'text-[0.625rem] font-mono text-cyan-700 ml-auto' }, s.refresh)
                  ),
                  React.createElement('div', { className: 'text-[0.625rem] text-slate-700' }, s.notes)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_standard_resolutions', 'Standard resolutions')),
          React.createElement('div', { className: 'space-y-1' },
            SCREEN_RESOLUTIONS.map(function(r, i) {
              return React.createElement('div', { key: 'r'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.6875rem] font-black text-cyan-700' }, r.name),
                  React.createElement('span', { className: 'text-[0.625rem] font-mono text-cyan-700 ml-auto font-bold' }, r.resolution)
                ),
                React.createElement('div', { className: 'text-[0.625rem] text-slate-700' }, r.notes)
              );
            })
          )
        );
      }

      function renderNoiseSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔊 ' + __alloT('stem.wave.sec_noise_title', 'Sound levels (dB SPL)')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_noise_intro', 'Decibels are logarithmic: +10 dB ≈ 10× sound intensity but ~2× perceived loudness. Sustained exposure >85 dB damages hearing.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_source', 'Source'), __alloT('stem.wave.col_level', 'Level'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                NOISE_LEVELS.map(function(n, i) {
                  return React.createElement('tr', { key: 'n'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, n.source),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, n.db),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, n.notes)
                  );
                })
              )
            )
          ),
          renderTryInSimBtn('noise_spectral_filter', __alloT('stem.wave.try_noise_filter', 'Fourier Low-Pass Noise Filter Bench'), { waveMode: 'spectrum', waveType: 'sawtooth', spectrumFilter: 'lowpass', filterCutoffHarmonic: 3 })
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ANIMAL_HEARING = [
        { animal: __alloT('stem.wave.ah_human_young', 'Human (young)'), range: '20 Hz - 20 kHz', notes: __alloT('stem.wave.ah_human_young_notes', 'Upper limit drops with age; adults often only ~14-16 kHz.') },
        { animal: __alloT('stem.wave.ah_human_elderly', 'Human (elderly)'), range: '20 Hz - 10-12 kHz', notes: __alloT('stem.wave.ah_human_elderly_notes', 'Presbycusis — gradual high-frequency loss after age ~50.') },
        { animal: __alloT('stem.wave.ah_dog', 'Dog'), range: '40 Hz - 60 kHz', notes: __alloT('stem.wave.ah_dog_notes', 'Dog whistles at 20-25 kHz inaudible to humans.') },
        { animal: __alloT('stem.wave.ah_cat', 'Cat'), range: '55 Hz - 79 kHz', notes: __alloT('stem.wave.ah_cat_notes', 'Wide range. Sensitive to mouse squeaks.') },
        { animal: __alloT('stem.wave.ah_bat', 'Bat (echolocation)'), range: '1 kHz - 200 kHz', notes: __alloT('stem.wave.ah_bat_notes', 'Chirp out + listen. Some species at 100+ kHz.') },
        { animal: __alloT('stem.wave.ah_dolphin', 'Dolphin'), range: '~150 Hz - 150 kHz', notes: __alloT('stem.wave.ah_dolphin_notes', 'Echolocate underwater; clicks up to 200 kHz.') },
        { animal: __alloT('stem.wave.ah_whale', 'Whale (baleen)'), range: '~10 Hz - 30 kHz', notes: __alloT('stem.wave.ah_whale_notes', 'Use infrasound (low freq) for very long-distance communication.') },
        { animal: __alloT('stem.wave.ah_elephant', 'Elephant'), range: '~5 Hz - 12 kHz', notes: __alloT('stem.wave.ah_elephant_notes', 'Infrasonic rumbles travel miles. Use for long-range communication.') },
        { animal: __alloT('stem.wave.ah_mouse', 'Mouse'), range: '1 kHz - 90 kHz', notes: __alloT('stem.wave.ah_mouse_notes', 'Ultrasonic vocalizations.') },
        { animal: __alloT('stem.wave.ah_bird', 'Bird (chicken)'), range: '125 Hz - 2 kHz', notes: __alloT('stem.wave.ah_bird_notes', 'Narrower range than mammals. Used in cock crow.') },
        { animal: __alloT('stem.wave.ah_owl', 'Owl'), range: '~50 Hz - 12 kHz', notes: __alloT('stem.wave.ah_owl_notes', 'Asymmetric ears for precise location of prey rustles.') },
        { animal: __alloT('stem.wave.ah_moth', 'Moth'), range: '~20-60 kHz', notes: __alloT('stem.wave.ah_moth_notes', 'Hear bat echolocation — drop to evade.') },
        { animal: __alloT('stem.wave.ah_fish', 'Fish (most)'), range: '50 Hz - 1 kHz', notes: __alloT('stem.wave.ah_fish_notes', 'Use lateral line for water vibrations + ears for sound.') },
        { animal: __alloT('stem.wave.ah_cricket', 'Cricket'), range: '~5-90 kHz', notes: __alloT('stem.wave.ah_cricket_notes', 'Ears on legs! Tympanic organs near "knee".') }
      ];

      var INSTRUMENT_FREQS = [
        { instrument: __alloT('stem.wave.if_piano', 'Piano'), range: '27.5 Hz - 4186 Hz', fundamental: 'A0-C8 (88 keys)', notes: __alloT('stem.wave.if_piano_notes', 'Widest range of standard orchestral instruments.') },
        { instrument: __alloT('stem.wave.if_violin', 'Violin'), range: '196 Hz - 3520 Hz', fundamental: 'G3-A7', notes: __alloT('stem.wave.if_violin_notes', 'Highest pitch of orchestral strings.') },
        { instrument: __alloT('stem.wave.if_viola', 'Viola'), range: '130 Hz - 1318 Hz', fundamental: 'C3-E6', notes: __alloT('stem.wave.if_viola_notes', 'Pitched fifth below violin.') },
        { instrument: __alloT('stem.wave.if_cello', 'Cello'), range: '65 Hz - 1046 Hz', fundamental: 'C2-C6', notes: __alloT('stem.wave.if_cello_notes', 'Pitched octave below viola.') },
        { instrument: __alloT('stem.wave.if_bass', 'Double bass'), range: '41 Hz - 246 Hz', fundamental: 'E1-B3', notes: __alloT('stem.wave.if_bass_notes', 'Lowest of standard orchestral strings.') },
        { instrument: __alloT('stem.wave.if_guitar', 'Guitar (standard tuning)'), range: '82 Hz - 1318 Hz', fundamental: 'E2-E6', notes: __alloT('stem.wave.if_guitar_notes', 'EADGBE strings. Range varies with frets.') },
        { instrument: __alloT('stem.wave.if_bassguitar', 'Bass guitar'), range: '41 Hz - 350 Hz', fundamental: 'E1-E4', notes: __alloT('stem.wave.if_bassguitar_notes', 'Octave below standard guitar (4-string).') },
        { instrument: __alloT('stem.wave.if_flute', 'Flute'), range: '262 Hz - 2093 Hz', fundamental: 'C4-C7', notes: __alloT('stem.wave.if_flute_notes', 'Highest standard woodwind.') },
        { instrument: __alloT('stem.wave.if_clarinet', 'Clarinet (Bb)'), range: '147 Hz - 1568 Hz', fundamental: 'D3-G6', notes: __alloT('stem.wave.if_clarinet_notes', 'Wide range. Distinctive timbre via odd harmonics.') },
        { instrument: __alloT('stem.wave.if_oboe', 'Oboe'), range: '233 Hz - 1568 Hz', fundamental: 'Bb3-G6', notes: __alloT('stem.wave.if_oboe_notes', 'Reedy tone. Tunes the orchestra (its A is hardest to adjust).') },
        { instrument: __alloT('stem.wave.if_bassoon', 'Bassoon'), range: '58 Hz - 622 Hz', fundamental: 'Bb1-Eb5', notes: __alloT('stem.wave.if_bassoon_notes', 'Lowest standard woodwind.') },
        { instrument: __alloT('stem.wave.if_trumpet', 'Trumpet'), range: '165 Hz - 988 Hz', fundamental: 'E3-B5', notes: __alloT('stem.wave.if_trumpet_notes', 'Highest standard brass.') },
        { instrument: __alloT('stem.wave.if_trombone', 'Trombone'), range: '82 Hz - 622 Hz', fundamental: 'E2-Eb5', notes: __alloT('stem.wave.if_trombone_notes', 'Slide changes pitch — continuous glissando possible.') },
        { instrument: __alloT('stem.wave.if_frenchhorn', 'French horn'), range: '62 Hz - 698 Hz', fundamental: 'B1-F5', notes: __alloT('stem.wave.if_frenchhorn_notes', 'Wide tonal range; difficult to control.') },
        { instrument: __alloT('stem.wave.if_tuba', 'Tuba'), range: '41 Hz - 349 Hz', fundamental: 'E1-F4', notes: __alloT('stem.wave.if_tuba_notes', 'Lowest brass.') },
        { instrument: __alloT('stem.wave.if_soprano', 'Voice (soprano)'), range: '262 Hz - 1046 Hz', fundamental: 'C4-C6', notes: __alloT('stem.wave.if_soprano_notes', 'Highest female voice type.') },
        { instrument: __alloT('stem.wave.if_alto', 'Voice (alto)'), range: '196 Hz - 698 Hz', fundamental: 'G3-F5', notes: __alloT('stem.wave.if_alto_notes', 'Lower female voice.') },
        { instrument: __alloT('stem.wave.if_tenor', 'Voice (tenor)'), range: '131 Hz - 523 Hz', fundamental: 'C3-C5', notes: __alloT('stem.wave.if_tenor_notes', 'Highest male voice.') },
        { instrument: __alloT('stem.wave.if_baritone', 'Voice (baritone)'), range: '110 Hz - 440 Hz', fundamental: 'A2-A4', notes: __alloT('stem.wave.if_baritone_notes', 'Most common male voice.') },
        { instrument: __alloT('stem.wave.if_bassvoice', 'Voice (bass)'), range: '82 Hz - 349 Hz', fundamental: 'E2-F4', notes: __alloT('stem.wave.if_bassvoice_notes', 'Lowest standard voice.') },
        { instrument: __alloT('stem.wave.if_kick', 'Drum kit (kick)'), range: '60-100 Hz', fundamental: __alloT('stem.wave.if_kick_fund', 'low rumble'), notes: __alloT('stem.wave.if_kick_notes', 'Felt as much as heard.') },
        { instrument: __alloT('stem.wave.if_snare', 'Drum kit (snare)'), range: '~200 Hz fundamental', fundamental: __alloT('stem.wave.if_snare_fund', 'sharp attack'), notes: __alloT('stem.wave.if_snare_notes', 'Wires (snares) add high-frequency rattle.') },
        { instrument: __alloT('stem.wave.if_cymbal', 'Cymbal (crash)'), range: 'broad ~300 Hz - 10+ kHz', fundamental: __alloT('stem.wave.if_cymbal_fund', 'inharmonic'), notes: __alloT('stem.wave.if_cymbal_notes', 'Not tonally pitched — many frequencies together.') }
      ];

      var RADIO_BANDS = [
        { band: __alloT('stem.wave.rb_elf', 'ELF (extremely low)'), range: '3-30 Hz', wavelength: '100,000-10,000 km', use: __alloT('stem.wave.rb_elf_use', 'Submarine communication (penetrates water).') },
        { band: __alloT('stem.wave.rb_slf', 'SLF (super low)'), range: '30-300 Hz', wavelength: '10,000-1,000 km', use: __alloT('stem.wave.rb_slf_use', 'Submarines, AC power harmonics.') },
        { band: __alloT('stem.wave.rb_ulf', 'ULF (ultra low)'), range: '300 Hz-3 kHz', wavelength: '1,000-100 km', use: __alloT('stem.wave.rb_ulf_use', 'Mine communication, geophysics.') },
        { band: __alloT('stem.wave.rb_vlf', 'VLF (very low)'), range: '3-30 kHz', wavelength: '100-10 km', use: __alloT('stem.wave.rb_vlf_use', 'Submarine comms, navigation beacons.') },
        { band: __alloT('stem.wave.rb_lf', 'LF (low)'), range: '30-300 kHz', wavelength: '10-1 km', use: __alloT('stem.wave.rb_lf_use', 'AM longwave radio (Europe), time signals (WWVB), aircraft navigation.') },
        { band: __alloT('stem.wave.rb_mf', 'MF (medium)'), range: '300 kHz-3 MHz', wavelength: '1 km-100 m', use: __alloT('stem.wave.rb_mf_use', 'AM broadcast radio (525-1705 kHz).') },
        { band: __alloT('stem.wave.rb_hf', 'HF (high)'), range: '3-30 MHz', wavelength: '100-10 m', use: __alloT('stem.wave.rb_hf_use', 'Shortwave radio, ham radio. Reflects off ionosphere → global propagation.') },
        { band: __alloT('stem.wave.rb_vhf', 'VHF (very high)'), range: '30-300 MHz', wavelength: '10-1 m', use: __alloT('stem.wave.rb_vhf_use', 'FM radio (88-108 MHz), TV channels 2-13, air traffic, weather radio.') },
        { band: __alloT('stem.wave.rb_uhf', 'UHF (ultra high)'), range: '300 MHz-3 GHz', wavelength: '1 m-10 cm', use: __alloT('stem.wave.rb_uhf_use', 'TV channels 14+, cellular (700 MHz - 2.6 GHz), Wi-Fi 2.4 GHz, microwave ovens.') },
        { band: __alloT('stem.wave.rb_shf', 'SHF (super high)'), range: '3-30 GHz', wavelength: '10 cm-1 cm', use: __alloT('stem.wave.rb_shf_use', 'Wi-Fi 5/6 GHz, satellite TV, radar.') },
        { band: __alloT('stem.wave.rb_ehf', 'EHF (extremely high)'), range: '30-300 GHz', wavelength: '1 cm-1 mm', use: __alloT('stem.wave.rb_ehf_use', '5G mmWave, automotive radar, radio astronomy.') },
        { band: __alloT('stem.wave.rb_thf', 'THF (terahertz)'), range: '300 GHz-3 THz', wavelength: '1 mm-100 μm', use: __alloT('stem.wave.rb_thf_use', 'Research band. Some imaging applications (terahertz cameras).') }
      ];

      var NAMED_COLORS = [
        { name: __alloT('stem.wave.nc_black', 'Black'), hex: '#000000', wavelength: '—', notes: __alloT('stem.wave.nc_black_notes', 'Absence of light. Truest black possible.') },
        { name: __alloT('stem.wave.nc_white', 'White'), hex: '#FFFFFF', wavelength: __alloT('stem.wave.nc_all_visible', 'all visible'), notes: __alloT('stem.wave.nc_white_notes', 'All wavelengths reflected equally.') },
        { name: __alloT('stem.wave.nc_red', 'Red'), hex: '#FF0000', wavelength: '~620-750 nm', notes: __alloT('stem.wave.nc_red_notes', 'Lowest energy visible.') },
        { name: __alloT('stem.wave.nc_orange', 'Orange'), hex: '#FFA500', wavelength: '~590-620 nm', notes: __alloT('stem.wave.nc_orange_notes', 'Between red + yellow.') },
        { name: __alloT('stem.wave.nc_yellow', 'Yellow'), hex: '#FFFF00', wavelength: '~570-590 nm', notes: __alloT('stem.wave.nc_yellow_notes', 'Brightest perceived color (peak human sensitivity).') },
        { name: __alloT('stem.wave.nc_green', 'Green'), hex: '#00FF00', wavelength: '~495-570 nm', notes: __alloT('stem.wave.nc_green_notes', 'Most abundant in nature (chlorophyll reflects).') },
        { name: __alloT('stem.wave.nc_cyan', 'Cyan'), hex: '#00FFFF', wavelength: '~485-500 nm', notes: __alloT('stem.wave.nc_cyan_notes', 'Halfway between blue + green.') },
        { name: __alloT('stem.wave.nc_blue', 'Blue'), hex: '#0000FF', wavelength: '~450-495 nm', notes: __alloT('stem.wave.nc_blue_notes', 'Scattered most by atmosphere → blue sky.') },
        { name: __alloT('stem.wave.nc_magenta', 'Magenta'), hex: '#FF00FF', wavelength: __alloT('stem.wave.nc_not_single', 'not a single λ'), notes: __alloT('stem.wave.nc_magenta_notes', 'Brain perceives red+blue without green. Has no monochromatic wavelength.') },
        { name: __alloT('stem.wave.nc_violet', 'Violet'), hex: '#8B00FF', wavelength: '~380-450 nm', notes: __alloT('stem.wave.nc_violet_notes', 'Highest energy visible. Beyond is UV.') },
        { name: __alloT('stem.wave.nc_pink', 'Pink'), hex: '#FFC0CB', wavelength: '—', notes: __alloT('stem.wave.nc_pink_notes', 'Tint of red. Lots of cultural meaning.') },
        { name: __alloT('stem.wave.nc_brown', 'Brown'), hex: '#A52A2A', wavelength: '—', notes: __alloT('stem.wave.nc_brown_notes', 'Dark orange/red. No "brown" wavelength exists — perceptual color only.') },
        { name: __alloT('stem.wave.nc_gray', 'Gray'), hex: '#808080', wavelength: '—', notes: __alloT('stem.wave.nc_gray_notes', 'Achromatic. Equal RGB at any intensity.') },
        { name: __alloT('stem.wave.nc_silver', 'Silver'), hex: '#C0C0C0', wavelength: '—', notes: __alloT('stem.wave.nc_silver_notes', 'Light gray, often with metallic sheen.') },
        { name: __alloT('stem.wave.nc_gold', 'Gold'), hex: '#FFD700', wavelength: '—', notes: __alloT('stem.wave.nc_gold_notes', 'Yellow with brownish tint. Metallic sheen in physical samples.') },
        { name: __alloT('stem.wave.nc_maroon', 'Maroon'), hex: '#800000', wavelength: '—', notes: __alloT('stem.wave.nc_maroon_notes', 'Dark red.') },
        { name: __alloT('stem.wave.nc_navy', 'Navy'), hex: '#000080', wavelength: '—', notes: __alloT('stem.wave.nc_navy_notes', 'Dark blue. Original navy uniforms.') },
        { name: __alloT('stem.wave.nc_teal', 'Teal'), hex: '#008080', wavelength: '—', notes: __alloT('stem.wave.nc_teal_notes', 'Dark cyan. Named after teal duck\'s head color.') },
        { name: __alloT('stem.wave.nc_olive', 'Olive'), hex: '#808000', wavelength: '—', notes: __alloT('stem.wave.nc_olive_notes', 'Dark yellow-green.') },
        { name: __alloT('stem.wave.nc_purple', 'Purple'), hex: '#800080', wavelength: '—', notes: __alloT('stem.wave.nc_purple_notes', 'Dark magenta. Royal purple historically rare + expensive (Tyrian dye).') },
        { name: __alloT('stem.wave.nc_indigo', 'Indigo'), hex: '#4B0082', wavelength: '~440-450 nm', notes: __alloT('stem.wave.nc_indigo_notes', 'Between blue + violet. Newton\'s color of the spectrum.') },
        { name: __alloT('stem.wave.nc_lime', 'Lime'), hex: '#00FF00', wavelength: '~495-570 nm', notes: __alloT('stem.wave.nc_lime_notes', 'Web "lime" = pure green RGB.') },
        { name: __alloT('stem.wave.nc_aqua', 'Aqua'), hex: '#00FFFF', wavelength: '~485-500 nm', notes: __alloT('stem.wave.nc_aqua_notes', 'Same as cyan in web colors.') },
        { name: __alloT('stem.wave.nc_fuchsia', 'Fuchsia'), hex: '#FF00FF', wavelength: __alloT('stem.wave.nc_not_single', 'not a single λ'), notes: __alloT('stem.wave.nc_fuchsia_notes', 'Same as magenta in web colors.') },
        { name: __alloT('stem.wave.nc_coral', 'Coral'), hex: '#FF7F50', wavelength: '—', notes: __alloT('stem.wave.nc_coral_notes', 'Orange-pink, named after coral reefs.') },
        { name: __alloT('stem.wave.nc_tomato', 'Tomato'), hex: '#FF6347', wavelength: '—', notes: __alloT('stem.wave.nc_tomato_notes', 'Bright red-orange.') },
        { name: __alloT('stem.wave.nc_salmon', 'Salmon'), hex: '#FA8072', wavelength: '—', notes: __alloT('stem.wave.nc_salmon_notes', 'Pinkish orange, like salmon flesh.') },
        { name: __alloT('stem.wave.nc_khaki', 'Khaki'), hex: '#F0E68C', wavelength: '—', notes: __alloT('stem.wave.nc_khaki_notes', 'Light yellow-brown. Military uniforms.') },
        { name: __alloT('stem.wave.nc_crimson', 'Crimson'), hex: '#DC143C', wavelength: '~640 nm', notes: __alloT('stem.wave.nc_crimson_notes', 'Deep red.') },
        { name: __alloT('stem.wave.nc_lavender', 'Lavender'), hex: '#E6E6FA', wavelength: '—', notes: __alloT('stem.wave.nc_lavender_notes', 'Light purple, named after the flower.') },
        { name: __alloT('stem.wave.nc_turquoise', 'Turquoise'), hex: '#40E0D0', wavelength: '~490 nm', notes: __alloT('stem.wave.nc_turquoise_notes', 'Greenish blue, named after the gemstone.') },
        { name: __alloT('stem.wave.nc_beige', 'Beige'), hex: '#F5F5DC', wavelength: '—', notes: __alloT('stem.wave.nc_beige_notes', 'Pale yellow-brown. Common neutral.') }
      ];

      var WAVE_SPEEDS = [
        { medium: __alloT('stem.wave.ws_vacuum', 'Vacuum'), speed: '299,792,458 m/s (light)', notes: __alloT('stem.wave.ws_vacuum_notes', 'Defined exactly. Maximum possible speed of any information.') },
        { medium: __alloT('stem.wave.ws_air0', 'Air at 0°C'), speed: '331 m/s (sound)', notes: __alloT('stem.wave.ws_air0_notes', 'Speed of sound increases with temperature.') },
        { medium: __alloT('stem.wave.ws_air20', 'Air at 20°C'), speed: '343 m/s (sound)', notes: __alloT('stem.wave.ws_air20_notes', 'Standard reference. ~1235 km/h, 767 mph.') },
        { medium: __alloT('stem.wave.ws_helium', 'Helium at 20°C'), speed: '~1007 m/s (sound)', notes: __alloT('stem.wave.ws_helium_notes', 'Faster — lighter molecules. Why helium makes voice high-pitched.') },
        { medium: __alloT('stem.wave.ws_water20', 'Water at 20°C'), speed: '~1482 m/s (sound)', notes: __alloT('stem.wave.ws_water20_notes', 'Sound travels ~4× faster in water than air.') },
        { medium: __alloT('stem.wave.ws_steel', 'Steel'), speed: '~5960 m/s (sound)', notes: __alloT('stem.wave.ws_steel_notes', 'Sound very fast in stiff solids.') },
        { medium: __alloT('stem.wave.ws_diamond', 'Diamond'), speed: '~12,000 m/s (sound)', notes: __alloT('stem.wave.ws_diamond_notes', 'Fastest sound speed of common materials.') },
        { medium: __alloT('stem.wave.ws_glass', 'Glass (typical)'), speed: '~200,000 km/s (light)', notes: __alloT('stem.wave.ws_glass_notes', 'About 2/3 c. Refractive index n = c/v ≈ 1.5.') },
        { medium: __alloT('stem.wave.ws_water', 'Water'), speed: '~225,000 km/s (light)', notes: __alloT('stem.wave.ws_water_notes', 'About 3/4 c. n ≈ 1.33.') },
        { medium: __alloT('stem.wave.ws_crust_p', 'Crust (P-waves)'), speed: '~5-8 km/s', notes: __alloT('stem.wave.ws_crust_p_notes', 'Earthquake P-waves move at this speed in upper crust.') },
        { medium: __alloT('stem.wave.ws_crust_s', 'Crust (S-waves)'), speed: '~3-4.5 km/s', notes: __alloT('stem.wave.ws_crust_s_notes', 'Slower than P-waves.') },
        { medium: __alloT('stem.wave.ws_tsunami', 'Tsunami (deep ocean)'), speed: '~700 km/h', notes: __alloT('stem.wave.ws_tsunami_notes', 'Long-wavelength shallow-water wave. Slows + grows at shore.') },
        { medium: __alloT('stem.wave.ws_coax', 'Light in coaxial cable'), speed: '~200,000 km/s', notes: __alloT('stem.wave.ws_coax_notes', 'Slower than vacuum — limits internet latency to/from data centers.') },
        { medium: __alloT('stem.wave.ws_tissue', 'Sound in body tissue'), speed: '~1500-1600 m/s', notes: __alloT('stem.wave.ws_tissue_notes', 'Similar to water. Why ultrasound works for medical imaging.') },
        { medium: __alloT('stem.wave.ws_rope', 'Compressional wave in rope'), speed: '√(T/μ) m/s', notes: __alloT('stem.wave.ws_rope_notes', 'T = tension, μ = linear density. Tighter rope → faster waves.') }
      ];

      function renderAnimalsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🦇 ' + __alloT('stem.wave.sec_animals_title', 'Animal hearing ranges')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_animal', 'Animal'), __alloT('stem.wave.col_hearing_range', 'Hearing range'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                ANIMAL_HEARING.map(function(a, i) {
                  return React.createElement('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.animal),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, a.range),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, a.notes)
                  );
                })
              )
            )
          ),
          renderTryInSimBtn('animal_echolocation_sonar', __alloT('stem.wave.try_animal_sonar', 'Bat/Dolphin Ultrasonic Sonar Ping'), { waveMode: 'free', frequency: 8, amplitude: 55, waveSpeed: 343, packetMode: 'packet', wallFrac: 0.72 })
        );
      }

      function renderInstrumentFreqSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎻 ' + __alloT('stem.wave.sec_instrumentfreq_title', 'Musical instrument frequencies')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_instrument', 'Instrument'), __alloT('stem.wave.col_range', 'Range'), __alloT('stem.wave.col_notes_notation', 'Notes (notation)'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                INSTRUMENT_FREQS.map(function(I, i) {
                  return React.createElement('tr', { key: 'I'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, I.instrument),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, I.range),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, I.fundamental),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, I.notes)
                  );
                })
              )
            )
          ),
          renderTryInSimBtn('instrument_fifths_beats', __alloT('stem.wave.try_instrument_fifth', 'String Fifth (3:2) & Tuning Beat Bench'), { waveMode: 'free', showSecond: true, intervalLock: '3:2', showBeatEnvelope: true, frequency: 4, amplitude: 50, amplitude2: 50 })
        );
      }

      function renderRadioSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📻 ' + __alloT('stem.wave.sec_radio_bands_title', 'Radio frequency bands (ITU)')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_radio_bands_intro', 'EM waves below visible light, classified by frequency. Lower bands penetrate further; higher bands carry more data.')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_band', 'Band'), __alloT('stem.wave.col_frequency', 'Frequency'), __alloT('stem.wave.col_wavelength', 'Wavelength'), __alloT('stem.wave.col_use', 'Use')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                RADIO_BANDS.map(function(b, i) {
                  return React.createElement('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, b.band),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, b.range),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, b.wavelength),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem]' }, b.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderColorhexSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 ' + __alloT('stem.wave.sec_colorhex_title', 'Named colors + their wavelengths')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_color', 'Color'), __alloT('stem.wave.col_hex', 'Hex'), 'λ peak', __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                NAMED_COLORS.map(function(c, i) {
                  return React.createElement('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800', style: { borderLeft: '8px solid ' + c.hex } }, c.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.hex),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 text-[0.625rem]' }, c.wavelength),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderWaveSpeedSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏱ ' + __alloT('stem.wave.sec_wavespeed_title', 'Wave speeds in different media')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  ['Medium', 'Speed', 'Notes'].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                WAVE_SPEEDS.map(function(w, i) {
                  return React.createElement('tr', { key: 'w'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, w.medium),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold text-[0.625rem]' }, w.speed),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, w.notes)
                  );
                })
              )
            )
          ),
          renderTryInSimBtn('air_temp_sound_demo', __alloT('stem.wave.try_air_temp_sound', 'Air Temperature & Sound Speed Lab (T\u00B0C)'), { waveMode: 'longitudinal', longitudinalMode: 'standing', airTempCoupled: true, airTempC: 35, harmonic: 2 })
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var COLOR_MODELS = [
        { model: __alloT('stem.wave.cm_rgb', 'RGB (additive)'), use: __alloT('stem.wave.cm_rgb_use', 'Screens, displays'), notes: __alloT('stem.wave.cm_rgb_notes', 'Red + Green + Blue. All three at max = white. Used because screens emit light.') },
        { model: __alloT('stem.wave.cm_cmyk', 'CMYK (subtractive)'), use: __alloT('stem.wave.cm_cmyk_use', 'Printing'), notes: __alloT('stem.wave.cm_cmyk_notes', 'Cyan, Magenta, Yellow + Key (black). Inks absorb colors; all four = black. Used because paper reflects light.') },
        { model: __alloT('stem.wave.cm_hsl', 'HSL / HSV'), use: __alloT('stem.wave.cm_hsl_use', 'Color pickers, design'), notes: __alloT('stem.wave.cm_hsl_notes', 'Hue (angle 0-360°), Saturation (%), Lightness/Value (%). More intuitive than RGB for humans.') },
        { model: __alloT('stem.wave.cm_lab', 'LAB (CIELAB)'), use: __alloT('stem.wave.cm_lab_use', 'Color science, calibration'), notes: __alloT('stem.wave.cm_lab_notes', 'L = lightness, a = green-red, b = blue-yellow. Perceptually uniform.') },
        { model: __alloT('stem.wave.cm_xyz', 'XYZ (CIE 1931)'), use: __alloT('stem.wave.cm_xyz_use', 'Reference for all other models'), notes: __alloT('stem.wave.cm_xyz_notes', 'Based on human cone responses. Foundation of modern colorimetry.') },
        { model: __alloT('stem.wave.cm_srgb', 'sRGB'), use: __alloT('stem.wave.cm_srgb_use', 'Standard web + most displays'), notes: __alloT('stem.wave.cm_srgb_notes', 'Limited color gamut. Defines specific RGB primaries + gamma curve.') },
        { model: __alloT('stem.wave.cm_adobe', 'Adobe RGB'), use: __alloT('stem.wave.cm_adobe_use', 'Print prep + pro photography'), notes: __alloT('stem.wave.cm_adobe_notes', 'Wider gamut than sRGB, especially in greens.') },
        { model: __alloT('stem.wave.cm_p3', 'Display P3'), use: __alloT('stem.wave.cm_p3_use', 'Apple devices, modern smartphones'), notes: __alloT('stem.wave.cm_p3_notes', 'Wider gamut than sRGB, esp. reds. Standard for HDR.') },
        { model: __alloT('stem.wave.cm_rec2020', 'Rec. 2020'), use: __alloT('stem.wave.cm_rec2020_use', 'UHD TV / 4K + 8K video'), notes: __alloT('stem.wave.cm_rec2020_notes', 'Very wide gamut. Few displays can reproduce it fully.') }
      ];

      var LASER_TYPES = [
        { type: __alloT('stem.wave.lt_hene', 'Helium-Neon (HeNe)'), wavelength: '633 nm (red)', power: 'mW', use: __alloT('stem.wave.lt_hene_use', 'Alignment, barcode scanners (old). One of the first practical lasers.') },
        { type: __alloT('stem.wave.lt_co2', 'CO₂'), wavelength: '10.6 μm (IR)', power: 'W to kW', use: __alloT('stem.wave.lt_co2_use', 'Cutting metal + acrylic, surgery, marking.') },
        { type: __alloT('stem.wave.lt_ndyag', 'Nd:YAG'), wavelength: '1064 nm (NIR)', power: 'mW to kW', use: __alloT('stem.wave.lt_ndyag_use', 'Industrial cutting + welding, medical (skin treatment, tattoo removal).') },
        { type: __alloT('stem.wave.lt_argon', 'Argon ion'), wavelength: '488, 514 nm (blue-green)', power: 'mW to W', use: __alloT('stem.wave.lt_argon_use', 'Eye surgery (retinal), flow cytometry, light shows.') },
        { type: __alloT('stem.wave.lt_excimer', 'Excimer (ArF, KrF)'), wavelength: '193, 248 nm (UV)', power: 'pulse', use: __alloT('stem.wave.lt_excimer_use', 'LASIK eye surgery, microchip photolithography.') },
        { type: __alloT('stem.wave.lt_semiconductor', 'Semiconductor (laser diode)'), wavelength: 'broad — 400 nm to 2 μm', power: 'mW to W', use: __alloT('stem.wave.lt_semiconductor_use', 'CD/DVD/Blu-ray, laser pointers, fiber-optic comm.') },
        { type: __alloT('stem.wave.lt_fiber', 'Fiber laser'), wavelength: '~1 μm (typically)', power: 'W to kW', use: __alloT('stem.wave.lt_fiber_use', 'Industrial cutting/welding. Higher efficiency than older lasers.') },
        { type: __alloT('stem.wave.lt_dye', 'Dye laser'), wavelength: __alloT('stem.wave.lt_dye_wl', 'tunable across visible'), power: 'mW to W', use: __alloT('stem.wave.lt_dye_use', 'Spectroscopy, research. Largely replaced by tunable solid-state.') },
        { type: __alloT('stem.wave.lt_fel', 'Free-electron laser (FEL)'), wavelength: __alloT('stem.wave.lt_fel_wl', 'tunable, microwave to X-ray'), power: __alloT('stem.wave.lt_fel_power', 'high'), use: __alloT('stem.wave.lt_fel_use', 'Research — accelerator-based. Atomic-scale imaging.') },
        { type: __alloT('stem.wave.lt_tisapphire', 'Ti:Sapphire'), wavelength: '~800 nm (tunable)', power: 'W (ultrafast)', use: __alloT('stem.wave.lt_tisapphire_use', 'Ultrafast science. Femtosecond pulses. Two-photon microscopy.') }
      ];

      var LASER_FACTS = [
        { fact: __alloT('stem.wave.lf_acronym', 'LASER acronym'), detail: __alloT('stem.wave.lf_acronym_detail', 'Light Amplification by Stimulated Emission of Radiation.') },
        { fact: __alloT('stem.wave.lf_stimulated', 'Stimulated emission'), detail: __alloT('stem.wave.lf_stimulated_detail', 'A photon causes an excited atom to emit a SECOND identical photon. Cascade of identical photons = laser beam.') },
        { fact: __alloT('stem.wave.lf_inversion', 'Population inversion'), detail: __alloT('stem.wave.lf_inversion_detail', 'More atoms in excited state than ground. Required for net amplification. Achieved via "pumping" (light, current, or chemical).') },
        { fact: __alloT('stem.wave.lf_coherence', 'Coherence'), detail: __alloT('stem.wave.lf_coherence_detail', 'Laser photons all in phase. Allows interference effects + tight focusing.') },
        { fact: __alloT('stem.wave.lf_monochromatic', 'Monochromatic'), detail: __alloT('stem.wave.lf_monochromatic_detail', 'Single wavelength. Real lasers have very narrow line width (kHz to GHz).') },
        { fact: __alloT('stem.wave.lf_divergence', 'Beam divergence'), detail: __alloT('stem.wave.lf_divergence_detail', 'Laser beams spread VERY slowly. Apollo laser ranging spread <2 km over 384,400 km to Moon.') },
        { fact: __alloT('stem.wave.lf_eyesafety', 'Eye safety'), detail: __alloT('stem.wave.lf_eyesafety_detail', 'Even low-power lasers can blind. Focused on retina, mW = sun-level brightness on photoreceptors.') },
        { fact: __alloT('stem.wave.lf_classes', 'Classes'), detail: __alloT('stem.wave.lf_classes_detail', 'Class 1 (safe), Class 2 (eye blink protects), Class 3R/3B (potentially hazardous), Class 4 (skin burns + fire risk).') }
      ];

      var FIBER_OPTICS = [
        { topic: __alloT('stem.wave.fo_howwork', 'How they work'), detail: __alloT('stem.wave.fo_howwork_detail', 'Total internal reflection traps light in core (higher n) surrounded by cladding (lower n). Light bounces along the fiber.') },
        { topic: __alloT('stem.wave.fo_smf', 'Single-mode fiber (SMF)'), detail: __alloT('stem.wave.fo_smf_detail', 'Core ~9 μm. Only one mode propagates. Long distances (>100 km). Used in telecom backbones.') },
        { topic: __alloT('stem.wave.fo_mmf', 'Multi-mode fiber (MMF)'), detail: __alloT('stem.wave.fo_mmf_detail', 'Core ~50-62.5 μm. Many modes — limits bandwidth-distance product. Short runs (<2 km).') },
        { topic: __alloT('stem.wave.fo_attenuation', 'Attenuation'), detail: __alloT('stem.wave.fo_attenuation_detail', 'Modern fibers: ~0.2 dB/km at 1550 nm. Signal halves every ~15 km without amplification.') },
        { topic: __alloT('stem.wave.fo_dispersion', 'Dispersion'), detail: __alloT('stem.wave.fo_dispersion_detail', 'Different wavelengths or modes travel at slightly different speeds → pulse spreading. Limits data rate.') },
        { topic: __alloT('stem.wave.fo_edfa', 'EDFA (erbium-doped fiber amp)'), detail: __alloT('stem.wave.fo_edfa_detail', 'Amplifies optical signal directly without electrical conversion. Revolutionized long-haul fiber.') },
        { topic: __alloT('stem.wave.fo_wdm', 'WDM (wavelength division multiplexing)'), detail: __alloT('stem.wave.fo_wdm_detail', 'Multiple wavelengths on one fiber. DWDM can fit 100+ channels — Tb/s per fiber.') },
        { topic: __alloT('stem.wave.fo_bdp', 'Bandwidth-distance product'), detail: __alloT('stem.wave.fo_bdp_detail', 'Single-mode fiber: petabit-per-second times km. Vastly more than copper.') },
        { topic: __alloT('stem.wave.fo_backbones', 'Real-world: internet backbones'), detail: __alloT('stem.wave.fo_backbones_detail', '99% of intercontinental data traffic goes over fiber-optic submarine cables.') },
        { topic: __alloT('stem.wave.fo_endoscopes', 'Real-world: medical endoscopes'), detail: __alloT('stem.wave.fo_endoscopes_detail', 'Coherent fiber bundles transmit images. Used to inspect inside body.') },
        { topic: __alloT('stem.wave.fo_sensors', 'Real-world: sensors'), detail: __alloT('stem.wave.fo_sensors_detail', 'Fiber Bragg gratings detect strain, temperature. Used in bridges, oil wells, aerospace.') }
      ];

      var COMM_PROTOCOLS = [
        { name: 'Wi-Fi 6 (802.11ax)', band: '2.4 + 5 + 6 GHz', notes: __alloT('stem.wave.cp_wifi6_notes', 'Up to ~10 Gbps. OFDMA for many simultaneous users.') },
        { name: 'Wi-Fi 7 (802.11be)', band: '2.4 + 5 + 6 GHz', notes: __alloT('stem.wave.cp_wifi7_notes', 'Up to ~46 Gbps theoretical. Wider channels (320 MHz).') },
        { name: __alloT('stem.wave.cp_bt_classic', 'Bluetooth Classic'), band: '2.4 GHz', notes: __alloT('stem.wave.cp_bt_classic_notes', '~1-3 Mbps. Pairing for headphones, controllers.') },
        { name: __alloT('stem.wave.cp_bt_le', 'Bluetooth LE (low energy)'), band: '2.4 GHz', notes: __alloT('stem.wave.cp_bt_le_notes', '~1-2 Mbps. Beacons, sensors, wearables. Years of coin-cell battery life.') },
        { name: 'Zigbee', band: '2.4 GHz (mostly)', notes: __alloT('stem.wave.cp_zigbee_notes', '~250 kbps. Mesh networking. Smart-home devices.') },
        { name: '4G LTE', band: '600 MHz - 2.6 GHz', notes: __alloT('stem.wave.cp_4g_notes', '~50-150 Mbps typical.') },
        { name: '5G (sub-6 GHz)', band: '600 MHz - 6 GHz', notes: __alloT('stem.wave.cp_5g_sub6_notes', '~100 Mbps - 1 Gbps. Wider coverage than mmWave.') },
        { name: '5G (mmWave)', band: '24-100 GHz', notes: __alloT('stem.wave.cp_5g_mmwave_notes', 'Multi-Gbps in clear LOS. Heavily blocked by walls, body, rain.') },
        { name: 'NFC', band: '13.56 MHz', notes: __alloT('stem.wave.cp_nfc_notes', 'cm range. Contactless payment, pairing.') },
        { name: 'RFID (UHF)', band: '860-960 MHz', notes: __alloT('stem.wave.cp_rfid_notes', 'Inventory, tags. Reads at distance without battery in tag.') },
        { name: __alloT('stem.wave.cp_am', 'AM radio'), band: '535-1605 kHz', notes: __alloT('stem.wave.cp_am_notes', 'Amplitude-modulated. Long range, low fidelity. Susceptible to noise.') },
        { name: __alloT('stem.wave.cp_fm', 'FM radio'), band: '88-108 MHz', notes: __alloT('stem.wave.cp_fm_notes', 'Frequency-modulated. Better noise immunity than AM, higher fidelity.') },
        { name: 'GPS L1', band: '1.575 GHz', notes: __alloT('stem.wave.cp_gps_notes', 'Civilian band. ~30 satellites.') },
        { name: __alloT('stem.wave.cp_sattv', 'Satellite TV (Ku band)'), band: '12-14 GHz', notes: __alloT('stem.wave.cp_sattv_notes', 'Most consumer satellite TV.') },
        { name: __alloT('stem.wave.cp_microwave', 'Microwave oven'), band: '2.45 GHz', notes: __alloT('stem.wave.cp_microwave_notes', 'Same band as Wi-Fi! Why microwaves can disrupt Wi-Fi when door seal is bad.') }
      ];

      var MUSIC_ACOUSTICS = [
        { topic: __alloT('stem.wave.ma_pitch', 'Pitch'), detail: __alloT('stem.wave.ma_pitch_detail', 'Perception of frequency. A4 = 440 Hz standard concert pitch (some orchestras use 442 Hz).') },
        { topic: __alloT('stem.wave.ma_octave', 'Octave'), detail: __alloT('stem.wave.ma_octave_detail', 'Doubling of frequency. A4 = 440 Hz, A5 = 880 Hz, A3 = 220 Hz.') },
        { topic: __alloT('stem.wave.ma_equaltemp', 'Equal temperament'), detail: __alloT('stem.wave.ma_equaltemp_detail', '12 semitones per octave, each ratio 2^(1/12) ≈ 1.05946. Allows transposing.') },
        { topic: __alloT('stem.wave.ma_justint', 'Just intonation'), detail: __alloT('stem.wave.ma_justint_detail', 'Uses simple integer ratios (3:2 = perfect fifth, 5:4 = major third). Sounds more "pure" but not transposable.') },
        { topic: __alloT('stem.wave.ma_harmonics', 'Harmonics'), detail: __alloT('stem.wave.ma_harmonics_detail', 'Integer multiples of fundamental. Determine timbre. Different instruments emphasize different harmonics.') },
        { topic: __alloT('stem.wave.ma_formants', 'Formants'), detail: __alloT('stem.wave.ma_formants_detail', 'Resonant peaks in vocal/instrument spectrum. Distinguish vowels + instruments.') },
        { topic: __alloT('stem.wave.ma_beats', 'Beats'), detail: __alloT('stem.wave.ma_beats_detail', 'Two close frequencies interfere → audible amplitude oscillation at difference frequency. Used to tune instruments.') },
        { topic: __alloT('stem.wave.ma_resonance', 'Resonance (instruments)'), detail: __alloT('stem.wave.ma_resonance_detail', 'Air column or string vibrates at characteristic frequencies. Length + tension determine pitch.') },
        { topic: __alloT('stem.wave.ma_string', 'String frequency'), detail: __alloT('stem.wave.ma_string_detail', 'f = (1/2L)·√(T/μ). Higher tension or shorter string → higher pitch.') },
        { topic: __alloT('stem.wave.ma_openpipe', 'Open pipe resonance'), detail: __alloT('stem.wave.ma_openpipe_detail', 'f = nv/(2L). Both ends open. Even harmonics present (flute).') },
        { topic: __alloT('stem.wave.ma_closedpipe', 'Closed pipe resonance'), detail: __alloT('stem.wave.ma_closedpipe_detail', 'f = (2n-1)v/(4L). One end closed. Only odd harmonics (clarinet).') },
        { topic: __alloT('stem.wave.ma_stereo', 'Stereo + spatial audio'), detail: __alloT('stem.wave.ma_stereo_detail', 'Two ears → interaural time + level differences locate sound. Spatial audio reproduces this with head tracking.') },
        { topic: __alloT('stem.wave.ma_reverb', 'Reverb time (RT60)'), detail: __alloT('stem.wave.ma_reverb_detail', 'Time for sound to decay by 60 dB. Concert hall ~1.5-2 s; cathedral ~5-10 s; recording studio <0.3 s.') },
        { topic: __alloT('stem.wave.ma_decibels', 'Decibels (sound)'), detail: __alloT('stem.wave.ma_decibels_detail', '0 dB SPL = threshold of hearing. Conversation ~60 dB. Rock concert ~110 dB. Pain ~130 dB. Hearing damage >85 dB long exposure.') }
      ];

      var EAR_PARTS = [
        { part: __alloT('stem.wave.ear_pinna', 'Pinna (outer ear)'), function: __alloT('stem.wave.ear_pinna_fn', 'Funnels sound to canal; helps localize sound'), notes: __alloT('stem.wave.ear_pinna_notes', 'Shape filters frequencies → vertical localization cues.') },
        { part: __alloT('stem.wave.ear_canal', 'Ear canal'), function: __alloT('stem.wave.ear_canal_fn', 'Channels sound to eardrum'), notes: __alloT('stem.wave.ear_canal_notes', 'Resonates at ~3 kHz → enhanced sensitivity to speech frequencies.') },
        { part: __alloT('stem.wave.ear_eardrum', 'Eardrum (tympanic membrane)'), function: __alloT('stem.wave.ear_eardrum_fn', 'Vibrates with sound waves'), notes: __alloT('stem.wave.ear_eardrum_notes', '~0.1 mm thick. Connected to ossicles.') },
        { part: __alloT('stem.wave.ear_ossicles', 'Ossicles (hammer, anvil, stirrup)'), function: __alloT('stem.wave.ear_ossicles_fn', 'Amplify + transmit vibrations to cochlea'), notes: __alloT('stem.wave.ear_ossicles_notes', 'Smallest bones in body. Lever action + area mismatch amplifies ~20×.') },
        { part: __alloT('stem.wave.ear_oval', 'Oval window'), function: __alloT('stem.wave.ear_oval_fn', 'Membrane connecting middle to inner ear'), notes: __alloT('stem.wave.ear_oval_notes', 'Stirrup pushes against it, transferring vibration to cochlear fluid.') },
        { part: __alloT('stem.wave.ear_cochlea', 'Cochlea'), function: __alloT('stem.wave.ear_cochlea_fn', 'Frequency analysis — different positions respond to different frequencies'), notes: __alloT('stem.wave.ear_cochlea_notes', 'Snail-shaped. ~3.5 turns. ~16,000 hair cells per ear.') },
        { part: __alloT('stem.wave.ear_basilar', 'Basilar membrane'), function: __alloT('stem.wave.ear_basilar_fn', 'Mechanical frequency analysis'), notes: __alloT('stem.wave.ear_basilar_notes', 'Stiff near oval window (high freq), floppy at apex (low freq).') },
        { part: __alloT('stem.wave.ear_haircells', 'Hair cells'), function: __alloT('stem.wave.ear_haircells_fn', 'Convert mechanical vibration to neural signal'), notes: __alloT('stem.wave.ear_haircells_notes', 'Outer hair cells amplify; inner hair cells transmit. Damage = permanent hearing loss.') },
        { part: __alloT('stem.wave.ear_nerve', 'Auditory nerve'), function: __alloT('stem.wave.ear_nerve_fn', 'Carries signal to brain'), notes: __alloT('stem.wave.ear_nerve_notes', 'About 30,000 fibers per ear.') },
        { part: __alloT('stem.wave.ear_semicircular', 'Semicircular canals'), function: __alloT('stem.wave.ear_semicircular_fn', 'Balance + head rotation'), notes: __alloT('stem.wave.ear_semicircular_notes', '3 fluid-filled rings in 3 perpendicular planes. Detect angular acceleration.') },
        { part: __alloT('stem.wave.ear_otolith', 'Otolith organs'), function: __alloT('stem.wave.ear_otolith_fn', 'Detect linear acceleration + gravity'), notes: __alloT('stem.wave.ear_otolith_notes', 'Crystals on hair cells move with motion. Source of "elevator stomach" feeling.') }
      ];

      var MEDICAL_IMAGING = [
        { method: 'X-ray', radiation: __alloT('stem.wave.mi_xray_rad', 'X-rays'), use: __alloT('stem.wave.mi_xray_use', 'Bones, dense tissue. Quick, cheap, ubiquitous.'), notes: __alloT('stem.wave.mi_xray_notes', 'Ionizing radiation. Bone absorbs more than soft tissue → contrast.') },
        { method: __alloT('stem.wave.mi_ct', 'CT scan'), radiation: __alloT('stem.wave.mi_ct_rad', 'X-rays (many angles)'), use: __alloT('stem.wave.mi_ct_use', '3D reconstruction. Trauma, tumors, internal injury.'), notes: __alloT('stem.wave.mi_ct_notes', 'Higher dose than single X-ray. Excellent anatomical detail.') },
        { method: 'MRI', radiation: __alloT('stem.wave.mi_mri_rad', 'Radio (in strong B field)'), use: __alloT('stem.wave.mi_mri_use', 'Soft tissue, brain, joints, tumors.'), notes: __alloT('stem.wave.mi_mri_notes', 'No ionizing radiation. Long scans. T1 vs T2 highlights different features.') },
        { method: 'fMRI', radiation: __alloT('stem.wave.mi_mri_rad', 'Radio (in strong B field)'), use: __alloT('stem.wave.mi_fmri_use', 'Brain activity via blood oxygenation'), notes: __alloT('stem.wave.mi_fmri_notes', 'BOLD signal. Indirect — neural activity → blood flow change → MRI signal.') },
        { method: __alloT('stem.wave.mi_ultrasound', 'Ultrasound'), radiation: __alloT('stem.wave.mi_ultrasound_rad', 'High-frequency sound'), use: __alloT('stem.wave.mi_ultrasound_use', 'Pregnancy, heart, abdominal organs'), notes: __alloT('stem.wave.mi_ultrasound_notes', 'No radiation. Real-time. Doppler mode shows blood flow.') },
        { method: __alloT('stem.wave.mi_pet', 'PET scan'), radiation: __alloT('stem.wave.mi_pet_rad', 'Positron emission (radiotracer)'), use: __alloT('stem.wave.mi_pet_use', 'Metabolic activity, cancer staging, brain disease'), notes: __alloT('stem.wave.mi_pet_notes', 'Radioactive glucose (FDG) concentrates in active tissue.') },
        { method: 'SPECT', radiation: __alloT('stem.wave.mi_spect_rad', 'Gamma (radiotracer)'), use: __alloT('stem.wave.mi_spect_use', 'Blood flow, heart, brain'), notes: __alloT('stem.wave.mi_spect_notes', 'Like PET but uses single-photon emitters; lower resolution but cheaper.') },
        { method: __alloT('stem.wave.mi_mammography', 'Mammography'), radiation: __alloT('stem.wave.mi_mammography_rad', 'Low-energy X-rays'), use: __alloT('stem.wave.mi_mammography_use', 'Breast tissue screening'), notes: __alloT('stem.wave.mi_mammography_notes', 'Compression spreads tissue for clearer image.') },
        { method: __alloT('stem.wave.mi_dexa', 'Bone densitometry (DEXA)'), radiation: __alloT('stem.wave.mi_dexa_rad', 'Dual-energy X-ray'), use: __alloT('stem.wave.mi_dexa_use', 'Bone density (osteoporosis)'), notes: __alloT('stem.wave.mi_dexa_notes', 'Two energies subtract to isolate bone density.') },
        { method: __alloT('stem.wave.mi_oct', 'OCT (optical coherence tomography)'), radiation: __alloT('stem.wave.mi_oct_rad', 'Near-infrared light'), use: __alloT('stem.wave.mi_oct_use', 'Retina + cornea imaging'), notes: __alloT('stem.wave.mi_oct_notes', 'Like ultrasound but with light. μm resolution. No radiation.') }
      ];

      var SATELLITE_FACTS = [
        { topic: __alloT('stem.wave.sat_altitude', 'GPS orbital altitude'), detail: __alloT('stem.wave.sat_altitude_detail', '~20,200 km. Medium Earth orbit. Period ~12 hours (2 orbits per sidereal day).') },
        { topic: __alloT('stem.wave.sat_constellation', 'GPS constellation'), detail: __alloT('stem.wave.sat_constellation_detail', '24+ satellites; need ≥4 in view for 3D fix + time.') },
        { topic: __alloT('stem.wave.sat_receiver', 'Receiver position'), detail: __alloT('stem.wave.sat_receiver_detail', 'Triangulation by time-of-flight from satellites to receiver. Needs 4 satellites (3 for position + 1 for clock sync).') },
        { topic: __alloT('stem.wave.sat_accuracy', 'Accuracy'), detail: __alloT('stem.wave.sat_accuracy_detail', 'Civilian GPS: ~3-10 m. With augmentation (DGPS, RTK): cm. Selective Availability ended in 2000.') },
        { topic: 'Galileo', detail: __alloT('stem.wave.sat_galileo_detail', 'EU GNSS. ~30 satellites. Open service ~1 m accuracy.') },
        { topic: 'GLONASS', detail: __alloT('stem.wave.sat_glonass_detail', 'Russian GNSS. ~24 satellites.') },
        { topic: 'BeiDou', detail: __alloT('stem.wave.sat_beidou_detail', 'Chinese GNSS. 35 satellites. Global service since 2020.') },
        { topic: __alloT('stem.wave.sat_geo', 'Geostationary orbit (GEO)'), detail: __alloT('stem.wave.sat_geo_detail', '35,786 km altitude. Period = 24 hours → fixed over equator point. Used for TV, weather.') },
        { topic: __alloT('stem.wave.sat_leo', 'Low Earth orbit (LEO)'), detail: __alloT('stem.wave.sat_leo_detail', '200-2000 km. Period ~90 min. ISS at ~400 km. Starlink at ~550 km. Lower latency.') },
        { topic: __alloT('stem.wave.sat_clocks', 'Atomic clocks on GPS'), detail: __alloT('stem.wave.sat_clocks_detail', 'Cesium + rubidium clocks. Stability ~10⁻¹³. Even small relativistic effects matter — must correct for both special + general relativity.') },
        { topic: __alloT('stem.wave.sat_lighttime', 'Light travel time'), detail: __alloT('stem.wave.sat_lighttime_detail', 'GPS satellite → receiver: ~70 ms. Geo satellite → receiver: ~250 ms (perceptible delay in geo satellite calls).') }
      ];

      var GW_FACTS = [
        { topic: __alloT('stem.wave.gw_whatare', 'What they are'), detail: __alloT('stem.wave.gw_whatare_detail', 'Ripples in spacetime predicted by Einstein (1916). Travel at speed of light.') },
        { topic: __alloT('stem.wave.gw_sources', 'Sources'), detail: __alloT('stem.wave.gw_sources_detail', 'Massive accelerating objects: merging black holes + neutron stars, supernovae, pulsars, Big Bang.') },
        { topic: 'LIGO', detail: __alloT('stem.wave.gw_ligo_detail', 'Laser Interferometer Gravitational-wave Observatory. Two L-shaped detectors (Hanford WA, Livingston LA), 4 km arms.') },
        { topic: __alloT('stem.wave.gw_firstdetect', 'First detection'), detail: __alloT('stem.wave.gw_firstdetect_detail', '14 September 2015. Two ~30 M☉ black holes merged ~1.3 billion years ago. Signal lasted ~0.2 sec. Nobel Prize 2017.') },
        { topic: __alloT('stem.wave.gw_sensitivity', 'Sensitivity'), detail: __alloT('stem.wave.gw_sensitivity_detail', 'LIGO detects length changes ~10⁻¹⁸ m — 1/10000 the size of a proton.') },
        { topic: __alloT('stem.wave.gw_multimessenger', 'Multi-messenger astronomy'), detail: __alloT('stem.wave.gw_multimessenger_detail', '17 August 2017: GW + gamma rays + visible light from neutron-star merger (GW170817). Confirmed kilonovae produce heavy elements.') },
        { topic: 'Virgo', detail: __alloT('stem.wave.gw_virgo_detail', 'European GW detector in Italy. 3 km arms.') },
        { topic: 'KAGRA', detail: __alloT('stem.wave.gw_kagra_detail', 'Japanese GW detector. Underground, cryogenic mirrors.') },
        { topic: __alloT('stem.wave.gw_lisa', 'LISA (planned)'), detail: __alloT('stem.wave.gw_lisa_detail', 'Space-based detector. 3 satellites in 2.5 million km triangle. Launch ~2035. Sensitive to lower frequencies (supermassive black holes).') },
        { topic: __alloT('stem.wave.gw_pta', 'Pulsar timing arrays'), detail: __alloT('stem.wave.gw_pta_detail', 'Use millisecond pulsars as natural clocks. Detect very low-frequency GWs from supermassive black hole binaries. NANOGrav announced detection 2023.') }
      ];

      var WAVE_UNITS = [
        { quantity: __alloT('stem.wave.wu_frequency', 'Frequency'), symbol: 'f or ν', unit: __alloT('stem.wave.wu_frequency_unit', 'hertz (Hz)'), notes: __alloT('stem.wave.wu_frequency_notes', 'Cycles per second. kHz, MHz, GHz, THz common in modern tech.') },
        { quantity: __alloT('stem.wave.wu_period', 'Period'), symbol: 'T', unit: __alloT('stem.wave.wu_period_unit', 'second (s)'), notes: __alloT('stem.wave.wu_period_notes', 'Time per cycle. T = 1/f. Heart: ~1 s; mains: 16.7 ms; visible light: ~2 fs.') },
        { quantity: __alloT('stem.wave.wu_wavelength', 'Wavelength'), symbol: 'λ', unit: __alloT('stem.wave.wu_wavelength_unit', 'meter (m)'), notes: __alloT('stem.wave.wu_wavelength_notes', 'Distance per cycle. Sub-mm (UHF radio) to thousands of km (extremely low freq).') },
        { quantity: __alloT('stem.wave.wu_wavenumber', 'Wavenumber'), symbol: 'k', unit: 'rad/m', notes: __alloT('stem.wave.wu_wavenumber_notes', 'k = 2π/λ. Used in waveform math.') },
        { quantity: __alloT('stem.wave.wu_angfreq', 'Angular frequency'), symbol: 'ω', unit: 'rad/s', notes: __alloT('stem.wave.wu_angfreq_notes', 'ω = 2πf. Common in oscillation + wave equations.') },
        { quantity: __alloT('stem.wave.wu_speed', 'Speed'), symbol: 'v or c', unit: 'm/s', notes: __alloT('stem.wave.wu_speed_notes', 'v = fλ. Light in vacuum: c = 299,792,458 m/s (exact).') },
        { quantity: __alloT('stem.wave.wu_amplitude', 'Amplitude'), symbol: 'A', unit: __alloT('stem.wave.wu_amplitude_unit', 'meters (mech), V/m (EM)'), notes: __alloT('stem.wave.wu_amplitude_notes', 'Maximum displacement from equilibrium.') },
        { quantity: __alloT('stem.wave.wu_intensity', 'Intensity'), symbol: 'I', unit: 'W/m²', notes: __alloT('stem.wave.wu_intensity_notes', 'Power per area. Solar irradiance at Earth: ~1361 W/m².') },
        { quantity: __alloT('stem.wave.wu_spl', 'Sound pressure level (SPL)'), symbol: 'L_p', unit: 'dB', notes: __alloT('stem.wave.wu_spl_notes', '20·log₁₀(p/p_ref). Reference: 20 μPa.') },
        { quantity: __alloT('stem.wave.wu_photon', 'Photon energy'), symbol: 'E', unit: __alloT('stem.wave.wu_photon_unit', 'joule (J) or eV'), notes: __alloT('stem.wave.wu_photon_notes', 'E = hf = hc/λ. Visible photons: ~2 eV.') }
      ];

      var WAVE_CAREERS = [
        { career: __alloT('stem.wave.wc_audio', 'Audio engineer'), use: __alloT('stem.wave.wc_audio_use', 'Mixing music, recording. Understand EQ, reverb, frequency response.') },
        { career: __alloT('stem.wave.wc_acoustic', 'Acoustic consultant'), use: __alloT('stem.wave.wc_acoustic_use', 'Design concert halls, recording studios, noise control for buildings + machinery.') },
        { career: __alloT('stem.wave.wc_audiologist', 'Audiologist'), use: __alloT('stem.wave.wc_audiologist_use', 'Test + treat hearing loss. Fit hearing aids and cochlear implants.') },
        { career: __alloT('stem.wave.wc_slp', 'Speech-language pathologist'), use: __alloT('stem.wave.wc_slp_use', 'Analyze speech sounds (acoustic phonetics). Treat voice + articulation disorders.') },
        { career: __alloT('stem.wave.wc_rf', 'RF engineer'), use: __alloT('stem.wave.wc_rf_use', 'Design antennas, wireless systems, radar.') },
        { career: __alloT('stem.wave.wc_optical', 'Optical engineer'), use: __alloT('stem.wave.wc_optical_use', 'Design cameras, microscopes, telescopes, fiber-optic links.') },
        { career: __alloT('stem.wave.wc_seismologist', 'Seismologist'), use: __alloT('stem.wave.wc_seismologist_use', 'Analyze earthquake waves, locate epicenters, monitor for nuclear tests.') },
        { career: __alloT('stem.wave.wc_oceanographer', 'Oceanographer'), use: __alloT('stem.wave.wc_oceanographer_use', 'Study tides, currents, ocean wave dynamics.') },
        { career: __alloT('stem.wave.wc_meteorologist', 'Meteorologist'), use: __alloT('stem.wave.wc_meteorologist_use', 'Doppler radar analysis. Wave physics in atmosphere (Rossby waves).') },
        { career: __alloT('stem.wave.wc_sonographer', 'Sonographer (medical)'), use: __alloT('stem.wave.wc_sonographer_use', 'Operate ultrasound for diagnostic imaging.') },
        { career: __alloT('stem.wave.wc_astronomer', 'Astronomer'), use: __alloT('stem.wave.wc_astronomer_use', 'Analyze light + radio waves from celestial objects.') },
        { career: __alloT('stem.wave.wc_producer', 'Music producer'), use: __alloT('stem.wave.wc_producer_use', 'Shape recorded sound. Synthesize tones. Mix tracks.') },
        { career: __alloT('stem.wave.wc_lighting', 'Lighting designer'), use: __alloT('stem.wave.wc_lighting_use', 'Theater, film. Color temperature, beam angles, intensity.') },
        { career: __alloT('stem.wave.wc_telecom', 'Telecom engineer'), use: __alloT('stem.wave.wc_telecom_use', 'Cellular networks, fiber backbones, satellite links.') },
        { career: __alloT('stem.wave.wc_radar', 'Radar technician'), use: __alloT('stem.wave.wc_radar_use', 'Maintain + operate weather, air-traffic, military radar.') }
      ];

      function renderColors2Section() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 ' + __alloT('stem.wave.tab_colormodels', 'Color models')),
          React.createElement('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, __alloT('stem.wave.sec_colors2_intro', 'Different ways to describe color numerically. Each is suited to a specific medium or application.')),
          React.createElement('div', { className: 'space-y-2' },
            COLOR_MODELS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-slate-800' }, c.model),
                  React.createElement('span', { className: 'text-[0.625rem] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, c.use)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderLasersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⫸ ' + __alloT('stem.wave.tab_lasers', 'Lasers')),
          React.createElement('div', { className: 'mb-3' },
            React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_common_laser_types', 'Common laser types')),
            React.createElement('div', { className: 'space-y-1' },
              LASER_TYPES.map(function(L, i) {
                return React.createElement('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  React.createElement('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, L.type),
                    React.createElement('span', { className: 'text-[0.625rem] text-cyan-700 font-mono ml-auto' }, L.wavelength + ' · ' + L.power)
                  ),
                  React.createElement('div', { className: 'text-[0.625rem] text-slate-700' }, L.use)
                );
              })
            )
          ),
          React.createElement('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, __alloT('stem.wave.sec_laser_physics', 'Laser physics essentials')),
          React.createElement('div', { className: 'space-y-1' },
            LASER_FACTS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.6875rem] font-black text-cyan-700 mb-0.5' }, f.fact),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          ),
          renderTryInSimBtn('laser_grating_bench', __alloT('stem.wave.try_laser_grating', 'Coherent Laser 4-Slit Grating & Screen'), { waveMode: 'ripple', rippleBarrier: 'grating', gratingSlits: 4, slitWidth: 0.1, showIntensityScreen: true, showNodalLines: true })
        );
      }

      function renderFibersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '〰 ' + __alloT('stem.wave.tab_fiberoptics', 'Fiber optics')),
          React.createElement('div', { className: 'space-y-1' },
            FIBER_OPTICS.map(function(f, i) {
              return React.createElement('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, f.topic),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          ),
          renderTryInSimBtn('fiber_tir_demo', 'Optical Fiber Total Internal Reflection', { waveMode: 'reflection', medium2Ratio: 1.5, incidentAngleDeg: 55, reflectivity: 0.9 })
        );
      }

      function renderProtocolsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📡 ' + __alloT('stem.wave.sec_protocols_title', 'Wireless communication protocols')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_standard', 'Standard'), __alloT('stem.wave.col_freq_band', 'Frequency band'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                COMM_PROTOCOLS.map(function(p, i) {
                  return React.createElement('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.name),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, p.band),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMusicSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎵 ' + __alloT('stem.wave.sec_music_title', 'Music & acoustics')),
          React.createElement('div', { className: 'space-y-1' },
            MUSIC_ACOUSTICS.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, m.topic),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, m.detail)
              );
            })
          ),
          renderTryInSimBtn('music_pluck_sculptor', __alloT('stem.wave.try_pluck_sculptor', 'Young\u2013Helmholtz Pluck Node Suppressor (x/L)'), { waveMode: 'spectrum', waveType: 'custom', pluckPosition: 0.5, harmonicWeights: [1, 0, 0.11, 0, 0.04, 0] })
        );
      }

      function renderHearingSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👂 ' + __alloT('stem.wave.sec_hearing_title', 'The ear & hearing')),
          React.createElement('div', { className: 'space-y-2' },
            EAR_PARTS.map(function(p, i) {
              return React.createElement('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, p.part),
                React.createElement('div', { className: 'text-[0.6875rem] text-cyan-700 font-bold mb-1' }, p.function),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, p.notes)
              );
            })
          ),
          renderTryInSimBtn('ear_canal_resonator', __alloT('stem.wave.try_ear_resonator', 'Cochlea & Ear-Canal Resonance Probe (Q=25)'), { waveMode: 'standing', standingBoundary: 'fixedFree', resonatorDriven: true, driveFreqRatio: 1.0, resonatorQ: 25, probeEnabled: true, probeX: 0.5 })
        );
      }

      function renderMedicalSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏥 ' + __alloT('stem.wave.sec_medical_title', 'Medical imaging (wave-based)')),
          React.createElement('div', { className: 'space-y-2' },
            MEDICAL_IMAGING.map(function(m, i) {
              return React.createElement('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.75rem] font-black text-slate-800' }, m.method),
                  React.createElement('span', { className: 'text-[0.625rem] text-cyan-700 font-mono ml-auto px-2 py-0.5 rounded bg-cyan-100' }, m.radiation)
                ),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, React.createElement('strong', null, __alloT('stem.wave.label_use_colon', 'Use: ')), m.use),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          ),
          renderTryInSimBtn('ultrasound_tissue_echo', __alloT('stem.wave.try_ultrasound_echo', 'Diagnostic Ultrasound Tissue Interface Echo'), { waveMode: 'reflection', impedanceCoupled: true, medium2Ratio: 1.45, incidentAngleDeg: 18, waveSpeed: 1500 })
        );
      }

      function renderSatellitesSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🛰 ' + __alloT('stem.wave.sec_satellites_title', 'GPS & satellite communications')),
          React.createElement('div', { className: 'space-y-1' },
            SATELLITE_FACTS.map(function(s, i) {
              return React.createElement('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, s.topic),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.detail)
              );
            })
          ),
          React.createElement('div', { className: 'mt-2' },
            renderTryInSimBtn('satellites_phased_downlink', __alloT('stem.wave.try_satellites_link', 'Satellite Inverse-Square Link Budget (1/r\u00B2)'), { waveMode: 'longitudinal', distanceAttenuation: true, listenerDistMeters: 12, spreadingLaw: 'spherical', amplitude: 75 })
          )
        );
      }

      function renderGravitationalSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌇ ' + __alloT('stem.wave.tab_gravwaves', 'Gravitational waves')),
          React.createElement('div', { className: 'space-y-1' },
            GW_FACTS.map(function(g, i) {
              return React.createElement('div', { key: 'g'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-cyan-400 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, g.topic),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, g.detail)
              );
            })
          ),
          renderTryInSimBtn('ligo_phase_canceller', __alloT('stem.wave.try_ligo_canceller', 'LIGO Dark-Port \u03C0-Phase Interferometer'), { waveMode: 'free', showSecond: true, frequency: 3, frequency2: 3, amplitude: 50, amplitude2: 50, phase2: 3.1416, showBeatEnvelope: true })
        );
      }

      function renderUnitsSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∑ ' + __alloT('stem.wave.sec_units_title', 'Wave units & symbols')),
          React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              React.createElement('thead', null,
                React.createElement('tr', { className: 'bg-slate-100' },
                  [__alloT('stem.wave.col_quantity', 'Quantity'), __alloT('stem.wave.col_symbol', 'Symbol'), __alloT('stem.wave.col_unit', 'Unit'), __alloT('stem.wave.col_notes', 'Notes')].map(function(hh, i) {
                    return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              React.createElement('tbody', null,
                WAVE_UNITS.map(function(u, i) {
                  return React.createElement('tr', { key: 'u'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    React.createElement('td', { className: 'px-2 py-1 font-bold text-slate-800' }, u.quantity),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-cyan-700 font-bold' }, u.symbol),
                    React.createElement('td', { className: 'px-2 py-1 font-mono text-slate-700' }, u.unit),
                    React.createElement('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, u.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCareersSection() {
        return React.createElement('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          React.createElement('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💼 ' + __alloT('stem.wave.sec_careers_title', 'Careers using wave science')),
          React.createElement('div', { className: 'space-y-2' },
            WAVE_CAREERS.map(function(c, i) {
              return React.createElement('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                React.createElement('div', { className: 'text-[0.75rem] font-black text-cyan-700 mb-0.5' }, c.career),
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.use)
              );
            })
          )
        );
      }

      var __waveExpansions = React.createElement('div', { className: 'mt-4 max-w-5xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && React.createElement('div', { className: 'mt-2' }, renderActiveSection())
      );

      return React.createElement(React.Fragment, null,
        React.createElement(WaveRestoreBridge, {
          ReactRef: React,
          setLabToolData: setLabToolData,
          rawWaveMastery: (labToolData && labToolData.wave && labToolData.wave.waveMastery) || {}
        }),
        __waveMainView,
        showLibrary && __waveExpansions
      );
    }
  });


  })();
