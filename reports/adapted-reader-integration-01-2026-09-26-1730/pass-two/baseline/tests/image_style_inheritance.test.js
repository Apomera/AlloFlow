import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const occurrences = (source, needle) => source.split(needle).length - 1;

const app = read('AlloFlowANTI.txt');
const sidebar = read('view_sidebar_panels_source.jsx');
const glossary = read('view_glossary_source.jsx');
const wordSounds = read('word_sounds_setup_source.jsx');
const dispatcher = read('generate_dispatcher_source.jsx');
const phaseN = read('phase_n_misc_helpers_source.jsx');
const adventureHandlers = read('adventure_handlers_source.jsx');
const adventureSession = read('adventure_session_handlers_source.jsx');
const adventureView = read('view_adventure_source.jsx');

describe('Universal image-style inheritance', () => {
  it('makes Visual Supports inherit by default and reveals presets only for an override', () => {
    expect(sidebar).toContain("const visualStyleMode = !visualStyle || visualStyle === 'Default' ? 'inherit' : 'override';");
    expect(sidebar).toContain('<option value="inherit">Use Universal style</option>');
    expect(sidebar).toContain('<option value="override">Override for this resource</option>');
    expect(sidebar).toContain("visualStyleMode === 'override'");
    expect(dispatcher).toContain("(!visualStyle || visualStyle === 'Default') && (universalImageStyle || '').trim()");
  });

  it('uses the same precedence for initial, added, quick-added, and regenerated Glossary images', () => {
    expect(glossary).toContain('aria-label="Glossary image style source"');
    expect(glossary).toContain("if (nextMode === 'inherit') setGlossaryImageStyle('');");
    expect(dispatcher).toContain("(glossaryImageStyle || '').trim() || (universalImageStyle || '').trim()");
    expect(occurrences(phaseN, "String(glossaryImageStyle || '').trim() || String(universalImageStyle || '').trim()")).toBe(2);
    expect(app).toContain("const _alloGlossaryImageDeps = () => ({");
    expect(app).toContain("glossaryImageStyle, universalImageStyle, newGlossaryTerm");
    expect(app).toContain("const effectiveGlossaryStyle = String(glossaryImageStyle || '').trim() || String(universalImageStyle || '').trim();");
  });

  it('applies the effective Universal or override style to every Word Sounds image path', () => {
    expect(wordSounds).toContain("const [imageThemeMode, setImageThemeMode] = React.useState('inherit');");
    expect(wordSounds).toContain("const effectiveImageTheme = imageThemeMode === 'override' && imageTheme.trim()");
    expect(occurrences(wordSounds, 'const themePrefix = effectiveImageTheme ?')).toBe(3);
    expect(wordSounds).toContain('Style changes apply to new Word Sounds images, not Glossary images.');
    expect(app).toContain('universalImageStyle={universalImageStyle}');
  });

  it('retires hidden Timeline and Concept Sort overrides instead of silently applying them', () => {
    expect(app).toContain("localStorage.removeItem('alloflow_timeline_image_style')");
    expect(app).toContain("localStorage.removeItem('alloflow_concept_sort_image_style')");
    expect(dispatcher).toContain("const _timelineStyle = (universalImageStyle || '').trim();");
    expect(dispatcher).toContain("const _csDeckStyle = (universalImageStyle || '').trim();");
    expect(dispatcher).not.toContain("(timelineImageStyle || '').trim() || (universalImageStyle || '').trim()");
    expect(dispatcher).not.toContain("(conceptSortImageStyle || '').trim() || (universalImageStyle || '').trim()");
  });

  it('keeps Adventure presets while offering Universal style across every generated visual', () => {
    expect(sidebar).toContain('<option value="universal">Use Universal style</option>');
    expect(adventureView).toContain('<option value="universal">Use Universal style</option>');
    expect(adventureHandlers).toContain("adventureArtStyle === 'universal'");
    expect(adventureSession).toContain("styleDescription = String(universalImageStyle || '').trim()");
    expect(app).toContain("adventureArtStyle === 'universal'");
    expect(app).toContain('adventureArtStyle, adventureCustomArtStyle, universalImageStyle, useLowQualityVisuals');
  });
});

describe('image-style generated module mirrors', () => {
  const pairs = [
    ['view_sidebar_panels_module.js', 'desktop/web-app/public/view_sidebar_panels_module.js'],
    ['view_glossary_module.js', 'desktop/web-app/public/view_glossary_module.js'],
    ['word_sounds_setup_module.js', 'desktop/web-app/public/word_sounds_setup_module.js'],
    ['generate_dispatcher_module.js', 'desktop/web-app/public/generate_dispatcher_module.js'],
    ['phase_n_misc_helpers_module.js', 'desktop/web-app/public/phase_n_misc_helpers_module.js'],
    ['adventure_handlers_module.js', 'desktop/web-app/public/adventure_handlers_module.js'],
    ['adventure_session_handlers_module.js', 'desktop/web-app/public/adventure_session_handlers_module.js'],
    ['view_adventure_module.js', 'desktop/web-app/public/view_adventure_module.js'],
  ];

  for (const [rootPath, mirrorPath] of pairs) {
    it(`${rootPath} matches its shipped mirror`, () => {
      expect(read(mirrorPath)).toBe(read(rootPath));
    });
  }
});
