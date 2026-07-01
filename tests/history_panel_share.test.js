import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_history_panel_source.jsx'), 'utf8');

describe('HistoryPanel community sharing', () => {
  it('shares the resource pack from the header, not each individual resource row', () => {
    expect(src).toContain('shareResourcePackToCommunity');
    expect(src).toContain('data-help-key="history_share_pack"');
    expect(src).toContain("source_type: 'resource-pack'");
    expect(src).not.toContain('history.share_to_community_aria');
    expect(src).not.toContain('alloflow_pending_submission", JSON.stringify({\n                                                title: item.title');
  });
});