// The Studio count review is also used by the pre-activity review panel.
// Keep the interaction and approval checks identical in both entry points.
const fs = require('node:fs');
const { transformSync } = require('esbuild');
const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');
const start = source.indexOf('function WordSoundsSyllableCountReview(');
const end = source.indexOf('function WordSoundsSyllableCountQueue(', start);
if (start < 0 || end < 0) throw new Error('Missing shared syllable count review boundaries');
const compiled = transformSync(source.slice(start, end).trim(), { loader: 'jsx', target: 'es2020', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).code.trim();
const block = '// BEGIN GENERATED WORD SOUNDS COUNT REVIEW\n' + compiled + '\n// END GENERATED WORD SOUNDS COUNT REVIEW';
const file = 'word_sounds_module.js';
const current = fs.readFileSync(file, 'utf8');
const pattern = /\/\/ BEGIN GENERATED WORD SOUNDS COUNT REVIEW[\s\S]*?\/\/ END GENERATED WORD SOUNDS COUNT REVIEW/;
const anchor = '// END WORD SOUNDS SYLLABLE RECORDING EDITOR';
if (!current.includes(anchor)) throw new Error('Missing runtime recording editor boundary');
let next = pattern.test(current) ? current.replace(pattern, () => block) : current.replace(anchor, () => anchor + '\n\n' + block);
// Recording drafts and count reviews share the same session workflow. Keep
// both entry points on the canonical editor as its draft contract evolves.
const editorStart = source.indexOf('// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR');
const editorEnd = source.indexOf(anchor, editorStart);
if (editorStart < 0 || editorEnd < editorStart) throw new Error('Missing canonical syllable recording editor boundaries');
const editorBlock = source.slice(editorStart, editorEnd + anchor.length);
next = next.replace(/\/\/ BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR[\s\S]*?\/\/ END WORD SOUNDS SYLLABLE RECORDING EDITOR/, () => editorBlock);
if (process.argv.includes('--check')) {
  if (next !== current) throw new Error('Stale runtime syllable review components');
} else if (next !== current) fs.writeFileSync(file, next);
