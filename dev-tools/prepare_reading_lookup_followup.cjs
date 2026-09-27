// Bounded track 11 follow-up. Shared engine/reader files remain owned by the
// integrator; this prepares source patches and disposable test candidates only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createPatch } = require('diff');

function editor(source) {
  let text = source;
  return {
    replace(before, after) {
      const at = text.indexOf(before);
      if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw new Error('Lookup follow-up anchor changed: ' + before.slice(0, 100));
      text = text.slice(0, at) + after + text.slice(at + before.length);
    },
    section(start, end, replacement) {
      const at = text.indexOf(start), stop = text.indexOf(end, at + start.length);
      if (at < 0 || stop < 0 || text.indexOf(start, at + start.length) >= 0) throw new Error('Lookup follow-up section changed: ' + start);
      text = text.slice(0, at) + replacement + text.slice(stop);
    },
    result() { return text; }
  };
}

function applyLookupFollowup(source) {
  if (source.includes('const lookupRangeContext =')) {
    if (!source.includes('retryDictionary:') || !source.includes('bypassMissingCache:')) throw new Error('Partial lookup follow-up integration');
    return source;
  }
  const edit = editor(source);
  edit.section('  // Capture the actual occurrence before selection/focus disappears.', '  const lookupContextPrompt =', String.raw`  // Project the selected blocks into plain passage text while mapping offsets.
  // Interleaved bilingual rows can put another language and its headings inside
  // the DOM range; only the starting pane's passage text belongs to this lookup.
  const lookupRangeContext = range => {
      const elementFor = node => node?.nodeType === 1 ? node : node?.parentElement;
      const first = elementFor(range.startContainer), last = elementFor(range.endContainer);
      const blockSelector = '[data-reading-paragraph],p,li,blockquote,h1,h2,h3,h4,h5,h6';
      const startBlock = first?.closest?.(blockSelector), endBlock = last?.closest?.(blockSelector);
      if (!startBlock || !endBlock) return null;
      const language = first.closest('[data-reading-language]')?.dataset.readingLanguage;
      const pane = first.closest('[data-compare-version]');
      const contextRange = document.createRange();
      contextRange.setStartBefore(startBlock); contextRange.setEndAfter(endBlock);
      const walker = document.createTreeWalker(contextRange.commonAncestorContainer, 4);
      let passageText = '', selectionStart = null, selectionEnd = null, previousBlock = null;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!node.textContent || !contextRange.intersectsNode(node) || parent?.closest('button,[data-reading-gloss],[data-adapted-word-help],[role="status"],[aria-hidden="true"]')) continue;
          if (language && parent?.closest('[data-reading-language]')?.dataset.readingLanguage !== language) continue;
          if (pane && parent?.closest('[data-compare-version]') !== pane) continue;
          const block = parent?.closest(blockSelector);
          if (!block) continue; // Pane headings and inter-block layout text are not passage content.
          if (passageText && previousBlock !== block && !passageText.endsWith('\n')) passageText += '\n';
          previousBlock = block;
          const offset = passageText.length;
          passageText += node.textContent;
          if (range.intersectsNode(node)) {
              const from = node === range.startContainer ? range.startOffset : 0;
              const to = node === range.endContainer ? range.endOffset : node.textContent.length;
              if (to > from) {
                  if (selectionStart == null) selectionStart = offset + from;
                  selectionEnd = offset + to;
              }
          }
      }
      if (selectionStart == null) return null;
      const selected = passageText.slice(selectionStart, selectionEnd);
      selectionStart += selected.length - selected.trimStart().length;
      selectionEnd -= selected.length - selected.trimEnd().length;
      return { passageText, selectionStart, selectionEnd, lookupText: passageText.slice(selectionStart, selectionEnd) };
  };
  // Capture before selection/focus disappears; retry snapshots retain no DOM.
  const captureLookupContext = (event, context = {}) => {
      const range = context.range;
      const node = range?.startContainer;
      const element = node ? (node.nodeType === 1 ? node : node.parentElement) : event?.currentTarget;
      const block = element?.closest?.('[data-reading-paragraph],p,li,blockquote');
      let captured = null;
      if (range && context.passageText == null) {
          try { captured = lookupRangeContext(range); } catch (_) {}
      }
      const passageText = context.passageText ?? captured?.passageText ?? (lookupPlainText(block) || context.text || '');
      let selectionStart = context.selectionStart ?? captured?.selectionStart;
      if (selectionStart == null && block?.contains?.(element)) {
          try {
              const before = document.createRange(); before.selectNodeContents(block);
              if (range) before.setEnd(range.startContainer, range.startOffset);
              else before.setEndBefore(element);
              selectionStart = lookupPlainText(before.cloneContents()).length;
              if (range) selectionStart += (range.toString().match(/^\s*/) || [''])[0].length;
          } catch (_) {}
      }
      const artifact = _resolveRevisionArtifactContext();
      const language = context.language || element?.closest?.('[data-reading-language]')?.dataset?.readingLanguage || artifact.language || 'English';
      return {
          passageText: String(passageText),
          selectionStart: Number.isInteger(selectionStart) ? selectionStart : null,
          selectionEnd: context.selectionEnd ?? captured?.selectionEnd ?? null,
          lookupText: context.lookupText ?? captured?.lookupText ?? null,
          occurrence: Number.isInteger(context.occurrence) ? context.occurrence : null,
          pane: context.pane || block?.dataset?.readingParagraph || null,
          language: language === 'All Selected Languages' ? 'English' : language,
          grade: artifact.grade
      };
  };
`);
  edit.replace('          occurrence: request.occurrence', '          selectionEnd: request.selectionEnd == null ? null : request.selectionEnd - start,\n          occurrence: request.occurrence');
  edit.replace('      let attempt = 0, audio = null, audioUrl = null;', '      let attempt = 0, audio = null, audioUrl = null, dictionaryAttempt = null;');
  edit.replace('const session = { cancel: () => { ++attempt; releaseAudio(); } };', 'const session = { cancel: () => { ++attempt; dictionaryAttempt?.cancel(); releaseAudio(); } };');
  edit.section('      const lookupDictionary = async () => {', '      const run = async () => {', String.raw`      const lookupDictionary = async (retry = false) => {
          if (!isCurrent() || !dictionarySupported || dictionaryAttempt) return;
          const controller = typeof AbortController === 'function' ? new AbortController() : null;
          const job = { cancel: null };
          dictionaryAttempt = job;
          let timer;
          const cancelled = new Promise(resolve => {
              job.cancel = () => { controller?.abort(); resolve({ cancelled: true }); };
          });
          const deadline = new Promise(resolve => {
              timer = setTimeout(() => { controller?.abort(); resolve({ entry: null }); }, 10000);
          });
          update({ dictionaryStatus: 'loading' });
          try {
              const work = (async () => {
                  if (!window.AlloDictionary?.lookup && window.__alloLoadPlugin) await window.__alloLoadPlugin('dictionary_loader.js');
                  if (!isCurrent() || dictionaryAttempt !== job || controller?.signal.aborted) return { cancelled: true };
                  const entry = await window.AlloDictionary?.lookup?.(word, { signal: controller?.signal, bypassMissingCache: retry });
                  return { entry };
              })();
              const result = await Promise.race([work, deadline, cancelled]);
              if (!result.cancelled && dictionaryAttempt === job) {
                  const entry = result.entry;
                  update(entry ? { dictionary: kind === 'definition' ? entry : { phonetic: entry.phonetic, audio: entry.audio }, dictionaryStatus: 'ready' }
                      : { dictionaryStatus: 'unavailable' });
              }
          } catch (_) {
              if (dictionaryAttempt === job) update({ dictionaryStatus: 'unavailable' });
          } finally {
              clearTimeout(timer);
              if (dictionaryAttempt === job) dictionaryAttempt = null;
          }
      };
`);
  edit.replace('          isLoading: true, retry: run,', '          isLoading: true, retry: run, retryDictionary: dictionarySupported ? () => lookupDictionary(true) : undefined,');
  edit.replace("await startReadingLookup('definition', selected.text.trim(), null, selected);", "await startReadingLookup('definition', (selected.lookupText || selected.text).trim(), null, selected);");
  return edit.result();
}

function applyDictionaryCancellation(source) {
  if (source.includes('options.bypassMissingCache')) return source;
  const edit = editor(source);
  edit.replace('lookup: function (word) {', 'lookup: function (word, options) {\n      options = options || {};\n      if (options.signal?.aborted) return Promise.resolve(null);');
  edit.replace('if (cached !== undefined) return Promise.resolve(cached); // hit (entry or cached-null)', 'if (cached !== undefined && !(cached === null && options.bypassMissingCache)) return Promise.resolve(cached);');
  edit.replace('return fetch(API + encodeURIComponent(w)).then(function (r) {', 'return Promise.resolve().then(function () {\n        if (options.signal?.aborted) return null;\n        return fetch(API + encodeURIComponent(w), { signal: options.signal });\n      }).then(function (r) {\n        if (!r || options.signal?.aborted) return null;');
  edit.replace('if (rows == null) return null;', 'if (rows == null || options.signal?.aborted) return null;');
  edit.replace('        else writeCache(w, null);', '        // Only a real 404 is a cached miss; malformed responses remain retryable.');
  return edit.result();
}

module.exports = { applyLookupFollowup, applyDictionaryCancellation };
if (require.main === module) {
  const root = path.resolve(__dirname, '..'), directory = path.join(root, 'reports/lookup-recovery');
  const files = [
    ['content_engine_source.jsx', applyLookupFollowup, 'engine-followup.patch'],
    ['dictionary_loader.js', applyDictionaryCancellation, 'dictionary-followup.patch']
  ];
  const hashes = {};
  fs.mkdirSync(directory, { recursive: true });
  for (const [file, transform, patch] of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8'), normalized = source.replace(/\r\n/g, '\n'), result = transform(normalized);
    hashes[file] = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), normalizedSourceSha256: crypto.createHash('sha256').update(normalized).digest('hex') };
    fs.writeFileSync(path.join(directory, patch), createPatch(file, normalized, result, '', '', { context: 3 }));
    if (process.argv.includes('--candidate') && file === 'content_engine_source.jsx') {
      const candidate = require('../_build_simple_iife_module.js').wrapSimpleIife({ source: result, guardKey: 'ContentEngineModule' });
      new (require('node:vm').Script)(candidate);
      fs.writeFileSync(path.join(directory, 'content_engine_module.candidate.js'), candidate);
    }
  }
  fs.writeFileSync(path.join(directory, 'followup-base.json'), JSON.stringify({ head: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), files: hashes }, null, 2) + '\n');
  console.log('Prepared engine and dictionary follow-up patches; shared source and generated files were not changed.');
}
