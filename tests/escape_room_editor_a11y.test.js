import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const paths = ['escape_room_module.js', 'desktop/web-app/public/escape_room_module.js'];
describe('Escape Room preview editor accessibility', () => {
  it('localizes all four editor names with existing translated labels', () => {
    for (const path of paths) {
      const source = fs.readFileSync(path, 'utf8');
      expect(source).toContain("t('share_collect.q_aria', { n: idx + 1 }) + ': ' + editLabel");
      expect(source).toContain("t('share_collect.q_aria', { n: idx + 1 }) + ': ' + t('escape_room.option')");
      expect(source).toContain("t('share_collect.q_aria', { n: idx + 1 }) + ': ' + t('escape_room.hint')");
      expect(source).toContain("t('escape_room.final_door_title') + ': ' + t('escape_room.sentence_with_blank')");
    }
  });
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(paths[0], 'utf8')).toBe(fs.readFileSync(paths[1], 'utf8'));
  });
});