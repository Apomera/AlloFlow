import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('visual_panel_source.jsx', 'utf8');
const built = readFileSync('visual_panel_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/visual_panel_module.js', 'utf8');

describe('Visual Panel image upload validation', () => {
  it('renders an associated persistent error instead of invoking a native alert', () => {
    expect(source).toContain('const [imageUploadErrors, setImageUploadErrors] = React.useState({});');
    expect(source).toContain('role="alert"');
    expect(source).toContain('visual-panel-upload-error-${panelIdx}');
    expect(source).toContain('aria-describedby={imageUploadErrors[panelIdx]');
    expect(source).toContain('aria-invalid={imageUploadErrors[panelIdx]');
    expect(source).not.toContain('else alert(t("alerts.image_too_large_10mb"))');
  });

  it('clears rejected selections and stale errors before reading a valid file', () => {
    expect(source).toContain("e.target.value = '';");
    expect(source).toContain('delete next[panelIdx];');
    expect(source.indexOf('delete next[panelIdx];')).toBeLessThan(source.indexOf('const reader = new FileReader();'));
  });

  it('keeps generated and deployed visual-panel modules synchronized', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('visual-panel-upload-error-');
    expect(built).not.toContain('else alert(t("alerts.image_too_large_10mb"))');
  });
});
