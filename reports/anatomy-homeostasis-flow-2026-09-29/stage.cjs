const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const folder = __dirname;
const sharedEnv = { ...process.env };
delete sharedEnv.GIT_INDEX_FILE;
const repoRoot = cp.execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: path.resolve(folder, '../..'), env: sharedEnv, encoding: 'utf8' }).trim();
const gitRaw = (args, env = process.env) => cp.execFileSync('git', args, { cwd: repoRoot, env, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const git = (args, env = process.env) => gitRaw(args, env).trimEnd();
const sourceHash = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
// Resolve final labels at execution time, including data-authored translation keys.
const legacyLocaleKeys = [
  "a11y_logged_homeostasis_observations",
  "arterial_blood_ph_reference_prompt",
  "compare_outside_reference_counts",
  "explain_homeostasis_model_limit",
  "explanation_input",
  "fasting_glucose_mg_dl",
  "homeo_recap_all",
  "homeo_recap_q1",
  "homeo_recap_q1_a",
  "homeo_recap_q1_b",
  "homeo_recap_q1_c",
  "homeo_recap_q2",
  "homeo_recap_q2_a",
  "homeo_recap_q2_b",
  "homeo_recap_q2_c",
  "homeo_recap_q3",
  "homeo_recap_q3_a",
  "homeo_recap_q3_b",
  "homeo_recap_q3_c",
  "homeo_recap_score",
  "homeo_recap_some",
  "homeo_recap_title",
  "homeostasis_model_limit",
  "homeostasis_reference_hypothesis",
  "hypothesis_input",
  "one_variable_outside_reference",
  "recap_correct_short",
  "recap_incorrect_short",
  "three_variables_outside_reference",
  "two_variables_outside_reference",
  "within_teaching_references"
];
const localeKeys = [...new Set([...legacyLocaleKeys, ...[...fs.readFileSync(path.join(repoRoot, 'stem_lab/stem_tool_anatomy.js'), 'utf8').matchAll(/\b(homeo_flow_[a-z0-9_]+|scan_flow_[a-z0-9_]+)\b/g)].map(match => match[1])])].sort();
const owned = key => localeKeys.includes(key);

function objectEnd(text, start) {
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; }
    else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return i;
  }
  throw new Error('Unclosed locale object');
}

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
  throw new Error('Missing locale object member: ' + key);
}

function localeCandidate(base, working) {
  const stemStart = memberObject(base, base.indexOf('{'), 'stem');
  const start = memberObject(base, stemStart, 'anatomy');
  const end = objectEnd(base, start);
  let section = base.slice(start, end + 1);
  for (const key of localeKeys) {
    if (typeof working.stem.anatomy[key] !== 'string') throw new Error('Missing translated anatomy label: ' + key);
    const value = JSON.stringify(working.stem.anatomy[key]);
    const expression = new RegExp('^([ \\t]*"' + key + '":[ \\t]*)"(?:[^"\\\\]|\\\\.)*"(,?)(\\r?)$', 'm');
    if (expression.test(section)) section = section.replace(expression, (_, prefix, comma, cr) => prefix + value + comma + cr);
    else {
      const closing = section.match(/(\r?\n)([ \t]*)\}$/);
      if (!closing) throw new Error('Unexpected anatomy locale formatting');
      const body = section.slice(0, closing.index).replace(/(\S)(\s*)$/, '$1,$2');
      section = body + closing[1] + closing[2] + '  "' + key + '": ' + value + closing[0];
    }
  }
  const candidate = base.slice(0, start) + section + base.slice(end + 1);
  const before = JSON.parse(base), after = JSON.parse(candidate);
  for (const key of localeKeys) {
    if (after.stem.anatomy[key] !== working.stem.anatomy[key]) throw new Error('Candidate translation mismatch: ' + key);
    delete before.stem.anatomy[key];
    delete after.stem.anatomy[key];
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Unrelated locale content changed');
  return candidate;
}

function scopeFiles() {
  const screenshots = process.env.ANATOMY_COMMIT_SCREENSHOTS
    ? process.env.ANATOMY_COMMIT_SCREENSHOTS.split(',').map(name => name.trim()).filter(Boolean)
    : ['before-checks-phone.png', 'after-desktop.png', 'after-phone.png', 'after-dark.png', 'arabic-320.png', 'retrieval-feedback-phone.png', 'experiment-phone.png', 'imaging-guidance-390.png', 'imaging-bodyscope-390.png'];
  if (!screenshots.length || new Set(screenshots).size !== screenshots.length || screenshots.some(name => !/^[A-Za-z0-9_-]+\.png$/.test(name))) throw new Error('Supply one or more unique report PNG names through ANATOMY_COMMIT_SCREENSHOTS');
  const extraTests = process.env.ANATOMY_COMMIT_EXTRA_TESTS ? process.env.ANATOMY_COMMIT_EXTRA_TESTS.split(',').map(file => file.trim()).filter(Boolean) : [];
  if (extraTests.some(file => file !== 'tests/microdissection_anatomy3d.test.js' && !/^tests\/(?:anatomy_[a-z0-9_]+\.test\.js|e2e\/anatomy-[a-z0-9-]+\.spec\.ts)$/.test(file))) throw new Error('ANATOMY_COMMIT_EXTRA_TESTS accepts only explicit anatomy test paths and tests/microdissection_anatomy3d.test.js');
  return [...new Set([
    'stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
    'tests/anatomy_homeostasis_flow.test.js', 'tests/anatomy_imaging_guidance.test.js',
    'tests/e2e/anatomy-homeostasis-flow.spec.ts', 'tests/e2e/anatomy-imaging-guidance.spec.ts',
    ...extraTests,
    'reports/anatomy-homeostasis-flow-2026-09-29/README.md', 'reports/anatomy-homeostasis-flow-2026-09-29/verification.json',
    'reports/anatomy-homeostasis-flow-2026-09-29/locale-commit-scope.json',
    ...screenshots.map(name => 'reports/anatomy-homeostasis-flow-2026-09-29/' + name)
  ])];
}

function prepareLocales(base) {
  if (!localeKeys.some(key => key.startsWith('homeo_flow_'))) throw new Error('Final Homeostasis flow labels are not integrated yet');
  const candidatesFolder = path.join(folder, 'staged-locales');
  fs.mkdirSync(candidatesFolder, { recursive: true });
  const locales = [], summary = [];
  for (const language of ['french', 'spanish_latin_america', 'arabic']) {
    const file = 'lang/' + language + '.js';
    const working = JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
    for (const target of [file, 'desktop/web-app/public/' + file]) {
      const current = JSON.parse(fs.readFileSync(path.join(repoRoot, target), 'utf8'));
      for (const key of localeKeys) if (current.stem.anatomy[key] !== working.stem.anatomy[key]) throw new Error('Working locale mirrors differ: ' + target + ' / ' + key);
      const candidate = localeCandidate(gitRaw(['show', base + ':' + target], sharedEnv), working);
      const output = path.join(candidatesFolder, target.replaceAll('/', '__'));
      fs.writeFileSync(output, candidate);
      locales.push({ target, output });
      summary.push({ path: target, keys: localeKeys, hash: crypto.createHash('sha256').update(candidate).digest('hex') });
    }
  }
  fs.writeFileSync(path.join(folder, 'locale-commit-scope.json'), JSON.stringify(summary, null, 2) + '\n');
  return locales;
}

function stage(base, locales) {
  const sharedIndex = path.resolve(repoRoot, git(['rev-parse', '--git-path', 'index'], sharedEnv));
  if (!process.env.GIT_INDEX_FILE || path.resolve(process.env.GIT_INDEX_FILE) === sharedIndex) throw new Error('--stage requires an isolated GIT_INDEX_FILE');
  if (git(['diff', '--cached', '--name-only', base])) throw new Error('Isolated index must match the selected base before staging');
  const files = scopeFiles();
  for (const file of files) if (!fs.existsSync(path.join(repoRoot, file))) throw new Error('Missing commit artifact: ' + file);
  const allowed = new Set([...files, ...locales.map(entry => entry.target)]);
  if (git(['diff', '--cached', '--name-only', '--', ...allowed], sharedEnv)) throw new Error('Anatomy scope already contains shared staged changes; preserving them');
  const verification = JSON.parse(fs.readFileSync(path.join(folder, 'verification.json'), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(verification.sourceSha256 || '')) throw new Error('Missing verified sourceSha256');
  const localeScope = JSON.parse(fs.readFileSync(path.join(folder, 'locale-commit-scope.json'), 'utf8'));
  for (const { target, output } of locales) {
    const language = path.posix.basename(target, '.js');
    const candidateHash = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
    const entry = localeScope.find(item => item.path === target);
    if (!entry || entry.hash !== candidateHash || candidateHash !== verification.localeCandidateHashes?.[language]) throw new Error('Locale candidate differs from verification: ' + target + '. Prepare candidates and rerun verification before committing');
  }
  for (const file of files.slice(0, 2)) if (sourceHash(fs.readFileSync(path.join(repoRoot, file), 'utf8')) !== verification.sourceSha256) throw new Error('Working source differs from the verified source: ' + file);
  git(['add', '--', ...files]);
  for (const { target, output } of locales) {
    const hash = git(['hash-object', '-w', '--path=' + target, output]);
    git(['update-index', '--add', '--cacheinfo', '100644,' + hash + ',' + target]);
  }
  const staged = git(['diff', '--cached', '--name-only', base]).split('\n').filter(Boolean);
  if (staged.some(file => !allowed.has(file))) throw new Error('Unexpected isolated commit scope');
  for (const file of files.slice(0, 2)) if (sourceHash(gitRaw(['show', ':' + file])) !== verification.sourceSha256) throw new Error('Staged source differs from the verified source: ' + file);
  git(['diff', '--cached', '--check', base]);
  console.log('Prepared ' + staged.length + ' isolated anatomy paths, with only ' + localeKeys.length + ' flow labels changed per language pack.');
  return staged;
}

module.exports = { repoRoot, git, gitRaw, sourceHash, localeKeys, legacyLocaleKeys, owned, localeCandidate, scopeFiles, prepareLocales, stage };
if (require.main === module) {
  const base = process.env.ANATOMY_COMMIT_BASE || git(['rev-parse', 'HEAD'], sharedEnv);
  const locales = prepareLocales(base);
  if (process.argv.includes('--stage')) stage(base, locales);
  else console.log('Prepared six locale candidates. The Git index was not changed.');
}
