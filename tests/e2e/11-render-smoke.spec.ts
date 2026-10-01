import { test, expect, Page } from '@playwright/test';
import { hubTile, learningToolsCard } from './helpers/learning_hub';

/**
 * Render smoke test — open each major surface and assert it mounts without a
 * fatal error / ErrorBoundary trip.
 *
 * Why: the static gate (dev-tools/check_render_refs.cjs) catches the
 * undeclared-identifier render-crash + won't-parse classes across all CDN
 * modules. This test catches what static analysis can't — runtime crashes when
 * a surface actually mounts: prop-shape mismatches (the `gameCompletions`
 * object-vs-array TypeError), useEffect-body refs, and anything the host's
 * ErrorBoundary catches. Runs against the deployed app (playwright baseURL).
 *
 * Selectors come from ./helpers/learning_hub (shared with specs 03, 04, 06, 07):
 * the launch pad's [data-pathway="learning"] card, then a tile by its
 * data-hub-id. To extend: add a {name, hubId} from view_learning_hub_modal_source.jsx
 * (e.g. Word Sounds, the Teacher dashboard — the surfaces that crashed this cycle;
 * their render-crash class is already covered by the static gate, so this is
 * additive runtime coverage).
 */

const SURFACES: { name: string; hubId: string }[] = [
  { name: 'STEAM Lab', hubId: 'stem-lab' },
  { name: 'SEL Hub', hubId: 'sel-hub' },
  { name: 'StoryForge', hubId: 'storyforge' },
  { name: 'AlloHaven', hubId: 'allohaven' },
];

// App-specific crash signatures: the ErrorBoundary/CDN error logs + uncaught
// Reference/Type errors (the classes that have reached the pilot).
const FATAL = /caught by ErrorBoundary|\[CDN-ERROR\]|\[CDN-STACK\]|Uncaught (Reference|Type)Error/i;
// Known third-party / environment noise (mirrors the filter in 01-app-boot).
const NOISE = /firestore|firebase|workbox|favicon|googletagmanager|tracking|GA_|chrome-extension|error_reporter_module|cdn\.jsdelivr.*403/i;

function captureFatals(page: Page): string[] {
  const fatals: string[] = [];
  // Any uncaught exception is a fatal (this is what ErrorBoundary catches).
  page.on('pageerror', (e) => fatals.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (NOISE.test(t)) return;
    if (FATAL.test(t)) fatals.push('console: ' + t.slice(0, 220));
  });
  return fatals;
}

async function openLearningTools(page: Page) {
  await page.goto('./');
  await page.waitForTimeout(3000);
  await learningToolsCard(page).click({ force: true });
  await page.waitForTimeout(2500);
}

test.describe('Render smoke — surfaces mount without a fatal error', () => {
  test('app boots without a fatal error', async ({ page }) => {
    const fatals = captureFatals(page);
    await page.goto('./');
    await page.waitForTimeout(6000);
    expect(fatals, fatals.join('\n')).toEqual([]);
  });

  for (const s of SURFACES) {
    test(`open ${s.name} -> no fatal error`, async ({ page }) => {
      const fatals = captureFatals(page);
      await openLearningTools(page);
      await hubTile(page, s.hubId).click({ force: true });
      await page.waitForTimeout(7000);
      expect(fatals, `${s.name} produced fatal(s):\n${fatals.join('\n')}`).toEqual([]);
    });
  }
});
