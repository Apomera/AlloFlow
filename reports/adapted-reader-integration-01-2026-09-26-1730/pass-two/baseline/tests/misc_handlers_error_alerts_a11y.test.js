import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_handlers_source.jsx', 'utf8');
const built = readFileSync('misc_handlers_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_handlers_module.js', 'utf8');

describe('project-load error announcement accessibility', () => {
  it('contains no blocking native alerts', () => {
    expect(source).not.toMatch(/\b(?:window\.)?alert\s*\(/);
    expect(built).not.toMatch(/\b(?:window\.)?alert\s*\(/);
  });

  it('announces invalid and unreadable projects once through the accessible toast path', () => {
    expect(source).toContain("addToast(t('errors.project_file_invalid') || t('toasts.invalid_project_file') || 'This project file is not valid.', 'error')");
    expect(source).toContain("addToast(t('errors.project_file_load_failed') || t('toasts.project_load_failed') || 'The project file could not be loaded.', 'error')");
    expect(source.match(/errors\.project_file_invalid/g)).toHaveLength(1);
    // "Once" means once PER FAILURE, and counting call sites was a proxy for it
    // that broke as soon as the silent paths were fixed. There are now three
    // mutually exclusive ways a project load can fail -- the parse throwing,
    // reader.onerror, and readAsText itself throwing -- and the last two used to
    // announce NOTHING, so a read failure left the user with no feedback at all.
    // Each announces exactly once and each is ownership-guarded, so a superseded
    // load stays quiet. That is the property; assert it instead of a tally.
    // Anchor every marker from the project-load region: this file has an
    // earlier, unrelated FileReader whose onerror/onabort/readAsText would
    // otherwise be matched instead, silently slicing the wrong function.
    const at = source.indexOf('errors.project_file_invalid');
    expect(at).toBeGreaterThan(-1);
    const from = (needle, start) => source.indexOf(needle, start);
    const loadFailPaths = [
      source.slice(from('} catch (err) {', at), from('reader.onerror = () => {', at)),
      source.slice(from('reader.onerror = () => {', at), from('reader.onabort = () => {', at)),
      source.slice(from('reader.readAsText(file);', at), from('return projectLoadOwner;', at)),
    ];
    for (const path of loadFailPaths) expect(path.length).toBeGreaterThan(0);
    for (const path of loadFailPaths) {
      expect(path.match(/errors\.project_file_load_failed/g) || []).toHaveLength(1); // never doubled
      expect(path).toMatch(/projectLoadIsCurrent\(\)/);                              // superseded load stays silent
    }
  });

  it('keeps both generated modules byte-identical', () => {
    expect(deployed).toBe(built);
  });
});
