// Read-only source substitution for the unit baseline. Never rewrites the checkout.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const root = path.resolve(__dirname, '../..');
const files = ['stem_lab/stem_tool_raptorhunt.js', 'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js'];
const baseline = new Map(files.map(file => [path.resolve(root, file).toLowerCase(), execFileSync('git', ['show', 'HEAD:' + file], { cwd: root, maxBuffer: 12 * 1024 * 1024 })]));
const read = fs.readFileSync;
fs.readFileSync = function(file, options) {
  const data = typeof file === 'string' && baseline.get(path.resolve(file).toLowerCase());
  if (!data) return read.apply(this, arguments);
  const encoding = typeof options === 'string' ? options : options && options.encoding;
  return encoding ? data.toString(encoding) : Buffer.from(data);
};
syncBuiltinESMExports();
