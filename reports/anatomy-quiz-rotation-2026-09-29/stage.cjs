const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const git = args => cp.execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).trimEnd();
const root = path.join(__dirname, 'staged-locales');
fs.mkdirSync(root, { recursive: true });
const owned = key => /^(card_flow_|quiz_flow_)/.test(key) || ['restart_quiz', 'restart_quiz_2', 'end_quiz', 'end_quiz_and_explore', 'quiz_misses_go_to_review'].includes(key);
function objectEnd(text, start) {
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  throw new Error('Unclosed locale section');
}
function localeCandidate(base, working) {
  function memberObject(text, start, key) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}' && --depth === 0) break;
      else if (text[i] === '"') {
        let end = i + 1, escaped = false;
        for (; end < text.length; end++) { if (escaped) escaped = false; else if (text[end] === '\\') escaped = true; else if (text[end] === '"') break; }
        if (depth === 1 && JSON.parse(text.slice(i, end + 1)) === key) {
          const rest = text.slice(end + 1).match(/^\s*:\s*(\{)/);
          if (rest) return end + 1 + rest[0].length - 1;
        }
        i = end;
      }
    }
    throw new Error('Missing object member: ' + key);
  }
  const stemStart = memberObject(base, base.indexOf('{'), 'stem');
  const start = memberObject(base, stemStart, 'anatomy'), end = objectEnd(base, start);
  let section = base.slice(start, end + 1);
  const closingIndent = section.slice(section.lastIndexOf('\n') + 1).match(/^\s*/)[0];
  for (const key of Object.keys(working.stem.anatomy).filter(owned)) {
    const value = JSON.stringify(working.stem.anatomy[key]);
    const expression = new RegExp('^(\\s*"' + key + '":\\s*)"(?:[^"\\\\]|\\\\.)*"(,?)$', 'm');
    if (expression.test(section)) section = section.replace(expression, (_, prefix, comma) => prefix + value + comma);
    else {
      const lastLine = section.lastIndexOf('\n');
      const body = section.slice(0, lastLine).replace(/(\S)(\s*)$/, '$1,$2');
      section = body + '\n' + closingIndent + '  "' + key + '": ' + value + section.slice(lastLine);
    }
  }
  const result = base.slice(0, start) + section + base.slice(end + 1);
  const before = JSON.parse(base), after = JSON.parse(result);
  for (const key of Object.keys(working.stem.anatomy).filter(owned)) {
    if (after.stem.anatomy[key] !== working.stem.anatomy[key]) throw new Error('Anatomy label mismatch: ' + key);
  }
  for (const key of Object.keys(after.stem.anatomy).filter(owned)) delete after.stem.anatomy[key];
  for (const key of Object.keys(before.stem.anatomy).filter(owned)) delete before.stem.anatomy[key];
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Non-anatomy locale content changed');
  return result;
}
const locales = [], summary = [];
for (const lang of ['french', 'spanish_latin_america', 'arabic']) {
  const file = 'lang/' + lang + '.js';
  const working = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const target of [file, 'desktop/web-app/public/' + file]) {
    const base = git(['show', 'HEAD:' + target]) + '\n';
    const candidate = localeCandidate(base, working);
    const output = path.join(root, target.replaceAll('/', '__'));
    fs.writeFileSync(output, candidate);
    locales.push({ target, output });
    summary.push({ path: target, keys: Object.keys(working.stem.anatomy).filter(owned), hash: crypto.createHash('sha256').update(candidate).digest('hex') });
  }
}
fs.writeFileSync(path.join(__dirname, 'locale-commit-scope.json'), JSON.stringify(summary, null, 2) + '\n');
if (process.argv.includes('--stage')) {
  if (git(['diff', '--cached', '--name-only']).trim()) throw new Error('Existing staged work found; refusing to mix commits');
  const files = [
    'stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
    'tests/anatomy_card_flow.test.js', 'tests/anatomy_quiz_flow.test.js', 'tests/anatomy_quiz_rotation.test.js',
    'tests/anatomy_learning_reliability.test.js', 'tests/anatomy_science_enhancements.test.js',
    'tests/anatomy_integrated_refinements.test.js', 'tests/anatomy_myth_hear_contrast.test.js',
    'tests/anatomy_clinical_assets.test.js', 'tests/anatomy_mobile_a11y_polish.test.js',
    'tests/anatomy_flashcard_review_rounds.test.js', 'tests/anatomy_lab_science.test.js',
    'tests/e2e/anatomy-card-flow.spec.ts', 'tests/e2e/anatomy-quiz-flow.spec.ts',
    'reports/anatomy-quiz-rotation-2026-09-29/README.md', 'reports/anatomy-quiz-rotation-2026-09-29/verification.json',
    'reports/anatomy-quiz-rotation-2026-09-29/locale-commit-scope.json',
    'reports/anatomy-quiz-rotation-2026-09-29/after-desktop.png', 'reports/anatomy-quiz-rotation-2026-09-29/feedback-phone.png',
    'reports/anatomy-quiz-rotation-2026-09-29/feedback-dark-390.png', 'reports/anatomy-quiz-rotation-2026-09-29/arabic-320.png',
    'reports/anatomy-quiz-rotation-2026-09-29/cards-desktop.png', 'reports/anatomy-quiz-rotation-2026-09-29/card-completion-phone.png'
  ];
  for (const file of files) if (!fs.existsSync(file)) throw new Error('Missing commit artifact: ' + file);
  git(['add', '--', ...files]);
  for (const { target, output } of locales) {
    const hash = git(['hash-object', '-w', '--path=' + target, output]);
    git(['update-index', '--add', '--cacheinfo', '100644,' + hash + ',' + target]);
  }
  const allowed = new Set([...files, ...locales.map(entry => entry.target)]);
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (staged.some(file => !allowed.has(file))) throw new Error('Unexpected staged file');
  git(['diff', '--cached', '--check']);
  console.log('Staged ' + staged.length + ' anatomy files. Locale changes are restricted to ' + summary[0].keys.length + ' anatomy labels per pack.');
} else console.log('Prepared six locale candidates with only anatomy labels changed.');
