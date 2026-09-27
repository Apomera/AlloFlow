// Minimal accessibility deltas; renderer owners can apply alongside their work.
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('Citation renderer seam changed: ' + before);
  return source.replace(before, after);
}
exports.simplified = source => {
  source = replaceOnce(source, 'function simplifiedLinkLabel(label) {', "function simplifiedLinkLabel(label, href) {\n    if (/^#allo-doc-[a-z0-9-]+$/.test(href || '')) return String(label || '') + ', inspect supplied document passage';");
  source = replaceOnce(source, 'aria-label={simplifiedLinkLabel(link[1])} target="_blank"', 'aria-label={simplifiedLinkLabel(link[1], link[2])} aria-haspopup={/^#allo-doc-[a-z0-9-]+$/.test(link[2]) ? "dialog" : undefined} target={/^#allo-doc-[a-z0-9-]+$/.test(link[2]) ? undefined : "_blank"}');
  // Treat Markdown backslash escapes as atoms before emphasis/link parsing.
  // Keep offsets in the stored Markdown, including each consumed backslash.
  source = replaceOnce(source, "return String(text || '').split(/(", String.raw`return String(text || '').split(/(\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|`);
  return replaceOnce(source, 'var start = cursor; cursor += part.length;', String.raw`var start = cursor; cursor += part.length;
      if (/^\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]$/.test(part)) return <React.Fragment key={index}>{leaf(part.slice(1), withOffsets ? start + 1 : undefined, false)}</React.Fragment>;`);
};
exports.inline = source => {
  source = replaceOnce(source, 'const _linkLabel = (label, t) => {', "const _linkLabel = (label, t, href) => {\n  if (/^#allo-doc-[a-z0-9-]+$/.test(href || '')) return String(label || '') + ', inspect supplied document passage';");
  const before = 'aria-label={_linkLabel(match[1], t)}';
  if (source.split(before).length !== 3) throw new Error('Expected two inline link renderers');
  source = source.replaceAll(before, 'aria-label={_linkLabel(match[1], t, match[2])} aria-haspopup={/^#allo-doc-[a-z0-9-]+$/.test(match[2]) ? "dialog" : undefined}');
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) if (lines[i].includes('aria-label={_linkLabel(match[1], t, match[2])}')) {
    if (!lines[i + 1].includes('target="_blank"')) throw new Error('Expected inline link target');
    lines[i + 1] = lines[i + 1].replace('target="_blank"', 'target={/^#allo-doc-[a-z0-9-]+$/.test(match[2]) ? undefined : "_blank"}');
  }
  source = lines.join('\n');
  source = replaceOnce(source, 'const parts = text.split(/(', String.raw`const parts = text.split(/(\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|`);
  source = replaceOnce(source, 'return parts.filter(p => p != null).map((part, i) => {', String.raw`return parts.filter(p => p != null).map((part, i) => {
          if (/^\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]$/.test(part)) return <React.Fragment key={i}>{part.slice(1)}</React.Fragment>;`);
  source = replaceOnce(source, 'const subParts = content.split(/(', String.raw`const subParts = content.split(/(\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]|`);
  return replaceOnce(source, 'const renderedSubParts = subParts.filter(sp => sp != null).map((subPart, sIdx) => {', String.raw`const renderedSubParts = subParts.filter(sp => sp != null).map((subPart, sIdx) => {
               if (/^\\[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]$/.test(subPart)) return <React.Fragment key={sIdx}>{subPart.slice(1)}</React.Fragment>;`);
};
