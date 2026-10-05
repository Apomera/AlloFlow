const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { syncBuiltinESMExports } = require('node:module');
const { fileURLToPath } = require('node:url');
const auditDir = process.env.WATER_THERMAL_LAYER_READ_AUDIT_DIR;
const targets = JSON.parse(process.env.WATER_THERMAL_LAYER_READ_AUDIT_TARGETS || '[]');
const targetMap = new Map(targets.map(item => [path.resolve(item.absolute).toLowerCase(), item.relative]));
const originalReadSync = fs.readFileSync, originalRead = fs.readFile, originalPromiseRead = fsp.readFile, originalWrite = fs.writeFileSync;
const observed = new Map();
function record(file, data) {
  if (!auditDir || !(Buffer.isBuffer(data) || typeof data === 'string')) return;
  let absolute;
  try { absolute = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file)).toLowerCase(); } catch { return; }
  const relative = targetMap.get(absolute);
  if (!relative) return;
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  observed.set(relative + ':' + sha256, { path: relative, sha256, bytes: bytes.length, loadedAt: new Date().toISOString(), pid: process.pid });
  originalWrite(path.join(auditDir, 'loaded-' + process.pid + '.json'), JSON.stringify([...observed.values()], null, 2) + '\n');
}
fs.readFileSync = function(file, ...args) { const value = originalReadSync.call(this, file, ...args); record(file, value); return value; };
fs.readFile = function(file, ...args) {
  const callback = args.pop();
  return originalRead.call(this, file, ...args, function(error, value) { if (!error) record(file, value); callback(error, value); });
};
fsp.readFile = async function(file, ...args) { const value = await originalPromiseRead.call(this, file, ...args); record(file, value); return value; };
syncBuiltinESMExports();
