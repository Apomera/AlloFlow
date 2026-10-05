const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createTwoFilesPatch } = require('diff');
const root = path.resolve(__dirname, '../..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const before = '  }, [history, isHistoryLoaded, isOnline, isTeacherMode, activeSessionCode, lzLoaded, canvasRecoveryRevision]);';
const after = '  }, [history, isHistoryLoaded, isOnline, isTeacherMode, activeSessionCode, lzLoaded, canvasRecoveryRevision, isStorageDisabled, isCanvas]);';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const changes = hosts.map((file, index) => {
  const value = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(value.split(before).length, 2, `Missing or ambiguous policy boundary: ${file}`);
  return { file, index, value, beforeHash: hash(value), updated: value.replace(before, after) };
});
fs.mkdirSync(path.join(__dirname, 'policy-before'), { recursive: true });
for (const entry of changes) assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.beforeHash, `Concurrent edit: ${entry.file}`);
for (const entry of changes) {
  fs.writeFileSync(path.join(__dirname, `policy-before/${entry.index}-${path.basename(entry.file)}`), entry.value);
  fs.writeFileSync(path.join(__dirname, `history-policy-${entry.index}.patch`), createTwoFilesPatch(entry.file, entry.file, entry.value, entry.updated));
  assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.beforeHash);
  fs.writeFileSync(path.join(root, entry.file), entry.updated);
}
fs.writeFileSync(path.join(__dirname, 'history-policy.json'), JSON.stringify(changes.map(({ file, beforeHash, updated }) => ({ file, beforeHash, afterHash: hash(updated) })), null, 2) + '\n');
console.log('History autosave now retires pending writes when device-storage policy or Canvas routing changes.');
