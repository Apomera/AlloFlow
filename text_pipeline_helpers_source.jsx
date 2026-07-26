// text_pipeline_helpers_source.jsx — pure text/citation/source helpers + DOM_TO_TOOL_ID_MAP
// Extracted from AlloFlowANTI.txt 2026-04-24 (Phase C of CDN modularization).
// All functions are pure (no React state-setter calls, no closure captures of
// component state). DOM_TO_TOOL_ID_MAP is a static lookup that was previously
// re-created on every React render — exporting it as module data fixes that perf bug.
//
// Note: generateBibliographyString depends on filterEducationalSources (within-module).

const generateBilingualText = async (basePrompt, targetLang, callGeminiFn) => {
    const stripFences = (s) => String(s || "")
        .replace(/^```[a-zA-Z]*\n/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
    // Explicit URL preservation rules — Gemini has a persistent quirk where it inserts spaces
    // into URLs (treating `.com` as a sentence boundary) and occasionally drops trailing chars
    // on the last citation when the input text is wrapped in surrounding quotes.
    const urlPreservationRules = `
URL PRESERVATION (CRITICAL — applies to every citation link [⁽N⁾](url)):
- Reproduce every URL character-for-character from the source. No changes of any kind.
- Do NOT insert spaces inside URLs (e.g. never "webmd. com" — it must stay "webmd.com").
- Do NOT drop the "https://" or "http://" prefix.
- Do NOT truncate URLs. Every citation link must have its closing ")" on the same line as its opening "(".
- The opening superscript "⁽" and closing "⁾" on the citation number must both be preserved.
`.trim();
    if (!targetLang || targetLang === 'English') {
        const raw = await callGeminiFn(basePrompt + '\n\n' + urlPreservationRules);
        return stripFences(raw);
    }
    const targetPrompt = `${basePrompt}\n\n${urlPreservationRules}\n\nCRITICAL: Return ONLY the ${targetLang} text. Do NOT provide an English translation yet.`;
    const targetResult = stripFences(await callGeminiFn(targetPrompt));
    // Use triple-pipe fences instead of "..." wrapping so trailing ")" on the last citation
    // doesn't butt up against a closing quote (which Gemini sometimes eats).
    const translationPrompt = `
Translate the ${targetLang} text between the fences into English.
Maintain the formatting, tone, emojis, and citation markers exactly.

${urlPreservationRules}

Return ONLY the English translation — no preamble, no fences in your output.

|||BEGIN ${targetLang.toUpperCase()}|||
${targetResult}
|||END ${targetLang.toUpperCase()}|||
    `;
    const englishResult = stripFences(await callGeminiFn(translationPrompt));
    return `${targetResult}\n\n--- ENGLISH TRANSLATION ---\n\n${englishResult}`;
};

const extractSourceTextForProcessing = (text, preferEnglish = true) => {
    if (!text) return { text: '', isBilingual: false, targetLangBlock: '', englishBlock: '' };
    const delimiter = '--- ENGLISH TRANSLATION ---';
    const idx = text.indexOf(delimiter);
    if (idx === -1) {
        // Not bilingual — return as-is
        return { text: text, isBilingual: false, targetLangBlock: text, englishBlock: text };
    }
    const targetLangBlock = text.substring(0, idx).trim();
    const englishBlock = text.substring(idx + delimiter.length).trim();
    return {
        text: preferEnglish ? englishBlock : targetLangBlock,
        isBilingual: true,
        targetLangBlock: targetLangBlock,
        englishBlock: englishBlock
    };
};

const scrambleWord = (word) => {
  if (!word || word.length < 2) return word;
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join('');
  if (result === word) {
      return scrambleWord(word);
  }
  return result;
};

const toSuperscript = (num) => {
    const map = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    };
    return num.toString().split('').map(d => map[d] || d).join('');
};

const fixCitationPlacement = (text) => {
    if (!text) return text;
    let fixed = text;
    fixed = fixed.replace(/(^|\n)(#{1,6})([^\s#])/gm, '$1$2 $3');
    fixed = fixed.replace(/(\s*(?:\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\)\s*,?\s*)+)([.!?])/g, '$2$1');
    fixed = fixed.replace(/(\s*(?:\[\d+\]\s*,?\s*)+)([.!?])/g, '$2$1');
    return fixed;
};

const processMathHTML = (text) => {
    if (text == null || text === '') return '';
    // XSS guard: escape HTML special chars from raw input BEFORE transforming.
    // Output below produces trusted <span> wrappers around regex captures
    // ($1, $2). Without pre-escaping, `\text{<script>alert(1)</script>}` would
    // execute since the call site uses dangerouslySetInnerHTML.
    // Math notation doesn't legitimately contain raw <, >, or & — LaTeX uses
    // \lt, \gt, \amp etc. — so escaping breaks only attacker input, not real math.
    let content = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    content = content.replace(/^\$\$/, '').replace(/\$\$$/, '');
    content = content.replace(/^\$/, '').replace(/\$$/, '');
    content = content.replace(/^\\\(/, '').replace(/\\\)$/, '');
    content = content.replace(/^\\\[/, '').replace(/\\\]$/, '');
    content = content.replace(/\\left\s*([(\[{|.])/g, '$1');
    content = content.replace(/\\right\s*([)\]}|.])/g, '$1');
    content = content.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, body) => {
        const rows = body.split(/\\\\\s*/).filter(r => r.trim());
        const rendered = rows.map(row => {
            const parts = row.split('&').map(p => p.trim());
            return `<span style="display:flex;gap:1em;"><span>${parts[0] || ''}</span>${parts[1] ? `<span>${parts[1]}</span>` : ''}</span>`;
        }).join('');
        return `<span style="display:inline-flex;flex-direction:column;border-left:2px solid currentColor;padding-left:6px;align-items:flex-start;gap:2px;vertical-align:middle;">${rendered}</span>`;
    });
    content = content.replace(/\\begin\{(aligned|align)\}([\s\S]*?)\\end\{\1\}/g, (_, _env, body) => {
        const rows = body.split(/\\\\\s*/).filter(r => r.trim());
        const rendered = rows.map(row => {
            const parts = row.split('&').map(p => p.trim());
            return `<span style="display:flex;gap:4px;justify-content:center;">${parts.map(p => `<span>${p}</span>`).join('')}</span>`;
        }).join('');
        return `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;vertical-align:middle;">${rendered}</span>`;
    });
    content = content.replace(/\\(?:text|textit|textrm|mathrm|operatorname)\{([^}]+)\}/g, '<span class="font-sans" style="font-style:normal;">$1</span>');
    content = content.replace(/\\(?:textbf|mathbf)\{([^}]+)\}/g, '<span class="font-sans" style="font-weight:bold;font-style:normal;">$1</span>');
    content = content.replace(/\\(?:mathit)\{([^}]+)\}/g, '<span style="font-style:italic;">$1</span>');
    content = content.replace(/\\(?:mathbb)\{([^}]+)\}/g, (_, ch) => {
        const bbMap = { 'R': 'ℝ', 'N': 'ℕ', 'Z': 'ℤ', 'Q': 'ℚ', 'C': 'ℂ', 'P': 'ℙ' };
        return ch.split('').map(c => bbMap[c] || c).join('');
    });
    content = content.replace(/\\(newline|\\)/g, '<br/>');
    content = content.replace(/\\overline\{([^}]+)\}/g, '<span style="text-decoration:overline;">$1</span>');
    content = content.replace(/\\underline\{([^}]+)\}/g, '<span style="text-decoration:underline;">$1</span>');
    content = content.replace(/\\hat\{([^}]+)\}/g, '$1̂');
    content = content.replace(/\\bar\{([^}]+)\}/g, '$1̄');
    content = content.replace(/\\vec\{([^}]+)\}/g, '$1⃗');
    content = content.replace(/\\dot\{([^}]+)\}/g, '$1̇');
    content = content.replace(/\\ddot\{([^}]+)\}/g, '$1̈');
    content = content.replace(/\\tilde\{([^}]+)\}/g, '$1̃');
    content = content.replace(/\\cancel\{([^}]+)\}/g, '<span style="text-decoration:line-through;">$1</span>');
    content = content.replace(/\\boxed\{([^}]+)\}/g, '<span style="border:1px solid currentColor;padding:2px 6px;border-radius:3px;">$1</span>');
    content = content.replace(/\\binom\s*\{([^}]+)\}\s*\{([^}]+)\}/g,
        '<span style="display:inline-flex;align-items:center;vertical-align:middle;"><span style="font-size:1.4em;">(</span><span class="inline-flex flex-col text-center mx-0.5" style="vertical-align:-0.3em;line-height:1.2;"><span style="font-size:0.85em;">$1</span><span style="font-size:0.85em;">$2</span></span><span style="font-size:1.4em;">)</span></span>'
    );
    content = content.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '<sup style="font-size:0.65em;vertical-align:super;">$1</sup>&radic;<span style="text-decoration:overline;">$2</span>');
    content = content.replace(/\\sqrt\{([^}]+)\}/g, '&radic;<span style="text-decoration:overline;">$1</span>');
    content = content.replace(/\\frac\s*\{([^}]+)\}\s*,?\s*\{([^}]+)\}/g,
        '<span class="math-fraction inline-flex flex-col text-center align-middle mx-1" style="vertical-align:-0.4em;"><span class="border-b border-current px-1 text-[0.9em]">$1</span><span class="text-[0.9em]">$2</span></span>'
    );
    content = content.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    content = content.replace(/\^([0-9a-zA-Z+\-])/g, '<sup>$1</sup>');
    content = content.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    content = content.replace(/_([0-9a-zA-Z])/g, '<sub>$1</sub>');
    content = content.replace(/\\(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|lim|min|max|sup|inf|det|dim|deg|gcd|lcm|arg|ker|Pr|hom|mod)(?![a-zA-Z])/g,
        '<span class="font-sans" style="font-style:normal;margin:0 1px;">$1</span>'
    );
    const symbolMap = {
        'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε', 'varepsilon': 'ε',
        'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'vartheta': 'ϑ', 'iota': 'ι', 'kappa': 'κ',
        'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'omicron': 'ο', 'pi': 'π', 'varpi': 'ϖ',
        'rho': 'ρ', 'varrho': 'ϱ', 'sigma': 'σ', 'varsigma': 'ς', 'tau': 'τ', 'upsilon': 'υ',
        'phi': 'φ', 'varphi': 'ϕ', 'chi': 'χ', 'psi': 'ψ', 'omega': 'ω',
        'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ', 'Xi': 'Ξ', 'Pi': 'Π',
        'Sigma': 'Σ', 'Upsilon': 'Υ', 'Phi': 'Φ', 'Psi': 'Ψ', 'Omega': 'Ω',
        'rightarrow': '→', 'to': '→', 'leftarrow': '←', 'leftrightarrow': '↔',
        'Rightarrow': '⇒', 'Leftarrow': '⇐', 'Leftrightarrow': '⇔',
        'longrightarrow': '⟶', 'longleftarrow': '⟵', 'longLeftrightarrow': '⟺',
        'uparrow': '↑', 'downarrow': '↓', 'updownarrow': '↕',
        'Uparrow': '⇑', 'Downarrow': '⇓',
        'mapsto': '↦', 'longmapsto': '⟼', 'hookrightarrow': '↪', 'hookleftarrow': '↩',
        'nearrow': '↗', 'searrow': '↘', 'nwarrow': '↖', 'swarrow': '↙',
        'leq': '≤', 'le': '≤', 'geq': '≥', 'ge': '≥', 'neq': '≠', 'ne': '≠',
        'approx': '≈', 'equiv': '≡', 'cong': '≅', 'sim': '∼', 'simeq': '≃',
        'propto': '∝', 'prec': '≺', 'succ': '≻', 'preceq': '⪯', 'succeq': '⪰',
        'll': '≪', 'gg': '≫',
        'in': '∈', 'notin': '∉', 'ni': '∋', 'subset': '⊂', 'supset': '⊃',
        'subseteq': '⊆', 'supseteq': '⊇', 'cup': '∪', 'cap': '∩',
        'setminus': '∖', 'emptyset': '∅', 'varnothing': '∅',
        'forall': '∀', 'exists': '∃', 'nexists': '∄',
        'neg': '¬', 'lnot': '¬', 'land': '∧', 'lor': '∨', 'wedge': '∧', 'vee': '∨',
        'vdash': '⊢', 'dashv': '⊣', 'models': '⊨',
        'times': '×', 'div': '÷', 'cdot': '⋅', 'pm': '±', 'mp': '∓',
        'ast': '∗', 'star': '⋆', 'circ': '∘', 'bullet': '•',
        'oplus': '⊕', 'ominus': '⊖', 'otimes': '⊗', 'odot': '⊙', 'oslash': '⊘',
        'sum': '∑', 'prod': '∏', 'coprod': '∐', 'int': '∫', 'iint': '∬', 'iiint': '∭',
        'oint': '∮', 'bigcup': '⋃', 'bigcap': '⋂', 'bigoplus': '⨁', 'bigotimes': '⨂',
        'bigvee': '⋁', 'bigwedge': '⋀',
        'infty': '∞', 'partial': '∂', 'nabla': '∇',
        'angle': '∠', 'measuredangle': '∡', 'triangle': '△',
        'perp': '⊥', 'parallel': '∥', 'nparallel': '∦',
        'therefore': '∴', 'because': '∵',
        'ldots': '…', 'cdots': '⋯', 'vdots': '⋮', 'ddots': '⋱', 'dots': '…',
        'prime': '′', 'degree': '°',
        'ell': 'ℓ', 'wp': '℘', 'Re': 'ℜ', 'Im': 'ℑ', 'aleph': 'ℵ', 'hbar': 'ℏ',
        'quad': '  ', 'qquad': '    ', 'enspace': ' ',
        'langle': '⟨', 'rangle': '⟩', 'lceil': '⌈', 'rceil': '⌉', 'lfloor': '⌊', 'rfloor': '⌋',
        'checkmark': '✓', 'dagger': '†', 'ddagger': '‡', 'S': '§',
    };
    const sortedKeys = Object.keys(symbolMap).sort((a, b) => b.length - a.length);
    sortedKeys.forEach(cmd => {
        const regex = new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g');
        content = content.replace(regex, symbolMap[cmd]);
    });
    content = content.replace(/\\,/g, '<span style="margin-left:3px;"></span>');
    content = content.replace(/\\;/g, '<span style="margin-left:5px;"></span>');
    content = content.replace(/\\!/g, '');
    content = content.replace(/\\ /g, ' ');
    content = content.replace(/\\&/g, '&amp;');
    return content;
};

const sanitizeTruncatedCitations = (text) => {
    if (!text) return text;
    // REPAIR RULES first (preferred — fix the content). STRIP RULES last (only after repair fails).
    // Rule R1: Normalize whitespace INSIDE citation URLs. Gemini quirk: inserts spaces at URL dots
    //   like "webmd. com/articles/284378". Strip any whitespace between "(" and the closing ")".
    //   Requires a closing ")" to be present so we don't over-reach on truncated ones.
    text = text.replace(/(\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\()([^)]+)(\))/g, (match, open, url, close) => {
        return open + url.replace(/\s+/g, '') + close;
    });
    // Rule R2: Also normalize whitespace in bibliography list links: "1. [Title](broken url)".
    //   Only the URL portion has whitespace stripped — the title is left alone.
    text = text.replace(/(\d+\.\s*\[[^\]]+\]\()([^)]+)(\))/g, (match, open, url, close) => {
        if (!/^https?:\/\//.test(url.trim()) && !url.includes(' ')) return match;
        return open + url.replace(/\s+/g, '') + close;
    });
    // Rule R3: Restore missing "https://" prefix on citation URLs (Gemini sometimes drops protocol).
    //   Heuristic: if URL inside a citation link starts with a hostname-looking token, prepend https://.
    text = text.replace(/(\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\()(?!https?:\/\/|mailto:|#|\/)([a-z0-9][a-z0-9\-.]+\.[a-z]{2,}[^)]*)(\))/gi, '$1https://$2$3');
    // Rule R4: Restore missing ⁽ in otherwise-complete citations: [N⁾](url) → [⁽N⁾](url)
    text = text.replace(/\[([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾\]\(([^)]+)\)/g, '[⁽$1⁾]($2)');
    // Rule R5: Add missing closing ")" before whitespace: [⁽¹⁾](url  → [⁽¹⁾](url)
    text = text.replace(/(\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(https?:\/\/[^\s)]+)(\s)/g, '$1)$2');
    // STRIP RULES — only for things that couldn't be repaired:
    // Rule S1: Remove truncated citation link at end of line (no closing paren found): [⁽¹⁴⁾](https://partial.url
    // Char-class is [^)\n] (not [^)\s\n]) so trailing whitespace before the newline is also
    // consumed. Gemini sometimes emits "...sleepfoundation.  \n" — the old regex stopped at
    // the whitespace and then $ wouldn't match, leaving the truncated URL visible.
    text = text.replace(/\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)\n]*$/gm, '');
    // Rule S2: Same at end of entire text.
    text = text.replace(/\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]{0,200}$/, '');
    // Rule S3: Remove orphan superscript citations at end of line with no []() wrapper.
    text = text.replace(/\s*\[?⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?\s*$/gm, (match, offset) => {
        const before = text.substring(Math.max(0, offset - 5), offset);
        if (before.includes('](')) return match;
        return '';
    });
    // Rule S4: Remove stray lone # (orphaned heading markers from truncation).
    text = text.replace(/\n\s*#\s*$/gm, '');
    text = text.replace(/\n\s*#\s*\n/g, '\n');
    return text;
};

const _SUPERSCRIPT_TO_DIGIT = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

// Markdown destinations may contain balanced parentheses and escaped
// delimiters. Regexes such as `[^)]+` silently truncate those URLs, so all
// citation/reference parsing shares this small balanced scanner.
const _readBalancedSpan = (text, start, openChar, closeChar) => {
    if (typeof text !== 'string' || text[start] !== openChar) return null;
    let depth = 0;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            continue;
        }
        if (char === openChar) depth++;
        else if (char === closeChar) {
            depth--;
            if (depth === 0) return { start, end: i + 1, content: text.slice(start + 1, i) };
        }
    }
    return null;
};

const _readCitationAt = (text, start) => {
    const labelSpan = _readBalancedSpan(text, start, '[', ']');
    if (!labelSpan || text[labelSpan.end] !== '(') return null;
    const labelMatch = labelSpan.content.match(/^⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾$/);
    if (!labelMatch) return null;
    const destinationSpan = _readBalancedSpan(text, labelSpan.end, '(', ')');
    if (!destinationSpan) return null;
    const superscript = labelMatch[1];
    const number = superscript.split('').map(char => _SUPERSCRIPT_TO_DIGIT[char] || char).join('');
    return {
        start,
        end: destinationSpan.end,
        raw: text.slice(start, destinationSpan.end),
        number,
        superscript,
        url: destinationSpan.content,
    };
};

// Run a line-local transform only outside Markdown fenced code. Keeping the
// line ending separate ensures two-space Markdown hard breaks survive exactly.
const _mapOutsideMarkdownFences = (text, transformLine) => {
    const source = String(text);
    const pieces = source.split(/(\r\n|\n|\r)/);
    let inFence = false;
    let fenceChar = '';
    let fenceLength = 0;
    let absoluteOffset = 0;
    let output = '';
    for (let i = 0; i < pieces.length; i += 2) {
        const line = pieces[i] || '';
        const newline = pieces[i + 1] || '';
        const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/);
        let transformed = line;
        if (inFence) {
            if (fenceMatch && fenceMatch[1][0] === fenceChar &&
                fenceMatch[1].length >= fenceLength && !fenceMatch[2].trim()) {
                inFence = false;
                fenceChar = '';
                fenceLength = 0;
            }
        } else if (fenceMatch) {
            inFence = true;
            fenceChar = fenceMatch[1][0];
            fenceLength = fenceMatch[1].length;
        } else {
            transformed = transformLine(line, absoluteOffset);
        }
        output += transformed + newline;
        absoluteOffset += line.length + newline.length;
    }
    return output;
};

// Return the spans occupied by Markdown inline-code runs. A closer must use
// the same number of backticks as its opener, which keeps literal citation
// examples opaque without treating unmatched prose backticks as code.
const _inlineCodeSpans = (line) => {
    const spans = [];
    let cursor = 0;
    while (cursor < line.length) {
        const start = line.indexOf('`', cursor);
        if (start === -1) break;
        let openerEnd = start + 1;
        while (line[openerEnd] === '`') openerEnd++;
        const runLength = openerEnd - start;
        let search = openerEnd;
        let closeEnd = -1;
        while (search < line.length) {
            const closeStart = line.indexOf('`', search);
            if (closeStart === -1) break;
            let candidateEnd = closeStart + 1;
            while (line[candidateEnd] === '`') candidateEnd++;
            if (candidateEnd - closeStart === runLength) {
                closeEnd = candidateEnd;
                break;
            }
            search = candidateEnd;
        }
        if (closeEnd === -1) {
            cursor = openerEnd;
            continue;
        }
        spans.push({ start, end: closeEnd });
        cursor = closeEnd;
    }
    return spans;
};

const _citationTokensInLine = (line) => {
    const tokens = [];
    const inlineCodeSpans = _inlineCodeSpans(line);
    let spanIndex = 0;
    let cursor = 0;
    while (cursor < line.length) {
        const start = line.indexOf('[', cursor);
        if (start === -1) break;
        while (spanIndex < inlineCodeSpans.length && inlineCodeSpans[spanIndex].end <= start) {
            spanIndex++;
        }
        if (spanIndex < inlineCodeSpans.length &&
            start >= inlineCodeSpans[spanIndex].start &&
            start < inlineCodeSpans[spanIndex].end) {
            cursor = inlineCodeSpans[spanIndex].end;
            continue;
        }
        const citation = _readCitationAt(line, start);
        if (citation) {
            tokens.push(citation);
            cursor = citation.end;
        } else {
            cursor = start + 1;
        }
    }
    return tokens;
};

const normalizeCitationPlacement = (text) => {
    if (!text || typeof text !== 'string') return text;
    return _mapOutsideMarkdownFences(text, (line) => {
        const tokens = _citationTokensInLine(line);
        if (tokens.length === 0) return line;
        const replacements = [];
        for (let i = 0; i < tokens.length;) {
            let j = i;
            while (j + 1 < tokens.length) {
                const between = line.slice(tokens[j].end, tokens[j + 1].start);
                if (!/^[ \t]*[,;]?[ \t]*$/.test(between)) break;
                j++;
            }

            const first = tokens[i];
            const last = tokens[j];
            const citations = tokens.slice(i, j + 1).map(token => token.raw).join(' ');
            let start = first.start;
            let end = last.end;
            let replacement = citations;
            while (start > 0 && /[ \t]/.test(line[start - 1])) start--;

            const after = line.slice(end);
            const trailingPunctuation = after.match(/^[ \t]*([.!?;:])/);
            if (trailingPunctuation) {
                // "claim [cite], [cite]." -> "claim. [cite] [cite]"
                replacement = trailingPunctuation[1] + ' ' + citations;
                end += trailingPunctuation[0].length;
                if (end < line.length && !/[ \t]/.test(line[end])) replacement += ' ';
            } else if (start > 0) {
                replacement = ' ' + citations;
            }

            replacements.push({ start, end, replacement });
            i = j + 1;
        }

        let result = line;
        for (let i = replacements.length - 1; i >= 0; i--) {
            const item = replacements[i];
            result = result.slice(0, item.start) + item.replacement + result.slice(item.end);
        }
        return result;
    });
};

const extractCitationLedger = (text) => {
    const occurrences = [];
    if (typeof text !== 'string' || !text) {
        return { occurrences, byKey: {}, byNumber: {} };
    }
    _mapOutsideMarkdownFences(text, (line, absoluteOffset) => {
        _citationTokensInLine(line).forEach(token => {
            const key = JSON.stringify([token.number, token.url]);
            occurrences.push({
                key,
                number: token.number,
                superscript: token.superscript,
                url: token.url,
                raw: token.raw,
                index: absoluteOffset + token.start,
                end: absoluteOffset + token.end,
            });
        });
        return line;
    });

    const byKey = {};
    const byNumber = {};
    occurrences.forEach(occurrence => {
        if (!byKey[occurrence.key]) {
            byKey[occurrence.key] = {
                key: occurrence.key,
                number: occurrence.number,
                url: occurrence.url,
                count: 0,
                occurrences: [],
            };
        }
        byKey[occurrence.key].count++;
        byKey[occurrence.key].occurrences.push(occurrence);
        if (!byNumber[occurrence.number]) {
            byNumber[occurrence.number] = { number: occurrence.number, urls: [], count: 0 };
        }
        if (!byNumber[occurrence.number].urls.includes(occurrence.url)) {
            byNumber[occurrence.number].urls.push(occurrence.url);
        }
        byNumber[occurrence.number].count++;
    });
    return { occurrences, byKey, byNumber };
};

const validateCitationConservation = (original, candidate) => {
    const originalLedger = extractCitationLedger(original);
    const candidateLedger = extractCitationLedger(candidate);
    const missing = [];
    const extra = [];
    const keys = new Set([
        ...Object.keys(originalLedger.byKey),
        ...Object.keys(candidateLedger.byKey),
    ]);
    keys.forEach(key => {
        const originalEntry = originalLedger.byKey[key];
        const candidateEntry = candidateLedger.byKey[key];
        const originalCount = originalEntry?.count || 0;
        const candidateCount = candidateEntry?.count || 0;
        if (candidateCount < originalCount) {
            missing.push({
                number: originalEntry.number,
                url: originalEntry.url,
                count: originalCount - candidateCount,
            });
        } else if (candidateCount > originalCount) {
            extra.push({
                number: candidateEntry.number,
                url: candidateEntry.url,
                count: candidateCount - originalCount,
            });
        }
    });

    const conflictingMappings = [];
    const numbers = new Set([
        ...Object.keys(originalLedger.byNumber),
        ...Object.keys(candidateLedger.byNumber),
    ]);
    numbers.forEach(number => {
        const originalUrls = originalLedger.byNumber[number]?.urls || [];
        const candidateUrls = candidateLedger.byNumber[number]?.urls || [];
        const sameUrls = originalUrls.length === candidateUrls.length &&
            originalUrls.every(url => candidateUrls.includes(url));
        if (!sameUrls || originalUrls.length > 1 || candidateUrls.length > 1) {
            conflictingMappings.push({ number, originalUrls, candidateUrls });
        }
    });

    const valid = missing.length === 0 && extra.length === 0 && conflictingMappings.length === 0;
    return {
        valid,
        ok: valid,
        missing,
        extra,
        conflictingMappings,
        conflicts: conflictingMappings,
        originalLedger,
        candidateLedger,
    };
};

const _REFERENCE_HEADER_LINE_RE = /^(#{1,6})[ \t]+(?:Source[ \t]+Text[ \t]+References|Accuracy[ \t]+Check[ \t]+References|Verified[ \t]+Sources|Referenced[ \t]+Sources|Sources|References|Bibliography|Works[ \t]+Cited|R\u00e9f\u00e9rences|Sources[ \t]+du[ \t]+texte|Referencias|Quellen)[ \t]*:?[ \t]*$/i;
const _BILINGUAL_DELIMITER_LINE_RE = /^[ \t]*---[ \t]+ENGLISH[ \t]+TRANSLATION[ \t]+---[ \t]*$/i;

const _findMarkdownLineOutsideFences = (source, linePattern, fromIndex = 0) => {
    let found = null;
    _mapOutsideMarkdownFences(source, (line, absoluteOffset) => {
        if (found || absoluteOffset < fromIndex) return line;
        const match = line.match(linePattern);
        if (match) {
            found = {
                index: absoluteOffset + (match.index || 0),
                text: match[0],
            };
        }
        return line;
    });
    return found;
};

const splitReferencesFromBody = (text) => {
    if (!text) return { body: text || '', references: '' };
    const source = String(text);
    const header = _findMarkdownLineOutsideFences(source, _REFERENCE_HEADER_LINE_RE);
    if (!header) return { body: source, references: '' };

    const delimiter = _findMarkdownLineOutsideFences(
        source,
        _BILINGUAL_DELIMITER_LINE_RE,
        header.index + header.text.length
    );
    const referencesEnd = delimiter ? delimiter.index : source.length;
    const references = source.slice(header.index, referencesEnd).trim();
    const before = source.slice(0, header.index).trim();
    const after = delimiter ? source.slice(delimiter.index).trim() : '';
    const body = before && after ? `${before}\n\n${after}` : (before || after);
    return { body, references };
};

const _readMarkdownLinkAt = (text, start) => {
    const titleSpan = _readBalancedSpan(text, start, '[', ']');
    if (!titleSpan || text[titleSpan.end] !== '(') return null;
    const destinationSpan = _readBalancedSpan(text, titleSpan.end, '(', ')');
    if (!destinationSpan) return null;
    return {
        start,
        end: destinationSpan.end,
        title: titleSpan.content,
        url: destinationSpan.content,
        raw: text.slice(start, destinationSpan.end),
    };
};

const parseReferenceItems = (referencesText) => {
    if (!referencesText) return [];
    const source = String(referencesText);
    const items = [];
    const occupied = [];
    const isOccupied = (index) => occupied.some(range => index >= range.start && index < range.end);

    // Accept both one-entry-per-line and model-glued "1. [...] 2. [...]"
    // output. Every occurrence is retained with its original visible number.
    const numberedPrefix = /(^|[\r\n]|[ \t])(\d+)\.[ \t]*/gm;
    let match;
    while ((match = numberedPrefix.exec(source)) !== null) {
        const linkStart = match.index + match[0].length;
        const link = _readMarkdownLinkAt(source, linkStart);
        if (!link) continue;
        items.push({
            num: match[2],
            title: link.title.trim(),
            url: link.url.trim(),
            raw: source.slice(match.index + match[1].length, link.end),
            index: match.index + match[1].length,
        });
        occupied.push({ start: match.index, end: link.end });
        numberedPrefix.lastIndex = link.end;
    }

    // Preserve numbered plain-text references too. Do not deduplicate: doing
    // so changes the visible number-to-source contract.
    const lines = source.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) || [];
    let lineOffset = 0;
    lines.forEach(rawLine => {
        const line = rawLine.replace(/(?:\r\n|\n|\r)$/, '');
        const plain = line.match(/^[ \t]*(\d+)\.[ \t]+(.+?)[ \t]*$/);
        if (plain && !isOccupied(lineOffset + line.indexOf(plain[1]))) {
            items.push({
                num: plain[1],
                title: plain[2].trim(),
                url: '',
                raw: line.trim(),
                index: lineOffset + line.indexOf(plain[1]),
            });
            occupied.push({ start: lineOffset, end: lineOffset + line.length });
        }
        lineOffset += rawLine.length;
    });

    // Finally retain unnumbered Markdown-link entries that are not part of an
    // already parsed numbered item.
    for (let cursor = 0; cursor < source.length;) {
        const start = source.indexOf('[', cursor);
        if (start === -1) break;
        const link = _readMarkdownLinkAt(source, start);
        if (!link) {
            cursor = start + 1;
            continue;
        }
        if (!isOccupied(start)) {
            items.push({
                num: '',
                title: link.title.trim(),
                url: link.url.trim(),
                raw: link.raw,
                index: start,
            });
        }
        cursor = link.end;
    }
    return items.sort((a, b) => a.index - b.index);
};

// ── Markdown block-boundary repair (2026-07-17) ───────────────────────────
// The model sometimes glues an ATX heading onto the previous paragraph with
// no newline — "...night. [⁽⁴⁾](url)## Why the Brain Dreams" — and Markdown
// (correctly) renders the "##" as literal text because headings must start at
// a line boundary. Deterministic, CONSERVATIVE repair: only fires when the
// hash run directly follows sentence/citation-closing punctuation, so inline
// uses like "C# is", "issue #5", or "# hashtag" prose never match. Fenced
// code blocks are protected wholesale. Heading-only by design (the confirmed
// failure class) — do NOT extend to mid-line list/blockquote markers without
// their own regression fixtures.
const normalizeMarkdownBlockBoundaries = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Split out fenced code (``` … ```); odd segments are fences — untouched.
    const parts = String(text).split(/(```[\s\S]*?(?:```|$))/);
    return parts.map((part, i) => {
        if (i % 2 === 1) return part;
        return part
            // Glued: ")## Heading", ".# Heading", "?## Heading" …
            .replace(/([)\].!?:'"”’…])(#{1,6})(?=[ \t]+\S)/g, '$1\n\n$2')
            // Space-separated needs ≥2 hashes (". # 5" in prose must survive):
            .replace(/([)\].!?:'"”’…])[ \t]+(#{2,6})(?=[ \t]+\S)/g, '$1\n\n$2');
    }).join('');
};

const filterEducationalSources = (chunks) => {
    if (!chunks || !Array.isArray(chunks)) return chunks;
    const rejectedHosts = [
        'youtu.be', 'imdb.com', 'spotify.com', 'tiktok.com', 'instagram.com',
        'facebook.com', 'twitter.com', 'x.com', 'reddit.com', 'pinterest.com',
        'ebay.com', 'yelp.com', 'tripadvisor.com', 'rottentomatoes.com',
        'fandom.com', 'letterboxd.com',
    ];
    const hostnameMatches = (hostname, domain) =>
        hostname === domain || hostname.endsWith(`.${domain}`);
    const rejectSourceUrl = (uri) => {
        if (!uri || typeof uri !== 'string') return false;
        let parsed;
        try {
            parsed = new URL(uri);
        } catch (_error) {
            try {
                parsed = new URL(`https://${uri}`);
            } catch (_invalidUrl) {
                return false;
            }
        }
        const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
        if (hostnameMatches(hostname, 'youtube.com') &&
            /^\/watch(?:\/|$)/i.test(parsed.pathname)) return true;
        if (hostnameMatches(hostname, 'amazon.com') &&
            !/^\/science(?:\/|$)/i.test(parsed.pathname)) return true;
        return rejectedHosts.some(domain => hostnameMatches(hostname, domain));
    };
    const rejectTitle = [/official\s*(music\s*)?video/i, /\(official\s*video\)/i, /\blyrics?\b/i, /\bremaster(ed)?\b/i, /\bmovie\s*trailer\b/i, /\bfull\s*movie\b/i];
    return chunks.filter(chunk => {
        const uri = chunk?.web?.uri || '';
        const title = chunk?.web?.title || '';
        if (rejectSourceUrl(uri)) return false;
        for (const p of rejectTitle) { if (p.test(title)) return false; }
        return true;
    });
};

const _educationalSourceEntries = (chunks) => {
    if (!Array.isArray(chunks)) return [];
    const accepted = new Set(filterEducationalSources(chunks));
    return chunks
        .map((chunk, originalIndex) => ({ chunk, originalIndex }))
        .filter(entry => accepted.has(entry.chunk));
};

const generateBibliographyString = (metadata, citationStyle = 'Links Only', title = 'Referenced Sources') => {
    if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) return "";
    const entries = _educationalSourceEntries(metadata.groundingChunks);
    if (entries.length === 0) return "";
    // Honesty (2026-06-24): these are raw AI-search grounding chunks — Gemini can ground on a mismatched
    // page and the links are often ephemeral redirects. NOT "Verified Sources" (the old default — it
    // overclaimed); carry a verify-before-citing caveat so a teacher never hands a student an unverified
    // link presented as authoritative. Mirrors the hardened content_engine copy; `t` isn't in scope in
    // this module, so the caveat is the English source string (the content_engine path carries the i18n key).
    const _caveat = 'These sources were surfaced by AI-assisted search and have not been independently verified — confirm each one before citing it.';
    let bib = `\n\n### ${title}\n\n*${_caveat}*\n\n`;
    entries.forEach(({ chunk, originalIndex }) => {
        const num = originalIndex + 1;
        const title = chunk.web?.title || "Unknown Source";
        const uri = chunk.web?.uri || "#";
        bib += `${num}. [${title}](${uri})\n\n`;
    });
    return bib;
};

// Gemini Segment offsets are UTF-8 byte offsets scoped to a content part.
// Convert only exact byte boundaries; an offset in the middle of a multibyte
// code point is invalid and must never be guessed.
const _utf8ByteLength = (value) => {
    const text = String(value || '');
    let bytes = 0;
    for (let i = 0; i < text.length;) {
        const codePoint = text.codePointAt(i);
        if (codePoint <= 0x7f) bytes += 1;
        else if (codePoint <= 0x7ff) bytes += 2;
        else if (codePoint <= 0xffff) bytes += 3;
        else bytes += 4;
        i += codePoint > 0xffff ? 2 : 1;
    }
    return bytes;
};

const _utf8ByteOffsetToCodeUnitIndex = (value, byteOffset) => {
    if (!Number.isSafeInteger(byteOffset) || byteOffset < 0) return null;
    const text = String(value || '');
    let bytes = 0;
    for (let i = 0; i < text.length;) {
        if (bytes === byteOffset) return i;
        const codePoint = text.codePointAt(i);
        const codePointBytes = codePoint <= 0x7f ? 1 :
            (codePoint <= 0x7ff ? 2 : (codePoint <= 0xffff ? 3 : 4));
        if (bytes + codePointBytes > byteOffset) return null;
        bytes += codePointBytes;
        i += codePoint > 0xffff ? 2 : 1;
    }
    return bytes === byteOffset ? text.length : null;
};

const _resolveGroundingParts = (text, metadata, textParts) => {
    const source = String(text || '');
    const suppliedParts = Array.isArray(textParts) ? textParts :
        (Array.isArray(metadata?.__textParts) ? metadata.__textParts : null);
    if (!suppliedParts) {
        return { valid: true, partTexts: [source], partPrefixes: [0], explicit: false };
    }

    const partTexts = [];
    let valid = true;
    suppliedParts.forEach((part, arrayIndex) => {
        const partIndex = Number.isSafeInteger(part?.partIndex) ? part.partIndex : arrayIndex;
        if (partIndex < 0 || partTexts[partIndex] !== undefined) {
            valid = false;
            return;
        }
        partTexts[partIndex] = typeof part === 'string' ? part :
            (typeof part?.text === 'string' ? part.text : '');
    });
    for (let i = 0; i < partTexts.length; i++) {
        if (partTexts[i] === undefined) partTexts[i] = '';
    }

    const partPrefixes = [];
    let prefix = 0;
    partTexts.forEach((partText, index) => {
        partPrefixes[index] = prefix;
        prefix += partText.length;
    });
    if (partTexts.join('') !== source) valid = false;
    return { valid, partTexts, partPrefixes, explicit: true };
};

const _advanceGroundingBoundary = (partText, initialIndex, isJson) => {
    let index = initialIndex;
    if (isJson) {
        // Keep the marker inside a JSON string; punctuation is part of the
        // supported segment contract and must not be searched for heuristically.
        return index;
    }

    // If Gemini supports the visible label of an immediately following
    // Markdown link, move over that one balanced destination only.
    if (partText[index] === ']' && partText[index + 1] === '(') {
        const destination = _readBalancedSpan(partText, index + 1, '(', ')');
        if (destination) index = destination.end;
    }

    // Consume only punctuation/closing delimiters contiguous with the exact
    // supported span. Never cross whitespace or scan for a later sentence end.
    while (index < partText.length && /[.,;!?:]/.test(partText[index])) index++;
    const supportedEndsWithPunctuation = index > initialIndex || /[.,;!?:]$/.test(partText.slice(0, initialIndex));
    if (supportedEndsWithPunctuation) {
        while (index < partText.length && /['"”’)}\]_*]/.test(partText[index])) index++;
    }
    return index;
};

const _validatedSupportInsertionIndex = (support, partResolution, isJson) => {
    if (!partResolution.valid || !support?.segment) return null;
    const segment = support.segment;
    const partIndex = segment.partIndex === undefined ? 0 : segment.partIndex;
    if (!Number.isSafeInteger(partIndex) || partIndex < 0 || partIndex >= partResolution.partTexts.length) return null;
    if (!partResolution.explicit && partIndex !== 0) return null;

    const partText = partResolution.partTexts[partIndex];
    const endByte = segment.endIndex;
    const endIndex = _utf8ByteOffsetToCodeUnitIndex(partText, endByte);
    if (endIndex === null) return null;

    let startByte = segment.startIndex;
    if (startByte === undefined && typeof segment.text === 'string') {
        startByte = endByte - _utf8ByteLength(segment.text);
    }
    if (startByte !== undefined) {
        const startIndex = _utf8ByteOffsetToCodeUnitIndex(partText, startByte);
        if (startIndex === null || startIndex > endIndex) return null;
        if (typeof segment.text === 'string' && partText.slice(startIndex, endIndex) !== segment.text) return null;
    } else if (typeof segment.text === 'string') {
        return null;
    }

    const adjustedPartIndex = _advanceGroundingBoundary(partText, endIndex, isJson);
    return partResolution.partPrefixes[partIndex] + adjustedPartIndex;
};

// Insert citations only where Gemini supplied a validated support span. If a
// search provider supplies sources without supports, retain any explicit
// [Source N] tokens for the content engine and optionally append the source
// list; never fabricate claim-level attribution by distributing links.
const processGrounding = (text, metadata, citationStyle = 'Links Only', isJson = false, includeBibliography = true, textParts) => {
    if (!metadata || typeof text !== 'string') return text;
    const rawChunks = Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
    if (rawChunks.length === 0) return text;
    const entries = _educationalSourceEntries(rawChunks);
    if (entries.length === 0) return text;
    const entriesByOriginalIndex = new Map(entries.map(entry => [entry.originalIndex, entry]));
    const supports = Array.isArray(metadata.groundingSupports) ? metadata.groundingSupports : [];

    if (supports.length === 0) {
        return includeBibliography ? text + generateBibliographyString(metadata, citationStyle) : text;
    }

    const partResolution = _resolveGroundingParts(text, metadata, textParts);
    const insertionMap = new Map();
    supports.forEach(support => {
        const insertionIndex = _validatedSupportInsertionIndex(support, partResolution, isJson);
        if (insertionIndex === null || insertionIndex < 0 || insertionIndex > text.length) return;
        if (!isJson) {
            const lineStart = text.lastIndexOf('\n', Math.max(0, insertionIndex - 1)) + 1;
            if (/^\s*#/.test(text.slice(lineStart, insertionIndex))) return;
        }
        const supportedIndices = Array.isArray(support.groundingChunkIndices) ? support.groundingChunkIndices : [];
        supportedIndices.forEach(originalIndex => {
            if (!Number.isSafeInteger(originalIndex) || !entriesByOriginalIndex.has(originalIndex)) return;
            if (!insertionMap.has(insertionIndex)) insertionMap.set(insertionIndex, new Set());
            insertionMap.get(insertionIndex).add(originalIndex);
        });
    });

    let newText = text;
    const sortedInsertions = Array.from(insertionMap.entries()).sort((a, b) => b[0] - a[0]);
    sortedInsertions.forEach(([index, originalIndices]) => {
        const marker = Array.from(originalIndices)
            .sort((a, b) => a - b)
            .map(originalIndex => {
                const entry = entriesByOriginalIndex.get(originalIndex);
                const label = `⁽${toSuperscript(originalIndex + 1)}⁾`;
                const uri = entry.chunk?.web?.uri;
                return uri ? `[${label}](${uri})` : label;
            })
            .join(' ');
        if (!marker) return;

        const before = newText[index - 1] || '';
        const after = newText[index] || '';
        const leadingSpace = index > 0 && !/\s/.test(before) ? ' ' : '';
        const jsonCloser = isJson && /["'}\]]/.test(after);
        const trailingSpace = index < newText.length && !/\s/.test(after) && !jsonCloser ? ' ' : '';
        newText = newText.slice(0, index) + leadingSpace + marker + trailingSpace + newText.slice(index);
    });

    if (includeBibliography) newText += generateBibliographyString(metadata, citationStyle);
    return newText;
};
const parseTaggedContent = (text) => {
    if (!text) return [];
    text = text.replace(/<([nvad])>([^<]*?)(?=<[nvad]>|<\/|\n|$)/g, (match, tag, content) => {
        if (!match.includes('</' + tag + '>')) {
            return '<' + tag + '>' + content.trim() + '</' + tag + '>';
        }
        return match;
    });
    text = text.replace(/<[nvad]>\s*(?=<[nvad]>)/g, '');
    text = text.replace(/<\/[nvad]>(?!\s|[.,!?;:\)]|$)/g, '');
    const extractSyllables = (word) => {
        if (!word || typeof word !== 'string') return { text: word, syllables: [word] };
        if (word.includes('·')) {
            const syllables = word.split('·');
            return { text: syllables.join(''), syllables };
        }
        return { text: word, syllables: [word] };
    };
      let result = [];
      let idCounter = 0;
      text = text.replace(/([^\n])\s+(#{1,6}\s)/g, '$1\n\n$2');
      const lines = text.split(/(\n)/g);
      lines.forEach(line => {
          if (line === '\n') {
              result.push({ text: '\n', pos: 'newline', syllables: ['\n'], id: `pos-${idCounter++}` });
              return;
          }
          if (!line.trim()) {
               if (line.length > 0) {
                 result.push({ text: line, pos: 'none', syllables: [line], id: `pos-${idCounter++}` });
               }
               return;
          }
          const headerMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
          if (headerMatch) {
              const level = headerMatch[1].length;
              const headerContent = headerMatch[2];
              const cleanHeaderContent = headerContent.replace(/<[nvad]>/g, '').replace(/<\/[nvad]>/g, '');
              const headerTokens = cleanHeaderContent.split(/([a-zA-Z0-9À-ÿ·]+)|(\s+)|([^a-zA-Z0-9À-ÿ·\s]+)/g).filter(Boolean);
              headerTokens.forEach(token => {
                   const { text: cleanText, syllables } = extractSyllables(token);
                   result.push({
                       text: cleanText,
                       pos: `header${level}`,
                       syllables,
                       id: `pos-${idCounter++}`
                   });
              });
              return;
          }
          line = line.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
          line = line.replace(/(?<![*])\*([^*]+)\*(?![*])/g, '<i>$1</i>');
          const parts = line.split(/(<[nvadbi]>.*?<\/[nvadbi]>)/g);
          parts.forEach(part => {
              if (!part) return;
              const tagMatch = part.match(/^<([nvadbi])>(.*?)<\/[nvadbi]>$/);
              if (tagMatch) {
                  const type = tagMatch[1];
                  const content = tagMatch[2];
                  const posMap = { n: 'noun', v: 'verb', a: 'adj', d: 'adv', b: 'bold', i: 'italic' };
                  const { text: cleanText, syllables } = extractSyllables(content);
                  result.push({
                      text: cleanText,
                      pos: posMap[type],
                      syllables,
                      id: `pos-${idCounter++}`
                  });
              } else {
                  const tokens = part.split(/([a-zA-Z0-9À-ÿ·]+)|(\s+)|([^a-zA-Z0-9À-ÿ·\s]+)/g).filter(Boolean);
                  tokens.forEach(token => {
                      const isMarkdown = /^[*#_`~]+$/.test(token);
                      const { text: cleanText, syllables } = extractSyllables(token);
                      result.push({
                          text: cleanText,
                          pos: isMarkdown ? 'markdown' : 'none',
                          syllables,
                          id: `pos-${idCounter++}`
                      });
                  });
              }
          });
      });
      return result;
};

  const DOM_TO_TOOL_ID_MAP = {
    'tour-input-panel': 'source-input',
    'tour-tool-analysis': 'analysis',
    'ui-tool-glossary': 'glossary',
    'ui-tool-simplified': 'simplified',
    'tour-tool-outline': 'outline',
    'tour-tool-visual': 'image',
    'tour-tool-faq': 'faq',
    'tour-tool-scaffolds': 'sentence-frames',
    'tour-tool-brainstorm': 'brainstorm',
    'tour-tool-persona': 'persona',
    'tour-tool-timeline': 'timeline',
    'tour-tool-concept-sort': 'concept-sort',
    'tour-tool-dbq': 'dbq',
    'tour-tool-math': 'math',
    'tour-tool-adventure': 'adventure',
    'ui-tool-quiz': 'quiz',
    'tour-tool-alignment': 'alignment-report',
    'tour-tool-lesson-plan': 'lesson-plan',
    // Late-added sidebar panels the tour/help expand paths were blind to: these three tour
    // anchors were missing entirely, so their tour steps rang a collapsed panel. Note the
    // Word Sounds panel's expandedTools id is 'ui-tool-wordsounds' (its DOM id is
    // 'tour-tool-wordsounds' — inverse of the usual naming).
    'tour-tool-wordsounds': 'ui-tool-wordsounds',
    'tour-tool-note-taking': 'note-taking',
    'tour-tool-anchor-chart': 'anchor-chart',
    'glossary_standard_flashcards': 'glossary',
    'glossary_language_flashcards': 'glossary',
    'glossary_etymology_info': 'glossary',
    'glossary_export_standard': 'glossary',
    'glossary_export_language': 'glossary',
    'glossary_puzzle_lang': 'glossary',
    'glossary_word_search': 'glossary',
    'glossary_memory_game': 'glossary',
    'glossary_crossword': 'glossary',
    'glossary_matching': 'glossary',
    'glossary_bingo': 'glossary',
    'glossary_play_bingo': 'glossary',
    'glossary_scramble': 'glossary',
    'glossary_edit': 'glossary',
    'glossary_add_term': 'glossary',
    'glossary_image_style': 'glossary',
    'glossary_terms_table': 'glossary',
    'glossary_image_size': 'glossary',
    'glossary_filter_all': 'glossary',
    'glossary_filter_tier2': 'glossary',
    'glossary_filter_tier3': 'glossary',
    'glossary_search': 'glossary',
    'glossary_remove_words': 'glossary',
    'glossary_regen_image': 'glossary',
    'glossary_delete_image': 'glossary',
    'glossary_speak_term': 'glossary',
    'glossary_download_audio': 'glossary',
    'simplified_grade_level': 'simplified',
    'simplified_differentiation': 'simplified',
    'simplified_format': 'simplified',
    'simplified_length': 'simplified',
    'simplified_language': 'simplified',
    'simplified_dok': 'simplified',
    'simplified_standards': 'simplified',
    'simplified_interests': 'simplified',
    'simplified_custom_instructions': 'simplified',
    'simplified_emojis': 'simplified',
    'simplified_citations': 'simplified',
    'simplified_charts': 'simplified',
    'simplified_immersive_reader': 'simplified',
    'simplified_compare_mode': 'simplified',
    'simplified_teacher_tools': 'simplified',
    'simplified_duplicate': 'simplified',
    'simplified_check_level': 'simplified',
    'simplified_rigor_report': 'simplified',
    'simplified_copy_text': 'simplified',
    'simplified_edit': 'simplified',
    'simplified_zen_mode': 'simplified',
    'simplified_read_mode': 'simplified',
    'simplified_read_along': 'simplified',
    'simplified_define_mode': 'simplified',
    'simplified_phonics_mode': 'simplified',
    'simplified_add_term': 'simplified',
    'simplified_explain_mode': 'simplified',
    'simplified_cloze_mode': 'simplified',
    'simplified_scramble_game': 'simplified',
    'simplified_revise_mode': 'simplified',
    'simplified_download_audio': 'simplified',
    'simplified_complexity_slider': 'simplified',
    'simplified_overwrite_toggle': 'simplified',
    'brainstorm_custom_instructions': 'brainstorm',
    'brainstorm_simulation_type': 'brainstorm',
    'brainstorm_step_count': 'brainstorm',
    'brainstorm_generate_button': 'brainstorm',
    'brainstorm_simulation_detailed': 'brainstorm',
    'brainstorm_step_count_detailed': 'brainstorm',
    'brainstorm_panel': 'brainstorm',
    'brainstorm_card': 'brainstorm',
    'brainstorm_guide': 'brainstorm',
    'persona_custom_instructions': 'persona',
    'persona_free_response': 'persona',
    'persona_generate_button': 'persona',
    'persona_custom_instructions_detailed': 'persona',
    'persona_mode_toggle': 'persona',
    'persona_panel': 'persona',
    'persona_card': 'persona',
    'math_input': 'math',
    'math_difficulty': 'math',
    'math_problem_count': 'math',
    'math_show_work': 'math',
    'math_generate_button': 'math',
    'math_subject': 'math',
    'math_mode': 'math',
    'math_panel': 'math',
    'math_toggle_answers': 'math',
    'math_graph': 'math',
    'math_problem': 'math',
    'math_student_work': 'math',
    'concept_sort_categories': 'concept-sort',
    'concept_sort_items': 'concept-sort',
    'concept_sort_generate_button': 'concept-sort',
    'concept_sort_input': 'concept-sort',
    'concept_sort_panel': 'concept-sort',
    'concept_sort_start_button': 'concept-sort',
    'concept_sort_category': 'concept-sort',
    'concept_sort_item': 'concept-sort',
    'timeline_topic': 'timeline',
    'timeline_count': 'timeline',
    'timeline_topic_detailed': 'timeline',
    'timeline_count_detailed': 'timeline',
    'timeline_generate_button': 'timeline',
    'timeline_visuals_info': 'timeline',
    'outline_structure': 'outline',
    'outline_custom_instructions': 'outline',
    'faq_count': 'faq',
    'faq_custom_instructions': 'faq',
    'scaffolds_type': 'sentence-frames',
    'scaffolds_custom_instructions': 'sentence-frames',
    'visuals_worksheet_mode': 'image',
    'visuals_creative_mode': 'image',
    'visuals_no_text': 'image',
    'visuals_low_quality': 'image',
    'visuals_art_style': 'image',
    'visuals_custom_instructions': 'image',
    'quiz_question_count': 'quiz',
    'quiz_generate_button': 'quiz',
    'alignment_standard_select': 'alignment-report',
    'alignment_grade_select': 'alignment-report',
    'alignment_generate_button': 'alignment-report',
    'adventure_story_mode': 'adventure',
    'adventure_low_quality': 'adventure',
    'adventure_cloud_storage': 'adventure',
    'adventure_lock_settings': 'adventure',
    'adventure_allow_cloud': 'adventure',
    'adventure_auto_climax': 'adventure',
    'tool_adventure': 'adventure',
    'gen_loading_screen': "Status panel for AI generation in progress. Shows: current generation phase (analyzing, generating, formatting), estimated time remaining, and helpful tips while you wait. Most generations complete in 10-30 seconds depending on complexity. Do not navigate away—generation continues in background but status updates may be lost. If generation seems stuck (over 2 minutes), a Retry button appears. Long generations indicate complex requests; consider simplifying for faster results. The spinning animation confirms active processing. Once complete, content appears automatically and this screen disappears.",
    'gen_loading_progress': "Visual progress indicator for AI generation. Fills from left to right as generation phases complete. Phases vary by content type but typically include: content analysis, AI processing, formatting, and finalization. Progress may pause briefly between phases—this is normal. Actual completion time depends on: content length, complexity of request, server load, and feature type (images take longer than text). The bar is an estimate and may jump near completion. If stuck at 100% for over 30 seconds, refresh the page and check if content was saved to history.",
    'gen_loading_hint': "Rotating tips displayed during generation time to help you get better results. Tips include: prompt engineering advice (how to write better custom instructions), feature discovery (did you know about X?), workflow efficiency suggestions, and pedagogical best practices. New tip appears every 5 seconds. Tips are contextual—they relate to the type of content being generated. Take note of tips that could improve future generations. All tips are also available in the Help section for reference. Consider the hints a mini-tutorial that runs during otherwise idle time.",
    'word_sounds_loading_minimized': "Word Sounds generation is processing in the background, allowing you to continue working. A small indicator shows generation is active. Click to expand the full loading screen with details. Why minimized: Word Sounds generates images and audio for each word, which can take 30-60 seconds for 10+ words. Backgrounding lets you set up other materials. When complete, the indicator changes and content is ready. You can also close and reopen Word Sounds—your generated content will be there. Progress saves automatically so interrupted generations can resume.",
    'history_filter_unit_select': "Filter your saved history items by specific units/folders.",
    'history_create_unit_btn': "Create a new unit folder to organize your history items.",
    'history_delete_unit_btn': "Delete the currently selected unit folder (items will be kept as uncategorized).",
    'history_unit_name_input': "Enter a name for your new unit folder.",
    'history_save_unit_btn': "Save the new unit folder.",
    'history_cancel_unit_btn': "Cancel creating a new unit.",
    'history_item_drag': "Drag this handle to reorder items in your history list.",
    'history_rename_btn': "Rename this history item.",
    'history_move_up_btn': "Move this item up in the list.",
    'history_move_down_btn': "Move this item down in the list.",
    'history_move_to_unit_btn': "Move this item to a specific unit folder.",
    'wizard_skip_btn': "Skip the setup wizard and go straight to the dashboard.",
    'wizard_close_btn': "Close the wizard without saving.",
    'wizard_grade_option': "Select the target grade level for the content.",
    'wizard_region_input': "Optional: Specify a region (e.g., 'Texas') to align standards.",
    'wizard_growth_goal_input': "Enter a specific learning goal or topic to find standards for.",
    'wizard_find_standard_btn': "Search for educational standards matching your goal.",
    'wizard_standard_select': "Toggle this standard in your selection list. Selected standards: appear highlighted, are used for alignment analysis, and appear in generated lesson plans. Click once to add, click again to remove. Multiple standards can be selected simultaneously. Selected standards are grouped and displayed in the selection panel. Standards are organized by: subject area, grade level, and domain/strand. Use for: focusing alignment analysis, documenting lesson coverage, and ensuring curriculum targets are addressed. Tip: Select only standards you intend to address in this lesson for focused alignment.",
    'wizard_mode_upload': "Upload a PDF or text file as source material.",
    'wizard_mode_url': "Use a specific website URL as source material.",
    'wizard_mode_search': "Let AI find relevant online resources for you.",
    'wizard_mode_generate': "Generate content from scratch using a topic.",
    'wizard_url_input': "Paste the full URL of the article or resource.",
    'wizard_url_fetch_btn': "Fetch and parse the content from the URL.",
    'wizard_content_next_btn': "Confirm the loaded content and proceed.",
    'wizard_search_input': "Enter a topic to search for educational resources.",
    'wizard_search_btn': "Search the web for reliable sources.",
    'wizard_search_result_select': "Select this resource to use as source material.",
    'wizard_search_result_link': "Open this resource in a new tab to review it.",
    'wizard_back_results_btn': "Go back to the search results list.",
    'wizard_search_next_btn': "Confirm the selected resource and proceed.",
    'wizard_topic_input': "Enter the main topic or subject for generation.",
    'wizard_tone_select': "Choose the tone of voice for the generated content.",
    'wizard_length_select': "Select the approximate length of the output.",
    'wizard_level_select': "Adjust the target grade level if needed.",
    'wizard_dok_select': "Select the Depth of Knowledge (DOK) level.",
    'wizard_std_mode_ai': "Switch to AI-assisted standards matching.",
    'wizard_std_mode_manual': "Switch to manual standard entry.",
    'wizard_std_manual_input': "Type a standard code or description here.",
    'wizard_std_manual_add_btn': "Add the manually entered standard.",
    'wizard_std_remove_btn': "Remove this selected standard.",
    'wizard_vocab_input': "Optional: valid list of vocabulary words to include.",
    'wizard_instructions_input': "Optional: Add specific instructions for the AI.",
    'wizard_verify_checkbox': "Enable fact-checking mode (may take longer).",
    'wizard_generate_next_btn': "Proceed to the next step with these settings.",
    'wizard_format_select': "Choose the format of the output (Text, Script, etc.).",
    'wizard_lang_input': "Type a language to add translation support.",
    'wizard_lang_add_btn': "Add this language to the list.",
    'wizard_lang_common_select': "Quickly add a common language.",
    'wizard_lang_remove_btn': "Remove this language.",
    'wizard_interest_input': "Add student interests to personalize the content.",
    'wizard_interest_add_btn': "Add this interest.",
    'wizard_interest_remove_btn': "Remove this interest.",
    'wizard_prev_btn': "Go back to the previous step.",
    'wizard_complete_btn': "Finish setup and generate the content.",
    'wizard_next_grade_btn': "Confirm grade selection and proceed.",
    'tool_quiz': 'quiz',
    'tool_lesson_plan': 'lesson-plan',
    'tool_fullpack': 'lesson-plan',
    'tool_alignment': 'alignment-report',
    'tool_analysis': 'analysis',
    'tool_glossary': 'glossary',
    'tool_scaffolds': 'sentence-frames',
    'tool_faq': 'faq',
    'tool_outline': 'outline',
    'tool_brainstorm': 'brainstorm',
    'tool_persona': 'persona',
    'tool_concept_sort': 'concept-sort',
    'tool_math': 'math',
    'tool_timeline': 'timeline',
    'tool_simplified': 'simplified',
    'tool_visual': 'image',
    'header_settings': null,
    'header_tools': null,
    'header_utils': null,
    'header_actions': null,
    'tool_udl': null,
    'source_input': 'source-input',
    'generator_actions': null,
    'tour-analysis-settings': 'analysis',
    'tour-glossary-settings': 'glossary',
    'tour-simplified-settings': 'simplified',
    'tour-visual-settings': 'image',
    'tour-faq-settings': 'faq',
    'tour-scaffolds-settings': 'sentence-frames',
  };

// Factory: takes no parameters (all helpers are pure). Returns the registry.
const createTextPipelineHelpers = () => ({
  generateBilingualText,
  extractSourceTextForProcessing,
  scrambleWord,
  toSuperscript,
  fixCitationPlacement,
  processMathHTML,
  sanitizeTruncatedCitations,
  normalizeCitationPlacement,
  extractCitationLedger,
  validateCitationConservation,
  splitReferencesFromBody,
  parseReferenceItems,
  normalizeMarkdownBlockBoundaries,
  filterEducationalSources,
  generateBibliographyString,
  processGrounding,
  parseTaggedContent,
  DOM_TO_TOOL_ID_MAP,
});

// Window registration; the build script wraps this in an IIFE so the
// registration only fires once per page load.
window.AlloModules = window.AlloModules || {};
window.AlloModules.createTextPipelineHelpers = createTextPipelineHelpers;
