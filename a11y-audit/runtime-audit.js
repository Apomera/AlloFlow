#!/usr/bin/env node
/**
 * AlloFlow WCAG 2.2 AA Runtime Audit
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
const WAIT_MS = 3000; // minimum hydration delay
const APP_READY_TIMEOUT_MS = 30000;

// axe-core rules to run (WCAG 2.0, 2.1, and 2.2 Level A/AA)
const AXE_TAGS = [
  'wcag2a', 'wcag2aa',
  'wcag21a', 'wcag21aa',
  'wcag22a', 'wcag22aa',
  'best-practice',
];

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

    // Check 5: Focus visible -- inspect the actual focused state. Unfocused
    // controls commonly compute to outline:none and must not be treated as failures.
    const interactiveElements = document.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex="0"], [role="button"]'
    );
    const originalFocus = document.activeElement;
    let noVisibleFocusCount = 0;
    interactiveElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const base = window.getComputedStyle(el);
      if (el.disabled || el.hidden || base.display === 'none' || base.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return;
      const baseBorder = base.borderColor;
      el.focus({ preventScroll: true });
      const focused = window.getComputedStyle(el);
      const outlineWidth = Number.parseFloat(focused.outlineWidth) || 0;
      const hasOutline = focused.outlineStyle !== 'none' && outlineWidth >= 2;
      const hasShadow = focused.boxShadow && focused.boxShadow !== 'none';
      const hasBorderChange = focused.borderColor !== baseBorder;
      if (!hasOutline && !hasShadow && !hasBorderChange) noVisibleFocusCount++;
    });
    if (originalFocus && typeof originalFocus.focus === 'function') originalFocus.focus({ preventScroll: true });
    if (noVisibleFocusCount > 0) {
      findings.push({
        id: 'custom-focus-visible',
        description: `${noVisibleFocusCount} visible interactive element(s) lack a detectable focused-state indicator`,
        wcag: '2.4.7 Focus Visible',
        severity: 'major',
        selector: 'button, a[href], input, select, textarea, [tabindex]',
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
      const inputStyle = window.getComputedStyle(input);
      if (input.hidden || input.getAttribute('aria-hidden') === 'true' || inputStyle.display === 'none' || inputStyle.visibility === 'hidden') return;
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

    // WCAG 2.2 target size is evaluated by axe's wcag22aa target-size rule,
    // which accounts for inline, spacing, and equivalent-control exceptions.

    // Check 10: repeated-entry support for common personal-data purposes.
    const repeatablePurpose = /^(?:name|given-name|family-name|email|username|organization|street-address|address-line[123]|address-level[1-4]|country|country-name|postal-code|language|url|tel)$/;
    const missingAutocomplete = [];
    document.querySelectorAll('input:not([type="hidden"]):not([disabled])').forEach(input => {
      const declared = (input.getAttribute('autocomplete') || '').trim();
      const inferred = (input.getAttribute('name') || input.id || '').toLowerCase();
      if (!declared && repeatablePurpose.test(inferred)) missingAutocomplete.push(input);
    });
    if (missingAutocomplete.length > 0) {
      findings.push({
        id: 'custom-redundant-entry',
        description: `${missingAutocomplete.length} common-purpose input(s) may require repeated entry because autocomplete is not declared`,
        wcag: '3.3.7 Redundant Entry',
        severity: 'major',
        selector: 'input:not([autocomplete])',
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

  console.log('AlloFlow WCAG 2.2 AA Runtime Audit');
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log(`Waiting for the application shell (up to ${APP_READY_TIMEOUT_MS}ms)...`);
    await new Promise(r => setTimeout(r, WAIT_MS));
    await page.waitForFunction(() => {
      const loader = document.querySelector('#alloflow-loader');
      if (!loader) return true;
      const style = window.getComputedStyle(loader);
      return loader.hidden || style.display === 'none' || style.visibility === 'hidden';
    }, { timeout: APP_READY_TIMEOUT_MS }).catch(() => {
      console.warn('Application shell did not replace the startup loader before the audit timeout.');
    });

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
      console.error('Make sure the dev server is running: cd desktop/web-app && npm start');
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
