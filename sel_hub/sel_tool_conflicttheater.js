// ═══════════════════════════════════════════════════════════════
// sel_tool_conflicttheater.js — Conflict Theater (v0.1 MVP)
//
// Immersive multi-NPC conflict-mediation experience. Two AI
// characters with persistent personalities, body language, and
// emotional state. Student mediates or addresses one character
// at a time. Real-time harmony meter, restorative-principle
// scoring, and three possible endings (resolved / partial /
// deepened).
//
// MVP scope: 1 scene (cafeteria), 1 scenario (stolen lunch money),
// 2 characters. Layered SVG scene + emoji-avatar portraits +
// TTS voicing + safety pipeline integration. Cross-session memory
// + Imagen portraits + full content library land in later phases.
//
// No-AI mode (2026-11-04): scripted branching scenes (CT_SCRIPTS) and a
// student-written scene, both on window.AlloModules.AdventureOffline with
// a built-in fallback. AI parts hide when ctx.aiAvailable is false.
//
// Registered tool ID: "conflicttheater"
// Category: relationship-skills
// Pattern source: sel_tool_peersupport.js (AI character +
//   safety), stem_tool_birdlab.js (layered SVG scene),
//   sel_safety_layer.js (assessSafety / renderCrisisResources).
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ── WCAG: live region for screen-reader announcements ──
  (function() {
    if (document.getElementById('allo-live-conflicttheater')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-conflicttheater';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function announceSR(msg) {
    var el = document.getElementById('allo-live-conflicttheater');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // ── WCAG 2.3.3: Reduced-motion guard + scene CSS ──
  (function() {
    if (document.getElementById('allo-conflicttheater-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-conflicttheater-css';
    st.textContent = [
      '@keyframes ctFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }',
      '@keyframes ctMoodPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }',
      '@keyframes ctFlicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.92; } }',
      '@keyframes ctDustDrift { from { transform: translateX(0) translateY(0); } to { transform: translateX(20px) translateY(-12px); } }',
      '.ct-stage { background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 16px; position: relative; min-height: 320px; overflow: hidden; }',
      '.ct-scene-svg { width: 100%; height: 200px; border-radius: 12px; background: #fef3c7; display: block; }',
      '.ct-portrait { font-size: 56px; line-height: 1; transition: filter 0.3s, transform 0.3s; user-select: none; }',
      '.ct-portrait-listening { filter: brightness(1.05); }',
      '.ct-portrait-upset { filter: hue-rotate(-15deg) saturate(1.2); }',
      '.ct-portrait-closing-down { filter: brightness(0.7) saturate(0.6); }',
      '.ct-portrait-regretful { filter: brightness(0.9) saturate(0.8); }',
      '.ct-portrait-calm { filter: none; }',
      '.ct-bubble { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: #e2e8f0; line-height: 1.5; max-width: 80%; animation: ctFadeIn 0.3s ease-out both; }',
      '.ct-bubble-student { background: #134e4a; border-color: #14b8a6; align-self: flex-end; }',
      '.ct-meter-track { width: 100%; height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden; }',
      '.ct-meter-fill { height: 100%; transition: width 0.5s ease, background 0.5s; border-radius: 4px; }',
      '.ct-flicker { animation: ctFlicker 4s ease-in-out infinite; }',
      '.ct-mood-pulse { animation: ctMoodPulse 0.6s ease-out 1; }',
      '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ── Sound effects (procedural Web Audio) ──
  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || 0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (d || 0.15)); } catch(e) {} }
  function sfxResolve() { tone(523, 0.12, 'sine', 0.05); setTimeout(function() { tone(659, 0.12, 'sine', 0.05); }, 100); setTimeout(function() { tone(784, 0.18, 'sine', 0.06); }, 200); }
  function sfxBreakdown() { tone(220, 0.4, 'sawtooth', 0.04); }

  // ══════════════════════════════════════════════════════════════
  // ── Scenes (layered SVG backdrops) ──
  // ══════════════════════════════════════════════════════════════

  var SCENES = {
    cafeteria: {
      id: 'cafeteria',
      label: 'Cafeteria',
      background: '#fef3c7',
      svg: function(h) {
        return h('svg', { viewBox: '0 0 400 200', className: 'ct-scene-svg', 'aria-hidden': 'true' },
          h('rect', { x: 0, y: 0, width: 400, height: 130, fill: '#fde68a' }),
          h('rect', { x: 0, y: 130, width: 400, height: 70, fill: '#a16207' }),
          h('rect', { x: 60, y: 0, width: 80, height: 8, fill: '#fef9c3', className: 'ct-flicker' }),
          h('rect', { x: 260, y: 0, width: 80, height: 8, fill: '#fef9c3', className: 'ct-flicker', style: { animationDelay: '1.5s' } }),
          h('rect', { x: 30, y: 110, width: 100, height: 8, fill: '#92400e' }),
          h('rect', { x: 270, y: 110, width: 100, height: 8, fill: '#92400e' }),
          h('rect', { x: 35, y: 118, width: 4, height: 25, fill: '#451a03' }),
          h('rect', { x: 121, y: 118, width: 4, height: 25, fill: '#451a03' }),
          h('rect', { x: 275, y: 118, width: 4, height: 25, fill: '#451a03' }),
          h('rect', { x: 361, y: 118, width: 4, height: 25, fill: '#451a03' }),
          h('rect', { x: 170, y: 30, width: 60, height: 60, fill: '#bae6fd', stroke: '#475569', 'stroke-width': 2 }),
          h('line', { x1: 200, y1: 30, x2: 200, y2: 90, stroke: '#475569', 'stroke-width': 2 }),
          h('line', { x1: 170, y1: 60, x2: 230, y2: 60, stroke: '#475569', 'stroke-width': 2 })
        );
      }
    },
    hallway: {
      id: 'hallway',
      label: 'Hallway',
      background: '#e0e7ff',
      svg: function(h) {
        return h('svg', { viewBox: '0 0 400 200', className: 'ct-scene-svg', 'aria-hidden': 'true', style: { background: '#e0e7ff' } },
          // Ceiling
          h('rect', { x: 0, y: 0, width: 400, height: 30, fill: '#c7d2fe' }),
          // Floor (perspective)
          h('polygon', { points: '0,200 400,200 360,140 40,140', fill: '#94a3b8' }),
          // Floor stripe
          h('polygon', { points: '180,200 220,200 215,140 185,140', fill: '#64748b' }),
          // Back wall
          h('rect', { x: 40, y: 30, width: 320, height: 110, fill: '#e0e7ff' }),
          // Locker rows (left)
          h('g', null,
            [0, 1, 2, 3, 4].map(function(i) {
              return h('rect', { key: 'lL' + i, x: 10 + i * 18, y: 50, width: 16, height: 80, fill: '#3b82f6', stroke: '#1e3a8a', 'stroke-width': 1 });
            })
          ),
          // Locker handles (left)
          [0, 1, 2, 3, 4].map(function(i) {
            return h('circle', { key: 'hL' + i, cx: 23 + i * 18, cy: 90, r: 1.5, fill: '#1e3a8a' });
          }),
          // Locker rows (right)
          h('g', null,
            [0, 1, 2, 3, 4].map(function(i) {
              return h('rect', { key: 'lR' + i, x: 312 + i * 18, y: 50, width: 16, height: 80, fill: '#3b82f6', stroke: '#1e3a8a', 'stroke-width': 1 });
            })
          ),
          [0, 1, 2, 3, 4].map(function(i) {
            return h('circle', { key: 'hR' + i, cx: 325 + i * 18, cy: 90, r: 1.5, fill: '#1e3a8a' });
          }),
          // Hanging lights
          h('rect', { x: 180, y: 0, width: 40, height: 6, fill: '#fef9c3', className: 'ct-flicker' }),
          // Trophy case in back wall
          h('rect', { x: 170, y: 50, width: 60, height: 70, fill: '#1e293b', stroke: '#475569', 'stroke-width': 2 }),
          h('rect', { x: 175, y: 55, width: 50, height: 60, fill: '#fef3c7' }),
          h('text', { x: 200, y: 90, 'text-anchor': 'middle', 'font-size': 24, fill: '#a16207' }, '🏆')
        );
      }
    },
    classroom: {
      id: 'classroom',
      label: 'Classroom',
      background: '#dcfce7',
      svg: function(h) {
        return h('svg', { viewBox: '0 0 400 200', className: 'ct-scene-svg', 'aria-hidden': 'true', style: { background: '#dcfce7' } },
          // Wall
          h('rect', { x: 0, y: 0, width: 400, height: 140, fill: '#dcfce7' }),
          // Floor
          h('rect', { x: 0, y: 140, width: 400, height: 60, fill: '#94a3b8' }),
          // Whiteboard
          h('rect', { x: 100, y: 30, width: 200, height: 80, fill: '#fafafa', stroke: '#475569', 'stroke-width': 2 }),
          // Whiteboard text suggestion
          h('line', { x1: 115, y1: 50, x2: 200, y2: 50, stroke: '#3b82f6', 'stroke-width': 2 }),
          h('line', { x1: 115, y1: 65, x2: 250, y2: 65, stroke: '#1e293b', 'stroke-width': 1 }),
          h('line', { x1: 115, y1: 78, x2: 240, y2: 78, stroke: '#1e293b', 'stroke-width': 1 }),
          h('line', { x1: 115, y1: 91, x2: 220, y2: 91, stroke: '#1e293b', 'stroke-width': 1 }),
          // Posters on wall
          h('rect', { x: 20, y: 40, width: 50, height: 60, fill: '#fbbf24', stroke: '#92400e', 'stroke-width': 1 }),
          h('text', { x: 45, y: 75, 'text-anchor': 'middle', 'font-size': 20 }, '📚'),
          h('rect', { x: 330, y: 40, width: 50, height: 60, fill: '#a78bfa', stroke: '#6d28d9', 'stroke-width': 1 }),
          h('text', { x: 355, y: 75, 'text-anchor': 'middle', 'font-size': 20 }, '🌍'),
          // Desks in foreground
          h('rect', { x: 50, y: 160, width: 70, height: 8, fill: '#92400e' }),
          h('rect', { x: 165, y: 160, width: 70, height: 8, fill: '#92400e' }),
          h('rect', { x: 280, y: 160, width: 70, height: 8, fill: '#92400e' }),
          // Desk legs
          [50, 117, 165, 232, 280, 347].map(function(x, i) {
            return h('rect', { key: 'dl' + i, x: x, y: 168, width: 3, height: 22, fill: '#451a03' });
          }),
          // Hanging lights
          h('rect', { x: 60, y: 0, width: 80, height: 6, fill: '#fef9c3', className: 'ct-flicker' }),
          h('rect', { x: 260, y: 0, width: 80, height: 6, fill: '#fef9c3', className: 'ct-flicker', style: { animationDelay: '2s' } })
        );
      }
    },
    'locker-room': {
      id: 'locker-room',
      label: 'Locker Room',
      background: '#cffafe',
      svg: function(h) {
        return h('svg', { viewBox: '0 0 400 200', className: 'ct-scene-svg', 'aria-hidden': 'true', style: { background: '#cffafe' } },
          // Wall (tile pattern)
          h('rect', { x: 0, y: 0, width: 400, height: 140, fill: '#cffafe' }),
          // Tile lines on wall
          h('g', { stroke: '#67e8f9', 'stroke-width': 0.5 },
            [20, 40, 60, 80, 100, 120].map(function(y) {
              return h('line', { key: 'tl' + y, x1: 0, y1: y, x2: 400, y2: y });
            }),
            [40, 80, 120, 160, 200, 240, 280, 320, 360].map(function(x) {
              return h('line', { key: 'tv' + x, x1: x, y1: 0, x2: x, y2: 140 });
            })
          ),
          // Floor (tile)
          h('rect', { x: 0, y: 140, width: 400, height: 60, fill: '#475569' }),
          // Locker bank back
          h('rect', { x: 80, y: 20, width: 240, height: 100, fill: '#0891b2' }),
          // Individual lockers
          [80, 110, 140, 170, 200, 230, 260, 290].map(function(x, i) {
            return h('g', { key: 'lk' + i },
              h('rect', { x: x + 1, y: 22, width: 28, height: 96, fill: '#0e7490', stroke: '#164e63', 'stroke-width': 0.5 }),
              h('rect', { x: x + 5, y: 30, width: 6, height: 12, fill: '#1e293b' }),
              h('circle', { cx: x + 22, cy: 70, r: 1.5, fill: '#fde047' })
            );
          }),
          // Bench in foreground
          h('rect', { x: 60, y: 165, width: 280, height: 10, fill: '#a16207' }),
          h('rect', { x: 80, y: 175, width: 6, height: 18, fill: '#451a03' }),
          h('rect', { x: 314, y: 175, width: 6, height: 18, fill: '#451a03' }),
          // Hanging lights
          h('rect', { x: 150, y: 0, width: 100, height: 5, fill: '#fef9c3', className: 'ct-flicker' })
        );
      }
    },
    online: {
      id: 'online',
      label: 'Online (Phone)',
      background: '#1e293b',
      svg: function(h) {
        return h('svg', { viewBox: '0 0 400 200', className: 'ct-scene-svg', 'aria-hidden': 'true', style: { background: '#0f172a' } },
          // Background gradient feel via two rects
          h('rect', { x: 0, y: 0, width: 400, height: 200, fill: '#0f172a' }),
          // Stylized phone screen frame
          h('rect', { x: 100, y: 10, width: 200, height: 180, rx: 20, fill: '#1e293b', stroke: '#475569', 'stroke-width': 3 }),
          h('rect', { x: 110, y: 30, width: 180, height: 150, fill: '#020617' }),
          // Notch at top
          h('rect', { x: 170, y: 14, width: 60, height: 8, rx: 4, fill: '#000' }),
          // Status bar
          h('rect', { x: 110, y: 30, width: 180, height: 12, fill: '#1e293b' }),
          h('text', { x: 120, y: 39, 'font-size': 8, fill: '#94a3b8' }, '9:42'),
          h('text', { x: 270, y: 39, 'font-size': 8, fill: '#94a3b8' }, '🔋'),
          // Chat header
          h('rect', { x: 110, y: 42, width: 180, height: 18, fill: '#312e81' }),
          h('text', { x: 200, y: 54, 'text-anchor': 'middle', 'font-size': 9, fill: '#fef3c7', 'font-weight': 'bold' }, '◀ Group Chat'),
          // Faux chat bubbles (faded — characters render on top)
          h('rect', { x: 120, y: 70, width: 80, height: 14, rx: 6, fill: '#334155', opacity: 0.5 }),
          h('rect', { x: 200, y: 90, width: 80, height: 14, rx: 6, fill: '#1e40af', opacity: 0.5 }),
          h('rect', { x: 120, y: 110, width: 100, height: 14, rx: 6, fill: '#334155', opacity: 0.5 }),
          h('rect', { x: 200, y: 130, width: 80, height: 14, rx: 6, fill: '#1e40af', opacity: 0.5 }),
          // Floating dust motes (ambient)
          h('circle', { cx: 50, cy: 50, r: 1.5, fill: '#475569', opacity: 0.6 }),
          h('circle', { cx: 350, cy: 80, r: 1.5, fill: '#475569', opacity: 0.6 }),
          h('circle', { cx: 30, cy: 120, r: 1.5, fill: '#475569', opacity: 0.6 }),
          h('circle', { cx: 370, cy: 150, r: 1.5, fill: '#475569', opacity: 0.6 })
        );
      }
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Cast (8 archetypes pluggable; 2 in MVP) ──
  // ══════════════════════════════════════════════════════════════

  var CAST = {
    'maya': {
      id: 'maya',
      name: 'Maya',
      age: 12,
      avatar: '👩🏽',
      backstory: 'Seventh grader. Single mom works two jobs; lunch money is a real budget item. Soft-spoken at school, intensely loyal to her small friend group.',
      archetype: 'withdrawn',
      bodyVocab: { calm: 'arms relaxed', upset: 'arms crossed, looking at table', 'closing-down': 'turned slightly away', listening: 'leaning slightly forward', regretful: 'shoulders soft, eye contact returning' },
      voice: 'Aoede',
      speechPattern: 'speaks quietly, uses short sentences, sometimes trails off when overwhelmed',
      visualDescription: 'a 12-year-old Latina middle-schooler with shoulder-length wavy brown hair, modest school clothes, soft warm features'
    },
    'jordan': {
      id: 'jordan',
      name: 'Jordan',
      age: 12,
      avatar: '👨🏼',
      backstory: 'Seventh grader. Class clown reputation hides anxiety about looking poor. Family recently lost income, eats school breakfast. Took the money on impulse, has not admitted it.',
      archetype: 'defensive',
      bodyVocab: { calm: 'casual posture', upset: 'arms crossed, jaw set', 'closing-down': 'looking away, small shrugs', listening: 'eye contact returning, less rigid', regretful: 'head down, voice softer' },
      voice: 'Puck',
      speechPattern: 'fast, sometimes sarcastic when defensive, gets quieter when actually heard',
      visualDescription: 'a 12-year-old white middle-schooler boy with short sandy-brown hair, casual school clothes (t-shirt, hoodie), boyish features'
    },
    'aria': {
      id: 'aria',
      name: 'Aria',
      age: 13,
      avatar: '👩🏻',
      backstory: 'Eighth grader. Recent immigrant from Iran, English is her third language. Reads social cues differently sometimes, often misread as standoffish when she is actually concentrating on parsing the conversation. Her quiet is mistaken for rudeness.',
      archetype: 'anxious',
      bodyVocab: { calm: 'open posture, watchful', upset: 'shoulders up, looking at hands', 'closing-down': 'long pause, eyes down', listening: 'small nods, leaning in', regretful: 'soft sigh, eye contact returning' },
      voice: 'Leda',
      speechPattern: 'careful word choice, sometimes pauses to find a word, occasional softer English than her thoughts',
      visualDescription: 'a 13-year-old Iranian girl with long dark hair pulled back into a low ponytail, modest school clothes (cardigan over a t-shirt), thoughtful watchful eyes'
    },
    'devon': {
      id: 'devon',
      name: 'Devon',
      age: 13,
      avatar: '👨🏿',
      backstory: 'Eighth grader. Star of the basketball team, known for big reactions. Father was incarcerated last year, has not told most friends. Frustration comes fast, regret comes slower but real.',
      archetype: 'frustrated',
      bodyVocab: { calm: 'relaxed but watchful', upset: 'tense shoulders, closed fists', 'closing-down': 'turning away, jaw set', listening: 'unclenching hands, looking up', regretful: 'softer face, head down' },
      voice: 'Fenrir',
      speechPattern: 'short sentences when angry, longer ones when calm, sometimes drops volume when really listening',
      visualDescription: 'a 13-year-old Black middle-schooler boy with short fade haircut, athletic build, school basketball team t-shirt, expressive eyes'
    },
    'sam': {
      id: 'sam',
      name: 'Sam',
      age: 14,
      avatar: '🧑🏼',
      backstory: 'Eighth grader. Nonbinary, uses they/them. Came out at school last year. Most people are kind, a few are not. Avoids conflict because confrontations have gone badly before. Wants to be seen, scared of being seen.',
      archetype: 'conflict-avoidant',
      bodyVocab: { calm: 'arms loose, half-smile', upset: 'wrapping arms around self', 'closing-down': 'almost whispered words, looking past you', listening: 'small steady nods', regretful: 'meeting your eyes, voice steadier' },
      voice: 'Zephyr',
      speechPattern: 'thoughtful, sometimes apologetic before stating a real need, gets clearer when supported',
      visualDescription: 'a 14-year-old white nonbinary teen with short choppy haircut, casual gender-neutral school clothes (button-up over t-shirt), gentle features'
    },
    'riley': {
      id: 'riley',
      name: 'Riley',
      age: 12,
      avatar: '👧🏼',
      backstory: 'Seventh grader. Center of a popular friend group. Performs confidence, actually deeply anxious about losing status. Spreads rumors when feeling threatened. Has not learned that the popularity she fights for costs her real friendships.',
      archetype: 'manipulative',
      bodyVocab: { calm: 'poised, slight smirk', upset: 'eye roll, hand on hip', 'closing-down': 'fake laugh, looking at phone', listening: 'softer face, real curiosity flickering', regretful: 'rare moment of stillness' },
      voice: 'Kore',
      speechPattern: 'breezy and dismissive on the surface, occasional cracks where the anxiety shows',
      visualDescription: 'a 12-year-old white middle-schooler girl with long blonde hair, trendy school clothes (cropped sweater, layered necklaces), poised expression'
    },
    'theo': {
      id: 'theo',
      name: 'Theo',
      age: 13,
      avatar: '👨🏻',
      backstory: 'Eighth grader. Autistic (identity-first, explicitly). Brilliant about topics he loves, finds small talk effortful. Often misreads tone or is misread by others. Direct in a way that lands wrong sometimes, lands true other times.',
      archetype: 'withdrawn',
      bodyVocab: { calm: 'still, focused gaze on objects rather than faces', upset: 'rocking slightly, hands together', 'closing-down': 'silence, eyes elsewhere', listening: 'occasional precise eye contact', regretful: 'still, then carefully spoken words' },
      voice: 'Charon',
      speechPattern: 'literal, precise, sometimes longer pauses than expected, often more honest than the room is ready for',
      visualDescription: 'a 13-year-old white autistic boy with neat short brown hair, button-up shirt over t-shirt, thoughtful expression with gaze slightly off-center'
    },
    'casey': {
      id: 'casey',
      name: 'Casey',
      age: 13,
      avatar: '👧🏾',
      backstory: 'Eighth grader. In her third foster placement this year. Has built a hard outer shell because nothing stays. Hyper-vigilant about exclusion, snaps quickly at anything that looks like rejection. Fiercely loyal to the few who have stuck around.',
      archetype: 'frustrated',
      bodyVocab: { calm: 'guarded but present', upset: 'jaw set, eyes flashing', 'closing-down': 'turning whole body away', listening: 'softening but still watchful', regretful: 'a long exhale, voice quieter' },
      voice: 'Orus',
      speechPattern: 'sharp when defensive, slower when believed, sometimes a small joke when starting to trust',
      visualDescription: 'a 13-year-old Black middle-schooler girl with long box braids pulled back, hoodie or layered casual school clothes, watchful guarded eyes'
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Portrait generation (Imagen + image-edit pipeline) ──
  // Pattern from personas_module.js (generateCharacterPortrait +
  // updatePersonaImageReaction). Base portrait via callImagen,
  // mood variants via window.callGeminiImageEdit with identity-
  // preserving prompts. Cached per (characterId × mood) on toolData.
  // ══════════════════════════════════════════════════════════════

  var ART_STYLE = 'warm watercolor illustration in the style of a contemporary middle-grade book cover, soft palette, friendly age-appropriate, neutral background';

  var MOOD_VISUAL = {
    'calm':         'looking calmly forward, relaxed posture, neutral expression',
    'upset':        'looking upset and frustrated, brow slightly furrowed, posture tense, arms perhaps crossed',
    'closing-down': 'looking down or away, withdrawn, body slightly turned, eyes guarded',
    'listening':    'leaning slightly forward, eyes attentive and softer, present and engaged',
    'regretful':    'softer eyes, head slightly down, regret showing on the face, body language softer'
  };

  function _basePortraitPrompt(char) {
    return 'Portrait of ' + char.visualDescription + '. ' + (MOOD_VISUAL.calm) + '. Style: ' + ART_STYLE + '. Centered composition. STRICTLY NO TEXT, no letters, no watermarks, no speech bubbles.';
  }

  function _moodEditPrompt(char, mood) {
    return 'Edit this character portrait to show them ' + (MOOD_VISUAL[mood] || MOOD_VISUAL.calm) + '.\n'
      + 'Guidelines:\n'
      + '1. KEEP IDENTITY: Maintain the exact same character features, hair, clothing, ethnicity, age (' + char.visualDescription + ').\n'
      + '2. ALLOW EXPRESSION CHANGE: Change pose, head angle, eye direction, and facial expression to match.\n'
      + '3. STRICTLY NO TEXT: No letters, no words, no speech bubbles, no watermarks.\n'
      + '4. Keep the warm illustration style consistent.';
  }

  // ══════════════════════════════════════════════════════════════
  // ── Scenarios ──
  // ══════════════════════════════════════════════════════════════

  var SCENARIOS = {
    'lunch-money': {
      id: 'lunch-money',
      title: 'The Missing Lunch Money',
      sceneId: 'cafeteria',
      setup: 'Maya\'s lunch money disappeared from her backpack during gym. She is sure Jordan took it, they were the last one near her locker. Jordan denies it. Both are at the cafeteria table now. You are a mediator who knew them both before this.',
      characterIds: ['maya', 'jordan'],
      characterRoles: { maya: 'the one who was harmed', jordan: 'the one accused (and who actually did it)' },
      initialHarmony: 18,
      initialMoods: { maya: 'upset', jordan: 'closing-down' },
      coachingNotes: [
        'Acknowledging Maya\'s loss without immediately demanding Jordan confess opens space.',
        'Asking Jordan what is going on (not "why did you do it") gives an opening to admit it.',
        'Naming the impact (not just the act) often unlocks accountability.',
        'A repair plan is the goal, not just "I\'m sorry."'
      ]
    },
    'spread-rumor': {
      id: 'spread-rumor',
      title: 'The Rumor That Got Out',
      sceneId: 'hallway',
      setup: 'Sam told Riley something private last week, that they had been crying at home about their parents fighting. Today Riley repeated it to two other people. Sam just heard about it from a third party. You catch them at the lockers between classes.',
      characterIds: ['sam', 'riley'],
      characterRoles: { sam: 'the one whose private information was shared', riley: 'the one who shared it' },
      initialHarmony: 22,
      initialMoods: { sam: 'closing-down', riley: 'upset' },
      coachingNotes: [
        'Sam needs their hurt named, not minimized as drama.',
        'Riley\'s defensiveness often hides the same fear of being talked about. Curiosity unlocks more than confrontation.',
        'Trust is the harm here. Repair includes thinking about what stays private going forward.',
        '"Nothing happened, it\'s not a big deal" is a tell that real listening hasn\'t happened yet.'
      ]
    },
    'excluded-project': {
      id: 'excluded-project',
      title: 'The Group Project Cut',
      sceneId: 'classroom',
      setup: 'Theo was in a four-person science project group. The other three met without him over the weekend, redid the slides, and presented today, taking credit for his original ideas. Devon was one of the three. They are both staying after class to clean up. You teach the next-period study hall and see what happened.',
      characterIds: ['theo', 'devon'],
      characterRoles: { theo: 'the one excluded and uncredited', devon: 'one of the three who excluded him' },
      initialHarmony: 20,
      initialMoods: { theo: 'closing-down', devon: 'upset' },
      coachingNotes: [
        'Theo may speak in a way that lands flat or precise. That is communication, not coldness.',
        'Devon\'s frustration may be loudest, but the harm is on Theo\'s side. Validate first, then redirect.',
        'Exclusion of an autistic peer is a pattern worth naming explicitly without making Theo a teaching example.',
        'Repair here might involve credit and a different process for next time, not just an apology.'
      ]
    },
    'misgender-on-purpose': {
      id: 'misgender-on-purpose',
      title: 'The Pronoun That Was Not An Accident',
      sceneId: 'locker-room',
      setup: 'Sam came out as nonbinary at school last year and uses they/them. Casey has been using "she" for Sam loudly in front of friends, then claiming "I forgot" each time. Today Sam asked Casey to stop and Casey laughed. You walk in just after.',
      characterIds: ['sam', 'casey'],
      characterRoles: { sam: 'the one being repeatedly misgendered', casey: 'the one doing it on purpose' },
      initialHarmony: 12,
      initialMoods: { sam: 'closing-down', casey: 'upset' },
      contentWarning: 'This scenario involves transphobia and identity-targeting harm. The dialogue may include misgendering as part of the realism. If you are not in a place to engage with that today, choose a different scenario.',
      coachingNotes: [
        'Identity-targeting harm is not "just a misunderstanding." Naming it as a pattern matters.',
        'Casey\'s "I forgot" defense is often armor for something else. Curiosity, not interrogation, sometimes opens it.',
        'Sam needs the harm acknowledged, not solved for them.',
        'A repair plan that puts the work on Casey to remember (not on Sam to keep correcting) shifts the load.'
      ]
    },
    'took-credit': {
      id: 'took-credit',
      title: 'The Idea That Wasn\'t Hers',
      sceneId: 'classroom',
      setup: 'Aria pitched a project idea in a small group last week. Riley took it to the teacher today as her own and got recognized in front of the whole class. Aria heard her get praised for it. They are both at desks after the bell. You sit nearby.',
      characterIds: ['aria', 'riley'],
      characterRoles: { aria: 'the one whose work was taken', riley: 'the one who took credit' },
      initialHarmony: 25,
      initialMoods: { aria: 'upset', riley: 'calm' },
      coachingNotes: [
        'Aria may be quieter about her hurt than the situation deserves. Make space for her words.',
        'Riley\'s "I didn\'t mean it that way" often dodges the impact. The impact is what matters here.',
        'Credit theft is a real harm even when no rule was technically broken.',
        'A real repair would include a public correction, not just a private apology.'
      ]
    },
    'screenshot-betrayal': {
      id: 'screenshot-betrayal',
      title: 'The Screenshot That Got Sent',
      sceneId: 'online',
      setup: 'Devon vented to Maya in DMs last night about Coach being unfair. Maya screenshotted it and sent it to a group chat. Coach saw it through another student. Devon got benched today. They are typing at each other in chat now. You are in the group chat too.',
      characterIds: ['maya', 'devon'],
      characterRoles: { maya: 'the one who shared the screenshot', devon: 'the one whose private message was shared' },
      initialHarmony: 15,
      initialMoods: { devon: 'upset', maya: 'closing-down' },
      coachingNotes: [
        'Devon\'s frustration is real and the consequences are real. Acknowledge before redirecting.',
        'Maya may not have understood the harm, may have, or may be somewhere in between. Curiosity surfaces it.',
        'Online repair needs an online component, deletion, correction in the same chat.',
        'Trust about what stays private is the underlying harm. That is what needs naming.'
      ]
    },
    'eating-alone': {
      id: 'eating-alone',
      title: 'The Lunch Table That Filled Up',
      sceneId: 'cafeteria',
      setup: 'Casey usually eats with Riley\'s group. The last two days the seats have been "saved" when she got there. She ate alone yesterday and again today. Riley\'s group made eye contact and said nothing. You sit down next to Casey today, then Riley walks over.',
      characterIds: ['casey', 'riley'],
      characterRoles: { casey: 'the one being quietly excluded', riley: 'the one orchestrating the exclusion' },
      initialHarmony: 16,
      initialMoods: { casey: 'closing-down', riley: 'calm' },
      coachingNotes: [
        'Casey\'s shell is thicker because of what she carries outside this lunchroom. Trust comes slow.',
        'Riley\'s "we just didn\'t notice" is rarely true. Naming the pattern matters.',
        'Quiet exclusion is one of the harder harms to call out and one of the most damaging.',
        'Repair here might be small and consistent rather than dramatic. A real seat saved tomorrow.'
      ]
    },
    'racist-remark': {
      id: 'racist-remark',
      title: 'The "Joke" That Wasn\'t',
      sceneId: 'locker-room',
      setup: 'Jordan made a joke about Aria\'s hair in the locker room yesterday using a racial stereotype. He thought it was harmless and that everyone laughed. Aria did not laugh. She told a teacher today and the teacher asked you to help facilitate a conversation between them.',
      characterIds: ['aria', 'jordan'],
      characterRoles: { aria: 'the one targeted by a racist joke', jordan: 'the one who made it (and thinks it was fine)' },
      initialHarmony: 14,
      initialMoods: { aria: 'closing-down', jordan: 'upset' },
      contentWarning: 'This scenario involves racism, framed as a "joke." The dialogue may include the kind of language that gets normalized in middle and high school. If you are not in a place to engage with that today, choose a different scenario.',
      coachingNotes: [
        'Aria\'s hurt is the center of this conversation. Do not let Jordan\'s defensiveness pull focus.',
        '"It was just a joke" is the most common deflection. Impact, not intent, is the lesson.',
        'Jordan may genuinely not have known. That does not make Aria\'s hurt less real.',
        'Real repair includes Jordan understanding why it landed the way it did, and committing not to repeat the pattern.'
      ]
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Scripted scenes (no AI, 2026-11-04) ──
  // One branching script per scenario in the shared AdventureOffline story
  // format, played with AlloModules.AdventureOffline.Player (built-in
  // fallback below). Braided: branches rejoin. Every choice shows how the
  // other person reacts; every ending closes with a short debrief. English
  // content, like the rest of this tool's scenario data.
  // Rows: [id, text, [[choice label, to], ...]]; a row with no choices is an ending.
  // ══════════════════════════════════════════════════════════════

  function _ctScript(title, rows) {
    return { version: 1, title: title, start: rows[0][0], scenes: rows.map(function(r) {
      return r[2]
        ? { id: r[0], text: r[1], ending: false, choices: r[2].map(function(c) { return { label: c[0], to: c[1] }; }) }
        : { id: r[0], text: r[1], ending: true, choices: [] };
    }) };
  }

  var CT_SCRIPTS = {
    'lunch-money': _ctScript('The Missing Lunch Money', [
      ['start', "Maya sits with her arms crossed, staring at the table. Jordan is across from her, looking at his phone. 'My lunch money was in my backpack before gym,' Maya says quietly. 'Now it's gone. And Jordan was the last one by my locker.' Jordan shrugs. 'Wasn't me.' They both look at you.", [
        ["'Jordan, just admit it. Everyone knows it was you.'", 'heated'],
        ["'Maya, that sounds really stressful. Can you tell me what happened?'", 'open'],
        ["'Relax, it's just lunch money. I'll split my fries with you.'", 'joke']]],
      ['open', "Maya's shoulders drop a little. 'I had exactly enough for the week. I checked this morning. Now I can't eat today, and I don't know how to tell my mom.' Jordan puts his phone down. He is looking at the table now.", [
        ["'Okay, let's just search Jordan's bag and settle it.'", 'stuck'],
        ["'So you're worried about today and about telling your mom. That's a lot.'", 'heard']]],
      ['heated', "Jordan's jaw sets. 'Wow. So I'm guilty because I walked past a locker?' He pushes his tray away. Maya looks down; this is not the conversation she wanted either. Kids at the next table turn to watch.", [
        ["'You're right, that came out wrong. I'm not here to accuse anyone. I want to understand what happened.'", 'reset'],
        ["'If you didn't do it, why are you so mad?'", 'stuck']]],
      ['joke', "Nobody laughs. Maya's eyes get shiny and she turns away. 'It's not just lunch money to me,' she says. Jordan gives a small, uneasy laugh, then goes quiet.", [
        ["'Sorry, Maya. That wasn't funny. I want to actually listen.'", 'reset'],
        ['Shrug and change the subject.', 'end_pause']]],
      ['reset', "The table gets quieter. Maya uncrosses her arms. Jordan pulls his tray back and stops glancing at the door. Owning your words changed the feeling at the table: both of them seem more willing to talk.", [
        ['Ask Maya how this has affected her day.', 'heard'],
        ['Ask Jordan, gently, if there is anything he wants to say.', 'side']]],
      ['heard', "'Yeah,' Maya says. 'Thanks. I just want it back, and I want to know what happened.' She glances at Jordan, not angry now, just waiting. Jordan rubs the back of his neck.", [
        ["'Jordan, apologize to her. Right now.'", 'stuck'],
        ["'Jordan, nobody is in trouble with me. What's going on for you?'", 'side']]],
      ['side', "Jordan is quiet for a long moment. 'I took it,' he says, barely above a whisper. 'I didn't have lunch money either, and I panicked. I was going to put it back. Then it felt too late.' Maya looks hurt, and also surprised that he told the truth.", [
        ["'Thank you for telling the truth. Jordan, how do you think this affected Maya?'", 'impact'],
        ["'So you're a thief. Great.'", 'stuck']]],
      ['stuck', "Voices get louder. Jordan crosses his arms and stops talking. Maya grabs her backpack like she might leave. Pushing harder is shutting things down instead of opening them up.", [
        ["Slow down: 'Let me try again. Maya, I want to hear how you're doing.'", 'heard'],
        ["'Let's take a break. Maybe we can talk again with the school counselor.'", 'end_pause']]],
      ['impact', "Jordan looks at Maya. 'You couldn't eat today. And you trusted that your stuff was safe.' He swallows. 'I'm really sorry, Maya.' Maya nods slowly. 'Thanks for saying it. I'm still upset, though.'", [
        ["'Great, you said sorry. So we're good now, right?'", 'end_partial'],
        ["'What would help make this right? Let's figure it out together.'", 'end_repair']]],
      ['end_repair', "Jordan gives back what he has left today and offers to pay back the rest by Friday. Maya asks him to tell her next time he is struggling instead of taking something. Together they decide to ask a trusted adult about lunch help for Jordan, so it does not happen again. It isn't perfect, but it is real.\n\nWhat worked:\n• Listening first: Maya felt heard before anyone talked about blame.\n• Curiosity, not accusation, made it safe for Jordan to tell the truth.\n• Naming the impact turned 'sorry' into understanding.\n• A repair plan (pay it back, ask for help) goes further than words alone."],
      ['end_partial', "Jordan nods. Maya says 'sure,' but she doesn't sound sure. The money is still missing, and nothing has been planned to fix it. The conflict cooled down, but it isn't finished.\n\nWhat worked:\n• You listened, and Jordan told the truth. Both are big steps.\n• An apology is a start. Repair usually also needs a plan: what will be made right, and what happens next time?\n• You could still ask: 'What would help make this right?'"],
      ['end_pause', "You stop for now. Maya still looks hurt, and Jordan heads off to class. Nothing is solved yet, but it isn't over: a conflict can be picked back up when everyone is calmer, and a trusted adult, like a teacher or counselor, can help.\n\nWhat worked:\n• Noticing when a talk is going badly, and pausing, is a real skill.\n• Next time, try starting with how the person feels ('That sounds stressful') before asking who did it.\n• An I-statement ('I want to understand what happened') keeps things calmer than a 'you' accusation."]
    ]),
    'spread-rumor': _ctScript('The Rumor That Got Out', [
      ['start', "Sam stands at their locker, holding the door so no one can see their face. Riley walks up laughing with a friend, then stops. 'What? Why is everyone being weird?' Sam says, very quietly: 'You told people. About my parents.'", [
        ["'Ha, Riley, you can never keep a secret.'", 'joke'],
        ["'Sam, you look really upset. Do you want to tell me what happened?'", 'open'],
        ["'Riley, why would you do that? That's so mean.'", 'heated']]],
      ['open', "Sam takes a shaky breath. 'I told Riley something private last week. Today two people asked me about it. It felt like everyone was looking at me.' Riley's smile fades. She looks at the floor.", [
        ["'That sounds embarrassing and lonely. You trusted her, and it got out.'", 'heard'],
        ["'Rumors die down fast. Just ignore them.'", 'stuck']]],
      ['heated', "Riley rolls her eyes and puts a hand on her hip. 'Oh my gosh, it's not a big deal. I barely said anything.' Sam shuts the locker and turns away. People in the hallway slow down to watch.", [
        ["'It IS a big deal. You always do this.'", 'stuck'],
        ["'Sorry, that sounded like an attack. I'm not trying to gang up on you, Riley. I want to understand.'", 'reset']]],
      ['joke', "Riley laughs, but Sam doesn't. Sam's voice gets even quieter: 'Okay. Never mind.' They start to walk away.", [
        ["'Wait, Sam, I'm sorry. That wasn't funny. I want to hear you.'", 'reset'],
        ['Let Sam go.', 'end_pause']]],
      ['reset', "Sam stops walking. Riley's hand drops from her hip. The hallway is still loud, but the three of you feel a little more like a team than a fight.", [
        ['Ask Riley what was going on when she shared it.', 'side'],
        ['Ask Sam how this has felt.', 'heard']]],
      ['heard', "Sam nods. 'Yeah. It felt like my private stuff became a joke.' They look at Riley. 'I just want to know why.' Riley shifts her weight; she isn't laughing anymore.", [
        ["'Riley, can you tell us what was going on for you?'", 'side'],
        ["'Riley, you need to fix this right now.'", 'stuck']]],
      ['side', "Riley looks away. 'Honestly? Someone was talking about me, and I wanted them to talk about something else. I didn't think about how it would land on you.' For a second she looks worried, like she knows what it is like to be talked about.", [
        ["'Seriously? That's such a lame reason.'", 'stuck'],
        ["'Thanks for being honest. Riley, what do you think today was like for Sam?'", 'impact']]],
      ['stuck', "Riley crosses her arms and pulls out her phone. Sam stares at the floor. Pushing harder is making both of them close down.", [
        ["'Let's pause. We can talk again later, with a teacher or counselor if you want.'", 'end_pause'],
        ["Slow down: 'Sam, I'm here. How are you doing with all this?'", 'heard']]],
      ['impact', "Riley is quiet. 'You probably felt like everyone knew your business. Like you couldn't trust me.' She swallows. 'I'm sorry, Sam. That was yours to share, not mine.' Sam looks up for the first time.", [
        ["'What could help make this right, for both of you?'", 'end_repair'],
        ["'Cool, problem solved. Let's go to class.'", 'end_partial']]],
      ['end_repair', "Riley offers to tell the two people that what she said wasn't hers to share, and to ask them to drop it. Sam asks that private things stay private from now on, and Riley agrees. Sam says trust will take time. Riley says she understands.\n\nWhat worked:\n• You made space for Sam's hurt before asking for explanations.\n• Asking Riley with curiosity helped her see her own reasons, and the impact.\n• Naming the harm (broken trust) made the apology specific.\n• The repair has actions: correcting it with the others and a promise about privacy."],
      ['end_partial', "Riley says sorry again and heads to class. Sam feels a little better, but the two people who heard the rumor still don't know it wasn't Riley's to share. The talk helped, but the repair isn't finished.\n\nWhat worked:\n• You listened to Sam and helped Riley see the impact. That matters.\n• Real repair often means fixing the harm where it happened, like talking to the people who heard it.\n• You could still ask: 'What would help make this right?'"],
      ['end_pause', "You stop here for now. Sam heads to class, and Riley goes the other way. Nothing is fixed yet, but it isn't over: you can check in with Sam later, and a trusted adult can help if the rumor keeps spreading.\n\nWhat worked:\n• Knowing when to pause is a real skill.\n• Next time, try starting with how Sam feels before asking who said what.\n• An I-statement ('I want to understand') keeps a talk calmer than 'You always...'"]
    ]),
    'excluded-project': _ctScript('The Group Project Cut', [
      ['start', "The classroom is empty except for Theo, wiping the whiteboard very carefully, and Devon, stacking chairs too loudly. Theo says, without turning around: 'The slides used my diagram. My name was not on them.' Devon drops a chair. 'We had to finish it. You weren't there.'", [
        ["'Hey, at least you all got a good grade, right?'", 'joke'],
        ["'Devon, leaving someone out and taking his ideas is wrong.'", 'heated'],
        ["'Theo, it sounds like something about today felt unfair. What happened?'", 'open']]],
      ['open', "Theo puts the eraser down. 'The group met on Saturday. I was not invited. The diagram on slide four is mine. I made it two weeks ago.' He speaks precisely, looking at the board. Devon stops stacking chairs.", [
        ["'I'm sure it was an accident. Let's move on.'", 'stuck'],
        ["'So you were left out of the meeting, and your work was used without your name. That's a lot.'", 'heard']]],
      ['heated', "Devon's shoulders go tight. 'Wrong? We did all the work this weekend! He never answers the group chat like everybody else!' His hands close into fists, then open again. Theo goes very still.", [
        ["'You're right, I jumped in fast. I'd like to hear from both of you, starting fresh.'", 'reset'],
        ["'That's no excuse, Devon. You knew better.'", 'stuck']]],
      ['joke', "Theo turns around. 'The grade is not the point,' he says flatly. Devon snorts, but it doesn't sound like he thinks it's funny either.", [
        ['Shrug and go back to what you were doing.', 'end_pause'],
        ["'You're right, Theo. That was a bad joke. Tell me what the point is for you.'", 'reset']]],
      ['reset', "Devon sets the next chair down gently. Theo turns to face the room. The air feels less tense; both of them seem ready to say more.", [
        ['Ask Theo what today was like for him.', 'heard'],
        ['Ask Devon how the weekend meeting happened.', 'side']]],
      ['heard', "Theo nods once. 'Yes. That is accurate.' After a pause: 'I want my name on my work. And I want to know why I was not invited.' Devon looks at the floor.", [
        ["'Devon, you need to apologize right now.'", 'stuck'],
        ["'Devon, can you help us understand how the meeting happened?'", 'side']]],
      ['side', "Devon rubs his face. 'Honestly? Theo's messages are all facts, no emojis, and we thought he was annoyed with us. Somebody said it would be faster without him, and I went along with it.' He glances at Theo. 'I didn't think about the diagram being his.'", [
        ["'Thanks for being honest. Devon, what do you think today felt like for Theo?'", 'impact'],
        ["'Wow. So you just dump people you don't get?'", 'stuck']]],
      ['stuck', "Devon grabs his bag. Theo turns back to the whiteboard and stops talking. The harder you push, the more both of them shut down.", [
        ["Slow down: 'Theo, I'd like to hear what matters most to you here.'", 'heard'],
        ["'Let's stop here and come back to this tomorrow with your science teacher.'", 'end_pause']]],
      ['impact', "Devon is quiet. 'He got left out, and then he watched us present his idea like it was ours.' He looks at Theo. 'That's not okay. I'm sorry.' Theo looks at Devon for a moment. 'Thank you. I accept that you are sorry.'", [
        ["'What would make this right, for the project and for next time?'", 'end_repair'],
        ["'Okay, great. Everybody's good.'", 'end_partial']]],
      ['end_repair', "Devon offers to tell the science teacher that the diagram was Theo's, so the credit gets fixed. Theo asks that the group plan every meeting in the class chat where everyone can see it. Devon agrees, and says that next time a message seems unclear, he will ask instead of guessing.\n\nWhat worked:\n• You named what happened to Theo without making him a lesson for anyone.\n• Asking Devon with curiosity uncovered a misunderstanding about messages.\n• Perspective-taking: a different way of communicating is not rudeness.\n• The repair fixes the credit and changes how the group works next time."],
      ['end_partial', "Devon's apology was real, and Theo accepted it. But the science teacher still thinks the diagram came from the whole group, and nothing changes about how meetings get planned. It's a start, not a finish.\n\nWhat worked:\n• You listened, and Devon understood the impact. That is real progress.\n• Repair here also needs action: fixing the credit and including Theo next time.\n• You could still ask: 'What would make this right?'"],
      ['end_pause', "You stop for now. Devon leaves for practice and Theo finishes the board. Nothing is fixed yet, but it isn't over: the science teacher can help the group sort out the credit, and you can check in with Theo tomorrow.\n\nWhat worked:\n• Pausing when a talk is going badly is a skill, not a failure.\n• Next time, try starting with what happened for Theo before deciding who is right.\n• Speaking for yourself ('I'd like to understand') keeps people talking."]
    ]),
    'misgender-on-purpose': _ctScript('The Pronoun That Was Not An Accident', [
      ['start', "Sam is sitting on the bench, very still, arms wrapped around themself. Casey is at her locker, laughing with a friend who quickly leaves. 'I asked you to stop,' Sam says, barely loud enough to hear. Casey shrugs. 'I forgot. Again. Whatever.'", [
        ["'Sam, are you okay? I'm here if you want to talk.'", 'open'],
        ["'Come on, it's not that serious. Let's all just chill.'", 'joke'],
        ["'Casey, that's so messed up. What is wrong with you?'", 'heated']]],
      ['open', "Sam looks up. 'It's every day. In front of everyone. I asked nicely. Today she laughed.' Their voice shakes. 'I just want my name and my pronouns used. That's all.' Casey's laugh is gone; she stares into her locker.", [
        ["'It keeps happening, even after you asked. That sounds exhausting.'", 'heard'],
        ["'Maybe she really does forget? Just keep reminding her.'", 'stuck']]],
      ['heated', "Casey spins around, eyes flashing. 'Here we go. Everybody's always ready to make me the bad guy.' She slams her locker. Sam flinches and looks away.", [
        ["'Well, you ARE being the bad guy.'", 'stuck'],
        ["'You're right that I came in hot. I'm not here to pile on. I want to understand what's happening.'", 'reset']]],
      ['joke', "Sam's face falls. 'It's serious to me,' they say quietly, and pull their hood up. Casey smirks, but she glances at you like she isn't sure.", [
        ["'You're right, Sam. I'm sorry. It is serious. I want to listen.'", 'reset'],
        ['Grab your things and leave.', 'end_pause']]],
      ['reset', "Casey leans against her locker instead of slamming it. Sam lowers their hood. Nobody is smiling, but nobody is leaving either.", [
        ["Ask Casey what's really going on.", 'side'],
        ['Ask Sam what this has been like.', 'heard']]],
      ['heard', "Sam nods slowly. 'Yeah. It makes me feel like I don't belong here.' They look at Casey. 'I don't get why you keep doing it.' Casey's jaw tightens, but she is listening.", [
        ["'Casey, I'm not trying to trap you. What's going on for you?'", 'side'],
        ["'Casey, you have to apologize, right now.'", 'stuck']]],
      ['side', "Casey is quiet for a long time. 'People were laughing when I did it. It felt good to be in on the joke instead of being the joke for once.' She shrugs, but it's a smaller shrug. 'I didn't really think about it after.'", [
        ["'So you pick on people to fit in. Nice.'", 'stuck'],
        ["'Thanks for being honest. Casey, what do you think it has been like for Sam?'", 'impact']]],
      ['stuck', "Casey turns her whole body away. Sam stares at the floor. Pushing harder is making the room feel smaller for everyone.", [
        ["'Let's stop for now. I think a counselor could help us talk about this.'", 'end_pause'],
        ["Slow down: 'Sam, I'm still here. How are you doing?'", 'heard']]],
      ['impact', "Casey looks at Sam. 'Every day you had to hear it, and then people laughed. Like you were the joke.' She lets out a long breath. 'That's not okay. I'm sorry, Sam. It wasn't an accident, and I'm not going to pretend it was.' Sam looks up, surprised.", [
        ["'Great, sorted. Can we all go?'", 'end_partial'],
        ["'What would make this right, so Sam doesn't have to keep correcting you?'", 'end_repair']]],
      ['end_repair', "Casey says she will use Sam's name and they/them, and if she slips, she will correct herself without making a big deal of it. She also says she will tell her friends to stop the joke. Sam says they will believe it when they see it, and that is fair. A trusted adult can help keep things on track.\n\nWhat worked:\n• You treated this as a pattern that hurts, not a 'misunderstanding.'\n• Curiosity helped Casey see her own reasons, and the harm.\n• The repair puts the work on Casey to remember, not on Sam to keep correcting.\n• Using someone's name and pronouns is basic respect."],
      ['end_partial', "Casey's apology was honest. But nothing was agreed about what happens next time, so Sam may still have to correct her, and her friends still think it's funny. The talk helped; the repair isn't finished.\n\nWhat worked:\n• You listened to Sam and helped Casey name the harm.\n• Repair usually needs a plan too: what will Casey do differently, and who else needs to hear it?\n• You could still ask: 'What would make this right?'"],
      ['end_pause', "You stop here for now. Sam heads out, and Casey stays at her locker. Nothing is fixed yet, and Sam shouldn't have to handle this alone: harm that keeps targeting who someone is belongs with a trusted adult, like a teacher or counselor.\n\nWhat worked:\n• Pausing a talk that is going badly is a real skill.\n• Next time, try starting with how Sam is doing, before what Casey did.\n• An I-statement ('I want to understand') keeps a talk calmer than an accusation."]
    ]),
    'took-credit': _ctScript('The Idea That Wasn\'t Hers', [
      ['start', "The bell has rung. Riley is packing up, still smiling from the teacher's praise. Aria sits at her desk, not moving. 'That was my idea,' Aria says carefully. 'The garden project. I said it in our group.' Riley laughs lightly. 'I mean, lots of people think of gardens.'", [
        ["'Riley, you stole her idea and everybody saw it.'", 'heated'],
        ["'Aria, you look really upset. Can you tell me more?'", 'open'],
        ["'Ha, Riley, you should run for class president.'", 'joke']]],
      ['open', "Aria takes a moment to find her words. 'Last week I explained the whole plan. The compost, the rain barrel. Today she said it to Mr. Okafor like it was hers, and everyone clapped.' Her voice is soft but steady. 'It took courage to say it in English.' Riley stops packing.", [
        ["'So your idea got praised, but not your name. And speaking up took real effort.'", 'heard'],
        ["'It's just one project. There'll be others.'", 'stuck']]],
      ['heated', "Riley's smile disappears. 'Stole? Wow. I made it better, actually.' She grabs her phone and starts scrolling. Aria looks down at her hands.", [
        ["'Better? You copied it.'", 'stuck'],
        ["'Okay, I said that harshly. I'm not trying to attack you. I want to hear both sides.'", 'reset']]],
      ['joke', "Riley gives a quick laugh. Aria doesn't. 'It is not funny for me,' she says, and closes her notebook.", [
        ["'You're right, Aria, I'm sorry. I want to hear what happened.'", 'reset'],
        ['Laugh it off and head out.', 'end_pause']]],
      ['reset', "Riley puts her phone face-down. Aria opens her notebook again. The room is quieter, and both of them look ready to talk.", [
        ['Ask Aria what this has been like.', 'heard'],
        ['Ask Riley what was going on when she pitched it.', 'side']]],
      ['heard', "Aria nods. 'Yes. I felt invisible.' She turns to Riley. 'I want to know why.' Riley's face flickers, like the question landed somewhere real.", [
        ["'Riley, you have to tell the teacher right now.'", 'stuck'],
        ["'Riley, can you tell us what was going on for you?'", 'side']]],
      ['side', "Riley sighs. 'My grade in that class is bad, and I've been stressed about it. When Mr. Okafor asked for ideas, I panicked and said the first good thing I remembered.' She pauses. 'I didn't say it was Aria's. I know.'", [
        ["'Thanks for being honest. Riley, what do you think it was like for Aria to watch that?'", 'impact'],
        ["'So you just take whatever you want.'", 'stuck']]],
      ['stuck', "Riley stands up to leave. Aria goes silent and stares at her desk. Pushing harder is shutting both of them down.", [
        ["Slow down: 'Aria, I'd really like to hear what matters most to you.'", 'heard'],
        ["'Let's stop for now and maybe talk with Mr. Okafor together later.'", 'end_pause']]],
      ['impact', "Riley looks at Aria. 'You had to sit there while everyone clapped for your idea. And you couldn't say anything.' She bites her lip. 'I'm sorry, Aria. That wasn't fair to you.' Aria nods slowly.", [
        ["'Cool, you're good now. See you tomorrow!'", 'end_partial'],
        ["'What would make this right?'", 'end_repair']]],
      ['end_repair', "Riley offers to tell Mr. Okafor tomorrow, in front of the class, that the garden idea was Aria's. Aria asks to lead the compost part. Riley agrees and asks if they can work on it together. Aria says yes, carefully.\n\nWhat worked:\n• You made space for Aria, who was quieter about her hurt than the situation deserved.\n• Curiosity helped Riley explain without excuses, then see the impact.\n• Credit taken in public is repaired in public.\n• The plan gives Aria back her voice in the project."],
      ['end_partial', "Riley's apology was real, but the class still thinks the idea was hers. Aria said 'okay,' but the credit hasn't been fixed. It's a start.\n\nWhat worked:\n• You listened, and Riley understood the impact.\n• When harm happens in public, repair often needs a public part too.\n• You could still ask: 'What would make this right?'"],
      ['end_pause', "You stop for now. Aria packs up quietly and Riley leaves first. Nothing is fixed yet, but it isn't over: Mr. Okafor or another trusted adult can help sort out the credit.\n\nWhat worked:\n• Pausing a talk that isn't going well is okay.\n• Next time, start with how Aria feels before deciding who is right.\n• I-statements ('I want to understand') keep things calmer than accusations."]
    ]),
    'screenshot-betrayal': _ctScript('The Screenshot That Got Sent', [
      ['start', "The group chat is buzzing.\nDevon: 'Thanks a LOT, Maya. Coach saw it. I'm benched.'\nMaya: 'I didn't send it to Coach!!'\nDevon: 'You sent it to 20 people.'\nThen nobody types. You can tell everyone is reading.", [
        ['Post a laughing emoji to break the tension.', 'joke'],
        ["Message Devon: 'That sounds awful. Want to tell me what happened?'", 'open'],
        ["Post: 'Maya, that was so fake of you.'", 'heated']]],
      ['open', "Devon: 'I was venting to Maya. Privately. About practice being unfair. She screenshotted it. Now Coach thinks I don't respect him, and I'm off the starting five.'\nA minute later: 'I trusted her.'\nMaya is typing... then stops.", [
        ["'Just apologize to Coach and it'll blow over.'", 'stuck'],
        ["'So something private went public, and now there are real consequences. That's a lot.'", 'heard']]],
      ['heated', "Maya: 'Wow, so now I'm fake?? I didn't know Coach would see it.'\nTwo other people react with eye-roll emojis. Devon leaves the chat for a second, then comes back.", [
        ["'My bad, that was harsh. I'm not trying to pile on. Can we figure out what happened?'", 'reset'],
        ["'Everyone knows screenshots get around, Maya.'", 'stuck']]],
      ['joke', "Devon: 'Glad someone thinks it's funny.'\nMaya sends nothing. The chat goes quiet.", [
        ['Mute the chat and put your phone away.', 'end_pause'],
        ["'Sorry, Devon, that was a bad move. I'm listening.'", 'reset']]],
      ['reset', "The emojis stop.\nMaya: 'Okay.'\nDevon: 'Okay.'\nIt feels like everyone took a breath.", [
        ["Message Maya: 'What was going on when you shared it?'", 'side'],
        ['Ask Devon how this has hit him.', 'heard']]],
      ['heard', "Devon: 'Yeah. It's not even about basketball. It's that I can't vent to anyone without it getting out.'\nThen: 'Maya, why?'", [
        ["'Maya, nobody is ganging up on you. What was going on for you?'", 'side'],
        ["'Maya, you owe him a public apology. Now.'", 'stuck']]],
      ['side', "Maya: 'I thought it was funny and kind of true. I sent it to the chat as a joke. I didn't think anyone would show Coach.'\nA pause.\nMaya: 'I didn't think, period.'", [
        ["'That's such a weak excuse.'", 'stuck'],
        ["'Thanks for being honest. Maya, how do you think today felt for Devon?'", 'impact']]],
      ['stuck', "Maya: 'Whatever.'\nDevon: 'Forget it.'\nA few other people start adding comments. Online, things pile up fast, and pushing harder is making it worse.", [
        ["Post: 'Let's stop for tonight. Devon, maybe talk to Coach or a counselor tomorrow?'", 'end_pause'],
        ["Message Devon directly: 'Hey. I'm still here. How are you doing?'", 'heard']]],
      ['impact', "Maya: 'You trusted me with something private, and I turned it into a joke for 20 people. And now you lost your spot.'\nMaya: 'I'm really sorry, Devon.'\nDevon: 'Thanks. That actually helps a little.'", [
        ["'What could help make this right?'", 'end_repair'],
        ["'Cool, drama over!'", 'end_partial']]],
      ['end_repair', "Maya deletes the screenshot and asks everyone in the chat to delete it too. She posts that it was a private message and she shouldn't have shared it. She also offers to tell Coach it was venting to a friend, not meant for anyone else. Devon says that would mean a lot.\n\nWhat worked:\n• You acknowledged Devon's real consequences before redirecting.\n• Asking Maya with curiosity helped her see the harm, not just defend herself.\n• Online harm needs online repair: deleting and correcting in the same chat.\n• Trust about private things was named as the real harm."],
      ['end_partial', "Maya apologized and Devon accepted. But the screenshot is still on 20 phones, and Coach still has only part of the story. The talk helped; the repair isn't finished.\n\nWhat worked:\n• You got both of them talking honestly.\n• Online, repair usually also means removing or correcting what was shared.\n• You could still ask: 'What would help make this right?'"],
      ['end_pause', "You step away from the chat for tonight. Nothing is fixed yet, but it isn't over: talking face to face tomorrow, or with Coach or a counselor, often goes better than more messages.\n\nWhat worked:\n• Stepping away when a chat is heating up is a smart move.\n• Next time, try checking in privately with the person who is hurt first.\n• Online, an I-statement ('I want to understand') helps even more, because tone is easy to misread."]
    ]),
    'eating-alone': _ctScript('The Lunch Table That Filled Up', [
      ['start', "You sit down next to Casey, who is eating alone again. She doesn't look up. Riley walks over with her tray. 'Oh, hey. Didn't see you sitting here,' Riley says brightly. Casey's jaw tightens. 'Sure you didn't. Two days in a row.'", [
        ["'Riley, you've been leaving her out on purpose.'", 'heated'],
        ["'Lunch table drama, huh? Pass the ketchup.'", 'joke'],
        ["'Casey, I'm glad I sat here. How are you doing?'", 'open']]],
      ['open', "Casey shrugs, but her voice is sharp. 'The seats were saved yesterday. And today. Everybody looked right at me and said nothing.' She stabs at her food. 'It's fine. I'm used to it.' Riley's smile slips.", [
        ["'Maybe they really were saving seats? Don't take it personally.'", 'stuck'],
        ["'Being left out like that, with everyone watching, really hurts. It's not fine.'", 'heard']]],
      ['heated', "Riley does a fake laugh and checks her phone. 'Oh my gosh, we just didn't have room. Why is everyone so dramatic?' Casey turns her whole body away.", [
        ["'Okay, I came in strong. I'm not here to attack anyone. I want to understand.'", 'reset'],
        ["'You had room. Everyone could see it.'", 'stuck']]],
      ['joke', "Casey gives you a look. 'Yeah, it's hilarious,' she says, and slides to the far end of the table. Riley smirks.", [
        ["'Sorry, Casey. That was a dumb thing to say. I do want to know what's going on.'", 'reset'],
        ['Eat your lunch and say nothing.', 'end_pause']]],
      ['reset', "Casey slides back a little. Riley puts her phone away. It's still awkward, but nobody is leaving.", [
        ["Ask Riley what's been happening with the group.", 'side'],
        ['Ask Casey what the last few days have been like.', 'heard']]],
      ['heard', "Casey is quiet, then says more softly: 'It's like I disappeared. I thought you guys were my friends.' She looks at Riley. Riley looks at the table.", [
        ["'Riley, say sorry. Right now.'", 'stuck'],
        ["'Riley, I'm not trying to trap you. What's been going on?'", 'side']]],
      ['side', "Riley pauses. 'Someone in the group said Casey was too intense, and I didn't want them to say that about me too. So I went along with it.' Her voice gets quieter. 'It was easier than saying something.'", [
        ["'Thanks for being honest. Riley, what do you think the last two days were like for Casey?'", 'impact'],
        ["'So you'd rather be popular than kind.'", 'stuck']]],
      ['stuck', "Riley rolls her eyes and starts to stand up. Casey pushes her tray away and goes silent. Pushing harder made everyone more guarded.", [
        ["Slow down: 'Casey, I'm here. How are you really doing?'", 'heard'],
        ["'Let's leave it for today. Casey, want to sit with me tomorrow too?'", 'end_pause']]],
      ['impact', "Riley looks at Casey. 'You sat alone for two days and we all just watched. That's really lonely.' She swallows. 'I'm sorry, Casey. That wasn't fair.' Casey doesn't smile, but her shoulders loosen.", [
        ["'Great, so it's fixed!'", 'end_partial'],
        ["'What could make this right?'", 'end_repair']]],
      ['end_repair', "Riley says she will save Casey a real seat tomorrow, and that she will speak up if the group talks about her again. Casey says she'll come, but she wants to see it happen more than once. Small and steady is how trust comes back.\n\nWhat worked:\n• Sitting with Casey was already a kind move.\n• You named quiet exclusion as real harm, not drama.\n• Curiosity helped Riley admit she went along with the group.\n• Repair here is small and consistent: a real seat, every day."],
      ['end_partial', "Riley apologized, and Casey heard it. But nothing was decided about tomorrow, so Casey doesn't know where she'll sit. The talk helped; the repair isn't finished.\n\nWhat worked:\n• You listened and helped Riley see the impact.\n• Repair for exclusion is usually an action, like a saved seat, repeated.\n• You could still ask: 'What could make this right?'"],
      ['end_pause', "You stop for now and finish lunch. Nothing is fixed yet, but it isn't over: being someone's steady lunch buddy matters, and a trusted adult can help if the exclusion keeps happening.\n\nWhat worked:\n• Choosing to sit with someone who is alone is a real kindness.\n• Next time, try starting with how Casey feels before calling out Riley.\n• I-statements ('I want to understand') keep people at the table."]
    ]),
    'racist-remark': _ctScript('The "Joke" That Wasn\'t', [
      ['start', "A teacher asked you to help Aria and Jordan talk about what happened in the locker room yesterday. Jordan sits on the bench, arms crossed. Aria stands near the door, looking at her hands. 'I don't even know why we're here,' Jordan says. 'It was a joke. Everybody laughed.'", [
        ["'Come on, let's keep this light. Nobody meant anything.'", 'joke'],
        ["'Aria, thank you for coming. Would you be willing to share what happened for you?'", 'open'],
        ["'Jordan, what is wrong with you? You're a terrible person.'", 'heated']]],
      ['open', "Aria takes a breath. 'He made a joke about my hair. It used a stereotype about where my family is from.' She chooses each word slowly. 'Everyone laughed. I didn't. I felt like I was not a person to them, only a joke.' Jordan uncrosses his arms.", [
        ["'That sounds really painful: being singled out for who you are while people laughed.'", 'heard'],
        ["'I'm sure he didn't mean it like that.'", 'stuck']]],
      ['heated', "Jordan's face goes red. 'Terrible person? Over a joke? This is so unfair.' He looks at the door. Aria shrinks back; now the conversation is about Jordan's feelings instead of hers.", [
        ["'If the shoe fits.'", 'stuck'],
        ["'You're right, I shouldn't label you. What you said is what we need to talk about. Can we start over?'", 'reset']]],
      ['joke', "Aria's face closes. 'It is not light for me,' she says quietly. Jordan nods like you agreed with him.", [
        ["'You're right, Aria. I'm sorry. This matters. Please tell us what happened for you.'", 'reset'],
        ['Say nothing and let the silence sit.', 'end_pause']]],
      ['reset', "Jordan stops looking at the door. Aria takes a step closer. It is still uncomfortable, but now there is room to talk.", [
        ['Ask Jordan what he was thinking when he said it.', 'side'],
        ['Ask Aria how it affected her.', 'heard']]],
      ['heard', "Aria nods. 'Yes. And now in gym I wonder who is laughing at me.' She looks at Jordan. 'I want you to understand why it was not funny.' Jordan shifts on the bench.", [
        ["'Jordan, say you're sorry so we can go.'", 'stuck'],
        ["'Jordan, I'm not here to trap you. What were you thinking when you said it?'", 'side']]],
      ['side', "Jordan rubs his neck. 'Honestly? I heard it online. I thought it was just a thing people say. Everyone laughed, so I thought it was fine.' He pauses. 'Nobody ever told me it was a stereotype.'", [
        ["'Thanks for being honest. Jordan, now that you've heard Aria, how do you think it landed for her?'", 'impact'],
        ["'Wow. You really don't get anything, do you?'", 'stuck']]],
      ['stuck', "Jordan stares at the floor and stops talking. Aria looks toward the door. Pushing harder is shutting the conversation down.", [
        ["Slow down: 'Aria, I'm listening. What matters most to you right now?'", 'heard'],
        ["'Let's pause and ask the teacher to come back and help.'", 'end_pause']]],
      ['impact', "Jordan is quiet. 'Everyone laughed at you, about your family, and you had to stand there.' He looks at Aria. 'It doesn't matter that I didn't mean it, if it hurt you like that. I'm sorry, Aria. I won't say that again.' Aria looks at him for a long moment, then nods.", [
        ["'Perfect. We're done here.'", 'end_partial'],
        ["'What would help make this right?'", 'end_repair']]],
      ['end_repair', "Jordan says he will tell the people who laughed that the joke was not okay, and that he will speak up if he hears it again. Aria asks him to learn why that stereotype hurts, and the teacher offers to help with that. Aria says she feels a little safer.\n\nWhat worked:\n• You kept Aria's hurt at the center instead of Jordan's defensiveness.\n• Impact, not intent: Jordan didn't mean harm, and it still hurt.\n• You named the behavior, not the person, which kept Jordan listening.\n• The repair includes not repeating the pattern, and helping others stop too."],
      ['end_partial', "Jordan's apology was real. But the people who laughed still think the joke was fine, and nothing was planned about what happens next. The talk helped; the repair isn't finished.\n\nWhat worked:\n• You listened to Aria and helped Jordan understand the impact.\n• Repair for a public joke often needs a public part, and a promise not to repeat it.\n• You could still ask: 'What would help make this right?'"],
      ['end_pause', "You stop for now and ask the teacher to come back in. Nothing is fixed yet, and that's okay: harm that targets who someone is deserves an adult's help, not just a peer conversation.\n\nWhat worked:\n• Bringing in a trusted adult is the right call when things stall.\n• Next time, try starting with Aria's experience before anything else.\n• Name the behavior ('that joke used a stereotype'), not the person ('you're terrible')."]
    ])
  };

  // ── Teacher scenes: the station's toolConfig.conflicttheater, handled by the hub's
  // shared helper (window.SelHub.teacherScenes). An older hub has no helper: no teacher section.
  function _ctTeacherApi() {
    var api = window.SelHub && window.SelHub.teacherScenes;
    return api && typeof api.bind === 'function' ? api : null;
  }

  // ══════════════════════════════════════════════════════════════
  // ── Helpers: persona + prompt construction ──
  // ══════════════════════════════════════════════════════════════

  function _personaBlock(char, role, scenario, mood, history, otherCharLast, priorMemory) {
    var bodyHint = (char.bodyVocab && char.bodyVocab[mood]) || char.bodyVocab.calm || '';
    var memoryLine = priorMemory && priorMemory.memoryNote
      ? 'You have met this student before. Last time: "' + priorMemory.memoryNote + '". Reference it naturally if it fits.'
      : '';
    return [
      'You are ' + char.name + ', age ' + char.age + '. ' + char.backstory,
      'Your role in this conflict: ' + role + '.',
      'Your personality archetype: ' + char.archetype + '.',
      'Your speech pattern: ' + char.speechPattern + '.',
      'Your current mood: ' + mood + '. Your body language: ' + bodyHint + '.',
      memoryLine,
      'Scenario: ' + scenario.setup
    ].filter(function(s) { return s; }).join('\n');
  }

  function _buildTurnPrompt(char, role, scenario, mood, history, otherCharLast, studentMsg, priorMemory) {
    var historyStr = history.length
      ? 'Conversation so far:\n' + history.slice(-12).map(function(m) { return m.speaker + ': ' + m.text; }).join('\n')
      : '(This is the start of the conversation.)';
    var otherLine = otherCharLast ? '\n\nThe other character just said: "' + otherCharLast + '"' : '';
    return _personaBlock(char, role, scenario, mood, history, otherCharLast, priorMemory)
      + '\n\n' + historyStr + otherLine
      + '\n\nThe mediator (a student about your age) just said to you: "' + studentMsg + '"'
      + '\n\nRespond IN CHARACTER as ' + char.name + '. 1-2 sentences. React authentically based on whether the mediator validated your feelings, made space, identified the harm, or proposed repair.'
      + '\n\nReturn ONLY valid JSON: {"text":"your reply (1-2 sentences)","mood":"calm|upset|closing-down|listening|regretful","bodyLanguage":"short phrase","harmonyChange":-15 to 15,"principlesAcknowledged":["acknowledged"|"madeSpace"|"identifiedHarm"|"proposedRepair"|"namedNeed"]}\n\n'
      + 'harmonyChange: positive when the mediator acknowledged feelings, made space, named harm specifically, or proposed concrete repair. Negative when blaming, dismissing, or rushing. resolved feelings -> mood shifts toward listening or regretful.';
  }

  function _parseTurnResponse(raw) {
    var text = typeof raw === 'string' ? raw : (raw && raw.text ? raw.text : String(raw || ''));
    try {
      var match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      var parsed = JSON.parse(match[0]);
      return {
        text: parsed.text || '...',
        mood: parsed.mood || 'calm',
        bodyLanguage: parsed.bodyLanguage || '',
        harmonyChange: typeof parsed.harmonyChange === 'number' ? parsed.harmonyChange : 0,
        principlesAcknowledged: Array.isArray(parsed.principlesAcknowledged) ? parsed.principlesAcknowledged : []
      };
    } catch (e) {
      return { text: text.slice(0, 200), mood: 'calm', bodyLanguage: '', harmonyChange: 0, principlesAcknowledged: [] };
    }
  }

  function _decideEnding(harmony, principlesUsed, turnCount) {
    var principleCount = Object.keys(principlesUsed).filter(function(k) { return principlesUsed[k]; }).length;
    if (harmony >= 75 && principleCount >= 3) return 'resolved';
    if (harmony <= 5) return 'deepened';
    if (turnCount >= 15) return harmony >= 50 ? 'partial' : 'deepened';
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // ── Tool registration ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('conflicttheater', {
    // This one already had a `name`, so it never fell through to the raw id;
    // the label exists to satisfy the config contract. Kept identical to `name`
    // so the two can never drift into two names for one tool.
    // NOTE: the hub card says "Conflict Theater" without the Beta suffix.
    label: 'Conflict Theater (Beta)',
    name: 'Conflict Theater (Beta)',
    icon: '🎭',
    desc: '(Beta — limited content) Mediate a real conflict with two AI characters. Practice restorative principles in an immersive scene. Currently one scenario; more coming.',
    casel: 'relationship-skills',
    contentWarning: true,
    beta: true,
    status: 'beta',
    // Playable with no AI (scripted scenes + student-written scene).
    offlineMode: true,
    offlineScripts: CT_SCRIPTS,
    // Teacher content contract (ctx.toolConfig.conflicttheater), exposed for tests.
    teacherConfig: {
      scenesFrom: function(cfg, AO) { var api = _ctTeacherApi(); return api ? api.scenesFrom(cfg, AO) : []; },
      starter: function() { var api = _ctTeacherApi(); return api ? api.starter() : null; }
    },

    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _cftT = (ctx && ctx.theme) || {};
      var _cftHC = !!_cftT.isContrast, _cftL = !_cftHC && !_cftT.isDark;
      var _cft_BGL = {'#1e293b':'#ffffff','#451a03':'#fff7ed','#0f172a':'#f8fafc'}, _cft_BGH = {'#1e293b':'#000000','#451a03':'#000000','#0f172a':'#000000','#14b8a6':'#000000','#0c4a6e':'#000000'};
      var _cft_FGL = {'#f1f5f9':'#0f172a','#94a3b8':'#64748b','#e2e8f0':'#1e293b','#cbd5e1':'#334155','#fbbf24':'#854d0e','#fde68a':'#92400e','#7dd3fc':'#075985'}, _cft_FGH = {'#fef3c7':'#ffff00','#f1f5f9':'#ffff00','#94a3b8':'#ffff00','#e2e8f0':'#ffff00','#cbd5e1':'#ffff00','#fbbf24':'#ffff00','#64748b':'#ffff00','#fde68a':'#ffff00','#fff':'#ffff00','#22c55e':'#ffff00','#eab308':'#ffff00','#ef4444':'#ffff00','#7dd3fc':'#ffff00','#e0f2fe':'#ffff00','#a5f3fc':'#ffff00'};
      var _cft_BDL = {'#1e293b':'#e5e7eb','#334155':'#e2e8f0','#475569':'#cbd5e1'}, _cft_BDH = {'#f59e0b':'#ffff00','#1e293b':'#ffff00','#334155':'#ffff00','#92400e':'#ffff00','#14b8a6':'#ffff00','#0369a1':'#ffff00','#0891b2':'#ffff00','#475569':'#ffff00'};
      var _cftBg = function(h){ return _cftHC ? (_cft_BGH[h]||h) : (_cftL ? (_cft_BGL[h]||h) : h); };
      // Dark-mode foreground map. These accents are readable as TEXT only when
      // lightened; the surface and border maps are untouched.
      var _cft_FGD = {'#64748b':'#94a3b8'};
      var _cftFg = function(h){ return _cftHC ? (_cft_FGH[h]||h) : (_cftL ? (_cft_FGL[h]||h) : (_cft_FGD[h]||h)); };
      var _cftBd = function(h){ return _cftHC ? (_cft_BDH[h]||h) : (_cftL ? (_cft_BDL[h]||h) : h); };
      var React = ctx.React;
      var h = React.createElement;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var awardXP = ctx.awardXP;
      var addToast = ctx.addToast;
      var celebrate = ctx.celebrate;
      var band = ctx.gradeBand || 'middle';
      var onSafetyFlag = ctx.onSafetyFlag || null;
      // Usable AI? Never typeof alone: a host-blocked fn is truthy (2026-11-04 AI-off sweep).
      var _cftAiOn = ctx.aiAvailable !== false && (function (fn) { try { if (typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable('text', fn); } catch (_) {} return typeof fn === 'function' && !fn._alloQrBlocked && window.__alloStudentAiDisabled !== true; })(callGemini);
      var _cftAO = (window.AlloModules && window.AlloModules.AdventureOffline) || null;
      var _cftTheme = _cftHC ? 'contrast' : (_cftL ? 'light' : 'dark');
      var _cftTr = typeof ctx.t === 'function' ? ctx.t : function(k) { return k; };

      var d = (ctx.toolData && ctx.toolData.conflicttheater) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('conflicttheater', key); }
        else { if (ctx.update) ctx.update('conflicttheater', key, val); }
      };

      var MODES = ['select', 'opt-in', 'scene', 'ending', 'compare', 'replay', 'script', 'write', 'teacher-edit'];
      var mode = MODES.indexOf(d.mode) !== -1 ? d.mode : 'select'; // select | opt-in | scene | ending | compare | replay | script | write | teacher-edit
      // Teacher scenes from the active station (ctx.toolConfig); only the teacher view can edit them.
      var _ctTx = function(key, fb) { var v = null; try { v = _cftTr(key); } catch (e) { v = null; } return (typeof v === 'string' && v && v !== key) ? v : fb; };
      var _ctTsApi = _ctTeacherApi();
      var tsCtl = _ctTsApi ? _ctTsApi.bind({
        ctx: ctx, h: h, toolId: 'conflicttheater', d: d, set: upd, announce: announceSR, theme: _cftT, fg: _cftFg, bg: _cftBg,
        attr: 'ct-', idBase: 'cft', openPatch: { mode: 'teacher-edit' }, closePatch: { mode: 'select' },
        aiTopic: 'a realistic everyday conflict between students that the player helps repair',
        aiExtra: 'Choices are things the player could say; scenes show how the other person reacts.',
        ideaPrefix: 'Teacher\'s idea for the conflict: ',
        copy: {
          station_hint: _ctTx('sel.conflicttheater.teacher.station_hint', 'To give students your own scenes that work without AI, start an SEL Station that includes Conflict Theater, then open it here.'),
          editor_title: _ctTx('sel.conflicttheater.teacher.editor_title', 'Write a conflict scene'),
          guide: _ctTx('sel.conflicttheater.teacher.guide', 'Write a realistic everyday conflict with made-up names. Less helpful choices show common mistakes, like blaming or brushing feelings off. Every choice shows how the other person reacts. End with at least two endings, each with a short "What worked:" debrief. Keep it restorative: no shaming endings, no diagnoses, never quote slurs.'),
          idea_label: _ctTx('sel.conflicttheater.teacher.idea_label', 'Optional: describe the conflict and let AI draft the scenes')
        }
      }) : null;
      var tsReady = tsCtl ? tsCtl.ready : [];
      var tsCanAuthor = !!tsCtl && tsCtl.canAuthor;
      if (mode === 'teacher-edit' && !tsCanAuthor) mode = 'select';
      var tsPlaying = d.teacherSceneId ? tsReady.filter(function(s) { return s.id === d.teacherSceneId; })[0] || null : null;
      // Without AI a saved live scene resumes as the scripted one.
      if (!_cftAiOn && mode === 'scene') mode = 'script';
      var scenarioId = d.scenarioId || 'lunch-money';
      var scenario = SCENARIOS[scenarioId] || SCENARIOS['lunch-money'];
      var scene = SCENES[scenario.sceneId] || SCENES.cafeteria;
      var dialogue = d.dialogue || [];
      var harmony = typeof d.harmony === 'number' ? d.harmony : scenario.initialHarmony;
      var principlesUsed = d.principlesUsed || {};
      // Initialize moods from scenario's initialMoods (per-character starting state)
      var charMoods = (d.charMoods && typeof d.charMoods === 'object' && !Array.isArray(d.charMoods)) ? d.charMoods : Object.assign({}, scenario.initialMoods || {});
      // Default any missing characters to 'calm'
      scenario.characterIds.forEach(function(cid) { if (!charMoods[cid]) charMoods[cid] = 'calm'; });
      var addressing = d.addressing || 'both';
      var studentInput = d.studentInput || '';
      var loading = !!d.loading;
      var turnCount = d.turnCount || 0;
      var _userTier = d._userTier || 0;
      var ttsEnabled = d.ttsEnabled !== false;
      var endingType = d.ending || null;
      // Portrait cache: portraits[characterId] = { calm, upset, 'closing-down', listening, regretful, _loading: { mood: bool } }
      var portraits = d.portraits || {};
      // Cross-session memory: memory[characterId] = { memoryNote, relationshipScore, scenariosPlayed, lastInteraction, lastScenarioId }
      // Persists across sessions via ctx.update → ctx.toolData.conflicttheater pipeline.
      var memory = d.memory || {};
      // Mid-conversation coach hint (max one per scenario, dismissible)
      var coachHint = d.coachHint || null;
      var coachHintShown = !!d.coachHintShown;
      var coachHintDismissed = !!d.coachHintDismissed;
      // Per-scenario history of past attempts (for compare-to-previous)
      var attemptHistory = d.attemptHistory || [];
      var memoryResetConfirm = !!d.memoryResetConfirm;

      function focusConflictControl(id) {
        setTimeout(function() {
          var target = document.getElementById(id);
          if (target && target.focus) target.focus();
        }, 50);
      }
      function openMemoryResetConfirm() {
        upd('memoryResetConfirm', true);
        focusConflictControl('cft-memory-reset-cancel');
      }
      function closeMemoryResetConfirm() {
        upd('memoryResetConfirm', false);
        focusConflictControl('cft-memory-reset-trigger');
      }
      function commitMemoryReset() {
        if (!memoryResetConfirm) return;
        upd({ memoryResetConfirm: false, memory: {} });
        announceSR('All character memories cleared.');
        focusConflictControl('cft-scenario-heading');
      }
      function handleMemoryResetKeyDown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeMemoryResetConfirm();
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
      function renderMemoryResetConfirm() {
        if (!memoryResetConfirm) return null;
        return h('div', {
          id: 'cft-memory-reset-confirm',
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'cft-memory-reset-title',
          'aria-describedby': 'cft-memory-reset-description',
          onKeyDown: handleMemoryResetKeyDown,
          style: { position: 'fixed', inset: 0, zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(2,6,23,0.82)' }
        }, h('div', { style: { width: '100%', maxWidth: 500, padding: 22, borderRadius: 14, border: '2px solid #f87171', background: _cftBg('#0f172a'), color: _cftFg('#e2e8f0'), boxShadow: '0 20px 60px rgba(0,0,0,0.45)' } },
          h('h2', { id: 'cft-memory-reset-title', style: { margin: '0 0 8px', fontSize: 19, fontWeight: 900, color: _cftFg('#f1f5f9') } }, 'Reset all character memory?'),
          h('p', { id: 'cft-memory-reset-description', style: { margin: '0 0 18px', fontSize: 13, lineHeight: 1.6, color: _cftFg('#cbd5e1') } }, 'This permanently removes every character memory from your past conversations. This cannot be undone.'),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } },
            h('button', { id: 'cft-memory-reset-cancel', onClick: closeMemoryResetConfirm,
              style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid #64748b', background: _cftBg('#1e293b'), color: _cftFg('#e2e8f0'), fontSize: 13, fontWeight: 700, cursor: 'pointer' }
            }, 'Cancel'),
            h('button', { onClick: commitMemoryReset,
              style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid #f87171', background: '#b91c1c', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
            }, 'Reset character memory')
          )
        ));
      }

      // ──────────────────────────────────────────────────────────
      // Helper: ensure portrait exists for (characterId, mood)
      // Lazily generates and caches. Idempotent (no-op if loading or
      // already cached). Fires-and-forgets via upd().
      // ──────────────────────────────────────────────────────────
      function _patchPortrait(charId, patch) {
        // Re-pull current portraits each time (avoid stale closure overwrites
        // when multiple ensurePortrait calls race).
        var cur = (ctx.toolData && ctx.toolData.conflicttheater && ctx.toolData.conflicttheater.portraits) || {};
        var curEntry = cur[charId] || {};
        var updated = Object.assign({}, curEntry, patch);
        var updatedAll = Object.assign({}, cur);
        updatedAll[charId] = updated;
        upd('portraits', updatedAll);
      }
      function _setLoading(charId, mood, isLoading) {
        var cur = (ctx.toolData && ctx.toolData.conflicttheater && ctx.toolData.conflicttheater.portraits) || {};
        var curEntry = cur[charId] || {};
        var loading = Object.assign({}, curEntry._loading || {});
        if (isLoading) loading[mood] = true;
        else delete loading[mood];
        _patchPortrait(charId, { _loading: loading });
      }

      function ensurePortrait(charId, mood) {
        if (!callImagen) return;
        var char = CAST[charId];
        if (!char) return;
        var entry = portraits[charId] || {};
        if (entry[mood]) return; // already cached
        if (entry._loading && entry._loading[mood]) return; // in flight

        _setLoading(charId, mood, true);

        if (mood === 'calm') {
          callImagen(_basePortraitPrompt(char), 320, 0.85)
            .then(function(url) {
              if (url) _patchPortrait(charId, { calm: url });
              _setLoading(charId, mood, false);
            })
            .catch(function() { _setLoading(charId, mood, false); });
          return;
        }

        // Non-calm mood: need calm first as the base for image-edit.
        var calmUrl = entry.calm;
        var calmPromise;
        if (calmUrl) {
          calmPromise = Promise.resolve(calmUrl);
        } else {
          // Generate calm and cache it under 'calm' (separately from the requested mood).
          calmPromise = callImagen(_basePortraitPrompt(char), 320, 0.85).then(function(url) {
            if (url) _patchPortrait(charId, { calm: url });
            return url;
          });
        }

        calmPromise.then(function(baseUrl) {
          if (!baseUrl) { _setLoading(charId, mood, false); return; }
          if (!window.callGeminiImageEdit) {
            // Edit endpoint unavailable: fall back to calm portrait for this mood.
            var fallbackPatch = {};
            fallbackPatch[mood] = baseUrl;
            _patchPortrait(charId, fallbackPatch);
            _setLoading(charId, mood, false);
            return;
          }
          try {
            var b64 = baseUrl.split(',')[1];
            window.callGeminiImageEdit(_moodEditPrompt(char, mood), b64, 320, 0.85)
              .then(function(editedUrl) {
                var patch = {};
                patch[mood] = editedUrl || baseUrl;
                _patchPortrait(charId, patch);
                _setLoading(charId, mood, false);
              })
              .catch(function() {
                var patch = {};
                patch[mood] = baseUrl;
                _patchPortrait(charId, patch);
                _setLoading(charId, mood, false);
              });
          } catch (e) {
            var patch = {};
            patch[mood] = baseUrl;
            _patchPortrait(charId, patch);
            _setLoading(charId, mood, false);
          }
        }).catch(function() { _setLoading(charId, mood, false); });
      }

      // ──────────────────────────────────────────────────────────
      // Helper: send turn
      // ──────────────────────────────────────────────────────────
      function sendTurn() {
        if (!callGemini || !_cftAiOn) { addToast && addToast('AI not available right now.', 'error'); return; }
        var msg = (studentInput || '').trim();
        if (!msg || loading) return;

        // Pre-flight regex gate: a critical keyword in the mediator's turn
        // breaks character on both AI actors and surfaces crisis support.
        if (window.SelHub && window.SelHub.safeRehearseCheck) {
          var _preflight = window.SelHub.safeRehearseCheck(msg, { toolId: 'conflicttheater', onSafetyFlag: onSafetyFlag });
          if (_preflight.action === 'block') {
            var _breakText = (window.SelHub.rehearseBreakCharacterText && window.SelHub.rehearseBreakCharacterText(_preflight.severity)) ||
              'I want to step out of the scene for a moment. What you wrote sounds heavy, and that matters more than the practice. Please reach out to a trusted adult or one of the crisis lines below.';
            var _firstResponder = (addressing === 'both' ? scenario.characterIds[0] : addressing);
            upd({
              dialogue: dialogue.concat([
                { speaker: 'student', text: msg, ts: Date.now() },
                { speaker: _firstResponder, text: _breakText, mood: 'calm', bodyLanguage: '', ts: Date.now(), _crisis: true }
              ]),
              studentInput: '',
              _userTier: 3
            });
            announceSR('Practice paused. Please use the support resources below.');
            return;
          }
        }

        var newDialogue = dialogue.concat([{ speaker: 'student', text: msg, ts: Date.now() }]);
        upd({ dialogue: newDialogue, loading: true, studentInput: '', turnCount: turnCount + 1 });

        // Decide responders based on addressing
        var charIds = scenario.characterIds;
        var responders = addressing === 'both' ? charIds : [addressing];

        // Build prompts per responder
        var prompts = responders.map(function(cid) {
          var char = CAST[cid];
          var role = scenario.characterRoles[cid] || '';
          var otherCid = charIds.find(function(x) { return x !== cid; });
          var otherCharLast = null;
          for (var i = newDialogue.length - 1; i >= 0; i--) {
            if (newDialogue[i].speaker === otherCid) { otherCharLast = newDialogue[i].text; break; }
          }
          return { cid: cid, char: char, prompt: _buildTurnPrompt(char, role, scenario, charMoods[cid] || 'calm', newDialogue, otherCharLast, msg, memory[cid] || null) };
        });

        // Parallel: all character calls + safety assessment
        var charPromises = prompts.map(function(p) {
          return callGemini(p.prompt, true).catch(function() { return null; });
        });
        var safetyP = (window.SelHub && window.SelHub.assessSafety)
          ? window.SelHub.assessSafety(msg, band, 'conflicttheater', callGemini).catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
          : Promise.resolve({ tier: 0, rationale: '', category: 'none' });

        Promise.all(charPromises.concat([safetyP])).then(function(results) {
          var safety = results[results.length - 1] || { tier: 0 };
          var charResults = results.slice(0, -1);

          // Push safety flag on Tier 2+
          if (safety.tier >= 2 && onSafetyFlag) {
            onSafetyFlag({
              category: 'ai_conflicttheater_' + (safety.category || 'concerning'),
              match: safety.rationale || 'SEL conflict theater safety concern',
              severity: safety.tier >= 3 ? 'critical' : 'medium',
              source: 'sel_conflicttheater',
              context: msg.substring(0, 100),
              timestamp: new Date().toISOString(),
              aiGenerated: true,
              confidence: safety.tier >= 3 ? 0.9 : 0.7,
              tier: safety.tier
            });
          }

          // Process character responses
          var updatedDialogue = newDialogue.slice();
          var updatedMoods = Object.assign({}, charMoods);
          var totalHarmonyDelta = 0;
          var newPrinciples = Object.assign({}, principlesUsed);
          var ttsQueue = [];

          charResults.forEach(function(raw, i) {
            var p = prompts[i];
            var parsed = _parseTurnResponse(raw);
            if (!parsed) {
              parsed = { text: '...', mood: updatedMoods[p.cid] || 'calm', bodyLanguage: '', harmonyChange: 0, principlesAcknowledged: [] };
            }
            updatedDialogue.push({
              speaker: p.cid,
              text: parsed.text,
              mood: parsed.mood,
              bodyLanguage: parsed.bodyLanguage,
              ts: Date.now()
            });
            updatedMoods[p.cid] = parsed.mood;
            totalHarmonyDelta += parsed.harmonyChange;
            (parsed.principlesAcknowledged || []).forEach(function(prin) { newPrinciples[prin] = true; });
            if (ttsEnabled && callTTS && parsed.text) {
              ttsQueue.push({ text: parsed.text, voice: p.char.voice });
            }
            // Lazy-generate portrait for new mood (idempotent — no-op if cached)
            ensurePortrait(p.cid, parsed.mood);
          });

          // Average harmony delta across responders, clamp 0..100
          var avgDelta = responders.length > 0 ? totalHarmonyDelta / responders.length : 0;
          var newHarmony = Math.max(0, Math.min(100, harmony + avgDelta));

          // Check ending conditions
          var newTurnCount = turnCount + 1;
          var ending = _decideEnding(newHarmony, newPrinciples, newTurnCount);

          // Mid-conversation coach hint trigger:
          // After turn 3+, if no principles touched AND no hint shown yet AND
          // not already at an ending, generate a contextual hint via Gemini.
          // Fire-and-forget — the hint shows up when ready.
          var shouldHint = newTurnCount >= 3
            && !coachHintShown
            && !coachHintDismissed
            && !ending
            && Object.keys(newPrinciples).length === 0
            && callGemini;
          if (shouldHint) {
            var hintTranscript = updatedDialogue.slice(-8).map(function(m) {
              var who = m.speaker === 'student' ? 'Mediator' : ((CAST[m.speaker] && CAST[m.speaker].name) || m.speaker);
              return who + ': ' + m.text;
            }).join('\n');
            var missingPrinciples = ['acknowledged feelings', 'made space for both sides', 'named the harm specifically', 'proposed a concrete repair', 'named a need'];
            var hintPrompt = 'You are a warm SEL coach watching a student mediate a conflict. The student has been at it for ' + newTurnCount + ' turns and the harmony has '
              + (newHarmony >= scenario.initialHarmony ? 'risen' : 'dropped') + ' from ' + scenario.initialHarmony + ' to ' + Math.round(newHarmony) + '. They have not yet touched any of the restorative principles ('
              + missingPrinciples.join(', ') + ').\n\nScenario: ' + scenario.setup + '\n\nLast turns:\n' + hintTranscript + '\n\n'
              + 'Suggest ONE specific thing the student could try in their NEXT message. 1-2 sentences. Concrete and actionable. Reference what the characters have actually said. Speak directly to the student in second person ("Try saying..."). Do not lecture. No quotation marks.';
            // Use callGemini, suppress errors
            callGemini(hintPrompt).then(function(rawHint) {
              if (!rawHint) return;
              var hint = String(rawHint).trim().replace(/^["']+|["']+$/g, '');
              if (hint.length > 280) hint = hint.slice(0, 277) + '...';
              upd({ coachHint: hint, coachHintShown: true });
              announceSR('Coach hint available.');
            }).catch(function() { /* silent */ });
          }

          var stateUpdate = {
            dialogue: updatedDialogue,
            charMoods: updatedMoods,
            harmony: newHarmony,
            principlesUsed: newPrinciples,
            loading: false,
            _userTier: safety.tier || 0
          };
          if (ending) {
            stateUpdate.mode = 'ending';
            stateUpdate.ending = ending;
            announceSR('Conversation complete: ' + ending + '.');
            // The SEL hub's awardXP takes (amount); a leading id string was added to XP as text.
            if (ending === 'resolved') { sfxResolve(); celebrate && celebrate(); awardXP && awardXP(30); }
            else if (ending === 'deepened') { sfxBreakdown(); }
            else { awardXP && awardXP(15); }
            // Save this attempt to history for future compare-to-previous.
            // Cap at 12 most-recent attempts to bound state size.
            var newAttempt = {
              id: Date.now(),
              scenarioId: scenario.id,
              dialogue: updatedDialogue,
              harmony: newHarmony,
              principlesUsed: newPrinciples,
              ending: ending,
              ts: new Date().toISOString()
            };
            stateUpdate.attemptHistory = (attemptHistory || []).concat([newAttempt]).slice(-12);
          }
          upd(stateUpdate);

          // Cross-session memory: when scenario ends, generate a per-character
          // memory note via Gemini and persist to ctx.toolData.conflicttheater.memory.
          // Fire-and-forget — does not block UI. Falls back gracefully on failure.
          if (ending && callGemini) {
            scenario.characterIds.forEach(function(cid) {
              var ch = CAST[cid];
              if (!ch) return;
              var transcript = updatedDialogue.map(function(m) {
                var who = m.speaker === 'student' ? 'Mediator' : ((CAST[m.speaker] && CAST[m.speaker].name) || m.speaker);
                return who + ': ' + m.text;
              }).join('\n');
              var memoryPrompt = 'You are ' + ch.name + ', a ' + ch.age + '-year-old middle-schooler. You just had a mediated conversation about: "' + scenario.title + '" (' + scenario.setup.slice(0, 120) + '...). The outcome was: ' + ending + ' (final harmony ' + Math.round(newHarmony) + '/100).\n\n'
                + 'Conversation:\n' + transcript.slice(-1500) + '\n\n'
                + 'Write 1 to 2 sentences (UNDER 200 characters total) that you, ' + ch.name + ', would carry as your memory of this student mediator. Focus on what they tried, how it landed for you, and what feels unfinished if anything. Write in your own voice as ' + ch.name + ', not as a third-person observer. No quotation marks. Plain text only.';
              callGemini(memoryPrompt).then(function(noteRaw) {
                if (!noteRaw) return;
                var note = String(noteRaw).trim().replace(/^["']+|["']+$/g, '');
                if (note.length > 220) note = note.slice(0, 217) + '...';
                // Pull current memory from latest state (avoid stale closure)
                var curMem = (ctx.toolData && ctx.toolData.conflicttheater && ctx.toolData.conflicttheater.memory) || {};
                var prev = curMem[cid] || { relationshipScore: 0, scenariosPlayed: 0 };
                var deltaThisSession = newHarmony - scenario.initialHarmony;
                var nextEntry = {
                  memoryNote: note,
                  relationshipScore: (prev.relationshipScore || 0) + Math.round(deltaThisSession),
                  scenariosPlayed: (prev.scenariosPlayed || 0) + 1,
                  lastInteraction: new Date().toISOString(),
                  lastScenarioId: scenario.id,
                  lastEnding: ending
                };
                var nextMem = Object.assign({}, curMem);
                nextMem[cid] = nextEntry;
                upd('memory', nextMem);
              }).catch(function() { /* silent */ });
            });
          }

          // Sequential TTS
          if (ttsQueue.length && callTTS) {
            (function playNext(i) {
              if (i >= ttsQueue.length) return;
              var t = ttsQueue[i];
              try {
                var p = callTTS(t.text, { voice: t.voice });
                if (p && p.then) p.then(function() { playNext(i + 1); }).catch(function() { playNext(i + 1); });
                else setTimeout(function() { playNext(i + 1); }, 2500);
              } catch(e) { playNext(i + 1); }
            })(0);
          }

          // SR announce harmony shifts
          if (Math.abs(avgDelta) >= 5) {
            announceSR('Harmony ' + (avgDelta > 0 ? 'rose' : 'fell') + ' to ' + Math.round(newHarmony) + ' out of 100.');
          }
        }).catch(function() {
          upd({ loading: false });
          addToast && addToast('Could not get character responses. Try again.', 'error'); announceSR('Character responses were unavailable. Try again.');
        });
      }

      function resetScenario() {
        var freshMoods = Object.assign({}, scenario.initialMoods || {});
        scenario.characterIds.forEach(function(cid) { if (!freshMoods[cid]) freshMoods[cid] = 'calm'; });
        upd({
          dialogue: [],
          harmony: scenario.initialHarmony,
          principlesUsed: {},
          charMoods: freshMoods,
          studentInput: '',
          turnCount: 0,
          mode: 'scene',
          ending: null,
          _userTier: 0,
          addressing: 'both',
          coachHint: null,
          coachHintShown: false,
          coachHintDismissed: false
        });
      }

      function startScenario(sid) {
        var sc = SCENARIOS[sid];
        if (!sc) return;
        var freshMoods = Object.assign({}, sc.initialMoods || {});
        sc.characterIds.forEach(function(cid) { if (!freshMoods[cid]) freshMoods[cid] = 'calm'; });
        upd({
          scenarioId: sid,
          teacherSceneId: null,
          dialogue: [],
          harmony: sc.initialHarmony,
          principlesUsed: {},
          charMoods: freshMoods,
          studentInput: '',
          turnCount: 0,
          mode: 'opt-in',
          ending: null,
          _userTier: 0,
          addressing: 'both',
          coachHint: null,
          coachHintShown: false,
          coachHintDismissed: false
        });
      }

      // ──────────────────────────────────────────────────────────
      // No-AI modes (2026-11-04): scripted scene + student-written scene.
      // Zero AI calls: AdventureOffline is pure UI; safety is the local regex check.
      // ──────────────────────────────────────────────────────────
      var scriptStory = tsPlaying ? tsPlaying.story : (CT_SCRIPTS[scenario.id] || CT_SCRIPTS['lunch-money']);
      // Endings found / XP / reflections are keyed per script: a teacher scene is its own script.
      var scriptKey = tsPlaying ? 'teacher:' + tsPlaying.id : scenario.id;
      var _cftCrisis = (_userTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) ? window.SelHub.renderCrisisResources(h, band) : null;
      var _cftCard = { background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 12 };
      var _cftBtn = { minHeight: 44, padding: '9px 16px', borderRadius: 10, border: '1px solid #475569', background: 'transparent', color: _cftFg('#e2e8f0'), fontSize: 13, fontWeight: 700, cursor: 'pointer' };
      var _cftBtnPrimary = Object.assign({}, _cftBtn, { border: 'none', background: _cftHC ? _cftBg('#14b8a6') : '#0f766e', color: _cftFg('#fff') });
      function _scriptScene(id) {
        for (var i = 0; i < scriptStory.scenes.length; i++) { if (scriptStory.scenes[i].id === id) return scriptStory.scenes[i]; }
        return null;
      }
      function _cftLocalSafety(text) {
        if (!text || !window.SelHub || typeof window.SelHub.safeRehearseCheck !== 'function') return false;
        var r = window.SelHub.safeRehearseCheck(String(text), { toolId: 'conflicttheater', onSafetyFlag: onSafetyFlag });
        if (r && r.action === 'block') { upd('_userTier', 3); announceSR('Please use the support resources on this screen.'); return true; }
        return false;
      }
      function startScript(sid) {
        var id = (SCENARIOS[sid] && CT_SCRIPTS[sid]) ? sid : scenario.id;
        upd({ scenarioId: id, teacherSceneId: null, mode: 'script', scriptEnding: null, scriptPath: null, scriptRun: (d.scriptRun || 0) + 1, scriptReflectDraft: '', scriptReflectSaved: false });
        announceSR('Scripted scene started: ' + (SCENARIOS[id] || scenario).title + '.');
      }
      function startTeacherScript(ts) {
        upd({ teacherSceneId: ts.id, mode: 'script', scriptEnding: null, scriptPath: null, scriptRun: (d.scriptRun || 0) + 1, scriptReflectDraft: '', scriptReflectSaved: false });
        announceSR('Scripted scene started: ' + (ts.title || _ctTx('sel.conflicttheater.teacher.from', 'From your teacher')) + '.');
      }
      function reachScriptEnding(endId) {
        var done = Object.assign({}, d.scriptDone || {});
        var firstForScenario = !Object.keys(done).some(function(k) { return k.indexOf(scriptKey + ':') === 0; });
        done[scriptKey + ':' + endId] = true;
        upd({ scriptEnding: endId, scriptDone: done, scriptReflectSaved: false });
        if (firstForScenario && typeof awardXP === 'function') awardXP(10);
        announceSR('Ending reached. Read what worked, then reflect.');
      }
      // AdventureOffline.Player keeps its own path; its buttons carry data attributes we read on the way up.
      function onScriptClick(e) {
        var el = e && e.target && e.target.closest ? e.target.closest('[data-offline-choice],[data-offline-back],[data-offline-restart]') : null;
        if (!el) return;
        var to = el.getAttribute('data-offline-choice');
        var target = to ? _scriptScene(to) : null;
        if (target && target.ending) reachScriptEnding(to);
        else if (d.scriptEnding) upd('scriptEnding', null);
      }
      // Built-in player for an older host without AdventureOffline.
      function renderFallbackPlayer(story) {
        var path = (Array.isArray(d.scriptPath) ? d.scriptPath : []).filter(function(id) { return !!_scriptScene(id); });
        if (!path.length) path = [story.start];
        var cur = _scriptScene(path[path.length - 1]);
        var go = function(to) { upd('scriptPath', path.concat([to])); var sc = _scriptScene(to); if (sc && sc.ending) reachScriptEnding(to); };
        return h('section', { 'data-ct-fallback-player': 'true', 'aria-label': story.title, style: Object.assign({}, _cftCard, { padding: 18 }) },
          h('h3', { style: { margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: _cftFg('#f1f5f9') } }, cur.ending ? 'The end' : 'Step ' + path.length),
          h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: _cftFg('#e2e8f0') } }, cur.text),
          !cur.ending && h('div', { role: 'group', 'aria-label': 'Choices', style: { display: 'grid', gap: 8, marginTop: 14 } },
            cur.choices.map(function(c, i) {
              return h('button', { key: i, 'data-ct-choice': c.to, onClick: function() { go(c.to); }, style: Object.assign({}, _cftBtn, { textAlign: 'left', fontWeight: 600 }) }, c.label);
            })
          ),
          h('div', { style: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { disabled: path.length < 2, onClick: function() { upd({ scriptPath: path.slice(0, -1), scriptEnding: null }); }, style: _cftBtn }, '← Back'),
            h('button', { disabled: path.length < 2, onClick: function() { upd({ scriptPath: [story.start], scriptEnding: null }); }, style: cur.ending ? _cftBtnPrimary : _cftBtn }, cur.ending ? '↺ Play again' : '↺ Start over')
          )
        );
      }
      function renderReflectBox(cfg) {
        return h('div', { 'data-ct-reflect': cfg.id, style: Object.assign({}, _cftCard, { borderColor: '#0369a1' }) },
          h('label', { htmlFor: 'cft-reflect-' + cfg.id, style: { display: 'block', fontSize: 13, fontWeight: 800, color: _cftFg('#f1f5f9'), marginBottom: 6 } }, cfg.title),
          h('p', { style: { margin: '0 0 8px', fontSize: 12, color: _cftFg('#cbd5e1'), lineHeight: 1.5 } }, cfg.prompt),
          h('textarea', { id: 'cft-reflect-' + cfg.id, value: cfg.value || '', rows: 3, maxLength: 2000,
            onChange: function(e) { upd(cfg.draftKey, e.target.value); },
            style: { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid #475569', background: _cftBg('#0f172a'), color: _cftFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', resize: 'vertical' } }),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h('button', { 'data-ct-reflect-save': cfg.id, disabled: !String(cfg.value || '').trim(), onClick: cfg.onSave, style: _cftBtnPrimary }, 'Save reflection'),
            cfg.saved ? h('span', { role: 'status', style: { fontSize: 12, color: _cftFg('#94a3b8') } }, 'Saved to your work.') : null
          )
        );
      }
      var _cftBackBtn = h('button', { onClick: function() { upd({ mode: 'select', teacherSceneId: null }); }, style: Object.assign({}, _cftBtn, { minHeight: 32, padding: '4px 12px', fontSize: 11, color: _cftFg('#94a3b8') }) }, '← All scenarios');

      // MODE: script (scripted branching scene, no AI)
      if (mode === 'script') {
        var endCount = scriptStory.scenes.filter(function(s) { return s.ending; }).length;
        var foundCount = Object.keys(d.scriptDone || {}).filter(function(k) { return k.indexOf(scriptKey + ':') === 0; }).length;
        var castNames = scenario.characterIds.map(function(cid) { return CAST[cid] ? CAST[cid].avatar + ' ' + CAST[cid].name : cid; }).join('  ·  ');
        var playerEl = (_cftAO && typeof _cftAO.Player === 'function')
          ? h(_cftAO.Player, { key: scriptKey + ':' + (d.scriptRun || 0), story: scriptStory, t: _cftTr, theme: _cftTheme })
          : renderFallbackPlayer(scriptStory);
        return h('div', { style: { padding: 16, maxWidth: 720, margin: '0 auto' } },
          _cftCrisis,
          h('div', { style: { textAlign: 'center', marginBottom: 12 } },
            _cftBackBtn,
            h('h2', { id: 'cft-script-heading', style: { fontSize: 20, fontWeight: 800, color: _cftFg('#f1f5f9'), margin: '10px 0 2px' } }, tsPlaying ? (tsPlaying.title || _ctTx('sel.conflicttheater.teacher.from', 'From your teacher')) : scenario.title),
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: '0.05em' } }, tsPlaying ? _ctTx('sel.conflicttheater.teacher.from', 'From your teacher') : 'Scripted scene · ' + scene.label),
            tsPlaying ? null : h('div', { style: { fontSize: 13, color: _cftFg('#cbd5e1'), marginTop: 6 } }, castNames)
          ),
          tsPlaying ? (tsPlaying.intro ? h('p', { 'data-ct-teacher-intro': 'true', style: Object.assign({}, _cftCard, { fontSize: 13, color: _cftFg('#e2e8f0'), lineHeight: 1.6, whiteSpace: 'pre-wrap' }) }, tsPlaying.intro) : null)
            : h('div', { role: 'img', 'aria-label': scene.label + ' scene', style: { marginBottom: 12 } }, scene.svg(h)),
          h('p', { style: { fontSize: 12, color: _cftFg('#94a3b8'), margin: '0 0 10px', lineHeight: 1.5, textAlign: 'center' } }, 'Choose what you say. Each choice shows how they react. There is more than one ending; replay to find the others.'),
          h('div', { 'data-ct-script-player': tsPlaying ? scriptKey : scenario.id, onClick: onScriptClick }, playerEl),
          h('p', { style: { fontSize: 11, color: _cftFg('#94a3b8'), textAlign: 'center', margin: '10px 0' } }, 'Endings found: ' + foundCount + ' of ' + endCount),
          d.scriptEnding ? renderReflectBox({
            id: 'script', title: '✍️ Reflect', draftKey: 'scriptReflectDraft', value: d.scriptReflectDraft, saved: !!d.scriptReflectSaved,
            prompt: 'Which choice changed how the other person reacted? What is one thing you could try in a real disagreement?',
            onSave: function() {
              var txt = String(d.scriptReflectDraft || '').trim();
              if (!txt) return;
              _cftLocalSafety(txt);
              var list = (Array.isArray(d.scriptReflections) ? d.scriptReflections : []).concat([{ scenarioId: scriptKey, ending: d.scriptEnding, text: txt.slice(0, 2000), ts: new Date().toISOString() }]).slice(-20);
              upd({ scriptReflections: list, scriptReflectDraft: '', scriptReflectSaved: true });
              announceSR('Reflection saved.');
            }
          }) : null,
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // MODE: write (student-written conflict scene, no AI)
      if (mode === 'write') {
        var studentScenes = Array.isArray(d.studentScenes) ? d.studentScenes : [];
        var canWrite = !!(_cftAO && typeof _cftAO.Panel === 'function' && typeof _cftAO.findStudentStory === 'function');
        var mine = canWrite ? _cftAO.findStudentStory(studentScenes) : null;
        var myStory = mine && typeof _cftAO.normalize === 'function' ? _cftAO.normalize(mine.data.studentStory) : null;
        var myOk = !!(myStory && typeof _cftAO.validate === 'function' && _cftAO.validate(myStory).ok);
        // The writer saves through a history-style setter; here it is this tool's saved work.
        var setStudentScenes = function(next) {
          var cur = (ctx.toolData && ctx.toolData.conflicttheater && Array.isArray(ctx.toolData.conflicttheater.studentScenes)) ? ctx.toolData.conflicttheater.studentScenes : studentScenes;
          var val = typeof next === 'function' ? next(cur) : next;
          val = (Array.isArray(val) ? val : []).slice(-5);
          var latest = _cftAO.findStudentStory(val);
          if (latest && latest.data && latest.data.studentStory && Array.isArray(latest.data.studentStory.scenes)) {
            _cftLocalSafety([latest.data.studentStory.title || ''].concat(latest.data.studentStory.scenes.map(function(s) { return [s.text || ''].concat((s.choices || []).map(function(c) { return c.label || ''; })).join(' '); })).join(' '));
          }
          upd('studentScenes', val);
        };
        return h('div', { style: { padding: 16, maxWidth: 720, margin: '0 auto' } },
          _cftCrisis,
          h('div', { style: { textAlign: 'center', marginBottom: 12 } },
            _cftBackBtn,
            h('h2', { id: 'cft-write-heading', style: { fontSize: 20, fontWeight: 800, color: _cftFg('#f1f5f9'), margin: '10px 0 4px' } }, '✍️ Write your own conflict scene')
          ),
          h('div', { style: _cftCard },
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: _cftFg('#e2e8f0'), lineHeight: 1.6 } }, 'Make a short branching scene about an everyday disagreement. Use made-up characters, not real classmates. Start with the moment the conflict begins, add two or three things someone could say, and for each one write how the other person reacts. Finish with at least two endings: one where things get repaired and one that is not fixed yet.'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: _cftFg('#cbd5e1'), lineHeight: 1.7 } },
              h('li', null, 'Try an I-statement: "I felt ___ when ___."'),
              h('li', null, 'Show listening: someone says back what they heard.'),
              h('li', null, 'Let each person explain their side.'),
              h('li', null, 'A repair is an action, not only "sorry."')
            )
          ),
          canWrite ? h('div', { style: Object.assign({}, _cftCard, { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }) },
            h('button', { 'data-ct-open-writer': 'true', onClick: function() { upd({ writeOpen: true, writePlay: false }); }, style: _cftBtnPrimary }, mine ? '✏️ Keep writing' : '✏️ Open the scene writer'),
            myStory ? h('span', { style: { fontSize: 12, color: _cftFg('#cbd5e1') } }, (myStory.title || 'My conflict scene') + ' · ' + myStory.scenes.length + ' scenes · ' + (myOk ? 'ready to play' : 'not finished yet')) : null,
            myOk ? h('button', { 'data-ct-play-mine': 'true', 'aria-pressed': d.writePlay ? 'true' : 'false', onClick: function() { upd('writePlay', !d.writePlay); }, style: _cftBtn }, d.writePlay ? 'Hide my scene' : '▶ Play my scene') : null
          ) : h('div', { role: 'status', 'data-ct-writer-loading': 'true', style: Object.assign({}, _cftCard, { fontSize: 13, color: _cftFg('#cbd5e1') }) }, 'The scene writer is still loading. Try again in a moment; if it does not appear, ask your teacher to reload AlloFlow.'),
          canWrite && myOk && d.writePlay ? h('div', { style: { marginBottom: 12 } }, h(_cftAO.Player, { key: 'mine', story: myStory, t: _cftTr, theme: _cftTheme })) : null,
          renderReflectBox({
            id: 'write', title: '✍️ Reflect on your scene', draftKey: 'writeReflectDraft', value: d.writeReflectDraft, saved: !!d.writeReflectSaved,
            prompt: 'What might the other person in your scene be feeling? Which line from your scene could you use in real life?',
            onSave: function() {
              var txt = String(d.writeReflectDraft || '').trim();
              if (!txt) return;
              _cftLocalSafety(txt);
              upd({ writeReflection: { text: txt.slice(0, 2000), ts: new Date().toISOString() }, writeReflectDraft: '', writeReflectSaved: true });
              announceSR('Reflection saved.');
            }
          }),
          d.writeReflection && d.writeReflection.text ? h('p', { style: { fontSize: 12, color: _cftFg('#94a3b8'), margin: '0 0 12px', fontStyle: 'italic' } }, 'Last saved reflection: "' + d.writeReflection.text + '"') : null,
          canWrite && d.writeOpen ? h(_cftAO.Panel, { studentMode: true, t: _cftTr, theme: _cftTheme, history: studentScenes, setHistory: setStudentScenes, onClose: function() { upd('writeOpen', false); } }) : null,
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: select (scenario picker grid)
      // ──────────────────────────────────────────────────────────
      // ── Teacher scenes: the hub's shared student list + teacher editor (no AI needed; AI only drafts) ──
      function renderTeacherSceneList() { return tsCtl ? tsCtl.renderList({ onPlay: startTeacherScript }) : null; }
      function renderTeacherAuthorCard() { return tsCtl ? tsCtl.renderAuthor() : null; }
      if (mode === 'teacher-edit' && tsCtl) return tsCtl.renderEditor();
      if (mode === 'replay' && window.SelHubConflictReplay) {
        return window.SelHubConflictReplay.render(ctx, { h: h, fg: _cftFg, bg: _cftBg, bd: _cftBd, d: d, upd: upd, announceSR: announceSR, band: band });
      }
      if (mode === 'select') {
        var scenarioList = Object.keys(SCENARIOS).map(function(k) { return SCENARIOS[k]; });
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto' } },
          renderMemoryResetConfirm(),
          // ── Early-preview banner (Tier 1 #7: beta-gate ConflictTheater) ──
          h('div', {
            role: 'note',
            'aria-label': 'Early preview notice',
            style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.12)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: _cftFg('#fef3c7'), lineHeight: 1.6 }
          },
            h('strong', null, '🚧 Early preview. '),
            'This tool currently has one scenario. More scenes coming. Treat what you find here as a sample, not the complete experience.'
          ),
          h('div', { style: { textAlign: 'center', marginBottom: 18 } },
            h('div', { style: { fontSize: 48, marginBottom: 4 } }, '🎭'),
            h('h2', { id: 'cft-scenario-heading', tabIndex: -1, style: { fontSize: 22, fontWeight: 800, color: _cftFg('#f1f5f9'), marginBottom: 4 } }, 'Conflict Theater'),
            h('p', { style: { fontSize: 12, color: _cftFg('#94a3b8'), margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 } },
              _cftAiOn
                ? 'Pick a conflict to mediate. Each scenario has two AI characters with their own personalities, moods, and reasons. Practice acknowledging feelings, making space, naming harm, and proposing repair.'
                : 'Pick a conflict. Read what happens, choose what to say, and see how each person reacts. Every ending has a short debrief on what worked: listening, I-statements, seeing both sides, calming things down, and repair.'
            )
          ),
          // Teacher scenes first (no AI), then the teacher's editor entry
          renderTeacherSceneList(),
          renderTeacherAuthorCard(),
          // Scenario grid
          h('div', { role: 'list', 'aria-label': 'Available scenarios', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 14 } },
            scenarioList.map(function(sc) {
              var sceneObj = SCENES[sc.sceneId] || SCENES.cafeteria;
              var charsInScenario = sc.characterIds.map(function(cid) { return CAST[cid]; }).filter(Boolean);
              var hasWarning = !!sc.contentWarning;
              return h('button', {
                key: sc.id,
                role: 'listitem',
                'aria-label': 'Pick scenario: ' + sc.title + (hasWarning ? ' (content warning)' : ''),
                onClick: function() { startScenario(sc.id); announceSR('Selected scenario: ' + sc.title); },
                style: { textAlign: 'left', padding: 12, borderRadius: 12, border: '1px solid ' + (hasWarning ? '#92400e' : '#334155'), background: _cftBg('#1e293b'), color: _cftFg('#e2e8f0'), cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: _cftFg('#f1f5f9'), flex: 1 } }, sc.title),
                  h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: '0.05em' } }, sceneObj.label)
                ),
                h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 18 } },
                  charsInScenario.map(function(c) {
                    return h('span', { key: c.id, title: c.name, 'aria-label': c.name }, c.avatar);
                  })
                ),
                h('p', { style: { fontSize: 11, color: _cftFg('#cbd5e1'), margin: 0, lineHeight: 1.5 } }, sc.setup.length > 140 ? sc.setup.slice(0, 140) + '...' : sc.setup),
                hasWarning && h('div', { style: { fontSize: 10, color: _cftFg('#fbbf24'), fontWeight: 700, marginTop: 4 } }, '⚠️ Content warning')
              );
            })
          ),
          h('p', { style: { fontSize: 10, color: _cftFg('#64748b'), textAlign: 'center', margin: 0 } }, 'Click any scenario to read the full setup and start.'),
          // ── Write your own scene (no AI) ──
          h('button', {
            'data-ct-write-card': 'true',
            onClick: function() { upd({ mode: 'write' }); announceSR('Write your own conflict scene.'); },
            style: { width: '100%', textAlign: 'left', marginTop: 14, padding: 12, borderRadius: 12, border: '1px dashed #14b8a6', background: _cftBg('#1e293b'), color: _cftFg('#e2e8f0'), cursor: 'pointer' }
          },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _cftFg('#f1f5f9') } }, '✍️ Write your own conflict scene'),
            h('p', { style: { fontSize: 11, color: _cftFg('#cbd5e1'), margin: '4px 0 0', lineHeight: 1.5 } },
              'Create a short branching scene: what happens, what someone could say, and how the other person reacts. Saved to your work.')
          ),
          // ── Conflict Replay launch card (camera wave; hidden when AI/vision is off) ──
          ctx.callGeminiVision ? h('button', {
            'aria-label': 'Open Conflict Replay: act a scene, record it, and watch the tagged replay',
            onClick: function() { upd('mode', 'replay'); announceSR('Conflict Replay opened.'); },
            style: { width: '100%', textAlign: 'left', marginTop: 14, padding: 12, borderRadius: 12, border: '1px dashed #f59e0b', background: _cftBg('#1e293b'), color: _cftFg('#e2e8f0'), cursor: 'pointer' }
          },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _cftFg('#f1f5f9') } }, '🎬 Conflict Replay — act it, record it, re-shoot it'),
            h('p', { style: { fontSize: 11, color: _cftFg('#cbd5e1'), margin: '4px 0 0', lineHeight: 1.5 } },
              'Record up to 3 minutes of an ACTED conflict, watch the tagged replay (openers, bids, repair attempts), then re-shoot the scene with one change. Recordings stay on this device and are deleted when you finish.')
          ) : null,
          // Cross-session memory control: forget characters' memory of you
          Object.keys(memory).length > 0 && h('div', { style: { textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), marginBottom: 6 } },
              'Characters remember ' + Object.keys(memory).length + ' past conversation' + (Object.keys(memory).length === 1 ? '' : 's') + ' with you.'
            ),
            h('button', {
              id: 'cft-memory-reset-trigger',
              onClick: openMemoryResetConfirm,
              style: { padding: '4px 10px', minHeight: 24, background: 'transparent', color: _cftFg('#64748b'), border: '1px solid #334155', borderRadius: 8, fontSize: 10, cursor: 'pointer' }
            }, '🧹 Reset all character memory')
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: opt-in (per-scenario content warning + start)
      // ──────────────────────────────────────────────────────────
      if (mode === 'opt-in') {
        var charsInPlay = scenario.characterIds.map(function(cid) { return CAST[cid]; }).filter(Boolean);
        return h('div', { style: { padding: 24, maxWidth: 560, margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: 16 } },
            h('button', {
              'aria-label': 'Back to scenario list',
              onClick: function() { upd({ mode: 'select' }); },
              style: { padding: '4px 10px', background: 'transparent', color: _cftFg('#94a3b8'), border: '1px solid #334155', borderRadius: 8, fontSize: 11, cursor: 'pointer', marginBottom: 12 }
            }, '← All scenarios'),
            h('h2', { style: { fontSize: 20, fontWeight: 800, color: _cftFg('#f1f5f9'), margin: '0 0 4px' } }, scenario.title),
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: '0.05em' } }, scene.label)
          ),
          // Per-scenario content warning if present
          scenario.contentWarning && h('div', { style: { background: _cftBg('#451a03'), border: '1px solid #92400e', borderRadius: 12, padding: 14, marginBottom: 14 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: _cftFg('#fbbf24'), marginBottom: 6 } }, '⚠️ Content warning'),
            h('p', { style: { fontSize: 12, color: _cftFg('#fde68a'), margin: 0, lineHeight: 1.6 } }, scenario.contentWarning)
          ),
          // General safety reminder
          h('div', { style: { background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 11, color: _cftFg('#94a3b8'), lineHeight: 1.6 } },
            'Conflict Theater scenarios are realistic. If you are in active distress today, choose a different scenario or come back later. The crisis safety net is at the bottom of every screen.'
          ),
          // Setup
          h('div', { style: { background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 14 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: _cftFg('#e2e8f0'), marginBottom: 6 } }, 'The setup'),
            h('p', { style: { fontSize: 13, color: _cftFg('#cbd5e1'), margin: 0, lineHeight: 1.6 } }, scenario.setup)
          ),
          // Characters in play
          h('div', { style: { background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 18 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: _cftFg('#e2e8f0'), marginBottom: 8 } }, 'You\'ll be talking with'),
            charsInPlay.map(function(c) {
              var role = scenario.characterRoles[c.id] || '';
              var mem = memory[c.id];
              var entry = portraits[c.id] || {};
              var calmUrl = entry.calm || null;
              return h('div', { key: c.id, style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 } },
                calmUrl
                  ? h('img', { src: calmUrl, alt: c.name, style: { width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 } })
                  : h('div', { style: { fontSize: 28, lineHeight: 1, flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, c.avatar),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: _cftFg('#f1f5f9') } }, c.name + ' (' + c.age + ')'),
                    mem && h('span', { 'aria-label': 'You have talked with ' + c.name + ' before', title: 'Last interaction: ' + (mem.lastInteraction || '').slice(0, 10) + ' (relationship score ' + (mem.relationshipScore >= 0 ? '+' : '') + (mem.relationshipScore || 0) + ')', style: { fontSize: 9, padding: '2px 6px', borderRadius: 6, background: mem.relationshipScore >= 0 ? '#134e4a' : '#7f1d1d', color: mem.relationshipScore >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 } }, '🌱 You\'ve met before')
                  ),
                  role && h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), marginBottom: 2, fontStyle: 'italic' } }, role),
                  h('div', { style: { fontSize: 11, color: _cftFg('#cbd5e1'), lineHeight: 1.5 } }, c.backstory),
                  mem && mem.memoryNote && h('div', { style: { fontSize: 11, color: _cftFg('#cbd5e1'), lineHeight: 1.5, marginTop: 4, padding: '6px 8px', background: _cftBg('#0f172a'), borderLeft: '2px solid #14b8a6', borderRadius: 4 } },
                    h('span', { style: { fontSize: 9, color: _cftFg('#94a3b8'), textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: 2 } }, c.name + ' remembers'),
                    h('span', { style: { fontStyle: 'italic' } }, '"' + mem.memoryNote + '"')
                  )
                )
              );
            })
          ),
          h('div', { style: { textAlign: 'center', display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', {
              'aria-label': 'Start scenario',
              autoFocus: true,
              // Without AI, Start plays the scripted version of the same scenario.
              onClick: function() { if (!_cftAiOn) { startScript(scenario.id); return; } upd({ mode: 'scene' }); announceSR('Scene started. ' + charsInPlay.map(function(c){ return c.name; }).join(' and ') + ' appear.'); },
              style: { padding: '12px 32px', background: _cftHC ? _cftBg('#14b8a6') : '#0f766e', color: _cftFg('#fff'), border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(20,184,166,0.3)' }
            }, 'Start →'),
            _cftAiOn ? h('button', {
              'data-ct-start-script': 'true',
              onClick: function() { startScript(scenario.id); },
              style: { padding: '12px 20px', background: 'transparent', color: _cftFg('#e2e8f0'), border: '1px solid #475569', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }
            }, '📜 Play the scripted version') : null
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: ending
      // ──────────────────────────────────────────────────────────
      if (mode === 'ending') {
        var endingMeta = {
          'resolved': { icon: '🌱', label: 'Restorative repair', color: _cftFg('#22c55e'), summary: 'You acknowledged feelings, made space, named the harm specifically, and helped them get to a repair. That’s rare and hard.' },
          'partial': { icon: '🌤️', label: 'Partial — unfinished', color: _cftFg('#eab308'), summary: 'You moved things, but it’s not done. Sometimes that’s realistic. Try again with a different approach if you want.' },
          'deepened': { icon: '⛈️', label: 'Conflict deepened', color: _cftFg('#ef4444'), summary: 'It got worse. That happens. The thing to learn from is which moves shut things down vs opened them. Try again.' }
        };
        var em = endingMeta[endingType] || endingMeta.partial;
        var principleList = ['acknowledged', 'madeSpace', 'identifiedHarm', 'proposedRepair', 'namedNeed'];
        var principleLabels = { acknowledged: 'Acknowledged feelings', madeSpace: 'Made space', identifiedHarm: 'Named the harm specifically', proposedRepair: 'Proposed concrete repair', namedNeed: 'Named a need' };

        return h('div', { style: { padding: 20, maxWidth: 580, margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: 20 } },
            h('div', { style: { fontSize: 56, marginBottom: 8 } }, em.icon),
            h('h3', { style: { fontSize: 20, fontWeight: 800, color: em.color, marginBottom: 8 } }, em.label),
            h('p', { style: { fontSize: 13, color: _cftFg('#cbd5e1'), margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 } }, em.summary)
          ),
          // Harmony final
          h('div', { style: { padding: 14, background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Final harmony'),
            h('div', { className: 'ct-meter-track' },
              h('div', { className: 'ct-meter-fill', style: { width: Math.round(harmony) + '%', background: harmony >= 75 ? _cftFg('#22c55e') : harmony >= 40 ? _cftFg('#eab308') : _cftFg('#ef4444') } })
            ),
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), marginTop: 6 } }, Math.round(harmony) + ' / 100')
          ),
          // Principles touched
          h('div', { style: { padding: 14, background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Restorative principles you touched'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              principleList.map(function(p) {
                var hit = !!principlesUsed[p];
                return h('div', { key: p, style: { fontSize: 12, color: hit ? '#86efac' : _cftFg('#64748b'), display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { 'aria-hidden': 'true' }, hit ? '✓' : '·'),
                  h('span', null, principleLabels[p])
                );
              })
            )
          ),
          // What each character will remember (memory generation is async — show
          // loading until it arrives, then the actual note)
          h('div', { style: { padding: 14, background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'What they\'ll carry forward'),
            scenario.characterIds.map(function(cid) {
              var ch = CAST[cid];
              if (!ch) return null;
              var mem = memory[cid];
              var entry = portraits[cid] || {};
              var portraitUrl = entry.regretful || entry.calm || entry.listening || null;
              var thisSessionNote = mem && mem.lastScenarioId === scenario.id && mem.lastEnding === endingType;
              return h('div', { key: cid, style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 } },
                portraitUrl
                  ? h('img', { src: portraitUrl, alt: ch.name, style: { width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 } })
                  : h('span', { style: { fontSize: 22, lineHeight: 1, flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ch.avatar),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: _cftFg('#e2e8f0'), marginBottom: 2 } }, ch.name + ' will remember:'),
                  thisSessionNote
                    ? h('div', { style: { fontSize: 12, color: _cftFg('#cbd5e1'), lineHeight: 1.5, fontStyle: 'italic' } }, '"' + mem.memoryNote + '"')
                    : h('div', { style: { fontSize: 11, color: _cftFg('#64748b'), fontStyle: 'italic' } }, ch.name + ' is still thinking about this conversation...')
                )
              );
            })
          ),
          // Coach overlay
          scenario.coachingNotes && scenario.coachingNotes.length > 0 && h('div', { style: { padding: 14, background: _cftBg('#0c4a6e'), border: '1px solid #0369a1', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: _cftFg('#7dd3fc'), fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Coach notes'),
            scenario.coachingNotes.map(function(n, i) {
              return h('p', { key: i, style: { fontSize: 12, color: _cftFg('#e0f2fe'), margin: '0 0 6px 0', lineHeight: 1.5 } }, '• ' + n);
            })
          ),
          // Buttons
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', {
              'aria-label': 'Try again with different choices',
              onClick: resetScenario,
              style: { padding: '10px 20px', background: _cftHC ? _cftBg('#14b8a6') : '#0f766e', color: _cftFg('#fff'), border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }
            }, '↺ Try again'),
            // Compare-to-previous: only show if there are 2+ attempts of THIS scenario
            (function() {
              var sameScenario = (attemptHistory || []).filter(function(a) { return a.scenarioId === scenario.id; });
              if (sameScenario.length < 2) return null;
              return h('button', {
                onClick: function() { upd('mode', 'compare'); announceSR('Comparing this attempt to previous attempt.'); },
                style: { padding: '10px 20px', background: _cftBg('#0f172a'), color: _cftFg('#a5f3fc'), border: '1px solid #0891b2', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '⇆ Compare to previous');
            })(),
            h('button', {
              'aria-label': 'Print transcript',
              onClick: function() {
                if (!window.SelHub || !window.SelHub.printDoc) return;
                var transcriptItems = dialogue.map(function(m) {
                  var who = m.speaker === 'student' ? 'You (mediator)' : (CAST[m.speaker] && CAST[m.speaker].name) || m.speaker;
                  return who + ': ' + m.text;
                });
                window.SelHub.printDoc({
                  title: 'Conflict Theater — ' + scenario.title,
                  subtitle: 'Outcome: ' + em.label + '. Final harmony: ' + Math.round(harmony) + ' / 100.',
                  sections: [
                    { heading: 'Scenario', paragraphs: [scenario.setup] },
                    { heading: 'Transcript', items: transcriptItems },
                    { heading: 'Restorative principles you touched', items: principleList.filter(function(p) { return principlesUsed[p]; }).map(function(p) { return principleLabels[p]; }) },
                    { heading: 'Coach notes', items: scenario.coachingNotes || [] }
                  ]
                });
              },
              style: { padding: '10px 20px', background: _cftBg('#0f172a'), color: _cftFg('#e2e8f0'), border: '1px solid #475569', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '🖨 Print transcript'),
            h('button', {
              'aria-label': 'Back to opt-in',
              onClick: function() { upd({ mode: 'select' }); },
              style: { padding: '10px 20px', background: 'transparent', color: _cftFg('#94a3b8'), border: '1px solid #475569', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '← Exit')
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: compare (side-by-side this-attempt vs previous-attempt)
      // ──────────────────────────────────────────────────────────
      if (mode === 'compare') {
        var sameScenarioRuns = (attemptHistory || []).filter(function(a) { return a.scenarioId === scenario.id; });
        var thisAttempt = sameScenarioRuns[sameScenarioRuns.length - 1];
        var prevAttempt = sameScenarioRuns[sameScenarioRuns.length - 2];
        if (!thisAttempt || !prevAttempt) {
          // Defensive: shouldn't reach here, but render a fallback.
          return h('div', { style: { padding: 24, maxWidth: 560, margin: '0 auto', textAlign: 'center', color: _cftFg('#94a3b8') } },
            h('p', null, 'Need at least two attempts to compare. Try the scenario again first.'),
            h('button', { onClick: function() { upd('mode', 'ending'); }, style: { padding: '8px 16px', background: _cftHC ? _cftBg('#14b8a6') : '#0f766e', color: _cftFg('#fff'), border: 'none', borderRadius: 8, cursor: 'pointer' } }, '← Back')
          );
        }
        var endingColor = function(end) { return end === 'resolved' ? _cftFg('#22c55e') : end === 'partial' ? _cftFg('#eab308') : _cftFg('#ef4444'); };
        var endingIcon = function(end) { return end === 'resolved' ? '🌱' : end === 'partial' ? '🌤️' : '⛈️'; };
        function _renderColumn(att, label) {
          var transcript = (att.dialogue || []).map(function(m, i) {
            var who, color;
            if (m.speaker === 'student') { who = 'You'; color = _cftBg('#14b8a6'); }
            else { var c = CAST[m.speaker]; who = c ? c.name : m.speaker; color = _cftFg('#cbd5e1'); }
            return h('div', { key: i, style: { fontSize: 11, lineHeight: 1.5, marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid ' + (m.speaker === 'student' ? _cftBg('#14b8a6') : '#475569') } },
              h('span', { style: { fontWeight: 700, color: color, fontSize: 10, display: 'block', marginBottom: 1 } }, who),
              h('span', { style: { color: _cftFg('#e2e8f0') } }, m.text)
            );
          });
          var principleList = ['acknowledged', 'madeSpace', 'identifiedHarm', 'proposedRepair', 'namedNeed'];
          var principleLabels = { acknowledged: 'Acknowledged feelings', madeSpace: 'Made space', identifiedHarm: 'Named harm', proposedRepair: 'Proposed repair', namedNeed: 'Named a need' };
          return h('div', { style: { background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } },
            // Header
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid #334155' } },
              h('span', { style: { fontSize: 24 } }, endingIcon(att.ending)),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, label),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: endingColor(att.ending), textTransform: 'capitalize' } }, att.ending),
                h('div', { style: { fontSize: 10, color: _cftFg('#64748b') } }, 'Harmony: ' + Math.round(att.harmony) + ' / 100')
              )
            ),
            // Principles touched
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
              principleList.map(function(p) {
                var hit = !!(att.principlesUsed && att.principlesUsed[p]);
                return h('span', { key: p, title: principleLabels[p], style: { fontSize: 9, padding: '2px 6px', borderRadius: 6, background: hit ? '#134e4a' : _cftBg('#0f172a'), color: hit ? '#86efac' : '#475569', fontWeight: 600 } },
                  (hit ? '✓ ' : '· ') + principleLabels[p]
                );
              })
            ),
            // Transcript scroll
            h('div', { style: { maxHeight: 380, overflowY: 'auto', paddingRight: 4 } }, transcript.length ? transcript : h('div', { style: { fontSize: 11, color: _cftFg('#64748b'), fontStyle: 'italic' } }, '(no dialogue)'))
          );
        }
        return h('div', { style: { padding: 16, maxWidth: 1000, margin: '0 auto' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' } },
            h('div', null,
              h('h3', { style: { fontSize: 18, fontWeight: 800, color: _cftFg('#f1f5f9'), margin: '0 0 2px' } }, 'Comparing attempts'),
              h('div', { style: { fontSize: 11, color: _cftFg('#94a3b8') } }, scenario.title)
            ),
            h('button', {
              'aria-label': 'Back to outcome',
              onClick: function() { upd('mode', 'ending'); },
              style: { padding: '6px 14px', background: 'transparent', color: _cftFg('#94a3b8'), border: '1px solid #334155', borderRadius: 8, fontSize: 11, cursor: 'pointer' }
            }, '← Back to outcome')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 } },
            _renderColumn(prevAttempt, 'Previous attempt'),
            _renderColumn(thisAttempt, 'This attempt')
          ),
          // Quick delta summary
          h('div', { style: { padding: 12, background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 10, fontSize: 11, color: _cftFg('#cbd5e1'), lineHeight: 1.6 } },
            h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Delta'),
            (function() {
              var dh = Math.round(thisAttempt.harmony) - Math.round(prevAttempt.harmony);
              var prevP = Object.keys(prevAttempt.principlesUsed || {}).length;
              var nowP = Object.keys(thisAttempt.principlesUsed || {}).length;
              var pieces = [];
              pieces.push('Harmony ' + (dh >= 0 ? '+' : '') + dh);
              pieces.push('Principles ' + prevP + ' → ' + nowP);
              if (prevAttempt.ending !== thisAttempt.ending) pieces.push('Outcome shifted: ' + prevAttempt.ending + ' → ' + thisAttempt.ending);
              return pieces.join(' · ');
            })()
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: scene (active scenario)
      // ──────────────────────────────────────────────────────────

      var characters = scenario.characterIds.map(function(cid) { return CAST[cid]; });
      var harmonyColor = harmony >= 75 ? _cftFg('#22c55e') : harmony >= 40 ? _cftFg('#eab308') : _cftFg('#ef4444');

      // Crisis surface (Tier 3) — prominent, inside the scene
      var crisisSurface = (_userTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources)
        ? window.SelHub.renderCrisisResources(h, band)
        : null;

      // Lazy-trigger calm portrait generation for both characters on scene entry.
      // Idempotent — no-op if already cached or in flight.
      characters.forEach(function(c) { ensurePortrait(c.id, 'calm'); });
      // Also pre-fetch the current mood variant if it differs from calm.
      characters.forEach(function(c) {
        var m = charMoods[c.id] || 'calm';
        if (m !== 'calm') ensurePortrait(c.id, m);
      });

      // Render a single character's stage portrait: img if cached, emoji fallback.
      function _renderStagePortrait(c, sideStyle) {
        var mood = charMoods[c.id] || 'calm';
        var entry = portraits[c.id] || {};
        var url = entry[mood] || entry.calm || null;
        var isLoading = !!(entry._loading && (entry._loading[mood] || entry._loading.calm));
        var portraitNode;
        if (url) {
          portraitNode = h('img', {
            src: url,
            alt: c.name + ', ' + mood,
            className: 'ct-mood-pulse',
            key: 'img-' + c.id + '-' + mood,
            style: { width: 88, height: 88, borderRadius: 12, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'opacity 0.3s', display: 'block', margin: '0 auto' }
          });
        } else {
          portraitNode = h('div', {
            className: 'ct-portrait ct-portrait-' + mood + ' ct-mood-pulse',
            key: 'emoji-' + c.id + '-' + mood,
            style: isLoading ? { opacity: 0.6 } : null
          }, c.avatar);
        }
        return h('div', { style: Object.assign({ position: 'absolute', top: 70, textAlign: 'center', pointerEvents: 'none' }, sideStyle) },
          portraitNode,
          h('div', { style: { fontSize: 11, fontWeight: 700, color: url ? _cftFg('#f1f5f9') : _cftBg('#1e293b'), marginTop: 4, textShadow: url ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' } }, c.name),
          isLoading && !url && h('div', { style: { fontSize: 9, color: _cftFg('#64748b'), marginTop: 2 } }, 'sketching...')
        );
      }

      // Stage with scene SVG + overlaid character portraits
      var stage = h('div', { className: 'ct-stage', role: 'img', 'aria-label': 'Conflict scene with ' + characters.map(function(c) { return c.name; }).join(' and '), style: { marginBottom: 12 } },
        scene.svg(h),
        _renderStagePortrait(characters[0], { left: '8%' }),
        _renderStagePortrait(characters[1], { right: '8%' })
      );

      // Harmony meter + per-character mood pips
      var meters = h('div', { style: { display: 'flex', gap: 12, marginBottom: 12, padding: 12, background: _cftBg('#1e293b'), border: '1px solid #334155', borderRadius: 10 } },
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Harmony'),
          h('div', { className: 'ct-meter-track', role: 'progressbar', 'aria-valuenow': Math.round(harmony), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Harmony with ' + characters.map(function(c) { return c.name; }).join(' and ') + ': ' + Math.round(harmony) + ' percent' },
            h('div', { className: 'ct-meter-fill', style: { width: Math.round(harmony) + '%', background: harmonyColor } })
          ),
          h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), marginTop: 4 } }, Math.round(harmony) + ' / 100')
        ),
        characters.map(function(c) {
          var mood = charMoods[c.id] || 'calm';
          return h('div', { key: c.id, 'aria-label': c.name + ' is ' + mood, style: { textAlign: 'center', minWidth: 70 } },
            h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, c.name),
            h('div', { style: { fontSize: 11, color: _cftFg('#cbd5e1'), textTransform: 'capitalize' } }, mood)
          );
        })
      );

      // Dialogue history
      var dialogueView = h('div', { role: 'log', 'aria-label': 'Conflict conversation', 'aria-live': 'polite', 'aria-busy': loading ? 'true' : 'false', style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 240, overflowY: 'auto', padding: 8 } },
        dialogue.length === 0
          ? h('div', { style: { fontSize: 12, color: _cftFg('#64748b'), fontStyle: 'italic', textAlign: 'center', padding: 20 } }, 'Open the conversation. What would you say?')
          : dialogue.map(function(m, i) {
              var who, bubbleClass;
              if (m.speaker === 'student') { who = 'You'; bubbleClass = 'ct-bubble ct-bubble-student'; }
              else { var c = CAST[m.speaker]; who = c ? c.name : m.speaker; bubbleClass = 'ct-bubble'; }
              return h('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: m.speaker === 'student' ? 'flex-end' : 'flex-start', gap: 2 } },
                h('div', { style: { fontSize: 10, color: _cftFg('#94a3b8'), fontWeight: 600, padding: '0 6px' } }, who + (m.bodyLanguage ? ' · ' + m.bodyLanguage : '')),
                h('div', { className: bubbleClass }, m.text)
              );
            }),
        loading && h('div', { role: 'status', 'aria-live': 'polite', 'aria-label': 'Characters are responding' }, 'Characters are responding...')
      );

      // Coach hint card (dismissible)
      var coachHintCard = (coachHint && !coachHintDismissed) ? h('div', { role: 'note', 'aria-label': 'Coach hint', style: { padding: '10px 14px', marginBottom: 8, background: _cftBg('#0c4a6e'), border: '1px solid #0369a1', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 } },
        h('span', { 'aria-hidden': 'true', style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, '💡'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 10, color: _cftFg('#7dd3fc'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 } }, 'Coach has a thought'),
          h('div', { style: { fontSize: 12, color: _cftFg('#e0f2fe'), lineHeight: 1.5 } }, coachHint)
        ),
        h('button', {
          'aria-label': 'Dismiss coach hint',
          onClick: function() { upd('coachHintDismissed', true); },
          style: { padding: '2px 8px', background: 'transparent', color: _cftFg('#7dd3fc'), border: '1px solid #0369a1', borderRadius: 6, fontSize: 10, cursor: 'pointer', flexShrink: 0 }
        }, 'Got it')
      ) : null;

      // Addressing toggle
      var addrToggle = h('div', { role: 'radiogroup', 'aria-label': 'Address', style: { display: 'flex', gap: 6, marginBottom: 8 } },
        characters.concat([{ id: 'both', name: 'Mediate (both)' }]).map(function(opt) {
          var on = addressing === opt.id;
          return h('button', { key: opt.id,
            role: 'radio', 'aria-checked': on ? 'true' : 'false', 'aria-label': 'Address ' + opt.name,
            onClick: function() { upd('addressing', opt.id); },
            style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (on ? _cftBg('#14b8a6') : '#475569'), background: on ? '#134e4a' : 'transparent', color: on ? '#ccfbf1' : _cftFg('#94a3b8'), fontSize: 11, fontWeight: 600, cursor: 'pointer' }
          }, opt.name);
        }),
        h('label', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: _cftFg('#94a3b8'), cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: ttsEnabled, onChange: function(e) { upd('ttsEnabled', e.target.checked); }, 'aria-label': 'Enable voice' }),
          'Voice'
        )
      );

      // Input + send
      var inputRow = h('div', { style: { display: 'flex', gap: 8 } },
        h('textarea', { 'aria-label': 'Your message',
          value: studentInput,
          onChange: function(e) { upd('studentInput', e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey && studentInput.trim() && !loading) { e.preventDefault(); sendTurn(); } },
          placeholder: addressing === 'both' ? 'Say something to both of them...' : 'Say something to ' + (CAST[addressing] ? CAST[addressing].name : '...'),
          rows: 2,
          disabled: loading,
          style: { flex: 1, padding: 10, borderRadius: 10, border: '1px solid #334155', background: _cftBg('#0f172a'), color: _cftFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }
        }),
        h('button', {
          'aria-label': loading ? 'Waiting for characters to respond' : 'Send message',
          onClick: function() { if (studentInput.trim() && !loading) sendTurn(); },
          disabled: loading || !studentInput.trim(),
          style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: loading || !studentInput.trim() ? '#334155' : _cftBg('#14b8a6'), color: _cftFg('#fff'), fontWeight: 700, fontSize: 13, cursor: loading || !studentInput.trim() ? 'default' : 'pointer' }
        }, loading ? '⋯' : '↑')
      );

      var exitBtn = h('div', { style: { textAlign: 'center', marginTop: 10 } },
        h('button', {
          'aria-label': 'Exit scene',
          onClick: function() { upd({ mode: 'opt-in' }); },
          style: { padding: '6px 14px', background: 'transparent', color: _cftFg('#64748b'), border: '1px solid #334155', borderRadius: 8, fontSize: 11, cursor: 'pointer' }
        }, '← Exit')
      );

      return h('div', { style: { padding: 16, maxWidth: 640, margin: '0 auto' } },
        crisisSurface,
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('conflicttheater', h, ctx) : null),
        stage,
        meters,
        dialogueView,
        coachHintCard,
        addrToggle,
        inputRow,
        exitBtn,
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });

  console.log('[SelHub] sel_tool_conflicttheater.js loaded — Conflict Theater v0.1');

  // ═══════════════════════════════════════════════════════════════
  // Conflict Replay wave (2026-07-17, design: docs/conflict_replay_design.md)
  // Students ACT a conflict from a theater card, record ≤3 minutes,
  // and get back a tagged timeline (acting-out-cycle arc + Gottman-derived
  // OBSERVABLE moment vocabulary) with SIP pause questions and ONE
  // Selman-leveled re-shoot suggestion. A lens and a conversation
  // scaffold — never a measurement, never a prediction.
  //
  // INVARIANT-6 (ephemeral footage): recordings and analysis live ONLY in
  // this transient module variable — never in ctx.update/toolData, never in
  // any browser storage, never uploaded except the single in-memory
  // analysis call. Tags persist ONLY via the explicit adult Save button.
  var _crT = { stream: null, rec: null, chunks: [], blob: null, url: null, timer: null, secs: 0, takes: [null, null], analyzing: false, err: null };
  function _crRelease(full) {
    try { if (_crT.stream) _crT.stream.getTracks().forEach(function(t) { t.stop(); }); } catch (_) {}
    try { if (_crT.url) URL.revokeObjectURL(_crT.url); } catch (_) {}
    if (_crT.timer) { clearInterval(_crT.timer); }
    _crT.stream = null; _crT.rec = null; _crT.chunks = []; _crT.blob = null; _crT.url = null; _crT.timer = null; _crT.secs = 0; _crT.analyzing = false; _crT.err = null;
    if (full) { _crT.takes = [null, null]; }
  }
  window.addEventListener('beforeunload', function() { _crRelease(true); });

  // INVARIANT-3 caption — rendered on every analysis surface.
  var _CR_CAPTION = 'These are conversation starters an AI noticed — not an assessment of any student.';
  // Prompt pins invariants 1/2/4/5/8/9. Speaker A/B de-identification is the default and only register.
  var _CR_PROMPT = [
    'You are helping students review a ROLEPLAYED (acted) peer conflict they recorded on purpose to practice repair skills.',
    'Tag OBSERVABLE moments only, using this vocabulary: opener (soft or harsh start), escalation (voice, interruption, body cues), bid (an attempt to connect, lighten, or fix — received, missed, or turned away), repair (an attempt to make it right — landed or not), flooding (someone may need a break).',
    'Rules you must never break:',
    '- Refer to people ONLY as "Speaker A" and "Speaker B". Never guess names, ages, or identities.',
    '- Describe behaviors, never traits: name the MOMENT ("a criticism-shaped opener at 0:12"), never the PERSON ("Speaker A is critical").',
    '- Never predict the future of any relationship or person. No risk language, no trajectories.',
    '- No scores, grades, percentages, or ratios of any kind.',
    '- kidLine wording must be warm, plain, and shame-free (grade 3-8 reading level).',
    '- repairSuggestion: ONE next-step invitation phrased as "You could try..." matched one small step above what you observed (impulsive -> unilateral -> reciprocal -> collaborative register). Do not name or mention the level itself.',
    '- If the footage shows real distress, physical aggression, threats, or anything that does not look like acting, set "crisis": true and return NO tags.',
    'Return ONLY minified JSON, no markdown fences: {"crisis":false,"arc":[{"phase":"trigger|agitation|acceleration|peak|deescalation|recovery","t":seconds}],"tags":[{"t":seconds,"type":"opener|escalation|bid|repair|flooding","speaker":"A|B","kidLine":string,"evidence":string,"received":true|false|null}],"pausePoints":[{"t":seconds,"why":string}],"repairSuggestion":string,"debriefSeeds":[string]}',
  ].join('\n');
  var _CR_TAG_META = {
    opener: { icon: '🚪', label: 'Opener' }, escalation: { icon: '📈', label: 'Heating up' },
    bid: { icon: '🤝', label: 'Bid' }, repair: { icon: '🔧', label: 'Repair attempt' }, flooding: { icon: '🌊', label: 'Flooded?' }
  };
  function _crFmtT(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function _crParse(raw) {
    try {
      var txt = String(raw || '').replace(/^[\s\S]*?\{/, '{').replace(/\}[^}]*$/, '}');
      var j = JSON.parse(txt);
      if (j.crisis === true) return { crisis: true };
      if (!Array.isArray(j.tags) || !Array.isArray(j.arc)) return null;
      // Fail-closed field validation: drop malformed entries rather than invent.
      j.tags = j.tags.filter(function(t) { return t && _CR_TAG_META[t.type] && typeof t.kidLine === 'string' && (t.speaker === 'A' || t.speaker === 'B'); }).slice(0, 24);
      j.pausePoints = (Array.isArray(j.pausePoints) ? j.pausePoints : []).slice(0, 3);
      j.debriefSeeds = (Array.isArray(j.debriefSeeds) ? j.debriefSeeds : []).filter(function(x) { return typeof x === 'string'; }).slice(0, 4);
      j.repairSuggestion = typeof j.repairSuggestion === 'string' ? j.repairSuggestion : '';
      return j;
    } catch (_) { return null; }
  }

  window.SelHubConflictReplay = { render: function(ctx, env) {
    var h = env.h, fg = env.fg, bg = env.bg, d = env.d, upd = env.upd, announceSR = env.announceSR;
    var r = d.replay || {};
    var updR = function(patch) { var next = Object.assign({}, r, patch); upd('replay', next); };
    var step = r.step || 'consent';
    var take = r.take || 1;
    var vision = ctx.callGeminiVision;
    var exit = function() { _crRelease(true); if (ctx.updateMulti) ctx.updateMulti('conflicttheater', { mode: 'select', replay: { savedTags: r.savedTags || null } }); else upd('mode', 'select'); };
    var card = function(children, extra) { return h('div', Object.assign({ style: { padding: 14, borderRadius: 12, background: bg('#1e293b'), border: '1px solid #334155', marginBottom: 12 } }, extra || {}), children); };
    var caption = h('p', { role: 'note', style: { fontSize: 11, color: fg('#94a3b8'), fontStyle: 'italic', margin: '8px 0 0' } }, '🔍 ' + _CR_CAPTION);
    var head = h('div', { style: { textAlign: 'center', marginBottom: 14 } },
      h('div', { style: { fontSize: 40 } }, '🎬'),
      h('h2', { tabIndex: -1, style: { fontSize: 20, fontWeight: 800, color: fg('#f1f5f9'), margin: '2px 0' } }, 'Conflict Replay'),
      h('p', { style: { fontSize: 12, color: fg('#94a3b8'), margin: 0 } }, 'Act it. Watch it back. Re-shoot it better. Take ' + take + ' of 2.'));
    var backBtn = h('button', { onClick: exit, style: { padding: '6px 12px', borderRadius: 8, border: '1px solid #475569', background: 'transparent', color: fg('#cbd5e1'), cursor: 'pointer', fontSize: 12 } }, '← Back to Conflict Theater');

    // ── Step: consent (INVARIANT-10 — the recorder is unreachable until affirmed) ──
    if (step === 'consent') {
      var c1 = !!r.cActors, c2 = !!r.cDevice, c3 = !!r.cAdult;
      var all = c1 && c2 && c3;
      var chk = function(key, val, label) {
        return h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: fg('#e2e8f0'), cursor: 'pointer', marginBottom: 8, lineHeight: 1.5 } },
          h('input', { type: 'checkbox', checked: val, onChange: function(ev) { var p = {}; p[key] = ev.target.checked; updR(p); } }), label);
      };
      return h('div', { style: { padding: 20, maxWidth: 640, margin: '0 auto' } }, head,
        card([
          h('h3', { key: 'h', style: { fontSize: 14, fontWeight: 800, color: fg('#f1f5f9'), marginTop: 0 } }, '📋 Before the camera turns on'),
          chk('cActors', c1, 'Everyone on camera is an ACTOR in this practice scene, and we all agreed to record it.'),
          chk('cDevice', c2, 'The recording stays on this device and is deleted automatically when we finish or close the tab. It is never saved.'),
          chk('cAdult', c3, 'A teacher or counselor is with us for the watch-back conversation.'),
          h('p', { key: 'n', style: { fontSize: 11, color: fg('#94a3b8'), lineHeight: 1.5, margin: '10px 0 0' } },
            'This is coaching practice, not discipline: nothing here can be used for consequences, and the AI\'s tags are conversation starters, not judgments. Conflict Replay is for everyday practice conflicts — anything bigger belongs with your adult, not a camera.'),
          caption
        ]),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
          backBtn,
          h('button', {
            disabled: !all || !vision,
            onClick: function() { if (all) { updR({ step: 'record' }); announceSR('Consent affirmed. Recorder ready.'); } },
            style: { padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: all && vision ? 'pointer' : 'not-allowed', background: all && vision ? '#f59e0b' : '#475569', color: '#1e293b' }
          }, vision ? '🎥 Open the recorder' : 'AI features are turned off')));
    }

    // ── Step: record (≤180s hard cap; footage → _crT only) ──
    if (step === 'record') {
      var recording = !!(_crT.rec && _crT.rec.state === 'recording');
      var startRec = function() {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
          _crT.stream = stream; _crT.chunks = []; _crT.secs = 0;
          var v = document.getElementById('cr-live'); if (v) { v.srcObject = stream; v.muted = true; v.play().catch(function() {}); }
          var mr = new MediaRecorder(stream);
          _crT.rec = mr;
          mr.ondataavailable = function(ev) { if (ev.data && ev.data.size) _crT.chunks.push(ev.data); };
          mr.onstop = function() {
            var blob = new Blob(_crT.chunks, { type: mr.mimeType || 'video/webm' });
            _crT.chunks = [];
            try { if (_crT.stream) _crT.stream.getTracks().forEach(function(t) { t.stop(); }); } catch (_) {}
            _crT.stream = null;
            if (blob.size > 19 * 1024 * 1024) { _crT.err = 'That take is too big to analyze (' + Math.round(blob.size / 1048576) + ' MB — limit ~19). Try a shorter or lower-light take.'; updR({ step: 'record' }); return; }
            if (_crT.url) { try { URL.revokeObjectURL(_crT.url); } catch (_) {} }
            _crT.blob = blob; _crT.url = URL.createObjectURL(blob); _crT.err = null;
            updR({ step: 'analyzing' });
            var fr = new FileReader();
            fr.onload = function() {
              var b64 = String(fr.result || '').split(',')[1] || '';
              vision(_CR_PROMPT, b64, blob.type || 'video/webm').then(function(res) {
                var parsed = _crParse(res);
                if (parsed && parsed.crisis) {
                  _crRelease(); // INVARIANT-9: stop, discard, route to adults
                  if (typeof ctx.onSafetyFlag === 'function') { try { ctx.onSafetyFlag({ tool: 'conflicttheater', kind: 'replay-crisis' }); } catch (_) {} }
                  updR({ step: 'crisis' }); return;
                }
                _crT.takes[take - 1] = parsed; // may be null → "analysis unavailable"
                _crT.analyzing = false;
                updR({ step: 'replay' });
                announceSR(parsed ? 'Replay ready with ' + parsed.tags.length + ' tagged moments.' : 'Replay ready. Analysis unavailable.');
              }).catch(function() { _crT.takes[take - 1] = null; updR({ step: 'replay' }); });
            };
            fr.readAsDataURL(blob);
          };
          mr.start();
          _crT.timer = setInterval(function() {
            _crT.secs++;
            var el = document.getElementById('cr-timer'); if (el) el.textContent = _crFmtT(_crT.secs) + ' / 3:00';
            if (_crT.secs >= 180 && mr.state === 'recording') { clearInterval(_crT.timer); _crT.timer = null; mr.stop(); }
          }, 1000);
          updR({ step: 'record' });
        }).catch(function() { _crT.err = 'Camera and microphone permission is needed to record the scene.'; updR({ step: 'record' }); });
      };
      return h('div', { style: { padding: 20, maxWidth: 640, margin: '0 auto' } }, head,
        card([
          h('video', { key: 'v', id: 'cr-live', playsInline: true, style: { width: '100%', borderRadius: 10, background: '#000', minHeight: 200 } }),
          h('div', { key: 't', id: 'cr-timer', 'aria-live': 'polite', style: { textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: fg('#fbbf24'), marginTop: 6 } }, recording ? _crFmtT(_crT.secs) + ' / 3:00' : 'Up to 3 minutes'),
          _crT.err ? h('p', { key: 'e', style: { fontSize: 12, color: fg('#fbbf24'), marginTop: 6 } }, '⚠️ ' + _crT.err) : null,
          take === 2 && r.tryThis ? h('p', { key: 'g', style: { fontSize: 12.5, color: fg('#e2e8f0'), background: bg('#0f172a'), padding: 10, borderRadius: 8, marginTop: 8, lineHeight: 1.5 } }, '🎯 This take: ' + r.tryThis) : null
        ]),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
          backBtn,
          recording
            ? h('button', { onClick: function() { if (_crT.timer) { clearInterval(_crT.timer); _crT.timer = null; } _crT.rec.stop(); }, style: { padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: '#b91c1c', color: '#fff' } }, '⏹ Stop & watch back')
            : h('button', { onClick: startRec, style: { padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: '#f59e0b', color: '#1e293b' } }, '⏺ Action!')));
    }

    if (step === 'analyzing') {
      return h('div', { style: { padding: 40, textAlign: 'center' } },
        h('div', { style: { fontSize: 40 } }, '🎞️'),
        h('p', { style: { color: fg('#e2e8f0'), fontSize: 14, fontWeight: 700 } }, 'Watching your scene for repair moments…'),
        h('p', { style: { color: fg('#94a3b8'), fontSize: 12 } }, 'The recording stays on this device and is deleted when you finish.'));
    }

    // ── Step: crisis (INVARIANT-9) ──
    if (step === 'crisis') {
      return h('div', { style: { padding: 20, maxWidth: 560, margin: '0 auto' } },
        card([
          h('h3', { key: 'h', style: { color: fg('#fbbf24'), fontSize: 15, marginTop: 0 } }, '🧡 Let\'s pause here'),
          h('p', { key: 'p', style: { color: fg('#e2e8f0'), fontSize: 13, lineHeight: 1.6 } },
            'This looked bigger than a practice conflict, so the recording was deleted and no tags were made. That\'s not a judgment — some things deserve a person, not a camera. Please talk with the teacher or counselor in the room.'),
          window.SelHub && typeof window.SelHub.renderCrisisResources === 'function' ? window.SelHub.renderCrisisResources(h, env.band) : null
        ]),
        h('div', { style: { textAlign: 'center' } }, backBtn));
    }

    // ── Step: replay (tagged timeline; adult may remove tags — AI proposes, human disposes) ──
    if (step === 'replay') {
      var a = _crT.takes[take - 1];
      var removed = r.removedIdx || {};
      var seek = function(t) { var v = document.getElementById('cr-play'); if (v && isFinite(t)) { v.currentTime = t; v.play().catch(function() {}); } };
      var tagRows = a ? a.tags.map(function(tg, i) {
        if (removed[take + ':' + i]) return null;
        var m = _CR_TAG_META[tg.type];
        return h('div', { key: i, style: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #334155' } },
          h('button', { onClick: function() { seek(tg.t); }, 'aria-label': 'Jump to ' + _crFmtT(tg.t), style: { fontVariantNumeric: 'tabular-nums', fontSize: 11.5, fontWeight: 800, color: fg('#7dd3fc'), background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 } }, _crFmtT(tg.t)),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 12.5, fontWeight: 700, color: fg('#f1f5f9') } }, m.icon + ' ' + m.label + ' — Speaker ' + tg.speaker + (tg.type === 'bid' || tg.type === 'repair' ? (tg.received === true ? ' · received' : tg.received === false ? ' · missed' : '') : '')),
            h('div', { style: { fontSize: 12, color: fg('#cbd5e1'), lineHeight: 1.5 } }, tg.kidLine),
            tg.evidence ? h('div', { style: { fontSize: 10.5, color: fg('#94a3b8'), fontStyle: 'italic' } }, tg.evidence) : null),
          h('button', { onClick: function() { var p = {}; p[take + ':' + i] = true; updR({ removedIdx: Object.assign({}, removed, p) }); }, 'aria-label': 'Remove this tag (adult)', title: 'Remove this tag (adult)', style: { border: 'none', background: 'transparent', color: fg('#94a3b8'), cursor: 'pointer', fontSize: 12 } }, '✕'));
      }).filter(Boolean) : null;
      return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto' } }, head,
        card([
          _crT.url ? h('video', { key: 'v', id: 'cr-play', src: _crT.url, controls: true, playsInline: true, style: { width: '100%', borderRadius: 10, background: '#000' } }) : h('p', { key: 'nv', style: { color: fg('#94a3b8'), fontSize: 12 } }, 'The recording was already released.'),
          a && a.arc.length ? h('div', { key: 'arc', 'aria-label': 'Conflict arc', style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 } }, a.arc.map(function(ph, i) {
            return h('button', { key: i, onClick: function() { seek(ph.t); }, style: { fontSize: 10.5, padding: '3px 8px', borderRadius: 999, border: '1px solid #475569', background: 'transparent', color: fg('#cbd5e1'), cursor: 'pointer' } }, ph.phase + ' ' + _crFmtT(ph.t));
          })) : null,
          caption
        ]),
        a ? card([h('h3', { key: 'h', style: { fontSize: 13.5, fontWeight: 800, color: fg('#f1f5f9'), marginTop: 0 } }, '🏷️ Tagged moments'), tagRows && tagRows.length ? tagRows : h('p', { key: 'none', style: { fontSize: 12, color: fg('#94a3b8') } }, 'No tagged moments — that can happen with short or quiet takes.')])
          : card([h('p', { key: 'na', style: { fontSize: 12.5, color: fg('#94a3b8'), margin: 0 } }, 'Analysis unavailable for this take — you can still re-watch and talk it through together.')]),
        a && a.pausePoints.length ? card([
          h('h3', { key: 'h', style: { fontSize: 13.5, fontWeight: 800, color: fg('#f1f5f9'), marginTop: 0 } }, '⏸️ Pause and think'),
          a.pausePoints.map(function(pp, i) {
            return h('div', { key: i, style: { marginBottom: 8 } },
              h('button', { onClick: function() { seek(pp.t); }, style: { fontSize: 11.5, fontWeight: 800, color: fg('#7dd3fc'), background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 } }, _crFmtT(pp.t) + (pp.why ? ' — ' + pp.why : '')),
              h('p', { style: { fontSize: 12, color: fg('#cbd5e1'), margin: '2px 0 0', lineHeight: 1.5 } }, 'What did you see? What did you think it meant? What else could it have meant?'));
          })
        ]) : null,
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
          backBtn,
          take === 1 && a && a.repairSuggestion ? h('button', { onClick: function() { updR({ step: 'record', take: 2, tryThis: a.repairSuggestion }); announceSR('Re-shoot with one change.'); }, style: { padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: '#f59e0b', color: '#1e293b' } }, '🎬 Re-shoot with one change') : null,
          take === 2 ? h('button', { onClick: function() { updR({ step: 'debrief' }); }, style: { padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: '#22c55e', color: '#0f172a' } }, '🗣️ Debrief') : (a ? h('button', { onClick: function() { updR({ step: 'debrief' }); }, style: { padding: '8px 14px', borderRadius: 10, border: '1px solid #475569', background: 'transparent', color: fg('#cbd5e1'), fontSize: 12, cursor: 'pointer' } }, 'Skip to debrief') : null)));
    }

    // ── Step: debrief (restorative + Peacemakers + emotion-coaching cue card) ──
    if (step === 'debrief') {
      var t1 = _crT.takes[0], t2 = _crT.takes[1];
      var col = function(title, ta) {
        return h('div', { style: { flex: 1, minWidth: 220 } },
          h('h4', { style: { fontSize: 12, fontWeight: 800, color: fg('#f1f5f9'), margin: '0 0 6px' } }, title),
          ta ? ta.tags.map(function(tg, i) { var m = _CR_TAG_META[tg.type]; return h('div', { key: i, style: { fontSize: 11.5, color: fg('#cbd5e1'), padding: '3px 0' } }, _crFmtT(tg.t) + ' ' + m.icon + ' ' + tg.kidLine); })
            : h('p', { style: { fontSize: 11, color: fg('#94a3b8') } }, 'No analysis for this take.'));
      };
      return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto' } }, head,
        t1 && t2 ? card([h('h3', { key: 'h', style: { fontSize: 13.5, fontWeight: 800, color: fg('#f1f5f9'), marginTop: 0 } }, '🎞️ Before → after'), h('div', { key: 'c', style: { display: 'flex', gap: 14, flexWrap: 'wrap' } }, col('Take 1', t1), col('Take 2', t2)), caption]) : null,
        card([
          h('h3', { key: 'h', style: { fontSize: 13.5, fontWeight: 800, color: fg('#f1f5f9'), marginTop: 0 } }, '🗣️ Talk it through'),
          h('ol', { key: 'q', style: { fontSize: 12.5, color: fg('#e2e8f0'), lineHeight: 1.8, paddingLeft: 18, margin: 0 } },
            h('li', null, 'What happened, from each side?'),
            h('li', null, 'Who was affected, and how?'),
            h('li', null, 'What does each of you want, feel, and why? (Say it back in their words before answering.)'),
            h('li', null, 'Invent two options together that could work for both of you.'),
            h('li', null, 'What needs to happen to make it right — and what will you each try next time?'))
        ]),
        card([
          h('h3', { key: 'h', style: { fontSize: 13, fontWeight: 800, color: fg('#fde68a'), marginTop: 0 } }, '🧑‍🏫 For the adult in the room'),
          h('p', { key: 'p', style: { fontSize: 12, color: fg('#cbd5e1'), lineHeight: 1.6, margin: 0 } },
            'Name feelings before problem-solving ("It sounds like that felt unfair") and validate before redirecting. Conflict is normal; repair is the muscle this practices. Tags are moments, not verdicts — remove any that don\'t match what you saw.')
        ]),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
          h('button', {
            onClick: function() {
              // Explicit adult action: the ONLY path by which any analysis output persists (de-identified tags, no footage).
              var save = { when: new Date().toISOString(), takes: [t1, t2].map(function(ta) { return ta ? { tags: ta.tags, arc: ta.arc } : null; }) };
              updR({ savedTags: save });
              if (ctx.addToast) ctx.addToast('Saved the de-identified tags (Speaker A/B only). The recordings themselves are gone.', 'success');
            },
            style: { padding: '8px 14px', borderRadius: 10, border: '1px solid #475569', background: 'transparent', color: fg('#cbd5e1'), fontSize: 12, cursor: 'pointer' }
          }, '💾 Save tags (adult only)'),
          h('button', { onClick: exit, style: { padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', background: '#22c55e', color: '#0f172a' } }, '✅ Finish (recordings deleted)')));
    }

    return h('div', null, backBtn);
  } };
})();
