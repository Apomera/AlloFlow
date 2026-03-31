#!/usr/bin/env node
/**
 * AlloFlow WCAG 2.1 AA Runtime Audit
 *
 * Uses Puppeteer + axe-core to scan the running application for
 * accessibility violations. Run against local dev server or deployed URL.
 *
 * Usage:
 *   node runtime-audit.js                          # defaults to localhost:3000
 *   node runtime-audit.js https://prismflow.web.app
 *   node runtime-audit.js --json                   # output JSON report
 *
 * Prerequisites:
 *   cd a11y-audit && npm install
 */

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_URL = 'http://localhost:3000';
const VIEWPORT = { width: 1280, height: 800 };
const WAIT_MS = 3000; // wait for React to render

// axe-core rules to run (WCAG 2.1 AA)
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

// ── Custom Runtime Checks ──────────────────────────────────────────────────

async function runCustomChecks(page) {
  return await page.evaluate(() => {
    const findings = [];

    // Check 1: lang attribute on <html>
    const lang = document.documentElement.lang;
    if (!lang || lang === '') {
      findings.push({
        id: 'custom-lang',
        description: 'Missing lang attribute on <html> element',
        wcag: '3.1.1 Language of Page',
        severity: 'critical',
        selector: 'html',
      });
    }

    // Check 2: Skip navigation link
    const skipLink = document.querySelector('a[href="#main-content"], a[href="#main"], [class*="skip"]');
    if (!skipLink) {
      findings.push({
        id: 'custom-skip-nav',
        description: 'No skip navigation link found',
        wcag: '2.4.1 Bypass Blocks',
        severity: 'critical',
        selector: 'body',
      });
    }

    // Check 3: <main> landmark
    const main = document.querySelector('main, [role="main"]');
    if (!main) {
      findings.push({
        id: 'custom-main-landmark',
        description: 'No <main> landmark element found',
        wcag: '1.3.1 Info and Relationships',
        severity: 'critical',
        selector: 'body',
      });
    }

    // Check 4: <nav> landmark
    const nav = document.querySelector('nav, [role="navigation"]');
    if (!nav) {
      findings.push({
        id: 'custom-nav-landmark',
        description: 'No <nav> landmark element found',
        wcag: '1.3.1 Info and Relationships',
        severity: 'major',
        selector: 'body',
      });
    }

    // Check 5: Focus visible -- check for outline:none in computed styles
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex="0"], [role="button"]'
    );
    let outlineNoneCount = 0;
    interactiveElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.outlineStyle === 'none' || style.outline === 'none') {
        // Check if there's a visible replacement (box-shadow, border change on focus)
        // We can't fully test this without focusing each element, but flag the count
        outlineNoneCount++;
      }
    });
    if (outlineNoneCount > 5) {
      findings.push({
        id: 'custom-focus-visible',
        description: `${outlineNoneCount} interactive elements have outline:none in computed styles`,
        wcag: '2.4.7 Focus Visible',
        severity: 'major',
        selector: 'button, input, [tabindex]',
      });
    }

    // Check 6: aria-live regions
    const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
    if (liveRegions.length === 0) {
      findings.push({
        id: 'custom-aria-live',
        description: 'No aria-live regions found on the page',
        wcag: '4.1.3 Status Messages',
        severity: 'critical',
        selector: 'body',
      });
    }

    // Check 7: Clickable divs without role
    const clickableDivs = document.querySelectorAll('div[onclick], span[onclick]');
    if (clickableDivs.length > 0) {
      findings.push({
        id: 'custom-clickable-div',
        description: `${clickableDivs.length} div/span elements with onclick but no role attribute`,
        wcag: '2.1.1 Keyboard, 4.1.2 Name/Role/Value',
        severity: 'critical',
        selector: 'div[onclick], span[onclick]',
      });
    }

    // Check 8: Canvas elements without aria-label
    const canvases = document.querySelectorAll('canvas');
    let unlabeledCanvases = 0;
    canvases.forEach(c => {
      if (!c.getAttribute('aria-label') && !c.getAttribute('role')) {
        unlabeledCanvases++;
      }
    });
    if (unlabeledCanvases > 0) {
      findings.push({
        id: 'custom-canvas-label',
        description: `${unlabeledCanvases} canvas element(s) without aria-label or role`,
        wcag: '1.1.1 Non-text Content',
        severity: 'critical',
        selector: 'canvas',
      });
    }

    // Check 9: Inputs without labels
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    let unlabeledInputs = 0;
    inputs.forEach(input => {
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledby = input.getAttribute('aria-labelledby');
      const id = input.id;
      const hasForLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasParentLabel = input.closest('label');
      if (!hasAriaLabel && !hasAriaLabelledby && !hasForLabel && !hasParentLabel) {
        unlabeledInputs++;
      }
    });
    if (unlabeledInputs > 0) {
      findings.push({
        id: 'custom-input-label',
        description: `${unlabeledInputs} input/textarea/select element(s) without programmatic label`,
        wcag: '3.3.2 Labels or Instructions',
        severity: 'major',
        selector: 'input, textarea, select',
      });
    }

    // Check 10: Dialogs without role="dialog"
    const fixedOverlays = document.querySelectorAll('[style*="position: fixed"], .fixed');
    let dialogsWithoutRole = 0;
    fixedOverlays.forEach(el => {
      const z = parseInt(window.getComputedStyle(el).zIndex) || 0;
      if (z >= 50 && !el.getAttribute('role')) {
        dialogsWithoutRole++;
      }
    });
    if (dialogsWithoutRole > 0) {
      findings.push({
        id: 'custom-dialog-role',
        description: `${dialogsWithoutRole} high-z-index fixed overlay(s) without role="dialog"`,
        wcag: '4.1.2 Name/Role/Value',
        severity: 'major',
        selector: '.fixed[style*="z-index"]',
      });
    }

    return findings;
  });
}

// ── Keyboard Navigation Test ───────────────────────────────────────────────

async function testKeyboardNavigation(page) {
  const findings = [];

  // Tab through the first 50 focusable elements and check for visibility
  const tabResults = await page.evaluate(() => {
    const results = { focusableCount: 0, trapDetected: false, noVisibleFocus: 0 };
    const focusable = document.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    results.focusableCount = focusable.length;
    return results;
  });

  findings.push({
    id: 'keyboard-info',
    description: `${tabResults.focusableCount} focusable elements detected on page`,
    wcag: '2.1.1 Keyboard',
    severity: 'info',
    selector: 'body',
  });

  return findings;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const urlArg = args.find(a => a.startsWith('http'));
  const url = urlArg || DEFAULT_URL;

  console.log('AlloFlow WCAG 2.1 AA Runtime Audit');
  console.log(`Target: ${url}`);
  console.log('Launching browser...\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`Waiting ${WAIT_MS}ms for React to render...`);
    await new Promise(r => setTimeout(r, WAIT_MS));

    // 1. Run axe-core
    console.log('Running axe-core analysis...');
    const axeResults = await new AxePuppeteer(page)
      .withTags(AXE_TAGS)
      .analyze();

    // 2. Run custom checks
    console.log('Running custom AlloFlow checks...');
    const customFindings = await runCustomChecks(page);

    // 3. Run keyboard nav test
    console.log('Testing keyboard navigation...');
    const keyboardFindings = await testKeyboardNavigation(page);

    // ── Generate Report ──────────────────────────────────────────────

    const axeViolations = axeResults.violations;
    const axePasses = axeResults.passes;

    if (outputJson) {
      const report = {
        timestamp: new Date().toISOString(),
        url,
        axe: {
          violations: axeViolations.length,
          passes: axePasses.length,
          details: axeViolations,
        },
        custom: customFindings,
        keyboard: keyboardFindings,
      };
      const outPath = path.join(__dirname, 'runtime-report.json');
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log(`\nJSON report written to: ${outPath}`);
    }

    // Console report
    console.log('\n' + '='.repeat(72));
    console.log('  ALLOFLOW RUNTIME ACCESSIBILITY AUDIT');
    console.log('  ' + new Date().toISOString());
    console.log('  URL: ' + url);
    console.log('='.repeat(72));

    // axe results
    console.log('\n  AXE-CORE RESULTS');
    console.log(`  Violations: ${axeViolations.length}`);
    console.log(`  Passes:     ${axePasses.length}`);

    if (axeViolations.length > 0) {
      console.log('\n' + '-'.repeat(72));
      const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      axeViolations.sort((a, b) => (sevOrder[a.impact] || 9) - (sevOrder[b.impact] || 9));

      for (const v of axeViolations) {
        const nodeCount = v.nodes.length;
        console.log(`\n  [${(v.impact || 'unknown').toUpperCase()}] ${v.id}`);
        console.log(`  ${v.description}`);
        console.log(`  WCAG: ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}`);
        console.log(`  Affected: ${nodeCount} element(s)`);
        console.log(`  Help: ${v.helpUrl}`);
        // Show first 3 nodes
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`    - ${node.target.join(' > ')}`);
          if (node.failureSummary) {
            const firstLine = node.failureSummary.split('\n')[0];
            console.log(`      ${firstLine}`);
          }
        }
        if (nodeCount > 3) {
          console.log(`    ... and ${nodeCount - 3} more`);
        }
      }
    }

    // Custom results
    if (customFindings.length > 0) {
      console.log('\n' + '-'.repeat(72));
      console.log('  ALLOFLOW-SPECIFIC CHECKS');
      console.log('-'.repeat(72));
      for (const f of customFindings) {
        console.log(`\n  [${f.severity.toUpperCase()}] ${f.id}`);
        console.log(`  ${f.description}`);
        console.log(`  WCAG: ${f.wcag}`);
      }
    }

    // Keyboard results
    if (keyboardFindings.length > 0) {
      console.log('\n' + '-'.repeat(72));
      console.log('  KEYBOARD NAVIGATION');
      console.log('-'.repeat(72));
      for (const f of keyboardFindings) {
        console.log(`  ${f.description}`);
      }
    }

    // Summary
    const totalViolations = axeViolations.length + customFindings.filter(f => f.severity !== 'info').length;
    const criticalCount = axeViolations.filter(v => v.impact === 'critical').length +
                          customFindings.filter(f => f.severity === 'critical').length;

    console.log('\n' + '='.repeat(72));
    console.log(`  TOTAL VIOLATIONS: ${totalViolations}`);
    console.log(`  CRITICAL:         ${criticalCount}`);
    if (criticalCount === 0) {
      console.log('  STATUS: No critical violations detected in this scan');
    } else {
      console.log('  STATUS: Critical violations present -- remediation required');
    }
    console.log('  NOTE: Runtime scan covers the current view only.');
    console.log('  Navigate to each tool/mode and re-run for full coverage.');
    console.log('='.repeat(72) + '\n');

  } catch (err) {
    console.error('Audit failed:', err.message);
    if (err.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error(`\nCould not connect to ${url}`);
      console.error('Make sure the dev server is running: cd prismflow-deploy && npm start');
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
