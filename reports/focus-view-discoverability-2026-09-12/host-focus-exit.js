window.HostFocusExit = function ({
  isZenMode,
  handleSetIsZenModeToFalse,
  t
}) {
  const Minimize = () => null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, "          ", isZenMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.exit_focus'),
    onClick: handleSetIsZenModeToFalse,
    className: "self-end shrink-0 m-2 min-h-11 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg border border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
  }, /*#__PURE__*/React.createElement(Minimize, {
    size: 14
  }), " ", t('common.exit_focus')));
};