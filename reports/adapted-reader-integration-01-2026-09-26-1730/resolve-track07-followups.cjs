'use strict';
const fs = require('fs'), path = require('path');
const folder = path.join(__dirname, 'merge-track07-followups/resolved');
const re = /^<<<<<<< integrated\n([\s\S]*?)^\|\|\|\|\|\|\| incremental-base\n[\s\S]*?^=======\n([\s\S]*?)^>>>>>>> track07-followups\n/gm;
const file = path.join(folder, 'view_simplified_source.jsx');
let s = fs.readFileSync(file, 'utf8'), count = 0;
s = s.replace(re, (_, current, incoming) => {
  const index = count++;
  if (index === 0) {
    current = current.replace(/    React.useEffect\(function \(\) \{ dismissAdaptationPreview\(\); \}, \[generatedContent[^\n]+\n/, '');
    incoming = incoming.replace('var adaptPreviewRef = React.useRef(null), adaptTermsRef = React.useRef(null), adaptPreviewButtonRef = React.useRef(null);', 'var adaptTermsRef = React.useRef(null), adaptPreviewButtonRef = adaptPreviewTriggerRef;');
    incoming = incoming.replace('setAdaptPreview(null); setAdaptBusy(false);', 'dismissAdaptationPreview(); setAdaptBusy(false);');
    return current + incoming;
  }
  if (index === 1) {
    incoming = "      if (supportDraftSession?.blocked()) return requestSupportTransition(applyAdaptation);\n" + incoming;
    incoming = incoming.replace('      let committed = false;', "      if (adaptPreviewRef.current?.contains(document.activeElement)) adaptFocusRecoveryRef.current = 'undo';\n      adaptApplyInFlightRef.current = true;\n      let committed = false;");
    incoming = incoming.replace("setAdaptPreview(null); setAdaptFocus('preview');", "dismissAdaptationPreview('undo');");
    incoming = incoming.replace('finally { if (adaptMountedRef.current && (isCurrent() || committed)) setAdaptBusy(false); }', 'finally { adaptApplyInFlightRef.current = false; if (adaptMountedRef.current && (isCurrent() || committed)) setAdaptBusy(false); if (!committed) restoreAdaptationFocus(); }');
    return incoming;
  }
  if (index === 2) return incoming.replace(/id="(simplified-adapt-terms-(?:hint|error))"/g, "id={readerId('$1')}").replace('aria-describedby="simplified-adapt-terms-hint simplified-adapt-terms-error"', "aria-describedby={[readerId('simplified-adapt-terms-hint'), readerId('simplified-adapt-terms-error')].join(' ')}");
  if (index === 3) return incoming.replace(/(aria-labelledby|id)="simplified-adapt-preview-title"/g, "$1={readerId('simplified-adapt-preview-title')}");
  if (index === 4) return incoming.replace("setAdaptPreview(null); setAdaptFocus('preview');", "dismissAdaptationPreview('preview');");
  if (index === 5) return current.replace(/formatInteractiveText\(cleanText(?:, false, !!isLineFocusMode)?\)/g, 'renderReadingInline(cleanText)');
  throw Error('Unexpected conflict');
});
if (count !== 6) throw Error('Expected six conflicts');
// Preserve document-inspector semantics on the new shared inline path too.
s = s.replace("simplifiedLinkLabel((node.children || []).map(n => n.text || '').join(''))} target=\"_blank\"", "simplifiedLinkLabel(shared.plain(node), node.href)} aria-haspopup={/^#allo-doc-[a-z0-9-]+$/.test(node.href || '') ? 'dialog' : undefined} target={/^#allo-doc-[a-z0-9-]+$/.test(node.href || '') ? undefined : '_blank'}");
// readingText.plain accepts source text, so use recursive visible node labels.
s = s.replace('simplifiedLinkLabel(shared.plain(node), node.href)', "simplifiedLinkLabel((function labelOf(value) { return value.hidden ? '' : value.text !== undefined ? value.text : (value.children || []).map(labelOf).join(''); })(node), node.href)");
require('@babel/parser').parse(s, { sourceType: 'script', plugins: ['jsx'] });
fs.writeFileSync(file, s);
const test = path.join(folder, 'tests/reader_render_cost.test.js');
let t = fs.readFileSync(test, 'utf8');
t = t.replace(re, (_, current) => current.replace('highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex', 'highlightGlossaryTerms: text => { counts.format++; return text; }, latestGlossary: [], setFocusedParagraphIndex'));
fs.writeFileSync(test, t);
