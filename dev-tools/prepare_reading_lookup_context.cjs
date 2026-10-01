// Track 11: isolated passage projection, composed over the pending lookup candidates.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createPatch, applyPatch } = require('diff');
const { applyEngineAvailability, applyReaderAvailability } = require('./prepare_reading_lookup_availability.cjs');
const { applyHostMedia } = require('./prepare_reading_lookup_media.cjs');
const { applyDictionaryCacheRaceRecovery } = require('./prepare_dictionary_cache_race.cjs');

function applyEngineContext(source) {
  source = applyEngineAvailability(source);
  if (source.includes('const lookupProjectPassage =')) return source;
  const start = source.indexOf('  const lookupPlainText = node => {');
  const end = source.indexOf('  const lookupContextPrompt = request => {', start);
  if (start < 0 || end < 0) throw Error('Lookup projection section changed');
  source = source.slice(0, start) + String.raw`  const lookupIgnored = 'button,[hidden],[inert],[aria-hidden="true"],[data-reading-ui],[data-reading-gloss],[data-adapted-word-help],[data-reading-chart],[role="status"],[role="alert"],script,style';
  const lookupBlocks = '[data-reading-paragraph],p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,dt,dd,pre,figcaption';
  const lookupNodeInfo = node => {
      const element = node?.nodeType === 1 ? node : node?.parentElement;
      if (!element || element.closest(lookupIgnored)) return null;
      const block = element.closest(lookupBlocks);
      if (!block) return null;
      return { block, language: element.closest('[data-reading-language]')?.dataset.readingLanguage,
          version: element.closest('[data-compare-version]'),
          pane: element.closest('[data-reading-paragraph]')?.dataset.readingParagraph || null };
  };
  const lookupSamePane = (info, scope) => info && (!scope.language || info.language === scope.language) && info.version === scope.version;
  const lookupSelectedPart = (range, node) => {
      if (!range.intersectsNode(node)) return null;
      const from = node === range.startContainer ? range.startOffset : 0;
      const to = node === range.endContainer ? range.endOffset : node.textContent.length;
      return to > from ? { from, to } : null;
  };
  // Text and offsets share one projection. Explicit BRs and semantic blocks/cells
  // contribute boundaries; inline formatting and excluded help contribute none.
  const lookupProjectPassage = (range, scope) => {
      const root = range.commonAncestorContainer, walker = document.createTreeWalker(root, 5);
      const segments = [];
      let passageText = '', previousBlock = null;
      for (let node = root; node; node = walker.nextNode()) {
          const info = lookupNodeInfo(node);
          if (!lookupSamePane(info, scope) || !range.intersectsNode(node)) continue;
          if (node.nodeType === 1 && node.tagName === 'BR') {
              if (passageText) passageText += '\n';
          } else if (node.nodeType === 3 && node.textContent) {
              if (passageText && previousBlock !== info.block && !passageText.endsWith('\n')) passageText += '\n';
              previousBlock = info.block;
              segments.push({ node, start: passageText.length });
              passageText += node.textContent;
          }
      }
      return { passageText, segments };
  };
  const lookupEmptyContext = () => ({ passageText: '', lookupText: '', selectionStart: null, selectionEnd: null });
  const lookupRangeContext = range => {
      if (!range || range.collapsed) return lookupEmptyContext();
      const root = range.commonAncestorContainer, walker = document.createTreeWalker(root, 4);
      let first = null, last = null;
      // Element boundary offsets index children, not characters. Find the actual
      // selected passage text before choosing language, version, or context blocks.
      for (let node = root; node; node = walker.nextNode()) {
          if (node.nodeType !== 3) continue;
          const info = lookupNodeInfo(node), part = info && lookupSelectedPart(range, node);
          if (!part || !node.textContent.slice(part.from, part.to).trim()) continue;
          if (!first) first = info;
          if (lookupSamePane(info, first)) last = info;
      }
      if (!first || !last) return lookupEmptyContext();
      const contextRange = document.createRange();
      contextRange.setStartBefore(first.block); contextRange.setEndAfter(last.block);
      const { passageText, segments } = lookupProjectPassage(contextRange, first);
      let selectionStart = null, selectionEnd = null;
      for (const segment of segments) {
          const part = lookupSelectedPart(range, segment.node);
          if (!part) continue;
          if (selectionStart == null) selectionStart = segment.start + part.from;
          selectionEnd = segment.start + part.to;
      }
      if (selectionStart == null) return lookupEmptyContext();
      const selected = passageText.slice(selectionStart, selectionEnd);
      selectionStart += selected.length - selected.trimStart().length;
      selectionEnd -= selected.length - selected.trimEnd().length;
      return { passageText, selectionStart, selectionEnd, lookupText: passageText.slice(selectionStart, selectionEnd),
          language: first.language, pane: first.pane };
  };
  // Capture before focus/selection disappears. Only strings and offsets survive;
  // the DOM nodes used by the projection never enter a retry snapshot.
  const captureLookupContext = (event, context = {}) => {
      const element = event?.currentTarget;
      let captured = null;
      if (context.passageText == null && (context.range || element?.nodeType === 1)) {
          captured = lookupEmptyContext();
          try {
              const range = context.range || document.createRange();
              if (!context.range) range.selectNodeContents(element);
              captured = lookupRangeContext(range);
          } catch (_) {}
      }
      const artifact = _resolveRevisionArtifactContext();
      const language = context.language || captured?.language || element?.closest?.('[data-reading-language]')?.dataset?.readingLanguage || artifact.language || 'English';
      const selectionStart = context.selectionStart ?? captured?.selectionStart;
      return {
          passageText: String(context.passageText ?? captured?.passageText ?? context.text ?? ''),
          selectionStart: Number.isInteger(selectionStart) ? selectionStart : null,
          selectionEnd: context.selectionEnd ?? captured?.selectionEnd ?? null,
          lookupText: context.lookupText ?? captured?.lookupText ?? null,
          occurrence: Number.isInteger(context.occurrence) ? context.occurrence : null,
          pane: context.pane || captured?.pane || element?.closest?.('[data-reading-paragraph]')?.dataset?.readingParagraph || null,
          language: language === 'All Selected Languages' ? 'English' : language,
          grade: artifact.grade
      };
  };
` + source.slice(end);
  function replace(before, after) {
    const at = source.indexOf(before);
    if (at < 0 || source.indexOf(before, at + before.length) >= 0) throw Error('Lookup selection anchor changed: ' + before);
    source = source.slice(0, at) + after + source.slice(at + before.length);
  }
  replace('          const snapshot = _revisionSnapshot(_s().generatedContent);', `          if (interactionMode === 'define' && menu.lookupText != null && !menu.lookupText.trim()) {
              setSelectionMenu(null); return;
          }
          const snapshot = _revisionSnapshot(_s().generatedContent);`);
  replace("      await startReadingLookup('definition', (selected.lookupText || selected.text).trim(), null, selected);", `      const word = (selected.lookupText ?? selected.text).trim();
      if (!word) return;
      await startReadingLookup('definition', word, null, selected);`);
  return source;
}
module.exports = { applyEngineContext };

if (require.main === module) {
  const root = path.resolve(__dirname, '..'), directory = path.join(root, 'reports/lookup-recovery/context');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const files = [
    ['content_engine_source.jsx', applyEngineContext, 'engine'],
    ['view_simplified_source.jsx', applyReaderAvailability, 'reader'],
    ['host_handlers_source.jsx', applyHostMedia, 'host'],
    ['dictionary_loader.js', applyDictionaryCacheRaceRecovery, 'dictionary']
  ];
  const dependencyFiles = ['reader_place_store.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js',
    'dev-tools/prepare_reading_lookup_context.cjs', 'dev-tools/prepare_reading_lookup_availability.cjs', 'dev-tools/prepare_reading_lookup_media.cjs', 'dev-tools/prepare_reading_lookup_resilience.cjs', 'dev-tools/prepare_reading_lookup_enhancements.cjs',
    'dev-tools/prepare_dictionary_cache_recovery.cjs', 'dev-tools/prepare_dictionary_cache_race.cjs',
    'tests/reading_lookup_candidate.js', 'tests/reading_lookup_context.test.js', 'tests/reading_lookup_recovery.test.js', 'tests/reading_lookup_popup_adapter.test.js'];
  if (process.argv.includes('--verify')) {
    const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'baseline.json'), 'utf8'));
    const tests = JSON.parse(fs.readFileSync(path.join(directory, 'tests.json'), 'utf8'));
    const report = { head: head(), baselineHead: baseline.head, inspectedAt: new Date().toISOString(), files: {},
      checks: {
        dependenciesUnchanged: Object.entries(baseline.dependencies).every(([file, hash]) => sha(read(file)) === hash),
        artifactsUnchanged: Object.entries(baseline.artifacts).every(([file, hash]) => sha(fs.readFileSync(path.join(directory, file))) === hash),
        testsPassed: tests.success && tests.numFailedTests === 0 && tests.numPendingTests === 0 && tests.numPassedTests > 0
      }, tests: { passed: tests.numPassedTests, failed: tests.numFailedTests, skipped: tests.numPendingTests, files: tests.testResults.length } };
    for (const [file, transform, name] of files) {
      const raw = read(file), source = raw.replace(/\r\n/g, '\n');
      const candidate = fs.readFileSync(path.join(directory, name + '.candidate.source.js'), 'utf8');
      report.files[file] = {
        sourceUnchanged: sha(raw) === baseline.files[file].sourceSha256,
        candidateUnchanged: sha(candidate) === baseline.files[file].candidateSha256,
        fullPatchReproducesCandidate: applyPatch(source, fs.readFileSync(path.join(directory, name + '.patch'), 'utf8')) === candidate,
        transformReproducesCandidate: transform(source) === candidate,
        transformIsIdempotent: transform(candidate) === candidate
      };
      if (name === 'engine') report.files[file].incrementReproducesCandidate = applyPatch(applyEngineAvailability(source), fs.readFileSync(path.join(directory, 'engine-context.patch'), 'utf8')) === candidate;
    }
    report.verified = Object.values(report.checks).every(Boolean) && Object.values(report.files).every(checks => Object.values(checks).every(Boolean));
    fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2)); if (!report.verified) process.exitCode = 1;
  } else {
    // Compose the pending changes over current source; never restore an older shared file.
    const record = { head: head(), files: {}, dependencies: {}, artifacts: {} };
    fs.mkdirSync(directory, { recursive: true });
    const write = (name, text) => { fs.writeFileSync(path.join(directory, name), text); record.artifacts[name] = sha(text); };
    for (const [file, transform, name] of files) {
      const raw = read(file), source = raw.replace(/\r\n/g, '\n'), candidate = transform(source);
      if (transform(candidate) !== candidate) throw Error('Non-idempotent transform: ' + file);
      require('@babel/parser').parse(candidate, { sourceType: 'script', plugins: ['jsx'] });
      record.files[file] = { sourceSha256: sha(raw), candidateSha256: sha(candidate) };
      write(name + '.patch', createPatch(file, source, candidate, '', '', { context: 3 }));
      write(name + '.baseline.source.js', source); write(name + '.candidate.source.js', candidate);
      if (name === 'engine') {
        const wrap = require('../_build_simple_iife_module.js').wrapSimpleIife;
        write('engine-context.patch', createPatch(file, applyEngineAvailability(source), candidate, '', '', { context: 3 }));
        write('content_engine_module.baseline.js', wrap({ source, guardKey: 'ContentEngineModule' }));
        write('content_engine_module.candidate.js', wrap({ source: candidate, guardKey: 'ContentEngineModule' }));
      }
      if (name === 'reader') {
        const compile = text => '(function(){ var React = window.React;\n' + require('@babel/core').transformSync(read('reader_place_store.js') + '\n' + text, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code + '\nwindow.AlloModules.SimplifiedView = SimplifiedView; })();\n';
        write('view_simplified_module.baseline.js', compile(source));
        write('view_simplified_module.candidate.js', compile(candidate));
      }
    }
    for (const file of dependencyFiles) record.dependencies[file] = sha(read(file));
    fs.writeFileSync(path.join(directory, 'baseline.json'), JSON.stringify(record, null, 2) + '\n');
    console.log('Prepared isolated context candidates with pending availability, media, and dictionary changes. Shared application files were not written.');
  }
}
