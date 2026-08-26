// Single source of truth for the alloflow-remediation connector version.
// The stdio server's serverInfo, the MCPB manifest, and the bundle's package.json all
// require() this file — versions 0.3.1–0.3.5 each drifted somewhere because the number
// lived in more than one place (serverInfo was still announcing 0.3.0 at the 0.3.5 release).
module.exports = '0.4.2';
