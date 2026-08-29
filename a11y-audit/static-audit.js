#!/usr/bin/env node
/**
 * AlloFlow WCAG 2.2 AA Static Source Audit
 *
 * Scans all JS/JSX source files for known accessibility anti-patterns
 * identified in the March 2026 comprehensive audit.
 *
 * Usage: node static-audit.js [--json] [--gate] [--file path]
 */

const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const STANDARD = 'WCAG 2.2 AA';

const SCAN_DIRS = [
  '',                // project root (canonical source files + module-only files)
  'stem_lab',
  'sel_hub',
];

const SCAN_EXTENSIONS = ['.js', '.jsx'];
const EXPLICIT_ROOT_FILES = new Set(['AlloFlowANTI.txt']);

// Files to skip (compiled output, backups)
const SKIP_PATTERNS = [
  /node_modules/,
  /(?:^|[\\/])\.[^\\/]+$/,
  /_archive/,
  /backup/i,
  /(?:^|[\\/])(?:build|dist|coverage|test-results)(?:[\\/]|$)/,
  /(?:^|[\\/])_build_[^\\/]+\.js$/,
  /\.min\.js$/,
  /games_module\.js$/,       // compiled output; audit games_source.jsx instead
  /stem_lab_module\.js$/,    // too large for line-by-line; audited separately
  // Minified third-party bundle (724KB over 1032 lines). Not ours to edit, and
  // any patch here is erased by the next vendor update; Blockly ships its own
  // keyboard navigation upstream. Was contributing 5 unfixable DRAGDROP-001s.
  /blockly_runtime\.bundle\.js$/,
  // Dev probe artifact (1.4MB), never shipped as UI.
  /_codex_pdf_parse_probe\.js$/,
  // Generated BehaviorLens staging outputs. The canonical shipped module is
  // behavior_lens_module.js; these files are recreated by _bl_* patch scripts.
  /_bl_[^\\/]+\.updated\.js$/,
];

// ── Anti-Pattern Definitions ───────────────────────────────────────────────

/**
 * Return a renderer call's props expression without borrowing attributes from
 * a later sibling. Delimiter matching is necessary because callback bodies and
 * nested style objects can close many lines before the props do.
 */
function rendererPropsContext(lines, lineNum, tagPattern, maxLines = 80) {
  const windowText = lines.slice(lineNum - 1, Math.min(lines.length, lineNum - 1 + maxLines)).join('\n');
  const tag = tagPattern.exec(windowText);
  if (!tag) return windowText;

  let start = tag.index + tag[0].length;
  while (/\s/.test(windowText[start] || '')) start++;
  if (windowText[start] !== ',') return windowText.slice(tag.index);
  start++;
  while (/\s/.test(windowText[start] || '')) start++;

  const stack = [];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let regexClass = false;
  let previousSignificant = '';

  for (let i = start; i < windowText.length; i++) {
    const character = windowText[i];
    const next = windowText[i + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (regex) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '[') regexClass = true;
      else if (character === ']') regexClass = false;
      else if (character === '/' && !regexClass) regex = false;
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      i++;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && (!previousSignificant || /[({[=,:;!?&|+\-*%^~<>]/.test(previousSignificant))) {
      regex = true;
      regexClass = false;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') stack.push(character);
    else if (character === ')' || character === ']' || character === '}') {
      if (stack.length === 0) return windowText.slice(start, i);
      stack.pop();
    } else if (character === ',' && stack.length === 0) {
      return windowText.slice(start, i);
    }
    if (!/\s/.test(character)) previousSignificant = character;
  }

  return windowText.slice(start);
}

/**
 * A renderer canvas assigned to a local and referenced only by a one-line
 * console statement is a diagnostic probe, not part of the rendered tree.
 * Stay conservative: any non-console reference keeps the canvas auditable.
 */
function isConsoleOnlyCanvasProbe(line, lineNum, lines) {
  const declaration = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:h|createElement)\(\s*['"]canvas['"]/.exec(line);
  if (!declaration) return false;

  const reference = new RegExp(
    '(?:^|[^A-Za-z0-9_$])'
      + declaration[1].replace(/\$/g, '\\$')
      + '(?=$|[^A-Za-z0-9_$])'
  );
  const consoleStartPattern = /^\s*(?:(?:[A-Za-z_$][\w$]*|\([^;\n]*\))\s*&&\s*)?console\.(?:debug|dir|error|info|log|table|warn)\s*\(/;
  const consoleOnly = /^\s*(?:(?:[A-Za-z_$][\w$]*|\([^;\n]*\))\s*&&\s*)?console\.(?:debug|dir|error|info|log|table|warn)\s*\([\s\S]*\)\s*;?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    if (i === lineNum - 1) continue;
    const candidate = lines[i];
    if (!reference.test(candidate)) continue;
    if (/^\s*(?:\/\/|\/\*|\*)/.test(candidate)) continue;
    if (consoleOnly.test(candidate)) continue;

    const firstPossibleStart = Math.max(0, i - 12);
    let start = i;
    while (start >= firstPossibleStart && !consoleStartPattern.test(lines[start])) start--;
    if (start < firstPossibleStart) return false;

    const endLimit = Math.min(lines.length, start + 24);
    let end = start;
    while (end < endLimit && !/\)\s*;?\s*$/.test(lines[end])) end++;
    if (end >= endLimit || i > end) return false;
    if (!consoleOnly.test(lines.slice(start, end + 1).join('\n'))) return false;
  }
  return true;
}

const CHECKS = [
  {
    id: 'KEYBOARD-001',
    name: 'Clickable div/span/td without keyboard access',
    wcag: '2.1.1 Keyboard, 4.1.2 Name/Role/Value',
    severity: 'critical',
    description: 'Non-semantic element has onClick but no role="button", tabIndex, or onKeyDown',
    // Match onClick on div/span/td/li that don't also have role or tabIndex on same line/nearby
    test(line, lineNum, lines) {
      // Look for createElement('div'|'span'|'td', { ... onClick
      const divClick = /h\(\s*['"](?:div|span|td|li)['"]\s*,\s*\{[^}]*onClick/;
      const reactDiv = /createElement\(\s*['"](?:div|span|td|li)['"]\s*,\s*\{[^}]*onClick/;
      if (!divClick.test(line) && !reactDiv.test(line)) return false;
      // Check if same line or next 3 lines have role, tabIndex, or onKeyDown
      const context = lines.slice(lineNum - 1, lineNum + 3).join(' ');
      if (/role\s*[:=]/.test(context) && /tabIndex\s*[:=]/.test(context)) return false;
      if (/onKeyDown\s*[:=]/.test(context) || /onKeyPress\s*[:=]/.test(context)) return false;
      // A modal backdrop can be pointer-only when the dialog provides both an
      // Escape path and a semantic button that performs the same close action.
      const fileText = lines.join(' ');
      const isDialogBackdrop = /role\s*:\s*["']presentation["']/.test(context)
        && /role\s*:\s*["']dialog["']/.test(fileText)
        && /event\.key\s*===\s*["']Escape["']/.test(fileText)
        && /createElement\(\s*["']button["']/.test(fileText);
      if (isDialogBackdrop) return false;
      // Check for a11yClick which provides all three
      if (/a11yClick/.test(context)) return false;
      return true;
    },
    fix: 'Convert to <button>, or add role="button", tabIndex={0}, and onKeyDown handler for Enter/Space.',
  },
  {
    id: 'FOCUS-001',
    name: 'outline:none without visible focus replacement',
    wcag: '2.4.7 Focus Visible',
    severity: 'critical',
    description: 'Focus indicator suppressed via outline:none or outline:"none" without focus:ring or boxShadow replacement',
    test(line, lineNum, lines) {
      // Ignore comment-only lines: embedded remediation guidance and code
      // examples are not live focus styles.
      if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return false;
      // Remove only complete pointer-focus rules that explicitly preserve
      // :focus-visible. Other outline suppression on the same source line must
      // remain auditable.
      const auditableLine = line.replace(/[^{}]*:focus:not\(\s*:focus-visible\s*\)[^{]*\{[^{}]*outline\s*:\s*['"]?none['"]?[^{}]*\}/g, '');
      const hasOutlineNone = /outline\s*:\s*['"]?none['"]?/.test(auditableLine) || /outline-none/.test(auditableLine);
      if (!hasOutlineNone) return false;
      // Check if same line has focus:ring or focus:border or boxShadow
      if (/focus:ring/.test(line) || /focus:border/.test(line)) return false;
      if (/focus-visible:ring/.test(line) || /focus-visible:border/.test(line)) return false;
      // Check surrounding 2 lines for focus styles
      const context = lines.slice(Math.max(0, lineNum - 2), lineNum + 2).join(' ');
      if (/focus:ring/.test(context) || /boxShadow.*focus/.test(context)) return false;
      if (/':focus'/.test(context) || /onFocus.*style/.test(context)) return false;
      return true;
    },
    fix: 'Replace with outline-none focus:ring-2 focus:ring-[color]-500, or add boxShadow on :focus.',
  },
  {
    id: 'LIVE-001',
    name: 'File lacks aria-live region',
    wcag: '4.1.3 Status Messages',
    severity: 'critical',
    description: 'Module has dynamic UI updates but no aria-live region for screen reader announcements',
    // This is a file-level check, not line-level
    testFile(content, filePath) {
      // Only check tool/module files
      if (!/(module|tool)/.test(filePath)) return false;
      // Headless services can publish state through callbacks/observers but do
      // not own rendered status messages. Apply this UI rule only to files that
      // actually render elements; their consumers own the live-region contract.
      const executableContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1');
      const rendersUi = /React\.createElement\s*\(|(?:^|[\s,(])(?:e|h)\(\s*['"][a-z][\w-]*['"]|document\.createElement\s*\(\s*['"][a-z][\w-]*['"]|<(?:a|button|canvas|div|form|h[1-6]|img|input|label|li|main|nav|ol|option|p|section|select|span|svg|table|textarea|ul)(?:\s|\/?>)/im.test(executableContent);
      if (!rendersUi) return false;
      // Check if file has dynamic state (onClick, onChange, setState, upd()
      const hasDynamic = /onClick|onChange|setState|upd\(/.test(content);
      if (!hasDynamic) return false;
      // Check for aria-live or announceToSR
      const hasLive = /aria-live|announceToSR|addToast\s*\(|role.*['"](?:status|alert(?:dialog)?|log)['"]/.test(content);
      return !hasLive;
    },
    fix: 'Add <div role="status" aria-live="polite" className="sr-only">{statusText}</div> and announce state changes.',
  },
  {
    id: 'CANVAS-001',
    name: 'Canvas element without text alternative',
    wcag: '1.1.1 Non-text Content',
    severity: 'critical',
    description: 'Canvas element lacks a role and text alternative, or explicit exclusion when decorative',
    test(line, lineNum, lines) {
      // Documentation examples do not create canvas elements.
      if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return false;
      const isCanvas = /h\(\s*['"]canvas['"]/.test(line) || /createElement\(\s*['"]canvas['"]/.test(line);
      if (!isCanvas) return false;
      if (isConsoleOnlyCanvasProbe(line, lineNum, lines)) return false;
      // Read the element's whole props expression, not a fixed line window. Real
      // canvases in this codebase declare `ref`, sizing, and a long inline
      // draw callback before reaching role/aria-label, so a short window
      // reported 13 already-labelled canvases as missing a text alternative.
      // Delimiter matching is load-bearing: a nested callback can close with
      // `});` dozens of lines before the canvas props end (Space Station's
      // interior renderer is one example). Include two lines above to retain
      // the existing immediate-wrapper decorative-canvas check.
      const start = Math.max(0, lineNum - 3);
      const propsContext = rendererPropsContext(
        lines,
        lineNum,
        /(?:^|[^\w$])(?:h|createElement)\(\s*['"]canvas['"]/
      );
      const context = lines.slice(start, lineNum - 1).join(' ') + ' ' + propsContext;
      // A canvas used only as an internal drawing/mask buffer has no user-facing
      // information to name. Explicit aria-hidden is the correct 1.1.1 treatment.
      if (/["']?aria-hidden["']?\s*[:=]\s*["']?true["']?/.test(context)) return false;
      if (/setAttribute\(\s*["']aria-hidden["']\s*,\s*["']true["']\s*\)/.test(context)) return false;
      if (/aria-label/.test(context) && /role/.test(context)) return false;
      return true;
    },
    fix: 'Add role="img" and a descriptive aria-label, or aria-hidden="true" when the canvas is only an internal/decorative buffer.',
  },
  {
    id: 'SVG-001',
    name: 'SVG element without accessible name',
    wcag: '1.1.1 Non-text Content',
    severity: 'major',
    description: 'SVG element lacks role="img" and aria-label',
    test(line, lineNum, lines) {
      // Comments and documentation often show SVG API examples without
      // rendering anything. Do not turn those examples into UI findings.
      if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return false;
      // Match the renderer helper as a standalone identifier. Without the
      // boundary, ordinary calls such as array.push('svg') are false positives.
      const isSvg = /(?:^|[^\w$])h\(\s*['"]svg['"]/.test(line) || /createElement\(\s*['"]svg['"]/.test(line);
      if (!isSvg) return false;
      // Read to the end of the props object, not a fixed 5 lines: a long props
      // list pushes aria-label past a short window and reports a labelled SVG
      // as bare (birdlab:18680 did exactly that). Capped so a runaway scan
      // cannot swallow the rest of the file.
      // Read exactly the props object by matching braces. A line-based scan
      // cannot do this: stopping at the first line starting with "}" stops at a
      // NESTED close (style: { ... }) and misses an aria-label declared after
      // it, which is why birdlab:18680 read as bare when it is properly named.
      let context = '';
      {
        const window = lines.slice(lineNum - 1, Math.min(lines.length, lineNum + 40)).join('\n');
        // Props built by composition — h('svg', Object.assign({}, common, {...}))
        // The first brace is Object.assign's empty seed, so brace-matching it
        // reads "{}" and reports a labelled SVG as bare. Fall back to a plain
        // window, which spans all the merged fragments.
        if (/(?:h|createElement)\(\s*['"]svg['"]\s*,\s*Object\.assign\(/.test(line)) {
          context = lines.slice(lineNum - 1, lineNum + 4).join(' ');
          if (/aria-label|aria-hidden|role\s*[:=]\s*['"]img['"]/.test(context)) return false;
          return true;
        }
        // Anchor at the <svg> tag, not the start of the line. When the SVG is
        // nested — h('div', {...}, h('svg', {role:'img', ...})) — the first
        // brace on the line belongs to the WRAPPER, so scanning from there
        // reads the div's props and misses the SVG's own label entirely.
        const tag = /(?:h|createElement)\(\s*['"]svg['"]/.exec(window);
        const open = window.indexOf('{', tag ? tag.index : 0);
        if (open === -1) context = window;
        else {
          let depth = 0, q = null, end = window.length;
          for (let i = open; i < window.length; i++) {
            const c = window[i], p = window[i - 1];
            if (q) { if (c === q && p !== '\\') q = null; continue; }
            if (c === '"' || c === "'" || c === '`') { q = c; continue; }
            if (c === '{') depth++;
            else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
          }
          context = window.slice(open, end);
        }
      }
      if (/aria-label/.test(context)) return false;
      if (/role\s*[:=]\s*['"]img['"]/.test(context)) return false;
      // Decorative SVGs inside buttons with labels are okay
      if (/aria-hidden/.test(context)) return false;

      // A decorative child also inherits exclusion from an aria-hidden parent.
      // The parent's props may span several lines. Walk back only a small local
      // window, require aria-hidden on that candidate's own props, and prove its
      // renderer call is still open at the SVG line. The open-call check keeps a
      // closed aria-hidden sibling from being borrowed as an ancestor.
      for (let parentIndex = lineNum - 2; parentIndex >= Math.max(0, lineNum - 14); parentIndex--) {
        const parentLine = lines[parentIndex] || '';
        const parentTag = /(?:^|[^\w$])(?:h|createElement)\(\s*['"][^'"]+['"]/.exec(parentLine);
        if (!parentTag) continue;
        const parentProps = rendererPropsContext(
          lines,
          parentIndex + 1,
          /(?:^|[^\w$])(?:h|createElement)\(\s*['"][^'"]+['"]/
        );
        if (!/["']?aria-hidden["']?\s*[:=]\s*(?:["']true["']|true)/.test(parentProps)) continue;

        const callText = lines.slice(parentIndex, lineNum - 1).join('\n').slice(parentTag.index);
        let callDepth = 0;
        let callQuote = null;
        let callEscaped = false;
        for (const character of callText) {
          if (callQuote) {
            if (callEscaped) callEscaped = false;
            else if (character === '\\') callEscaped = true;
            else if (character === callQuote) callQuote = null;
            continue;
          }
          if (character === '"' || character === "'" || character === '`') callQuote = character;
          else if (character === '(') callDepth++;
          else if (character === ')') callDepth--;
        }
        if (callDepth > 0) return false;
      }

      // Props can be a shared variable rather than an inline object, e.g.
      //   var common = { viewBox: ..., 'aria-hidden': 'true' };
      //   return h('svg', common, ...)
      // Reading only the call site sees a bare identifier and reports a false
      // positive. Resolve the nearest preceding `var <name> = {...}` and check
      // that instead. 14 already-correct SVGs were flagged before this.
      const propsMatch = /(?:h|createElement)\(\s*['"]svg['"]\s*,\s*([A-Za-z_$][\w$]*)/.exec(line);
      if (propsMatch) {
        const varName = propsMatch[1];
        const decl = new RegExp('var\\s+' + varName + '\\s*=\\s*\\{');
        // Large render helpers can define one shared SVG root object before
        // several hundred lines of species/variant branches. Keep resolving
        // the exact identifier, but allow enough room to reach that declaration.
        for (let i = lineNum - 1; i >= 0 && i > lineNum - 800; i--) {
          if (!decl.test(lines[i])) continue;
          const objText = lines.slice(i, i + 12).join(' ');
          if (/aria-hidden|aria-label|role\s*:\s*['"]img['"]/.test(objText)) return false;
          break;
        }
      }
      return true;
    },
    fix: 'Add role="img" and aria-label describing the visualization.',
  },
  {
    id: 'INPUT-001',
    name: 'Input without programmatic label',
    wcag: '3.3.2 Labels or Instructions',
    severity: 'major',
    description: 'Input element lacks aria-label, aria-labelledby, or associated <label>',
    test(line, lineNum, lines) {
      const isInput = /h\(\s*['"](?:input|textarea|select)['"]/.test(line) ||
                      /createElement\(\s*['"](?:input|textarea|select)['"]/.test(line);
      if (!isInput) return false;
      // Read the element's whole props expression rather than a fixed window. These
      // controls routinely declare value/onChange/className/style before
      // reaching aria-label, and a 9-line peek reported plenty of properly
      // labelled inputs as bare. Match nested delimiters so a callback's `});`
      // cannot be mistaken for the end of the input, and stop before siblings.
      const context = rendererPropsContext(
        lines,
        lineNum,
        /(?:^|[^\w$])(?:h|createElement)\(\s*['"](?:input|textarea|select)['"]/
      );
      // Controls explicitly removed from the accessibility tree do not need an
      // accessible name. Keep visible file inputs in scope: only exempt file
      // choosers hidden behind a separately named trigger button.
      if (/type\s*[:=]\s*['"]hidden['"]/.test(context)) return false;
      const className = /className\s*[:=]\s*['"]([^'"]*)['"]/.exec(context);
      const isHiddenFileInput = /type\s*[:=]\s*['"]file['"]/.test(context) && (
        (className && className[1].split(/\s+/).includes('hidden')) ||
        /display\s*:\s*['"]none['"]/.test(context) ||
        /["']?aria-hidden["']?\s*[:=]\s*(?:true|['"]true['"])/.test(context) ||
        /(?:^|[,\s])hidden\s*[:=]\s*(?:true|['"]true['"])/.test(context)
      );
      if (isHiddenFileInput) return false;
      if (/aria-label/.test(context)) return false;
      if (/aria-labelledby/.test(context)) return false;
      if (/id\s*[:=]/.test(context)) return false; // might have htmlFor association
      // Check the lines above for a wrapping <label>. Six rather than two: a
      // hyperscript label wrapper usually opens with its own className/htmlFor
      // lines before the control it contains.
      const above = lines.slice(Math.max(0, lineNum - 7), lineNum).join(' ');
      if (/h\(\s*['"]label['"]/.test(above) || /createElement\(\s*['"]label['"]/.test(above)) return false;
      return true;
    },
    fix: 'Add aria-label with descriptive text, or wrap in <label> with htmlFor/id association.',
  },
  {
    id: 'TABS-001',
    name: 'Tab interface without ARIA tab roles',
    wcag: '4.1.2 Name, Role, Value',
    severity: 'major',
    description: 'Tab-like UI pattern without role="tablist", role="tab", aria-selected',
    testFile(content, filePath) {
      // Generic `tab` / `setTab` names are routinely used for page navigation,
      // toolbar modes, and source-data fields. Require an explicitly tab-shaped
      // state name so those non-tab controls are not reported as ARIA widgets.
      const hasTabPattern = /\b(?:activeTab|selectedTab|currentTab|onTabChange)\b/.test(content);
      if (!hasTabPattern) return false;
      // Check if proper ARIA is used
      // HTML held in a JavaScript string contains escaped quotes (`role=\"tablist\"`).
      const hasTabRole = /role\s*[:=]\s*\\?['"]tablist\\?['"]/.test(content);
      return !hasTabRole;
    },
    fix: 'Add role="tablist" to container, role="tab" + aria-selected to buttons, role="tabpanel" to content.',
  },
  {
    id: 'COLOR-001',
    name: 'Low contrast text color on dark background',
    wcag: '1.4.3 Contrast (Minimum)',
    severity: 'major',
    description: 'Text color fails 4.5:1 contrast ratio against its background',
    test(line) {
      // Check for known failing combinations
      // #64748b on #0f172a = ~3.2:1 FAIL
      // #64748b on #1e293b = ~2.2:1 FAIL
      // #94a3b8 on #1e293b = ~3.6:1 FAIL for normal text
      const hasMutedOnDark = /color\s*[:=]\s*['"]#(?:64748b|475569)['"]/.test(line) &&
                             /background\s*[:=]\s*['"]#(?:0f172a|1e293b|111827)['"]/.test(line);
      if (hasMutedOnDark) return true;
      // Also check for #94a3b8 on light backgrounds
      const hasMutedOnLight = /color\s*[:=]\s*['"]#94a3b8['"]/.test(line) &&
                              /background\s*[:=]\s*['"]#(?:fff|ffffff|f8fafc|f1f5f9)['"]/.test(line);
      return hasMutedOnLight;
    },
    fix: 'Use #cbd5e1 (slate-300) minimum on dark backgrounds, #64748b minimum on light backgrounds.',
  },
  {
    id: 'MOTION-001',
    name: 'animate-pulse without reduced-motion check',
    wcag: '2.3.1 Three Flashes',
    severity: 'major',
    description: 'CSS animation used without prefers-reduced-motion or useReducedMotion() gate',
    test(line, lineNum, lines) {
      const ungatedLine = line.replace(/motion-safe:animate-(?:pulse|bounce|spin)/g, '');
      if (!/animate-pulse|animate-bounce|animate-spin/.test(ungatedLine)) return false;
      // Check surrounding context for reduced motion check
      const context = lines.slice(Math.max(0, lineNum - 5), lineNum + 2).join(' ');
      if (/useReducedMotion|prefers-reduced-motion|reducedMotion|motion-reduce:animate-none/.test(context)) return false;
      return true;
    },
    fix: 'Gate animation behind useReducedMotion() or @media (prefers-reduced-motion: reduce).',
  },
  {
    id: 'EMOJI-001',
    name: 'Emoji-only button without aria-label',
    wcag: '1.1.1 Non-text Content',
    severity: 'major',
    description: 'Button whose visible content is only emoji/symbol without aria-label',
    test(line, lineNum, lines) {
      // Look for buttons that end with just an emoji
      const emojiButton = /h\(\s*['"]button['"]\s*,\s*\{[^}]*\}\s*,\s*['"][^\w\s]*['"]\s*\)/.test(line);
      if (!emojiButton) return false;
      const context = lines.slice(lineNum - 1, lineNum + 2).join(' ');
      if (/aria-label/.test(context)) return false;
      return true;
    },
    fix: 'Add aria-label describing the button action.',
  },
  {
    id: 'TIMER-001',
    name: 'Timer without pause mechanism',
    wcag: '2.2.1 Timing Adjustable',
    severity: 'critical',
    description: 'Countdown timer with no documented pause/extend capability',
    testFile(content, filePath) {
      // Date.now()/performance.now() are ubiquitous telemetry and animation
      // clocks. A high-confidence countdown needs an actual repeating timer as
      // well as explicit user-facing remaining-time state.
      const observesClock = /setInterval\s*\(/.test(content);
      // Generic `deadline` language also describes network timeouts, storage
      // handshakes, SMART goals, and calendar due dates. Those are not limits on
      // how long a user may interact with content.
      const hasUserTimeLimit = /\b(?:countdown|timeRemaining|remainingTime|timeLeft|secondsRemaining|remainingSeconds|timerActive|roundEndsAt)\b/i.test(content)
        || /\b\d+\s*(?:seconds?|minutes?)\s+(?:left|remaining)\b/i.test(content);
      if (!observesClock || !hasUserTimeLimit) return false;
      // WCAG 2.2.1 exempts timing that is essential to a standardized measure.
      // Require an explicit author marker so the exception is reviewable rather
      // than inferred from a vague word such as "quiz" or "probe".
      if (/data-a11y-essential-timing/i.test(content)) return false;
      // Check for a documented adjustment mechanism.
      // Turning an optional timer off is also a WCAG timing adjustment; cancellation labels are accepted alongside pause/extend controls.
      const hasAdjustment = /\b(?:pause|pauseTimer|isPaused|timerPaused|togglePause|pauseProbe|extendTimer|addTime|cancel[_\s-]?timer|stop[_\s-]?timer)\b/i.test(content);
      return !hasAdjustment;
    },
    fix: 'Add Pause/Resume button and teacher-configurable extended time option.',
  },
  {
    id: 'DIALOG-001',
    name: 'Modal overlay without dialog semantics',
    wcag: '4.1.2 Name/Role/Value, 2.4.3 Focus Order',
    severity: 'major',
    description: 'Fixed overlay div lacks role="dialog" or role="alertdialog", aria-modal, and focus trap',
    test(line, lineNum, lines) {
      if (/^\s*(?:\/\/|\/\*|\*)/.test(line)) return false;
      const isOverlay = /fixed\s+inset-0|position\s*:\s*['"]?fixed/.test(line) &&
                        /z-?\[?\d{3,}|z-50|z-\[999/.test(line);
      if (!isOverlay) return false;
      const context = lines.slice(Math.max(0, lineNum - 6), lineNum + 12).join(' ');
      if (/role\s*[:=]\s*['"](?:alert)?dialog['"]/.test(context) || /role\s*[:=][^,}]*\b(?:alert)?dialog\b/.test(context)) return false;
      // Backdrops and other visual layers can be fixed-position overlays without
      // being dialogs. Explicit presentation/hidden semantics are the author signal
      // that the layer is not an interactive modal surface.
      if (/role\s*[:=]\s*['"]presentation['"]/.test(context) ||
          /aria-hidden\s*[:=]\s*['"]true['"]/.test(context)) return false;
      // A full-screen application surface or loading/status boundary is not a
      // modal merely because it occupies the viewport. Accept an explicitly
      // named non-dialog role; unnamed generic overlays still require review.
      if (/role\s*[:=]\s*['"](?:status|region|main|application)['"]/.test(context) &&
          /['"]?aria-(?:label|labelledby|live)['"]?\s*[:=]/.test(context)) return false;
      return true;
    },
    fix: 'Add role="dialog" or role="alertdialog", aria-modal="true", aria-labelledby, focus trap, and Escape key handler.',
  },
  {
    id: 'DRAGDROP-001',
    name: 'Drag-and-drop without keyboard alternative',
    wcag: '2.1.1 Keyboard, 2.5.7 Dragging Movements',
    severity: 'major',
    description: 'Draggable interaction with no keyboard-based movement alternative',
    test(line, lineNum, lines) {
      // CSS selectors such as [draggable="true"] style touch targets; they do
      // not create a draggable interaction and should not trigger this rule.
      if (/\[\s*draggable\s*=/.test(line) && !/onDragStart|onMouseDown.*drag/i.test(line)) return false;
      if (!/draggable\s*[:=]\s*['"]?true|onDragStart|onMouseDown.*drag/i.test(line)) return false;
      // Start a few lines ABOVE the match: the trigger is a `draggable: true`
      // prop, but the element's tag sits on an earlier line, so a window
      // anchored at the prop never sees whether it is already a <button>.
      // logiclab:1555 was reported for exactly this reason.
      // +10 was far too tight. A keyboard alternative is routinely declared
      // later in the same element: Alt+Arrow handlers 23 lines down
      // (allohaven:17236), Move up/down buttons 36 lines down (allohaven:7507),
      // an onKeyDown 11 lines down (escape_room:1369). All three were reported
      // as defects while being perfectly operable.
      const localContext = lines.slice(Math.max(0, lineNum - 4), lineNum + 45).join(' ');
      const interactionContext = lines.slice(Math.max(0, lineNum - 30), lineNum + 45).join(' ');
      const surroundingContext = lines.slice(Math.max(0, lineNum - 130), lineNum + 45).join(' ');
      const context = lines.slice(lineNum - 1, lineNum + 120).join(' ');
      // A draggable native button with an onClick handler already provides the
      // same result through keyboard activation and a single tap/click.
      //
      // This asks WHICH ELEMENT THE PROP BELONGS TO, rather than whether a
      // button appears somewhere nearby. Two reasons it has to be that precise:
      //
      //   - Searching a window for `createElement("button"` missed the real
      //     thing. word_sounds writes the call across lines (`createElement(`
      //     then `"button",` on its own line), putting the tag 5 lines above
      //     `draggable` — outside the -4 reach — so four correctly-built native
      //     buttons were reported as drag-only for months.
      //   - Simply widening that reach would be worse than the bug. A Save
      //     button sitting a few lines above a drag-only div would then excuse
      //     it. Relaxing this check on a nearby-match heuristic is exactly what
      //     previously hid the Assessment Builder's drag-only reorder.
      //
      // The nearest tag opened at or above the prop is the element that owns it.
      const above = lines.slice(Math.max(0, lineNum - 14), lineNum + 1).join('\n');
      const tagMatches = [...above.matchAll(
        /(?:createElement|(?:^|[\s,(])(?:e|h))\(\s*['"]([a-zA-Z][\w-]*)['"]|<([a-zA-Z][\w-]*)[\s>]/g)];
      const lastTag = tagMatches.length ? tagMatches[tagMatches.length - 1] : null;
      const ownTag = lastTag ? (lastTag[1] || lastTag[2]) : null;
      // The draggable node can also sit INSIDE a native button:
      //   <button onClick={insert}><img draggable="true" /></button>
      // view_pdf_audit does exactly that — clicking inserts the image into the
      // first open slot, dragging aims it at a specific one. The own-tag test
      // alone sees `img` and misses the button wrapping it, so an unclosed
      // <button> above the prop counts too. A CLOSED one does not, which is what
      // keeps a Save button above a drag-only div from excusing it.
      const lastOpen = above.lastIndexOf('<button');
      const lastClose = above.lastIndexOf('</button>');
      const insideNativeButton = lastOpen !== -1 && lastOpen > lastClose;
      const nativeButtonClickAlternative =
        (ownTag === 'button' || ownTag === 'a' || insideNativeButton)
        && /onClick/.test(above + ' ' + localContext);
      if (nativeButtonClickAlternative) return false;
      // The ARIA button pattern is equivalent to a native <button>: focusable
      // via tabIndex, exposed as a button, and activated by Enter/Space. All
      // three are required together — role+tabIndex WITHOUT a key handler is a
      // focusable dead control, which is worse than a plain draggable, so this
      // must not credit two out of three.
      // Note the deliberate absence of an /Enter/ test. Handlers are routinely
      // delegated to a named function — onKeyDown: (e) => handleCountKeyDown(e, num)
      // — so requiring the literal string only credits inline handlers and
      // reports correct delegated ones as defects (word_sounds:15764 was).
      // A static pass can confirm the SHAPE of the pattern, not what the
      // handler does; verifying the key contract needs a runtime check.
      const ariaButtonAlternative =
        /tabIndex\s*[:=]/.test(localContext) &&
        /onKeyDown/.test(localContext);
      if (ariaButtonAlternative) return false;
      // Canvas/application interactions often declare their keyboard contract
      // immediately before the pointer-listener functions. Require all four
      // signals so a nearby, unrelated focusable element cannot excuse a drag.
      const applicationKeyboardAlternative =
        /(?:tabIndex\s*[:=]|\.tabIndex\s*=)/.test(interactionContext) &&
        /(?:role\s*[:=]\s*['"]application['"]|setAttribute\(\s*['"]role['"]\s*,\s*['"]application['"])/.test(interactionContext) &&
        /aria-keyshortcuts/.test(interactionContext);
      if (applicationKeyboardAlternative) return false;
      // 3-D viewports commonly place explicit rotate/tilt and zoom buttons
      // directly above the drag surface. Those single-pointer buttons also work
      // from the keyboard and satisfy the dragging-movement alternative.
      const viewControlAlternative =
        /onClick/.test(surroundingContext) &&
        /set[A-Za-z_$]*(?:Rotation|Scale)/.test(surroundingContext) &&
        /\b(?:rotate|tilt)\b/i.test(surroundingContext) &&
        /\bzoom\b/i.test(surroundingContext);
      if (viewControlAlternative) return false;
      // Reorder controls are sometimes descendants of a draggable group rather
      // than properties on the draggable node. Recognize only an explicit,
      // documented arrow-key shortcut wired through a keyboard handler.
      const documentedKeyboardReorder =
        /onKeyDown/.test(context) &&
        /aria-keyshortcuts/.test(context) &&
        /Arrow(?:Left|Right|Up|Down)/.test(context) &&
        /(?:move|reorder)/i.test(context);
      // A draggable row with explicit Move Up/Down (or reorder) buttons has a
      // keyboard-usable alternative even when the row itself is not key-draggable.
      // Matches hyperscript/createElement buttons too, not just JSX `<button`.
      // geologyexplorer builds its Select / "Place here" / Cancel controls with
      // h('button', ...) and was credited only by accident before, through a
      // loose scan for the word "button" anywhere nearby.
      //
      // The vocabulary test now uses word boundaries. Without them "Remove"
      // contains "move" and "dropdown" contains "down", so a row with a Remove
      // button and no reorder path at all counted as having one — which is
      // precisely the Assessment Builder defect this check failed to report.
      // \bmove\b does not match "Remove" or the `moved` local in a splice.
      const buttonMoveAlternative =
        (/<button\b/.test(context)
          || /(?:createElement|(?:^|[\s,(])(?:e|h))\(\s*['"]button['"]/.test(context))
        && /onClick/.test(context)
        && /\b(?:move|reorder|swap)\b/i.test(context);
      // A draggable list item may contain its own lift/move/drop button. The
      // pressed state plus click and key handlers identify that control much
      // more precisely than merely finding any button nearby.
      const nestedLiftControl =
        /<button\b/.test(context) &&
        /aria-pressed/.test(context) &&
        /onKeyDown/.test(context) &&
        /onClick/.test(context) &&
        /\b(?:lift|move|reorder|position)\b/i.test(context);
      if (documentedKeyboardReorder || buttonMoveAlternative || nestedLiftControl || /keyboard/i.test(localContext)) return false;
      return true;
    },
    fix: 'Provide button-based alternative (Move Up/Down) or arrow key handlers for keyboard users.',
  },
  {
    id: 'SCOPE-001',
    name: 'Table header without scope attribute',
    wcag: '1.3.1 Info and Relationships',
    severity: 'minor',
    description: 'Table <th> element lacks scope="col" or scope="row"',
    test(line, lineNum, lines) {
      const isTh = /h\(\s*['"]th['"]/.test(line) || /createElement\(\s*['"]th['"]/.test(line);
      if (!isTh) return false;
      const context = rendererPropsContext(
        lines,
        lineNum,
        /(?:^|[^\w$])(?:h|createElement)\(\s*['"]th['"]/
      );
      if (/\bscope\s*[:=]/.test(context) || /setAttribute\(\s*['"]scope['"]/.test(context)) return false;

      // Row-header builders often compose a shared props object, assign scope
      // inside the same branch, then pass the identifier to h('th', props, ...).
      // Resolve only a nearby direct assignment so an unrelated or later scope
      // mutation cannot suppress a genuine finding.
      const propsMatch = /(?:h|createElement)\(\s*['"]th['"]\s*,\s*([A-Za-z_$][\w$]*)/.exec(line);
      if (propsMatch) {
        const propsName = propsMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const prior = lines.slice(Math.max(0, lineNum - 6), lineNum - 1).join(' ');
        const assignedScope = new RegExp(
          "\\b" + propsName + "(?:\\.scope|\\[\\s*['\"]scope['\"]\\s*\\])\\s*="
        );
        if (assignedScope.test(prior)) return false;
      }
      return true;
    },
    fix: 'Add scope="col" to column headers, scope="row" to row headers.',
  },
];

// ── File Discovery ─────────────────────────────────────────────────────────

function discoverFiles(singleFile) {
  if (singleFile) {
    const abs = path.resolve(singleFile);
    if (fs.existsSync(abs)) return [abs];
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const files = [];
  for (const dir of SCAN_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const entry of fs.readdirSync(absDir)) {
      const full = path.join(absDir, entry);
      if (!fs.statSync(full).isFile()) continue;
      const isExplicitRootFile = dir === '' && EXPLICIT_ROOT_FILES.has(entry);
      if (!isExplicitRootFile && !SCAN_EXTENSIONS.some(ext => entry.endsWith(ext))) continue;
      if (SKIP_PATTERNS.some(pat => pat.test(full))) continue;
      // Prefer authored JSX sources over generated root module counterparts.
      // Module-only files remain in scope.
      if (dir === '' && /_module\.js$/.test(entry)) {
        const sourcePeer = path.join(absDir, entry.replace(/_module\.js$/, '_source.jsx'));
        if (fs.existsSync(sourcePeer)) continue;
      }
      files.push(full);
    }
  }
  return files;
}

// ── Scanner ────────────────────────────────────────────────────────────────

function scanFile(filePath) {
  // This repo is a shared worktree: other agents create and delete temp files
  // (e.g. _tmp_*_entry.<pid>.jsx) while a scan is walking the tree, so a path
  // collected during the listing can be gone by the time we read it. A whole
  // 474-file audit dying on one vanished scratch file is not a useful failure.
  let content;
  try {
    content = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' });
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'EBUSY' || e.code === 'EPERM')) {
      console.log(`  Skipping ${path.relative(ROOT, filePath)} (${e.code}: vanished or locked mid-scan)`);
      return [];
    }
    throw e;
  }
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(ROOT, filePath);
  const findings = [];

  // Line-level checks
  for (const check of CHECKS) {
    if (!check.test) continue;
    for (let i = 0; i < lines.length; i++) {
      try {
        if (check.test(lines[i], i + 1, lines)) {
          findings.push({
            file: relPath,
            line: i + 1,
            checkId: check.id,
            name: check.name,
            wcag: check.wcag,
            severity: check.severity,
            snippet: lines[i].trim().substring(0, 120),
            fix: check.fix,
          });
        }
      } catch (e) {
        // Skip lines that cause regex issues
      }
    }
  }

  // File-level checks
  for (const check of CHECKS) {
    if (!check.testFile) continue;
    try {
      if (check.testFile(content, relPath)) {
        findings.push({
          file: relPath,
          line: null,
          checkId: check.id,
          name: check.name,
          wcag: check.wcag,
          severity: check.severity,
          snippet: '(file-level check)',
          fix: check.fix,
        });
      }
    } catch (e) {
      // Skip
    }
  }

  return findings;
}

// ── Global CSS baselines ───────────────────────────────────────────────────

/*
 * The app ships two UNCONDITIONAL global rules inside AlloFlowANTI.txt's main
 * <style> block: a universal `prefers-reduced-motion: reduce` reset and a
 * global `:focus-visible` ring, both using !important. Anything rendered
 * inside the app document — every view_* source, every CDN stem_lab tool,
 * every module — inherits them. Per-site `motion-reduce:` utilities and
 * per-component focus styles are therefore belt-and-braces, not requirements.
 *
 * The line-by-line checks cannot see those rules, so they flag every
 * `animate-pulse` and every `outline: none` as a defect. That was ~174 of 610
 * findings, including 50 of the 153 "critical" ones — noise that buries the
 * findings a user would actually hit. Findings are still reported, but marked
 * covered and excluded from the actionable counts.
 *
 * Verified 2026-08-10: the reduced-motion block and the focus-visible ring are
 * both present and neither sits behind a conditional.
 */
const GLOBAL_BASELINES = {
  'MOTION-001': /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/,
  'FOCUS-001': /:focus-visible[^{]*\{[^}]*outline:/,
};

// Files NOT rendered inside the app document, so the global rules never reach
// them. These keep their original severity.
const OUTSIDE_APP_DOCUMENT = [
  /blockly_runtime\.bundle\.js$/,   // vendor bundle, ships its own shadow DOM
  /_codex_[^\\/]*probe[^\\/]*\.js$/, // dev probe scripts, not shipped UI
];

function detectGlobalBaselines() {
  const present = {};
  let source = '';
  try {
    source = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  } catch (_) {
    return present; // cannot read the canonical source: assume nothing is covered
  }
  for (const [checkId, pattern] of Object.entries(GLOBAL_BASELINES)) {
    if (pattern.test(source)) present[checkId] = true;
  }
  return present;
}

/*
 * Detached nodes built with document.createElement() and never appended to the
 * document — offscreen canvases used as WebGL textures or image buffers, and
 * the hidden textarea/input helpers behind clipboard copy and file pickers.
 * They never enter the accessibility tree, so a text alternative or a label is
 * not merely unnecessary, it is impossible.
 *
 * Verified 2026-08-10 by hand across CANVAS-001: 79 of its 94 findings were
 * this pattern (sunCanvas/cloudCanvas texture buffers, PDF-pipeline scratch
 * canvases). Of the 15 genuinely rendered canvases, 13 already carried
 * role="img" or role="application" with live aria-labels and one was
 * deliberately aria-hidden, leaving 2 real defects.
 */
const DETACHED_NODE_CHECKS = new Set(['CANVAS-001', 'INPUT-001']);
const DETACHED_NODE_PATTERN = /createElement\(\s*['"](?:canvas|input|textarea)['"]/;

const CREATED_NODE_DECLARATION = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.createElement\(\s*['"](?:canvas|input|textarea)['"]/;

/**
 * Treat a programmatic node as detached only when bounded local data flow shows
 * no DOM insertion, return, focus/removal, or portal escape.
 */
function createdNodeHasNoLocalTreeEscape(finding) {
  if (!finding.line) return false;
  let source;
  try { source = fs.readFileSync(path.resolve(ROOT, finding.file), 'utf8'); } catch (_) { return false; }

  const lines = source.split(/\r?\n/);
  const declaration = CREATED_NODE_DECLARATION.exec(lines[finding.line - 1] || '');
  if (!declaration) return false;

  const identifier = declaration[1].replace(/\$/g, '\\$');
  const reference = '(?<![A-Za-z0-9_$])' + identifier + '(?![A-Za-z0-9_$])';
  const local = lines.slice(Math.max(0, finding.line - 21), Math.min(lines.length, finding.line + 400)).join('\n');

  const treeEscapes = [
    new RegExp('(?:appendChild|insertBefore|replaceChildren|\\.append|\\.prepend)\\s*\\([^\\n;]*' + reference),
    new RegExp('\\breturn\\s+' + reference),
    new RegExp(reference + '\\.(?:after|before|focus|remove|replaceWith)\\s*\\('),
    new RegExp('(?:createPortal|replaceWith)\\s*\\([^\\n;]*' + reference),
  ];
  return !treeEscapes.some((pattern) => pattern.test(local));
}

function applyGlobalBaselineCoverage(findings) {
  const present = detectGlobalBaselines();
  for (const f of findings) {
    if (DETACHED_NODE_CHECKS.has(f.checkId) && DETACHED_NODE_PATTERN.test(f.snippet || '')) {
      if (createdNodeHasNoLocalTreeEscape(f)) f.notInAccessibilityTree = true;
      continue;
    }
    if (!present[f.checkId]) continue;
    if (OUTSIDE_APP_DOCUMENT.some((re) => re.test(f.file))) continue;
    f.coveredByGlobalBaseline = true;
  }
  return findings;
}

// ── Report Generation ──────────────────────────────────────────────────────

function generateReport(allFindings, outputJson, filesScanned) {
  applyGlobalBaselineCoverage(allFindings);
  const covered = allFindings.filter((f) => f.coveredByGlobalBaseline || f.notInAccessibilityTree);
  const actionable = allFindings.filter((f) => !f.coveredByGlobalBaseline && !f.notInAccessibilityTree);
  const bySeverity = { critical: [], major: [], minor: [] };
  const byCheck = {};
  const byFile = {};

  for (const f of allFindings) {
    // Severity totals count only what a user could actually encounter; the
    // covered findings stay visible in byCheck and in the JSON.
    if (!f.coveredByGlobalBaseline && !f.notInAccessibilityTree) bySeverity[f.severity].push(f);
    byCheck[f.checkId] = byCheck[f.checkId] || [];
    byCheck[f.checkId].push(f);
    byFile[f.file] = byFile[f.file] || [];
    byFile[f.file].push(f);
  }

  if (outputJson) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: allFindings.length,
        actionable: actionable.length,
        coveredByGlobalBaseline: allFindings.filter(f => f.coveredByGlobalBaseline).length,
        notInAccessibilityTree: allFindings.filter(f => f.notInAccessibilityTree).length,
        critical: bySeverity.critical.length,
        major: bySeverity.major.length,
        minor: bySeverity.minor.length,
        filesScanned,
        checksRun: CHECKS.length,
      },
      byCheck: Object.entries(byCheck).map(([id, findings]) => ({
        checkId: id,
        name: findings[0].name,
        wcag: findings[0].wcag,
        severity: findings[0].severity,
        count: findings.length,
        actionable: findings.filter(f => !f.coveredByGlobalBaseline && !f.notInAccessibilityTree).length,
        coveredByGlobalBaseline: findings.filter(f => f.coveredByGlobalBaseline).length,
        notInAccessibilityTree: findings.filter(f => f.notInAccessibilityTree).length,
        files: [...new Set(findings.map(f => f.file))],
      })),
      findings: allFindings,
    };
    const outPath = path.join(__dirname, 'audit-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report written to: ${outPath}`);
    return;
  }

  // Console report
  console.log('\n' + '='.repeat(72));
  console.log(`  ALLOFLOW ${STANDARD} STATIC AUDIT REPORT`);
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(72));

  console.log(`\n  Files scanned:  ${filesScanned}`);
  console.log(`  Checks run:     ${CHECKS.length}`);
  console.log(`  Total findings: ${allFindings.length}`);
  if (covered.length) {
    console.log(`    Not actionable (global CSS baseline, or detached node never in the a11y tree): ${covered.length}`);
    console.log(`  Actionable:     ${actionable.length}`);
  }
  console.log(`    Critical:     ${bySeverity.critical.length}`);
  console.log(`    Major:        ${bySeverity.major.length}`);
  console.log(`    Minor:        ${bySeverity.minor.length}`);

  // Scorecard by check
  console.log('\n' + '-'.repeat(72));
  console.log('  FINDINGS BY CHECK');
  console.log('-'.repeat(72));

  const sortedChecks = Object.entries(byCheck).sort((a, b) => {
    const sevOrder = { critical: 0, major: 1, minor: 2 };
    return (sevOrder[a[1][0].severity] - sevOrder[b[1][0].severity]) || (b[1].length - a[1].length);
  });

  for (const [id, findings] of sortedChecks) {
    const sev = findings[0].severity.toUpperCase();
    const files = [...new Set(findings.map(f => f.file))];
    console.log(`\n  [${sev}] ${id}: ${findings[0].name}`);
    console.log(`  WCAG: ${findings[0].wcag}`);
    // Report the two exemptions separately. Collapsing them reads as "CSS
    // already handles this", which is false for checks like TIMER-001 where the
    // exempt instances are detached nodes, not anything a stylesheet covers.
    const baselineHere = findings.filter(f => f.coveredByGlobalBaseline).length;
    const detachedHere = findings.filter(f => !f.coveredByGlobalBaseline && f.notInAccessibilityTree).length;
    const reasons = [];
    if (baselineHere) reasons.push(`${baselineHere} covered by a global CSS baseline`);
    if (detachedHere) reasons.push(`${detachedHere} never in the accessibility tree`);
    console.log(`  Instances: ${findings.length} across ${files.length} file(s)`
      + (reasons.length ? ` — ${reasons.join(', ')}, ${findings.length - baselineHere - detachedHere} actionable` : ''));
    console.log(`  Fix: ${findings[0].fix}`);
    // Show up to 5 example locations
    const examples = findings.slice().sort((a, b) => {
      const aCovered = !!(a.coveredByGlobalBaseline || a.notInAccessibilityTree);
      const bCovered = !!(b.coveredByGlobalBaseline || b.notInAccessibilityTree);
      return Number(aCovered) - Number(bCovered);
    }).slice(0, 5);
    for (const ex of examples) {
      const loc = ex.line ? `${ex.file}:${ex.line}` : ex.file;
      console.log(`    - ${loc}`);
      if (ex.snippet !== '(file-level check)') {
        console.log(`      ${ex.snippet}`);
      }
    }
    if (findings.length > 5) {
      console.log(`    ... and ${findings.length - 5} more`);
    }
  }

  // Scorecard by file
  console.log('\n' + '-'.repeat(72));
  console.log('  SCORECARD BY FILE');
  console.log('-'.repeat(72));

  const sortedFiles = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);
  for (const [file, findings] of sortedFiles) {
    const crit = findings.filter(f => f.severity === 'critical').length;
    const maj = findings.filter(f => f.severity === 'major').length;
    const min = findings.filter(f => f.severity === 'minor').length;
    const bar = 'X'.repeat(Math.min(50, findings.length));
    console.log(`  ${file}`);
    console.log(`    ${bar} ${findings.length} (C:${crit} M:${maj} m:${min})`);
  }

  // Heuristic signal only. Static pattern counts cannot determine WCAG
  // conformance and should never be converted into a compliance percentage.
  console.log('\n' + '-'.repeat(72));
  if (allFindings.length === 0) console.log('  Result: NO HEURISTIC FINDINGS');
  else console.log(`  Result: ${allFindings.length} HEURISTIC FINDING(S) REQUIRE TRIAGE`);
  console.log('  This source scan does not determine WCAG conformance. Confirm findings');
  console.log('  in rendered UI and complete manual assistive-technology testing.');
  console.log('='.repeat(72) + '\n');
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const gate = args.includes('--gate');
  const fileIdx = args.indexOf('--file');
  const singleFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

  console.log(`AlloFlow ${STANDARD} Static Audit`);
  console.log('Scanning source files for accessibility anti-patterns...\n');

  const files = discoverFiles(singleFile);
  console.log(`Found ${files.length} files to scan.`);

  const allFindings = [];
  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    process.stdout.write(`  Scanning ${relPath}...`);
    const findings = scanFile(file);
    allFindings.push(...findings);
    const label = findings.length === 0 ? ' OK' : ` ${findings.length} findings`;
    console.log(label);
  }

  generateReport(allFindings, outputJson, files.length);
  if (gate && allFindings.length > 0) process.exitCode = 1;
}

main();
