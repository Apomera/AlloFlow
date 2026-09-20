# Panel translation cache performance

Date: 2026-09-19. Local source changes; no deployment.

Submission Inbox and Seating Chart passed llLoad() directly to useRef. JavaScript evaluated that argument on every render, reading localStorage and parsing the complete multilingual cache even though React retained only the first result. Each panel now initializes an empty ref and loads the cache only if that ref has no value. Language switching and asynchronously translated packs continue to use the existing mutable ref.

## Browser evidence

The fixture mounts the actual generated panels with production React, then performs 100 parent rerenders. It compares each panel against local commit 90b4d80eca3ba84d27eaae8757658be78220e8c3 using two synthetic cache sizes. Displayed text matches before and after.

| Per panel, after mount | Before | After |
| --- | ---: | ---: |
| Reads over 100 renders | 100 | 0 |
| JSON parses over 100 renders | 100 | 0 |
| Cumulative cache bytes read, about 32 KB cache | about 3.17 MB | 0 |
| Cumulative cache bytes read, about 644 KB cache | about 64.37 MB | 0 |

These are operation and data-volume counts in controlled fixtures, not whole-app latency or Core Web Vitals. Cache sizes are synthetic, not measurements of user data. Initial mounting still reads the cache.

Both panels passed cached Spanish/French switching without storage reads, rendering and persisting a mocked new German translation, excluding synthetic student data from translation prompts, loading changed storage on remount, and falling back from corrupt JSON. No browser page errors occurred. No live AI provider was called.

## Validation

- All 45 selected tests passed: Inbox localization/autosave, Seating Chart behavior/map accessibility, and Behavior Lens seating bridge.
- Root/public/existing app-build module copies match exactly; generated syntax and scoped whitespace checks passed.
- A Windows write error prevented the Inbox builder from updating one mirror. The root module compiled successfully; native file writes synchronized the mirrors and byte equality was then verified.
- The first browser fixture omitted the icon from the Inbox translation key. The fixture was corrected to the exact registered key and the full browser check passed.

Run node dev-tools/ui_cache_performance.cjs to repeat the comparison. Browser details are in browser.json and test results are in tests.json. The local commit also carries the preceding isolated Inbox autosave pass so its module changes and supporting tests remain together when synchronized from this branch.
