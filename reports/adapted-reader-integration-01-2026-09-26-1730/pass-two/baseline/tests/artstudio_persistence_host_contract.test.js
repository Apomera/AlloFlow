import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SHELL_COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const STEM_HOST_COPIES = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
];

describe('Art Studio profile-scoped persistence host contract', () => {
  it.each(SHELL_COPIES)('%s passes the selected profile into Stem Lab', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('activeProfileId: selectedProfileId');
  });

  it.each(STEM_HOST_COPIES)('%s exposes the profile ID to tool plugins', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/theme:\s*_themeProp,\s*activeProfileId,/);
    expect(source).toContain("activeProfileId: typeof activeProfileId === 'string' ? activeProfileId : ''");
  });

  it('resolves profile scope before falling back to device storage', () => {
    const source = readFileSync('stem_lab/stem_tool_artstudio.js', 'utf8');
    expect(source).toContain("return profileId ? 'profile:' + profileId.slice(0, 150) : 'device';");
    expect(source).toContain('studioPersistenceOwnerScope');
  });
});
