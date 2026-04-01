#!/usr/bin/env node
/**
 * AlloFlow WCAG 2.1 AA Static Source Audit
 *
 * Scans all JS/JSX source files for known accessibility anti-patterns
 * identified in the March 2026 comprehensive audit.
 *
 * Usage: node static-audit.js [--fix-report] [--json] [--file path]
 */

const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = [
  '',                // project root (AlloFlowANTI.txt, modules)
  'stem_lab',
  'sel_hub',
  'prismflow-deploy/src',
];

const SCAN_EXTENSIONS = ['.js', '.jsx', '.txt'];

// Files to skip (compiled output, backups)
const SKIP_PATTERNS = [
  /node_modules/,
  /_archive/,
  /backup/i,
  /\.min\.js$/,
  /games_module\.js$/,       // compiled output; audit games_source.jsx instead
  /stem_lab_module\.js$/,    // too large for line-by-line; audited separately
];

// ── Anti-Pattern Definitions ───────────────────────────────────────────────

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
      const hasOutlineNone = /outline\s*:\s*['"]?none['"]?/.test(line) || /outline-none/.test(line);
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
      // Check if file has dynamic state (onClick, onChange, setState, upd()
      const hasDynamic = /onClick|onChange|setState|upd\(/.test(content);
      if (!hasDynamic) return false;
      // Check for aria-live or announceToSR
      const hasLive = /aria-live|announceToSR|role.*['"](?:status|alert|log)['"]/.test(content);
      return !hasLive;
    },
    fix: 'Add <div role="status" aria-live="polite" className="sr-only">{statusText}</div> and announce state changes.',
  },
  {
    id: 'CANVAS-001',
    name: 'Canvas element without text alternative',
    wcag: '1.1.1 Non-text Content',
    severity: 'critical',
    description: 'Canvas element lacks role and aria-label attributes',
    test(line, lineNum, lines) {
      const isCanvas = /h\(\s*['"]canvas['"]/.test(line) || /createElement\(\s*['"]canvas['"]/.test(line);
      if (!isCanvas) return false;
      // Check this line and next 5 lines for aria-label or role
      const context = lines.slice(lineNum - 1, lineNum + 5).join(' ');
      if (/aria-label/.test(context) && /role/.test(context)) return false;
      return true;
    },
    fix: 'Add role="img" (or "application" if interactive) and a descriptive aria-label.',
  },
  {
    id: 'SVG-001',
    name: 'SVG element without accessible name',
    wcag: '1.1.1 Non-text Content',
    severity: 'major',
    description: 'SVG element lacks role="img" and aria-label',
    test(line, lineNum, lines) {
      const isSvg = /h\(\s*['"]svg['"]/.test(line) || /createElement\(\s*['"]svg['"]/.test(line);
      if (!isSvg) return false;
      const context = lines.slice(lineNum - 1, lineNum + 4).join(' ');
      if (/aria-label/.test(context)) return false;
      if (/role\s*[:=]\s*['"]img['"]/.test(context)) return false;
      // Decorative SVGs inside buttons with labels are okay
      if (/aria-hidden/.test(context)) return false;
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
      // Skip hidden inputs
      if (/type\s*[:=]\s*['"]hidden['"]/.test(line)) return false;
      // Check this line and next 3 for label association
      const context = lines.slice(lineNum - 1, lineNum + 3).join(' ');
      if (/aria-label/.test(context)) return false;
      if (/aria-labelledby/.test(context)) return false;
      if (/id\s*[:=]/.test(context)) return false; // might have htmlFor association
      // Check 2 lines above for wrapping <label>
      const above = lines.slice(Math.max(0, lineNum - 3), lineNum).join(' ');
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
      // Look for tab-switching patterns
      const hasTabPattern = /activeTab|setTab|tab\s*===|\.tab\b/.test(content);
      if (!hasTabPattern) return false;
      // Check if proper ARIA is used
      const hasTabRole = /role\s*[:=]\s*['"]tablist['"]/.test(content);
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
    id: 'CONFIRM-001',
    name: 'window.confirm() for data operations',
    wcag: '3.3.4 Error Prevention',
    severity: 'major',
    description: 'Native confirm() dialog used for data-destructive actions; inaccessible with some screen readers',
    test(line) {
      return /\bconfirm\s*\(/.test(line) && !/\/\//.test(line.split('confirm')[0]);
    },
    fix: 'Replace with custom accessible modal with focus management.',
  },
  {
    id: 'MOTION-001',
    name: 'animate-pulse without reduced-motion check',
    wcag: '2.3.1 Three Flashes',
    severity: 'major',
    description: 'CSS animation used without prefers-reduced-motion or useReducedMotion() gate',
    test(line, lineNum, lines) {
      if (!/animate-pulse|animate-bounce|animate-spin/.test(line)) return false;
      // Check surrounding context for reduced motion check
      const context = lines.slice(Math.max(0, lineNum - 5), lineNum + 2).join(' ');
      if (/useReducedMotion|prefers-reduced-motion|reducedMotion/.test(context)) return false;
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
      // Look for countdown timer patterns
      const hasTimer = /setInterval|countdown|timeRemaining|timerActive|timeLeft/.test(content);
      if (!hasTimer) return false;
      // Check for pause mechanism
      const hasPause = /pause|pauseTimer|isPaused|togglePause|pauseProbe/.test(content);
      return !hasPause;
    },
    fix: 'Add Pause/Resume button and teacher-configurable extended time option.',
  },
  {
    id: 'DIALOG-001',
    name: 'Modal overlay without dialog semantics',
    wcag: '4.1.2 Name/Role/Value, 2.4.3 Focus Order',
    severity: 'major',
    description: 'Fixed overlay div lacks role="dialog", aria-modal, and focus trap',
    test(line, lineNum, lines) {
      const isOverlay = /fixed\s+inset-0|position\s*:\s*['"]?fixed/.test(line) &&
                        /z-?\[?\d{3,}|z-50|z-\[999/.test(line);
      if (!isOverlay) return false;
      const context = lines.slice(lineNum - 1, lineNum + 5).join(' ');
      if (/role\s*[:=]\s*['"]dialog['"]/.test(context)) return false;
      return true;
    },
    fix: 'Add role="dialog", aria-modal="true", aria-labelledby, focus trap, and Escape key handler.',
  },
  {
    id: 'DRAGDROP-001',
    name: 'Drag-and-drop without keyboard alternative',
    wcag: '2.1.1 Keyboard',
    severity: 'major',
    description: 'Draggable interaction with no keyboard-based movement alternative',
    test(line, lineNum, lines) {
      if (!/draggable\s*[:=]\s*['"]?true|onDragStart|onMouseDown.*drag/i.test(line)) return false;
      const context = lines.slice(lineNum - 1, lineNum + 10).join(' ');
      if (/onKeyDown|ArrowUp|ArrowDown|keyboard/.test(context)) return false;
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
    test(line) {
      const isTh = /h\(\s*['"]th['"]/.test(line) || /createElement\(\s*['"]th['"]/.test(line);
      if (!isTh) return false;
      return !/scope/.test(line);
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
      if (!SCAN_EXTENSIONS.some(ext => entry.endsWith(ext))) continue;
      if (SKIP_PATTERNS.some(pat => pat.test(full))) continue;
      files.push(full);
    }
  }
  return files;
}

// ── Scanner ────────────────────────────────────────────────────────────────

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' });
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

// ── Report Generation ──────────────────────────────────────────────────────

function generateReport(allFindings, outputJson) {
  const bySeverity = { critical: [], major: [], minor: [] };
  const byCheck = {};
  const byFile = {};

  for (const f of allFindings) {
    bySeverity[f.severity].push(f);
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
        critical: bySeverity.critical.length,
        major: bySeverity.major.length,
        minor: bySeverity.minor.length,
        filesScanned: Object.keys(byFile).length,
        checksRun: CHECKS.length,
      },
      byCheck: Object.entries(byCheck).map(([id, findings]) => ({
        checkId: id,
        name: findings[0].name,
        wcag: findings[0].wcag,
        severity: findings[0].severity,
        count: findings.length,
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
  console.log('  ALLOFLOW WCAG 2.1 AA STATIC AUDIT REPORT');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(72));

  console.log(`\n  Files scanned:  ${Object.keys(byFile).length}`);
  console.log(`  Checks run:     ${CHECKS.length}`);
  console.log(`  Total findings: ${allFindings.length}`);
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
    console.log(`  Instances: ${findings.length} across ${files.length} file(s)`);
    console.log(`  Fix: ${findings[0].fix}`);
    // Show up to 5 example locations
    const examples = findings.slice(0, 5);
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

  // Compliance score
  const maxScore = 100;
  const penalty = bySeverity.critical.length * 5 + bySeverity.major.length * 2 + bySeverity.minor.length * 0.5;
  const score = Math.max(0, Math.round(maxScore - penalty));
  console.log('\n' + '-'.repeat(72));
  console.log(`  ESTIMATED COMPLIANCE SCORE: ${score}/100`);
  if (score >= 90) console.log('  Status: NEAR COMPLIANT -- minor issues remain');
  else if (score >= 70) console.log('  Status: PARTIAL COMPLIANCE -- major gaps exist');
  else if (score >= 50) console.log('  Status: NON-COMPLIANT -- significant remediation needed');
  else console.log('  Status: NON-COMPLIANT -- critical barriers present');
  console.log('  (Automated scan only; manual testing required for full assessment)');
  console.log('='.repeat(72) + '\n');
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const fileIdx = args.indexOf('--file');
  const singleFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

  console.log('AlloFlow WCAG 2.1 AA Static Audit');
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

  generateReport(allFindings, outputJson);
}

main();
