import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_zones.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_zones.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Zones of Regulation navigation accessibility', () => {
  it('keeps the deployed copy identical to the source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides roving, named tabs linked to the active panel', () => {
    const text = source();
    expect(text).toContain("role: 'tablist', 'aria-label': 'Zones of Regulation tabs'");
    expect(text).toContain("'data-zones-tab': tab.id");
    expect(text).toContain("id: 'zones-tab-' + tab.id");
    expect(text).toContain("tabIndex: isActive ? 0 : -1");
    expect(text).toContain('onKeyDown: function(e)');
    expect(text).toContain("'aria-controls': 'zones-tab-panel'");
    expect(text).toContain("id: 'zones-tab-panel', role: 'tabpanel'");
    expect(text).toContain("selectZonesTab(nextTab.id)");
  });

  it('keeps non-tab controls out of the tablist and gives them stateful names', () => {
    const text = source();
    // Hub-wide toolbar contract (tests/sel_toolbar_toggle_names.test.js): a stable
    // name plus aria-pressed for the sound switch; the badge toggle opens a panel,
    // so it reports aria-expanded rather than pressed.
    expect(text).toContain("'aria-label': 'Sound effects'");
    expect(text).toContain("'aria-pressed': !!soundEnabled");
    expect(text).toContain("'aria-label': 'View badges (' + Object.keys(earnedBadges).length + ' of ' + BADGES.length + ')'");
    expect(text).toContain("'aria-expanded': !!showBadgesPanel");
    expect(text).toContain("announceToSR(nextSound ? 'Sounds enabled' : 'Sounds muted')");
  });
});