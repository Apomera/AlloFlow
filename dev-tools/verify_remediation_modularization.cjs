#!/usr/bin/env node
'use strict';

/**
 * Phase 1 Deploy-Safe Modularization Seam Verifier & Test-Impact Audit.
 *
 * Read-only analyzer & Phase 2 cutover parity verifier for modularizing:
 *   - doc_pipeline_source.jsx  (5 extracted submodules + core)
 *   - view_pdf_audit_source.jsx (4 extracted submodules + core)
 *
 * Usage:
 *   node dev-tools/verify_remediation_modularization.cjs --audit-seams
 *   node dev-tools/verify_remediation_modularization.cjs --check-parity
 *   node dev-tools/verify_remediation_modularization.cjs --audit-seams --json out.json
 *
 * Importable API:
 *   {
 *     PROPOSED_SLICE_SPECS,
 *     parseSourceAst,
 *     auditSeams,
 *     scanTestImpact,
 *     checkParity,
 *     verifyDryRunCompileParity,
 *   }
 */

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Script } = require('vm');
const parser = require('@babel/parser');
const checkPipelineIntegrity = require('./check_pipeline_integrity.js');

const DEFAULT_ROOT = path.resolve(__dirname, '..');

/**
 * Declarative AST-statement-anchor specifications for all 9 proposed Phase 2
 * submodules. Boundaries are resolved dynamically from the parsed AST so they
 * always land cleanly on top-level or factory-body statement boundaries (never
 * mid-function or mid-block).
 */
const PROPOSED_SLICE_SPECS = Object.freeze({
  'doc_pipeline_source.jsx': Object.freeze([
    {
      id: 'doc/01_pure_helpers_and_policies.js',
      filename: '01_pure_helpers_and_policies.js',
      targetFile: 'doc_pipeline_source.jsx',
      scope: 'top-level',
      startPolicy: 'file-start',
      startStatement: '_alloParsePreviewMarkdown',
      endBeforeStatement: 'createDocPipeline',
      description: 'Top-level pure helpers and policy tables before createDocPipeline',
    },
    {
      id: 'doc/02_office_and_pdf_extractors.js',
      filename: '02_office_and_pdf_extractors.js',
      targetFile: 'doc_pipeline_source.jsx',
      scope: 'createDocPipeline',
      startStatement: '_configureTrustedDocumentScript',
      endStatement: 'extractPptxTextDeterministic',
      includeLeadingComments: true,
      description: 'CDN loader, XLSX/DOCX/PPTX/PDF deterministic extractors, Stage-4 helpers/wrapper, office media',
    },
    {
      id: 'doc/03_auditors_and_deterministic_fixers.js',
      filename: '03_auditors_and_deterministic_fixers.js',
      targetFile: 'doc_pipeline_source.jsx',
      scope: 'createDocPipeline',
      startStatement: 'AUDIT_RUBRIC_PROMPT',
      endStatement: 'runDeterministicWcagFixes',
      includeLeadingComments: true,
      description: 'Blind output audit, runAxeAudit, WCAG 2.2 checks, DOMPurify, Noto/STEM, runEqualAccessAudit, deterministic fixers',
    },
    {
      id: 'doc/04_reports_and_inplace_tagging.js',
      filename: '04_reports_and_inplace_tagging.js',
      targetFile: 'doc_pipeline_source.jsx',
      scope: 'createDocPipeline',
      startStatement: '_honestReportBlocks',
      endStatement: 'getPdfPreviewHtml',
      includeLeadingComments: true,
      description: 'Audit & Adobe accessibility reports, in-place original PDF tagger, Stage 7 font subsetting, preview theming, word restoration',
    },
    {
      id: 'doc/05_resource_and_pack_generators.js',
      filename: '05_resource_and_pack_generators.js',
      targetFile: 'doc_pipeline_source.jsx',
      scope: 'createDocPipeline',
      startStatement: '_THEME_CACHE_TTL_MS',
      endStatement: 'generateFullPackHTML',
      includeLeadingComments: true,
      attachLeadingBlankLines: true,
      description: 'Document Generation: custom export theme cache, parseMarkdownToHTML, generateResourceHTML, generateFullPackHTML up to batch lock/return',
    },
  ]),
  'view_pdf_audit_source.jsx': Object.freeze([
    {
      id: 'view/01_security_and_verification_helpers.js',
      filename: '01_security_and_verification_helpers.js',
      targetFile: 'view_pdf_audit_source.jsx',
      scope: 'top-level',
      startPolicy: 'file-start',
      startStatement: '_alloUseFocusTrap',
      endStatement: '_normTokenForDiffShared',
      attachTrailingBlankLines: true,
      description: 'Focus trap, help directory, sanitizers, verification binding, foundation matrix, diff token helpers',
    },
    {
      id: 'view/02_docx_odt_pptx_exporters.js',
      filename: '02_docx_odt_pptx_exporters.js',
      targetFile: 'view_pdf_audit_source.jsx',
      scope: 'top-level',
      startStatement: '_htmlToStructuredText',
      endStatement: '_ODT_STYLES_XML',
      includeLeadingComments: true,
      attachTrailingBlankLines: true,
      description: 'Structured text, DOCX block-spec transformer, and ODT XML/package exporters',
      notes: 'DOCX blob builder (_buildDocxBlobFromSpec) and PPTX exporters (_ensurePptxLib.._buildPptxBlobFromSlides) sit later in file order inside slice 03 to keep all slices strictly contiguous for 100% byte-identical reassembly.',
    },
    {
      id: 'view/03_epub_daisy_braille_narration.js',
      filename: '03_epub_daisy_braille_narration.js',
      targetFile: 'view_pdf_audit_source.jsx',
      scope: 'top-level',
      startStatement: '_expDtbookRuns',
      endStatement: '_audioReadyText',
      includeLeadingComments: true,
      attachTrailingBlankLines: true,
      description: 'DAISY 3, EPUB3 + Media Overlays, Braille BRF, DOCX blob + Harper + PPTX builders, and natural narration text prep',
      notes: 'Preserves exact source order (includes interleaved _buildDocxBlobFromSpec.._buildPptxBlobFromSlides between _buildBrailleBrf and _audioReadyText) so concatenation produces 0 byte drift and identical TDZ/evaluation order.',
    },
    {
      id: 'view/04_doc_modes_and_diagnostics.jsx',
      filename: '04_doc_modes_and_diagnostics.jsx',
      targetFile: 'view_pdf_audit_source.jsx',
      scope: 'top-level',
      startStatement: '_DOC_MODE_CSS_BASE',
      endStatement: 'PdfDiagnosticsLog',
      includeLeadingComments: true,
      attachTrailingBlankLines: true,
      description: 'Document modes, self-contained reader app wrapper, accessible office export, SR narration & WAV concat, tag outline, PdfDiagnosticsLog',
    },
  ]),
});

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256String(str) {
  return sha256Buffer(Buffer.from(String(str), 'utf8'));
}

function parseSourceAst(source, filename) {
  return parser.parse(source, {
    sourceType: 'unambiguous',
    sourceFilename: filename || '<inline>',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    plugins: [
      'jsx',
      'dynamicImport',
      'optionalChaining',
      'nullishCoalescingOperator',
      'objectRestSpread',
      'classProperties',
    ],
  });
}

function getStatementNames(node) {
  if (!node) return [];
  if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
    return [node.id.name];
  }
  if (node.type === 'ClassDeclaration' && node.id && node.id.name) {
    return [node.id.name];
  }
  if (node.type === 'VariableDeclaration' && Array.isArray(node.declarations)) {
    const names = [];
    for (const decl of node.declarations) {
      if (decl && decl.id && decl.id.type === 'Identifier' && decl.id.name) {
        names.push(decl.id.name);
      }
    }
    return names;
  }
  return [];
}

function statementPrimaryName(node) {
  const names = getStatementNames(node);
  return names.length ? names[0] : node.type;
}

function nodeContainsJsx(rootNode) {
  let found = false;
  const stack = [rootNode];
  while (stack.length && !found) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (cur.type === 'JSXElement' || cur.type === 'JSXFragment') {
      found = true;
      break;
    }
    for (const key of Object.keys(cur)) {
      if (key === 'loc' || key === 'comments' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments' || key === 'tokens') continue;
      const val = cur[key];
      if (!val || typeof val !== 'object') continue;
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          if (val[i] && typeof val[i] === 'object') stack.push(val[i]);
        }
      } else if (typeof val.type === 'string') {
        stack.push(val);
      }
    }
  }
  return found;
}

/**
 * Compute byte offsets for the start of every 1-based line in a UTF-8 buffer.
 * lineByteStarts[i] is the byte offset of 1-based line (i + 1).
 * lineByteStarts[totalLines] === buf.length.
 */
function buildLineIndex(buf) {
  const starts = [0];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0a) {
      starts.push(i + 1);
    }
  }
  // If file ends with '\n', the last pushed offset equals buf.length, so there
  // are (starts.length - 1) lines (each terminating in '\n'). Otherwise add buf.length
  // as the sentinel end of the final unterminated line.
  if (starts[starts.length - 1] !== buf.length) {
    starts.push(buf.length);
  }
  const totalLines = starts.length - 1;
  const lineText = (lineNum) => {
    const s = starts[lineNum - 1];
    const e = starts[lineNum];
    return buf.subarray(s, e).toString('utf8').replace(/\r?\n$/, '');
  };
  return { starts, totalLines, lineText };
}

function findStatementIndexByName(statements, name) {
  for (let i = 0; i < statements.length; i++) {
    if (getStatementNames(statements[i]).includes(name)) {
      return i;
    }
  }
  return -1;
}

function findLeadingCommentStartLine(lineIndex, stmtStartLine, minAllowedLine, attachLeadingBlankLines) {
  let start = stmtStartLine;
  let cur = stmtStartLine - 1;
  // Walk backwards over contiguous comment lines (and blank lines between comment blocks)
  // stopping strictly after the previous statement's end line.
  let seenComment = false;
  let lastCommentLine = stmtStartLine;
  while (cur >= minAllowedLine) {
    const trimmed = lineIndex.lineText(cur).trim();
    if (trimmed === '') {
      if (attachLeadingBlankLines) {
        start = cur;
      }
      cur -= 1;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/')) {
      seenComment = true;
      lastCommentLine = cur;
      start = cur;
      cur -= 1;
      continue;
    }
    break;
  }
  if (!attachLeadingBlankLines && seenComment) {
    return lastCommentLine;
  }
  if (!attachLeadingBlankLines && !seenComment) {
    return stmtStartLine;
  }
  return start;
}

function findTrailingBlankEndLine(lineIndex, stmtEndLine, maxAllowedLine) {
  let end = stmtEndLine;
  while (end + 1 <= maxAllowedLine) {
    if (lineIndex.lineText(end + 1).trim() === '') {
      end += 1;
    } else {
      break;
    }
  }
  return end;
}

function getFactoryBodyForDocPipeline(ast) {
  const topBody = ast.program.body;
  const factoryIdx = findStatementIndexByName(topBody, 'createDocPipeline');
  if (factoryIdx < 0) {
    throw new Error('Could not locate createDocPipeline in doc_pipeline_source.jsx');
  }
  const decl = topBody[factoryIdx];
  let fnNode = null;
  if (decl.type === 'FunctionDeclaration') {
    fnNode = decl;
  } else if (decl.type === 'VariableDeclaration') {
    const d = decl.declarations.find((item) => item.id && item.id.name === 'createDocPipeline');
    fnNode = d && d.init;
  }
  if (!fnNode || !fnNode.body || !Array.isArray(fnNode.body.body)) {
    throw new Error('createDocPipeline does not have a block statement body');
  }
  return {
    factoryIdx,
    factoryNode: decl,
    factoryBody: fnNode.body.body,
  };
}

function auditSingleMonolith({ rootDir, targetFile, specs }) {
  const absPath = path.join(rootDir, targetFile);
  const rawBuf = fs.readFileSync(absPath);
  const rawSrc = rawBuf.toString('utf8');
  const originalSha256 = sha256Buffer(rawBuf);
  const lineIndex = buildLineIndex(rawBuf);
  const ast = parseSourceAst(rawSrc, targetFile);

  const topBody = ast.program.body;
  let factoryInfo = null;
  if (targetFile === 'doc_pipeline_source.jsx') {
    factoryInfo = getFactoryBodyForDocPipeline(ast);
  }

  const errors = [];
  const resolvedSlices = [];
  let previousSliceEndLine = 0;

  for (const spec of specs) {
    const statements = spec.scope === 'top-level' ? topBody : factoryInfo.factoryBody;
    const startIdx = findStatementIndexByName(statements, spec.startStatement);
    if (startIdx < 0) {
      errors.push(`[${spec.id}] startStatement not found in ${spec.scope}: ${spec.startStatement}`);
      continue;
    }

    let endIdx = -1;
    if (spec.endStatement) {
      endIdx = findStatementIndexByName(statements, spec.endStatement);
      if (endIdx < 0) {
        errors.push(`[${spec.id}] endStatement not found in ${spec.scope}: ${spec.endStatement}`);
        continue;
      }
    } else if (spec.endBeforeStatement) {
      const beforeIdx = findStatementIndexByName(statements, spec.endBeforeStatement);
      if (beforeIdx <= 0) {
        errors.push(`[${spec.id}] endBeforeStatement not found or has no predecessor in ${spec.scope}: ${spec.endBeforeStatement}`);
        continue;
      }
      endIdx = beforeIdx - 1;
    } else {
      errors.push(`[${spec.id}] missing endStatement / endBeforeStatement`);
      continue;
    }

    if (endIdx < startIdx) {
      errors.push(`[${spec.id}] endIdx (${endIdx}) < startIdx (${startIdx})`);
      continue;
    }

    const firstStmt = statements[startIdx];
    const lastStmt = statements[endIdx];
    const prevStmt = startIdx > 0 ? statements[startIdx - 1] : null;
    const nextStmt = endIdx + 1 < statements.length ? statements[endIdx + 1] : null;

    // Verify no same-line adjacent statement collision at either seam boundary.
    if (prevStmt && prevStmt.loc.end.line >= firstStmt.loc.start.line) {
      errors.push(`[${spec.id}] start boundary shares line L${firstStmt.loc.start.line} with previous statement ${statementPrimaryName(prevStmt)}`);
    }
    if (nextStmt && lastStmt.loc.end.line >= nextStmt.loc.start.line) {
      errors.push(`[${spec.id}] end boundary shares line L${lastStmt.loc.end.line} with next statement ${statementPrimaryName(nextStmt)}`);
    }

    const minAllowedStartLine = Math.max(
      previousSliceEndLine + 1,
      prevStmt ? prevStmt.loc.end.line + 1 : 1
    );
    const maxAllowedEndLine = nextStmt
      ? nextStmt.loc.start.line - 1
      : (spec.scope === 'top-level' ? lineIndex.totalLines : factoryInfo.factoryNode.loc.end.line - 1);

    let startLine;
    if (spec.startPolicy === 'file-start') {
      startLine = 1;
    } else if (spec.includeLeadingComments) {
      startLine = findLeadingCommentStartLine(
        lineIndex,
        firstStmt.loc.start.line,
        minAllowedStartLine,
        Boolean(spec.attachLeadingBlankLines)
      );
    } else {
      startLine = firstStmt.loc.start.line;
    }

    let endLine = lastStmt.loc.end.line;
    if (spec.attachTrailingBlankLines) {
      endLine = findTrailingBlankEndLine(lineIndex, endLine, maxAllowedEndLine);
    }

    const sliceStmts = statements.slice(startIdx, endIdx + 1);
    const declaredSymbols = [];
    let containsJsx = false;
    for (const stmt of sliceStmts) {
      for (const name of getStatementNames(stmt)) {
        declaredSymbols.push({
          name,
          line: stmt.loc.start.line,
          endLine: stmt.loc.end.line,
          kind: stmt.type === 'FunctionDeclaration' ? 'function' : (stmt.kind || stmt.type),
        });
      }
      if (!containsJsx && nodeContainsJsx(stmt)) {
        containsJsx = true;
      }
    }

    const byteStart = lineIndex.starts[startLine - 1];
    const byteEnd = lineIndex.starts[endLine];
    const sliceBuf = rawBuf.subarray(byteStart, byteEnd);

    // AST-boundary invariant checks
    const astAlignedStart = startLine <= firstStmt.loc.start.line && (!prevStmt || startLine > prevStmt.loc.end.line);
    const astAlignedEnd = endLine >= lastStmt.loc.end.line && (!nextStmt || endLine < nextStmt.loc.start.line);
    if (!astAlignedStart || !astAlignedEnd) {
      errors.push(`[${spec.id}] AST statement-boundary violation: L${startLine}-L${endLine} vs statements L${firstStmt.loc.start.line}-L${lastStmt.loc.end.line}`);
    }

    resolvedSlices.push({
      id: spec.id,
      filename: spec.filename,
      targetFile,
      scope: spec.scope,
      description: spec.description,
      notes: spec.notes || null,
      startStatementIndex: startIdx,
      endStatementIndex: endIdx,
      statementCount: sliceStmts.length,
      firstStatementName: statementPrimaryName(firstStmt),
      lastStatementName: statementPrimaryName(lastStmt),
      firstStatementLine: firstStmt.loc.start.line,
      lastStatementEndLine: lastStmt.loc.end.line,
      startLine,
      endLine,
      lineCount: endLine - startLine + 1,
      byteStart,
      byteEnd,
      byteLength: sliceBuf.length,
      sha256: sha256Buffer(sliceBuf),
      containsJsx,
      astBoundaryValid: astAlignedStart && astAlignedEnd,
      declaredSymbolCount: declaredSymbols.length,
      declaredSymbols,
    });

    previousSliceEndLine = endLine;
  }

  // Verify zero split statements across ALL top-level and factory statements
  const checkNoSplitStatements = (statements, scopeLabel) => {
    for (const stmt of statements) {
      const s = stmt.loc.start.line;
      const e = stmt.loc.end.line;
      if (scopeLabel === 'top-level' && targetFile === 'doc_pipeline_source.jsx' && statementPrimaryName(stmt) === 'createDocPipeline') {
        // createDocPipeline itself wraps inner slices; its children are checked in createDocPipeline scope
        continue;
      }
      let insideCount = 0;
      for (const sl of resolvedSlices) {
        const startsIn = s >= sl.startLine && s <= sl.endLine;
        const endsIn = e >= sl.startLine && e <= sl.endLine;
        if (startsIn !== endsIn) {
          errors.push(`[${targetFile}] Statement ${statementPrimaryName(stmt)} (L${s}-L${e}) in ${scopeLabel} is split across slice ${sl.id} (L${sl.startLine}-L${sl.endLine})`);
        }
        if (startsIn && endsIn) insideCount++;
      }
      if (insideCount > 1) {
        errors.push(`[${targetFile}] Statement ${statementPrimaryName(stmt)} (L${s}-L${e}) belongs to ${insideCount} overlapping slices`);
      }
    }
  };
  checkNoSplitStatements(topBody, 'top-level');
  if (factoryInfo) checkNoSplitStatements(factoryInfo.factoryBody, 'createDocPipeline');

  // Build full ordered partition (slices + remaining core segments) covering lines 1..totalLines
  const sortedSlices = [...resolvedSlices].sort((a, b) => a.startLine - b.startLine);
  let overlapCount = 0;
  for (let i = 1; i < sortedSlices.length; i++) {
    if (sortedSlices[i].startLine <= sortedSlices[i - 1].endLine) {
      overlapCount++;
      errors.push(`[${targetFile}] Slice overlap between ${sortedSlices[i - 1].id} (ends L${sortedSlices[i - 1].endLine}) and ${sortedSlices[i].id} (starts L${sortedSlices[i].startLine})`);
    }
  }

  const segments = [];
  let cursorLine = 1;
  let corePart = 0;
  for (const sl of sortedSlices) {
    if (sl.startLine > cursorLine) {
      corePart++;
      const cStart = cursorLine;
      const cEnd = sl.startLine - 1;
      const bStart = lineIndex.starts[cStart - 1];
      const bEnd = lineIndex.starts[cEnd];
      segments.push({
        kind: 'core',
        id: `${targetFile}:core#${corePart}`,
        startLine: cStart,
        endLine: cEnd,
        lineCount: cEnd - cStart + 1,
        byteStart: bStart,
        byteEnd: bEnd,
        byteLength: bEnd - bStart,
      });
    }
    segments.push({
      kind: 'slice',
      id: sl.id,
      startLine: sl.startLine,
      endLine: sl.endLine,
      lineCount: sl.lineCount,
      byteStart: sl.byteStart,
      byteEnd: sl.byteEnd,
      byteLength: sl.byteLength,
    });
    cursorLine = sl.endLine + 1;
  }
  if (cursorLine <= lineIndex.totalLines) {
    corePart++;
    const cStart = cursorLine;
    const cEnd = lineIndex.totalLines;
    const bStart = lineIndex.starts[cStart - 1];
    const bEnd = lineIndex.starts[cEnd];
    segments.push({
      kind: 'core',
      id: `${targetFile}:core#${corePart}`,
      startLine: cStart,
      endLine: cEnd,
      lineCount: cEnd - cStart + 1,
      byteStart: bStart,
      byteEnd: bEnd,
      byteLength: bEnd - bStart,
    });
  }

  // Verify 0 gaps and 0 overlaps across segments
  let gapCount = 0;
  let segOverlapCount = 0;
  if (segments.length === 0 || segments[0].startLine !== 1 || segments[0].byteStart !== 0) {
    gapCount++;
    errors.push(`[${targetFile}] Partition does not start at line 1 / byte 0`);
  }
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const cur = segments[i];
    if (cur.startLine > prev.endLine + 1 || cur.byteStart > prev.byteEnd) {
      gapCount++;
      errors.push(`[${targetFile}] Partition gap between ${prev.id} (L${prev.endLine}) and ${cur.id} (L${cur.startLine})`);
    }
    if (cur.startLine <= prev.endLine || cur.byteStart < prev.byteEnd) {
      segOverlapCount++;
      errors.push(`[${targetFile}] Partition overlap between ${prev.id} (L${prev.endLine}) and ${cur.id} (L${cur.startLine})`);
    }
  }
  const lastSeg = segments[segments.length - 1];
  if (!lastSeg || lastSeg.endLine !== lineIndex.totalLines || lastSeg.byteEnd !== rawBuf.length) {
    gapCount++;
    errors.push(`[${targetFile}] Partition does not end at line ${lineIndex.totalLines} / byte ${rawBuf.length}`);
  }

  // Dry-run reassembly from slices + core segments -> prove 100% byte-identical SHA-256
  const reassembledBuf = Buffer.concat(segments.map((seg) => rawBuf.subarray(seg.byteStart, seg.byteEnd)));
  const reassembledSha256 = sha256Buffer(reassembledBuf);
  const byteIdentical = reassembledBuf.length === rawBuf.length && reassembledSha256 === originalSha256;
  if (!byteIdentical) {
    errors.push(`[${targetFile}] Dry-run reassembly SHA-256 mismatch: expected ${originalSha256}, got ${reassembledSha256}`);
  }

  // Build full symbol table (both core and moved slices) for test-impact mapping
  const symbolTable = new Map();
  const segmentForLine = (lineNum) => {
    for (const seg of segments) {
      if (lineNum >= seg.startLine && lineNum <= seg.endLine) return seg;
    }
    return null;
  };
  const registerStatements = (stmts) => {
    for (const stmt of stmts) {
      const seg = segmentForLine(stmt.loc.start.line);
      for (const name of getStatementNames(stmt)) {
        if (!symbolTable.has(name)) {
          symbolTable.set(name, {
            name,
            line: stmt.loc.start.line,
            endLine: stmt.loc.end.line,
            segmentKind: seg ? seg.kind : 'core',
            segmentId: seg ? seg.id : `${targetFile}:core`,
          });
        }
      }
    }
  };
  registerStatements(topBody);
  if (factoryInfo) registerStatements(factoryInfo.factoryBody);

  const extractedLines = resolvedSlices.reduce((acc, s) => acc + s.lineCount, 0);
  const coreLines = segments.filter((s) => s.kind === 'core').reduce((acc, s) => acc + s.lineCount, 0);

  // Build char-offset line index for fast O(log N) char-offset -> 1-based line lookups
  const lineCharStarts = [0];
  for (let i = 0; i < rawSrc.length; i++) {
    if (rawSrc.charCodeAt(i) === 10) lineCharStarts.push(i + 1);
  }

  return {
    targetFile,
    totalLines: lineIndex.totalLines,
    totalBytes: rawBuf.length,
    originalSha256,
    reassembledSha256,
    reassembledBytes: reassembledBuf.length,
    byteIdentical,
    gapCount,
    overlapCount: overlapCount + segOverlapCount,
    extractedLines,
    coreLines,
    extractedPercent: Number(((extractedLines / lineIndex.totalLines) * 100).toFixed(2)),
    slices: resolvedSlices,
    segments,
    errors,
    // Non-enumerable runtime helpers for test-impact & parity checks
    _internal: {
      rawSrc,
      rawBuf,
      reassembledSrc: reassembledBuf.toString('utf8'),
      lineIndex,
      lineCharStarts,
      symbolTable,
      segmentForLine,
      factoryInfo,
    },
  };
}

function verifyPipelineIntegrityExports(rootDir, docAudit) {
  const originalSrc = docAudit._internal.rawSrc;
  const reassembledSrc = docAudit._internal.reassembledSrc;
  const origExports = checkPipelineIntegrity.exportsIn(originalSrc, 'doc_pipeline_source.jsx');
  const reassembledExports = checkPipelineIntegrity.exportsIn(reassembledSrc, 'doc_pipeline_source.jsx');

  const missingInReassembled = [...origExports].filter((k) => !reassembledExports.has(k)).sort();
  const extraInReassembled = [...reassembledExports].filter((k) => !origExports.has(k)).sort();

  // Cross-check UI _docPipeline.<name> calls (mirroring check_pipeline_integrity.js)
  const uiFiles = [
    path.join(rootDir, 'AlloFlowANTI.txt'),
    path.join(rootDir, 'desktop', 'web-app', 'src', 'App.jsx'),
  ];
  const uiCalls = new Set();
  for (const uf of uiFiles) {
    if (!fs.existsSync(uf)) continue;
    const src = fs.readFileSync(uf, 'utf8');
    const re = /_docPipeline\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let m;
    while ((m = re.exec(src)) !== null) uiCalls.add(m[1]);
  }
  const danglingUiCalls = [...uiCalls].filter((c) => !reassembledExports.has(c)).sort();

  // Verify the factory ReturnStatement remains in a core segment (not moved into a slice)
  const factoryBody = docAudit._internal.factoryInfo.factoryBody;
  const returnStmt = [...factoryBody].reverse().find((n) => n.type === 'ReturnStatement');
  const returnSeg = returnStmt ? docAudit._internal.segmentForLine(returnStmt.loc.start.line) : null;
  const returnInCore = Boolean(returnSeg && returnSeg.kind === 'core');

  // Verify URL policy stays clean on reassembled source
  const urlIssues = checkPipelineIntegrity.runtimeUrlIssues(reassembledSrc, 'doc_pipeline_source.jsx');

  const ok = (
    origExports.size > 0 &&
    missingInReassembled.length === 0 &&
    extraInReassembled.length === 0 &&
    danglingUiCalls.length === 0 &&
    returnInCore &&
    urlIssues.length === 0
  );

  return {
    ok,
    originalExportCount: origExports.size,
    reassembledExportCount: reassembledExports.size,
    uiCallCount: uiCalls.size,
    missingInReassembled,
    extraInReassembled,
    danglingUiCalls,
    returnStatementLine: returnStmt ? returnStmt.loc.start.line : null,
    returnInCore,
    runtimeUrlIssueCount: urlIssues.length,
    runtimeUrlIssues: urlIssues,
  };
}

/**
 * Run full AST seam verification + byte-parity dry-run + export integrity check.
 */
function auditSeams(options = {}) {
  const rootDir = options.rootDir || DEFAULT_ROOT;
  const targets = {};
  const allSlices = [];
  const errors = [];

  for (const [targetFile, specs] of Object.entries(PROPOSED_SLICE_SPECS)) {
    const res = auditSingleMonolith({ rootDir, targetFile, specs });
    targets[targetFile] = res;
    allSlices.push(...res.slices);
    errors.push(...res.errors);
  }

  const pipelineIntegrity = verifyPipelineIntegrityExports(rootDir, targets['doc_pipeline_source.jsx']);
  if (!pipelineIntegrity.ok) {
    errors.push(`check_pipeline_integrity export compatibility failed: missing=${pipelineIntegrity.missingInReassembled.length}, extra=${pipelineIntegrity.extraInReassembled.length}, danglingUi=${pipelineIntegrity.danglingUiCalls.length}, returnInCore=${pipelineIntegrity.returnInCore}, urlIssues=${pipelineIntegrity.runtimeUrlIssueCount}`);
  }

  const ok = (
    errors.length === 0 &&
    allSlices.length === 9 &&
    allSlices.every((s) => s.astBoundaryValid) &&
    Object.values(targets).every((t) => t.byteIdentical && t.gapCount === 0 && t.overlapCount === 0) &&
    pipelineIntegrity.ok
  );

  return {
    ok,
    rootDir,
    sliceCount: allSlices.length,
    targets,
    pipelineIntegrity,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Test-anchor impact scanner across tests/*.test.*
// ---------------------------------------------------------------------------

/**
 * Fast, dependency-free JS scanner that strips comments (preserving string and
 * template literals) and collects string literals with their start index in
 * code-only text so comment-only mentions are never misclassified.
 */
function lexJsCodeAndStrings(source) {
  const len = source.length;
  let codeOut = '';
  const strings = [];
  let i = 0;

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    // Line comment
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i++;
      if (i < len) { codeOut += '\n'; i++; }
      continue;
    }
    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') codeOut += '\n';
        i++;
      }
      i += 2;
      codeOut += ' ';
      continue;
    }
    // Single or double quoted string
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const codePos = codeOut.length;
      let raw = quote;
      let val = '';
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) {
          const esc = source[i + 1];
          raw += '\\' + esc;
          if (esc === 'n') val += '\n';
          else if (esc === 'r') val += '\r';
          else if (esc === 't') val += '\t';
          else val += esc;
          i += 2;
          continue;
        }
        if (source[i] === '\n') break; // malformed/unterminated
        raw += source[i];
        val += source[i];
        i++;
      }
      if (i < len && source[i] === quote) {
        raw += quote;
        i++;
      }
      codeOut += raw;
      strings.push({ value: val, codePos, quote });
      continue;
    }
    // Template literal (collect static chunks)
    if (ch === '`') {
      const codePos = codeOut.length;
      let raw = '`';
      let chunk = '';
      i++;
      while (i < len && source[i] !== '`') {
        if (source[i] === '\\' && i + 1 < len) {
          const esc = source[i + 1];
          raw += '\\' + esc;
          if (esc === 'n') chunk += '\n';
          else if (esc === 'r') chunk += '\r';
          else if (esc === 't') chunk += '\t';
          else chunk += esc;
          i += 2;
          continue;
        }
        if (source[i] === '$' && source[i + 1] === '{') {
          if (chunk.length) strings.push({ value: chunk, codePos, quote: '`' });
          chunk = '';
          raw += '${';
          i += 2;
          // Copy expression until balanced '}' (shallow)
          let depth = 1;
          while (i < len && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') depth--;
            raw += source[i];
            i++;
          }
          continue;
        }
        raw += source[i];
        chunk += source[i];
        i++;
      }
      if (i < len && source[i] === '`') {
        raw += '`';
        i++;
      }
      if (chunk.length) strings.push({ value: chunk, codePos, quote: '`' });
      codeOut += raw;
      continue;
    }

    codeOut += ch;
    i++;
  }

  return { code: codeOut, strings };
}

function lineNumberAtCharOffset(lineCharStarts, charOffset) {
  let lo = 0;
  let hi = lineCharStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineCharStarts[mid] <= charOffset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function walkTestFiles(rootDir) {
  const testsDir = path.join(rootDir, 'tests');
  if (!fs.existsSync(testsDir)) return [];
  const skipDirs = new Set([
    'node_modules',
    '__snapshots__',
    '__baselines__',
    '__pycache__',
    'fixtures',
    'browser-fixtures',
  ]);
  const out = [];
  const visit = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (skipDirs.has(ent.name) || /^(discovery|vacuous)_fixture_/.test(ent.name)) continue;
        visit(full);
      } else if (/\.test\.[cm]?[jt]sx?$/.test(ent.name)) {
        out.push(full);
      }
    }
  };
  visit(testsDir);
  out.sort();
  return out;
}

function scanSupportHelpers(rootDir) {
  const dirs = ['tests/helpers', 'tests/lib', 'tests/extracted_logic'];
  const hits = [];
  for (const relDir of dirs) {
    const absDir = path.join(rootDir, relDir);
    if (!fs.existsSync(absDir)) continue;
    for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (!ent.isFile()) continue;
      const full = path.join(absDir, ent.name);
      const txt = fs.readFileSync(full, 'utf8');
      if (!txt.includes('doc_pipeline_source.jsx') && !txt.includes('view_pdf_audit_source.jsx')) continue;
      const { code } = lexJsCodeAndStrings(txt);
      const targets = [];
      if (code.includes('doc_pipeline_source.jsx')) targets.push('doc_pipeline_source.jsx');
      if (code.includes('view_pdf_audit_source.jsx')) targets.push('view_pdf_audit_source.jsx');
      if (targets.length === 0) continue;
      hits.push({
        file: path.relative(rootDir, full).replace(/\\/g, '/'),
        targets,
      });
    }
  }
  return hits;
}

// Patterns directly before a string literal that indicate an explicit anchor/slice lookup or source pin
const EXPLICIT_ANCHOR_CALL_RE = /\b(?:indexOf|lastIndexOf|includes|toContain|toMatch|match|search|indexOfOrThrow|sliceBetween|sliceTopLevelBlock|region|between|arrow|extractFunction|extractConst|extractDecl|getDecl|findAnchor|anchor|sliceFrom|sliceUntil|sliceAfter|fn)\s*\([^()]{0,120}$/;

const CODE_LIKE_ANCHOR_RE = /\b(?:function|const|let|var|async|return|window\.AlloModules)\b|=>|\/\/\s*──|\b_(?:allo|stage|view|pdf|doc|altFmt|htmlTo|build|odt|brf|narration|restyle|audit|ocr|ooxml|docx|pptx|batch|gemini|pipe|theme|honest|subset|attach|neutralize|waitAudit|runWcag|ensure|apply|fix|extract|generate|parse|create|detect|restore|retarget|reconcile|validate|sanitize|clamp|check|collect|strip|listify|propose|rewrap|collapse|redact|suppress|route|table|diff)[A-Za-z0-9_]*/;

function classifyTestAnchors(code, strings, targetAudit) {
  const { rawSrc, lineCharStarts, symbolTable, segmentForLine } = targetAudit._internal;
  const matchedAnchors = [];
  const seenKey = new Set();
  const checkedSubstrings = new Set();

  const recordMatch = (anchor, line, seg, via) => {
    const key = `${seg.id}:${line}:${anchor.slice(0, 40)}`;
    if (seenKey.has(key)) return;
    seenKey.add(key);
    matchedAnchors.push({
      anchor: anchor.length > 80 ? anchor.slice(0, 77) + '...' : anchor,
      line,
      segmentKind: seg.kind,
      segmentId: seg.id,
      via,
    });
  };

  for (const s of strings) {
    const val = s.value;
    if (!val || val.length < 4) continue;
    if (val === 'doc_pipeline_source.jsx' || val === 'view_pdf_audit_source.jsx') continue;
    if (val === 'utf8' || val === 'utf-8') continue;

    const prefix = code.slice(Math.max(0, s.codePos - 140), s.codePos);
    const isExplicitCall = EXPLICIT_ANCHOR_CALL_RE.test(prefix);

    // 1. Exact AST symbol match (e.g. arrow('_alignCallsToRuns') or symbol name in anchor call / identifier ref)
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(val) && symbolTable.has(val)) {
      if (isExplicitCall || val.length >= 10 || val.startsWith('_')) {
        const sym = symbolTable.get(val);
        const seg = segmentForLine(sym.line);
        if (seg) {
          recordMatch(val, sym.line, seg, isExplicitCall ? 'explicit_symbol' : 'symbol_literal');
          continue;
        }
      }
    }

    // 2. Verbatim substring anchor in the target monolith
    const minLen = isExplicitCall ? 6 : 14;
    if (val.length >= minLen && val.length <= 240 && (isExplicitCall || CODE_LIKE_ANCHOR_RE.test(val))) {
      if (checkedSubstrings.has(val)) continue;
      checkedSubstrings.add(val);
      const idx = rawSrc.indexOf(val);
      if (idx >= 0) {
        const line = lineNumberAtCharOffset(lineCharStarts, idx);
        const seg = segmentForLine(line);
        if (seg) {
          recordMatch(val, line, seg, isExplicitCall ? 'explicit_substring' : 'code_substring');
        }
      }
    }
  }

  // 3. Regex literals referencing declared symbol names (e.g. /const _foo = .../.exec(src))
  const regexRe = /\/((?:\\.|[^/\\\r\n]){6,160})\/[gimsuy]*/g;
  let rm;
  while ((rm = regexRe.exec(code)) !== null) {
    const body = rm[1];
    const idRe = /\b([A-Za-z_$][A-Za-z0-9_$]{5,})\b/g;
    let im;
    while ((im = idRe.exec(body)) !== null) {
      const symName = im[1];
      if (!symbolTable.has(symName)) continue;
      const sym = symbolTable.get(symName);
      const seg = segmentForLine(sym.line);
      if (seg) {
        recordMatch(`/${body.slice(0, 60)}/ -> ${symName}`, sym.line, seg, 'regex_symbol');
      }
    }
  }

  const touchedSlices = [...new Set(matchedAnchors.filter((a) => a.segmentKind === 'slice').map((a) => a.segmentId))].sort();
  const touchesCore = matchedAnchors.some((a) => a.segmentKind === 'core');

  return {
    anchorCount: matchedAnchors.length,
    touchedSlices,
    touchesCore,
    sampleAnchors: matchedAnchors.slice(0, 6),
  };
}

function scanTestImpact(options = {}) {
  const rootDir = options.rootDir || DEFAULT_ROOT;
  const seamAudit = options.seamAudit || auditSeams({ rootDir });
  const testFiles = walkTestFiles(rootDir);
  const supportHelpers = scanSupportHelpers(rootDir);

  const inventory = [];
  let commentOnlyCount = 0;
  const byReaderKind = { host_source: 0, raw_fs: 0 };
  const byTarget = { doc_pipeline_source: 0, view_pdf_audit_source: 0, both: 0 };
  const rawFsImpact = { touches_moved_slices: 0, core_only: 0, unclassified_dynamic: 0 };
  const bySlice = {};

  for (const specs of Object.values(PROPOSED_SLICE_SPECS)) {
    for (const s of specs) bySlice[s.id] = 0;
  }

  for (const absFile of testFiles) {
    const raw = fs.readFileSync(absFile, 'utf8');
    if (!raw.includes('doc_pipeline_source.jsx') && !raw.includes('view_pdf_audit_source.jsx')) {
      continue;
    }

    const relFile = path.relative(rootDir, absFile).replace(/\\/g, '/');
    const { code, strings } = lexJsCodeAndStrings(raw);
    const readsDoc = code.includes('doc_pipeline_source.jsx');
    const readsView = code.includes('view_pdf_audit_source.jsx');

    if (!readsDoc && !readsView) {
      commentOnlyCount++;
      inventory.push({
        file: relFile,
        readerKind: 'comment_only',
        targets: [],
        impact: 'comment_only',
        touchedSlices: [],
        touchesCore: false,
        anchorCount: 0,
        sampleAnchors: [],
      });
      continue;
    }

    const targets = [];
    if (readsDoc) targets.push('doc_pipeline_source.jsx');
    if (readsView) targets.push('view_pdf_audit_source.jsx');

    const importsHostSource = /helpers\/host_source/.test(code);
    const hasFsImportOrCall = /from\s+['"](?:node:)?fs(?:\/promises)?['"]|require\s*\(\s*['"](?:node:)?fs(?:\/promises)?['"]\s*\)|import\s*\(\s*['"](?:node:)?fs(?:\/promises)?['"]\s*\)|\bfs\.readFileSync\s*\(/.test(code);
    const hasGenericReadCall = /\breadFileSync\s*\(|\breadFile\s*\(/.test(code);
    if (!importsHostSource && !hasFsImportOrCall && !hasGenericReadCall) {
      commentOnlyCount++;
      inventory.push({
        file: relFile,
        readerKind: 'non_reader_reference',
        targets,
        impact: 'non_reader_reference',
        touchedSlices: [],
        touchesCore: false,
        anchorCount: 0,
        sampleAnchors: [],
      });
      continue;
    }

    if (readsDoc && readsView) byTarget.both++;
    else if (readsDoc) byTarget.doc_pipeline_source++;
    else byTarget.view_pdf_audit_source++;

    const readerKind = (importsHostSource && !hasFsImportOrCall) ? 'host_source' : 'raw_fs';
    byReaderKind[readerKind]++;

    const allTouchedSlices = new Set();
    let touchesCore = false;
    let totalAnchors = 0;
    const sampleAnchors = [];

    for (const targetFile of targets) {
      const targetAudit = seamAudit.targets[targetFile];
      if (!targetAudit) continue;
      const res = classifyTestAnchors(code, strings, targetAudit);
      totalAnchors += res.anchorCount;
      if (res.touchesCore) touchesCore = true;
      for (const sl of res.touchedSlices) allTouchedSlices.add(sl);
      for (const sample of res.sampleAnchors) {
        if (sampleAnchors.length < 6) sampleAnchors.push(sample);
      }
    }

    const touchedSlices = [...allTouchedSlices].sort();
    let impact;
    if (readerKind === 'host_source') {
      impact = 'safe_via_host_source';
    } else if (touchedSlices.length > 0) {
      impact = 'touches_moved_slices';
      rawFsImpact.touches_moved_slices++;
      for (const sl of touchedSlices) {
        bySlice[sl] = (bySlice[sl] || 0) + 1;
      }
    } else if (touchesCore) {
      impact = 'core_only';
      rawFsImpact.core_only++;
    } else {
      impact = 'unclassified_dynamic';
      rawFsImpact.unclassified_dynamic++;
    }

    inventory.push({
      file: relFile,
      readerKind,
      targets,
      impact,
      touchedSlices,
      touchesCore,
      anchorCount: totalAnchors,
      sampleAnchors,
    });
  }

  return {
    totalTestFilesScanned: testFiles.length,
    referencingMonoliths: inventory.length,
    commentOnlyCount,
    readersTotal: byReaderKind.host_source + byReaderKind.raw_fs,
    byReaderKind,
    byTarget,
    rawFsImpact,
    bySlice,
    supportHelpersReadingMonoliths: supportHelpers,
    tests: inventory,
  };
}

// ---------------------------------------------------------------------------
// Phase 2 cutover parity verifier (--check-parity)
// ---------------------------------------------------------------------------

function transformJsxWithEsbuild(rootDir, entry) {
  // Inside jsdom-based test runners (Vitest default setup), jsdom's Uint8Array realm
  // breaks esbuild's JS API invariant check. Use the JS API in pure Node and fall back
  // to the local esbuild binary over stdio when running inside a mismatched realm.
  const canUseEsbuildApi = (new TextEncoder().encode('') instanceof Uint8Array);
  if (canUseEsbuildApi) {
    const esbuild = require('esbuild');
    const res = esbuild.transformSync(entry, {
      loader: 'jsx',
      format: 'esm',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'es2020',
      sourcefile: 'view_pdf_audit_source.jsx',
    });
    return { code: res.code, warnings: res.warnings || [] };
  }
  const esbuildBin = path.join(
    rootDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild'
  );
  const args = [
    '--loader=jsx',
    '--format=esm',
    '--jsx=transform',
    '--jsx-factory=React.createElement',
    '--jsx-fragment=React.Fragment',
    '--target=es2020',
    '--sourcefile=view_pdf_audit_source.jsx',
  ];
  const code = process.platform === 'win32'
    ? execFileSync('cmd.exe', ['/c', esbuildBin, ...args], {
        cwd: rootDir,
        input: entry,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      })
    : execFileSync(esbuildBin, args, {
        cwd: rootDir,
        input: entry,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
  return { code, warnings: [] };
}

function compileAndVerifyAssembledSources({ rootDir, docSource, viewSource }) {
  const { wrapSimpleIife } = require(path.join(rootDir, '_build_simple_iife_module.js'));

  const checks = {
    docPipeline: { ok: false, errors: [] },
    viewPdfAudit: { ok: false, errors: [] },
  };

  // 1. Verify doc_pipeline assembled source compiles via wrapSimpleIife + vm.Script + integrity exports
  try {
    const reviewHelpers = fs.readFileSync(path.join(rootDir, 'remediation_review_helpers.js'), 'utf8');
    const wrappedDoc = wrapSimpleIife({
      source: docSource,
      guardKey: 'DocPipelineModule',
      footer: reviewHelpers,
    });
    new Script(wrappedDoc, { filename: 'doc_pipeline_module.js' });
    const exportsSet = checkPipelineIntegrity.exportsIn(docSource, 'doc_pipeline_source.jsx');
    const urlIssues = checkPipelineIntegrity.runtimeUrlIssues(docSource, 'doc_pipeline_source.jsx');
    checks.docPipeline = {
      ok: exportsSet.size > 0 && urlIssues.length === 0,
      sourceBytes: Buffer.byteLength(docSource, 'utf8'),
      wrappedBytes: Buffer.byteLength(wrappedDoc, 'utf8'),
      sha256: sha256String(docSource),
      exportCount: exportsSet.size,
      urlIssueCount: urlIssues.length,
      errors: urlIssues.length ? urlIssues.map((i) => `${i.code}@L${i.line}: ${i.message}`) : [],
    };
  } catch (err) {
    checks.docPipeline.errors.push(err && err.message ? err.message : String(err));
  }

  // 2. Verify view_pdf_audit assembled source compiles via esbuild (JSX transform) + vm.Script
  try {
    const reviewHelpers = fs.readFileSync(path.join(rootDir, 'remediation_review_helpers.js'), 'utf8');
    const workspaceCss = fs.readFileSync(path.join(rootDir, 'remediation_workspace.css'), 'utf8');
    const workspaceComp = fs.readFileSync(path.join(rootDir, 'remediation_workspace_component.jsx'), 'utf8');
    const batchComp = fs.readFileSync(path.join(rootDir, 'remediation_batch_workspace.jsx'), 'utf8');
    const reviewComp = fs.readFileSync(path.join(rootDir, 'remediation_review_component.jsx'), 'utf8');

    const entry = [
      '/* global React */',
      `const _PDF_WORKSPACE_CSS = ${JSON.stringify(workspaceCss)};`,
      workspaceComp,
      batchComp,
      reviewComp,
      viewSource,
    ].join('\n');

    const transformed = transformJsxWithEsbuild(rootDir, entry);

    const compiled = transformed.code.replace(/\/\*.*global.*\*\/\n/g, '').trim();
    const wrappedView = `(function(){\n'use strict';\n${reviewHelpers}\n${compiled}\n})();\n`;
    new Script(wrappedView, { filename: 'view_pdf_audit_module.js' });

    checks.viewPdfAudit = {
      ok: true,
      sourceBytes: Buffer.byteLength(viewSource, 'utf8'),
      compiledBytes: Buffer.byteLength(wrappedView, 'utf8'),
      sha256: sha256String(viewSource),
      warningCount: (transformed.warnings || []).length,
      errors: [],
    };
  } catch (err) {
    checks.viewPdfAudit.errors.push(err && err.message ? err.message : String(err));
  }

  return {
    ok: checks.docPipeline.ok && checks.viewPdfAudit.ok,
    checks,
  };
}

function checkParity(options = {}) {
  const rootDir = options.rootDir || DEFAULT_ROOT;
  const manifestPath = options.manifestPath || path.join(rootDir, 'remediation_modules', 'manifest.cjs');

  if (!fs.existsSync(manifestPath)) {
    return {
      ok: true,
      skipped: true,
      manifestExists: false,
      manifestPath: path.relative(rootDir, manifestPath).replace(/\\/g, '/'),
      message: 'remediation_modules/manifest.cjs does not exist yet (Phase 1 pre-cutover state). Skipping manifest parity check.',
    };
  }

  const manifest = require(manifestPath);
  if (typeof manifest.assembleDocPipelineSource !== 'function' || typeof manifest.assembleViewPdfAuditSource !== 'function') {
    return {
      ok: false,
      skipped: false,
      manifestExists: true,
      manifestPath: path.relative(rootDir, manifestPath).replace(/\\/g, '/'),
      error: 'remediation_modules/manifest.cjs must export assembleDocPipelineSource() and assembleViewPdfAuditSource()',
    };
  }

  const docSource = manifest.assembleDocPipelineSource();
  const viewSource = manifest.assembleViewPdfAuditSource();
  const compileResult = compileAndVerifyAssembledSources({ rootDir, docSource, viewSource });

  // Also compare against live monoliths if they still exist in the repo
  const liveParity = {};
  for (const [file, assembled] of [
    ['doc_pipeline_source.jsx', docSource],
    ['view_pdf_audit_source.jsx', viewSource],
  ]) {
    const abs = path.join(rootDir, file);
    if (fs.existsSync(abs)) {
      const liveSha = sha256Buffer(fs.readFileSync(abs));
      const assembledSha = sha256String(assembled);
      liveParity[file] = {
        liveExists: true,
        byteIdenticalToLive: liveSha === assembledSha,
        liveSha256: liveSha,
        assembledSha256: assembledSha,
      };
    } else {
      liveParity[file] = { liveExists: false };
    }
  }

  return {
    ok: compileResult.ok,
    skipped: false,
    manifestExists: true,
    manifestPath: path.relative(rootDir, manifestPath).replace(/\\/g, '/'),
    compileChecks: compileResult.checks,
    liveParity,
  };
}

/**
 * Helper to exercise the exact Phase 2 wrapSimpleIife / esbuild / vm.Script
 * compilation pipeline directly on dry-run reassembled sources (zero disk writes).
 */
function verifyDryRunCompileParity(options = {}) {
  const rootDir = options.rootDir || DEFAULT_ROOT;
  const seamAudit = options.seamAudit || auditSeams({ rootDir });
  return compileAndVerifyAssembledSources({
    rootDir,
    docSource: seamAudit.targets['doc_pipeline_source.jsx']._internal.reassembledSrc,
    viewSource: seamAudit.targets['view_pdf_audit_source.jsx']._internal.reassembledSrc,
  });
}

// ---------------------------------------------------------------------------
// Serialization & CLI formatting
// ---------------------------------------------------------------------------

function stripInternal(report) {
  const clone = JSON.parse(JSON.stringify(report, (key, value) => (key === '_internal' ? undefined : value)));
  return clone;
}

function printHumanSummary(fullReport) {
  if (fullReport.seamAudit) {
    const sa = fullReport.seamAudit;
    console.log('\n=== Remediation Modularization AST Seam Audit ===');
    console.log(`Status: ${sa.ok ? 'PASS' : 'FAIL'} (${sa.sliceCount} slices verified)`);
    for (const [targetFile, t] of Object.entries(sa.targets)) {
      console.log(`\n[${targetFile}] ${t.totalLines} lines (${t.totalBytes} bytes)`);
      console.log(`  Dry-run byte parity: ${t.byteIdentical ? '100% BYTE-IDENTICAL' : 'MISMATCH'} (sha256=${t.originalSha256.slice(0, 16)}...)`);
      console.log(`  Partition: ${t.slices.length} slices (${t.extractedLines} lines, ${t.extractedPercent}%) + ${t.coreLines} core lines | gaps=${t.gapCount}, overlaps=${t.overlapCount}`);
      for (const sl of t.slices) {
        const jsxTag = sl.containsJsx ? ' [JSX]' : '';
        console.log(`    - ${sl.id}: L${sl.startLine}-L${sl.endLine} (${sl.lineCount}L, ${sl.statementCount} stmts, ${sl.declaredSymbolCount} symbols)${jsxTag} [${sl.firstStatementName} .. ${sl.lastStatementName}]`);
      }
    }
    const pi = sa.pipelineIntegrity;
    console.log(`\n[check_pipeline_integrity.js compatibility] ${pi.ok ? 'PASS' : 'FAIL'}`);
    console.log(`  Exports: ${pi.reassembledExportCount}/${pi.originalExportCount} matched | UI calls: ${pi.uiCallCount} | dangling: ${pi.danglingUiCalls.length} | returnInCore: ${pi.returnInCore} (L${pi.returnStatementLine}) | urlIssues: ${pi.runtimeUrlIssueCount}`);
    if (sa.errors.length) {
      console.error('\nSeam audit errors:');
      for (const e of sa.errors) console.error('  - ' + e);
    }
  }

  if (fullReport.testImpact) {
    const ti = fullReport.testImpact;
    console.log('\n=== Test-Anchor Impact Inventory ===');
    console.log(`Scanned ${ti.totalTestFilesScanned} test files -> ${ti.referencingMonoliths} mention monoliths (${ti.readersTotal} active readers, ${ti.commentOnlyCount} comment-only mirrors)`);
    console.log(`  Readers by kind: host_source=${ti.byReaderKind.host_source} (auto-safe), raw_fs=${ti.byReaderKind.raw_fs}`);
    console.log(`  Readers by target: doc_pipeline=${ti.byTarget.doc_pipeline_source}, view_pdf_audit=${ti.byTarget.view_pdf_audit_source}, both=${ti.byTarget.both}`);
    console.log(`  raw_fs impact breakdown: touches_moved_slices=${ti.rawFsImpact.touches_moved_slices}, core_only=${ti.rawFsImpact.core_only}, unclassified_dynamic=${ti.rawFsImpact.unclassified_dynamic}`);
    console.log('  raw_fs tests touching each proposed slice:');
    for (const [sliceId, count] of Object.entries(ti.bySlice)) {
      console.log(`    - ${sliceId}: ${count}`);
    }
    if (ti.supportHelpersReadingMonoliths.length) {
      console.log('  Support helpers reading monoliths:');
      for (const h of ti.supportHelpersReadingMonoliths) {
        console.log(`    - ${h.file} (${h.targets.join(', ')})`);
      }
    }
  }

  if (fullReport.parityCheck) {
    const pc = fullReport.parityCheck;
    console.log('\n=== Phase 2 Cutover Parity Check ===');
    if (pc.skipped) {
      console.log(`Status: SKIPPED (${pc.message})`);
    } else {
      console.log(`Status: ${pc.ok ? 'PASS' : 'FAIL'} (${pc.manifestPath})`);
      if (pc.compileChecks) {
        console.log(`  doc_pipeline_module.js (wrapSimpleIife + vm.Script): ${pc.compileChecks.docPipeline.ok ? 'PASS' : 'FAIL'}`);
        console.log(`  view_pdf_audit_module.js (esbuild JSX + vm.Script): ${pc.compileChecks.viewPdfAudit.ok ? 'PASS' : 'FAIL'}`);
      }
    }
  }
}

function parseCliArgs(argv) {
  const args = {
    auditSeams: false,
    checkParity: false,
    jsonPath: null,
    rootDir: DEFAULT_ROOT,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--audit-seams') args.auditSeams = true;
    else if (a === '--check-parity') args.checkParity = true;
    else if (a === '--json') {
      args.jsonPath = argv[++i];
      if (!args.jsonPath) throw new Error('--json requires a file path (or "-" for stdout)');
    } else if (a === '--root') {
      args.rootDir = path.resolve(argv[++i]);
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: node dev-tools/verify_remediation_modularization.cjs [--audit-seams] [--check-parity] [--json <path>]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!args.auditSeams && !args.checkParity) {
    args.auditSeams = true;
  }
  return args;
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  const fullReport = {
    generatedAt: new Date().toISOString(),
    ok: true,
  };

  if (args.auditSeams) {
    const seamAudit = auditSeams({ rootDir: args.rootDir });
    const testImpact = scanTestImpact({ rootDir: args.rootDir, seamAudit });
    fullReport.seamAudit = seamAudit;
    fullReport.testImpact = testImpact;
    if (!seamAudit.ok) fullReport.ok = false;
  }

  if (args.checkParity) {
    const parityCheck = checkParity({ rootDir: args.rootDir });
    fullReport.parityCheck = parityCheck;
    if (!parityCheck.ok) fullReport.ok = false;
  }

  const serializable = stripInternal(fullReport);
  if (args.jsonPath) {
    const jsonText = JSON.stringify(serializable, null, 2) + '\n';
    if (args.jsonPath === '-') {
      process.stdout.write(jsonText);
    } else {
      const outAbs = path.resolve(args.jsonPath);
      fs.mkdirSync(path.dirname(outAbs), { recursive: true });
      fs.writeFileSync(outAbs, jsonText, 'utf8');
      printHumanSummary(serializable);
      console.log(`\nWrote JSON report to ${args.jsonPath}`);
    }
  } else {
    printHumanSummary(serializable);
  }

  return fullReport.ok ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exit(runCli());
  } catch (err) {
    console.error('[verify_remediation_modularization] Fatal error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

module.exports = {
  PROPOSED_SLICE_SPECS,
  parseSourceAst,
  auditSeams,
  scanTestImpact,
  checkParity,
  verifyDryRunCompileParity,
  stripInternal,
  runCli,
};
