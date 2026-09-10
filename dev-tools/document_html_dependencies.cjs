'use strict';
// Passed directly to page.evaluate. Keep all browser-side dependencies inside
// this function so baseline export and rendered comparison share one policy.
function inspectDocumentDependencies() {
  const elements = Array.from(document.querySelectorAll('*'));
  const scripts = Array.from(document.scripts).filter(script => {
    // Unknown non-JavaScript types are inert data blocks, including XML.
    // Import maps/speculation rules still affect document behavior.
    const declared = script.getAttribute('type');
    const type = declared === null
      ? (script.getAttribute('language') ? 'text/' + script.getAttribute('language') : 'text/javascript')
      : declared.trim() || 'text/javascript';
    return ['module', 'importmap', 'speculationrules'].includes(type.toLowerCase())
      || /^(?:application\/(?:x-)?(?:java|ecma)script|text\/(?:(?:x-)?(?:java|ecma)script|javascript1\.[0-5]|jscript|livescript))$/i.test(type);
  }).length
    + elements.reduce((count, el) => count + Array.from(el.attributes).filter(attribute => /^on/i.test(attribute.name)
      || /^(href|src|action|formaction|xlink:href)$/i.test(attribute.name) && /^javascript:/i.test(attribute.value.replace(/[\u0000-\u0020]/g, ''))).length, 0);
  const external = value => value.trim() && !/^data:/i.test(value.trim());
  // Respect srcset URL/descriptor boundaries and commas within data URLs.
  const externalSrcset = value => {
    let index = 0;
    while (index < value.length) {
      while (/[\s,]/.test(value[index] || '') && index < value.length) index++;
      const start = index;
      while (index < value.length && !/\s/.test(value[index])) index++;
      const url = value.slice(start, index);
      if (url && external(url.replace(/,+$/, ''))) return true;
      if (url.endsWith(',')) continue;
      let parentheses = 0;
      while (index < value.length) {
        const char = value[index++];
        if (char === '(') parentheses++;
        else if (char === ')') parentheses = Math.max(0, parentheses - 1);
        else if (char === ',' && !parentheses) break;
      }
    }
    return false;
  };
  const resources = Array.from(document.querySelectorAll('link[rel~="stylesheet"],img,source,video,audio,track,iframe,object,embed,image,use')).filter(el => {
    if (/^(IFRAME|OBJECT|EMBED)$/.test(el.tagName)) return true;
    if (el.hasAttribute('srcset') && externalSrcset(el.getAttribute('srcset') || '')) return true;
    return ['href', 'xlink:href', 'src', 'data', 'poster'].some(attribute => {
      const value = el.getAttribute(attribute) || '';
      if (el.namespaceURI === 'http://www.w3.org/2000/svg' && value.trim().startsWith('#')) return false;
      return external(value);
    });
  }).length;
  // Inactive rules and hidden elements may not request their assets. Inspect
  // parsed declarations as well as actual requests, retaining embedded data
  // and same-document SVG references as self-contained resources.
  const cssReferences = new Set();
  const decodeCss = value => value.replace(/\\(?:([0-9a-f]{1,6})\s?|([^\r\n]))/gi, (_, hex, char) =>
    hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : char);
  const addCssReference = value => {
    const decoded = decodeCss(value).trim();
    if (decoded && !decoded.startsWith('#') && external(decoded)) cssReferences.add(decoded);
  };
  const inspectStyle = style => {
    if (!style) return;
    for (const property of style) {
      const value = style.getPropertyValue(property);
      // Function-looking text inside a CSS string (for example content)
      // is literal text, not a resource reference.
      const strings = [];
      for (let index = 0; index < value.length; index++) {
        if (value[index] !== '"' && value[index] !== "'") continue;
        const start = index, quote = value[index++];
        while (index < value.length && value[index] !== quote) {
          if (value[index] === '\\') index++;
          index++;
        }
        strings.push([start, index]);
      }
      const quoted = index => strings.some(([start, end]) => start <= index && index <= end);
      const urls = /url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^)\\])*))\s*\)/gi;
      for (const match of value.matchAll(urls)) if (!quoted(match.index)) addCssReference(match[1] ?? match[2] ?? match[3]);
      // CSS image-set permits bare string URLs in addition to url().
      if (/(?:^|[^\w-])(?:-webkit-)?image-set\(/i.test(value)) {
        for (const match of value.matchAll(/(?:image-set\(|,)\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/gi)) if (!quoted(match.index)) addCssReference(match[1] ?? match[2]);
      }
    }
  };
  const inspectRules = rules => {
    for (const rule of rules) {
      if (rule.type === CSSRule.IMPORT_RULE) addCssReference(rule.href);
      inspectStyle(rule.style);
      if (rule.cssRules) inspectRules(rule.cssRules);
    }
  };
  elements.forEach(element => inspectStyle(element.style));
  let inaccessibleStyleSheets = 0;
  for (const sheet of document.styleSheets) {
    try { inspectRules(sheet.cssRules); } catch { inaccessibleStyleSheets++; }
  }
  const animations = document.getAnimations().filter(animation => !['finished', 'idle'].includes(animation.playState)).length;
  return { scripts, unresolved: resources + cssReferences.size + inaccessibleStyleSheets, animations };
}
module.exports = { inspectDocumentDependencies };
