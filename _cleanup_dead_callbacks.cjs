#!/usr/bin/env node
// _cleanup_dead_callbacks.cjs — delete useCallback handler lines in AlloFlowANTI.txt
// that wrap setters which don't exist in scope. Safe because each handler is
// (a) defined exactly once and (b) never consumed elsewhere — verified manually.
// May 11 2026.

const fs = require('fs');
const PATH = 'AlloFlowANTI.txt';

// Phantom setters from _audit_all_phantoms.cjs --full output. Each is wrapped
// in a `const handle... = React.useCallback(() => <setter>(...), []);` line at
// L6151-6269 that is dead code.
const DEAD_SETTERS = [
  'setIsMinimized', 'setUserSpelling', 'setUserAnswer', 'setShowReviewPanel',
  'setSelectedStudent', 'setKeyboardSelectedItemId', 'setIsCallerMode',
  'setSelectedPuzzle', 'setShowEndConfirm', 'setActiveTab', 'setDashboardView',
  'setShowClearConfirm', 'setStep', 'setStandardMode', 'setIsConceptMapReady',
  'setIsVennPlaying', 'setShowSessionModal', 'setShowGroupModal',
  'setShowXPModal', 'setShowTextSettings', 'setIncludeGlossary',
  'setIncludeFamily', 'setIncludeCustom', 'setIncludeSightWords',
  'setIncludeAI', 'setIncludeLessonPlan', 'setIsEditing', 'setShowLetterHints',
  'setPlayInstructions', 'setIsHistoryVisible', 'setShowLocalStats',
];
const SETTER_RE = new RegExp(
  '\\b(' + DEAD_SETTERS.join('|') + ')\\s*\\('
);

const text = fs.readFileSync(PATH, 'utf8');
const lines = text.split('\n');
const removedLines = [];
const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Only target lines in the dead-handler block (roughly L6150-6280) AND
  // match the useCallback handler pattern wrapping a phantom setter.
  if (i + 1 >= 6150 && i + 1 <= 6300 &&
      /React\.useCallback\(\s*\(\)\s*=>\s*/.test(line) &&
      SETTER_RE.test(line)) {
    // Sanity: only delete if the line declares a handle... const that is
    // referenced exactly ONCE in the whole file (i.e., never consumed).
    const declMatch = line.match(/const\s+(handle\w+)\s*=/);
    if (declMatch) {
      const name = declMatch[1];
      const refCount = (text.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
      if (refCount > 1) {
        // Used somewhere — keep it. (Shouldn't happen for the phantom list,
        // but be safe.)
        out.push(line);
        continue;
      }
    }
    removedLines.push({ line: i + 1, text: line.trim() });
    continue; // drop the line
  }
  out.push(line);
}
fs.writeFileSync(PATH, out.join('\n'));
console.log('Removed', removedLines.length, 'dead useCallback handler line(s):');
for (const r of removedLines) {
  console.log('  L' + r.line + ': ' + r.text.slice(0, 90) + (r.text.length > 90 ? '…' : ''));
}
