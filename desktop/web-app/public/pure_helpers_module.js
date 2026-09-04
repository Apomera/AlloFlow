(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PureHelpersModule) { console.log('[CDN] PureHelpersModule already loaded, skipping'); return; }
// pure_helpers_source.jsx - Phase I.1 of CDN modularization.
// Four low-coupling helpers (3 fully pure + generateBingoCards which has 3 deps).

const repairSourceMarkdown = (rawText, deps) => {
  // No closure deps — fully pure helper.
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] repairSourceMarkdown fired"); } catch(_) {}
    if (!rawText) return rawText;

    const bibMatch = rawText.match(/(\n---\n|\n#{2,3} Source Text References)/s);
    let body = bibMatch ? rawText.substring(0, bibMatch.index) : rawText;
    const bib = bibMatch ? rawText.substring(bibMatch.index) : '';
    const trimmedBody = body.trimEnd();
    if (trimmedBody.length > 50) {
        const lastSentenceEnd = Math.max(
            trimmedBody.lastIndexOf('.'),
            trimmedBody.lastIndexOf('!'),
            trimmedBody.lastIndexOf('?')
        );
        if (lastSentenceEnd > 0 && (trimmedBody.length - lastSentenceEnd) < 120) {
            const afterPunctuation = trimmedBody.substring(lastSentenceEnd + 1).trim();
            if (afterPunctuation.length > 5 && !/[.!?]/.test(afterPunctuation)) {
                body = trimmedBody.substring(0, lastSentenceEnd + 1);
            }
        }
    }
    rawText = body + bib;

    rawText = rawText.replace(/([.!?])\s*(#{1,6}\s+)/g, '$1\n\n$2');

    let lines = rawText.split('\n');
    let titleProcessed = false;
    const repairedLines = lines.map((line, index) => {
        let trimmed = line.trim();
        
        if (!titleProcessed && trimmed.length > 0) {
            if (/^Title:\s*/i.test(trimmed)) {
                titleProcessed = true;
                return trimmed.replace(/^Title:\s*/i, '# ');
            }
            if (!/^[#\-*]/.test(trimmed) && !/^\*\*/.test(trimmed) && !/^\[/.test(trimmed) && !/^\d+\.\s/.test(trimmed) && trimmed.length < 80 && index < 3) {
                titleProcessed = true;
                return '# ' + trimmed;
            }
        }
        
        if (titleProcessed === false && trimmed.length >= 80) {
            titleProcessed = true;
        }
        if (/^#{1,6}\s+/.test(trimmed) && trimmed.length > 150) {
            return line.replace(/^#{1,6}\s+/, '');
        }
        return line;
    });

    const finalLines = [];
    for (let i = 0; i < repairedLines.length; i++) {
        const line = repairedLines[i];
        if (/^#{1,6}\s+/.test(line.trim()) && i > 0) {
            const prevLine = finalLines[finalLines.length - 1];
            if (prevLine && prevLine.trim().length > 0) {
                finalLines.push('');
            }
        }
        finalLines.push(line);
    }
    return finalLines.join('\n');
};

const _protectSentenceSplitLinks = (text, linkMap) => {
    let output = '';
    let cursor = 0;
    const input = String(text || '');
    while (cursor < input.length) {
        const open = input.indexOf('[', cursor);
        if (open < 0) { output += input.slice(cursor); break; }
        output += input.slice(cursor, open);
        const labelEnd = input.indexOf('](', open + 1);
        if (labelEnd < 0) { output += input.slice(open); break; }
        let pos = labelEnd + 2;
        let depth = 1;
        while (pos < input.length && depth > 0) {
            if (input[pos] === '\\') { pos += 2; continue; }
            if (input[pos] === '(') depth += 1;
            else if (input[pos] === ')') depth -= 1;
            pos += 1;
        }
        if (depth !== 0) { output += input.slice(open, pos); cursor = pos; continue; }
        linkMap.push(input.slice(open, pos));
        output += `{{LINK_${linkMap.length - 1}}}`;
        cursor = pos;
    }
    return output;
};

const _isSentenceCitationLink = (link) => {
    const label = String(link || '').match(/^\[([^\]]+)\]\(/);
    if (!label) return false;
    const normalized = label[1].replace(/\s+/g, ' ').trim();
    return /^(?:Source\s+)?\d+$/i.test(normalized)
        || /^\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?$/.test(normalized);
};

const _attachLeadingSentenceCitations = (units, linkMap) => {
    const result = [];
    (Array.isArray(units) ? units : []).forEach(unit => {
        let remaining = String(unit || '').trim();
        const citations = [];
        while (remaining) {
            const linkToken = remaining.match(/^\{\{LINK_(\d+)\}\}/);
            if (linkToken && _isSentenceCitationLink(linkMap[Number(linkToken[1])])) {
                citations.push(linkToken[0]);
                remaining = remaining.slice(linkToken[0].length).trimStart().replace(/^[,;]\s*/, '');
                continue;
            }
            const bare = remaining.match(/^\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/);
            if (bare) {
                citations.push(bare[0]);
                remaining = remaining.slice(bare[0].length).trimStart().replace(/^[,;]\s*/, '');
                continue;
            }
            break;
        }
        if (!citations.length) { if (remaining) result.push(remaining); return; }
        const cluster = citations.join(' ');
        if (!result.length) {
            result.push((cluster + (remaining ? ' ' + remaining : '')).trim());
            return;
        }
        result[result.length - 1] = `${result[result.length - 1].trimEnd()} ${cluster}`;
        remaining = remaining.replace(/^[,;]\s*/, '').trim();
        if (remaining && !/^[.!?]+$/.test(remaining)) result.push(remaining);
    });
    return result;
};
const splitTextToSentences = (text, deps) => {
  // No closure deps — fully pure helper.
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] splitTextToSentences fired"); } catch(_) {}
      if (!text) return [];
      const linkMap = [];
      let protectedText = _protectSentenceSplitLinks(text, linkMap);
      const latexMap = [];
      protectedText = protectedText.replace(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, (match) => {
          latexMap.push(match);
          return `{{LATEX_${latexMap.length - 1}}}`;
      });
      // Protect multi-dot and common abbreviations before the single-initial
      // rule. Running this later would see U{{DOT}}S. and miss its final dot.
      [
          /\b(?:e\.g|i\.e|etc|vs|Ph\.D|M\.D|B\.A|M\.A)\./gi,
          /\b(?:[A-Za-z]\.){2,}/g,
      ].forEach(pattern => {
          protectedText = protectedText.replace(pattern, match => match.replace(/\./g, '{{DOT}}'));
      });
      protectedText = protectedText.replace(/(^|\s)([A-Z])\.(\s)/g, "$1$2{{DOT}}$3");
      const honorifics = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'Gen', 'Rep', 'Sen'];
      honorifics.forEach(h => {
          // Bugfix: previous regex was `(b${h}).(s)` — missing backslashes meant
          // it matched the literal text "b<honorific><any>s" (effectively never).
          // Result: "Dr.", "Mr." etc. were treated as sentence terminators,
          // causing karaoke TTS to over-split + stall between roundtrips.
          protectedText = protectedText.replace(new RegExp(`(\\b${h})\\.(\\s)`, 'g'), `$1{{DOT}}$2`);
      });
      // Structural boundaries (2026-07-16): a heading line is its own unit.
      // "## Title\nBody..." used to merge the title into the first body
      // sentence (the reader then painted that whole sentence as a header,
      // TTS spoke both as one clip, and karaoke store keys diverged between
      // surfaces). A blank line is likewise a hard boundary so a paragraph
      // that ends without terminal punctuation ("# Dreams") never swallows
      // the next paragraph — whole-text and per-paragraph callers now
      // produce identical units. Multi-line LaTeX is already protected by
      // the {{LATEX_n}} placeholders above, so these rules cannot split it.
      protectedText = protectedText
        .replace(/(^|\n)([ \t]*#{1,6}[ \t][^\n]*[^\s|])[ \t]*(?=\n|$)/g, "$1$2|")
        .replace(/\n[ \t]*\n\s*/g, "|");
      const sentenceUnits = protectedText
        .replace(/([.!?]+["']?)(\s+|$)/g, "$1|")
        .split("|")
        .map(s => s.trim())
        .filter(s => s.length > 0);
      // A citation emitted after terminal punctuation ("Claim. [⁽¹⁾](…)")
      // belongs to the claim that precedes it. Normalize comma/semicolon
      // separators inside citation clusters while retaining exact link tokens.
      const attachedUnits = _attachLeadingSentenceCitations(sentenceUnits, linkMap);
      return attachedUnits.map(s => {
          let restored = s.replace(/{{DOT}}/g, ".").trim();
          restored = restored.replace(/{{LATEX_(\d+)}}/g, (_, index) => latexMap[parseInt(index, 10)] || "");
          restored = restored.replace(/{{LINK_(\d+)}}/g, (_, index) => linkMap[parseInt(index, 10)] || "");
          return restored;
      }).filter(s => s.length > 0);
};

const diffWords = (oldText, newText, deps) => {
  // No closure deps — fully pure helper.
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] diffWords fired"); } catch(_) {}
      if (!oldText || !newText) return [];
      const oldWords = oldText.trim().split(/\s+/);
      const newWords = newText.trim().split(/\s+/);
      const m = oldWords.length;
      const n = newWords.length;
      const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
      for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
              if (oldWords[i-1] === newWords[j-1]) {
                  dp[i][j] = dp[i-1][j-1] + 1;
              } else {
                  dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
              }
          }
      }
      let i = m, j = n;
      const diff = [];
      while (i > 0 && j > 0) {
          if (oldWords[i-1] === newWords[j-1]) {
              diff.push({ type: 'same', value: oldWords[i-1] });
              i--; j--;
          } else if (dp[i-1][j] >= dp[i][j-1]) {
              diff.push({ type: 'del', value: oldWords[i-1] });
              i--;
          } else {
              diff.push({ type: 'add', value: newWords[j-1] });
              j--;
          }
      }
      while (i > 0) { diff.push({ type: 'del', value: oldWords[i-1] }); i--; }
      while (j > 0) { diff.push({ type: 'add', value: newWords[j-1] }); j--; }
      return diff.reverse();
};

const generateBingoCards = (glossaryData, count, size, deps) => {
  const { addToast, t, fisherYatesShuffle } = deps;
  try { if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] generateBingoCards fired"); } catch(_) {}
      const totalCells = size * size;
      const centerIndex = size % 2 !== 0 ? Math.floor(totalCells / 2) : -1;
      const termsNeeded = centerIndex !== -1 ? totalCells - 1 : totalCells;
      let pool = [...glossaryData];
      if (!pool || pool.length === 0) {
          addToast(t('toasts.no_glossary_terms'), "error");
          return null;
      }
      if (pool.length < termsNeeded) {
          addToast(`Repeating terms to fill ${size}x${size} grid.`, "info");
          while (pool.length < termsNeeded) {
              pool = [...pool, ...glossaryData];
          }
      }
      const newCards = [];
      for (let i = 0; i < count; i++) {
          const shuffled = fisherYatesShuffle(pool);
          const cardContent = shuffled.slice(0, termsNeeded).map(item => ({ ...item, type: 'term' }));
          if (centerIndex !== -1) {
              cardContent.splice(centerIndex, 0, {
                  type: 'free',
                  term: 'FREE SPACE',
                  def: t('bingo.free_space'),
                  image: null
              });
          }
          newCards.push(cardContent);
      }
      return newCards;
};

const _applyTextSurgery = (prevHtml, effectiveText) => {
    if (!window.Diff || typeof window.Diff.diffWordsWithSpace !== 'function') {
        throw new Error('jsdiff library not loaded');
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(prevHtml, 'text/html');
    if (!doc || !doc.body) throw new Error('HTML failed to parse');
    const rejectParents = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
    const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
            let p = n.parentElement;
            while (p) {
                if (rejectParents.has(p.tagName)) return NodeFilter.FILTER_REJECT;
                p = p.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    const map = []; // map[i] = { nodeIdx, offsetInNode }
    let domText = '';
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeIdx = nodes.length;
        nodes.push(node);
        const content = node.textContent || '';
        for (let i = 0; i < content.length; i++) {
            map.push({ nodeIdx: nodeIdx, offsetInNode: i });
        }
        domText += content;
    }
    if (nodes.length === 0) {
        return { html: prevHtml, coverage: 0, reason: 'no-text-nodes' };
    }
    const surgicalHunks = window.Diff.diffWordsWithSpace(domText, effectiveText);
    const edits = [];
    let cursor = 0;
    for (const h of surgicalHunks) {
        if (!h.added && !h.removed) {
            cursor += h.value.length;
        } else if (h.removed) {
            edits.push({ type: 'delete', offset: cursor, length: h.value.length });
            cursor += h.value.length;
        } else if (h.added) {
            edits.push({ type: 'insert', offset: cursor, text: h.value });
        }
    }
    edits.sort((a, b) => b.offset - a.offset);
    const applyDelete = (offset, length) => {
        const groups = []; // { nodeIdx, start, end }
        for (let i = offset; i < offset + length && i < map.length; i++) {
            const m = map[i];
            const last = groups[groups.length - 1];
            if (last && last.nodeIdx === m.nodeIdx && last.end === m.offsetInNode) {
                last.end = m.offsetInNode + 1;
            } else {
                groups.push({ nodeIdx: m.nodeIdx, start: m.offsetInNode, end: m.offsetInNode + 1 });
            }
        }
        groups.sort((a, b) => a.nodeIdx === b.nodeIdx ? b.start - a.start : 0);
        for (const g of groups) {
            const node = nodes[g.nodeIdx];
            const c = node.textContent || '';
            node.textContent = c.substring(0, g.start) + c.substring(g.end);
        }
    };
    const applyInsert = (offset, text) => {
        if (offset === 0) {
            const first = nodes[0];
            first.textContent = text + (first.textContent || '');
            return;
        }
        if (offset >= map.length) {
            const last = nodes[nodes.length - 1];
            last.textContent = (last.textContent || '') + text;
            return;
        }
        const m = map[offset];
        const node = nodes[m.nodeIdx];
        const c = node.textContent || '';
        node.textContent = c.substring(0, m.offsetInNode) + text + c.substring(m.offsetInNode);
    };
    for (const e of edits) {
        if (e.type === 'delete') applyDelete(e.offset, e.length);
        else applyInsert(e.offset, e.text);
    }
    const serialized = doc.documentElement ? doc.documentElement.outerHTML : '';
    const html = (doc.doctype ? '<!DOCTYPE ' + doc.doctype.name + '>\n' : '') + serialized;
    const _stripTags = (h) => String(h || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim();
    const resultText = _stripTags(html);
    const approvedTokens = effectiveText.split(/\s+/).filter(t => t.length > 2);
    let found = 0;
    const resultLower = resultText.toLowerCase();
    for (const tok of approvedTokens) { if (resultLower.includes(tok.toLowerCase())) found++; }
    const coverage = approvedTokens.length > 0 ? found / approvedTokens.length : 1;
    return { html, coverage, reason: null };
};


// ── Compact run records for storage (extracted from AlloFlowANTI.txt 2026-09-04) ──
// Both functions are closure-free: they read no component state and set nothing.
// They shrink a Blueprint / Full Pack run record before it is persisted (or, with
// diagnosticsOnly, before it goes into an error report), dropping sensitive
// fields and bounding sizes.
const _compactBlueprintRunForStorage = (run, diagnosticsOnly = false, deps = {}) => {
  // Host-owned diagnostic helpers arrive in `deps` (built by _alloCompactRunDeps() in
  // AlloFlowANTI.txt). They stay in the host because ALLO_GENERATION_METRICS and the
  // error reporter use them too; this function only needs to call them.
  const { _alloDiagnosticReason, _alloDiagnosticResourceType, _alloDiagnosticBoundedInt, _alloDiagnosticTimestamp, _alloDiagnosticRunId, ALLO_GENERATION_MAX_RESOURCES } = deps;
  const _missing = ['_alloDiagnosticReason', '_alloDiagnosticResourceType', '_alloDiagnosticBoundedInt', '_alloDiagnosticTimestamp', '_alloDiagnosticRunId', 'ALLO_GENERATION_MAX_RESOURCES'].filter((key) => deps[key] === undefined);
  if (_missing.length) throw new Error('[_compactBlueprintRunForStorage] missing deps: ' + _missing.join(', '));
  if (!run || typeof run !== 'object') return run;
  const statuses = new Set(['planned', 'queued', 'running', 'retrying', 'landed', 'completed', 'partial', 'failed', 'interrupted', 'stopped', 'skipped', 'ready']);
  const failureCodes = new Set(['safety', 'authentication', 'quota', 'rate-limit', 'timeout', 'network', 'capacity', 'empty-output', 'configuration', 'malformed-output', 'stopped', 'generation-failure']);
  const sensitiveFields = new Set(['error', 'errormessage', 'stack', 'rawresponse', 'responsebody', 'requestbody', 'generatedcontent', 'prompt', 'prompttext', 'sourcetext', 'apikey', 'accesstoken', 'authorization', 'credential', 'secret', 'password']);
  const isSensitiveField = field => sensitiveFields.has(String(field || '').replace(/[_-]/g, '').toLowerCase());
  const safeStatus = status => statuses.has(status) ? status : 'unknown';
  const assignFailure = (target, field, value, existingCode) => {
    if (value) {
      const safeReason = _alloDiagnosticReason(value);
      target[field] = safeReason.summary;
      target.failureCode = safeReason.code;
    } else if (failureCodes.has(existingCode)) {
      target.failureCode = existingCode;
    }
  };
  const rowEntries = Object.entries(run.rows || {});
  const rows = Object.fromEntries(rowEntries.slice(0, ALLO_GENERATION_MAX_RESOURCES).map(([key, row], index) => {
    const storageKey = diagnosticsOnly ? 'row-' + (index + 1) : key;
    if (!row || typeof row !== 'object') return [storageKey, { status: 'unknown' }];
    if (diagnosticsOnly) {
      const compact = {
        tool: _alloDiagnosticResourceType(row.tool),
        index: _alloDiagnosticBoundedInt(row.index, 100000),
        status: safeStatus(row.status),
        elapsedMs: _alloDiagnosticBoundedInt(row.elapsedMs, 24 * 60 * 60 * 1000),
        attempts: _alloDiagnosticBoundedInt(row.attempts, 100),
        startedAt: _alloDiagnosticTimestamp(row.startedAt),
        finishedAt: _alloDiagnosticTimestamp(row.finishedAt),
      };
      assignFailure(compact, 'failReason', row.failReason, row.failureCode);
      return [storageKey, compact];
    }
    const allowed = Object.keys(row).filter(field => field !== 'failureCode' && !isSensitiveField(field));
    const compact = {};
    allowed.forEach(field => {
      if (row[field] === undefined) return;
      if (field === 'failReason' || field === 'reason') {
        assignFailure(compact, field, row[field], row.failureCode);
      } else {
        compact[field] = row[field];
      }
    });
    if (!compact.failureCode) assignFailure(compact, 'failReason', null, row.failureCode);
    return [storageKey, compact];
  }));
  if (diagnosticsOnly) {
    const compact = {
      runId: _alloDiagnosticRunId(run.runId, 'blueprint'),
      status: safeStatus(run.status),
      startedAt: _alloDiagnosticTimestamp(run.startedAt),
      finishedAt: _alloDiagnosticTimestamp(run.finishedAt),
      elapsedMs: _alloDiagnosticBoundedInt(run.elapsedMs, 24 * 60 * 60 * 1000),
      failureCount: _alloDiagnosticBoundedInt(run.failureCount, 100000),
      done: run.done === true,
      stopped: run.stopped === true,
      restored: run.restored === true,
      persistenceWarning: run.persistenceWarning ? 'Compact persistence fallback was used.' : null,
      rows,
    };
    if (run.failReason) assignFailure(compact, 'failReason', run.failReason, run.failureCode);
    else assignFailure(compact, 'reason', run.reason, run.failureCode);
    return compact;
  }
  const compact = {};
  Object.keys(run).forEach(field => {
    if (field === 'rows' || field === 'failureCode' || isSensitiveField(field) || run[field] === undefined) return;
    if (field === 'failReason' || field === 'reason') assignFailure(compact, field, run[field], run.failureCode);
    else compact[field] = run[field];
  });
  if (!compact.failureCode) assignFailure(compact, 'reason', null, run.failureCode);
  compact.rows = rows;
  return compact;
};

const _compactFullPackRunForStorage = (run, diagnosticsOnly = false, deps = {}) => {
  // Host-owned diagnostic helpers arrive in `deps` (built by _alloCompactRunDeps() in
  // AlloFlowANTI.txt). They stay in the host because ALLO_GENERATION_METRICS and the
  // error reporter use them too; this function only needs to call them.
  const { _alloDiagnosticReason, _alloDiagnosticResourceType, _alloDiagnosticBoundedInt, _alloDiagnosticTimestamp, _alloDiagnosticRunId, ALLO_GENERATION_MAX_RESOURCES, _alloSanitizeFullPackPreflight, ALLO_GENERATION_MAX_GROUPS } = deps;
  const _missing = ['_alloDiagnosticReason', '_alloDiagnosticResourceType', '_alloDiagnosticBoundedInt', '_alloDiagnosticTimestamp', '_alloDiagnosticRunId', 'ALLO_GENERATION_MAX_RESOURCES', '_alloSanitizeFullPackPreflight', 'ALLO_GENERATION_MAX_GROUPS'].filter((key) => deps[key] === undefined);
  if (_missing.length) throw new Error('[_compactFullPackRunForStorage] missing deps: ' + _missing.join(', '));
  if (!run || typeof run !== 'object') return run;
  const statuses = new Set(['planned', 'queued', 'planning', 'ready', 'running', 'retrying', 'landed', 'completed', 'partial', 'failed', 'interrupted', 'stopped', 'skipped']);
  const failureCodes = new Set(['safety', 'authentication', 'quota', 'rate-limit', 'timeout', 'network', 'capacity', 'empty-output', 'configuration', 'malformed-output', 'stopped', 'generation-failure']);
  const sensitiveFields = new Set(['error', 'errormessage', 'stack', 'rawresponse', 'responsebody', 'requestbody', 'generatedcontent', 'prompt', 'prompttext', 'sourcetext', 'apikey', 'accesstoken', 'authorization', 'credential', 'secret', 'password']);
  const isSensitiveField = field => sensitiveFields.has(String(field || '').replace(/[_-]/g, '').toLowerCase());
  const safeStatus = status => statuses.has(status) ? status : 'unknown';
  const stripFields = (value, omitted = []) => {
    if (!value || typeof value !== 'object') return {};
    const omit = new Set(omitted);
    const out = {};
    Object.keys(value).forEach(field => {
      if (field === 'failureCode' || omit.has(field) || isSensitiveField(field) || value[field] === undefined) return;
      out[field] = value[field];
    });
    return out;
  };
  const compactFailureFields = (reason, existingCode) => {
    if (!reason) return failureCodes.has(existingCode) ? { failureCode: existingCode } : {};
    const safeReason = _alloDiagnosticReason(reason);
    return { reason: safeReason.summary, failureCode: safeReason.code };
  };
  const compactPreflight = preflight => {
    if (!preflight || typeof preflight !== 'object') return diagnosticsOnly ? null : preflight;
    if (diagnosticsOnly) return _alloSanitizeFullPackPreflight(preflight);
    const out = stripFields(preflight, ['reason', 'selected', 'skipped']);
    Object.assign(out, compactFailureFields(preflight.reason, preflight.failureCode));
    out.selected = Array.isArray(preflight.selected)
      ? preflight.selected.map(item => item && typeof item === 'object' ? stripFields(item) : null).filter(Boolean)
      : [];
    out.skipped = Array.isArray(preflight.skipped)
      ? preflight.skipped.map(item => {
          if (!item || typeof item !== 'object') return null;
          return Object.assign(stripFields(item, ['reason']), compactFailureFields(item.reason, item.failureCode));
        }).filter(Boolean)
      : [];
    return out;
  };
  const compactResource = resource => {
    if (!resource || typeof resource !== 'object') return diagnosticsOnly ? { type: 'unknown', status: 'unknown' } : null;
    if (diagnosticsOnly) {
      return Object.assign({
        type: _alloDiagnosticResourceType(resource.type),
        index: _alloDiagnosticBoundedInt(resource.index, 100000),
        status: safeStatus(resource.status),
        elapsedMs: _alloDiagnosticBoundedInt(resource.elapsedMs, 24 * 60 * 60 * 1000),
        attempts: _alloDiagnosticBoundedInt(resource.attempts, 100),
        startedAt: _alloDiagnosticTimestamp(resource.startedAt),
        finishedAt: _alloDiagnosticTimestamp(resource.finishedAt),
        retryable: resource.retryable === true,
      }, compactFailureFields(resource.reason, resource.failureCode));
    }
    return Object.assign(
      stripFields(resource, ['reason']),
      compactFailureFields(resource.reason, resource.failureCode)
    );
  };
  const compactResources = resources => {
    const allEntries = Object.entries(resources || {});
    const entries = allEntries.slice(0, ALLO_GENERATION_MAX_RESOURCES);
    return Object.fromEntries(entries.map(([key, resource], index) => [diagnosticsOnly ? 'resource-' + (index + 1) : key, compactResource(resource)]));
  };
  const compactGroup = group => {
    if (!group || typeof group !== 'object') return diagnosticsOnly ? { status: 'unknown', resources: {} } : null;
    if (diagnosticsOnly) {
      return Object.assign({
        status: safeStatus(group.status),
        startedAt: _alloDiagnosticTimestamp(group.startedAt),
        finishedAt: _alloDiagnosticTimestamp(group.finishedAt),
        elapsedMs: _alloDiagnosticBoundedInt(group.elapsedMs, 24 * 60 * 60 * 1000),
        failureCount: _alloDiagnosticBoundedInt(group.failureCount, 100000),
        persistenceWarning: group.persistenceWarning ? 'Compact persistence fallback was used.' : null,
        preflight: compactPreflight(group.preflight),
        planPayload: null,
        resources: compactResources(group.resources),
      }, compactFailureFields(group.reason, group.failureCode));
    }
    return Object.assign(
      stripFields(group, ['reason', 'resources', 'groups', 'preflight', 'planPayload']),
      compactFailureFields(group.reason, group.failureCode),
      { preflight: compactPreflight(group.preflight), planPayload: group.planPayload, resources: compactResources(group.resources) }
    );
  };
  if (diagnosticsOnly) {
    return Object.assign({
      runId: _alloDiagnosticRunId(run.runId, 'full-pack'),
      targetMode: ['all-groups', 'current-settings'].includes(run.targetMode) ? run.targetMode : null,
      status: safeStatus(run.status),
      startedAt: _alloDiagnosticTimestamp(run.startedAt),
      finishedAt: _alloDiagnosticTimestamp(run.finishedAt),
      elapsedMs: _alloDiagnosticBoundedInt(run.elapsedMs, 24 * 60 * 60 * 1000),
      failureCount: _alloDiagnosticBoundedInt(run.failureCount, 100000),
      restored: run.restored === true,
      persistenceWarning: run.persistenceWarning ? 'Compact persistence fallback was used.' : null,
      preflight: compactPreflight(run.preflight),
      planPayload: null,
      resources: compactResources(run.resources),
      groups: Object.fromEntries(Object.values(run.groups || {}).slice(0, ALLO_GENERATION_MAX_GROUPS).map((group, index) => ['group-' + (index + 1), compactGroup(group)])),
    }, compactFailureFields(run.reason, run.failureCode));
  }
  return Object.assign(
    stripFields(run, ['reason', 'resources', 'groups', 'preflight', 'planPayload']),
    compactFailureFields(run.reason, run.failureCode),
    {
      preflight: compactPreflight(run.preflight),
      planPayload: run.planPayload,
      resources: compactResources(run.resources),
      groups: Object.fromEntries(Object.entries(run.groups || {}).slice(0, ALLO_GENERATION_MAX_GROUPS).map(([key, group]) => [key, compactGroup(group)])),
    }
  );
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.PureHelpers = {
  repairSourceMarkdown,
  splitTextToSentences,
  diffWords,
  generateBingoCards,
  _applyTextSurgery,
  _compactBlueprintRunForStorage,
  _compactFullPackRunForStorage,
};

window.AlloModules.PureHelpersModule = true;
console.log('[PureHelpers] 7 helpers registered');
})();
