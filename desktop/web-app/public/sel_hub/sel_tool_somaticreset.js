// ============================================================================
// sel_tool_somaticreset.js - Body & Breath Reset
// A short, choice-based body awareness and gentle movement practice for the
// SEL Hub. This tool is educational and reflective; it does not diagnose,
// interpret symptoms, or provide medical treatment.
// Registered tool ID: "somaticReset"
// Category: self-regulation
// ============================================================================

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    return tool.render(ctx);
  }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('somaticReset'))) {
(function() {
  'use strict';

  var TOOL_ID = 'somaticReset';

  var ZONES = [
    { id: 'head_face', label: 'Head & face', icon: '\u25CB', prompt: 'jaw, eyes, forehead, or face' },
    { id: 'neck_shoulders', label: 'Neck & shoulders', icon: '\u2312', prompt: 'neck, shoulders, or upper back' },
    { id: 'chest_breath', label: 'Chest & breath', icon: '\u223F', prompt: 'ribs, chest, or breathing space' },
    { id: 'back_spine', label: 'Back & spine', icon: '\u2195', prompt: 'upper, middle, or lower back' },
    { id: 'hips_legs', label: 'Hips & legs', icon: '\u2225', prompt: 'hips, thighs, knees, or calves' },
    { id: 'hands_feet', label: 'Hands & feet', icon: '\u273A', prompt: 'hands, wrists, ankles, or feet' },
    { id: 'whole_body', label: 'Whole body / not sure', icon: '\u25CE', prompt: 'a general reset or no specific area' }
  ];

  // Every practice is chair-friendly, low-force, and includes a still option.
  // Language intentionally avoids clinical mechanisms and treatment claims.
  var PROTOCOLS = [
    {
      id: 'three_points_support',
      name: 'Three Points of Support',
      icon: '\u25B3',
      zones: ['whole_body', 'chest_breath', 'back_spine', 'hips_legs'],
      duration: 75,
      position: 'Seated, standing, or still',
      cadence: null,
      setup: 'Choose three places where your body is supported: perhaps feet on the floor, your seat on the chair, and hands on your lap.',
      action: 'Notice one support point at a time. Let the surface do some of the holding. Look around the room whenever you want.',
      younger: 'Find three places holding you up. Notice each one slowly. You can keep looking around the room.',
      still: 'No movement is needed. You can also focus on one support point instead of three.',
      why: 'A quiet option when movement or counted breathing does not feel right.',
      lowMovement: true
    },
    {
      id: 'shoulder_soften',
      name: 'Shoulder Soften',
      icon: '\u2304',
      zones: ['neck_shoulders', 'back_spine', 'whole_body'],
      duration: 60,
      position: 'Seated or standing',
      cadence: [4, 6],
      setup: 'Let your arms rest. Keep your head in a comfortable position and make the movement very small.',
      action: 'As you breathe in, let your shoulders float up a tiny amount. As you breathe out, let them return without pushing them down.',
      younger: 'Let your shoulders float up a little as you breathe in. Let them soften back down as you breathe out.',
      still: 'Keep the shoulders still and imagine them becoming a little heavier on each exhale.',
      why: 'A small movement-and-release pause after sitting, carrying, or concentrating.',
      lowMovement: false
    },
    {
      id: 'jaw_rest',
      name: 'Jaw & Face Rest',
      icon: '\u263A',
      zones: ['head_face', 'neck_shoulders', 'whole_body'],
      duration: 60,
      position: 'Seated or standing',
      cadence: [4, 6],
      setup: 'Let your gaze land somewhere comfortable. Your lips may touch or stay apart; let your teeth stay unpressed.',
      action: 'On each exhale, notice the space around your jaw, tongue, eyes, and forehead. Change only what feels easy.',
      younger: 'Let your teeth stop pressing together. Soften your eyes and forehead as you breathe out.',
      still: 'Simply notice the face without trying to change it.',
      why: 'A no-stretch option for noticing effort in the face during focused work.',
      lowMovement: true
    },
    {
      id: 'side_rib_space',
      name: 'Side-Rib Space',
      icon: '\u2194',
      zones: ['chest_breath', 'back_spine', 'whole_body'],
      duration: 75,
      position: 'Seated or standing',
      cadence: [4, 6],
      setup: 'Rest both hands on your lap or place one hand lightly on the side of your ribs.',
      action: 'Breathe without forcing. Notice whether the ribs make a little space sideways on the inhale and settle on the exhale.',
      younger: 'Imagine your ribs opening like gentle wings as you breathe in, then resting as you breathe out.',
      still: 'Keep both hands resting and only notice the breath wherever it is easiest to feel.',
      why: 'A gentle breathing-space practice with no need for a very deep breath.',
      lowMovement: true
    },
    {
      id: 'seated_spine_wave',
      name: 'Seated Spine Wave',
      icon: '\u2248',
      zones: ['back_spine', 'hips_legs', 'whole_body'],
      duration: 75,
      position: 'Seated with feet supported',
      cadence: [4, 6],
      setup: 'Sit near the middle of a sturdy chair with both feet supported. Rest hands on thighs.',
      action: 'On the inhale, tip the pelvis forward a tiny amount and let the chest become a little taller. On the exhale, return to neutral or round very slightly. Stay well inside a comfortable range.',
      younger: 'Make a tiny wave through your back: a little taller as you breathe in, then back to the middle as you breathe out.',
      still: 'Stay neutral and imagine the wave moving through the spine instead.',
      why: 'A small change of position for a body that has been still for a while.',
      lowMovement: false
    },
    {
      id: 'feet_press_release',
      name: 'Feet Press & Release',
      icon: '\u25BC',
      zones: ['hands_feet', 'hips_legs', 'whole_body'],
      duration: 60,
      position: 'Seated or standing with support nearby',
      cadence: [4, 6],
      setup: 'Place both feet on a steady surface. If standing, keep a chair or wall nearby.',
      action: 'Press both feet down gently for one inhale. As you exhale, reduce the pressure and notice the difference. Never strain.',
      younger: 'Press the floor gently with your feet, then let the push go. Keep it easy.',
      still: 'Keep the feet still and notice heel, outside edge, and toes touching the surface.',
      why: 'A discreet classroom reset that uses contact with the floor.',
      lowMovement: false
    },
    {
      id: 'hand_unwind',
      name: 'Hands Unwind',
      icon: '\u273D',
      zones: ['hands_feet', 'neck_shoulders', 'whole_body'],
      duration: 60,
      position: 'Seated or standing',
      cadence: [4, 6],
      setup: 'Let elbows rest or hang comfortably. Keep wrists in an easy middle position.',
      action: 'Slowly spread the fingers, then let them curl naturally. Make one small wrist circle in each direction if that feels comfortable.',
      younger: 'Open your hands like a star, then let them rest. Try one tiny wrist circle each way.',
      still: 'Rest the hands and notice temperature, pressure, or contact without moving.',
      why: 'A brief break for hands after writing, typing, gripping, or fidgeting.',
      lowMovement: false
    },
    {
      id: 'seated_calf_pump',
      name: 'Seated Calf Pump',
      icon: '\u21C5',
      zones: ['hips_legs', 'hands_feet', 'whole_body'],
      duration: 60,
      position: 'Seated with feet on the floor',
      cadence: null,
      setup: 'Sit back enough to feel supported. Place both feet flat and keep the movement small.',
      action: 'Lift the heels while toes stay down, then lower. Next, lift the toes while heels stay down. Continue at an easy pace.',
      younger: 'Lift your heels, lower them, then lift your toes. Move slowly and keep your feet comfortable.',
      still: 'Skip the movement and alternate noticing the heels and the toes.',
      why: 'A chair-friendly movement break for legs and feet.',
      lowMovement: false
    },
    {
      id: 'orienting_pause',
      name: 'Room-Orienting Pause',
      icon: '\u25C9',
      zones: ['head_face', 'whole_body', 'chest_breath'],
      duration: 60,
      position: 'Seated, standing, or still',
      cadence: null,
      setup: 'Keep your eyes open. Let your head stay still or turn only within an easy range.',
      action: 'Slowly notice three neutral things in the room: a color, a shape, and a steady object. Let your gaze pause at each one.',
      younger: 'Find one color, one shape, and one thing that is not moving. Look at each one slowly.',
      still: 'Move only your eyes, or keep your gaze on one comfortable object.',
      why: 'An eyes-open option when inward attention or breathing practice is not a good fit.',
      lowMovement: true
    },
    {
      id: 'supported_sit',
      name: 'Supported Sit',
      icon: '\u25A1',
      zones: ['whole_body', 'back_spine', 'hips_legs', 'chest_breath'],
      duration: 120,
      position: 'Seated in a sturdy chair',
      cadence: [4, 6],
      setup: 'Let the chair support your back or sit in the position that feels most stable. Place feet wherever they are comfortably supported.',
      action: 'For a few breaths, do less. Notice the chair and floor carrying some of your weight. Keep eyes open or closed; either choice is fine.',
      younger: 'Let the chair and floor help hold you up. You do not have to fix anything. Just pause.',
      still: 'This is already a still practice. You may use natural breathing instead of a count.',
      why: 'A longer, low-effort pause for quiet or low-energy moments.',
      lowMovement: true
    }
  ];

  var RESPONSE_OPTIONS = [
    { id: 'more_settled', label: 'More settled', icon: '\u2193' },
    { id: 'about_same', label: 'About the same', icon: '\u2192' },
    { id: 'more_activated', label: 'More activated', icon: '\u2191' },
    { id: 'not_sure', label: 'Not sure yet', icon: '?' }
  ];

  var VISUALS = [
    { id: 'circle', label: 'Breathing circle', symbol: '\u25EF', description: 'The circle pairs IN · EXPAND with a solid outline and circle center, then OUT · SOFTEN with a dotted outline and diamond center; pause bars keep stationary state clear.' },
    { id: 'ripples', label: 'Soft ripples', symbol: '\u223F', description: 'Three rings spread gently from a steady center.' },
    { id: 'glow', label: 'Focus glow', symbol: '\u25C9', description: 'A quiet center point brightens and softens.' },
    { id: 'wave', label: 'Flowing wave', symbol: '\u2248', description: 'Layered waves pair IN · RISE with a solid line and round marker, then OUT · SETTLE with a dotted line and diamond marker; pause bars keep stationary state clear.' },
    { id: 'flower', label: 'Petal bloom', symbol: '\u273F', description: 'Petals pair IN · OPEN with solid outlines and a round center, then OUT · SOFTEN with dotted outlines and a diamond center; pause bars keep stationary state clear.' },
    { id: 'horizon', label: 'Grounding horizon', symbol: '\u25E1', description: 'A sun pairs IN · RISE with a solid outline and circle center, then OUT · SETTLE with a dotted outline and diamond center; pause bars keep stationary state clear.' },
    { id: 'path', label: 'Breath path', symbol: '\u2194', description: 'A directional point travels between a diamond OUT target and round IN target; an outline strengthens toward the next phase handoff.' },
    { id: 'orbit', label: 'Breath orbit', symbol: '\u25CC', description: 'Direct IN and OUT labels pair with solid inhale and dotted exhale patterns across the arcs and center ring; the center changes to pause bars when the session pauses; an outlined diamond or ring shows the next phase handoff; round and diamond markers move clockwise, with shape-coded marks for each optional count.' },
    { id: 'none', label: 'No visual', symbol: '\u2014', description: 'Uses only the timer and optional sound cue.' }
  ];

  var VISUAL_MOTIONS = [
    { id: 'still', label: 'Still' },
    { id: 'gentle', label: 'Gentle' },
    { id: 'full', label: 'Full' }
  ];

  var VISUAL_THEMES = [
    { id: 'system', label: 'System colors', filter: 'none', description: 'Uses the SEL hub theme.' },
    { id: 'warm', label: 'Warm ember', filter: 'hue-rotate(225deg) saturate(1.15)', description: 'A warmer, amber-tinted guide.' },
    { id: 'deep', label: 'Deep blue', filter: 'hue-rotate(55deg) saturate(1.1)', description: 'A cooler, night-sky tint.' },
    { id: 'forest', label: 'Forest green', filter: 'hue-rotate(325deg) saturate(1.1)', description: 'A grounded green tint.' },
    { id: 'mono', label: 'Monochrome', filter: 'grayscale(1) contrast(1.15)', description: 'Color-free visual emphasis.' }
  ];

  var GUIDANCE_MODES = [
    { id: 'full', label: 'Full cue', description: 'Shows the phase, gentle wording, and count.' },
    { id: 'phase', label: 'Phase only', description: 'Shows only In, Out, Ready, or Paused.' },
    { id: 'hidden', label: 'Hidden', description: 'Keeps visible words off while screen-reader phase cues remain on.' }
  ];

  function defaultState() {
    return {
      view: 'checkin',
      selectedZone: 'whole_body',
      selectedProtocol: 'three_points_support',
      repeatProtocol: null,
      pre: 5,
      post: 5,
      preSkipped: false,
      postSkipped: false,
      response: null,
      visualMode: 'circle',
      visualMotion: 'gentle',
      visualTheme: 'system',
      visualExpanded: false,
      pacedBreathing: true,
      soundEnabled: true,
      phaseSoundEnabled: false,
      showTimer: true,
      guidanceMode: 'full',
      showGuidance: true,
      showAll: false,
      lastDurationSec: 0,
      logs: []
    };
  }

  function clampRating(value) {
    var n = Number(value);
    if (!isFinite(n)) return 5;
    return Math.max(0, Math.min(10, Math.round(n)));
  }

  function optionalRating(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = Number(value);
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(10, Math.round(n)));
  }

  function comparableShift(log) {
    if (!log) return null;
    var pre = optionalRating(log.pre);
    var post = optionalRating(log.post);
    return pre === null || post === null ? null : pre - post;
  }

  function ratingDisplay(value) {
    var rating = optionalRating(value);
    return rating === null ? 'Skipped' : String(rating);
  }

  function getZone(id) {
    for (var i = 0; i < ZONES.length; i += 1) {
      if (ZONES[i].id === id) return ZONES[i];
    }
    return ZONES[ZONES.length - 1];
  }

  function getProtocol(id) {
    return findProtocol(id) || PROTOCOLS[0];
  }

  function getVisual(id) {
    for (var i = 0; i < VISUALS.length; i += 1) {
      if (VISUALS[i].id === id) return VISUALS[i];
    }
    return VISUALS[0];
  }

  function getVisualMotion(id) {
    for (var i = 0; i < VISUAL_MOTIONS.length; i += 1) {
      if (VISUAL_MOTIONS[i].id === id) return VISUAL_MOTIONS[i];
    }
    return VISUAL_MOTIONS[1];
  }

  function getVisualTheme(id) {
    for (var i = 0; i < VISUAL_THEMES.length; i += 1) {
      if (VISUAL_THEMES[i].id === id) return VISUAL_THEMES[i];
    }
    return VISUAL_THEMES[0];
  }

  function getGuidanceMode(id) {
    for (var i = 0; i < GUIDANCE_MODES.length; i += 1) {
      if (GUIDANCE_MODES[i].id === id) return GUIDANCE_MODES[i];
    }
    return GUIDANCE_MODES[0];
  }

  function findProtocol(id) {
    for (var i = 0; i < PROTOCOLS.length; i += 1) {
      if (PROTOCOLS[i].id === id) return PROTOCOLS[i];
    }
    return null;
  }

  function protocolMatches(protocol, zoneId) {
    if (zoneId === 'whole_body') return true;
    return protocol.zones.indexOf(zoneId) !== -1;
  }

  function recommendationsFor(zoneId, rating) {
    var matches = PROTOCOLS.filter(function(protocol) {
      return protocolMatches(protocol, zoneId);
    });
    if (rating >= 7) {
      matches.sort(function(a, b) {
        return (a.lowMovement === b.lowMovement) ? 0 : (a.lowMovement ? -1 : 1);
      });
    }
    return matches;
  }

  function formatTime(seconds) {
    var safe = Math.max(0, Math.round(Number(seconds) || 0));
    var minutes = Math.floor(safe / 60);
    var remainder = String(safe % 60);
    if (remainder.length < 2) remainder = '0' + remainder;
    return minutes + ':' + remainder;
  }

  function instructionFor(protocol, gradeBand) {
    return gradeBand === 'elementary' ? protocol.younger : protocol.action;
  }

  function breathState(protocol, remaining) {
    var inhale = protocol.cadence ? protocol.cadence[0] : 4;
    var exhale = protocol.cadence ? protocol.cadence[1] : 4;
    var elapsed = Math.max(0, protocol.duration - remaining);
    var cycle = inhale + exhale;
    var position = cycle ? elapsed % cycle : 0;
    var phase;
    var phaseProgress;
    var count;
    if (position < inhale) {
      phase = 'in';
      phaseProgress = inhale ? position / inhale : 0;
      count = inhale - Math.floor(position);
    } else {
      phase = 'out';
      phaseProgress = exhale ? (position - inhale) / exhale : 0;
      count = exhale - Math.floor(position - inhale);
    }
    var amount = phase === 'in' ? phaseProgress : 1 - phaseProgress;
    amount = Math.max(0, Math.min(1, amount));
    return {
      phase: phase,
      phaseProgress: Math.max(0, Math.min(1, phaseProgress)),
      cycleProgress: cycle ? Math.max(0, Math.min(1, position / cycle)) : 0,
      absoluteCycleProgress: cycle ? Math.max(0, elapsed / cycle) : 0,
      count: Math.max(1, count),
      amount: amount,
      label: protocol.cadence
        ? (phase === 'in' ? 'Breathe in gently' : 'Breathe out slowly')
        : 'Let your breath be natural'
    };
  }

  function dateLabel(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return String(iso || '');
    }
  }

  function mostUsedName(logs) {
    if (!logs.length) return 'None yet';
    var counts = {};
    var names = {};
    logs.forEach(function(log) {
      counts[log.protocolId] = (counts[log.protocolId] || 0) + 1;
      names[log.protocolId] = log.protocolName;
    });
    var best = Object.keys(counts)[0];
    Object.keys(counts).forEach(function(id) {
      if (counts[id] > counts[best]) best = id;
    });
    return names[best] || 'Practice';
  }

  function personalHistoryPattern(logs) {
    if (logs.length < 3) return null;
    var groups = {};
    logs.forEach(function(log) {
      var protocol = findProtocol(log.protocolId);
      if (!protocol) return;
      if (!groups[protocol.id]) {
        groups[protocol.id] = { name: protocol.name, count: 0, comparable: 0, lower: 0, settled: 0 };
      }
      groups[protocol.id].count += 1;
      var shift = comparableShift(log);
      if (shift !== null) {
        groups[protocol.id].comparable += 1;
        if (shift > 0) groups[protocol.id].lower += 1;
      }
      if (log.response === 'more_settled') groups[protocol.id].settled += 1;
    });
    var repeated = Object.keys(groups).map(function(id) { return groups[id]; }).filter(function(group) {
      return group.count >= 2;
    });
    if (!repeated.length) {
      return 'You have enough entries to begin comparing, but no reset has been tried twice yet. Repeating one option can help you notice preferences over time.';
    }
    repeated.sort(function(a, b) {
      var aObserved = a.comparable + a.count;
      var bObserved = b.comparable + b.count;
      var aRate = aObserved ? (a.lower + a.settled) / aObserved : 0;
      var bRate = bObserved ? (b.lower + b.settled) / bObserved : 0;
      if (aRate !== bRate) return bRate - aRate;
      return b.count - a.count;
    });
    var best = repeated[0];
    if (best.lower > 0) {
      return best.name + ' appears in ' + best.count + ' saved check-ins; ' + best.lower + ' of ' + best.comparable + ' comparable ratings were lower afterward. Treat that as a personal preference signal, not proof or a treatment result.';
    }
    if (best.settled > 0) {
      return best.name + ' appears in ' + best.count + ' saved check-ins; you marked More settled in ' + best.settled + ' of them. Treat that as a personal preference signal, not proof or a treatment result.';
    }
    if (best.comparable > 0) {
      return best.name + ' appears in ' + best.count + ' saved check-ins, with no lower after-rating among ' + best.comparable + ' comparable ratings yet. That may be a cue to compare a different reset, not a judgment about your effort.';
    }
    return best.name + ' appears in ' + best.count + ' saved check-ins. No numeric comparisons were saved, and More settled was not selected yet; your word-based responses can still help you compare options over time.';
  }

  // The id is passed as a LITERAL, not as TOOL_ID. Every static tool in the repo
  // reads registrations by parsing this call - the contract check, the registry
  // audit, the icon sweep - and a variable here makes the tool invisible to all
  // of them. TOOL_ID stays in use for the state keys below.
  window.SelHub.registerTool('somaticReset', {
    icon: '\uD83C\uDF3F',
    label: 'Body & Breath Reset',
    desc: 'Choose a body zone and follow a short, choice-based breathing, stillness, or gentle movement reset. Includes private before-and-after check-ins; it is not diagnosis or treatment.',
    color: 'teal',
    category: 'self-regulation',
    lightBackground: true,
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var rawState = (ctx.toolData && ctx.toolData[TOOL_ID]) || {};
      var d = Object.assign({}, defaultState(), rawState);
      d.pre = clampRating(d.pre);
      d.post = clampRating(d.post);
      d.preSkipped = !!d.preSkipped;
      d.postSkipped = !!d.postSkipped;
      d.visualMode = getVisual(d.visualMode).id;
      d.visualMotion = getVisualMotion(d.visualMotion).id;
      d.visualTheme = getVisualTheme(d.visualTheme).id;
      d.visualExpanded = !!d.visualExpanded;
      d.phaseSoundEnabled = !!d.phaseSoundEnabled;
      d.showTimer = d.showTimer !== false;
      var hasSavedGuidanceMode = GUIDANCE_MODES.some(function(option) {
        return option.id === rawState.guidanceMode;
      });
      d.guidanceMode = getGuidanceMode(hasSavedGuidanceMode
        ? rawState.guidanceMode
        : (rawState.showGuidance === false ? 'hidden' : 'full')).id;
      d.showGuidance = d.guidanceMode !== 'hidden';
      d.logs = Array.isArray(d.logs) ? d.logs : [];

      var theme = (ctx && ctx.theme) || {};
      var palette = theme.palette || ctx.themePalette || {};
      var isDark = !!theme.isDark;
      var isContrast = !!theme.isContrast;
      var reduceMotion = !!theme.reduceMotion;
      var gradeBand = ctx.gradeBand || 'middle';

      var colors = {
        page: isContrast ? '#000000' : (palette.bg || (isDark ? '#0f172a' : '#f8fafc')),
        panel: isContrast ? '#000000' : (palette.bgCard || (isDark ? '#111827' : '#ffffff')),
        panelAlt: isContrast ? '#000000' : (isDark ? '#172033' : '#f0fdfa'),
        input: isContrast ? '#000000' : (palette.bgInput || (isDark ? '#0b1220' : '#ffffff')),
        text: isContrast ? '#ffff00' : (palette.text || (isDark ? '#f8fafc' : '#0f172a')),
        muted: isContrast ? '#ffff00' : (palette.textMuted || (isDark ? '#cbd5e1' : '#64748b')),
        border: isContrast ? '#ffff00' : (palette.border || (isDark ? '#334155' : '#cbd5e1')),
        accent: isContrast ? '#ffff00' : (isDark ? '#5eead4' : '#0f766e'),
        accentStrong: isContrast ? '#ffff00' : (isDark ? '#0f766e' : '#0f766e'),
        accentText: isContrast ? '#000000' : '#ffffff',
        soft: isContrast ? '#000000' : (isDark ? '#12332f' : '#ccfbf1'),
        warningBg: isContrast ? '#000000' : (isDark ? '#2e2410' : '#fffbeb'),
        warningText: isContrast ? '#ffff00' : (isDark ? '#fde68a' : '#78350f'),
        warningBorder: isContrast ? '#ffff00' : '#f59e0b',
        danger: isContrast ? '#ffff00' : (isDark ? '#fca5a5' : '#b91c1c'),
        dangerBg: isContrast ? '#000000' : (isDark ? '#3f1717' : '#fef2f2')
      };

      var selectedProtocol = getProtocol(d.selectedProtocol);
      var repeatProtocol = findProtocol(d.repeatProtocol);
      var zone = getZone(d.selectedZone);
      var recommendationRating = d.preSkipped ? 5 : d.pre;

      // Transient session state stays local so the app does not write a save
      // record every second. Entering a practice always begins paused.
      var remainingState = React.useState(selectedProtocol.duration);
      var remaining = remainingState[0];
      var setRemaining = remainingState[1];
      var runningState = React.useState(false);
      var isRunning = runningState[0];
      var setIsRunning = runningState[1];
      var speakingState = React.useState(false);
      var isSpeaking = speakingState[0];
      var setIsSpeaking = speakingState[1];
      var quietViewState = React.useState(false);
      var quietView = quietViewState[0];
      var setQuietView = quietViewState[1];
      var visualPreviewState = React.useState('idle');
      var visualPreviewPhase = visualPreviewState[0];
      var setVisualPreviewPhase = visualPreviewState[1];
      var visualPreviewProgressState = React.useState(0);
      var visualPreviewProgress = visualPreviewProgressState[0];
      var setVisualPreviewProgress = visualPreviewProgressState[1];
      var visualClockState = React.useState(Date.now());
      var visualClockNow = visualClockState[0];
      var setVisualClockNow = visualClockState[1];
      var removalState = React.useState(null);
      var removalAction = removalState[0];
      var setRemovalAction = removalState[1];
      var completionRef = React.useRef(false);
      var deadlineRef = React.useRef(null);
      var pausedRemainingMsRef = React.useRef(selectedProtocol.duration * 1000);
      var visualFrameRef = React.useRef(null);
      var visualFrameLastPaintRef = React.useRef(0);
      var visualPreviewTimeoutsRef = React.useRef([]);
      var visualPreviewIntervalRef = React.useRef(null);
      var visualPreviewStartedAtRef = React.useRef(0);
      var lastPhaseSoundRef = React.useRef(null);
      var orbitMotionRef = React.useRef(false);
      var orbitRotationRef = React.useRef(0);
      var viewHeadingRef = React.useRef(null);
      var historyHeadingRef = React.useRef(null);
      var confirmCancelRef = React.useRef(null);
      var confirmReturnRef = React.useRef(null);
      var focusHistoryAfterRemovalRef = React.useRef(false);
      var ratingToggleRef = React.useRef(null);
      var focusRatingToggleRef = React.useRef(false);

      React.useEffect(function() {
        setIsRunning(false);
        setRemaining(selectedProtocol.duration);
        deadlineRef.current = null;
        pausedRemainingMsRef.current = selectedProtocol.duration * 1000;
        setVisualClockNow(Date.now());
        completionRef.current = false;
        setQuietView(false);
      }, [d.selectedProtocol, d.view]);

      React.useEffect(function() {
        clearVisualPreviewTimers(true);
        setVisualPreviewPhase('idle');
        return function() { clearVisualPreviewTimers(true); };
      }, [d.view, d.selectedProtocol, d.visualMode, d.visualMotion, d.pacedBreathing, reduceMotion]);

      React.useEffect(function() {
        orbitMotionRef.current = d.view === 'practice' &&
          d.visualMode === 'orbit' &&
          !!(selectedProtocol.cadence && d.pacedBreathing) &&
          d.visualMotion !== 'still' &&
          !reduceMotion &&
          isRunning;
      }, [d.view, d.visualMode, d.visualMotion, d.pacedBreathing, selectedProtocol.id, reduceMotion, isRunning]);

      React.useEffect(function() {
        if (!isRunning || d.view !== 'practice') return undefined;
        if (!deadlineRef.current) deadlineRef.current = Date.now() + remaining * 1000;
        function syncRemaining() {
          if (!deadlineRef.current) return;
          var nextMs = Math.max(0, deadlineRef.current - Date.now());
          pausedRemainingMsRef.current = nextMs;
          var next = Math.max(0, Math.ceil(nextMs / 1000));
          setRemaining(function(previous) {
            return previous === next ? previous : next;
          });
        }
        syncRemaining();
        var intervalId = window.setInterval(syncRemaining, 250);
        return function() { window.clearInterval(intervalId); };
      }, [isRunning, d.view]);

      React.useEffect(function() {
        var shouldAnimate = isRunning &&
          d.view === 'practice' &&
          d.visualMode !== 'none' &&
          d.visualMotion !== 'still' &&
          !!(selectedProtocol.cadence && d.pacedBreathing) &&
          !reduceMotion;
        if (!shouldAnimate) {
          if (visualFrameRef.current !== null && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(visualFrameRef.current);
          }
          visualFrameRef.current = null;
          visualFrameLastPaintRef.current = 0;
          return undefined;
        }

        var stopped = false;
        var frameInterval = d.visualMotion === 'full' ? 32 : 50;
        var requestFrame = typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : function(callback) { return window.setTimeout(callback, frameInterval); };
        var cancelFrame = typeof window.cancelAnimationFrame === 'function'
          ? window.cancelAnimationFrame.bind(window)
          : window.clearTimeout.bind(window);

        function cancelScheduledFrame() {
          if (visualFrameRef.current === null) return;
          cancelFrame(visualFrameRef.current);
          visualFrameRef.current = null;
        }

        function scheduleFrame() {
          if (stopped || visualFrameRef.current !== null) return;
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          visualFrameRef.current = requestFrame(paintFrame);
        }

        function paintFrame() {
          visualFrameRef.current = null;
          if (stopped || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
          var now = Date.now();
          if (!visualFrameLastPaintRef.current) {
            visualFrameLastPaintRef.current = now;
          } else if (now - visualFrameLastPaintRef.current >= frameInterval) {
            visualFrameLastPaintRef.current = now;
            setVisualClockNow(now);
          }
          scheduleFrame();
        }

        function handleVisibilityChange() {
          if (document.visibilityState === 'hidden') {
            cancelScheduledFrame();
            return;
          }
          visualFrameLastPaintRef.current = 0;
          setVisualClockNow(Date.now());
          scheduleFrame();
        }

        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange);
        scheduleFrame();
        return function() {
          stopped = true;
          cancelScheduledFrame();
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }, [isRunning, d.view, d.visualMode, d.visualMotion, d.pacedBreathing, selectedProtocol.id, reduceMotion]);

      React.useEffect(function() {
        if (!isRunning || d.view !== 'practice' || !d.phaseSoundEnabled || !d.soundEnabled || !d.pacedBreathing || !selectedProtocol.cadence) {
          lastPhaseSoundRef.current = null;
          return undefined;
        }
        var breath = breathState(selectedProtocol, remaining);
        if (lastPhaseSoundRef.current && lastPhaseSoundRef.current !== breath.phase && typeof ctx.beep === 'function') {
          ctx.beep(breath.phase === 'in' ? 523 : 392, 0.08, 0.025);
        }
        lastPhaseSoundRef.current = breath.phase;
        return undefined;
      }, [isRunning, d.view, d.phaseSoundEnabled, d.soundEnabled, d.pacedBreathing, selectedProtocol.id, selectedProtocol.duration, remaining]);

      React.useEffect(function() {
        if (viewHeadingRef.current && typeof viewHeadingRef.current.focus === 'function') {
          viewHeadingRef.current.focus();
        }
      }, [d.view]);

      React.useEffect(function() {
        if (!focusRatingToggleRef.current) return;
        focusRatingToggleRef.current = false;
        if (ratingToggleRef.current && typeof ratingToggleRef.current.focus === 'function') ratingToggleRef.current.focus();
      }, [d.preSkipped, d.postSkipped]);

      React.useEffect(function() {
        if (removalAction && confirmCancelRef.current && typeof confirmCancelRef.current.focus === 'function') {
          confirmCancelRef.current.focus();
          return;
        }
        if (focusHistoryAfterRemovalRef.current) {
          focusHistoryAfterRemovalRef.current = false;
          if (historyHeadingRef.current && typeof historyHeadingRef.current.focus === 'function') historyHeadingRef.current.focus();
          return;
        }
        if (!removalAction && confirmReturnRef.current && typeof confirmReturnRef.current.focus === 'function') {
          var target = confirmReturnRef.current;
          confirmReturnRef.current = null;
          target.focus();
        }
      }, [removalAction]);

      React.useEffect(function() {
        if (d.view !== 'practice' || remaining !== 0 || completionRef.current) return;
        completionRef.current = true;
        deadlineRef.current = null;
        pausedRemainingMsRef.current = 0;
        setIsRunning(false);
        if (d.soundEnabled && typeof ctx.beep === 'function') ctx.beep(440, 0.35, 0.06);
        setToolState({
          view: 'after',
          post: d.pre,
          postSkipped: d.preSkipped,
          response: null,
          lastDurationSec: selectedProtocol.duration
        });
        announce('Practice complete. Check in with what you notice now.');
      }, [remaining, d.view]);

      function setToolState(patch) {
        if (typeof ctx.updateMulti === 'function') {
          ctx.updateMulti(TOOL_ID, patch);
          return;
        }
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(previous) {
            var prior = (previous && previous[TOOL_ID]) || defaultState();
            var nextState = Object.assign({}, prior, patch);
            var outer = {}; outer[TOOL_ID] = nextState;
            return Object.assign({}, previous, outer);
          });
        }
      }

      function announce(message) {
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
      }

      function clearVisualPreviewTimers(resetProgress) {
        visualPreviewTimeoutsRef.current.forEach(function(timeoutId) {
          window.clearTimeout(timeoutId);
        });
        visualPreviewTimeoutsRef.current = [];
        if (visualPreviewIntervalRef.current) {
          window.clearInterval(visualPreviewIntervalRef.current);
          visualPreviewIntervalRef.current = null;
        }
        if (resetProgress) setVisualPreviewProgress(0);
      }

      function visualPreviewUnavailableReason(protocol) {
        if (d.visualMode === 'none') return 'Choose a visual to preview motion.';
        if (reduceMotion) return 'System reduced motion keeps previews still.';
        if (d.visualMotion === 'still') return 'Choose Gentle or Full motion to preview.';
        if (!protocol.cadence) return 'This reset uses natural breathing.';
        if (!d.pacedBreathing) return 'Turn on breath count to preview a rhythm.';
        return '';
      }

      function startVisualPreview(protocol) {
        if (visualPreviewUnavailableReason(protocol)) return;
        clearVisualPreviewTimers(true);
        var totalMs = (protocol.cadence[0] + protocol.cadence[1]) * 1000;
        visualPreviewStartedAtRef.current = Date.now();
        setVisualPreviewPhase('in');
        setVisualPreviewProgress(0);
        announce('Visual preview: breathe in gently.');
        visualPreviewIntervalRef.current = window.setInterval(function() {
          var elapsedMs = Math.min(totalMs, Math.max(0, Date.now() - visualPreviewStartedAtRef.current));
          setVisualPreviewProgress(Math.round((elapsedMs / totalMs) * 100));
        }, 100);
        var inhaleTimeout = window.setTimeout(function() {
          setVisualPreviewPhase('out');
          announce('Visual preview: breathe out slowly.');
        }, protocol.cadence[0] * 1000);
        var completeTimeout = window.setTimeout(function() {
          clearVisualPreviewTimers(false);
          setVisualPreviewProgress(100);
          setVisualPreviewPhase('idle');
          announce('Visual preview complete. The practice timer has not started.');
        }, (protocol.cadence[0] + protocol.cadence[1]) * 1000);
        visualPreviewTimeoutsRef.current = [inhaleTimeout, completeTimeout];
      }

      function stopVisualPreview() {
        clearVisualPreviewTimers(true);
        setVisualPreviewPhase('idle');
        announce('Visual preview stopped. The practice timer has not started.');
      }

      function toast(message, type) {
        if (typeof ctx.addToast === 'function') ctx.addToast(message, type || 'info');
      }

      function currentTimerRemainingMs() {
        if (!deadlineRef.current) return Math.max(0, pausedRemainingMsRef.current);
        return Math.max(0, deadlineRef.current - Date.now());
      }

      function currentTimerRemaining() {
        return Math.max(0, Math.ceil(currentTimerRemainingMs() / 1000));
      }

      function currentVisualRemaining() {
        if (isRunning && deadlineRef.current) {
          return Math.max(0, (deadlineRef.current - visualClockNow) / 1000);
        }
        return Math.max(0, pausedRemainingMsRef.current / 1000);
      }

      function startPracticeTimer() {
        var nextMs = pausedRemainingMsRef.current > 0
          ? pausedRemainingMsRef.current
          : selectedProtocol.duration * 1000;
        var next = Math.max(0, Math.ceil(nextMs / 1000));
        var resuming = nextMs > 0 && nextMs < selectedProtocol.duration * 1000;
        completionRef.current = false;
        setRemaining(next);
        deadlineRef.current = Date.now() + nextMs;
        setVisualClockNow(Date.now());
        setIsRunning(true);
        if (d.soundEnabled && typeof ctx.beep === 'function') ctx.beep(392, 0.2, 0.05);
        announce(resuming ? 'Practice resumed.' : 'Practice started.');
      }

      function pausePracticeTimer() {
        var nextMs = currentTimerRemainingMs();
        var next = Math.max(0, Math.ceil(nextMs / 1000));
        pausedRemainingMsRef.current = nextMs;
        deadlineRef.current = null;
        setRemaining(next);
        setVisualClockNow(Date.now());
        setIsRunning(false);
        announce('Practice paused.');
      }

      function togglePracticeTimer() {
        if (isRunning) pausePracticeTimer();
        else startPracticeTimer();
      }

      function restartPracticeTimer() {
        deadlineRef.current = null;
        pausedRemainingMsRef.current = selectedProtocol.duration * 1000;
        completionRef.current = false;
        setRemaining(selectedProtocol.duration);
        setVisualClockNow(Date.now());
        setIsRunning(false);
        announce('Practice timer restarted and paused.');
      }

      function openRemovalConfirm(event, action) {
        confirmReturnRef.current = event.currentTarget;
        setRemovalAction(action);
      }

      function closeRemovalConfirm() {
        setRemovalAction(null);
      }

      function commitHistoryRemoval() {
        if (!removalAction) return;
        var nextLogs;
        var message;
        if (removalAction.type === 'all') {
          nextLogs = [];
          message = 'All private reset history removed.';
        } else {
          nextLogs = d.logs.filter(function(log, index) {
            if (removalAction.logId) return log.id !== removalAction.logId;
            return index !== removalAction.logIndex;
          });
          message = 'Private reset history entry removed.';
        }
        confirmReturnRef.current = null;
        focusHistoryAfterRemovalRef.current = true;
        setToolState({ logs: nextLogs });
        setRemovalAction(null);
        toast(message, 'success');
        announce(message);
      }

      function handleRemovalDialogKeyDown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeRemovalConfirm();
          return;
        }
        if (event.key !== 'Tab') return;
        var buttons = event.currentTarget.querySelectorAll('button:not([disabled])');
        if (!buttons.length) return;
        var first = buttons[0];
        var last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      function prepareRepeat(log) {
        var protocol = log && findProtocol(log.protocolId);
        if (!protocol) {
          toast('That saved reset is no longer available.', 'info');
          return;
        }
        var repeatZone = getZone(log.zoneId);
        setToolState({
          view: 'checkin',
          selectedZone: repeatZone.id,
          selectedProtocol: protocol.id,
          repeatProtocol: protocol.id,
          preSkipped: false,
          postSkipped: false,
          response: null,
          showAll: false
        });
        announce(protocol.name + ' selected for a new check-in. Set your current rating, then continue.');
      }

      function viewTitle() {
        if (d.view === 'choose') return 'Choose a body and breath reset';
        if (d.view === 'setup') return selectedProtocol.name + ' setup';
        if (d.view === 'practice') return selectedProtocol.name + ' practice timer';
        if (d.view === 'after') return 'After-practice check-in';
        if (d.view === 'summary') return 'Body and breath reset summary';
        if (d.view === 'history') return 'Private body and breath reset history';
        return 'Body and breath check-in';
      }

      function primaryButton(extra) {
        return Object.assign({
          border: '1px solid ' + colors.accentStrong,
          background: colors.accentStrong,
          color: colors.accentText,
          borderRadius: 10,
          minHeight: 44,
          padding: '10px 16px',
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer'
        }, extra || {});
      }

      function secondaryButton(extra) {
        return Object.assign({
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: colors.border,
          background: colors.input,
          color: colors.text,
          borderRadius: 10,
          minHeight: 42,
          padding: '9px 14px',
          fontSize: 13,
          fontWeight: 750,
          cursor: 'pointer'
        }, extra || {});
      }

      function cardStyle(extra) {
        return Object.assign({
          background: colors.panel,
          border: '1px solid ' + colors.border,
          borderRadius: 14,
          padding: 16,
          boxShadow: isContrast ? 'none' : (isDark ? '0 10px 28px rgba(0,0,0,0.18)' : '0 8px 22px rgba(15,23,42,0.06)')
        }, extra || {});
      }

      function safetyNote(compact) {
        return h('div', {
          role: 'note',
          style: {
            padding: compact ? '9px 11px' : '12px 14px',
            borderRadius: 10,
            background: colors.warningBg,
            color: colors.warningText,
            border: '1px solid ' + colors.warningBorder,
            fontSize: compact ? 12 : 13,
            lineHeight: 1.55
          }
        },
          h('strong', null, 'Your choice matters. '),
          'Keep every movement small and pain-free. You may stay still, keep your eyes open, pause, or stop at any time. If you notice new or worsening pain, dizziness, or numbness, stop and tell a trusted adult or health professional.'
        );
      }

      function topNav() {
        return h('nav', {
          'aria-label': 'Body and Breath Reset views',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 16
          }
        },
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: 11, color: colors.accent, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' } }, 'Private practice'),
            h('h2', { style: { margin: '3px 0 0', color: colors.text, fontSize: 22, lineHeight: 1.2 } }, 'Body & Breath Reset')
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', {
              type: 'button',
              onClick: function() {
                setToolState({ view: 'checkin', preSkipped: false, postSkipped: false, response: null, repeatProtocol: null, showAll: false });
                announce('Returned to the Body and Breath Reset check-in.');
              },
              'aria-current': d.view === 'checkin' ? 'page' : undefined,
              style: secondaryButton(d.view === 'checkin' ? { borderColor: colors.accent, color: colors.accent } : {})
            }, 'New check-in'),
            h('button', {
              type: 'button',
              onClick: function() { setToolState({ view: 'history' }); announce('Opened reset history.'); },
              'aria-current': d.view === 'history' ? 'page' : undefined,
              style: secondaryButton(d.view === 'history' ? { borderColor: colors.accent, color: colors.accent } : {})
            }, 'History (' + d.logs.length + ')')
          )
        );
      }

      function ratingControl(label, value, skipped, onChange, onToggle, id) {
        if (skipped) {
          return h('div', { style: cardStyle({ padding: 18 }) },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
              h('div', null,
                h('div', { style: { color: colors.text, fontSize: 14, fontWeight: 800 } }, label),
                h('div', { style: { marginTop: 5, color: colors.accent, fontSize: 19, fontWeight: 900 } }, 'Number skipped')
              ),
              h('span', { style: { border: '1px solid ' + colors.border, borderRadius: 999, padding: '4px 8px', color: colors.muted, fontSize: 10, fontWeight: 850, textTransform: 'uppercase' } }, 'Optional')
            ),
            h('p', { style: { margin: '10px 0 12px', color: colors.muted, fontSize: 12, lineHeight: 1.5 } }, 'You can continue using only the body-area and word-based reflection choices.'),
            h('button', {
              ref: ratingToggleRef,
              type: 'button',
              onClick: function() { focusRatingToggleRef.current = true; onToggle(false); },
              style: secondaryButton({ minHeight: 44, borderColor: colors.accent, color: colors.accent })
            }, 'Use a number instead')
          );
        }
        return h('div', { style: cardStyle({ padding: 18 }) },
          h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 } },
            h('label', { htmlFor: id, style: { color: colors.text, fontSize: 14, fontWeight: 800 } }, label),
            h('output', { htmlFor: id, style: { color: colors.accent, fontSize: 28, fontWeight: 900, lineHeight: 1 } }, String(value))
          ),
          h('input', {
            id: id,
            type: 'range',
            min: 0,
            max: 10,
            step: 1,
            value: value,
            onChange: function(event) { onChange(clampRating(event.target.value)); },
            'aria-valuetext': value + ' out of 10',
            style: { width: '100%', accentColor: colors.accentStrong, minHeight: 34, cursor: 'pointer' }
          }),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', color: colors.muted, fontSize: 11, fontWeight: 700 } },
            h('span', null, '0 - none noticed'),
            h('span', null, '10 - a lot noticed')
          ),
          h('div', { style: { marginTop: 13, paddingTop: 12, borderTop: '1px solid ' + colors.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
            h('span', { style: { color: colors.muted, fontSize: 11, lineHeight: 1.4 } }, 'A number is optional.'),
            h('button', {
              ref: ratingToggleRef,
              type: 'button',
              onClick: function() { focusRatingToggleRef.current = true; onToggle(true); },
              style: secondaryButton({ minHeight: 44, padding: '8px 12px', fontSize: 12 })
            }, 'Skip the number')
          )
        );
      }

      function renderCheckin() {
        var recentLog = d.logs.length ? d.logs[0] : null;
        var recentProtocol = recentLog ? findProtocol(recentLog.protocolId) : null;
        return h('div', { style: { display: 'grid', gap: 16 } },
          h('div', { style: cardStyle({ background: colors.panelAlt }) },
            h('h3', { style: { margin: '0 0 6px', color: colors.text, fontSize: 19 } }, 'Where would a little more comfort help?'),
            h('p', { style: { margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.55 } }, 'Choose a broad area, or choose whole body / not sure. The number is optional. This is a moment-to-moment check-in, not an assessment.')
          ),
          h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
            h('legend', { style: { color: colors.text, fontSize: 14, fontWeight: 850, marginBottom: 10 } }, 'Body-zone check-in'),
            h('div', {
              style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                gap: 10
              }
            }, ZONES.map(function(item) {
              var chosen = d.selectedZone === item.id;
              return h('button', {
                key: item.id,
                type: 'button',
                onClick: function() {
                  var first = recommendationsFor(item.id, recommendationRating)[0] || PROTOCOLS[0];
                  setToolState({ selectedZone: item.id, selectedProtocol: first.id, repeatProtocol: null });
                  announce(item.label + ' selected.');
                },
                'aria-pressed': chosen,
                style: {
                  minHeight: 78,
                  padding: 12,
                  borderRadius: 12,
                  border: '2px solid ' + (chosen ? colors.accent : colors.border),
                  background: chosen ? colors.soft : colors.panel,
                  color: colors.text,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }
              },
                h('span', { 'aria-hidden': 'true', style: { color: colors.accent, fontSize: 24, width: 28, textAlign: 'center' } }, item.icon),
                h('span', null,
                  h('span', { style: { display: 'block', fontSize: 13, fontWeight: 850 } }, item.label),
                  h('span', { style: { display: 'block', marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 1.35 } }, item.prompt)
                )
              );
            }))
          ),
          ratingControl('Tension or restlessness right now', d.pre, d.preSkipped, function(value) {
            var first = repeatProtocol || recommendationsFor(d.selectedZone, value)[0] || PROTOCOLS[0];
            setToolState({ pre: value, preSkipped: false, selectedProtocol: first.id });
          }, function(skipped) {
            var first = repeatProtocol || recommendationsFor(d.selectedZone, skipped ? 5 : d.pre)[0] || PROTOCOLS[0];
            setToolState({ preSkipped: skipped, selectedProtocol: first.id });
            announce(skipped ? 'Before number skipped. You can continue without a rating.' : 'Before rating slider restored.');
          }, 'somatic-reset-before'),
          repeatProtocol
            ? h('aside', { style: cardStyle({ padding: 14, background: colors.panelAlt }) },
                h('div', { style: { color: colors.accent, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 } }, 'Ready to repeat'),
                h('div', { style: { marginTop: 4, color: colors.text, fontSize: 15, fontWeight: 850 } }, repeatProtocol.name),
                h('p', { style: { margin: '5px 0 10px', color: colors.muted, fontSize: 12, lineHeight: 1.5 } }, 'The current check-in above - a number or a skip - will be used as your new starting point.'),
                h('button', {
                  type: 'button',
                  onClick: function() { setToolState({ repeatProtocol: null }); },
                  style: secondaryButton({ minHeight: 36, padding: '7px 11px' })
                }, 'Choose something else')
              )
            : recentProtocol && h('aside', { style: cardStyle({ padding: 14 }) },
                h('div', { style: { color: colors.muted, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 } }, 'Recent reset'),
                h('div', { style: { marginTop: 4, color: colors.text, fontSize: 15, fontWeight: 850 } }, recentProtocol.name),
                h('p', { style: { margin: '5px 0 10px', color: colors.muted, fontSize: 12 } }, (recentLog.zoneLabel || getZone(recentLog.zoneId).label) + '  |  ' + dateLabel(recentLog.completedAt)),
                h('button', {
                  type: 'button',
                  onClick: function() { prepareRepeat(recentLog); },
                  style: secondaryButton({ borderColor: colors.accent, color: colors.accent })
                }, 'Use this reset again')
              ),
          safetyNote(false),
          h('button', {
            type: 'button',
            onClick: function() {
              var first = repeatProtocol || recommendationsFor(d.selectedZone, recommendationRating)[0] || PROTOCOLS[0];
              setToolState({
                view: repeatProtocol ? 'setup' : 'choose',
                selectedProtocol: first.id,
                repeatProtocol: null,
                showAll: false
              });
              announce(repeatProtocol ? first.name + ' setup opened.' : 'Practice choices are ready for ' + zone.label + '.');
            },
            style: primaryButton({ width: '100%', minHeight: 50, fontSize: 15 })
          }, repeatProtocol ? 'Continue with ' + repeatProtocol.name : 'Find a short reset')
        );
      }

      function protocolCard(protocol, highlighted) {
        return h('article', {
          key: protocol.id,
          style: cardStyle({
            border: '2px solid ' + (highlighted ? colors.accent : colors.border),
            background: highlighted ? colors.panelAlt : colors.panel,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          })
        },
          highlighted && h('div', { style: { color: colors.accent, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 } }, recommendationRating >= 7 && protocol.lowMovement ? 'Gentler first choice' : 'Suggested first'),
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
            h('span', { 'aria-hidden': 'true', style: { color: colors.accent, fontSize: 25, lineHeight: 1 } }, protocol.icon),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('h4', { style: { margin: 0, color: colors.text, fontSize: 16 } }, protocol.name),
              h('div', { style: { marginTop: 4, color: colors.muted, fontSize: 11, fontWeight: 700 } }, formatTime(protocol.duration) + '  |  ' + protocol.position)
            )
          ),
          h('p', { style: { margin: 0, color: colors.muted, fontSize: 12.5, lineHeight: 1.5, flex: 1 } }, protocol.why),
          h('button', {
            type: 'button',
            onClick: function() {
              setToolState({ view: 'setup', selectedProtocol: protocol.id });
              announce(protocol.name + ' setup opened.');
            },
            style: highlighted ? primaryButton({ width: '100%' }) : secondaryButton({ width: '100%', borderColor: colors.accent, color: colors.accent })
          }, 'Choose ' + protocol.name)
        );
      }

      function renderChoose() {
        var matches = recommendationsFor(d.selectedZone, recommendationRating);
        var visible = d.showAll ? PROTOCOLS : matches;
        var firstId = matches.length ? matches[0].id : PROTOCOLS[0].id;
        return h('div', { style: { display: 'grid', gap: 16 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('div', null,
              h('button', {
                type: 'button',
                onClick: function() { setToolState({ view: 'checkin' }); },
                style: secondaryButton({ marginBottom: 10 })
              }, '\u2190 Change check-in'),
              h('h3', { style: { margin: 0, color: colors.text, fontSize: 20 } }, 'Choose a reset for ' + zone.label.toLowerCase()),
              h('p', { style: { margin: '5px 0 0', color: colors.muted, fontSize: 13 } }, 'These matches are based only on the area and rating you selected - no diagnosis or interpretation.')
            ),
            h('button', {
              type: 'button',
              onClick: function() { setToolState({ showAll: !d.showAll }); },
              'aria-expanded': d.showAll,
              style: secondaryButton()
            }, d.showAll ? 'Show zone matches' : 'Browse all ' + PROTOCOLS.length)
          ),
          h('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12
            }
          }, visible.map(function(protocol) { return protocolCard(protocol, protocol.id === firstId); })),
          safetyNote(true)
        );
      }

      function guidanceText(protocol) {
        var breath = protocol.cadence && d.pacedBreathing
          ? 'Breathe in for ' + protocol.cadence[0] + ' and out for ' + protocol.cadence[1] + ', without straining.'
          : 'Let your breathing stay natural; no count is required.';
        return protocol.name + '. ' + protocol.setup + ' ' + instructionFor(protocol, gradeBand) + ' ' + breath + ' You may stay still or stop at any time.';
      }

      function speakGuidance() {
        if (typeof ctx.callTTS !== 'function' || isSpeaking) return;
        setIsSpeaking(true);
        announce('Reading the practice guidance aloud.');
        Promise.resolve(ctx.callTTS(guidanceText(selectedProtocol), ctx.selectedVoice, 0.9))
          .then(function(url) {
            if (!url) toast('Voice guidance is unavailable right now.', 'info');
            setIsSpeaking(false);
          })
          .catch(function() {
            setIsSpeaking(false);
            toast('Voice guidance is unavailable right now.', 'info');
          });
      }

      function visualChoiceControl() {
        var current = getVisual(d.visualMode);
        var descriptionId = 'somatic-reset-visual-description';
        return h('div', {
          'data-visual-picker': 'true',
          'data-selected-visual': current.id,
          style: { display: 'grid', gap: 5, flex: '1 1 240px', minWidth: 0, maxWidth: 390 }
        },
          h('label', {
            htmlFor: 'somatic-reset-visual-guide',
            style: { color: colors.text, fontSize: 11, fontWeight: 800 }
          }, 'Visual guide'),
          h('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: '32px minmax(0, 1fr)',
              alignItems: 'center',
              border: '1px solid ' + colors.border,
              borderRadius: 10,
              background: colors.input,
              overflow: 'hidden'
            }
          },
            h('span', {
              'aria-hidden': 'true',
              style: { color: colors.accent, fontSize: 18, lineHeight: 1, textAlign: 'center' }
            }, current.symbol),
            h('select', {
              id: 'somatic-reset-visual-guide',
              'data-visual-select': 'true',
              value: current.id,
              'aria-describedby': descriptionId,
              onChange: function(event) {
                var next = getVisual(event.target.value);
                setToolState({ visualMode: next.id });
                announce(next.label + ' selected.');
              },
              style: {
                width: '100%',
                minHeight: 42,
                padding: '8px 30px 8px 5px',
                border: 0,
                background: colors.input,
                color: colors.text,
                fontSize: 13,
                fontWeight: 750,
                cursor: 'pointer'
              }
            }, VISUALS.map(function(visual) {
              return h('option', { key: visual.id, value: visual.id }, visual.label);
            }))
          ),
          h('span', {
            id: descriptionId,
            'data-visual-description': current.id,
            style: { color: colors.muted, fontSize: 11, fontWeight: 650, lineHeight: 1.4 }
          }, current.description)
        );
      }

      function visualMotionControl() {
        var disabled = reduceMotion || d.visualMode === 'none';
        return h('label', { style: { display: 'grid', gap: 4, minWidth: 132, color: colors.text, fontSize: 11, fontWeight: 800 } },
          h('span', null, 'Visual motion'),
          h('select', {
            'data-visual-motion-select': 'true',
            value: d.visualMotion,
            disabled: disabled,
            onChange: function(event) {
              var next = getVisualMotion(event.target.value);
              setToolState({ visualMotion: next.id });
              announce('Visual motion set to ' + next.label.toLowerCase() + '.');
            },
            style: {
              minHeight: 42,
              padding: '8px 30px 8px 10px',
              borderRadius: 10,
              border: '1px solid ' + colors.border,
              background: colors.input,
              color: colors.text,
              fontSize: 13,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.62 : 1
            }
          }, VISUAL_MOTIONS.map(function(option) {
            return h('option', { key: option.id, value: option.id }, option.label);
          })),
          disabled && h('span', { style: { color: colors.muted, fontSize: 10, fontWeight: 650, lineHeight: 1.35 } }, reduceMotion ? 'System reduced motion keeps it still.' : 'Choose a visual to adjust motion.')
        );
      }

      function visualThemeControl() {
        var current = isContrast ? getVisualTheme('system') : getVisualTheme(d.visualTheme);
        var disabled = isContrast || d.visualMode === 'none';
        var descriptionId = 'somatic-reset-visual-tone-description';
        return h('label', { style: { display: 'grid', gap: 4, minWidth: 132, color: colors.text, fontSize: 11, fontWeight: 800 } },
          h('span', null, 'Visual tone'),
          h('select', {
            'data-visual-theme-select': 'true',
            value: current.id,
            disabled: disabled,
            'aria-describedby': descriptionId,
            onChange: function(event) {
              var next = getVisualTheme(event.target.value);
              setToolState({ visualTheme: next.id });
              announce('Visual tone set to ' + next.label.toLowerCase() + '.');
            },
            style: {
              minHeight: 42,
              padding: '8px 30px 8px 10px',
              borderRadius: 10,
              border: '1px solid ' + colors.border,
              background: colors.input,
              color: colors.text,
              fontSize: 13,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.62 : 1
            }
          }, VISUAL_THEMES.map(function(option) {
            return h('option', { key: option.id, value: option.id }, option.label);
          })),
          h('span', {
            id: descriptionId,
            style: { color: colors.muted, fontSize: 10, fontWeight: 650, lineHeight: 1.35 }
          }, disabled
            ? (isContrast ? 'High contrast keeps the system palette.' : 'Choose a visual to adjust its tone.')
            : current.description)
        );
      }

      function visualPreviewControl(protocol) {
        var unavailable = visualPreviewUnavailableReason(protocol);
        var previewing = visualPreviewPhase !== 'idle';
        var reasonId = 'somatic-reset-visual-preview-note';
        return h('div', { style: { display: 'grid', gap: 4, minWidth: 176, alignSelf: 'end' } },
          h('button', {
            type: 'button',
            'data-visual-preview-toggle': 'true',
            'data-visual-preview-phase': visualPreviewPhase,
            onClick: function() {
              if (previewing) stopVisualPreview();
              else startVisualPreview(protocol);
            },
            disabled: !!unavailable,
            'aria-pressed': previewing,
            'aria-describedby': unavailable ? reasonId : undefined,
            style: secondaryButton(Object.assign({ minHeight: 42 }, previewing
              ? { borderColor: colors.accent, color: colors.accent }
              : (unavailable ? { opacity: 0.62, cursor: 'not-allowed' } : {})))
          }, previewing ? 'Stop preview' : 'Preview one breath'),
          previewing && h('div', {
            role: 'progressbar',
            'aria-label': 'Visual preview progress',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': visualPreviewProgress,
            'data-visual-preview-progress': 'true',
            style: {
              width: 'min(176px, 78vw)',
              height: 4,
              overflow: 'hidden',
              borderRadius: 999,
              background: isContrast ? '#ffffff' : colors.border,
              boxShadow: isContrast ? '0 0 0 1px ' + colors.border : 'none'
            }
          }, h('div', {
            style: {
              width: visualPreviewProgress + '%',
              height: '100%',
              background: colors.accent,
              transition: reduceMotion ? 'none' : 'width 100ms linear'
            }
          })),
          unavailable && h('span', {
            id: reasonId,
            style: { color: colors.muted, fontSize: 10, fontWeight: 650, lineHeight: 1.35 }
          }, unavailable)
        );
      }

      function visualSizeButton() {
        if (d.visualMode === 'none') return null;
        return h('button', {
          type: 'button',
          onClick: function() {
            setToolState({ visualExpanded: !d.visualExpanded });
            announce(d.visualExpanded ? 'Standard visual size selected.' : 'Large visual size selected.');
          },
          'aria-pressed': d.visualExpanded,
          style: secondaryButton(d.visualExpanded ? { borderColor: colors.accent, color: colors.accent } : {})
        }, d.visualExpanded ? 'Large visual: on' : 'Large visual: off');
      }

      function quietViewButton() {
        return h('button', {
          type: 'button',
          onClick: function() {
            setQuietView(!quietView);
            announce(quietView ? 'Practice options restored.' : 'Quiet view on. Extra practice options are hidden.');
          },
          'aria-pressed': quietView,
          'aria-keyshortcuts': quietView ? 'Escape' : undefined,
          style: secondaryButton({
            minHeight: 36,
            padding: '6px 10px',
            fontSize: 11,
            borderColor: quietView ? colors.accent : colors.border,
            color: quietView ? colors.accent : colors.text
          })
        }, quietView ? 'Exit quiet view' : 'Quiet view');
      }

      function soundCueButton() {
        return h('button', {
          type: 'button',
          onClick: function() {
            setToolState({ soundEnabled: !d.soundEnabled });
            announce('Sound cue ' + (d.soundEnabled ? 'off.' : 'on.'));
          },
          'aria-pressed': d.soundEnabled,
          style: secondaryButton()
        }, d.soundEnabled ? 'Sound cue: on' : 'Sound cue: off');
      }

      function phaseSoundButton(protocol) {
        if (!protocol.cadence) return null;
        return h('button', {
          type: 'button',
          onClick: function() {
            setToolState({ phaseSoundEnabled: !d.phaseSoundEnabled });
            announce('Phase tones ' + (d.phaseSoundEnabled ? 'off.' : 'on.'));
          },
          'aria-pressed': d.phaseSoundEnabled,
          style: secondaryButton(d.phaseSoundEnabled ? { borderColor: colors.accent, color: colors.accent } : {})
        }, d.phaseSoundEnabled ? 'Phase tones: on' : 'Phase tones: off');
      }

      function timerDisplayButton() {
        return h('button', {
          type: 'button',
          onClick: function() {
            setToolState({ showTimer: !d.showTimer });
            announce(d.showTimer ? 'Countdown hidden. The practice will still finish automatically.' : 'Countdown shown.');
          },
          'aria-pressed': d.showTimer,
          style: secondaryButton(d.showTimer ? {} : { borderColor: colors.accent, color: colors.accent })
        }, d.showTimer ? 'Countdown: shown' : 'Countdown: hidden');
      }

      function guidanceDisplayControl() {
        var current = getGuidanceMode(d.guidanceMode);
        var descriptionId = 'somatic-reset-guidance-description';
        return h('label', { style: { display: 'grid', gap: 4, minWidth: 190, maxWidth: 240, color: colors.text, fontSize: 11, fontWeight: 800 } },
          h('span', null, 'Guidance words'),
          h('select', {
            'data-guidance-mode-select': 'true',
            value: current.id,
            'aria-describedby': descriptionId,
            onChange: function(event) {
              var next = getGuidanceMode(event.target.value);
              setToolState({ guidanceMode: next.id, showGuidance: next.id !== 'hidden' });
              if (next.id === 'full') announce('Full breathing cue selected.');
              else if (next.id === 'phase') announce('Phase-only breathing cue selected.');
              else announce('Guidance words hidden. Screen-reader phase cues remain on.');
            },
            style: {
              minHeight: 42,
              padding: '8px 30px 8px 10px',
              borderRadius: 10,
              border: '1px solid ' + colors.border,
              background: colors.input,
              color: colors.text,
              fontSize: 13,
              cursor: 'pointer'
            }
          }, GUIDANCE_MODES.map(function(option) {
            return h('option', { key: option.id, value: option.id }, option.label);
          })),
          h('span', {
            id: descriptionId,
            'data-guidance-description': current.id,
            style: { color: colors.muted, fontSize: 10, fontWeight: 650, lineHeight: 1.35 }
          }, current.description)
        );
      }

      function handlePracticeKeyDown(event) {
        if (!quietView || event.key !== 'Escape') return;
        event.preventDefault();
        setQuietView(false);
        announce('Quiet view closed. Practice options restored.');
      }

      function breathCountButton(protocol) {
        if (!protocol.cadence) return null;
        return h('button', {
          type: 'button',
          onClick: function() {
            setToolState({ pacedBreathing: !d.pacedBreathing });
            announce(d.pacedBreathing ? 'Natural breathing selected. Breath counting is off.' : 'Optional breath counting is on.');
          },
          'aria-pressed': d.pacedBreathing,
          style: secondaryButton(d.pacedBreathing ? { borderColor: colors.accent, color: colors.accent } : {})
        }, d.pacedBreathing ? 'Breath count: on' : 'Breath count: off');
      }

      function renderSetup() {
        return h('div', { style: { display: 'grid', gap: 16, maxWidth: 720, margin: '0 auto' } },
          h('button', {
            type: 'button',
            onClick: function() { setToolState({ view: 'choose' }); },
            style: secondaryButton({ justifySelf: 'start' })
          }, '\u2190 Choose a different reset'),
          h('div', { style: cardStyle({ padding: 20 }) },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 } },
              h('span', { 'aria-hidden': 'true', style: { color: colors.accent, fontSize: 34 } }, selectedProtocol.icon),
              h('div', null,
                h('h3', { style: { margin: 0, color: colors.text, fontSize: 23 } }, selectedProtocol.name),
                h('p', { style: { margin: '5px 0 0', color: colors.muted, fontSize: 12, fontWeight: 750 } }, formatTime(selectedProtocol.duration) + '  |  ' + selectedProtocol.position)
              )
            ),
            h('div', { style: { display: 'grid', gap: 13 } },
              h('div', null,
                h('div', { style: { color: colors.accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 } }, 'Set up'),
                h('p', { style: { margin: 0, color: colors.text, fontSize: 14, lineHeight: 1.6 } }, selectedProtocol.setup)
              ),
              h('div', null,
                h('div', { style: { color: colors.accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 } }, 'Try'),
                h('p', { style: { margin: 0, color: colors.text, fontSize: 14, lineHeight: 1.6 } }, instructionFor(selectedProtocol, gradeBand))
              ),
              h('div', null,
                h('div', { style: { color: colors.accent, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 } }, 'Still option'),
                h('p', { style: { margin: 0, color: colors.text, fontSize: 14, lineHeight: 1.6 } }, selectedProtocol.still)
              ),
              h('div', { style: { padding: 11, background: colors.panelAlt, borderRadius: 10, color: colors.text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', null, 'Breath: '),
                selectedProtocol.cadence
                  ? (d.pacedBreathing
                      ? 'Optional ' + selectedProtocol.cadence[0] + '-in / ' + selectedProtocol.cadence[1] + '-out rhythm. Turn the count off whenever natural breathing feels better.'
                      : 'Natural breathing selected. No count or breath hold is required.')
                  : 'Natural breathing. No count and no breath hold.'
              )
            )
          ),
          h('fieldset', { style: cardStyle({ margin: 0 }) },
            h('legend', { style: { padding: '0 6px', color: colors.text, fontSize: 13, fontWeight: 850 } }, 'Choose a visual guide'),
            h('div', { style: { display: 'flex', justifyContent: 'center' } }, visualChoiceControl()),
            h('div', { style: { marginTop: 12 } }, renderVisual(selectedProtocol, true, visualPreviewPhase)),
            h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
              visualMotionControl(),
              visualThemeControl(),
              visualPreviewControl(selectedProtocol)
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' } },
            breathCountButton(selectedProtocol),
            soundCueButton(),
            phaseSoundButton(selectedProtocol),
            timerDisplayButton(),
            guidanceDisplayControl(),
            typeof ctx.callTTS === 'function' && h('button', {
              type: 'button',
              onClick: speakGuidance,
              disabled: isSpeaking,
              style: secondaryButton(isSpeaking ? { opacity: 0.6, cursor: 'wait' } : {})
            }, isSpeaking ? 'Reading...' : 'Read guidance aloud')
          ),
          safetyNote(true),
          h('button', {
            type: 'button',
            onClick: function() {
              setRemaining(selectedProtocol.duration);
              setIsRunning(false);
              deadlineRef.current = null;
              completionRef.current = false;
              setToolState({ view: 'practice', lastDurationSec: 0 });
              announce(selectedProtocol.name + ' is ready. Start when you are comfortable.');
            },
            style: primaryButton({ width: '100%', minHeight: 52, fontSize: 15 })
          }, 'Open practice timer')
        );
      }

      function renderVisual(protocol, compact, previewMode) {
        var currentVisual = getVisual(d.visualMode);
        var visualTheme = isContrast ? getVisualTheme('system') : getVisualTheme(d.visualTheme);
        var breath = breathState(protocol, currentVisualRemaining());
        var usesPace = !!(protocol.cadence && d.pacedBreathing);
        var breathCycleTotal = 0;
        var breathCycleNumber = 0;
        if (usesPace) {
          var breathCycleDuration = Math.max(1, (Number(protocol.cadence[0]) || 1) + (Number(protocol.cadence[1]) || 1));
          breathCycleTotal = Math.max(1, Math.ceil(protocol.duration / breathCycleDuration));
          breathCycleNumber = Math.min(breathCycleTotal, Math.floor(breath.absoluteCycleProgress) + 1);
        }
        var previewing = !!(compact && (previewMode === 'in' || previewMode === 'out'));
        var activeBreathPhase = previewing ? previewMode : breath.phase;
        var activeBreathAmount = previewing ? (previewMode === 'in' ? 1 : 0) : breath.amount;
        var chosenMotion = getVisualMotion(d.visualMotion);
        var effectiveMotion = reduceMotion ? 'still' : chosenMotion.id;
        var motionStrength = effectiveMotion === 'full' ? 1 : (effectiveMotion === 'gentle' ? 0.58 : 0);
        var amount = !usesPace || motionStrength === 0
          ? 0.5
          : 0.5 + (activeBreathAmount - 0.5) * motionStrength;
        var scale = 0.76 + amount * 0.34;
        var transitionMs = previewing
          ? protocol.cadence[previewMode === 'in' ? 0 : 1] * 1000
          : (effectiveMotion === 'full' ? 780 : 1100);
        var visualTransition = motionStrength === 0 ? 'none' : 'all ' + transitionMs + 'ms ease-in-out';
        var hasStarted = currentVisualRemaining() < protocol.duration;
        var phaseToken = usesPace ? (previewing ? previewMode : (isRunning ? breath.phase : (hasStarted ? 'paused' : 'ready'))) : 'steady';
        var focused = !compact && quietView;
        var expanded = !compact && (d.visualExpanded || focused);
        var frameSize = compact ? 150 : (focused ? 300 : (expanded ? 270 : 210));
        var circleSize = compact ? 116 : (focused ? 244 : (expanded ? 220 : 180));
        var frameCss = 'min(' + frameSize + 'px, 78vw)';
        var circleCss = 'min(' + circleSize + 'px, 66vw)';
        var minimumHeight = compact ? 174 : (focused ? 360 : (expanded ? 330 : 250));
        var visualStatus = usesPace
          ? (previewing
              ? (previewMode === 'in' ? 'Preview: breathe in gently' : 'Preview: breathe out slowly')
              : (isRunning ? breath.label + ', count ' + breath.count : (hasStarted ? 'Breath guide paused' : 'Optional breath guide ready')))
          : 'Steady guide; breathe naturally and move only if comfortable';
        var visualPhaseLabel = usesPace
          ? (previewing
              ? (previewMode === 'in' ? 'Preview inhale phase' : 'Preview exhale phase')
              : (isRunning ? (breath.phase === 'in' ? 'Inhale phase' : 'Exhale phase') : (hasStarted ? 'Paused' : 'Ready')))
          : 'Natural breathing';
        var visualCadenceLabel = usesPace
          ? 'Cadence: ' + protocol.cadence[0] + ' seconds in, ' + protocol.cadence[1] + ' seconds out'
          : 'No timed cadence';
        var visualLabel = currentVisual.label + '. ' + visualPhaseLabel + '. ' + visualCadenceLabel + '. ' + visualStatus;
        if (effectiveMotion === 'still') visualLabel += '. Visual motion is still.';

        if (currentVisual.id === 'none') {
          return h('div', {
            'data-visual-mode': 'none',
            'data-visual-phase': phaseToken,
            'data-visual-running': isRunning ? 'true' : 'false',
            'data-visual-size': compact ? 'preview' : (focused ? 'focus' : 'standard'),
            style: {
              minHeight: compact ? 120 : (focused ? 240 : 170),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: colors.muted
            }
          },
            h('div', { 'aria-hidden': 'true', style: { fontSize: compact ? 24 : 32, color: colors.accent } }, '\u2014'),
            h('div', { style: { color: colors.text, fontSize: 14, fontWeight: 850 } }, 'Visual guide off'),
            h('div', { style: { fontSize: 12, textAlign: 'center' } }, 'Use the timer, sound cue, or no guide at all.')
          );
        }

        var visualBody;
        if (currentVisual.id === 'circle') {
          var circleCanMove = usesPace && effectiveMotion !== 'still';
          var circleMoving = circleCanMove && (isRunning || previewing);
          var circlePhase = circleMoving ? activeBreathPhase : 'steady';
          var circleLinePattern = circlePhase === 'out' ? 'dotted' : (circlePhase === 'in' ? 'solid' : 'steady');
          var circleSessionState = previewing
            ? 'preview'
            : (isRunning ? (circleMoving ? 'moving' : 'steady') : (hasStarted ? 'paused' : 'ready'));
          var circleCenterShape = circleMoving
            ? (circlePhase === 'out' ? 'diamond' : 'circle')
            : (circleSessionState === 'paused' ? 'pause-bars' : 'dot');
          var circleCueText = circleMoving
            ? (circlePhase === 'in' ? 'IN · EXPAND' : 'OUT · SOFTEN')
            : (circleSessionState === 'paused' ? 'PAUSED' : (circleSessionState === 'steady' ? 'STEADY' : 'READY'));
          var circleCueState = circleMoving ? circlePhase : circleSessionState;
          var circlePhaseProgress = circlePhase === 'in'
            ? Math.min(1, Math.max(0, activeBreathAmount))
            : (circlePhase === 'out' ? Math.min(1, Math.max(0, 1 - activeBreathAmount)) : 0);
          var circlePatternTransition = circleMoving && motionStrength > 0
            ? 'stroke-width 260ms ease-in-out, opacity 260ms ease-in-out'
            : 'none';
          var circleCenterX = 120;
          var circleCenterY = 112;
          var circleRadius = 44 + amount * 25;
          visualBody = h('svg', {
            viewBox: '0 0 240 210',
            'aria-hidden': 'true',
            focusable: 'false',
            'data-breath-circle': 'true',
            'data-circle-phase': circlePhase,
            'data-circle-line-pattern': circleLinePattern,
            'data-circle-center-shape': circleCenterShape,
            'data-circle-session-state': circleSessionState,
            'data-circle-phase-progress': circleMoving ? Math.round(circlePhaseProgress * 100) : 'steady',
            'data-circle-cadence': usesPace ? protocol.cadence.join('-') : 'natural',
            style: { width: frameCss, height: 'auto', overflow: 'visible', transition: visualTransition }
          },
            usesPace && h('text', {
              x: circleCenterX,
              y: 18,
              textAnchor: 'middle',
              fill: circleMoving ? colors.accent : colors.muted,
              fontSize: compact ? 18 : 14,
              fontWeight: circleMoving ? 500 : 400,
              letterSpacing: compact ? 1.1 : 0.9,
              opacity: circleMoving ? 1 : 0.78,
              style: {
                textDecoration: circleMoving ? 'underline' : 'none',
                transition: circlePatternTransition
              },
              'data-circle-phase-cue': 'true',
              'data-circle-cue-state': circleCueState,
              'data-circle-cue-shape': circleCenterShape,
              'data-circle-cue-emphasis': circleMoving ? 'underlined' : 'plain'
            }, circleCueText),
            h('circle', {
              cx: circleCenterX,
              cy: circleCenterY,
              r: circleRadius + 12,
              fill: colors.panelAlt,
              stroke: colors.border,
              strokeWidth: compact ? 2 : 3,
              opacity: 0.72,
              style: { transition: visualTransition },
              'data-circle-halo': 'true'
            }),
            h('circle', {
              cx: circleCenterX,
              cy: circleCenterY,
              r: circleRadius,
              fill: colors.soft,
              stroke: circleMoving ? colors.accent : colors.muted,
              strokeWidth: circleMoving ? (compact ? 2.5 : 3.5) : (compact ? 2 : 3),
              strokeDasharray: circleLinePattern === 'dotted' ? (compact ? '3 7' : '4 8') : undefined,
              opacity: circleMoving ? 1 : 0.82,
              style: { transition: visualTransition },
              'data-circle-main-ring': 'true',
              'data-circle-main-pattern': circleLinePattern
            }),
            h('g', {
              'data-circle-center': 'true',
              'data-circle-center-shape': circleCenterShape,
              'data-circle-center-state': circleMoving ? 'active' : circleSessionState
            },
              circleCenterShape === 'diamond'
                ? h('rect', {
                    x: circleCenterX - 4.5,
                    y: circleCenterY - 4.5,
                    width: 9,
                    height: 9,
                    rx: 2,
                    fill: colors.panelAlt,
                    stroke: colors.accent,
                    strokeWidth: compact ? 2 : 2.5,
                    transform: 'rotate(45 ' + circleCenterX + ' ' + circleCenterY + ')',
                    'data-circle-marker-core': 'diamond'
                  })
                : (circleCenterShape === 'circle'
                    ? h('circle', {
                        cx: circleCenterX,
                        cy: circleCenterY,
                        r: compact ? 5 : 6,
                        fill: colors.panelAlt,
                        stroke: colors.accent,
                        strokeWidth: compact ? 2 : 2.5,
                        'data-circle-marker-core': 'circle'
                      })
                    : (circleCenterShape === 'pause-bars'
                        ? h('g', { 'data-circle-pause-bars': 'true' },
                            h('line', {
                              x1: circleCenterX - 3.5,
                              y1: circleCenterY - 4.5,
                              x2: circleCenterX - 3.5,
                              y2: circleCenterY + 4.5,
                              stroke: colors.accent,
                              strokeWidth: compact ? 2 : 2.5,
                              strokeLinecap: 'round'
                            }),
                            h('line', {
                              x1: circleCenterX + 3.5,
                              y1: circleCenterY - 4.5,
                              x2: circleCenterX + 3.5,
                              y2: circleCenterY + 4.5,
                              stroke: colors.accent,
                              strokeWidth: compact ? 2 : 2.5,
                              strokeLinecap: 'round'
                            })
                          )
                        : h('circle', {
                            cx: circleCenterX,
                            cy: circleCenterY,
                            r: compact ? 3 : 4,
                            fill: colors.accent,
                            'data-circle-marker-core': 'dot'
                          })))
            )
          );
        } else if (currentVisual.id === 'ripples') {
          var ringSize = Math.round(frameSize * 0.72);
          visualBody = h('div', { style: { position: 'relative', width: frameCss, height: frameCss } },
            [0, 1, 2].map(function(index) {
              var ringScale = 0.55 + (index * 0.18) + amount * 0.16;
              return h('div', {
                key: index,
                style: {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: ringSize,
                  height: ringSize,
                  marginLeft: -ringSize / 2,
                  marginTop: -ringSize / 2,
                  borderRadius: '50%',
                  border: (compact ? 2 : 3) + 'px solid ' + colors.accent,
                  opacity: 0.72 - index * 0.18,
                  transform: 'scale(' + ringScale.toFixed(3) + ')',
                  transition: visualTransition
                }
              });
            }),
            h('div', { 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent, fontSize: compact ? 20 : 28 } }, '\u223F')
          );
        } else if (currentVisual.id === 'glow') {
          visualBody = h('div', {
            style: {
              width: frameCss,
              height: frameCss,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text,
              background: 'radial-gradient(circle, ' + colors.soft + ' 0%, ' + colors.panelAlt + ' 46%, ' + colors.panel + ' 72%)',
              boxShadow: isContrast ? 'none' : '0 0 ' + Math.round((compact ? 16 : 24) + amount * 35) + 'px ' + colors.soft,
              transform: 'scale(' + (0.9 + amount * 0.08).toFixed(3) + ')',
              transition: visualTransition,
              border: '1px solid ' + colors.border
            }
          }, h('span', { 'aria-hidden': 'true', style: { color: colors.accent, fontSize: compact ? 25 : 36 } }, '\u25C9'));
        } else if (currentVisual.id === 'wave') {
          var waveAmplitude = 12 + amount * 24;
          var waveCanMove = usesPace && effectiveMotion !== 'still';
          var waveMoving = waveCanMove && (isRunning || previewing);
          var wavePhase = waveMoving ? activeBreathPhase : 'steady';
          var waveDirection = wavePhase === 'in' ? 'right' : (wavePhase === 'out' ? 'left' : 'steady');
          var waveLinePattern = wavePhase === 'out' ? 'dotted' : (wavePhase === 'in' ? 'solid' : 'steady');
          var waveSessionState = previewing
            ? 'preview'
            : (isRunning ? (waveMoving ? 'moving' : 'steady') : (hasStarted ? 'paused' : 'ready'));
          var waveMarkerShape = waveMoving
            ? (wavePhase === 'out' ? 'diamond' : 'circle')
            : (waveSessionState === 'paused' ? 'pause-bars' : 'dot');
          var waveCueText = waveMoving
            ? (wavePhase === 'in' ? 'IN · RISE' : 'OUT · SETTLE')
            : (waveSessionState === 'paused' ? 'PAUSED' : (waveSessionState === 'steady' ? 'STEADY' : 'READY'));
          var waveCueState = waveMoving ? wavePhase : waveSessionState;
          var wavePhaseProgress = wavePhase === 'in'
            ? Math.min(1, Math.max(0, activeBreathAmount))
            : (wavePhase === 'out' ? Math.min(1, Math.max(0, 1 - activeBreathAmount)) : 0);
          var wavePatternTransition = waveMoving && motionStrength > 0
            ? 'stroke-width 260ms ease-in-out, opacity 260ms ease-in-out'
            : 'none';
          var waveDotX = 40 + amount * 160;
          var waveDotY = 86 + Math.sin((waveDotX / 240) * Math.PI * 2) * waveAmplitude;
          function wavePath(baseY, amplitude, phase) {
            var path = '';
            for (var x = 0; x <= 240; x += 20) {
              var y = baseY + Math.sin((x / 240) * Math.PI * 2 + phase) * amplitude;
              path += (x === 0 ? 'M ' : ' L ') + x + ' ' + y.toFixed(2);
            }
            return path;
          }
          visualBody = h('svg', {
            viewBox: '0 0 240 170',
            'aria-hidden': 'true',
            focusable: 'false',
            'data-breath-wave': 'true',
            'data-wave-phase': wavePhase,
            'data-wave-direction': waveDirection,
            'data-wave-line-pattern': waveLinePattern,
            'data-wave-marker-shape': waveMarkerShape,
            'data-wave-session-state': waveSessionState,
            'data-wave-phase-progress': waveMoving ? Math.round(wavePhaseProgress * 100) : 'steady',
            'data-wave-cadence': usesPace ? protocol.cadence.join('-') : 'natural',
            style: { width: frameCss, height: 'auto', overflow: 'visible', transform: 'scale(' + (0.96 + amount * 0.05).toFixed(3) + ')', transition: visualTransition }
          },
            usesPace && h('text', {
              x: 120,
              y: 18,
              textAnchor: 'middle',
              fill: waveMoving ? colors.accent : colors.muted,
              fontSize: compact ? 18 : 14,
              fontWeight: waveMoving ? 500 : 400,
              letterSpacing: compact ? 1.1 : 0.9,
              opacity: waveMoving ? 1 : 0.78,
              style: {
                textDecoration: waveMoving ? 'underline' : 'none',
                transition: wavePatternTransition
              },
              'data-wave-phase-cue': 'true',
              'data-wave-cue-state': waveCueState,
              'data-wave-cue-shape': waveMarkerShape,
              'data-wave-cue-emphasis': waveMoving ? 'underlined' : 'plain'
            }, waveCueText),
            h('path', { d: wavePath(62, waveAmplitude * 0.58, 0.6), fill: 'none', stroke: colors.border, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.8 }),
            h('path', {
              d: wavePath(86, waveAmplitude, 0),
              fill: 'none',
              stroke: colors.accent,
              strokeWidth: waveMoving ? (compact ? 3.5 : 5) : (compact ? 3 : 4),
              strokeLinecap: 'round',
              strokeDasharray: waveLinePattern === 'dotted' ? (compact ? '3 7' : '4 8') : undefined,
              opacity: waveMoving ? 1 : 0.78,
              style: { transition: wavePatternTransition },
              'data-wave-main-line': 'true',
              'data-wave-main-pattern': waveLinePattern,
              'data-wave-main-state': waveMoving ? 'active' : 'steady'
            }),
            h('path', { d: wavePath(112, waveAmplitude * 0.7, -0.7), fill: 'none', stroke: colors.muted, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.7 }),
            h('g', {
              'data-wave-marker': 'true',
              'data-wave-marker-phase': wavePhase,
              'data-wave-marker-direction': waveDirection,
              'data-wave-marker-shape': waveMarkerShape,
              style: { transition: visualTransition }
            },
              waveMoving && h('path', {
                d: waveDirection === 'right'
                  ? 'M ' + (waveDotX - 15).toFixed(2) + ' ' + (waveDotY - 4).toFixed(2) + ' L ' + (waveDotX - 9).toFixed(2) + ' ' + waveDotY.toFixed(2) + ' L ' + (waveDotX - 15).toFixed(2) + ' ' + (waveDotY + 4).toFixed(2)
                  : 'M ' + (waveDotX + 15).toFixed(2) + ' ' + (waveDotY - 4).toFixed(2) + ' L ' + (waveDotX + 9).toFixed(2) + ' ' + waveDotY.toFixed(2) + ' L ' + (waveDotX + 15).toFixed(2) + ' ' + (waveDotY + 4).toFixed(2),
                fill: 'none',
                stroke: colors.accent,
                strokeWidth: compact ? 1.5 : 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'data-wave-direction-cue': waveDirection
              }),
              h('circle', {
                cx: waveDotX.toFixed(2),
                cy: waveDotY.toFixed(2),
                r: compact ? 11 : 14,
                fill: colors.soft,
                opacity: 0.68,
                style: { transition: visualTransition }
              }),
              waveMarkerShape === 'diamond'
                ? h('rect', {
                    x: (waveDotX - (compact ? 4 : 5)).toFixed(2),
                    y: (waveDotY - (compact ? 4 : 5)).toFixed(2),
                    width: compact ? 8 : 10,
                    height: compact ? 8 : 10,
                    rx: 2,
                    fill: colors.panelAlt,
                    stroke: colors.accent,
                    strokeWidth: compact ? 2 : 2.5,
                    transform: 'rotate(45 ' + waveDotX.toFixed(2) + ' ' + waveDotY.toFixed(2) + ')',
                    'data-wave-marker-core': 'diamond'
                  })
                : h('circle', {
                    cx: waveDotX.toFixed(2),
                    cy: waveDotY.toFixed(2),
                    r: compact ? 5 : 6,
                    fill: colors.panelAlt,
                    stroke: waveMarkerShape === 'pause-bars' ? colors.muted : colors.accent,
                    strokeWidth: compact ? 2 : 2.5,
                    'data-wave-marker-core': waveMarkerShape === 'circle' ? 'circle' : 'ring'
                  }),
              waveMarkerShape === 'pause-bars'
                ? h('g', { 'data-wave-pause-bars': 'true' },
                    h('line', {
                      x1: (waveDotX - 2.5).toFixed(2),
                      y1: (waveDotY - 4).toFixed(2),
                      x2: (waveDotX - 2.5).toFixed(2),
                      y2: (waveDotY + 4).toFixed(2),
                      stroke: colors.accent,
                      strokeWidth: compact ? 2 : 2.5,
                      strokeLinecap: 'round'
                    }),
                    h('line', {
                      x1: (waveDotX + 2.5).toFixed(2),
                      y1: (waveDotY - 4).toFixed(2),
                      x2: (waveDotX + 2.5).toFixed(2),
                      y2: (waveDotY + 4).toFixed(2),
                      stroke: colors.accent,
                      strokeWidth: compact ? 2 : 2.5,
                      strokeLinecap: 'round'
                    })
                  )
                : (waveMarkerShape === 'dot' && h('circle', {
                    cx: waveDotX.toFixed(2),
                    cy: waveDotY.toFixed(2),
                    r: compact ? 1.8 : 2.2,
                    fill: colors.accent,
                    'data-wave-center-dot': 'true'
                  }))
            )
          );
        } else if (currentVisual.id === 'flower') {
          var flowerCanMove = usesPace && effectiveMotion !== 'still';
          var flowerMoving = flowerCanMove && (isRunning || previewing);
          var flowerPhase = flowerMoving ? activeBreathPhase : 'steady';
          var flowerPetalPattern = flowerPhase === 'out' ? 'dotted' : (flowerPhase === 'in' ? 'solid' : 'steady');
          var flowerSessionState = previewing
            ? 'preview'
            : (isRunning ? (flowerMoving ? 'moving' : 'steady') : (hasStarted ? 'paused' : 'ready'));
          var flowerCenterShape = flowerMoving
            ? (flowerPhase === 'out' ? 'diamond' : 'circle')
            : (flowerSessionState === 'paused' ? 'pause-bars' : 'dot');
          var flowerCueText = flowerMoving
            ? (flowerPhase === 'in' ? 'IN · OPEN' : 'OUT · SOFTEN')
            : (flowerSessionState === 'paused' ? 'PAUSED' : (flowerSessionState === 'steady' ? 'STEADY' : 'READY'));
          var flowerCueState = flowerMoving ? flowerPhase : flowerSessionState;
          var flowerPhaseProgress = flowerPhase === 'in'
            ? Math.min(1, Math.max(0, activeBreathAmount))
            : (flowerPhase === 'out' ? Math.min(1, Math.max(0, 1 - activeBreathAmount)) : 0);
          var flowerPatternTransition = flowerMoving && motionStrength > 0
            ? 'stroke-width 260ms ease-in-out, opacity 260ms ease-in-out'
            : 'none';
          var petalY = 89 - amount * 20;
          var petalLength = 29 + amount * 15;
          visualBody = h('svg', {
            viewBox: '0 0 240 240',
            'aria-hidden': 'true',
            focusable: 'false',
            'data-breath-flower': 'true',
            'data-flower-phase': flowerPhase,
            'data-flower-petal-pattern': flowerPetalPattern,
            'data-flower-center-shape': flowerCenterShape,
            'data-flower-session-state': flowerSessionState,
            'data-flower-phase-progress': flowerMoving ? Math.round(flowerPhaseProgress * 100) : 'steady',
            'data-flower-cadence': usesPace ? protocol.cadence.join('-') : 'natural',
            style: { width: frameCss, height: 'auto', overflow: 'visible', transform: 'scale(' + (0.94 + amount * 0.06).toFixed(3) + ')', transition: visualTransition }
          },
            usesPace && h('text', {
              x: 120,
              y: 18,
              textAnchor: 'middle',
              fill: flowerMoving ? colors.accent : colors.muted,
              fontSize: compact ? 18 : 14,
              fontWeight: flowerMoving ? 500 : 400,
              letterSpacing: compact ? 1.1 : 0.9,
              opacity: flowerMoving ? 1 : 0.78,
              style: {
                textDecoration: flowerMoving ? 'underline' : 'none',
                transition: flowerPatternTransition
              },
              'data-flower-phase-cue': 'true',
              'data-flower-cue-state': flowerCueState,
              'data-flower-cue-shape': flowerCenterShape,
              'data-flower-cue-emphasis': flowerMoving ? 'underlined' : 'plain'
            }, flowerCueText),
            [0, 1, 2, 3, 4, 5, 6, 7].map(function(index) {
              return h('ellipse', {
                key: index,
                cx: 120,
                cy: petalY,
                rx: 18 + amount * 4,
                ry: petalLength,
                transform: 'rotate(' + index * 45 + ' 120 120)',
                fill: colors.soft,
                stroke: colors.accent,
                strokeWidth: flowerMoving ? (compact ? 2.25 : 3) : (compact ? 1.5 : 2),
                strokeDasharray: flowerPetalPattern === 'dotted' ? (compact ? '3 7' : '4 8') : undefined,
                strokeLinecap: 'round',
                opacity: flowerMoving ? 0.72 + amount * 0.24 : 0.58 + amount * 0.3,
                style: { transition: visualTransition },
                'data-flower-petal': index,
                'data-flower-petal-pattern': flowerPetalPattern,
                'data-flower-petal-state': flowerMoving ? 'active' : 'steady'
              });
            }),
            h('circle', {
              cx: 120,
              cy: 120,
              r: 18 + amount * 6,
              fill: colors.panelAlt,
              stroke: flowerMoving ? colors.accent : colors.muted,
              strokeWidth: flowerMoving ? (compact ? 2.5 : 3.5) : (compact ? 2 : 3),
              opacity: flowerMoving ? 1 : 0.82,
              style: { transition: visualTransition },
              'data-flower-center-ring': 'true'
            }),
            h('g', {
              'data-flower-center': 'true',
              'data-flower-center-shape': flowerCenterShape,
              'data-flower-center-state': flowerMoving ? 'active' : flowerSessionState
            },
              flowerCenterShape === 'diamond'
                ? h('rect', {
                    x: compact ? 115.5 : 114.5,
                    y: compact ? 115.5 : 114.5,
                    width: compact ? 9 : 11,
                    height: compact ? 9 : 11,
                    rx: 2,
                    fill: colors.panelAlt,
                    stroke: colors.accent,
                    strokeWidth: compact ? 2 : 2.5,
                    transform: 'rotate(45 120 120)',
                    'data-flower-marker-core': 'diamond'
                  })
                : (flowerCenterShape === 'circle'
                    ? h('circle', {
                        cx: 120,
                        cy: 120,
                        r: compact ? 5 : 6,
                        fill: colors.panelAlt,
                        stroke: colors.accent,
                        strokeWidth: compact ? 2 : 2.5,
                        'data-flower-marker-core': 'circle'
                      })
                    : (flowerCenterShape === 'pause-bars'
                        ? h('g', { 'data-flower-pause-bars': 'true' },
                            h('line', {
                              x1: 116.5,
                              y1: compact ? 115.5 : 114.5,
                              x2: 116.5,
                              y2: compact ? 124.5 : 125.5,
                              stroke: colors.accent,
                              strokeWidth: compact ? 2 : 2.5,
                              strokeLinecap: 'round'
                            }),
                            h('line', {
                              x1: 123.5,
                              y1: compact ? 115.5 : 114.5,
                              x2: 123.5,
                              y2: compact ? 124.5 : 125.5,
                              stroke: colors.accent,
                              strokeWidth: compact ? 2 : 2.5,
                              strokeLinecap: 'round'
                            })
                          )
                        : h('circle', {
                            cx: 120,
                            cy: 120,
                            r: compact ? 3 : 4,
                            fill: colors.accent,
                            'data-flower-center-dot': 'true'
                          })))
            )
          );
        } else if (currentVisual.id === 'horizon') {
          var horizonCanMove = usesPace && effectiveMotion !== 'still';
          var horizonMoving = horizonCanMove && (isRunning || previewing);
          var horizonPhase = horizonMoving ? activeBreathPhase : 'steady';
          var horizonLinePattern = horizonPhase === 'out' ? 'dotted' : (horizonPhase === 'in' ? 'solid' : 'steady');
          var horizonSessionState = previewing
            ? 'preview'
            : (isRunning ? (horizonMoving ? 'moving' : 'steady') : (hasStarted ? 'paused' : 'ready'));
          var horizonCenterShape = horizonMoving
            ? (horizonPhase === 'out' ? 'diamond' : 'circle')
            : (horizonSessionState === 'paused' ? 'pause-bars' : 'dot');
          var horizonCueText = horizonMoving
            ? (horizonPhase === 'in' ? 'IN · RISE' : 'OUT · SETTLE')
            : (horizonSessionState === 'paused' ? 'PAUSED' : (horizonSessionState === 'steady' ? 'STEADY' : 'READY'));
          var horizonCueState = horizonMoving ? horizonPhase : horizonSessionState;
          var horizonPhaseProgress = horizonPhase === 'in'
            ? Math.min(1, Math.max(0, activeBreathAmount))
            : (horizonPhase === 'out' ? Math.min(1, Math.max(0, 1 - activeBreathAmount)) : 0);
          var horizonPatternTransition = horizonMoving && motionStrength > 0
            ? 'stroke-width 260ms ease-in-out, opacity 260ms ease-in-out'
            : 'none';
          var sunY = 108 - amount * 45;
          var sunRadius = 21 + amount * 6;
          visualBody = h('svg', {
            viewBox: '0 0 240 170',
            'aria-hidden': 'true',
            focusable: 'false',
            'data-breath-horizon': 'true',
            'data-horizon-phase': horizonPhase,
            'data-horizon-line-pattern': horizonLinePattern,
            'data-horizon-center-shape': horizonCenterShape,
            'data-horizon-session-state': horizonSessionState,
            'data-horizon-phase-progress': horizonMoving ? Math.round(horizonPhaseProgress * 100) : 'steady',
            'data-horizon-cadence': usesPace ? protocol.cadence.join('-') : 'natural',
            style: { width: frameCss, height: 'auto', overflow: 'visible', transition: visualTransition }
          },
            usesPace && h('text', {
              x: 120,
              y: 18,
              textAnchor: 'middle',
              fill: horizonMoving ? colors.accent : colors.muted,
              fontSize: compact ? 18 : 14,
              fontWeight: horizonMoving ? 500 : 400,
              letterSpacing: compact ? 1.1 : 0.9,
              opacity: horizonMoving ? 1 : 0.78,
              style: {
                textDecoration: horizonMoving ? 'underline' : 'none',
                transition: horizonPatternTransition
              },
              'data-horizon-phase-cue': 'true',
              'data-horizon-cue-state': horizonCueState,
              'data-horizon-cue-shape': horizonCenterShape,
              'data-horizon-cue-emphasis': horizonMoving ? 'underlined' : 'plain'
            }, horizonCueText),
            h('circle', {
              cx: 120,
              cy: sunY,
              r: sunRadius,
              fill: colors.soft,
              stroke: horizonMoving ? colors.accent : colors.muted,
              strokeWidth: horizonMoving ? (compact ? 2.5 : 3.5) : (compact ? 2 : 3),
              strokeDasharray: horizonLinePattern === 'dotted' ? (compact ? '3 7' : '4 8') : undefined,
              opacity: horizonMoving ? 1 : 0.82,
              style: { transition: visualTransition },
              'data-horizon-sun': 'true',
              'data-horizon-sun-pattern': horizonLinePattern
            }),
            h('g', {
              'data-horizon-sun-marker': 'true',
              'data-horizon-marker-shape': horizonCenterShape,
              'data-horizon-marker-state': horizonMoving ? 'active' : horizonSessionState
            },
              horizonCenterShape === 'diamond'
                ? h('rect', {
                    x: 115.5,
                    y: sunY - 4.5,
                    width: 9,
                    height: 9,
                    rx: 2,
                    fill: colors.panelAlt,
                    stroke: colors.accent,
                    strokeWidth: compact ? 2 : 2.5,
                    transform: 'rotate(45 120 ' + sunY.toFixed(2) + ')',
                    'data-horizon-marker-core': 'diamond'
                  })
                : (horizonCenterShape === 'circle'
                    ? h('circle', {
                        cx: 120,
                        cy: sunY,
                        r: compact ? 5 : 6,
                        fill: colors.panelAlt,
                        stroke: colors.accent,
                        strokeWidth: compact ? 2 : 2.5,
                        'data-horizon-marker-core': 'circle'
                      })
                    : (horizonCenterShape === 'pause-bars'
                        ? h('g', { 'data-horizon-pause-bars': 'true' },
                            h('line', {
                              x1: 116.5,
                              y1: (sunY - 4.5).toFixed(2),
                              x2: 116.5,
                              y2: (sunY + 4.5).toFixed(2),
                              stroke: colors.accent,
                              strokeWidth: compact ? 2 : 2.5,
                              strokeLinecap: 'round'
                            }),
                            h('line', {
                              x1: 123.5,
                              y1: (sunY - 4.5).toFixed(2),
                              x2: 123.5,
                              y2: (sunY + 4.5).toFixed(2),
                              stroke: colors.accent,
                              strokeWidth: compact ? 2 : 2.5,
                              strokeLinecap: 'round'
                            })
                          )
                        : h('circle', {
                            cx: 120,
                            cy: sunY,
                            r: compact ? 3 : 4,
                            fill: colors.accent,
                            'data-horizon-marker-core': 'dot'
                          })))
            ),
            h('path', { d: 'M 0 116 Q 58 94 120 116 T 240 116 L 240 170 L 0 170 Z', fill: colors.panelAlt, stroke: colors.border, strokeWidth: 2 }),
            h('path', {
              d: 'M 0 128 Q 60 112 120 128 T 240 128',
              fill: 'none',
              stroke: horizonMoving ? colors.accent : colors.muted,
              strokeWidth: horizonMoving ? (compact ? 2.5 : 3.5) : (compact ? 2 : 3),
              strokeDasharray: horizonLinePattern === 'dotted' ? (compact ? '3 7' : '4 8') : undefined,
              strokeLinecap: 'round',
              opacity: horizonMoving ? 1 : 0.68,
              style: { transition: horizonPatternTransition },
              'data-horizon-main-line': 'true',
              'data-horizon-main-pattern': horizonLinePattern,
              'data-horizon-main-state': horizonMoving ? 'active' : 'steady'
            }),
            h('path', { d: 'M 18 144 Q 70 132 120 144 T 222 144', fill: 'none', stroke: colors.muted, strokeWidth: 2, strokeLinecap: 'round', opacity: 0.68 })
          );
        } else if (currentVisual.id === 'path') {
          var pathDotX = 28 + amount * 184;
          var pathCanMove = usesPace && effectiveMotion !== 'still';
          var pathMoving = pathCanMove && (isRunning || previewing);
          var pathDirection = pathMoving
            ? (activeBreathPhase === 'in' ? 'right' : 'left')
            : 'steady';
          var pathPhase = pathMoving ? activeBreathPhase : 'steady';
          var pathDestination = pathPhase === 'in' ? 'inhale' : (pathPhase === 'out' ? 'exhale' : 'steady');
          var pathPhaseProgress = pathPhase === 'in'
            ? Math.min(1, Math.max(0, activeBreathAmount))
            : (pathPhase === 'out' ? Math.min(1, Math.max(0, 1 - activeBreathAmount)) : 0);
          var pathInState = pathPhase === 'in' ? 'destination' : (pathPhase === 'out' ? 'passed' : 'steady');
          var pathOutState = pathPhase === 'out' ? 'destination' : (pathPhase === 'in' ? 'waiting' : 'steady');
          var pathInLabelState = pathPhase === 'in' ? 'active' : (pathPhase === 'out' ? 'inactive' : 'steady');
          var pathOutLabelState = pathPhase === 'out' ? 'active' : (pathPhase === 'in' ? 'inactive' : 'steady');
          var pathTrailStartX = pathDirection === 'left' ? 212 : 28;
          var pathDestinationOpacity = pathMoving ? 0.3 + pathPhaseProgress * 0.5 : 0;
          var pathEndpointTransition = pathMoving && motionStrength > 0
            ? 'opacity 260ms ease-in-out, stroke-width 260ms ease-in-out'
            : 'none';
          var pathMarker = pathDirection === 'right'
            ? 'M -4 -5 L 5 0 L -4 5 Z'
            : 'M 4 -5 L -5 0 L 4 5 Z';
          visualBody = h('svg', {
            viewBox: '0 0 240 100',
            'aria-hidden': 'true',
            focusable: 'false',
            'data-breath-path': 'true',
            'data-path-position': Math.round(amount * 100),
            'data-path-direction': pathDirection,
            'data-path-phase': pathPhase,
            'data-path-destination': pathDestination,
            'data-path-phase-progress': pathMoving ? Math.round(pathPhaseProgress * 100) : 'steady',
            'data-path-cadence': usesPace ? protocol.cadence.join('-') : 'natural',
            style: { width: frameCss, height: 'auto', overflow: 'visible' }
          },
            h('line', { x1: 28, y1: 50, x2: 212, y2: 50, stroke: colors.border, strokeWidth: compact ? 5 : 6, strokeLinecap: 'round' }),
            pathMoving && h('line', {
              x1: pathTrailStartX,
              y1: 50,
              x2: pathDotX.toFixed(2),
              y2: 50,
              stroke: colors.accent,
              strokeWidth: compact ? 3 : 4,
              strokeLinecap: 'round',
              style: { transition: visualTransition },
              'data-path-trail': pathPhase,
              'data-path-trail-origin': pathPhase === 'in' ? 'out' : 'in'
            }),
            usesPace
              ? h('g', { 'data-path-endpoints': 'paced' },
                  h('g', {
                    'data-path-endpoint': 'out',
                    'data-path-endpoint-shape': 'diamond',
                    'data-path-endpoint-state': pathOutState
                  },
                    pathOutState === 'destination' && h('rect', {
                      x: 28 - (compact ? 9 : 11),
                      y: 50 - (compact ? 9 : 11),
                      width: compact ? 18 : 22,
                      height: compact ? 18 : 22,
                      rx: compact ? 2.5 : 3,
                      fill: 'none',
                      stroke: colors.accent,
                      strokeWidth: compact ? 1.5 : 2,
                      opacity: pathDestinationOpacity,
                      transform: 'rotate(45 28 50)',
                      style: { transition: pathEndpointTransition },
                      'data-path-destination-halo': 'out'
                    }),
                    h('rect', {
                      x: 28 - (compact ? 4 : 5),
                      y: 50 - (compact ? 4 : 5),
                      width: compact ? 8 : 10,
                      height: compact ? 8 : 10,
                      rx: 2,
                      fill: colors.panel,
                      stroke: pathOutState === 'destination' ? colors.accent : colors.muted,
                      strokeWidth: pathOutState === 'destination' ? (compact ? 2 : 2.5) : (compact ? 1.5 : 2),
                      transform: 'rotate(45 28 50)',
                      style: { transition: pathEndpointTransition }
                    })
                  ),
                  h('g', {
                    'data-path-endpoint': 'in',
                    'data-path-endpoint-shape': 'circle',
                    'data-path-endpoint-state': pathInState
                  },
                    pathInState === 'destination' && h('circle', {
                      cx: 212,
                      cy: 50,
                      r: compact ? 12 : 15,
                      fill: 'none',
                      stroke: colors.accent,
                      strokeWidth: compact ? 1.5 : 2,
                      opacity: pathDestinationOpacity,
                      style: { transition: pathEndpointTransition },
                      'data-path-destination-halo': 'in'
                    }),
                    h('circle', {
                      cx: 212,
                      cy: 50,
                      r: compact ? 5 : 6,
                      fill: colors.panel,
                      stroke: pathInState === 'destination' ? colors.accent : colors.muted,
                      strokeWidth: pathInState === 'destination' ? (compact ? 2 : 2.5) : (compact ? 1.5 : 2),
                      style: { transition: pathEndpointTransition }
                    })
                  ),
                  h('g', { 'data-path-phase-labels': 'true' },
                    h('text', {
                      x: 28,
                      y: 84,
                      textAnchor: 'middle',
                      fill: pathOutLabelState === 'active' ? colors.accent : colors.muted,
                      fontSize: compact ? 18 : 14,
                      fontWeight: pathOutLabelState === 'active' ? 500 : 400,
                      letterSpacing: compact ? 1.2 : 1,
                      opacity: pathOutLabelState === 'active' ? 1 : (pathOutLabelState === 'inactive' ? 0.48 : 0.78),
                      style: {
                        textDecoration: pathOutLabelState === 'active' ? 'underline' : 'none',
                        transition: pathEndpointTransition
                      },
                      'data-path-phase-label': 'out',
                      'data-path-label-state': pathOutLabelState,
                      'data-path-label-emphasis': pathOutLabelState === 'active' ? 'underlined' : 'plain'
                    }, 'OUT'),
                    h('text', {
                      x: 212,
                      y: 84,
                      textAnchor: 'middle',
                      fill: pathInLabelState === 'active' ? colors.accent : colors.muted,
                      fontSize: compact ? 18 : 14,
                      fontWeight: pathInLabelState === 'active' ? 500 : 400,
                      letterSpacing: compact ? 1.2 : 1,
                      opacity: pathInLabelState === 'active' ? 1 : (pathInLabelState === 'inactive' ? 0.48 : 0.78),
                      style: {
                        textDecoration: pathInLabelState === 'active' ? 'underline' : 'none',
                        transition: pathEndpointTransition
                      },
                      'data-path-phase-label': 'in',
                      'data-path-label-state': pathInLabelState,
                      'data-path-label-emphasis': pathInLabelState === 'active' ? 'underlined' : 'plain'
                    }, 'IN')
                  )
                )
              : h('g', { 'data-path-endpoints': 'natural' },
                  h('circle', { cx: 28, cy: 50, r: compact ? 4 : 5, fill: colors.panel, stroke: colors.muted, strokeWidth: 1.5 }),
                  h('circle', { cx: 212, cy: 50, r: compact ? 4 : 5, fill: colors.panel, stroke: colors.muted, strokeWidth: 1.5 })
                ),
            h('g', {
              'data-path-marker': 'true',
              'data-path-marker-direction': pathDirection,
              'data-path-marker-shape': pathDirection === 'steady' ? 'dot' : 'arrow'
            },
              h('circle', { cx: pathDotX.toFixed(2), cy: 50, r: compact ? 13 : 16, fill: colors.soft, opacity: 0.72, style: { transition: visualTransition } }),
              h('circle', { cx: pathDotX.toFixed(2), cy: 50, r: compact ? 7 : 9, fill: colors.panelAlt, stroke: colors.accent, strokeWidth: compact ? 2 : 3, style: { transition: visualTransition } }),
              pathDirection === 'steady'
                ? h('circle', { cx: pathDotX.toFixed(2), cy: 50, r: compact ? 2.5 : 3, fill: colors.accent, style: { transition: visualTransition } })
                : h('path', {
                    d: pathMarker,
                    transform: 'translate(' + pathDotX.toFixed(2) + ' 50)',
                    fill: colors.accent,
                    style: { transition: visualTransition }
                  })
            )
          );
        } else if (currentVisual.id === 'orbit') {
          var orbitCenter = 120;
          var orbitRadius = 82;
          var orbitCycle = protocol.cadence ? protocol.cadence[0] + protocol.cadence[1] : 1;
          var inhaleFraction = protocol.cadence ? protocol.cadence[0] / orbitCycle : 0.5;
          var previewCycleProgress = previewMode === 'in' ? inhaleFraction : 1;
          var activeCycleProgress = previewing ? previewCycleProgress : breath.absoluteCycleProgress;
          var orbitCanMove = usesPace && effectiveMotion !== 'still';
          var orbitMoving = orbitCanMove && (isRunning || previewing);
          var orbitProgress = orbitCanMove ? activeCycleProgress : 0;
          var orbitDisplayedProgress = previewing ? orbitProgress : orbitProgress % 1;
          var orbitRotation = Math.round(orbitProgress * 3600) / 10;
          if (orbitMoving) orbitRotationRef.current = orbitRotation;
          else if (!hasStarted || !orbitCanMove) orbitRotationRef.current = orbitRotation;
          var orbitMarkerRotation = orbitMoving ? orbitRotation : orbitRotationRef.current;
          var orbitMarkerTransition = previewing || (orbitMoving && orbitMotionRef.current) ? visualTransition : 'none';
          var orbitActiveSegment = orbitMoving ? activeBreathPhase : 'steady';
          var orbitMarkerPhase = orbitMoving ? activeBreathPhase : 'steady';
          var orbitMarkerShape = orbitMarkerPhase === 'out' ? 'diamond' : 'circle';
          var orbitCenterPhase = orbitMarkerPhase;
          var orbitCenterPattern = orbitCenterPhase === 'out' ? 'dotted' : (orbitCenterPhase === 'in' ? 'solid' : 'steady');
          var orbitCenterRadius = 30 + amount * 27;
          var orbitSessionState = previewing ? 'preview' : (isRunning ? 'moving' : (hasStarted ? 'paused' : 'ready'));
          var orbitCenterStatusShape = orbitSessionState === 'paused' ? 'pause-bars' : 'dot';
          var orbitCadenceTickTotal = protocol.cadence ? Math.round(orbitCycle) : 0;
          var orbitInhaleTickBoundary = protocol.cadence ? Math.round(protocol.cadence[0]) : 0;
          var orbitSegmentTransition = orbitMoving && motionStrength > 0
            ? 'stroke-width 260ms ease-in-out, opacity 260ms ease-in-out'
            : 'none';
          var inhaleSegmentState = orbitActiveSegment === 'steady' ? 'steady' : (orbitActiveSegment === 'in' ? 'active' : 'inactive');
          var exhaleSegmentState = orbitActiveSegment === 'steady' ? 'steady' : (orbitActiveSegment === 'out' ? 'active' : 'inactive');
          var orbitPhaseEndAngle = inhaleFraction * Math.PI * 2 - (Math.PI / 2);
          var orbitHandoffX = orbitCenter + Math.cos(orbitPhaseEndAngle) * orbitRadius;
          var orbitHandoffY = orbitCenter + Math.sin(orbitPhaseEndAngle) * orbitRadius;
          var orbitPhaseProgress = orbitMarkerPhase === 'in'
            ? Math.min(1, Math.max(0, orbitDisplayedProgress / Math.max(inhaleFraction, 0.001)))
            : (orbitMarkerPhase === 'out'
                ? Math.min(1, Math.max(0, (orbitDisplayedProgress - inhaleFraction) / Math.max(1 - inhaleFraction, 0.001)))
                : 0);
          var orbitDestination = orbitMarkerPhase === 'in' ? 'handoff' : (orbitMarkerPhase === 'out' ? 'return' : 'steady');
          var orbitHandoffState = orbitMarkerPhase === 'in' ? 'destination' : (orbitMarkerPhase === 'out' ? 'passed' : 'steady');
          var orbitReturnState = orbitMarkerPhase === 'out' ? 'destination' : (orbitMarkerPhase === 'in' ? 'waiting' : 'steady');
          var orbitDestinationOpacity = orbitMoving ? 0.3 + orbitPhaseProgress * 0.5 : 0;
          var orbitStationTransition = orbitMoving && motionStrength > 0 ? 'opacity 260ms ease-in-out' : 'none';

          function orbitPoint(fraction, radius) {
            var angle = fraction * Math.PI * 2 - (Math.PI / 2);
            var pointRadius = radius === undefined ? orbitRadius : radius;
            return {
              x: orbitCenter + Math.cos(angle) * pointRadius,
              y: orbitCenter + Math.sin(angle) * pointRadius
            };
          }

          function orbitArc(startFraction, endFraction) {
            var start = orbitPoint(startFraction);
            var end = orbitPoint(endFraction);
            var largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
            return 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) +
              ' A ' + orbitRadius + ' ' + orbitRadius + ' 0 ' + largeArc + ' 1 ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2);
          }

          var orbitCadenceTicks = [];
          if (usesPace) {
            for (var orbitTickIndex = 1; orbitTickIndex < orbitCadenceTickTotal; orbitTickIndex += 1) {
              if (orbitTickIndex === orbitInhaleTickBoundary) continue;
              var orbitTickFraction = orbitTickIndex / orbitCycle;
              var orbitTickPhase = orbitTickIndex < orbitInhaleTickBoundary ? 'in' : 'out';
              if (orbitTickPhase === 'in') {
                var orbitTickInner = orbitPoint(orbitTickFraction, orbitRadius - 5);
                var orbitTickOuter = orbitPoint(orbitTickFraction, orbitRadius + 5);
                orbitCadenceTicks.push(h('line', {
                  key: 'in-' + orbitTickIndex,
                  x1: orbitTickInner.x.toFixed(2),
                  y1: orbitTickInner.y.toFixed(2),
                  x2: orbitTickOuter.x.toFixed(2),
                  y2: orbitTickOuter.y.toFixed(2),
                  stroke: colors.panel,
                  strokeWidth: compact ? 2 : 2.5,
                  strokeLinecap: 'round',
                  'data-orbit-cadence-tick': orbitTickIndex,
                  'data-orbit-tick-phase': 'in',
                  'data-orbit-tick-shape': 'bar'
                }));
              } else {
                var orbitTickPoint = orbitPoint(orbitTickFraction);
                orbitCadenceTicks.push(h('circle', {
                  key: 'out-' + orbitTickIndex,
                  cx: orbitTickPoint.x.toFixed(2),
                  cy: orbitTickPoint.y.toFixed(2),
                  r: compact ? 3 : 3.5,
                  fill: colors.panel,
                  stroke: colors.muted,
                  strokeWidth: compact ? 1.5 : 2,
                  'data-orbit-cadence-tick': orbitTickIndex,
                  'data-orbit-tick-phase': 'out',
                  'data-orbit-tick-shape': 'hollow-dot'
                }));
              }
            }
          }
          var orbitReturnPoint = orbitPoint(0, orbitRadius + 20);
          var orbitReturnConnector = orbitPoint(0, orbitRadius + 11);
          var orbitLabelRadius = orbitRadius + (compact ? 19 : 23);
          var orbitInhaleLabelPoint = orbitPoint(inhaleFraction / 2, orbitLabelRadius);
          var orbitExhaleLabelPoint = orbitPoint(inhaleFraction + ((1 - inhaleFraction) / 2), orbitLabelRadius);

          visualBody = h('svg', {
            viewBox: '0 0 240 240',
            'aria-hidden': 'true',
            focusable: 'false',
            'data-breath-orbit': 'true',
            'data-orbit-phase': phaseToken,
            'data-orbit-progress': orbitCanMove ? Math.round(orbitDisplayedProgress * 100) : 'steady',
            'data-orbit-turn': orbitCanMove ? Math.floor(orbitProgress) : 'steady',
            'data-orbit-rotation': orbitCanMove ? orbitRotation : 'steady',
            'data-orbit-direction': orbitMoving ? 'clockwise' : 'steady',
            'data-orbit-active-segment': orbitActiveSegment,
            'data-orbit-destination': orbitDestination,
            'data-orbit-phase-progress': orbitMoving ? Math.round(orbitPhaseProgress * 100) : 'steady',
            'data-orbit-inhale-percent': Math.round(inhaleFraction * 100),
            'data-orbit-cadence': usesPace ? protocol.cadence.join('-') : 'natural',
            style: { width: frameCss, height: 'auto', overflow: 'visible' }
          },
            h('circle', {
              cx: orbitCenter,
              cy: orbitCenter,
              r: orbitRadius,
              fill: 'none',
              stroke: colors.border,
              strokeWidth: compact ? 7 : 9
            }),
            h('path', {
              d: orbitArc(0, inhaleFraction),
              fill: 'none',
              stroke: colors.accent,
              strokeLinecap: 'round',
              'data-orbit-segment': 'inhale',
              'data-orbit-segment-state': inhaleSegmentState,
              style: {
                strokeWidth: inhaleSegmentState === 'active' ? (compact ? 6 : 7) : (inhaleSegmentState === 'inactive' ? (compact ? 3 : 4) : (compact ? 4 : 5)),
                opacity: inhaleSegmentState === 'active' ? 1 : (inhaleSegmentState === 'inactive' ? 0.45 : 0.78),
                transition: orbitSegmentTransition
              }
            }),
            h('path', {
              d: orbitArc(inhaleFraction, 1),
              fill: 'none',
              stroke: colors.muted,
              strokeLinecap: 'round',
              strokeDasharray: compact ? '3 7' : '4 8',
              'data-orbit-segment': 'exhale',
              'data-orbit-segment-state': exhaleSegmentState,
              style: {
                strokeWidth: exhaleSegmentState === 'active' ? (compact ? 5 : 6) : (exhaleSegmentState === 'inactive' ? (compact ? 2 : 3) : (compact ? 3 : 4)),
                opacity: exhaleSegmentState === 'active' ? 1 : (exhaleSegmentState === 'inactive' ? 0.45 : 0.78),
                transition: orbitSegmentTransition
              }
            }),
            usesPace && h('g', {
              'data-orbit-phase-labels': 'true'
            },
              h('text', {
                x: orbitInhaleLabelPoint.x.toFixed(2),
                y: orbitInhaleLabelPoint.y.toFixed(2),
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                fill: colors.accent,
                fontSize: compact ? 12 : 13,
                fontWeight: inhaleSegmentState === 'active' ? 500 : 400,
                letterSpacing: compact ? 0.8 : 1.1,
                opacity: inhaleSegmentState === 'active' ? 1 : (inhaleSegmentState === 'inactive' ? 0.45 : 0.78),
                style: {
                  textDecoration: inhaleSegmentState === 'active' ? 'underline' : 'none',
                  transition: orbitSegmentTransition
                },
                'data-orbit-phase-label': 'in',
                'data-orbit-label-state': inhaleSegmentState,
                'data-orbit-label-emphasis': inhaleSegmentState === 'active' ? 'underlined' : 'plain'
              }, 'IN'),
              h('text', {
                x: orbitExhaleLabelPoint.x.toFixed(2),
                y: orbitExhaleLabelPoint.y.toFixed(2),
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                fill: colors.muted,
                fontSize: compact ? 12 : 13,
                fontWeight: exhaleSegmentState === 'active' ? 500 : 400,
                letterSpacing: compact ? 0.8 : 1.1,
                opacity: exhaleSegmentState === 'active' ? 1 : (exhaleSegmentState === 'inactive' ? 0.45 : 0.78),
                style: {
                  textDecoration: exhaleSegmentState === 'active' ? 'underline' : 'none',
                  transition: orbitSegmentTransition
                },
                'data-orbit-phase-label': 'out',
                'data-orbit-label-state': exhaleSegmentState,
                'data-orbit-label-emphasis': exhaleSegmentState === 'active' ? 'underlined' : 'plain'
              }, 'OUT')
            ),
            usesPace && h('g', {
              'data-orbit-cadence-map': 'true',
              'data-orbit-cadence-count': orbitCadenceTickTotal,
              'data-orbit-inhale-count': protocol.cadence[0],
              'data-orbit-exhale-count': protocol.cadence[1]
            }, orbitCadenceTicks),
            usesPace && h('g', {
              'data-orbit-return': 'true',
              'data-orbit-return-shape': 'ring',
              'data-orbit-return-state': orbitReturnState,
              'data-orbit-station-shape': 'ring'
            },
              orbitReturnState === 'destination' && h('circle', {
                cx: orbitReturnPoint.x.toFixed(2),
                cy: orbitReturnPoint.y.toFixed(2),
                r: compact ? 8 : 10,
                fill: 'none',
                stroke: colors.accent,
                strokeWidth: compact ? 1.5 : 2,
                opacity: orbitDestinationOpacity,
                style: { transition: orbitStationTransition },
                'data-orbit-destination-halo': 'return'
              }),
              h('line', {
                x1: orbitCenter,
                y1: orbitReturnConnector.y.toFixed(2),
                x2: orbitCenter,
                y2: (orbitReturnPoint.y + 4).toFixed(2),
                stroke: colors.muted,
                strokeWidth: compact ? 1.5 : 2,
                strokeLinecap: 'round'
              }),
              h('circle', {
                cx: orbitReturnPoint.x.toFixed(2),
                cy: orbitReturnPoint.y.toFixed(2),
                r: compact ? 3.5 : 4.5,
                fill: colors.panel,
                stroke: colors.accent,
                strokeWidth: compact ? 1.5 : 2
              })
            ),
            h('circle', {
              cx: orbitCenter,
              cy: orbitCenter,
              r: orbitCenterRadius,
              fill: colors.soft,
              opacity: 0.48 + amount * 0.28,
              style: { transition: visualTransition },
              'data-orbit-center': 'true'
            }),
            h('circle', {
              cx: orbitCenter,
              cy: orbitCenter,
              r: orbitCenterRadius,
              fill: 'none',
              stroke: colors.accent,
              strokeWidth: orbitCenterPhase === 'steady' ? (compact ? 1.5 : 2) : (compact ? 2.5 : 3),
              strokeDasharray: orbitCenterPattern === 'dotted' ? (compact ? '3 6' : '4 7') : undefined,
              strokeLinecap: 'round',
              opacity: orbitCenterPhase === 'steady' ? 0.58 : 0.92,
              style: { transition: visualTransition },
              'data-orbit-center-ring': 'true',
              'data-orbit-center-phase': orbitCenterPhase,
              'data-orbit-center-pattern': orbitCenterPattern
            }),
            h('g', {
              'data-orbit-center-status': 'true',
              'data-orbit-center-status-state': orbitSessionState,
              'data-orbit-center-status-shape': orbitCenterStatusShape
            },
              h('circle', {
                cx: orbitCenter,
                cy: orbitCenter,
                r: compact ? 8 : 10,
                fill: colors.panelAlt,
                stroke: orbitSessionState === 'paused' ? colors.muted : colors.accent,
                strokeWidth: 2
              }),
              orbitCenterStatusShape === 'pause-bars'
                ? h('g', { 'data-orbit-pause-bars': 'true' },
                    h('line', {
                      x1: orbitCenter - 3,
                      y1: orbitCenter - 5,
                      x2: orbitCenter - 3,
                      y2: orbitCenter + 5,
                      stroke: colors.accent,
                      strokeWidth: compact ? 2.5 : 3,
                      strokeLinecap: 'round'
                    }),
                    h('line', {
                      x1: orbitCenter + 3,
                      y1: orbitCenter - 5,
                      x2: orbitCenter + 3,
                      y2: orbitCenter + 5,
                      stroke: colors.accent,
                      strokeWidth: compact ? 2.5 : 3,
                      strokeLinecap: 'round'
                    })
                  )
                : h('circle', {
                    cx: orbitCenter,
                    cy: orbitCenter,
                    r: compact ? 2 : 2.5,
                    fill: colors.accent,
                    'data-orbit-center-dot': 'true'
                  })
            ),
            usesPace && h('g', {
              'data-orbit-handoff': 'true',
              'data-orbit-handoff-state': orbitHandoffState,
              'data-orbit-station-shape': 'diamond'
            },
              orbitHandoffState === 'destination' && h('rect', {
                x: orbitHandoffX - (compact ? 7 : 9),
                y: orbitHandoffY - (compact ? 7 : 9),
                width: compact ? 14 : 18,
                height: compact ? 14 : 18,
                rx: compact ? 2.5 : 3,
                fill: 'none',
                stroke: colors.accent,
                strokeWidth: compact ? 1.5 : 2,
                opacity: orbitDestinationOpacity,
                transform: 'rotate(45 ' + orbitHandoffX.toFixed(2) + ' ' + orbitHandoffY.toFixed(2) + ')',
                style: { transition: orbitStationTransition },
                'data-orbit-destination-halo': 'handoff'
              }),
              h('rect', {
                x: orbitHandoffX - (compact ? 4 : 5),
                y: orbitHandoffY - (compact ? 4 : 5),
                width: compact ? 8 : 10,
                height: compact ? 8 : 10,
                rx: 2,
                fill: colors.panel,
                stroke: colors.accent,
                strokeWidth: 2,
                transform: 'rotate(45 ' + orbitHandoffX.toFixed(2) + ' ' + orbitHandoffY.toFixed(2) + ')'
              })
            ),
            h('g', {
              'data-orbit-marker': 'true',
              'data-orbit-marker-phase': orbitMarkerPhase,
              'data-orbit-marker-shape': orbitMarkerShape,
              'data-orbit-marker-direction': orbitMoving ? 'clockwise' : 'steady',
              style: {
                transform: 'rotate(' + orbitMarkerRotation + 'deg)',
                transformOrigin: orbitCenter + 'px ' + orbitCenter + 'px',
                transition: orbitMarkerTransition
              }
            },
              h('circle', {
                cx: orbitCenter,
                cy: orbitCenter - orbitRadius,
                r: compact ? 12 : 15,
                fill: colors.soft,
                opacity: 0.7
              }),
              orbitMarkerShape === 'diamond'
                ? h('rect', {
                    x: orbitCenter - (compact ? 5 : 6),
                    y: orbitCenter - orbitRadius - (compact ? 5 : 6),
                    width: compact ? 10 : 12,
                    height: compact ? 10 : 12,
                    rx: 2,
                    fill: colors.panelAlt,
                    stroke: colors.accent,
                    strokeWidth: compact ? 2 : 3,
                    transform: 'rotate(45 ' + orbitCenter + ' ' + (orbitCenter - orbitRadius) + ')',
                    'data-orbit-marker-core': 'diamond'
                  })
                : h('circle', {
                    cx: orbitCenter,
                    cy: orbitCenter - orbitRadius,
                    r: compact ? 6 : 8,
                    fill: colors.panelAlt,
                    stroke: colors.accent,
                    strokeWidth: compact ? 2 : 3,
                    'data-orbit-marker-core': 'circle'
                  }),
              orbitMoving && h('path', {
                d: 'M ' + (orbitCenter - 4) + ' ' + (orbitCenter - orbitRadius - 4) +
                  ' L ' + (orbitCenter + 4) + ' ' + (orbitCenter - orbitRadius) +
                  ' L ' + (orbitCenter - 4) + ' ' + (orbitCenter - orbitRadius + 4),
                fill: 'none',
                stroke: colors.accent,
                strokeWidth: compact ? 1.5 : 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'data-orbit-direction-cue': 'clockwise'
              })
            )
          );
        } else {
          visualBody = h('div', {
            style: {
              width: circleCss,
              height: circleCss,
              borderRadius: '50%',
              background: colors.soft,
              border: (compact ? 3 : 5) + 'px solid ' + colors.accent,
              boxShadow: isContrast ? 'none' : '0 0 0 ' + (compact ? 9 : 14) + 'px ' + colors.panelAlt,
              transform: 'scale(' + scale.toFixed(3) + ')',
              transition: visualTransition,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.accent,
              fontSize: compact ? 22 : 32,
              fontWeight: 900
            }
          }, '\u223F');
        }

        var phaseRail = null;
        if (usesPace) {
          var railCanMove = effectiveMotion !== 'still';
          var railPhase = railCanMove
            ? (previewing ? previewMode : (isRunning ? breath.phase : (hasStarted ? 'paused' : 'ready')))
            : (isRunning ? 'steady' : (hasStarted ? 'paused' : 'ready'));
          var railProgress = railPhase === 'in' || railPhase === 'out'
            ? (previewing ? 100 : Math.round(breath.phaseProgress * 100))
            : 'steady';
          var railLabel = railPhase === 'in'
            ? 'IN \u00b7 EXPAND'
            : (railPhase === 'out'
                ? 'OUT \u00b7 SOFTEN'
                : (railPhase === 'paused' ? 'PAUSED' : (railPhase === 'ready' ? 'READY' : 'STEADY')));
          var showCycleProgress = !compact && d.showTimer;
          var railCycleText = compact
            ? (previewing ? 'PREVIEW' : '')
            : (showCycleProgress ? 'CYCLE ' + breathCycleNumber + ' / ' + breathCycleTotal : '');
          var inhaleSeconds = Math.max(1, Number(protocol.cadence[0]) || 1);
          var exhaleSeconds = Math.max(1, Number(protocol.cadence[1]) || 1);
          var cadenceTotalSeconds = inhaleSeconds + exhaleSeconds;
          var railSegmentState = function(segment) {
            if (railPhase === segment) return 'active';
            if (railPhase === 'out' && segment === 'in') return 'complete';
            return 'upcoming';
          };
          var railSegment = function(segment) {
            var segmentState = railSegmentState(segment);
            return h('div', {
              'data-breath-phase-segment': segment,
              'data-breath-phase-segment-state': segmentState,
              'data-breath-phase-segment-seconds': String(segment === 'in' ? inhaleSeconds : exhaleSeconds),
              'data-breath-phase-segment-ratio': String(Math.round(((segment === 'in' ? inhaleSeconds : exhaleSeconds) / cadenceTotalSeconds) * 100)),
              style: {
                flex: segment === 'in' ? inhaleSeconds : exhaleSeconds,
                minWidth: 0,
                height: compact ? 4 : 5,
                borderRadius: 999,
                background: segmentState === 'upcoming' ? colors.border : colors.accent,
                opacity: segmentState === 'active' ? 1 : (segmentState === 'complete' ? 0.48 : 0.58),
                transition: effectiveMotion === 'still' ? 'none' : 'background 260ms ease, opacity 260ms ease'
              }
            });
          };
          var breathCycleMarkers = [];
          if (showCycleProgress) {
            for (var cycleMarkerIndex = 1; cycleMarkerIndex <= breathCycleTotal; cycleMarkerIndex += 1) {
              var cycleMarkerState = !hasStarted && !isRunning
                ? 'upcoming'
                : (cycleMarkerIndex < breathCycleNumber
                    ? 'complete'
                    : (cycleMarkerIndex === breathCycleNumber ? 'current' : 'upcoming'));
              breathCycleMarkers.push(h('span', {
                key: cycleMarkerIndex,
                'data-breath-cycle-marker': String(cycleMarkerIndex),
                'data-breath-cycle-marker-state': cycleMarkerState,
                style: {
                  width: cycleMarkerState === 'current' ? 10 : 7,
                  height: cycleMarkerState === 'current' ? 10 : 7,
                  borderRadius: 999,
                  border: cycleMarkerState === 'upcoming' ? '1px solid ' + colors.muted : '1px solid ' + colors.accent,
                  background: cycleMarkerState === 'complete' ? colors.accent : colors.panel,
                  boxShadow: cycleMarkerState === 'current' ? 'inset 0 0 0 2px ' + colors.panel + ', inset 0 0 0 5px ' + colors.accent : 'none',
                  opacity: cycleMarkerState === 'upcoming' ? 0.55 : 1,
                  transition: effectiveMotion === 'still' ? 'none' : 'width 220ms ease, height 220ms ease, opacity 220ms ease'
                }
              }));
            }
          }
          phaseRail = h('div', {
            'aria-hidden': 'true',
            'data-breath-phase-rail': 'true',
            'data-breath-phase': railPhase,
            'data-breath-phase-progress': railProgress,
            'data-breath-phase-label': railLabel,
            'data-breath-phase-cadence': inhaleSeconds + '-' + exhaleSeconds,
            'data-breath-phase-total-seconds': String(cadenceTotalSeconds),
            'data-breath-cycle-number': compact ? (previewing ? 'preview' : 'steady') : String(breathCycleNumber),
            'data-breath-cycle-total': compact ? 'preview' : String(breathCycleTotal),
            'data-breath-cycle-display': compact ? 'preview' : (showCycleProgress ? 'visible' : 'hidden'),
            style: {
              width: frameCss,
              display: 'grid',
              gap: 5,
              marginTop: compact ? 2 : 4,
              color: colors.muted,
              fontSize: compact ? 9 : 10,
              fontWeight: 850,
              letterSpacing: 0.7,
              textTransform: 'uppercase'
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } },
              h('span', { 'data-breath-phase-label-text': 'in', style: { color: railPhase === 'in' ? colors.accent : colors.muted } }, 'IN ' + inhaleSeconds + 's'),
              h('span', { 'data-breath-phase-label-text': 'out', style: { color: railPhase === 'out' ? colors.accent : colors.muted } }, 'OUT ' + exhaleSeconds + 's')
            ),
            h('div', { style: { display: 'flex', gap: 4, width: '100%' } }, railSegment('in'), railSegment('out')),
            showCycleProgress && h('div', {
              'data-breath-cycle-map': 'true',
              style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 10, flexWrap: 'wrap' }
            }, breathCycleMarkers),
            h('div', { 'data-breath-phase-status': 'true', style: { textAlign: 'center', color: railPhase === 'in' || railPhase === 'out' ? colors.accent : colors.muted, letterSpacing: compact ? 0.85 : 0.9 } }, railCycleText ? railCycleText + ' \u00b7 ' : '', railLabel + (railPhase === 'in' || railPhase === 'out' ? ' \u00b7 ' + railProgress + '%' : ''))
          );
        }

        var visualAction = isRunning ? 'pause' : (hasStarted ? 'resume' : 'start');
        var visualContainerStyle = {
          minHeight: minimumHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          overflow: 'hidden'
        };
        var visualContainerProps = {
          'data-visual-mode': currentVisual.id,
          'data-visual-theme': visualTheme.id,
          'data-visual-motion': effectiveMotion,
          'data-visual-clock': isRunning && usesPace && effectiveMotion !== 'still' ? 'smooth' : 'static',
          'data-visual-phase': phaseToken,
          'data-visual-phase-label': visualPhaseLabel,
          'data-visual-cadence': usesPace ? protocol.cadence.join('-') + '-seconds' : 'natural',
          'data-visual-preview': previewing ? previewMode : 'idle',
          'data-visual-running': isRunning ? 'true' : 'false',
          'data-visual-size': compact ? 'preview' : (focused ? 'focus' : (expanded ? 'large' : 'standard')),
          style: visualContainerStyle
        };
        if (focused) {
          visualContainerProps.type = 'button';
          visualContainerProps.onClick = togglePracticeTimer;
          visualContainerProps['aria-label'] = (visualAction === 'pause' ? 'Pause' : (visualAction === 'resume' ? 'Resume' : 'Start')) + ' practice from ' + visualLabel;
          visualContainerProps['aria-keyshortcuts'] = 'Enter Space';
          visualContainerProps['data-visual-toggle'] = 'true';
          visualContainerProps['data-visual-action'] = visualAction;
          Object.assign(visualContainerStyle, {
            width: '100%',
            flexDirection: 'column',
            gap: 8,
            padding: 0,
            border: '1px solid transparent',
            borderRadius: 12,
            background: 'transparent',
            color: colors.text,
            fontFamily: 'inherit',
            cursor: 'pointer'
          });
        } else {
          visualContainerProps.role = 'img';
          visualContainerProps['aria-roledescription'] = 'breathing visual guide';
          visualContainerProps['aria-label'] = visualLabel;
        }
        var visualThemeWrapperStyle = {
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          filter: visualTheme.filter
        };
        return h(focused ? 'button' : 'div', visualContainerProps,
          h('div', { 'data-visual-theme-wrapper': 'true', style: visualThemeWrapperStyle },
            visualBody,
            phaseRail
          ),
          focused && h('span', {
            'aria-hidden': 'true',
            style: { color: colors.muted, fontSize: 11, fontWeight: 750 }
          }, visualAction === 'pause' ? 'Press visual to pause' : (visualAction === 'resume' ? 'Press visual to resume' : 'Press visual to start'))
        );
      }

      function moveToAfter() {
        var currentRemainingMs = currentTimerRemainingMs();
        var currentRemaining = Math.max(0, Math.ceil(currentRemainingMs / 1000));
        var practiced = Math.max(0, selectedProtocol.duration - currentRemaining);
        pausedRemainingMsRef.current = currentRemainingMs;
        deadlineRef.current = null;
        setRemaining(currentRemaining);
        setIsRunning(false);
        if (d.soundEnabled && typeof ctx.beep === 'function') ctx.beep(440, 0.3, 0.06);
        setToolState({
          view: 'after',
          post: d.pre,
          postSkipped: d.preSkipped,
          response: null,
          lastDurationSec: practiced
        });
        announce('Practice ended. Check in with what you notice now.');
      }

      function renderPractice() {
        var visualRemaining = currentVisualRemaining();
        var breath = breathState(selectedProtocol, visualRemaining);
        var usesPace = !!(selectedProtocol.cadence && d.pacedBreathing);
        var elapsed = Math.max(0, selectedProtocol.duration - remaining);
        var visualElapsed = Math.max(0, selectedProtocol.duration - visualRemaining);
        var hasStarted = currentTimerRemainingMs() < selectedProtocol.duration * 1000;
        var progressPercent = selectedProtocol.duration ? Math.round((elapsed / selectedProtocol.duration) * 100) : 0;
        var visualProgressPercent = selectedProtocol.duration
          ? Math.min(100, Math.max(0, (visualElapsed / selectedProtocol.duration) * 100))
          : 0;
        var fullCue = usesPace
          ? (isRunning ? breath.label + ' - ' + breath.count : (hasStarted ? 'Paused - resume when ready' : 'Optional breath guide is ready'))
          : (isRunning ? 'Breathe naturally and move only if comfortable' : (hasStarted ? 'Paused - resume when ready' : 'Start when you are ready'));
        var phaseCue = isRunning
          ? (usesPace ? (breath.phase === 'in' ? 'In' : 'Out') : 'Natural breath')
          : (hasStarted ? 'Paused' : 'Ready');
        var guidanceVisible = d.guidanceMode !== 'hidden';
        var cue = d.guidanceMode === 'phase' ? phaseCue : fullCue;
        // Announce phase changes without announcing each numeric count. This
        // gives nonvisual users the same optional pacing signal as the visual.
        var phaseAnnouncement = usesPace
          ? (isRunning ? breath.label : (hasStarted ? 'Practice paused.' : 'Optional breath guide ready.'))
          : (isRunning ? 'Natural breathing.' : 'Practice ready.');
        var phaseAnnouncementToken = usesPace
          ? (isRunning ? breath.phase : (hasStarted ? 'paused' : 'ready'))
          : 'steady';
        return h('div', {
          'data-quiet-view': quietView ? 'true' : 'false',
          'data-timer-visible': d.showTimer ? 'true' : 'false',
          'data-guidance-visible': guidanceVisible ? 'true' : 'false',
          'data-guidance-mode': d.guidanceMode,
          onKeyDown: handlePracticeKeyDown,
          style: { display: 'grid', gap: 14, maxWidth: quietView ? 820 : 720, margin: '0 auto' }
        },
          h('div', { style: cardStyle({ textAlign: 'center', padding: quietView ? 24 : 20, overflow: 'hidden', background: quietView ? colors.panelAlt : colors.panel }) },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
              h('div', { style: { color: colors.muted, fontSize: 12, fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.8 } }, selectedProtocol.name),
              quietViewButton()
            ),
            renderVisual(selectedProtocol),
            h('div', {
              role: 'timer',
              'aria-live': remaining === 0 ? 'polite' : 'off',
              style: d.showTimer
                ? { color: colors.text, fontSize: 46, lineHeight: 1, fontWeight: 850, fontVariantNumeric: 'tabular-nums' }
                : { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }
            }, formatTime(remaining)),
            d.showTimer && h('div', {
              role: 'progressbar',
              'aria-label': 'Practice progress',
              'aria-valuemin': 0,
              'aria-valuemax': selectedProtocol.duration,
              'aria-valuenow': elapsed,
              'aria-valuetext': formatTime(remaining) + ' remaining',
              'data-session-progress': progressPercent,
              'data-session-progress-visual': visualProgressPercent.toFixed(2),
              style: {
                width: 'min(420px, 88%)',
                height: 6,
                margin: '14px auto 0',
                overflow: 'hidden',
                borderRadius: 999,
                background: isContrast ? '#ffffff' : colors.border,
                boxShadow: isContrast ? '0 0 0 1px ' + colors.border : 'none'
              }
            }, h('div', {
              style: {
                width: visualProgressPercent.toFixed(2) + '%',
                height: '100%',
                background: colors.accent,
                transition: reduceMotion || !isRunning ? 'none' : 'width 100ms linear'
              }
            })),
            !d.showTimer && h('p', {
              'data-countdown-hidden': 'true',
              style: { margin: '10px 0 0', color: colors.muted, fontSize: 12, lineHeight: 1.45 }
            }, 'Countdown hidden. This practice will still finish automatically.'),
            h('p', {
              'data-guidance-cue': guidanceVisible ? 'visible' : 'hidden',
              'data-guidance-detail': d.guidanceMode,
              'data-guidance-phase': phaseAnnouncementToken,
              style: guidanceVisible
                ? { minHeight: 24, margin: '12px 0 0', color: colors.accent, fontSize: d.guidanceMode === 'phase' ? 15 : 17, fontWeight: 850 }
                : visuallyHidden
            }, cue),
            h('span', {
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              'data-breath-phase-announcer': phaseAnnouncementToken,
              style: visuallyHidden
            }, phaseAnnouncement),
            reduceMotion && h('p', { style: { margin: '6px 0 0', color: colors.muted, fontSize: 11 } }, 'Reduced motion is on; the visual remains steady.'),
            !quietView && h('p', { style: { margin: '12px auto 0', maxWidth: 520, color: colors.muted, fontSize: 13, lineHeight: 1.55 } }, instructionFor(selectedProtocol, gradeBand))
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              onClick: togglePracticeTimer,
              style: primaryButton({ minWidth: 150 })
            }, isRunning ? 'Pause' : (hasStarted ? 'Resume' : 'Start')),
            h('button', {
              type: 'button',
              onClick: restartPracticeTimer,
              disabled: !isRunning && !hasStarted,
              style: secondaryButton(!isRunning && !hasStarted ? { minWidth: 110, opacity: 0.55, cursor: 'not-allowed' } : { minWidth: 110 })
            }, 'Restart timer'),
            h('button', { type: 'button', onClick: moveToAfter, style: secondaryButton({ minWidth: 140 }) }, 'End & check in')
          ),
          !quietView && h('fieldset', { style: cardStyle({ margin: 0, padding: 12 }) },
            h('legend', { style: { padding: '0 6px', color: colors.text, fontSize: 13, fontWeight: 850 } }, 'Practice options'),
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } },
              visualChoiceControl(),
              visualMotionControl(),
              visualThemeControl(),
              visualSizeButton(),
              breathCountButton(selectedProtocol),
              soundCueButton(),
              phaseSoundButton(selectedProtocol),
              timerDisplayButton(),
              guidanceDisplayControl()
            )
          ),
          !quietView && h('details', { style: cardStyle({ padding: 12 }) },
            h('summary', { style: { color: colors.text, cursor: 'pointer', fontSize: 13, fontWeight: 850 } }, 'Still option and safety'),
            h('p', { style: { color: colors.muted, fontSize: 13, lineHeight: 1.55, margin: '10px 0' } }, selectedProtocol.still),
            safetyNote(true)
          )
        );
      }

      function saveReflection() {
        var response = d.response || 'not_sure';
        var preRating = d.preSkipped ? null : clampRating(d.pre);
        var postRating = d.postSkipped ? null : clampRating(d.post);
        var record = {
          id: 'reset_' + Date.now(),
          protocolId: selectedProtocol.id,
          protocolName: selectedProtocol.name,
          zoneId: zone.id,
          zoneLabel: zone.label,
          pre: preRating,
          post: postRating,
          shift: preRating === null || postRating === null ? null : preRating - postRating,
          response: response,
          durationSec: Math.max(0, Number(d.lastDurationSec) || 0),
          completedAt: new Date().toISOString()
        };
        var logs = [record].concat(d.logs).slice(0, 30);
        setToolState({ view: 'summary', response: response, logs: logs });
        toast('Private reset reflection saved.', 'success');
        announce('Reflection saved privately.');
      }

      function renderAfter() {
        return h('div', { style: { display: 'grid', gap: 16, maxWidth: 680, margin: '0 auto' } },
          h('div', { style: cardStyle({ background: colors.panelAlt }) },
            h('h3', { style: { margin: '0 0 6px', color: colors.text, fontSize: 20 } }, 'Notice, without grading yourself'),
            h('p', { style: { margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.55 } }, 'A practice can help, do nothing noticeable, or feel like the wrong fit. All three are useful information, and the number is optional.')
          ),
          ratingControl('Tension or restlessness now', d.post, d.postSkipped, function(value) {
            setToolState({ post: value, postSkipped: false });
          }, function(skipped) {
            setToolState({ postSkipped: skipped });
            announce(skipped ? 'After number skipped. Your word-based reflection is enough.' : 'After rating slider restored.');
          }, 'somatic-reset-after'),
          h('fieldset', { style: cardStyle({ margin: 0 }) },
            h('legend', { style: { padding: '0 6px', color: colors.text, fontSize: 14, fontWeight: 850 } }, 'What best matches your experience?'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 9 } }, RESPONSE_OPTIONS.map(function(option) {
              var selected = d.response === option.id;
              return h('button', {
                key: option.id,
                type: 'button',
                onClick: function() { setToolState({ response: option.id }); },
                'aria-pressed': selected,
                style: secondaryButton(selected ? { borderWidth: 2, borderColor: colors.accent, background: colors.soft, color: colors.accent } : { minHeight: 54 })
              }, h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, option.icon), option.label);
            }))
          ),
          h('p', { style: { margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.5, textAlign: 'center' } }, 'Your optional ratings and choice stay in this SEL project unless you deliberately export or share them.'),
          h('button', { type: 'button', onClick: saveReflection, style: primaryButton({ width: '100%', minHeight: 50 }) }, 'Save private reflection')
        );
      }

      function responseLabel(id) {
        for (var i = 0; i < RESPONSE_OPTIONS.length; i += 1) {
          if (RESPONSE_OPTIONS[i].id === id) return RESPONSE_OPTIONS[i].label;
        }
        return 'Not sure yet';
      }

      function renderSummary() {
        var hasComparableRatings = !d.preSkipped && !d.postSkipped;
        var shift = hasComparableRatings ? d.pre - d.post : null;
        var headline;
        var detail;
        if (!hasComparableRatings) {
          headline = 'Reset complete.';
          detail = 'A number is optional. Your word-based reflection is enough to help you notice personal preferences over time.';
        } else if (shift > 0) {
          headline = 'Your rating moved down by ' + shift + '.';
          detail = 'That is one snapshot, not a test result. Notice whether this practice is worth keeping in your toolkit.';
        } else if (shift < 0) {
          headline = 'Your rating moved up by ' + Math.abs(shift) + '.';
          detail = 'This may not be the right practice today. Choose a different option next time, and stop or seek support if discomfort continues.';
        } else {
          headline = 'Your rating stayed the same.';
          detail = 'No noticeable change is useful information. You can try a still, movement, or eyes-open option next time.';
        }
        return h('div', { style: { display: 'grid', gap: 16, maxWidth: 650, margin: '0 auto' } },
          h('div', { style: cardStyle({ textAlign: 'center', padding: 24, background: colors.panelAlt }) },
            h('div', { 'aria-hidden': 'true', style: { color: colors.accent, fontSize: 40, marginBottom: 8 } }, '\u2713'),
            h('h3', { style: { margin: '0 0 8px', color: colors.text, fontSize: 23 } }, 'Reset recorded'),
            h('p', { style: { margin: 0, color: colors.accent, fontSize: 18, fontWeight: 850 } }, headline),
            h('p', { style: { margin: '9px auto 0', maxWidth: 480, color: colors.muted, fontSize: 13, lineHeight: 1.55 } }, detail)
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 } },
            h('div', { style: cardStyle({ textAlign: 'center', padding: 12 }) }, h('div', { style: { color: colors.muted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' } }, 'Before'), h('div', { style: { color: colors.text, fontSize: d.preSkipped ? 14 : 25, fontWeight: 900, marginTop: d.preSkipped ? 7 : 0 } }, ratingDisplay(d.preSkipped ? null : d.pre))),
            h('div', { style: cardStyle({ textAlign: 'center', padding: 12 }) }, h('div', { style: { color: colors.muted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' } }, 'After'), h('div', { style: { color: colors.text, fontSize: d.postSkipped ? 14 : 25, fontWeight: 900, marginTop: d.postSkipped ? 7 : 0 } }, ratingDisplay(d.postSkipped ? null : d.post))),
            h('div', { style: cardStyle({ textAlign: 'center', padding: 12 }) }, h('div', { style: { color: colors.muted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' } }, 'Noticed'), h('div', { style: { color: colors.text, fontSize: 12, fontWeight: 850, marginTop: 7 } }, responseLabel(d.response)))
          ),
          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              onClick: function() { setToolState({ view: 'checkin', preSkipped: false, postSkipped: false, response: null, repeatProtocol: null, showAll: false }); },
              style: primaryButton({ flex: '1 1 210px' })
            }, 'Start another check-in'),
            h('button', {
              type: 'button',
              onClick: function() { setToolState({ view: 'history' }); },
              style: secondaryButton({ flex: '1 1 170px' })
            }, 'View history')
          )
        );
      }

      function renderRemovalConfirm() {
        if (!removalAction) return null;
        var clearingAll = removalAction.type === 'all';
        var title = clearingAll ? 'Remove all reset history?' : 'Remove this reset entry?';
        var description = clearingAll
          ? 'This permanently removes all ' + d.logs.length + ' private reset entries from this SEL project. This cannot be undone.'
          : 'This permanently removes the saved ' + (removalAction.protocolName || 'body reset') + ' entry from this SEL project. This cannot be undone.';
        return h('div', {
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'somatic-reset-remove-title',
          'aria-describedby': 'somatic-reset-remove-description',
          onKeyDown: handleRemovalDialogKeyDown,
          style: {
            position: 'fixed',
            inset: 0,
            zIndex: 10003,
            background: 'rgba(15,23,42,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }
        },
          h('div', { style: cardStyle({ width: '100%', maxWidth: 500, padding: 22, border: '2px solid ' + colors.danger, background: colors.panel }) },
            h('h3', { id: 'somatic-reset-remove-title', style: { margin: '0 0 8px', color: colors.text, fontSize: 19 } }, title),
            h('p', { id: 'somatic-reset-remove-description', style: { margin: '0 0 18px', color: colors.muted, fontSize: 13, lineHeight: 1.6 } }, description),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } },
              h('button', {
                ref: confirmCancelRef,
                type: 'button',
                'data-primary-action': 'true',
                onClick: closeRemovalConfirm,
                style: secondaryButton()
              }, 'Cancel'),
              h('button', {
                type: 'button',
                onClick: commitHistoryRemoval,
                style: secondaryButton({ borderColor: colors.danger, background: colors.dangerBg, color: colors.danger, fontWeight: 850 })
              }, clearingAll ? 'Remove all history' : 'Remove entry')
            )
          )
        );
      }

      function renderHistory() {
        var total = d.logs.length;
        var pattern = personalHistoryPattern(d.logs);
        var comparable = d.logs.map(comparableShift).filter(function(shift) { return shift !== null; });
        var sum = comparable.reduce(function(acc, shift) { return acc + shift; }, 0);
        var average = comparable.length ? sum / comparable.length : 0;
        var averageLabel = comparable.length
          ? (average > 0 ? 'Down ' + average.toFixed(1) : (average < 0 ? 'Up ' + Math.abs(average).toFixed(1) : 'No change'))
          : 'Not rated';
        return h('div', { style: { display: 'grid', gap: 16 } },
          h('div', { style: cardStyle({ background: colors.panelAlt }) },
            h('h3', { id: 'somatic-reset-history-title', ref: historyHeadingRef, tabIndex: -1, style: { margin: '0 0 6px', color: colors.text, fontSize: 20 } }, 'Your private reset history'),
            h('p', { style: { margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.55 } }, 'Look for personal preferences, not a diagnosis or proof that a practice works for everyone. The newest 30 entries are kept, and you can remove them here.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 } },
            h('div', { style: cardStyle({ textAlign: 'center' }) }, h('div', { style: { color: colors.accent, fontSize: 27, fontWeight: 900 } }, total), h('div', { style: { color: colors.muted, fontSize: 11, fontWeight: 800 } }, 'Saved sessions')),
            h('div', { style: cardStyle({ textAlign: 'center' }) }, h('div', { style: { color: colors.accent, fontSize: 23, fontWeight: 900 } }, averageLabel), h('div', { style: { color: colors.muted, fontSize: 11, fontWeight: 800 } }, 'Average rating shift' + (comparable.length ? ' (' + comparable.length + ' rated)' : ''))),
            h('div', { style: cardStyle({ textAlign: 'center' }) }, h('div', { style: { color: colors.accent, fontSize: 14, fontWeight: 900, minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, mostUsedName(d.logs)), h('div', { style: { color: colors.muted, fontSize: 11, fontWeight: 800 } }, 'Most used'))
          ),
          pattern && h('aside', { style: cardStyle({ background: colors.panelAlt }) },
            h('div', { style: { color: colors.accent, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 } }, 'Personal pattern (not a conclusion)'),
            h('p', { style: { margin: '6px 0 0', color: colors.text, fontSize: 13, lineHeight: 1.55 } }, pattern)
          ),
          total === 0
            ? h('div', { style: cardStyle({ textAlign: 'center', padding: 26 }) },
                h('p', { style: { margin: '0 0 14px', color: colors.muted, fontSize: 14 } }, 'No reset reflections saved yet.'),
                h('button', { type: 'button', onClick: function() { setToolState({ view: 'checkin', preSkipped: false, postSkipped: false }); }, style: primaryButton() }, 'Start a check-in')
              )
            : h('div', { style: { display: 'grid', gap: 9 } }, d.logs.slice(0, 10).map(function(log, logIndex) {
                var shift = comparableShift(log);
                var preRating = optionalRating(log.pre);
                var postRating = optionalRating(log.post);
                var ratingSummary;
                if (preRating === null && postRating === null) ratingSummary = 'Rating skipped';
                else if (preRating === null) ratingSummary = 'Before skipped | after ' + postRating;
                else if (postRating === null) ratingSummary = 'Before ' + preRating + ' | after skipped';
                else ratingSummary = preRating + ' \u2192 ' + postRating + (shift > 0 ? '  (-' + shift + ')' : (shift < 0 ? '  (+' + Math.abs(shift) + ')' : ''));
                return h('article', { key: log.id || log.completedAt || logIndex, style: cardStyle({ padding: 13 }) },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' } },
                    h('div', null,
                      h('h4', { style: { margin: 0, color: colors.text, fontSize: 14 } }, log.protocolName || 'Body reset'),
                      h('p', { style: { margin: '4px 0 0', color: colors.muted, fontSize: 11 } }, (log.zoneLabel || 'Whole body') + '  |  ' + dateLabel(log.completedAt))
                    ),
                    h('div', { style: { color: shift !== null && shift > 0 ? colors.accent : colors.text, fontSize: 13, fontWeight: 900 } }, ratingSummary)
                  ),
                  h('div', { style: { marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                    h('span', { style: { color: colors.muted, fontSize: 11 } }, responseLabel(log.response) + '  |  ' + formatTime(log.durationSec || 0) + ' practiced'),
                    h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap' } },
                      h('button', {
                        type: 'button',
                        onClick: function() { prepareRepeat(log); },
                        style: secondaryButton({ minHeight: 34, padding: '6px 10px', fontSize: 11 })
                      }, 'Use for a new check-in'),
                      h('button', {
                        type: 'button',
                        onClick: function(event) {
                          openRemovalConfirm(event, {
                            type: 'entry',
                            logId: log.id || null,
                            logIndex: logIndex,
                            protocolName: log.protocolName || 'body reset'
                          });
                        },
                        'aria-label': 'Remove ' + (log.protocolName || 'body reset') + ' history entry',
                        style: secondaryButton({ minHeight: 34, padding: '6px 10px', fontSize: 11, borderColor: colors.danger, color: colors.danger })
                      }, 'Remove')
                    )
                  )
                );
              })),
          total > 0 && h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
            h('button', {
              type: 'button',
              onClick: function(event) { openRemovalConfirm(event, { type: 'all' }); },
              'aria-label': 'Remove all private reset history',
              style: secondaryButton({ borderColor: colors.danger, background: colors.dangerBg, color: colors.danger })
            }, 'Remove all history')
          )
        );
      }

      var visuallyHidden = {
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
        border: 0
      };

      var content;
      if (d.view === 'choose') content = renderChoose();
      else if (d.view === 'setup') content = renderSetup();
      else if (d.view === 'practice') content = renderPractice();
      else if (d.view === 'after') content = renderAfter();
      else if (d.view === 'summary') content = renderSummary();
      else if (d.view === 'history') content = renderHistory();
      else content = renderCheckin();

      return h('section', {
        role: 'region',
        'aria-label': 'Body and Breath Reset practice',
        'data-sel-tool': TOOL_ID,
        style: {
          maxWidth: 900,
          margin: '0 auto',
          padding: 4,
          color: colors.text,
          background: colors.page
        }
      },
        topNav(),
        h('h3', { ref: viewHeadingRef, tabIndex: -1, style: visuallyHidden }, viewTitle()),
        content,
        renderRemovalConfirm(),
        h('p', {
          style: {
            margin: '18px 0 0',
            paddingTop: 12,
            borderTop: '1px solid ' + colors.border,
            color: colors.muted,
            fontSize: 11,
            lineHeight: 1.5,
            textAlign: 'center'
          }
        }, 'Educational wellbeing practice only. It does not assess posture, explain emotions from body sensations, diagnose a condition, or replace medical or mental-health care.')
      );
    }
  });

})();
}
