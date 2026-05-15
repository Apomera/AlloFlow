/**
 * AlloFlow View - Launch Pad Splash
 * Extracted from AlloFlowANTI.txt isAppReady && !hasSelectedMode block
 * (130 lines body). The splash screen shown before role/mode selection:
 * AlloFlow logo, mic permission banner, 4 mode-selection cards
 * (Full / Guided / Learning Tools / Educator Tools), AI Backend Settings.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.LaunchPadView) {
    console.log('[CDN] ViewLaunchPadModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewLaunchPadModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Unplug = _lazyIcon('Unplug');

  function LaunchPadView(props) {
  var t = props.t;
  var micBannerDismissed = props.micBannerDismissed;
  var _isCanvasEnv = props._isCanvasEnv;
  var micPermissionStatus = props.micPermissionStatus;
  var APP_CONFIG = props.APP_CONFIG;
  var requestMicPermission = props.requestMicPermission;
  var setHasSelectedMode = props.setHasSelectedMode;
  var setMicBannerDismissed = props.setMicBannerDismissed;
  var setGuidedMode = props.setGuidedMode;
  var setHasSelectedRole = props.setHasSelectedRole;
  var setShowWizard = props.setShowWizard;
  var setIsTeacherMode = props.setIsTeacherMode;
  var setShowLearningHub = props.setShowLearningHub;
  var setShowEducatorHub = props.setShowEducatorHub;
  var setPendingRole = props.setPendingRole;
  var setIsGateOpen = props.setIsGateOpen;
  var setShowAIBackendModal = props.setShowAIBackendModal;
  return /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-label": "Choose how to use AlloFlow",
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 99998,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #312e81 60%, #1e3a5f 100%)',
      animation: 'fadeIn 0.6s ease-out'
    }
  }, /*#__PURE__*/React.createElement("style", null, `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
            @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
            @keyframes cardPop { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            .lp-card { backdrop-filter: blur(20px); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 32px 28px; cursor: pointer; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; animation: cardPop 0.5s ease-out both; }
            .lp-card:hover { transform: translateY(-6px) scale(1.03); background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.3); box-shadow: 0 20px 60px rgba(99,102,241,0.3); }
            @media (max-width: 600px) { .lp-grid { grid-template-columns: 1fr !important; } }
            .lp-card::before { content: ''; position: absolute; inset: 0; border-radius: 24px; padding: 1px; background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent, rgba(99,102,241,0.3)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
            .lp-badge { display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #818cf8, #6366f1); color: white; font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; animation: shimmer 3s infinite linear; background-size: 200% auto; }
          `), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: '48px',
      animation: 'fadeIn 0.6s ease-out'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://raw.githubusercontent.com/Apomera/AlloFlow/main/rainbow-book.jpg",
    alt: "AlloFlow",
    style: {
      width: '80px',
      height: '80px',
      margin: '0 auto 16px',
      display: 'block',
      filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.5))',
      borderRadius: '16px',
      objectFit: 'cover',
      animation: 'float 3s ease-in-out infinite'
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '32px',
      fontWeight: 900,
      color: 'white',
      margin: '0 0 8px',
      letterSpacing: '-0.5px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }, "AlloFlow"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: 'rgba(165,180,252,0.7)',
      fontWeight: 600,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      margin: 0
    }
  }, t('launch_pad.subtitle'))), !micBannerDismissed && /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '620px',
      width: '100%',
      padding: '0 24px',
      marginBottom: '24px',
      animation: 'fadeIn 0.5s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      backdropFilter: 'blur(20px)',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(129,140,248,0.3)',
      borderRadius: '20px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '24px'
    }
  }, "\uD83C\uDFA4"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: 'white',
      margin: '0 0 2px'
    }
  }, t('launch_pad.mic_title') || 'Microphone Setup'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '11px',
      color: 'rgba(165,180,252,0.7)',
      margin: 0,
      lineHeight: '1.5'
    }
  }, t('launch_pad.mic_desc') || 'Some tools use your microphone for dictation, recording, and voice input.'))), _isCanvasEnv && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '10px',
      color: '#fbbf24',
      margin: 0,
      textAlign: 'center',
      lineHeight: '1.5',
      fontWeight: 600
    }
  }, "\u26A0\uFE0F ", t('launch_pad.mic_canvas_warning') || 'In this environment, enabling the microphone will briefly reload the app. It\'s best to do it now before you start working.'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: requestMicPermission,
    disabled: micPermissionStatus === 'requesting',
    "aria-label": "Enable microphone access",
    style: {
      padding: '10px 24px',
      borderRadius: '14px',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #818cf8, #6366f1)',
      color: 'white',
      fontSize: '13px',
      fontWeight: 700,
      opacity: micPermissionStatus === 'requesting' ? 0.6 : 1,
      transition: 'all 0.2s',
      boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
    }
  }, micPermissionStatus === 'requesting' ? '⏳ Requesting...' : '🎤 Enable Microphone'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMicBannerDismissed(true),
    "aria-label": "Skip microphone setup",
    style: {
      padding: '10px 24px',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.2)',
      cursor: 'pointer',
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(165,180,252,0.8)',
      fontSize: '13px',
      fontWeight: 600,
      transition: 'all 0.2s'
    }
  }, "Skip for Now")), micPermissionStatus === 'granted' && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '11px',
      color: '#34d399',
      margin: 0,
      fontWeight: 700
    }
  }, "\u2705 Microphone enabled!"), micPermissionStatus === 'denied' && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '11px',
      color: '#f87171',
      margin: 0,
      fontWeight: 600
    }
  }, "Microphone was denied. You can enable it later in browser settings."))), /*#__PURE__*/React.createElement("div", {
    className: "lp-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '24px',
      maxWidth: '620px',
      width: '100%',
      padding: '0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-card",
    style: {
      animationDelay: '0.1s'
    },
    role: "button",
    tabIndex: 0,
    "aria-label": t('launch_pad.full_title') + '. ' + t('launch_pad.full_desc'),
    onClick: () => {
      setHasSelectedMode(true);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite'
    },
    "aria-hidden": "true"
  }, "\uD83D\uDE80"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, t('launch_pad.full_title')), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: 'rgba(165,180,252,0.7)',
      lineHeight: '1.6',
      margin: 0
    }
  }, t('launch_pad.full_desc'))), /*#__PURE__*/React.createElement("div", {
    className: "lp-card",
    style: {
      animationDelay: '0.2s'
    },
    role: "button",
    tabIndex: 0,
    "aria-label": (t('launch_pad.guided_title') || 'Guided Mode') + ' (recommended). ' + t('launch_pad.guided_desc'),
    onClick: () => {
      setHasSelectedMode(true);
      setGuidedMode(true);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-badge"
  }, t('launch_pad.badge_recommended'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite',
      animationDelay: '0.5s'
    },
    "aria-hidden": "true"
  }, "\uD83E\uDDED"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, t('launch_pad.guided_title') || 'Guided Mode'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: 'rgba(165,180,252,0.7)',
      lineHeight: '1.6',
      margin: 0
    }
  }, t('launch_pad.guided_desc'))), /*#__PURE__*/React.createElement("div", {
    className: "lp-card",
    style: {
      animationDelay: '0.3s'
    },
    role: "button",
    tabIndex: 0,
    "aria-label": (t('launch_pad.learning_tools_title') || 'Learning Tools') + '. ' + (t('launch_pad.learning_tools_desc') || 'STEM Lab, StoryForge & SEL Hub'),
    onClick: () => {
      setShowLearningHub(true);
      setIsTeacherMode(false);
      setShowWizard(false);
      setHasSelectedRole(true);
      setHasSelectedMode(true);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-badge",
    style: {
      background: 'linear-gradient(135deg, #34d399, #059669)'
    }
  }, t('launch_pad.badge_3_tools') || '3 Tools')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite',
      animationDelay: '1s'
    },
    "aria-hidden": "true"
  }, '\uD83E\uDDE9'), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, t('launch_pad.learning_tools_title') || 'Learning Tools'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: 'rgba(165,180,252,0.7)',
      lineHeight: '1.6',
      margin: 0
    }
  }, t('launch_pad.learning_tools_desc') || 'STEM Lab, StoryForge & SEL Hub \u2014 explore, create, and grow')), /*#__PURE__*/React.createElement("div", {
    className: "lp-card",
    style: {
      animationDelay: '0.4s'
    },
    role: "button",
    tabIndex: 0,
    "aria-label": (t('launch_pad.educator_tools_title') || 'Educator Tools') + '. ' + (t('launch_pad.educator_tools_desc') || 'BehaviorLens, Report Writer') + (APP_CONFIG._cfg_validation_key ? ' (password protected)' : ''),
    onClick: () => {
      setHasSelectedMode(true);
      setHasSelectedRole(true);
      setShowWizard(false);
      if (APP_CONFIG._cfg_validation_key) {
        setPendingRole('educator_hub');
        setIsGateOpen(true);
      } else {
        setIsTeacherMode(true);
        setShowEducatorHub(true);
      }
    },
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-badge",
    style: {
      background: 'linear-gradient(135deg, #a78bfa, #7c3aed)'
    }
  }, APP_CONFIG._cfg_validation_key ? t('launch_pad.badge_educator') || '🔒 Educator' : t('launch_pad.badge_educator_open') || '🛠️ Educator')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite',
      animationDelay: '1.5s'
    },
    "aria-hidden": "true"
  }, "\uD83D\uDEE0\uFE0F"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, t('launch_pad.educator_tools_title') || 'Educator Tools'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: 'rgba(165,180,252,0.7)',
      lineHeight: '1.6',
      margin: 0
    }
  }, t('launch_pad.educator_tools_desc') || 'BehaviorLens, Report Writer, and professional clinical tools — password protected'))), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: '48px',
      fontSize: '11px',
      color: 'rgba(165,180,252,0.4)',
      fontWeight: 500
    }
  }, t('launch_pad.switch_hint')), !_isCanvasEnv && /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setShowAIBackendModal(true);
    },
    style: {
      marginTop: '16px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: '#312e81',
      border: '1px solid rgba(165,180,252,0.4)',
      borderRadius: '16px',
      padding: '10px 20px',
      color: '#e0e7ff',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s',
      backdropFilter: 'blur(10px)'
    },
    onMouseOver: e => {
      e.currentTarget.style.background = '#4338ca';
      e.currentTarget.style.color = '#ffffff';
      e.currentTarget.style.borderColor = 'rgba(165,180,252,0.7)';
    },
    onMouseOut: e => {
      e.currentTarget.style.background = '#312e81';
      e.currentTarget.style.color = '#e0e7ff';
      e.currentTarget.style.borderColor = 'rgba(165,180,252,0.4)';
    },
    "aria-label": "AI Backend Settings",
    title: "AI Backend Settings"
  }, /*#__PURE__*/React.createElement(Unplug, {
    size: 16,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, "AI Backend Settings")));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LaunchPadView = LaunchPadView;
  window.AlloModules.ViewLaunchPadModule = true;
})();
