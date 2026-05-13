(function () {
  // ═══════════════════════════════════════════
  // arcade_mode_sage_launcher.js — AlloHaven Arcade plugin (Phase 3a)
  //
  // Self-registers via window.AlloHavenArcade.registerMode. This is the
  // simplest possible plugin: no game logic of its own, no rules, no
  // state. Its only job is to validate the plugin contract end-to-end
  // and give students a token-time gateway into the existing AlloBot
  // Starbound Sage tool that lives in STEM Lab.
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
    blurb: 'Combat-flavored retrieval-practice RPG (in STEM Lab). Your token-time deducts here; play happens there.',
    timeCost: 5,            // default minutes per launch — overridable in UI
    partnerRequired: false,
    ready: true,

    render: function (ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var palette = ctx.palette || {};
      var session = ctx.session;
      var mpt = ctx.minutesPerToken || 5;

      // Per-card state (locally scoped to this render). For a small UI
      // like this we don't need a full-fledged React component — a
      // controlled <select> handles the only choice.
      var minutesTuple = React.useState(5);
      var minutes = minutesTuple[0];
      var setMinutes = minutesTuple[1];

      var tokensCost = Math.ceil(minutes / mpt);
      var canAfford = ctx.tokens >= tokensCost;
      var sessionActiveHere = !!(session && session.modeId === 'sage-launcher');
      var sessionElsewhere = !!(session && session.modeId !== 'sage-launcher');
      var disabled = !canAfford || !!session;

      function handleLaunch() {
        if (disabled) return;
        var ok = ctx.onLaunch(minutes);
        if (!ok) return;
        // Sage lives in STEM Lab. If the host wired setStemLabTool we
        // deep-link straight to it; otherwise give the student a clear
        // "go to STEM Lab → AlloBot Sage" instruction.
        if (typeof ctx.setStemLabTool === 'function') {
          // Close the arcade hub first so the deep-link isn't covered.
          ctx.onClose();
          // Best-effort — if STEM Lab isn't already open, the student
          // may need a second click. The host module decides.
          setTimeout(function () {
            try { ctx.setStemLabTool('alloBotSage'); } catch (e) { /* ignore */ }
          }, 50);
        } else {
          // Fallback path — just close the hub. AlloHaven's launch
          // toast already announced the session.
          ctx.onClose();
          if (typeof ctx.addToast === 'function') {
            ctx.addToast('Open STEM Lab → AlloBot Sage to start playing.');
          }
        }
      }

      // Card wrapper
      return h('div', {
        style: {
          padding: '12px 14px',
          background: palette.surface || '#1e293b',
          border: '1px solid ' + (palette.border || '#334155'),
          borderRadius: '10px'
        }
      },
        // Top row: icon + label + blurb
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '32px', lineHeight: 1 } }, '⚔️'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: '15px', fontWeight: 700, color: palette.text || '#e2e8f0' } },
              'AlloBot Sage'),
            h('div', {
              style: {
                fontSize: '11px',
                color: palette.textDim || '#cbd5e1',
                lineHeight: '1.45',
                marginTop: '3px'
              }
            },
              'Combat-flavored retrieval-practice RPG. Your token-time deducts here; play happens in STEM Lab.')
          )
        ),

        // Active session banner (only when our session is the active one)
        sessionActiveHere ? h('div', {
          style: {
            padding: '8px 12px',
            background: (palette.bg || '#0f172a') + 'cc',
            border: '1px solid ' + (palette.accent || '#60a5fa'),
            borderRadius: '8px',
            fontSize: '11px',
            color: palette.text || '#e2e8f0',
            marginBottom: '10px',
            lineHeight: 1.4
          }
        }, '⏱ Sage session active. The arcade timer ticks even while you\'re in STEM Lab.') : null,

        // Time picker + launch row
        h('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }
        },
          h('label', {
            style: {
              fontSize: '11px',
              color: palette.textMute || '#a3a3a3',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }
          }, 'Minutes'),
          h('select', {
            value: minutes,
            onChange: function (e) {
              var n = parseInt(e.target.value, 10);
              if (!isNaN(n)) setMinutes(n);
            },
            disabled: disabled,
            'aria-label': 'Minutes to launch',
            style: {
              padding: '4px 8px',
              background: palette.bg || '#0f172a',
              border: '1px solid ' + (palette.border || '#334155'),
              color: palette.text || '#e2e8f0',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'inherit',
              cursor: disabled ? 'not-allowed' : 'pointer'
            }
          },
            [5, 10, 15, 20, 30].map(function (n) {
              var costN = Math.ceil(n / mpt);
              var afford = ctx.tokens >= costN;
              return h('option', {
                key: 'min-' + n,
                value: n,
                disabled: !afford && !disabled,
              }, n + ' min · ' + costN + ' 🪙');
            })
          ),
          h('div', { style: { flex: 1 } }), // spacer
          h('button', {
            onClick: handleLaunch,
            disabled: disabled,
            'aria-label': 'Launch AlloBot Sage for ' + minutes + ' minutes (' + tokensCost + ' tokens)',
            style: {
              background: disabled ? (palette.surface || '#1e293b') : (palette.accent || '#60a5fa'),
              color: disabled ? (palette.textMute || '#a3a3a3') : (palette.onAccent || '#0f172a'),
              border: 'none',
              borderRadius: '8px',
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
