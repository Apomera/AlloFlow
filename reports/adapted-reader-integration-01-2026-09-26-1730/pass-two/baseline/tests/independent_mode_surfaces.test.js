// Independent Learner mode gets its own surfaces instead of the teacher's.
//
// Background (2026-09-06 live probe of the browser shell): Independent Learner ran as
// teacher mode plus a flag, so a self-study adult saw "Teacher Grading Dashboard" (a drop
// zone for other people's student files), an "Educator Tools" button one click from
// BehaviorLens and the Assessment Center, an AI guide subtitled "Pedagogy, Navigation &
// Auto-Setup", a 5th Grade default, and a main panel about "your curriculum".
//
// These assertions read the SOURCE the host actually ships (header source + built module,
// the orchestrator, the guide button, both ui_strings copies) so a regression in any one
// copy fails here rather than in front of a learner.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let header, headerModule, headerMirror, anti, guideSource, guideModule, guideMirror, ui, uiMirror;

beforeAll(() => {
  const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
  header = read('view_header_source.jsx');
  headerModule = read('view_header_module.js');
  headerMirror = read('desktop/web-app/public/view_header_module.js');
  anti = read('AlloFlowANTI.txt');
  guideSource = read('view_udl_guide_button_source.jsx');
  guideModule = read('view_udl_guide_button_module.js');
  guideMirror = read('desktop/web-app/public/view_udl_guide_button_module.js');
  ui = JSON.parse(read('ui_strings.js'));
  uiMirror = JSON.parse(read('desktop/web-app/public/ui_strings.js'));
});

describe('header', () => {
  it('names the dashboard button for the learner, not the grader, in independent mode', () => {
    expect(header).toMatch(/: isIndependentMode\s*\?\s*\(t\('common\.progress'\)/);
    expect(headerModule).toContain("isIndependentMode ? t(\"common.progress\") || \"My Learning Progress\"");
  });

  it('hides Educator Tools from independent learners on both header layouts, and the built module agrees', () => {
    const gates = header.match(/isTeacherMode && !isIndependentMode && \(\s*<button type="button"[\s\S]{0,900}?data-help-key="header_educator_hub"/g) || [];
    expect(gates.length, 'desktop + mobile educator hub buttons').toBe(2);
    // No educator-hub button is left gated on isTeacherMode alone.
    const loose = header.match(/\{isTeacherMode && \(\s*<button type="button"[\s\S]{0,900}?data-help-key="header_educator_hub"/g) || [];
    expect(loose).toEqual([]);
    const built = headerModule.match(/isTeacherMode && !isIndependentMode &&[\s\S]{0,700}?"header_educator_hub"/g) || [];
    expect(built.length).toBe(2);
  });

  it('ships the same header module to the desktop mirror', () => {
    expect(headerMirror).toBe(headerModule);
  });
});

describe('orchestrator', () => {
  it('routes the independent learner to the learner progress view, never the grading dashboard', () => {
    expect(anti).toContain("activeView === 'dashboard' && isTeacherMode && !isIndependentMode && (");
    expect(anti).toContain("activeView === 'dashboard' && (!isTeacherMode || isIndependentMode) && (");
    expect(anti).not.toContain("activeView === 'dashboard' && !isTeacherMode && (");
  });

  it('shows learner-facing empty-panel copy and a study-coach guide subtitle', () => {
    expect(anti).toContain("isIndependentMode ? t('input.empty_desc_independent') : t('input.empty_desc')");
    expect(anti).toContain("subtitle={isIndependentMode ? t('sidebar.ai_guide_sub_independent') : undefined}");
  });

  it('lifts the untouched K-12 grade default for self-study, without overriding a chosen grade', () => {
    const branch = anti.slice(anti.indexOf("} else if (role === 'independent') {"), anti.indexOf("} else if (role === 'independent') {") + 900);
    expect(branch).toContain("setGradeLevel(prev => (prev === '5th Grade' ? 'College' : prev));");
    // 'College' is a real option the grade selector offers.
    expect(readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8')).toContain('<option value="College">');
  });
});

describe('guide button and strings', () => {
  it('accepts a subtitle override and falls back to the teacher line', () => {
    expect(guideSource).toContain("{subtitle || t('sidebar.ai_guide_sub')}");
    expect(guideModule).toContain('subtitle || t("sidebar.ai_guide_sub")');
    expect(guideMirror).toBe(guideModule);
  });

  it('registers both new keys in both ui_strings copies', () => {
    for (const strings of [ui, uiMirror]) {
      expect(typeof strings.sidebar.ai_guide_sub_independent).toBe('string');
      expect(strings.sidebar.ai_guide_sub_independent).not.toMatch(/pedagogy/i);
      expect(typeof strings.input.empty_desc_independent).toBe('string');
      expect(strings.input.empty_desc_independent).not.toMatch(/curriculum/i);
    }
    expect(uiMirror.sidebar.ai_guide_sub_independent).toBe(ui.sidebar.ai_guide_sub_independent);
    expect(uiMirror.input.empty_desc_independent).toBe(ui.input.empty_desc_independent);
  });
});
