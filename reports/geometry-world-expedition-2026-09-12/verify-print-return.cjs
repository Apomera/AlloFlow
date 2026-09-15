const fs=require('node:fs');
// Reuse the native host/tool round trip against today's production modules.
const source=fs.readFileSync('reports/geometry-world-entry-2026-09-12/verify-returning.cjs','utf8');
new Function('require','__dirname',source)(require,__dirname);
