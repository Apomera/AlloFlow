const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_launch_pad.txt', 'utf-8');

const wrapped = `
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
  return (
${inner}
  );
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
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

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LaunchPadView = LaunchPadView;
  window.AlloModules.ViewLaunchPadModule = true;
})();
`;
fs.writeFileSync('view_launch_pad_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_launch_pad_module.js', moduleSrc);
console.log('Wrote view_launch_pad_module.js (' + moduleSrc.length + ' bytes)');
