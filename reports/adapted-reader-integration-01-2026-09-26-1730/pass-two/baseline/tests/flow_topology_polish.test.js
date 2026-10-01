import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const renderer = fs.readFileSync('view_renderers_source.jsx', 'utf8');
const builtRenderer = fs.readFileSync('view_renderers_module.js', 'utf8');
const deployedRenderer = fs.readFileSync('desktop/web-app/public/view_renderers_module.js', 'utf8');

describe('flow topology presentation polish', () => {
  it('provides bounded zoom and fit-to-screen controls without distorting edge geometry', () => {
    expect(renderer).toContain('Math.min(1.6, Math.max(0.5');
    expect(renderer).toContain('const fitToScreen = () =>');
    expect(renderer).toContain("style={{ minWidth: minBoardWidth + 'px', zoom }}");
    expect(renderer).toContain('(rect.left - boardRect.left) / zoom');
    expect(renderer).toContain('aria-label={t(\'outline.zoom_out\')');
    expect(renderer).toContain('aria-label={t(\'outline.zoom_in\')');
    expect(renderer).toContain("t('outline.fit_to_screen')");
  });

  it('supports local node collapsing with accessible expansion state', () => {
    expect(renderer).toContain('const [collapsedNodes, setCollapsedNodes]');
    expect(renderer).toContain('const toggleNodeCollapsed = index =>');
    expect(renderer).toContain('const setAllCollapsed = shouldCollapse =>');
    expect(renderer).toContain('aria-expanded={!isCollapsed}');
    expect(renderer).toContain("t('outline.collapse_all')");
    expect(renderer).toContain("t('outline.expand_all')");
    expect(renderer).toContain('{!isCollapsed && outgoing.length > 0 && (');
  });

  it('exports an offline self-contained SVG with the complete styled topology', () => {
    expect(renderer).toContain('const buildExportSvg = () =>');
    expect(renderer).toContain("new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })");
    expect(renderer).toContain('<foreignObject width="100%" height="100%">');
    expect(renderer).toContain("cloneElement.setAttribute('style', declarations.join(';'))");
    expect(renderer).toContain('URL.revokeObjectURL(url)');
  });

  it('offers a high-resolution PNG path with an explicit offline fallback', () => {
    expect(renderer).toContain('const _loadOrganizerHtml2Canvas');
    expect(renderer).toContain("script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'");
    expect(renderer).toContain('const handleDownloadPng = async () =>');
    expect(renderer).toContain('scale: 2');
    expect(renderer).toContain('PNG export is unavailable. SVG and Print still work offline.');
  });

  it('opens a landscape print view suitable for PDF saving', () => {
    expect(renderer).toContain("const printWindow = window.open('', '_blank', 'width=1200,height=800')");
    expect(renderer).toContain('@page{size:landscape;margin:.35in}');
    expect(renderer).toContain('window.print();');
    expect(renderer).toContain("t('outline.print_pdf')");
  });

  it('uses the organizer title for safe, predictable filenames', () => {
    const match = renderer.match(/const _organizerSlugify = value =>[\s\S]*?;\n\nconst _downloadOrganizerBlob/);
    expect(match).not.toBeNull();
    const slugSource = match[0].replace(/\n\nconst _downloadOrganizerBlob$/, '');
    const slugify = Function(slugSource + '\nreturn _organizerSlugify;')();
    expect(slugify('Water Cycle: Yes / No?')).toBe('water-cycle-yes-no');
    expect(slugify('')).toBe('flow-chart');
    expect(renderer).toContain('topicTitle: main');
  });

  it('keeps source, built, and deployed toolbar behavior synchronized', () => {
    for (const source of [renderer, builtRenderer, deployedRenderer]) {
      expect(source).toContain('flow-chart-');
      expect(source).toContain('html2canvas');
      expect(source).toContain('Print / PDF');
      expect(source).toContain('Collapse all');
    }
  });
});
