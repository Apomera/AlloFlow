# Extract cyberDefense inline block and wrap as plugin
$src = Get-Content "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab\stem_lab_module.js" -Raw
$lines = $src -split "`r?`n"

# Lines 45604-46302 (0-indexed: 45603-46301) contain the inner code
$inner = $lines[45603..46301] -join "`n"

# Replace hub-scope variables with ctx.* equivalents
$inner = $inner -replace '\baddStemXP\b', 'ctx.awardXP'
$inner = $inner -replace '\bgetStemXP\b', 'ctx.getXP'
$inner = $inner -replace '\baddToast\b', 'ctx.addToast'
$inner = $inner -replace '\bcallGemini\b', 'ctx.callGemini'
$inner = $inner -replace '\bsetStemLabTool\b', 'ctx.setStemLabTool'
$inner = $inner -replace '\bstemLabTab\b', 'ctx.stemLabTab'
$inner = $inner -replace '\bstemLabTool\b', 'ctx.stemLabTool'

# Build the plugin wrapper
$header = @"
/**
 * stem_tool_cyberdefense.js - Cyber Defense Lab
 *
 * Phishing detective, password strength forge, cipher playground.
 * Digital citizenship and cybersecurity fundamentals.
 *
 * Registered tool ID: "cyberDefense"
 * Registry: window.StemLab.registerTool()
 */
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  window.StemLab.registerTool('cyberDefense', function (ctx) {
    var React = ctx.React;
    var el = React.createElement;

"@

$footer = @"

  });
})();
"@

$output = $header + "`n" + $inner + "`n" + $footer
$output | Set-Content "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab\stem_tool_cyberdefense.js" -Encoding UTF8
Write-Host "Done - wrote stem_tool_cyberdefense.js"
