(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__alloArcadeSageLauncherLoaded) return;
  window.__alloArcadeSageLauncherLoaded = true;

  var ALLOWED_MINUTES = [5, 10, 15, 20, 30];
  var SAFE_COLOR_RE = /^(?:#[0-9a-f]{3,8}|[a-z]{1,30}|(?:rgb|rgba|hsl|hsla)\([\d.,%\s]+\))$/i;
  function safeColor(v, fallback) {
    return (typeof v === 'string' && SAFE_COLOR_RE.test(v.trim())) ? v.trim() : fallback;
  }
  // ═══════════════════════════════════════════
  // arcade_mode_sage_launcher.js — AlloHaven Arcade plugin (Phase 3a)
  //
  // Self-registers via window.AlloHavenArcade.registerMode. This is the
  // simplest possible plugin: no game logic of its own, no rules, no
  // state. Its only job is to validate the plugin contract end-to-end
  // and give students a token-time gateway into the existing AlloBot
  // Starbound Sage tool that lives in STEAM Lab.
  //
  // Plugin contract (mirrors stem_lab_module.js:23-54):
  //   window.AlloHavenArcade.registerMode(id, config)
  //
  // Config fields:
  //   - id: stable identifier ('sage-launcher')
  //   - label, icon, blurb: card display text
  //   - timeCost: default minutes per launch (5)
  //   - partnerRequired: false (Sage is single-player)
  //   - render(ctx): React element for the card
  //
  // ctx provides:
  //   - React, palette, tokens, minutesPerToken, session
  //   - onLaunch(minutes): deduct tokens + start the time-budget session
  //   - onClose(): close the arcade hub
  //   - addToast: toast helper
  //   - callImagen / callGemini / callTTS: AI plumbing pass-through
  //   - toolData: cross-tool state aggregator
  //   - setStemLabTool: deep-link helper (may be null in early Phase 3a)
  // ═══════════════════════════════════════════

  // Poll for the AlloHavenArcade registry. The host AlloHaven module
  // sets up window.AlloHavenArcade at module load, but plugin files
  // can race with module load on slow connections — keep retrying for
  // up to ~5 seconds before giving up.
  function waitForRegistry(cb) {
    if (window.AlloHavenArcade && typeof window.AlloHavenArcade.registerMode === 'function') {
      cb(); return;
    }
    var attempts = 0;
    var iv = setInterval(function() {
      attempts++;
      if (window.AlloHavenArcade && typeof window.AlloHavenArcade.registerMode === 'function') {
        clearInterval(iv); cb();
      } else if (attempts > 50) {
        clearInterval(iv);
        if (typeof console !== 'undefined') {
          console.warn('[arcade_mode_sage_launcher] AlloHavenArcade registry not found after 5s — plugin not registered.');
        }
      }
    }, 100);
  }

  waitForRegistry(function() {
    if (window.AlloHavenArcade.isRegistered && window.AlloHavenArcade.isRegistered('sage-launcher')) {
      return;
    }
    register();
  });

  function register() {
  window.AlloHavenArcade.registerMode('sage-launcher', {
    label: 'AlloBot Sage',
    icon: '⚔️',
    blurb: 'Combat-flavored retrieval-practice RPG (in STEAM Lab). Your token-time deducts here; play happens there.',
    timeCost: 5,            // default minutes per launch — overridable in UI
    partnerRequired: false,
    ready: true,

    render: function (ctx) {
      ctx = (ctx && typeof ctx === 'object') ? ctx : {};
      var React = ctx.React || window.React;
      if (!React || typeof React.createElement !== 'function' || typeof React.useState !== 'function') return null;
      var h = React.createElement;
      var rawPalette = (ctx.palette && typeof ctx.palette === 'object') ? ctx.palette : {};
      var palette = {
        surface: safeColor(rawPalette.surface, '#1e293b'),
        border: safeColor(rawPalette.border, '#334155'),
        text: safeColor(rawPalette.text, '#e2e8f0'),
        textDim: safeColor(rawPalette.textDim, '#cbd5e1'),
        textMute: safeColor(rawPalette.textMute, '#a3a3a3'),
        bg: safeColor(rawPalette.bg, '#0f172a'),
        accent: safeColor(rawPalette.accent, '#60a5fa'),
        onAccent: safeColor(rawPalette.onAccent, '#0f172a')
      };
      var session = (ctx.session && typeof ctx.session === 'object') ? ctx.session : null;
      var rawMpt = Number(ctx.minutesPerToken);
      var mpt = (Number.isFinite(rawMpt) && rawMpt > 0) ? rawMpt : 5;
      var rawTokens = Number(ctx.tokens);
      var tokens = (Number.isFinite(rawTokens) && rawTokens > 0) ? rawTokens : 0;

      // Per-card state (locally scoped to this render). For a small UI
      // like this we don't need a full-fledged React component — a
      // controlled <select> handles the only choice.
      var minutesTuple = React.useState(5);
      var minutes = ALLOWED_MINUTES.indexOf(minutesTuple[0]) !== -1 ? minutesTuple[0] : 5;
      var setMinutes = minutesTuple[1];

      var tokensCost = Math.ceil(minutes / mpt);
      var canAfford = tokens >= tokensCost;
      var sessionActiveHere = !!(session && session.modeId === 'sage-launcher');
      var sessionElsewhere = !!(session && session.modeId !== 'sage-launcher');
      var disabled = !canAfford || !!session;

      function handleLaunch() {
        if (disabled || ALLOWED_MINUTES.indexOf(minutes) === -1 || typeof ctx.onLaunch !== 'function') return;
        var ok = false;
        try { ok = Boolean(ctx.onLaunch(minutes)); } catch (_) { return; }
        if (!ok) return;
        var closeHub = function () {
          if (typeof ctx.onClose === 'function') { try { ctx.onClose(); } catch (_) {} }
        };
        // Sage lives in STEAM Lab. If the host wired setStemLabTool we
        // deep-link straight to it; otherwise give the student a clear
        // "go to STEAM Lab → AlloBot Sage" instruction.
        if (typeof ctx.setStemLabTool === 'function') {
          // Close the arcade hub first so the deep-link isn't covered.
          closeHub();
          // Best-effort — if STEAM Lab isn't already open, the student
          // may need a second click. The host module decides.
          setTimeout(function () {
            try { ctx.setStemLabTool('alloBotSage'); } catch (e) { /* ignore */ }
          }, 50);
        } else {
          // Fallback path — just close the hub. AlloHaven's launch
          // toast already announced the session.
          closeHub();
          if (typeof ctx.addToast === 'function') {
            try { ctx.addToast('Open STEAM Lab → AlloBot Sage to start playing.'); } catch (_) {}
          }
        }
      }

      // Card wrapper
      return h('div', {
        'aria-labelledby': 'sage-launcher-title',
        style: {
          padding: '12px 14px',
          background: palette.surface,
          border: '1px solid ' + palette.border,
          borderRadius: '10px'
        }
      },
        // Top row: icon + label + blurb
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '32px', lineHeight: 1 } }, '⚔️'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('h4', {
              id: 'sage-launcher-title',
              style: { margin: 0, fontSize: '15px', fontWeight: 700, color: palette.text }
            }, 'AlloBot Sage'),
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textDim,
                lineHeight: '1.45',
                marginTop: '3px'
              }
            },
              'Combat-flavored retrieval-practice RPG. Your token-time deducts here; play happens in STEAM Lab.')
          )
        ),

        // Active session banner (only when our session is the active one)
        sessionActiveHere ? h('div', {
          style: {
            padding: '8px 12px',
            background: palette.bg,
            border: '1px solid ' + palette.accent,
            borderRadius: '8px',
            fontSize: '11px',
            color: palette.text,
            marginBottom: '10px',
            lineHeight: 1.4
          }
        }, '⏱ Sage session active. Reopen Arcade to pause or resume your session timer.') : null,

        // Time picker + launch row
        h('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }
        },
          h('label', {
            htmlFor: 'sage-launcher-minutes',
            style: {
              fontSize: '11px',
              color: palette.textMute,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }
          }, 'Minutes'),
          h('select', {
            id: 'sage-launcher-minutes',
            className: 'ah-prominent-input',
            value: minutes,
            onChange: function (e) {
              var n = parseInt(e && e.target ? e.target.value : '', 10);
              if (ALLOWED_MINUTES.indexOf(n) !== -1) setMinutes(n);
            },
            disabled: disabled,
            style: {
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 10px',
              background: palette.bg,
              border: '1px solid ' + palette.border,
              color: palette.text,
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'inherit',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }
          },
            ALLOWED_MINUTES.map(function (n) {
              var costN = Math.ceil(n / mpt);
              var afford = tokens >= costN;
              return h('option', {
                key: 'min-' + n,
                value: n,
                disabled: !afford && !disabled,
              }, n + ' min · ' + costN + ' 🪙');
            })
          ),
          h('div', { style: { flex: 1 } }), // spacer
          h('button', {
            type: 'button',
            onClick: handleLaunch,
            disabled: disabled,
            'aria-label': 'Launch AlloBot Sage for ' + minutes + ' minutes (' + tokensCost + ' tokens)',
            style: {
              background: disabled ? palette.surface : palette.accent,
              color: disabled ? palette.textMute : palette.onAccent,
              border: 'none',
              borderRadius: '8px',
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              fontFamily: 'inherit'
            }
          },
            sessionActiveHere ? 'Running…'
            : sessionElsewhere ? 'Another game running'
            : !canAfford ? 'Need ' + tokensCost + ' 🪙'
            : 'Launch · ' + tokensCost + ' 🪙'
          )
        )
      );
    }
  });
  }  // end register()
})();
