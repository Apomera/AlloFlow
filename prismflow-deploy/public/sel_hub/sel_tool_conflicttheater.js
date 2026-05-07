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
    name: 'Conflict Theater',
    icon: '🎭',
    desc: 'Mediate a real conflict with two AI characters. Practice restorative principles in an immersive scene.',
    casel: 'relationship-skills',
    contentWarning: true,

    render: function(ctx) {
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

      var d = (ctx.toolData && ctx.toolData.conflicttheater) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('conflicttheater', key); }
        else { if (ctx.update) ctx.update('conflicttheater', key, val); }
      };

      var mode = d.mode || 'select'; // select | opt-in | scene | ending
      var scenarioId = d.scenarioId || 'lunch-money';
      var scenario = SCENARIOS[scenarioId] || SCENARIOS['lunch-money'];
      var scene = SCENES[scenario.sceneId] || SCENES.cafeteria;
      var dialogue = d.dialogue || [];
      var harmony = typeof d.harmony === 'number' ? d.harmony : scenario.initialHarmony;
      var principlesUsed = d.principlesUsed || {};
      // Initialize moods from scenario's initialMoods (per-character starting state)
      var charMoods = d.charMoods || Object.assign({}, scenario.initialMoods || {});
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
        if (!callGemini) { addToast && addToast('AI not available right now.', 'error'); return; }
        var msg = (studentInput || '').trim();
        if (!msg || loading) return;

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
            if (ending === 'resolved') { sfxResolve(); celebrate && celebrate(); awardXP && awardXP('conflicttheater', 30); }
            else if (ending === 'deepened') { sfxBreakdown(); }
            else { awardXP && awardXP('conflicttheater', 15); }
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
          addToast && addToast('Could not get character responses. Try again.', 'error');
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
          addressing: 'both'
        });
      }

      function startScenario(sid) {
        var sc = SCENARIOS[sid];
        if (!sc) return;
        var freshMoods = Object.assign({}, sc.initialMoods || {});
        sc.characterIds.forEach(function(cid) { if (!freshMoods[cid]) freshMoods[cid] = 'calm'; });
        upd({
          scenarioId: sid,
          dialogue: [],
          harmony: sc.initialHarmony,
          principlesUsed: {},
          charMoods: freshMoods,
          studentInput: '',
          turnCount: 0,
          mode: 'opt-in',
          ending: null,
          _userTier: 0,
          addressing: 'both'
        });
      }

      // ──────────────────────────────────────────────────────────
      // MODE: select (scenario picker grid)
      // ──────────────────────────────────────────────────────────
      if (mode === 'select') {
        var scenarioList = Object.keys(SCENARIOS).map(function(k) { return SCENARIOS[k]; });
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: 18 } },
            h('div', { style: { fontSize: 48, marginBottom: 4 } }, '🎭'),
            h('h2', { style: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 } }, 'Conflict Theater'),
            h('p', { style: { fontSize: 12, color: '#94a3b8', margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 } },
              'Pick a conflict to mediate. Each scenario has two AI characters with their own personalities, moods, and reasons. Practice acknowledging feelings, making space, naming harm, and proposing repair.'
            )
          ),
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
                style: { textAlign: 'left', padding: 12, borderRadius: 12, border: '1px solid ' + (hasWarning ? '#92400e' : '#334155'), background: '#1e293b', color: '#e2e8f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#f1f5f9', flex: 1 } }, sc.title),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, sceneObj.label)
                ),
                h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 18 } },
                  charsInScenario.map(function(c) {
                    return h('span', { key: c.id, title: c.name, 'aria-label': c.name }, c.avatar);
                  })
                ),
                h('p', { style: { fontSize: 11, color: '#cbd5e1', margin: 0, lineHeight: 1.5 } }, sc.setup.length > 140 ? sc.setup.slice(0, 140) + '...' : sc.setup),
                hasWarning && h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700, marginTop: 4 } }, '⚠️ Content warning')
              );
            })
          ),
          h('p', { style: { fontSize: 10, color: '#64748b', textAlign: 'center', margin: 0 } }, 'Click any scenario to read the full setup and start.'),
          // Cross-session memory control: forget characters' memory of you
          Object.keys(memory).length > 0 && h('div', { style: { textAlign: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } },
              'Characters remember ' + Object.keys(memory).length + ' past conversation' + (Object.keys(memory).length === 1 ? '' : 's') + ' with you.'
            ),
            h('button', {
              'aria-label': 'Make characters forget our past conversations',
              onClick: function() {
                var ok = (typeof window.confirm === 'function') ? window.confirm('Make all characters forget your past conversations? This cannot be undone.') : true;
                if (ok) { upd('memory', {}); announceSR('All character memories cleared.'); }
              },
              style: { padding: '4px 10px', background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 8, fontSize: 10, cursor: 'pointer' }
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
              style: { padding: '4px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontSize: 11, cursor: 'pointer', marginBottom: 12 }
            }, '← All scenarios'),
            h('h2', { style: { fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' } }, scenario.title),
            h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' } }, scene.label)
          ),
          // Per-scenario content warning if present
          scenario.contentWarning && h('div', { style: { background: '#451a03', border: '1px solid #92400e', borderRadius: 12, padding: 14, marginBottom: 14 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 6 } }, '⚠️ Content warning'),
            h('p', { style: { fontSize: 12, color: '#fde68a', margin: 0, lineHeight: 1.6 } }, scenario.contentWarning)
          ),
          // General safety reminder
          h('div', { style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
            'Conflict Theater scenarios are realistic. If you are in active distress today, choose a different scenario or come back later. The crisis safety net is at the bottom of every screen.'
          ),
          // Setup
          h('div', { style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 14 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 } }, 'The setup'),
            h('p', { style: { fontSize: 13, color: '#cbd5e1', margin: 0, lineHeight: 1.6 } }, scenario.setup)
          ),
          // Characters in play
          h('div', { style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 14, marginBottom: 18 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 } }, 'You\'ll be talking with'),
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
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: '#f1f5f9' } }, c.name + ' (' + c.age + ')'),
                    mem && h('span', { 'aria-label': 'You have talked with ' + c.name + ' before', title: 'Last interaction: ' + (mem.lastInteraction || '').slice(0, 10) + ' (relationship score ' + (mem.relationshipScore >= 0 ? '+' : '') + (mem.relationshipScore || 0) + ')', style: { fontSize: 9, padding: '2px 6px', borderRadius: 6, background: mem.relationshipScore >= 0 ? '#134e4a' : '#7f1d1d', color: mem.relationshipScore >= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 } }, '🌱 You\'ve met before')
                  ),
                  role && h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 2, fontStyle: 'italic' } }, role),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, c.backstory),
                  mem && mem.memoryNote && h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginTop: 4, padding: '6px 8px', background: '#0f172a', borderLeft: '2px solid #14b8a6', borderRadius: 4 } },
                    h('span', { style: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: 2 } }, c.name + ' remembers'),
                    h('span', { style: { fontStyle: 'italic' } }, '"' + mem.memoryNote + '"')
                  )
                )
              );
            })
          ),
          h('div', { style: { textAlign: 'center' } },
            h('button', {
              'aria-label': 'Start scenario',
              autoFocus: true,
              onClick: function() { upd({ mode: 'scene' }); announceSR('Scene started. ' + charsInPlay.map(function(c){ return c.name; }).join(' and ') + ' appear.'); },
              style: { padding: '12px 32px', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(20,184,166,0.3)' }
            }, 'Start →')
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: ending
      // ──────────────────────────────────────────────────────────
      if (mode === 'ending') {
        var endingMeta = {
          'resolved': { icon: '🌱', label: 'Restorative repair', color: '#22c55e', summary: 'You acknowledged feelings, made space, named the harm specifically, and helped them get to a repair. That’s rare and hard.' },
          'partial': { icon: '🌤️', label: 'Partial — unfinished', color: '#eab308', summary: 'You moved things, but it’s not done. Sometimes that’s realistic. Try again with a different approach if you want.' },
          'deepened': { icon: '⛈️', label: 'Conflict deepened', color: '#ef4444', summary: 'It got worse. That happens. The thing to learn from is which moves shut things down vs opened them. Try again.' }
        };
        var em = endingMeta[endingType] || endingMeta.partial;
        var principleList = ['acknowledged', 'madeSpace', 'identifiedHarm', 'proposedRepair', 'namedNeed'];
        var principleLabels = { acknowledged: 'Acknowledged feelings', madeSpace: 'Made space', identifiedHarm: 'Named the harm specifically', proposedRepair: 'Proposed concrete repair', namedNeed: 'Named a need' };

        return h('div', { style: { padding: 20, maxWidth: 580, margin: '0 auto' } },
          h('div', { style: { textAlign: 'center', marginBottom: 20 } },
            h('div', { style: { fontSize: 56, marginBottom: 8 } }, em.icon),
            h('h3', { style: { fontSize: 20, fontWeight: 800, color: em.color, marginBottom: 8 } }, em.label),
            h('p', { style: { fontSize: 13, color: '#cbd5e1', margin: 0, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 } }, em.summary)
          ),
          // Harmony final
          h('div', { style: { padding: 14, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Final harmony'),
            h('div', { className: 'ct-meter-track' },
              h('div', { className: 'ct-meter-fill', style: { width: Math.round(harmony) + '%', background: harmony >= 75 ? '#22c55e' : harmony >= 40 ? '#eab308' : '#ef4444' } })
            ),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 6 } }, Math.round(harmony) + ' / 100')
          ),
          // Principles touched
          h('div', { style: { padding: 14, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Restorative principles you touched'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              principleList.map(function(p) {
                var hit = !!principlesUsed[p];
                return h('div', { key: p, style: { fontSize: 12, color: hit ? '#86efac' : '#64748b', display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { 'aria-hidden': 'true' }, hit ? '✓' : '·'),
                  h('span', null, principleLabels[p])
                );
              })
            )
          ),
          // What each character will remember (memory generation is async — show
          // loading until it arrives, then the actual note)
          h('div', { style: { padding: 14, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'What they\'ll carry forward'),
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
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 } }, ch.name + ' will remember:'),
                  thisSessionNote
                    ? h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, fontStyle: 'italic' } }, '"' + mem.memoryNote + '"')
                    : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, ch.name + ' is still thinking about this conversation...')
                )
              );
            })
          ),
          // Coach overlay
          scenario.coachingNotes && scenario.coachingNotes.length > 0 && h('div', { style: { padding: 14, background: '#0c4a6e', border: '1px solid #0369a1', borderRadius: 12, marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Coach notes'),
            scenario.coachingNotes.map(function(n, i) {
              return h('p', { key: i, style: { fontSize: 12, color: '#e0f2fe', margin: '0 0 6px 0', lineHeight: 1.5 } }, '• ' + n);
            })
          ),
          // Buttons
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', {
              'aria-label': 'Try again with different choices',
              onClick: resetScenario,
              style: { padding: '10px 20px', background: '#14b8a6', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }
            }, '↺ Try again'),
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
              style: { padding: '10px 20px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '🖨 Print transcript'),
            h('button', {
              'aria-label': 'Back to opt-in',
              onClick: function() { upd({ mode: 'select' }); },
              style: { padding: '10px 20px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '← Exit')
          ),
          window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
        );
      }

      // ──────────────────────────────────────────────────────────
      // MODE: scene (active scenario)
      // ──────────────────────────────────────────────────────────

      var characters = scenario.characterIds.map(function(cid) { return CAST[cid]; });
      var harmonyColor = harmony >= 75 ? '#22c55e' : harmony >= 40 ? '#eab308' : '#ef4444';

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
          h('div', { style: { fontSize: 11, fontWeight: 700, color: url ? '#f1f5f9' : '#1e293b', marginTop: 4, textShadow: url ? '0 1px 3px rgba(0,0,0,0.6)' : 'none' } }, c.name),
          isLoading && !url && h('div', { style: { fontSize: 9, color: '#64748b', marginTop: 2 } }, 'sketching...')
        );
      }

      // Stage with scene SVG + overlaid character portraits
      var stage = h('div', { className: 'ct-stage', style: { marginBottom: 12 } },
        scene.svg(h),
        _renderStagePortrait(characters[0], { left: '8%' }),
        _renderStagePortrait(characters[1], { right: '8%' })
      );

      // Harmony meter + per-character mood pips
      var meters = h('div', { style: { display: 'flex', gap: 12, marginBottom: 12, padding: 12, background: '#1e293b', border: '1px solid #334155', borderRadius: 10 } },
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Harmony'),
          h('div', { className: 'ct-meter-track', role: 'progressbar', 'aria-valuenow': Math.round(harmony), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Harmony meter' },
            h('div', { className: 'ct-meter-fill', style: { width: Math.round(harmony) + '%', background: harmonyColor } })
          ),
          h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4 } }, Math.round(harmony) + ' / 100')
        ),
        characters.map(function(c) {
          var mood = charMoods[c.id] || 'calm';
          return h('div', { key: c.id, style: { textAlign: 'center', minWidth: 70 } },
            h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, c.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', textTransform: 'capitalize' } }, mood)
          );
        })
      );

      // Dialogue history
      var dialogueView = h('div', { role: 'log', 'aria-live': 'polite', 'aria-busy': loading ? 'true' : 'false', style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 240, overflowY: 'auto', padding: 8 } },
        dialogue.length === 0
          ? h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 } }, 'Open the conversation. What would you say?')
          : dialogue.map(function(m, i) {
              var who, bubbleClass;
              if (m.speaker === 'student') { who = 'You'; bubbleClass = 'ct-bubble ct-bubble-student'; }
              else { var c = CAST[m.speaker]; who = c ? c.name : m.speaker; bubbleClass = 'ct-bubble'; }
              return h('div', { key: i, style: { display: 'flex', flexDirection: 'column', alignItems: m.speaker === 'student' ? 'flex-end' : 'flex-start', gap: 2 } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600, padding: '0 6px' } }, who + (m.bodyLanguage ? ' · ' + m.bodyLanguage : '')),
                h('div', { className: bubbleClass }, m.text)
              );
            })
      );

      // Addressing toggle
      var addrToggle = h('div', { role: 'radiogroup', 'aria-label': 'Address', style: { display: 'flex', gap: 6, marginBottom: 8 } },
        characters.concat([{ id: 'both', name: 'Mediate (both)' }]).map(function(opt) {
          var on = addressing === opt.id;
          return h('button', { key: opt.id,
            role: 'radio', 'aria-checked': on ? 'true' : 'false',
            onClick: function() { upd('addressing', opt.id); },
            style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (on ? '#14b8a6' : '#475569'), background: on ? '#134e4a' : 'transparent', color: on ? '#ccfbf1' : '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }
          }, opt.name);
        }),
        h('label', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: ttsEnabled, onChange: function(e) { upd('ttsEnabled', e.target.checked); }, 'aria-label': 'Enable voice' }),
          'Voice'
        )
      );

      // Input + send
      var inputRow = h('div', { style: { display: 'flex', gap: 8 } },
        h('textarea', {
          value: studentInput,
          onChange: function(e) { upd('studentInput', e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey && studentInput.trim() && !loading) { e.preventDefault(); sendTurn(); } },
          placeholder: addressing === 'both' ? 'Say something to both of them...' : 'Say something to ' + (CAST[addressing] ? CAST[addressing].name : '...'),
          'aria-label': 'Your message',
          rows: 2,
          disabled: loading,
          style: { flex: 1, padding: 10, borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }
        }),
        h('button', {
          'aria-label': loading ? 'Waiting' : 'Send message',
          onClick: function() { if (studentInput.trim() && !loading) sendTurn(); },
          disabled: loading || !studentInput.trim(),
          style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: loading || !studentInput.trim() ? '#334155' : '#14b8a6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading || !studentInput.trim() ? 'default' : 'pointer' }
        }, loading ? '⋯' : '↑')
      );

      var exitBtn = h('div', { style: { textAlign: 'center', marginTop: 10 } },
        h('button', {
          'aria-label': 'Exit scene',
          onClick: function() { upd({ mode: 'opt-in' }); },
          style: { padding: '6px 14px', background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 8, fontSize: 11, cursor: 'pointer' }
        }, '← Exit')
      );

      return h('div', { style: { padding: 16, maxWidth: 640, margin: '0 auto' } },
        crisisSurface,
        stage,
        meters,
        dialogueView,
        addrToggle,
        inputRow,
        exitBtn,
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });

  console.log('[SelHub] sel_tool_conflicttheater.js loaded — Conflict Theater v0.1');
})();
