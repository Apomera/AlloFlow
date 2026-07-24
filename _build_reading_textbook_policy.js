#!/usr/bin/env node
/**
 * Apply the Reading Library textbook-provider UI/policy patch to the canonical
 * CDN module and its checked-in public mirror. Kept as a deterministic builder
 * because these large OneDrive-backed files cannot be patched reliably by the
 * Windows sandbox helper.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TARGETS = [
  path.join(ROOT, 'reading_library_module.js'),
  path.join(ROOT, 'prismflow-deploy', 'public', 'reading_library_module.js')
];

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(label + ': expected exactly one anchor, found ' + count);
  return source.replace(before, after);
}

function applyPolicyPatch(source) {
  if (source.includes("function bookUsagePolicy(book)")) return source;

  source = replaceOnce(
    source,
    "      sourceLine: 'OpenStax open textbooks',\n      summary: 'Open textbooks and course-aligned chapters for high school and beyond.',",
    "      sourceLine: 'OpenStax chapters & CK-12 FlexBook links',\n      summary: 'Accessible open-textbook chapters plus curated course-aligned study links.',",
    'study collection copy'
  );

  source = replaceOnce(
    source,
    "  function isCardContent(book) {\n    return /card/.test(String((book && book.contentType) || ''));\n  }\n",
    "  function isCardContent(book) {\n    return /card/.test(String((book && book.contentType) || ''));\n  }\n\n" +
    "  // Provider rights are data-driven on full book records. The source-based\n" +
    "  // fallbacks also protect older/stale indexes that predate usagePolicy.\n" +
    "  function bookUsagePolicy(book) {\n" +
    "    if (book && book.usagePolicy && typeof book.usagePolicy === 'object') return book.usagePolicy;\n" +
    "    var source = bookSourceId(book);\n" +
    "    if (source === 'ck12') return { access: 'link-only', mirror: false, adapt: false, ai: false, commercial: false };\n" +
    "    if (source === 'openstax') return { access: isCardContent(book) ? 'link-out' : 'mirrored', mirror: true, adapt: true, ai: true, commercial: false, attributionRequired: true, shareAlike: true };\n" +
    "    return { access: isCardContent(book) ? 'link-out' : 'mirrored', ai: true };\n" +
    "  }\n\n" +
    "  function bookAllowsAi(book) {\n" +
    "    return bookUsagePolicy(book).ai !== false;\n" +
    "  }\n",
    'provider policy helpers'
  );

  source = replaceOnce(
    source,
    "    var bookSourceHref = bookSourceUrl && bookSourceUrl !== '#' ? bookSourceUrl : '';\n",
    "    var bookSourceHref = bookSourceUrl && bookSourceUrl !== '#' ? bookSourceUrl : '';\n" +
    "    var usagePolicy = bookUsagePolicy(book);\n" +
    "    var allowsAi = bookAllowsAi(book);\n" +
    "    var linkOnly = usagePolicy.access === 'link-only';\n" +
    "    var isMirroredOpenStax = bookSourceId(book) === 'openstax' && !isCardContent(book);\n",
    'reader policy state'
  );

  source = replaceOnce(
    source,
    "    var generate = function (type, label) {\n      setGenOpen(false);\n",
    "    var generate = function (type, label) {\n      setGenOpen(false);\n" +
    "      if (!allowsAi) {\n" +
    "        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider is link-only, so its material is not sent to AI tools.'), 'info');\n" +
    "        return;\n" +
    "      }\n",
    'generate policy guard'
  );

  source = replaceOnce(
    source,
    "    var openAsDocument = function () {\n      setGenOpen(false);\n",
    "    var openAsDocument = function () {\n      setGenOpen(false);\n" +
    "      if (!allowsAi) {\n" +
    "        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider is link-only, so its material is not sent to AI tools.'), 'info');\n" +
    "        return;\n" +
    "      }\n",
    'source handoff policy guard'
  );

  source = replaceOnce(
    source,
    "    var openInLingua = function () {\n      if (typeof props.onPracticeLanguage !== 'function') return;\n",
    "    var openInLingua = function () {\n" +
    "      if (!allowsAi) {\n" +
    "        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider is link-only, so its material is not sent to AI tools.'), 'info');\n" +
    "        return;\n" +
    "      }\n" +
    "      if (typeof props.onPracticeLanguage !== 'function') return;\n",
    'Lingua policy guard'
  );

  source = replaceOnce(
    source,
    "    var translateBook = function (target) {\n      var lang = String(target || '').trim();\n",
    "    var translateBook = function (target) {\n" +
    "      if (!allowsAi) {\n" +
    "        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider is link-only, so its material is not sent to AI tools.'), 'info');\n" +
    "        return;\n" +
    "      }\n" +
    "      var lang = String(target || '').trim();\n",
    'translation policy guard'
  );

  source = replaceOnce(
    source,
    "        license: book.license || '',\n",
    "        license: book.license || '',\n        usagePolicy: usagePolicy,\n",
    'resource reference policy'
  );

  source = replaceOnce(
    source,
    "        modeBtn('define', '📖', tr('readinglib_mode_define', 'Define')),\n        modeBtn('phonics', '🔤', tr('readinglib_mode_phonics', 'Sounds')),\n",
    "        allowsAi ? modeBtn('define', '📖', tr('readinglib_mode_define', 'Define')) : null,\n" +
    "        allowsAi ? modeBtn('phonics', '🔤', tr('readinglib_mode_phonics', 'Sounds')) : null,\n",
    'AI reading modes'
  );

  const translationStart = "        // AI translation menu — fills languages StoryWeaver doesn't cover.\n        e('div', { className: 'relative', 'data-rl-menu': 'tx' },";
  source = replaceOnce(
    source,
    translationStart,
    "        // AI translation menu — fills languages StoryWeaver doesn't cover.\n        allowsAi ? e('div', { className: 'relative', 'data-rl-menu': 'tx' },",
    'translation menu start'
  );
  const translationEndAnchor = "          ) : null\n        ),\n        e('button', {\n          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-slate-100',\n          onClick: function () { setShowPractice(!showPractice); },";
  source = replaceOnce(
    source,
    translationEndAnchor,
    "          ) : null\n        ) : null,\n        allowsAi ? e('button', {\n          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-slate-100',\n          onClick: function () { setShowPractice(!showPractice); },",
    'translation menu and AI practice boundary'
  );

  source = replaceOnce(
    source,
    "          'aria-pressed': showPractice,\n        }, '🎙️ ' + tr('readinglib_practice', 'Practice')),\n        typeof props.onPracticeLanguage === 'function' ? e('button', {",
    "          'aria-pressed': showPractice,\n        }, '🎙️ ' + tr('readinglib_practice', 'Practice')) : null,\n" +
    "        allowsAi && typeof props.onPracticeLanguage === 'function' ? e('button', {",
    'AI practice and Lingua controls'
  );

  const createStart = "        e('div', { className: 'relative', 'data-rl-menu': 'create' },";
  source = replaceOnce(source, createStart, "        allowsAi ? e('div', { className: 'relative', 'data-rl-menu': 'create' },", 'create menu start');
  const createEndAnchor = "            }, '⤓ ' + tr('readinglib_download_txt', 'Download text (.txt)')) : null\n          ) : null\n        )\n      ),\n      (hasAudioTrack || hasPageAudio)";
  source = replaceOnce(
    source,
    createEndAnchor,
    "            }, '⤓ ' + tr('readinglib_download_txt', 'Download text (.txt)')) : null\n" +
    "          ) : null\n" +
    "        ) : linkOnly ? e('span', {\n" +
    "          className: 'px-2 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-300',\n" +
    "          title: tr('readinglib_link_only_hint', 'Open the official provider site to use this material. Mirroring and AI tools are disabled for this source.')\n" +
    "        }, '↗ ' + tr('readinglib_link_only', 'Link only · AI off')) : null\n" +
    "      ),\n" +
    "      (hasAudioTrack || hasPageAudio)",
    'create menu end'
  );

  source = replaceOnce(
    source,
    "          isCardContent(book) ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-center' },\n            '🔗 ' + tr('readinglib_card_notice', 'This is a source card — a short overview with a link to the real thing. Use “Open original” above to read the full text at the source.')) : null,\n",
    "          linkOnly ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-center' },\n" +
    "            '↗ ' + tr('readinglib_link_only_notice', 'CK-12 remains link-only under its current terms. This card contains an AlloFlow-authored overview; open the official source to read or assign the curriculum. AI and mirroring are disabled.')) :\n" +
    "          isCardContent(book) ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-center' },\n" +
    "            '🔗 ' + tr('readinglib_card_notice', 'This is a source card — a short overview with a link to the real thing. Use “Open original” above to read the full text at the source.')) :\n" +
    "          isMirroredOpenStax ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-center' },\n" +
    "            '✓ ' + tr('readinglib_openstax_mirror_notice', 'Accessibility-ready OpenStax chapter mirror · CC BY-NC-SA 4.0 · attribution and share-alike apply to adaptations.')) : null,\n",
    'reader provider notice'
  );

  source = replaceOnce(
    source,
    "        bookSourceId(b) !== 'storyweaver' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold' },\n          sourceLabel(bookSourceId(b))) : null,\n",
    "        bookSourceId(b) !== 'storyweaver' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold' },\n" +
    "          sourceLabel(bookSourceId(b))) : null,\n" +
    "        bookSourceId(b) === 'openstax' && !isCardContent(b) ? e('span', { className: 'px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold' },\n" +
    "          '✓ ' + tr('readinglib_mirrored_chapter', 'Mirrored chapter')) : null,\n" +
    "        bookSourceId(b) === 'ck12' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-semibold' },\n" +
    "          '↗ ' + tr('readinglib_link_only', 'Link only · AI off')) : null,\n",
    'catalog provider badges'
  );

  return source;
}

for (const target of TARGETS) {
  const before = fs.readFileSync(target, 'utf8');
  const after = applyPolicyPatch(before);
  fs.writeFileSync(target, after);
  console.log(path.relative(ROOT, target) + (before === after ? ' already patched' : ' patched'));
}
