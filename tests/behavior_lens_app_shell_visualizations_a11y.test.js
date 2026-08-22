import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { renderHub } from './helpers/behavior_lens_harness.js';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const source = read('behavior_lens_module.js');
const require = createRequire(import.meta.url);
const axe = require(path.resolve(root, 'desktop/web-app/node_modules/axe-core'));

describe('BehaviorLens app shell and visualization accessibility', () => {
  const appStart = source.indexOf('const BehaviorLensApp =');
  const appEnd = source.indexOf('const BehaviorLensRuntimeBoundary =');
  const app = source.slice(appStart, appEnd);
  const guide = source.slice(
    source.indexOf('const ABAQuickGuide ='),
    source.indexOf('const HomeBehaviorLog =')
  );

  it('uses a named, described app-level modal with focus lifecycle management', () => {
    expect(app).toContain('ref: behaviorLensDialogRef');
    expect(app).toContain("role: 'dialog'");
    expect(app).toContain("'aria-modal': 'true'");
    expect(app).toContain("'aria-labelledby': 'behavior-lens-dialog-title'");
    expect(app).toContain("'aria-describedby': 'behavior-lens-dialog-subtitle'");
    expect(app).toContain("id: 'behavior-lens-dialog-title'");
    expect(app).toContain("id: 'behavior-lens-dialog-subtitle'");
    expect(app).toContain('ref: behaviorLensCloseRef');
    expect(app).toContain("'aria-label': 'Close BehaviorLens'");
  });

  it('moves focus inside, traps Tab, closes with Escape, and restores the opener', () => {
    expect(app).toContain('behaviorLensOpenerRef.current = document.activeElement');
    expect(app).toContain('behaviorLensCloseRef.current || behaviorLensDialogRef.current');
    expect(app).toContain("if (event.key === 'Escape')");
    expect(app).toContain("if (event.key !== 'Tab') return");
    expect(app).toContain('document.activeElement === first');
    expect(app).toContain('document.activeElement === last');
    expect(app).toContain('last.focus();');
    expect(app).toContain('first.focus();');
    expect(app).toContain('opener && opener.isConnected');
  });

  it('lets nested dialogs retain their own keyboard containment', () => {
    expect(app).toContain("event.target.closest('[role=\"dialog\"], [role=\"alertdialog\"]')");
    expect(app).toContain('if (closestDialog && closestDialog !== dialog) return;');
    expect(app).toContain("element.closest('[role=\"dialog\"], [role=\"alertdialog\"]') === dialog");
  });

  it('implements the complete horizontal ARIA tabs keyboard model', () => {
    expect(guide).toContain("role: 'tablist'");
    expect(guide).toContain("'aria-label': 'ABA Quick Guide sections'");
    expect(guide).toContain("role: 'tab'");
    expect(guide).toContain("'aria-selected': activeTab === tab.id");
    expect(guide).toContain("'aria-controls': `bl-guide-panel-${tab.id}`");
    expect(guide).toContain('tabIndex: activeTab === tab.id ? 0 : -1');
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(guide).toContain(`event.key === '${key}'`);
    }
    for (const id of ['glossary', 'schedules', 'decision', 'mistakes']) {
      expect(guide).toContain(`id: 'bl-guide-panel-${id}'`);
      expect(guide).toContain("role: 'tabpanel'");
      expect(guide).toContain(`'aria-labelledby': 'bl-guide-tab-${id}'`);
    }
  });

  it('names every authored SVG visualization and excludes export canvases', () => {
    const lines = source.split(/\r?\n/);
    const svgContexts = lines.flatMap((line, index) =>
      line.includes("h('svg'") ? [lines.slice(index, index + 8).join(' ')] : []
    );
    expect(svgContexts).toHaveLength(13);
    for (const context of svgContexts) {
      expect(context).toMatch(/role:\s*['"](?:img|group)['"]/);
      expect(context).toContain("'aria-label':");
    }

    const canvases = source.match(/document\.createElement\('canvas'\);/g) || [];
    const hiddenCanvases = source.match(/canvas\.setAttribute\('aria-hidden', 'true'\);/g) || [];
    expect(canvases).toHaveLength(4);
    expect(hiddenCanvases).toHaveLength(canvases.length);
  });

  it('makes heatmap drill-down cells keyboard operable with WCAG 2.2 targets', () => {
    expect(source).toContain('const cellSize = mini ? 24 : 28;');
    expect(source).toContain("role: cell.count > 0 && onOpenTool ? 'button' : undefined");
    expect(source).toContain('tabIndex: cell.count > 0 && onOpenTool ? 0 : undefined');
    expect(source).toContain("if (event.key === 'Enter' || event.key === ' ')");
    expect(source).toContain('onFocus: () => setHoveredCell(i)');
    expect(source).toContain('Open scatterplot.`');
  });

  it('programmatically names the audited form and file controls', () => {
    expect(source).toContain("'aria-label': f.label");
    expect(source).toContain("'aria-label': d.label");
    expect(source).toContain("'aria-label': 'Additional context'");
    expect(source).toContain("'aria-label': 'Import shared BehaviorLens workspace JSON file'");
    expect(source).toContain("'aria-label': 'Load BehaviorLens workspace JSON file'");
    expect(source).toContain("'aria-label': 'Load BehaviorLens workspaces for comparison'");
  });

  it('provides explicit reduced-motion and high-contrast focus safeguards', () => {
    const animatedLines = source.split(/\r?\n/).filter((line) => /animate-(?:pulse|spin|bounce)/.test(line));
    expect(animatedLines.length).toBeGreaterThan(0);
    for (const line of animatedLines) expect(line).toContain('motion-reduce:animate-none');
    expect(source).toContain('outline: 3px solid #4338ca !important;');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('outline-color: CanvasText !important;');
  });

  it('uses authored semantics without a polling DOM auto-fixer', () => {
    expect(source).toContain("id: 'behavior-lens-live-status'");
    expect(source).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(source).toContain('blAnnouncementTimerRef.current = window.setTimeout');
    expect(source).not.toContain("document.getElementById('bl-a11y-live')");
    expect(source).not.toContain('var blLive');
    expect(source).not.toContain('_blA11yFixerActive');
    expect(source).not.toContain('Runs every 2s to catch unlabeled interactive elements');
    expect(source).not.toContain('Data visualization chart. Use the data table below for accessible values.');
    expect(source).not.toContain("el.setAttribute('alt', 'Illustration')");
  });

  it('has no serious or critical axe findings in the rendered hub shell', async () => {
    const host = document.createElement('div');
    host.innerHTML = renderHub({});
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, { rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
        'scrollable-region-focusable': { enabled: false },
      } });
      const serious = results.violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => `${violation.id}: ${violation.help} :: ${violation.nodes.map((node) => `${node.target.join(' ')} ${node.failureSummary || node.html}`).join(' | ')}`);
      expect(serious).toEqual([]);
    } finally {
      host.remove();
    }
  }, 15000);

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/behavior_lens_module.js'));
  });
});
