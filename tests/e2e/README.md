# AlloFlow Playwright E2E Suite

End-to-end browser tests for AlloFlow, running against the deployed production site
(`https://prismflow-911fe.web.app`) by default.

## Running

```bash
# Run all tests
npm run test:e2e

# Headed (visible browser)
npm run test:e2e:headed

# Single file
npx playwright test tests-e2e/01-app-boot.spec.ts

# Single test by name
npx playwright test --grep "Optics"

# Against local dev server
PW_BASE_URL=http://localhost:3000 npm run test:e2e

# Open HTML report after run
npm run test:e2e:report
```

## Suite organization

| File | Tests | Purpose |
|------|-------|---------|
| `01-app-boot.spec.ts` | 6 | Page loads, title, mounts, console errors, skip-link, service worker |
| `02-launch-pad.spec.ts` | 5 | Mode-picker cards (Full Platform / Guided / Learning / Educator) |
| `03-cdn-modules.spec.ts` | 4 | Lazy CDN module loading (`AlloModules.X`) |
| `04-learning-hub.spec.ts` | 6 | Learning Hub modal: 6 tiles, close, backdrop, descriptions |
| `05-sidebar-controls.spec.ts` | 10 | Mute, theme, animation, language, narrator, AI assistant toggles |
| `06-stem-lab-modal.spec.ts` | 5 | STEM Lab modal lifecycle + registry contract |
| `07-sel-hub-modal.spec.ts` | 5 | SEL Hub, StoryForge, AlloHaven module loading |
| `08-sidebar-tool-categories.spec.ts` | 23 | Each sidebar tool category is visible |
| `09-a11y-baseline.spec.ts` | 7 | lang attribute, landmarks, alt text, keyboard nav |
| `10-public-pages.spec.ts` | 8 | catalog.html, contribute.html, CDN module URLs |
| `11-stem-tools-load.spec.ts` | 26 | Flagship 13 STEM tools — CDN load + registry contract |
| `12-sel-tools-load.spec.ts` | 70 | Every SEL Hub tool's CDN file (one test per tool) |
| `13-stem-tools-all-cdn.spec.ts` | 104 | Every STEM Lab tool's CDN file (one test per tool) |
| `14-flagship-tool-render.spec.ts` | 6 | Flagship tools render with mock React without throwing |

**Total: ~280 tests**

## Strategy

The suite combines:
1. **UI smoke tests** (boot, navigation) — fast, end-user-facing
2. **CDN URL tests** (request-only, no browser) — fast, catches deploy regressions
3. **Programmatic loading tests** — load tool CDN, set up `window.StemLab` namespace, verify registration
4. **Mock-React render tests** — verify each flagship tool's `render()` doesn't throw

This avoids the slow + flaky deep navigation through React modals while still
catching real regressions (broken JS, missing CDN files, registry mismatches).

## Excluded from coverage

- AI features (`callGemini`) — non-deterministic, need API key
- Live multiplayer (Firebase Firestore session state)
- TTS / Speech-to-Text / camera / microphone
- Deep interaction with each of 174 tools (covered by render contract instead)
- Visual regression snapshots
