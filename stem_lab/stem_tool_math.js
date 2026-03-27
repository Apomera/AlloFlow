// ═══════════════════════════════════════════
// stem_tool_math.js — STEM Lab Math Tools
// All tools extracted to standalone files
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  // All tools extracted to standalone files:
  // geometryProver → stem_tool_geo.js
  // calculus → stem_tool_calculus.js
  // unitConvert → stem_tool_unitconvert.js
  // logicLab → stem_tool_logiclab.js
  // probability → stem_tool_probability.js
  // fractions → stem_tool_fractions.js

  console.log('[StemLab] stem_tool_math.js loaded — guard only (all tools extracted)');
})();