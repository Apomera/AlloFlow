import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('glossary health-check visual regressions', () => {
  it('renders health-check symbols as Unicode rather than mojibake', () => {
    const source = read('view_glossary_source.jsx');
    const start = source.indexOf('data-help-key="glossary_health_check"');
    const end = source.indexOf('}{!isMemoryGame', start);
    const healthCheck = source.slice(start, end);

    expect(healthCheck).toContain('📊');
    expect(healthCheck).toContain('—');
    expect(healthCheck).toContain('✓ Appropriate');
    expect(healthCheck).toContain('💡');
    expect(healthCheck).not.toMatch(/ðŸ|â€”|âœ|âš|â†/);
  });

  it('lets the add-term controls wrap without text collisions', () => {
    const source = read('view_glossary_source.jsx');
    expect(source).toContain('flex flex-col sm:flex-row gap-2');
    expect(source).toContain('w-full sm:w-1/3 min-w-0');
    expect(source).toContain('w-full min-w-0 flex-1');
    expect(source).toContain('w-full sm:w-auto shrink-0 justify-center');
  });

  it('gives the definition-level selector a full row and arrow clearance', () => {
    const source = read('view_sidebar_panels_source.jsx');
    expect(source).toContain('grid grid-cols-2 gap-2');
    expect(source).toContain('className="col-span-2" data-help-key="glossary_definition_level"');
    expect(source).toContain('py-1.5 pl-2 pr-8');
  });
});
