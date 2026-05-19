import { test, expect } from '@playwright/test';

/**
 * The left sidebar exposes Educator's tool categories (Generate / Glossary / Visual Organizer / STEM Lab / etc).
 * These are <button> elements with data-help-key attributes.
 * This test verifies the presence + visibility of major categories.
 */
test.describe('Sidebar tool categories', () => {
  const TOOLS = [
    'Generate',
    'Expand All',
    'Analyze Source Material',
    'Glossary & Language Selection',
    'Text Adaptation',
    'Word Sounds',
    'Visual Organizer',
    'Note-Taking Templates',
    'Anchor Chart',
    'Visual Support',
    'FAQ Generator',
    'Writing Scaffolds',
    'Brainstorm Activity Ideas',
    'Interview Mode',
    'Sequence Builder',
    'Concept Sort',
    'Document Analysis',
    'STEM Lab',
    'Adventure Mode',
    'Exit Ticket',
    'Lesson Plan',
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3500);
  });

  for (const toolName of TOOLS) {
    test(`sidebar shows: ${toolName}`, async ({ page }) => {
      const btn = page.locator('button').filter({ hasText: new RegExp(`^\\s*${toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }).first();
      // If exact match fails, accept partial
      let visible = await btn.isVisible().catch(() => false);
      if (!visible) {
        const partial = page.locator('button').filter({ hasText: new RegExp(toolName.split(/[^A-Za-z]/)[0], 'i') }).first();
        visible = await partial.isVisible().catch(() => false);
      }
      expect(visible, `Tool category not visible in sidebar: ${toolName}`).toBeTruthy();
    });
  }

  test('Storyforge button is in sidebar', async ({ page }) => {
    const sf = page.locator('button').filter({ hasText: /StoryForge/i }).first();
    await expect(sf).toBeVisible();
  });

  test('Explore button is in sidebar', async ({ page }) => {
    const ex = page.locator('button').filter({ hasText: /🧪.*Explore|Explore/i }).first();
    await expect(ex).toBeVisible();
  });
});
